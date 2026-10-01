import React, { useRef, useState, useEffect } from 'react'
import { connect } from "react-redux";
import { getFontConfig, getSyncConfig, selectPlayerConfig } from '../../redux/selectors';
import { setSettings_fontConfig, setSettings_syncConfig, setPlayerConfig } from '../../redux/actions';
import { STREAM_MODES, STREAM_MODE_EVENT, getStreamMode, setStreamMode } from '../../common/streamMode';
import { SUBTITLE_COLORS } from '../../common/subtitleStyle';
import { TTS_EVENT, TTS_PREFS_EVENT, getTtsEnabled, setTtsEnabled, getTtsPrefs, setTtsPrefs, ttsState } from '../../common/tts';
import NarratorOptions from '../NarratorOptions/NarratorOptions';
import './style.css'

function Stepper({ label, hint, value, onDec, onInc }) {
    return (
        <div className="settings-row">
            <div className="settings-row-label">
                <span className="settings-label">{label}</span>
                {hint && <span className="settings-hint">{hint}</span>}
            </div>
            <div className="settings-stepper">
                <button className="settings-step-btn" onClick={onDec}>−</button>
                <span className="settings-value">{value}</span>
                <button className="settings-step-btn" onClick={onInc}>+</button>
            </div>
        </div>
    )
}

