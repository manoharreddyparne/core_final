import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// 🧹 CONSOLE CLEANUP: Suppress known noise
const originalInfo = console.info;
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.info = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes("Download the React DevTools")) return;
  originalInfo(...args);
};

// Toggle this to suppress Cloudflare noise if desired, though browser-level errors (CSP) bypass this.
console.log = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes("Request for the Private Access Token challenge")) return;
  originalLog(...args);
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
