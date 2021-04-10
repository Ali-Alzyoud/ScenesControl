import React from 'react'

const style = {
    color: 'white',
    fontSize: '20pt',
    backgroundColor: 'black'
};

export default function VideoSRT({ srtObject, time }) {
    return (
        <div style={style}>
            {srtObject && srtObject.getContentAt(time).join('\n')}
        </div>
    )
}
