import React, { Fragment, useRef } from 'react'
import { FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import './style.css'

export default function Slider({ value, setValue, mute }) {
    const ref = useRef(null);
    return (
        <div>
            <span className='slider-text' >{Math.floor(value)}</span>
            <div ref={ref} className='slider-container' onClick={
                (e) => {
                    e.stopPropagation();
                    var rect = ref.current.getBoundingClientRect();
                    var y = e.clientY - rect.top;
                    setValue((rect.height - y) / rect.height)
                }
            }>
                <div className='slider-value'
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: `${Math.floor(value)}%`,
                        background: 'rgba(127,127,127,0.5)',
                        bottom: '0px'
                    }}></div>
            </div>
            {mute ? <FaVolumeMute style={{color:'white', marginTop:'5px'}}/>: <FaVolumeUp style={{color:'white', marginTop:'5px'}}/>}
        </div>
    )
}
