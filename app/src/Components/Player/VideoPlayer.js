import React, {
  createRef,
} from "react";
import PLAY_STATE from "./defines";
import VideoControls from "./VideoControls";
import VideoFilter from "./VideoFilter";
import VideoSrt from "./VideoSRT";

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
      playerState: PLAY_STATE.INITIAL,
      time: 0,
      duration: 0,
      visible: true,
    };
    this.player = createRef();
    this.control = createRef();
  }

  playAction = () => {
    const { playerState } = this.state;
    if (playerState === PLAY_STATE.INITIAL) {
      this.setState({ playerState: PLAY_STATE.PLAY });
      this.setState({ visible: false });
    } else if (playerState === PLAY_STATE.PLAY) {
      this.setState({ playerState: PLAY_STATE.PAUSE });
      this.setState({ visible: true });
    } else if (playerState === PLAY_STATE.PAUSE) {
      this.setState({ playerState: PLAY_STATE.PLAY });
      this.setState({ visible: false });
    }
  };

  componentDidUpdate(prevProps, prevState) {
    const { playerState } = this.state;
    if (this.state.playerState !== prevState.playerState) {
      if (playerState === PLAY_STATE.PLAY) {
        this.player.current.play();
      } else if (playerState === PLAY_STATE.PAUSE) {
        this.player.current.pause();
      }
    }
    if (this.props.videoSrc !== prevProps.videoSrc) {
      this.setState({
        time: 0,
        playerState: PLAY_STATE.PAUSE,
        visible: true,
      });
    }
  }

  getPlayer = () => this.player.current;

  onFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.player.current.parentElement.requestFullscreen();
    }
  };

  render = () => {
    const {filterObject, srtObject, videoSrc} = this.props;
    const {time, playerState, duration, visible} = this.state;
    return (
      <div className='playercontainer'
        onMouseMove={debounce(
          () => {
            this.setState({visible: true});
          },
          () => {
            this.setState({visible: this.player.current.paused});
          },
          2000
        )}
      >
        <video
          className='player'
          src={videoSrc}
          ref={this.player}
          onCanPlay={() => this.setState({duration: this.player.current.duration})}
          onTimeUpdate={(event) => {
            this.setState({time: event.target.currentTime});
          }}
        ></video>
        <VideoFilter
          getPlayer={this.getPlayer}
          filterObject={filterObject}
          time={time}
        />
        <div
          style={{
            display: "grid",
            position: "relative",
            gridTemplateRows: "60% 20% 20%",
            position: "relative",
            top: "-100%",
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 3,
          }}
        >
          <div className='subtitlecontainer'>
            {<VideoSrt srtObject={srtObject} time={time * 1000} />}
          </div>
          <div className='controlscontainer'>
            <VideoControls
              ref={this.control}
              style={{ width: "80%" }}
              onSeek={(per) => {
                this.player.current.currentTime = this.player.current.duration * per;
                this.setState({time: this.player.current.currentTime});
              }}
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

export default VideoPlayer;
