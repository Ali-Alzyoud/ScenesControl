import React, { useEffect, useState } from 'react'
import { MdClose, MdSync, MdArrowUpward, MdArrowDownward, MdShuffle } from 'react-icons/md'
import FileRecord from './FileRecordLocal'
import * as API from '../../common/API/API'

import { connect } from "react-redux";
import { setFilterItems, setSubtitle, setModalOpen, setVideoSrc, setVideoName, setDuration, setTime } from '../../redux/actions'

import "./style.css"
import { useAlert } from 'react-alert';
import { useRef } from 'react';
import { useMemo } from 'react';
import StorageHelper from '../../Helpers/StorageHelper';
import { FaEye } from 'react-icons/fa';

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
    const [byDate, setByDate] = useState(!!localStorage.getItem("byDate"));
    const [filterText, setFilterText] = useState(localStorage.getItem("filterText") || "");
    const [sortAsc, setSortAsc] = useState(true);
    const [randomPicks, setRandomPicks] = useState(null);
    const [favorites, setFavorites] = useState(() => {
        try { return JSON.parse(localStorage.getItem('favorites') || '[]'); } catch { return []; }
    });
    const [episodePanel, setEpisodePanel] = useState(null); // { title, image, videos, srts, filters }
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [focusedEpIndex, setFocusedEpIndex] = useState(0);
    const [folders, setFolders] = useState(foldersProp || []);
    const [syncing, setSyncing] = useState(false);
    const containerRef = useRef();
    const focusedCardRef = useRef(null);
    const focusedEpRef = useRef(null);
    const epListRef = useRef(null);
    const alert = useAlert();

    const [lastSync, setLastSync] = useState(() => {
        const t = localStorage.getItem(`storeCacheTime_${apiUrl}`);
        return t ? Number(t) : null;
    });

    const resync = async () => {
        if (!apiUrl || syncing) return;
        setSyncing(true);
        try {
            const response = await fetch(apiUrl, {
                method: "GET",
                headers: { accept: "application/json" },
            });
            const data = await response.json();
            const now = Date.now();
            localStorage.setItem(`storeCache_${apiUrl}`, JSON.stringify(data.files));
            localStorage.setItem(`storeCacheTime_${apiUrl}`, String(now));
            setFolders(data.files);
            setLastSync(now);
        } catch (e) {
            alert.error?.(e.message) || console.error(e);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        localStorage.setItem("byDate", byDate ? "1" : "")
    }, [byDate]);

    const localFolders = useMemo(() => {
        const container = {};
        folders.forEach((folder) => {
            const folderName = folder?.folder?.split?.("/")?.[0] || "";
            if (!container.hasOwnProperty(folderName)) {
                container[folderName] = [];
            }
            container[folderName].push(folder);
        });

        if (byDate) {
            Object.keys(container).forEach((key) => {
                container[key] = container[key].sort((a, b) => Number(b.time) - Number(a.time));
            });
        }
        setSelectedIndex(Number(localStorage.getItem("selectedIndex")) || 0);
        return container;
    }, [folders, byDate]);

    useEffect(() => {
        const folder = Object.keys(localFolders || {})?.[selectedIndex] || "";
        setSelectedFolder(folder);
    }, [selectedIndex, localFolders]);

    useEffect(() => {
        API.getMediaRecords();
        setModalOpen(true);
        return () => {
            setModalOpen(false);
            alert.removeAll();
        };
    }, []);

    useEffect(() => {
        if (containerRef.current) {
            setTimeout(() => {
                if (containerRef.current) {
                    containerRef.current.focus();
                    containerRef.current.tabIndex = 0;
                }
            }, 1000);
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

    const textChanged = (e) => {
        const val = e.target.value.toLowerCase();
        setFilterText(val);
        localStorage.setItem("filterText", val);
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

    const openEpisodePanel = ({ title, image, videos, srts, filters }) => {
        setEpisodePanel({ title, image, videos, srts, filters });
    };

    const closeEpisodePanel = (e) => {
        e?.stopPropagation();
        setEpisodePanel(null);
    };

    const playEpisode = ({ videos, srts, filters, index, image }) => {
        StorageHelper.saveToCurrentList({ videos, srts, filters, index });
        openContent({ video: videos[index], srt: srts[index], filter: filters[index], image });
    };

    const openItem = (item) => {
        const isMulti = item.files.filter(f => f.endsWith('.mkv') || f.endsWith('.mp4') || f.endsWith('.webm')).length > 1;
        if (isMulti) {
            let imageFiles = item.files.filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'));
            let videos = item.files.filter(f => f.endsWith('.mkv') || f.endsWith('.mp4') || f.endsWith('.webm'));
            let srts = item.files.filter(f => f.endsWith('.srt'));
            let filters = item.files.filter(f => f.endsWith('mp4.txt') || f.endsWith('mkv.txt') || f.endsWith('webm.txt'));
            const image = imageFiles.length ? `${path}/${item.folder}/${imageFiles[0]}` : '';
            openEpisodePanel({ title: item.folder, image, videos: videos.map(v => `${videoPath}/${item.folder}/${v}`), srts: srts.map(s => `${path}/${item.folder}/${s}`), filters: filters.map(f => `${path}/${item.folder}/${f}`) });
        } else {
            const imageFiles = item.files.filter(f => f.includes('.jpeg') || f.includes('.jpg') || f.includes('.png'));
            const videoFile = item.files.find(f => f.includes('.mkv') || f.includes('.mp4') || f.includes('.webm'));
            const srtFile = item.files.find(f => f.includes('.srt'));
            const filterFile = item.files.find(f => f.includes('mp4.txt') || f.includes('mkv.txt') || f.includes('webm.txt'));
            const image = imageFiles.length ? `${path}/${item.folder}/${imageFiles[0]}` : '';
            const video = videoFile ? `${videoPath}/${item.folder}/${videoFile}` : undefined;
            const srt = srtFile ? `${path}/${item.folder}/${srtFile}` : undefined;
            const filter = filterFile ? `${path}/${item.folder}/${filterFile}` : undefined;
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
            localStorage.setItem('favorites', JSON.stringify(next));
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
            <div className="filters-container-body">
                <MdClose className="filters-container-close" onClick={close} />

                {/* Toolbar */}
                <div className="filters-container-toolbar">
                    <input
                        className="filters-container-input"
                        placeholder="Search..."
                        onChange={textChanged}
                        value={filterText}
                    />
                    <label className="filters-container-sort-toggle">
                        <input
                            type="checkbox"
                            checked={byDate}
                            onChange={() => setByDate(!byDate)}
                        />
                        By Date
                    </label>
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
                </div>

                {/* Folder tabs */}
                <div className="folder-tabs">
                    {Object.keys(localFolders || {}).map((folder, index) => (
                        <div
                            key={folder}
                            className={`folder-tab ${index === selectedIndex ? 'active' : ''}`}
                            onClick={() => selectTab(index)}
                        >
                            {folder || '(root)'}
                            <span className="folder-tab-count">{localFolders[folder].length}</span>
                        </div>
                    ))}
                </div>

                {/* Cards grid */}
                <div className="filter-files" ref={containerRef} tabIndex={0} onScroll={handleScroll} onKeyDown={handleKeyDown}>
                    <div className="cards-grid">
                        {displayItems.map((item, cardIndex) => {
                            const isFocused = focusedIndex === cardIndex;
                            const isFavorite = favorites.includes(item.folder);
                            const isMultiEpisode = item.files.filter(
                                f => f.endsWith(".mkv") || f.endsWith(".mp4") || f.endsWith(".webm")
                            ).length > 1;

                            if (isMultiEpisode) {
                                let imageFiles = item.files.filter(f => f.endsWith(".jpeg") || f.endsWith(".jpg") || f.endsWith(".png"));
                                let videos = item.files.filter(f => f.endsWith(".mkv") || f.endsWith(".mp4") || f.endsWith(".webm"));
                                let srts = item.files.filter(f => f.endsWith(".srt"));
                                let filters = item.files.filter(f => f.endsWith("mp4.txt") || f.endsWith("mkv.txt") || f.endsWith("webm.txt"));
                                const image = imageFiles.length ? `${path}/${item.folder}/${imageFiles[0]}` : '';
                                videos = videos.map(v => `${videoPath}/${item.folder}/${v}`);
                                srts = srts.map(s => `${path}/${item.folder}/${s}`);
                                filters = filters.map(f => `${path}/${item.folder}/${f}`);

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
                                        copy={() => openEpisodePanel({ title: item.folder, image, videos, srts, filters })}
                                    />
                                );
                            } else {
                                let imageFiles = item.files.filter(f => f.includes(".jpeg") || f.includes(".jpg") || f.includes(".png"));
                                let videoFile = item.files.find(f => f.includes(".mkv") || f.includes(".mp4") || f.includes(".webm"));
                                let srtFile = item.files.find(f => f.includes(".srt"));
                                let filterFile = item.files.find(f => f.includes("mp4.txt") || f.includes("mkv.txt") || f.includes("webm.txt"));
                                const image = imageFiles.length ? `${path}/${item.folder}/${imageFiles[0]}` : "";
                                const video = videoFile ? `${videoPath}/${item.folder}/${videoFile}` : undefined;
                                const srt = srtFile ? `${path}/${item.folder}/${srtFile}` : undefined;
                                const filter = filterFile ? `${path}/${item.folder}/${filterFile}` : undefined;

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
                                    />
                                );
                            }
                        })}
                    </div>
                </div>

                {/* Episode panel */}
                {episodePanel && (
                    <div className="episode-panel-overlay" onClick={closeEpisodePanel}>
                        <div className="episode-panel" onClick={e => e.stopPropagation()}>
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
                                    const name = video?.split?.("/")?.reverse?.()?.[0] || `Episode ${index + 1}`;
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
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
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
