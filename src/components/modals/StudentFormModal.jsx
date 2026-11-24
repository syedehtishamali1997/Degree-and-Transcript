import React, { useState, useEffect } from "react";
import { useCaseTrack } from "../../context/CaseTrackContext";
import { useToast } from "../../context/ToastContext";
import { validateStudentInput } from "../../utils/validators";
import { todayYYYYMMDD } from "../../utils/dateUtils";

export function StudentFormModal({ isOpen, onClose, studentToEdit = null }) {
  const { students, addStudent, updateStudent } = useCaseTrack();
  const { showToast } = useToast();

  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [program, setProgram] = useState("");
  const [applyOn, setApplyOn] = useState(todayYYYYMMDD());
  const [error, setError] = useState("");

  const isEditing = Boolean(studentToEdit);

  useEffect(() => {
    if (studentToEdit) {
      setStudentId(studentToEdit.studentId || "");
      setName(studentToEdit.name || "");
      setProgram(studentToEdit.program || "");
      setApplyOn(studentToEdit.applyOn || todayYYYYMMDD());
    } else {
      setStudentId("");
      setName("");
      setProgram("");
      setApplyOn(todayYYYYMMDD());
    }
    setError("");
  }, [studentToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { studentId, name, program, applyOn };
    const validation = validateStudentInput(data, students, studentToEdit?.id);

    if (!validation.valid) {
      setError(validation.errors.join(" "));
      return;
    }

    if (isEditing) {
      updateStudent(studentToEdit.id, data);
      showToast(`Student '${name}' updated successfully.`, "success");
    } else {
      addStudent(data);
      showToast(`Student '${name}' added to database.`, "success");
    }

    onClose();
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-header">
              <h5 className="modal-title">
                {isEditing ? "Edit Student Information" : "Add Student Record"}
              </h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
            </div>

            <div className="modal-body">
              {error && <div className="alert alert-danger small">{error}</div>}

              <div className="mb-3">
                <label className="form-label fw-semibold small">
                  Student ID <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. IU04-0122-0007"
                  value={studentId}
                  disabled={isEditing}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />
                {isEditing && (
                  <div className="form-text small text-muted">
                    Student ID is permanent and cannot be modified.
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold small">
                  Student Full Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Muhammad Ahmed"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold small">
                  Program <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. BSCS, BBA, MBA, BSSE"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold small">
                  Apply On Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={applyOn}
                  onChange={(e) => setApplyOn(e.target.value)}
                  required
                />
              </div>

              {isEditing && (
                <div className="alert alert-light border small text-muted mb-0">
                  <i className="bi bi-lock-fill me-1"></i>
                  Workflow timestamps and dispatch history remain locked to ensure audit compliance.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {isEditing ? "Save Changes" : "Create Record"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
