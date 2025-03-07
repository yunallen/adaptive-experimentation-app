import React from 'react';
import { createRoot } from 'react-dom/client';
import 'antd/dist/reset.css';  // Updated Ant Design CSS import
import './index.css';
import App from './App';

// Initialize the root
const root = createRoot(document.getElementById('root'));

// Render your app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);