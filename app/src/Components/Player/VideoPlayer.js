import React, { useEffect, useRef, useState } from 'react'
import PLAY_STATE from './defines'
import VideoControls from './VideoControls';
import VideoFilter from './VideoFilter'
import VideoSrt from './VideoSRT'


export default function VideoPlayer({ videoSrc, filterObject, srtObject }) {

    const [playerState, setPlayerState] = useState(PLAY_STATE.INITIAL);
    const player = useRef(null);
    const control = useRef(null);
    const [time, setTime] = useState(0);
    const [visible, setVisible] = useState(true);

    const playAction = () => {
        if (playerState === PLAY_STATE.INITIAL) {
            setPlayerState(PLAY_STATE.PLAY);
            setVisible(false);
        }
        else if (playerState === PLAY_STATE.PLAY) {
            setPlayerState(PLAY_STATE.PAUSE);
            setVisible(true);
        }
        else if (playerState === PLAY_STATE.PAUSE) {
            setPlayerState(PLAY_STATE.PLAY);
            setVisible(false);
        }
    }

    useEffect(() => {
        if (playerState === PLAY_STATE.PLAY) {
            player.current.play();
        }
        else if (playerState === PLAY_STATE.PAUSE) {
            player.current.pause();
        }
    }, [playerState]);

    useEffect(() => {
        player.current.addEventListener('timeupdate', (event) => {
            setTime(event.target.currentTime);
        })
    }, []);

    const getPlayer = () => player.current;

    const debounce = (func1, func, delay) => {
        let inDebounce
        return function () {
            const context = this;
            const args = arguments;
            clearTimeout(inDebounce);
            func1();
            inDebounce = setTimeout(() => func.apply(context, args), delay)
        }
    }

    return (
        <div style={{
            width: "640px",
            height: "360px",
            margin: '0 auto',
        }}
            onMouseMove={
                debounce(
                    () => { setVisible(true) },
                    () => { setVisible(player.current.paused); },
                    2000)
            } >
            <video src={videoSrc}
                ref={player}
                style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    minWidth: '100%',
                    //minHeight: '100%',
                    width: 'auto',
                    //height: 'auto'
                }}>
            </video>
            <VideoFilter getPlayer={getPlayer} filterObject={filterObject} time={time}/>
            <div style={{
                display: "grid",
                position: 'relative',
                gridTemplateRows: "60% 20% 20%",
                position: "relative",
                top: "-200%",
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: 3,
            }}>
                <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                    {<VideoSrt srtObject={srtObject} time={time * 1000} />}
                </div>
                <div style={{ position: 'absolute', bottom: '20px', width: '100%' }}>
                    <VideoControls
                        ref={control}
                        style={{ width: '80%' }}
                        getPlayer={getPlayer}
                        playAction={playAction}
                        visible={visible}
                        state={playerState} />
                </div>
            </div>
        </div>
    );
}
