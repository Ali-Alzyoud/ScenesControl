import React from 'react'
import parser from  'html-react-parser'

import { connect } from "react-redux";
import { selectTime, selectSubtitle, getSubtitleAtTime } from '../../redux/selectors';

let style = {
    color: 'white',
    fontSize: '20pt',
    backgroundColor: 'rgba(0,0,0,0.7)',
};

function VideoSRT({ subtitle, time }) {
    if (document.fullscreenElement){
        style = {...style, fontSize : '40px'};
    }
    else{
        style = {...style, fontSize : '20px'};
    }

    return (
        <div style={style}>
            {parser(getSubtitleAtTime(time).join('\n'))}
        </div>
    )
}


const mapStateToProps = state => {
    const subtitle = selectSubtitle(state);
    const time = selectTime(state);
    return { subtitle, time };
  };

export default connect(mapStateToProps)(VideoSRT);