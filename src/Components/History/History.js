import React, { useMemo, useState, useRef, useEffect } from 'react'
import { MdClose, MdDeleteSweep } from 'react-icons/md'
import { FaPlayCircle } from 'react-icons/fa'
import StorageHelper from '../../Helpers/StorageHelper'
import { openContent } from '../FilterPickerLocal/FilterPickerLocal'
import './style.css'

const VIDEO_EXTS = ['.mkv', '.mp4', '.webm', '.avi', '.mov', '.m4v', '.ts', '.flv']

function isVideoKey(key) {
    return VIDEO_EXTS.some(ext => key.toLowerCase().endsWith(ext))
}

function formatTime(seconds) {
    if (!seconds || seconds <= 0) return null
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
}

function formatDate(timestamp) {
    if (!timestamp) return ''
    const d = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now - d) / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function History({ close, currentVideo }) {
    const [revision, setRevision] = useState(0)
    const [confirming, setConfirming] = useState(false)
    const currentItemRef = useRef(null)
    const listRef = useRef(null)

    useEffect(() => {
        listRef.current?.focus()
        currentItemRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, [])

    const clearHistory = () => {
        StorageHelper.clearWatchHistory()
        setRevision(r => r + 1)
        setConfirming(false)
    }

    const items = useMemo(() => {
        // Rich data from watchHistory (image, full paths, timestamp)
        const historyMap = {}
        StorageHelper.getWatchHistory().forEach(h => {
            if (h.videoName) historyMap[h.videoName] = h
        })

        // Full paths from currentList for replay
        const replayMap = {}
        try {
            const raw = localStorage.getItem('currentList')
            if (raw) {
                const { videos = [], srts = [], filters = [] } = JSON.parse(raw)
                videos.forEach((videoPath, i) => {
                    const filename = videoPath.split('/').reverse()[0]
                    replayMap[filename] = {
                        videoPath,
                        srtPath: srts[i] || '',
                        filterPath: filters[i] || '',
                    }
                })
            }
        } catch { /* ignore */ }

        const seen = new Set()
        const result = []

        // First: entries from watchHistory (have timestamps + images)
        StorageHelper.getWatchHistory().forEach(h => {
            if (!h.videoName) return
            const progress = StorageHelper.getContentProgress({ videoName: h.videoName })
            seen.add(h.videoName)
            result.push({
                videoName: h.videoName,
                videoPath: h.videoPath || '',
                srtPath: h.srtPath || '',
                filterPath: h.filterPath || '',
                imagePath: h.imagePath || '',
                timestamp: h.timestamp || 0,
                progress,
            })
        })

        // Second: scan all localStorage keys that look like video files
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (!isVideoKey(key)) continue
            if (seen.has(key)) continue
            const progress = Number(localStorage.getItem(key) || 0)
            if (progress <= 0) continue
            const replay = replayMap[key] || {}
            result.push({
                videoName: key,
                videoPath: replay.videoPath || '',
                srtPath: replay.srtPath || '',
                filterPath: replay.filterPath || '',
                imagePath: '',
                timestamp: 0,
                progress,
            })
        }

        // Sort: by timestamp desc (watchHistory items), then by progress desc (legacy)
        result.sort((a, b) => {
            if (a.timestamp && b.timestamp) return b.timestamp - a.timestamp
            if (a.timestamp) return -1
            if (b.timestamp) return 1
            return b.progress - a.progress
        })

        return result
    }, [revision])

    return (
        <div className="history-overlay" onClick={close}>
            <div className="history-modal" onClick={e => e.stopPropagation()}>
                <div className="history-header">
                    <span className="history-title">Watch History</span>
                    {confirming
                        ? <div className="history-confirm">
                            <span>Clear all?</span>
                            <button className="history-confirm-yes" onClick={clearHistory}>Yes</button>
                            <button className="history-confirm-no" onClick={() => setConfirming(false)}>No</button>
                          </div>
                        : <button className="history-clear-btn" onClick={() => setConfirming(true)} title="Clear history">
                            <MdDeleteSweep /><span>Clear</span>
                          </button>
                    }
                    <button className="history-close" onClick={close}><MdClose /></button>
                </div>

                {items.length === 0 ? (
                    <div className="history-empty">
                        <FaPlayCircle />
                        <p>No watch history yet</p>
                    </div>
                ) : (
                    <div className="history-list" ref={listRef} tabIndex={-1} style={{ outline: 'none' }}>
                        {items.map(item => (
                            <HistoryItem key={item.videoName} item={item} itemRef={item.videoName === currentVideo ? currentItemRef : null} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function HistoryItem({ item, itemRef }) {
    const { videoName, videoPath, srtPath, filterPath, imagePath, timestamp } = item
    const progress = StorageHelper.getContentProgress({ videoName })
    const duration = StorageHelper.getContentDuration({ videoName })
    const progressLabel = formatTime(progress)
    const durationLabel = formatTime(duration)
    const pct = duration > 0 ? Math.round(progress / duration * 100) : null
    const dateLabel = formatDate(timestamp)
    const canPlay = !!videoPath

    const play = () => {
        if (!canPlay) return
        openContent({ video: videoPath, srt: srtPath, filter: filterPath, image: imagePath })
    }

    return (
        <div
            ref={itemRef}
            className={`history-item ${canPlay ? '' : 'history-item--no-replay'}`}
            onClick={play}
            title={canPlay ? videoName : 'Path not available — open from store to replay'}
        >
            <div className="history-item-thumb">
                {imagePath
                    ? <img src={imagePath} alt="" />
                    : <div className="history-item-thumb-placeholder"><FaPlayCircle /></div>
                }
                {pct !== null && (
                    <div className="history-item-thumb-bar">
                        <div className="history-item-thumb-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                )}
            </div>

            <div className="history-item-info">
                <span className="history-item-name">{videoName}</span>
                <div className="history-item-meta">
                    {progressLabel && durationLabel
                        ? <span className="history-item-time">{progressLabel} / {durationLabel}</span>
                        : progressLabel
                            ? <span className="history-item-time">{progressLabel}</span>
                            : null
                    }
                    {pct !== null && <span className="history-item-pct">{pct}%</span>}
                    {dateLabel && <span className="history-item-date">{dateLabel}</span>}
                </div>
                {!canPlay && <span className="history-item-no-replay">open from store to replay</span>}
            </div>

            {canPlay && (
                <div className="history-item-play">
                    <FaPlayCircle />
                </div>
            )}
        </div>
    )
}
