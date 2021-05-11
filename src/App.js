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

function App({addFilterItems, setVideoSrc, setSubtitle }) {

  const [showEditor,setShowEditor] = useState(false);
  const [showConfig,setShowConfig] = useState(false);

  useEffect(() => {
    setVideoSrc(videoSample);
    SrtClass.ReadFile(subtitleSample).then((records)=>{setSubtitle(records)});

    SceneGuideClass.ReadFile(filterSample).then((records)=>{addFilterItems(records)});

  }, []);

  return (
    <div className="App">
      <Menu />
      <div style={{ width: '100%', margin: '0 auto', marginTop: '32px' }}>
        <Player />
      </div>
      <ToggleButton on={showEditor} onClick={() => {setShowEditor(!showEditor)}}>Editor</ToggleButton>
      <ToggleButton on={showConfig} onClick={() => {setShowConfig(!showConfig)}}>Config</ToggleButton>
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
