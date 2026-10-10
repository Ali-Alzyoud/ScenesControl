import { useEffect, useState } from 'react'
import { MdClose, MdSpeed } from 'react-icons/md'
import { runSpeedTest, speedAdvice, speedTestState } from '../../common/speedTest'
import { STREAM_MODES, getStreamMode, setStreamMode } from '../../common/streamMode'
import './style.css'

const PHASES = { ping: 'Measuring ping…', download: 'Measuring download…', upload: 'Measuring upload…' }
const modeLabel = (m) => STREAM_MODES.find(x => x.value === m)?.label || m

// One test's numbers and what they mean for streaming. `onUseMode(mode)` (optional) offers a button
// to switch to the suggested streaming mode. Also used by the Remote Control for a screen's test.
export function SpeedResult({ result, currentMode, onUseMode }) {
    if (!result) return null
    const advice = result.state === 'done' ? speedAdvice(result.downMbps) : null
    const fmt = (v, unit) => (v == null ? '—' : `${v} ${unit}`)
    return (
        <div className="speedtest-result">
            <div className="speedtest-figures">
                <div className="speedtest-figure"><span>Ping</span><strong>{fmt(result.latencyMs, 'ms')}</strong></div>
                <div className={`speedtest-figure${result.phase === 'download' ? ' is-live' : ''}`}><span>Download</span><strong>{fmt(result.downMbps, 'Mbps')}</strong></div>
                <div className={`speedtest-figure${result.phase === 'upload' ? ' is-live' : ''}`}><span>Upload</span><strong>{fmt(result.upMbps, 'Mbps')}</strong></div>
            </div>
            {result.state === 'running' && <div className="speedtest-status">{PHASES[result.phase] || 'Testing…'}</div>}
            {result.state === 'error' && <div className="speedtest-status speedtest-status--error">Test failed: {result.error}</div>}
            {advice && (
                <div className="speedtest-advice">
                    <span>{advice.text}</span>
                    {onUseMode && advice.mode !== currentMode && (
                        <button className="speedtest-btn" onClick={() => onUseMode(advice.mode)}>Use {modeLabel(advice.mode)}</button>
                    )}
                    {onUseMode && advice.mode === currentMode && <span className="speedtest-ok">✓ Using {modeLabel(currentMode)}</span>}
                </div>
            )}
        </div>
    )
}

// "Speed test" from the menu: this device's connection to the server.
export default function SpeedTest({ close }) {
    const [result, setResult] = useState(speedTestState.result?.state === 'running' ? speedTestState.result : null)
    const [mode, setMode] = useState(getStreamMode())
    const running = result?.state === 'running'
    const domain = localStorage.getItem('domain')
    const run = () => { if (!running) runSpeedTest(domain, setResult) }
    useEffect(() => { run() }, []) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') close() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [close])
    return (
        <div className="speedtest-overlay" onClick={close}>
            <div className="speedtest-modal" onClick={e => e.stopPropagation()}>
                <div className="speedtest-header">
                    <MdSpeed />
                    <span className="speedtest-title">Connection speed</span>
                    <button className="speedtest-close" onClick={close} aria-label="Close"><MdClose /></button>
                </div>
                <div className="speedtest-body">
                    <div className="speedtest-server">This device ↔ {domain || 'no server set'}</div>
                    <SpeedResult result={result} currentMode={mode} onUseMode={(m) => { setStreamMode(m); setMode(m) }} />
                    <button className="speedtest-btn speedtest-btn--primary" onClick={run} disabled={running} autoFocus>
                        {running ? 'Testing…' : 'Test again'}
                    </button>
                    <div className="speedtest-hint">To test a TV's connection, open Remote control → Screen settings on your phone.</div>
                </div>
            </div>
        </div>
    )
}
