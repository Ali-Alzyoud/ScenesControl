import React, { useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import SrtClass from '../../common/SrtClass'
import { SceneGuideClass } from '../../common/SceneGuide'
import About from '../About'
import Settings from '../Settings'
import FilterPicker from '../FilterPicker'
import FilterPicker2 from '../FilterPickerLocal'
import Login from '../Login/Login'
import AIChat from '../AIChat/AIChat'
import Sessions from '../Sessions/Sessions'
import SpeedTest from '../SpeedTest/SpeedTest'
import QRScanner from '../QRScanner/QRScanner'
import RemoteControl from '../RemoteControl/RemoteControl'

import { apkDownloadUrl, ROUTES, ROUTE_LABELS, routeDomain, routeOf, setRoute } from '../../common/domain';
import {
    MdMenu, MdClose, MdQrCodeScanner, MdSettingsRemote, MdVideoLibrary, MdLogin, MdLogout,
    MdPlayCircleOutline, MdMovie, MdSubtitles, MdSync, MdFilterAlt, MdLink, MdStorefront,
    MdSettings, MdSpeed, MdInfoOutline, MdAndroid, MdDevices, MdAutoAwesome, MdHome, MdCloud, MdVpnLock,
    MdExpandMore, MdChevronRight,
} from 'react-icons/md';
import { connect } from "react-redux";
import { setFilterItems, setVideoSrc, setSubtitle, setSubtitleSync, setVideoName, setTime, setDuration, setModalOpen } from '../../redux/actions'
import { selectVideoName } from '../../redux/selectors'

import './menu.css'
import { openContent } from '../FilterPickerLocal/FilterPickerLocal'
import StorageHelper from '../../Helpers/StorageHelper'
import { authFetch, getUser, clearAuth, getToken, debugLog } from '../../common/auth'

const API = "/api/v1/files";
const API_FILES = "/static";
const API_VIDEO = "/video";


// The list being played through (series episodes etc.) and where in it — for "Resume".
const resumeTarget = () => {
    try {
        const index = Number(localStorage.currentListIndex);
        const { videos, srts, filters } = JSON.parse(localStorage.currentList);
        if (!(index >= 0 && index < videos?.length) || !videos[index]) return null;
        const name = decodeURIComponent(videos[index].split('?')[0].split('/').pop() || '');
        return { video: videos[index], srt: srts?.[index], filter: filters?.[index], name };
    } catch {
        return null;
    }
};

// Same as the old Clear content / Log out buttons: also cancels anything cast to this screen.
const cancelRemotePlay = (keepalive = false) => {
    const d = localStorage.getItem('domain');
    const t = getToken();
    if (d && t) fetch(`${d}/api/v1/remote/play`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` }, keepalive }).catch(() => {});
};

// A navigation differing from the current URL only by its hash (which this is, whenever a video's
// open — the hash carries the video path) never reloads by itself, leaving Redux's videoSrc in
// place. Writing the hash-free URL via replaceState first, then reloading, actually clears it.
const reloadWithoutContent = () => {
    window.history.replaceState({}, '', window.location.origin + window.location.pathname);
    window.location.reload();
};

// A drawer row. A link (href) closes the drawer itself via onNavigate.
const Item = ({ icon, label, hint, onClick, href, download, accent, danger, onNavigate }) => {
    const cls = `menu-item${accent ? ' menu-item--accent' : ''}${danger ? ' menu-item--danger' : ''}`;
    const body = (
        <>
            <span className="menu-item-icon">{icon}</span>
            <span className="menu-item-text">
                <span className="menu-item-label">{label}</span>
                {hint && <span className="menu-item-hint">{hint}</span>}
            </span>
            <MdChevronRight className="menu-item-chevron" />
        </>
    );
    return href
        ? <a className={cls} href={href} download={download} data-menu-item onClick={onNavigate}>{body}</a>
        : <button type="button" className={cls} data-menu-item onClick={onClick}>{body}</button>;
};

const Tile = ({ icon, label, onClick }) => (
    <button type="button" className="menu-tile" data-menu-item onClick={onClick}>
        <span className="menu-tile-icon">{icon}</span>
        <span className="menu-tile-label">{label}</span>
    </button>
);

function Menu({ videoName, setFilterItems, setVideoSrc, setVideoName, setSubtitle, setSubtitleSync, setTime, setDuration, setModalOpen }) {
    const videoInput = useRef(null);
    const subtitleInput = useRef(null);
    const subtitleSyncInput = useRef(null);
    const filterInput = useRef(null);
    const [key, setkey] = useState(0);
    const [about, setabout] = useState(false);
    const [settings, setSettings] = useState(false);
    const [filterPicker, setfilterPicker] = useState(false);
    const [filterPicker2, setfilterPicker2] = useState(false);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [urlFormOpen, setUrlFormOpen] = useState(false);
    const [urls, setUrls] = useState({ video: '', subtitle: '', subtitleSync: '', filter: '' });
    const drawerRef = useRef(null);
    const menuBtnRef = useRef(null);

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
    const loadURLS = () => {
        const { video, subtitle, subtitleSync, filter } = urls;
        if (video) {
            setVideoSrc(video);
            setVideoName("URL");
        }
        if (filter) {
            SceneGuideClass.ReadFile(filter).then((records) => {
                setFilterItems(records);
            });
        }
        if (subtitle) {
            SrtClass.ReadFile(subtitle).then((records) => {
                setSubtitle(records);
            });
        }
        if (subtitleSync) {
            SrtClass.ReadFile(subtitleSync).then((records) => {
                setSubtitleSync(records);
            });
        }
        setDrawerOpen(false);
    }

    const [domain, setDomain] = useState(localStorage.getItem("domain"));
    const [customDomainOpen, setCustomDomainOpen] = useState(false);
    const [loginOpen, setLoginOpen] = useState(false);
    const [sessionsOpen, setSessionsOpen] = useState(false);
    const [speedTestOpen, setSpeedTestOpen] = useState(false);
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

    // While the drawer is open the player's own key handlers (seek/volume on arrows, space…) stand
    // down, and focus moves into the drawer so a TV remote's D-pad can walk it.
    useEffect(() => {
        if (!drawerOpen) return;
        setModalOpen(true);
        const t = setTimeout(() => drawerRef.current?.querySelector('[data-menu-item]')?.focus(), 60);
        return () => { clearTimeout(t); setModalOpen(false); };
    }, [drawerOpen, setModalOpen]);

    const closeDrawer = () => {
        setDrawerOpen(false);
        menuBtnRef.current?.focus();
    };

    // Runs a drawer action and closes the drawer.
    const pick = (fn) => () => { setDrawerOpen(false); fn(); };

    const onDrawerKeyDown = (e) => {
        e.stopPropagation();
        if (e.key === 'Escape' || e.key === 'GoBack' || e.keyCode === 4) { e.preventDefault(); closeDrawer(); return; }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        // Text fields keep their own arrows only for the caret — up/down still move between items.
        const items = [...drawerRef.current.querySelectorAll('[data-menu-item]')].filter(el => el.offsetParent !== null);
        const i = items.indexOf(document.activeElement);
        const next = items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
        if (next) { e.preventDefault(); next.focus(); }
    };

    const logOut = () => {
        cancelRemotePlay(true);
        clearAuth();
        setCurrentUser(null);
        reloadWithoutContent();
    };

    const clearContent = () => {
        debugLog('Clear content clicked', { hasDomain: !!localStorage.getItem('domain'), hasToken: !!getToken() });
        cancelRemotePlay();
        reloadWithoutContent();
    };

    const resume = drawerOpen ? resumeTarget() : null;
    // Which of the three servers is in use (null: a custom address). Choosing one is remembered.
    const serverRoute = routeOf(domain);
    const chooseRoute = (route) => {
        setRoute(route);
        setCustomDomainOpen(false);
        setDomain(routeDomain(route));
    };
    const isAdmin = currentUser?.role === 'admin';

    return (
        <div className="navbar">
            <input className='hidden' key={key + "_video"} ref={videoInput} type='file' onChange={openVideoFile} />
            <input className='hidden' key={key + "_sub"} ref={subtitleInput} type='file' accept=".srt,.ass,.ssa,.vtt" onChange={openSubtitleFile} />
            <input className='hidden' key={key + "_subsync"} ref={subtitleSyncInput} type='file' accept=".srt,.ass,.ssa,.vtt" onChange={openSubtitleFileSync} />
            <input className='hidden' key={key + "_filter"} ref={filterInput} type='file' onChange={openFilterFile} />

            <div className="navbar-left">
                <button ref={menuBtnRef} className="navbar-menu-btn" aria-label="Open menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
                    <MdMenu />
                </button>
                <span className="navbar-brand">Scene Control</span>
            </div>

            <div className="navbar-quick-actions">
                <button className="navbar-btn navbar-btn--primary" title="Library" aria-label="Library" onClick={showStore}>
                    <MdVideoLibrary /><span className="navbar-btn-label">Library</span>
                </button>
                {currentUser && (
                    <button className="navbar-btn" title="Remote control" aria-label="Remote control" onClick={() => setRemoteControlOpen(true)}>
                        <MdSettingsRemote /><span className="navbar-btn-label">Remote</span>
                    </button>
                )}
                <button className="navbar-btn" title="Scan QR" aria-label="Scan QR" onClick={() => setQrScanOpen(true)}>
                    <MdQrCodeScanner /><span className="navbar-btn-label">Scan</span>
                </button>
                {videoName && (
                    <button className="navbar-btn" title="Close video" aria-label="Close video" onClick={clearContent}>
                        <MdClose /><span className="navbar-btn-label">Close</span>
                    </button>
                )}
                {!currentUser && (
                    <button className="navbar-btn navbar-btn--signin" title="Sign in" aria-label="Sign in" onClick={() => setLoginOpen(true)}>
                        <MdLogin /><span className="navbar-btn-label navbar-btn-label--always">Sign in</span>
                    </button>
                )}
            </div>

            {/* Portaled to <body>: the bar's backdrop-filter would otherwise make it the containing
                block for these position:fixed layers, squashing the drawer into the bar. */}
            {createPortal(<>
            <div className={`menu-backdrop${drawerOpen ? ' is-open' : ''}`} onClick={closeDrawer} aria-hidden="true" />
            <aside
                ref={drawerRef}
                className={`menu-drawer${drawerOpen ? ' is-open' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-label="Menu"
                aria-hidden={!drawerOpen}
                inert={drawerOpen ? undefined : ''}
                onKeyDown={onDrawerKeyDown}
            >
                <header className="menu-header">
                    <div className="menu-user">
                        <span className="menu-avatar">{currentUser ? (currentUser.username || '?').slice(0, 1).toUpperCase() : <MdLogin />}</span>
                        <span className="menu-user-text">
                            <span className="menu-user-name">{currentUser ? currentUser.username : 'Not signed in'}</span>
                            <span className="menu-user-role">{currentUser ? (isAdmin ? 'Administrator' : currentUser.role || 'User') : 'Sign in to use your library'}</span>
                        </span>
                    </div>
                    <button className="menu-close" aria-label="Close menu" data-menu-item onClick={closeDrawer}><MdClose /></button>
                </header>

                <div className="menu-scroll">
                    {!currentUser && (
                        <button className="menu-signin" data-menu-item onClick={pick(() => setLoginOpen(true))}>
                            <MdLogin /> Sign in
                        </button>
                    )}

                    <section className="menu-section">
                        <h3 className="menu-section-title">Watch</h3>
                        <Item icon={<MdVideoLibrary />} label="Library" hint="Movies, series & YouTube" accent onClick={pick(showStore)} />
                        {resume && <Item icon={<MdPlayCircleOutline />} label="Resume" hint={resume.name} onClick={pick(() => openContent(resume))} />}
                        {currentUser && <Item icon={<MdSettingsRemote />} label="Remote control" hint="Control another screen" onClick={pick(() => setRemoteControlOpen(true))} />}
                        <Item icon={<MdQrCodeScanner />} label="Scan QR code" hint="Pair with a TV or sign in" onClick={pick(() => setQrScanOpen(true))} />
                    </section>

                    <section className="menu-section">
                        <h3 className="menu-section-title">Open from this device</h3>
                        <div className="menu-tiles">
                            <Tile icon={<MdMovie />} label="Video" onClick={pick(() => videoInput.current.click())} />
                            <Tile icon={<MdSubtitles />} label="Subtitle" onClick={pick(() => subtitleInput.current.click())} />
                            <Tile icon={<MdSync />} label="Sync subtitle" onClick={pick(() => subtitleSyncInput.current.click())} />
                            <Tile icon={<MdFilterAlt />} label="Scene filter" onClick={pick(() => filterInput.current.click())} />
                        </div>
                        <button type="button" className={`menu-item menu-expander${urlFormOpen ? ' is-open' : ''}`} data-menu-item aria-expanded={urlFormOpen} onClick={() => setUrlFormOpen(o => !o)}>
                            <span className="menu-item-icon"><MdLink /></span>
                            <span className="menu-item-text"><span className="menu-item-label">Open from URL</span></span>
                            <MdExpandMore className="menu-item-chevron" />
                        </button>
                        {urlFormOpen && (
                            <form className="menu-url-form" onSubmit={e => { e.preventDefault(); loadURLS(); }}>
                                {[['video', 'Video URL'], ['subtitle', 'Subtitle URL'], ['subtitleSync', 'Sync subtitle URL'], ['filter', 'Filter URL']].map(([k, label]) => (
                                    <label key={k} className="menu-field">
                                        <span>{label}</span>
                                        <input type="url" inputMode="url" data-menu-item value={urls[k]} placeholder="https://…" onChange={e => setUrls(u => ({ ...u, [k]: e.target.value }))} />
                                    </label>
                                ))}
                                <button type="submit" className="menu-primary-btn" data-menu-item disabled={!Object.values(urls).some(Boolean)}>Load</button>
                            </form>
                        )}
                    </section>

                    <section className="menu-section">
                        <h3 className="menu-section-title">Tools</h3>
                        {currentUser && <Item icon={<MdAutoAwesome />} label="AI assistant" onClick={pick(() => setAiOpen(true))} />}
                        <Item icon={<MdStorefront />} label="Online store" hint="Curated titles with scene filters" onClick={pick(() => setfilterPicker(true))} />
                        {isAdmin && <Item icon={<MdDevices />} label="Sessions" hint="Signed-in devices" onClick={pick(() => setSessionsOpen(true))} />}
                        {currentUser && <Item icon={<MdSpeed />} label="Speed test" hint="This device's connection to the server" onClick={pick(() => setSpeedTestOpen(true))} />}
                        <Item icon={<MdSettings />} label="Settings" onClick={pick(() => setSettings(true))} />
                    </section>

                    <section className="menu-section">
                        <h3 className="menu-section-title">Server</h3>
                        <div className="menu-segmented menu-segmented--stack" role="radiogroup" aria-label="Server">
                            {ROUTES.map(route => (
                                <button key={route} type="button" role="radio" aria-checked={serverRoute === route && !customDomainOpen} data-menu-item
                                    className={serverRoute === route && !customDomainOpen ? 'is-active' : ''} onClick={() => chooseRoute(route)}>
                                    {route === 'local' ? <MdHome /> : route === 'tailscale' ? <MdVpnLock /> : <MdCloud />} {ROUTE_LABELS[route]}
                                </button>
                            ))}
                        </div>
                        {(customDomainOpen || !serverRoute) ? (
                            <label className="menu-field">
                                <span>Server address</span>
                                <input type="url" inputMode="url" data-menu-item value={domain || ''} placeholder="https://host:4443" onChange={e => setDomain(e.target.value)} />
                            </label>
                        ) : (
                            <p className="menu-server-address">
                                {domain}{' '}
                                <button type="button" className="menu-link-btn" data-menu-item onClick={() => setCustomDomainOpen(true)}>Other address…</button>
                            </p>
                        )}
                    </section>

                <footer className="menu-footer">
                    <Item icon={<MdAndroid />} label="Get the Android app" href={apkDownloadUrl()} download onNavigate={() => setDrawerOpen(false)} />
                    <Item icon={<MdInfoOutline />} label="About" onClick={pick(() => setabout(true))} />
                    {currentUser && <Item icon={<MdLogout />} label="Log out" hint={currentUser.username} danger onClick={pick(logOut)} />}
                </footer>
                </div>
            </aside>
            </>, document.body)}

            {about && <About close={() => { setabout(false) }} />}
            {settings && <Settings close={() => { setSettings(false) }} />}
            {filterPicker && <FilterPicker close={() => { setfilterPicker(false) }} />}
            {filterPicker2 && <FilterPicker2 path={domain+API_FILES} videoPath={domain+API_VIDEO} apiUrl={domain+API} close={() => { setfilterPicker2(false) }} />}
            {loginOpen && <Login domain={domain} onClose={() => { debugLog('Login modal: onClose (manual/backdrop)'); setLoginOpen(false); }} onSuccess={() => { debugLog('Login modal: onSuccess', { user: getUser() }); setCurrentUser(getUser()); setLoginOpen(false); showStore(); }} />}
            {sessionsOpen && <Sessions close={() => setSessionsOpen(false)} />}
            {speedTestOpen && <SpeedTest close={() => setSpeedTestOpen(false)} />}
            {aiOpen && <AIChat domain={domain} onClose={() => setAiOpen(false)} />}
            {qrScanOpen && <QRScanner onClose={() => setQrScanOpen(false)} />}
            {remoteControlOpen && <RemoteControl domain={domain} onClose={() => setRemoteControlOpen(false)} />}
        </div>
    )
}

export default connect(
    state => ({ videoName: selectVideoName(state) }),
    { setVideoSrc, setVideoName, setSubtitle, setSubtitleSync, setFilterItems, setTime, setDuration, setModalOpen }
)(Menu);
