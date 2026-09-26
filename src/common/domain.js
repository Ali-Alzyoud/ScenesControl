// Which backend ("domain") the app talks to.
//
// Served from the home network (a bare IP, localhost, *.local / *.lan), the backend is this same
// host on :4443. Served from anywhere else — e.g. the public Cloudflare site — there's no backend
// on that host at all, so the default is the Tailscale-exposed one (the menu's "Remote" button).
export const REMOTE_DOMAIN = 'https://m.camel-goldeye.ts.net';

export const isHomeHost = (host = window.location.hostname) =>
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host === 'localhost' || /\.(local|lan)$/.test(host);

// The Android app. The public (Cloudflare) site can't host it (25 MiB file limit), so there it's
// downloaded from the backend's /app route; at home, from this same site.
export const apkDownloadUrl = () =>
    isHomeHost() ? '/ScenesControl.apk' : `${REMOTE_DOMAIN}/app/ScenesControl.apk`;

export const defaultDomain = () => {
    const host = window.location.hostname;
    return isHomeHost(host) ? `https://${host}:4443` : REMOTE_DOMAIN;
};
