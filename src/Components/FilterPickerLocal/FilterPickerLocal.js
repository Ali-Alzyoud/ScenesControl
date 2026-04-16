import React, { useEffect, useState } from 'react'
import { MdClose } from 'react-icons/md'
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
    folders,
    path,
    videoPath,
}) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedFolder, setSelectedFolder] = useState("");
    const [byDate, setByDate] = useState(!!localStorage.getItem("byDate"));
    const [filterText, setFilterText] = useState(localStorage.getItem("filterText") || "");
    const [episodePanel, setEpisodePanel] = useState(null); // { title, image, videos, srts, filters }
    const containerRef = useRef();
    const alert = useAlert();

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

    const currentItems = localFolders[selectedFolder] || [];
    const filteredItems = filterText
        ? currentItems.filter(item => item?.folder?.toLowerCase()?.includes(filterText))
        : currentItems;

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
                        </div>
                    ))}
                </div>

                {/* Cards grid */}
                <div className="filter-files" ref={containerRef} tabIndex={0} onScroll={handleScroll}>
                    <div className="cards-grid">
                        {filteredItems.map((item) => {
                            const isMultiEpisode = item.files.filter(
                                f => f.endsWith(".mkv") || f.endsWith(".mp4") || f.endsWith(".webm")
                            ).length > 1;

                            if (isMultiEpisode) {
                                let imageFiles = item.files.filter(f => f.endsWith(".jpg") || f.endsWith(".png"));
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
                                        imgSrc={image}
                                        title={item.folder}
                                        isMultiEpisode
                                        copy={() => openEpisodePanel({ title: item.folder, image, videos, srts, filters })}
                                    />
                                );
                            } else {
                                let imageFiles = item.files.filter(f => f.includes(".jpg") || f.includes(".png"));
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
                            <div className="episode-panel-list">
                                {episodePanel.videos.map((video, index) => {
                                    const name = video?.split?.("/")?.reverse?.()?.[0] || `Episode ${index + 1}`;
                                    const progress = StorageHelper.getContentProgress({ videoName: name });
                                    return (
                                        <div
                                            key={video}
                                            className="episode-item"
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
