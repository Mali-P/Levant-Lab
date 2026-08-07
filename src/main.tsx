import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { requestPersistentStorage } from './services/database/persistence';
import './styles/global.css';

// Fire-and-forget: nothing downstream waits on the answer, and a refusal only
// means the browser may evict progress under storage pressure.
void requestPersistentStorage();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
