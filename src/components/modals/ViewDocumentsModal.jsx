import React, { useState, useEffect } from "react";
import { DocumentStatusBadge } from "../common/Badge";
import { formatTimestamp } from "../../utils/dateUtils";

export function ViewDocumentsModal({ isOpen, student, onClose, onOpenUploadWizard }) {
  const [docData, setDocData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null); // { url, name, isPdf, category }

  useEffect(() => {
    if (isOpen && student) {
      setLoading(true);
      fetch(`/api/documents/${encodeURIComponent(student.studentId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.found) {
            setDocData(data);
            // Default select final consolidated PDF if available
            if (data.hasFinalPdf) {
              setSelectedFile({
                url: data.finalPdfUrl,
                name: `${data.folderName}_Complete_Documents.pdf`,
                isPdf: true,
                isConsolidated: true
              });
            } else if (data.documents && data.documents.length > 0) {
              const first = data.documents[0];
              setSelectedFile({
                url: first.url,
                name: first.fileName,
                isPdf: first.fileName.toLowerCase().endsWith(".pdf"),
                isConsolidated: false
              });
            }
          } else {
            setDocData(null);
          }
        })
        .catch((err) => {
          console.error("Error loading documents:", err);
          setDocData(null);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const folderName = docData?.folderName || `${student.studentId}_${student.name.replace(/\s+/g, "_")}`;
  const finalPdfUrl = `/api/documents/${encodeURIComponent(folderName)}/final-pdf`;
  const printUrl = `/api/documents/${encodeURIComponent(folderName)}/print`;

  const handlePrint = () => {
    window.open(printUrl, "_blank", "width=900,height=800");
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.75)", zIndex: 1055 }}>
      <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: "1200px" }}>
        <div className="modal-content shadow-lg border-0 rounded-3">
          {/* Header */}
          <div className="modal-header bg-dark text-white py-3 px-4 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <i className="bi bi-folder-check fs-4 text-primary"></i>
              <div>
                <h5 className="modal-title fw-bold mb-0">Student Documents &amp; Consolidated Clearance File</h5>
                <div className="small text-white-50 mt-1">
                  ID: <span className="text-white fw-bold me-2">{student.studentId}</span> &bull; Name:{" "}
                  <span className="text-white fw-bold me-2">{student.name}</span> &bull; Program:{" "}
                  <span className="badge bg-primary-subtle text-primary">{student.program}</span>
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <DocumentStatusBadge status={student.documentStatus} />
              <button type="button" className="btn-close btn-close-white ms-2" onClick={onClose} aria-label="Close"></button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-body-tertiary px-4 py-2 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="small text-muted">
              {student.documentSubmittedAt && (
                <span>
                  <i className="bi bi-clock-history me-1"></i>
                  Submitted: <strong>{formatTimestamp(student.documentSubmittedAt)}</strong>
                </span>
              )}
            </div>

            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 shadow-sm"
                onClick={handlePrint}
                disabled={!docData?.hasFinalPdf}
                title="Print consolidated PDF document without dashboard elements"
              >
                <i className="bi bi-printer-fill"></i>
                <span>Print Documents</span>
              </button>

              <a
                href={finalPdfUrl}
                download={`${folderName}_Complete_Documents.pdf`}
                className={`btn btn-sm btn-success d-inline-flex align-items-center gap-1 shadow-sm ${
                  !docData?.hasFinalPdf ? "disabled" : ""
                }`}
                title="Download consolidated PDF"
              >
                <i className="bi bi-file-earmark-arrow-down-fill"></i>
                <span>Download Complete PDF</span>
              </a>
            </div>
          </div>

          {/* Body: Split View */}
          <div className="modal-body p-0" style={{ height: "600px" }}>
            {loading ? (
              <div className="d-flex flex-column align-items-center justify-content-center h-100">
                <span className="spinner-border text-primary mb-2" role="status"></span>
                <span className="text-muted small">Loading documents and files...</span>
              </div>
            ) : !docData || (!docData.hasFinalPdf && docData.documents?.length === 0) ? (
              <div className="text-center py-5 my-5">
                <i className="bi bi-file-earmark-x text-secondary fs-1 mb-2 d-block"></i>
                <h6 className="fw-bold text-body">No Documents Uploaded</h6>
                <p className="text-muted small mb-3">
                  This student has not had clearance documents uploaded yet.
                </p>
                {typeof onOpenUploadWizard === "function" && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1 shadow-sm"
                    onClick={onOpenUploadWizard}
                  >
                    <i className="bi bi-file-earmark-arrow-up-fill"></i>
                    <span>Upload Documents Now</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="row g-0 h-100">
                {/* Left Pane: Documents Navigation List */}
                <div className="col-12 col-md-4 border-end bg-body-tertiary h-100 overflow-auto p-3">
                  {/* Final Consolidated Document Pill */}
                  {docData.hasFinalPdf && (
                    <div
                      className={`card mb-3 cursor-pointer border ${
                        selectedFile?.isConsolidated ? "border-primary bg-primary-subtle text-primary" : "border-secondary-subtle bg-body"
                      }`}
                      onClick={() =>
                        setSelectedFile({
                          url: finalPdfUrl,
                          name: `${folderName}_Complete_Documents.pdf`,
                          isPdf: true,
                          isConsolidated: true
                        })
                      }
                    >
                      <div className="card-body p-3">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="badge bg-primary text-white small">Consolidated</span>
                          <i className="bi bi-check2-circle text-primary"></i>
                        </div>
                        <h6 className="fw-bold mb-1 small text-truncate">Complete Merged File</h6>
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                          Final_Student_Document.pdf
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="fw-bold small text-secondary mb-2 text-uppercase tracking-wider">
                    Individual Source Documents ({docData.documents?.length || 0})
                  </div>

                  <div className="list-group list-group-flush rounded-3 border">
                    {docData.documents?.map((doc, idx) => {
                      const isSelected = selectedFile?.url === doc.url;
                      const isPdf = doc.fileName.toLowerCase().endsWith(".pdf");
                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`list-group-item list-group-item-action py-2 px-3 text-start ${
                            isSelected ? "active" : ""
                          }`}
                          onClick={() =>
                            setSelectedFile({
                              url: doc.url,
                              name: doc.fileName,
                              isPdf,
                              isConsolidated: false
                            })
                          }
                        >
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2 min-w-0">
                              <i
                                className={`bi ${
                                  isPdf ? "bi-file-earmark-pdf-fill text-danger" : "bi-file-earmark-image-fill text-info"
                                } fs-5`}
                              ></i>
                              <div className="text-truncate">
                                <div className="fw-semibold small text-truncate">{doc.fileName}</div>
                                <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                                  {(doc.sizeBytes / 1024).toFixed(1)} KB &bull; {doc.category}
                                </div>
                              </div>
                            </div>
                            <i className="bi bi-chevron-right small opacity-50 ms-2"></i>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Pane: Embedded Preview Viewer */}
                <div className="col-12 col-md-8 h-100 bg-black position-relative">
                  {selectedFile ? (
                    selectedFile.isPdf ? (
                      <iframe
                        src={`${selectedFile.url}#toolbar=1&navpanes=0`}
                        title="Document Viewer"
                        width="100%"
                        height="100%"
                        style={{ border: "none" }}
                      />
                    ) : (
                      <div className="d-flex align-items-center justify-content-center h-100 p-3">
                        <img
                          src={selectedFile.url}
                          alt={selectedFile.name}
                          className="img-fluid rounded"
                          style={{ maxHeight: "100%", objectFit: "contain" }}
                        />
                      </div>
                    )
                  ) : (
                    <div className="d-flex align-items-center justify-content-center h-100 text-white-50 small">
                      Select a document from the list to preview.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer py-2 px-4 bg-body-tertiary">
            <button type="button" className="btn btn-sm btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
