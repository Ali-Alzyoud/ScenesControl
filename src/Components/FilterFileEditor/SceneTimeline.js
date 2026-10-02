import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectTime, selectDuration, selectVideoSrc } from '../../redux/selectors';
import { setTime, setPlayerState } from '../../redux/actions';
import { authFetch } from '../../common/auth';
import { libraryPath } from '../../common/episodes';
import { setRectsHidden, useRectsHidden } from '../../common/editorState';
import './SceneTimeline.css';

// Trim timeline for the selected filter record, like a video editor's: a strip of frames around
// the scene with its start and end as draggable handles (or drag the scene itself to move it).
// While dragging, the player shows the exact frame at the handle. Changes are committed on release.
const MIN_LEN = 0.3;
const THUMB_H = 72;

const fmt = (t) => {
    const s = Math.max(0, t);
    const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = (s % 60).toFixed(1).padStart(4, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

// The stretch of video shown: the scene plus some context either side.
const windowFor = (from, to, duration) => {
    const pad = Math.min(60, Math.max(5, (to - from) * 0.6));
    return [Math.max(0, from - pad), Math.min(duration || to + pad, to + pad)];
};

export default function SceneTimeline({ record, onCommit, onDelete, onPrev, onNext }) {
    const dispatch = useDispatch();
    const now = useSelector(selectTime);
    const duration = useSelector(selectDuration);
    const videoSrc = useSelector(selectVideoSrc);
    const video = useMemo(() => libraryPath(videoSrc), [videoSrc]);
    const stripRef = useRef(null);
    const [width, setWidth] = useState(0); // measured before any thumbnails are asked for
    const [range, setRange] = useState([record._from, record._to]); // live while dragging
    const [win, setWin] = useState(() => windowFor(record._from, record._to, duration));
    const [thumbs, setThumbs] = useState([]);
    const drag = useRef(null);
    const rectsHidden = useRectsHidden();
    const hasRect = record.geometries?.length > 0;

    // A different record, or its times changed elsewhere (the time fields): follow it.
    useEffect(() => {
        if (drag.current) return;
        setRange([record._from, record._to]);
        setWin(w => (record._from >= w[0] && record._to <= w[1] ? w : windowFor(record._from, record._to, duration)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [record, record._from, record._to]);
    // Another record selected: a fresh window around it. (Not on its id — editing times changes
    // that — but on the record object itself; the first one is set up by useState above.)
    const firstRecord = useRef(record);
    useEffect(() => {
        if (firstRecord.current === record) return;
        firstRecord.current = record;
        setWin(windowFor(record._from, record._to, duration));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [record]);

    useLayoutEffect(() => {
        const el = stripRef.current;
        if (!el) return;
        setWidth(el.clientWidth || 800);
        const ro = new ResizeObserver(() => setWidth(w => (Math.abs((el.clientWidth || 800) - w) > 40 ? el.clientWidth || 800 : w)));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Frames along the window, loaded one by one (each shows as soon as it arrives).
    const count = Math.min(16, Math.max(5, Math.round(width / 110)));
    useEffect(() => {
        if (!video || !width) return;
        const domain = localStorage.getItem('domain');
        const slot = (win[1] - win[0]) / count;
        const urls = [];
        let cancelled = false;
        setThumbs(Array(count).fill(null));
        Array.from({ length: count }, (_, i) => win[0] + slot * (i + 0.5)).forEach(async (t, i) => {
            try {
                const res = await authFetch(`${domain}/api/v1/files/thumb?video=${encodeURIComponent(video)}&t=${t.toFixed(1)}&height=${THUMB_H}`);
                if (!res.ok || cancelled) return;
                const url = URL.createObjectURL(await res.blob());
                urls.push(url);
                setThumbs(prev => { const next = [...prev]; next[i] = url; return next; });
            } catch {}
        });
        return () => { cancelled = true; urls.forEach(u => URL.revokeObjectURL(u)); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [video, win[0], win[1], count, !!width]);

    const len = Math.max(0.001, win[1] - win[0]);
    const toPct = (t) => ((t - win[0]) / len) * 100;
    const timeAt = (clientX) => {
        const r = stripRef.current.getBoundingClientRect();
        return win[0] + Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * len;
    };

    const begin = (mode) => (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        dispatch(setPlayerState('pause'));
        drag.current = { mode, startX: e.clientX, start: [...range], range: [...range] };
        const move = (ev) => {
            const d = drag.current;
            let [from, to] = d.start;
            const t = timeAt(ev.clientX);
            if (d.mode === 'from') from = Math.min(t, to - MIN_LEN);
            else if (d.mode === 'to') to = Math.max(t, from + MIN_LEN);
            else {
                const shift = ((ev.clientX - d.startX) / stripRef.current.getBoundingClientRect().width) * len;
                const l = to - from;
                from = Math.min(Math.max(d.start[0] + shift, win[0]), win[1] - l);
                to = from + l;
            }
            from = Math.round(from * 10) / 10;
            to = Math.round(to * 10) / 10;
            d.range = [from, to];
            setRange([from, to]);
            dispatch(setTime(d.mode === 'to' ? to : from)); // show that exact frame
        };
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            const [from, to] = drag.current.range;
            drag.current = null;
            if (from !== record._from || to !== record._to) onCommit(from, to);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    // Scrubbing: drag the red playhead (or press anywhere on the strip outside the scene's
    // handles) and the video follows.
    const [scrubAt, setScrubAt] = useState(null);
    const scrub = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        dispatch(setPlayerState('pause'));
        const go = (ev) => {
            const t = Math.round(timeAt(ev.clientX) * 10) / 10;
            setScrubAt(t);
            dispatch(setTime(t));
        };
        go(e);
        const up = () => {
            window.removeEventListener('pointermove', go);
            window.removeEventListener('pointerup', up);
            setScrubAt(null);
        };
        window.addEventListener('pointermove', go);
        window.addEventListener('pointerup', up);
    };

    const nudge = (which, delta) => {
        let [from, to] = range;
        if (which === 'from') from = Math.max(0, Math.min(from + delta, to - MIN_LEN));
        else to = Math.max(from + MIN_LEN, Math.min(to + delta, duration || to + delta));
        from = Math.round(from * 10) / 10; to = Math.round(to * 10) / 10;
        setRange([from, to]);
        dispatch(setTime(which === 'from' ? from : to));
        onCommit(from, to);
    };

    const [from, to] = range;
    return (
        <div className="scene-timeline" onClick={e => e.stopPropagation()}>
            <div className="scene-timeline-info">
                <span className="scene-timeline-ends">
                    <button onClick={() => nudge('from', -0.5)} title="Start 0.5 s earlier">−</button>
                    <b>{fmt(from)}</b>
                    <button onClick={() => nudge('from', 0.5)} title="Start 0.5 s later">+</button>
                </span>
                <span className="scene-timeline-len">
                    <button className="scene-timeline-nav" onClick={onPrev || undefined} disabled={!onPrev} title="Previous scene">◀ Prev</button>
                    {(to - from).toFixed(1)} s
                    <button className={`scene-timeline-rect${rectsHidden ? ' is-off' : ''}`} disabled={!hasRect}
                        onClick={() => setRectsHidden(!rectsHidden)}
                        title={!hasRect ? 'This scene has no rectangle' : rectsHidden ? 'Show the rectangle on the video again' : 'Hide the rectangle to see the frame underneath'}>
                        {rectsHidden ? '▢ Show rectangle' : '▢ Hide rectangle'}
                    </button>
                    {onDelete && (
                        <button className="scene-timeline-delete" onClick={onDelete} title="Delete this scene (Delete key; Ctrl+Z to undo)">🗑 Delete scene</button>
                    )}
                    <button className="scene-timeline-nav" onClick={onNext || undefined} disabled={!onNext} title="Next scene">Next ▶</button>
                </span>
                <span className="scene-timeline-ends">
                    <button onClick={() => nudge('to', -0.5)} title="End 0.5 s earlier">−</button>
                    <b>{fmt(to)}</b>
                    <button onClick={() => nudge('to', 0.5)} title="End 0.5 s later">+</button>
                </span>
            </div>
            <div className="scene-timeline-strip" ref={stripRef} style={{ height: THUMB_H }}
                onPointerDown={e => { if (e.target === e.currentTarget || e.target.classList.contains('scene-timeline-thumb') || e.target.classList.contains('scene-timeline-shade')) scrub(e); }}>
                {thumbs.map((url, i) => (
                    <div key={i} className="scene-timeline-thumb" style={{ width: `${100 / count}%`, backgroundImage: url ? `url(${url})` : undefined }} />
                ))}
                <div className="scene-timeline-shade" style={{ left: 0, width: `${toPct(from)}%` }} />
                <div className="scene-timeline-shade" style={{ left: `${toPct(to)}%`, right: 0 }} />
                <div className="scene-timeline-range" style={{ left: `${toPct(from)}%`, width: `${toPct(to) - toPct(from)}%` }} onPointerDown={begin('move')} title="Drag to move the scene">
                    <div className="scene-timeline-handle scene-timeline-handle--from" onPointerDown={begin('from')} title="Drag to change the start" />
                    <div className="scene-timeline-handle scene-timeline-handle--to" onPointerDown={begin('to')} title="Drag to change the end" />
                </div>
                {(() => {
                    const at = scrubAt ?? now;
                    return at >= win[0] && at <= win[1] && (
                        <div className={`scene-timeline-playhead${scrubAt !== null ? ' is-dragging' : ''}`} style={{ left: `${toPct(at)}%` }}
                            onPointerDown={scrub} title={`${fmt(at)} — drag to scrub`}>
                            <div className="scene-timeline-playhead-knob" />
                            {scrubAt !== null && <span className="scene-timeline-playhead-time">{fmt(scrubAt)}</span>}
                        </div>
                    );
                })()}
            </div>
            <div className="scene-timeline-scale"><span>{fmt(win[0])}</span><span>{fmt(win[1])}</span></div>
        </div>
    );
}
