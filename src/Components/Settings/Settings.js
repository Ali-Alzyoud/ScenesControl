import React from 'react'
import { connect } from "react-redux";
import { getFontConfig } from '../../redux/selectors';
import { setSettings_fontConfig } from '../../redux/actions';

import './style.css'

function Settings({ close, fontConfig, setSettings_fontConfig }) {
    const incFontSize = () => {
        if (fontConfig.size < 80) {
            setSettings_fontConfig(
                {
                    ...fontConfig,
                    size: fontConfig.size + 10
                }
            );
        }
    }
    const decFontSize = () => {
        if (fontConfig.size > 10) {
            setSettings_fontConfig(
                {
                    ...fontConfig,
                    size: fontConfig.size - 10
                }
            );
        }
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
                    <span>Font-Size</span>
                    <span>
                        <button onClick={decFontSize}>-</button>
                        <span>{" " + fontConfig.size + " "}</span>
                        <button onClick={incFontSize}>+</button>
                    </span>
                </div>
                <div className='settings-container-record'>
                    <span>Font-Back</span>
                    <span>
                        <button onClick={() => { fontBackground(-0.1) }}>-</button>
                        <span>{" " + fontConfig.transparency.toFixed(1) + " "}</span>
                        <button onClick={() => { fontBackground(+0.1) }}>+</button>
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
    return { fontConfig };
};

export default connect(mapStateToProps, { setSettings_fontConfig })(Settings);