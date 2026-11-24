import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCaseTrack } from "../../context/CaseTrackContext";
import { useAuth } from "../../context/AuthContext";
import { formatTimestamp, nowLocalISO } from "../../utils/dateUtils";

const ROUTE_HEADERS = {
  "/dashboard": {
    title: "Administrative Dashboard",
    subtitle: "Live overview of student case processing from campus intake to Main Campus receipt."
  },
  "/students/all": {
    title: "All Student Records",
    subtitle: "Complete directory of student cases with workflow controls, search, and filters."
  },
  "/students/pending": {
    title: "Pending Cases",
    subtitle: "Unprocessed student applications awaiting Stage 1 (Case Ready)."
  },
  "/students/case-ready": {
    title: "Case Ready Queue",
    subtitle: "Cases verified and ready to be dispatched to Main Campus."
  },
  "/students/sent": {
    title: "Sent to Main Campus",
    subtitle: "Active dispatches awaiting receipt confirmation or return from Main Campus."
  },
  "/students/returned": {
    title: "Returned Cases",
    subtitle: "Cases returned by Main Campus with documented reasons, ready for re-dispatch."
  },
  "/students/received": {
    title: "Completed / Received Cases",
    subtitle: "Permanently completed cases received from Main Campus."
  },
  "/history": {
    title: "System Activity History",
    subtitle: "Chronological, read-only log of all student imports, record updates, dispatches, returns, and receipts."
  },
  "/data-management": {
    title: "Data Management",
    subtitle: "Excel ingestion, selective student deletion, and database administration."
  },
  "/users": {
    title: "User Management & Access Control",
    subtitle: "Enterprise RBAC operator directory, credentials management, and permission matrix."
  },
  "/settings": {
    title: "System Settings",
    subtitle: "Dynamic application branding, theme configuration, and system preferences."
  }
};

