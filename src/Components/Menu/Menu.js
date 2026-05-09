import React, { useRef, useState, useEffect, useCallback } from 'react'
import SrtClass from '../../common/SrtClass'
import { SceneGuideClass } from '../../common/SceneGuide'
import About from '../About'
import Settings from '../Settings'
import FilterPicker from '../FilterPicker'
import FilterPicker2 from '../FilterPickerLocal'
import Login from '../Login/Login'

import { QRCodeSVG } from 'qrcode.react';
import { connect } from "react-redux";
import { setFilterItems, setVideoSrc, setSubtitle, setSubtitleSync, setVideoName, setTime, setDuration } from '../../redux/actions'

import './menu.css'
import { openContent } from '../FilterPickerLocal/FilterPickerLocal'
import StorageHelper from '../../Helpers/StorageHelper'
import { authFetch, getUser, clearAuth, getToken } from '../../common/auth'

const API = "/api/v1/files";
const API_FILES = "/static";
const API_VIDEO = "/video";

function Menu({ setFilterItems, setVideoSrc, setVideoName, setSubtitle, setSubtitleSync, setTime, setDuration }) {
    const videoInput = useRef(null);
    const subtitleInput = useRef(null);
    const subtitleSyncInput = useRef(null);
    const filterInput = useRef(null);
    const videoInputURL = useRef(null);
    const subtitleInputURL = useRef(null);
    const filterInputURL = useRef(null);
    const [key, setkey] = useState(0);
    const [about, setabout] = useState(false);
    const [settings, setSettings] = useState(false);
    const [filterPicker, setfilterPicker] = useState(false);
    const [filterPicker2, setfilterPicker2] = useState(false);
    const [folders, setFolders] = useState([]);

    const openVideoFile = (e) => {
        if (e.target.files.length < 1) return;

        const videoSrc = URL.createObjectURL(e.target.files[0]);
        const videoName = e.target.files[0].name;
        setVideoSrc(videoSrc);
        setVideoName(videoName);

        const getCurrentTime = StorageHelper.getContentProgress({videoName});
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
        fetch('videos.json').then(res => { res.json().then(() => {}); });
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

    const [domain, setDomain] = useState(localStorage.getItem("domain"));
    const [loginOpen, setLoginOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(getUser);
    const [qrOpen, setQrOpen] = useState(false);

    const buildMobileUrl = () => {
        const base = window.location.origin + window.location.pathname;
        const params = new URLSearchParams();
        if (domain) params.set('domain', domain);
        const token = getToken();
        if (token) params.set('token', token);
        return base + '?' + params.toString();
    };

    useEffect(() => {
        localStorage.setItem("domain", domain);
    }, [domain])

    const showStore = useCallback(async () => {
        const url = domain + API;
        const mem = window.__storeCache?.[url];
        if (mem) {
            setFolders(mem);
            setfilterPicker2(true);
            return;
        }
        const cacheKey = `storeCache_${url}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                window.__storeCache = window.__storeCache || {};
                window.__storeCache[url] = parsed;
                setFolders(parsed);
                setfilterPicker2(true);
                return;
            } catch {}
        }
        try {
            const response = await authFetch(url, {
                method: "GET",
                headers: { accept: "application/json" },
            });
            if (response.status === 401) { setLoginOpen(true); return; }
            const data = await response.json();
            localStorage.setItem(cacheKey, JSON.stringify(data.files));
            localStorage.setItem(`storeCacheTime_${url}`, String(Date.now()));
            window.__storeCache = window.__storeCache || {};
            window.__storeCache[url] = data.files;
            setFolders(data.files);
            setfilterPicker2(true);
        } catch (error) {
            alert(error.message);
        }
    }, [domain]);

    useEffect(() => {
        window.addEventListener('rc:content', showStore);
        return () => window.removeEventListener('rc:content', showStore);
    }, [showStore]);
    
    return (
        <div className="navbar" style={{ display: 'flex' }}>
            <div className="dropdown">
                <button className="dropbtn">File
                </button>
                <div className="dropdown-content">
                    <input className='hidden' key={key + "_1"} ref={videoInput} type='file' onChange={openVideoFile} />
                    <input className='hidden' key={key + "_2"} ref={subtitleInput} type='file' accept=".srt,.ass,.ssa" onChange={openSubtitleFile} />
                    <input className='hidden' key={key + "_2"} ref={subtitleSyncInput} type='file' accept=".srt,.ass,.ssa" onChange={openSubtitleFileSync} />
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
                }} placeholder='Meta'/>
                </div>
                <button onClick={showStore}>Show Store</button>
                <button onClick={async () => {
                    try {
                        const index = Number(localStorage.currentListIndex);
                        const { videos,
                            srts,
                            filters, } = JSON.parse(localStorage.currentList);
                        if (index < 0 || index >= videos?.length) return;
                        openContent({ video:videos[index], srt:srts[index], filter:filters[index] })   
                    } catch (error) {
                        
                    }

                }}>Resume</button>
                <button onClick={async () => {
                     setDomain("https://m.camel-goldeye.ts.net");
                }}>Remote</button>
                <button onClick={async () => {
                    const domain = window.location.protocol+"//"+window.location.hostname;
                     setDomain(`${domain}:4001`);
                }}>Local</button>
                <button onClick={async () => {
                     window.location.href = window.location.origin + window.location.pathname;
                }}>Clear</button>
                {currentUser ? (
                    <>
                        <button onClick={() => setQrOpen(true)}>QR</button>
                        <button onClick={() => { clearAuth(); setCurrentUser(null); }}>
                            {currentUser.username} (Logout)
                        </button>
                    </>
                ) : (
                    <button onClick={() => setLoginOpen(true)}>Login</button>
                )}
                </div>
            </div>
            {about && <About close={() => { setabout(false) }} />}
            {settings && <Settings close={() => { setSettings(false) }} />}
            {filterPicker && <FilterPicker close={() => { setfilterPicker(false) }} />}
            {filterPicker2 && <FilterPicker2 folders={folders} path={domain+API_FILES} videoPath={domain+API_VIDEO} apiUrl={domain+API} close={() => { setfilterPicker2(false) }} />}
            {loginOpen && <Login domain={domain} onClose={() => setLoginOpen(false)} onSuccess={() => { setCurrentUser(getUser()); setLoginOpen(false); showStore(); }} />}
            {qrOpen && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={() => setQrOpen(false)}>
                    <div style={{ background:'#1a1a2e', border:'1px solid #2a2a40', borderRadius:10, padding:'28px 24px', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }} onClick={e => e.stopPropagation()}>
                        <p style={{ color:'#888aaa', fontSize:12, margin:0, textTransform:'uppercase', letterSpacing:'0.04em' }}>Open on mobile</p>
                        <QRCodeSVG value={buildMobileUrl()} size={200} bgColor="#0e0e1a" fgColor="#c0b8ff" level="M" />
                        <p style={{ color:'#555577', fontSize:11, margin:0, maxWidth:220, wordBreak:'break-all', textAlign:'center' }}>{domain}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default connect(
    null,
    { setVideoSrc, setVideoName, setSubtitle, setSubtitleSync, setFilterItems, setTime, setDuration }
)(Menu);
