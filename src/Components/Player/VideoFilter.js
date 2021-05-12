import React, { useEffect, useState } from "react";

import { connect } from "react-redux";
import { getTime, getRecords, getRecordsAtTime, getPlayerConfig } from '../../redux/selectors';
import { setVolume, setTime } from "../../redux/actions";
import { PLAYER_ACTION } from '../../redux/actionTypes';


var FilterStyle = {
  pointerEvents: "none",
  position: "absolute",
  left: "0",
  top: "0",
  width: "100%",
  height: "100%",
  zIndex: 2,
};

function VideoFilter({ records, time, setVolume, setTime, playerConfig }) {
  const [style, setStyle] = useState(FilterStyle);

  useEffect(() => {
    if (!records || !records.length > 0) return;

    var currentRecords = getRecordsAtTime(time);
    var mute = false;
    var skip = false;
    var black = false;
    var blur = false;
    var skipRecord = null;

    for (var i = 0; i < currentRecords.length; i++) {
        var record = currentRecords[i];
        if(playerConfig[record.Type] === PLAYER_ACTION.MUTE) {
            mute = true;
        }
        if(playerConfig[record.Type] === PLAYER_ACTION.SKIP) {
            skip = true;
            skipRecord = record;
        }
        if(playerConfig[record.Type] === PLAYER_ACTION.BLACK) {
            black = true;
        }
        if(playerConfig[record.Type] === PLAYER_ACTION.BLUR) {
            blur = true;
        }
    }

    if (!mute) {
        setVolume(1.0);
    }

    if (skip){
        setTime(skipRecord.endTime() + 0.01);
        return;
    }

    
    if (mute) {
        setVolume(0.0);
    }
    if (blur || black) {
        if(blur)
            setStyle({ ...FilterStyle, backdropFilter: "blur(15px)" });
        else
            setStyle({ ...FilterStyle, background: "black" });
    }
    else {
        setStyle({ ...FilterStyle});
    }

  }, [time, records]);

  return <div style={style}></div>;
}


const mapStateToProps = state => {
    const records = getRecords();
    const time = getTime();
    const playerConfig =  getPlayerConfig();
    return { records, time, playerConfig };
  };

export default connect(mapStateToProps, {setVolume,setTime})(VideoFilter);