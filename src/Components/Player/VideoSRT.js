import React from 'react'
import parser from  'html-react-parser'

import { connect } from "react-redux";
import { selectTime, selectSubtitle, getSubtitleAtTime, getFontConfig, getSyncConfig } from '../../redux/selectors';

let style = {
    color: 'white',
    fontSize: '20pt',
    backgroundColor: 'rgba(0,0,0,0.7)',
};

function VideoSRT({ subtitle, subtitleSync, time, fontSize, fontTransparency }) {

    style = {
        ...style,
        backgroundColor: 'rgba(0,0,0,'+ fontTransparency +')',
        fontSize : fontSize + 'px'};

    return (
        <div style={style}>
            {parser(getSubtitleAtTime(time + subtitleSync).join('\n'))}
        </div>
    )
}


const mapStateToProps = state => {
    const subtitle = selectSubtitle(state);
    const time = selectTime(state);
    const fontSize = getFontConfig(state).size;
    const fontTransparency = getFontConfig(state).transparency;
    const subtitleSync = getSyncConfig(state).subtitleSync;
    return { subtitle, time, fontSize, fontTransparency, subtitleSync };
  };

export default connect(mapStateToProps)(VideoSRT);