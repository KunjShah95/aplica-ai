import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Landing from './pages/Landing';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import About from './pages/About';
import Contact from './pages/Contact';
import './index.css';

const path = window.location.pathname;

const Page = () => {
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