function Settings({ close, fontConfig, syncConfig, playerConfig, setSettings_fontConfig, setSettings_syncConfig, setPlayerConfig }) {
    const [pos, setPos] = useState(null); // null = centered via CSS
    const dragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const modalRef = useRef(null);
    const [streamMode, setStreamModeState] = useState(getStreamMode);
    const changeStreamMode = (value) => { setStreamMode(value); setStreamModeState(value); };
    const [tts, setTts] = useState(getTtsEnabled);
    const [ttsPrefs, setTtsPrefsState] = useState(getTtsPrefs);
    useEffect(() => {
        const onTts = (e) => setTts(!!e.detail);
        const onVoice = (e) => setTtsPrefsState(e.detail);
        window.addEventListener(TTS_EVENT, onTts);
        window.addEventListener(TTS_PREFS_EVENT, onVoice);
        return () => {
            window.removeEventListener(TTS_EVENT, onTts);
            window.removeEventListener(TTS_PREFS_EVENT, onVoice);
        };
    }, []);
    // A remote can change it while this is open.
    useEffect(() => {
        const onChange = (e) => setStreamModeState(e.detail);
        window.addEventListener(STREAM_MODE_EVENT, onChange);
        return () => window.removeEventListener(STREAM_MODE_EVENT, onChange);
    }, []);

    useEffect(() => {
        const onMouseMove = (e) => {
            if (!dragging.current) return;
            setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
        };
        const onMouseUp = () => { dragging.current = false; document.body.style.cursor = ''; };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    const onHeaderMouseDown = (e) => {
        if (e.target.closest('button')) return;
        const rect = modalRef.current.getBoundingClientRect();
        dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        dragging.current = true;
        document.body.style.cursor = 'grabbing';
    };

    const modalStyle = pos
        ? { position: 'fixed', left: pos.x, top: pos.y, transform: 'none', margin: 0 }
        : {};

    const incFontSize = () => {
        if (fontConfig.size < 80)
            setSettings_fontConfig({ ...fontConfig, size: fontConfig.size + 2 });
    }
    const decFontSize = () => {
        if (fontConfig.size > 10)
            setSettings_fontConfig({ ...fontConfig, size: fontConfig.size - 2 });
    }
    const incBackground = () => {
        const t = Math.round(10 * (fontConfig.transparency + 0.1)) / 10;
        if (t <= 1.0) setSettings_fontConfig({ ...fontConfig, transparency: t });
    }
    const decBackground = () => {
        const t = Math.round(10 * (fontConfig.transparency - 0.1)) / 10;
        if (t >= 0.0) setSettings_fontConfig({ ...fontConfig, transparency: t });
    }
    const incSubSync = () => setSettings_syncConfig({ ...syncConfig, subtitleDelay: syncConfig.subtitleDelay + 0.5 });
    const decSubSync = () => setSettings_syncConfig({ ...syncConfig, subtitleDelay: syncConfig.subtitleDelay - 0.5 });

    return (
        <div className="settings-overlay" onClick={close}>
            <div className="settings-modal" ref={modalRef} style={modalStyle} onClick={e => e.stopPropagation()}>
                <div className="settings-header" onMouseDown={onHeaderMouseDown}>
                    <span className="settings-title">Settings</span>
                    <button className="settings-close" onClick={close}>✕</button>
                </div>

                <div className="settings-body">
                    <div className="settings-section-title">Playback</div>
                    <div className="settings-row">
                        <div className="settings-row-label">
                            <span className="settings-label">Streaming</span>
                            <span className="settings-hint">HLS is lighter over remote links</span>
                        </div>
                        <select className="settings-select" value={streamMode} onChange={e => changeStreamMode(e.target.value)}>
                            {STREAM_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>

                    <div className="settings-row">
                        <div className="settings-row-label">
                            <span className="settings-label">Scene Filters</span>
                            <span className="settings-hint">Ignore = play everything unfiltered</span>
                        </div>
                        <select className="settings-select" value={playerConfig?.ignoreFilters ? 'ignore' : 'apply'} onChange={e => setPlayerConfig({ ignoreFilters: e.target.value === 'ignore' })}>
                            <option value="apply">Apply</option>
                            <option value="ignore">Ignore</option>
                        </select>
                    </div>

                    <div className="settings-section-title">Subtitle</div>
                    <div className="settings-row">
                        <div className="settings-row-label">
                            <span className="settings-label">Read Aloud</span>
                            <span className="settings-hint">A voice reads the subtitles</span>
                        </div>
                        <select className="settings-select" value={tts ? 'on' : 'off'} onChange={e => { setTtsEnabled(e.target.value === 'on'); setTts(e.target.value === 'on'); }}>
                            <option value="off">Off</option>
                            <option value="on">On</option>
                        </select>
                    </div>
                    {tts && (
                        <div className="settings-row settings-row--block">
                            <div className="settings-row-label">
                                <span className="settings-label">Narrator</span>
                                <span className="settings-hint">Voice per subtitle language, speed and pitch</span>
                            </div>
                            <NarratorOptions
                                domain={localStorage.getItem('domain')}
                                prefs={ttsPrefs}
                                language={ttsState.language}
                                onChange={patch => { setTtsPrefs(patch); setTtsPrefsState(getTtsPrefs()); }}
                            />
                        </div>
                    )}
                    <Stepper
                        label="Font Size"
                        hint="Subtitle font size"
                        value={`${fontConfig.size} px`}
                        onDec={decFontSize}
                        onInc={incFontSize}
                    />
                    <Stepper
                        label="Background"
                        hint="Subtitle backdrop opacity"
                        value={fontConfig.transparency.toFixed(1)}
                        onDec={decBackground}
                        onInc={incBackground}
                    />
                    <div className="settings-row">
                        <div className="settings-row-label">
                            <span className="settings-label">Color</span>
                            <span className="settings-hint">Subtitle text color</span>
                        </div>
                        <div className="settings-swatches">
                            {SUBTITLE_COLORS.map(c => (
                                <button
                                    key={c.value}
                                    className={`settings-swatch${(fontConfig.color || 'white') === c.value ? ' is-active' : ''}`}
                                    style={{ background: c.value }}
                                    title={c.label}
                                    aria-label={c.label}
                                    onClick={() => setSettings_fontConfig({ ...fontConfig, color: c.value })}
                                />
                            ))}
                        </div>
                    </div>
                    <Stepper
                        label="Sync Delay"
                        hint="Offset subtitle timing"
                        value={`${syncConfig.subtitleDelay >= 0 ? '+' : ''}${syncConfig.subtitleDelay.toFixed(1)} s`}
                        onDec={decSubSync}
                        onInc={incSubSync}
                    />
                </div>

                <div className="settings-footer">
                    <button className="settings-ok" onClick={close}>Close</button>
                </div>
            </div>
        </div>
    )
}

const mapStateToProps = state => ({
    fontConfig: getFontConfig(state),
    syncConfig: getSyncConfig(state),
    playerConfig: selectPlayerConfig(state),
});

export default connect(mapStateToProps, { setSettings_fontConfig, setSettings_syncConfig, setPlayerConfig })(Settings);
