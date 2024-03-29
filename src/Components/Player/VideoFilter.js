import React, { useEffect, useState, useRef, useCallback, useLayoutEffect, useMemo, Fragment } from "react";

import { connect, useSelector } from "react-redux";
import { selectTime, selectRecords, getRecordsAtTime, selectPlayerConfig, selectDrawingEnabled, selectSelectedFilterdItems } from '../../redux/selectors';
import { setMute, setTime, setSpeed, setDrawingRect, setDrawingEnabled } from "../../redux/actions";
import { PLAYER_ACTION } from '../../redux/actionTypes';
import { SCENETYPE_ARRAY } from "../../common/SceneGuide";

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
    videoAspectRatio
}) {

    const [filterType, setFilterType] = useState(FILTER_TYPE.NONE);
    const editor = useRef(null);
    const rect = useRef(null);
    const divFilter = useRef(null);
    const [mouseEvent, setMouseEvent] = useState(null);
    const [recordRects, setRecordRects] = useState([]);
    const originalPoint = useRef({ x: 0, y: 0 });
    const [forceUpdate, setForceUpdate] = useState(0);


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
            if (!records || !records.length) {
                setRecordRects([]);
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

    let selectedRects = null;
    if (selectedRecords.length > 0 && selectedRecords[0].geometries.length > 0) {
        selectedRects = [];
        for (let i = 0; i < selectedRecords[0].geometries.length; i++) {
            selectedRects.push(convertFromVideo(selectedRecords[0].geometries[i]));
        }
    }

    return <div ref={divFilter} className={`video-filter ${(!playerConfig.filterRect || recordRects.length == 0 || blackScreen) ? class2 : ''}`}>
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

        {selectedRects && selectedRects.map((selectedRect) => {
            return <div style={{
                position: 'absolute',
                zIndex: 10,
                background: 'rgba(200,50,50,0.5)',
                left: selectedRect.left + 'px',
                top: selectedRect.top + 'px',
                width: selectedRect.width + 'px',
                height: selectedRect.height + 'px',
            }}></div>
        })}

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

export default connect(mapStateToProps, { setMute, setTime, setSpeed, setDrawingRect, setDrawingEnabled })(VideoFilter);
