import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { MdClose } from 'react-icons/md'
import { FaEye } from 'react-icons/fa'
import StorageHelper from '../../Helpers/StorageHelper'
import { openContent } from '../FilterPickerLocal/FilterPickerLocal'
import './style.css'

const STORAGE_KEY = 'seriesPanelWidth'
const MIN_WIDTH = 280
const MAX_WIDTH = 900

export default function SeriesPanel({ close }) {
    const currentItemRef = useRef(null)
    const listRef = useRef(null)
    const [width, setWidth] = useState(() => {
        const saved = Number(localStorage.getItem(STORAGE_KEY))
        return saved >= MIN_WIDTH && saved <= MAX_WIDTH ? saved : 520
    })
    const dragging = useRef(false)
    const startX = useRef(0)
    const startWidth = useRef(0)

    useEffect(() => {
        listRef.current?.focus()
        currentItemRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, [])

    const onMouseDown = useCallback((e) => {
        dragging.current = true
        startX.current = e.clientX
        startWidth.current = width
        document.body.style.cursor = 'ew-resize'
        document.body.style.userSelect = 'none'
    }, [width])

    useEffect(() => {
        const onMouseMove = (e) => {
            if (!dragging.current) return
            const delta = e.clientX - startX.current
            const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
            setWidth(next)
        }
        const onMouseUp = () => {
            if (!dragging.current) return
            dragging.current = false
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
            setWidth(w => { localStorage.setItem(STORAGE_KEY, w); return w })
        }
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
        return () => {
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
        }
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
        const parts = videos[0]?.split('/') || []
        return parts.length >= 2 ? parts[parts.length - 2] : 'Series'
    })()

    const play = (index) => {
        StorageHelper.saveToCurrentList({ videos, srts, filters, index })
        openContent({ video: videos[index], srt: srts[index], filter: filters[index] })
    }

    return (
        <div className="series-overlay" onClick={close}>
            <div className="series-modal-wrapper" style={{ width }} onClick={e => e.stopPropagation()}>
                <div className="series-modal">
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

                <div className="series-resize-handle" onMouseDown={onMouseDown} />
            </div>
        </div>
    )
}
