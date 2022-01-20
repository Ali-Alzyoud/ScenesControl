import { SET_SUBTITLE, SET_VIDEO, SET_VIDEO_NAME, SET_TIME, SET_DURATION, SET_VOLUME, SET_MUTE, SET_SPEED, SET_PLAYER_STATE, SET_PLAYER_CONFIG, PLAYER_ACTION } from "../actionTypes";


const playerConfigJSON = localStorage.getItem("playerConfig");
const savedPlayerConfig = playerConfigJSON ? JSON.parse(playerConfigJSON) : {
  violence : [PLAYER_ACTION.BLUR, PLAYER_ACTION.NOACTION],
  nudity : [PLAYER_ACTION.SKIP, PLAYER_ACTION.MUTE],
  profanity : [PLAYER_ACTION.NOACTION, PLAYER_ACTION.MUTE],
}

const initialState = {
  subtitle: [],
  videoSrc: null,
  videoName: 'myFile',
  time: 0,
  duration: 0,
  volume: 1.0,
  mute: false,
  speed: 1.0,
  playerState: 'pause',
  playerConfig: savedPlayerConfig
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
    case SET_VIDEO_NAME: {
      const {videoName} = action.payload;
      return {
        ...state,
        videoName: videoName,
      };
    }
    case SET_TIME: {
      let { time } = action.payload;
      time = Math.max(time, 0);
      if (state.duration) {
        time = Math.min(time, state.duration);
      }
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
      const limitedVolume = Math.min(1, Math.max(volume, 0));
      return {
        ...state,
        volume: limitedVolume,
      };
    }
    case SET_MUTE: {
      const { mute } = action.payload;
      return {
        ...state,
        mute,
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
      localStorage.setItem("playerConfig", JSON.stringify({...state.playerConfig,...playerConfig}));
      return {
        ...state,
        playerConfig: {...state.playerConfig,...playerConfig},
      };
    }
    case SET_SPEED: {
      const { speed } = action.payload;
      return {
        ...state,
        speed,
      }
    }
    default:
      return state;
  }
}

export default Media;
