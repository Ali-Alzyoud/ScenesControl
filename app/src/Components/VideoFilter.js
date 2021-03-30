import React, { useEffect, useRef, useState } from 'react'
import {SceneGuideClass, SceneType} from './../common/SceneGuide'

var FilterStyle = {
    position: "relative",
    left: '0',
    top: '-100%',
    width: '100%',
    height: '100%',
    zIndex: 9,
}

var contentFile = "00:00:20\n\
00:00:22\n\
Profanity\n\
High\n\
\n\
00:00:22\n\
00:00:24\n\
Violence\n\
High\n\
\n\
00:00:30\n\
00:00:34\n\
Gore\n\
High\n\
\n\
00:00:47\n\
00:00:51\n\
Violence\n\
High"

var parentGuideClass = new SceneGuideClass();
parentGuideClass.fromString(contentFile);

export default function VideoFilter({ getPlayer, filterFile }) {
    const [style, setStyle] = useState(FilterStyle);

    useEffect(() => {
        var player = getPlayer() 
        player.addEventListener('timeupdate', (event) => {
                if (parentGuideClass) {
                    var records = parentGuideClass.getRecordsAtTime(event.target.currentTime);
                    var mute = false;
                    for (var i = 0 ; i < records.length; i++){
                        if(records[0].Type == SceneType.Profanity) mute = true;
                    }

                    if(mute) player.volume = 0.0;
                    else player.volume = 1.0;

                    if (records.length > 0) {
                        setStyle({ ...FilterStyle, backdropFilter: 'blur(15px)' })
                    }
                    else {
                        setStyle({ ...FilterStyle })
                    }
                }
            });
    }, []);


    return (
        <div style={style}>
        </div>
    );
}