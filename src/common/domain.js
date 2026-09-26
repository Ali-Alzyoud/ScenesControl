// Which backend ("domain") the app talks to.
//
// Served from the home network (a bare IP, localhost, *.local / *.lan), the backend is this same
// host on :4443. Served from anywhere else — e.g. the public Cloudflare site — there's no backend
// on that host at all, so the default is the Tailscale-exposed one (the menu's "Remote" button).
export const REMOTE_DOMAIN = 'https://m.camel-goldeye.ts.net';

const isHomeHost = (host) =>
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host === 'localhost' || /\.(local|lan)$/.test(host);

export const defaultDomain = () => {
    const host = window.location.hostname;
    return isHomeHost(host) ? `https://${host}:4443` : REMOTE_DOMAIN;
};
