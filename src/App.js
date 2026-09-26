import './App.css';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Player } from './Components/Player';
 

import Menu from './Components/Menu'
import { getToken, getUser, debugLog, isController, setDeviceKind } from './common/auth'
import { QrScanHandler } from './Components/Login/Login'
import { defaultDomain } from './common/domain'
import StorageHelper from './Helpers/StorageHelper'
import SrtClass from './common/SrtClass'
import FilterEditor from './Components/FilterFileEditor'
import ConfigEditor from './Components/ConfigEditor'
import { SceneGuideClass } from './common/SceneGuide'
import ToggleButton from './Components/ToggleButton'
import History from './Components/History/History'
import SeriesPanel from './Components/SeriesPanel/SeriesPanel'


import { connect, useSelector } from "react-redux";
import { addFilterItems, setVideoSrc, setSubtitle, setFilterItems, setDuration, setTime, setVideoName, setSubtitleName, setFilterPath } from './redux/actions'
import { getSyncConfig, selectModalOpen, selectVideoIsLoading, selectVideoName } from './redux/selectors'
import Loader from './Components/Loader';
import SubtitleEditor from './Components/SubtitleEditor/SubtitleEditor';
import Utils from './utils/utils';


const KEY = {
  E: 69,
  C: 67,
};

(() => {
  document.addEventListener('contextmenu', event => event.preventDefault());
})()

// Unique session ID per tab — persists across reloads, unique per tab
if (!sessionStorage.getItem('__sessionId')) {
  sessionStorage.setItem('__sessionId',
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );
}
const SESSION_ID = sessionStorage.getItem('__sessionId');

// Running inside the Android app's WebView: the app draws its own settings button over the
// page's top-right corner, so the navbar reserves room for it (see .in-app in menu.css). The
// bridge object is injected at document start; the ready event covers it arriving later.
// The button is native (unscaled), while .App's min-width can make the WebView zoom the page out
// on narrow phones — so the room reserved, in page pixels, scales with that zoom.
{
  const root = document.documentElement;
  const updateInset = () => {
    const zoom = window.screen?.width ? window.innerWidth / window.screen.width : 1;
    root.style.setProperty('--app-overlay-inset', `${Math.ceil(64 * Math.max(1, zoom))}px`);
  };
  const markInApp = () => { root.classList.add('in-app'); updateInset(); };
  const refresh = () => { if (root.classList.contains('in-app')) updateInset(); };
  if (window.flutter_inappwebview) markInApp();
  window.addEventListener('flutterInAppWebViewPlatformReady', markInApp);
  // Before the first layout, innerWidth is still the un-zoomed width, so measure again once the
  // page has actually laid out (and whenever it changes).
  window.addEventListener('load', refresh);
  window.addEventListener('resize', refresh);
  if (typeof ResizeObserver === 'function') new ResizeObserver(refresh).observe(root);
}

// The page's own address decides the backend on every load: the public site always uses the
// remote service, and localhost / a home IP always uses this host's local one. Both reach the same
// server (same accounts and tokens), so a server picked by hand, or saved by QR pairing or a
// cast link, only lasts until the next reload instead of sticking to the wrong one.
if (localStorage.getItem('domain') !== defaultDomain()) {
  localStorage.setItem('domain', defaultDomain());
  localStorage.setItem('remoteMeta', '');
  localStorage.setItem('remotePath', '');
}

// A scanned home-screen QR (?qr=<id>&domain=...) is consumed once, here, before anything
// renders, and removed from the address bar immediately. Leaving it there previously let mobile
// browsers' background-tab reloads replay the approve flow over and over. (?qrlogin= is the
// earlier name for the same param.)
const PENDING_QR = (() => {
  const p = new URLSearchParams(window.location.search);
  const id = p.get('qr') || p.get('qrlogin');
  if (!id) return null;
  // No domain in the QR means the screen used the default for its host — which, since this page
  // was opened from that same QR, is this page's host too.
  const domain = p.get('domain') || defaultDomain();
  window.history.replaceState({}, '', window.location.origin + window.location.pathname + window.location.hash);
  return { id, domain };
})();

