import React from 'react'


import { connect } from "react-redux";
import { PLAYER_ACTION} from '../../redux/actionTypes'
import { selectPlayerConfig } from '../../redux/selectors';
import { setPlayerConfig } from '../../redux/actions';


import './style.css'

function ConfigEditor({playerConfig, setPlayerConfig}) {

    const onChange = (e) => {
        let secondValue = playerConfig.violence[1];
        if(e.target.name === 'nudity') secondValue = playerConfig.nudity[1];
        else if(e.target.name === 'sex') secondValue = playerConfig.sex[1];
        else if(e.target.name === 'profanity') secondValue = playerConfig.profanity[1];
        setPlayerConfig({[e.target.name]: [e.target.value, secondValue]});
    }

    const onChange2 = (e) => {
        let firstValue = playerConfig.violence[0];
        if(e.target.name === 'nudity') firstValue = playerConfig.nudity[0];
        else if(e.target.name === 'sex') firstValue = playerConfig.sex[0];
        else if(e.target.name === 'profanity') firstValue = playerConfig.profanity[0];
        setPlayerConfig({[e.target.name]: [firstValue, e.target.value]});
    }

    const onChangeFilerRect = (e) => {
        setPlayerConfig({[e.target.name]: e.target.value == "false" ? false : true});
    }

    const options_video = [
        <option value={PLAYER_ACTION.BLUR}>{PLAYER_ACTION.BLUR}</option>,
        <option value={PLAYER_ACTION.BLUR_EXTRA}>{PLAYER_ACTION.BLUR_EXTRA}</option>,
        <option value={PLAYER_ACTION.BLUR_EXTREME}>{PLAYER_ACTION.BLUR_EXTREME}</option>,
        <option value={PLAYER_ACTION.BLUR_EXTREME_X2}>{PLAYER_ACTION.BLUR_EXTREME_X2}</option>,
        <option value={PLAYER_ACTION.BLACK}>{PLAYER_ACTION.BLACK}</option>,
        <option value={PLAYER_ACTION.SKIP}>{PLAYER_ACTION.SKIP}</option>,
        <option value={PLAYER_ACTION.NOACTION}>{PLAYER_ACTION.NOACTION}</option>
    ];

    const options_audio = [
        <option value={PLAYER_ACTION.MUTE}>{PLAYER_ACTION.MUTE}</option>,
        <option value={PLAYER_ACTION.NOACTION}>{PLAYER_ACTION.NOACTION}</option>
    ];

    return (
        <div className='config'>
            <div className='item'>
                <span>Violence</span>
                <select onChange={onChange} name='violence' value={playerConfig.violence[0]}>
                    {options_video.map((option) => option)}
                </select>
                <select onChange={onChange2} name='violence' value={playerConfig.violence[1]}>
                    {options_audio.map((option) => option)}
                </select>
            </div>

            <div className='item'>
                <span>Nudity</span>
                <select onChange={onChange} name='nudity' value={playerConfig.nudity[0]}>
                    {options_video.map((option) => option)}
                </select>
                <select onChange={onChange2} name='nudity' value={playerConfig.nudity[1]}>
                    {options_audio.map((option) => option)}
                </select>
            </div>

            <div className='item'>
                <span>Sex</span>
                <select onChange={onChange} name='sex' value={playerConfig.sex[0]}>
                    {options_video.map((option) => option)}
                </select>
                <select onChange={onChange2} name='sex' value={playerConfig.sex[1]}>
                    {options_audio.map((option) => option)}
                </select>
            </div>

            <div className='item'>
                <span>Profanity</span>
                <select onChange={onChange} name='profanity' value={playerConfig.profanity[0]}>
                    {options_video.map((option) => option)}
                </select>
                <select onChange={onChange2} name='profanity' value={playerConfig.profanity[1]}>
                    {options_audio.map((option) => option)}
                </select>
            </div>

            <div className='item' style={{ paddingRight: '170px' }}>
                <span>Filter Area</span>
                <select onChange={onChangeFilerRect} name='filterRect' value={playerConfig.filterRect}>
                <option value={true}>true</option>
                <option value={false}>false</option>
                </select>
            </div>

        </div>
    )
}

const mapStateToProps = state => {
    const playerConfig = selectPlayerConfig(state);
    return { playerConfig };
  };

export default connect(mapStateToProps, { setPlayerConfig })(ConfigEditor);