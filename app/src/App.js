import './App.css';
import React, { useState, useEffect } from 'react'
import { Player } from './Components/Player';
import videoSample from './assets/sample.webm'
import filterSample from './assets/filter.txt'
import subtitleSample from './assets/sample.srt'
import Menu from './Components/Menu'
import List from './Components/List'

function App() {
  //FIXME Replace with Redux
  const [videoSrc, setVideoSrc] = useState(videoSample);
  const [subtitleSrc, setSubtitleSrc] = useState(subtitleSample);
  const [filterSrc, setFilterSrc] = useState(filterSample);
  useEffect(() => {
    window.setVideoSrc = setVideoSrc;
    window.setSubtitleSrc = setSubtitleSrc;
    window.setFilterSrc = setFilterSrc;
  })
  return (
    <div className="App">
      <Menu />
      <div style={{ width: '100%', margin: '0 auto', marginTop: '32px' }}>
        <Player
          videoSrc={videoSrc}
          subtitleSrc={subtitleSrc}
          filterSrc={filterSrc} />
        <div style={{ position: "absolute", top: "80px", right: "60px", backgroundColor: "transparent" }}>
          <List />
        </div>
      </div>
    </div>
  );
}

export default App;
