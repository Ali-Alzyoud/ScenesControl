import React, {useState, useRef} from 'react'
import './menu.css'

export default function Menu() {
    const fileInput = useRef(null)
    const openVideo = (e) => {
        localStorage.url = e.target.value;
        window.setVideoSrc(URL.createObjectURL(e.target.files[0]));
    }
    return (
        <div className="navbar">
            <div className="dropdown">
                <button className="dropbtn">File 
                </button>
                <div className="dropdown-content">
                    <input ref={fileInput} type='file' onChange={openVideo}/>
                    <a href="#" onClick={()=>fileInput.current.click()}>Open video</a>
                    <a href="#">Open filter</a>
                    <a href="#">Open subtitle</a>
                </div>
            </div> 
            </div>
    )
}
