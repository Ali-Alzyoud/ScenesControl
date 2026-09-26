import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Provider } from 'react-redux';
import store from './redux/store';

import { transitions, positions, Provider as AlertProvider } from 'react-alert'
import AlertTemplate from 'react-alert-template-basic'
import { debugLog } from './common/auth'

// Temporary: a mobile-only bug (something that looks like a login screen flashing open and
// closing) hasn't reproduced in any clean-browser test, and the app's own Login component
// wasn't the cause on the one real device that reported "Clear content" so far — an uncaught
// JS error crashing part of the tree, or leaving stale UI behind, fits what's been described
// just as well and wouldn't show up any other way. Safe to remove once this is root-caused.
window.addEventListener('error', (e) => {
  debugLog('window error', { message: e.message, source: e.filename, line: e.lineno, stack: e.error?.stack?.slice(0, 1000) });
});
window.addEventListener('unhandledrejection', (e) => {
  debugLog('unhandled rejection', { reason: String(e.reason?.message || e.reason).slice(0, 500), stack: e.reason?.stack?.slice(0, 1000) });
});
// Catches a reload/navigation from any call site, including ones not already tagged with a
// reason — keepalive on debugLog's own fetch is what lets this actually make it out before the
// page tears down.
window.addEventListener('beforeunload', () => {
  debugLog('page unloading', { url: window.location.href });
});
const options = {
  // you can also just use 'bottom center'
  position: positions.BOTTOM_CENTER,
  timeout: 90000,
  offset: '100px',
  // you can also just use 'scale'
  transition: transitions.SCALE,
  backgroundColor:'transparent',

}

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <AlertProvider template={AlertTemplate} {...options}>
        <App />
      </AlertProvider>
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
