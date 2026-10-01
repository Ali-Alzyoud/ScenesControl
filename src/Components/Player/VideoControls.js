import React, { useEffect, useMemo, useRef, useState } from 'react'

import { MdForward5 } from 'react-icons/md'
import { MdForward10 } from 'react-icons/md'
import { MdForward30 } from 'react-icons/md'

import { MdReplay5 } from 'react-icons/md'
import { MdReplay10 } from 'react-icons/md'
import { MdReplay30 } from 'react-icons/md'

import { MdSkipNext, MdSkipPrevious } from 'react-icons/md'

import { GiExpand } from 'react-icons/gi'
import { MdPlayArrow, MdPause, MdSubtitles } from 'react-icons/md'

import './style.css'

import { connect, useDispatch, useSelector } from "react-redux";
import { selectTime, selectDuration, selectPlayerState, selectVolume, selectMute, selectModalOpen, selectVideoName, selectVideoSrc, selectSubtitleName, getSyncConfig, getFontConfig, selectPlayerConfig } from '../../redux/selectors';
import { setTime, setPlayerState, setVolume, setSettings_syncConfig, setSettings_fontConfig, setSubtitle, setSubtitleName, setPlayerConfig } from '../../redux/actions';
import Slider from '../Slider';
import { openContent } from '../FilterPickerLocal/FilterPickerLocal'
import Utils from '../../utils/utils'
import SrtClass from '../../common/SrtClass'
import StorageHelper from '../../Helpers/StorageHelper'
import { authFetch, getToken, clearAuth, isController } from '../../common/auth'
import { SCREEN_EFFECT_EVENT, screenEffects } from './screenEffects'
import { getStreamMode, setStreamMode } from '../../common/streamMode'
import { SUBTITLE_COLORS, clampFontSize, clampOpacity } from '../../common/subtitleStyle'
import { sanitizeConfigPatch } from '../../common/playerConfig'
import { getTtsEnabled, setTtsEnabled, getTtsPrefs, setTtsPrefs, ttsState } from '../../common/tts'
import { playablesOf, libraryPath, findTitleForVideo, retoken } from '../../common/episodes'
import { toggleRemoteFullscreen, exitPseudoFullscreen, isRemoteFullscreen } from './remoteFullscreen'

var styleControls = {
    width: '90%',
    zIndex: 99,
    opacity: 1,
    transition: 'opacity 3s',
    position: 'absolute',
    left: '5%',
    height: '100%',
}

var seekbarStyle = {
    margin: '0 auto',
    width: '100%',
    height: '20px',
    background: 'rgba(255,255,255,0.18)',
    borderRadius: '10px',
    position: 'absolute',
    bottom: '68px',
    overflow: 'visible',
}

var seekbarStyleProgress = {
    width: '100%',
    height: '20px',
    background: 'rgba(108,99,255,0.75)',
    borderRadius: '10px',
}

var seekhandleStyle = {
    left: '100%',
    top: '-10px',
    marginLeft: '-20px',
    width: '40px',
    height: '40px',
    background: 'white',
    position: 'relative',
    borderRadius: '50%',
    border: '2px solid #6c63ff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    opacity: 1.0
}

var seekbuttonStyle = {
    width: '56px',
    height: '56px',
    marginTop: '12px'
}

const KEY = {
    SPACE: 32,
    SPACE_ANDROID_V_KB: 231,//get by debugging
    LEFT: 37,
    RIGHT: 39,
    F: 70,
    ENTER: 13,

    MEDIA_PLAY_PAUSE: 179,
    FAST_FORWARD: 417,
    REWIND: 412,
    NEXT_TRACK:	0xB0,
    PREV_TRACK:	0xB1,
    CHANNEL_UP:   33,
    CHANNEL_DOWN: 34,
};

let PlayIcon = MdPlayArrow;

const SPEED_PRESETS = [0.5, 1, 2, 3];

