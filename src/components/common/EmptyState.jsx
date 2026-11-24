import React from "react";

export function EmptyState({ icon = "bi-folder-x", message = "No matching records found." }) {
  return (
    <div className="empty-state py-4 text-center">
      <i className={`bi ${icon} fs-1 text-muted`}></i>
      <p className="mt-2 mb-0 small text-muted">{message}</p>
    </div>
  );
}
