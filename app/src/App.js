import './App.css';
import React, { useState, useEffect } from 'react'
import { Player } from './Components/Player';
import videoSample from './assets/sample.webm'
import filterSample from './assets/filter.txt'
import Menu from './Components/Menu'
import List from './Components/List'

function App() {
  const [videoSrc, setVideoSrc] = useState(videoSample)
  useEffect(() => {
    window.setVideoSrc = setVideoSrc;
  })
  return (
    <div className="App">
      <Menu />
      <div style={{ width: '100%', margin: '0 auto', marginTop: '32px' }}>
        <Player
          videoSrc={videoSrc}
          filterSrc={filterSample} />
        <div style={{ position: "absolute", top: "80px", right: "60px", backgroundColor: "transparent" }}>
          <List />
        </div>
      </div>
    </div>
  );
}

export default App;
