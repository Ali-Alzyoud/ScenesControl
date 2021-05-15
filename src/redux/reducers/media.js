import { SET_SUBTITLE, SET_VIDEO, SET_TIME, SET_DURATION, SET_VOLUME, SET_PLAYER_STATE, SET_PLAYER_CONFIG, PLAYER_ACTION } from "../actionTypes";


const initialState = {
  subtitle: [],
  videoSrc: null,
  time: 0,
  duration: 0,
  volume: 1.0,
  playerState: 'pause',
  playerConfig: {
    violence : PLAYER_ACTION.BLUR,
    nudity : PLAYER_ACTION.BLUR,
    profanity : PLAYER_ACTION.MUTE,
  }
};

const Media = (state = initialState, action) => {
  switch (action.type) {
    case SET_SUBTITLE: {
      const { subtitle } = action.payload;
      return {
        ...state,
        subtitle: subtitle,
      };
    }
    case SET_VIDEO: {
        const { videoSrc } = action.payload;
        return {
          ...state,
          videoSrc: videoSrc,
        };
      }
    case SET_TIME: {
      let { time } = action.payload;
      time = Math.max(time, 0);
      time = Math.min(time, state.duration);
      return {
        ...state,
        time: time,
      };
    }
    case SET_DURATION: {
      const { duration } = action.payload;
      return {
        ...state,
        duration: duration,
      };
    }
    case SET_VOLUME: {
      const { volume } = action.payload;
      return {
        ...state,
        volume: volume,
      };
    }
    case SET_PLAYER_STATE: {
      const { playerState } = action.payload;
      return {
        ...state,
        playerState: playerState,
      };
    }
    case SET_PLAYER_CONFIG: {
      const { playerConfig } = action.payload;
      return {
        ...state,
        playerConfig: {...state.playerConfig,...playerConfig},
      };
    }
    default:
      return state;
  }
}

export default Media;
