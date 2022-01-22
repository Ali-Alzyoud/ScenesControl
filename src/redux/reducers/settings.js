import { SET_FONT_CONFIG, SET_MODAL_OPEN } from "../actionTypes";

const fontConfigJSON = localStorage.getItem("fontConfig");
const savedFontConfig = fontConfigJSON ? JSON.parse(fontConfigJSON) : {
  size: 40,
  transparency: 0.7,
};
const initialState = {
  fontConfig: savedFontConfig,
  modalOpen: false,
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
    case SET_MODAL_OPEN: {
      const { modalOpen } = action.payload;
      return {
        ...state,
        modalOpen: modalOpen,
      };
    }
    default:
      return state;
  }
}

export default Settings;
