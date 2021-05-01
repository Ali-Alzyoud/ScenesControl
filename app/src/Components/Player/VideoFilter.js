import React, { useEffect, useState } from "react";
import { SceneType } from "./../../common/SceneGuide";
import { PlayerConfig, PLAYER_ACTION } from "../../common/PlayerConfig";

var FilterStyle = {
  pointerEvents: "none",
  position: "absolute",
  left: "0",
  top: "0",
  width: "100%",
  height: "100%",
  zIndex: 2,
};

export default function VideoFilter({ getPlayer, filterObject, time }) {
  const [style, setStyle] = useState(FilterStyle);

  useEffect(() => {
    if (!filterObject) return;
    var records = filterObject.getRecordsAtTime(time);
    var mute = false;
    var skip = false;
    var black = false;
    var blur = false;
    var skipRecord = null;

    for (var i = 0; i < records.length; i++) {
        var record = records[i];
        if(PlayerConfig[record.Type] === PLAYER_ACTION.MUTE) {
            mute = true;
        }
        if(PlayerConfig[record.Type] === PLAYER_ACTION.SKIP) {
            skip = true;
            skipRecord = record;
        }
        if(PlayerConfig[record.Type] === PLAYER_ACTION.BLACK) {
            black = true;
        }
        if(PlayerConfig[record.Type] === PLAYER_ACTION.BLUR) {
            blur = true;
        }
    }

    if (!mute) {
        getPlayer().volume = 1.0;
    }

    if (skip){
        getPlayer().currentTime = skipRecord.endTime() + 0.01;
        return;
    }

    
    if (mute) {
        getPlayer().volume = 0.0;
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

  }, [time]);

  return <div style={style}></div>;
}
