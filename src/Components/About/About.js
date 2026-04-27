import React, { useRef, useState, useEffect } from 'react'
import './style.css'

function Key({ children }) {
    return <kbd className="about-kbd">{children}</kbd>
}

function ShortcutRow({ keys, desc }) {
    return (
        <tr className="about-row">
            <td className="about-keys">
                {keys.map((k, i) => (
                    <span key={i}>{i > 0 && <span className="about-sep"> / </span>}<Key>{k}</Key></span>
                ))}
            </td>
            <td className="about-desc">{desc}</td>
        </tr>
    )
}

function Section({ title, children }) {
    return (
        <div className="about-section">
            <div className="about-section-title">{title}</div>
            <table className="about-table">
                <tbody>{children}</tbody>
            </table>
        </div>
    )
}

export default function About({ close }) {
    const [pos, setPos] = useState(null);
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
        if (e.target.closest('button, a')) return;
        const rect = modalRef.current.getBoundingClientRect();
        dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        dragging.current = true;
        document.body.style.cursor = 'grabbing';
    };

    const modalStyle = pos
        ? { position: 'fixed', left: pos.x, top: pos.y, transform: 'none', margin: 0 }
        : {};

    return (
        <div className="about-overlay" onClick={close}>
            <div className="about-box" ref={modalRef} style={modalStyle} onClick={e => e.stopPropagation()}>
                <div className="about-header" onMouseDown={onHeaderMouseDown}>
                    <div>
                        <div className="about-app-name">Guided Scene Player / Editor</div>
                        <div className="about-meta">
                            <span>Ali M Alzyod</span>
                            <span className="about-dot">·</span>
                            <a className="about-link" href="mailto:ali198724@gmail.com">ali198724@gmail.com</a>
                            <span className="about-dot">·</span>
                            <a className="about-link" href="https://github.com/Ali-Alzyoud/ScenesControl" target="_blank" rel="noreferrer">GitHub</a>
                            <span className="about-dot">·</span>
                            <span className="about-version">v0.2 (2024)</span>
                        </div>
                    </div>
                    <button className="about-close" onClick={close}>✕</button>
                </div>

                <div className="about-body">
                    <Section title="Playback">
                        <ShortcutRow keys={['Space', '⏯']}           desc="Play / Pause" />
                        <ShortcutRow keys={['←', '⏪']}              desc="Seek back 5 s (Shift = 1 s · Ctrl = ×2 · Alt = ÷2)" />
                        <ShortcutRow keys={['→', '⏩']}              desc="Seek forward 5 s (Shift = 1 s · Ctrl = ×2 · Alt = ÷2)" />
                        <ShortcutRow keys={['F', '3']}               desc="Toggle fullscreen" />
                        <ShortcutRow keys={['5']}                    desc="Reload" />
                        <ShortcutRow keys={['⏭']}                   desc="Next in series" />
                        <ShortcutRow keys={['⏮']}                   desc="Previous in series" />
                    </Section>

                    <Section title="Subtitle Sync">
                        <ShortcutRow keys={['7']} desc="Subtitle delay +0.5 s" />
                        <ShortcutRow keys={['9']} desc="Subtitle delay −0.5 s" />
                    </Section>

                    <Section title="App Panels">
                        <ShortcutRow keys={['E']} desc="Toggle editor" />
                        <ShortcutRow keys={['C']} desc="Toggle config" />
                    </Section>

                    <Section title="Scene Editor">
                        <ShortcutRow keys={['[']}        desc="Set scene start time (or add new record)" />
                        <ShortcutRow keys={[']']}        desc="Set scene end time and deselect" />
                        <ShortcutRow keys={['N']}        desc="New record" />
                        <ShortcutRow keys={['S']}        desc="Select record" />
                        <ShortcutRow keys={['Ctrl + S']} desc="Save filter file" />
                        <ShortcutRow keys={['R']}        desc="Enable drawing" />
                        <ShortcutRow keys={['1']}        desc="Scene type: Violence" />
                        <ShortcutRow keys={['2']}        desc="Scene type: Nudity" />
                        <ShortcutRow keys={['3']}        desc="Scene type: Sex" />
                        <ShortcutRow keys={['4']}        desc="Scene type: Profanity" />
                        <ShortcutRow keys={['↑ / ↓']}   desc="Cycle scene type" />
                    </Section>

                    <Section title="Content Browser">
                        <ShortcutRow keys={['← → ↑ ↓']} desc="Navigate items" />
                        <ShortcutRow keys={['Enter']}    desc="Open selected item" />
                        <ShortcutRow keys={['Esc']}      desc="Close browser" />
                    </Section>

                    <Section title="Episode List">
                        <ShortcutRow keys={['↑ / ↓']} desc="Navigate episodes" />
                        <ShortcutRow keys={['Enter']}  desc="Play selected episode" />
                        <ShortcutRow keys={['Esc']}    desc="Close episode list" />
                    </Section>

                    <Section title="Mouse">
                        <ShortcutRow keys={['Click']}        desc="Play / Pause" />
                        <ShortcutRow keys={['Double-click']} desc="Toggle fullscreen" />
                        <ShortcutRow keys={['Middle-click']} desc="Toggle back screen" />
                    </Section>
                </div>

                <div className="about-footer">
                    <button className="about-ok" onClick={close}>Close</button>
                </div>
            </div>
        </div>
    )
}
