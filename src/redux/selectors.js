import store from './store'
import SrtClass from '../common/SrtClass'
import {SceneGuideClass} from '../common/SceneGuide'

export const getRecords = () => {
    const state = store.getState();
    return state.sceneFilter.records;
}

export const getSubtitle = () => {
    const state = store.getState();
    return state.media.subtitle;
}

export const getVideoSrc = () => {
    const state = store.getState();
    return state.media.videoSrc;
}

export const getVideoName = () => {
    const state = store.getState();
    return state.media.videoName;
}

export const getTime = () => {
    const state = store.getState();
    return state.media.time;
}

export const getDuration = () => {
    const state = store.getState();
    return state.media.duration;
}

export const getPlayerConfig = () => {
    const state = store.getState();
    return state.media.playerConfig;
}

export const getVolume = () => {
    const state = store.getState();
    return state.media.volume;
}

export const getSpeed = () => {
    const state = store.getState();
    return state.media.speed;
}

export const getPlayerState = () => {
    const state = store.getState();
    return state.media.playerState;
}


//HELPERS
export const getSubtitleAtTime = (time) => {
    const subtitle = getSubtitle();
    return SrtClass.GetContentAt(subtitle ,time);
}

export const getRecordsAtTime = (time) => {
    const records = getRecords();
    return SceneGuideClass.GetRecordsAtTime(records ,time);
}
