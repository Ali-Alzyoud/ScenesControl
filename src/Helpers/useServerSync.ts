import { useEffect, useRef } from 'react';
import StorageHelper from './StorageHelper';
import { getToken } from '../common/auth';

const POLL_INTERVAL = 30_000;
// Throttle (not debounce) for progress ticks: saveContentProgress fires every few seconds
// during playback, which kept resetting a debounce timer and meant it never actually fired
// as long as playback continued — watchProgress was never leaving localStorage. A throttle
// guarantees a push at least this often even under continuous activity.
const PUSH_THROTTLE = 15_000;

export function useServerSync(domain: string | null) {
    const lastPush = useRef<number>(0);
    const throttleTimer = useRef<any>(null);

    const pushNow = (keepalive = false) => {
        if (!domain) return;
        const token = getToken();
        if (!token) return;
        clearTimeout(throttleTimer.current);
        lastPush.current = Date.now();
        StorageHelper.pushToServer(domain, token, { keepalive }).catch(() => {});
    };

    // sc:data-changed (progress ticks, generic edits): push immediately if we haven't pushed
    // recently, otherwise schedule one for when the throttle window ends. Either way this
    // fires on a bounded schedule instead of waiting for a quiet gap that may never come.
    const scheduleThrottledPush = () => {
        if (!domain) return;
        const elapsed = Date.now() - lastPush.current;
        if (elapsed >= PUSH_THROTTLE) {
            pushNow();
            return;
        }
        if (throttleTimer.current) return;
        throttleTimer.current = setTimeout(() => {
            throttleTimer.current = null;
            pushNow();
        }, PUSH_THROTTLE - elapsed);
    };

    // sc:history-changed / sc:favourites-changed: these fire on discrete, meaningful actions
    // (opening a video, starring something) rather than a continuous stream, and — for
    // history specifically — right before a page reload (see openContent), so they push
    // straight away rather than risking a scheduled push getting torn down with the page.
    const pushImmediately = () => pushNow();

    // Pull on mount
    useEffect(() => {
        if (!domain) return;
        const token = getToken();
        if (!token) return;
        StorageHelper.pullFromServer(domain, token).catch(() => {});
    }, [domain]);

    useEffect(() => {
        window.addEventListener('sc:data-changed', scheduleThrottledPush);
        return () => window.removeEventListener('sc:data-changed', scheduleThrottledPush);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [domain]);

    useEffect(() => {
        window.addEventListener('sc:history-changed', pushImmediately);
        return () => window.removeEventListener('sc:history-changed', pushImmediately);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [domain]);

    useEffect(() => {
        window.addEventListener('sc:favourites-changed', pushImmediately);
        return () => window.removeEventListener('sc:favourites-changed', pushImmediately);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [domain]);

    // Best-effort final flush — a throttled push may still be pending when the tab closes or
    // reloads; keepalive lets this one survive that.
    useEffect(() => {
        if (!domain) return;
        const onHide = () => {
            if (throttleTimer.current) pushNow(true);
        };
        document.addEventListener('pagehide', onHide);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') onHide();
        });
        return () => document.removeEventListener('pagehide', onHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [domain]);

    // Poll favourites every 30s — replace local if server is newer
    useEffect(() => {
        if (!domain) return;
        const interval = setInterval(async () => {
            const token = getToken();
            if (!token) return;
            try {
                const res = await fetch(`${domain}/api/v1/userdata/favourites`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                const serverTs: number = data.favsModified || 0;
                const localTs: number = StorageHelper.getFavsModified();
                if (serverTs > localTs) {
                    localStorage.setItem('favourites', JSON.stringify(data.favourites));
                    localStorage.setItem('favsModified', String(serverTs));
                    window.dispatchEvent(new Event('sc:favourites-updated'));
                }
            } catch {}
        }, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [domain]);

    return { schedulePush: scheduleThrottledPush };
}
