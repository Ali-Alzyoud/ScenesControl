import React, { useMemo } from 'react'
import { MdClose } from 'react-icons/md'
import { FaPlayCircle } from 'react-icons/fa'
import StorageHelper from '../../Helpers/StorageHelper'
import { openContent } from '../FilterPickerLocal/FilterPickerLocal'
import './style.css'

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
    const diffMs = now - d
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function History({ close }) {
    const items = useMemo(() => {
        const history = StorageHelper.getWatchHistory()
        // Sort by timestamp descending (latest first)
        return history.slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    }, [])

    return (
        <div className="history-overlay" onClick={close}>
            <div className="history-modal" onClick={e => e.stopPropagation()}>
                <div className="history-header">
                    <span className="history-title">Watch History</span>
                    <button className="history-close" onClick={close}><MdClose /></button>
                </div>

                {items.length === 0 ? (
                    <div className="history-empty">
                        <FaPlayCircle />
                        <p>No watch history yet</p>
                    </div>
                ) : (
                    <div className="history-list">
                        {items.map(item => (
                            <HistoryItem key={item.videoPath || item.videoName} item={item} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function HistoryItem({ item }) {
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
            className={`history-item ${canPlay ? '' : 'history-item--no-replay'}`}
            onClick={play}
            title={canPlay ? videoName : 'Path not available'}
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
                    {progressLabel && durationLabel && <span className="history-item-time">{progressLabel} / {durationLabel}</span>}
                    {progressLabel && !durationLabel && <span className="history-item-time">{progressLabel}</span>}
                    {pct !== null && <span className="history-item-pct">{pct}%</span>}
                    {dateLabel && <span className="history-item-date">{dateLabel}</span>}
                </div>
                {!canPlay && <span className="history-item-no-replay">path unavailable</span>}
            </div>

            {canPlay && (
                <div className="history-item-play">
                    <FaPlayCircle />
                </div>
            )}
        </div>
    )
}
