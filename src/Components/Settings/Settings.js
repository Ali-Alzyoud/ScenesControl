import React from 'react'
import { connect } from "react-redux";
import { getFontSize } from '../../redux/selectors';
import { setSettings_fontSize } from '../../redux/actions';

import './style.css'

function Settings({ close, fontSize, setSettings_fontSize }) {
    const incFontSize = () => {
        if (fontSize < 80) {
            setSettings_fontSize(fontSize + 10);
        }
    }
    const decFontSize = () => {
        if (fontSize > 10) {
            setSettings_fontSize(fontSize - 10);
        }
    }
    return (
        <div className='settings-container'>
            <div className='settings-container-box'>
                <div className='settings-container-record'>
                    <span>FontSize</span>
                    <span>
                        <button onClick={decFontSize}>-</button>
                        <span>{" " + fontSize + " "}</span>
                        <button onClick={incFontSize}>+</button>
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
    const fontSize = getFontSize(state);
    return { fontSize };
};

export default connect(mapStateToProps, { setSettings_fontSize })(Settings);