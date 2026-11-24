import React from "react";
import { getStatusBadgeConfig } from "../../utils/formatters";

export function StatusBadge({ status }) {
  const config = getStatusBadgeConfig(status);
  return (
    <span className={config.className}>
      <i className={`bi ${config.icon} me-1`}></i>
      {config.label}
    </span>
  );
}

export function WorkflowLocationBadge({ status, sendHistory = [] }) {
  switch (status) {
    case "Pending":
      return (
        <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">
          <i className="bi bi-hourglass-split me-1"></i>Campus Desk (Pending)
        </span>
      );
    case "Case Ready":
      return (
        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
          <i className="bi bi-box-seam me-1"></i>Dispatch Queue (Ready)
        </span>
      );
    case "Sent to Main Campus": {
      const attempts = sendHistory.length;
      const tag = attempts > 1 ? ` #${attempts}` : "";
      return (
        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
          <i className="bi bi-truck me-1"></i>Main Campus ({tag || "Sent"})
        </span>
      );
    }
    case "Returned from Main Campus": {
      const retCount = sendHistory.filter((e) => Boolean(e.returnedAt)).length;
      return (
        <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
          <i className="bi bi-arrow-return-left me-1"></i>Returned to Desk ({retCount}x)
        </span>
      );
    }
    case "Received from Main Campus":
      return (
        <span className="badge bg-success-subtle text-success border border-success-subtle">
          <i className="bi bi-patch-check-fill me-1"></i>Received / Degree Issued
        </span>
      );
    default:
      return <span className="text-muted small">--</span>;
  }
}

export function DocumentStatusBadge({ status = "Not Uploaded" }) {
  switch (status) {
    case "Ready for Processing":
      return (
        <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1">
          <i className="bi bi-check-circle-fill"></i>
          <span>Ready for Processing</span>
        </span>
      );
    case "Uploaded":
    case "Submitted":
      return (
        <span className="badge bg-primary-subtle text-primary border border-primary-subtle d-inline-flex align-items-center gap-1">
          <i className="bi bi-file-earmark-check-fill"></i>
          <span>{status === "Uploaded" ? "Uploaded" : "Submitted"}</span>
        </span>
      );
    case "Documents Uploaded":
      return (
        <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle d-inline-flex align-items-center gap-1">
          <i className="bi bi-file-earmark-arrow-up"></i>
          <span>Documents Uploaded</span>
        </span>
      );
    case "Partially Uploaded":
    case "Incomplete":
      return (
        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle d-inline-flex align-items-center gap-1">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <span>{status === "Partially Uploaded" ? "Partially Uploaded" : "Incomplete"}</span>
        </span>
      );
    case "Not Uploaded":
    default:
      return (
        <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle d-inline-flex align-items-center gap-1">
          <i className="bi bi-dash-circle"></i>
          <span>Not Uploaded</span>
        </span>
      );
  }
}
