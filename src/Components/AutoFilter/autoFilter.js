// Client side of the AI filter generator (RemoteConnection utils/autofilter.js).
import { useEffect, useRef, useState } from 'react';
import { authFetch } from '../../common/auth';

const POLL_MS = 2000;
export const AUTOFILTER_EVENT = 'sc:autofilter-started';

// Starts generating the filter for one video (path under the library, e.g. "movies/X/X.mp4").
// ifExists: 'ask' (confirm before replacing an existing filter) or 'skip'. Returns the job, or
// null if not started.
export async function startAutoFilter(domain, video, { ifExists = 'ask' } = {}) {
    const post = (replace) => authFetch(`${domain}/api/v1/files/autofilter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video, replace }),
    });
    let res = await post(false);
    if (res.status === 409) {
        if (ifExists !== 'ask' || !window.confirm(`"${video.split('/').pop()}" already has a filter file.\n\nReplace it with an AI-generated one? (The current one is kept as a backup.)`)) return null;
        res = await post(true);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
    window.dispatchEvent(new Event(AUTOFILTER_EVENT));
    return data;
}

export const cancelAutoFilter = (domain, id) => authFetch(`${domain}/api/v1/files/autofilter/${id}`, { method: 'DELETE' });

// Polls the job list while anything is queued/running (and after a job is started here).
// onFinished(job) is called once for each job that completes while watched.
export function useAutoFilterJobs(domain, { onFinished } = {}) {
    const [jobs, setJobs] = useState([]);
    const seen = useRef(new Map()); // id -> last status
    const finishedRef = useRef(onFinished);
    finishedRef.current = onFinished;

    useEffect(() => {
        if (!domain) return;
        let timer;
        let stopped = false;
        const poll = async () => {
            clearTimeout(timer);
            try {
                const res = await authFetch(`${domain}/api/v1/files/autofilter`);
                if (res.ok && !stopped) {
                    const list = (await res.json()).jobs || [];
                    for (const j of list) {
                        const before = seen.current.get(j.id);
                        if (before && before !== j.status && j.status === 'done') finishedRef.current?.(j);
                        seen.current.set(j.id, j.status);
                    }
                    setJobs(list);
                    if (list.some(j => j.status === 'queued' || j.status === 'running')) timer = setTimeout(poll, POLL_MS);
                }
            } catch {
                if (!stopped) timer = setTimeout(poll, POLL_MS * 3);
            }
        };
        poll();
        window.addEventListener(AUTOFILTER_EVENT, poll);
        return () => { stopped = true; clearTimeout(timer); window.removeEventListener(AUTOFILTER_EVENT, poll); };
    }, [domain]);

    return jobs;
}

export const STAGE_LABELS = {
    queued: 'Waiting for its turn',
    preparing: 'Preparing',
    scanning: 'Scanning for nudity & sex scenes',
    writing: 'Saving the filter',
};

export const isActive = (j) => j.status === 'queued' || j.status === 'running';
