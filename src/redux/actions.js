import { SET_SUBTITLE, SET_VIDEO, SET_TIME, SET_DURATION, SET_VOLUME, ADD_ITEMS, SET_ITEMS, REMOVE_ITEM_INDEX, REMOVE_ALL, UPDATE_ITEM, SET_PLAYER_STATE, SET_PLAYER_CONFIG } from "./actionTypes";

export const setSubtitle = subtitle => ({
  type: SET_SUBTITLE,
  payload: {
    subtitle
  }
});

export const setVideoSrc = videoSrc => ({
  type: SET_VIDEO,
  payload: { videoSrc }
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
    payload: { }
});

export const updateFilterItem = (record, index) => ({
    type: UPDATE_ITEM,
    payload: { record, index}
});
