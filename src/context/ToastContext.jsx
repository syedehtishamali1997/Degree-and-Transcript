/**
 * ToastContext.jsx
 * Global toast notifications system with auto-dismiss and stack management.
 */

import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info", duration = 4000) => {
    const id = "toast-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
    const newToast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, addToast: showToast, removeToast }}>
      {children}
      <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1100 }}>
        {toasts.map((toast) => {
          let bgClass = "bg-primary text-white";
          let icon = "bi-info-circle";
          if (toast.type === "success") {
            bgClass = "bg-success text-white";
            icon = "bi-check-circle";
          } else if (toast.type === "danger") {
            bgClass = "bg-danger text-white";
            icon = "bi-exclamation-triangle";
          } else if (toast.type === "warning") {
            bgClass = "bg-warning text-dark";
            icon = "bi-exclamation-circle";
          }

          return (
            <div
              key={toast.id}
              className={`toast show align-items-center ${bgClass} border-0 mb-2 shadow-sm`}
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              <div className="d-flex">
                <div className="toast-body d-flex align-items-center gap-2">
                  <i className={`bi ${icon} fs-6 flex-shrink-0`}></i>
                  <span>{toast.message}</span>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white me-2 m-auto"
                  aria-label="Close"
                  onClick={() => removeToast(toast.id)}
                ></button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
