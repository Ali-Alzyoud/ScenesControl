// How this screen plays videos from the server: the original file directly, or an on-the-fly
// converted HLS stream at a set quality (much lighter over slow/remote connections). Stored per
// device; changing it (from Settings or from a remote) fires STREAM_MODE_EVENT so the player can
// switch straight away.
export const STREAM_MODES = [
    { value: 'direct', label: 'Direct (original file)' },
    { value: 'hls-1080', label: 'HLS 1080p (~5 Mbps)' },
    { value: 'hls-720', label: 'HLS 720p (~2.5 Mbps)' },
    { value: 'hls-480', label: 'HLS 480p (~1 Mbps)' },
];
export const STREAM_MODE_EVENT = 'sc:stream-mode-changed';
const KEY = 'streamMode';

export const getStreamMode = () => {
    const v = localStorage.getItem(KEY);
    return STREAM_MODES.some(m => m.value === v) ? v : 'direct';
};

export const setStreamMode = (value) => {
    if (!STREAM_MODES.some(m => m.value === value) || value === getStreamMode()) return;
    localStorage.setItem(KEY, value);
    window.dispatchEvent(new CustomEvent(STREAM_MODE_EVENT, { detail: value }));
};

// The HLS playlist URL for a server video URL (…/video/<path>?token=…) in the given mode, or null
// when it should play directly (Direct mode, or not one of this server's files).
export const hlsUrlFor = (videoSrc, mode) => {
    const m = /^hls-(\d+)$/.exec(mode || '');
    if (!m || !videoSrc) return null;
    const domain = localStorage.getItem('domain');
    if (!domain || !videoSrc.startsWith(`${domain}/video/`)) return null;
    let rel = videoSrc.slice(`${domain}/video/`.length).split('?')[0];
    try { rel = decodeURIComponent(rel); } catch {}
    let token = '';
    try { token = new URL(videoSrc).searchParams.get('token') || ''; } catch {}
    if (!token) token = localStorage.getItem('rc_auth_token') || '';
    return `${domain}/hls/index.m3u8?${new URLSearchParams({ path: rel, q: m[1], token })}`;
};
