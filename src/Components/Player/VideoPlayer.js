import React, {createRef} from "react";
import VideoControls from "./VideoControls";
import VideoFilter from "./VideoFilter";
import VideoSrt from "./VideoSRT";

import { connect } from "react-redux";
import { selectVideoSrc, selectTime, selectVolume, selectMute, selectPlayerState, selectSpeed, selectVideoName, selectVideoIsLoading } from '../../redux/selectors'
import { setTime, setDuration, setPlayerState, setVideoIsLoading, setVolume } from "../../redux/actions";

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
      blackScreen: false,
    };
    this.player = createRef();
    this.control = createRef();
    this.hideTimer = null;
    this.localStorageUpdateCounter = 0;
    this.clickCount = 0;
    this.timer = null;
  }

  componentDidMount(){
    this.progressSave = setInterval(() => {
      const {time, videoName, isLoading} = this.props;
      if (videoName && time && !isLoading)
        localStorage.setItem(videoName, time);
    }, 5000);
  }

  componentWillUnmount(){
    if(this.timer){
      clearTimeout(this.timer);
      this.timer = null;
    }
    if(this.progressSave){
      clearInterval(this.progressSave);
      this.progressSave = null;
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { time, playerState, volume, mute, speed } = this.props;

    if (this.props.videoSrc !== prevProps.videoSrc) {
      this.setState({
        time,
        visible: true,
        blackScreen: false,
      });
    }
    if (Math.abs(time - this.player.current.currentTime) > 0.5){
      this.player.current.currentTime = time;
    }
    if (mute || Math.abs(volume - this.player.current.volume) > 0.01){
      if (mute) {
        this.player.current.volume = 0;
      }
      else {
        this.player.current.volume = volume;
      }
    }
    if ((playerState === 'play') && this.player.current.paused){
      this.player.current.play();
      this.setState({blackScreen: false});
      clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => {
        this.setState({ visible: false });
        this.hideTimer = null;
      }, 1000);
    }
    else if ((playerState === 'pause') && !this.player.current.paused){
      this.player.current.pause();
      if(this.hideTimer)
      {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }
      this.setState({ visible: true });
    }
    if(this.player.current.playbackRate != speed){
      this.player.current.playbackRate = speed;
    }
  }

  onFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.player.current.parentElement.requestFullscreen();
    }
  };

  render = () => {
    const { videoSrc, setTime, setDuration, videoName, setPlayerState, setVideoIsLoading, playerState, setVolume, volume, enableEditMode} = this.props;
    const {time, duration, visible, blackScreen} = this.state;
    return (
      <div className={`playercontainer ${visible ? '' : 'hidden'}`}
        onPointerMove={debounce(
          () => {
            this.setState({visible: true});
          },
          () => {
            if (this.player.current) {
              clearTimeout(this.hideTimer);
              this.hideTimer = setTimeout(() => {
                this.setState({visible: this.player.current.paused});
                this.hideTimer = null;
              }, 1000);
            }
          },
          2000
        )}
        onClick={() => {
          this.clickCount++;
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
        onWheel={(event)=>{
          event.stopPropagation();
          setVolume(volume + event.deltaY * -0.0005);
        }}
        onPointerDown={(e)=>{
          if(e.button == 1){
            this.setState({ blackScreen: !blackScreen }, () => {
              setPlayerState('pause');
            });
          }
        }}
      >
        <video
          className={`player ${videoSrc ? '' : 'no-source'}`}
          src={videoSrc}
          ref={this.player}
          onLoadedData={(event)=>{
            setVideoIsLoading(false);
            const getCurrentTime = localStorage.getItem(videoName) || 0;
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
        <VideoFilter blackScreen={blackScreen} enableEditMode={enableEditMode}/>
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
          <div className='controlscontainer'>
            <VideoControls
              ref={this.control}
              style={{ width: "80%" }}
              playAction={this.playAction}
              currentTime={time}
              duration={duration}
              visible={visible}
              onFullscreen={this.onFullscreen}
              state={playerState}
            />
          </div>
        </div>
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
  };
};

export default connect(mapStateToProps, { setDuration, setTime, setPlayerState, setVolume, setVideoIsLoading })(VideoPlayer);
