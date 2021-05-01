import {SceneType} from './SceneGuide'

const PLAYER_ACTION = {
    BLUR : 'Blur',
    BLACK : 'Black screen',
    SKIP : 'Skip',
    MUTE : 'Mute',
    NOACTION : 'No Action',
}

const PlayerConfig = {
    [SceneType.Violence] : PLAYER_ACTION.BLUR,
    [SceneType.Nudity] : PLAYER_ACTION.BLUR,
    [SceneType.Gore] : PLAYER_ACTION.BLUR,
    [SceneType.Profanity] : PLAYER_ACTION.MUTE,
    UpdateConfig: (violence, nudity, gore, profanity) => {
        PlayerConfig[SceneType.Violence] = violence;
        PlayerConfig[SceneType.Nudity] = nudity;
        PlayerConfig[SceneType.Profanity] = profanity;
        PlayerConfig[SceneType.Gore] = gore;
    }
}

export {PlayerConfig, PLAYER_ACTION};