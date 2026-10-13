// Which backend ("domain") the app talks to. One of three servers, chosen in the menu (or in the
// Android app's gear, which opens the site with ?route=…), remembered on this device:
//  - local:     the home server on the LAN (this page's own host when opened at home).
//  - tailscale: the backend's Tailscale name. On a device running Tailscale it's a direct, private
//               connection; without Tailscale it goes through Funnel's relay (~1 Mbit/s measured —
//               too slow for video).
//  - tunnel:    the backend through the Cloudflare Tunnel on the server (~500 Mbit/s measured);
//               works from anywhere.
// With nothing chosen yet: local when the page was opened at home, else the tunnel.
const HOME_LAN = 'https://192.168.4.17:4443';
export const REMOTE_ROUTES = {
    tailscale: 'https://m.camel-goldeye.ts.net',
    tunnel: 'https://scenes-api.alzyod.com',
};
export const ROUTES = ['local', 'tailscale', 'tunnel'];
export const ROUTE_LABELS = { local: 'Local', tailscale: 'Remote (Tailscale)', tunnel: 'Remote (Tunnel)' };

export const isHomeHost = (host = window.location.hostname) =>
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host === 'localhost' || /\.(local|lan)$/.test(host);

export const localDomain = (host = window.location.hostname) => (isHomeHost(host) ? `https://${host}:4443` : HOME_LAN);

const ROUTE_KEY = 'serverRoute';
export const getRoute = () => {
    const saved = localStorage.getItem(ROUTE_KEY);
    if (ROUTES.includes(saved)) return saved;
    return isHomeHost() ? 'local' : 'tunnel';
};
export const setRoute = (route) => { if (ROUTES.includes(route)) localStorage.setItem(ROUTE_KEY, route); };
export const routeDomain = (route) => (route === 'local' ? localDomain() : REMOTE_ROUTES[route]);
// Which of the three a backend address is, or null for any other (a custom address).
export const routeOf = (domain) => ROUTES.find(r => routeDomain(r) === domain) || null;

// The Android app. The public (Cloudflare) site can't host it (25 MiB file limit), so there it's
// downloaded from the backend's /app route — through the tunnel, which reaches it from anywhere;
// at home, from this same site.
export const apkDownloadUrl = () =>
    isHomeHost() ? '/ScenesControl.apk' : `${REMOTE_ROUTES.tunnel}/app/ScenesControl.apk`;

export const defaultDomain = () => routeDomain(getRoute());
