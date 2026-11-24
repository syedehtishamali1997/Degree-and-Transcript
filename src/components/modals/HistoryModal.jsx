import React from "react";
import { formatTimestamp } from "../../utils/dateUtils";
import { HistoryService } from "../../services/HistoryService";

export function HistoryModal({ isOpen, onClose, student }) {
  if (!isOpen || !student) return null;

  const events = Array.isArray(student.activityHistory)
    ? [...student.activityHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    : [];

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-clock-history me-2 text-info"></i>
              Activity History Timeline: {student.studentId}
            </h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <div className="mb-3 p-2 bg-light rounded border d-flex justify-content-between align-items-center">
              <div>
                <strong>{student.name}</strong> ({student.program})
              </div>
              <span className="badge bg-secondary">{events.length} event(s) recorded</span>
            </div>

            {events.length === 0 ? (
              <div className="text-center text-muted py-4">No events recorded for this student.</div>
            ) : (
              <div className="activity-feed">
                {events.map((ev, idx) => {
                  const color = HistoryService.getDotColor(ev.action);
                  return (
                    <div key={idx} className="activity-feed-item d-flex gap-3 pb-3 mb-2 border-bottom">
                      <span
                        className="activity-dot rounded-circle flex-shrink-0 mt-1"
                        style={{ width: "12px", height: "12px", backgroundColor: color }}
                      ></span>
                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex justify-content-between align-items-start">
                          <span className="fw-bold small">{ev.action}</span>
                          <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                            {formatTimestamp(ev.timestamp)}
                          </span>
                        </div>
                        <div className="small text-secondary mt-1">{ev.description}</div>
                        {ev.operator && (
                          <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                            Operator: {ev.operator}
                          </div>
                        )}
                        {ev.reason && (
                          <div className="small text-danger mt-1 p-2 bg-danger-subtle rounded border border-danger-subtle">
                            <strong>Reason: </strong> {ev.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
