import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/variables.css';
import './styles/base.css';
import './styles/components.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
