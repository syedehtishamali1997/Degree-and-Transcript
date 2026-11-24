import React from "react";
import { formatTimestamp } from "../../utils/dateUtils";
import { HistoryService } from "../../services/HistoryService";
import { EmptyState } from "../common/EmptyState";
import "./GlobalTableLayout.css";

export const HistoryTable = React.memo(function HistoryTable({ events = [] }) {
  if (events.length === 0) {
    return (
      <div className="table-responsive sticky-table-wrapper">
        <table className="table table-hover align-middle mb-0 small history-data-table table-fixed-layout">
          <thead className="table-light">
            <tr>
              <th className="col-hist-time">Timestamp</th>
              <th className="col-hist-action">Action</th>
              <th className="col-hist-id">Student ID</th>
              <th className="col-hist-name">Student Name</th>
              <th className="col-hist-prog">Program</th>
              <th className="col-hist-op">Operator</th>
              <th className="col-hist-details">Details &amp; Reason</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="7">
                <EmptyState icon="bi-clock-history" message="No activity events recorded yet." />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-responsive sticky-table-wrapper">
      <table className="table table-hover align-middle mb-0 small history-data-table table-fixed-layout">
        <thead className="table-light">
          <tr>
            <th className="text-nowrap col-hist-time">Timestamp</th>
            <th className="text-nowrap col-hist-action">Action</th>
            <th className="text-nowrap col-hist-id">Student ID</th>
            <th className="text-nowrap col-hist-name">Student Name</th>
            <th className="text-nowrap col-hist-prog">Program</th>
            <th className="text-nowrap col-hist-op">Operator</th>
            <th className="col-hist-details">Details &amp; Reason</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev, idx) => {
            const badgeClass = HistoryService.getBadgeClass(ev.action);
            return (
              <tr key={idx}>
                <td className="text-nowrap text-muted col-hist-time" style={{ fontSize: "0.75rem" }}>
                  {formatTimestamp(ev.timestamp)}
                </td>
                <td className="text-nowrap col-hist-action">
                  <span className={badgeClass}>{ev.action}</span>
                </td>
                <td className="fw-bold font-monospace col-hist-id">{ev.studentId}</td>
                <td className="fw-semibold col-hist-name">
                  <div className="student-name-text" title={ev.studentName}>{ev.studentName}</div>
                </td>
                <td className="col-hist-prog">
                  <span className="badge program-badge" title={ev.program}>
                    {ev.program}
                  </span>
                </td>
                <td className="text-muted col-hist-op">{ev.operator}</td>
                <td className="col-hist-details">
                  <div className="text-break">{ev.description}</div>
                  {ev.reason && (
                    <div className="text-danger small mt-1 text-break">
                      <strong>Reason: </strong> {ev.reason}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
