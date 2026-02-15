import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Unregister any stray service workers (e.g. from extensions or old PWAs)
// that can intercept fetch/WebSocket and cause "Failed to fetch" errors
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => reg.unregister());
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
