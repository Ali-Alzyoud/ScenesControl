import './App.css';
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Player } from './Components/Player';


import Menu from './Components/Menu'
import SrtClass from './common/SrtClass'
import FilterEditor from './Components/FilterFileEditor'
import ConfigEditor from './Components/ConfigEditor'
import { SceneGuideClass } from './common/SceneGuide'
import ToggleButton from './Components/ToggleButton'


import { connect } from "react-redux";
import { addFilterItems, setVideoSrc, setSubtitle, setFilterItems, setDuration, setTime, setVideoName } from './redux/actions'
import { selectModalOpen, selectVideoIsLoading, selectVideoName } from './redux/selectors'
import Loader from './Components/Loader';
import SubtitleEditor from './Components/SubtitleEditor/SubtitleEditor';

const KEY = {
  E: 69,
  C: 67,
};

function App(props) {

  const { addFilterItems, setVideoSrc, setVideoName, setSubtitle, isLoading, videoName } = props;
  const [showEditor, setShowEditor] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [keyEvent, setKeyEvent] = useState(null);

  const ref = useRef(null);

  const loadAll = useCallback(
    () => {
      let videoURL = '';
      let subtitleURL = '';
      let filterURL = '';
      const paramsURL = window.location.hash;

      const params = paramsURL.split('/');
      if (params.length === 0 || (params.length === 1 && params[0].length === 0)) return;
      if (paramsURL !== '/' && params.length >= 2) {
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

      if (videoURL) {
        const fileName = videoURL.replace(/^.*[\\\/]/, '') || 'sample';
        setVideoSrc(videoURL);
        setVideoName(fileName);
      }

      if (subtitleURL.toLowerCase().startsWith('http')) {
        SrtClass.ReadFile(subtitleURL).then((records) => {
          setSubtitle(records)
        });
      } else {
        setSubtitle([]);
      }

      if (filterURL.toLowerCase().startsWith('http')) {
        SceneGuideClass.ReadFile(filterURL).then((records) => {
          addFilterItems(records);
        });
      } else {
        setFilterItems([]);
      }
    }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll])

  useEffect(() => {
    window.onhashchange = () => {
      loadAll();
    }
  }, [loadAll]);

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
        <div style={{marginTop:'15px', marginBottom:'15px'}} >{videoName}</div>
        <ToggleButton on={showEditor} onClick={() => { setShowEditor(!showEditor) }}>Editor</ToggleButton>
        <ToggleButton on={showConfig} onClick={() => { setShowConfig(!showConfig) }}>Config</ToggleButton>
        <ToggleButton on={showSubtitle} onClick={() => { setShowSubtitle(!showSubtitle) }}>Subtitle</ToggleButton>
        {showEditor &&
          <div className='filter-container'>
            <FilterEditor />
          </div>
        }
        {showSubtitle &&
          <div className='filter-container'>
            <SubtitleEditor />
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
  const videoName = (selectVideoName(state) || "").replace(/\.[^/.]+$/, "");
  return { modalOpen, isLoading, videoName };
};

export default connect(
  mapStateToProps,
  { addFilterItems, setVideoSrc, setSubtitle, setDuration, setTime, setVideoName }
)(App);
