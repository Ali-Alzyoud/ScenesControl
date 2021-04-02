import './App.css';
import React, { useRef, useEffect } from 'react'
import { Player } from './Components/Player';
import videoSample from './assets/sample.webm'
import filterSample from './assets/filter.txt'
import Menu from './Components/Menu'
import List from './Components/List'

function App() {
  return (
    <div className="App">
      <Menu/>
      <div style={{ width: '860px', margin: '0 auto' }}>
        <Player style={{ float: 'left', width: '640px' }} videoSrc={videoSample} filterSrc={filterSample} />
        <List/>
      </div>
    </div>
  );
}

export default App;
