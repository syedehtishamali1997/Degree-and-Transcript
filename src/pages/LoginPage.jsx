/**
 * src/pages/LoginPage.jsx
 * Professional University Authentication Screen for CaseTrack.
 * Features dynamic branding, show/hide password, session persistence,
 * validation feedback, and 1-click administrative demo credentials for seamless testing.
 */

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCaseTrack } from "../context/CaseTrackContext";
import "./LoginPage.css";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { branding, settings } = useCaseTrack();

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fromPath = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      setErrorMessage("Please enter both username/email and password.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const result = await login(usernameOrEmail, password, rememberMe);
      if (result.ok) {
        navigate(fromPath, { replace: true });
      } else {
        setErrorMessage(result.error || "Invalid username or password.");
      }
    } catch (err) {
      setErrorMessage("Unable to connect to authentication server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCredentials = (u, p) => {
    setUsernameOrEmail(u);
    setPassword(p);
    setErrorMessage("");
  };

  return (
    <div className="login-screen-wrapper">
      <div className="login-container">
        {/* University Brand Header */}
        <div className="login-brand-header text-center mb-4">
          <div className="login-logo-circle mb-3 mx-auto shadow-sm">
            {branding?.logoType === "custom" && branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.appName || "CaseTrack"}
                className="login-custom-logo"
              />
            ) : (
              <i className="bi bi-mortarboard-fill text-white"></i>
            )}
          </div>
          <h2 className="login-app-title fw-bold text-body mb-1">
            {branding?.appName || "CaseTrack"}
          </h2>
          <div className="login-app-subtitle text-secondary small fw-medium">
            {branding?.campusSubtitle || settings.campusName || "by Iqra University"}
          </div>
          <p className="login-header-caption text-muted mt-2 small">
            Student Case Tracking &amp; Transcript Management System
          </p>
        </div>

        {/* Authentication Card */}
        <div className="card login-card shadow-lg border-0">
          <div className="card-body p-4 p-sm-5">
            <h5 className="fw-bold text-body mb-1">Sign In to CaseTrack</h5>
            <p className="text-secondary small mb-4">
              Enter your university registrar credentials to continue.
            </p>

            {errorMessage && (
              <div
                className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 small border-0 mb-4"
                role="alert"
              >
                <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                <div className="flex-grow-1">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Username or Email Field */}
              <div className="mb-3">
                <label className="form-label small fw-semibold text-body">
                  Username or Email Address
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-body-tertiary border-end-0">
                    <i className="bi bi-person text-secondary"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="e.g. admin or officer@casetrack.iqra.edu.pk"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    autoComplete="username"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label small fw-semibold text-body mb-0">Password</label>
                </div>
                <div className="input-group">
                  <span className="input-group-text bg-body-tertiary border-end-0">
                    <i className="bi bi-lock text-secondary"></i>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control border-start-0 border-end-0"
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    className="input-group-text bg-body-tertiary border-start-0 text-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="form-check small">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="rememberMeCheckbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <label className="form-check-label text-secondary" htmlFor="rememberMeCheckbox">
                    Remember me on this workstation (30 days)
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn btn-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <i className="bi bi-arrow-right"></i>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Credentials Panel */}
            <div className="mt-4 pt-4 border-top">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small fw-bold text-uppercase letter-spacing text-secondary" style={{ fontSize: "0.72rem" }}>
                  <i className="bi bi-shield-lock-fill me-1 text-primary"></i>Demo Test Accounts
                </span>
                <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: "0.68rem" }}>
                  1-Click Fill
                </span>
              </div>

              <div className="row g-2">
                <div className="col-6">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary w-100 text-start p-2 d-flex flex-column"
                    onClick={() => fillDemoCredentials("admin", "Admin@CaseTrack2026!")}
                  >
                    <span className="fw-bold text-primary" style={{ fontSize: "0.76rem" }}>Super Admin</span>
                    <span className="text-muted" style={{ fontSize: "0.68rem" }}>admin / Admin@...</span>
                  </button>
                </div>

                <div className="col-6">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary w-100 text-start p-2 d-flex flex-column"
                    onClick={() => fillDemoCredentials("officer", "Officer@CaseTrack2026!")}
                  >
                    <span className="fw-bold text-info" style={{ fontSize: "0.76rem" }}>Admin Officer</span>
                    <span className="text-muted" style={{ fontSize: "0.68rem" }}>officer / Officer@...</span>
                  </button>
                </div>

                <div className="col-6">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary w-100 text-start p-2 d-flex flex-column"
                    onClick={() => fillDemoCredentials("registrar", "Registrar@CaseTrack2026!")}
                  >
                    <span className="fw-bold text-success" style={{ fontSize: "0.76rem" }}>Registrar Desk</span>
                    <span className="text-muted" style={{ fontSize: "0.68rem" }}>registrar / Registrar@...</span>
                  </button>
                </div>

                <div className="col-6">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary w-100 text-start p-2 d-flex flex-column"
                    onClick={() => fillDemoCredentials("viewer", "Viewer@CaseTrack2026!")}
                  >
                    <span className="fw-bold text-secondary" style={{ fontSize: "0.76rem" }}>Auditor (Viewer)</span>
                    <span className="text-muted" style={{ fontSize: "0.68rem" }}>viewer / Viewer@...</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Security Notice */}
        <div className="text-center mt-4 small text-muted">
          <i className="bi bi-shield-check text-success me-1"></i>
          Protected by End-to-End Encryption &amp; Salted Password Hashing &bull; &copy; 2026 Iqra University
        </div>
      </div>
    </div>
  );
}
