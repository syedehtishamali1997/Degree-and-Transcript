import React from "react";
import { useCaseTrack } from "../../context/CaseTrackContext";
import { useToast } from "../../context/ToastContext";
import { downloadFile } from "../../utils/formatters";
import { todayYYYYMMDD } from "../../utils/dateUtils";

export function RestoreConfirmModal({ isOpen, onClose, parsedJson }) {
  const { database, replaceDatabase, mergeDatabase } = useCaseTrack();
  const { showToast } = useToast();

  if (!isOpen || !parsedJson) return null;

  const countInFile = parsedJson.students?.length || 0;

  const handleMerge = () => {
    const res = mergeDatabase(parsedJson);
    showToast(`Merged ${res.addedCount} new student records from JSON.`, "success");
    onClose();
  };

  const handleReplace = () => {
    // Auto-backup current database first
    const currentJson = JSON.stringify(database, null, 2);
    downloadFile(currentJson, `casetrack_pre_restore_backup_${todayYYYYMMDD()}.json`);

    replaceDatabase(parsedJson);
    showToast(`Database replaced with ${countInFile} records. Safety backup downloaded.`, "warning");
    onClose();
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-warning-subtle">
            <h5 className="modal-title text-warning-emphasis">
              <i className="bi bi-database-fill-gear me-2"></i>Select JSON Restore Mode
            </h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <p className="mb-2">
              The backup file contains <strong>{countInFile} student records</strong>. How would you like to restore?
            </p>

            <div className="list-group mb-3">
              <div className="list-group-item list-group-item-action d-flex gap-3 align-items-start p-3">
                <i className="bi bi-node-plus fs-4 text-primary flex-shrink-0 mt-1"></i>
                <div>
                  <h6 className="mb-1 fw-bold">Merge Without Overwrite</h6>
                  <p className="mb-1 text-muted small">
                    Appends new records from the backup file. Any existing Student IDs will be kept as-is and skipped.
                  </p>
                  <button type="button" className="btn btn-outline-primary btn-sm mt-1" onClick={handleMerge}>
                    Execute Merge
                  </button>
                </div>
              </div>

              <div className="list-group-item list-group-item-action d-flex gap-3 align-items-start p-3">
                <i className="bi bi-arrow-repeat fs-4 text-danger flex-shrink-0 mt-1"></i>
                <div>
                  <h6 className="mb-1 fw-bold text-danger">Full Database Replacement</h6>
                  <p className="mb-1 text-muted small">
                    Replaces current database with the file. A safety backup of your existing data will be automatically downloaded first.
                  </p>
                  <button type="button" className="btn btn-danger btn-sm mt-1" onClick={handleReplace}>
                    Download Backup &amp; Replace Database
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
