import {
  SET_SUBTITLE,
  VIDEO_SRC,
  VIDEO_IS_LOADING,
  VIDEO_SRC_NAME,
  SET_TIME,
  SET_DURATION,
  SET_VOLUME,
  SET_MUTE,
  SET_SPEED,
  ADD_ITEMS,
  SET_ITEMS,
  REMOVE_ITEM_INDEX,
  REMOVE_ALL,
  UPDATE_ITEM,
  SET_PLAYER_STATE,
  SET_PLAYER_CONFIG,
  SET_FONT_CONFIG,
  SET_SYNC_CONFIG,
  SET_MODAL_OPEN,
  SET_DRAWING_ENABLED,
  SET_DRAWING_RECT,
  SET_TOAST_TEXT,
  SET_TOAST_TIMEOUT
} from "./actionTypes";

export const setSubtitle = subtitle => ({
  type: SET_SUBTITLE,
  payload: {
    subtitle
  }
});

export const setVideoSrc = videoSrc => ({
  type: VIDEO_SRC,
  payload: { videoSrc }
});

export const setVideoName = videoName => ({
  type: VIDEO_SRC_NAME,
  payload: { videoName }
});

export const setTime = (time) => {
  return {
    type: SET_TIME,
    payload: { time }
  };
}
export const setDuration = (duration) => {
  return {
    type: SET_DURATION,
    payload: { duration }
  }
};
export const setVolume = (volume) => {
  return {
    type: SET_VOLUME,
    payload: { volume }
  }
};
export const setMute = (mute) => {
  return {
    type: SET_MUTE,
    payload: { mute }
  }
};
export const setSpeed = (speed) => {
  return {
    type: SET_SPEED,
    payload: { speed }
  }
};
export const setPlayerState = (playerState) => {
  return {
    type: SET_PLAYER_STATE,
    payload: { playerState }
  }
};

export const setPlayerConfig = (playerConfig) => {
  return {
    type: SET_PLAYER_CONFIG,
    payload: { playerConfig }
  }
};

export const setModalOpen = (modalOpen) => {
  return {
    type: SET_MODAL_OPEN,
    payload: { modalOpen }
  }
};

export const setVideoIsLoading = (videoIsLoading) => {
  return {
    type: VIDEO_IS_LOADING,
    payload: { videoIsLoading }
  }
};

export const addFilterItems = records => ({
  type: ADD_ITEMS,
  payload: { records }
});

export const setFilterItems = records => ({
  type: SET_ITEMS,
  payload: { records }
});

export const removeFilterIndex = index => ({
  type: REMOVE_ITEM_INDEX,
  payload: { index }
});

export const removeAllFilters = () => ({
  type: REMOVE_ALL,
  payload: {}
});

export const updateFilterItem = (record, index) => ({
  type: UPDATE_ITEM,
  payload: { record, index }
});

export const setSettings_fontConfig = (fontConfig) => ({
  type: SET_FONT_CONFIG,
  payload: { fontConfig }
});

export const setSettings_syncConfig = (syncConfig) => ({
  type: SET_SYNC_CONFIG,
  payload: { syncConfig }
});

export const setDrawingEnabled = (enabled) => ({
  type: SET_DRAWING_ENABLED,
  payload: { enabled }
});

export const setDrawingRect = (rect) => ({
  type: SET_DRAWING_RECT,
  payload: { rect }
});


export const setToastText = (text) => ({
  type: SET_TOAST_TEXT,
  payload: { text }
});

export const setToastTimeout = (timeout) => ({
  type: SET_TOAST_TIMEOUT,
  payload: { timeout }
});
