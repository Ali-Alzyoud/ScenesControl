// Fullscreen requested from a remote. Browsers only allow the real Fullscreen API in response to
// a key press or click on the page itself, and a command arriving from another device doesn't
// count — so the page can't take over the whole monitor on its own. Instead:
//  - it immediately fills the browser window (CSS "pseudo" fullscreen), and
//  - it arms the very next key press or click on this screen to switch to real fullscreen,
//    swallowing that input so it doesn't also pause the video or trigger anything else.
// Inside the Android/TV app the WebView already covers the whole screen (the app hides the system
// bars), so filling the window is already full screen there and nothing is armed.

const PSEUDO_CLASS = 'rc-pseudo-fullscreen';
const HINT_ID = 'rc-fullscreen-hint';
let disarm = null;

const removeHint = () => document.getElementById(HINT_ID)?.remove();

const showHint = () => {
    removeHint();
    const hint = document.createElement('div');
    hint.id = HINT_ID;
    hint.textContent = 'Press any key or click to go fullscreen';
    document.body.appendChild(hint);
    setTimeout(() => hint.classList.add('rc-fullscreen-hint--faded'), 8000);
};

const arm = () => {
    if (window.flutter_inappwebview) return;
    disarm?.();
    showHint();
    const swallowNextClick = (e) => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); };
    const onInput = (e) => {
        if (e.type === 'keydown' && e.key === 'Escape') return; // Escape exits instead (see below)
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        disarm?.();
        // A pointerdown is followed by a click that would toggle play/pause — eat that too.
        if (e.type === 'pointerdown') window.addEventListener('click', swallowNextClick, { capture: true, once: true });
        const el = document.querySelector('.playercontainer');
        el?.requestFullscreen?.()
            .then(() => document.body.classList.remove(PSEUDO_CLASS))
            .catch(() => {});
    };
    window.addEventListener('keydown', onInput, true);
    window.addEventListener('pointerdown', onInput, true);
    disarm = () => {
        window.removeEventListener('keydown', onInput, true);
        window.removeEventListener('pointerdown', onInput, true);
        removeHint();
        disarm = null;
    };
};

export const isRemoteFullscreen = () => !!document.fullscreenElement || document.body.classList.contains(PSEUDO_CLASS);

// Leaves either kind; returns whether it was in the CSS kind (so callers can stop there).
export const exitPseudoFullscreen = () => {
    disarm?.();
    if (!document.body.classList.contains(PSEUDO_CLASS)) return false;
    document.body.classList.remove(PSEUDO_CLASS);
    return true;
};

export const toggleRemoteFullscreen = () => {
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
    if (exitPseudoFullscreen()) return;
    const enterPseudo = () => { document.body.classList.add(PSEUDO_CLASS); arm(); };
    const req = document.querySelector('.playercontainer')?.requestFullscreen?.();
    if (req && typeof req.catch === 'function') req.catch(enterPseudo);
    else enterPseudo();
};
