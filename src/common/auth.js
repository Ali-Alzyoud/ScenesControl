const TOKEN_KEY = 'rc_auth_token';
const USER_KEY = 'rc_auth_user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
};

export const setAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(DEVICE_KIND_KEY);
};

// Whether this device is being used as a remote ('controller': signed in by scanning a screen's
// QR, or by approving one) or as something that plays content ('screen'). Distinct from the
// session's role: a screen signed in via QR is view-only too, but must still accept content cast
// to it, while a controller must not — otherwise any content opened elsewhere on the account
// would hijack the phone into playing it.
const DEVICE_KIND_KEY = 'rc_device_kind';
export const setDeviceKind = (kind) => localStorage.setItem(DEVICE_KIND_KEY, kind);
export const isController = () => {
  const kind = localStorage.getItem(DEVICE_KIND_KEY);
  if (kind) return kind === 'controller';
  return getUser()?.role === 'viewer'; // sessions from before this flag existed
};

// Temporary diagnostic aid for a mobile-only bug (an auth/login screen flashing open then
// closing on Play/Clear content) that several rounds of E2E testing from a clean browser
// couldn't reproduce — this reports what the real device actually sees, fire-and-forget, so it
// can be read back from the server afterward instead of needing devtools on the device itself.
// Safe to remove once that's root-caused.
export const debugLog = (event, details) => {
  try {
    const domain = localStorage.getItem('domain');
    if (!domain) return;
    const token = getToken();
    fetch(`${domain}/api/v1/debug/log`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ event, details }),
    }).catch(() => {});
  } catch {}
};

export const authFetch = (url, options = {}) => {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers }).then(res => {
    if (res.status === 401) debugLog('authFetch 401', { url: String(url).replace(/token=[^&]+/, 'token=REDACTED') });
    return res;
  });
};
