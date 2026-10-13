import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { appRequestStorage, captureAppRequest } from './services/appRequestStash';

// /login-app: take the app's request out of the address bar before the router
// or anything else can see it (see services/appRequestStash).
try {
  captureAppRequest(window, appRequestStorage(), Date.now());
} catch {
  // never keep the app from starting
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
