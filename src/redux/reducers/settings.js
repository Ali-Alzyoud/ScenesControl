import { SET_FONT_CONFIG } from "../actionTypes";

const fontConfigJSON = localStorage.getItem("fontConfig");
const savedFontConfig = fontConfigJSON ? JSON.parse(fontConfigJSON) : {
  size: 40,
  transparency: 0.7,
};
const initialState = {
  fontConfig: savedFontConfig,
};

const Settings = (state = initialState, action) => {
  switch (action.type) {
    case SET_FONT_CONFIG: {
      const { fontConfig } = action.payload;
      localStorage.fontConfig = JSON.stringify(fontConfig);
      return {
        ...state,
        fontConfig,
      };
    }
    default:
      return state;
  }
}

export default Settings;