export function AppHeader({ onOpenMobile, onToggleCollapse, onOpenQuickSearch }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, updateSettings, notifications, clearNotifications, branding } = useCaseTrack();
  const { currentUser, logout, hasPermission } = useAuth();

  const [liveClock, setLiveClock] = useState(() => formatTimestamp(nowLocalISO()));
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(formatTimestamp(nowLocalISO()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const headerInfo = ROUTE_HEADERS[location.pathname] || {
    title: `${branding?.appName || "CaseTrack"} System`,
    subtitle: "Student Degree & Transcript Management"
  };

  const displayName = currentUser?.fullName || settings.operatorName || "Admin Officer";
  const displayRole = currentUser?.roleName || (currentUser?.role === "super_admin" ? "Super Admin" : "Registrar Desk");
  const initials = displayName
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("") || "AO";

  const handleSetTheme = (theme) => {
    updateSettings({ theme });
    setThemeDropdownOpen(false);
  };

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="top-header">
      <div className="header-main-bar">
        <div className="header-left me-3">
          {/* Mobile Off-Canvas Toggle */}
          <button
            type="button"
            className="btn btn-icon me-2 d-lg-none flex-shrink-0"
            aria-label="Open Menu"
            onClick={onOpenMobile}
          >
            <i className="bi bi-list fs-5"></i>
          </button>

          {/* Desktop Minimize / Maximize Sidebar Toggle */}
          <button
            type="button"
            className="btn btn-icon me-3 d-none d-lg-inline-flex flex-shrink-0"
            title="Toggle Sidebar Width"
            aria-label="Toggle Sidebar Width"
            onClick={onToggleCollapse}
          >
            <i
              className={`bi ${
                settings.sidebarCollapsed ? "bi-layout-sidebar" : "bi-layout-sidebar-inset"
              }`}
            ></i>
          </button>

          {/* Quick Search Bar Trigger (Desktop / Tablet) */}
          <button
            type="button"
            className="header-search-btn me-3 d-none d-md-inline-flex"
            title="Quick Search (Ctrl + K)"
            onClick={onOpenQuickSearch}
          >
            <i className="bi bi-search"></i>
            <span>Quick search...</span>
            <kbd className="header-search-kbd">Ctrl+K</kbd>
          </button>

          {/* Quick Search Icon Trigger (Mobile) */}
          <button
            type="button"
            className="btn btn-icon me-2 d-md-none"
            title="Quick Search"
            aria-label="Quick Search"
            onClick={onOpenQuickSearch}
          >
            <i className="bi bi-search"></i>
          </button>

          <div className="min-w-0 header-title-box">
            <div className="header-title">{headerInfo.title}</div>
            {headerInfo.subtitle ? (
              <div className="header-subtitle text-truncate" title={headerInfo.subtitle}>
                {headerInfo.subtitle}
              </div>
            ) : null}
          </div>
        </div>

        <div className="header-right flex-shrink-0">
          {/* Live Date & Clock Badge */}
          <div className="header-clock d-none d-xl-flex">
            <i className="bi bi-calendar3 me-2 text-primary"></i>
            <span>{liveClock}</span>
          </div>

          {/* Theme Switcher Dropdown */}
          <div className="dropdown position-relative">
            <button
              type="button"
              className="btn btn-icon"
              title="Theme Settings"
              aria-label="Toggle Light and Dark Theme"
              onClick={() => {
                setThemeDropdownOpen(!themeDropdownOpen);
                setNotifDropdownOpen(false);
                setUserDropdownOpen(false);
              }}
            >
              <i
                className={`bi ${
                  settings.theme === "dark"
                    ? "bi-sun-fill text-warning"
                    : "bi-moon-stars"
                }`}
              ></i>
            </button>

            {themeDropdownOpen && (
              <ul className="dropdown-menu dropdown-menu-end shadow-sm small show position-absolute end-0 mt-1">
                <li>
                  <button
                    type="button"
                    className={`dropdown-item d-flex align-items-center gap-2 ${
                      settings.theme === "light" ? "active" : ""
                    }`}
                    onClick={() => handleSetTheme("light")}
                  >
                    <i className="bi bi-sun text-warning"></i>Light Theme
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className={`dropdown-item d-flex align-items-center gap-2 ${
                      settings.theme === "dark" ? "active" : ""
                    }`}
                    onClick={() => handleSetTheme("dark")}
                  >
                    <i className="bi bi-moon-stars text-primary"></i>Dark Theme
                  </button>
                </li>
              </ul>
            )}
          </div>

          {/* Notifications Dropdown */}
          <div className="dropdown position-relative">
            <button
              type="button"
              className="btn btn-icon position-relative"
              aria-label="Notifications"
              onClick={() => {
                setNotifDropdownOpen(!notifDropdownOpen);
                setThemeDropdownOpen(false);
                setUserDropdownOpen(false);
              }}
            >
              <i className="bi bi-bell"></i>
              {notifications.length > 0 && (
                <span className="notification-dot">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </button>

            {notifDropdownOpen && (
              <div
                className="dropdown-menu dropdown-menu-end notification-menu show position-absolute end-0 mt-1"
                style={{ width: "320px", maxHeight: "380px", overflowY: "auto" }}
              >
                <div className="d-flex justify-content-between align-items-center notification-header border-bottom p-2">
                  <span className="fw-bold small">
                    <i className="bi bi-bell me-1"></i>System Notifications
                  </span>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-decoration-none"
                      onClick={() => clearNotifications()}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="notification-list p-2">
                  {notifications.length === 0 ? (
                    <div className="text-center text-muted small py-4">No recent notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="notification-item p-2 mb-1 rounded bg-light border">
                        <div className="fw-semibold text-dark small">{n.message}</div>
                        <div className="text-muted" style={{ fontSize: "0.71rem" }}>
                          {formatTimestamp(n.timestamp)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="dropdown position-relative">
            <button
              type="button"
              className="user-profile-btn"
              onClick={() => {
                setUserDropdownOpen(!userDropdownOpen);
                setThemeDropdownOpen(false);
                setNotifDropdownOpen(false);
              }}
            >
              <div className="avatar-wrapper">
                <div className="avatar-circle">{initials}</div>
                <span className="avatar-status-dot"></span>
              </div>
              <div className="text-start d-none d-sm-block">
                <div className="user-name">{displayName}</div>
                <div className="user-role">{displayRole}</div>
              </div>
            </button>

            {userDropdownOpen && (
              <ul className="dropdown-menu dropdown-menu-end shadow-sm small show position-absolute end-0 mt-1" style={{ minWidth: "220px" }}>
                <li>
                  <div className="dropdown-header py-2 px-3">
                    <div className="fw-bold text-body">{displayName}</div>
                    <div className="text-muted small">
                      {currentUser?.username ? `@${currentUser.username}` : "Operator"} &bull; {displayRole}
                    </div>
                  </div>
                </li>
                <li><hr className="dropdown-divider my-1" /></li>
                {hasPermission("users:view") && (
                  <li>
                    <Link
                      to="/users"
                      className="dropdown-item py-2"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <i className="bi bi-person-gear me-2 text-primary"></i>User Management
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    to="/data-management"
                    className="dropdown-item py-2"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <i className="bi bi-database-gear me-2 text-primary"></i>Data Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="/settings"
                    className="dropdown-item py-2"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <i className="bi bi-sliders me-2 text-secondary"></i>System Settings
                  </Link>
                </li>
                <li><hr className="dropdown-divider my-1" /></li>
                <li>
                  <button
                    type="button"
                    className="dropdown-item py-2 text-danger d-flex align-items-center gap-2"
                    onClick={handleLogout}
                  >
                    <i className="bi bi-box-arrow-right"></i>
                    <span>Sign Out</span>
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
