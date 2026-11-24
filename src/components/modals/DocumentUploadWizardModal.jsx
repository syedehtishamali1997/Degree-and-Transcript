import React, { useState, useEffect, useRef } from "react";
import { useCaseTrack } from "../../context/CaseTrackContext";
import { useToast } from "../../context/ToastContext";
import { validateStudentInput } from "../../utils/validators";
import { formatDateOnly } from "../../utils/dateUtils";

const STANDARD_ACADEMIC_DOCS = [
  { key: "matricMarkSheet", label: "Matric Mark Sheet", mandatory: true, acceptedTypes: ".pdf,.jpg,.jpeg,.png" },
  { key: "matricCertificate", label: "Matric Board Certificate", mandatory: true, acceptedTypes: ".pdf,.jpg,.jpeg,.png" },
  { key: "interMarkSheet", label: "Intermediate Mark Sheet", mandatory: true, acceptedTypes: ".pdf,.jpg,.jpeg,.png" },
  { key: "interCertificate", label: "Intermediate Provisional Board Certificate", mandatory: true, acceptedTypes: ".pdf,.jpg,.jpeg,.png" },
  { key: "gradMarkSheet", label: "Graduation Mark Sheet", mandatory: true, acceptedTypes: ".pdf,.jpg,.jpeg,.png" },
  { key: "degree", label: "Degree Certificate", mandatory: true, acceptedTypes: ".pdf,.jpg,.jpeg,.png" }
];

