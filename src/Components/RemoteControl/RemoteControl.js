import React, { useEffect, useRef, useState } from 'react'
import { MdClose, MdPlayArrow, MdPause, MdSkipNext, MdSkipPrevious, MdReplay10, MdForward10, MdReplay30, MdForward30, MdStop, MdVideoLibrary, MdFullscreen, MdLogout, MdVolumeOff, MdVolumeUp, MdBlurOn, MdTvOff, MdSubtitles, MdHistory, MdAdd, MdRemove, MdArrowBack, MdCheck, MdRefresh, MdHighQuality, MdSettings } from 'react-icons/md'
import { STREAM_MODES } from '../../common/streamMode'
import { SUBTITLE_COLORS, clampFontSize, clampOpacity } from '../../common/subtitleStyle'
import { VIDEO_OPTIONS, AUDIO_OPTIONS, FILTER_ROWS } from '../../common/playerConfig'
import { authFetch, debugLog } from '../../common/auth'
import StorePicker from '../FilterPickerLocal'

import './style.css'

const API_FILES = '/static';
const API_VIDEO = '/video';
const API = '/api/v1/files';

const formatTime = (s) => {
    s = Math.max(0, Math.floor(s || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = n => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
};

// Sends play/pause/seek/next/prev/stop commands to whatever device is currently playing content
// for this account (polled by VideoControls' own remote-control effect), and shows that
// device's live status — this is the controller side of the same per-username command queue.
// Works for any logged-in session, including a view-only one from scanning the sign-in QR code.
function RemoteControl({ domain, onClose }) {
    const [status, setStatus] = useState(null); // { videoName, playing, currentTime, duration } | null
    const [seekPreview, setSeekPreview] = useState(null); // local value while dragging the seek bar
    const [error, setError] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false); // Store, opened in "cast to the playing device" mode
    // Secondary views inside the panel, replacing the main controls while open.
    const [view, setView] = useState('main'); // 'main' | 'subtitles' | 'history' | 'stream' | 'settings'
    const [history, setHistory] = useState(null); // watch history from the server, or null while loading
    const [castNotice, setCastNotice] = useState('');
    // Play/pause is the only control whose button reflects real state (an icon), and that state
    // only updates once the full round trip lands: this device's command → the playing device's
    // poll picks it up (up to its own poll interval) → that device's next status push → this
    // device's next status poll. Seek/skip send-and-forget with no confirmation to wait on, so
    // they never felt slow the same way — this makes play/pause feel just as immediate by
    // flipping the icon locally right away, then deferring back to the real status once a poll
    // actually confirms it (or after a few seconds, in case the command never took effect).
    const [optimisticPlaying, setOptimisticPlaying] = useState(null);
    const optimisticTimer = useRef(null);
    // Same idea for the screen/audio/subtitle controls: show the new value immediately, then
    // defer to the screen's reported value once it matches (or after a few seconds).
    const [optimistic, setOptimistic] = useState({}); // { black?, blur?, volume?, subtitleDelay? }
    const optimisticTimers = useRef({});
    const [volumePreview, setVolumePreview] = useState(null); // local value while dragging

    const setOptimisticValue = (key, value) => {
        setOptimistic(o => ({ ...o, [key]: value }));
        clearTimeout(optimisticTimers.current[key]);
        optimisticTimers.current[key] = setTimeout(() => {
            setOptimistic(o => { const n = { ...o }; delete n[key]; return n; });
        }, 4000);
    };

    useEffect(() => {
        debugLog('RemoteControl mounted', { domain });
        return () => {
            debugLog('RemoteControl unmounted');
            clearTimeout(optimisticTimer.current);
            Object.values(optimisticTimers.current).forEach(clearTimeout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!domain) { setError('No server configured'); return; }
        let cancelled = false;
        const poll = async () => {
            try {
                const res = await authFetch(`${domain}/api/v1/remote/status`);
                if (cancelled) return;
                if (!res.ok) { setError(res.status === 401 ? 'Session expired — reopen this panel after logging in again' : `Server error (${res.status})`); return; }
                const data = await res.json();
                if (!cancelled) {
                    setStatus(data);
                    setError('');
                    // Real confirmation arrived — the optimistic override has done its job.
                    setOptimisticPlaying(prev => (prev !== null && data?.playing === prev) ? null : prev);
                    setOptimistic(prev => {
                        const next = { ...prev };
                        for (const key of Object.keys(next)) {
                            const reported = data?.[key];
                            const matches = typeof reported === 'number'
                                ? Math.abs(reported - next[key]) < 0.01
                                : (reported && typeof reported === 'object')
                                    ? JSON.stringify(reported) === JSON.stringify(next[key])
                                    : reported === next[key];
                            if (matches) delete next[key];
                        }
                        return next;
                    });
                }
            } catch (e) {
                if (!cancelled) setError(`Can't reach server (${e?.message || 'network error'})`);
            }
        };
        poll();
        const id = setInterval(poll, 1200);
        return () => { cancelled = true; clearInterval(id); };
    }, [domain]);

    const sendCommand = async (action, value) => {
        debugLog('RemoteControl: sendCommand clicked', { action, value });
        try {
            // This device may itself have content loaded (e.g. opened via the same QR sign-in
            // flow) — commands are queued per-account, not per-device, so without tagging the
            // sender, this device's own VideoControls polling loop would pick its own commands
            // back up and apply them to itself, including "stop", which reloads the page.
            const sourceSession = sessionStorage.getItem('__sessionId') || '';
            const res = await authFetch(`${domain}/api/v1/remote/control`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...(typeof value === 'number' || typeof value === 'string' ? { action, value } : { action }), sourceSession }),
            });
            debugLog('RemoteControl: sendCommand response', { action, status: res.status });
            if (!res.ok) setError(res.status === 401 ? 'Session expired — reopen this panel after logging in again' : `Command failed (${res.status})`);
            else setError('');
        } catch (e) {
            debugLog('RemoteControl: sendCommand threw', { action, message: e?.message });
            setError(`Can't reach server (${e?.message || 'network error'})`);
        }
    };

    // Passed into the Store as onRemoteOpen: instead of opening the picked content on THIS
    // device (which may just be a phone being used purely as a remote, with no reason to start
    // playing anything itself), it tells whatever device is already playing for this account to
    // open it — the same /remote/play "cast" channel openContent() itself broadcasts on, and
    // the same one VideoControls.js's idle-poll picks up.
    const handleRemoteOpen = async ({ video, srt, filter, image }) => {
        setPickerOpen(false);
        setView('main');
        debugLog('RemoteControl: change content', { video });
        try {
            const sourceSession = sessionStorage.getItem('__sessionId') || '';
            const res = await authFetch(`${domain}/api/v1/remote/play`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoPath: video, srtPath: srt || '', filterPath: filter || '', imagePath: image || '', sourceSession }),
            });
            debugLog('RemoteControl: change content response', { status: res.status });
            setCastNotice(res.ok ? 'Sent to the other screen' : `Failed to send (${res.status})`);
        } catch (e) {
            debugLog('RemoteControl: change content threw', { message: e?.message });
            setCastNotice(`Can't reach server (${e?.message || 'network error'})`);
        }
        setTimeout(() => setCastNotice(''), 3000);
    };

    // Sliders send their value once it stops changing, rather than on mouseup/touchend: on a
    // phone, a tap fires the value change and the touchend back to back, before React has
    // re-rendered — so a touchend handler still saw no new value and sent nothing (or, for seek,
    // the old position), even though the slider itself visibly moved.
    const sliderTimers = useRef({});
    const SLIDER_SETTLE_MS = 300;
    useEffect(() => () => Object.values(sliderTimers.current).forEach(clearTimeout), []);

    const onSeekInput = (v) => {
        setSeekPreview(v);
        clearTimeout(sliderTimers.current.seek);
        clearTimeout(sliderTimers.current.seekClear);
        sliderTimers.current.seek = setTimeout(() => {
            sendCommand('seek', v);
            // Hold the new position on screen until the next status report or two catch up.
            sliderTimers.current.seekClear = setTimeout(() => setSeekPreview(null), 2500);
        }, SLIDER_SETTLE_MS);
    };

    const hasContent = !!(status && status.videoName);
    const currentTime = status?.currentTime || 0;
    const displayTime = seekPreview !== null ? seekPreview : currentTime;
    const displayPlaying = optimisticPlaying !== null ? optimisticPlaying : !!status?.playing;

    const shown = (key, fallback) => (key in optimistic ? optimistic[key] : (status?.[key] ?? fallback));
    const shownBlack = shown('black', false);
    const shownBlur = shown('blur', false);
    const shownDelay = shown('subtitleDelay', 0);
    const shownVolume = volumePreview !== null ? volumePreview : shown('volume', 1);

    const toggleEffect = (key) => {
        setOptimisticValue(key, !shown(key, false));
        sendCommand(key);
    };

    const shiftSubtitles = (delta) => {
        setOptimisticValue('subtitleDelay', Math.round((shownDelay + delta) * 100) / 100);
        sendCommand('subtitle-shift', delta);
    };

    const toggleMute = () => {
        // The screen remembers its own pre-mute level; this only guesses for the instant display.
        setOptimisticValue('volume', shownVolume > 0 ? 0 : 1);
        sendCommand('mute');
    };

    const onVolumeInput = (v) => {
        setVolumePreview(v);
        clearTimeout(sliderTimers.current.volume);
        sliderTimers.current.volume = setTimeout(() => {
            setOptimisticValue('volume', v);
            sendCommand('volume', v);
            setVolumePreview(null);
        }, SLIDER_SETTLE_MS);
    };

    const togglePlay = () => {
        const next = !displayPlaying;
        setOptimisticPlaying(next);
        clearTimeout(optimisticTimer.current);
        // Safety net: if the command silently never took effect, don't leave the icon showing
        // the wrong state forever — fall back to whatever the next real poll actually says.
        optimisticTimer.current = setTimeout(() => setOptimisticPlaying(null), 6000);
        sendCommand(next ? 'play' : 'pause');
    };

    const toggleBlur = () => {
        // The screen also mutes while blurred; mirror that immediately here too.
        if (!shownBlur && shownVolume > 0) setOptimisticValue('volume', 0);
        toggleEffect('blur');
    };

    // Subtitle look on the screen — sent as absolute values, shown optimistically.
    const shownFontSize = shown('fontSize', 40);
    const shownSubBg = shown('subBg', 0.7);
    const shownSubColor = shown('subColor', 'white');
    const setSubStyle = (key, action, value) => { setOptimisticValue(key, value); sendCommand(action, value); };
    const stepRow = (label, value, onDec, onInc, disabled) => (
        <div className="remote-control-subs-row">
            <span className="remote-control-row-label">{label}</span>
            {iconBtn(`${label} down`, <MdRemove />, onDec, { disabled })}
            <span className="remote-control-subs-label">{value}</span>
            {iconBtn(`${label} up`, <MdAdd />, onInc, { disabled })}
        </div>
    );
    const subtitleStyleControls = () => (
        <>
            {stepRow('Size', `${shownFontSize}px`,
                () => setSubStyle('fontSize', 'sub-size', clampFontSize(shownFontSize - 2)),
                () => setSubStyle('fontSize', 'sub-size', clampFontSize(shownFontSize + 2)))}
            {stepRow('Backdrop', `${Math.round(shownSubBg * 100)}%`,
                () => setSubStyle('subBg', 'sub-bg', clampOpacity(shownSubBg - 0.1)),
                () => setSubStyle('subBg', 'sub-bg', clampOpacity(shownSubBg + 0.1)))}
            <div className="remote-control-subs-row">
                <span className="remote-control-row-label">Color</span>
                <div className="remote-control-swatches">
                    {SUBTITLE_COLORS.map(c => (
                        <button
                            key={c.value}
                            className={`remote-control-swatch${shownSubColor === c.value ? ' is-active' : ''}`}
                            style={{ background: c.value }}
                            title={c.label}
                            aria-label={c.label}
                            onClick={() => setSubStyle('subColor', 'sub-color', c.value)}
                        />
                    ))}
                </div>
            </div>
        </>
    );
    const syncRow = () => stepRow('Sync', `${shownDelay > 0 ? '+' : ''}${shownDelay.toFixed(1)}s`,
        () => shiftSubtitles(-0.5), () => shiftSubtitles(0.5), !shown('hasSubtitle', false));

    // The screen's scene-filter config (its Config panel). Changes are sent as a small patch.
    const shownConfig = shown('playerConfig', null);
    const setConfig = (patch) => {
        if (shownConfig) setOptimisticValue('playerConfig', { ...shownConfig, ...patch });
        sendCommand('player-config', JSON.stringify(patch));
    };
    const filterConfigControls = () => {
        if (!shownConfig) return <div className="remote-control-empty">Waiting for the screen to report its config…</div>;
        return (
            <div className="remote-control-group remote-control-group--column">
                <div className="remote-control-cfg-row remote-control-cfg-head">
                    <span />
                    <span>Video</span>
                    <span>Audio</span>
                </div>
                {FILTER_ROWS.map(({ key, label, icon }) => {
                    const [video, audio] = shownConfig[key] || [];
                    return (
                        <div key={key} className="remote-control-cfg-row">
                            <span className="remote-control-row-label" title={label}>{icon} {label}</span>
                            <select className="remote-control-select" value={video || ''} aria-label={`${label} video`}
                                onChange={e => setConfig({ [key]: [e.target.value, audio] })}>
                                {VIDEO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <select className="remote-control-select" value={audio || ''} aria-label={`${label} audio`}
                                onChange={e => setConfig({ [key]: [video, e.target.value] })}>
                                {AUDIO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                    );
                })}
                {[['filterRect', 'Filter area rectangle'], ['blackOnPause', 'Black screen on pause']].map(([key, label]) => (
                    <label key={key} className="remote-control-toggle-row">
                        <span>{label}</span>
                        <input type="checkbox" checked={!!shownConfig[key]} onChange={e => setConfig({ [key]: e.target.checked })} />
                    </label>
                ))}
            </div>
        );
    };

    const shownSubtitle = shown('subtitle', '');
    const pickSubtitle = (name) => {
        setOptimisticValue('subtitle', name);
        setOptimisticValue('hasSubtitle', !!name);
        sendCommand('subtitle', name);
    };

    const displayName = (name) => {
        let n = String(name || '').split('?')[0];
        try { n = decodeURIComponent(n); } catch {}
        return n.replace(/\.[^.]+$/, '');
    };

    // Watch history lives on the server per account (every device pushes to it as soon as it
    // opens something), so this is the same list the screen itself has.
    const openHistory = async () => {
        setView('history');
        setHistory(null);
        try {
            const res = await authFetch(`${domain}/api/v1/userdata`);
            const data = res.ok ? await res.json() : {};
            const list = Array.isArray(data.watchHistory) ? data.watchHistory : [];
            const seen = new Set();
            setHistory(list
                .filter(h => h.videoPath)
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                // Newest entry per video. Older entries' names can still include a ?token=...
                // query (and be percent-encoded), so they're compared by display name.
                .filter(h => { const key = displayName(h.videoName); return !seen.has(key) && seen.add(key); })
                .slice(0, 50));
        } catch {
            setHistory([]);
        }
    };


    // Only one of these full-screen overlays is ever shown at a time — while pickerOpen, Remote
    // Control's own overlay is skipped entirely, both because two stacked full-screen overlays
    // looked broken and because nesting the Store inside .remote-control-overlay's
    // onClick={onClose} would bubble every click on the Store's own backdrop up into closing
    // Remote Control too.
    if (pickerOpen) {
        return (
            <StorePicker
                path={domain + API_FILES}
                videoPath={domain + API_VIDEO}
                apiUrl={domain + API}
                close={() => setPickerOpen(false)}
                onRemoteOpen={handleRemoteOpen}
            />
        );
    }

    const iconBtn = (title, icon, onClick, { active = false, disabled = false } = {}) => (
        <button
            className={`remote-control-icon-btn${active ? ' is-active' : ''}`}
            title={title}
            aria-label={title}
            onClick={onClick}
            disabled={disabled}
        >
            {icon}
        </button>
    );

    let body;
    if (view === 'subtitles') {
        const options = status?.subtitles || [];
        body = (
            <>
                <div className="remote-control-subview-header">
                    {iconBtn('Back', <MdArrowBack />, () => setView('main'))}
                    <span>Subtitles</span>
                </div>
                <div className="remote-control-list">
                    <button className={`remote-control-list-item${!shownSubtitle ? ' is-active' : ''}`} onClick={() => pickSubtitle('')}>
                        {!shownSubtitle && <MdCheck />} Off
                    </button>
                    {options.map(name => (
                        <button key={name} className={`remote-control-list-item${shownSubtitle === name ? ' is-active' : ''}`} onClick={() => pickSubtitle(name)} title={name}>
                            {shownSubtitle === name && <MdCheck />} {displayName(name)}
                        </button>
                    ))}
                    {!options.length && <div className="remote-control-empty">No subtitle files next to this video</div>}
                </div>
                <div className="remote-control-group remote-control-group--column">
                    {syncRow()}
                    {subtitleStyleControls()}
                </div>
            </>
        );
    } else if (view === 'settings') {
        const current = shown('streamMode', 'direct');
        body = (
            <>
                <div className="remote-control-subview-header">
                    {iconBtn('Back', <MdArrowBack />, () => setView('main'))}
                    <span>Screen settings</span>
                </div>
                <div className="remote-control-section-title">Streaming</div>
                <div className="remote-control-list">
                    {STREAM_MODES.map(m => (
                        <button
                            key={m.value}
                            className={`remote-control-list-item${current === m.value ? ' is-active' : ''}`}
                            onClick={() => { setOptimisticValue('streamMode', m.value); sendCommand('stream-mode', m.value); }}
                        >
                            {current === m.value && <MdCheck />} {m.label}
                        </button>
                    ))}
                </div>
                <div className="remote-control-section-title">Scene filters</div>
                {filterConfigControls()}
                <div className="remote-control-section-title">Subtitles</div>
                <div className="remote-control-group remote-control-group--column">
                    {syncRow()}
                    {subtitleStyleControls()}
                </div>
                {!status && <div className="remote-control-empty">The screen isn't reporting yet — changes still apply once it's online.</div>}
            </>
        );
    } else if (view === 'stream') {
        const current = shown('streamMode', 'direct');
        body = (
            <>
                <div className="remote-control-subview-header">
                    {iconBtn('Back', <MdArrowBack />, () => setView('main'))}
                    <span>Streaming</span>
                </div>
                <div className="remote-control-list">
                    {STREAM_MODES.map(m => (
                        <button
                            key={m.value}
                            className={`remote-control-list-item${current === m.value ? ' is-active' : ''}`}
                            onClick={() => { setOptimisticValue('streamMode', m.value); sendCommand('stream-mode', m.value); setView('main'); }}
                        >
                            {current === m.value && <MdCheck />} {m.label}
                        </button>
                    ))}
                </div>
                <div className="remote-control-empty">HLS converts on the fly at the chosen quality — use it when playback over a remote connection stutters.</div>
            </>
        );
    } else if (view === 'history') {
        body = (
            <>
                <div className="remote-control-subview-header">
                    {iconBtn('Back', <MdArrowBack />, () => setView('main'))}
                    <span>History</span>
                </div>
                <div className="remote-control-list">
                    {history === null && <div className="remote-control-empty">Loading…</div>}
                    {history?.length === 0 && <div className="remote-control-empty">Nothing watched yet</div>}
                    {history?.map(h => (
                        <button
                            key={h.videoName + h.timestamp}
                            className="remote-control-list-item"
                            title={`Resume ${displayName(h.videoName)} on the screen`}
                            onClick={() => handleRemoteOpen({ video: h.videoPath, srt: h.srtPath, filter: h.filterPath, image: h.imagePath })}
                        >
                            <MdPlayArrow /> {displayName(h.videoName)}
                        </button>
                    ))}
                </div>
            </>
        );
    } else {
        body = (
            <>
                {hasContent ? (
                    <>
                        <div className="remote-control-nowplaying" title={status.videoName}>{displayName(status.videoName)}</div>
                        <div className="remote-control-seek-row">
                            <span className="remote-control-time">{formatTime(displayTime)}</span>
                            <input
                                className="remote-control-seek"
                                type="range"
                                min={0}
                                max={status.duration || 0}
                                step={1}
                                value={displayTime}
                                onChange={e => onSeekInput(Number(e.target.value))}
                            />
                            <span className="remote-control-time">{formatTime(status.duration)}</span>
                        </div>
                        <div className="remote-control-group remote-control-buttons">
                            <button className="remote-control-btn" onClick={() => sendCommand('seek-by', -30)} title="Back 30s"><MdReplay30 /></button>
                            <button className="remote-control-btn" onClick={() => sendCommand('seek-by', -10)} title="Back 10s"><MdReplay10 /></button>
                            <button className="remote-control-btn remote-control-btn--primary" onClick={togglePlay} title={displayPlaying ? 'Pause' : 'Play'}>
                                {displayPlaying ? <MdPause /> : <MdPlayArrow />}
                            </button>
                            <button className="remote-control-btn" onClick={() => sendCommand('seek-by', 10)} title="Forward 10s"><MdForward10 /></button>
                            <button className="remote-control-btn" onClick={() => sendCommand('seek-by', 30)} title="Forward 30s"><MdForward30 /></button>
                        </div>
                        <div className="remote-control-group">
                            {iconBtn('Previous', <MdSkipPrevious />, () => sendCommand('prev'))}
                            {iconBtn('Stop', <MdStop />, () => sendCommand('stop'))}
                            {iconBtn('Next', <MdSkipNext />, () => sendCommand('next'))}
                        </div>
                        <div className="remote-control-group">
                            {iconBtn(shownVolume > 0 ? 'Mute' : 'Unmute', shownVolume > 0 ? <MdVolumeUp /> : <MdVolumeOff />, toggleMute)}
                            <input
                                className="remote-control-seek"
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                value={shownVolume}
                                onChange={e => onVolumeInput(Number(e.target.value))}
                                aria-label="Volume"
                            />
                        </div>
                        <div className="remote-control-group">
                            {iconBtn('Subtitles', <MdSubtitles />, () => setView('subtitles'), { active: shown('hasSubtitle', false) })}
                            {iconBtn('Black screen', <MdTvOff />, () => toggleEffect('black'), { active: shownBlack })}
                            {iconBtn('Blur (also mutes)', <MdBlurOn />, toggleBlur, { active: shownBlur })}
                            {iconBtn(shown('fullscreen', false) ? 'Exit fullscreen' : 'Fullscreen', <MdFullscreen />, () => toggleEffect('fullscreen'), { active: shown('fullscreen', false) })}
                            {iconBtn('Streaming quality', <MdHighQuality />, () => setView('stream'), { active: shown('streamMode', 'direct') !== 'direct' })}
                        </div>
                    </>
                ) : (
                    <div className="remote-control-empty">{error || 'Nothing is currently playing'}</div>
                )}
                {hasContent && error && <div className="remote-control-error">{error}</div>}
                <div className="remote-control-group">
                    {iconBtn('Change content', <MdVideoLibrary />, () => setPickerOpen(true))}
                    {iconBtn('History', <MdHistory />, openHistory)}
                    {iconBtn('Screen settings', <MdSettings />, () => setView('settings'))}
                    {iconBtn('Reload screen', <MdRefresh />, () => sendCommand('reload'))}
                    {iconBtn('Log out screen', <MdLogout />, () => { if (window.confirm('Sign the other screen out?')) sendCommand('logout'); })}
                </div>
                {castNotice && <div className="remote-control-cast-notice">{castNotice}</div>}
            </>
        );
    }

    return (
        <div className="remote-control-overlay" onClick={onClose}>
            <div className="remote-control-panel" onClick={e => e.stopPropagation()}>
                <div className="remote-control-header">
                    <span>Remote Control</span>
                    <button className="remote-control-close" onClick={onClose}><MdClose /></button>
                </div>
                {body}
            </div>
        </div>
    );
}

export default RemoteControl;
