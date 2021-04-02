import React, { useEffect, useRef, useState } from 'react'
import PLAY_STATE from './defines'
import VideoControls from './VideoControls';
import VideoFilter from './VideoFilter'



export default function VideoPlayer({ videoSrc, filterSrc }) {

    const [playerState, setPlayerState] = useState(PLAY_STATE.INITIAL);
    const player = useRef(null);
    const control = useRef(null);
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

    const getPlayer = () => player.current;

    const debounce = (func1, func, delay) => {
        let inDebounce
        return function() {
          const context = this;
          const args = arguments;
          clearTimeout(inDebounce);
          func1();
          inDebounce = setTimeout(() => func.apply(context, args), delay)
        }
      }

    return (
        <div style={{ width: "640px", height: "360px", margin: '0 auto' }}
            onMouseMove={
                debounce(
                    () => {setVisible(true)},
                    () => {setVisible(player.current.paused);},
                    2000)
            } >
            <video src={videoSrc}
                ref={player}
                style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    minWidth: '100%',
                    minHeight: '100%',
                    width: 'auto', 
                    height: 'auto'  }} />
            <VideoFilter getPlayer={getPlayer} filterSrc={filterSrc}/>
            <VideoControls
                ref={control}
                style={{ width: '80%' }}
                getPlayer={getPlayer}
                playAction={playAction}
                visible= {visible}
                state={playerState} />
        </div>
    );
}
