import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { setAuth, getToken } from '../../common/auth';
import './Login.css';

function Login({ domain, onSuccess, onClose }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('qr'); // 'qr' | 'pass'

    // QR session
    const qrId = useRef(
        typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    );
    const pollRef = useRef(null);

    // Start polling when QR tab is active
    useEffect(() => {
        if (tab !== 'qr' || !domain) return;
        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`${domain}/api/v1/auth/qr-session/${qrId.current}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.token) {
                        setAuth(data.token, data.user || {});
                        onSuccess?.();
                    }
                }
            } catch {}
        }, 2000);
        return () => clearInterval(pollRef.current);
    }, [tab, domain, onSuccess]);

    const submit = async (e) => {
        e.preventDefault();
        if (!username || !password) { setError('Enter username and password'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${domain}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Login failed'); return; }
            setAuth(data.token, data.user);
            onSuccess?.();
        } catch {
            setError('Could not reach server');
        } finally {
            setLoading(false);
        }
    };

    const qrUrl = (() => {
        if (!domain) return window.location.origin;
        const base = window.location.origin + window.location.pathname;
        const params = new URLSearchParams({ domain, qrlogin: qrId.current });
        return base + '?' + params.toString();
    })();

    return (
        <div className="login-overlay" onClick={onClose}>
            <form className="login-box" onClick={e => e.stopPropagation()} onSubmit={submit}>
                <h2 className="login-title">Sign in</h2>

                <div className="login-tabs">
                    <button type="button" className={`login-tab${tab === 'qr' ? ' active' : ''}`} onClick={() => setTab('qr')}>QR Code</button>
                    <button type="button" className={`login-tab${tab === 'pass' ? ' active' : ''}`} onClick={() => setTab('pass')}>Password</button>
                </div>

                {tab === 'qr' && (
                    <div className="login-qr">
                        <QRCodeSVG value={qrUrl} size={180} bgColor="#0e0e1a" fgColor="#c0b8ff" level="M" />
                        <p className="login-qr-label">Scan with mobile to sign in</p>
                        <p className="login-qr-hint">Waiting for mobile…</p>
                    </div>
                )}

                {tab === 'pass' && (
                    <>
                        <input className="login-input" type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
                        <input className="login-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                        {error && <p className="login-error">{error}</p>}
                        <button className="login-btn" type="submit" disabled={loading}>
                            {loading ? 'Signing in…' : 'Sign in'}
                        </button>
                    </>
                )}
            </form>
        </div>
    );
}

// Mobile confirmation screen — shown when URL has ?qrlogin=
export function QrLoginConfirm({ domain, qrId, onDone }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const confirmSession = async (token) => {
        try {
            await fetch(`${domain}/api/v1/auth/qr-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ id: qrId, token }),
            });
            setDone(true);
            onDone?.();
        } catch {}
    };

    // If already logged in on mobile, confirm immediately
    useEffect(() => {
        const token = getToken();
        if (token) confirmSession(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        if (!username || !password) { setError('Enter credentials'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${domain}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Login failed'); return; }
            setAuth(data.token, data.user);
            await confirmSession(data.token);
        } catch {
            setError('Could not reach server');
        } finally {
            setLoading(false);
        }
    };

    if (done) return (
        <div className="login-overlay">
            <div className="login-box" style={{ alignItems: 'center' }}>
                <p className="login-title" style={{ fontSize: 32 }}>✓</p>
                <p style={{ color: '#c0b8ff', margin: 0 }}>Desktop is now signed in</p>
            </div>
        </div>
    );

    return (
        <div className="login-overlay">
            <form className="login-box" onSubmit={submit}>
                <h2 className="login-title">Sign in on desktop</h2>
                <input className="login-input" type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
                <input className="login-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                {error && <p className="login-error">{error}</p>}
                <button className="login-btn" type="submit" disabled={loading}>
                    {loading ? 'Signing in…' : 'Confirm'}
                </button>
            </form>
        </div>
    );
}

export default Login;
