// Which backend ("domain") the app talks to.
//
// Served from the home network (a bare IP, localhost, *.local / *.lan), the backend is this same
// host on :4443. Served from anywhere else — e.g. the public Cloudflare site — there's no backend
// on that host at all, so it's one of the two public routes to it (the menu's "Remote" button):
//  - tailscale: the backend's Tailscale name. On a device running Tailscale this is a direct,
//    private connection (fastest); anywhere else it's Tailscale Funnel's relay, which measured
//    ~1 Mbit/s with multi-second replies — too slow for video.
//  - cloudflare: the backend through the Cloudflare Tunnel on the server (~250 Mbit/s measured).
// Both are raced on every load (pickRemoteRoute) and the first to answer is used from then on, so
// a Tailscale device gets the direct connection and everything else gets Cloudflare.
export const REMOTE_ROUTES = {
    tailscale: 'https://m.camel-goldeye.ts.net',
    cloudflare: 'https://scenes-api.alzyod.com',
};
const ROUTE_KEY = 'remoteRoute';
export const remoteRouteName = () => (REMOTE_ROUTES[localStorage.getItem(ROUTE_KEY)] ? localStorage.getItem(ROUTE_KEY) : 'tailscale');
// The remote backend to use now: the last race's winner (Tailscale until a race has run).
export const remoteDomain = () => REMOTE_ROUTES[remoteRouteName()];
export const isRemoteDomain = (d) => Object.values(REMOTE_ROUTES).includes(d);
export const remoteRouteLabel = (d) => (d === REMOTE_ROUTES.cloudflare ? 'Cloudflare' : d === REMOTE_ROUTES.tailscale ? 'Tailscale' : null);

// Asks both remote routes at once and remembers whichever answers first (any HTTP reply counts —
// it only has to reach the backend). Resolves with the winner's name, or null if neither answered.
export async function pickRemoteRoute(timeoutMs = 6000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const probe = (name) => fetch(`${REMOTE_ROUTES[name]}/api/v1/speed/ping?_=${Date.now()}`, { cache: 'no-store', signal: ctrl.signal })
        .then(() => name);
    try {
        const winner = await Promise.any(Object.keys(REMOTE_ROUTES).map(probe));
        localStorage.setItem(ROUTE_KEY, winner);
        return winner;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
        ctrl.abort(); // the slower probe isn't needed any more
    }
}

export const isHomeHost = (host = window.location.hostname) =>
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host === 'localhost' || /\.(local|lan)$/.test(host);

// The Android app. The public (Cloudflare) site can't host it (25 MiB file limit), so there it's
// downloaded from the backend's /app route; at home, from this same site.
export const apkDownloadUrl = () =>
    isHomeHost() ? '/ScenesControl.apk' : `${remoteDomain()}/app/ScenesControl.apk`;

export const defaultDomain = () => {
    const host = window.location.hostname;
    return isHomeHost(host) ? `https://${host}:4443` : remoteDomain();
};
