import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { MdClose, MdSync, MdArrowUpward, MdArrowDownward, MdShuffle, MdFileDownload } from 'react-icons/md'
import FileRecord from './FileRecordLocal'
import * as API from '../../common/API/API'
import { authFetch, getUser } from '../../common/auth'

import { connect } from "react-redux";
import { setFilterItems, setSubtitle, setModalOpen, setVideoSrc, setVideoName, setDuration, setTime } from '../../redux/actions'

import "./style.css"
import { useAlert } from 'react-alert';
import StorageHelper from '../../Helpers/StorageHelper';
import { FaEye, FaTrash } from 'react-icons/fa';

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
    window.location.href = str;
    window.location.reload();
}

function FilterPicker({
    close,
    setModalOpen,
    folders: foldersProp,
    path,
    videoPath,
    apiUrl,
}) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedFolder, setSelectedFolder] = useState("");
    const [sortBy, setSortBy] = useState(localStorage.getItem("sortBy") || "alphabet");
    const [filterText, setFilterText] = useState(localStorage.getItem("filterText") || "");
    const [sortAsc, setSortAsc] = useState(true);
    const [randomPicks, setRandomPicks] = useState(null);
    const [favorites, setFavorites] = useState(() => {
        try { return JSON.parse(localStorage.getItem('favorites') || '[]'); } catch { return []; }
    });
    const [episodePanel, setEpisodePanel] = useState(null); // { title, image, videos, srts, filters }
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionIndex, setSuggestionIndex] = useState(-1);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const searchRef = useRef(null);
    const [focusedEpIndex, setFocusedEpIndex] = useState(0);
    const [folders, setFolders] = useState(foldersProp || []);
    const [syncing, setSyncing] = useState(false);
    const [epPanelWidth, setEpPanelWidth] = useState(() => {
        const saved = Number(localStorage.getItem('epPanelWidth'));
        return saved >= 280 && saved <= 900 ? saved : 520;
    });
    const epDragging = useRef(false);
    const epDragStartX = useRef(0);
    const epDragStartWidth = useRef(0);
    const containerRef = useRef();
    const focusedCardRef = useRef(null);
    const focusedEpRef = useRef(null);
    const epListRef = useRef(null);
    const alert = useAlert();

    const [lastSync, setLastSync] = useState(() => {
        const t = localStorage.getItem(`storeCacheTime_${apiUrl}`);
        return t ? Number(t) : null;
    });
    const [newFolderName, setNewFolderName] = useState('');
    const [showNewFolder, setShowNewFolder] = useState(null); // null | parentFolderName
    const [renamingTab, setRenamingTab] = useState(null); // null | folderName
    const [renameTabValue, setRenameTabValue] = useState('');
    const [dragOver, setDragOver] = useState(null); // tab name being dragged over
    const [cardDragOver, setCardDragOver] = useState(null); // card folder being dragged over
    const dragItem = useRef(null); // item being dragged
    const modalBodyRef = useRef(null);
    const dndRef = useRef({});
    const isAdmin = getUser()?.role === 'admin';

    const [showDownload, setShowDownload] = useState(null); // null | folderPath string
    const [downloadUrl, setDownloadUrl] = useState('');
    const [dlJobs, setDlJobs] = useState({}); // { [clientId]: job }
    const dlEsRefs = useRef({});              // { [clientId]: EventSource }
    const dlRetryCounts = useRef({});         // { [clientId]: number }
    const MAX_DL_RETRIES = 3;
    const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
    const [moving, setMoving] = useState(false);

    // Native drag-and-drop event delegation on the modal body
    useEffect(() => {
        if (!isAdmin) return;
        const el = modalBodyRef.current;
        if (!el) return;

        const onDragOver = e => {
            e.preventDefault();
            const { dragItem, setDragOver, setCardDragOver } = dndRef.current;
            const tab = e.target.closest('[data-tabfolder]');
            const card = e.target.closest('[data-cardfolder]');
            setDragOver(tab ? tab.dataset.tabfolder : null);
            setCardDragOver(card && card.dataset.cardfolder !== dragItem.current ? card.dataset.cardfolder : null);
        };

        const onDrop = e => {
            e.preventDefault();
            const { moveFolder, dragItem, setDragOver, setCardDragOver } = dndRef.current;
            const from = dragItem.current;
            setDragOver(null);
            setCardDragOver(null);
            dragItem.current = null;
            if (!from) return;
            const tab = e.target.closest('[data-tabfolder]');
            const card = e.target.closest('[data-cardfolder]');
            if (tab && from.split('/')[0] !== tab.dataset.tabfolder) {
                moveFolder(from, tab.dataset.tabfolder);
            } else if (card && card.dataset.cardfolder !== from) {
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
            const { setDragOver, setCardDragOver, dragItem } = dndRef.current;
            dragItem.current = null;
            setDragOver(null);
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

    const startDownload = async ({ url: urlArg, folderPath: folderPathArg, clientId: existingClientId } = {}) => {
        const url = (urlArg !== undefined ? urlArg : downloadUrl).trim();
        const folderPath = folderPathArg !== undefined ? folderPathArg : showDownload;
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
                clientId, url, folderPath, folderLabel,
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
                body: JSON.stringify({ url, folderPath }),
            });
            if (!res.ok) {
                setDlJobs(prev => prev[clientId] ? { ...prev, [clientId]: { ...prev[clientId], done: true, error: true, errorMsg: 'Failed to start' } } : prev);
                return;
            }
            const { jobId } = await res.json();
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
                        if (!hasError) { clearLocalCache(); resync(); }
                    }
                } else {
                    const text = msg.text || '';
                    const prog = text.match(/\[download\]\s+([\d.]+)%\s+of\s+([\S]+)\s+at\s+([\S]+)\s+ETA\s+(\S+)/);
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

    const closeDownload = () => {
        setShowDownload(null);
        setDownloadUrl('');
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
            clearLocalCache();
            resync();
        } catch { alert.error('Error moving folder'); }
        finally { setMoving(false); }
    };

    // Keep dndRef current so native event handlers always see latest values
    dndRef.current = { moveFolder, dragItem, setDragOver, setCardDragOver };

    const clearLocalCache = () => {
        localStorage.removeItem(`storeCache_${apiUrl}`);
        localStorage.removeItem(`storeCacheTime_${apiUrl}`);
        if (window.__storeCache) delete window.__storeCache[apiUrl];
    };

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
            clearLocalCache();
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
            clearLocalCache();
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
            clearLocalCache();
            resync();
        } catch { alert.error('Error deleting folder'); }
    };

    const createFolder = async () => {
        const name = newFolderName.trim();
        const parent = showNewFolder;
        if (!name || !parent) return;
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
            clearLocalCache();
            resync();
        } catch { alert.error('Error creating folder'); }
    };

    const resync = async () => {
        if (!apiUrl || syncing) return;
        setSyncing(true);
        // Clear all caches first so we always get fresh data
        localStorage.removeItem(`storeCache_${apiUrl}`);
        localStorage.removeItem(`storeCacheTime_${apiUrl}`);
        if (window.__storeCache) delete window.__storeCache[apiUrl];
        try {
            // Admin: force server to re-scan disk before fetching
            const refreshUrl = apiUrl.replace(/\/+$/, '') + '/refresh';
            if (isAdmin) {
                await authFetch(refreshUrl, { method: 'POST' }).catch(() => {});
            }
            const response = await authFetch(apiUrl, {
                method: "GET",
                headers: { accept: "application/json" },
            });
            if (response.status === 401) {
                console.error('Unauthorized');
                setSyncing(false);
                return;
            }
            const data = await response.json();
            const now = Date.now();
            localStorage.setItem(`storeCache_${apiUrl}`, JSON.stringify(data.files));
            localStorage.setItem(`storeCacheTime_${apiUrl}`, String(now));
            window.__storeCache = window.__storeCache || {};
            window.__storeCache[apiUrl] = data.files;
            setFolders(data.files);
            setLastSync(now);
        } catch (e) {
            console.error(e);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        localStorage.setItem("sortBy", sortBy);
    }, [sortBy]);

    const localFolders = useMemo(() => {
        const container = {};
        folders.forEach((folder) => {
            const folderName = folder?.folder?.split?.("/")?.[0] || "";
            if (!container.hasOwnProperty(folderName)) {
                container[folderName] = [];
            }
            container[folderName].push(folder);
        });

        Object.keys(container).forEach((key) => {
            if (sortBy === 'date') {
                container[key] = container[key].sort((a, b) => Number(b.time) - Number(a.time));
            } else if (sortBy === 'alphabet') {
                container[key] = container[key].sort((a, b) => (a.folder || '').localeCompare(b.folder || ''));
            }
        });

        setSelectedIndex(Number(localStorage.getItem("selectedIndex")) || 0);
        return container;
    }, [folders, sortBy]);

    useEffect(() => {
        const folder = Object.keys(localFolders || {})?.[selectedIndex] || "";
        setSelectedFolder(folder);
    }, [selectedIndex, localFolders]);

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

    // Restore scroll position
    useEffect(() => {
        const savedScroll = parseInt(sessionStorage["scrollValue"] || '0', 10);
        if (containerRef.current) {
            setTimeout(() => {
                containerRef.current.scrollTop = savedScroll;
            }, 200);
        }
    }, []);

    const handleScroll = () => {
        sessionStorage["scrollValue"] = containerRef.current.scrollTop;
    };

    const allFolderNames = useMemo(() => {
        const seen = new Set();
        Object.values(localFolders).forEach(items =>
            items.forEach(item => item?.folder && seen.add(item.folder))
        );
        return [...seen];
    }, [localFolders]);

    const suggestions = useMemo(() => {
        if (!filterText || filterText.length < 1) return [];
        const q = filterText.toLowerCase();
        return allFolderNames.filter(f => f.toLowerCase().includes(q)).slice(0, 8);
    }, [filterText, allFolderNames]);

    const applySuggestion = useCallback((value) => {
        setFilterText(value.toLowerCase());
        localStorage.setItem("filterText", value.toLowerCase());
        setShowSuggestions(false);
        setSuggestionIndex(-1);
    }, []);

    const textChanged = (e) => {
        const val = e.target.value.toLowerCase();
        setFilterText(val);
        localStorage.setItem("filterText", val);
        setShowSuggestions(true);
        setSuggestionIndex(-1);
    };

    const onSearchKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            setSuggestionIndex(i => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            setSuggestionIndex(i => Math.max(i - 1, -1));
        } else if (e.key === 'Enter') {
            if (suggestionIndex >= 0) {
                e.preventDefault();
                applySuggestion(suggestions[suggestionIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setSuggestionIndex(-1);
        }
    };

    const selectTab = (index) => {
        setSelectedIndex(index);
        localStorage.setItem("selectedIndex", index);
        sessionStorage.removeItem("scrollValue");
        if (containerRef.current) containerRef.current.scrollTop = 0;
    };

    // Reset card focus when folder/filter/items change
    useEffect(() => { setFocusedIndex(-1); }, [selectedFolder, filterText, randomPicks]);

    // Scroll focused card into view
    useEffect(() => { focusedCardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [focusedIndex]);

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

    const closeEpisodePanel = (e) => {
        e?.stopPropagation();
        setEpisodePanel(null);
    };

    const playEpisode = ({ videos, srts, filters, index, image }) => {
        StorageHelper.saveToCurrentList({ videos, srts, filters, index });
        openContent({ video: videos[index], srt: srts[index], filter: filters[index], image });
    };

    const deleteEpisode = async (index) => {
        const ep = episodePanel;
        const name = ep.names?.[index] || ep.videos[index]?.split('/')?.pop();
        if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
        const domain = localStorage.getItem('domain');
        const folderPath = ep.title;
        const filesToDelete = [
            ep.names?.[index] && `${folderPath}/${ep.names[index]}`,
            ep.srts?.[index] && ep.srts[index].split('/public/')[1],
            ep.filters?.[index] && ep.filters[index].split('/public/')[1],
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
            clearLocalCache();
            resync();
        } catch { alert.error('Error deleting episode'); }
    };

    const openItem = (item) => {
        const isMulti = item.files.filter(f => f.type === 'MEDIA').length > 1;
        if (isMulti) {
            let imageFiles = item.files.filter(f => f.type === 'IMAGE');
            let videos = item.files.filter(f => f.type === 'MEDIA');
            let srts = item.files.filter(f => f.type === 'SRT');
            let filters = item.files.filter(f => f.type === 'FILTER');
            const image = imageFiles.length ? `${path}/${item.folder}/${imageFiles[0].name}` : '';
            openEpisodePanel({ title: item.folder, image, names: videos.map(v => v.name), videos: videos.map(v => `${videoPath}/${item.folder}/${v.name}`), srts: srts.map(s => `${path}/${item.folder}/${s.name}`), filters: filters.map(f => `${path}/${item.folder}/${f.name}`) });
        } else {
            const imageFiles = item.files.filter(f => f.type === 'IMAGE');
            const videoFile = item.files.find(f => f.type === 'MEDIA');
            const srtFile = item.files.find(f => f.type === 'SRT');
            const filterFile = item.files.find(f => f.type === 'FILTER');
            const image = imageFiles.length ? `${path}/${item.folder}/${imageFiles[0].name}` : '';
            const video = videoFile ? `${videoPath}/${item.folder}/${videoFile.name}` : undefined;
            const srt = srtFile ? `${path}/${item.folder}/${srtFile.name}` : undefined;
            const filter = filterFile ? `${path}/${item.folder}/${filterFile.name}` : undefined;
            StorageHelper.saveToCurrentList({ videos: [video], srts: [srt], filters: [filter], index: 0 });
            openContent({ video, srt, filter, image });
        }
    };

    const getColumns = () => {
        if (!containerRef.current) return 1;
        return Math.max(1, Math.floor((containerRef.current.clientWidth - 40 + 16) / (180 + 16)));
    };

    const handleKeyDown = (e) => {
        if (e.target.tagName === 'INPUT') return;
        const count = displayItems.length;
        if (count === 0) return;
        switch (e.key) {
            case 'ArrowRight':
                e.preventDefault();
                setFocusedIndex(i => i < count - 1 ? i + 1 : i === -1 ? 0 : i);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                setFocusedIndex(i => i > 0 ? i - 1 : 0);
                break;
            case 'ArrowDown': {
                e.preventDefault();
                const cols = getColumns();
                setFocusedIndex(i => { const n = (i === -1 ? 0 : i) + cols; return n < count ? n : i === -1 ? 0 : i; });
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

    const currentItems = localFolders[selectedFolder] || [];
    const filteredItems = filterText
        ? currentItems.filter(item => item?.folder?.toLowerCase()?.includes(filterText))
        : currentItems;

    const toggleFavorite = (folder) => {
        setFavorites(prev => {
            const next = prev.includes(folder) ? prev.filter(f => f !== folder) : [...prev, folder];
            StorageHelper.setFolderFavorites(next);
            return next;
        });
    };

    const baseItems = randomPicks || (sortAsc ? filteredItems : [...filteredItems].reverse());
    const displayItems = [...baseItems].sort((a, b) => {
        const aFav = favorites.includes(a.folder) ? -1 : 1;
        const bFav = favorites.includes(b.folder) ? -1 : 1;
        return aFav - bFav;
    });

    const pickRandom = () => {
        if (randomPicks) { setRandomPicks(null); return; }
        const pool = [...filteredItems];
        const picks = [];
        while (picks.length < 5 && pool.length > 0) {
            const i = Math.floor(Math.random() * pool.length);
            picks.push(pool.splice(i, 1)[0]);
        }
        setRandomPicks(picks);
    };

    return (
        <div className="filters-container">
            <div className="filters-container-body" ref={modalBodyRef}>
                <MdClose className="filters-container-close" onClick={close} />

                {/* Toolbar */}
                <div className="filters-container-toolbar">
                    <div className="filters-search-wrap" ref={searchRef}>
                        <input
                            className="filters-container-input"
                            placeholder="Search..."
                            onChange={textChanged}
                            onKeyDown={onSearchKeyDown}
                            onFocus={() => filterText && setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                            value={filterText}
                        />
                        {showSuggestions && suggestions.length > 0 && (
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
                        </div>
                    )}
                </div>

                {/* Search action buttons */}
                <div className="filters-search-actions">
                    <button className="filters-toolbar-btn" onClick={() => { setSortAsc(a => !a); setRandomPicks(null); }} title={sortAsc ? 'Sort descending' : 'Sort ascending'}>
                        {sortAsc ? <MdArrowUpward /> : <MdArrowDownward />}
                        {sortAsc ? 'Ascending' : 'Descending'}
                    </button>
                    <button className={`filters-toolbar-btn ${randomPicks ? 'filters-toolbar-btn--active' : ''}`} onClick={pickRandom} title={randomPicks ? 'Clear random picks' : 'Random 5 picks'}>
                        <MdShuffle />
                        {randomPicks ? 'Clear picks' : 'Random 5'}
                    </button>
                    <select
                        className="filters-sortby-select"
                        value={sortBy}
                        onChange={e => { setSortBy(e.target.value); setRandomPicks(null); }}
                    >
                        <option value="alphabet">A → Z</option>
                        <option value="date">Latest</option>
                        <option value="none">Default</option>
                    </select>
                </div>

                {/* Folder tabs */}
                <div className="folder-tabs">
                    {Object.keys(localFolders || {}).map((folder, index) => (
                        <div
                            key={folder}
                            data-tabfolder={folder}
                            className={`folder-tab ${index === selectedIndex ? 'active' : ''}${dragOver === folder ? ' folder-tab--drop-target' : ''}`}
                            onClick={() => { if (renamingTab === folder) return; selectTab(index); setShowNewFolder(null); setNewFolderName(''); }}
                        >
                            {renamingTab === folder ? (
                                <input
                                    className="folder-tab-rename-input"
                                    autoFocus
                                    value={renameTabValue}
                                    onChange={e => setRenameTabValue(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') renameTab(folder, renameTabValue); if (e.key === 'Escape') { setRenamingTab(null); setRenameTabValue(''); } }}
                                    onBlur={() => renameTab(folder, renameTabValue)}
                                />
                            ) : (
                                <>
                                    {folder || '(root)'}
                                    <span className="folder-tab-count">{localFolders[folder].length}</span>
                                    {isAdmin && (
                                        <>
                                            <span className="folder-tab-add" title="Create folder here"
                                                onClick={e => { e.stopPropagation(); selectTab(index); setShowNewFolder(folder); setNewFolderName(''); }}>+</span>
                                            <span className="folder-tab-rename" title="Rename"
                                                onClick={e => { e.stopPropagation(); selectTab(index); setRenamingTab(folder); setRenameTabValue(folder); }}>✎</span>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
                {showNewFolder && (
                    <div className="folder-new-input-row">
                        <input
                            className="filters-container-input"
                            placeholder={`New folder in "${showNewFolder}"…`}
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
                            <input
                                className="filters-container-input ytdlp-url-input"
                                placeholder="Paste video URL…"
                                value={downloadUrl}
                                onChange={e => setDownloadUrl(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') startDownload(); if (e.key === 'Escape') closeDownload(); }}
                                autoFocus
                            />
                            <button className="filters-toolbar-btn" onClick={() => startDownload()} disabled={!downloadUrl.trim()}>
                                <MdFileDownload /> Download
                            </button>
                            <button className="filters-toolbar-btn" onClick={closeDownload}>✕</button>
                        </div>
                    </div>
                )}

                {Object.keys(dlJobs).length > 0 && (
                    <div className="ytdlp-jobs">
                        {Object.values(dlJobs).map(job => (
                            <div key={job.clientId} className={`ytdlp-job${job.error ? ' ytdlp-job--error' : job.done ? ' ytdlp-job--done' : ''}`}>
                                <div className="ytdlp-job-header">
                                    <span className="ytdlp-job-folder">⬇ {job.folderLabel}</span>
                                    {job.filename && <span className="ytdlp-job-filename">{job.filename}</span>}
                                    <button className="ytdlp-job-remove" onClick={() => removeJob(job.clientId)} title="Remove">✕</button>
                                </div>
                                <div className="ytdlp-bar-wrap">
                                    <div className="ytdlp-bar" style={{ width: `${job.percent}%` }} />
                                </div>
                                <div className="ytdlp-status">
                                    {job.error ? (job.errorMsg || job.statusLine) : job.done ? '✓ Done' : job.statusLine}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {moving && <div className="ytdlp-moving-banner"><MdSync className="spinning" /> Moving…</div>}

                {/* Cards grid */}
                <div className="filter-files" ref={containerRef} tabIndex={0} onScroll={handleScroll} onKeyDown={handleKeyDown} style={moving ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
                    <div className="cards-grid">
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
                                    />
                                );
                            }

                            if (isMultiEpisode) {
                                let imageFiles = item.files.filter(f => f.type === 'IMAGE');
                                let videos = item.files.filter(f => f.type === 'MEDIA');
                                let srts = item.files.filter(f => f.type === 'SRT');
                                let filters = item.files.filter(f => f.type === 'FILTER');
                                const image = imageFiles.length ? `${path}/${item.folder}/${imageFiles[0].name}` : '';
                                videos = videos.map(v => `${videoPath}/${item.folder}/${v.name}`);
                                srts = srts.map(s => `${path}/${item.folder}/${s.name}`);
                                filters = filters.map(f => `${path}/${item.folder}/${f.name}`);

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
                                        episodeCount={videos.length}
                                        copy={() => openEpisodePanel({ title: item.folder, image, names: item.files.filter(f => f.type === 'MEDIA').map(v => v.name), videos, srts, filters })}
                                        onRename={isAdmin ? newName => renameFolder(item, newName) : undefined}
                                        onDownload={isAdmin ? () => { setDownloadUrl(''); setShowDownload(item.folder); } : undefined}
                                        onDelete={isAdmin ? () => deleteFolder(item) : undefined}
                                        draggable={isAdmin}
                                        onDragStart={isAdmin ? e => { e.dataTransfer.setData('text/plain', item.folder); dragItem.current = item.folder;} : undefined}
                                        dropTarget={isAdmin && cardDragOver === item.folder}
                                        folderKey={item.folder}
                                    />
                                );
                            } else {
                                let imageFiles = item.files.filter(f => f.type === 'IMAGE');
                                let videoFile = item.files.find(f => f.type === 'MEDIA');
                                let srtFile = item.files.find(f => f.type === 'SRT');
                                let filterFile = item.files.find(f => f.type === 'FILTER');
                                const image = imageFiles.length ? `${path}/${item.folder}/${imageFiles[0].name}` : "";
                                const video = videoFile ? `${videoPath}/${item.folder}/${videoFile.name}` : undefined;
                                const srt = srtFile ? `${path}/${item.folder}/${srtFile.name}` : undefined;
                                const filter = filterFile ? `${path}/${item.folder}/${filterFile.name}` : undefined;

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
                                            openContent({ video, srt, filter, image });
                                        }}
                                        onRename={isAdmin ? newName => renameFolder(item, newName) : undefined}
                                        onDownload={isAdmin ? () => { setDownloadUrl(''); setShowDownload(item.folder); } : undefined}
                                        onDelete={isAdmin ? () => deleteFolder(item) : undefined}
                                        draggable={isAdmin}
                                        onDragStart={isAdmin ? e => { e.dataTransfer.setData('text/plain', item.folder); dragItem.current = item.folder;} : undefined}
                                        dropTarget={isAdmin && cardDragOver === item.folder}
                                        folderKey={item.folder}
                                    />
                                );
                            }
                        })}
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
            </div>
        </div>
    );
}

export default connect(
    null,
    { setSubtitle, setFilterItems, setModalOpen, setVideoSrc, setVideoName, setDuration, setTime }
)(FilterPicker);
