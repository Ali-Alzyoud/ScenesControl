import React from 'react'

let style = {
    color: 'white',
    fontSize: '20pt',
    backgroundColor: 'rgba(0,0,0,0.7)',
};

export default function VideoSRT({ srtObject, time }) {
    if (document.fullscreenElement){
        style = {...style, fontSize : '40px'};
    }
    else{
        style = {...style, fontSize : '20px'};
    }
    return (
        <div style={style}>
            {srtObject && srtObject.getContentAt(time).join('\n')}
        </div>
    )
}
