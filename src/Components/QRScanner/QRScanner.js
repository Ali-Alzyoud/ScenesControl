import React, { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { MdClose, MdQrCodeScanner } from 'react-icons/md'

import './style.css'

// Scans a QR code with the device camera and, if it decodes to one of this app's own links (the
// home screen QR's `qr` id; `qrlogin`/`token` are older forms of it), follows it exactly as
// opening it via the OS camera app would — App.js picks it up from there. An in-app alternative
// to that same hand-off, not a new auth mechanism.
// The Android app (from 1.4.9) scans natively — real autofocus, zoom and ML Kit decoding — which
// reads the screen's code from much farther away than this page's own camera can.
const hasNativeScanner = () => !!(window.__scNativeQrScanner && window.flutter_inappwebview?.callHandler);

// A scanned home-screen QR is followed on *this* page's own address, exactly as a typed code is,
// rather than navigating to whatever address the scanned screen happened to be using — that is
// the only thing that differed between the two ways of pairing.
const followScannedLink = (text) => {
    const { debugLog } = require('../../common/auth');
    let parsed = null;
    try { parsed = new URL(text); } catch {}
    const id = parsed?.searchParams.get('qr') || parsed?.searchParams.get('qrlogin');
    debugLog('QR scanned', { origin: parsed?.origin || null, hasQrId: !!id, native: hasNativeScanner() });
    if (!id) { window.location.href = text; return; } // older token-style links
    const params = { qr: id };
    const domain = parsed.searchParams.get('domain');
    if (domain) params.domain = domain;
    window.location.href = window.location.origin + window.location.pathname + '?' + new URLSearchParams(params).toString();
};

const isLoginLink = (text) => {
    let parsed;
    try { parsed = new URL(text); } catch { return false; }
    return !!(parsed.searchParams.get('qr') || parsed.searchParams.get('qrlogin') || parsed.searchParams.get('token'));
};

function QRScanner({ onClose }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const rafRef = useRef(null);
    const [error, setError] = useState(''); // fatal — camera never started, video isn't shown
    const [hint, setHint] = useState('');   // transient — shown alongside the still-live video
    const [frameCount, setFrameCount] = useState(0); // visible proof the scan loop is still alive
    // Camera zoom, where the device exposes it: the single biggest help for a code across the
    // room, since it adds real sensor pixels per QR square instead of just enlarging the preview.
    const [zoomRange, setZoomRange] = useState(null); // { min, max } | null
    // Typed alternative to scanning: the 4-digit code shown under the screen's QR.
    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState('');
    const [codeBusy, setCodeBusy] = useState(false);
    const native = hasNativeScanner();

    const scanNative = async () => {
        setHint('');
        try {
            const text = await window.flutter_inappwebview.callHandler('scanQr');
            if (!text) return; // closed, or camera not allowed
            if (isLoginLink(text)) followScannedLink(text);
            else setHint('Not a ScenesControl code — try again');
        } catch (e) {
            setHint(`Scanner error: ${e?.message || e}`);
        }
    };

    const submitCode = async (value) => {
        if (codeBusy || !/^\d{4}$/.test(value)) return;
        const domain = localStorage.getItem('domain') || `https://${window.location.hostname}:4443`;
        setCodeBusy(true);
        setCodeError('');
        try {
            const res = await fetch(`${domain}/api/v1/auth/qr-code/${value}/resolve`, { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.id) { setCodeError(data.error || 'Code not found'); setCode(''); return; }
            // Continue exactly as if the QR itself had been scanned.
            const params = { qr: data.id };
            if (domain !== `https://${window.location.hostname}:4443`) params.domain = domain;
            window.location.href = window.location.origin + window.location.pathname + '?' + new URLSearchParams(params).toString();
        } catch {
            setCodeError("Can't reach server");
        } finally {
            setCodeBusy(false);
        }
    };

    const onCodeChange = (e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
        setCode(value);
        setCodeError('');
        if (value.length === 4) submitCode(value);
    };
    const [zoom, setZoom] = useState(1);

    const cycleZoom = async () => {
        const track = streamRef.current?.getVideoTracks()?.[0];
        if (!track || !zoomRange) return;
        const steps = [1, 2, 3, 4].filter(z => z >= zoomRange.min && z <= zoomRange.max);
        const next = steps[(steps.indexOf(zoom) + 1) % steps.length] ?? zoomRange.min;
        try { await track.applyConstraints({ advanced: [{ zoom: next }] }); setZoom(next); } catch {}
    };

    // Tap-to-focus fallback for devices/browsers where continuous autofocus isn't honored via
    // getUserMedia — pointsOfInterest support is even less universal than focusMode, so this is
    // a bonus on top of the continuous-AF request below, not a replacement for it.
    const handleTapFocus = async (e) => {
        const track = streamRef.current?.getVideoTracks()?.[0];
        if (!track) return;
        try {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            await track.applyConstraints({ advanced: [{ pointsOfInterest: [{ x, y }] }] });
        } catch {}
    };

    useEffect(() => {
        if (native) { scanNative(); return undefined; }
        let cancelled = false;
        let decoded = false;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');


        const handleDecoded = (text) => {
            if (decoded) return;
            if (isLoginLink(text)) {
                decoded = true;
                followScannedLink(text);
                return;
            }
            setHint('Not a ScenesControl login code — keep scanning…');
        };

        // Native BarcodeDetector (Chrome on Android, among others) is far faster than jsQR and
        // much better at small or distant codes, so it's used whenever it's available and
        // supports QR; jsQR is the fallback everywhere else.
        let detector = null;
        if (typeof window.BarcodeDetector === 'function') {
            window.BarcodeDetector.getSupportedFormats?.()
                .then(formats => { if (formats.includes('qr_code')) detector = new window.BarcodeDetector({ formats: ['qr_code'] }); })
                .catch(() => {});
        }

        // jsQR fallback: alternates between the full frame and its central 50%. A code that's far
        // away is a small patch of the full frame, where jsQR's thresholding tends to miss it;
        // cropped to the centre, the same pixels make up a much larger share of what's analysed.
        let cropNext = false;
        const decodeWithJsQR = (video) => {
            const vw = video.videoWidth, vh = video.videoHeight;
            const crop = cropNext;
            cropNext = !cropNext;
            const sx = crop ? vw / 4 : 0, sy = crop ? vh / 4 : 0;
            const sw = crop ? vw / 2 : vw, sh = crop ? vh / 2 : vh;
            canvas.width = sw;
            canvas.height = sh;
            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
            const imageData = ctx.getImageData(0, 0, sw, sh);
            return jsQR(imageData.data, sw, sh, { inversionAttempts: 'attemptBoth' })?.data;
        };

        // Throttled to a few attempts per second — decoding a full camera frame is expensive
        // enough that doing it 60x/sec saturates a phone's main thread and makes the UI (the
        // close button included) unresponsive. Rescheduling is unconditional and errors are
        // shown rather than swallowed: an exception escaping a requestAnimationFrame callback
        // would otherwise silently stop scanning while the camera still looks live, and
        // frameCount shows whether the loop is still running.
        const SCAN_INTERVAL_MS = 150;
        let lastAttempt = 0;
        let attemptsSinceRender = 0;
        let busy = false; // BarcodeDetector is async; never overlap two decodes
        const tick = async (now) => {
            if (cancelled || decoded) return;
            if (!busy && now - lastAttempt >= SCAN_INTERVAL_MS) {
                lastAttempt = now;
                const video = videoRef.current;
                if (video && video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
                    busy = true;
                    try {
                        let text = null;
                        if (detector) {
                            const codes = await detector.detect(video);
                            text = codes[0]?.rawValue || null;
                        } else {
                            text = decodeWithJsQR(video);
                        }
                        if (text) handleDecoded(text);
                        attemptsSinceRender++;
                        if (attemptsSinceRender >= 3) { // avoid a setState every single attempt too
                            attemptsSinceRender = 0;
                            setFrameCount(c => c + 3);
                        }
                    } catch (e) {
                        // A native detector that errors is dropped for jsQR rather than retried.
                        if (detector) detector = null;
                        else setHint(`Scan error: ${e?.message || e}`);
                    } finally {
                        busy = false;
                    }
                }
            }
            if (!cancelled && !decoded) rafRef.current = requestAnimationFrame(tick);
        };

        // navigator.mediaDevices is entirely absent (not just permission-denied) when the page
        // isn't loaded from a secure context — HTTPS or localhost only. A plain-HTTP LAN address
        // (e.g. http://192.168.4.17) never gets camera access no matter what the user clicks, so
        // this needs its own message rather than falling into the generic denied/unavailable one.
        if (!navigator.mediaDevices?.getUserMedia) {
            setError(
                window.location.protocol === 'https:'
                    ? 'Camera access unavailable in this browser'
                    : 'Camera requires a secure connection — open this site over https:// instead of http://'
            );
            return () => { cancelled = true; };
        }

        navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                // Asking for zoom here is what grants it: without it, browsers leave zoom out
                // of the track's capabilities entirely, so the Zoom button never appeared.
                zoom: true,
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                // Requested here too, not just via applyConstraints after the stream starts —
                // some browsers only honor focusMode when it's part of the initial constraints.
                advanced: [{ focusMode: 'continuous' }],
            },
        })
            .then(async stream => {
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                // Some devices default a getUserMedia stream to a fixed focus distance instead
                // of continuous autofocus. Applied again directly on the live track since the
                // initial constraint above isn't reliably honored by itself. Tried
                // unconditionally, not gated on getCapabilities() first — that reporting is
                // itself inconsistent across browsers and can under-report support that's
                // actually there, silently skipping the fix. applyConstraints throws for a
                // genuinely unsupported constraint either way, which this just ignores.
                const [track] = stream.getVideoTracks();
                try { await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }); } catch {}
                const caps = track.getCapabilities?.() || {};
                if (caps.zoom && caps.zoom.max > (caps.zoom.min || 1)) {
                    setZoomRange({ min: caps.zoom.min || 1, max: caps.zoom.max });
                }
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
                rafRef.current = requestAnimationFrame(tick);
            })
            .catch(() => setError('Camera access denied or unavailable'));

        return () => {
            cancelled = true;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            streamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, []);

    return (
        <div className="qr-scanner-overlay" onClick={onClose}>
            <div className="qr-scanner-panel" onClick={e => e.stopPropagation()}>
                <div className="qr-scanner-header">
                    <span>Scan QR code</span>
                    <button className="qr-scanner-close" onClick={onClose}><MdClose /></button>
                </div>
                {native && (
                    <button className="qr-scanner-native-btn" onClick={scanNative}>
                        <MdQrCodeScanner /> Scan with camera
                    </button>
                )}
                {native && hint && <div className="qr-scanner-hint">{hint}</div>}
                {!native && !error && <video ref={videoRef} className="qr-scanner-video" playsInline muted onClick={handleTapFocus} />}
                {!native && error && <div className="qr-scanner-error">{error}</div>}
                {!native && !error && zoomRange && (
                    <button className="qr-scanner-zoom" onClick={cycleZoom}>Zoom {zoom}×</button>
                )}
                {!native && !error && <div className="qr-scanner-hint">{hint || 'Tap the preview to focus'}</div>}
                {!native && !error && <div className="qr-scanner-debug">frames checked: {frameCount}</div>}
                <form className="qr-scanner-code" onSubmit={e => { e.preventDefault(); submitCode(code); }}>
                    <label htmlFor="qr-scanner-code-input">Or enter the code shown on the screen</label>
                    <input
                        id="qr-scanner-code-input"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        maxLength={4}
                        placeholder="0000"
                        value={code}
                        onChange={onCodeChange}
                        disabled={codeBusy}
                    />
                    {codeError && <div className="qr-scanner-error">{codeError}</div>}
                </form>
            </div>
        </div>
    );
}

export default QRScanner;
