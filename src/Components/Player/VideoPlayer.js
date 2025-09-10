import React, { createRef } from "react";
import VideoControls from "./VideoControls";
import VideoFilter from "./VideoFilter";
import VideoSrt from "./VideoSRT";

import { connect } from "react-redux";
import { selectVideoSrc, selectTime, selectVolume, selectMute, selectPlayerState, selectSpeed, selectVideoName, selectVideoIsLoading, selectDrawingEnabled } from '../../redux/selectors'
import { setTime, setDuration, setPlayerState, setVideoIsLoading, setVolume, setSpeed } from "../../redux/actions";
import ToastMessage from "../Toast";
import Utils from "../../utils/utils";
import StorageHelper from "../../Helpers/StorageHelper";

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
    };
    this.player = createRef();
    this.hideTimer = null;
    this.localStorageUpdateCounter = 0;
    this.clickCount = 0;
    this.timer = null;
  }

  keyHandler = (e) => {
    if(Utils.hasActiveInput()) return;
    if (e.key == 1) {
      this.setState({
        blackScreen: !this.state.blackScreen
      })
    }
    if (e.key == 2) {
      this.setState({
        blurScreen: !this.state.blurScreen
      })
    }
    else if(e.key == 8){
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
      if (videoName && time && !isLoading){
        StorageHelper.saveContentProgress({videoName, time});
      }
    }, 5000);

    
    document.addEventListener('keydown',this.keyHandler);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown',this.keyHandler);
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
    const { time, playerState, volume, mute, speed, isDrawingEnabled } = this.props;

    if (isDrawingEnabled && !this.state.ignoreNextMouseEvent) {
      clearTimeout(this.timer);
      this.timer = null;
      this.setState({ ignoreNextMouseEvent: true });
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
      this.setState({ visible: true, visibleAudio: true });
    }
    //if (this.player.current.playbackRate !== speed) {
      this.player.current.playbackRate = speed * this.state.speedMulti;
    //}
  }

  onFullscreen = () => {
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
          src={videoSrc}
          ref={this.player}
          onLoadedData={(event) => {
            setVideoIsLoading(false);
            const getCurrentTime = StorageHelper.getContentProgress({videoName});;
            setTime(Number(getCurrentTime));
            setDuration(event.target.duration);
            setPlayerState("pause");
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
  };
};

export default connect(mapStateToProps, { setDuration, setTime, setPlayerState, setVolume, setVideoIsLoading })(VideoPlayer);
