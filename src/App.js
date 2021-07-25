import './App.css';
import React, { useState, useEffect, useRef } from 'react'
import { Player } from './Components/Player';


import videoSample from './assets/sample.webm'
import filterSample from './assets/filter.txt'
import subtitleSample from './assets/sample.srt'

import Menu from './Components/Menu'
import SrtClass from './common/SrtClass'
import FilterEditor from './Components/FilterFileEditor'
import ConfigEditor from './Components/ConfigEditor'
import { SceneGuideClass } from './common/SceneGuide'
import ToggleButton from './Components/ToggleButton'


import { connect } from "react-redux";
import { addFilterItems, setVideoSrc, setSubtitle } from './redux/actions'

function App(props) {

  const { addFilterItems, setVideoSrc, setSubtitle } = props;
  const [showEditor, setShowEditor] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [forceupdate, setForceUpdate] = useState(0);

  const loadAll = () => {
    let videoURL = videoSample;
      let subtitleURL = subtitleSample;
      let filterURL = filterSample;
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
    window.onhashchange = ()=>{
      loadAll();
  }},[]);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const KEY = {
      E: 69,
      C: 67,
    };
    const handleKeyDown = (e) => {
      switch (e.keyCode) {
        case KEY.E:
          setShowEditor(!showEditor);
          break;
        case KEY.C:
          setShowConfig(!showConfig);
          break;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showEditor, showConfig]);

  return (
    <div className="App">
      <Menu />
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
  );
}

export default connect(
  null,
  { addFilterItems, setVideoSrc, setSubtitle }
)(App);
