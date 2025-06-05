import React, { useEffect, useMemo, useRef, useState } from 'react'

import { MdForward5 } from 'react-icons/md'
import { MdForward10 } from 'react-icons/md'
import { MdForward30 } from 'react-icons/md'

import { MdReplay5 } from 'react-icons/md'
import { MdReplay10 } from 'react-icons/md'
import { MdReplay30 } from 'react-icons/md'

import { MdSkipNext, MdSkipPrevious } from 'react-icons/md'

import { GiExpand } from 'react-icons/gi'
import { MdPlayArrow, MdPause } from 'react-icons/md'

import './style.css'

import { connect, useDispatch, useSelector } from "react-redux";
import { selectTime, selectDuration, selectPlayerState, selectVolume, selectMute, selectModalOpen, selectVideoName, getSyncConfig } from '../../redux/selectors';
import { setTime, setPlayerState, setVolume, setSettings_syncConfig } from '../../redux/actions';
import Slider from '../Slider';
import { openContent } from '../FilterPickerLocal/FilterPickerLocal'
import Utils from '../../utils/utils'

var styleControls = {
    width: '90%',
    zIndex: 99,
    opacity: 1,
    transition: 'opacity 3s',
    position: 'absolute',
    left: '5%',
    height: '100%',
}

var seekbarStyle = {
    margin: '0 auto',
    width: '100%',
    height: '15px',
    background: '#F0F0F070',
    position: 'absolute',
    bottom: '50px',
}

var seekbarStyleProgress = {
    width: '100%',
    height: '15px',
    background: '#FFFFFF60',
}

var seekhandleStyle = {
    left: '100%',
    top: '-10px',
    marginLeft: '-17px',
    width: '34px',
    height: '34px',
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

    MEDIA_PLAY_PAUSE: 179,
    FAST_FORWARD: 417,
    REWIND: 412,
    NEXT_TRACK:	0xB0,
    PREV_TRACK:	0xB1,
};

let PlayIcon = MdPlayArrow;

function VideoControls({ time,
    setTime,
    duration,
    visible,
    visibleAudio,
    playerState,
    setPlayerState,
    setVolume,
    volume,
    isMute,
    onFullscreen,
    videoName,
    modalOpen
}) {

    const ref = useRef(null);
    const seekbutton = useRef(null);
    const seekbar = useRef(null);
    const timeLabel = useRef(null);
    const style = useMemo(() => { return { ...styleControls, opacity: visible ? 1 : 0 } }, [visible]);
    const styleAudio = useMemo(() => { return { zIndex: 100, opacity: (visibleAudio || visible) ? 1 : 0 } }, [visibleAudio, visible]);

    const [styleHandle, setStyleHandle] = useState(seekhandleStyle);
    const [styleButton, setStyleButton] = useState(seekbuttonStyle);
    const [styleProgress] = useState(seekbarStyleProgress);
    const [progress, setProgress] = useState(0);
    const [keyEvent, setKeyEvent] = useState(null);
    const dispatch = useDispatch();
    const subtitleDelay = useSelector(getSyncConfig).subtitleDelay;
    const subtitleSlope = useSelector(getSyncConfig).subtitleSlope;
    const syncConfig = useSelector(getSyncConfig)


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
        if(Utils.hasActiveInput()) return;
        if (modalOpen || !keyEvent) return;
        let jump = keyEvent.shiftKey ? 1 : 5;
        if (keyEvent.ctrlKey) jump *= 2;
        if (keyEvent.altKey) jump /= 2;

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
            case KEY.NEXT_TRACK:
                openItemFromList(1);
                break
            case KEY.PREV_TRACK:
                openItemFromList(-1);
                break
            case KEY.F:
                onFullscreen()
                break;
        }

        if (keyEvent.key == 3) {
            onFullscreen()
        } else if(keyEvent.key == 5) {
            window.location.reload();
        }

        if (keyEvent.key == 7) {
            dispatch(setSettings_syncConfig({
                ...syncConfig,
                subtitleDelay: subtitleDelay + 0.5,
                subtitleSlope: 1,
            }));
        } else if(keyEvent.key == 9) {
            dispatch(setSettings_syncConfig({
                ...syncConfig,
                subtitleDelay: subtitleDelay - 0.5,
                subtitleSlope: 1,
            }));
        }
        setKeyEvent(null);
    }, [keyEvent, subtitleDelay, subtitleSlope, syncConfig]);

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

    useEffect(() => {
        if (playerState === 'play') {
            PlayIcon = (MdPause);
        }
        else {
            PlayIcon = (MdPlayArrow);
        }
    }, [playerState])

    const onPlayClick = (event) => {
        if (videoName) {
            if (playerState === 'play') {
                setPlayerState('pause');
            }
            else {
                setPlayerState('play');
            }
        } else {
            openItemFromList(0);
        }
    }

    const openItemFromList = (dir) => {
        try {
            const index = Number(localStorage.currentListIndex) + dir;
            const { videos,
                srts,
                filters, } = JSON.parse(localStorage.currentList);
            if (index < 0 || index >= videos?.length) return;
            localStorage.currentListIndex = index;
            openContent({ image: "", video: videos[index], srt: srts[index], filter: filters[index] })
        } catch (ex) { }
    }

    const player_controls = (
        <div className='main-controls'>
            {/* <MdReplay30 className='controls left' onClick={()=>{setTime(time-30)}} /> */}
            <MdSkipPrevious  className='controls left' onClick={(event) => { openItemFromList(-1); event.stopPropagation(); }} />
            <MdReplay10 className='controls left' onClick={(event) => { setTime(time - 10); event.stopPropagation(); }} />
            <MdReplay5 className='controls left' onClick={(event) => { setTime(time - 5); event.stopPropagation(); }} />
            <PlayIcon
                id="btn_play"
                // src={
                //     (playerState === 'pause') ?
                //         playicon : pauseicon
                // }
                alt='error'
                style={{ ...styleButton, color: 'white' }}
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
            <MdForward10 className='controls right' onClick={(event) => { setTime(time + 10); event.stopPropagation(); }} />
            <MdSkipNext  className='controls right' onClick={(event) => { openItemFromList(1); event.stopPropagation(); }} />
            {/* <MdForward30 className='controls right' onClick={()=>{setTime(time+30)}} /> */}
        </div>
    );
    return (

        <div ref={ref}>
            <div style={style}>
                <div className='seekbar' style={seekbarStyle} ref={seekbar} onPointerDown={mousedown} onPointerUp={cleanDocEvents} onClick={e => e.stopPropagation()}>
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
                            onClick={(e) => {
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
                        color: 'white',
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
            </div>
            <div className='controls-volume' style={styleAudio}>
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
        modalOpen: selectModalOpen(state),
        videoName: selectVideoName(state),
    };
};

export default connect(mapStateToProps, { setTime, setPlayerState, setPlayerState, setVolume })(VideoControls);
