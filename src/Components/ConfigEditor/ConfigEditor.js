import React from 'react'


import { connect } from "react-redux";
import { PLAYER_ACTION} from '../../redux/actionTypes'
import { getPlayerConfig } from '../../redux/selectors';
import { setPlayerConfig } from '../../redux/actions';


import './style.css'

function ConfigEditor({playerConfig, setPlayerConfig}) {

    const onChange = (e) => {
        let secondValue = playerConfig.violence[1];
        if(e.target.name == 'nudity') secondValue = playerConfig.nudity[1];
        else if(e.target.name == 'profanity') secondValue = playerConfig.profanity[1];
        setPlayerConfig({[e.target.name]: [e.target.value, secondValue]});
    }

    const onChange2 = (e) => {
        let firstValue = playerConfig.violence[0];
        if(e.target.name == 'nudity') firstValue = playerConfig.nudity[0];
        else if(e.target.name == 'profanity') firstValue = playerConfig.profanity[0];
        setPlayerConfig({[e.target.name]: [firstValue, e.target.value]});
    }

    const options = [
        <option value={PLAYER_ACTION.BLUR}>{PLAYER_ACTION.BLUR}</option>,
        <option value={PLAYER_ACTION.BLUR_EXTRA}>{PLAYER_ACTION.BLUR_EXTRA}</option>,
        <option value={PLAYER_ACTION.BLACK}>{PLAYER_ACTION.BLACK}</option>,
        <option value={PLAYER_ACTION.SKIP}>{PLAYER_ACTION.SKIP}</option>,
        <option value={PLAYER_ACTION.MUTE}>{PLAYER_ACTION.MUTE}</option>,
        <option value={PLAYER_ACTION.NOACTION}>{PLAYER_ACTION.NOACTION}</option>
    ];

    return (
        <div className='config'>
            <div className='item'>
                <span>Violence</span>
                <select onChange={onChange} name='violence' value={playerConfig.violence[0]}>
                    {options.map((option) => option)}
                </select>
                <select onChange={onChange2} name='violence' value={playerConfig.violence[1]}>
                    {options.map((option) => option)}
                </select>
            </div>

            <div className='item'>
                <span>Nudity</span>
                <select onChange={onChange} name='nudity' value={playerConfig.nudity[0]}>
                    {options.map((option) => option)}
                </select>
                <select onChange={onChange2} name='nudity' value={playerConfig.nudity[1]}>
                    {options.map((option) => option)}
                </select>
            </div>

            <div className='item'>
                <span>Profanity</span>
                <select onChange={onChange} name='profanity' value={playerConfig.profanity[0]}>
                    {options.map((option) => option)}
                </select>
                <select onChange={onChange2} name='profanity' value={playerConfig.profanity[1]}>
                    {options.map((option) => option)}
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