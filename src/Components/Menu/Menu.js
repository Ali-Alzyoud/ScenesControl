import React, { useRef, useState, useEffect, useCallback } from 'react'
import SrtClass from '../../common/SrtClass'
import { SceneGuideClass } from '../../common/SceneGuide'
import About from '../About'
import Settings from '../Settings'
import FilterPicker from '../FilterPicker'
import FilterPicker2 from '../FilterPickerLocal'
import Login from '../Login/Login'
import AIChat from '../AIChat/AIChat'
import Sessions from '../Sessions/Sessions'
import QRScanner from '../QRScanner/QRScanner'
import RemoteControl from '../RemoteControl/RemoteControl'

import { REMOTE_DOMAIN, apkDownloadUrl } from '../../common/domain';
import { MdQrCodeScanner, MdSettingsRemote, MdVideoLibrary, MdLogin, MdLogout, MdClearAll } from 'react-icons/md';
import { connect } from "react-redux";
import { setFilterItems, setVideoSrc, setSubtitle, setSubtitleSync, setVideoName, setTime, setDuration } from '../../redux/actions'

import './menu.css'
import { openContent } from '../FilterPickerLocal/FilterPickerLocal'
import StorageHelper from '../../Helpers/StorageHelper'
import { authFetch, getUser, clearAuth, getToken, debugLog } from '../../common/auth'

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
    const [sessionsOpen, setSessionsOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(getUser);
    const [qrScanOpen, setQrScanOpen] = useState(false);
    // Opens straight away after a QR scan just paired this device as a remote (see QrScanHandler).
    const [remoteControlOpen, setRemoteControlOpen] = useState(() => {
        if (sessionStorage.getItem('rc_open_remote') !== '1') return false;
        sessionStorage.removeItem('rc_open_remote');
        return !!getToken();
    });
    const [aiOpen, setAiOpen] = useState(false);

    // Logs currentUser flipping to logged-out unexpectedly (i.e. not from the Logout button,
    // which already logs its own click) — a defensive net alongside the other debugLog calls
    // while chasing a mobile-only auth-screen-flicker bug.
    const prevUserRef = useRef(currentUser);
    useEffect(() => {
        if (prevUserRef.current && !currentUser) {
            debugLog('Menu: currentUser went from set to null', { was: prevUserRef.current });
        }
        prevUserRef.current = currentUser;
    }, [currentUser]);

    useEffect(() => {
        localStorage.setItem("domain", domain);
    }, [domain])

    // FilterPickerLocal now owns its own (paginated) loading on mount, so this just verifies
    // the token still works before opening the panel — a cheap tabs-only request instead of
    // the old full-library prefetch, kept mainly so an expired token still redirects to Login
    // immediately rather than opening onto a silently-empty Store panel.
    const showStore = useCallback(async () => {
        if (!getToken()) { debugLog('showStore: no token, opening Login'); setLoginOpen(true); return; }
        try {
            const response = await authFetch(`${domain}${API}/tabs`, {
                method: "GET",
                headers: { accept: "application/json" },
            });
            if (response.status === 401) { debugLog('showStore: /tabs 401, opening Login', { domain }); setLoginOpen(true); return; }
            setfilterPicker2(true);
        } catch (error) {
            debugLog('showStore: fetch threw', { message: error.message, domain });
            alert(error.message);
        }
    }, [domain]);

    useEffect(() => {
        window.addEventListener('rc:content', showStore);
        return () => window.removeEventListener('rc:content', showStore);
    }, [showStore]);

    // Homepage shortcuts (HomeQR, in App.js) can't reach this component's state directly — same
    // custom-event pattern as rc:content above.
    useEffect(() => {
        const openScan = () => setQrScanOpen(true);
        const openRemote = () => setRemoteControlOpen(true);
        window.addEventListener('rc:scan', openScan);
        window.addEventListener('rc:remote', openRemote);
        return () => {
            window.removeEventListener('rc:scan', openScan);
            window.removeEventListener('rc:remote', openRemote);
        };
    }, []);

    return (
        <div className="navbar" style={{ display: 'flex' }}>
            <div className="dropdown">
                <button className="dropbtn">Menu
                </button>
                <div className="dropdown-content menu-root">
                    <input className='hidden' key={key + "_1"} ref={videoInput} type='file' onChange={openVideoFile} />
                    <input className='hidden' key={key + "_2"} ref={subtitleInput} type='file' accept=".srt,.ass,.ssa" onChange={openSubtitleFile} />
                    <input className='hidden' key={key + "_2"} ref={subtitleSyncInput} type='file' accept=".srt,.ass,.ssa" onChange={openSubtitleFileSync} />
                    <input className='hidden' key={key + "_3"} ref={filterInput} type='file' onChange={openFilterFile} />

                    <div className="dropdown-submenu">
                        <span className="submenu-label">File</span>
                        <div className="dropdown-content submenu-panel">
                            <a href="#" onClick={e => { e.preventDefault(); videoInput.current.click(); }}>Open video</a>
                            <a href="#" onClick={e => { e.preventDefault(); subtitleInput.current.click(); }}>Open subtitle</a>
                            <a href="#" onClick={e => { e.preventDefault(); subtitleSyncInput.current.click(); }}>Open subtitle Sync</a>
                            <a href="#" onClick={e => { e.preventDefault(); filterInput.current.click(); }}>Open filter</a>
                        </div>
                    </div>

                    <div className="dropdown-submenu">
                        <span className="submenu-label">Load from URL</span>
                        <div className="dropdown-content submenu-panel files">
                            <span>{'Video :'}</span>
                            <input ref={videoInputURL} type='text' />
                            <br />
                            <span>{'Subtitle :'}</span>
                            <input ref={subtitleInputURL} type='text' />
                            <br />
                            <span>{'Filter :'}</span>
                            <input ref={filterInputURL} type='text' />
                            <br />
                            <a href="#" onClick={e => { e.preventDefault(); loadURLS(); }}>LOAD</a>
                        </div>
                    </div>

                    <a href="#" className="blue" onClick={e => { e.preventDefault(); setfilterPicker(true); }}>Store</a>
                    <a href="#" onClick={e => { e.preventDefault(); setSettings(true); }}>Settings</a>
                    <a href="#" onClick={e => { e.preventDefault(); setabout(true); }}>About</a>
                    <a href={apkDownloadUrl()} download>Download App</a>
                    {currentUser?.role === 'admin' && (
                        <a href="#" onClick={e => { e.preventDefault(); setSessionsOpen(true); }}>Sessions</a>
                    )}

                    <div className="dropdown-submenu">
                        <span className="submenu-label">Connection</span>
                        <div className="dropdown-content submenu-panel connection-panel">
                            <input value={domain} onChange={(e) => {
                                setDomain(e.target.value);
                            }} placeholder='Meta' />
                            <button onClick={async () => {
                                try {
                                    const index = Number(localStorage.currentListIndex);
                                    const { videos,
                                        srts,
                                        filters, } = JSON.parse(localStorage.currentList);
                                    if (index < 0 || index >= videos?.length) return;
                                    openContent({ video: videos[index], srt: srts[index], filter: filters[index] })
                                } catch (error) {

                                }

                            }}>Resume</button>
                            <button onClick={async () => {
                                setDomain(REMOTE_DOMAIN);
                            }}>Remote</button>
                            <button onClick={async () => {
                                setDomain(`https://${window.location.hostname}:4443`);
                            }}>Local</button>
                        </div>
                    </div>

                    <div className="dropdown-submenu">
                        <span className="submenu-label">Account</span>
                        <div className="dropdown-content submenu-panel">
                            {currentUser && (
                                <a href="#" onClick={e => { e.preventDefault(); setAiOpen(true); }}>AI</a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="navbar-quick-actions">
                <button className="navbar-icon-btn" title="Show Store" aria-label="Show Store" onClick={showStore}>
                    <MdVideoLibrary />
                </button>
                {currentUser ? (
                    <button className="navbar-icon-btn" title={`Log out (${currentUser.username})`} aria-label="Log out" onClick={() => {
                        // Logging out also clears what's on this screen (and any pending cast),
                        // like the Clear content button.
                        const d = localStorage.getItem('domain');
                        const t = getToken();
                        if (d && t) fetch(`${d}/api/v1/remote/play`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` }, keepalive: true }).catch(() => {});
                        clearAuth();
                        setCurrentUser(null);
                        window.history.replaceState({}, '', window.location.origin + window.location.pathname);
                        window.location.reload();
                    }}>
                        <MdLogout />
                    </button>
                ) : (
                    <button className="navbar-icon-btn" title="Log in" aria-label="Log in" onClick={() => setLoginOpen(true)}>
                        <MdLogin />
                    </button>
                )}
                <button className="navbar-icon-btn" title="Clear content" aria-label="Clear content" onClick={() => {
                    const d = localStorage.getItem('domain');
                    const t = getToken();
                    debugLog('Clear content clicked', { hasDomain: !!d, hasToken: !!t });
                    if (d && t) {
                        fetch(`${d}/api/v1/remote/play`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${t}` },
                        }).catch(() => {});
                    }
                    // A navigation differing from the current URL only by its hash (which this
                    // is, whenever a video's open — the hash carries the video path) is a
                    // same-document fragment navigation and never actually reloads the page by
                    // itself, silently leaving Redux's videoSrc/videoName untouched. Writing the
                    // hash-free URL via replaceState first, then reloading, actually clears it.
                    window.history.replaceState({}, '', window.location.origin + window.location.pathname);
                    window.location.reload();
                }}>
                    <MdClearAll />
                </button>
                <button className="navbar-icon-btn" title="Scan QR" aria-label="Scan QR" onClick={() => setQrScanOpen(true)}>
                    <MdQrCodeScanner />
                </button>
                {currentUser && (
                    <button className="navbar-icon-btn" title="Remote Control" aria-label="Remote Control" onClick={() => setRemoteControlOpen(true)}>
                        <MdSettingsRemote />
                    </button>
                )}
            </div>
            {about && <About close={() => { setabout(false) }} />}
            {settings && <Settings close={() => { setSettings(false) }} />}
            {filterPicker && <FilterPicker close={() => { setfilterPicker(false) }} />}
            {filterPicker2 && <FilterPicker2 path={domain+API_FILES} videoPath={domain+API_VIDEO} apiUrl={domain+API} close={() => { setfilterPicker2(false) }} />}
            {loginOpen && <Login domain={domain} onClose={() => { debugLog('Login modal: onClose (manual/backdrop)'); setLoginOpen(false); }} onSuccess={() => { debugLog('Login modal: onSuccess', { user: getUser() }); setCurrentUser(getUser()); setLoginOpen(false); showStore(); }} />}
            {sessionsOpen && <Sessions close={() => setSessionsOpen(false)} />}
            {aiOpen && <AIChat domain={domain} onClose={() => setAiOpen(false)} />}
            {qrScanOpen && <QRScanner onClose={() => setQrScanOpen(false)} />}
            {remoteControlOpen && <RemoteControl domain={domain} onClose={() => setRemoteControlOpen(false)} />}
        </div>
    )
}

export default connect(
    null,
    { setVideoSrc, setVideoName, setSubtitle, setSubtitleSync, setFilterItems, setTime, setDuration }
)(Menu);