// Subtitle files sitting in the same folder as the given video, as [{ name, url }]. Uses the
// search endpoint for just that folder rather than downloading the whole library listing, and
// includes the auth token in each URL — static files require it, and without it a picked
// subtitle silently loaded as an empty file.
const subtitleBaseName = (url) => {
    if (!url) return '';
    const name = String(url).split('?')[0].split('/').pop();
    try { return decodeURIComponent(name); } catch { return name; }
};

export const findSubtitlesForVideo = async (videoSrc) => {
    const domain = localStorage.getItem('domain');
    const token = getToken();
    if (!domain || !videoSrc || !token) return [];
    let rel = Utils.serverRelativePath(videoSrc, domain);
    if (!rel) return [];
    try { rel = decodeURIComponent(rel); } catch {}
    rel = rel.replace(/^\//, '');
    const videoDir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
    if (!videoDir) return [];
    try {
        const res = await authFetch(`${domain}/api/v1/files/search?q=${encodeURIComponent(videoDir)}&limit=100`);
        if (!res.ok) return [];
        const { items = [] } = await res.json();
        const folder = items.find(i => i.folder === videoDir);
        return (folder?.files || [])
            .filter(f => f.type === 'SRT')
            .map(f => ({ name: f.name, url: `${domain}/static/${videoDir}/${f.name}?token=${encodeURIComponent(token)}` }));
    } catch {
        return [];
    }
};

function VideoControls({ time,
    setTime,
    duration,
    visible,
    visibleAudio,
    playerState,
    setPlayerState,
    setVolume,
    volume,
    isMute,
    onFullscreen,
    videoName,
    modalOpen,
    speedMulti,
    onSpeedChange,
}) {

    const ref = useRef(null);
    const seekbutton = useRef(null);
    const seekbar = useRef(null);
    const timeLabel = useRef(null);
    const okTapCount = useRef(0);
    const okTapTimer = useRef(null);
    const style = useMemo(() => { return { ...styleControls, opacity: visible ? 1 : 0 } }, [visible]);
    const styleAudio = useMemo(() => { return { zIndex: 100, opacity: (visibleAudio || visible) ? 1 : 0 } }, [visibleAudio, visible]);

    const [styleHandle, setStyleHandle] = useState(seekhandleStyle);
    const [styleButton, setStyleButton] = useState(seekbuttonStyle);
    const [styleProgress] = useState(seekbarStyleProgress);
    const [progress, setProgress] = useState(0);
    const [keyEvent, setKeyEvent] = useState(null);
    const dispatch = useDispatch();
    const subtitleDelay = useSelector(getSyncConfig).subtitleDelay;
    const subtitleSlope = useSelector(getSyncConfig).subtitleSlope;
    const syncConfig = useSelector(getSyncConfig)
    const fontConfig = useSelector(getFontConfig)
    const playerConfig = useSelector(selectPlayerConfig)
    const videoSrc = useSelector(selectVideoSrc);
    const subtitleName = useSelector(selectSubtitleName);
    const [showSubtitlePicker, setShowSubtitlePicker] = useState(false);
    const [subtitleOptions, setSubtitleOptions] = useState([]);
    const [loadingSubs, setLoadingSubs] = useState(false);

    const toggleSubtitlePicker = (e) => {
        e.stopPropagation();
        if (showSubtitlePicker) { setShowSubtitlePicker(false); return; }
        setShowSubtitlePicker(true);
        setLoadingSubs(true);
        findSubtitlesForVideo(videoSrc)
            .then(setSubtitleOptions)
            .finally(() => setLoadingSubs(false));
    };

    const selectSubtitleOption = (url) => {
        SrtClass.ReadFile(url).then((records) => {
            dispatch(setSubtitle(records));
            dispatch(setSubtitleName(url));
        });
        setShowSubtitlePicker(false);
    };

    const clearSubtitleOption = () => {
        dispatch(setSubtitle([]));
        dispatch(setSubtitleName(''));
        setShowSubtitlePicker(false);
    };


    const timeToString = (time) => {
        let h = Math.floor(time / (60 * 60) % 24);
        let m = Math.floor(time / (60) % 60);
        let s = Math.floor(time % 60);
        if (h < 10) h = '0' + h;
        if (m < 10) m = '0' + m;
        if (s < 10) s = '0' + s;
        return h + ':' + m + ':' + s
    }

    useEffect(() => {
        if (duration > 0) {
            setProgress(Math.floor(time / duration * 100) / 100);
        }
        timeLabel.current.innerHTML = timeToString(time) + ' / ' + timeToString(duration);
    }, [time, duration]);

    useEffect(() => {
        if(Utils.hasActiveInput()) return;
        if (modalOpen || !keyEvent) return;
        let jump = keyEvent.shiftKey ? 1 : 5;
        if (keyEvent.ctrlKey) jump *= 2;
        if (keyEvent.altKey) jump /= 2;

        // Checked against both the legacy numeric keyCode (real physical/OS keyboard events
        // still populate this) and the modern string key (also required for the Flutter app's
        // remote-control forwarding: its synthetic KeyboardEvent only sets key/code, since
        // keyCode isn't settable via the KeyboardEvent constructor — Chromium computes it as 0
        // for script-constructed events, so a keyCode-only check silently never matches a D-pad
        // press forwarded that way).
        const code = keyEvent.keyCode;
        const key = keyEvent.key;
        switch (true) {
            case code === KEY.SPACE || code === KEY.SPACE_ANDROID_V_KB || code === KEY.MEDIA_PLAY_PAUSE
                || key === ' ' || key === 'MediaPlayPause':
                onPlayClick()
                break;
            case code === KEY.LEFT || code === KEY.REWIND || key === 'ArrowLeft' || key === 'MediaRewind':
                setTime(time - jump)
                break;
            case code === KEY.RIGHT || code === KEY.FAST_FORWARD || key === 'ArrowRight' || key === 'MediaFastForward':
                setTime(time + jump)
                break;
            case code === KEY.NEXT_TRACK || key === 'MediaTrackNext':
                openItemFromList(1);
                break
            case code === KEY.PREV_TRACK || key === 'MediaTrackPrevious':
                openItemFromList(-1);
                break
            case code === KEY.CHANNEL_UP || key === 'PageUp':
                if (document.fullscreenElement) openItemFromList(1);
                break;
            case code === KEY.CHANNEL_DOWN || key === 'PageDown':
                if (document.fullscreenElement) openItemFromList(-1);
                break;
            case code === KEY.F || key === 'f' || key === 'F':
                onFullscreen()
                break;
        }

        if (keyEvent.code === 'Digit3') {
            onFullscreen()
        } else if(keyEvent.code === 'Digit5') {
            window.location.reload();
        }

        if (keyEvent.code === 'Digit7') {
            dispatch(setSettings_syncConfig({
                ...syncConfig,
                subtitleDelay: subtitleDelay + 0.5,
                subtitleSlope: 1,
            }));
        } else if(keyEvent.code === 'Digit9') {
            dispatch(setSettings_syncConfig({
                ...syncConfig,
                subtitleDelay: subtitleDelay - 0.5,
                subtitleSlope: 1,
            }));
        }
        setKeyEvent(null);
    }, [keyEvent, subtitleDelay, subtitleSlope, syncConfig]);

    useEffect(() => {

        const handleKeyDown = (e) => {
            setKeyEvent(e);
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, []);

    const mouseMove = (e) => {
        updateSeek(e.clientX);
    }

    const mousein = (str) => {
        if (str === "Handle")
            setStyleHandle({ ...styleHandle, cursor: 'pointer' });
        else if (str === "Button")
            setStyleButton({ ...styleButton, cursor: 'pointer' });
    }

    const mouseout = (str) => {
        if (str === "Handle")
            setStyleHandle({ ...styleHandle, cursor: 'arrow' });
        else if (str === "Button")
            setStyleButton({ ...styleButton, cursor: 'arrow' });
    }

    const updateSeek = (x) => {
        var rect = seekbar.current.getBoundingClientRect();
        let progress = (x - rect.left) / rect.width;
        if (progress >= 1.0) progress = 1.0;
        if (progress < 0.0) progress = 0.0;
        setTime(progress * duration);
    }

    const mousedown = (e) => {
        updateSeek(e.clientX);
        e.stopPropagation();
    }

    const cleanDocEvents = () => {
        document.onpointermove = null;
        document.onpointerup = null;
    }

    useEffect(() => {
        if (playerState === 'play') {
            PlayIcon = (MdPause);
        }
        else {
            PlayIcon = (MdPlayArrow);
        }
    }, [playerState])

    const onPlayClick = (event) => {
        if (videoName) {
            if (playerState === 'play') {
                setPlayerState('pause');
            }
            else {
                setPlayerState('play');
            }
        } else {
            openItemFromList(0);
        }
    }

    useEffect(() => {
        const handleOkKey = (e) => {
            if (Utils.hasActiveInput()) return;
            if (modalOpen) return;
            if (e.keyCode !== KEY.ENTER) return;
            e.preventDefault();
            okTapCount.current += 1;
            if (okTapTimer.current) clearTimeout(okTapTimer.current);
            okTapTimer.current = setTimeout(() => {
                const taps = okTapCount.current;
                okTapCount.current = 0;
                okTapTimer.current = null;
                if (taps === 1) {
                    if (videoName) {
                        setPlayerState(playerState === 'play' ? 'pause' : 'play');
                    }
                } else if (taps === 2) {
                    onFullscreen();
                } else {
                    window.dispatchEvent(new CustomEvent('rc:content'));
                }
            }, 400);
        };
        window.addEventListener('keydown', handleOkKey);
        return () => {
            window.removeEventListener('keydown', handleOkKey);
            if (okTapTimer.current) clearTimeout(okTapTimer.current);
        };
    }, [playerState, videoName, onFullscreen, modalOpen]);

    // Next/previous episode. The saved list is only right if it was made on this device for this
    // video — an episode cast here from a phone (Store, History, AI) left this screen with no list,
    // or another title's, so Next/Prev did nothing. When the saved list doesn't contain what's
    // playing, it's rebuilt from the video's own title folder on the server.
    const openItemFromList = async (dir) => {
        try {
            let list = null;
            try { list = JSON.parse(localStorage.currentList); } catch {}
            const current = libraryPath(videoSrcRef.current);
            if (!current) {
                // Nothing loaded (Play pressed on an empty player): reopen the saved list's item.
                const i = Number(localStorage.currentListIndex) + dir;
                if (!list?.videos || !(i >= 0 && i < list.videos.length)) return;
                StorageHelper.saveToCurrentList({ ...list, index: i });
                openContent({ video: retoken(list.videos[i]), srt: retoken(list.srts?.[i]), filter: retoken(list.filters?.[i]) });
                return;
            }
            let index = list?.videos?.findIndex(v => libraryPath(v) === current) ?? -1;
            if (index < 0) {
                const title = await findTitleForVideo(videoSrcRef.current);
                if (!title) return;
                const episodes = playablesOf(localStorage.getItem('domain'), title);
                list = { videos: episodes.map(e => e.video), srts: episodes.map(e => e.srt), filters: episodes.map(e => e.filter) };
                index = list.videos.findIndex(v => libraryPath(v) === current);
                if (index < 0) return;
            }
            const next = index + dir;
            if (next < 0 || next >= list.videos.length) return;
            StorageHelper.saveToCurrentList({ ...list, index: next });
            openContent({ video: retoken(list.videos[next]), srt: retoken(list.srts?.[next]), filter: retoken(list.filters?.[next]) });
        } catch (ex) { console.error('[next/prev]', ex); }
    }

    // The poll above is set up once, so it reads the current video through a ref.
    const videoSrcRef = useRef(videoSrc);
    useEffect(() => { videoSrcRef.current = videoSrc; }, [videoSrc]);
    // Same for the values the audio/subtitle commands adjust relative to their current value.
    const latestRef = useRef({});
    latestRef.current = { volume, syncConfig, fontConfig, time, duration, videoName, playing: playerState === 'play' };

    // Remote "mute" is volume 0, with the previous level remembered for unmuting — not the
    // player's own mute flag, which the scene filters (VideoFilter) set and clear on every tick
    // and would immediately undo.
    const toggleRemoteMute = () => {
        const current = latestRef.current.volume;
        const next = current > 0 ? 0 : (Number(localStorage.getItem('rc_prev_volume')) || 1);
        if (current > 0) localStorage.setItem('rc_prev_volume', String(current));
        setVolume(next);
        latestRef.current.volume = next; // several commands can apply before the next render
    };

    // Subtitles available for the current video, for the remote's subtitle picker.
    const remoteSubsRef = useRef([]);
    useEffect(() => {
        remoteSubsRef.current = [];
        if (!videoSrc) return;
        let cancelled = false;
        findSubtitlesForVideo(videoSrc).then(list => { if (!cancelled) remoteSubsRef.current = list; });
        return () => { cancelled = true; };
    }, [videoSrc]);

    const selectRemoteSubtitle = (name) => {
        if (!name) { dispatch(setSubtitle([])); dispatch(setSubtitleName('')); return; }
        const sub = remoteSubsRef.current.find(x => x.name === name);
        if (!sub) return;
        SrtClass.ReadFile(sub.url).then(records => {
            dispatch(setSubtitle(records));
            dispatch(setSubtitleName(sub.url));
        });
    };

    // Blur from the remote also mutes (the point is usually to hide a scene entirely), and turning
    // it back off restores the sound — but only if it was this that muted it.
    const toggleRemoteBlur = () => {
        const turningOn = !screenEffects.blur;
        window.dispatchEvent(new CustomEvent(SCREEN_EFFECT_EVENT, { detail: { effect: 'blur' } }));
        if (turningOn && latestRef.current.volume > 0) {
            toggleRemoteMute();
            localStorage.setItem('rc_blur_muted', '1');
        } else if (!turningOn && localStorage.getItem('rc_blur_muted') === '1') {
            localStorage.removeItem('rc_blur_muted');
            if (latestRef.current.volume === 0) toggleRemoteMute();
        }
    };

    const shiftSubtitles = (delta) => {
        const cfg = latestRef.current.syncConfig;
        const next = { ...cfg, subtitleDelay: Math.round((cfg.subtitleDelay + delta) * 100) / 100 };
        dispatch(setSettings_syncConfig(next));
        latestRef.current.syncConfig = next; // several commands can apply before the next render
    };

    // Subtitle look, set from the remote (absolute values, like the volume slider).
    const setSubtitleStyle = (patch) => {
        const next = { ...latestRef.current.fontConfig, ...patch };
        dispatch(setSettings_fontConfig(next));
        latestRef.current.fontConfig = next;
    };

    // Escape leaves the CSS fullscreen, as it would real fullscreen.
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') exitPseudoFullscreen(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Remote control: a controller device (a phone paired via the home screen QR) sends commands
    // that this screen applies — same per-username command-queue model /remote/play already uses
    // for "open this content". Polled even with nothing loaded, since fullscreen and logout still
    // apply then; the playback commands just do nothing without a video. Controllers never poll:
    // they're the ones sending.
    const lastControlTs = useRef(Number(sessionStorage.getItem('__lastControlTs') || 0));
    // False until this tab's first poll has come back (unless it already handled commands before
    // a reload) — see the skip on the first poll below.
    const controlPrimed = useRef(!!lastControlTs.current);
    useEffect(() => {
        if (isController()) return;
        const domain = localStorage.getItem('domain');
        if (!domain) return;
        const poll = async () => {
            if (!getToken()) return; // signed out: nothing to authenticate the poll with
            try {
                const res = await authFetch(`${domain}/api/v1/remote/control?after=${lastControlTs.current}`);
                if (!res.ok) return;
                const cmds = await res.json();
                if (!Array.isArray(cmds)) return;
                // A screen that's just opened skips whatever is already queued on its first poll
                // — those commands were sent before it was here to receive them.
                if (!controlPrimed.current) {
                    controlPrimed.current = true;
                    if (cmds.length) {
                        lastControlTs.current = cmds[cmds.length - 1].timestamp;
                        sessionStorage.setItem('__lastControlTs', String(lastControlTs.current));
                    }
                    return;
                }
                for (const cmd of cmds) {
                    lastControlTs.current = cmd.timestamp;
                    sessionStorage.setItem('__lastControlTs', String(cmd.timestamp));
                    // Commands are queued per-account, not per-device — a device that sent one
                    // itself mustn't apply it too (including "stop", which reloads the page).
                    if (cmd.sourceSession && cmd.sourceSession === sessionStorage.getItem('__sessionId')) continue;
                    // Staleness is enforced server-side, against the one server clock, not here
                    // against this device's own (often wrong, on a TV box) clock.
                    const hasVideo = !!videoSrcRef.current;
                    switch (cmd.action) {
                        case 'play': if (hasVideo) setPlayerState('play'); break;
                        case 'pause': if (hasVideo) setPlayerState('pause'); break;
                        case 'seek': if (hasVideo && typeof cmd.value === 'number') setTime(cmd.value); break;
                        case 'seek-by': {
                            // Relative, so quick repeated taps on the remote add up instead of all
                            // landing on the same spot computed from its last status report.
                            if (!hasVideo || typeof cmd.value !== 'number') break;
                            const target = Math.max(0, latestRef.current.time + cmd.value);
                            setTime(target);
                            latestRef.current.time = target; // several can apply before the next render
                            break;
                        }
                        case 'next': if (hasVideo) openItemFromList(1); break;
                        case 'prev': if (hasVideo) openItemFromList(-1); break;
                        case 'fullscreen': toggleRemoteFullscreen(); break;
                        case 'subtitle-shift': if (typeof cmd.value === 'number') shiftSubtitles(cmd.value); break;
                        case 'black': window.dispatchEvent(new CustomEvent(SCREEN_EFFECT_EVENT, { detail: { effect: 'black' } })); break;
                        case 'blur': toggleRemoteBlur(); break;
                        case 'subtitle': selectRemoteSubtitle(typeof cmd.value === 'string' ? cmd.value : ''); break;
                        case 'volume': if (typeof cmd.value === 'number') setVolume(Math.min(1, Math.max(0, cmd.value))); break;
                        case 'mute': toggleRemoteMute(); break;
                        case 'sub-size': if (typeof cmd.value === 'number') setSubtitleStyle({ size: clampFontSize(cmd.value) }); break;
                        case 'sub-bg': if (typeof cmd.value === 'number') setSubtitleStyle({ transparency: clampOpacity(cmd.value) }); break;
                        case 'sub-color': if (SUBTITLE_COLORS.some(c => c.value === cmd.value)) setSubtitleStyle({ color: cmd.value }); break;
                        case 'player-config': {
                            let patch = null;
                            try { patch = sanitizeConfigPatch(JSON.parse(cmd.value)); } catch {}
                            if (patch && Object.keys(patch).length) dispatch(setPlayerConfig(patch));
                            break;
                        }
                        case 'tts': setTtsEnabled(cmd.value === 'on'); break;
                        case 'tts-prefs': {
                            try { setTtsPrefs(JSON.parse(cmd.value)); } catch {}
                            break;
                        }
                        case 'stream-mode': if (typeof cmd.value === 'string') setStreamMode(cmd.value); break;
                        case 'reload': {
                            // Pick up exactly where it was: the position is normally only saved
                            // every few seconds, and whether it was playing isn't saved at all.
                            const { videoName: name, time: t0, duration: d0, playing } = latestRef.current;
                            if (name && t0) StorageHelper.saveContentProgress({ videoName: name, time: t0, duration: d0 });
                            if (playing) sessionStorage.setItem('rc_resume_play', '1');
                            window.location.reload();
                            break;
                        }
                        case 'logout': {
                            const { debugLog } = require('../../common/auth');
                            debugLog('Screen applying remote logout', { cmdAge: 'ts ' + cmd.timestamp, lastHandled: lastControlTs.current });
                            const t = getToken();
                            if (t) fetch(`${domain}/api/v1/remote/play`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` }, keepalive: true }).catch(() => {});
                            clearAuth();
                            window.history.replaceState({}, '', window.location.origin + window.location.pathname);
                            window.location.reload();
                            break;
                        }
                        case 'stop': {
                            const t = getToken();
                            if (t) {
                                fetch(`${domain}/api/v1/remote/play`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
                            }
                            // A navigation differing from the current URL only by its hash is a
                            // same-document fragment navigation and never actually reloads — with or
                            // without an explicit reload() right after (that races it and can just
                            // reload the still-hash-bearing page instead). history.replaceState makes
                            // the hash-free URL the one on the address bar first, so reload() re-fetches
                            // against that.
                            window.history.replaceState({}, '', window.location.origin + window.location.pathname);
                            window.location.reload();
                            break;
                        }
                        default: break;
                    }
                    if (cmd.action === 'logout' || cmd.action === 'stop' || cmd.action === 'reload') break; // page is reloading
                }
            } catch (e) { console.error('[remote control] poll err', e); }
        };
        const id = setInterval(poll, 800);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reports this device's live playback state so a controller device can show what's playing
    // and its progress, and render the correct play/pause icon, instead of guessing. Keeps the
    // latest values in a ref, synced every render, so the push interval below can stay on a
    // stable 2s cadence instead of restarting (and losing its timing) on every time-code tick.
    const statusRef = useRef(null);
    useEffect(() => {
        statusRef.current = {
            videoName: videoSrc ? videoName : '', playing: playerState === 'play', currentTime: time, duration,
            volume, subtitleDelay: syncConfig.subtitleDelay, hasSubtitle: !!subtitleName,
            subtitle: subtitleBaseName(subtitleName),
            fontSize: fontConfig.size, subBg: fontConfig.transparency, subColor: fontConfig.color || 'white',
            playerConfig,
        };
    });

    // Screens report even with nothing loaded, so the remote can still change their settings;
    // a controller only reports while it's playing something itself.
    useEffect(() => {
        if (!videoSrc && isController()) return;
        const domain = localStorage.getItem('domain');
        if (!domain) return;
        const push = () => {
            if (!getToken()) return;
            authFetch(`${domain}/api/v1/remote/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Black/blur are VideoPlayer state, which doesn't re-render this component, so
                // they're read fresh at push time rather than captured into statusRef.
                body: JSON.stringify({
                    ...statusRef.current,
                    black: screenEffects.black,
                    blur: screenEffects.blur,
                    fullscreen: isRemoteFullscreen(),
                    streamMode: getStreamMode(),
                    tts: getTtsEnabled(), ttsStatus: ttsState.status, ttsPrefs: getTtsPrefs(), ttsLanguage: ttsState.language,
                    subtitles: remoteSubsRef.current.map(x => x.name),
                }),
            }).catch(() => {});
        };
        push();
        const id = setInterval(push, 1200);
        return () => clearInterval(id);
    }, [videoSrc]);

    const player_controls = (
        <div className='main-controls'>
            {/* <MdReplay30 className='controls left' onClick={()=>{setTime(time-30)}} /> */}
            <MdSkipPrevious  className='controls left' onClick={(event) => { openItemFromList(-1); event.stopPropagation(); }} />
            <MdReplay10 className='controls left' onClick={(event) => { setTime(time - 10); event.stopPropagation(); }} />
            <MdReplay5 className='controls left' onClick={(event) => { setTime(time - 5); event.stopPropagation(); }} />
            <PlayIcon
                id="btn_play"
                // src={
                //     (playerState === 'pause') ?
                //         playicon : pauseicon
                // }
                alt='error'
                style={{ ...styleButton, color: 'white' }}
                onClick={onPlayClick}
                onPointerEnter={(e) => {
                    mousein("Button");
                    e.stopPropagation();
                }}
                onPointerLeave={(e) => {
                    mouseout("Button");
                    e.stopPropagation();
                }}
            />
            <MdForward5 className='controls right' onClick={(event) => { setTime(time + 5); event.stopPropagation(); }} />
            <MdForward10 className='controls right' onClick={(event) => { setTime(time + 10); event.stopPropagation(); }} />
            <MdSkipNext  className='controls right' onClick={(event) => { openItemFromList(1); event.stopPropagation(); }} />
            {/* <MdForward30 className='controls right' onClick={()=>{setTime(time+30)}} /> */}
        </div>
    );
    return (

        <div ref={ref}>
            <div style={style}>
                {onSpeedChange && videoSrc && (
                    <div className="speed-presets" onClick={e => e.stopPropagation()}>
                        {SPEED_PRESETS.map(s => (
                            <button
                                key={s}
                                className={`speed-btn${speedMulti === s ? ' speed-btn--active' : ''}`}
                                onClick={(e) => { onSpeedChange(s); e.stopPropagation(); }}
                            >
                                {s}x
                            </button>
                        ))}
                    </div>
                )}
                <div className='seekbar' style={seekbarStyle} ref={seekbar} onPointerDown={mousedown} onPointerUp={cleanDocEvents} onClick={e => e.stopPropagation()}>
                    <div style={{ ...styleProgress, width: (progress * 100) + '%' }}>
                        <div style={styleHandle}
                            ref={seekbutton}
                            onPointerEnter={() => { mousein("Handle") }}
                            onPointerLeave={() => { mouseout("Handle") }}
                            onPointerDown={(e) => {
                                document.onpointermove = mouseMove;
                                document.onpointerup = cleanDocEvents;
                                document.onclick = e => e.stopPropagation()
                                e.stopPropagation();
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        />
                    </div>
                </div>
                <p ref={timeLabel} className='controltime' />
                {player_controls}
                <MdSubtitles
                    id="subtitle-picker-toggle"
                    alt='error'
                    style={{
                        ...styleButton,
                        width: '38px',
                        height: '38px',
                        bottom: '14px',
                        position: 'absolute',
                        right: '50px',
                        color: showSubtitlePicker || subtitleName ? '#6c63ff' : 'white',
                        paintOrder: 'stroke fill',
                        strokeWidth: '20px',
                        stroke: 'black'
                    }}
                    onClick={toggleSubtitlePicker}
                    onPointerEnter={() => { mousein("Button") }}
                    onPointerLeave={() => { mouseout("Button") }}
                />
                {showSubtitlePicker && (
                    <div className="subtitle-picker" onClick={e => e.stopPropagation()}>
                        {loadingSubs && <div className="subtitle-picker-item">Loading…</div>}
                        {!loadingSubs && (
                            <div className="subtitle-picker-item" onClick={clearSubtitleOption}>
                                Off
                            </div>
                        )}
                        {!loadingSubs && subtitleOptions.length === 0 && (
                            <div className="subtitle-picker-item subtitle-picker-item--empty">No subtitles found</div>
                        )}
                        {!loadingSubs && subtitleOptions.map(sub => (
                            <div
                                key={sub.url}
                                className={`subtitle-picker-item${subtitleName === sub.url ? ' subtitle-picker-item--active' : ''}`}
                                onClick={() => selectSubtitleOption(sub.url)}
                            >
                                {sub.name}
                            </div>
                        ))}
                    </div>
                )}
                <GiExpand
                    id="full-screen"
                    alt='error'
                    style={{
                        ...styleButton,
                        width: '38px',
                        height: '38px',
                        bottom: '14px',
                        position: 'absolute',
                        right: '0',
                        color: 'white',
                        paintOrder: 'stroke fill',
                        strokeWidth: '20px',
                        stroke: 'black'
                    }}
                    onClick={(e) => {
                        onFullscreen();
                        e.stopPropagation();
                    }}
                    onPointerEnter={() => { mousein("Button") }}
                    onPointerLeave={() => { mouseout("Button") }}
                />
            </div>
            <div className='controls-volume' style={styleAudio}>
                <Slider
                    value={volume * 100}
                    mute={isMute}
                    setValue={
                        (v) => {
                            setVolume(v);
                        }
                    } />
            </div>
        </div>
    );
}

const mapStateToProps = state => {
    return {
        time: selectTime(state),
        duration: selectDuration(state),
        playerState: selectPlayerState(state),
        volume: selectVolume(state),
        isMute: selectMute(state),
        modalOpen: selectModalOpen(state),
        videoName: selectVideoName(state),
    };
};

export default connect(mapStateToProps, { setTime, setPlayerState, setPlayerState, setVolume })(VideoControls);
