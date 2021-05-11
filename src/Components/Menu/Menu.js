import React, { useState, useRef } from 'react'
import SrtClass from '../../common/SrtClass'
import { SceneGuideClass, SceneType } from '../../common/SceneGuide'
import './menu.css'

export default function Menu() {
    const videoInput = useRef(null);
    const subtitleInput = useRef(null);
    const filterInput = useRef(null);
    const openVideo = (e) => {
        window.setVideoSrc(URL.createObjectURL(e.target.files[0]));
    }
    const openSubtitle = (e) => {
        var srtObject = new SrtClass(URL.createObjectURL(e.target.files[0]));
        window.setSubtitleSrc(srtObject);
    }
    const openFilter = (e) => {
        const reader = new FileReader();
        reader.addEventListener('load', (event) => {
            window.setFilterSrc(new SceneGuideClass(event.target.result));
        });
        reader.readAsText(e.target.files[0]);
    }
    return (
        <div className="navbar">
            <div className="dropdown">
                <button className="dropbtn">File
                </button>
                <div className="dropdown-content">
                    <input ref={videoInput} type='file' onChange={openVideo} />
                    <input ref={subtitleInput} type='file' onChange={openSubtitle} />
                    <input ref={filterInput} type='file' onChange={openFilter} />
                    <a href="#" onClick={() => videoInput.current.click()}>Open video</a>
                    <a href="#" onClick={() => subtitleInput.current.click()}>Open subtitle</a>
                    <a href="#" onClick={() => filterInput.current.click()}>Open filter</a>
                </div>
            </div>
        </div>
    )
}
