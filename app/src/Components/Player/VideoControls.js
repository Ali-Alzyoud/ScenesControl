import React, { useEffect, useRef, useState } from 'react'
import playicon from '../../assets/play.png';
import pauseicon from '../../assets/pause.png';
import fullicon from '../../assets/full-screen.png';
import PLAY_STATE from './defines'

var styleControls = {
    margin: '0 auto',
    width: '80%',
    zIndex: 99,
    opacity: 1,
    transition: 'opacity 3s',
    position: 'relative'
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

export default function VideoControls({ getPlayer,
                                        state,
                                        playAction,
                                        visible,
                                        onSeek,
                                        onFullscreen,
                                        currentTime,
                                        duration}) {

    const seekbutton = useRef(null);
    const seekbar = useRef(null);
    const timeLabel = useRef(null);
    let style;
    if (visible)
        style = { ...styleControls, opacity: 1 };
    else
        style = { ...styleControls, opacity: 0 };

    const [styleHandle, setStyleHandle] = useState(seekhandleStyle);
    const [styleButton, setStyleButton] = useState(seekbuttonStyle);
    const [styleProgress] = useState(seekbarStyleProgress);
    const [progress, setProgress] = useState(0);

    const timeToString = (time) => {
        let h = Math.floor(time / (60 * 60) % 24);
        let m = Math.floor(time / (60) % 60);
        let s = Math.floor(time % 60);
        if(h < 10) h = '0' + h;
        if(m < 10) m = '0' + m;
        if(s < 10) s = '0' + s;
        return h + ':' + m + ':' + s
    }

    useEffect(() => {
        if (duration > 0){
            setProgress(Math.floor(currentTime / duration * 100) / 100);
        }
        timeLabel.current.innerHTML = timeToString(currentTime) + ' / ' + timeToString(duration);
    }, [currentTime, duration]);

    const mouseMove = (e) => {
        updateSeek(e.clientX);
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
            <p ref={timeLabel} style={{float:'left', left:'20px', position:'absolute', color:'white'}}></p>
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
                onClick={onFullscreen}
                onMouseEnter={() => { mousein("Button") }}
                onMouseLeave={() => { mouseout("Button") }}
            />
        </div>
    );
}