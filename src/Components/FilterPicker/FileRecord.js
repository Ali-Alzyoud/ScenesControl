import React from 'react'
import { FiMoreVertical } from 'react-icons/fi'

export default function FileRecord({imgSrc, title}) {
    return (
        <div className="file-record">
            <img src={imgSrc}/>
            <h1>{title}</h1>
            <div style={{ flex: 3, textAlign: 'end', height:'100%' }}>
                <FiMoreVertical style={{height:'100%'}}/>
            </div>
        </div>
    )
}
