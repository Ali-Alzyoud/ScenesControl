import './App.css';
import React, { useState, useEffect, useRef } from 'react'
import { Player } from './Components/Player';
import videoSample from './assets/sample.webm'
import filterSample from './assets/filter.txt'
import subtitleSample from './assets/sample.srt'
import Menu from './Components/Menu'
import SrtObject from './common/SrtObject'
import FilterEditor from './Components/FilterFileEditor'
import { SceneGuideClass } from './common/SceneGuide'

function App() {
  //FIXME Replace with Redux/Context
  const [videoSrc, setVideoSrc] = useState(videoSample);
  const [subtitleSrc, setSubtitleSrc] = useState(new SrtObject(subtitleSample));
  const [filterSrc, setFilterSrc] = useState(null);
  const player = useRef(null);

  useEffect(() => {
    window.setVideoSrc = setVideoSrc;
    window.setSubtitleSrc = setSubtitleSrc;
    window.setFilterSrc = setFilterSrc;
  });

  useEffect(() => {
    fetch(filterSample)
      .then(response => response.text())
      .then(data => {
        setFilterSrc(new SceneGuideClass(data));
      });
  }, []);

  return (
    <div className="App">
      <Menu />
      <div style={{ width: '100%', margin: '0 auto', marginTop: '32px' }}>
        <Player
          ref={player}
          videoSrc={videoSrc}
          filterObject={filterSrc}
          srtObject={subtitleSrc} />
      </div>
      <div className='filter-container'>
          {filterSrc && <FilterEditor sceneObject={filterSrc} getCurrentTime={() => {
            return player.current.state.time;
          }}/>}
      </div>
    </div>
  );
}

export default App;
