import React, { useEffect, useRef, useState } from 'react'
import playicon from '../assets/play.png';
import pauseicon from '../assets/pause.png';
import PLAY_STATE from './defines'

var styleControls = {
    margin: '0 auto',
    marginTop: '-80px',
    top: '-100%',
    width: '100%',
    zIndex: 99,
    position: "relative",
    opacity: 1,
    transition: 'opacity 3s'
}

var seekbarStyle = {
    margin: '0 auto',
    width: '80%',
    height: '5px',
    background: 'gray',
}

var seekbarStyleProgress = {
    marginTop: '-5px',
    width: '80%',
    height: '5px',
    background: 'white',
}

var seekhandleStyle = {
    left: '100%',
    top: '-6px',
    marginLeft: '-8px',
    width: '16px',
    height: '16px',
    background: 'white',
    position: 'relative',
    borderRadius: '50%',
    opacity : 0.9
}

var seekbuttonStyle = {
    width: '32px',
    height: '32px',
    marginTop: '16px'
}

export default function VideoControls({ getPlayer, state, playAction }) {

    const seekbutton = useRef(null);
    const seekbar = useRef(null);
    const [style] = useState(styleControls);
    const [styleHandle, setStyleHandle] = useState(seekhandleStyle);
    const [styleButton, setStyleButton] = useState(seekbuttonStyle);
    const [styleProgress] = useState(seekbarStyleProgress);
    const [progress, setProgress] = useState(0);
    let isDown = false;

    useEffect(() => {
        var player = getPlayer();
        player.addEventListener('timeupdate', (event) => {
            setProgress(Math.floor(player.currentTime / player.duration * 100) / 100);
        });
    }, []);

    const mouseMove = (e) => {
            updateSeek(e.clientX);
    }

    const onSeek = (per) => {
        let player = getPlayer();
        if (player)
            player.currentTime = player.duration * per;
    }

    const mousein = (str) => {
        if (str === "Handle")
            setStyleHandle({ ...styleHandle, cursor: 'pointer' });
        else if (str === "Button")
            setStyleButton({ ...styleButton, cursor: 'pointer' });
    }

    const mouseout = (str) => {
        if (str === "Handle")
            setStyleHandle({ ...styleHandle, cursor: 'arrow' });
        else if (str === "Button")
            setStyleButton({ ...styleButton, cursor: 'arrow' });
    }

    const updateSeek = (x) => {
        var rect = seekbar.current.getBoundingClientRect();
        let progress = (x - rect.left) / rect.width;
        if (progress >= 1.0) progress = 1.0;
        if (progress < 0.0) progress = 0.0;
        onSeek(progress)
    }

    const mousedown = (e) => {
        updateSeek(e.clientX);
    }

    const cleanDocEvents = ()=>{
        document.onmousemove = null;
        document.onmouseup = null;
    }

    return (
        <div style={style}>
            <div style={seekbarStyle} ref={seekbar} onMouseDown={mousedown} onMouseUp={cleanDocEvents}>
                <div style={{ ...styleProgress, width: (progress * 100) + '%' }}>
                    <div style={styleHandle}
                        ref={seekbutton}
                        onMouseEnter={() => { mousein("Handle") }}
                        onMouseLeave={() => { mouseout("Handle") }}
                        onMouseDown={(e) => { 
                            document.onmousemove = mouseMove;
                            document.onmouseup = cleanDocEvents;
                        }}
                    />
                </div>
            </div>
            <img id="btn_play"
                src={
                    (state === PLAY_STATE.INITIAL || state === PLAY_STATE.PAUSE) ?
                        playicon : pauseicon
                }
                style={styleButton}
                onClick={playAction}
                onMouseEnter={() => { mousein("Button") }}
                onMouseLeave={() => { mouseout("Button") }}
            />
        </div>
    );
}