import React, { useEffect, useState, useRef, useCallback, useLayoutEffect, useMemo, Fragment } from "react";

import { connect, useSelector } from "react-redux";
import { selectTime, selectRecords, getRecordsAtTime, selectPlayerConfig, selectDrawingEnabled, selectSelectedFilterdItems } from '../../redux/selectors';
import { setMute, setTime, setSpeed, setDrawingRect, setDrawingEnabled, updateFilterItem, setSelectedFilterItems } from "../../redux/actions";
import { PLAYER_ACTION } from '../../redux/actionTypes';
import { SCENETYPE_ARRAY } from "../../common/SceneGuide";
import { useRectsHidden } from "../../common/editorState";

const FILTER_TYPE = {
    NONE: 0,
    BLUR: 1,
    BLUR_EXTRA: 2,
    BLUR_EXTREME: 3,
    BLACK: 4,
}
Object.freeze(FILTER_TYPE);

function getFilterClass(filterType) {
    switch (filterType) {
        case FILTER_TYPE.NONE:
            return "";
        case FILTER_TYPE.BLUR:
            return "video-filter-blur";
        case FILTER_TYPE.BLUR_EXTRA:
            return "video-filter-blur-extra";
        case FILTER_TYPE.BLUR_EXTREME:
            return "video-filter-blur-extreme";
        case FILTER_TYPE.BLACK:
            return "video-filter-black";
    }
    return "";
}

// A filter rectangle being edited on the video (the selected record's): drag an edge or corner
// handle to resize, the middle to move. Edges snap to the video frame's edges and stay inside it.
// Positions are pixels within the filter layer; `bounds` is the video frame's box in it.
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const SNAP_PX = 10;
const MIN_PX = 12;

