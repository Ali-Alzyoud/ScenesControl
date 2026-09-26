// The scene-filter config (what the player does in each tagged scene), shared by the screen's
// Config panel and the remote's Screen settings.
import { PLAYER_ACTION } from '../redux/actionTypes';

export const VIDEO_OPTIONS = [
    PLAYER_ACTION.BLUR,
    PLAYER_ACTION.BLUR_EXTRA,
    PLAYER_ACTION.BLUR_EXTREME,
    PLAYER_ACTION.BLUR_EXTREME_X2,
    PLAYER_ACTION.BLACK,
    PLAYER_ACTION.SKIP,
    PLAYER_ACTION.NOACTION,
];

export const AUDIO_OPTIONS = [
    PLAYER_ACTION.MUTE,
    PLAYER_ACTION.NOACTION,
];

export const FILTER_ROWS = [
    { key: 'violence',  label: 'Violence',   icon: '⚔️' },
    { key: 'nudity',    label: 'Nudity',      icon: '🙈' },
    { key: 'sex',       label: 'Sex',         icon: '🔞' },
    { key: 'profanity', label: 'Profanity',   icon: '🤬' },
    { key: 'rightclick',label: 'Right Click', icon: '🖱️' },
];

export const FLAG_KEYS = ['filterRect', 'blackOnPause'];

// Keeps only well-formed entries of a config change received from a remote.
export const sanitizeConfigPatch = (patch) => {
    const out = {};
    if (!patch || typeof patch !== 'object') return out;
    for (const { key } of FILTER_ROWS) {
        const v = patch[key];
        if (Array.isArray(v) && VIDEO_OPTIONS.includes(v[0]) && AUDIO_OPTIONS.includes(v[1])) out[key] = [v[0], v[1]];
    }
    for (const key of FLAG_KEYS) if (typeof patch[key] === 'boolean') out[key] = patch[key];
    return out;
};
