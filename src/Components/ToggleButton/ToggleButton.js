import React from 'react'
import './style.css'

export default function ToggleButton({on, onClick, children}) {
    return (
        <div className='toggle-container'>
            <label className="switch">
                <input type="checkbox" checked={!!on}  onChange={onClick}/>
                <span className="slider round"></span>
            </label>
            <div className='title'>{children}</div>
        </div>
    )
}
