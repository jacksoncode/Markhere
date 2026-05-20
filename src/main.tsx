// Global error capture — must run before any React code
window.addEventListener('error', (e) => {
  const msg = `[Markhere] ${e.message} at ${e.filename}:${e.lineno}:${e.colno}`;
  console.error(msg, e.error);
  try {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c0392b;color:#fff;padding:12px;font:14px monospace;z-index:99999;white-space:pre-wrap;word-break:break-all';
    el.textContent = 'FATAL: ' + e.message;
    document.body.appendChild(el);
  } catch {}
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Markhere] Unhandled rejection:', e.reason);
  try {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#c0392b;color:#fff;padding:12px;font:14px monospace;z-index:99999;white-space:pre-wrap;word-break:break-all';
    el.textContent = 'REJECTION: ' + String(e.reason);
    document.body.appendChild(el);
  } catch {}
});

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import 'katex/dist/katex.min.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);