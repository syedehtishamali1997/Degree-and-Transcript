import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";
import { CaseTrackProvider } from "./context/CaseTrackContext";
import { AuthProvider } from "./context/AuthContext";
import { ModalProvider } from "./context/ModalContext";
import { App } from "./App";

import "bootstrap-icons/font/bootstrap-icons.css";
import "../vendor/coreui.min.css";
import "../css/style.css";
import "../css/responsive.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root container element #root not found.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ToastProvider>
      <CaseTrackProvider>
        <AuthProvider>
          <ModalProvider>
            <HashRouter>
              <App />
            </HashRouter>
          </ModalProvider>
        </AuthProvider>
      </CaseTrackProvider>
    </ToastProvider>
  </React.StrictMode>
);
