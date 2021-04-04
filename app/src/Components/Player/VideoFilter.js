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

export default function VideoFilter({ getPlayer, filterSrc }) {
    const [style, setStyle] = useState(FilterStyle);
    const [filter, setFilter] = useState('');
    const parentGuideClass = new SceneGuideClass();
    if (filterSrc != filter){
        setFilter(filterSrc);
    }

    useEffect(() => {
        var player = getPlayer()
        player.addEventListener('timeupdate', (event) => {
            if (parentGuideClass) {
                var records = parentGuideClass.getRecordsAtTime(event.target.currentTime);
                var mute = false;
                for (var i = 0; i < records.length; i++) {
                    if (records[0].Type == SceneType.Profanity) mute = true;
                }

                if (mute) player.volume = 0.0;
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

    useEffect(() => {
        fetch(filterSrc)
            .then((r) => r.text())
            .then(text => {
                parentGuideClass.fromString(text);
            })  
    }, filter);

    return (
        <div style={style}>
        </div>
    );
}
