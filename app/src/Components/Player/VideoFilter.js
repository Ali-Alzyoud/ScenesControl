import React, { useEffect, useRef, useState } from 'react'
import { SceneGuideClass, SceneType } from './../../common/SceneGuide'

var FilterStyle = {
    pointerEvents: 'none',
    position: "relative",
    left: '0',
    top: '-100%',
    width: '100%',
    height: '100%',
    zIndex: 2,
}

export default function VideoFilter({ getPlayer, filterObject, time }) {
    const [style, setStyle] = useState(FilterStyle);

    useEffect(() => {
        if (!filterObject) return;
        var records = filterObject.getRecordsAtTime(time);
        var mute = false;
        for (var i = 0; i < records.length; i++) {
            if (records[0].Type == SceneType.Profanity) mute = true;
        }

        if (mute) getPlayer().volume = 0.0;
        else getPlayer().volume = 1.0;

        if (records.length > 0) {
            setStyle({ ...FilterStyle, backdropFilter: 'blur(15px)' })
        }
        else {
            setStyle({ ...FilterStyle })
        }
    },[time]);

    return (
        <div style={style}>
        </div>
    );
}
