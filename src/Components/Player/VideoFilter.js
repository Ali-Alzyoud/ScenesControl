import React, { useEffect, useState } from "react";

import { connect } from "react-redux";
import { selectTime, selectRecords, getRecordsAtTime, selectPlayerConfig } from '../../redux/selectors';
import { setMute, setTime, setSpeed } from "../../redux/actions";
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
    blackScreen
}) {

    const [filterType, setFilterType] = useState(FILTER_TYPE.NONE);

    useEffect(() => {
        if (blackScreen) return;

        if(!records || !records.length){
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

    return <div className={`video-filter ${blackScreen?"video-filter-black" : getFilterClass(filterType)} `}></div>;
}


const mapStateToProps = state => {
    const records = selectRecords(state);
    const time = selectTime(state);
    const playerConfig = selectPlayerConfig(state);
    return { records, time, playerConfig };
};

export default connect(mapStateToProps, { setMute, setTime, setSpeed })(VideoFilter);