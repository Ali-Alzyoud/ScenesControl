import { SET_DRAWING_RECT, SET_DRAWING_ENABLED } from "../actionTypes";

const initialState = {
  rect: null,
  enabled: false
};

const Drawing = (state = initialState, action) => {
  switch (action.type) {
    case SET_DRAWING_RECT: {
      const { rect } = action.payload;
      return {
        ...state,
        rect,
      };
    }
    case SET_DRAWING_ENABLED: {
      const { enabled } = action.payload;
      return {
        ...state,
        enabled,
      };
    }
    default:
      return state;
  }
}

export default Drawing;
