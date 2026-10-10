import React, { useState } from 'react';
import { MdFilterAlt, MdSubtitles, MdTranslate, MdClose, MdExpandMore, MdExpandLess } from 'react-icons/md';
import { STAGE_LABELS, cancelAutoFilter, isActive, AUTOFILTER_EVENT } from './autoFilter';
import { TRANSCRIBE_STAGE_LABELS, cancelTranscribe, TRANSCRIBE_EVENT } from './transcribe';
import { TRANSLATE_STAGE_LABELS } from './translateJobs';
import './style.css';

// Floating progress panel for the AI jobs: filter generation and subtitle generation (kind 'subtitles').
const isSubtitles = (j) => j.kind === 'subtitles';
const isTranslate = (j) => j.kind === 'translate'; // can't be cancelled
const stageLabels = (j) => (isSubtitles(j) ? TRANSCRIBE_STAGE_LABELS : isTranslate(j) ? TRANSLATE_STAGE_LABELS : STAGE_LABELS);
const jobIcon = (j) => (isSubtitles(j) ? <MdSubtitles /> : isTranslate(j) ? <MdTranslate /> : <MdFilterAlt />);
const cancelJob = (domain, j) => (isSubtitles(j) ? cancelTranscribe(domain, j.id) : cancelAutoFilter(domain, j.id))
    .then(() => window.dispatchEvent(new Event(isSubtitles(j) ? TRANSCRIBE_EVENT : AUTOFILTER_EVENT)));
export default function AutoFilterJobs({ domain, jobs, onDismiss }) {
    const [collapsed, setCollapsed] = useState(false);
    if (!jobs.length) return null;
    const active = jobs.filter(isActive).length;
    return (
        <div className="autofilter-panel" onClick={e => e.stopPropagation()}>
            <div className="autofilter-header">
                <MdFilterAlt />
                <span>{active ? `AI jobs — ${active} in progress` : 'AI jobs — finished'}</span>
                <button onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Show' : 'Hide details'}>{collapsed ? <MdExpandLess /> : <MdExpandMore />}</button>
                {!active && <button onClick={onDismiss} title="Close"><MdClose /></button>}
            </div>
            {!collapsed && (
                <div className="autofilter-list">
                    {jobs.map(j => (
                        <div key={j.id} className={`autofilter-job autofilter-job--${j.status}`}>
                            <div className="autofilter-job-top">
                                <span className="autofilter-job-name" title={j.video}>{jobIcon(j)} {j.name || j.video.split('/').pop()}</span>
                                {isActive(j) && !isTranslate(j) && (
                                    <button className="autofilter-cancel" title="Cancel" onClick={() => cancelJob(domain, j)}>
                                        <MdClose />
                                    </button>
                                )}
                            </div>
                            {isActive(j) ? (
                                <>
                                    <div className="autofilter-bar"><div className="autofilter-bar-fill" style={{ width: `${Math.max(2, Math.round(j.progress * 100))}%` }} /></div>
                                    <div className="autofilter-job-status">{stageLabels(j)[j.stage] || j.stage}… {j.status === 'running' ? `${Math.round(j.progress * 100)}%` : ''}</div>
                                </>
                            ) : (
                                <div className="autofilter-job-status">
                                    {j.status === 'done' ? `✓ ${j.message}` : j.status === 'cancelled' ? 'Cancelled' : `✕ ${j.message}`}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
