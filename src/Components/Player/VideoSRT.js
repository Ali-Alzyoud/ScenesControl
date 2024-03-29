import React, { Fragment, useMemo } from 'react'
import parser from  'html-react-parser'

import { connect } from "react-redux";
import { selectTime, selectSubtitle, getSubtitleAtTime, getFontConfig, getSyncConfig, getSubtitleSyncAtTime } from '../../redux/selectors';

let style = {
    color: 'white',
    fontSize: '20pt',
    backgroundColor: 'rgba(0,0,0,0.7)',
};

function VideoSRT({ subtitle, subtitleDelay, subtitleSlope, time, fontSize, fontTransparency }) {

    const style1 = useMemo(() => {
        return {
            ...style,
            backgroundColor: 'rgba(0,0,0,'+ fontTransparency +')',
            fontSize : fontSize + 'px'
        }
    }, [fontTransparency, fontSize]);

    const style2 = useMemo(() => {
        return {
            ...style,
            backgroundColor: 'rgba(128,0,0,'+ fontTransparency +')',
            fontSize : fontSize + 'px'
        }
    }, [fontTransparency, fontSize]);
    return (
        <Fragment>
            <div style={style1}>
                {parser(getSubtitleAtTime(time / subtitleSlope - subtitleDelay).join('\n'))}
            </div>
            <div style={style2}>
                {parser(getSubtitleSyncAtTime(time).join('\n'))}
            </div>
        </Fragment>
    )
}


const mapStateToProps = state => {
    const subtitle = selectSubtitle(state);
    const time = selectTime(state);
    const fontSize = getFontConfig(state).size;
    const fontTransparency = getFontConfig(state).transparency;
    const subtitleDelay = getSyncConfig(state).subtitleDelay;
    const subtitleSlope = getSyncConfig(state).subtitleSlope;
    return { subtitle, time, fontSize, fontTransparency, subtitleDelay, subtitleSlope };
  };

export default connect(mapStateToProps)(VideoSRT);