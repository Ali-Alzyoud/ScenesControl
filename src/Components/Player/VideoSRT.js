import React from 'react'
import parser from  'html-react-parser'

import { connect } from "react-redux";
import { selectTime, selectSubtitle, getSubtitleAtTime, getFontSize } from '../../redux/selectors';

let style = {
    color: 'white',
    fontSize: '20pt',
    backgroundColor: 'rgba(0,0,0,0.7)',
};

function VideoSRT({ subtitle, time, fontSize }) {

    style = {...style, fontSize : fontSize + 'px'};

    return (
        <div style={style}>
            {parser(getSubtitleAtTime(time).join('\n'))}
        </div>
    )
}


const mapStateToProps = state => {
    const subtitle = selectSubtitle(state);
    const time = selectTime(state);
    const fontSize = getFontSize(state);
    return { subtitle, time, fontSize };
  };

export default connect(mapStateToProps)(VideoSRT);