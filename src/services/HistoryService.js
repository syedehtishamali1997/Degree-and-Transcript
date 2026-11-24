/**
 * HistoryService.js
 * Audit trail aggregation, event formatting, and chronological logging.
 */

import { formatTimestamp } from "../utils/dateUtils.js";

export const HistoryService = {
  getAll(source = {}) {
    let students = [];
    let systemHistory = [];

    if (Array.isArray(source)) {
      students = source;
    } else if (source && typeof source === "object") {
      students = Array.isArray(source.students) ? source.students : [];
      systemHistory = Array.isArray(source.history) ? source.history : [];
    }

    const events = this.getAllGlobalEvents(students);

    // Merge system-level history events if present
    systemHistory.forEach((ev) => {
      events.push({
        studentRecordId: ev.studentRecordId || null,
        studentId: ev.studentId || "SYSTEM",
        studentName: ev.studentName || "System Event",
        program: ev.program || "Administration",
        action: ev.action || "System Action",
        timestamp: ev.timestamp || new Date().toISOString(),
        operator: ev.operator || "Admin Officer",
        description: ev.description || ev.details || "",
        reason: ev.reason || null
      });
    });

    events.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });

    return events;
  },

  getAllGlobalEvents(students = []) {
    const events = [];

    students.forEach((s) => {
      if (Array.isArray(s.activityHistory)) {
        s.activityHistory.forEach((ev) => {
          events.push({
            studentRecordId: s.id,
            studentId: s.studentId,
            studentName: s.name,
            program: s.program,
            action: ev.action,
            timestamp: ev.timestamp,
            operator: ev.operator || "Admin Officer",
            description: ev.description || "",
            reason: ev.reason || null
          });
        });
      }
    });

    events.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });

    return events;
  },

  getDotColor(action) {
    switch (action) {
      case "Record Created":
        return "#6c757d";
      case "Case Ready":
        return "#0d6efd";
      case "Sent to Main Campus":
        return "#fd7e14";
      case "Returned from Main Campus":
        return "#dc3545";
      case "Sent to Main Campus Again":
        return "#e0a800";
      case "Received from Main Campus":
        return "#198754";
      case "Record Updated":
        return "#6f42c1";
      case "Record Deleted":
        return "#212529";
      default:
        return "#adb5bd";
    }
  },

  getBadgeClass(action) {
    switch (action) {
      case "Record Created":
        return "badge bg-secondary";
      case "Case Ready":
        return "badge bg-primary";
      case "Sent to Main Campus":
        return "badge bg-warning text-dark";
      case "Returned from Main Campus":
        return "badge bg-danger";
      case "Sent to Main Campus Again":
        return "badge bg-warning text-dark";
      case "Received from Main Campus":
        return "badge bg-success";
      case "Record Updated":
        return "badge bg-info text-dark";
      default:
        return "badge bg-light text-dark border";
    }
  }
};
