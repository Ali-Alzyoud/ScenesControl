import { useEffect, useRef } from 'react';
import StorageHelper from './StorageHelper';
import { getToken } from '../common/auth';

const POLL_INTERVAL = 30_000;

export function useServerSync(domain: string | null) {
    console.log('[sync] useServerSync called, domain=', domain);
    const pushTimer = useRef<any>(null);

    const schedulePush = () => {
        if (!domain) return;
        const token = getToken();
        if (!token) return;
        clearTimeout(pushTimer.current);
        pushTimer.current = setTimeout(() => {
            StorageHelper.pushToServer(domain, token).catch(() => {});
        }, 60_000);
    };

    const pushFavouritesNow = () => {
        console.log('[sync] pushFavouritesNow domain=', domain);
        if (!domain) return;
        const token = getToken();
        if (!token) { console.log('[sync] no token'); return; }
        clearTimeout(pushTimer.current);
        StorageHelper.pushToServer(domain, token)
            .then(() => console.log('[sync] push ok, favsModified=', StorageHelper.getFavsModified()))
            .catch(e => console.error('[sync] push error', e));
    };

    // Pull on mount
    useEffect(() => {
        if (!domain) return;
        const token = getToken();
        if (!token) return;
        StorageHelper.pullFromServer(domain, token).catch(() => {});
    }, [domain]);

    // Listen for general data changes → debounced push
    useEffect(() => {
        window.addEventListener('sc:data-changed', schedulePush);
        return () => window.removeEventListener('sc:data-changed', schedulePush);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [domain]);

    // Listen for favourite changes → push immediately
    useEffect(() => {
        window.addEventListener('sc:favourites-changed', pushFavouritesNow);
        return () => window.removeEventListener('sc:favourites-changed', pushFavouritesNow);
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
                if (!res.ok) { console.log('[sync] poll failed', res.status); return; }
                const data = await res.json();
                const serverTs: number = data.favsModified || 0;
                const localTs: number = StorageHelper.getFavsModified();
                console.log('[sync] poll serverTs=', serverTs, 'localTs=', localTs, 'favs=', data.favourites?.length);
                if (serverTs > localTs) {
                    localStorage.setItem('favourites', JSON.stringify(data.favourites));
                    localStorage.setItem('favsModified', String(serverTs));
                    window.dispatchEvent(new Event('sc:favourites-updated'));
                    console.log('[sync] favourites updated from server');
                }
            } catch {}
        }, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [domain]);

    return { schedulePush };
}
