import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import SellWidget from './components/SellWidget';

const App: React.FC = () => (
  <div className="min-h-screen bg-dark p-4">
    <SellWidget />
  </div>
);

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 