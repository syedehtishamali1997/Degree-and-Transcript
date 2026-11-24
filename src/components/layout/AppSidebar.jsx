import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useCaseTrack } from "../../context/CaseTrackContext";
import { useAuth } from "../../context/AuthContext";
import { StorageService } from "../../services/StorageService";

export function AppSidebar({ isOpen, onCloseMobile }) {
  const location = useLocation();
  const { stats, settings, branding, storageMetrics } = useCaseTrack();
  const { hasPermission } = useAuth();

  const bytes = storageMetrics?.usedBytes ?? StorageService.getStorageUsageBytes();
  const capacityGB = storageMetrics?.targetCapacityGB ?? 100;
  const usedFormatted = storageMetrics?.usedFormatted ?? StorageService.formatBytes(bytes);
  const pct = storageMetrics?.usagePercent ?? Math.min(100, Math.max(0.1, (bytes / (100 * 1024 * 1024 * 1024)) * 100));

  const navItems = [
    { type: "header", label: "OVERVIEW" },
    { path: "/dashboard", label: "Dashboard", icon: "bi-speedometer2" },
    { type: "header", label: "STUDENT CASES" },
    {
      path: "/students/all",
      label: "All Students",
      icon: "bi-people",
      badge: stats?.counts?.total ?? 0,
      badgeClass: ""
    },
    {
      path: "/students/pending",
      label: "Pending Cases",
      icon: "bi-hourglass-split",
      badge: stats?.counts?.pending ?? 0,
      badgeClass: "badge-grey"
    },
    {
      path: "/students/case-ready",
      label: "Case Ready",
      icon: "bi-check2-circle",
      badge: stats?.counts?.ready ?? 0,
      badgeClass: "badge-blue"
    },
    {
      path: "/students/sent",
      label: "Sent to Main Campus",
      icon: "bi-send",
      badge: stats?.counts?.sent ?? 0,
      badgeClass: "badge-orange"
    },
    {
      path: "/students/returned",
      label: "Returned Cases",
      icon: "bi-arrow-return-left",
      badge: stats?.counts?.returned ?? 0,
      badgeClass: "badge-red"
    },
    {
      path: "/students/received",
      label: "Received Cases",
      icon: "bi-patch-check-fill",
      badge: stats?.counts?.received ?? 0,
      badgeClass: "badge-green"
    },
    { type: "header", label: "ADMINISTRATION" },
    { path: "/history", label: "Activity History", icon: "bi-clock-history" },
    { path: "/data-management", label: "Data Management", icon: "bi-database-gear" },
    {
      path: "/users",
      label: "User Management",
      icon: "bi-person-gear",
      permission: "users:view"
    },
    { path: "/settings", label: "Settings", icon: "bi-sliders" }
  ];

  return (
    <>
      <aside className={`sidebar ${isOpen ? "open" : ""}`} id="sidebar">
        {/* Brand Header */}
        <div className="sidebar-header">
          <Link to="/dashboard" className="sidebar-brand" onClick={onCloseMobile}>
            <div className="brand-icon">
              {branding?.logoType === "custom" && branding?.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.appName || "CaseTrack"}
                  style={{ width: "28px", height: "28px", objectFit: "contain", borderRadius: "4px" }}
                />
              ) : (
                <i className="bi bi-mortarboard-fill"></i>
              )}
            </div>
            <div className="brand-text">
              <span className="brand-title">{branding?.appName || "CaseTrack"}</span>
              <span className="brand-subtitle">{branding?.campusSubtitle || settings.campusName || "by Iqra University"}</span>
            </div>
          </Link>
          <button
            type="button"
            className="sidebar-close-btn d-lg-none"
            aria-label="Close Sidebar"
            onClick={onCloseMobile}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Navigation List */}
        <ul className="sidebar-nav" aria-label="Main Navigation">
          {navItems.map((item, idx) => {
            if (item.type === "header") {
              return (
                <li key={"hdr-" + idx} className="nav-section-label">
                  {item.label}
                </li>
              );
            }

            if (item.permission && !hasPermission(item.permission)) {
              return null;
            }

            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-item ${isActive ? "active" : ""}`}
                  title={item.label}
                  onClick={onCloseMobile}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span className="nav-label">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={`nav-badge ${item.badgeClass}`}>{item.badge}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Sidebar Footer - 100 GB Storage Architecture Status */}
        <div className="sidebar-footer">
          <div className="sidebar-storage-meta d-flex justify-content-between align-items-center mb-1">
            <span className="storage-caption">
              <i className="bi bi-hdd-network me-1"></i>Storage ({capacityGB} GB)
            </span>
            <span className="storage-size">{usedFormatted}</span>
          </div>
          <div className="progress sidebar-progress" style={{ height: "4px" }}>
            <div
              className="progress-bar"
              style={{ width: `${Math.max(1, pct)}%`, transition: "width 0.3s ease" }}
              title={`${usedFormatted} used of ${capacityGB} GB target`}
            ></div>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {isOpen && <div className="sidebar-backdrop show" onClick={onCloseMobile}></div>}
    </>
  );
}
