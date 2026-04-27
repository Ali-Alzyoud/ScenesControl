import React, { useRef, useState, useEffect } from 'react'
import { connect } from "react-redux";
import { getFontConfig, getSyncConfig } from '../../redux/selectors';
import { setSettings_fontConfig, setSettings_syncConfig } from '../../redux/actions';
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

function Settings({ close, fontConfig, syncConfig, setSettings_fontConfig, setSettings_syncConfig }) {
    const [pos, setPos] = useState(null); // null = centered via CSS
    const dragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const modalRef = useRef(null);

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
                    <div className="settings-section-title">Subtitle</div>
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
});

export default connect(mapStateToProps, { setSettings_fontConfig, setSettings_syncConfig })(Settings);
