import React, { useEffect, useRef, useState } from 'react';
import { authFetch } from '../../common/auth';
import './style.css';

// Narrator voice options (Settings and Remote Control): the voice per subtitle language, with a
// preview, plus speed and pitch. `prefs` is { voices, rate, pitch } (see common/tts.js);
// onChange gets a patch of it. `language` is the language to show first (e.g. the subtitle's).
let catalogue = null; // the server's voice list, fetched once per page

const pitchLabel = (p) => (p === 0 ? 'Normal' : `${p > 0 ? '+' : ''}${p}`);

export default function NarratorOptions({ domain, prefs, onChange, language }) {
    const [languages, setLanguages] = useState(catalogue);
    const [error, setError] = useState('');
    const [lang, setLang] = useState(language || 'ar');
    const [previewing, setPreviewing] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        if (catalogue) return;
        authFetch(`${domain}/api/v1/tts/voices`)
            .then(r => (r.ok ? r.json() : Promise.reject(new Error(`Server error (${r.status})`))))
            .then(d => { catalogue = d.languages || []; setLanguages(catalogue); })
            .catch(e => setError(e.message));
    }, [domain]);

    useEffect(() => { if (language) setLang(language); }, [language]);
    useEffect(() => () => audioRef.current?.pause(), []);

    if (error) return <div className="narrator-note">Couldn't load voices: {error}</div>;
    if (!languages) return <div className="narrator-note">Loading voices…</div>;

    const entry = languages.find(l => l.code === lang) || languages[0];
    const voice = prefs.voices?.[entry.code] || entry.default;
    const isPiper = voice === 'piper';

    const preview = async () => {
        audioRef.current?.pause();
        setPreviewing(true);
        try {
            const q = new URLSearchParams({ lang: entry.code, voice, rate: prefs.rate, pitch: prefs.pitch });
            const res = await authFetch(`${domain}/api/v1/tts/preview?${q}`);
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Server error (${res.status})`);
            const url = URL.createObjectURL(await res.blob());
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => { URL.revokeObjectURL(url); setPreviewing(false); };
            await audio.play();
        } catch (e) {
            setError(e.message);
            setPreviewing(false);
        }
    };

    const step = (value, delta, min, max) => Math.min(max, Math.max(min, Math.round((value + delta) * 10) / 10));

    return (
        <div className="narrator">
            <div className="narrator-row">
                <span className="narrator-label">Language</span>
                <select className="narrator-select" value={entry.code} onChange={e => setLang(e.target.value)} aria-label="Subtitle language">
                    {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
            </div>
            <div className="narrator-row">
                <span className="narrator-label">Voice</span>
                <select className="narrator-select" value={voice} aria-label={`Voice for ${entry.name}`}
                    onChange={e => onChange({ voices: { [entry.code]: e.target.value } })}>
                    {entry.piper && <option value="piper">Offline (Piper){entry.default === 'piper' ? ' — default' : ''}</option>}
                    {entry.voices.map(v => <option key={v.id} value={v.id}>{v.label}{entry.default === v.id ? ' — default' : ''}</option>)}
                </select>
                <button className="narrator-btn" onClick={preview} disabled={previewing} title="Hear this voice">{previewing ? '…' : '▶'}</button>
            </div>
            <div className="narrator-row">
                <span className="narrator-label">Speed</span>
                <button className="narrator-btn" onClick={() => onChange({ rate: step(prefs.rate, -0.1, 0.7, 1.6) })} aria-label="Slower">−</button>
                <span className="narrator-value">{prefs.rate.toFixed(1)}×</span>
                <button className="narrator-btn" onClick={() => onChange({ rate: step(prefs.rate, 0.1, 0.7, 1.6) })} aria-label="Faster">+</button>
            </div>
            <div className="narrator-row">
                <span className="narrator-label">Pitch</span>
                <button className="narrator-btn" onClick={() => onChange({ pitch: Math.max(-6, prefs.pitch - 1) })} disabled={isPiper} aria-label="Lower pitch">−</button>
                <span className="narrator-value">{isPiper ? '—' : pitchLabel(prefs.pitch)}</span>
                <button className="narrator-btn" onClick={() => onChange({ pitch: Math.min(6, prefs.pitch + 1) })} disabled={isPiper} aria-label="Higher pitch">+</button>
            </div>
            {isPiper && <div className="narrator-note">Pitch applies to the online voices; the offline voice keeps its own.</div>}
        </div>
    );
}
