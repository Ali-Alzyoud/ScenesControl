import { SET_FONT_SIZE } from "../actionTypes";

const initialState = {
  fontSize: Number(localStorage.getItem("fontSize") ? localStorage.getItem("fontSize") : 40),
};

const Settings = (state = initialState, action) => {
  switch (action.type) {
    case SET_FONT_SIZE: {
      const { fontSize } = action.payload;
      localStorage.fontSize = fontSize;
      return {
        ...state,
        fontSize,
      };
    }
    default:
      return state;
  }
}

export default Settings;
