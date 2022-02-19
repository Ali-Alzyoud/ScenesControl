import React, { useEffect, useState } from "react";

import { connect } from "react-redux";
import { selectTime, selectRecords, getRecordsAtTime, selectPlayerConfig } from '../../redux/selectors';
import { setMute, setTime, setSpeed } from "../../redux/actions";
import { PLAYER_ACTION } from '../../redux/actionTypes';


const FilterStyle = {
    pointerEvents: "none",
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    zIndex: 2,
};

function VideoFilter({
    records,
    time,
    setMute,
    setTime,
    setSpeed,
    playerConfig,
    blackScreen
}) {
    const [style, setStyle] = useState(FilterStyle);

    useEffect(() => {
        if (blackScreen) {
            setStyle({ ...style, background: "black" });
        }
        else {
            setStyle({ ...style, background: "transparent" });
        }
    }, [blackScreen]);

    useEffect(() => {
        if (!records || !records.length || blackScreen) return;

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

        if (blur || black || blurExtra || blurExtreme) {
            if (blur)
                setStyle({ ...FilterStyle, backdropFilter: "blur(15px)", width: "101%" });
            else if (blurExtra)
                setStyle({ ...FilterStyle, backdropFilter: "blur(45px)", width: "101%" });
            else if (blurExtreme)
                setStyle({ ...FilterStyle, backdropFilter: "blur(80px)", width: "101%" });
            else
                setStyle({ ...FilterStyle, background: "black" });
        }
        else {
            setStyle({ ...FilterStyle });
        }

        if (doubleSpeed) {
            setSpeed(2.0);
        } else {
            setSpeed(1.0);
        }

    }, [time, records, playerConfig]);

    return <div style={style}></div>;
}


const mapStateToProps = state => {
    const records = selectRecords(state);
    const time = selectTime(state);
    const playerConfig = selectPlayerConfig(state);
    return { records, time, playerConfig };
};

export default connect(mapStateToProps, { setMute, setTime, setSpeed })(VideoFilter);