function EditableRect({ rect, bounds, onCommit, onRemove }) {
    const [live, setLive] = useState(null); // the rectangle while dragging
    const drag = useRef(null);
    const shown = live || rect;

    const begin = (mode) => (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        drag.current = { mode, x: e.clientX, y: e.clientY, start: { ...rect } };
        const move = (ev) => {
            const d = drag.current;
            if (!d) return;
            const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
            let { left, top, width, height } = d.start;
            let right = left + width, bottom = top + height;
            if (d.mode === 'move') {
                left = Math.min(Math.max(left + dx, bounds.left), bounds.left + bounds.width - width);
                top = Math.min(Math.max(top + dy, bounds.top), bounds.top + bounds.height - height);
                right = left + width; bottom = top + height;
                // Snap whichever edge is near the frame's.
                if (Math.abs(left - bounds.left) < SNAP_PX) { left = bounds.left; right = left + width; }
                if (Math.abs(bounds.left + bounds.width - right) < SNAP_PX) { right = bounds.left + bounds.width; left = right - width; }
                if (Math.abs(top - bounds.top) < SNAP_PX) { top = bounds.top; bottom = top + height; }
                if (Math.abs(bounds.top + bounds.height - bottom) < SNAP_PX) { bottom = bounds.top + bounds.height; top = bottom - height; }
            } else {
                const snapTo = (v, edge) => (Math.abs(v - edge) < SNAP_PX ? edge : v);
                if (d.mode.includes('w')) left = snapTo(Math.min(Math.max(left + dx, bounds.left), right - MIN_PX), bounds.left);
                if (d.mode.includes('e')) right = snapTo(Math.max(Math.min(right + dx, bounds.left + bounds.width), left + MIN_PX), bounds.left + bounds.width);
                if (d.mode.includes('n')) top = snapTo(Math.min(Math.max(top + dy, bounds.top), bottom - MIN_PX), bounds.top);
                if (d.mode.includes('s')) bottom = snapTo(Math.max(Math.min(bottom + dy, bounds.top + bounds.height), top + MIN_PX), bounds.top + bounds.height);
            }
            d.current = { left, top, width: right - left, height: bottom - top };
            setLive(d.current);
        };
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            const result = drag.current?.current;
            drag.current = null;
            setLive(null);
            if (result) onCommit(result);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    const stop = (e) => e.stopPropagation(); // keep clicks off the player (play/pause, drawing)
    return (
        <div className="filter-rect-edit" onPointerDown={begin('move')} onMouseDown={stop} onClick={stop}
            style={{ left: shown.left + 'px', top: shown.top + 'px', width: shown.width + 'px', height: shown.height + 'px' }}>
            {HANDLES.map(h => <div key={h} className={`filter-rect-handle filter-rect-handle--${h}`} onPointerDown={begin(h)} onMouseDown={stop} onClick={stop} />)}
            <button className="filter-rect-remove" title="Remove this rectangle" onPointerDown={stop} onMouseDown={stop}
                onClick={e => { e.stopPropagation(); onRemove(); }}>✕</button>
        </div>
    );
}

function VideoFilter({
    records,
    time,
    setMute,
    setTime,
    setSpeed,
    playerConfig,
    blackScreen,
    blurScreen,
    enableEditMode,
    setDrawingRect,
    setDrawingEnabled,
    selectedRecords,
    videoAspectRatio,
    updateFilterItem,
    setSelectedFilterItems,
}) {

    const [filterType, setFilterType] = useState(FILTER_TYPE.NONE);
    const editor = useRef(null);
    const rect = useRef(null);
    const divFilter = useRef(null);
    const [mouseEvent, setMouseEvent] = useState(null);
    const [recordRects, setRecordRects] = useState([]);
    const originalPoint = useRef({ x: 0, y: 0 });
    const [forceUpdate, setForceUpdate] = useState(0);
    const rectsHidden = useRectsHidden();


    useEffect(() => {
        if (!mouseEvent || mouseEvent.length < 2) return;
        const e = mouseEvent[1];
        const x = e.clientX - divFilter.current.getBoundingClientRect().x;
        const y = e.clientY - divFilter.current.getBoundingClientRect().y;
        if (mouseEvent[0] == 'down') {
            if (enableEditMode) {
                editor.current = true;
                rect.current = {};
                originalPoint.current.x = x;
                originalPoint.current.y = y;
                rect.current.left = x;
                rect.current.top = y;
                rect.current.width = 0;
                rect.current.height = 0;
            }
        } else if (mouseEvent[0] == 'move') {
            if (enableEditMode && editor.current) {
                rect.current.width = Math.abs(x - originalPoint.current.x);
                rect.current.height = Math.abs(y - originalPoint.current.y);

                rect.current.left = Math.min(x, originalPoint.current.x);
                rect.current.top = Math.min(y, originalPoint.current.y);
            }
        } else if (mouseEvent[0] == 'up') {
            if (enableEditMode && editor.current) {
                editor.current = false;

                const rectangle = convertToVideo(rect.current);
                setDrawingRect(rectangle);
                rect.current = null;
            }
        }
    }, [mouseEvent, enableEditMode]);

    const convertToVideo = (rect) => {
        const { width, height } = divFilter.current.getBoundingClientRect();
        const aspectRatio = height / width;

        let videoH = 0;
        let videoW = 0;

        if (videoAspectRatio > aspectRatio) {
            videoH = height;
            videoW = height * 1 / videoAspectRatio;
        } else {
            videoH = width * videoAspectRatio;
            videoW = width;
        }

        const heightDif = (height - videoH) / 2;
        const widthDif = (width - videoW) / 2;

        const rectangle = {};

        rectangle.left = ((rect.left - widthDif) / videoW * 100).toFixed(3);
        rectangle.top = ((rect.top - heightDif) / videoH * 100).toFixed(3);
        rectangle.width = (rect.width / videoW * 100).toFixed(3);
        rectangle.height = (rect.height / videoH * 100).toFixed(3);

        return rectangle;
    }

    const convertFromVideo = (rect) => {
        if(!rect){
            const rectangle = {};
            rectangle.left = 0;
            rectangle.top = 0;
            rectangle.width = 0;
            rectangle.height = 0;
            return rectangle;
        }
        const { width, height } = divFilter.current.getBoundingClientRect();
        const aspectRatio = height / width;

        let videoH = 0;
        let videoW = 0;

        if (videoAspectRatio > aspectRatio) {
            videoH = height;
            videoW = height * 1 / videoAspectRatio;
        } else {
            videoH = width * videoAspectRatio;
            videoW = width;
        }

        const heightDif = (height - videoH) / 2;
        const widthDif = (width - videoW) / 2;

        const rectangle = {};

        let r_left = rect.left * videoW / 100;
        let r_top = rect.top * videoH / 100;
        let r_width = rect.width / 100;
        let r_height = rect.height / 100;

        rectangle.left = r_left + widthDif;
        rectangle.top = r_top + heightDif;
        rectangle.width = r_width * videoW;
        rectangle.height = r_height * videoH;

        return rectangle;
    }

    const onDown = useCallback(
        (e) => {
            setMouseEvent(['down', e])
        },
        [],
    );
    const onMove = useCallback(
        (e) => {
            setMouseEvent(['move', e])
        },
        [],
    );
    const onUp = useCallback(
        (e) => {
            setMouseEvent(['up', e])
            setDrawingEnabled(false);
        },
        [],
    );

    useLayoutEffect(() => {
        function updateSize() {
            setForceUpdate(Math.random());
        }
        window.addEventListener('resize', updateSize);

        return () => window.removeEventListener('resize', updateSize);

    }, [])

    useEffect(() => {
        if (enableEditMode) {
            document.addEventListener('mousedown', onDown);
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        } else {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
    }, [enableEditMode])


    useEffect(() => {
        if (blackScreen) return;

        if(blurScreen){
            setRecordRects([]);
            switch (playerConfig.rightclick[0]) {
                case PLAYER_ACTION.BLACK:
                    setFilterType(FILTER_TYPE.BLACK)
                    break;
                case PLAYER_ACTION.BLUR:
                    setFilterType(FILTER_TYPE.BLUR)
                    break;
                case PLAYER_ACTION.BLUR_EXTRA:
                    setFilterType(FILTER_TYPE.BLUR_EXTRA)
                    break;
                case PLAYER_ACTION.BLUR_EXTREME:
                    setFilterType(FILTER_TYPE.BLUR_EXTREME)
                    break;
                case PLAYER_ACTION.BLUR_EXTREME_X2:
                    setSpeed(2.0);
                    setFilterType(FILTER_TYPE.BLUR_EXTREME)
                    break;
                default:
                    break;
            }
            setMute(playerConfig.rightclick[1] == PLAYER_ACTION.MUTE);
            return;
        } else {
            // No filter loaded, or it's being ignored (playerConfig.ignoreFilters).
            if (!records || !records.length || playerConfig.ignoreFilters) {
                setRecordRects([]);
                setMute(false);
                if (filterType !== FILTER_TYPE.NONE)
                    setFilterType(FILTER_TYPE.NONE);
                return;
            }
        }

        var currentRecords = getRecordsAtTime(time);
        var mute = false;
        var skip = false;
        var black = false;
        var blur = false;
        var blurExtra = false;
        var blurExtreme = false;
        var doubleSpeed = false;
        var skipRecord = null;

        if (currentRecords.length == 0) {
            setRecordRects([]);
        }
        let geometries=[];
        for (var i = 0; i < currentRecords.length; i++) {
            var record = currentRecords[i];
            geometries = [...geometries, ...record.geometries];

            // A scene the AI wasn't sure about: blurred instead of skipped or blacked out (its
            // audio action still applies), so a false alarm costs nothing but a moment of blur.
            if (record.Intensity === 'Uncertain' && playerConfig.uncertainBlur !== false && playerConfig[record.Type][0] !== PLAYER_ACTION.NOACTION) {
                blurExtreme = true;
                if (playerConfig[record.Type][1] === PLAYER_ACTION.MUTE) mute = true;
                continue;
            }

            if (playerConfig[record.Type][0] === PLAYER_ACTION.MUTE || playerConfig[record.Type][1] === PLAYER_ACTION.MUTE) {
                mute = true;
            }
            if (playerConfig[record.Type][0] === PLAYER_ACTION.SKIP || playerConfig[record.Type][1] === PLAYER_ACTION.SKIP) {
                skip = true;
                skipRecord = record;
            }
            if (playerConfig[record.Type][0] === PLAYER_ACTION.BLACK || playerConfig[record.Type][1] === PLAYER_ACTION.BLACK) {
                black = true;
            }
            if (playerConfig[record.Type][0] === PLAYER_ACTION.BLUR || playerConfig[record.Type][1] === PLAYER_ACTION.BLUR) {
                blur = true;
            }
            if (playerConfig[record.Type][0] === PLAYER_ACTION.BLUR_EXTRA || playerConfig[record.Type][1] === PLAYER_ACTION.BLUR_EXTRA) {
                blurExtra = true;
            }
            if (playerConfig[record.Type][0] === PLAYER_ACTION.BLUR_EXTREME || playerConfig[record.Type][1] === PLAYER_ACTION.BLUR_EXTREME) {
                blurExtreme = true;
            }
            if (playerConfig[record.Type][0] === PLAYER_ACTION.BLUR_EXTREME_X2 || playerConfig[record.Type][1] === PLAYER_ACTION.BLUR_EXTREME_X2) {
                blurExtreme = true;
                doubleSpeed = true;
            }
        }

        setRecordRects(geometries);
        setMute(mute);

        if (skip) {
            setTime(skipRecord.endTime() + 0.1);
            return;
        }


        if (blur)
            setFilterType(FILTER_TYPE.BLUR);
        else if (blurExtra)
            setFilterType(FILTER_TYPE.BLUR_EXTRA);
        else if (blurExtreme)
            setFilterType(FILTER_TYPE.BLUR_EXTREME);
        else if (black)
            setFilterType(FILTER_TYPE.BLACK);
        else if (filterType !== FILTER_TYPE.NONE)
            setFilterType(FILTER_TYPE.NONE);


        if (doubleSpeed) {
            setSpeed(2.0);
        } else {
            setSpeed(1.0);
        }

    }, [time, records, playerConfig, blurScreen]);

    const class2 = `${blackScreen ? "video-filter-black" : getFilterClass(filterType)}`;

    // The selected record's rectangles, editable on the video (see EditableRect) — unless hidden
    // from the timeline to see the frame underneath.
    const selected = selectedRecords.length > 0 ? selectedRecords[0] : null;
    const frameBox = selected && !rectsHidden && divFilter.current && selected.geometries.length > 0
        ? convertFromVideo({ left: 0, top: 0, width: 100, height: 100 })
        : null;
    const saveGeometries = (geometries) => {
        selected.geometries = geometries;
        const index = (records || []).indexOf(selected);
        updateFilterItem(selected, index);
        setSelectedFilterItems([selected]);
    };
    const commitRect = (i, px) => {
        const v = convertToVideo(px);
        const g = selected.geometries[i];
        g.left = Number(v.left); g.top = Number(v.top); g.width = Number(v.width); g.height = Number(v.height);
        saveGeometries([...selected.geometries]);
    };

    // While a selected record's rectangles are being edited, this layer goes above the player's
    // controls (the layer itself lets clicks through; only the rectangles take them).
    return <div ref={divFilter} className={`video-filter ${(!playerConfig.filterRect || recordRects.length == 0 || blackScreen) ? class2 : ''}${frameBox ? ' video-filter--editing' : ''}`}>
        {enableEditMode && rect.current && <div style={{
            position: 'absolute',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 10,
            left: rect.current.left + 'px',
            top: rect.current.top + 'px',
            width: rect.current.width + 'px',
            height: rect.current.height + 'px',
        }}></div>}

        {selectedRecords?.[0] && <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', left: 0, top: "20%", width: '100%', height: '100%', position: 'absolute' }}>
            {SCENETYPE_ARRAY.map((item, index) => {
                const selectedFilter = selectedRecords?.[0];
                const isSelected = item == selectedFilter.Type;
                return <Fragment>
                    <div key={selectedFilter.Type + index} style={{ width: '100px', display: 'inline-block', backgroundColor: isSelected ? "rgba(255,0,0,0.5)" : "rgba(10,10,10,0.5)", color:'white'}}>{item}</div>
                </Fragment>
            })
            }
        </div>}

        {frameBox && selected.geometries.map((g, i) => (
            <EditableRect
                key={`${selected.id}-${i}-${g.left}-${g.top}-${g.width}-${g.height}`}
                rect={convertFromVideo(g)}
                bounds={frameBox}
                onCommit={px => commitRect(i, px)}
                onRemove={() => saveGeometries(selected.geometries.filter((_, k) => k !== i))}
            />
        ))}

        {playerConfig.filterRect && recordRects && recordRects.length > 0 && recordRects.map((record) => {
            record = convertFromVideo(record);
            return <div style={{
                position: 'absolute',
                background: filterType == FILTER_TYPE.BLACK ? 'black' : 'rgba(128,128,128,0.1)',
                zIndex: 10,
                left: record.left + 'px',
                top: record.top + 'px',
                width: record.width + 'px',
                height: record.height + 'px',
            }}
                className={class2}></div>
        })}
    </div>;
}


const mapStateToProps = state => {
    const records = selectRecords(state);
    const time = selectTime(state);
    const playerConfig = selectPlayerConfig(state);
    const enableEditMode = selectDrawingEnabled(state);

    const selectedRecords = selectSelectedFilterdItems(state);
    return { records, time, playerConfig, enableEditMode, selectedRecords };
};

export default connect(mapStateToProps, { setMute, setTime, setSpeed, setDrawingRect, setDrawingEnabled, updateFilterItem, setSelectedFilterItems })(VideoFilter);
