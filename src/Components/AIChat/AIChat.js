import React, { useState, useRef, useEffect } from 'react';
import { authFetch } from '../../common/auth';
import './AIChat.css';

export default function AIChat({ domain, onClose }) {
    const [messages, setMessages] = useState([
        { role: 'model', text: 'Hi! I can help you find content in your library. Ask me anything — what shows are available, how many episodes, etc.' }
    ]);
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

    const send = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMsg = { role: 'user', text };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setInput('');
        setLoading(true);

        // build history excluding the initial greeting and the message just sent
        const history = nextMessages.slice(1, -1).map(m => ({ role: m.role, text: m.text }));

        try {
            const res = await authFetch(`${domain}/api/v1/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');
            setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
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
                    <span>AI Assistant</span>
                    <button className="ai-chat-close" onClick={onClose}>✕</button>
                </div>
                <div className="ai-chat-messages">
                    {messages.map((m, i) => (
                        <div key={i} className={`ai-msg ai-msg-${m.role}`}>
                            <span className="ai-msg-label">{m.role === 'user' ? 'You' : 'AI'}</span>
                            <span className="ai-msg-text">{m.text}</span>
                        </div>
                    ))}
                    {loading && (
                        <div className="ai-msg ai-msg-model">
                            <span className="ai-msg-label">AI</span>
                            <span className="ai-msg-text ai-typing">thinking…</span>
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
                        placeholder="Ask about your library… (Enter to send)"
                    />
                    <button className="ai-chat-send" onClick={send} disabled={loading}>Send</button>
                </div>
            </div>
        </div>
    );
}
