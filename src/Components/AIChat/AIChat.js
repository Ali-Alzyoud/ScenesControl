import React, { useState, useRef, useEffect } from 'react';
import { authFetch, isController } from '../../common/auth';
import { openContent } from '../FilterPickerLocal/FilterPickerLocal';
import StorageHelper from '../../Helpers/StorageHelper';
import { playablesOf } from '../../common/episodes';
import './AIChat.css';

const withToken = (url) => {
    const token = localStorage.getItem('rc_auth_token');
    return url && token ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : url;
};
const fileUrl = (domain, kind, folder, name) => withToken(`${domain}/${kind}/${folder}/${name}`);
const titleOf = (folder) => folder.split('/').pop();

function ResultCard({ domain, item, onPlay }) {
    const [open, setOpen] = useState(false);
    const image = item.files.find(f => f.type === 'IMAGE');
    const imageUrl = image ? fileUrl(domain, 'static', item.folder, image.name) : '';
    const playables = playablesOf(domain, item);
    const isSeries = playables.length > 1;
    const play = (index) => onPlay({ playables, index, image: imageUrl });
    return (
        <div className={`ai-card${open ? ' ai-card--open' : ''}`}>
            <button className="ai-card-main" onClick={() => (isSeries ? setOpen(o => !o) : play(0))} title={isSeries ? 'Show episodes' : `Play ${titleOf(item.folder)}`}>
                <div className="ai-card-poster" style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}>
                    {!imageUrl && <span className="ai-card-poster-fallback">🎬</span>}
                    {isSeries
                        ? <span className="ai-card-badge">{playables.length} ep</span>
                        : <span className="ai-card-play">▶</span>}
                </div>
                <span className="ai-card-title">{titleOf(item.folder)}</span>
            </button>
            {open && (
                <div className="ai-card-episodes">
                    {playables.map((p, i) => (
                        <button key={p.video} className="ai-card-episode" onClick={() => play(i)} title={p.name}>▶ {p.name}</button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Progress of a background job (a subtitle translation) started from the chat.
function JobStatus({ domain, job, onDone }) {
    const [state, setState] = useState({ status: 'running', progress: 0, label: job.label, message: '' });
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;
    useEffect(() => {
        let stopped = false;
        let timer;
        const poll = async () => {
            try {
                const res = await authFetch(`${domain}/api/v1/ai/jobs/${job.id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (stopped) return;
                    setState(data);
                    if (data.status !== 'running') { if (data.status === 'done') onDoneRef.current?.(); return; }
                } else if (res.status === 404) {
                    if (!stopped) setState(s => ({ ...s, status: 'error', message: 'This job is no longer tracked (the server restarted?)' }));
                    return;
                }
            } catch {}
            if (!stopped) timer = setTimeout(poll, 2000);
        };
        poll();
        return () => { stopped = true; clearTimeout(timer); };
    }, [domain, job.id]);
    const pct = Math.round((state.progress || 0) * 100);
    return (
        <div className={`ai-job ai-job--${state.status}`}>
            <div className="ai-job-label">{state.label}</div>
            {state.status === 'running'
                ? <div className="ai-job-bar"><div className="ai-job-bar-fill" style={{ width: `${Math.max(pct, 3)}%` }} /></div>
                : <div className="ai-job-message">{state.status === 'done' ? `✓ ${state.message}` : `✕ ${state.message}`}</div>}
        </div>
    );
}

// What the assistant remembers about this account: preference notes (it adds them itself, or
// when asked) and recent requests. Both are sent to the AI with every question.
function MemoryPanel({ domain }) {
    const [memory, setMemory] = useState(null);
    const [error, setError] = useState('');
    const request = async (query, method = 'GET') => {
        try {
            const res = await authFetch(`${domain}/api/v1/ai/memory${query}`, { method });
            if (!res.ok) throw new Error(`Server error (${res.status})`);
            setMemory(await res.json());
            setError('');
        } catch (e) { setError(e.message); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { request(''); }, [domain]);
    if (error) return <div className="ai-memory"><div className="ai-memory-empty">{error}</div></div>;
    if (!memory) return <div className="ai-memory"><div className="ai-memory-empty">Loading…</div></div>;
    return (
        <div className="ai-memory">
            <div className="ai-memory-title">What the AI remembers about you</div>
            {memory.notes.length === 0 && <div className="ai-memory-empty">Nothing yet — tell it what you like (e.g. "I love sci-fi, no horror").</div>}
            {memory.notes.map((n, i) => (
                <div key={`${i}-${n.text}`} className="ai-memory-note">
                    <span>{n.text}</span>
                    <button title="Forget this" onClick={() => request(`?note=${i}`, 'DELETE')}>✕</button>
                </div>
            ))}
            <div className="ai-memory-footer">
                <span>{memory.searches.length} recent request{memory.searches.length === 1 ? '' : 's'} remembered</span>
                {memory.searches.length > 0 && <button onClick={() => request('?searches=1', 'DELETE')}>Clear requests</button>}
                {(memory.notes.length > 0 || memory.searches.length > 0) && (
                    <button onClick={() => { if (window.confirm('Forget everything the AI remembers about you?')) request('', 'DELETE'); }}>Forget all</button>
                )}
            </div>
        </div>
    );
}

// item (optional): a library entry ({ folder, files }) the chat is about — opened from a Store
// card's AI button. onChanged: called after the AI added files to it (subtitles).
export default function AIChat({ domain, onClose, item, onChanged }) {
    // Same as the Store: a phone paired as a remote sends it to the screen; otherwise it plays here.
    const play = async ({ playables, index, image }) => {
        const p = playables[index];
        StorageHelper.saveToCurrentList({ videos: playables.map(x => x.video), srts: playables.map(x => x.srt), filters: playables.map(x => x.filter), index });
        if (!isController()) { openContent({ video: p.video, srt: p.srt, filter: p.filter, image }); return; }
        try {
            const res = await authFetch(`${domain}/api/v1/remote/play`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoPath: p.video, srtPath: p.srt || '', filterPath: p.filter || '', imagePath: image || '', sourceSession: sessionStorage.getItem('__sessionId') || '' }),
            });
            setMessages(prev => [...prev, { role: 'model', text: res.ok ? `Sent "${p.name}" to the screen.` : `Couldn't send it to the screen (${res.status}).`, local: true }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'model', text: `Can't reach server (${e?.message || 'network error'})`, local: true }]);
        }
    };

    const itemTitle = item ? titleOf(item.folder) : '';
    const hasSubtitles = !!item?.files.some(f => f.type === 'SRT');
    const [messages, setMessages] = useState([
        item
            ? { role: 'model', text: `What would you like to do with "${itemTitle}"? I can find, download or translate its subtitles — or ask me anything about it.` }
            : { role: 'model', text: 'Hi! Tell me what you feel like watching — a genre, an actor, a mood — and I\'ll show matching titles from your library. Tap one to play it. I remember your tastes between chats (see Memory).' }
    ]);
    const suggestions = item
        ? ['Find English subtitles', 'Download Arabic subtitles', ...(hasSubtitles ? ['Translate the subtitles to Arabic'] : []), 'What is this about?']
        : [];
    const [showMemory, setShowMemory] = useState(false);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const send = async (preset) => {
        const text = (typeof preset === 'string' ? preset : input).trim();
        if (!text || loading) return;

        const userMsg = { role: 'user', text };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setInput('');
        setLoading(true);

        // build history excluding the initial greeting and the message just sent
        const history = nextMessages.slice(1, -1).filter(m => !m.local).map(m => ({ role: m.role, text: m.text }));

        try {
            const res = await authFetch(`${domain}/api/v1/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history, ...(item ? { item: item.folder } : {}) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');
            setMessages(prev => [...prev, { role: 'model', text: data.reply, items: data.items || [], jobs: data.jobs || [], memoryChanged: !!data.memoryChanged }]);
            if (data.changed) onChanged?.();
        } catch (err) {
            setMessages(prev => [...prev, { role: 'model', text: `Error: ${err.message}` }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
        if (e.key === 'Escape') onClose();
    };

    return (
        <div className="ai-chat-overlay" onClick={onClose}>
            <div className="ai-chat-panel" onClick={e => e.stopPropagation()}>
                <div className="ai-chat-header">
                    <span className="ai-chat-heading" title={item?.folder}>{item ? `AI · ${itemTitle}` : 'AI Assistant'}</span>
                    <button className={`ai-chat-memory-btn${showMemory ? ' is-active' : ''}`} onClick={() => setShowMemory(v => !v)} title="What the AI remembers about you">Memory</button>
                    <button className="ai-chat-close" onClick={onClose}>✕</button>
                </div>
                {showMemory && <MemoryPanel domain={domain} />}
                <div className="ai-chat-messages">
                    {messages.map((m, i) => (
                        <div key={i} className={`ai-msg ai-msg-${m.role}`}>
                            <span className="ai-msg-label">{m.role === 'user' ? 'You' : 'AI'}</span>
                            {m.text && <span className="ai-msg-text">{m.text}</span>}
                            {m.items?.length > 0 && (
                                <div className="ai-cards">
                                    {m.items.map(it => <ResultCard key={it.folder} domain={domain} item={it} onPlay={play} />)}
                                </div>
                            )}
                            {m.jobs?.map(job => <JobStatus key={job.id} domain={domain} job={job} onDone={onChanged} />)}
                            {m.memoryChanged && <span className="ai-msg-note">🧠 Memory updated</span>}
                        </div>
                    ))}
                    {loading && (
                        <div className="ai-msg ai-msg-model">
                            <span className="ai-msg-label">AI</span>
                            <span className="ai-msg-text ai-typing">thinking…</span>
                        </div>
                    )}
                    {messages.length === 1 && suggestions.length > 0 && (
                        <div className="ai-suggestions">
                            {suggestions.map(sug => <button key={sug} className="ai-suggestion" onClick={() => send(sug)}>{sug}</button>)}
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
                <div className="ai-chat-input-row">
                    <textarea
                        ref={inputRef}
                        className="ai-chat-input"
                        rows={2}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={item ? `Ask about ${itemTitle}… (Enter to send)` : 'Ask for something to watch… (Enter to send)'}
                    />
                    <button className="ai-chat-send" onClick={() => send()} disabled={loading}>Send</button>
                </div>
            </div>
        </div>
    );
}
