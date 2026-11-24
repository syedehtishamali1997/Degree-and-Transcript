/**
 * formatters.js
 * String sanitization, ID generation, file download, and badge styling helpers.
 */

export function generateId() {
  return "std-" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4);
}

export function formatStudentId(id) {
  if (!id) return "";
  return String(id).trim().toUpperCase();
}

export function formatFullName(name) {
  if (!name) return "";
  return String(name).trim();
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function downloadFile(content, filename, mimeType = "application/json") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 150);
}

export function getStatusBadgeConfig(status) {
  switch (status) {
    case "Pending":
      return {
        className: "status-badge status-pending",
        icon: "bi-hourglass-split",
        label: "Pending"
      };
    case "Case Ready":
      return {
        className: "status-badge status-ready",
        icon: "bi-check2-circle",
        label: "Case Ready"
      };
    case "Sent to Main Campus":
      return {
        className: "status-badge status-sent",
        icon: "bi-send",
        label: "Sent to Main Campus"
      };
    case "Returned from Main Campus":
      return {
        className: "status-badge status-returned",
        icon: "bi-arrow-return-left",
        label: "Returned"
      };
    case "Received from Main Campus":
      return {
        className: "status-badge status-received",
        icon: "bi-patch-check-fill",
        label: "Received"
      };
    default:
      return {
        className: "status-badge status-pending",
        icon: "bi-question-circle",
        label: status || "Unknown"
      };
  }
}
