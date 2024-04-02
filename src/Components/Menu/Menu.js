import React, { useRef, useState, useEffect } from 'react'
import SrtClass from '../../common/SrtClass'
import { SceneGuideClass } from '../../common/SceneGuide'
import About from '../About'
import Settings from '../Settings'
import FilterPicker from '../FilterPicker'
import FilterPicker2 from '../FilterPicker2'


import { connect } from "react-redux";
import { setFilterItems, setVideoSrc, setSubtitle, setSubtitleSync, setVideoName, setTime, setDuration } from '../../redux/actions'

import './menu.css'

function Menu({ setFilterItems, setVideoSrc, setVideoName, setSubtitle, setSubtitleSync, setTime, setDuration }) {
    const videoInput = useRef(null);
    const subtitleInput = useRef(null);
    const subtitleSyncInput = useRef(null);
    const filterInput = useRef(null);
    const videoInputURL = useRef(null);
    const subtitleInputURL = useRef(null);
    const subtitleSyncInputURL = useRef(null);
    const filterInputURL = useRef(null);
    const [key, setkey] = useState(0);
    const [about, setabout] = useState(false);
    const [settings, setSettings] = useState(false);
    const [filterPicker, setfilterPicker] = useState(false);
    const [filterPicker2, setfilterPicker2] = useState(false);
    const [folders, setFolders] = useState([]);
    const [path, setPath] = useState("")


    const inputRef = useRef();
    const inputPathRef = useRef();

    const openVideoFile = (e) => {
        if (e.target.files.length < 1) return;

        const videoSrc = URL.createObjectURL(e.target.files[0]);
        const videoName = e.target.files[0].name;
        setVideoSrc(videoSrc);
        setVideoName(videoName);

        const getCurrentTime = localStorage.getItem(videoName) || 0;
        setDuration(0);
        setTime(Number(getCurrentTime));
        setkey(key + 1);
    }
    const openSubtitleFile = (e) => {
        if (e.target.files.length < 1) return;
        SrtClass.ReadFile(URL.createObjectURL(e.target.files[0])).then((records) => {
            setSubtitle(records);
        });
        setkey(key + 1);
    }
    const openSubtitleFileSync = (e) => {
        if (e.target.files.length < 1) return;
        SrtClass.ReadFile(URL.createObjectURL(e.target.files[0])).then((records) => {
            setSubtitleSync(records);
        });
        setkey(key + 1);
    }
    const openFilterFile = (e) => {
        if (e.target.files.length < 1) return;
        const filterURL = URL.createObjectURL(e.target.files[0]);
        SceneGuideClass.ReadFile(filterURL).then((records) => {
            setFilterItems(records);
        });
        setkey(key + 1);
    }
    useEffect(() => {
        fetch('videos.json').then(res => {
            res.json().then(content => {
                // setFiles(content);
            });
        });
    }, [])
    const loadURLS = () => {
        const vidURL = videoInputURL.current.value;
        const subURL = subtitleInputURL.current.value;
        const subSyncURL = subtitleSyncInput.current.value;
        const filURL = filterInputURL.current.value;

        if (vidURL) {
            setVideoSrc(vidURL);
            setVideoName("URL");
        }
        if (filURL) {
            SceneGuideClass.ReadFile(filURL).then((records) => {
                setFilterItems(records);
            });
        }
        if (subURL) {
            SrtClass.ReadFile(subURL).then((records) => {
                setSubtitle(records);
            });
        }
        if (subSyncURL) {
            SrtClass.ReadFile(subSyncURL).then((records) => {
                setSubtitleSync(records);
            });
        }
    }

    const [domain, setDomain] = useState(localStorage.getItem("domain") || "http://127.0.0.1:4001");
    const [remoteMeta, setRemoteMeta] = useState(localStorage.getItem("remoteMeta") || ":4001/api/v1/files");
    const [remotePath, setRemotePath] = useState(localStorage.getItem("remotePath") || ":8061");
    return (
        <div className="navbar" style={{ display: 'flex' }}>
            <div className="dropdown">
                <button className="dropbtn">File
                </button>
                <div className="dropdown-content">
                    <input className='hidden' key={key + "_1"} ref={videoInput} type='file' onChange={openVideoFile} />
                    <input className='hidden' key={key + "_2"} ref={subtitleInput} type='file' onChange={openSubtitleFile} />
                    <input className='hidden' key={key + "_2"} ref={subtitleSyncInput} type='file' onChange={openSubtitleFileSync} />
                    <input className='hidden' key={key + "_3"} ref={filterInput} type='file' onChange={openFilterFile} />
                    <a href="#" onClick={() => videoInput.current.click()}>Open video</a>
                    <a href="#" onClick={() => subtitleInput.current.click()}>Open subtitle</a>
                    <a href="#" onClick={() => subtitleSyncInput.current.click()}>Open subtitle Sync</a>
                    <a href="#" onClick={() => filterInput.current.click()}>Open filter</a>
                </div>
            </div>
            <div className="dropdown">
                <button className="dropbtn">URL
                </button>
                <div className="dropdown-content files">
                    <span>{'Video :'}</span>
                    <input ref={videoInputURL} type='text' />
                    <br />
                    <span>{'Subtitle :'}</span>
                    <input ref={subtitleInputURL} type='text' />
                    <br />
                    {/* <br />
                    <span>{'Subtitle Sync :'}</span>
                    <input ref={subtitleSyncInputURL} type='text' />
                    <br /> */}
                    <span>{'Filter :'}</span>
                    <input ref={filterInputURL} type='text' />
                    <br />
                    <a href="#" onClick={loadURLS}>LOAD</a>
                </div>
            </div>
            <div className="dropdown">
                <button className="dropbtn blue" onClick={() => { setfilterPicker(true) }}>Store
                </button>
            </div>
            <div className="dropdown">
                <button className="dropbtn" onClick={() => { setSettings(true) }}>Settings
                </button>
            </div>
            <div className="dropdown">
                <button className="dropbtn" onClick={() => { setabout(true) }}>About
                </button>
            </div>
            <div className="dropdown" style={{ alignSelf: "center" }}>
                <div style={{display:'flex', flexDirection:'row'}}>
                <div style={{display:'flex', flexDirection:'column', width:'450px'}}>
                <input value={domain} onChange={(e)=>{
                    setDomain(e.target.value);
                    localStorage.setItem("domain",e.target.value)
                }} placeholder='Meta'/>
                <input value={remoteMeta} onChange={(e)=>{
                    setRemoteMeta(e.target.value);
                    localStorage.setItem("remoteMeta",e.target.value)
                }} placeholder='Meta'/>
                <input value={remotePath}  onChange={(e)=>{
                    setRemotePath(e.target.value);
                    localStorage.setItem("remotePath",e.target.value)
                }} placeholder='Path'/>
                </div>
                <button onClick={async () => {
                    const url = domain+remoteMeta;
                    const path = domain+remotePath;
                    try {
                        const response = await fetch(url, {
                            method: "GET",
                            headers: {
                                accept: "application/json",
                            }
                        });
                        const folders = await response.json();
                        setFolders(folders.files);
                        setPath(path);
                        setfilterPicker2(true);
                    } catch (error) {
                        alert(error.message)
                    }

                    // const data = await response.json();
                    // setFiles(data);
                    // setfilterPicker2(true);
                }}>Show Store</button>
                <button onClick={async () => {
                     setDomain("http://scenecontrol.zapto.org");
                     setRemoteMeta(":8063/api/v1/files");
                     setRemotePath(":8062");
                }}>Load Remote</button>
                <button onClick={async () => {
                     setDomain("http://192.168.1.84");
                     setRemoteMeta(":4001/api/v1/files");
                     setRemotePath(":8061");
                }}>Load Local</button>
                </div>
            </div>
            {about && <About close={() => { setabout(false) }} />}
            {settings && <Settings close={() => { setSettings(false) }} />}
            {filterPicker && <FilterPicker close={() => { setfilterPicker(false) }} />}
            {filterPicker2 && <FilterPicker2 folders={folders} path={path} close={() => { setfilterPicker2(false) }} />}
        </div>
    )
}

export default connect(
    null,
    { setVideoSrc, setVideoName, setSubtitle, setSubtitleSync, setFilterItems, setTime, setDuration }
)(Menu);
