import React from 'react'
import { FiMoreVertical } from 'react-icons/fi'
import { MdFileDownload } from 'react-icons/md'
import { GrRadialSelected, GrRadial } from 'react-icons/gr'
import {MdContentCopy} from 'react-icons/md'


export default function FileRecord({ imgSrc, title, link, index, isSelected, select, copy, readyToPlay }) {
    const click = () => {
        if(link){
            window.open(link);
        }
    }
    return (
        <div className={`file-record2 ${readyToPlay ? 'ready' : ''}`} onClick={copy}>
            <img src={imgSrc} onClick={click} />
            {readyToPlay ?
                <div className='file-record2-container'>
                    <h4 className='title ready'>{'Ready To Play'}</h4><br />
                    <h2 className='title'>{title}</h2>
                </div>
                :
                <h2 className='title'>{title}</h2>
            }
        </div>
    )
}
