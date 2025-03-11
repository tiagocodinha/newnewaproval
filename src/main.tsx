import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleReCaptchaProvider
      reCaptchaKey="6LeYnfEqAAAAPEXq1ju-2NEDO5jNdVS7pmUfsvz"
      scriptProps={{
        async: false,
        defer: false,
        appendTo: 'head',
        nonce: undefined,
      }}
    >
      <App />
    </GoogleReCaptchaProvider>
  </StrictMode>
);