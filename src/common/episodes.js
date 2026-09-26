// A library title ({ folder, files }, as the Store and the AI chat get them) as an ordered list of
// playable episodes, each with the subtitle / scene filter that belongs to it — and the reverse:
// finding the title a playing video belongs to, so Next/Previous work however it was opened.
import { authFetch, getToken } from './auth';

const withToken = (url) => {
    const token = getToken();
    return url && token ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : url;
};
const fileUrl = (domain, kind, folder, name) => withToken(`${domain}/${kind}/${folder}/${name}`);
const baseName = (name) => name.split('/').pop().replace(/\.[^.]+$/, '');

export function playablesOf(domain, item) {
    const videos = item.files.filter(f => f.type === 'MEDIA').sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const srts = item.files.filter(f => f.type === 'SRT');
    const filters = item.files.filter(f => f.type === 'FILTER');
    return videos.map(v => {
        // Filters are named "<video file>.txt"; subtitles start with the video's base name
        // (falling back to the folder's only subtitle for a single film).
        const filter = filters.find(f => f.name === `${v.name}.txt`) || (videos.length === 1 ? filters[0] : null);
        const srt = srts.find(f => baseName(f.name).startsWith(baseName(v.name))) || (videos.length === 1 ? srts[0] : null);
        return {
            name: baseName(v.name),
            video: fileUrl(domain, 'video', item.folder, v.name),
            srt: srt ? fileUrl(domain, 'static', item.folder, srt.name) : undefined,
            filter: filter ? fileUrl(domain, 'static', item.folder, filter.name) : undefined,
        };
    });
}

// A server media URL reduced to its decoded library path ("series/Show/S01/E01.mkv"), for
// comparing URLs that differ only in token or encoding. '' if it isn't one of the server's.
export function libraryPath(url, domain = localStorage.getItem('domain')) {
    if (!url || !domain) return '';
    const m = /^(?:[a-z]+:\/\/[^/]+)?\/(?:video|static)\/(.*)$/i.exec(url.split('?')[0].replace(domain, ''));
    if (!m) return '';
    try { return decodeURIComponent(m[1]); } catch { return m[1]; }
}

// The library title a playing video belongs to. Episodes can sit in subfolders of their title
// ("series/Show/Season 1/E01.mkv" belongs to "series/Show"), so each parent folder is tried.
export async function findTitleForVideo(videoUrl) {
    const domain = localStorage.getItem('domain');
    const rel = libraryPath(videoUrl, domain);
    if (!rel || !getToken()) return null;
    const parts = rel.split('/').slice(0, -1);
    for (let n = parts.length; n >= 1; n--) {
        const q = parts.slice(0, n).join('/');
        try {
            const res = await authFetch(`${domain}/api/v1/files/search?q=${encodeURIComponent(q)}&limit=100`);
            if (!res.ok) continue;
            const { items = [] } = await res.json();
            const match = items
                .filter(i => rel.startsWith(`${i.folder}/`))
                .sort((a, b) => b.folder.length - a.folder.length)[0];
            if (match) return match;
        } catch {}
    }
    return null;
}

// Swaps whatever (possibly expired) token a saved URL carries for this device's current one.
export function retoken(url) {
    const token = getToken();
    if (!url || !token) return url;
    try {
        const u = new URL(url);
        if (!u.searchParams.has('token')) return url;
        u.searchParams.set('token', token);
        return u.toString();
    } catch { return url; }
}
