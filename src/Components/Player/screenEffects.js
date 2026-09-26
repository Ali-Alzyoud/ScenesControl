// Black/blur screen toggles live in VideoPlayer's component state. They're mirrored here so
// VideoControls' remote-control status push can report them, and a remote toggles them by
// dispatching SCREEN_EFFECT_EVENT with detail { effect: 'black' | 'blur' }.
export const SCREEN_EFFECT_EVENT = 'rc:screen-effect';
export const screenEffects = { black: false, blur: false };
