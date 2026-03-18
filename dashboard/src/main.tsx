import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Landing from './pages/Landing';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import About from './pages/About';
import Contact from './pages/Contact';
import './index.css';

// When running as a packaged Electron app (file:// protocol) always render the
// main dashboard directly – the web landing/marketing pages are not meaningful
// in a desktop context and pathname-based routing doesn't work under file://.
const isElectron = window.location.protocol === 'file:';

const Page = () => {
  if (isElectron) {
    return <App />;
  }

  const path = window.location.pathname;

  if (path === '/' || path === '/landing') {
    return <Landing />;
  }
  if (path === '/features') {
    return <Features />;
  }
  if (path === '/pricing') {
    return <Pricing />;
  }
  if (path === '/about') {
    return <About />;
  }
  if (path === '/contact') {
    return <Contact />;
  }
  if (path === '/dashboard') {
    return <App />;
  }
  return <Landing />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>
);
