import React, { useState, useEffect, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { useCaseTrack } from "../../context/CaseTrackContext";
import { useModals } from "../../context/ModalContext";

export function AppLayout() {
  const location = useLocation();
  const { settings, updateSettings } = useCaseTrack();
  const { openQuickSearch } = useModals();

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Global Ctrl+K / Cmd+K shortcut listener for Quick Search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openQuickSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openQuickSearch]);

  const handleToggleCollapse = useCallback(() => {
    updateSettings({ sidebarCollapsed: !settings.sidebarCollapsed });
  }, [settings.sidebarCollapsed, updateSettings]);

  return (
    <div className={`app-wrapper ${settings.sidebarCollapsed ? "sidebar-collapsed" : ""}`} id="appWrapper">
      {/* Sidebar Navigation */}
      <AppSidebar
        isOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="main-content" id="mainContent">
        {/* Sticky Top Header */}
        <AppHeader
          onOpenMobile={() => setIsMobileOpen(true)}
          onToggleCollapse={handleToggleCollapse}
          onOpenQuickSearch={openQuickSearch}
        />

        {/* Dynamic Route Content */}
        <main className="content-body flex-grow-1">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>

        {/* Standard App Footer */}
        <footer className="footer">
          <div>
            <span className="fw-bold">CaseTrack</span> &copy; 2026 Student Case Tracking &amp; Management System
          </div>
          <div>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle me-2">
              CoreUI 5 Theme &bull; React 19
            </span>
            <span className="small text-muted">Single-Device Client Storage</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
