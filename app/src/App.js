import './App.css';
import {Player} from './Components/Player';
import videoSample from './assets/sample.webm'
import filterSample from './assets/filter.txt'

function App() {
  return (
    <div className="App">
      <h2>Scenes Control</h2>
      <Player videoSrc={videoSample} filterSrc={filterSample}/>
    </div>
  );
}

export default App;
