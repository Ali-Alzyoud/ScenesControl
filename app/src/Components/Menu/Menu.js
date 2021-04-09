import React, {useState, useRef} from 'react'
import './menu.css'

export default function Menu() {
    const videoInput = useRef(null);
    const subtitleInput = useRef(null);
    const filterInput = useRef(null);
    const openVideo = (e) => {
        window.setVideoSrc(URL.createObjectURL(e.target.files[0]));
    }
    const openSubtitle = (e) => {
        window.setSubtitleSrc(URL.createObjectURL(e.target.files[0]));
    }
    const openFilter = (e) => {
        window.setFilterSrc(URL.createObjectURL(e.target.files[0]));
    }
    return (
        <div className="navbar">
            <div className="dropdown">
                <button className="dropbtn">File 
                </button>
                <div className="dropdown-content">
                    <input ref={videoInput} type='file' onChange={openVideo}/>
                    <input ref={subtitleInput} type='file' onChange={openSubtitle}/>
                    <input ref={filterInput} type='file' onChange={openFilter}/>
                    <a href="#" onClick={()=>videoInput.current.click()}>Open video</a>
                    <a href="#" onClick={()=>subtitleInput.current.click()}>Open subtitle</a>
                    <a href="#" onClick={()=>filterInput.current.click()}>Open filter</a>
                </div>
            </div> 
            </div>
    )
}
