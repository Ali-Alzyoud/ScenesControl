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

// Season/episode numbers from a file name — subtitles for the same episode are named every which
// way ("S01E01", "S1 E2", "1x03", "Season 01 Episode 03", "Ep4"), so names alone can't pair them.
// season is null when the name only carries an episode number.
export function episodeNumber(name) {
    const n = name.split('/').pop();
    const m = /s(\d{1,2})[\s._-]*e(\d{1,3})/i.exec(n)
        || /season[\s._-]*(\d{1,2}).*?episode[\s._-]*(\d{1,3})/i.exec(n)
        || /\b(\d{1,2})x(\d{1,3})\b/i.exec(n);
    if (m) return { season: +m[1], episode: +m[2] };
    const e = /\b(?:ep|episode)[\s._-]*(\d{1,3})\b/i.exec(n);
    return e ? { season: null, episode: +e[1] } : null;
}

// For each video (in the given order), the subtitle and filter that belong to it. Filters are named
// "<video file>.txt"; a subtitle is matched by the video's base name, then by season/episode number.
// A folder's only subtitle/filter goes to its only video. Pairing by list position instead handed
// episodes someone else's subtitle (or none) whenever a season had fewer subtitles than episodes.
// The subtitle (of `srts`, each { name }) that belongs to the video named `videoName`: same base
// name first, then same season/episode number. null if none clearly does.
export function matchSubtitle(videoName, srts) {
    const base = baseName(videoName);
    let hit = srts.find(s => baseName(s.name) === base) || srts.find(s => baseName(s.name).startsWith(base));
    const ve = !hit && episodeNumber(videoName);
    if (ve) {
        hit = srts.find(s => { const se = episodeNumber(s.name); return se && se.season !== null && se.season === ve.season && se.episode === ve.episode; })
            || srts.find(s => { const se = episodeNumber(s.name); return se && se.season === null && se.episode === ve.episode; });
    }
    return hit || null;
}

// True when a subtitle's name says it's for a different episode than the video's — e.g. a stale
// pairing saved in watch history or an old episode list.
export function isOtherEpisodeSubtitle(videoName, srtName) {
    const ve = episodeNumber(videoName), se = episodeNumber(srtName);
    if (!ve || !se) return false;
    return se.episode !== ve.episode || (se.season !== null && se.season !== ve.season);
}

export function pairEpisodeFiles(videos, srts, filters) {
    const used = new Set();
    const pickSrt = (v) => {
        let hit = matchSubtitle(v.name, srts.filter(s => !used.has(s)));
        if (!hit && videos.length === 1) hit = srts[0];
        if (hit) used.add(hit);
        return hit || null;
    };
    return videos.map(v => ({
        video: v,
        srt: pickSrt(v),
        filter: filters.find(f => f.name === `${v.name}.txt`) || (videos.length === 1 ? filters[0] || null : null),
    }));
}

export function playablesOf(domain, item) {
    const videos = item.files.filter(f => f.type === 'MEDIA').sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const srts = item.files.filter(f => f.type === 'SRT');
    const filters = item.files.filter(f => f.type === 'FILTER');
    return pairEpisodeFiles(videos, srts, filters).map(({ video: v, srt, filter }) => {
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
