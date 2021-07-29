import React, {useRef, useState, useEffect} from 'react'
import SrtClass from '../../common/SrtClass'
import { SceneGuideClass } from '../../common/SceneGuide'
import About from '../About'


import { connect } from "react-redux";
import { setFilterItems, setVideoSrc, setSubtitle, setVideoName } from '../../redux/actions'

import './menu.css'
import { Fragment } from 'react';

function Menu({setFilterItems, setVideoSrc, setVideoName, setSubtitle}) {
    const videoInput = useRef(null);
    const subtitleInput = useRef(null);
    const filterInput = useRef(null);
    const videoInputURL = useRef(null);
    const subtitleInputURL = useRef(null);
    const filterInputURL = useRef(null);
    const [key, setkey] = useState(0);
    const [about, setabout] = useState(false);
    const [files, setFiles] = useState({});
    const openVideoFile = (e) => {
        if (e.target.files.length < 1) return;
        setVideoSrc(URL.createObjectURL(e.target.files[0]));
        setVideoName(e.target.files[0].name);
        setkey(key + 1);
    }
    const openSubtitleFile = (e) => {
        if (e.target.files.length < 1) return;
        SrtClass.ReadFile(URL.createObjectURL(e.target.files[0])).then((records)=>{
            setSubtitle(records);
        });
        setkey(key + 1);
    }
    const openFilterFile = (e) => {
        if (e.target.files.length < 1) return;
        const filterURL = URL.createObjectURL(e.target.files[0]);
        SceneGuideClass.ReadFile(filterURL).then((records)=>{
            setFilterItems(records);
        });
        setkey(key + 1);
    }
    useEffect(() => {
        fetch('videos.json').then(res =>{
            res.json().then(content => {
                setFiles(content);
            });
        });
    }, [])
    const loadURLS = () => {
        const vidURL = videoInputURL.current.value;
        const subURL = subtitleInputURL.current.value;
        const filURL = filterInputURL.current.value;

        if(vidURL)
        {
            setVideoSrc(vidURL);
            setVideoName("URL");
        }
        if(filURL)
        {
            SceneGuideClass.ReadFile(filURL).then((records)=>{
                setFilterItems(records);
            });
        }
        if(subURL)
        {
            SrtClass.ReadFile(subURL).then((records)=>{
                setSubtitle(records);
            });
        }
    }
    return (
        <div className="navbar">
            <div className="dropdown">
                <button className="dropbtn">File
                </button>
                <div className="dropdown-content">
                    <input className='hidden' key={key} ref={videoInput} type='file' onChange={openVideoFile} />
                    <input className='hidden' key={key} ref={subtitleInput} type='file' onChange={openSubtitleFile} />
                    <input className='hidden' key={key} ref={filterInput} type='file' onChange={openFilterFile} />
                    <a href="#" onClick={() => videoInput.current.click()}>Open video</a>
                    <a href="#" onClick={() => subtitleInput.current.click()}>Open subtitle</a>
                    <a href="#" onClick={() => filterInput.current.click()}>Open filter</a>
                </div>
            </div>
            <div className="dropdown">
                <button className="dropbtn">URL
                </button>
                <div className="dropdown-content files">
                    <span>{'Video :'}</span>
                    <input ref={videoInputURL} type='text'/>
                    <br/>
                    <span>{'Subtitle :'}</span>
                    <input ref={subtitleInputURL} type='text'/>
                    <br/>
                    <span>{'Filter :'}</span>
                    <input ref={filterInputURL} type='text'/>
                    <br/>
                    <a href="#" onClick={loadURLS}>LOAD</a>
                </div>
            </div>
            <div className="dropdown">
            <button className="dropbtn">Samples
                </button>
            <div className="dropdown-content samples">
                {files.length>0 && files.map(file => {
                    return (
                        <div onClick={
                            () => {
                                window.location.href = window.location.origin + '#/' + btoa(file.video) + '/' + btoa(file.subtitle) + '/' + btoa(file.filter);
                            }
                        }>
                            <a>{file.name}</a>
                            <img src={file.poster} width={120} height={120} />
                        </div>
                    );
                })}
            </div>
            </div>
            <div className="dropdown">
                <button className="dropbtn" onClick={() => {setabout(true) }}>About
                </button>
            </div>
            { about && <About close={()=>{setabout(false)}}/> }
        </div>
    )
}

export default connect(
    null,
    { setVideoSrc, setVideoName, setSubtitle, setFilterItems }
  )(Menu);
