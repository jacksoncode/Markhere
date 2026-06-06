// ===== Sentry Error Tracking Setup =====
import * as Sentry from '@sentry/react';

// Initialize Sentry (only in production or when VITE_SENTRY_DSN is set)
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const isProduction = import.meta.env.MODE === 'production';

if (SENTRY_DSN || isProduction) {
  Sentry.init({
    dsn: SENTRY_DSN || '', // Set via environment variable
    environment: import.meta.env.MODE,
    enabled: !!SENTRY_DSN, // Only enable if DSN is provided
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance monitoring
    tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% in production, 100% in dev
    // Session replay
    replaysSessionSampleRate: 0.1, // 10% of normal sessions
    replaysOnErrorSampleRate: 1.0, // 100% of error sessions
    // Release tracking
    release: `markhere@${import.meta.env.VITE_APP_VERSION || '0.4.9'}`,
    // Additional context
    beforeSend(event) {
      // Add Tauri-specific context
      if ((window as any).__TAURI__) {
        event.contexts = event.contexts || {};
        event.contexts.tauri = {
          platform: 'tauri',
          version: '2.5',
        };
      }
      return event;
    },
  });
}

// Global error capture with visual feedback (development mode)
if (!isProduction) {
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
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { initPerformanceMonitoring } from './services/performanceMonitoring';

// Initialize performance monitoring
initPerformanceMonitoring();

// KaTeX CSS is loaded dynamically on first math render — see MathExtension.ts

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#c0392b' }}>
            应用程序遇到错误
          </h1>
          <pre style={{
            background: '#f5f5f5',
            padding: '12px',
            borderRadius: '4px',
            maxWidth: '600px',
            overflow: 'auto',
            marginBottom: '20px',
            fontSize: '14px',
          }}>
            {error instanceof Error ? error.toString() : String(error)}
          </pre>
          <button
            onClick={resetError}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            重新加载应用
          </button>
        </div>
      )}
      showDialog={false}
    >
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

// Remove splash screen after React mounts
const splash = document.getElementById('splash-screen');
if (splash) {
  splash.classList.add('fade-out');
  splash.addEventListener('transitionend', () => splash.remove());
  // Safety fallback
  setTimeout(() => { splash.remove(); }, 1000);
}
