import React from 'react'
import './style.css'

export default function About({close}) {
    return (
        <div className='overlay'>
            <div className='box'>
                <h1> Guided Scene Player/Editor </h1>
                <p> Creator : Ali M Alzyod </p>
                <p> ali198724@gmail.com </p>
                <p>
                <a className='box-links' href='https://github.com/Ali-Alzyoud/ScenesControl'> https://github.com/Ali-Alzyoud/ScenesControl </a>
                </p>
                <p> App Version : (2024) 0.2v </p>
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
                    F : FullScreen<br/>
                    3 : FullScreen<br/>
                    8 : change speed<br/>
                    5 : reload
                </div>
                <p className="bold"> Key Bindings Sync subtitle</p>
                <div className='part center'>
                    4 : delay <br/>
                    6 : increase
                </div>
                <p className="bold"> Mouse Bindings </p>
                <div className='part'>
                    Left-Click : Play/Pause <br/>
                    Left-Double Click : FullScreen on/off <br/>
                    Middle : Back Screen on/off <br/>
                </div>
                <br/>
                <br/>
                <br/>
                <button className='button' onClick={close}>Ok</button>
            </div>
        </div>
    )
}
