import React, { useState } from "react";
import { useCaseTrack } from "../../context/CaseTrackContext";
import { useToast } from "../../context/ToastContext";
import { downloadFile } from "../../utils/formatters";
import { todayYYYYMMDD } from "../../utils/dateUtils";

export function WipeConfirmModal({ isOpen, onClose }) {
  const { database, wipeDatabase } = useCaseTrack();
  const { showToast } = useToast();
  const [typedConfirm, setTypedConfirm] = useState("");

  if (!isOpen) return null;

  const handleWipe = () => {
    // Download safety backup first
    const currentJson = JSON.stringify(database, null, 2);
    downloadFile(currentJson, `casetrack_pre_wipe_backup_${todayYYYYMMDD()}.json`);

    wipeDatabase();
    showToast("All student records have been cleared. Backup downloaded.", "danger");
    onClose();
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-danger">
          <div className="modal-header bg-danger text-white">
            <h5 className="modal-title">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>Confirm Database Wipe
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={onClose}
            ></button>
          </div>

          <div className="modal-body">
            <p className="fw-semibold text-danger">
              Warning: This action will permanently remove all {database.students?.length || 0} student records and clear activity logs.
            </p>
            <p className="small text-muted mb-3">
              An emergency JSON backup will be downloaded to your device automatically before resetting.
            </p>

            <div className="mb-3">
              <label className="form-label small fw-bold">
                Type <code>RESET</code> below to confirm:
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="RESET"
                value={typedConfirm}
                onChange={(e) => setTypedConfirm(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={typedConfirm.trim() !== "RESET"}
              onClick={handleWipe}
            >
              <i className="bi bi-trash3 me-1"></i>Permanently Wipe Database
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
