import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Global error handlers to capture unhandled client errors
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    console.error("[JTG Global Error]", event.error || event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    // Ignore cancelled requests or expected 401 unauthenticated redirects
    const reason = event.reason;
    if (reason && (reason.name === "CanceledError" || reason.code === "ERR_CANCELED" || reason.response?.status === 401)) {
      event.preventDefault();
      return;
    }
    console.warn("[JTG Unhandled Rejection]", reason);
  });
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("JTG Panel root element (#root) was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