// 12 random base-36 chars (~62 bits) — plenty for an id that's only valid for two minutes, and
// much shorter than a UUID. Every character saved shrinks the QR's grid, which makes each square
// bigger on screen and the code readable from farther away.
const newQrId = () => {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => (b % 36).toString(36)).join('');
};

// Server-side QR ids expire after 2 minutes, so the one on screen is replaced a bit before that.
const QR_ROTATE_MS = 100_000;

// The home screen's single QR code. It always encodes the same thing — this site plus a short
// random id — so it looks the same whether or not this screen is signed in; scanning it does the
// right thing for either state (see QrScanHandler in Login.js):
//  - Signed out: this screen polls /qr-session/:id, and a signed-in phone that scans it approves,
//    signing this screen in (view-only, as a 'screen' device).
//  - Signed in: this screen registers the id as an offer, and a phone that scans it gets its own
//    view-only session as this screen's remote ('controller').
// A controller device shows nothing here — it's the remote, not something to pair with.
function HomeQR({ domain }) {
  const [token, setToken] = useState(() => getToken());
  const [qrId, setQrId] = useState(newQrId);
  const [offered, setOffered] = useState(false);
  const [code, setCode] = useState('');

  // A 4-digit code for this same id, shown under the QR, for typing in instead of scanning.
  useEffect(() => {
    setCode('');
    if (!domain || isController()) return;
    let cancelled = false;
    fetch(`${domain}/api/v1/auth/qr-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: qrId }),
    }).then(res => res.ok ? res.json() : null)
      .then(data => { if (!cancelled && data?.code) setCode(data.code); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [domain, qrId]);

  useEffect(() => {
    const t = setTimeout(() => setQrId(newQrId()), QR_ROTATE_MS);
    return () => clearTimeout(t);
  }, [qrId]);

  // Signed out: wait for a phone to approve this id.
  useEffect(() => {
    if (token || !domain) return;
    let stopped = false;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${domain}/api/v1/auth/qr-session/${qrId}`);
        if (!res.ok || stopped) return;
        const data = await res.json();
        if (!data.token) return;
        stopped = true;
        const { setAuth } = require('./common/auth');
        setAuth(data.token, data.user || {});
        setDeviceKind('screen');
        debugLog('Screen signed in via its QR/code');
        // Components that read auth once at mount (Menu's currentUser) need a fresh load.
        window.location.reload();
      } catch {}
    }, 2000);
    return () => { stopped = true; clearInterval(poll); };
  }, [token, domain, qrId]);

  // Signed in: offer this id to phones. The QR isn't shown until the server has it, so a scan
  // can never race ahead of the offer.
  useEffect(() => {
    setOffered(false);
    if (!token || !domain || isController()) return;
    let cancelled = false;
    fetch(`${domain}/api/v1/auth/qr-offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: qrId }),
    }).then(res => { if (!cancelled && res.ok) setOffered(true); }).catch(() => {});
    return () => { cancelled = true; };
  }, [token, domain, qrId]);

  // Keeps this in sync if auth changes without a full reload (e.g. QRScanner's own navigation).
  useEffect(() => {
    const onStorage = () => setToken(getToken());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!domain || isController()) return null;
  if (token && !offered) return null;

  // Only include the server address when it isn't the default a scanning device would assume
  // anyway (see defaultDomain) — it's most of the URL's length otherwise.
  const params = { qr: qrId };
  if (domain !== defaultDomain()) params.domain = domain;
  const url = window.location.origin + window.location.pathname + '?' + new URLSearchParams(params).toString();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px 0' }}>
      <p style={{ margin: 0, color: '#888aaa', fontSize: 13 }}>
        {token ? 'Scan to remote control this screen' : 'Scan with a signed-in phone to sign in here'}
      </p>
      {/* Dark-on-light with a quiet-zone margin, as the QR spec expects: inverted colours or no
          margin make many decoders fail outright, or only succeed from very close up. Error
          correction L keeps the grid smallest, since a screen doesn't get dirty or torn. */}
      <QRCodeSVG value={url} size={200} bgColor="#ffffff" fgColor="#000000" level="L" marginSize={3} />
      {code && (
        <p style={{ margin: 0, color: '#888aaa', fontSize: 13 }}>
          or enter code <span className="home-qr-code">{code}</span>
        </p>
      )}
    </div>
  );
}

function App(props) {

  const { addFilterItems, setVideoSrc, setVideoName, setSubtitle, isLoading, videoName, setSubtitleName, setFilterPath } = props;
  const [showEditor, setShowEditor] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingQr, setPendingQr] = useState(PENDING_QR);
  const [showSeries, setShowSeries] = useState(false);
  const seriesCount = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('currentList') || '{}').videos?.length || 0 } catch { return 0 }
  }, [videoName]);
  const [keyEvent, setKeyEvent] = useState(null);
  const syncConfig = useSelector(getSyncConfig)
  

  // ── Server sync ──────────────────────────────────────────
  // Favourites already pushed immediately on change; watch history/progress didn't — they
  // only had a 60s *debounced* push (reset on every event). Two things defeated that in
  // practice: opening a video reloads the page almost immediately afterward (see openContent
  // in FilterPickerLocal.js), tearing down the pending timer before it could fire; and
  // progress ticks fire every few seconds during playback, which kept resetting the debounce
  // so it never actually elapsed as long as playback continued. Net effect: watch
  // history/progress essentially never reached the server, only ever lived in localStorage.
  const syncDomain = localStorage.getItem('domain');
  const syncLastPush = useRef(0);
  const syncThrottleTimer = useRef(null);
  const SYNC_PUSH_THROTTLE = 15_000;

  const syncPushNow = useCallback((keepalive = false) => {
    if (!syncDomain) return;
    const t = getToken(); if (!t) return;
    clearTimeout(syncThrottleTimer.current);
    syncLastPush.current = Date.now();
    StorageHelper.pushToServer(syncDomain, t, { keepalive }).catch(() => {});
  }, [syncDomain]);

  // Pull on load
  useEffect(() => {
    if (!syncDomain) return;
    const token = getToken();
    if (!token) return;
    StorageHelper.pullFromServer(syncDomain, token).catch(() => {});
  }, [syncDomain]);

  // sc:data-changed (progress ticks etc.): throttled push — guaranteed at least once per
  // SYNC_PUSH_THROTTLE even under continuous events, unlike a debounce which can be reset
  // indefinitely. sc:history-changed / sc:favourites-changed: discrete, meaningful actions —
  // push right away rather than risk a scheduled push getting torn down with the page.
  useEffect(() => {
    if (!syncDomain) return;
    const onDataChanged = () => {
      const elapsed = Date.now() - syncLastPush.current;
      if (elapsed >= SYNC_PUSH_THROTTLE) { syncPushNow(); return; }
      if (syncThrottleTimer.current) return;
      syncThrottleTimer.current = setTimeout(() => {
        syncThrottleTimer.current = null;
        syncPushNow();
      }, SYNC_PUSH_THROTTLE - elapsed);
    };
    const onImmediate = () => syncPushNow();
    window.addEventListener('sc:data-changed', onDataChanged);
    window.addEventListener('sc:history-changed', onImmediate);
    window.addEventListener('sc:favourites-changed', onImmediate);
    return () => {
      window.removeEventListener('sc:data-changed', onDataChanged);
      window.removeEventListener('sc:history-changed', onImmediate);
      window.removeEventListener('sc:favourites-changed', onImmediate);
    };
  }, [syncDomain, syncPushNow]);

  // Best-effort final flush for a still-pending throttled push when the tab closes/reloads —
  // keepalive lets this one survive the teardown that would otherwise cancel it.
  useEffect(() => {
    if (!syncDomain) return;
    const onHide = () => { if (syncThrottleTimer.current) syncPushNow(true); };
    document.addEventListener('pagehide', onHide);
    const onVisibility = () => { if (document.visibilityState === 'hidden') onHide(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [syncDomain, syncPushNow]);

  // Poll favourites every 30s — only when idle (no video loaded)
  useEffect(() => {
    if (!syncDomain || videoName) return;
    const poll = async () => {
      const t = getToken(); if (!t) return;
      try {
        const res = await fetch(`${syncDomain}/api/v1/userdata/favourites`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!res.ok) { console.log('[sync] poll', res.status); return; }
        const data = await res.json();
        const serverTs = data.favsModified || 0;
        const localTs = StorageHelper.getFavsModified();
        if (serverTs > localTs) {
          localStorage.setItem('favourites', JSON.stringify(data.favourites));
          localStorage.setItem('favsModified', String(serverTs));
          window.dispatchEvent(new Event('sc:favourites-updated'));
        } else if (localTs > serverTs) {
          StorageHelper.pushToServer(syncDomain, t).catch(e => console.error('[sync] push err', e));
        }
      } catch (e) { console.error('[sync] poll err', e); }
    };
    poll(); // also poll on every page load
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, [syncDomain, videoName]);

  // Poll for remote play commands — runs regardless of whether this device is currently playing
  // something, not just while idle, so Remote Control's "Change Content" can switch an
  // already-playing device to something else. Persist lastRemoteTs in sessionStorage so page
  // reloads don't re-trigger the same command, and sourceSession so a device never re-applies
  // its own broadcast — both already needed for the idle case, and together they're also what
  // makes it safe to keep polling while playing: a command already applied (including one this
  // same device caused by opening content itself) is never re-applied just because polling never
  // stops.
  const lastRemoteTs = useRef(Number(sessionStorage.getItem('__lastRemoteTs') || 0));
  useEffect(() => {
    // Viewer-role sessions (minted for the sign-in QR / Remote Control) are companions, not
    // independent players — this poll exists for one device to deliberately cast content to
    // another *admin* device. Without this guard, a viewer device sitting idle waiting to be
    // used as a remote would pick up any other device's ordinary content-open (openContent()
    // broadcasts one on every open, not just casts) and hijack itself into playing that content
    // — tearing down whatever it had open (the Remote Control panel, or a just-confirmed QR
    // sign-in) out from under the user, which looked like an unrelated screen flashing open and
    // closing.
    if (!syncDomain || isController()) return;
    const poll = async () => {
      const t = getToken(); if (!t) return;
      try {
        const res = await fetch(`${syncDomain}/api/v1/remote/play`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!res.ok) return;
        const cmd = await res.json();
        if (!cmd || !cmd.videoPath) return;
        if (cmd.sourceSession === SESSION_ID) return; // ignore self
        if (cmd.timestamp <= lastRemoteTs.current) return; // already handled
        // (Commands older than 60s are dropped server-side, against the server's clock — this
        // device's own clock can't be trusted for that on a TV box.)
        lastRemoteTs.current = cmd.timestamp;
        sessionStorage.setItem('__lastRemoteTs', String(cmd.timestamp));
        // Paths from watch history (Remote Control's History list) carry whatever token was
        // current when they were first opened, which may long since have expired — so any token
        // in them is replaced with this device's own current one (`t`, from the top of poll()).
        const retoken = (url) => {
          if (!url) return url;
          try {
            const u = new URL(url);
            if (!u.searchParams.has('token')) return url;
            u.searchParams.set('token', t);
            return u.toString();
          } catch { return url; }
        };
        cmd.videoPath = retoken(cmd.videoPath);
        cmd.srtPath = retoken(cmd.srtPath);
        cmd.filterPath = retoken(cmd.filterPath);
        cmd.imagePath = retoken(cmd.imagePath);
        // Navigate directly — don't call openContent to avoid re-broadcasting
        StorageHelper.addToWatchHistory({ videoPath: cmd.videoPath, srtPath: cmd.srtPath, filterPath: cmd.filterPath, imagePath: cmd.imagePath });
        if (cmd.filterPath) localStorage.setItem('currentFilterPath', cmd.filterPath);
        else localStorage.removeItem('currentFilterPath');
        const str = window.location.origin + '#/'
          + btoa(encodeURIComponent(cmd.videoPath)) + '/'
          + btoa(encodeURIComponent(cmd.srtPath || '')) + '/'
          + btoa(encodeURIComponent(cmd.filterPath || ''));
        window.location.href = str;
        window.location.reload();
      } catch (e) { console.error('[remote] poll err', e); }
    };
    const id = setInterval(poll, 1_500);
    return () => clearInterval(id);
  }, [syncDomain, videoName]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const server = urlParams.get('domain');
    const token = urlParams.get('token');

    let needsReload = false;

    if (token) {
      try {
        // JWTs are base64url (- and _, no padding), not plain base64 (+ and /) — atob() throws
        // on the former whenever the payload happens to contain either character, which is
        // common enough that this was silently failing often, leaving `role` out of the stored
        // user object every time (the catch branch below never included it at all either) and
        // making admin-vs-viewer UI gating wrong for an otherwise-valid admin token.
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        const { setAuth } = require('./common/auth');
        setAuth(token, { username: payload.username || payload.sub || '', role: payload.role });
        setDeviceKind('controller');
      } catch {
        const { setAuth } = require('./common/auth');
        setAuth(token, {});
        setDeviceKind('controller');
      }
    }

    // The server is chosen by this page's address (see defaultDomain), so a ?domain= link only
    // applies when it matches — adopting another one would just be undone on the next load.
    if (server && server === defaultDomain() && server !== localStorage.getItem('domain')) {
      localStorage.setItem('domain', server);
      localStorage.setItem('remoteMeta', '');
      localStorage.setItem('remotePath', '');
      needsReload = true;
    }

    if (needsReload || token) {
      const clean = window.location.origin + window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', clean);
      // A token was applied (or the domain changed) via localStorage/setAuth just above, but
      // components that already read auth/domain state at mount (e.g. Menu's currentUser) have
      // no way to find out — without reloading, the scan/link visibly does nothing even though
      // the new session is actually stored correctly.
      window.location.reload();
    }
  }, []);


  const ref = useRef(null);

  const loadAll = useCallback(
    () => {
      let videoURL = '';
      let subtitleURL = '';
      let filterURL = '';
      const paramsURL = window.location.hash;

      const params = paramsURL.split('/');
      if (params.length === 0 || (params.length === 1 && params[0].length === 0)) return;
      if (paramsURL !== '/' && params.length >= 2) {
        if (params[1] && params[1].length > 0) {
          videoURL = decodeURIComponent(atob(params[1]));
        }
        if (params[2] && params[2].length > 0) {
          subtitleURL = decodeURIComponent(atob(params[2]));
        }
        if (params[3] && params[3].length > 0) {
          filterURL = decodeURIComponent(atob(params[3]));
        }
      }

      if (videoURL) {
        // videoURL carries a `?token=...` auth query string appended after the filename (no `/`
        // in between), so stripping only up to the last `/` left the token riding along inside
        // videoName — which then gets broadcast as-is to any remote-control poller, including a
        // view-only device that scanned the sign-in QR code, handing it a live admin token.
        const fileName = videoURL.split('?')[0].replace(/^.*[\\\/]/, '') || 'sample';
        setVideoSrc(videoURL);
        setVideoName(fileName);
      }

      if (subtitleURL.toLowerCase().startsWith('http')) {
        SrtClass.ReadFile(subtitleURL).then((records) => {
          setSubtitle(records)
          setSubtitleName(subtitleURL);
        });
      } else {
        setSubtitle([]);
        setSubtitleName("")
      }

      if (filterURL.toLowerCase().startsWith('http')) {
        setFilterPath(filterURL);
        SceneGuideClass.ReadFile(filterURL).then((records) => {
          addFilterItems(records);
        });
      } else {
        setFilterPath('');
        setFilterItems([]);
      }
    }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll])

  useEffect(() => {
    window.onhashchange = () => {
      loadAll();
    }
  }, [loadAll]);


  useEffect(() => {
    if(Utils.hasActiveInput()) return;
    const { modalOpen } = props;
    if (modalOpen || !keyEvent) return;
    switch (keyEvent.keyCode) {
      case KEY.E:
        setShowEditor(!showEditor);
        break;
      case KEY.C:
        setShowConfig(!showConfig);
        break;
    }
  }, [keyEvent]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      setKeyEvent(e);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showEditor, showConfig]);

  // Temporary: reports why the home screen's QR area is or isn't showing on load — a report of
  // "no QR code" couldn't be reproduced from a clean browser, so this records the actual state
  // (most likely explanation: a stale #/... hash left over from earlier in the browser's history
  // re-opening old content on every load instead of landing on the idle home screen).
  useEffect(() => {
    debugLog('App mount: home QR area state', {
      videoName, isLoading, domain: syncDomain, hasToken: !!getToken(), role: getUser()?.role,
      hash: window.location.hash?.slice(0, 80),
      kind: localStorage.getItem('rc_device_kind'), pairing: !!PENDING_QR,
      nativeQr: !!window.__scNativeQrScanner, inApp: !!window.flutter_inappwebview,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="App" ref={ref}>
      <Menu />
      {pendingQr && <QrScanHandler domain={pendingQr.domain} qrId={pendingQr.id} onDone={() => setPendingQr(null)} />}
      {isLoading &&
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translateX(-50%) translateY(-50%);' }}><Loader /></div>
      }
      <div className="App-content" style={{ opacity: isLoading ? 0 : 1 }}>
        {!videoName && !isLoading && <HomeQR domain={syncDomain} />}
        <div className={videoName ? 'App-player-active' : undefined} style={{ width: '100%', margin: '0 auto', marginTop: '32px' }}>
          <Player />
        </div>
        <p style={{ marginTop: '15px', marginBottom: '15px' }} >{videoName}</p>
        <ToggleButton on={showEditor} onClick={() => { setShowEditor(!showEditor) }}>Editor</ToggleButton>
        <ToggleButton on={showConfig} onClick={() => { setShowConfig(!showConfig) }}>Config</ToggleButton>
        <ToggleButton on={showSubtitle} onClick={() => { setShowSubtitle(!showSubtitle) }}>{"Subtitle " + (syncConfig.subtitleDelay ? syncConfig.subtitleDelay : "")}</ToggleButton>
        <button className="history-open-btn" onClick={() => setShowHistory(true)}>History</button>
        {seriesCount > 1 && (
          <button className="history-open-btn" onClick={() => setShowSeries(true)}>Series <span style={{fontSize:'11px',opacity:0.7}}>({seriesCount})</span></button>
        )}
        {showEditor &&
          <div className='filter-container'>
            <FilterEditor />
          </div>
        }
        {showSubtitle &&
          <div className='filter-container'>
            <SubtitleEditor />
          </div>
        }
        {showConfig &&
          <div className='config-container'>
            <ConfigEditor />
          </div>
        }
      </div>
      {showHistory && <History close={() => setShowHistory(false)} currentVideo={videoName} />}
      {showSeries && <SeriesPanel close={() => setShowSeries(false)} />}
    </div >
  );
}

const mapStateToProps = state => {
  const modalOpen = selectModalOpen(state);
  const isLoading = selectVideoIsLoading(state);
  const videoName = (selectVideoName(state) || "").replace(/\.[^/.]+$/, "");
  return { modalOpen, isLoading, videoName };
};

export default connect(
  mapStateToProps,
  { addFilterItems, setVideoSrc, setSubtitle, setSubtitleName, setDuration, setTime, setVideoName, setFilterPath }
)(App);
