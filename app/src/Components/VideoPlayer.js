import React, { useEffect, useRef, useState } from 'react'
import PLAY_STATE from './defines'
import VideoControls from './VideoControls';



export default function VideoPlayer({ src }) {

    const [playerState, setPlayerState] = useState(PLAY_STATE.INITIAL);
    const player = useRef(null);

    const playAction = () => {
        if (playerState === PLAY_STATE.INITIAL) {
            setPlayerState(PLAY_STATE.PLAY);
        }
        else if (playerState === PLAY_STATE.PLAY) {
            setPlayerState(PLAY_STATE.PAUSE);
        }
        else if (playerState === PLAY_STATE.PAUSE) {
            setPlayerState(PLAY_STATE.PLAY);
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
    return (
        <div style={{ width: "640px", margin: '0 auto' }}>
            <video src={src}
                ref={player}
                width="640"
                height="360"
                //onSeeking={(e) => { console.log(e) }}
                style={{ background: 'black' }} />
            <VideoControls
                getPlayer = {getPlayer}
                playAction = {playAction}
                state={playerState}/>
        </div>
    );
}