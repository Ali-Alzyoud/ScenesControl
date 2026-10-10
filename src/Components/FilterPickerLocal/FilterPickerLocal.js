import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { MdHistory } from 'react-icons/md'
import { MdFilterAlt, MdClose, MdSync, MdArrowUpward, MdArrowDownward, MdShuffle, MdFileDownload, MdPlaylistAdd, MdAdd, MdRemove, MdVisibility, MdVisibilityOff, MdSubtitles } from 'react-icons/md'
import FileRecord from './FileRecordLocal'
import { createPortal } from 'react-dom'
import AIChat from '../AIChat/AIChat'
import AutoFilterJobs from '../AutoFilter/AutoFilterJobs'
import { openImdb } from '../../common/imdb'
import { titleImage } from '../../common/posters'
import { pairEpisodeFiles } from '../../common/episodes'
import { startAutoFilter, useAutoFilterJobs, isActive as isFilterJobActive } from '../AutoFilter/autoFilter'
import { startTranscribe, useTranscribeJobs } from '../AutoFilter/transcribe'
import { useTranslateJobs } from '../AutoFilter/translateJobs'
import * as API from '../../common/API/API'
import { authFetch, getUser, isController } from '../../common/auth'

import { connect } from "react-redux";
import { setFilterItems, setSubtitle, setModalOpen, setVideoSrc, setVideoName, setDuration, setTime } from '../../redux/actions'

import "./style.css"
import { useAlert } from 'react-alert';
import StorageHelper from '../../Helpers/StorageHelper';
import { FaEye, FaTrash } from 'react-icons/fa';

const withToken = (url) => {
    if (!url) return url;
    const token = localStorage.getItem('rc_auth_token');
    if (!token) return url;
    return url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
};

// The Favourites tab: the user's pinned titles from every folder (served by the backend under
// this name, like a real top-level folder).
const FAVORITES_TAB = '__favorites__';

// How many titles the Random button picks.
const RANDOM_COUNT = 10;

// Recent searches (this device), shown in the dropdown while the search box is empty.
const RECENT_SEARCHES_KEY = 'recentSearches';
const RECENT_SEARCHES_MAX = 5;
const loadRecentSearches = () => {
    try {
        const list = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
        return Array.isArray(list) ? list.filter(s => typeof s === 'string').slice(0, RECENT_SEARCHES_MAX) : [];
    } catch { return []; }
};

const CARD_SIZE_MIN = 80;
const CARD_SIZE_MAX = 320;
const CARD_SIZE_STEP = 20;
const CARD_SIZE_DEFAULT = 180;
const PAGE_SIZE = 60;

