// "Read subtitles aloud": a per-device on/off switch (Settings, the remote), plus live state shared
// between the voice player and the video player.
export const TTS_EVENT = 'sc:tts-changed';
const KEY = 'ttsEnabled';

export const getTtsEnabled = () => localStorage.getItem(KEY) === '1';

export const setTtsEnabled = (on) => {
    if (!!on === getTtsEnabled()) return;
    localStorage.setItem(KEY, on ? '1' : '0');
    window.dispatchEvent(new CustomEvent(TTS_EVENT, { detail: !!on }));
};

// Narrator preferences: the voice picked per subtitle language ({ ar: 'ar-EG-SalmaNeural',
// en: 'piper', … } — ids from GET /api/v1/tts/voices; unset = the server's default for that
// language), speed (0.7–1.6x) and pitch (-6…+6 semitones; Edge voices only).
export const TTS_PREFS_EVENT = 'sc:tts-prefs-changed';
const PREFS_KEY = 'ttsPrefs';
const clampRate = (r) => Math.min(1.6, Math.max(0.7, Math.round((Number(r) || 1) * 10) / 10));
const clampPitch = (p) => Math.min(6, Math.max(-6, Math.round(Number(p) || 0)));

export const getTtsPrefs = () => {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch {}
    const voices = { ...(saved.voices || {}) };
    // The earlier Arabic-only setting.
    const oldArabic = localStorage.getItem('ttsVoiceAr');
    if (oldArabic && !voices.ar) voices.ar = oldArabic;
    return { voices, rate: clampRate(saved.rate ?? 1), pitch: clampPitch(saved.pitch ?? 0) };
};

// patch: { voices?: { [language]: id }, rate?, pitch? } — merged into the saved preferences.
export const setTtsPrefs = (patch) => {
    const cur = getTtsPrefs();
    const voices = { ...cur.voices };
    for (const [lang, id] of Object.entries(patch?.voices || {})) {
        if (/^[a-z]{2,3}$/.test(lang) && typeof id === 'string' && id.length < 80) voices[lang] = id;
    }
    const next = { voices, rate: clampRate(patch?.rate ?? cur.rate), pitch: clampPitch(patch?.pitch ?? cur.pitch) };
    if (JSON.stringify(next) === JSON.stringify(cur)) return;
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    localStorage.removeItem('ttsVoiceAr');
    window.dispatchEvent(new CustomEvent(TTS_PREFS_EVENT, { detail: next }));
};

// duck: factor the video's own volume is multiplied by (lowered while a line is spoken).
// status: 'off' | 'preparing' | 'ready' | 'blocked' | 'error' — reported to the remote.
// language: the language of the subtitle being read (as the server detected it).
export const ttsState = { duck: 1, status: 'off', language: '' };

// How far the original audio is lowered under a spoken line.
export const DUCK_LEVEL = 0.3;
