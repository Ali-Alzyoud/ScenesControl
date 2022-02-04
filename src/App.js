import './App.css';
import React, { useState, useEffect, useRef, Fragment } from 'react'
import { Player } from './Components/Player';


import Menu from './Components/Menu'
import SrtClass from './common/SrtClass'
import FilterEditor from './Components/FilterFileEditor'
import ConfigEditor from './Components/ConfigEditor'
import { SceneGuideClass } from './common/SceneGuide'
import ToggleButton from './Components/ToggleButton'


import { connect } from "react-redux";
import { addFilterItems, setVideoSrc, setSubtitle } from './redux/actions'
import { selectModalOpen, selectVideoIsLoading } from './redux/selectors'
import Loader from './Components/Loader';

const KEY = {
  E: 69,
  C: 67,
};

function App(props) {

  const videoSample = 'video/joker/v.webm'
  const filterSample = 'video/joker/f.txt'
  const subtitleSample = 'video/joker/s.srt'

  const { addFilterItems, setVideoSrc, setSubtitle, modalOpen, isLoading } = props;
  const [showEditor, setShowEditor] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [forceupdate, setForceUpdate] = useState(0);
  const [keyEvent, setKeyEvent] = useState(null);

  const ref = useRef(null);

  const loadAll = () => {
    let videoURL = '';
    let subtitleURL = '';
    let filterURL = '';
    const paramsURL = window.location.hash;

    const params = paramsURL.split('/');
    if (paramsURL != '/' && params.length >= 2) {
      if (params[1] && params[1].length > 0) {
        videoURL = atob(params[1]);
      }
      if (params[2] && params[2].length > 0) {
        subtitleURL = atob(params[2]);
      }
      if (params[3] && params[3].length > 0) {
        filterURL = atob(params[3]);
      }
    }

    setVideoSrc(videoURL);
    SrtClass.ReadFile(subtitleURL).then((records) => { setSubtitle(records) });
    SceneGuideClass.ReadFile(filterURL).then((records) => {
      addFilterItems(records);
    });
  };


  useEffect(() => {
    window.onhashchange = () => {
      loadAll();
    }
  }, []);

  useEffect(() => {
    const { modalOpen } = props;
    if (modalOpen || !keyEvent) return;
    switch (keyEvent.keyCode) {
      case KEY.E:
        setShowEditor(!showEditor);
        break;
      case KEY.C:
        setShowConfig(!showConfig);
        break;
    }
  }, [keyEvent]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      setKeyEvent(e);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showEditor, showConfig]);

  return (
    <div className="App" ref={ref}>
      <Menu />
      {isLoading &&
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translateX(-50%) translateY(-50%);' }}><Loader /></div>
      }
      <div style={{ opacity: isLoading ? 0 : 1 }}>
        <div style={{ width: '100%', margin: '0 auto', marginTop: '32px' }}>
          <Player />
        </div>
        <ToggleButton on={showEditor} onClick={() => { setShowEditor(!showEditor) }}>Editor</ToggleButton>
        <ToggleButton on={showConfig} onClick={() => { setShowConfig(!showConfig) }}>Config</ToggleButton>
        {showEditor &&
          <div className='filter-container'>
            <FilterEditor />
          </div>
        }
        {showConfig &&
          <div className='config-container'>
            <ConfigEditor />
          </div>
        }
      </div>
    </div >
  );
}

const mapStateToProps = state => {
  const modalOpen = selectModalOpen(state);
  const isLoading = selectVideoIsLoading(state);
  return { modalOpen, isLoading };
};

export default connect(
  mapStateToProps,
  { addFilterItems, setVideoSrc, setSubtitle }
)(App);
