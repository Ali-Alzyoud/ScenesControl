// Records a short spoken request from the microphone, for the AI (which understands speech
// directly — any language, no separate speech-to-text). Tap to start, tap again to stop; stops by
// itself after MAX_MS.
const MAX_MS = 12_000;

export const voiceSupported = () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

// Starts recording. Returns { stop(): Promise<{ data: base64, mimeType }> , done: same promise }.
export async function startRecording({ onAutoStop } = {}) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported?.(t)) || '';
    const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise((resolve, reject) => {
        recorder.onstop = async () => {
            stream.getTracks().forEach(t => t.stop());
            const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
            if (blob.size < 1000) { reject(new Error('Nothing was recorded')); return; }
            const buf = new Uint8Array(await blob.arrayBuffer());
            let bin = '';
            for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
            resolve({ data: btoa(bin), mimeType: blob.type });
        };
        recorder.onerror = (e) => reject(e.error || new Error('Recording failed'));
    });
    recorder.start();
    const timer = setTimeout(() => { if (recorder.state === 'recording') { recorder.stop(); onAutoStop?.(); } }, MAX_MS);
    return {
        stop: () => { clearTimeout(timer); if (recorder.state === 'recording') recorder.stop(); return done; },
        done,
    };
}

// A readable message for why recording couldn't start.
export const micErrorMessage = (err) => (err?.name === 'NotAllowedError'
    ? 'Microphone access was refused — allow it for this site (or the app) and try again'
    : err?.name === 'NotFoundError' ? 'No microphone found' : (err?.message || 'Could not use the microphone'));
