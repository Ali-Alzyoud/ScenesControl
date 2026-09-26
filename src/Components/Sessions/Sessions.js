import { useEffect, useState, useCallback } from 'react'
import { MdClose, MdSync, MdComputer, MdPhoneIphone, MdTablet, MdLogout } from 'react-icons/md'
import { authFetch, getToken } from '../../common/auth'
import './style.css'

function parseJwt(token) {
    try {
        const payload = token.split('.')[1]
        return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    } catch { return null }
}

function parseDevice(ua) {
    if (!ua) return { label: 'Unknown device', Icon: MdComputer }
    if (/tablet|ipad/i.test(ua)) return { label: parseBrowserOs(ua), Icon: MdTablet }
    if (/mobile|iphone|android/i.test(ua)) return { label: parseBrowserOs(ua), Icon: MdPhoneIphone }
    return { label: parseBrowserOs(ua), Icon: MdComputer }
}

function parseBrowserOs(ua) {
    let browser = 'Browser'
    if (/edg\//i.test(ua)) browser = 'Edge'
    else if (/chrome\//i.test(ua)) browser = 'Chrome'
    else if (/firefox\//i.test(ua)) browser = 'Firefox'
    else if (/safari\//i.test(ua)) browser = 'Safari'

    let os = ''
    if (/windows/i.test(ua)) os = 'Windows'
    else if (/mac os x/i.test(ua)) os = 'macOS'
    else if (/android/i.test(ua)) os = 'Android'
    else if (/iphone|ipad|ios/i.test(ua)) os = 'iOS'
    else if (/linux/i.test(ua)) os = 'Linux'

    return os ? `${browser} on ${os}` : browser
}

function formatRelative(ts) {
    if (!ts) return '—'
    const diff = Date.now() - ts
    if (diff < 60_000) return 'just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return `${Math.floor(diff / 86_400_000)}d ago`
}

export default function Sessions({ close }) {
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [revokingId, setRevokingId] = useState(null)

    const domain = localStorage.getItem('domain')
    const mySid = parseJwt(getToken() || '')?.sid

    const load = useCallback(async () => {
        if (!domain) return
        setLoading(true)
        setError('')
        try {
            const res = await authFetch(`${domain}/api/v1/auth/sessions`)
            if (res.status === 403) { setError('Admin access required'); setSessions([]); return }
            if (!res.ok) { setError('Failed to load sessions'); return }
            const data = await res.json()
            setSessions(Array.isArray(data) ? data.sort((a, b) => b.lastSeenAt - a.lastSeenAt) : [])
        } catch {
            setError('Could not reach server')
        } finally {
            setLoading(false)
        }
    }, [domain])

    useEffect(() => { load() }, [load])

    const revoke = async (id) => {
        setRevokingId(id)
        try {
            await authFetch(`${domain}/api/v1/auth/sessions/${id}`, { method: 'DELETE' })
            setSessions(prev => prev.filter(s => s.id !== id))
        } catch {
            setError('Failed to revoke session')
        } finally {
            setRevokingId(null)
        }
    }

    return (
        <div className="sessions-overlay" onClick={close}>
            <div className="sessions-modal" onClick={e => e.stopPropagation()}>
                <div className="sessions-header">
                    <span className="sessions-title">Active Sessions & Devices</span>
                    <div className="sessions-header-actions">
                        <button className="sessions-refresh-btn" onClick={load} disabled={loading} title="Refresh">
                            <MdSync className={loading ? 'spinning' : ''} />
                        </button>
                        <button className="sessions-close-btn" onClick={close}><MdClose /></button>
                    </div>
                </div>

                <div className="sessions-body">
                    {error && <div className="sessions-error">{error}</div>}
                    {!error && !loading && sessions.length === 0 && (
                        <div className="sessions-empty">No active sessions</div>
                    )}
                    {sessions.map(s => {
                        const { label, Icon } = parseDevice(s.userAgent)
                        const isMe = s.id === mySid
                        return (
                            <div key={s.id} className={`session-row${isMe ? ' session-row--me' : ''}`}>
                                <Icon className="session-icon" />
                                <div className="session-info">
                                    <div className="session-top">
                                        <span className="session-device">{label}</span>
                                        {isMe && <span className="session-badge">This device</span>}
                                        <span className="session-user">{s.username}</span>
                                    </div>
                                    <div className="session-meta">
                                        {s.ip && <span>{s.ip}</span>}
                                        <span>Signed in {formatRelative(s.issuedAt)}</span>
                                        <span>Active {formatRelative(s.lastSeenAt)}</span>
                                    </div>
                                </div>
                                <button
                                    className="session-revoke-btn"
                                    onClick={() => revoke(s.id)}
                                    disabled={revokingId === s.id}
                                    title="Sign out this device"
                                >
                                    <MdLogout /> {revokingId === s.id ? 'Revoking…' : 'Revoke'}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
