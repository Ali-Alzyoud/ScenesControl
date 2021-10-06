import React, {createRef} from "react";
import VideoControls from "./VideoControls";
import VideoFilter from "./VideoFilter";
import VideoSrt from "./VideoSRT";

import { connect } from "react-redux";
import { selectVideoSrc, selectTime, selectVolume, selectPlayerState, selectSpeed } from '../../redux/selectors'
import { setTime, setDuration, setPlayerState } from "../../redux/actions";

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

class VideoPlayer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      time: 0,
      duration: 0,
      visible: true,
    };
    this.player = createRef();
    this.control = createRef();
    this.hideTimer = null;
  }

  componentDidUpdate(prevProps, prevState) {
    const { time, playerState, volume, speed } = this.props;

    if (this.props.videoSrc !== prevProps.videoSrc) {
      this.setState({
        time: 0,
        visible: true,
      });
    }
    if (Math.abs(time - this.player.current.currentTime) > 0.5){
      this.player.current.currentTime = time;
    }
    if (Math.abs(volume - this.player.current.volume) > 0.01){
      this.player.current.volume = volume;
    }
    if ((playerState === 'play') && this.player.current.paused){
      this.player.current.play();
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
    const { videoSrc, setTime, setDuration} = this.props;
    const {time, playerState, duration, visible} = this.state;
    return (
      <div className={`playercontainer ${visible ? '' : 'hidden'}`}
        onMouseMove={debounce(
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
      >
        <video
          className='player'
          src={videoSrc}
          ref={this.player}
          onCanPlay={(event) => {
            setDuration(event.target.duration);
          }}
          onTimeUpdate={(event) => {
            setTime(event.target.currentTime);
          }}
        ></video>
        <VideoFilter/>
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
    playerState: selectPlayerState(state),
    speed: selectSpeed(state),
  };
};

export default connect(mapStateToProps, { setDuration, setTime, setPlayerState })(VideoPlayer);
