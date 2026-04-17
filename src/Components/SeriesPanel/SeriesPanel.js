import React, { useMemo, useRef, useEffect } from 'react'
import { MdClose } from 'react-icons/md'
import { FaEye } from 'react-icons/fa'
import StorageHelper from '../../Helpers/StorageHelper'
import { openContent } from '../FilterPickerLocal/FilterPickerLocal'
import './style.css'

export default function SeriesPanel({ close }) {
    const currentItemRef = useRef(null)
    const listRef = useRef(null)

    useEffect(() => {
        listRef.current?.focus()
        currentItemRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, [])

    const { videos, srts, filters, currentIndex } = useMemo(() => {
        try {
            const { videos = [], srts = [], filters = [] } = JSON.parse(localStorage.getItem('currentList') || '{}')
            const currentIndex = Number(localStorage.getItem('currentListIndex') ?? -1)
            return { videos, srts, filters, currentIndex }
        } catch {
            return { videos: [], srts: [], filters: [], currentIndex: -1 }
        }
    }, [])

    if (videos.length === 0) return null

    const seriesTitle = (() => {
        // Try to derive a common series name from the first video path
        const parts = videos[0]?.split('/') || []
        return parts.length >= 2 ? parts[parts.length - 2] : 'Series'
    })()

    const play = (index) => {
        StorageHelper.saveToCurrentList({ videos, srts, filters, index })
        openContent({ video: videos[index], srt: srts[index], filter: filters[index] })
    }

    return (
        <div className="series-overlay" onClick={close}>
            <div className="series-modal" onClick={e => e.stopPropagation()}>
                <div className="series-header">
                    <span className="series-title">{seriesTitle}</span>
                    <button className="series-close" onClick={close}><MdClose /></button>
                </div>

                <div className="series-list" ref={listRef} tabIndex={-1} style={{ outline: 'none' }}>
                    {videos.map((video, index) => {
                        const name = video?.split('/')?.reverse?.()?.[0] || `Episode ${index + 1}`
                        const progress = StorageHelper.getContentProgress({ videoName: name })
                        const duration = StorageHelper.getContentDuration({ videoName: name })
                        const pct = duration > 0 ? Math.round(progress / duration * 100) : null
                        const isCurrent = index === currentIndex

                        return (
                            <div
                                key={video}
                                ref={isCurrent ? currentItemRef : null}
                                className={`series-item ${isCurrent ? 'series-item--current' : ''}`}
                                onClick={() => play(index)}
                            >
                                <span className="series-ep-num">{index + 1}</span>
                                <div className="series-ep-info">
                                    <span className="series-ep-name">{name}</span>
                                    {pct !== null && (
                                        <div className="series-ep-bar">
                                            <div className="series-ep-bar-fill" style={{ width: `${pct}%` }} />
                                        </div>
                                    )}
                                </div>
                                <div className="series-ep-right">
                                    {isCurrent && <span className="series-ep-badge">Playing</span>}
                                    {!isCurrent && progress > 0 && <FaEye className="series-ep-watched" />}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
