import React, { useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { selectSubtitle, selectSubtitleName, getSyncConfig, selectVolume, selectMute } from '../../redux/selectors';
import { authFetch, getToken } from '../../common/auth';
import { TTS_EVENT, TTS_PREFS_EVENT, getTtsEnabled, getTtsPrefs, ttsState, DUCK_LEVEL } from '../../common/tts';

// Subtitles read aloud. The server voices the loaded subtitle's lines into short clips, starting
// from where the viewer is (see RemoteConnection's utils/tts.js); this plays each line's clip as
// the line appears — following play/pause, seeks, playback speed and the subtitle sync delay — and
// lowers the video's own sound while a line is being spoken.
const TICK_MS = 150;
const READY_POLL_MS = 1500;
const LOOKAHEAD = 20;      // lines ahead whose readiness is tracked
const PRELOAD = 3;         // clips ahead kept loaded

// "Movie.ar.srt" -> "ar" (else the server detects the language from the text).
const languageFromName = (name) => (/\.([a-z]{2})\.(srt|vtt|ass|ssa)(\?|$)/i.exec(name || '') || [])[1]?.toLowerCase() || '';

// Index of the last line starting at or before `ms` (-1 if none).
const lineAt = (lines, ms) => {
    let lo = 0, hi = lines.length - 1, found = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (lines[mid][0] <= ms) { found = mid; lo = mid + 1; } else hi = mid - 1; }
    return found;
};

