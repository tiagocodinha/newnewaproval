import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleReCaptchaProvider
      reCaptchaKey="6LeYnfEqAAAAAGVRUCJbZ5MsOWFSjArO0j3VML5"
      scriptProps={{
        async: true,
        defer: true,
        appendTo: 'body',
        nonce: undefined,
      }}
    >
      <App />
    </GoogleReCaptchaProvider>
  </StrictMode>
);