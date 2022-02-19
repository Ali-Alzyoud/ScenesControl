import React from 'react'
import { connect } from "react-redux";
import { getFontConfig, getSyncConfig } from '../../redux/selectors';
import { setSettings_fontConfig, setSettings_syncConfig } from '../../redux/actions';

import './style.css'

function Settings({ close, fontConfig, syncConfig, setSettings_fontConfig, setSettings_syncConfig }) {
    const incFontSize = () => {
        if (fontConfig.size < 80) {
            setSettings_fontConfig(
                {
                    ...fontConfig,
                    size: fontConfig.size + 2
                }
            );
        }
    }
    const decFontSize = () => {
        if (fontConfig.size > 10) {
            setSettings_fontConfig(
                {
                    ...fontConfig,
                    size: fontConfig.size - 2
                }
            );
        }
    }
    const incSubSync = () => {
            setSettings_syncConfig(
                {
                    ...syncConfig,
                    subtitleSync: syncConfig.subtitleSync + 0.5,
                }
                );
    }
    const decSubSync = () => {
        setSettings_syncConfig(
            {
                ...syncConfig,
                subtitleSync: syncConfig.subtitleSync - 0.5,
            }
        );
    }
    const fontBackground = (value) => {
        const fontConfigClone = {...fontConfig};
        fontConfigClone.transparency = Math.round(10 * (fontConfigClone.transparency + value)) / 10;
        if(fontConfigClone.transparency > 1.0 || fontConfigClone.transparency < 0.0){
            return;
        }
        setSettings_fontConfig(fontConfigClone);
    }
    return (
        <div className='settings-container'>
            <div className='settings-container-box'>
                <div className='settings-container-record'>
                    <span className='settings-text-name'>Font-Size</span>
                    <span>
                        <button onClick={decFontSize}>-</button>
                        <span className='settings-text-value'>{fontConfig.size + "px"}</span>
                        <button onClick={incFontSize}>+</button>
                    </span>
                </div>
                <div className='settings-container-record'>
                    <span className='settings-text-name'>Font-Back</span>
                    <span>
                        <button onClick={() => { fontBackground(-0.1) }}>-</button>
                        <span className='settings-text-value'>{fontConfig.transparency.toFixed(1)}</span>
                        <button onClick={() => { fontBackground(+0.1) }}>+</button>
                    </span>
                </div>
                <div className='settings-container-record'>
                    <span className='settings-text-name'>Subtitle-Sync</span>
                    <span>
                        <button onClick={decSubSync}>-</button>
                        <span className='settings-text-value'>{(syncConfig.subtitleSync).toFixed(1) + "s"}</span>
                        <button onClick={incSubSync}>+</button>
                    </span>
                </div>

                <div className='settings-container-record add-margin'>
                    <button className='button' onClick={close}>Close</button>
                </div>
            </div>
        </div>
    )
}


const mapStateToProps = state => {
    const fontConfig = getFontConfig(state);
    const syncConfig = getSyncConfig(state);
    return { fontConfig, syncConfig };
};

export default connect(mapStateToProps, { setSettings_fontConfig, setSettings_syncConfig })(Settings);