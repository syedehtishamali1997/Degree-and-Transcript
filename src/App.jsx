import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { useAuth } from "./context/AuthContext";

const DashboardPage = lazy(() => import("./pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const StudentCasesPage = lazy(() => import("./pages/StudentCasesPage").then(m => ({ default: m.StudentCasesPage })));
const HistoryPage = lazy(() => import("./pages/HistoryPage").then(m => ({ default: m.HistoryPage })));
const DataManagementPage = lazy(() => import("./pages/DataManagementPage").then(m => ({ default: m.DataManagementPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage").then(m => ({ default: m.UserManagementPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));

function RouteFallback() {
  return (
    <div className="d-flex justify-content-center align-items-center py-5 my-5">
      <div className="spinner-border text-primary" role="status" style={{ width: "2.5rem", height: "2.5rem" }}>
        <span className="visually-hidden">Loading view...</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, requiredPermission }) {
  const { isAuthenticated, hasPermission, isLoadingAuth } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return <RouteFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="container-fluid p-4">
        <div className="card shadow-sm border-0 border-top border-4 border-danger">
          <div className="card-body p-4 text-center">
            <i className="bi bi-shield-lock-fill text-danger display-4 mb-3 d-block"></i>
            <h4 className="fw-bold text-body">Access Restricted</h4>
            <p className="text-secondary small mb-3">
              Your account does not possess the required privilege (<code>{requiredPermission}</code>) to access this administrative module.
            </p>
            <a href="#/dashboard" className="btn btn-outline-primary btn-sm">
              <i className="bi bi-arrow-left me-1"></i>Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) {
    return <RouteFallback />;
  }
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public Authentication Route */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Authenticated Application Layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Default route redirects to /dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Student Cases Routes */}
            <Route path="/students" element={<Navigate to="/students/all" replace />} />
            <Route path="/students/:stage" element={<StudentCasesPage />} />

            {/* Administration Routes */}
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/data-management" element={<DataManagementPage />} />
            <Route
              path="/users"
              element={
                <ProtectedRoute requiredPermission="users:view">
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Fallback Catch-All Route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
