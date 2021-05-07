import React from 'react'
import './style.css'

export default function ToggleButton({on, onClick, children}) {
    return (
        <div className='toggle-container'>
            <label class="switch">
                <input type="checkbox" checked={!!on}  onClick={onClick}/>
                <span class="slider round"></span>
            </label>
            <div className='title'>{children}</div>
        </div>
    )
}
