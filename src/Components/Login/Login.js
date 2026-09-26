import { useState, useEffect, useRef } from 'react';
import { setAuth, getToken, setDeviceKind, debugLog } from '../../common/auth';
import './Login.css';

const REMEMBER_KEY = 'rc_saved_creds';

function loadSavedCreds() {
    try { return JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null'); } catch { return null; }
}

function rememberCreds(remember, username, password) {
    if (remember) localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username, password }));
    else localStorage.removeItem(REMEMBER_KEY);
}

// Password sign-in. QR sign-in is the home screen's QR (HomeQR in App.js), not a tab here.
function Login({ domain, onSuccess, onClose }) {
    const [username, setUsername] = useState(() => loadSavedCreds()?.username || '');
    const [password, setPassword] = useState(() => loadSavedCreds()?.password || '');
    const [remember, setRemember] = useState(() => !!loadSavedCreds());
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
            setDeviceKind('screen');
            rememberCreds(remember, username, password);
            onSuccess?.();
        } catch {
            setError('Could not reach server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-overlay" onClick={onClose}>
            <form className="login-box" onClick={e => e.stopPropagation()} onSubmit={submit}>
                <h2 className="login-title">Sign in</h2>
                <input className="login-input" type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
                <input className="login-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                <label className="login-remember">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                    Remember me
                </label>
                {error && <p className="login-error">{error}</p>}
                <button className="login-btn" type="submit" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign in'}
                </button>
            </form>
        </div>
    );
}

// Runs on a phone that scanned a home-screen QR (?qr=<id>), rendered as an overlay on top of the
// normal app. The QR is identical whichever state the screen is in, so this works out which one:
//  - The screen is signed in and offering the id → claim it: this phone becomes its remote.
//  - Otherwise the screen is signed out and waiting → approve its sign-in with this phone's own
//    session, or, if this phone isn't signed in either, via the password form first.
// Either way this phone ends up as the 'controller'.
export function QrScanHandler({ domain, qrId, onDone }) {
    const [username, setUsername] = useState(() => loadSavedCreds()?.username || '');
    const [password, setPassword] = useState(() => loadSavedCreds()?.password || '');
    const [remember, setRemember] = useState(() => !!loadSavedCreds());
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [doneMessage, setDoneMessage] = useState('');
    const [needsPassword, setNeedsPassword] = useState(false);
    const started = useRef(false);

    const finish = (message) => {
        setDeviceKind('controller');
        // Read by Menu after the reload below, to land straight on Remote Control.
        sessionStorage.setItem('rc_open_remote', '1');
        setDoneMessage(message);
        // Parts of the app read auth/device state once at mount (Menu's current user, HomeQR).
        setTimeout(() => window.location.reload(), 1500);
    };

    const approveScreen = async (token) => {
        const res = await fetch(`${domain}/api/v1/auth/qr-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ id: qrId }),
        });
        debugLog('QR handler: approve screen', { status: res.status });
        if (!res.ok) throw new Error(res.status === 401 ? 'Session expired — sign in again' : `Server error (${res.status})`);
        finish('Other screen is now signed in');
    };

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        (async () => {
            try {
                const res = await fetch(`${domain}/api/v1/auth/qr-offer/${encodeURIComponent(qrId)}/claim`, { method: 'POST' });
                debugLog('QR handler: claim offer', { status: res.status, phoneSignedIn: !!getToken(), domain });
                if (res.ok) {
                    const data = await res.json();
                    // Keep a session this phone already has rather than swapping it for a
                    // view-only one; remote control works under either.
                    if (!getToken()) setAuth(data.token, data.user);
                    finish('Connected as remote');
                    return;
                }
                const token = getToken();
                if (token) await approveScreen(token);
                else setNeedsPassword(true);
            } catch (e) {
                setError(e.message || 'Could not reach server');
                setNeedsPassword(true);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            rememberCreds(remember, username, password);
            await approveScreen(data.token);
        } catch (err) {
            setError(err.message || 'Could not reach server');
        } finally {
            setLoading(false);
        }
    };

    if (doneMessage) return (
        <div className="login-overlay">
            <div className="login-box" style={{ alignItems: 'center' }}>
                <p className="login-title" style={{ fontSize: 32, margin: 0 }}>✓</p>
                <p style={{ color: '#c0b8ff', margin: 0 }}>{doneMessage}</p>
            </div>
        </div>
    );

    if (!needsPassword) return null;

    return (
        <div className="login-overlay" onClick={onDone}>
            <form className="login-box" onClick={e => e.stopPropagation()} onSubmit={submit}>
                <h2 className="login-title">Sign in to approve the other screen</h2>
                <input className="login-input" type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
                <input className="login-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                <label className="login-remember">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                    Remember me
                </label>
                {error && <p className="login-error">{error}</p>}
                <button className="login-btn" type="submit" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign in & approve'}
                </button>
            </form>
        </div>
    );
}

export default Login;
