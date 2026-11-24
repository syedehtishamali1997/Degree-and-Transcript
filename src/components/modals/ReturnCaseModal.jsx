import React, { useState, useEffect } from "react";
import { useCaseTrack } from "../../context/CaseTrackContext";
import { useToast } from "../../context/ToastContext";
import { validateReturnReason } from "../../utils/validators";
import { formatTimestamp } from "../../utils/dateUtils";
import { WorkflowService } from "../../services/WorkflowService";

export function ReturnCaseModal({ isOpen, onClose, student }) {
  const { returnCase } = useCaseTrack();
  const { showToast } = useToast();

  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setReason("");
    setError("");
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const latestSend = WorkflowService.getLatestSendEntry(student);

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validateReturnReason(reason);

    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    const res = returnCase(student.id, validation.reason);
    if (!res.ok) {
      setError(res.error);
      return;
    }

    showToast(`Case for '${student.name}' marked Returned. Reason logged.`, "danger");
    onClose();
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-header bg-danger-subtle">
              <h5 className="modal-title text-danger-emphasis">
                <i className="bi bi-arrow-return-left me-2"></i>Return Case from Main Campus
              </h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
            </div>

            <div className="modal-body">
              <div className="bg-light rounded p-3 mb-3 border small">
                <div className="row g-2">
                  <div className="col-5 text-muted">Student ID:</div>
                  <div className="col-7 fw-semibold">{student.studentId}</div>
                  <div className="col-5 text-muted">Student Name:</div>
                  <div className="col-7 fw-semibold">{student.name}</div>
                  <div className="col-5 text-muted">Previous Sent At:</div>
                  <div className="col-7 fw-semibold text-primary">
                    {latestSend?.sentAt ? formatTimestamp(latestSend.sentAt) : "--"}
                  </div>
                </div>
              </div>

              <div className="mb-2">
                <label className="form-label fw-semibold small">
                  Return Reason <span className="text-danger">*</span>
                </label>
                <textarea
                  className={`form-control ${error ? "is-invalid" : ""}`}
                  rows="4"
                  required
                  placeholder="Enter a clear, specific reason why the case was returned (e.g. Missing attested transcript or incomplete fee clearance)..."
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (error) setError("");
                  }}
                ></textarea>
                {error && <div className="invalid-feedback d-block">{error}</div>}
              </div>

              <div className="small text-muted">
                <i className="bi bi-info-circle me-1"></i>
                The original sending timestamp will be permanently preserved in history.
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-danger">
                Confirm Return
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
