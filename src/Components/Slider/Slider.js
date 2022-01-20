import React from 'react'
import './style.css'

export default function Slider({ value, setValue }) {
    return (
        <div className='slider-container' onClick={
            (e) => {
                e.stopPropagation();
                var rect = e.target.getBoundingClientRect();
                var y = e.clientY - rect.top;
                setValue((rect.height - y)/rect.height)
            }
        }>
            <div className='slider-value'
                style={{
                    position: 'absolute',
                    width: '100%',
                    height: `${Math.floor(value)}%`,
                    background: 'blue',
                    bottom: '0px'
                }}></div>
        </div>
    )
}
