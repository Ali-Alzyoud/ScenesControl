import React, {useRef, useState} from 'react'
import SrtClass from '../../common/SrtClass'
import { SceneGuideClass } from '../../common/SceneGuide'


import { connect } from "react-redux";
import { setFilterItems, setVideoSrc, setSubtitle } from '../../redux/actions'

import './menu.css'

function Menu({setFilterItems, setVideoSrc, setSubtitle}) {
    const videoInput = useRef(null);
    const subtitleInput = useRef(null);
    const filterInput = useRef(null);
    const [key, setkey] = useState(0);
    const openVideo = (e) => {
        if (e.target.files.length < 1) return;
        setVideoSrc(URL.createObjectURL(e.target.files[0]));
        setkey(key + 1);
    }
    const openSubtitle = (e) => {
        if (e.target.files.length < 1) return;
        SrtClass.ReadFile(URL.createObjectURL(e.target.files[0])).then((records)=>{
            setSubtitle(records);
        });
        setkey(key + 1);
    }
    const openFilter = (e) => {
        if (e.target.files.length < 1) return;
        const filterURL = URL.createObjectURL(e.target.files[0]);
        SceneGuideClass.ReadFile(filterURL).then((records)=>{
            setFilterItems(records);
        });
        setkey(key + 1);
    }
    return (
        <div className="navbar">
            <div className="dropdown">
                <button className="dropbtn">File
                </button>
                <div className="dropdown-content">
                    <input key={key} ref={videoInput} type='file' onChange={openVideo} />
                    <input key={key} ref={subtitleInput} type='file' onChange={openSubtitle} />
                    <input key={key} ref={filterInput} type='file' onChange={openFilter} />
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
    { setVideoSrc, setSubtitle, setFilterItems }
  )(Menu);
