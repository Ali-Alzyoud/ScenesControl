import React from 'react'
import { FiMoreVertical } from 'react-icons/fi'
import { MdFileDownload } from 'react-icons/md'

export default function FileRecord({imgSrc, title}) {
    return (
        <div className="file-record">
            <img src={imgSrc}/>
            <h2>{title}</h2>
            <div style={{ flex: 3, textAlign: 'end', height:'100%'}}>
                <MdFileDownload style={{height:'100%', marginRight:'10px'}}/>
                <FiMoreVertical style={{height:'100%', marginRight:'10px'}}/>
            </div>
        </div>
    )
}
