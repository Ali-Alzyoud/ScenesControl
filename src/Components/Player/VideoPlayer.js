import React, { createRef } from "react";
import VideoControls from "./VideoControls";
import VideoFilter from "./VideoFilter";
import VideoSrt from "./VideoSRT";

import { connect } from "react-redux";
import { selectVideoSrc, selectTime, selectVolume, selectMute, selectPlayerState, selectSpeed, selectVideoName, selectVideoIsLoading, selectDrawingEnabled, selectPlayerConfig } from '../../redux/selectors'
import { setTime, setDuration, setPlayerState, setVideoIsLoading, setVolume, setSpeed } from "../../redux/actions";
import ToastMessage from "../Toast";
import Utils from "../../utils/utils";
import StorageHelper from "../../Helpers/StorageHelper";
import { SCREEN_EFFECT_EVENT, screenEffects } from "./screenEffects";
import { exitPseudoFullscreen } from "./remoteFullscreen";
import Hls from "hls.js";
import { getStreamMode, hlsUrlFor, STREAM_MODE_EVENT } from "../../common/streamMode";

const debounce = (func1, func, delay) => {
  let inDebounce;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(inDebounce);
    func1();
    inDebounce = setTimeout(() => func.apply(context, args), delay);
  };
};

class VideoPlayer extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      time: 0,
      duration: 0,
      visible: true,
      visibleAudio: false,
      blackScreen: false,
      blurScreen: false,
      ignoreNextMouseEvent: false,
      speedMulti: 1,
      streamMode: getStreamMode(),
      hlsFailedFor: null, // a videoSrc whose HLS stream failed — played directly instead
    };
    this.hls = null;
    this.player = createRef();
    this.hideTimer = null;
    this.localStorageUpdateCounter = 0;
    this.clickCount = 0;
    this.timer = null;
  }

  keyHandler = (e) => {
    if(Utils.hasActiveInput()) return;
    if (e.code === 'Digit1') {
      this.setState({
        blackScreen: !this.state.blackScreen
      })
    }
    if (e.code === 'Digit2') {
      this.setState({
        blurScreen: !this.state.blurScreen
      })
    }
    if (e.code === 'ArrowUp') {
      this.setState({
        blackScreen: !this.state.blackScreen
      })
    }
    else if(e.code === 'Digit8'){
      const {speedMulti} = this.state;
      if(speedMulti>= 2.6){
        this.setState({
          speedMulti : 1.0
        })
      } else {
        this.setState({
          speedMulti : speedMulti + 1.0
        })
      }
    }
  }

  componentDidMount() {
    this.progressSave = setInterval(() => {

      const { time, videoName, isLoading } = this.props;
      const duration = this.player.current?.duration || 0;
      if (videoName && time && !isLoading){
        StorageHelper.saveContentProgress({videoName, time, duration});
      }
    }, 5000);

    
    document.addEventListener('keydown',this.keyHandler);
    window.addEventListener(SCREEN_EFFECT_EVENT, this.onScreenEffect);
    window.addEventListener(STREAM_MODE_EVENT, this.onStreamModeChange);
    this.setupSource();
  }

  // The HLS stream to play for the current video, or null to play the file directly.
  hlsUrl = () => {
    const { videoSrc } = this.props;
    if (!videoSrc || this.state.hlsFailedFor === videoSrc) return null;
    return hlsUrlFor(videoSrc, this.state.streamMode);
  }

  // Points the <video> at either the original file or the HLS stream. Managed here rather than
  // through a src prop, since hls.js owns the element's source while it's attached.
  setupSource = () => {
    const video = this.player.current;
    if (!video) return;
    if (this.hls) { this.hls.destroy(); this.hls = null; }
    const { videoSrc, videoName } = this.props;
    const url = this.hlsUrl();
    if (!url) {
      if (videoSrc) { if (video.getAttribute('src') !== videoSrc) video.src = videoSrc; }
      else { video.removeAttribute('src'); video.load(); }
      return;
    }
    if (Hls.isSupported()) {
      // Start loading from the saved position, instead of loading the start and then seeking
      // (each seek outside what's already converted restarts the conversion on the server).
      const resume = Number(StorageHelper.getContentProgress({ videoName })) || 0;
      const hls = new Hls({ startPosition: resume > 0 ? resume : -1, maxBufferLength: 30, backBufferLength: 60 });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal || this.hls !== hls) return;
        console.error('[hls] fatal error, playing the original file instead', data.type, data.details);
        this.setState({ hlsFailedFor: videoSrc });
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      this.hls = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url; // Safari plays HLS natively
    } else {
      video.src = videoSrc;
    }
  }

  onStreamModeChange = (e) => {
    const mode = e.detail || getStreamMode();
    if (mode === this.state.streamMode) return;
    // Carry on from the same point, in the same play/pause state, after switching.
    const video = this.player.current;
    const { videoName } = this.props;
    if (video && videoName && video.currentTime > 0) {
      StorageHelper.saveContentProgress({ videoName, time: video.currentTime, duration: video.duration || 0 });
      if (!video.paused) sessionStorage.setItem('rc_resume_play', '1');
    }
    this.setState({ streamMode: mode, hlsFailedFor: null });
  }

  onScreenEffect = (e) => {
    const effect = e.detail?.effect;
    if (effect === 'black') this.setState({ blackScreen: !this.state.blackScreen });
    else if (effect === 'blur') this.setState({ blurScreen: !this.state.blurScreen });
  }

  componentWillUnmount() {
    document.removeEventListener('keydown',this.keyHandler);
    window.removeEventListener(SCREEN_EFFECT_EVENT, this.onScreenEffect);
    window.removeEventListener(STREAM_MODE_EVENT, this.onStreamModeChange);
    if (this.hls) { this.hls.destroy(); this.hls = null; }
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.progressSave) {
      clearInterval(this.progressSave);
      this.progressSave = null;
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { time, playerState, volume, mute, speed, isDrawingEnabled, playerConfig } = this.props;
    screenEffects.black = this.state.blackScreen;
    screenEffects.blur = this.state.blurScreen;

    if (isDrawingEnabled && !this.state.ignoreNextMouseEvent) {
      clearTimeout(this.timer);
      this.timer = null;
      this.setState({ ignoreNextMouseEvent: true });
    }
    if (this.props.videoSrc !== prevProps.videoSrc
      || this.state.streamMode !== prevState.streamMode
      || this.state.hlsFailedFor !== prevState.hlsFailedFor) {
      this.setupSource();
    }
    if (this.props.videoSrc !== prevProps.videoSrc) {
      this.setState({
        time,
        visible: true,
        visibleAudio: true,
        blackScreen: false,
        blurScreen: false,
      });
    }
    if (Math.abs(time - this.player.current.currentTime) > 0.5) {
      this.player.current.currentTime = time;
    }
    if (mute || Math.abs(volume - this.player.current.volume) > 0.01) {
      if (mute) {
        this.player.current.volume = 0;
      }
      else {
        this.player.current.volume = volume;
      }
    }
    if ((playerState === 'play') && this.player.current.paused) {
      this.player.current.play();
      this.setState({ blackScreen: false });
      clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => {
        this.setState({ visible: false, visibleAudio: false });
        this.hideTimer = null;
      }, 1000);
    }
    else if ((playerState === 'pause') && !this.player.current.paused) {
      this.player.current.pause();
      if (this.hideTimer) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }
      this.setState({ visible: true, visibleAudio: true, blackScreen: playerConfig.blackOnPause ? true : this.state.blackScreen });
    }
    //if (this.player.current.playbackRate !== speed) {
      this.player.current.playbackRate = speed * this.state.speedMulti;
    //}
  }

  onFullscreen = () => {
    // Leaving the CSS fullscreen a remote may have put this screen in (see remoteFullscreen.js).
    if (exitPseudoFullscreen()) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.player.current.parentElement.requestFullscreen();
    }
  };

  render = () => {
    const { videoSrc, setTime, setDuration, videoName, setPlayerState, setVideoIsLoading, playerState, setVolume, volume, isDrawingEnabled } = this.props;
    const { time, duration, visible, visibleAudio, blackScreen, blurScreen } = this.state;
    return (
      <div className={`playercontainer ${visible ? '' : 'hidden'} ${isDrawingEnabled ? ' drawing-mode' : ' '}`}
        onPointerMove={debounce(
          () => {
            this.setState({ visible: true });
          },
          () => {
            if (this.player.current) {
              clearTimeout(this.hideTimer);
              this.hideTimer = setTimeout(() => {
                this.setState({ visible: this.player.current.paused, visibleAudio: this.player.current.paused});
                this.hideTimer = null;
              }, 1000);
            }
          },
          2000
        )}
        onClick={() => {
          this.clickCount++;
          if (this.state.ignoreNextMouseEvent) {
            this.setState({ ignoreNextMouseEvent: false });
            return;
          }
          if (this.clickCount === 1) {
            this.timer = setTimeout(() => {
              this.clickCount = 0;
              this.timer = null;
              if (videoName) {
                if (playerState == 'play') {
                  setPlayerState('pause');
                } else {
                  setPlayerState('play');
                }
              }
            }, 250);
          } else {
            clearTimeout(this.timer);
            this.clickCount = 0;
            this.timer = null;
            this.onFullscreen();
          }
        }}
        onWheel={(event) => {
          if (!document.fullscreenElement) return;
          event.stopPropagation();
          setVolume(volume + event.deltaY * -0.0005);
          this.setState({ visibleAudio: true })
          clearTimeout(this.hideTimer);
          this.hideTimer = setTimeout(() => {
            this.setState({ visible: this.player.current.paused, visibleAudio: this.player.current.paused});
            this.hideTimer = null;
          }, 1000);
        }}
        onPointerDown={(e) => {
          if (e.button == 1) {
            this.setState({ blackScreen: !blackScreen }, () => {
              setPlayerState('pause');
            });
          }
          if (e.button == 2) {
            this.setState({ blurScreen: !blurScreen }, () => {});
          }
        }}
      >
        <video
          className={`player ${videoSrc ? '' : 'no-source'}`}
          ref={this.player}
          onLoadedData={(event) => {
            setVideoIsLoading(false);
            const getCurrentTime = StorageHelper.getContentProgress({videoName});
            setTime(Number(getCurrentTime));
            const dur = event.target.duration;
            setDuration(dur);
            if (videoName && dur > 0) {
              StorageHelper.saveContentProgress({ videoName, time: getCurrentTime, duration: dur });
            }
            // A remote "reload" of a video that was playing asks for it to carry on playing.
            if (sessionStorage.getItem('rc_resume_play') === '1') {
              sessionStorage.removeItem('rc_resume_play');
              setPlayerState("play");
            } else {
              setPlayerState("pause");
            }
          }}
          onSeeking={(event) => {
            const { currentTime } = this.player.current;
            setTime(currentTime);
          }}
          onSeeked={(event) => {
            const { currentTime } = this.player.current;
            setTime(currentTime);
          }}
          onTimeUpdate={(event) => {
            setTime(event.target.currentTime);
          }}
          onError={() => {
            // HLS reports its own errors (and falls back to the file) — see setupSource.
            if (this.hls) return;
            // A video src almost always gets here carrying a token in its query string (see
            // withToken() in FilterPickerLocal.js) that's only ever valid for as long as that
            // session's JWT is — if this page was reopened from a URL/history entry left over
            // from an earlier, since-expired session (a bookmark, or just not having closed the
            // tab), the browser still has a #/<stale token> hash in its address bar and replays
            // it into this video src on every load. Without handling this, the request 401s,
            // onLoadedData never fires, setVideoIsLoading(false) never happens, and the app is
            // stuck showing its loading spinner forever — with no error and, notably, no way to
            // ever reach the home screen underneath, since that only renders once loading clears.
            setVideoIsLoading(false);
            if (videoSrc) {
              const { debugLog } = require('../../common/auth');
              debugLog('video onError — falling back to home', { src: String(videoSrc).replace(/token=[^&]+/, 'token=REDACTED') });
              // A navigation that differs from the current URL *only* by its hash is a
              // same-document "fragment navigation" per spec — it never reloads the page, with
              // or without an explicit reload() call after it (tried that first: it raced the
              // in-flight fragment navigation and just reloaded the still-broken hash, looping
              // forever). history.replaceState first makes the hash-free URL the one already on
              // the address bar *before* reload() re-fetches — the same working pattern App.js's
              // own token-handling effect already uses.
              window.history.replaceState({}, '', window.location.origin + window.location.pathname);
              window.location.reload();
            }
          }}
        ></video>
        <VideoFilter blackScreen={blackScreen} blurScreen={blurScreen} videoAspectRatio={
          this.player.current && this.player.current.videoWidth ?
            this.player.current.videoHeight / this.player.current.videoWidth :
            1
        } />
        <div
          style={{
            display: "grid",
            position: "absolute",
            gridTemplateRows: "60% 20% 20%",
            top: "0%",
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 3,
          }}
        >
          <div className='subtitlecontainer'>
            {<VideoSrt time={time * 1000} />}
          </div>
          {this.state.speedMulti != 1 ? <div style={{position:'absolute', zIndex:1, left:'15%', top:'15%', color:'blue', fontWeight:'bold', fontSize:'24px',backgroundColor:"red"}}>{this.state.speedMulti}</div> : null}
          <div className='controlscontainer'>
            <VideoControls
              style={{ width: "80%" }}
              playAction={this.playAction}
              currentTime={time}
              duration={duration}
              visible={visible}
              visibleAudio={visibleAudio}
              onFullscreen={this.onFullscreen}
              state={playerState}
              speedMulti={this.state.speedMulti}
              onSpeedChange={(s) => this.setState({ speedMulti: s })}
            />
          </div>
        </div>
        <ToastMessage />
      </div>
    );
  };
}

const mapStateToProps = state => {
  return {
    videoSrc: selectVideoSrc(state),
    time: selectTime(state),
    volume: selectVolume(state),
    mute: selectMute(state),
    playerState: selectPlayerState(state),
    speed: selectSpeed(state),
    videoName: selectVideoName(state),
    isLoading: selectVideoIsLoading(state),
    isDrawingEnabled: selectDrawingEnabled(state),
    playerConfig: selectPlayerConfig(state),
  };
};

export default connect(mapStateToProps, { setDuration, setTime, setPlayerState, setVolume, setVideoIsLoading })(VideoPlayer);
