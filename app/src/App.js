import './App.css';
import VideoPlayer from './Components/VideoPlayer';
import videoSample from './assets/sample.webm'

function App() {
  return (
    <div className="App">
      <h2>Hello World123</h2>
      <VideoPlayer src={videoSample}/>
    </div>
  );
}

export default App;
