import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import PickupWidgetBridge from './components/PickupWidgetBridge';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <PickupWidgetBridge />
  </StrictMode>,
);