function formatSyncDate(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Synced just now';
    if (diffMins < 60) return `Synced ${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Synced ${diffHours}h ago`;
    return `Synced ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export const openContent = ({ video, srt, filter, image }) => {
    StorageHelper.addToWatchHistory({ videoPath: video, srtPath: srt, filterPath: filter, imagePath: image });
    if (filter) localStorage.setItem('currentFilterPath', filter);
    else localStorage.removeItem('currentFilterPath');

    // Broadcast play command to other clients — keepalive so it survives navigation
    const domain = localStorage.getItem('domain');
    const token = localStorage.getItem('rc_auth_token');
    if (domain && token) {
        fetch(`${domain}/api/v1/remote/play`, {
            method: 'POST',
            keepalive: true,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                videoPath: video, srtPath: srt || '', filterPath: filter || '', imagePath: image || '',
                sourceSession: sessionStorage.getItem('__sessionId') || '',
            }),
        }).catch(() => {});
    }

    let str = window.location.origin + '#/'
        + btoa(encodeURIComponent(video)) + '/'
        + btoa(encodeURIComponent(srt ? (srt) : '')) + '/'
        + btoa(encodeURIComponent(filter ? (filter) : ''));
    // Only the #fragment differs from the current URL when something is already open, and a
    // fragment-only href change followed by reload() can race — some WebViews reload the old
    // URL, so the click seemed to do nothing until Clear content removed the old fragment.
    // replaceState makes the new URL current synchronously, then reload() loads exactly that.
    window.history.replaceState({}, '', str);
    window.location.reload();
}

// "1990" -> "90s", "2020" -> "2020s" (this century spelled out, so 2000s isn't "00s").
const decadeLabel = (d) => (Number(d) < 2000 ? `${String(d).slice(2)}s` : `${d}s`);

function FilterPicker({
    close,
    setModalOpen,
    path,
    videoPath,
    apiUrl,
    // When set (Remote Control's "Change Content" picker), selecting content sends it to
    // whatever device is playing for this account instead of opening it on this one — this
    // device may just be a phone being used purely as a remote, with nothing to actually play
    // content on/for locally.
    onRemoteOpen,
}) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedFolder, setSelectedFolder] = useState("");
    // ("year" was a sort option once; it's the decade filter now.)
    const [sortBy, setSortBy] = useState(() => { const v = localStorage.getItem("sortBy"); return v && v !== 'year' ? v : "alphabet"; });
    const [filterText, setFilterText] = useState(localStorage.getItem("filterText") || "");
    const [sortAsc, setSortAsc] = useState(localStorage.getItem("sortAsc") !== "false");
    // Random picks outlive the picker closing (e.g. opening one of them), so they're stored and
    // restored until re-rolled or cleared — every setRandomPicks(null) below drops them for good.
    const [randomPicks, setRandomPicks] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('randomPicks'));
            return Array.isArray(saved) && saved.length ? saved : null;
        } catch { return null; }
    });
    useEffect(() => {
        try {
            if (randomPicks) localStorage.setItem('randomPicks', JSON.stringify(randomPicks));
            else localStorage.removeItem('randomPicks');
        } catch {}
    }, [randomPicks]);
    // Genre bubbles above the cards: the selected tab's IMDb genres ({ [folder]: [{ name, count }] })
    // and the one filtering the list (applied server-side, so it covers the whole tab).
    const [genre, setGenre] = useState(null);
    const genreRef = useRef(null);
    genreRef.current = genre;
    const [genreLists, setGenreLists] = useState({});
    // Same for original language (Japanese, English, …), its own row of bubbles below the genres.
    const [language, setLanguage] = useState(null);
    const languageRef = useRef(null);
    languageRef.current = language;
    const [languageLists, setLanguageLists] = useState({});
    // "Not filtered": only titles still missing a scene filter file (also server-side).
    const [unfilteredOnly, setUnfilteredOnly] = useState(false);
    const unfilteredRef = useRef(false);
    unfilteredRef.current = unfilteredOnly;
    const [unfilteredCounts, setUnfilteredCounts] = useState({});
    // Decade ("1990" = the 90s), from each title's year — also server-side.
    const [decade, setDecade] = useState(null);
    const decadeRef = useRef(null);
    decadeRef.current = decade;
    const [decadeLists, setDecadeLists] = useState({});
    // The genre/language bubble rows only show when this toolbar toggle is on (remembered).
    const [showTagFilters, setShowTagFilters] = useState(() => {
        try { return localStorage.getItem('showTagFilters') === 'true'; } catch { return false; }
    });
    const toggleTagFilters = () => {
        const next = !showTagFilters;
        setShowTagFilters(next);
        try { localStorage.setItem('showTagFilters', String(next)); } catch {}
        // Hidden filters shouldn't keep narrowing the list out of sight.
        if (!next) { setGenre(null); setLanguage(null); setUnfilteredOnly(false); setDecade(null); }
    };
    // Whether to hide items already picked up by the yt-dlp download history/job matching below.
    // That matching is a folder+filename string match against download records — if a download's
    // recorded destination ever drifts from where the file actually landed (renamed, re-organized,
    // a stale/mismatched history entry), it silently and permanently hides real content with no
    // way to tell why short of clearing all download history. This toggle is the non-destructive
    // way out: it doesn't touch any history data, it just stops applying the filter.
    const [hideDownloaded, setHideDownloaded] = useState(true);
    const [favorites, setFavorites] = useState([]); // server-only — see fetch effect below
    const [episodePanel, setEpisodePanel] = useState(null); // { title, image, videos, srts, filters }
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionIndex, setSuggestionIndex] = useState(-1);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const folderListRef = useRef(null);
    const activeFolderRef = useRef(null);
    const searchRef = useRef(null);
    const [focusedEpIndex, setFocusedEpIndex] = useState(0);
    // Paginated per-tab loading — see fetchTabs/fetchTabPage below. Replaces the old model of
    // fetching the entire library (~600 folders / ~7000 files) into `folders` state up front.
    const [tabs, setTabs] = useState([]); // [{ name, count }] — the library's top-level folders
    // What the tab picker shows: Favourites first, then the folders.
    const allTabs = useMemo(() => [{ name: FAVORITES_TAB, count: favorites.length }, ...tabs], [tabs, favorites.length]);
    const [tabItems, setTabItems] = useState({}); // { [tabName]: { items, offset, total, hasMore, loading } }
    const [searchResults, setSearchResults] = useState({ items: [], offset: 0, total: 0, hasMore: false, loading: false });
    const [syncing, setSyncing] = useState(false);
    const [cardSize, setCardSize] = useState(() => {
        const saved = Number(localStorage.getItem('cardSize'));
        return saved >= CARD_SIZE_MIN && saved <= CARD_SIZE_MAX ? saved : CARD_SIZE_DEFAULT;
    });
    const [epPanelWidth, setEpPanelWidth] = useState(() => {
        const saved = Number(localStorage.getItem('epPanelWidth'));
        return saved >= 280 && saved <= 900 ? saved : 520;
    });
    const epDragging = useRef(false);
    const epDragStartX = useRef(0);
    const epDragStartWidth = useRef(0);
    const containerRef = useRef();
    // Mirrors `tabItems`, updated synchronously (not via a render/effect cycle) so the scroll-
    // restore sequence below can read the just-fetched offset/count without racing a re-render.
    const tabItemsRef = useRef({});
    const focusedCardRef = useRef(null);
    const focusedEpRef = useRef(null);
    const epListRef = useRef(null);
    const historyPanelRef = useRef(null);
    const alert = useAlert();

    // No longer backed by a localStorage cache timestamp — paginated fetches are cheap enough
    // that the panel always loads fresh on open, so this just tracks the latest fetch in memory.
    const [lastSync, setLastSync] = useState(null);
    const [newFolderName, setNewFolderName] = useState('');
    const [showNewFolder, setShowNewFolder] = useState(null); // null | parentFolderName
    const [renamingTab, setRenamingTab] = useState(null); // null | folderName
    const [renameTabValue, setRenameTabValue] = useState('');
    const [cardDragOver, setCardDragOver] = useState(null); // card folder being dragged over
    const dragItem = useRef(null); // item being dragged
    const modalBodyRef = useRef(null);
    const dndRef = useRef({});
    const isAdmin = getUser()?.role === 'admin';

    const [showDownload, setShowDownload] = useState(null); // null | folderPath string
    const [downloadUrl, setDownloadUrl] = useState('');
    const [batchMode, setBatchMode] = useState(false);
    const [dlJobs, setDlJobs] = useState({}); // { [clientId]: job }
    const dlEsRefs = useRef({});              // { [clientId]: EventSource }
    const dlRetryCounts = useRef({});         // { [clientId]: number }
    const MAX_DL_RETRIES = 3;

    // This component fully unmounts when the Store panel closes (see Menu.js). Without this,
    // every open EventSource here leaks — and since syncActiveJobs re-subscribes to any still-
    // running job on every mount, reopening the panel during a download piles up one more leaked
    // connection each time, which is what made the page grind to a halt.
    useEffect(() => {
        return () => {
            Object.values(dlEsRefs.current).forEach(es => es?.close());
            dlEsRefs.current = {};
        };
    }, []);

    const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
    const [moving, setMoving] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    // The card whose AI button was pressed: the AI chat opens about that title.
    const [aiItem, setAiItem] = useState(null);
    const [dlHistory, setDlHistory] = useState([]);

    // Subtitle search
    const [showSubtitleSearch, setShowSubtitleSearch] = useState(null); // null | { folderPath, videoName }
    const [subtitleQuery, setSubtitleQuery] = useState('');
    const [subtitleResults, setSubtitleResults] = useState([]);
    const [subtitleSearching, setSubtitleSearching] = useState(false);
    const [subtitleError, setSubtitleError] = useState('');
    const [subtitleDownloadingId, setSubtitleDownloadingId] = useState(null);
    const [subtitleIncludeEnglish, setSubtitleIncludeEnglish] = useState(false);

    // Native drag-and-drop event delegation on the modal body
    useEffect(() => {
        if (!isAdmin) return;
        const el = modalBodyRef.current;
        if (!el) return;

        const onDragOver = e => {
            e.preventDefault();
            const { dragItem, setCardDragOver } = dndRef.current;
            const card = e.target.closest('[data-cardfolder]');
            setCardDragOver(card && card.dataset.cardfolder !== dragItem.current ? card.dataset.cardfolder : null);
        };

        const onDrop = e => {
            e.preventDefault();
            const { moveFolder, dragItem, setCardDragOver } = dndRef.current;
            const from = dragItem.current;
            setCardDragOver(null);
            dragItem.current = null;
            if (!from) return;
            const card = e.target.closest('[data-cardfolder]');
            if (card && card.dataset.cardfolder !== from) {
                moveFolder(from, card.dataset.cardfolder);
            }
        };

        const onDragStart = e => {
            const card = e.target.closest('[data-cardfolder]');
            if (!card) { e.preventDefault(); return; }
            const folder = card.dataset.cardfolder;
            e.dataTransfer.setData('text/plain', folder);
            e.dataTransfer.effectAllowed = 'move';
            dndRef.current.dragItem.current = folder;
        };

        const onDragEnd = () => {
            const { setCardDragOver, dragItem } = dndRef.current;
            dragItem.current = null;
            setCardDragOver(null);
        };

        el.addEventListener('dragstart', onDragStart);
        el.addEventListener('dragover', onDragOver, { passive: false });
        el.addEventListener('drop', onDrop);
        el.addEventListener('dragend', onDragEnd);
        return () => {
            el.removeEventListener('dragover', onDragOver);
            el.removeEventListener('drop', onDrop);
            el.removeEventListener('dragend', onDragEnd);
        };
    }, [isAdmin]);

    // Folder favorites are server-only — always fetch fresh on open, never read/write localStorage.
    useEffect(() => {
        const domain = localStorage.getItem('domain');
        if (!domain) return;
        authFetch(`${domain}/api/v1/userdata/folder-favorites`)
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data?.folderFavorites) setFavorites(data.folderFavorites); })
            .catch(() => {});
    }, []);

    // Subscribes to a job's SSE progress stream and keeps its dlJobs entry updated.
    // Shared by startDownload (jobs this session created) and syncActiveJobs (jobs discovered
    // from the server that were already running/queued before this page loaded).
    const attachToJob = (clientId, jobId, url, folderPath) => {
        const domain = localStorage.getItem('domain');
        const token = localStorage.getItem('rc_auth_token');
        const es = new EventSource(`${domain}/api/v1/files/ytdlp/${jobId}/events?token=${token}`);
        dlEsRefs.current[clientId] = es;

        es.onmessage = ev => {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'done') {
                es.close();
                delete dlEsRefs.current[clientId];
                const hasError = msg.code !== 0;
                const cur = dlRetryCounts.current[clientId] || 0;
                if (hasError && cur < MAX_DL_RETRIES) {
                    dlRetryCounts.current[clientId] = cur + 1;
                    setDlJobs(prev => prev[clientId] ? { ...prev, [clientId]: { ...prev[clientId], statusLine: `Failed — retrying ${cur + 1}/${MAX_DL_RETRIES}…`, percent: 0 } } : prev);
                    setTimeout(() => startDownload({ url, folderPath, clientId }), 3000);
                } else {
                    delete dlRetryCounts.current[clientId];
                    setDlJobs(prev => prev[clientId] ? { ...prev, [clientId]: { ...prev[clientId], done: true, error: hasError, percent: hasError ? prev[clientId].percent : 100, statusLine: hasError ? 'Failed after retries' : 'Complete' } } : prev);
                    if (!hasError) { resync(); fetchDlHistory(); }
                }
            } else {
                const text = msg.text || '';
                const prog = text.match(/\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\S]+)\s+at\s+([\S]+)\s+ETA\s+(\S+)/);
                if (prog) {
                    setDlJobs(prev => prev[clientId] ? { ...prev, [clientId]: { ...prev[clientId], percent: parseFloat(prog[1]), speed: prog[3], eta: prog[4], statusLine: `${prog[1]}% of ${prog[2]} · ${prog[3]} · ETA ${prog[4]}` } } : prev);
                } else {
                    const dest = text.match(/\[download\] Destination:\s+(.+)/);
                    if (dest) {
                        setDlJobs(prev => prev[clientId] ? { ...prev, [clientId]: { ...prev[clientId], filename: dest[1].trim().split('/').pop() } } : prev);
                    } else if (text.trim()) {
                        setDlJobs(prev => prev[clientId] ? { ...prev, [clientId]: { ...prev[clientId], statusLine: text.trim().slice(0, 120) } } : prev);
                    }
                }
            }
        };

        es.onerror = () => {
            setDlJobs(prev => {
                if (!prev[clientId] || prev[clientId]?.done) return prev;
                return { ...prev, [clientId]: { ...prev[clientId], statusLine: 'Reconnecting…' } };
            });
        };
    };

    // Pick up downloads that are already running/queued on the server — started from another
    // tab/device, or still going from before this page loaded — not just ones this session started.
    const syncActiveJobs = useCallback(async () => {
        if (!isAdmin) return;
        const domain = localStorage.getItem('domain');
        if (!domain) return;
        try {
            const res = await authFetch(`${domain}/api/v1/files/ytdlp/jobs`);
            if (!res.ok) return;
            const { jobs } = await res.json();
            setDlJobs(prev => {
                const knownJobIds = new Set(Object.values(prev).map(j => j.jobId).filter(Boolean));
                const additions = {};
                jobs.forEach(job => {
                    if (knownJobIds.has(job.jobId)) return;
                    additions[job.jobId] = {
                        clientId: job.jobId, jobId: job.jobId,
                        url: job.url, folderPath: job.folderPath, overwrite: job.overwrite,
                        folderLabel: job.folderPath?.split('/').pop() || '',
                        percent: job.percent, speed: job.speed, eta: job.eta, filename: job.filename,
                        statusLine: job.status === 'queued' ? `Queued${job.queuePosition ? ` (#${job.queuePosition})` : ''}` : job.statusLine,
                        done: false, error: false, errorMsg: '',
                    };
                });
                return Object.keys(additions).length ? { ...prev, ...additions } : prev;
            });
            jobs.forEach(job => {
                if (!dlEsRefs.current[job.jobId]) attachToJob(job.jobId, job.jobId, job.url, job.folderPath);
            });
        } catch {}
    }, [isAdmin]);

    useEffect(() => { syncActiveJobs(); }, [syncActiveJobs]);

    const retryHistoryDownload = (entry) => {
        setShowHistory(false);
        startDownload({ url: entry.url, folderPath: entry.folderPath, overwrite: true });
    };

    const startDownload = async ({ url: urlArg, folderPath: folderPathArg, clientId: existingClientId, overwrite: overwriteArg } = {}) => {
        // Panel submit with no explicit args: split multi-line input into separate jobs.
        // The server queues actual yt-dlp processes and runs at most 2 at a time.
        if (urlArg === undefined && folderPathArg === undefined && !existingClientId) {
            const lines = downloadUrl.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length > 1) {
                const folderPath = showDownload;
                setDownloadUrl('');
                setShowDownload(null);
                setBatchMode(false);
                lines.forEach(u => startDownload({ url: u, folderPath }));
                return;
            }
        }
        const url = (urlArg !== undefined ? urlArg : downloadUrl).trim();
        const folderPath = folderPathArg !== undefined ? folderPathArg : showDownload;
        const overwrite = !!overwriteArg;
        if (!url || !folderPath) return;

        const isRetry = !!existingClientId;
        const clientId = existingClientId || genId();
        const folderLabel = folderPath.split('/').pop();
        const domain = localStorage.getItem('domain');

        if (!isRetry) {
            dlRetryCounts.current[clientId] = 0;
            setDownloadUrl('');
            setShowDownload(null);
        } else {
            dlEsRefs.current[clientId]?.close();
            delete dlEsRefs.current[clientId];
        }

        const retryCount = dlRetryCounts.current[clientId] || 0;
        const retryLabel = retryCount > 0 ? ` (retry ${retryCount}/${MAX_DL_RETRIES})` : '';

        setDlJobs(prev => ({
            ...prev,
            [clientId]: {
                ...(prev[clientId] || {}),
                clientId, url, folderPath, folderLabel, overwrite,
                percent: 0, speed: '', eta: '',
                filename: prev[clientId]?.filename || '',
                statusLine: `Starting…${retryLabel}`,
                done: false, error: false, errorMsg: '',
            },
        }));

        try {
            const res = await authFetch(`${domain}/api/v1/files/ytdlp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, folderPath, overwrite }),
            });
            if (!res.ok) {
                setDlJobs(prev => prev[clientId] ? { ...prev, [clientId]: { ...prev[clientId], done: true, error: true, errorMsg: 'Failed to start' } } : prev);
                return;
            }
            const { jobId } = await res.json();
            setDlJobs(prev => prev[clientId] ? { ...prev, [clientId]: { ...prev[clientId], jobId } } : prev);
            attachToJob(clientId, jobId, url, folderPath);
        } catch (err) {
            setDlJobs(prev => prev[clientId] ? { ...prev, [clientId]: { ...prev[clientId], done: true, error: true, errorMsg: String(err) } } : prev);
        }
    };

    const removeJob = (clientId) => {
        dlEsRefs.current[clientId]?.close();
        delete dlEsRefs.current[clientId];
        delete dlRetryCounts.current[clientId];
        setDlJobs(prev => { const n = { ...prev }; delete n[clientId]; return n; });
    };

    const retryJob = (job) => {
        removeJob(job.clientId);
        startDownload({ url: job.url, folderPath: job.folderPath, overwrite: job.overwrite });
    };

    const closeDownload = () => {
        setShowDownload(null);
        setDownloadUrl('');
        setBatchMode(false);
    };

    const fetchDlHistory = useCallback(async () => {
        const domain = localStorage.getItem('domain');
        if (!domain) return;
        try {
            const res = await authFetch(`${domain}/api/v1/files/dlhistory`);
            if (res.ok) setDlHistory(await res.json());
        } catch {}
    }, []);

    // Loaded up front (not just when the Downloads panel opens) so downloaded content can be
    // filtered out of the main browse grid as soon as the listing renders.
    useEffect(() => { fetchDlHistory(); }, [fetchDlHistory]);

    const openHistory = async () => {
        await fetchDlHistory();
        syncActiveJobs();
        setShowHistory(true);
    };

    const VIDEO_EXTS = new Set(['mp4', 'mkv', 'avi', 'mov', 'webm', 'm4v', 'wmv', 'flv', 'ts', 'mpg', 'mpeg']);
    const isVideoFilename = (name) => VIDEO_EXTS.has((name || '').split('.').pop()?.toLowerCase());

    // Routes every "open this content" action through Remote Control's cast callback when one
    // was passed in, instead of opening (and navigating this device to) the content directly.
    // A phone signed in as a remote casts from the plain Store too — it's there to control the
    // screen, not to start playing things itself.
    const castToScreen = async ({ video, srt, filter, image }) => {
        const domain = localStorage.getItem('domain');
        try {
            const res = await authFetch(`${domain}/api/v1/remote/play`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoPath: video, srtPath: srt || '', filterPath: filter || '', imagePath: image || '', sourceSession: sessionStorage.getItem('__sessionId') || '' }),
            });
            if (res.ok) { alert.success('Sent to the other screen'); close(); }
            else alert.error(`Failed to send (${res.status})`);
        } catch (e) {
            alert.error(`Can't reach server (${e?.message || 'network error'})`);
        }
    };
    const openOrCast = (args) => {
        if (onRemoteOpen) onRemoteOpen(args);
        else if (isController()) castToScreen(args);
        else openContent(args);
    };

    const playDownload = (entry) => {
        if (!entry.filename) return;
        const video = withToken(`${videoPath}/${entry.folderPath}/${entry.filename}`);
        StorageHelper.saveToCurrentList({ videos: [video], srts: [undefined], filters: [undefined], index: 0 });
        openOrCast({ video });
    };

    const clearHistory = async () => {
        if (!window.confirm('Clear all download history?')) return;
        const domain = localStorage.getItem('domain');
        await authFetch(`${domain}/api/v1/files/dlhistory`, { method: 'DELETE' }).catch(() => {});
        setDlHistory([]);
    };

    const cleanTitleGuess = (name) => {
        if (!name) return '';
        let base = name.replace(/\.[^/.]+$/, '');
        base = base.replace(/[._]/g, ' ');
        base = base.replace(/[[(].*?[\])]/g, ' ');
        const yearMatch = base.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) base = base.slice(0, yearMatch.index + yearMatch[0].length);
        return base.replace(/\s{2,}/g, ' ').trim();
    };

    const openSubtitleSearch = (folderPath, videoName) => {
        setShowSubtitleSearch({ folderPath, videoName });
        setSubtitleQuery(cleanTitleGuess(videoName) || folderPath.split('/').pop());
        setSubtitleResults([]);
        setSubtitleError('');
    };

    const closeSubtitleSearch = () => {
        setShowSubtitleSearch(null);
        setSubtitleQuery('');
        setSubtitleResults([]);
        setSubtitleError('');
    };

    const searchSubtitles = async () => {
        if (!subtitleQuery.trim()) return;
        setSubtitleSearching(true);
        setSubtitleError('');
        setSubtitleResults([]);
        const domain = localStorage.getItem('domain');
        const lang = subtitleIncludeEnglish ? 'ar,en' : 'ar';
        try {
            const res = await authFetch(`${domain}/api/v1/subtitles/search?query=${encodeURIComponent(subtitleQuery.trim())}&lang=${lang}`);
            const data = await res.json();
            if (!res.ok) { setSubtitleError(data.error || 'Search failed'); return; }
            setSubtitleResults(data.results || []);
            if (!data.results?.length) setSubtitleError('No subtitles found');
        } catch {
            setSubtitleError('Could not reach server');
        } finally {
            setSubtitleSearching(false);
        }
    };

    const downloadSubtitle = async (result) => {
        if (!showSubtitleSearch) return;
        setSubtitleDownloadingId(result.fileId);
        setSubtitleError('');
        const domain = localStorage.getItem('domain');
        const baseName = (showSubtitleSearch.videoName || '').replace(/\.[^/.]+$/, '') || 'subtitle';
        try {
            const res = await authFetch(`${domain}/api/v1/subtitles/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId: result.fileId, folderPath: showSubtitleSearch.folderPath, filename: baseName }),
            });
            const data = await res.json();
            if (!res.ok) { setSubtitleError(data.error || 'Download failed'); return; }
            resync();
            closeSubtitleSearch();
        } catch {
            setSubtitleError('Could not reach server');
        } finally {
            setSubtitleDownloadingId(null);
        }
    };

    const moveFolder = async (fromPath, toParent) => {
        const domain = localStorage.getItem('domain');
        setMoving(true);
        try {
            const res = await authFetch(`${domain}/api/v1/files/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromPath, toParent }),
            });
            if (!res.ok) { alert.error('Failed to move'); return; }
            resync();
        } catch { alert.error('Error moving folder'); }
        finally { setMoving(false); }
    };

    // Keep dndRef current so native event handlers always see latest values
    dndRef.current = { moveFolder, dragItem, setCardDragOver };

    const renameTab = async (oldName, newName) => {
        const trimmed = newName.trim();
        setRenamingTab(null);
        setRenameTabValue('');
        if (!trimmed || trimmed === oldName) return;
        const domain = localStorage.getItem('domain');
        try {
            const res = await authFetch(`${domain}/api/v1/files/rename`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPath: oldName, newName: trimmed }),
            });
            if (!res.ok) { alert.error('Failed to rename'); return; }
            resync();
        } catch { alert.error('Error renaming'); }
    };

    const renameFolder = async (item, newName) => {
        const domain = localStorage.getItem('domain');
        try {
            const res = await authFetch(`${domain}/api/v1/files/rename`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPath: item.folder, newName }),
            });
            if (!res.ok) { alert.error('Failed to rename'); return; }
            resync();
        } catch { alert.error('Error renaming folder'); }
    };

    const deleteFolder = async (item) => {
        if (!window.confirm(`Delete "${item.folder.split('/').pop()}"? This cannot be undone.`)) return;
        const domain = localStorage.getItem('domain');
        try {
            const res = await authFetch(`${domain}/api/v1/files/folder`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderPath: item.folder }),
            });
            if (!res.ok) { alert.error('Failed to delete'); return; }
            resync();
        } catch { alert.error('Error deleting folder'); }
    };

    const createFolder = async () => {
        const name = newFolderName.trim();
        const parent = showNewFolder;
        if (!name || !parent) return;

        if (name.startsWith('magnet:')) {
            setNewFolderName('');
            setShowNewFolder(null);
            startDownload({ url: name, folderPath: parent });
            return;
        }

        const domain = localStorage.getItem('domain');
        try {
            const res = await authFetch(`${domain}/api/v1/files/mkdir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderPath: `${parent}/${name}` }),
            });
            if (!res.ok) { alert.error('Failed to create folder'); return; }
            setNewFolderName('');
            setShowNewFolder(null);
            resync();
        } catch { alert.error('Error creating folder'); }
    };

    // Top-level folder names + counts only — cheap, lets the tab bar render without loading
    // everything behind every tab.
    const fetchTabs = async () => {
        try {
            const res = await authFetch(`${apiUrl}/tabs`);
            if (!res.ok) return [];
            const data = await res.json();
            const list = data.tabs || [];
            setTabs(list);
            return list;
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    // One page of one tab. `reset: true` (tab switch, sort change, resync) starts over from
    // offset 0; otherwise appends the next page onto what's already loaded (auto-load-more).
    // Reads/writes tabItemsRef synchronously (in addition to the setTabItems calls that drive
    // rendering) so callers — notably the scroll-restore sequence below — can chain awaited
    // calls back-to-back without reading a stale offset out of a closed-over render snapshot.
    const fetchTabPage = async (folder, { reset = false } = {}) => {
        if (!folder) return;
        const prevEntry = tabItemsRef.current[folder];
        if (!reset && prevEntry?.loading) return prevEntry; // already fetching this tab's next page
        const loadingEntry = {
            items: reset ? [] : (prevEntry?.items || []),
            offset: reset ? 0 : (prevEntry?.offset || 0),
            total: prevEntry?.total || 0,
            hasMore: reset ? true : (prevEntry?.hasMore ?? true),
            loading: true,
        };
        tabItemsRef.current = { ...tabItemsRef.current, [folder]: loadingEntry };
        setTabItems(prev => ({ ...prev, [folder]: loadingEntry }));
        const offset = loadingEntry.offset;
        const requestedGenre = genreRef.current;
        const requestedLanguage = languageRef.current;
        const requestedUnfiltered = unfilteredRef.current;
        const requestedDecade = decadeRef.current;
        try {
            const params = new URLSearchParams({ folder, offset: String(offset), limit: String(PAGE_SIZE), folderSort: sortBy, folderOrder: sortAsc ? 'asc' : 'desc' });
            if (requestedGenre) params.set('genre', requestedGenre);
            if (requestedLanguage) params.set('language', requestedLanguage);
            if (requestedUnfiltered) params.set('unfiltered', '1');
            if (requestedDecade) params.set('decade', requestedDecade);
            const res = await authFetch(`${apiUrl}?${params.toString()}`);
            // The genre/language/not-filtered choice changed while this was in flight — its reset fetch owns the list now.
            if (genreRef.current !== requestedGenre || languageRef.current !== requestedLanguage || unfilteredRef.current !== requestedUnfiltered || decadeRef.current !== requestedDecade) return tabItemsRef.current[folder];
            if (!res.ok) {
                const failedEntry = { ...tabItemsRef.current[folder], loading: false };
                tabItemsRef.current = { ...tabItemsRef.current, [folder]: failedEntry };
                setTabItems(prev => ({ ...prev, [folder]: failedEntry }));
                return failedEntry;
            }
            const data = await res.json();
            const newEntry = {
                items: [...loadingEntry.items, ...(data.items || [])],
                offset: data.offset + (data.items?.length || 0),
                total: data.total,
                hasMore: data.hasMore,
                loading: false,
            };
            tabItemsRef.current = { ...tabItemsRef.current, [folder]: newEntry };
            setTabItems(prev => ({ ...prev, [folder]: newEntry }));
            setLastSync(Date.now());
            return newEntry;
        } catch (e) {
            console.error(e);
            const failedEntry = { ...tabItemsRef.current[folder], loading: false };
            tabItemsRef.current = { ...tabItemsRef.current, [folder]: failedEntry };
            setTabItems(prev => ({ ...prev, [folder]: failedEntry }));
            return failedEntry;
        }
    };

    const loadMoreSearch = async () => {
        if (searchResults.loading || !searchResults.hasMore) return;
        setSearchResults(prev => ({ ...prev, loading: true }));
        try {
            const params = new URLSearchParams({ q: filterText, offset: String(searchResults.offset), limit: String(PAGE_SIZE) });
            const res = await authFetch(`${apiUrl}/search?${params.toString()}`);
            if (!res.ok) { setSearchResults(prev => ({ ...prev, loading: false })); return; }
            const data = await res.json();
            setSearchResults(prev => ({
                items: [...prev.items, ...(data.items || [])],
                offset: data.offset + (data.items?.length || 0),
                total: data.total,
                hasMore: data.hasMore,
                loading: false,
            }));
        } catch {
            setSearchResults(prev => ({ ...prev, loading: false }));
        }
    };

    const isSearching = !!filterText;
    const loadMoreCurrent = () => (isSearching ? loadMoreSearch() : fetchTabPage(selectedFolder));

    // Refreshes the tab list and reloads the current tab from page 1. Used both for the
    // "Resync" button and after any mutation (move/rename/delete/create/download-complete/etc).
    const resync = async () => {
        if (!apiUrl || syncing) return;
        setSyncing(true);
        // Resync refetches tabItems below, but displayItems shows randomPicks over that
        // whenever it's set — leaving it in place would make a correctly-refreshed tab look
        // like nothing happened, since the grid would keep showing the old frozen 5 picks.
        setRandomPicks(null);
        try {
            if (isAdmin) {
                const refreshUrl = apiUrl.replace(/\/+$/, '') + '/refresh';
                await authFetch(refreshUrl, { method: 'POST' }).catch(() => {});
            }
            await fetchTabs();
            if (selectedFolder) {
                fetchGenres(selectedFolder);
                await fetchTabPage(selectedFolder, { reset: true });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        localStorage.setItem("sortBy", sortBy);
    }, [sortBy]);

    useEffect(() => {
        localStorage.setItem("sortAsc", sortAsc);
    }, [sortAsc]);

    useEffect(() => {
        localStorage.setItem("cardSize", cardSize);
    }, [cardSize]);

    const decreaseCardSize = () => setCardSize(s => Math.max(CARD_SIZE_MIN, s - CARD_SIZE_STEP));
    const increaseCardSize = () => setCardSize(s => Math.min(CARD_SIZE_MAX, s + CARD_SIZE_STEP));

    // Always resync on open — a completed download only clears the tab/item state in-place if
    // the browser tab was still open and watching that job's SSE stream when it finished; for a
    // download started earlier and checked on later, that event was missed, so without this the
    // listing (and any newly finished downloads) could look stale indefinitely.
    useEffect(() => {
        resync();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Downloaded (yt-dlp) media files are browsable from the Downloads panel only — keep them
    // out of the regular library grid until an admin moves/renames them into the library proper.
    // Files still mid-download (in dlJobs but not yet in history) are included too, since the
    // partial file already lands on disk and gets scanned into the listing before the job finishes.
    const downloadedFileKeys = useMemo(() => {
        const set = new Set();
        dlHistory.forEach(entry => {
            if (entry.status === 'done' && entry.filename) {
                set.add(`${entry.folderPath}::${entry.filename}`);
            }
        });
        Object.values(dlJobs).forEach(job => {
            if (!job.done && job.folderPath && job.filename) {
                set.add(`${job.folderPath}::${job.filename}`);
            }
        });
        return set;
    }, [dlHistory, dlJobs]);

    // Mirrors filteredItems' downloaded-content filtering below, but as a count only — used by
    // the scroll-restore sequence to know how many raw items need to be loaded to cover a given
    // row, since raw fetched count and actually-displayed count diverge once some items are
    // hidden from the grid.
    const countVisibleItems = (items, keys) => {
        if (!keys.size) return items.length;
        let n = 0;
        for (const item of items) {
            const files = item.files || [];
            const hadMedia = files.some(f => f.type === 'MEDIA');
            if (!hadMedia || files.some(f => !(f.type === 'MEDIA' && keys.has(`${item.folder}::${f.name}`)))) n++;
        }
        return n;
    };

    // Fetch the tab list once on open, then restore whichever tab was last selected.
    useEffect(() => {
        fetchTabs().then(list => {
            // Restored by name; before the Favourites tab existed only an index was saved, and
            // that tab now sits in front of the folders, hence the +1.
            const names = [FAVORITES_TAB, ...list.map(t => t.name)];
            let index = names.indexOf(localStorage.getItem('selectedTab'));
            if (index < 0) index = Math.min((Number(localStorage.getItem('selectedIndex')) || 0) + 1, names.length - 1);
            setSelectedIndex(index);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setSelectedFolder(allTabs[selectedIndex]?.name || "");
    }, [selectedIndex, allTabs]);

    // Pinning/unpinning changes what the Favourites tab holds: reload it if it's showing,
    // otherwise just drop it so it loads fresh when next opened.
    const favoritesKey = favorites.join('\n');
    const prevFavoritesKey = useRef(favoritesKey);
    useEffect(() => {
        if (prevFavoritesKey.current === favoritesKey) return;
        prevFavoritesKey.current = favoritesKey;
        if (selectedFolder === FAVORITES_TAB) fetchTabPage(FAVORITES_TAB, { reset: true });
        else if (tabItemsRef.current[FAVORITES_TAB]) {
            const { [FAVORITES_TAB]: _dropped, ...rest } = tabItemsRef.current;
            tabItemsRef.current = rest;
            setTabItems(rest);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [favoritesKey]);

    // Load a tab's first page the first time it's selected — switching back to an
    // already-loaded tab just shows what's already there.
    useEffect(() => {
        if (!selectedFolder || tabItems[selectedFolder]) return;
        fetchTabPage(selectedFolder, { reset: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFolder]);

    const fetchGenres = async (folder) => {
        if (!folder || folder === FAVORITES_TAB) return;
        try {
            const res = await authFetch(`${apiUrl}/genres?folder=${encodeURIComponent(folder)}`);
            if (!res.ok) return;
            const data = await res.json();
            setGenreLists(prev => ({ ...prev, [folder]: data.genres || [] }));
            setLanguageLists(prev => ({ ...prev, [folder]: data.languages || [] }));
            setUnfilteredCounts(prev => ({ ...prev, [folder]: data.unfiltered || 0 }));
            setDecadeLists(prev => ({ ...prev, [folder]: data.decades || [] }));
        } catch {}
    };

    // A genre/language belongs to one tab: switching tabs drops it.
    useEffect(() => {
        setGenre(null);
        setLanguage(null);
        setUnfilteredOnly(false);
        setDecade(null);
        if (selectedFolder && !genreLists[selectedFolder]) fetchGenres(selectedFolder);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFolder]);

    // Genre or language picked/cleared — reload from page 1 with it. Other tabs' loaded pages were fetched
    // under the old genre, so they're dropped too rather than shown unfiltered/mis-filtered later.
    const isFirstGenre = useRef(true);
    useEffect(() => {
        if (isFirstGenre.current) { isFirstGenre.current = false; return; }
        setRandomPicks(null);
        tabItemsRef.current = {};
        setTabItems({});
        if (selectedFolder) fetchTabPage(selectedFolder, { reset: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [genre, language, unfilteredOnly, decade]);

    // Sort changed — the ordering is applied server-side, so reload the current tab from
    // page 1 rather than trying to re-sort whatever partial set happens to be loaded.
    const isFirstSort = useRef(true);
    useEffect(() => {
        if (isFirstSort.current) { isFirstSort.current = false; return; }
        if (!selectedFolder) return;
        fetchTabPage(selectedFolder, { reset: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortBy, sortAsc]);

    useEffect(() => {
        API.getMediaRecords();
        setModalOpen(true);
        window.history.pushState({ modal: 'store' }, '');
        const handlePopState = () => close();
        window.addEventListener('popstate', handlePopState);
        return () => {
            setModalOpen(false);
            alert.removeAll();
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.tabIndex = 0;
            containerRef.current.focus();
        }
    }, []);

    // Restore scroll position after reopening the Store panel — snapped to a whole grid row
    // rather than an arbitrary pixel offset, so it's exact instead of "close":
    // 1. Wait for the tab's first page (row 0 is now really rendered, not a placeholder).
    // 2. Measure the real row height from it, and compute the target as savedRow * rowHeight.
    // 3. Load enough raw pages to cover that row, accounting for items the downloaded-content
    //    filter hides from what's actually displayed (raw fetched count and displayed count
    //    otherwise diverge — this is what made restoring land short in some tabs and not others).
    // 4. Advance toward the target in viewport-sized steps rather than jumping straight there.
    //    Cards use content-visibility:auto, which only learns a card's real height once it's
    //    been near the viewport — a single jump clamps against placeholder-sized rows still in
    //    between and lands short/long by a bit. Stepping through renders each region for real
    //    along the way, the same as genuine fast scrolling would.
    useEffect(() => {
        const savedFolder = sessionStorage["scrollFolder"];
        const savedRow = parseInt(sessionStorage["scrollRow"] || '-1', 10);
        if (!selectedFolder || savedRow <= 0 || selectedFolder !== savedFolder) return;
        let cancelled = false;

        (async () => {
            for (let g = 0; g < 200 && !cancelled; g++) {
                const cur = tabItemsRef.current[selectedFolder];
                if (cur && !cur.loading) break;
                await new Promise(r => setTimeout(r, 30));
            }
            if (cancelled) return;
            const el = containerRef.current;
            if (!el) return;

            const rowHeight = getVisibleRowHeight();
            if (!rowHeight) return;
            const target = savedRow * rowHeight;
            const neededCount = (savedRow + 2) * getColumns();

            for (let g = 0; g < 200 && !cancelled; g++) {
                const cur = tabItemsRef.current[selectedFolder];
                if (!cur) break;
                if (countVisibleItems(cur.items, downloadedFileKeys) >= neededCount || !cur.hasMore) break;
                await fetchTabPage(selectedFolder);
            }
            if (cancelled) return;

            const step = Math.max(el.clientHeight, 400);
            for (let g = 0; g < 60 && !cancelled && el.scrollTop < target - 1; g++) {
                el.scrollTop = Math.min(target, el.scrollTop + step);
                await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            }
            for (let i = 0; i < 8 && !cancelled; i++) {
                el.scrollTop = target;
                await new Promise(r => requestAnimationFrame(r));
                if (Math.abs(el.scrollTop - target) < 2) break;
            }
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFolder]);

    // Auto-load the next page once the user scrolls near the bottom — the D-pad/keyboard
    // equivalent lives in handleKeyDown below, since scroll position alone doesn't move when
    // navigating by focus.
    const handleScroll = () => {
        const el = containerRef.current;
        if (!el) return;
        // Saved as a row index (rounded from the measured real row height), not a raw pixel
        // offset, so restoring always snaps to a whole row instead of landing a bit off. Folder
        // is saved alongside it so a reopen only tries to restore against the same tab. Search
        // results paginate differently, so skip persisting during a search — a stale save is
        // harmless (the restore effect just won't match on reopen).
        if (!isSearching) {
            const rowHeight = getVisibleRowHeight();
            if (rowHeight > 0) {
                sessionStorage["scrollRow"] = String(Math.round(el.scrollTop / rowHeight));
                sessionStorage["scrollFolder"] = selectedFolder;
            }
        }
        const current = isSearching ? searchResults : tabItems[selectedFolder];
        if (!current || current.loading || !current.hasMore) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 400) loadMoreCurrent();
    };

    // Suggestions come from the same live global search used for the results list itself —
    // both are just "what does the backend find for this text", no separate lookup needed.
    const suggestions = useMemo(() => {
        if (!filterText || filterText.length < 1) return [];
        return searchResults.items.slice(0, 8).map(item => item.folder);
    }, [filterText, searchResults.items]);

    // Search runs as you type, so there's no submit: a search counts once it's been picked from
    // the dropdown, Entered, or left alone for a moment. Typing "nig" → "night" keeps only
    // "night" (a newer search replaces the ones it extends).
    const [recentSearches, setRecentSearches] = useState(loadRecentSearches);
    const rememberSearch = useCallback((text) => {
        const s = (text || '').trim().toLowerCase();
        if (s.length < 2) return;
        setRecentSearches(prev => {
            const next = [s, ...prev.filter(p => p !== s && !s.startsWith(p))].slice(0, RECENT_SEARCHES_MAX);
            try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    }, []);
    const forgetSearch = (s) => {
        setRecentSearches(prev => {
            const next = prev.filter(p => p !== s);
            try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    };
    useEffect(() => {
        if (!filterText) return;
        const t = setTimeout(() => rememberSearch(filterText), 1500);
        return () => clearTimeout(t);
    }, [filterText, rememberSearch]);

    // What the dropdown lists: matches while typing, recent searches while the box is empty.
    const dropdownItems = filterText ? suggestions : recentSearches;

    const applySuggestion = useCallback((value) => {
        rememberSearch(value);
        setFilterText(value.toLowerCase());
        localStorage.setItem("filterText", value.toLowerCase());
        setShowSuggestions(false);
        setSuggestionIndex(-1);
        setRandomPicks(null);
    }, [rememberSearch]);

    const textChanged = (e) => {
        const val = e.target.value.toLowerCase();
        setFilterText(val);
        localStorage.setItem("filterText", val);
        setShowSuggestions(true);
        setSuggestionIndex(-1);
        setRandomPicks(null);
    };

    const clearSearch = () => {
        setFilterText('');
        localStorage.setItem("filterText", '');
        setShowSuggestions(false);
        setSuggestionIndex(-1);
        setRandomPicks(null);
        searchRef.current?.querySelector('input')?.focus();
    };

    const onSearchKeyDown = (e) => {
        if (e.key === 'Enter' && suggestionIndex < 0 && filterText) rememberSearch(filterText);
        if (!showSuggestions || dropdownItems.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            setSuggestionIndex(i => Math.min(i + 1, dropdownItems.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            setSuggestionIndex(i => Math.max(i - 1, -1));
        } else if (e.key === 'Enter') {
            if (suggestionIndex >= 0) {
                e.preventDefault();
                applySuggestion(dropdownItems[suggestionIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setSuggestionIndex(-1);
        }
    };

    const selectTab = (index) => {
        setSelectedIndex(index);
        setRandomPicks(null);
        localStorage.setItem("selectedIndex", index);
        localStorage.setItem("selectedTab", allTabs[index]?.name ?? '');
        sessionStorage.removeItem("scrollRow");
        sessionStorage.removeItem("scrollFolder");
        if (containerRef.current) containerRef.current.scrollTop = 0;
    };

    const tabKeys = allTabs.map(t => t.name);

    // AI filter generation: jobs and their progress (refreshing the listing when one finishes, so
    // the new filter shows up), and starting one for a video path in the library.
    const autoFilterDomain = localStorage.getItem('domain');
    const filterOnlyJobs = useAutoFilterJobs(isAdmin ? autoFilterDomain : null, { onFinished: () => resync() });
    // Subtitle generation (speech transcription) shares the GPU queue, the progress panel and the
    // card's "AI n%" badge with the filter jobs.
    const subtitleJobs = useTranscribeJobs(isAdmin ? autoFilterDomain : null, { onFinished: () => resync() });
    // …and so do subtitle translations (Subtitle Editor "Save", AI chat), which run on the server.
    const translateJobs = useTranslateJobs(isAdmin ? autoFilterDomain : null, { onFinished: () => resync() });
    const filterJobs = [...filterOnlyJobs, ...subtitleJobs, ...translateJobs].sort((a, b) => a.createdAt - b.createdAt);
    const [dismissedJobs, setDismissedJobs] = useState(() => new Set());
    const shownFilterJobs = filterJobs.filter(j => !dismissedJobs.has(j.id));
    const filterProgressFor = (prefix) => {
        const active = filterJobs.filter(j => isFilterJobActive(j) && (j.video === prefix || j.video.startsWith(`${prefix}/`)));
        return active.length ? Math.min(...active.map(j => j.progress)) : null;
    };
    const generateFilter = async (videos) => {
        if (videos.length > 1 && !window.confirm(`Generate AI filters for the episodes that don't have one yet (${videos.length} episodes)? It runs in the background, about 3 minutes per hour of video.`)) return;
        let skipped = 0;
        for (const v of videos) {
            try {
                // Several at once: episodes that already have a filter are skipped, never replaced.
                if (!(await startAutoFilter(autoFilterDomain, v, { ifExists: videos.length === 1 ? 'ask' : 'skip' })) && videos.length > 1) skipped++;
            } catch (e) {
                alert.error(e.message);
            }
        }
        if (skipped) alert.info(`${skipped} episode${skipped === 1 ? ' already has' : 's already have'} a filter — skipped (use its own button to regenerate)`);
        setDismissedJobs(new Set());
    };
    const generateSubtitles = async (videos) => {
        if (videos.length > 1 && !window.confirm(`Generate subtitles from the speech for the episodes that don't have generated ones yet (${videos.length} episodes)? It runs in the background, about 5 minutes per hour of video.`)) return;
        let skipped = 0;
        for (const v of videos) {
            try {
                if (!(await startTranscribe(autoFilterDomain, v, { ifExists: videos.length === 1 ? 'ask' : 'skip' })) && videos.length > 1) skipped++;
            } catch (e) {
                alert.error(e.message);
            }
        }
        if (skipped) alert.info(`${skipped} episode${skipped === 1 ? ' already has' : 's already have'} generated subtitles — skipped (use its own button to regenerate)`);
        setDismissedJobs(new Set());
    };

    // Debounced global search — fires the /search endpoint while typing, replacing the old
    // "filter the already-fully-loaded list client-side" behavior. filterText itself is
    // restored from localStorage on mount, so this also runs once on open if a search was
    // already active.
    useEffect(() => {
        if (!filterText) {
            setSearchResults({ items: [], offset: 0, total: 0, hasMore: false, loading: false });
            return;
        }
        let cancelled = false;
        setSearchResults(prev => ({ ...prev, loading: true }));
        const t = setTimeout(async () => {
            try {
                const params = new URLSearchParams({ q: filterText, offset: '0', limit: String(PAGE_SIZE) });
                const res = await authFetch(`${apiUrl}/search?${params.toString()}`);
                if (cancelled) return;
                if (!res.ok) { setSearchResults({ items: [], offset: 0, total: 0, hasMore: false, loading: false }); return; }
                const data = await res.json();
                if (cancelled) return;
                setSearchResults({ items: data.items || [], offset: data.offset + (data.items?.length || 0), total: data.total, hasMore: data.hasMore, loading: false });
            } catch {
                if (!cancelled) setSearchResults({ items: [], offset: 0, total: 0, hasMore: false, loading: false });
            }
        }, 300);
        return () => { cancelled = true; clearTimeout(t); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterText, apiUrl]);

    // Reset card focus when folder/filter/items change
    useEffect(() => { setFocusedIndex(-1); }, [selectedFolder, filterText, randomPicks]);

    // Scroll focused card into view
    useEffect(() => { focusedCardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [focusedIndex]);

    // Auto-focus episode list when panel opens
    useEffect(() => { if (episodePanel) setTimeout(() => epListRef.current?.focus(), 0); }, [episodePanel]);

    // Auto-focus history panel when it opens
    useEffect(() => { if (showHistory) setTimeout(() => historyPanelRef.current?.focus(), 0); }, [showHistory]);

    // When episode panel opens: reset ep focus and focus the list
    useEffect(() => {
        if (episodePanel) {
            setFocusedEpIndex(0);
            setTimeout(() => epListRef.current?.focus(), 50);
        }
    }, [episodePanel]);

    // Scroll focused episode into view
    useEffect(() => { focusedEpRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [focusedEpIndex]);

    const onEpResizeMouseDown = useCallback((e) => {
        epDragging.current = true;
        epDragStartX.current = e.clientX;
        epDragStartWidth.current = epPanelWidth;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    }, [epPanelWidth]);

    useEffect(() => {
        const onMouseMove = (e) => {
            if (!epDragging.current) return;
            const delta = e.clientX - epDragStartX.current;
            const next = Math.min(900, Math.max(280, epDragStartWidth.current + delta));
            setEpPanelWidth(next);
        };
        const onMouseUp = () => {
            if (!epDragging.current) return;
            epDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            setEpPanelWidth(w => { localStorage.setItem('epPanelWidth', w); return w; });
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    const openEpisodePanel = ({ title, image, videos, srts, filters, names }) => {
        setEpisodePanel({ title, image, videos, srts, filters, names });
    };

    // A multi-episode title as parallel arrays (index i = episode i) for the episode panel and
    // currentList. Subtitles/filters are paired to their episode by name, not list position.
    const episodeListOf = (item) => {
        const pairs = pairEpisodeFiles(
            item.files.filter(f => f.type === 'MEDIA'),
            item.files.filter(f => f.type === 'SRT'),
            item.files.filter(f => f.type === 'FILTER'),
        );
        const staticUrl = (f) => f ? withToken(`${path}/${item.folder}/${f.name}`) : undefined;
        return {
            names: pairs.map(p => p.video.name),
            videos: pairs.map(p => withToken(`${videoPath}/${item.folder}/${p.video.name}`)),
            srts: pairs.map(p => staticUrl(p.srt)),
            filters: pairs.map(p => staticUrl(p.filter)),
        };
    };

    const closeEpisodePanel = (e) => {
        e?.stopPropagation();
        setEpisodePanel(null);
    };

    const playEpisode = ({ videos, srts, filters, index, image }) => {
        StorageHelper.saveToCurrentList({ videos, srts, filters, index });
        openOrCast({ video: videos[index], srt: srts[index], filter: filters[index], image });
    };

    const deleteEpisode = async (index) => {
        const ep = episodePanel;
        const name = ep.names?.[index] || ep.videos[index]?.split('/')?.pop();
        if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
        const domain = localStorage.getItem('domain');
        const folderPath = ep.title;
        const filesToDelete = [
            ep.names?.[index] && `${folderPath}/${ep.names[index]}`,
            ep.srts?.[index] && ep.srts[index].split('/public/')[1]?.split('?')[0],
            ep.filters?.[index] && ep.filters[index].split('/public/')[1]?.split('?')[0],
        ].filter(Boolean);
        try {
            await Promise.all(filesToDelete.map(fp =>
                authFetch(`${domain}/api/v1/files/file`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePath: fp }),
                })
            ));
            const newVideos = ep.videos.filter((_, i) => i !== index);
            if (newVideos.length === 0) {
                setEpisodePanel(null);
            } else {
                setEpisodePanel({
                    ...ep,
                    videos: newVideos,
                    srts: ep.srts?.filter((_, i) => i !== index),
                    filters: ep.filters?.filter((_, i) => i !== index),
                    names: ep.names?.filter((_, i) => i !== index),
                });
                setFocusedEpIndex(i => Math.min(i, newVideos.length - 1));
            }
            resync();
        } catch { alert.error('Error deleting episode'); }
    };

    const openItem = (item) => {
        const isMulti = item.files.filter(f => f.type === 'MEDIA').length > 1;
        if (isMulti) {
            const image = titleImage(localStorage.getItem('domain'), item);
            openEpisodePanel({ title: item.folder, image, ...episodeListOf(item) });
        } else {
            const imageFiles = item.files.filter(f => f.type === 'IMAGE');
            const videoFile = item.files.find(f => f.type === 'MEDIA');
            const srtFile = item.files.find(f => f.type === 'SRT');
            const filterFile = item.files.find(f => f.type === 'FILTER');
            const image = titleImage(localStorage.getItem('domain'), item);
            const video = videoFile ? withToken(`${videoPath}/${item.folder}/${videoFile.name}`) : undefined;
            const srt = srtFile ? withToken(`${path}/${item.folder}/${srtFile.name}`) : undefined;
            const filter = filterFile ? withToken(`${path}/${item.folder}/${filterFile.name}`) : undefined;
            StorageHelper.saveToCurrentList({ videos: [video], srts: [srt], filters: [filter], index: 0 });
            openOrCast({ video, srt, filter, image });
        }
    };

    const getColumns = () => {
        if (!containerRef.current) return 1;
        return Math.max(1, Math.floor((containerRef.current.clientWidth - 40 + 16) / (cardSize + 16)));
    };

    // Measures one grid row's real on-screen height (card + gap) from whichever card is
    // currently visible in the container. Cards use content-visibility:auto for render
    // performance, which gives an off-screen card a placeholder height until it's actually been
    // near the viewport — so measuring an arbitrary card (e.g. always the first in the DOM) can
    // read a stale placeholder instead of the true size. Scanning for one that intersects the
    // visible area always gets a real, laid-out value.
    const getVisibleRowHeight = () => {
        const el = containerRef.current;
        if (!el) return 0;
        const containerRect = el.getBoundingClientRect();
        const cards = el.querySelectorAll('.file-record2');
        for (const card of cards) {
            const r = card.getBoundingClientRect();
            if (r.bottom > containerRect.top && r.top < containerRect.bottom) {
                return r.height + 16; // .cards-grid gap
            }
        }
        return 0;
    };

    // Auto-load-more, keyboard/D-pad side: nearing the end of what's loaded (within the last
    // row, or the last couple items horizontally) fetches the next page — same trigger the
    // scroll handler above uses for mouse/touch, since focus-driven navigation never scrolls
    // on its own on a TV remote.
    const maybeLoadMoreFor = (nextIndex, count) => {
        const current = isSearching ? searchResults : tabItems[selectedFolder];
        if (!current || current.loading || !current.hasMore) return;
        if (nextIndex >= count - getColumns()) loadMoreCurrent();
    };

    // Focus between the folder list and the cards. The card that had focus is remembered, so
    // going into the folders and straight back lands on it again.
    const lastCardIndex = useRef(-1);
    const focusFolders = () => {
        lastCardIndex.current = focusedIndex;
        setFocusedIndex(-1);
        folderListRef.current?.focus();
    };
    const focusCards = () => {
        const count = displayItems.length;
        if (!count) return;
        const back = lastCardIndex.current;
        setFocusedIndex(back >= 0 && back < count ? back : 0);
        containerRef.current?.focus();
    };
    useEffect(() => { lastCardIndex.current = -1; }, [selectedFolder]);
    useEffect(() => { activeFolderRef.current?.scrollIntoView({ block: 'nearest' }); }, [selectedFolder]);

    const handleFolderKeyDown = (e) => {
        if (e.target.tagName === 'INPUT') return;
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectTab(Math.min(tabKeys.length - 1, selectedIndex + 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectTab(Math.max(0, selectedIndex - 1));
                break;
            case 'Home':
                e.preventDefault();
                selectTab(0);
                break;
            case 'End':
                e.preventDefault();
                selectTab(tabKeys.length - 1);
                break;
            case 'ArrowRight':
            case 'Enter':
                e.preventDefault();
                focusCards();
                break;
            case 'Escape':
                close();
                break;
            default: break;
        }
    };

    const handleKeyDown = (e) => {
        if (e.target.tagName === 'INPUT') return;
        const count = displayItems.length;
        if (e.key === 'ArrowLeft' && (count === 0 || focusedIndex <= 0 || focusedIndex % getColumns() === 0)) {
            // From the first column (or an empty folder) Left goes to the folder list.
            e.preventDefault();
            focusFolders();
            return;
        }
        if (count === 0) return;
        switch (e.key) {
            case 'ArrowRight':
                e.preventDefault();
                setFocusedIndex(i => {
                    const n = i < count - 1 ? i + 1 : i === -1 ? 0 : i;
                    maybeLoadMoreFor(n, count);
                    return n;
                });
                break;
            case 'ArrowLeft':
                e.preventDefault();
                setFocusedIndex(i => i > 0 ? i - 1 : 0);
                break;
            case 'ArrowDown': {
                e.preventDefault();
                const cols = getColumns();
                setFocusedIndex(i => {
                    const n = (i === -1 ? 0 : i) + cols;
                    const clamped = n < count ? n : i === -1 ? 0 : i;
                    maybeLoadMoreFor(clamped, count);
                    return clamped;
                });
                break;
            }
            case 'ArrowUp': {
                e.preventDefault();
                const cols = getColumns();
                setFocusedIndex(i => { if (i <= 0) return 0; const p = i - cols; return p >= 0 ? p : 0; });
                break;
            }
            case 'Enter':
                if (focusedIndex >= 0) openItem(displayItems[focusedIndex]);
                break;
            case 'Escape':
                close();
                break;
            case '[':
                e.preventDefault();
                selectTab(Math.max(0, selectedIndex - 1));
                break;
            case ']':
                e.preventDefault();
                selectTab(Math.min(tabKeys.length - 1, selectedIndex + 1));
                break;
            default: break;
        }
    };

    const handleEpKeyDown = (e) => {
        const count = episodePanel?.videos?.length || 0;
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusedEpIndex(i => Math.min(i + 1, count - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedEpIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                playEpisode({ videos: episodePanel.videos, srts: episodePanel.srts, filters: episodePanel.filters, image: episodePanel.image, index: focusedEpIndex });
                break;
            case 'Escape':
                e.stopPropagation();
                closeEpisodePanel();
                break;
            default: break;
        }
    };

    // Current tab's loaded pages, or global search results while a search is active — both
    // already come back sorted server-side, so there's nothing left to do
    // here beyond hiding downloaded-only items (see downloadedFileKeys above).
    const withoutDownloaded = (rawItems) => {
        if (!hideDownloaded || !downloadedFileKeys.size) return rawItems;
        return rawItems
            .map(item => {
                const originalFiles = item.files || [];
                const hadMedia = originalFiles.some(f => f.type === 'MEDIA');
                const visibleFiles = originalFiles.filter(f => !(f.type === 'MEDIA' && downloadedFileKeys.has(`${item.folder}::${f.name}`)));
                if (hadMedia && !visibleFiles.some(f => f.type === 'MEDIA')) return null;
                return visibleFiles.length === originalFiles.length ? item : { ...item, files: visibleFiles };
            })
            .filter(Boolean);
    };
    const filteredItems = useMemo(
        () => withoutDownloaded(isSearching ? searchResults.items : (tabItems[selectedFolder]?.items || [])),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isSearching, searchResults.items, tabItems, selectedFolder, downloadedFileKeys, hideDownloaded]);

    const toggleFavorite = (folder) => {
        setFavorites(prev => {
            const next = prev.includes(folder) ? prev.filter(f => f !== folder) : [...prev, folder];
            const domain = localStorage.getItem('domain');
            authFetch(`${domain}/api/v1/userdata/folder-favorites`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderFavorites: next }),
            }).catch(() => setFavorites(prev)); // revert on failure
            return next;
        });
    };

    // Sort order is now applied server-side per page, so this is
    // just the random-picks override — no client-side re-sort needed.
    const displayItems = randomPicks || filteredItems;

    const pickRandom = async () => {
        // Clicking again while picks are shown re-rolls them; the ✕ beside the button clears.
        if (!selectedFolder && !isSearching) return;
        try {
            // Picks come from what the list is filtered to right now: the search results while
            // searching, else the tab narrowed to the selected genre/language. Extra candidates are asked
            // for so hiding already-downloaded ones (as the list does) still leaves RANDOM_COUNT.
            const params = new URLSearchParams({ count: String(RANDOM_COUNT * 3) });
            if (isSearching) params.set('q', filterText);
            else {
                params.set('folder', selectedFolder);
                if (genre) params.set('genre', genre);
                if (language) params.set('language', language);
                if (unfilteredOnly) params.set('unfiltered', '1');
                if (decade) params.set('decade', decade);
            }
            const res = await authFetch(`${apiUrl}/random?${params.toString()}`);
            if (!res.ok) return;
            const data = await res.json();
            setRandomPicks(withoutDownloaded(data.items || []).slice(0, RANDOM_COUNT));
        } catch (e) { console.error(e); }
    };

    return (
        <div className="filters-container" onClick={close}>
            <div className="filters-container-body" ref={modalBodyRef} onClick={e => e.stopPropagation()}>
                {/* Toolbar */}
                <div className="filters-container-toolbar">
                    <div className="filters-search-wrap" ref={searchRef}>
                        <input
                            className="filters-container-input"
                            placeholder="Search..."
                            onChange={textChanged}
                            onKeyDown={onSearchKeyDown}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                            value={filterText}
                        />
                        {filterText && (
                            <button
                                type="button"
                                className="filters-search-clear"
                                onMouseDown={e => e.preventDefault()}
                                onClick={clearSearch}
                                title="Clear search"
                                aria-label="Clear search"
                            >
                                <MdClose />
                            </button>
                        )}
                        {showSuggestions && !filterText && recentSearches.length > 0 && (
                            <ul className="filters-suggestions">
                                <li className="filters-suggestions-heading">Recent searches</li>
                                {recentSearches.map((s, i) => (
                                    <li
                                        key={s}
                                        className={`filters-suggestion-item filters-recent-item${i === suggestionIndex ? ' filters-suggestion-item--active' : ''}`}
                                        onMouseDown={() => applySuggestion(s)}
                                    >
                                        <MdHistory className="filters-recent-icon" />
                                        <span className="filters-recent-text">{s}</span>
                                        <button
                                            type="button"
                                            className="filters-recent-remove"
                                            title="Remove from recent searches"
                                            aria-label={`Remove ${s} from recent searches`}
                                            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); forgetSearch(s); }}
                                        >
                                            <MdClose />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {showSuggestions && filterText && suggestions.length > 0 && (
                            <ul className="filters-suggestions">
                                {suggestions.map((s, i) => (
                                    <li
                                        key={s}
                                        className={`filters-suggestion-item${i === suggestionIndex ? ' filters-suggestion-item--active' : ''}`}
                                        onMouseDown={() => applySuggestion(s)}
                                    >
                                        {s}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <button className="filters-toolbar-btn filters-sort-btn" onClick={() => { setSortAsc(a => !a); setRandomPicks(null); }}
                        title={sortAsc ? 'Ascending — click for descending' : 'Descending — click for ascending'}
                        aria-label={sortAsc ? 'Sorted ascending' : 'Sorted descending'}>
                        {sortAsc ? <MdArrowUpward /> : <MdArrowDownward />}
                    </button>
                    <button className={`filters-toolbar-btn ${randomPicks ? 'filters-toolbar-btn--active' : ''}`} onClick={pickRandom} title={randomPicks ? `Another ${RANDOM_COUNT} random picks` : `${RANDOM_COUNT} random picks`}>
                        <MdShuffle />
                        {randomPicks ? 'Shuffle again' : `Random ${RANDOM_COUNT}`}
                    </button>
                    <button
                        className={`filters-toolbar-btn ${showTagFilters ? 'filters-toolbar-btn--active' : ''}`}
                        onClick={toggleTagFilters}
                        aria-pressed={showTagFilters}
                        title={showTagFilters ? 'Hide genre & language filters' : 'Show genre & language filters'}
                    >
                        <MdFilterAlt />
                        Filters
                    </button>
                    {randomPicks && (
                        <button className="filters-toolbar-btn filters-random-clear" onClick={() => setRandomPicks(null)} title="Clear random picks" aria-label="Clear random picks">
                            <MdClose />
                        </button>
                    )}
                    {downloadedFileKeys.size > 0 && (
                        <button
                            className={`filters-toolbar-btn ${!hideDownloaded ? 'filters-toolbar-btn--active' : ''}`}
                            onClick={() => setHideDownloaded(h => !h)}
                            title={hideDownloaded ? 'Some items may be hidden as already-downloaded — click to show everything' : 'Hide already-downloaded items again'}
                        >
                            {hideDownloaded ? <MdVisibilityOff /> : <MdVisibility />}
                            {hideDownloaded ? 'Show all' : 'Showing all'}
                        </button>
                    )}
                    <select
                        className="filters-sortby-select"
                        value={sortBy}
                        onChange={e => { setSortBy(e.target.value); setRandomPicks(null); }}
                    >
                        <option value="alphabet">A → Z</option>
                        <option value="date">Latest</option>
                        <option value="none">Default</option>
                    </select>
                    <div className="filters-cardsize-group" title="Card size">
                        <button
                            className="filters-toolbar-btn filters-cardsize-btn"
                            onClick={decreaseCardSize}
                            disabled={cardSize <= CARD_SIZE_MIN}
                            title="Smaller cards"
                        >
                            <MdRemove />
                        </button>
                        <span className="filters-cardsize-label">{cardSize}px</span>
                        <button
                            className="filters-toolbar-btn filters-cardsize-btn"
                            onClick={increaseCardSize}
                            disabled={cardSize >= CARD_SIZE_MAX}
                            title="Larger cards"
                        >
                            <MdAdd />
                        </button>
                    </div>

                    {apiUrl && (
                        <div className="filters-resync-group">
                            {lastSync && (
                                <span className="filters-sync-date" title={new Date(lastSync).toLocaleString()}>
                                    {formatSyncDate(lastSync)}
                                </span>
                            )}
                            <button className="filters-resync-btn" onClick={resync} disabled={syncing} title="Resync with server">
                                <MdSync className={syncing ? 'spinning' : ''} />
                                {syncing ? 'Syncing…' : 'Resync'}
                            </button>
                            {isAdmin && (
                                <button className="filters-resync-btn" onClick={openHistory} title="Downloads">
                                    <MdFileDownload /> Downloads
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="store-body">
                {/* Folder list: the tabs as items on the left, their cards on the right. Up/Down
                    switches folder, Right/Enter goes into the cards (Left from the first column
                    comes back). A title dragged onto a folder is moved into it. */}
                <nav className="folder-sidebar" ref={folderListRef} tabIndex={0} onKeyDown={handleFolderKeyDown} aria-label="Folders">
                    {allTabs.map((t, index) => {
                        const active = t.name === selectedFolder;
                        if (active && renamingTab === selectedFolder) {
                            return (
                                <input
                                    key={t.name}
                                    className="folder-tab-rename-input"
                                    autoFocus
                                    value={renameTabValue}
                                    onChange={e => setRenameTabValue(e.target.value)}
                                    onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') renameTab(selectedFolder, renameTabValue); if (e.key === 'Escape') { setRenamingTab(null); setRenameTabValue(''); } }}
                                    onBlur={() => renameTab(selectedFolder, renameTabValue)}
                                />
                            );
                        }
                        return (
                            <div
                                key={t.name}
                                ref={active ? activeFolderRef : null}
                                className={`folder-item${active ? ' folder-item--active' : ''}${isAdmin && cardDragOver === t.name ? ' folder-item--drop' : ''}`}
                                data-cardfolder={isAdmin && t.name !== FAVORITES_TAB ? t.name : undefined}
                                onClick={() => { selectTab(index); setShowNewFolder(null); setNewFolderName(''); }}
                                title={t.name === FAVORITES_TAB ? 'Favourites' : t.name}
                            >
                                <span className="folder-item-name">{t.name === FAVORITES_TAB ? '★ Favourites' : (t.name || '(root)')}</span>
                                <span className="folder-item-count">{t.count}</span>
                                {isAdmin && active && t.name !== FAVORITES_TAB && (
                                    <span className="folder-item-actions">
                                        <button title="Create folder here" tabIndex={-1}
                                            onClick={e => { e.stopPropagation(); setShowNewFolder(selectedFolder); setNewFolderName(''); }}>+</button>
                                        <button title="Rename" tabIndex={-1}
                                            onClick={e => { e.stopPropagation(); setRenamingTab(selectedFolder); setRenameTabValue(selectedFolder); }}>✎</button>
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </nav>
                <div className="store-main">
                {/* Filters, in one row: genre and language pickers (with title counts), the
                    not-filtered toggle, and Clear once anything is chosen. */}
                {showTagFilters && !isSearching && selectedFolder !== FAVORITES_TAB && (() => {
                    const genres = genreLists[selectedFolder] || [];
                    const languages = languageLists[selectedFolder] || [];
                    const decades = decadeLists[selectedFolder] || [];
                    const unfilteredCount = unfilteredCounts[selectedFolder];
                    const anyActive = !!(genre || language || unfilteredOnly || decade);
                    if (!genres.length && languages.length < 2 && decades.length < 2 && unfilteredCount === undefined) return null;
                    return (
                        <div className="filter-bar" role="toolbar" aria-label="Filters">
                            {genres.length > 0 && (
                                <select className={`filter-bar-select${genre ? ' filter-bar-select--active' : ''}`}
                                    value={genre || ''} onChange={e => setGenre(e.target.value || null)} aria-label="Genre">
                                    <option value="">All genres</option>
                                    {genres.map(g => <option key={g.name} value={g.name}>{g.name} ({g.count})</option>)}
                                </select>
                            )}
                            {/* One language alone isn't worth filtering by. */}
                            {languages.length > 1 && (
                                <select className={`filter-bar-select${language ? ' filter-bar-select--active' : ''}`}
                                    value={language || ''} onChange={e => setLanguage(e.target.value || null)} aria-label="Language">
                                    <option value="">All languages</option>
                                    {languages.map(l => <option key={l.name} value={l.name}>{l.name} ({l.count})</option>)}
                                </select>
                            )}
                            {decades.length > 1 && (
                                <select className={`filter-bar-select${decade ? ' filter-bar-select--active' : ''}`}
                                    value={decade || ''} onChange={e => setDecade(e.target.value || null)} aria-label="Decade">
                                    <option value="">All years</option>
                                    {decades.map(d => <option key={d.name} value={d.name}>{decadeLabel(d.name)} ({d.count})</option>)}
                                </select>
                            )}
                            {unfilteredCount !== undefined && (
                                <button
                                    className={`filter-bar-toggle${unfilteredOnly ? ' filter-bar-toggle--active' : ''}`}
                                    aria-pressed={unfilteredOnly}
                                    title="Only titles that don't have a scene filter yet"
                                    onClick={() => setUnfilteredOnly(on => !on)}
                                >
                                    <MdFilterAlt /> Not filtered <span className="filter-bar-count">{unfilteredCount}</span>
                                </button>
                            )}
                            {anyActive && (
                                <button className="filter-bar-clear" title="Clear all filters"
                                    onClick={() => { setGenre(null); setLanguage(null); setUnfilteredOnly(false); setDecade(null); }}>
                                    <MdClose /> Clear
                                </button>
                            )}
                        </div>
                    );
                })()}
                {showNewFolder && (
                    <div className="folder-new-input-row">
                        <input
                            className="filters-container-input"
                            placeholder={`New folder in "${showNewFolder}"… (or paste a magnet link)`}
                            autoFocus
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') { setShowNewFolder(null); setNewFolderName(''); } }}
                        />
                        <button className="filters-toolbar-btn" onClick={createFolder}>Create</button>
                        <button className="filters-toolbar-btn" onClick={() => { setShowNewFolder(null); setNewFolderName(''); }}>✕</button>
                    </div>
                )}

                {/* yt-dlp download panel */}
                {showDownload && (
                    <div className="ytdlp-panel">
                        <div className="ytdlp-panel-folder">⬇ {showDownload?.split('/').pop()}</div>
                        <div className="ytdlp-panel-row">
                            {batchMode ? (
                                <textarea
                                    className="filters-container-input ytdlp-url-input ytdlp-url-textarea"
                                    placeholder="Paste one video URL or magnet link per line…"
                                    value={downloadUrl}
                                    onChange={e => setDownloadUrl(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Escape') closeDownload(); }}
                                    rows={4}
                                    autoFocus
                                />
                            ) : (
                                <input
                                    className="filters-container-input ytdlp-url-input"
                                    placeholder="Paste video URL or magnet link…"
                                    value={downloadUrl}
                                    onChange={e => setDownloadUrl(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') startDownload(); if (e.key === 'Escape') closeDownload(); }}
                                    autoFocus
                                />
                            )}
                            <button
                                className={`filters-toolbar-btn ytdlp-batch-toggle${batchMode ? ' active' : ''}`}
                                onClick={() => setBatchMode(b => !b)}
                                title={batchMode ? 'Switch to single URL' : 'Paste multiple links — downloads 2 at a time'}
                            >
                                <MdPlaylistAdd />
                            </button>
                            <button className="filters-toolbar-btn" onClick={() => startDownload()} disabled={!downloadUrl.trim()}>
                                <MdFileDownload /> Download
                            </button>
                            <button className="filters-toolbar-btn" onClick={closeDownload}>✕</button>
                        </div>
                        {batchMode && <div className="ytdlp-panel-hint">One link per line — downloads 2 at a time</div>}
                    </div>
                )}

                {/* Subtitle search panel */}
                {showSubtitleSearch && (
                    <div className="subtitle-search-overlay" onClick={closeSubtitleSearch}>
                        <div className="subtitle-search-panel" onClick={e => e.stopPropagation()}>
                            <div className="subtitle-search-header">
                                <span>Search subtitles</span>
                                <button className="episode-panel-close" onClick={closeSubtitleSearch}><MdClose /></button>
                            </div>
                            <div className="subtitle-search-row">
                                <input
                                    className="filters-container-input subtitle-search-input"
                                    placeholder="Movie or show title…"
                                    value={subtitleQuery}
                                    onChange={e => setSubtitleQuery(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') searchSubtitles(); if (e.key === 'Escape') closeSubtitleSearch(); }}
                                    autoFocus
                                />
                                <button className="filters-toolbar-btn" onClick={searchSubtitles} disabled={subtitleSearching || !subtitleQuery.trim()}>
                                    {subtitleSearching ? 'Searching…' : 'Search'}
                                </button>
                            </div>
                            <label className="subtitle-search-lang-toggle">
                                <input
                                    type="checkbox"
                                    checked={subtitleIncludeEnglish}
                                    onChange={e => setSubtitleIncludeEnglish(e.target.checked)}
                                />
                                Also search English (Arabic only by default)
                            </label>
                            {subtitleError && <div className="subtitle-search-error">{subtitleError}</div>}
                            {subtitleResults.length > 0 && (
                                <div className="subtitle-search-results">
                                    {subtitleResults.map(r => (
                                        <div key={r.fileId} className="subtitle-result">
                                            <div className="subtitle-result-info">
                                                <span className="subtitle-result-name" title={r.fileName}>{r.release || r.fileName}</span>
                                                <span className="subtitle-result-meta">
                                                    {r.language?.toUpperCase()}
                                                    {r.hd && ' · HD'}
                                                    {typeof r.downloadCount === 'number' && ` · ${r.downloadCount} downloads`}
                                                </span>
                                            </div>
                                            <button
                                                className="filters-toolbar-btn"
                                                onClick={() => downloadSubtitle(r)}
                                                disabled={subtitleDownloadingId === r.fileId}
                                            >
                                                {subtitleDownloadingId === r.fileId ? 'Downloading…' : 'Download'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {moving && <div className="ytdlp-moving-banner"><MdSync className="spinning" /> Moving…</div>}

                {/* Cards grid */}
                <div className="filter-files" ref={containerRef} tabIndex={0} onScroll={handleScroll} onKeyDown={handleKeyDown} style={moving ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
                    <div className="cards-grid" style={{ '--card-size': `${cardSize}px` }}>
                        {displayItems.map((item, cardIndex) => {
                            const isFocused = focusedIndex === cardIndex;
                            const isFavorite = favorites.includes(item.folder);
                            const isEmpty = !item.files || item.files.length === 0;
                            const isMultiEpisode = !isEmpty && item.files.filter(f => f.type === 'MEDIA').length > 1;

                            if (isEmpty) {
                                return (
                                    <FileRecord
                                        key={item.folder}
                                        focusRef={isFocused ? focusedCardRef : null}
                                        focused={isFocused}
                                        isFavorite={isFavorite}
                                        onToggleFavorite={() => toggleFavorite(item.folder)}
                                        title={item.folder}
                                        copy={() => {}}
                                        onRename={isAdmin ? newName => renameFolder(item, newName) : undefined}
                                        onDownload={isAdmin ? () => { setDownloadUrl(''); setShowDownload(item.folder); } : undefined}
                                        onDelete={isAdmin ? () => deleteFolder(item) : undefined}
                                        draggable={isAdmin}
                                        onDragStart={isAdmin ? e => { e.dataTransfer.setData('text/plain', item.folder); dragItem.current = item.folder;} : undefined}
                                        dropTarget={isAdmin && cardDragOver === item.folder}
                                        folderKey={item.folder}
                                        imdbFile={item.files.find(f => f.type === 'MEDIA')?.name}
                                        onAskAI={() => setAiItem(item)}
                                        onImdb={() => openImdb(item.folder, item.files.find(f => f.type === 'MEDIA')?.name)}
                                    />
                                );
                            }

                            if (isMultiEpisode) {
                                const image = titleImage(localStorage.getItem('domain'), item);
                                const episodeCount = item.files.filter(f => f.type === 'MEDIA').length;

                                return (
                                    <FileRecord
                                        key={item.folder}
                                        focusRef={isFocused ? focusedCardRef : null}
                                        focused={isFocused}
                                        isFavorite={isFavorite}
                                        onToggleFavorite={() => toggleFavorite(item.folder)}
                                        imgSrc={image}
                                        title={item.folder}
                                        isMultiEpisode
                                        episodeCount={episodeCount}
                                        copy={() => openEpisodePanel({ title: item.folder, image, ...episodeListOf(item) })}
                                        onGenerateFilter={isAdmin ? () => generateFilter(item.files.filter(f => f.type === 'MEDIA').map(v => `${item.folder}/${v.name}`)) : undefined}
                                        onGenerateSubtitles={isAdmin ? () => generateSubtitles(item.files.filter(f => f.type === 'MEDIA').map(v => `${item.folder}/${v.name}`)) : undefined}
                                        aiFilterProgress={isAdmin ? filterProgressFor(item.folder) : null}
                                        onRename={isAdmin ? newName => renameFolder(item, newName) : undefined}
                                        onDownload={isAdmin ? () => { setDownloadUrl(''); setShowDownload(item.folder); } : undefined}
                                        onDelete={isAdmin ? () => deleteFolder(item) : undefined}
                                        draggable={isAdmin}
                                        onDragStart={isAdmin ? e => { e.dataTransfer.setData('text/plain', item.folder); dragItem.current = item.folder;} : undefined}
                                        dropTarget={isAdmin && cardDragOver === item.folder}
                                        folderKey={item.folder}
                                        imdbFile={item.files.find(f => f.type === 'MEDIA')?.name}
                                        onAskAI={() => setAiItem(item)}
                                        onImdb={() => openImdb(item.folder, item.files.find(f => f.type === 'MEDIA')?.name)}
                                    />
                                );
                            } else {
                                let imageFiles = item.files.filter(f => f.type === 'IMAGE');
                                let videoFile = item.files.find(f => f.type === 'MEDIA');
                                let srtFile = item.files.find(f => f.type === 'SRT');
                                let filterFile = item.files.find(f => f.type === 'FILTER');
                                const image = titleImage(localStorage.getItem('domain'), item);
                                const video = videoFile ? withToken(`${videoPath}/${item.folder}/${videoFile.name}`) : undefined;
                                const srt = srtFile ? withToken(`${path}/${item.folder}/${srtFile.name}`) : undefined;
                                const filter = filterFile ? withToken(`${path}/${item.folder}/${filterFile.name}`) : undefined;

                                return (
                                    <FileRecord
                                        key={item.folder}
                                        focusRef={isFocused ? focusedCardRef : null}
                                        focused={isFocused}
                                        isFavorite={isFavorite}
                                        onToggleFavorite={() => toggleFavorite(item.folder)}
                                        imgSrc={image}
                                        title={item.folder}
                                        filter={!!filter}
                                        video={video}
                                        copy={() => {
                                            StorageHelper.saveToCurrentList({ videos: [video], srts: [srt], filters: [filter], index: 0 });
                                            openOrCast({ video, srt, filter, image });
                                        }}
                                        onRename={isAdmin ? newName => renameFolder(item, newName) : undefined}
                                        onDownload={isAdmin ? () => { setDownloadUrl(''); setShowDownload(item.folder); } : undefined}
                                        onSearchSubtitle={isAdmin && videoFile ? () => openSubtitleSearch(item.folder, videoFile.name) : undefined}
                                        onGenerateFilter={isAdmin && videoFile ? () => generateFilter([`${item.folder}/${videoFile.name}`]) : undefined}
                                        onGenerateSubtitles={isAdmin && videoFile ? () => generateSubtitles([`${item.folder}/${videoFile.name}`]) : undefined}
                                        aiFilterProgress={isAdmin ? filterProgressFor(item.folder) : null}
                                        onDelete={isAdmin ? () => deleteFolder(item) : undefined}
                                        draggable={isAdmin}
                                        onDragStart={isAdmin ? e => { e.dataTransfer.setData('text/plain', item.folder); dragItem.current = item.folder;} : undefined}
                                        dropTarget={isAdmin && cardDragOver === item.folder}
                                        folderKey={item.folder}
                                        imdbFile={item.files.find(f => f.type === 'MEDIA')?.name}
                                        onAskAI={() => setAiItem(item)}
                                        onImdb={() => openImdb(item.folder, item.files.find(f => f.type === 'MEDIA')?.name)}
                                    />
                                );
                            }
                        })}
                    </div>
                    {(isSearching ? searchResults.loading : tabItems[selectedFolder]?.loading) && (
                        <div style={{ textAlign: 'center', padding: '16px', color: '#888aaa', fontSize: 13 }}>
                            <MdSync className="spinning" /> Loading…
                        </div>
                    )}
                    {!(isSearching ? searchResults.loading : tabItems[selectedFolder]?.loading) && displayItems.length === 0 && (
                        <div className="filter-files-empty">
                            {isSearching
                                ? `No matches for "${filterText}"`
                                : selectedFolder === FAVORITES_TAB
                                    ? 'No favourites yet — tap the ♡ on any card to add it here'
                                    : 'Nothing here yet'}
                        </div>
                    )}
                </div>
                </div>
                </div>

                {/* Episode panel */}
                {episodePanel && (
                    <div className="episode-panel-overlay" onClick={closeEpisodePanel}>
                        <div className="episode-panel" style={{ width: epPanelWidth }} onClick={e => e.stopPropagation()}>

                            <div className="episode-panel-header">
                                {episodePanel.image && (
                                    <img className="episode-panel-thumb" src={episodePanel.image} alt="" />
                                )}
                                <span className="episode-panel-title">{episodePanel.title}</span>
                                {isAdmin && episodePanel.names?.length > 0 && (
                                    <button className="episode-panel-filter-all" title="Generate AI filters (nudity & sex) for all episodes that don't have one"
                                        onClick={() => generateFilter(episodePanel.names.map(n => `${episodePanel.title}/${n}`))}>
                                        <MdFilterAlt /> Filter all
                                    </button>
                                )}
                                {isAdmin && episodePanel.names?.length > 0 && (
                                    <button className="episode-panel-filter-all" title="Generate subtitles from the speech (AI) for all episodes that don't have generated ones"
                                        onClick={() => generateSubtitles(episodePanel.names.map(n => `${episodePanel.title}/${n}`))}>
                                        <MdSubtitles /> Subtitles all
                                    </button>
                                )}
                                <button className="episode-panel-close" onClick={closeEpisodePanel}>
                                    <MdClose />
                                </button>
                            </div>
                            <div className="episode-panel-list" ref={epListRef} tabIndex={-1} style={{ outline: 'none' }} onKeyDown={handleEpKeyDown}>
                                {episodePanel.videos.map((video, index) => {
                                    const rawName = episodePanel.names?.[index] || video?.split?.("/")?.reverse?.()?.[0] || `Episode ${index + 1}`;
                                    const nameParts = rawName.split("/");
                                    const name = nameParts.length > 1
                                        ? `${nameParts[nameParts.length - 2]} / ${nameParts[nameParts.length - 1]}`
                                        : rawName;
                                    const progress = StorageHelper.getContentProgress({ videoName: name });
                                    const isEpFocused = focusedEpIndex === index;
                                    return (
                                        <div
                                            key={video}
                                            ref={isEpFocused ? focusedEpRef : null}
                                            className={`episode-item${isEpFocused ? ' episode-item--focused' : ''}`}
                                            onClick={() => playEpisode({
                                                videos: episodePanel.videos,
                                                srts: episodePanel.srts,
                                                filters: episodePanel.filters,
                                                image: episodePanel.image,
                                                index
                                            })}
                                        >
                                            <span className="episode-number">{index + 1}</span>
                                            <span className="episode-name">{name}</span>
                                            {progress > 0 && (
                                                <FaEye className="episode-watched" title="In progress" />
                                            )}
                                            {isAdmin && episodePanel.names?.[index] && (() => {
                                                const epPath = `${episodePanel.title}/${episodePanel.names[index]}`;
                                                const p = filterProgressFor(epPath);
                                                const hasFilter = (episodePanel.filters || []).some(f => f && decodeURIComponent(f.split('?')[0]).endsWith(`/${episodePanel.names[index]}.txt`));
                                                return p !== null
                                                    ? <span className="episode-ai-progress" title="AI is working on this episode">AI {Math.round(p * 100)}%</span>
                                                    : (
                                                        <>
                                                            <button className="episode-filter-btn"
                                                                title="Generate subtitles (AI speech transcription)"
                                                                onClick={e => { e.stopPropagation(); generateSubtitles([epPath]); }}>
                                                                <MdSubtitles />
                                                            </button>
                                                            <button className={`episode-filter-btn${hasFilter ? ' has-filter' : ''}`}
                                                                title={hasFilter ? 'Has a filter — regenerate with AI' : 'Generate filter (AI: nudity & sex scenes)'}
                                                                onClick={e => { e.stopPropagation(); generateFilter([epPath]); }}>
                                                                <MdFilterAlt />
                                                            </button>
                                                        </>
                                                    );
                                            })()}
                                            {isAdmin && (
                                                <button
                                                    className="episode-delete-btn"
                                                    title="Delete episode"
                                                    onClick={e => { e.stopPropagation(); deleteEpisode(index); }}
                                                >
                                                    <FaTrash />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="episode-panel-resize-handle" onMouseDown={onEpResizeMouseDown} onClick={e => e.stopPropagation()} />
                    </div>
                )}

                {/* Download history panel */}
                {showHistory && (
                    <div className="dl-history-overlay" onClick={() => setShowHistory(false)}>
                        <div className="dl-history-panel" ref={historyPanelRef} tabIndex={-1} style={{ outline: 'none' }} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') setShowHistory(false); }}>
                            <div className="dl-history-header">
                                <span>Downloads</span>
                                <div className="dl-history-header-actions">
                                    {dlHistory.length > 0 && (
                                        <button className="filters-toolbar-btn" onClick={clearHistory}>Clear</button>
                                    )}
                                    <button className="episode-panel-close" onClick={() => setShowHistory(false)}><MdClose /></button>
                                </div>
                            </div>
                            {(Object.values(dlJobs).filter(job => !job.done || job.error).length === 0 && dlHistory.length === 0) ? (
                                <div className="dl-history-empty">No downloads yet</div>
                            ) : (
                                <div className="dl-history-list">
                                    {Object.values(dlJobs)
                                        .filter(job => !job.done || job.error)
                                        .sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1))
                                        .map(job => (
                                        <div key={job.clientId} className={`dl-history-item dl-history-item--active${job.error ? ' dl-history-item--error' : ''}`}>
                                            <div className="dl-history-item-top">
                                                <span className="dl-history-status">{job.error ? '✗' : job.done ? '✓' : '↓'}</span>
                                                <span className="dl-history-folder">{job.folderLabel}</span>
                                                {job.error && job.done && (
                                                    <button className="dl-history-retry-btn" title="Retry" onClick={() => retryJob(job)}>↺ Retry</button>
                                                )}
                                                <button className="ytdlp-job-remove" onClick={() => removeJob(job.clientId)} title="Remove">✕</button>
                                            </div>
                                            <div className="dl-history-url" title={job.url}>{job.filename || job.url}</div>
                                            {!job.done && (
                                                <div className="ytdlp-bar-wrap">
                                                    <div className="ytdlp-bar" style={{ width: `${job.percent}%` }} />
                                                </div>
                                            )}
                                            <div className="ytdlp-status">
                                                {job.error ? (job.errorMsg || job.statusLine) : job.done ? '✓ Done' : job.statusLine}
                                            </div>
                                        </div>
                                    ))}
                                    {dlHistory.map(entry => {
                                        const playable = entry.status === 'done' && entry.filename && isVideoFilename(entry.filename);
                                        return (
                                            <div key={entry.id} className={`dl-history-item dl-history-item--${entry.status}`}>
                                                <div className="dl-history-item-top">
                                                    <span className={`dl-history-status`}>{entry.status === 'done' ? '✓' : entry.status === 'interrupted' ? '⏸' : '✗'}</span>
                                                    <span className="dl-history-folder">{entry.folderPath?.split('/').pop()}</span>
                                                    <span className="dl-history-date">{new Date(entry.completedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                    {entry.status === 'interrupted' && <span className="dl-history-resumed-hint">Interrupted — resumed automatically</span>}
                                                    {playable && (
                                                        <button className="dl-history-retry-btn" title="Play" onClick={() => playDownload(entry)}>▶ Play</button>
                                                    )}
                                                    {entry.status !== 'done' && (
                                                        <button className="dl-history-retry-btn" title="Retry (replace existing)" onClick={() => retryHistoryDownload(entry)}>↺ Retry</button>
                                                    )}
                                                </div>
                                                <div className="dl-history-url" title={entry.url}>{entry.filename || entry.url}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* Portalled so the Store's own layout can't clip it; React events still bubble
                    to this body, which keeps clicks in the chat from closing the Store. */}
                {isAdmin && (
                    <AutoFilterJobs
                        domain={autoFilterDomain}
                        jobs={shownFilterJobs}
                        onDismiss={() => setDismissedJobs(new Set(filterJobs.map(j => j.id)))}
                    />
                )}
                {aiItem && createPortal(
                    <AIChat domain={localStorage.getItem('domain')} item={aiItem} onClose={() => setAiItem(null)} onChanged={resync} />,
                    document.body
                )}
            </div>
        </div>
    );
}

export default connect(
    null,
    { setSubtitle, setFilterItems, setModalOpen, setVideoSrc, setVideoName, setDuration, setTime }
)(FilterPicker);
