import React, { useState } from 'react'
import {PlayerConfig, PLAYER_ACTION} from '../../common/PlayerConfig'
import {SceneType} from '../../common/SceneGuide'
import './style.css'

export default function ConfigEditor() {
    const [violence, setViolence] = useState(PlayerConfig[SceneType.Violence]);
    const [nudity, setNudity] = useState(PlayerConfig[SceneType.Nudity]);
    const [gore, setGore] = useState(PlayerConfig[SceneType.Gore]);
    const [profanity, setProfanity] = useState(PlayerConfig[SceneType.Profanity]);

    const onChange = (e) => {
        if (e.target.name === 'violence'){
            setViolence(e.target.value);
            PlayerConfig.UpdateConfig(e.target.value, nudity, gore, profanity);
        }
        else if (e.target.name === 'nudity'){
            setNudity(e.target.value);
            PlayerConfig.UpdateConfig(violence, e.target.value, gore, profanity);
        }
        else if (e.target.name === 'gore'){
            setGore(e.target.value);
            PlayerConfig.UpdateConfig(violence, nudity, e.target.value, profanity);
        }
        else if (e.target.name === 'profanity'){
            setProfanity(e.target.value);
            PlayerConfig.UpdateConfig(violence, nudity, gore, e.target.value);
        }
        console.log(PlayerConfig)
    }

    return (
        <div className='config'>
            <div className='item'>
                <span>Violence</span>
                <select onChange={onChange} name='violence' value={violence}>
                    <option value={PLAYER_ACTION.BLUR}>{PLAYER_ACTION.BLUR}</option>
                    <option value={PLAYER_ACTION.BLACK}>{PLAYER_ACTION.BLACK}</option>
                    <option value={PLAYER_ACTION.SKIP}>{PLAYER_ACTION.SKIP}</option>
                    <option value={PLAYER_ACTION.MUTE}>{PLAYER_ACTION.MUTE}</option>
                    <option value={PLAYER_ACTION.NOACTION}>{PLAYER_ACTION.NOACTION}</option>
                </select>
            </div>

            <div className='item'>
                <span>Nudity</span>
                <select onChange={onChange} name='nudity' value={nudity}>
                    <option value={PLAYER_ACTION.BLUR}>{PLAYER_ACTION.BLUR}</option>
                    <option value={PLAYER_ACTION.BLACK}>{PLAYER_ACTION.BLACK}</option>
                    <option value={PLAYER_ACTION.SKIP}>{PLAYER_ACTION.SKIP}</option>
                    <option value={PLAYER_ACTION.MUTE}>{PLAYER_ACTION.MUTE}</option>
                    <option value={PLAYER_ACTION.NOACTION}>{PLAYER_ACTION.NOACTION}</option>
                </select>
            </div>

            <div className='item'>
                <span>Gore</span>
                <select onChange={onChange} name='gore' value={gore}>
                    <option value={PLAYER_ACTION.BLUR}>{PLAYER_ACTION.BLUR}</option>
                    <option value={PLAYER_ACTION.BLACK}>{PLAYER_ACTION.BLACK}</option>
                    <option value={PLAYER_ACTION.SKIP}>{PLAYER_ACTION.SKIP}</option>
                    <option value={PLAYER_ACTION.MUTE}>{PLAYER_ACTION.MUTE}</option>
                    <option value={PLAYER_ACTION.NOACTION}>{PLAYER_ACTION.NOACTION}</option>
                </select>
            </div>

            <div className='item'>
                <span>Profanity</span>
                <select onChange={onChange} name='profanity' value={profanity}>
                    <option value={PLAYER_ACTION.BLUR}>{PLAYER_ACTION.BLUR}</option>
                    <option value={PLAYER_ACTION.BLACK}>{PLAYER_ACTION.BLACK}</option>
                    <option value={PLAYER_ACTION.SKIP}>{PLAYER_ACTION.SKIP}</option>
                    <option value={PLAYER_ACTION.MUTE}>{PLAYER_ACTION.MUTE}</option>
                    <option value={PLAYER_ACTION.NOACTION}>{PLAYER_ACTION.NOACTION}</option>
                </select>
            </div>
        </div>
    )
}
