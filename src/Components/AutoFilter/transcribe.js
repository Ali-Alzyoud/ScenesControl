// Client side of the subtitle generator (RemoteConnection utils/transcribe.js): transcribes a
// video's speech into "<video>.<lang>.srt" on the server.
import { authFetch } from '../../common/auth';
import { useJobList } from './autoFilter';

export const TRANSCRIBE_EVENT = 'sc:transcribe-started';

// Starts transcribing one video (path under the library). ifExists: 'ask' (confirm before
// replacing subtitles generated earlier) or 'skip'. Returns the job, or null if not started.
export async function startTranscribe(domain, video, { ifExists = 'ask', language = '' } = {}) {
    const post = (replace) => authFetch(`${domain}/api/v1/files/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video, language, replace }),
    });
    let res = await post(false);
    if (res.status === 409) {
        if (ifExists !== 'ask' || !window.confirm(`"${video.split('/').pop()}" already has generated subtitles.\n\nGenerate them again? (The current ones are kept as a backup.)`)) return null;
        res = await post(true);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
    window.dispatchEvent(new Event(TRANSCRIBE_EVENT));
    return data;
}

export const cancelTranscribe = (domain, id) => authFetch(`${domain}/api/v1/files/transcribe/${id}`, { method: 'DELETE' });

export const useTranscribeJobs = (domain, options) => useJobList(domain, 'transcribe', TRANSCRIBE_EVENT, options);

export const TRANSCRIBE_STAGE_LABELS = {
    queued: 'Waiting for the GPU',
    preparing: 'Loading the speech model',
    transcribing: 'Transcribing speech',
    writing: 'Saving the subtitles',
    translating: 'Translating to Arabic',
};
