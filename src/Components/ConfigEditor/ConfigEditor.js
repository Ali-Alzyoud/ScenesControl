import React from 'react'
import { connect } from "react-redux";
import { PLAYER_ACTION } from '../../redux/actionTypes'
import { selectPlayerConfig } from '../../redux/selectors';
import { setPlayerConfig } from '../../redux/actions';
import './style.css'

const VIDEO_OPTIONS = [
    PLAYER_ACTION.BLUR,
    PLAYER_ACTION.BLUR_EXTRA,
    PLAYER_ACTION.BLUR_EXTREME,
    PLAYER_ACTION.BLUR_EXTREME_X2,
    PLAYER_ACTION.BLACK,
    PLAYER_ACTION.SKIP,
    PLAYER_ACTION.NOACTION,
];

const AUDIO_OPTIONS = [
    PLAYER_ACTION.MUTE,
    PLAYER_ACTION.NOACTION,
];

const ROWS = [
    { key: 'violence',  label: 'Violence',   icon: '⚔️' },
    { key: 'nudity',    label: 'Nudity',      icon: '🙈' },
    { key: 'sex',       label: 'Sex',         icon: '🔞' },
    { key: 'profanity', label: 'Profanity',   icon: '🤬' },
    { key: 'rightclick',label: 'Right Click', icon: '🖱️' },
];

function ConfigEditor({ playerConfig, setPlayerConfig }) {
    const setVideo = (key, value) =>
        setPlayerConfig({ [key]: [value, playerConfig[key][1]] });

    const setAudio = (key, value) =>
        setPlayerConfig({ [key]: [playerConfig[key][0], value] });

    const setFilterRect = (value) =>
        setPlayerConfig({ filterRect: value === 'true' });

    const setBlackOnPause = (value) =>
        setPlayerConfig({ blackOnPause: value === 'true' });

    return (
        <div className="cfg-wrap">
            <div className="cfg-section-title">Scene Filter Actions</div>
            <table className="cfg-table">
                <thead>
                    <tr>
                        <th className="cfg-th cfg-th-label">Type</th>
                        <th className="cfg-th">Video</th>
                        <th className="cfg-th">Audio</th>
                    </tr>
                </thead>
                <tbody>
                    {ROWS.map(({ key, label, icon }) => (
                        <tr key={key} className="cfg-row">
                            <td className="cfg-td-label">
                                <span className="cfg-icon">{icon}</span>
                                <span className="cfg-label">{label}</span>
                            </td>
                            <td className="cfg-td">
                                <select
                                    className="cfg-select"
                                    value={playerConfig[key][0]}
                                    onChange={e => setVideo(key, e.target.value)}
                                >
                                    {VIDEO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </td>
                            <td className="cfg-td">
                                <select
                                    className="cfg-select cfg-select--audio"
                                    value={playerConfig[key][1]}
                                    onChange={e => setAudio(key, e.target.value)}
                                >
                                    {AUDIO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="cfg-divider" />

            <div className="cfg-row cfg-extra-row">
                <span className="cfg-extra-label">Filter Area Rect</span>
                <select
                    className="cfg-select"
                    value={String(playerConfig.filterRect)}
                    onChange={e => setFilterRect(e.target.value)}
                >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                </select>
            </div>

            <div className="cfg-row cfg-extra-row">
                <span className="cfg-extra-label">Black Screen on Pause</span>
                <select
                    className="cfg-select"
                    value={String(playerConfig.blackOnPause)}
                    onChange={e => setBlackOnPause(e.target.value)}
                >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                </select>
            </div>
        </div>
    )
}

const mapStateToProps = state => ({ playerConfig: selectPlayerConfig(state) });
export default connect(mapStateToProps, { setPlayerConfig })(ConfigEditor);