export function DocumentUploadWizardModal({ isOpen, student, onClose, onSaveSuccess }) {
  const { students, updateStudentDocuments, updateStudent } = useCaseTrack();
  const { addToast } = useToast();

  const [activeStep, setActiveStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewModalFile, setPreviewModalFile] = useState(null); // { url, name, isPdf }

  // Step 1: Student Information State
  const [formData, setFormData] = useState({
    studentId: "",
    name: "",
    program: "",
    programFull: "",
    applyOn: "",
    approvedDepartments: "",
    notes: ""
  });
  const [step1Errors, setStep1Errors] = useState({});

  // Step 2: Transcripts State
  const [transcripts, setTranscripts] = useState({
    edpTranscript: { file: null, existingName: null, size: 0, error: "" },
    examTranscript: { file: null, existingName: null, size: 0, error: "" }
  });

  // Step 3: Academic Documents State
  const [academicDocs, setAcademicDocs] = useState({
    matricMarkSheet: { file: null, existingName: null, size: 0, error: "" },
    matricCertificate: { file: null, existingName: null, size: 0, error: "" },
    interMarkSheet: { file: null, existingName: null, size: 0, error: "" },
    interCertificate: { file: null, existingName: null, size: 0, error: "" },
    gradMarkSheet: { file: null, existingName: null, size: 0, error: "" },
    degree: { file: null, existingName: null, size: 0, error: "" }
  });

  // Step 3: Additional Degrees State
  const [additionalDegrees, setAdditionalDegrees] = useState([]);

  // Fetch existing documents from backend on open
  useEffect(() => {
    if (student) {
      setFormData({
        studentId: student.studentId || "",
        name: student.name || "",
        program: student.program || "",
        programFull: student.programFull || "",
        applyOn: student.applyOn || "",
        approvedDepartments: student.approvedDepartments || "",
        notes: student.notes || ""
      });
      setStep1Errors({});
      setActiveStep(1);

      // Check existing files from server
      fetch(`/api/documents/${encodeURIComponent(student.studentId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.found && Array.isArray(data.documents)) {
            // Populate existing transcripts
            setTranscripts((prev) => {
              const updated = { ...prev };
              data.documents.forEach((d) => {
                if (d.category === "transcripts") {
                  if (d.fileName.toLowerCase().includes("edp")) {
                    updated.edpTranscript = { file: null, existingName: d.fileName, size: d.sizeBytes, error: "", url: d.url };
                  } else {
                    updated.examTranscript = { file: null, existingName: d.fileName, size: d.sizeBytes, error: "", url: d.url };
                  }
                }
              });
              return updated;
            });

            // Populate existing academic docs
            setAcademicDocs((prev) => {
              const updated = { ...prev };
              data.documents.forEach((d) => {
                if (d.category === "academic_documents") {
                  const fn = d.fileName.toLowerCase();
                  if (fn.includes("matric_mark")) updated.matricMarkSheet = { file: null, existingName: d.fileName, size: d.sizeBytes, error: "", url: d.url };
                  else if (fn.includes("matric_board")) updated.matricCertificate = { file: null, existingName: d.fileName, size: d.sizeBytes, error: "", url: d.url };
                  else if (fn.includes("intermediate_mark")) updated.interMarkSheet = { file: null, existingName: d.fileName, size: d.sizeBytes, error: "", url: d.url };
                  else if (fn.includes("intermediate_provisional")) updated.interCertificate = { file: null, existingName: d.fileName, size: d.sizeBytes, error: "", url: d.url };
                  else if (fn.includes("graduation_mark")) updated.gradMarkSheet = { file: null, existingName: d.fileName, size: d.sizeBytes, error: "", url: d.url };
                  else if (fn.startsWith("degree.")) updated.degree = { file: null, existingName: d.fileName, size: d.sizeBytes, error: "", url: d.url };
                }
              });
              return updated;
            });

            // Populate existing additional degrees
            const adds = data.documents.filter((d) => d.category === "additional_degrees");
            if (adds.length > 0) {
              setAdditionalDegrees(
                adds.map((d, i) => ({
                  id: "existing-" + i,
                  name: d.fileName.replace(/_\d+\.[^/.]+$/, "").replace(/_/g, " "),
                  file: null,
                  existingName: d.fileName,
                  size: d.sizeBytes,
                  url: d.url,
                  error: ""
                }))
              );
            }
          }
        })
        .catch((err) => {
          console.warn("Could not query existing documents from backend:", err);
        });
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  // Validation: Step 1
  const handleNextFromStep1 = () => {
    const val = validateStudentInput(formData, students, student.id);
    if (!val.valid) {
      const errMap = {};
      val.errors.forEach((e) => {
        if (e.includes("Student ID")) errMap.studentId = e;
        if (e.includes("Name")) errMap.name = e;
        if (e.includes("Program")) errMap.program = e;
        if (e.includes("Apply On")) errMap.applyOn = e;
      });
      setStep1Errors(errMap);
      return;
    }
    setStep1Errors({});
    setActiveStep(2);
  };

  // Validation: Step 2 (Transcripts)
  const handleNextFromStep2 = () => {
    let hasError = false;
    const updated = { ...transcripts };

    if (!updated.edpTranscript.file && !updated.edpTranscript.existingName) {
      updated.edpTranscript.error = "EDP Transcript (PDF) is mandatory.";
      hasError = true;
    } else {
      updated.edpTranscript.error = "";
    }

    if (!updated.examTranscript.file && !updated.examTranscript.existingName) {
      updated.examTranscript.error = "Exam Transcript (PDF) is mandatory.";
      hasError = true;
    } else {
      updated.examTranscript.error = "";
    }

    setTranscripts(updated);
    if (hasError) {
      addToast("Both EDP and Exam transcripts must be uploaded in PDF format.", "warning");
      return;
    }
    setActiveStep(3);
  };

  // Validation: Step 3 (Academic Documents)
  const handleNextFromStep3 = () => {
    let hasError = false;
    const updatedDocs = { ...academicDocs };

    STANDARD_ACADEMIC_DOCS.forEach((doc) => {
      if (doc.mandatory) {
        const item = updatedDocs[doc.key];
        if (!item.file && !item.existingName) {
          item.error = `${doc.label} is required.`;
          hasError = true;
        } else {
          item.error = "";
        }
      }
    });

    setAcademicDocs(updatedDocs);

    // Validate additional degrees if any added
    const updatedAdds = additionalDegrees.map((deg) => {
      let err = "";
      if (!deg.name.trim()) err = "Degree Name is required.";
      else if (!deg.file && !deg.existingName) err = "Degree document is required.";
      if (err) hasError = true;
      return { ...deg, error: err };
    });
    setAdditionalDegrees(updatedAdds);

    if (hasError) {
      addToast("Please upload all mandatory academic documents before continuing.", "warning");
      return;
    }

    setActiveStep(4);
  };

  // File Handlers for Transcripts
  const handleTranscriptFileSelect = (key, file) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setTranscripts((prev) => ({
        ...prev,
        [key]: { ...prev[key], error: "Only PDF format is accepted for transcripts." }
      }));
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setTranscripts((prev) => ({
        ...prev,
        [key]: { ...prev[key], error: "File size exceeds 25 MB limit." }
      }));
      return;
    }

    setTranscripts((prev) => ({
      ...prev,
      [key]: { file, existingName: null, size: file.size, error: "", previewUrl: URL.createObjectURL(file) }
    }));
  };

  // File Handlers for Academic Documents
  const handleAcademicFileSelect = (key, file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "jpg", "jpeg", "png"].includes(ext)) {
      setAcademicDocs((prev) => ({
        ...prev,
        [key]: { ...prev[key], error: "Supported formats: PDF, JPG, JPEG, PNG." }
      }));
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setAcademicDocs((prev) => ({
        ...prev,
        [key]: { ...prev[key], error: "File size exceeds 25 MB limit." }
      }));
      return;
    }

    setAcademicDocs((prev) => ({
      ...prev,
      [key]: { file, existingName: null, size: file.size, error: "", previewUrl: URL.createObjectURL(file) }
    }));
  };

  // Additional Degree Handlers
  const handleAddAnotherDegree = () => {
    setAdditionalDegrees((prev) => [
      ...prev,
      {
        id: "add-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        name: "",
        file: null,
        existingName: null,
        size: 0,
        error: ""
      }
    ]);
  };

  const handleRemoveAdditionalDegree = (id) => {
    setAdditionalDegrees((prev) => prev.filter((d) => d.id !== id));
  };

  const handleAdditionalDegreeChange = (id, field, value) => {
    setAdditionalDegrees((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value, error: "" } : d))
    );
  };

  const handleAdditionalDegreeFile = (id, file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "jpg", "jpeg", "png"].includes(ext)) {
      setAdditionalDegrees((prev) =>
        prev.map((d) => (d.id === id ? { ...d, error: "Supported formats: PDF, JPG, JPEG, PNG." } : d))
      );
      return;
    }
    setAdditionalDegrees((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, file, existingName: null, size: file.size, error: "", previewUrl: URL.createObjectURL(file) }
          : d
      )
    );
  };

  // Open Preview in Modal
  const openPreview = (url, name) => {
    const isPdf = url.toLowerCase().includes(".pdf") || (name && name.toLowerCase().endsWith(".pdf"));
    setPreviewModalFile({ url, name, isPdf });
  };

  // Step 4: Submit Documents and Generate Consolidated PDF
  const handleSubmitDocuments = async () => {
    setIsSubmitting(true);
    try {
      const payload = new FormData();

      // 1. Pass updated student information
      payload.append("studentName", formData.name);
      payload.append("studentInfo", JSON.stringify(formData));

      // 2. Transcripts
      if (transcripts.edpTranscript.file) {
        payload.append("edpTranscript", transcripts.edpTranscript.file);
      }
      if (transcripts.examTranscript.file) {
        payload.append("examTranscript", transcripts.examTranscript.file);
      }

      // 3. Academic Documents
      Object.keys(academicDocs).forEach((key) => {
        if (academicDocs[key].file) {
          payload.append(key, academicDocs[key].file);
        }
      });

      // 4. Additional Degrees
      const addMeta = [];
      additionalDegrees.forEach((deg) => {
        if (deg.file) {
          payload.append("additionalDegrees", deg.file);
          addMeta.push({ name: deg.name, filename: deg.file.name });
        } else if (deg.existingName) {
          addMeta.push({ name: deg.name, filename: deg.existingName });
        }
      });
      payload.append("additionalDegreesMeta", JSON.stringify(addMeta));

      // Send to backend
      const res = await fetch(`/api/documents/${encodeURIComponent(student.studentId)}/upload`, {
        method: "POST",
        body: payload
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Document upload and PDF consolidation failed.");
      }

      // Update student in React context
      updateStudent(student.id, formData);
      updateStudentDocuments(student.id, {
        documentStatus: "Submitted",
        documentSubmittedAt: data.documentSubmittedAt,
        folderName: data.folderName,
        finalPdfUrl: data.finalPdfUrl,
        documents: data.documents
      });

      addToast(
        `Documents successfully submitted! Consolidated PDF generated (${data.pdfResult?.pageCount || "multiple"} pages).`,
        "success"
      );

      if (typeof onSaveSuccess === "function") {
        onSaveSuccess();
      }
      onClose();
    } catch (err) {
      addToast("Failed to submit documents: " + err.message, "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.65)", zIndex: 1055 }}>
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: "1140px" }}>
          <div className="modal-content shadow-lg border-0 rounded-3">
            {/* Modal Header */}
            <div className="modal-header bg-dark text-white py-3 px-4">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-file-earmark-medical-fill fs-4 text-primary"></i>
                <div>
                  <h5 className="modal-title fw-bold mb-0">Student Document Management &amp; Clearance Wizard</h5>
                  <div className="small text-white-50 mt-1">
                    Student ID: <span className="text-white fw-bold me-2">{student.studentId}</span> &bull; Name:{" "}
                    <span className="text-white fw-bold me-2">{student.name}</span> &bull; Program:{" "}
                    <span className="badge bg-primary-subtle text-primary">{student.program}</span>
                  </div>
                </div>
              </div>
              <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close"></button>
            </div>

            {/* 4-Step Progress Indicator Bar */}
            <div className="bg-body-tertiary px-4 py-3 border-bottom">
              <div className="row g-2 text-center">
                <div className="col-3">
                  <div className={`p-2 rounded-2 small fw-semibold ${activeStep === 1 ? "bg-primary text-white shadow-sm" : activeStep > 1 ? "bg-success-subtle text-success border border-success-subtle" : "text-muted border"}`}>
                    <span className="d-none d-sm-inline">1. </span>Student Info {activeStep > 1 && <i className="bi bi-check-lg ms-1"></i>}
                  </div>
                </div>
                <div className="col-3">
                  <div className={`p-2 rounded-2 small fw-semibold ${activeStep === 2 ? "bg-primary text-white shadow-sm" : activeStep > 2 ? "bg-success-subtle text-success border border-success-subtle" : "text-muted border"}`}>
                    <span className="d-none d-sm-inline">2. </span>Transcripts {activeStep > 2 && <i className="bi bi-check-lg ms-1"></i>}
                  </div>
                </div>
                <div className="col-3">
                  <div className={`p-2 rounded-2 small fw-semibold ${activeStep === 3 ? "bg-primary text-white shadow-sm" : activeStep > 3 ? "bg-success-subtle text-success border border-success-subtle" : "text-muted border"}`}>
                    <span className="d-none d-sm-inline">3. </span>Academic Docs {activeStep > 3 && <i className="bi bi-check-lg ms-1"></i>}
                  </div>
                </div>
                <div className="col-3">
                  <div className={`p-2 rounded-2 small fw-semibold ${activeStep === 4 ? "bg-primary text-white shadow-sm" : "text-muted border"}`}>
                    <span className="d-none d-sm-inline">4. </span>Review &amp; Submit
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body: Active Step View */}
            <div className="modal-body p-4" style={{ minHeight: "440px" }}>
              {/* STEP 1: Student Information */}
              {activeStep === 1 && (
                <div>
                  <h6 className="fw-bold mb-3 text-body d-flex align-items-center gap-2">
                    <i className="bi bi-person-lines-fill text-primary"></i>
                    <span>Step 1: Verify &amp; Update Student Information</span>
                  </h6>

                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Student ID (Unique Identifier)</label>
                      <input type="text" className="form-control" value={formData.studentId} disabled readOnly />
                      <div className="form-text small">Student ID cannot be changed once created.</div>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Student Name *</label>
                      <input
                        type="text"
                        className={`form-control ${step1Errors.name ? "is-invalid" : ""}`}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Muhammad Ahmed"
                      />
                      {step1Errors.name && <div className="invalid-feedback">{step1Errors.name}</div>}
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Degree Program *</label>
                      <input
                        type="text"
                        className={`form-control ${step1Errors.program ? "is-invalid" : ""}`}
                        value={formData.program}
                        onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                        placeholder="e.g., BSCS, BBA, MBA"
                      />
                      {step1Errors.program && <div className="invalid-feedback">{step1Errors.program}</div>}
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Degree Program Full Title (Optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.programFull}
                        onChange={(e) => setFormData({ ...formData, programFull: e.target.value })}
                        placeholder="e.g., Bachelor of Science in Computer Science"
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Application / Apply On Date *</label>
                      <input
                        type="date"
                        className={`form-control ${step1Errors.applyOn ? "is-invalid" : ""}`}
                        value={formData.applyOn}
                        onChange={(e) => setFormData({ ...formData, applyOn: e.target.value })}
                      />
                      {step1Errors.applyOn && <div className="invalid-feedback">{step1Errors.applyOn}</div>}
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Approved Clearance Departments</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.approvedDepartments}
                        onChange={(e) => setFormData({ ...formData, approvedDepartments: e.target.value })}
                        placeholder="e.g., Library; Accounts; Examination"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Notes &amp; Administrative Remarks</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Add any internal clearance notes..."
                      ></textarea>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Transcript Attachments */}
              {activeStep === 2 && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0 text-body d-flex align-items-center gap-2">
                      <i className="bi bi-file-earmark-pdf-fill text-danger"></i>
                      <span>Step 2: Mandatory Transcript Attachments (PDF Only)</span>
                    </h6>
                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                      Mandatory Clearance Step
                    </span>
                  </div>

                  <p className="text-secondary small mb-4">
                    Both EDP and Examination transcripts must be uploaded in official PDF format. These documents form the core verification foundation for degree issuance.
                  </p>

                  <div className="row g-4">
                    {/* EDP Transcript Card */}
                    <div className="col-12 col-md-6">
                      <div className={`card h-100 border ${transcripts.edpTranscript.error ? "border-danger" : "border-secondary-subtle"}`}>
                        <div className="card-header bg-body d-flex justify-content-between align-items-center py-2">
                          <span className="fw-bold small text-body">
                            1. EDP Transcript <span className="text-danger">*</span>
                          </span>
                          {transcripts.edpTranscript.file || transcripts.edpTranscript.existingName ? (
                            <span className="badge bg-success small">Attached</span>
                          ) : (
                            <span className="badge bg-secondary small">Required</span>
                          )}
                        </div>
                        <div className="card-body d-flex flex-column justify-content-between">
                          <div>
                            {transcripts.edpTranscript.file || transcripts.edpTranscript.existingName ? (
                              <div className="p-3 bg-body-tertiary rounded-3 mb-3">
                                <div className="d-flex align-items-center gap-2 mb-1">
                                  <i className="bi bi-file-earmark-pdf-fill text-danger fs-5"></i>
                                  <span className="fw-bold small text-truncate">
                                    {transcripts.edpTranscript.file?.name || transcripts.edpTranscript.existingName}
                                  </span>
                                </div>
                                <div className="text-muted small">
                                  Size: {(transcripts.edpTranscript.size / 1024).toFixed(1)} KB
                                </div>
                              </div>
                            ) : (
                              <div className="border border-dashed rounded-3 p-4 text-center mb-3 bg-light bg-opacity-25">
                                <i className="bi bi-cloud-arrow-up text-secondary fs-2 mb-2 d-block"></i>
                                <span className="small text-muted d-block mb-2">Upload official EDP Transcript</span>
                                <label className="btn btn-sm btn-outline-primary cursor-pointer mb-0">
                                  <span>Browse PDF</span>
                                  <input
                                    type="file"
                                    className="d-none"
                                    accept=".pdf,application/pdf"
                                    onChange={(e) => handleTranscriptFileSelect("edpTranscript", e.target.files[0])}
                                  />
                                </label>
                              </div>
                            )}

                            {transcripts.edpTranscript.error && (
                              <div className="text-danger small mb-2">
                                <i className="bi bi-exclamation-circle me-1"></i>
                                {transcripts.edpTranscript.error}
                              </div>
                            )}
                          </div>

                          {(transcripts.edpTranscript.file || transcripts.edpTranscript.existingName) && (
                            <div className="d-flex gap-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-info flex-grow-1"
                                onClick={() =>
                                  openPreview(
                                    transcripts.edpTranscript.previewUrl || transcripts.edpTranscript.url,
                                    transcripts.edpTranscript.file?.name || transcripts.edpTranscript.existingName
                                  )
                                }
                              >
                                <i className="bi bi-eye me-1"></i> Preview
                              </button>
                              <label className="btn btn-sm btn-outline-secondary flex-grow-1 mb-0 cursor-pointer">
                                <span>Replace</span>
                                <input
                                  type="file"
                                  className="d-none"
                                  accept=".pdf,application/pdf"
                                  onChange={(e) => handleTranscriptFileSelect("edpTranscript", e.target.files[0])}
                                />
                              </label>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() =>
                                  setTranscripts((prev) => ({
                                    ...prev,
                                    edpTranscript: { file: null, existingName: null, size: 0, error: "" }
                                  }))
                                }
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Exam Transcript Card */}
                    <div className="col-12 col-md-6">
                      <div className={`card h-100 border ${transcripts.examTranscript.error ? "border-danger" : "border-secondary-subtle"}`}>
                        <div className="card-header bg-body d-flex justify-content-between align-items-center py-2">
                          <span className="fw-bold small text-body">
                            2. Exam Transcript <span className="text-danger">*</span>
                          </span>
                          {transcripts.examTranscript.file || transcripts.examTranscript.existingName ? (
                            <span className="badge bg-success small">Attached</span>
                          ) : (
                            <span className="badge bg-secondary small">Required</span>
                          )}
                        </div>
                        <div className="card-body d-flex flex-column justify-content-between">
                          <div>
                            {transcripts.examTranscript.file || transcripts.examTranscript.existingName ? (
                              <div className="p-3 bg-body-tertiary rounded-3 mb-3">
                                <div className="d-flex align-items-center gap-2 mb-1">
                                  <i className="bi bi-file-earmark-pdf-fill text-danger fs-5"></i>
                                  <span className="fw-bold small text-truncate">
                                    {transcripts.examTranscript.file?.name || transcripts.examTranscript.existingName}
                                  </span>
                                </div>
                                <div className="text-muted small">
                                  Size: {(transcripts.examTranscript.size / 1024).toFixed(1)} KB
                                </div>
                              </div>
                            ) : (
                              <div className="border border-dashed rounded-3 p-4 text-center mb-3 bg-light bg-opacity-25">
                                <i className="bi bi-cloud-arrow-up text-secondary fs-2 mb-2 d-block"></i>
                                <span className="small text-muted d-block mb-2">Upload official Exam Transcript</span>
                                <label className="btn btn-sm btn-outline-primary cursor-pointer mb-0">
                                  <span>Browse PDF</span>
                                  <input
                                    type="file"
                                    className="d-none"
                                    accept=".pdf,application/pdf"
                                    onChange={(e) => handleTranscriptFileSelect("examTranscript", e.target.files[0])}
                                  />
                                </label>
                              </div>
                            )}

                            {transcripts.examTranscript.error && (
                              <div className="text-danger small mb-2">
                                <i className="bi bi-exclamation-circle me-1"></i>
                                {transcripts.examTranscript.error}
                              </div>
                            )}
                          </div>

                          {(transcripts.examTranscript.file || transcripts.examTranscript.existingName) && (
                            <div className="d-flex gap-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-info flex-grow-1"
                                onClick={() =>
                                  openPreview(
                                    transcripts.examTranscript.previewUrl || transcripts.examTranscript.url,
                                    transcripts.examTranscript.file?.name || transcripts.examTranscript.existingName
                                  )
                                }
                              >
                                <i className="bi bi-eye me-1"></i> Preview
                              </button>
                              <label className="btn btn-sm btn-outline-secondary flex-grow-1 mb-0 cursor-pointer">
                                <span>Replace</span>
                                <input
                                  type="file"
                                  className="d-none"
                                  accept=".pdf,application/pdf"
                                  onChange={(e) => handleTranscriptFileSelect("examTranscript", e.target.files[0])}
                                />
                              </label>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() =>
                                  setTranscripts((prev) => ({
                                    ...prev,
                                    examTranscript: { file: null, existingName: null, size: 0, error: "" }
                                  }))
                                }
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Academic Documents */}
              {activeStep === 3 && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0 text-body d-flex align-items-center gap-2">
                      <i className="bi bi-mortarboard-fill text-primary"></i>
                      <span>Step 3: Academic Records &amp; Additional Degrees</span>
                    </h6>
                    <span className="small text-muted">Supported: PDF, JPG, JPEG, PNG</span>
                  </div>

                  {/* Standard 6 Documents Grid */}
                  <div className="row g-3 mb-4">
                    {STANDARD_ACADEMIC_DOCS.map((doc, idx) => {
                      const item = academicDocs[doc.key] || {};
                      const isAttached = item.file || item.existingName;
                      return (
                        <div className="col-12 col-md-6 col-lg-4" key={doc.key}>
                          <div className={`card h-100 border ${item.error ? "border-danger" : "border-secondary-subtle"}`}>
                            <div className="card-header bg-body d-flex justify-content-between align-items-center py-2">
                              <span className="fw-semibold small text-truncate">
                                {idx + 1}. {doc.label} {doc.mandatory && <span className="text-danger">*</span>}
                              </span>
                              {isAttached ? (
                                <span className="badge bg-success-subtle text-success border border-success-subtle small">
                                  Attached
                                </span>
                              ) : (
                                <span className="badge bg-secondary-subtle text-secondary small">Pending</span>
                              )}
                            </div>
                            <div className="card-body p-3 d-flex flex-column justify-content-between">
                              <div>
                                {isAttached ? (
                                  <div className="p-2 bg-body-tertiary rounded mb-2 small">
                                    <div className="fw-bold text-truncate">{item.file?.name || item.existingName}</div>
                                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                                      Size: {(item.size / 1024).toFixed(1)} KB
                                    </div>
                                  </div>
                                ) : (
                                  <div className="border border-dashed rounded p-3 text-center mb-2 bg-light bg-opacity-25">
                                    <label className="btn btn-xs btn-outline-primary mb-0 cursor-pointer">
                                      <span>Upload Document</span>
                                      <input
                                        type="file"
                                        className="d-none"
                                        accept={doc.acceptedTypes}
                                        onChange={(e) => handleAcademicFileSelect(doc.key, e.target.files[0])}
                                      />
                                    </label>
                                  </div>
                                )}

                                {item.error && <div className="text-danger small mb-1">{item.error}</div>}
                              </div>

                              {isAttached && (
                                <div className="d-flex gap-1 mt-2">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-info flex-grow-1"
                                    onClick={() => openPreview(item.previewUrl || item.url, item.file?.name || item.existingName)}
                                  >
                                    Preview
                                  </button>
                                  <label className="btn btn-sm btn-outline-secondary flex-grow-1 mb-0 cursor-pointer">
                                    <span>Replace</span>
                                    <input
                                      type="file"
                                      className="d-none"
                                      accept={doc.acceptedTypes}
                                      onChange={(e) => handleAcademicFileSelect(doc.key, e.target.files[0])}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() =>
                                      setAcademicDocs((prev) => ({
                                        ...prev,
                                        [doc.key]: { file: null, existingName: null, size: 0, error: "" }
                                      }))
                                    }
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Additional Degrees Feature */}
                  <div className="card shadow-sm border-primary border-opacity-25 bg-body mb-3">
                    <div className="card-header bg-body d-flex justify-content-between align-items-center py-3">
                      <div>
                        <h6 className="fw-bold mb-0 text-primary">Additional Degree Uploads</h6>
                        <span className="small text-muted">
                          Attach prior bachelor's, master's, or specialized diplomas for clearance.
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 shadow-sm"
                        onClick={handleAddAnotherDegree}
                      >
                        <i className="bi bi-plus-circle-fill"></i>
                        <span>Add Another Degree</span>
                      </button>
                    </div>

                    <div className="card-body">
                      {additionalDegrees.length === 0 ? (
                        <div className="text-center py-3 text-muted small">
                          No additional degrees attached. Click &ldquo;Add Another Degree&rdquo; if applicable.
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-3">
                          {additionalDegrees.map((deg, idx) => (
                            <div key={deg.id} className="p-3 border rounded bg-body-tertiary">
                              <div className="row g-2 align-items-center">
                                <div className="col-12 col-md-5">
                                  <label className="form-label small fw-semibold">
                                    Degree Title #{idx + 1} *
                                  </label>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="e.g., Master of Science in Data Science"
                                    value={deg.name}
                                    onChange={(e) => handleAdditionalDegreeChange(deg.id, "name", e.target.value)}
                                  />
                                </div>

                                <div className="col-12 col-md-5">
                                  <label className="form-label small fw-semibold">
                                    Degree Document (PDF / Image) *
                                  </label>
                                  {deg.file || deg.existingName ? (
                                    <div className="d-flex align-items-center gap-2">
                                      <span className="badge bg-success-subtle text-success border border-success-subtle text-truncate flex-grow-1">
                                        {deg.file?.name || deg.existingName}
                                      </span>
                                      <button
                                        type="button"
                                        className="btn btn-xs btn-outline-info"
                                        onClick={() => openPreview(deg.previewUrl || deg.url, deg.file?.name || deg.existingName)}
                                      >
                                        Preview
                                      </button>
                                      <label className="btn btn-xs btn-outline-secondary mb-0 cursor-pointer">
                                        <span>Replace</span>
                                        <input
                                          type="file"
                                          className="d-none"
                                          accept=".pdf,.jpg,.jpeg,.png"
                                          onChange={(e) => handleAdditionalDegreeFile(deg.id, e.target.files[0])}
                                        />
                                      </label>
                                    </div>
                                  ) : (
                                    <input
                                      type="file"
                                      className="form-control form-control-sm"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      onChange={(e) => handleAdditionalDegreeFile(deg.id, e.target.files[0])}
                                    />
                                  )}
                                </div>

                                <div className="col-12 col-md-2 text-md-end pt-md-3">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger w-100"
                                    onClick={() => handleRemoveAdditionalDegree(deg.id)}
                                  >
                                    <i className="bi bi-trash me-1"></i> Remove
                                  </button>
                                </div>
                              </div>
                              {deg.error && <div className="text-danger small mt-1">{deg.error}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Review & Submit */}
              {activeStep === 4 && (
                <div>
                  <h6 className="fw-bold mb-3 text-body d-flex align-items-center gap-2">
                    <i className="bi bi-clipboard2-check-fill text-success"></i>
                    <span>Step 4: Comprehensive Document Review Before Consolidation</span>
                  </h6>

                  <div className="row g-3 mb-4">
                    {/* Student Info Summary */}
                    <div className="col-12 col-lg-5">
                      <div className="card h-100 border-0 shadow-sm bg-body-tertiary">
                        <div className="card-header bg-body py-2 fw-bold small">
                          Student Information Summary
                        </div>
                        <div className="card-body p-3 small">
                          <div className="mb-2">
                            <span className="text-muted">Student ID:</span>{" "}
                            <span className="fw-bold">{formData.studentId}</span>
                          </div>
                          <div className="mb-2">
                            <span className="text-muted">Student Name:</span>{" "}
                            <span className="fw-bold">{formData.name}</span>
                          </div>
                          <div className="mb-2">
                            <span className="text-muted">Program:</span>{" "}
                            <span className="badge bg-primary">{formData.program}</span>
                          </div>
                          <div className="mb-2">
                            <span className="text-muted">Apply On:</span>{" "}
                            <span>{formatDateOnly(formData.applyOn)}</span>
                          </div>
                          {formData.approvedDepartments && (
                            <div className="mb-2">
                              <span className="text-muted">Depts:</span>{" "}
                              <span>{formData.approvedDepartments}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Transcripts Summary */}
                    <div className="col-12 col-lg-7">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-body py-2 fw-bold small">
                          Transcripts &amp; Academic Documents Status
                        </div>
                        <div className="card-body p-0">
                          <div className="table-responsive">
                            <table className="table table-sm table-hover align-middle mb-0 small table-fixed-layout">
                              <thead className="table-light">
                                <tr>
                                  <th style={{ width: "55px" }}>Order</th>
                                  <th style={{ width: "180px" }}>Document Type</th>
                                  <th>Attached File</th>
                                  <th style={{ width: "115px" }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>1</td>
                                  <td>EDP Transcript</td>
                                  <td className="fw-semibold">
                                    {transcripts.edpTranscript.file?.name || transcripts.edpTranscript.existingName || "--"}
                                  </td>
                                  <td>
                                    <span className="badge bg-success-subtle text-success">Valid PDF</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td>2</td>
                                  <td>Exam Transcript</td>
                                  <td className="fw-semibold">
                                    {transcripts.examTranscript.file?.name || transcripts.examTranscript.existingName || "--"}
                                  </td>
                                  <td>
                                    <span className="badge bg-success-subtle text-success">Valid PDF</span>
                                  </td>
                                </tr>
                                {STANDARD_ACADEMIC_DOCS.map((doc, i) => {
                                  const item = academicDocs[doc.key] || {};
                                  const name = item.file?.name || item.existingName;
                                  return (
                                    <tr key={doc.key}>
                                      <td>{i + 3}</td>
                                      <td>{doc.label}</td>
                                      <td className="fw-semibold">{name || "--"}</td>
                                      <td>
                                        {name ? (
                                          <span className="badge bg-success-subtle text-success">Ready</span>
                                        ) : (
                                          <span className="badge bg-secondary-subtle text-secondary">Not attached</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                                {additionalDegrees.map((deg, i) => (
                                  <tr key={deg.id}>
                                    <td>{9 + i}</td>
                                    <td>Additional: {deg.name}</td>
                                    <td className="fw-semibold">{deg.file?.name || deg.existingName || "--"}</td>
                                    <td>
                                      <span className="badge bg-primary-subtle text-primary">Degree Page</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-primary-subtle text-primary rounded-3 small d-flex align-items-center gap-2">
                    <i className="bi bi-info-circle-fill fs-5 flex-shrink-0"></i>
                    <div>
                      Submitting will convert and merge all files into <strong>Final_Student_Document.pdf</strong> inside the student&apos;s folder and make the case immediately eligible for the <strong>Case Ready Queue</strong>.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer: Navigation & Actions */}
            <div className="modal-footer bg-body-tertiary px-4 py-3 d-flex justify-content-between">
              <div>
                {activeStep > 1 && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary d-inline-flex align-items-center gap-1"
                    onClick={() => setActiveStep((prev) => prev - 1)}
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-arrow-left"></i>
                    <span>Back</span>
                  </button>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </button>

                {activeStep === 1 && (
                  <button type="button" className="btn btn-primary d-inline-flex align-items-center gap-1" onClick={handleNextFromStep1}>
                    <span>Next: Transcripts</span>
                    <i className="bi bi-arrow-right"></i>
                  </button>
                )}

                {activeStep === 2 && (
                  <button type="button" className="btn btn-primary d-inline-flex align-items-center gap-1" onClick={handleNextFromStep2}>
                    <span>Next: Academic Docs</span>
                    <i className="bi bi-arrow-right"></i>
                  </button>
                )}

                {activeStep === 3 && (
                  <button type="button" className="btn btn-primary d-inline-flex align-items-center gap-1" onClick={handleNextFromStep3}>
                    <span>Next: Review &amp; Submit</span>
                    <i className="bi bi-arrow-right"></i>
                  </button>
                )}

                {activeStep === 4 && (
                  <button
                    type="button"
                    className="btn btn-success d-inline-flex align-items-center gap-2 shadow"
                    onClick={handleSubmitDocuments}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Consolidating PDF...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cloud-check-fill"></i>
                        <span>Submit Documents &amp; Generate Consolidated PDF</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Modal: Document Preview Dialog */}
      {previewModalFile && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.8)", zIndex: 1060 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered" style={{ maxWidth: "800px" }}>
            <div className="modal-content shadow-lg border-0 rounded-3">
              <div className="modal-header py-2 px-3 bg-dark text-white">
                <h6 className="modal-title small fw-bold mb-0 text-truncate">{previewModalFile.name || "Document Preview"}</h6>
                <button type="button" className="btn-close btn-close-white" onClick={() => setPreviewModalFile(null)}></button>
              </div>
              <div className="modal-body p-0 text-center bg-black" style={{ height: "550px" }}>
                {previewModalFile.isPdf ? (
                  <iframe src={previewModalFile.url} title="PDF Preview" width="100%" height="100%" style={{ border: "none" }} />
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100 p-2">
                    <img src={previewModalFile.url} alt="Preview" className="img-fluid rounded" style={{ maxHeight: "100%", objectFit: "contain" }} />
                  </div>
                )}
              </div>
              <div className="modal-footer py-2 px-3">
                <a href={previewModalFile.url} download={previewModalFile.name} className="btn btn-sm btn-outline-primary">
                  <i className="bi bi-download me-1"></i> Download File
                </a>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPreviewModalFile(null)}>
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
