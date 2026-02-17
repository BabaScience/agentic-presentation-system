import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './styles.css';

// Expose KaTeX globally for SVG components that render inside <foreignObject>
(window as any).__katex = katex;

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
