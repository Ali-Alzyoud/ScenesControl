import React from 'react'


import { connect } from "react-redux";
import { PLAYER_ACTION} from '../../redux/actionTypes'
import { getPlayerConfig } from '../../redux/selectors';
import { setPlayerConfig } from '../../redux/actions';


import './style.css'

function ConfigEditor({playerConfig, setPlayerConfig}) {

    const onChange = (e) => {
        setPlayerConfig({[e.target.name]: e.target.value});
    }

    return (
        <div className='config'>
            <div className='item'>
                <span>Violence</span>
                <select onChange={onChange} name='violence' value={playerConfig.violence}>
                    <option value={PLAYER_ACTION.BLUR}>{PLAYER_ACTION.BLUR}</option>
                    <option value={PLAYER_ACTION.BLACK}>{PLAYER_ACTION.BLACK}</option>
                    <option value={PLAYER_ACTION.SKIP}>{PLAYER_ACTION.SKIP}</option>
                    <option value={PLAYER_ACTION.MUTE}>{PLAYER_ACTION.MUTE}</option>
                    <option value={PLAYER_ACTION.NOACTION}>{PLAYER_ACTION.NOACTION}</option>
                </select>
            </div>

            <div className='item'>
                <span>Nudity</span>
                <select onChange={onChange} name='nudity' value={playerConfig.nudity}>
                    <option value={PLAYER_ACTION.BLUR}>{PLAYER_ACTION.BLUR}</option>
                    <option value={PLAYER_ACTION.BLACK}>{PLAYER_ACTION.BLACK}</option>
                    <option value={PLAYER_ACTION.SKIP}>{PLAYER_ACTION.SKIP}</option>
                    <option value={PLAYER_ACTION.MUTE}>{PLAYER_ACTION.MUTE}</option>
                    <option value={PLAYER_ACTION.NOACTION}>{PLAYER_ACTION.NOACTION}</option>
                </select>
            </div>

            <div className='item'>
                <span>Profanity</span>
                <select onChange={onChange} name='profanity' value={playerConfig.profanity}>
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

const mapStateToProps = state => {
    const playerConfig = getPlayerConfig();
    return { playerConfig };
  };

export default connect(mapStateToProps, { setPlayerConfig })(ConfigEditor);