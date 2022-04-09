import { combineReducers } from "redux";
import sceneFilter from "./sceneFilter";
import media from "./media";
import settings from "./settings";
import drawing from "./drawing";
import toast from "./toast";

export default combineReducers({
    sceneFilter,
    media,
    settings,
    drawing,
    toast
});
