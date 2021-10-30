import React from 'react'
import './style.css'

export default function About({close}) {
    return (
        <div className='overlay'>
            <div className='box'>
                <h1> Guided Scene Player/Editor </h1>
                <p> Creator : Ali M Alzyod </p>
                <p> ali198724@gmail.com </p>
                <p> https://github.com/Ali-Alzyoud/ScenesControl </p>
                <p> Date : 2021 </p>
                <br/>
                <p className="bold"> Key Bindings Editing </p>
                <div className='part'>
                    e : open Editor <br/>
                    c : open configure
                </div>
                <div className='part'>
                    [ : from time <br/>
                    ] : to time
                </div>
                <div className='part'>
                    n : new record <br/>
                    s : select record
                </div>
                <div className='part'>
                    Ctrl + s : Save Filter File
                </div>

                <br/>
                <p className="bold"> Key Bindings Playing</p>
                <div className='part center'>
                    Space/Play : play/pause <br/>
                    F : FullScreen
                </div>
                <br/>
                <br/>
                <br/>
                <button className='button' onClick={close}>Ok</button>
            </div>
        </div>
    )
}
