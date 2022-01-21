import React from 'react'
import { FiMoreVertical } from 'react-icons/fi'
import { MdFileDownload } from 'react-icons/md'
import { GrRadialSelected, GrRadial } from 'react-icons/gr'


export default function FileRecord({ imgSrc, title, index, isSelected, select }) {
    return (
        <div className="file-record">
            <img src={imgSrc} />
            <h2>{title}</h2>
            <div style={{ flex: 2, flexFlow:'row-reverse' , display:'flex' ,textAlign: 'end', height: '100%' }}>
                {/* <MdFileDownload className='file-record-icon' /> */}
                {isSelected ?
                    <GrRadialSelected className='file-record-icon' />
                    :
                    <GrRadial className='file-record-icon' onClick={() => select(index)} />
                }
            </div>
        </div>
    )
}
