import React, { useEffect, useState, useRef, useCallback } from "react";

import { connect, useSelector } from "react-redux";
import { selectTime, selectRecords, getRecordsAtTime, selectPlayerConfig, selectDrawingEnabled, selectSelectedFilterdItems  } from '../../redux/selectors';
import { setMute, setTime, setSpeed, setDrawingRect, setDrawingEnabled } from "../../redux/actions";
import { PLAYER_ACTION } from '../../redux/actionTypes';

const FILTER_TYPE = {
    NONE : 0,
    BLUR : 1,
    BLUR_EXTRA : 2,
    BLUR_EXTREME : 3,
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
    enableEditMode,
    setDrawingRect,
    setDrawingEnabled,
    selectedRecords
}) {

    const [filterType, setFilterType] = useState(FILTER_TYPE.NONE);
    const editor = useRef(null);
    const rect = useRef(null);
    const divFilter = useRef(null);
    const [mouseEvent, setMouseEvent] = useState(null);
    const [recordRect, setRecordRect] = useState(null);
    const originalPoint = useRef({x:0,y:0});


    useEffect(()=>{
        if(!mouseEvent || mouseEvent.length<2) return;
        const e = mouseEvent[1];
        const x = e.clientX - divFilter.current.getBoundingClientRect().x;
        const y = e.clientY - divFilter.current.getBoundingClientRect().y;
        if(mouseEvent[0] == 'down'){
            if(enableEditMode){
                editor.current = true;
                console.log(e);
                rect.current = {};
                originalPoint.current.x = x;
                originalPoint.current.y = y;
                rect.current.left =x;
                rect.current.top = y;
                rect.current.width = 0;
                rect.current.height = 0;
            }
        } else if(mouseEvent[0] == 'move'){
            if(enableEditMode && editor.current){
                rect.current.width = Math.abs(x - originalPoint.current.x);
                rect.current.height = Math.abs(y - originalPoint.current.y);

                rect.current.left = Math.min(x, originalPoint.current.x);
                rect.current.top = Math.min(y, originalPoint.current.y);
            }
        } else if(mouseEvent[0] == 'up'){
            if(enableEditMode && editor.current){
                console.log(rect.current);
                editor.current = false;
                const rectangle = {};
                rectangle.x = (rect.current.left/divFilter.current.getBoundingClientRect().width*100).toFixed(3);
                rectangle.y = (rect.current.top/divFilter.current.getBoundingClientRect().height*100).toFixed(3);
                rectangle.w = (rect.current.width/divFilter.current.getBoundingClientRect().width*100).toFixed(3);
                rectangle.h = (rect.current.height/divFilter.current.getBoundingClientRect().height*100).toFixed(3);
                setDrawingRect(rectangle);
            }
        }
    },[mouseEvent]);

    const onDown = useCallback(
        (e) => {
            setMouseEvent(['down',e])
        },
        [],
    );
    const onMove = useCallback(
        (e) => {
            setMouseEvent(['move',e])
        },
        [],
    );
    const onUp = useCallback(
        (e) => {
            setMouseEvent(['up',e])
            setDrawingEnabled(false);
        },
        [],
    );

    useEffect(()=>{
        if(enableEditMode){
            document.addEventListener('mousedown', onDown);
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        } else {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
    },[enableEditMode])
    

    useEffect(() => {
        if (blackScreen) return;

        if(!records || !records.length){
            setRecordRect(null);
            if(filterType != FILTER_TYPE.NONE)
                setFilterType(FILTER_TYPE.NONE);
            return;
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

        for (var i = 0; i < currentRecords.length; i++) {
            var record = currentRecords[i];
            setRecordRect(record.geometries[0]);
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

        setMute(mute);

        if (skip) {
            setTime(skipRecord.endTime() + 0.01);
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
            else if(filterType != FILTER_TYPE.NONE)
                setFilterType(FILTER_TYPE.NONE);


        if (doubleSpeed) {
            setSpeed(2.0);
        } else {
            setSpeed(1.0);
        }

    }, [time, records, playerConfig]);

    const class2 = `${blackScreen?"video-filter-black" : getFilterClass(filterType)}`;

    return <div ref={divFilter} className={`video-filter ${(!recordRect || blackScreen) ? class2 : ''}`}>
        {enableEditMode && rect.current && <div style={{
            position:'absolute',
            background:'rgba(0,0,0,0.5)',
            zIndex:3333,
            left:rect.current.left+'px',
            top:rect.current.top+'px',
            width:rect.current.width+'px',
            height:rect.current.height+'px',
        }}></div>}

    {selectedRecords.length>0 && selectedRecords[0].geometries.length > 0 && <div style={{
            position:'absolute',
            background:'rgba(200,50,50,0.5)',
            zIndex:3333,
            left:selectedRecords[0].geometries[0].left+'%',
            top:selectedRecords[0].geometries[0].top+'%',
            width:selectedRecords[0].geometries[0].width+'%',
            height:selectedRecords[0].geometries[0].height+'%',
        }}></div>}

        {recordRect && <div style={{
            position:'absolute',
            zIndex:10,
            left:recordRect.left+'%',
            top:recordRect.top+'%',
            width:recordRect.width+'%',
            height:recordRect.height+'%',
        }}
        className={class2}></div>}
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