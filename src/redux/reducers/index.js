import { combineReducers } from "redux";
import sceneFilter from "./sceneFilter";
import media from "./media";
import settings from "./settings";

export default combineReducers({ sceneFilter, media, settings });
