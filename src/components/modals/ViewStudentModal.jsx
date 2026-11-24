import React from "react";
import { formatDateOnly, formatTimestamp } from "../../utils/dateUtils";
import { StatusBadge, WorkflowLocationBadge } from "../common/Badge";
import { WorkflowService } from "../../services/WorkflowService";

export function ViewStudentModal({ isOpen, onClose, student, onOpenHistory }) {
  if (!isOpen || !student) return null;

  const latestSend = WorkflowService.getLatestSendEntry(student);
  const latestRet = WorkflowService.getLatestReturnEntry(student);
  const returnCount = WorkflowService.getReturnCount(student);

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-person-badge me-2 text-primary"></i>
              Student Case Diagnostic: {student.studentId}
            </h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {/* Header summary bar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center p-3 mb-3 bg-light rounded border">
              <div>
                <h4 className="h6 fw-bold mb-1">{student.name}</h4>
                <div className="text-muted small">
                  <span>Program: </span>
                  <span className="fw-semibold text-dark">{student.program}</span>
                  {student.programFull && <span className="ms-1">({student.programFull})</span>}
                </div>
              </div>
              <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0">
                <StatusBadge status={student.status} />
                <WorkflowLocationBadge status={student.status} sendHistory={student.sendHistory} />
              </div>
            </div>

            {/* Timestamps grid */}
            <div className="row g-3 mb-3">
              <div className="col-sm-6 col-md-3">
                <div className="p-2 border rounded bg-body-tertiary h-100">
                  <div className="text-muted small fw-bold text-uppercase">1. Apply On</div>
                  <div className="fw-semibold mt-1">{formatDateOnly(student.applyOn)}</div>
                </div>
              </div>

              <div className="col-sm-6 col-md-3">
                <div className="p-2 border rounded bg-body-tertiary h-100">
                  <div className="text-muted small fw-bold text-uppercase">2. Case Ready</div>
                  <div className="fw-semibold mt-1 text-primary">
                    {student.caseReady ? formatTimestamp(student.caseReady) : <span className="text-muted">Awaiting Stage 1</span>}
                  </div>
                </div>
              </div>

              <div className="col-sm-6 col-md-3">
                <div className="p-2 border rounded bg-body-tertiary h-100">
                  <div className="text-muted small fw-bold text-uppercase">3. Dispatched</div>
                  <div className="fw-semibold mt-1 text-warning-emphasis">
                    {latestSend?.sentAt ? (
                      <>
                        {formatTimestamp(latestSend.sentAt)}
                        {student.sendHistory.length > 1 && (
                          <span className="badge bg-secondary ms-1">#{student.sendHistory.length}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted">Not sent yet</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-sm-6 col-md-3">
                <div className="p-2 border rounded bg-body-tertiary h-100">
                  <div className="text-muted small fw-bold text-uppercase">4. Received</div>
                  <div className="fw-semibold mt-1 text-success">
                    {student.received ? (
                      formatTimestamp(student.received)
                    ) : (
                      <span className="text-muted">In Progress</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Return information if applicable */}
            {latestRet && (
              <div className="alert alert-danger mb-3 p-3">
                <div className="fw-bold d-flex align-items-center gap-2 mb-1">
                  <i className="bi bi-arrow-return-left"></i>
                  <span>Main Campus Return Notice (#{returnCount})</span>
                </div>
                <div className="small mb-1">
                  <strong>Returned At: </strong>
                  {formatTimestamp(latestRet.returnedAt)}
                </div>
                <div className="small">
                  <strong>Return Reason: </strong>
                  {latestRet.returnReason || "No explicit reason logged."}
                </div>
              </div>
            )}

            {/* Departments & Clearances */}
            <div className="border rounded p-3 mb-2 small bg-light">
              <div className="fw-bold mb-1">Clearance &amp; Departmental Approvals</div>
              <div className="text-muted">
                {student.approvedDepartments || "Accounts, Examination Desk, Library clearance verified."}
              </div>
            </div>
          </div>

          <div className="modal-footer justify-content-between">
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => {
                onClose();
                onOpenHistory(student);
              }}
            >
              <i className="bi bi-clock-history me-1"></i>View Full History Timeline
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
