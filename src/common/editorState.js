// Whether the filter editor is open (App's "Editor" switch), for parts of the player that change
// while editing — e.g. the seekbar marks the filter's scenes.
import { useEffect, useState } from 'react';

let open = false;
const listeners = new Set();

export const setEditorOpen = (value) => {
    if (open === !!value) return;
    open = !!value;
    listeners.forEach(l => l());
};

// (React 17 here: no useSyncExternalStore.)
export const useEditorOpen = () => {
    const [value, setValue] = useState(open);
    useEffect(() => {
        const l = () => setValue(open);
        listeners.add(l);
        l();
        return () => { listeners.delete(l); };
    }, []);
    return value;
};

// Whether the selected record's rectangles are hidden on the video (the timeline's "Hide
// rectangle"), to see the frame underneath.
let rectsHidden = false;
const rectListeners = new Set();
export const setRectsHidden = (value) => {
    if (rectsHidden === !!value) return;
    rectsHidden = !!value;
    rectListeners.forEach(l => l());
};
export const useRectsHidden = () => {
    const [value, setValue] = useState(rectsHidden);
    useEffect(() => {
        const l = () => setValue(rectsHidden);
        rectListeners.add(l);
        l();
        return () => { rectListeners.delete(l); };
    }, []);
    return value;
};
