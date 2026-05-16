import './App.css';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Player } from './Components/Player';
 

import Menu from './Components/Menu'
import { QrLoginConfirm } from './Components/Login/Login'
import { getToken } from './common/auth'
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

function HomeQR({ domain }) {
  const [token, setToken] = useState(() => getToken());
  const qrId = useRef(
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );

  // Poll for QR login session when not logged in
  useEffect(() => {
    if (token || !domain) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`${domain}/api/v1/auth/qr-session/${qrId.current}`);
        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            const { setAuth } = require('./common/auth');
            setAuth(data.token, data.user || {});
            setToken(data.token);
          }
        }
      } catch {}
    }, 2000);
    return () => clearInterval(id);
  }, [token, domain]);

  if (!domain) return null;

  if (token) {
    const params = new URLSearchParams({ domain, token });
    const url = window.location.origin + window.location.pathname + '?' + params.toString();
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px 0' }}>
        <p style={{ margin: 0, color: '#888aaa', fontSize: 13 }}>Scan to cast to this screen</p>
        <QRCodeSVG value={url} size={260} bgColor="#000000" fgColor="#ffffff" level="M" />
      </div>
    );
  }

  const loginUrl = (() => {
    const base = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({ domain, qrlogin: qrId.current });
    return base + '?' + params.toString();
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px 0' }}>
      <p style={{ margin: 0, color: '#888aaa', fontSize: 13 }}>Scan to sign in</p>
      <QRCodeSVG value={loginUrl} size={260} bgColor="#000000" fgColor="#ffffff" level="M" />
      <p style={{ margin: 0, color: '#555577', fontSize: 11 }}>Waiting for mobile…</p>
    </div>
  );
}

function App(props) {

  const { addFilterItems, setVideoSrc, setVideoName, setSubtitle, isLoading, videoName, setSubtitleName, setFilterPath } = props;
  const [showEditor, setShowEditor] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSeries, setShowSeries] = useState(false);
  const seriesCount = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('currentList') || '{}').videos?.length || 0 } catch { return 0 }
  }, [videoName]);
  const [keyEvent, setKeyEvent] = useState(null);
  const syncConfig = useSelector(getSyncConfig)
  

  // ── Server sync ──────────────────────────────────────────
  const syncDomain = localStorage.getItem('domain');
  const syncPushTimer = useRef(null);

  // Pull on load + push on sc:data-changed (debounced 60s)
  useEffect(() => {
    if (!syncDomain) return;
    const token = getToken();
    if (!token) return;
    StorageHelper.pullFromServer(syncDomain, token).catch(() => {});

    const onDataChanged = () => {
      clearTimeout(syncPushTimer.current);
      syncPushTimer.current = setTimeout(() => {
        const t = getToken(); if (!t) return;
        StorageHelper.pushToServer(syncDomain, t).catch(() => {});
      }, 60_000);
    };
    window.addEventListener('sc:data-changed', onDataChanged);
    return () => window.removeEventListener('sc:data-changed', onDataChanged);
  }, [syncDomain]);

  // Push favourites immediately on change
  useEffect(() => {
    if (!syncDomain) return;
    const onFavChanged = () => {
      const t = getToken(); if (!t) return;
      clearTimeout(syncPushTimer.current);
      StorageHelper.pushToServer(syncDomain, t).catch(e => console.error('[sync] push err', e));
    };
    window.addEventListener('sc:favourites-changed', onFavChanged);
    return () => window.removeEventListener('sc:favourites-changed', onFavChanged);
  }, [syncDomain]);

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

  // Poll for remote play commands — only when idle (no video loaded)
  // Persist lastRemoteTs in sessionStorage so page reloads don't re-trigger the same command
  const lastRemoteTs = useRef(Number(sessionStorage.getItem('__lastRemoteTs') || 0));
  useEffect(() => {
    if (!syncDomain || videoName) return;
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
        if (cmd.timestamp < Date.now() - 60_000) return; // ignore commands older than 60s
        lastRemoteTs.current = cmd.timestamp;
        sessionStorage.setItem('__lastRemoteTs', String(cmd.timestamp));
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
    const id = setInterval(poll, 3_000);
    return () => clearInterval(id);
  }, [syncDomain, videoName]);

  const [qrLogin, setQrLogin] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get('qrlogin') ? { id: p.get('qrlogin'), domain: p.get('domain') || localStorage.getItem('domain') } : null;
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const server = urlParams.get('domain');
    const token = urlParams.get('token');

    let needsReload = false;

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const { setAuth } = require('./common/auth');
        setAuth(token, { username: payload.username || payload.sub || '' });
      } catch {
        const { setAuth } = require('./common/auth');
        setAuth(token, {});
      }
    }

    if (server && server !== localStorage.getItem('domain')) {
      localStorage.setItem('domain', server);
      localStorage.setItem('remoteMeta', '');
      localStorage.setItem('remotePath', '');
      needsReload = true;
    }

    if (needsReload || token) {
      const clean = window.location.origin + window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', clean);
      if (needsReload) window.location.reload();
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
        const fileName = videoURL.replace(/^.*[\\\/]/, '') || 'sample';
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

  if (qrLogin) {
    return <QrLoginConfirm domain={qrLogin.domain} qrId={qrLogin.id} onDone={() => setQrLogin(null)} />;
  }

  return (
    <div className="App" ref={ref}>
      <Menu />
      {isLoading &&
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translateX(-50%) translateY(-50%);' }}><Loader /></div>
      }
      <div style={{ opacity: isLoading ? 0 : 1 }}>
        {!videoName && !isLoading && <HomeQR domain={syncDomain} />}
        <div style={{ width: '100%', margin: '0 auto', marginTop: '32px' }}>
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
