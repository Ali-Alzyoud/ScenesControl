import React, { Fragment, useMemo } from 'react'
import parser from  'html-react-parser'

import { connect } from "react-redux";
import { selectTime, selectSubtitle, getSubtitleAtTime, getFontConfig, getSyncConfig, getSubtitleSyncAtTime } from '../../redux/selectors';

let style = {
    color: 'white',
    fontSize: '20pt',
    backgroundColor: 'rgba(0,0,0,0.7)',
};

function VideoSRT({ subtitle, subtitleSync, time, fontSize, fontTransparency }) {

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
                {parser(getSubtitleAtTime(time - subtitleSync).join('\n'))}
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
    const subtitleSync = getSyncConfig(state).subtitleSync;
    return { subtitle, time, fontSize, fontTransparency, subtitleSync };
  };

export default connect(mapStateToProps)(VideoSRT);