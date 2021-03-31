import React, { useEffect, useRef, useState } from 'react'
import playicon from '../assets/play.png';
import pauseicon from '../assets/pause.png';
import fullicon from '../assets/full-screen.png';
import PLAY_STATE from './defines'

var styleControls = {
    margin: '0 auto',
    marginTop: '-80px',
    top: '-100%',
    width: '80%',
    zIndex: 99,
    position: "relative",
    opacity: 1,
    transition: 'opacity 3s'
}

var seekbarStyle = {
    margin: '0 auto',
    width: '100%',
    height: '5px',
    background: 'gray',
}

var seekbarStyleProgress = {
    marginTop: '-5px',
    width: '100%',
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
    opacity: 0.9
}

var seekbuttonStyle = {
    width: '32px',
    height: '32px',
    marginTop: '16px'
}

export default function VideoControls({ getPlayer, state, playAction, visible }) {

    const seekbutton = useRef(null);
    const seekbar = useRef(null);
    let style;
    if (visible)
        style = { ...styleControls, opacity: 1 };
    else
        style = { ...styleControls, opacity: 0 };

    const [styleHandle, setStyleHandle] = useState(seekhandleStyle);
    const [styleButton, setStyleButton] = useState(seekbuttonStyle);
    const [styleProgress] = useState(seekbarStyleProgress);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        var player = getPlayer();
        var _time = null;
        const progress = (event) => {
            setProgress(Math.floor(player.currentTime / player.duration * 100) / 100);
        };
        
        // const mousemove = (event) => {
        //     if (_time == null)
        //     _time = setTimeout(() => {
        //         setStyle({...style, opacity: 1});
        //         setTimeout(() => {
        //             setStyle({...style, opacity: 0});
        //             _time = null;
        //         }, 2000);
        //     }, 1);
            
        // };
        player.addEventListener('timeupdate', progress);

        return () => {
            player.removeEventListener('timeupdate', progress);
        }
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

    const cleanDocEvents = () => {
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
            <img id="full-screen"
                src={fullicon}
                style={{ ...styleButton, float: "right" }}
                onClick={() => { getPlayer().parentElement.requestFullscreen() }}
                onMouseEnter={() => { mousein("Button") }}
                onMouseLeave={() => { mouseout("Button") }}
            />
        </div>
    );
}