import React, {useRef } from 'react'
import SrtClass from '../../common/SrtClass'
import { SceneGuideClass, SceneType } from '../../common/SceneGuide'


import { connect } from "react-redux";
import { addFilterItems, setVideoSrc, setSubtitle } from '../../redux/actions'

import './menu.css'

function Menu({addFilterItems, setVideoSrc, setSubtitle}) {
    const videoInput = useRef(null);
    const subtitleInput = useRef(null);
    const filterInput = useRef(null);
    const openVideo = (e) => {
        setVideoSrc(URL.createObjectURL(e.target.files[0]));
    }
    const openSubtitle = (e) => {
        SrtClass.ReadFile(URL.createObjectURL(e.target.files[0])).then((records)=>{setSubtitle(records)});
    }
    const openFilter = (e) => {
        SceneGuideClass.ReadFile(URL.createObjectURL(e.target.files[0])).then((records)=>{addFilterItems(records)});
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

export default connect(
    null,
    { addFilterItems, setVideoSrc, setSubtitle }
  )(Menu);
