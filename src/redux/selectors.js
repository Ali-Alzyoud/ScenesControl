import store from './store'
import SrtClass from '../common/SrtClass'
import { SceneGuideClass } from '../common/SceneGuide'

export const selectRecords = (state) => {
    return state.sceneFilter.records;
}

export const selectSubtitle = (state) => {
    return state.media.subtitle;
}

export const selectVideoSrc = (state) => {
    return state.media.videoSrc;
}

export const selectVideoName = (state) => {
    return state.media.videoName;
}

export const selectTime = (state) => {
    return state.media.time;
}

export const selectDuration = (state) => {
    return state.media.duration;
}

export const selectPlayerConfig = (state) => {
    return state.media.playerConfig;
}

export const selectVolume = (state) => {
    return state.media.volume;
}

export const selectMute = (state) => {
    return state.media.mute;
}

export const selectSpeed = (state) => {
    return state.media.speed;
}

export const selectPlayerState = (state) => {
    return state.media.playerState;
}

export const selectModalOpen = (state) => {
    return state.settings.modalOpen;
}

export const selectVideoIsLoading = (state) => {
    return state.media.videoIsLoading;
}

//Settings
export const getFontConfig = (state) => {
    return state.settings.fontConfig;
}

export const getSyncConfig = (state) => {
    return state.settings.syncConfig;
}

//Drawing
export const selectDrawingEnabled = (state) => {
    return state.drawing.enabled;
}

export const selectDrawingRect = (state) => {
    return state.drawing.rect;
}

//HELPERS
export const getSubtitleAtTime = (time) => {
    const subtitle = selectSubtitle(store.getState());
    return SrtClass.GetContentAt(subtitle, time);
}

export const getRecordsAtTime = (time) => {
    const records = selectRecords(store.getState());
    return SceneGuideClass.GetRecordsAtTime(records, time);
}
