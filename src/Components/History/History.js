import React, { useMemo } from 'react'
import { MdClose } from 'react-icons/md'
import { FaPlayCircle, FaEye } from 'react-icons/fa'
import StorageHelper from '../../Helpers/StorageHelper'
import { openContent } from '../FilterPickerLocal/FilterPickerLocal'
import './style.css'

const VIDEO_EXTS = ['.mkv', '.mp4', '.webm', '.avi', '.mov', '.m4v', '.ts', '.flv']

function isVideoKey(key) {
    const k = key.toLowerCase()
    return VIDEO_EXTS.some(ext => k.endsWith(ext))
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

export default function History({ close }) {
    const items = useMemo(() => {
        // Build filename → full entry map from currentList for replay
        const replayMap = {}
        try {
            const raw = localStorage.getItem('currentList')
            if (raw) {
                const { videos = [], srts = [], filters = [] } = JSON.parse(raw)
                const currentIdx = Number(localStorage.getItem('currentListIndex') ?? -1)
                videos.forEach((videoPath, i) => {
                    const filename = videoPath.split('/').reverse()[0]
                    replayMap[filename] = {
                        videoPath,
                        srtPath: srts[i] || '',
                        filterPath: filters[i] || '',
                        isCurrent: i === currentIdx,
                    }
                })
            }
        } catch { /* ignore */ }

        // Collect every localStorage key that looks like a video file with progress > 0
        const result = []
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (!isVideoKey(key)) continue
            const progress = Number(localStorage.getItem(key) || 0)
            if (progress <= 0) continue
            result.push({
                filename: key,
                progress,
                ...(replayMap[key] || {}),
            })
        }

        // Sort by progress descending (highest progress time = most recently active heuristic)
        result.sort((a, b) => b.progress - a.progress)
        return result
    }, [])

    return (
        <div className="history-overlay" onClick={close}>
            <div className="history-modal" onClick={e => e.stopPropagation()}>
                <div className="history-header">
                    <span className="history-title">History</span>
                    <button className="history-close" onClick={close}><MdClose /></button>
                </div>

                {items.length === 0 ? (
                    <div className="history-empty">
                        <FaPlayCircle />
                        <p>No watched videos found</p>
                    </div>
                ) : (
                    <div className="history-list">
                        {items.map(item => (
                            <HistoryItem key={item.filename} item={item} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function HistoryItem({ item }) {
    const { filename, progress, videoPath, srtPath, filterPath, isCurrent } = item
    const canPlay = !!videoPath
    const progressLabel = formatTime(progress)

    const play = () => {
        if (!canPlay) return
        openContent({ video: videoPath, srt: srtPath, filter: filterPath })
    }

    return (
        <div
            className={`history-item ${isCurrent ? 'history-item--current' : ''} ${!canPlay ? 'history-item--no-replay' : ''}`}
            onClick={play}
        >
            <div className="history-item-icon">
                {isCurrent
                    ? <FaPlayCircle className="hi-icon hi-icon--playing" />
                    : <FaEye className="hi-icon hi-icon--watched" />
                }
            </div>

            <div className="history-item-info">
                <span className="history-item-name">{filename}</span>
            </div>

            <div className="history-item-right">
                {progressLabel && <span className="history-item-time">{progressLabel}</span>}
                {isCurrent && <span className="history-item-badge">Now Playing</span>}
                {!canPlay && <span className="history-item-no-replay">no path</span>}
            </div>
        </div>
    )
}
