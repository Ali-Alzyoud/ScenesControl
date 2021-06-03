import React, { useEffect, useRef, useState } from 'react'
import playicon from '../../assets/play.png';
import pauseicon from '../../assets/pause.png';
import fullicon from '../../assets/full-screen.png';

import { MdForward5 } from 'react-icons/md'
import { MdForward10 } from 'react-icons/md'
import { MdForward30 } from 'react-icons/md'

import { MdReplay5 } from 'react-icons/md'
import { MdReplay10 } from 'react-icons/md'
import { MdReplay30 } from 'react-icons/md'

import './style.css'

import { connect } from "react-redux";
import { getTime, getDuration, getPlayerState } from '../../redux/selectors';
import { setTime, setPlayerState } from '../../redux/actions';

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

function VideoControls({ time,
    setTime,
    duration,
    visible,
    playerState,
    setPlayerState,
    onFullscreen
}) {

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
        if (h < 10) h = '0' + h;
        if (m < 10) m = '0' + m;
        if (s < 10) s = '0' + s;
        return h + ':' + m + ':' + s
    }

    useEffect(() => {
        if (duration > 0) {
            setProgress(Math.floor(time / duration * 100) / 100);
        }
        timeLabel.current.innerHTML = timeToString(time) + ' / ' + timeToString(duration);
    }, [time, duration]);

    useEffect(() => {
        const KEY = {
            SPACE: 32,
            LEFT: 37,
            RIGHT: 39,
            F: 70,
        };
        const handleKeyDown = (e) => {
            let jump = e.shiftKey ? 1 : 5;
            if (e.ctrlKey) jump*=2;

            switch (e.keyCode) {
                case KEY.SPACE:
                    onPlayClick()
                    break;
                case KEY.LEFT:
                    setTime(time - jump)
                    break;
                case KEY.RIGHT:
                    setTime(time + jump)
                    break;
                case KEY.F:
                    onFullscreen()
                    break;
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, [time, playerState]);

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
        setTime(progress * duration);
    }

    const mousedown = (e) => {
        updateSeek(e.clientX);
    }

    const cleanDocEvents = () => {
        document.onmousemove = null;
        document.onmouseup = null;
    }

    const onPlayClick = (event) => {
        if (playerState === 'play') {
            setPlayerState('pause');
        }
        else {
            setPlayerState('play');
        }
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
            <p ref={timeLabel} className='controltime' />
            {/* <MdReplay30 className='controls left' onClick={()=>{setTime(time-30)}} />
            <MdReplay10 className='controls left' onClick={()=>{setTime(time-10)}} /> */}
            <MdReplay5 className='controls left' onClick={() => { setTime(time - 5) }} />
            <img id="btn_play"
                src={
                    (playerState === 'pause') ?
                        playicon : pauseicon
                }
                alt='error'
                style={styleButton}
                onClick={onPlayClick}
                onMouseEnter={() => { mousein("Button") }}
                onMouseLeave={() => { mouseout("Button") }}
            />
            <MdForward5 className='controls right' onClick={() => { setTime(time + 5) }} />
            {/* <MdForward10 className='controls right' onClick={()=>{setTime(time+10)}} />
            <MdForward30 className='controls right' onClick={()=>{setTime(time+30)}} /> */}
            <img id="full-screen"
                src={fullicon}
                alt='error'
                style={{ ...styleButton, float: "right" }}
                onClick={onFullscreen}
                onMouseEnter={() => { mousein("Button") }}
                onMouseLeave={() => { mouseout("Button") }}
            />
        </div>
    );
}

const mapStateToProps = state => {
    return {
        time: getTime(),
        duration: getDuration(),
        playerState: getPlayerState(),
    };
};

export default connect(mapStateToProps, { setTime, setPlayerState, setPlayerState })(VideoControls);