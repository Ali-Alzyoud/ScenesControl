import React, { useEffect, useRef, useState } from 'react'

import { MdForward5 } from 'react-icons/md'
import { MdForward10 } from 'react-icons/md'
import { MdForward30 } from 'react-icons/md'

import { MdReplay5 } from 'react-icons/md'
import { MdReplay10 } from 'react-icons/md'
import { MdReplay30 } from 'react-icons/md'

import { GiExpand } from 'react-icons/gi'
import { MdPlayArrow, MdPause } from 'react-icons/md'

import './style.css'

import { connect } from "react-redux";
import { selectTime, selectDuration, selectPlayerState, selectVolume, selectMute, selectModalOpen } from '../../redux/selectors';
import { setTime, setPlayerState, setVolume } from '../../redux/actions';
import { Fragment } from 'react';
import Slider from '../Slider';
import { Component } from 'react';

var styleControls = {
    width: '80%',
    zIndex: 99,
    opacity: 1,
    transition: 'opacity 3s',
    position: 'absolute',
    left: '10%',
    height: '100%',
}

var seekbarStyle = {
    margin: '0 auto',
    width: '100%',
    height: '5px',
    background: 'gray',
    position: 'absolute',
    bottom: '50px',
}

var seekbarStyleProgress = {
    width: '100%',
    height: '5px',
    background: 'white',
}

var seekhandleStyle = {
    left: '100%',
    top: '-10px',
    marginLeft: '-12px',
    width: '24px',
    height: '24px',
    background: 'white',
    position: 'relative',
    borderRadius: '50%',
    border: '1px solid black',
    opacity: 1.0
}

var seekbuttonStyle = {
    width: '32px',
    height: '32px',
    marginTop: '16px'
}

const KEY = {
    SPACE: 32,
    SPACE_ANDROID_V_KB: 231,//get by debugging
    LEFT: 37,
    RIGHT: 39,
    F: 70,

    MEDIA_PLAY_PAUSE:   179,
    FAST_FORWARD:       417,
    REWIND:             412,
};

let PlayIcon = MdPlayArrow;

function VideoControls({ time,
    setTime,
    duration,
    visible,
    playerState,
    setPlayerState,
    setVolume,
    volume,
    isMute,
    onFullscreen,
    modalOpen
}) {

    const ref = useRef(null);
    const seekbutton = useRef(null);
    const seekbar = useRef(null);
    const timeLabel = useRef(null);
    let style;
    if (visible)
        style = { ...styleControls, opacity: 1};
    else
        style = { ...styleControls, opacity: 0 };

    const [styleHandle, setStyleHandle] = useState(seekhandleStyle);
    const [styleButton, setStyleButton] = useState(seekbuttonStyle);
    const [styleProgress] = useState(seekbarStyleProgress);
    const [progress, setProgress] = useState(0);
    const [keyEvent, setKeyEvent] = useState(null);

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
        if(modalOpen || !keyEvent) return;
        let jump = keyEvent.shiftKey ? 1 : 5;
            if (keyEvent.ctrlKey) jump*=2;
            if (keyEvent.altKey) jump/=2;

            switch (keyEvent.keyCode) {
                case KEY.SPACE:
                case KEY.SPACE_ANDROID_V_KB:
                case KEY.MEDIA_PLAY_PAUSE:
                    onPlayClick()
                    break;
                case KEY.LEFT:
                case KEY.REWIND:
                    setTime(time - jump)
                    break;
                case KEY.RIGHT:
                case KEY.FAST_FORWARD:
                    setTime(time + jump)
                    break;
                case KEY.F:
                    onFullscreen()
                    break;
            }
    }, [keyEvent]);

    useEffect(() => {
        
        const handleKeyDown = (e) => {
            setKeyEvent(e);
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, []);

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
        e.stopPropagation();
    }

    const cleanDocEvents = () => {
        document.onpointermove = null;
        document.onpointerup = null;
    }

    useEffect(()=>{
        if (playerState === 'play') {
            PlayIcon = (MdPause);
        }
        else {
            PlayIcon = (MdPlayArrow);
        }
    },[playerState])

    const onPlayClick = (event) => {
        if (playerState === 'play') {
            setPlayerState('pause');
        }
        else {
            setPlayerState('play');
        }
    }

    const player_controls = (
        <div className='main-controls'>
            {/* <MdReplay30 className='controls left' onClick={()=>{setTime(time-30)}} /> */}
            <MdReplay10 className='controls left' onClick={(event)=>{setTime(time-10); event.stopPropagation();}} />
            <MdReplay5 className='controls left' onClick={(event) => { setTime(time - 5); event.stopPropagation(); }} />
            <PlayIcon
                id="btn_play"
                // src={
                //     (playerState === 'pause') ?
                //         playicon : pauseicon
                // }
                alt='error'
                style={{...styleButton, color:'white'}}
                onClick={onPlayClick}
                onPointerEnter={(e) => {
                    mousein("Button");
                    e.stopPropagation();
                }}
                onPointerLeave={(e) => {
                    mouseout("Button");
                    e.stopPropagation();
                }}
            />
            <MdForward5 className='controls right' onClick={(event) => { setTime(time + 5); event.stopPropagation(); }} />
            <MdForward10 className='controls right' onClick={(event)=>{setTime(time+10);  event.stopPropagation();}} />
            {/* <MdForward30 className='controls right' onClick={()=>{setTime(time+30)}} /> */}
        </div>
    );
    return (
        <div style={style} ref={ref}>
            <div style={seekbarStyle} ref={seekbar} onPointerDown={mousedown} onPointerUp={cleanDocEvents} onClick={e=>e.stopPropagation()}>
                <div style={{ ...styleProgress, width: (progress * 100) + '%' }}>
                    <div style={styleHandle}
                        ref={seekbutton}
                        onPointerEnter={() => { mousein("Handle") }}
                        onPointerLeave={() => { mouseout("Handle") }}
                        onPointerDown={(e) => {
                            document.onpointermove = mouseMove;
                            document.onpointerup = cleanDocEvents;
                            document.onclick = e => e.stopPropagation()
                            e.stopPropagation();
                        }}
                        onClick={(e)=>{
                            e.stopPropagation();
                        }}
                    />
                </div>
            </div>
            <p ref={timeLabel} className='controltime' />
            {player_controls}
            <GiExpand
                id="full-screen"
                alt='error'
                style={{
                    ...styleButton,
                    bottom: '10px',
                    position: 'absolute',
                    right: '0',
                    color:'white',
                    paintOrder: 'stroke fill',
                    strokeWidth: '20px',
                    stroke: 'black'
                }}
                onClick={(e) => {
                    onFullscreen();
                    e.stopPropagation();
                }}
                onPointerEnter={() => { mousein("Button") }}
                onPointerLeave={() => { mouseout("Button") }}
                />
                <div className='controls-volume'>
                <Slider
                    value={volume * 100}
                    mute={isMute}
                    setValue={
                        (v) => {
                            setVolume(v);
                        }
                    } />
                </div>
        </div>
    );
}

const mapStateToProps = state => {
    return {
        time: selectTime(state),
        duration: selectDuration(state),
        playerState: selectPlayerState(state),
        volume: selectVolume(state),
        isMute: selectMute(state),
        modalOpen: selectModalOpen(state)
    };
};

export default connect(mapStateToProps, { setTime, setPlayerState, setPlayerState, setVolume })(VideoControls);