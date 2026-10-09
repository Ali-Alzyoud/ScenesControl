// Opening a library title's IMDb page (or its Parents Guide) — from the Store cards and next to the
// playing video's name. The IMDb title is looked up by the server (cached).
import { authFetch } from './auth';

const cache = new Map(); // "folder|file" -> Promise<info | null>

export function imdbInfo(folder, file) {
    const key = `${folder}|${file || ''}`;
    if (!cache.has(key)) {
        const domain = localStorage.getItem('domain');
        cache.set(key, authFetch(`${domain}/api/v1/files/imdb?folder=${encodeURIComponent(folder)}&file=${encodeURIComponent(file || '')}`)
            .then(r => (r.ok ? r.json() : null))
            .catch(() => { cache.delete(key); return null; }));
    }
    return cache.get(key);
}

// IMDb rating for a card: { id, rating, votes } or null. Every card on a page asks at once, so the
// requests are collected for a moment and sent to the server as one batch.
const ratings = new Map(); // folder -> Promise<rating | null>
let pending = [];          // [{ folder, file, resolve }]
let flushTimer = null;

const flushRatings = () => {
    flushTimer = null;
    const batch = pending;
    pending = [];
    const domain = localStorage.getItem('domain');
    for (let i = 0; i < batch.length; i += 100) {
        const chunk = batch.slice(i, i + 100);
        authFetch(`${domain}/api/v1/files/ratings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titles: chunk.map(({ folder, file }) => ({ folder, file })) }),
        })
            .then(r => (r.ok ? r.json() : null))
            .catch(() => null)
            .then(data => chunk.forEach(({ folder, resolve }) => {
                // No answer for this one (request failed) — forget it so a later render retries.
                if (!data?.ratings || !(folder in data.ratings)) ratings.delete(folder);
                resolve(data?.ratings?.[folder] ?? null);
            }));
    }
};

export function imdbRating(folder, file) {
    if (!ratings.has(folder)) {
        ratings.set(folder, new Promise(resolve => {
            pending.push({ folder, file: file || '', resolve });
            if (!flushTimer) flushTimer = setTimeout(flushRatings, 50);
        }));
    }
    return ratings.get(folder);
}

// Opens a link outside this app: in the Android app, the phone's browser (or IMDb app); in a
// browser, a new tab. The tab is opened right away (inside the click, so it isn't blocked as a
// pop-up) and pointed at the page once known.
export async function openImdb(folder, file, { page = 'title' } = {}) {
    const inApp = !!window.flutter_inappwebview?.callHandler;
    const tab = inApp ? null : window.open('about:blank', '_blank');
    const info = await imdbInfo(folder, file);
    if (!info) {
        tab?.close();
        window.alert('This title wasn\'t found on IMDb.');
        return;
    }
    const url = page === 'parents' ? info.parentsGuideUrl : info.url;
    if (inApp) window.flutter_inappwebview.callHandler('openExternal', url);
    else if (tab) tab.location.href = url;
    else window.location.assign(url);
}
