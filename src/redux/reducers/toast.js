
import { SET_TOAST_TEXT, SET_TOAST_TIMEOUT } from "../actionTypes";

const initialState = {
  text: '',
  timeout: 1000
};

const Toast = (state = initialState, action) => {
  switch (action.type) {
    case SET_TOAST_TEXT: {
      const { text } = action.payload;
      return {
        ...state,
        text,
      };
    }
    case SET_TOAST_TIMEOUT: {
      const { timeout } = action.payload;
      return {
        ...state,
        timeout,
      };
    }
    default:
      return state;
  }
}

export default Toast;
