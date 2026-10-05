import '@fontsource-variable/cormorant-garamond';
import '@fontsource-variable/cormorant-garamond/wght-italic.css';
import '@fontsource-variable/caveat';
import './index.css';
import './styles/book.css';
import './styles/cover.css';
import './styles/print.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { LiveProvider } from './context/Live';
import { SessionProvider } from './context/Session';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <LiveProvider>
          <App />
        </LiveProvider>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
