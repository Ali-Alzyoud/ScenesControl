// Connection speed test between this device and the server (RemoteConnection routes/speed.js):
// round-trip time, then download and upload throughput. Used by the Speed test panel, and by a
// screen when a remote asks it to test its own connection ('speed-test' command); the latest
// result is kept in speedTestState so the screen can report it in its status.
import { authFetch } from './auth';

const DOWN_SECONDS = 6;     // download is read for about this long (or until the file ends)
const UP_TARGET_MS = 2500;  // upload grows until one send takes about this long
const UP_MAX_MB = 32;

export const speedTestState = { result: null };
const listeners = new Set();
const publish = (result) => { speedTestState.result = result; listeners.forEach(fn => fn(result)); };
export const onSpeedTest = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

async function ping(domain) {
    const times = [];
    for (let i = 0; i < 5; i++) {
        const t0 = performance.now();
        const res = await authFetch(`${domain}/api/v1/speed/ping?_=${Date.now()}${i}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`server replied ${res.status}`);
        await res.json();
        times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    return times[Math.floor(times.length / 2)]; // median: one slow reply doesn't skew it
}

async function download(domain, onProgress) {
    const res = await authFetch(`${domain}/api/v1/speed/down?mb=200&_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok || !res.body) throw new Error(`download failed (${res.status})`);
    const reader = res.body.getReader();
    const t0 = performance.now();
    let bytes = 0;
    // The first ~0.5 s (connection ramp-up) isn't counted, so the figure is the steady speed.
    let rampBytes = 0, rampT = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        const elapsed = (performance.now() - t0) / 1000;
        if (!rampT && elapsed >= 0.5) { rampT = elapsed; rampBytes = bytes; }
        if (rampT && elapsed > rampT) onProgress?.(((bytes - rampBytes) * 8) / (elapsed - rampT) / 1e6);
        if (elapsed >= DOWN_SECONDS) { reader.cancel().catch(() => {}); break; }
    }
    const secs = (performance.now() - t0) / 1000;
    const usable = rampT && secs - rampT > 0.5;
    return usable ? ((bytes - rampBytes) * 8) / (secs - rampT) / 1e6 : (bytes * 8) / secs / 1e6;
}

async function upload(domain, onProgress) {
    let mb = 1;
    let mbps = 0;
    for (;;) {
        const data = new Uint8Array(mb * 1024 * 1024);
        crypto.getRandomValues(data.subarray(0, 65536)); // a random start defeats any compression
        for (let i = 65536; i < data.length; i += 65536) data.copyWithin(i, 0, Math.min(65536, data.length - i));
        const t0 = performance.now();
        const res = await authFetch(`${domain}/api/v1/speed/up?_=${Date.now()}`, {
            method: 'POST', body: data, headers: { 'Content-Type': 'application/octet-stream' }, cache: 'no-store',
        });
        if (!res.ok) throw new Error(`upload failed (${res.status})`);
        await res.json();
        const ms = performance.now() - t0;
        mbps = (data.length * 8) / (ms / 1000) / 1e6;
        onProgress?.(mbps);
        if (ms >= UP_TARGET_MS || mb >= UP_MAX_MB) return mbps;
        mb = Math.min(UP_MAX_MB, mb * 4);
    }
}

// Runs the whole test. onUpdate({ state, phase, latencyMs, downMbps, upMbps }) is called as it
// goes. Resolves with the final result (state 'done' or 'error').
export async function runSpeedTest(domain, onUpdate) {
    let r = { state: 'running', phase: 'ping', latencyMs: null, downMbps: null, upMbps: null, at: Date.now() };
    const update = (patch) => { r = { ...r, ...patch }; publish(r); onUpdate?.(r); };
    update({});
    try {
        if (!domain) throw new Error('no server set');
        update({ latencyMs: Math.round(await ping(domain)), phase: 'download' });
        const down = await download(domain, v => update({ downMbps: Math.round(v * 10) / 10 }));
        update({ downMbps: Math.round(down * 10) / 10, phase: 'upload' });
        const up = await upload(domain, v => update({ upMbps: Math.round(v * 10) / 10 }));
        update({ upMbps: Math.round(up * 10) / 10, state: 'done', phase: null, at: Date.now() });
    } catch (err) {
        update({ state: 'error', phase: null, error: String(err.message || err).slice(0, 120), at: Date.now() });
    }
    return r;
}

// What the measured download speed is good for, as a streaming mode to pick (see
// common/streamMode.js — HLS qualities and their bitrates). Direct needs headroom over the
// file's own bitrate: ~2–5 Mbps for a typical 720p/1080p film here, 10+ for big 1080p/4K files.
export function speedAdvice(downMbps) {
    if (downMbps == null) return null;
    if (downMbps >= 25) return { mode: 'direct', text: 'Fast enough for Direct, even large 1080p files.' };
    if (downMbps >= 10) return { mode: 'direct', text: 'Direct works for most films; HLS 1080p for very large files.' };
    if (downMbps >= 7) return { mode: 'hls-1080', text: 'Use HLS 1080p (Direct may stall on bigger files).' };
    if (downMbps >= 4) return { mode: 'hls-720', text: 'Use HLS 720p for smooth playback.' };
    if (downMbps >= 2.5) return { mode: 'hls-540', text: 'Use HLS 540p for smooth playback.' };
    if (downMbps >= 1.5) return { mode: 'hls-480', text: 'Use HLS 480p; higher qualities will buffer.' };
    return { mode: 'hls-360', text: 'Slow connection: use HLS 360p.' };
}
