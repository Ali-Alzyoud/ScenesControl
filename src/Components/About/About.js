import React from 'react'
import './style.css'

export default function About({close}) {
    return (
        <div className='overlay'>
            <div className='box'>
                <h1> Ali Alzyod </h1>
                <h1> 2021 </h1>
                <button className='button' onClick={close}>Ok</button>
            </div>
        </div>
    )
}
