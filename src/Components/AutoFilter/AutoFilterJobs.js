import React, { useState } from 'react';
import { MdFilterAlt, MdClose, MdExpandMore, MdExpandLess } from 'react-icons/md';
import { STAGE_LABELS, cancelAutoFilter, isActive } from './autoFilter';
import './style.css';

// Floating progress panel for AI filter generation.
export default function AutoFilterJobs({ domain, jobs, onDismiss }) {
    const [collapsed, setCollapsed] = useState(false);
    if (!jobs.length) return null;
    const active = jobs.filter(isActive).length;
    return (
        <div className="autofilter-panel" onClick={e => e.stopPropagation()}>
            <div className="autofilter-header">
                <MdFilterAlt />
                <span>{active ? `AI filtering — ${active} in progress` : 'AI filtering — finished'}</span>
                <button onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Show' : 'Hide details'}>{collapsed ? <MdExpandLess /> : <MdExpandMore />}</button>
                {!active && <button onClick={onDismiss} title="Close"><MdClose /></button>}
            </div>
            {!collapsed && (
                <div className="autofilter-list">
                    {jobs.map(j => (
                        <div key={j.id} className={`autofilter-job autofilter-job--${j.status}`}>
                            <div className="autofilter-job-top">
                                <span className="autofilter-job-name" title={j.video}>{j.video.split('/').pop()}</span>
                                {isActive(j) && (
                                    <button className="autofilter-cancel" title="Cancel" onClick={() => cancelAutoFilter(domain, j.id).then(() => window.dispatchEvent(new Event('sc:autofilter-started')))}>
                                        <MdClose />
                                    </button>
                                )}
                            </div>
                            {isActive(j) ? (
                                <>
                                    <div className="autofilter-bar"><div className="autofilter-bar-fill" style={{ width: `${Math.max(2, Math.round(j.progress * 100))}%` }} /></div>
                                    <div className="autofilter-job-status">{STAGE_LABELS[j.stage] || j.stage}… {j.status === 'running' ? `${Math.round(j.progress * 100)}%` : ''}</div>
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