function SubtitleVoice({ videoRef, subtitle, subtitleName, subtitleDelay, volume, mute }) {
    const [enabled, setEnabled] = useState(getTtsEnabled);
    const [prefs, setPrefs] = useState(getTtsPrefs);
    const [track, setTrack] = useState(null); // { id, lines: [[from, to]] }
    const [status, setStatus] = useState({ state: 'off', error: '' });
    const live = useRef({});
    const unlockRef = useRef(null); // retries the blocked clip from a tap
    live.current = { subtitleDelay, volume, mute };

    useEffect(() => {
        const onChange = (e) => setEnabled(!!e.detail);
        const onVoice = (e) => setPrefs(e.detail);
        window.addEventListener(TTS_EVENT, onChange);
        window.addEventListener(TTS_PREFS_EVENT, onVoice);
        return () => {
            window.removeEventListener(TTS_EVENT, onChange);
            window.removeEventListener(TTS_PREFS_EVENT, onVoice);
        };
    }, []);

    useEffect(() => { ttsState.status = status.state; }, [status]);

    // Register the subtitle with the server; voicing starts at the current position.
    useEffect(() => {
        setTrack(null);
        if (!enabled || !subtitle?.length) { setStatus({ state: 'off', error: '' }); return; }
        let cancelled = false;
        setStatus({ state: 'preparing', error: '' });
        const domain = localStorage.getItem('domain');
        const video = videoRef.current;
        const at = Math.max(0, ((video?.currentTime || 0) - (live.current.subtitleDelay || 0)) * 1000);
        (async () => {
            try {
                const res = await authFetch(`${domain}/api/v1/tts/prepare`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        cues: subtitle.map(r => ({ from: r.from, to: r.to, text: (r.content || []).join('\n') })),
                        language: languageFromName(subtitleName),
                        voices: prefs.voices,
                        rate: prefs.rate,
                        pitch: prefs.pitch,
                        at,
                    }),
                });
                const data = await res.json();
                if (cancelled) return;
                if (!res.ok || data.error) { setStatus({ state: 'error', error: data.error || `Server error (${res.status})` }); return; }
                ttsState.language = data.language || '';
                setTrack({ id: data.id, lines: data.lines });
            } catch (e) {
                if (!cancelled) setStatus({ state: 'error', error: e.message });
            }
        })();
        return () => { cancelled = true; };
    }, [enabled, subtitle, subtitleName, prefs, videoRef]);

    // Play the clips.
    useEffect(() => {
        if (!track) return;
        const domain = localStorage.getItem('domain');
        const token = encodeURIComponent(getToken() || '');
        const clipUrl = (i) => `${domain}/tts/${track.id}/${i}?token=${token}`;
        const ready = new Set();
        const clips = new Map(); // line index -> Audio (loaded/loading)
        let current = null;      // { index, audio }
        let played = -1;         // last line started (so each plays once per pass)
        let lastTarget = null;
        let lastPoll = 0;
        let polling = false;
        let stopped = false;

        const clip = (i) => {
            if (!clips.has(i)) { const a = new Audio(clipUrl(i)); a.preload = 'auto'; clips.set(i, a); }
            return clips.get(i);
        };
        const stopCurrent = () => { if (current) { current.audio.pause(); current = null; } };

        const poll = async (index, at) => {
            if (polling) return;
            polling = true;
            lastPoll = Date.now();
            try {
                const from = Math.max(0, index);
                const res = await authFetch(`${domain}/api/v1/tts/${track.id}/ready?from=${from}&count=${LOOKAHEAD}&at=${Math.round(at)}`);
                if (res.ok && !stopped) {
                    const data = await res.json();
                    (data.ready || []).forEach(i => ready.add(i));
                    if (data.error) setStatus({ state: 'error', error: data.error });
                }
            } catch {}
            polling = false;
        };

        const tick = () => {
            const video = videoRef.current;
            if (!video) return;
            const { subtitleDelay: delay = 0, volume: vol = 1, mute: muted } = live.current;
            // A line shows (and is spoken) at its time plus the sync delay.
            const target = (video.currentTime - delay) * 1000;
            const playing = !video.paused && !video.seeking;
            const index = lineAt(track.lines, target);

            // A seek (or a jump back): forget what was played, re-follow from here.
            if (lastTarget !== null && (target < lastTarget - 500 || target > lastTarget + 3000)) {
                stopCurrent();
                played = index - 1;
                lastPoll = 0;
            }
            lastTarget = target;

            if (Date.now() - lastPoll > READY_POLL_MS) poll(index, target);

            // Keep the next few clips loaded.
            for (let k = Math.max(0, index); k <= index + PRELOAD && k < track.lines.length; k++) if (ready.has(k)) clip(k);
            for (const k of clips.keys()) if (k < index - 1 || k > index + PRELOAD + 1) { if (current?.index !== k) clips.delete(k); }

            // Status: preparing until the lines around here are voiced.
            const upcoming = Math.max(0, index);
            const nearReady = ready.has(upcoming) || ready.has(upcoming + 1);
            const state = nearReady ? 'ready' : 'preparing';
            setStatus(s => (s.state === 'error' || s.state === 'blocked' || s.state === state ? s : { state, error: '' }));

            if (!playing) {
                if (current && !current.audio.paused) current.audio.pause();
            } else {
                // Time to start line `index`?
                if (index >= 0 && index > played && ready.has(index)) {
                    const [from, to] = track.lines[index];
                    const into = (target - from) / 1000;
                    // Only while it's still reasonably current (not after a long pause mid-line).
                    if (into < Math.max(1.5, (to - from) / 1000)) {
                        stopCurrent();
                        const audio = clip(index);
                        try { audio.currentTime = Math.max(0, into > 0.25 ? into : 0); } catch {}
                        audio.playbackRate = video.playbackRate || 1;
                        current = { index, audio };
                        played = index;
                        audio.play().then(() => setStatus(s => (s.state === 'blocked' ? { state: 'ready', error: '' } : s))).catch(err => {
                            if (err?.name !== 'NotAllowedError') return;
                            setStatus({ state: 'blocked', error: '' });
                            unlockRef.current = () => audio.play().then(() => setStatus({ state: 'ready', error: '' })).catch(() => {});
                        });
                    } else {
                        played = index;
                    }
                } else if (current && current.audio.paused && !current.audio.ended && current.index === index) {
                    current.audio.play().catch(() => {}); // resume after a pause
                }
                if (current && current.audio.playbackRate !== video.playbackRate) current.audio.playbackRate = video.playbackRate || 1;
            }

            const speaking = !!current && !current.audio.paused && !current.audio.ended;
            if (current) current.audio.volume = muted ? 0 : Math.min(1, Math.max(0, vol));
            ttsState.duck = speaking ? DUCK_LEVEL : 1;
            const want = muted ? 0 : vol * ttsState.duck;
            if (Math.abs(video.volume - want) > 0.01) video.volume = Math.min(1, Math.max(0, want));
        };

        tick();
        const id = setInterval(tick, TICK_MS);
        return () => {
            stopped = true;
            clearInterval(id);
            stopCurrent();
            clips.clear();
            ttsState.duck = 1;
            const video = videoRef.current;
            const { volume: vol = 1, mute: muted } = live.current;
            if (video) video.volume = muted ? 0 : vol;
        };
    }, [track, videoRef]);

    if (!enabled || status.state === 'off' || status.state === 'ready') return null;
    return (
        <>
            {status.state === 'preparing' && <div className="subtitle-voice-status">🔊 Preparing voice…</div>}
            {status.state === 'error' && <div className="subtitle-voice-status subtitle-voice-status--error">🔇 {status.error}</div>}
            {status.state === 'blocked' && (
                <button className="subtitle-voice-status" onClick={e => {
                    e.stopPropagation();
                    // Playing from a tap unlocks sound for the clips that follow too.
                    unlockRef.current?.();
                }}>
                    🔊 Tap to turn on the voice
                </button>
            )}
        </>
    );
}

const mapStateToProps = state => ({
    subtitle: selectSubtitle(state),
    subtitleName: selectSubtitleName(state),
    subtitleDelay: getSyncConfig(state).subtitleDelay,
    volume: selectVolume(state),
    mute: selectMute(state),
});

export default connect(mapStateToProps)(React.memo(SubtitleVoice));
