import ReactDOM from 'react-dom/client';
import App from './App';
import { registerServiceWorker } from './utils/pwaHelper';

registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
