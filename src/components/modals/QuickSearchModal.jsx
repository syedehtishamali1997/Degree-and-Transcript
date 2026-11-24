import React, { useState, useEffect } from "react";
import { useCaseTrack } from "../../context/CaseTrackContext";
import { StatusBadge } from "../common/Badge";
import { formatDateOnly } from "../../utils/dateUtils";

export function QuickSearchModal({ isOpen, onClose, onSelectStudent }) {
  const { students } = useCaseTrack();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();
  const results = q
    ? students
        .filter((s) => {
          const hay = [
            s.studentId,
            s.name,
            s.program,
            s.status,
            s.applyOn,
            ...(s.sendHistory || []).map((e) => e.returnReason || "")
          ]
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        })
        .slice(0, 10)
    : [];

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header border-bottom-0 pb-0">
            <div className="input-group input-group-lg w-100">
              <span className="input-group-text bg-transparent border-0 ps-0">
                <i className="bi bi-search text-muted fs-4"></i>
              </span>
              <input
                type="text"
                className="form-control border-0 shadow-none fs-5"
                placeholder="Search student ID, name, program, or reason..."
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-link text-muted text-decoration-none"
                onClick={onClose}
              >
                <kbd className="bg-light text-dark border px-2 py-1 small">ESC</kbd>
              </button>
            </div>
          </div>

          <div className="modal-body pt-2" style={{ maxHeight: "420px", overflowY: "auto" }}>
            {!q ? (
              <div className="text-center text-muted py-4 small">
                Type a student ID (e.g. <code>IU04</code>), name, or program to search...
              </div>
            ) : results.length === 0 ? (
              <div className="text-center text-muted py-4 small">
                No students matching "<strong>{query}</strong>".
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {results.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2 px-2 rounded"
                    onClick={() => {
                      onClose();
                      onSelectStudent(s);
                    }}
                  >
                    <div>
                      <div className="fw-bold text-dark">{s.name}</div>
                      <div className="small text-muted">
                        <span className="fw-semibold text-primary">{s.studentId}</span> &bull; {s.program} &bull; Applied: {formatDateOnly(s.applyOn)}
                      </div>
                    </div>
                    <StatusBadge status={s.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
