import React, { useState, useMemo } from "react";
import { useCaseTrack } from "../context/CaseTrackContext";
import { useModals } from "../context/ModalContext";
import { useToast } from "../context/ToastContext";
import { ExcelService } from "../services/ExcelService";
import { StorageService, formatBytes, validateDatabaseSchema } from "../services/StorageService";
import { StatusBadge } from "../components/common/Badge";
import "./DataManagementPage.css";

export function DataManagementPage() {
  const {
    database,
    students,
    stats,
    importExcelStudents,
    replaceDatabase,
    mergeDatabase,
    wipeDatabase,
    deleteMultipleStudents,
    clearAllStudentData,
    resetDatabaseToFactory,
    storageMetrics,
    refreshStorageMetrics
  } = useCaseTrack();

  const { openRestoreConfirm, openWipeConfirm } = useModals();
  const { addToast } = useToast();

  // Excel Upload State
  const [excelFile, setExcelFile] = useState(null);
  const [duplicateHandling, setDuplicateHandling] = useState("skip");
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [excelParseResult, setExcelParseResult] = useState(null);
  const [previewSearch, setPreviewSearch] = useState("");
  const [previewPage, setPreviewPage] = useState(1);
  const [previewPerPage, setPreviewPerPage] = useState(10);
  const [showInvalidDetails, setShowInvalidDetails] = useState(false);

  // JSON Restore State
  const [jsonFile, setJsonFile] = useState(null);
  const [restoreMode, setRestoreMode] = useState("replace"); // "replace" or "merge"
  const [isParsingJson, setIsParsingJson] = useState(false);

  // Database Cleanup State
  const [cleanSearch, setCleanSearch] = useState("");
  const [cleanStageFilter, setCleanStageFilter] = useState("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearAllConfirmText, setClearAllConfirmText] = useState("");
  const [showResetDbModal, setShowResetDbModal] = useState(false);
  const [resetDbConfirmText, setResetDbConfirmText] = useState("");

  // Storage and document metrics
  const storageBytes = storageMetrics?.usedBytes ?? StorageService.getStorageUsageBytes();
  const storageKb = (storageBytes / 1024).toFixed(1);
  const storageFormatted = storageMetrics?.usedFormatted || StorageService.formatBytes(storageBytes);
  const targetCapacityFormatted = storageMetrics?.targetCapacityFormatted || "100.00 GB";
  const availableFormatted = storageMetrics?.availableFormatted || "--";
  const usagePercent = storageMetrics?.usagePercent || 0;

  const totalUploadedDocs = useMemo(() => {
    return students.reduce((acc, s) => {
      const count = Array.isArray(s.documentsList)
        ? s.documentsList.length
        : s.documentSubmittedAt
        ? 2
        : 0;
      return acc + count;
    }, 0);
  }, [students]);

  // Filtered cleanup candidates
  const cleanupCandidates = useMemo(() => {
    return students.filter((s) => {
      if (cleanStageFilter !== "all" && s.status !== cleanStageFilter) {
        return false;
      }
      if (cleanSearch.trim()) {
        const q = cleanSearch.toLowerCase().trim();
        const matchesId = s.studentId && s.studentId.toLowerCase().includes(q);
        const matchesName = s.name && s.name.toLowerCase().includes(q);
        const matchesProg = s.program && s.program.toLowerCase().includes(q);
        return matchesId || matchesName || matchesProg;
      }
      return true;
    });
  }, [students, cleanStageFilter, cleanSearch]);

  // Excel Preview Filtering and Pagination
  const filteredPreviewRows = useMemo(() => {
    if (!excelParseResult?.rows) return [];
    if (!previewSearch.trim()) return excelParseResult.rows;
    const q = previewSearch.toLowerCase().trim();
    return excelParseResult.rows.filter((r) =>
      (r.studentId && r.studentId.toLowerCase().includes(q)) ||
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.program && r.program.toLowerCase().includes(q)) ||
      (r.rawStatus && r.rawStatus.toLowerCase().includes(q))
    );
  }, [excelParseResult, previewSearch]);

  const totalPreviewPages = Math.ceil(filteredPreviewRows.length / previewPerPage) || 1;
  const paginatedPreviewRows = useMemo(() => {
    const start = (previewPage - 1) * previewPerPage;
    return filteredPreviewRows.slice(start, start + previewPerPage);
  }, [filteredPreviewRows, previewPage, previewPerPage]);

  const allCandidatesSelected =
    cleanupCandidates.length > 0 &&
    cleanupCandidates.every((s) => selectedStudentIds.includes(s.id));

  const selectedStudents = useMemo(() => {
    return students.filter((s) => selectedStudentIds.includes(s.id));
  }, [students, selectedStudentIds]);

  const selectedHistoryCount = useMemo(() => {
    return selectedStudents.reduce((acc, s) => acc + (s.activityHistory?.length || 0), 0);
  }, [selectedStudents]);

  const selectedDocsCount = useMemo(() => {
    return selectedStudents.reduce((acc, s) => {
      const count = Array.isArray(s.documentsList)
        ? s.documentsList.length
        : s.documentSubmittedAt
        ? 2
        : 0;
      return acc + count;
    }, 0);
  }, [selectedStudents]);

  const estimatedStorageReleased = useMemo(() => {
    if (!students.length) return "0.0";
    const perStudentBytes = storageBytes / students.length;
    return ((perStudentBytes * selectedStudents.length) / 1024).toFixed(1);
  }, [storageBytes, students.length, selectedStudents.length]);

  const handleToggleSelect = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleToggleSelectAll = () => {
    if (allCandidatesSelected) {
      const candidateIds = new Set(cleanupCandidates.map((s) => s.id));
      setSelectedStudentIds((prev) => prev.filter((id) => !candidateIds.has(id)));
    } else {
      const candidateIds = cleanupCandidates.map((s) => s.id);
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...candidateIds])));
    }
  };

  const handleConfirmDeleteSelected = () => {
    if (selectedStudentIds.length === 0) return;
    try {
      const count = selectedStudentIds.length;
      deleteMultipleStudents(selectedStudentIds);
      setSelectedStudentIds([]);
      setShowDeleteSelectedModal(false);
      addToast(`Successfully removed ${count} student record(s) and associated files.`, "success");
    } catch (err) {
      addToast("Failed to delete selected records: " + err.message, "danger");
    }
  };

  const handleConfirmClearAll = () => {
    if (clearAllConfirmText !== "DELETE ALL STUDENT DATA") return;
    try {
      clearAllStudentData();
      setShowClearAllModal(false);
      setClearAllConfirmText("");
      setSelectedStudentIds([]);
      addToast("All student data, files, and workflow history have been cleared.", "danger");
    } catch (err) {
      addToast("Failed to clear student data: " + err.message, "danger");
    }
  };

  const handleConfirmResetDb = () => {
    if (resetDbConfirmText !== "RESET DATABASE") return;
    try {
      resetDatabaseToFactory();
      setShowResetDbModal(false);
      setResetDbConfirmText("");
      addToast("Database has been reset to factory defaults. A full backup was downloaded.", "warning");
    } catch (err) {
      addToast("Failed to reset database: " + err.message, "danger");
    }
  };

  // Handle Excel Parse & Preview
  const handleParseExcel = async () => {
    if (!excelFile) {
      addToast("Please select an Excel (.xlsx, .xls) file first.", "warning");
      return;
    }

    setIsParsingExcel(true);
    setExcelParseResult(null);
    setPreviewSearch("");
    setPreviewPage(1);

    try {
      const result = await ExcelService.parseExcelFile(excelFile);
      if (result.validCount === 0) {
        addToast("No valid student rows found in the selected file.", "danger");
      } else {
        setExcelParseResult(result);
        addToast(
          `Parsed ${result.validCount} valid student record(s) successfully (${result.invalidCount} skipped). Review preview before importing.`,
          "success"
        );
      }
    } catch (err) {
      addToast("Failed to parse Excel file: " + err.message, "danger");
    } finally {
      setIsParsingExcel(false);
    }
  };

  // Commit Excel Import
  const handleCommitExcelImport = () => {
    if (!excelParseResult || !excelParseResult.rows.length) return;

    try {
      const res = importExcelStudents(excelParseResult.rows, duplicateHandling);
      if (res.ok) {
        addToast(
          `Import complete! Added ${res.addedCount} students (${res.duplicates.length} duplicate/skipped).`,
          "success"
        );
        setExcelParseResult(null);
        setExcelFile(null);
        setPreviewSearch("");
        setPreviewPage(1);
      }
    } catch (err) {
      addToast("Import error: " + err.message, "danger");
    }
  };

  // Handle Excel Export
  const handleExportExcel = () => {
    try {
      ExcelService.exportToExcel(students, stats);
      addToast("Comprehensive multi-sheet Excel report downloaded successfully.", "success");
    } catch (err) {
      addToast("Failed to export Excel report: " + err.message, "danger");
    }
  };

  // Handle JSON Backup Download
  const handleExportJson = () => {
    try {
      StorageService.exportDatabaseToJson(database);
      addToast("Complete JSON database backup exported successfully.", "success");
    } catch (err) {
      addToast("Failed to export JSON backup: " + err.message, "danger");
    }
  };

  // Handle JSON Restore
  const handleRestoreJson = async () => {
    if (!jsonFile) {
      addToast("Please select a JSON backup file first.", "warning");
      return;
    }

    setIsParsingJson(true);
    try {
      const parsed = await StorageService.readJsonFile(jsonFile);
      const validation = validateDatabaseSchema(parsed);
      if (!validation.valid) {
        addToast("Invalid database schema: " + validation.error, "danger");
        setIsParsingJson(false);
        return;
      }

      openRestoreConfirm(() => {
        if (restoreMode === "replace") {
          replaceDatabase(parsed);
          addToast("Database completely replaced from backup file.", "warning");
        } else {
          mergeDatabase(parsed);
          addToast("Database merged with incoming backup file.", "success");
        }
        setJsonFile(null);
      });
    } catch (err) {
      addToast("Failed to parse JSON file: " + err.message, "danger");
    } finally {
      setIsParsingJson(false);
    }
  };

  // Handle Clear Database
  const handleWipeDatabase = () => {
    openWipeConfirm(() => {
      wipeDatabase();
      addToast("All database records have been cleared.", "danger");
    });
  };

  return (
    <div className="data-mgmt-page container-fluid px-3 px-md-4 py-4">
      {/* Top Page Header Banner */}
      <div className="dm-header-banner mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="dm-header-icon-box">
              <i className="bi bi-database-fill-gear"></i>
            </div>
            <div>
              <h3 className="fw-bold mb-1 dm-title text-body">Data Management &amp; Persistence</h3>
              <p className="dm-subtitle mb-0">
                University database administration, multi-format ingestion, Excel reports, and immutable JSON system snapshots.
              </p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="dm-badge-stat">
              <i className="bi bi-people-fill text-primary"></i>
              <span><strong>{students.length}</strong> Students</span>
            </div>
            <div className="dm-badge-stat">
              <i className="bi bi-hdd-network-fill text-info"></i>
              <span><strong>{storageFormatted}</strong> / {targetCapacityFormatted}</span>
            </div>
            <div className="dm-badge-stat">
              <i className="bi bi-folder-check text-success"></i>
              <span><strong>{totalUploadedDocs}</strong> Attached Files</span>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* =========================================================================
            SECTION A – EXCEL IMPORT & DATA INGESTION
            ========================================================================= */}
        <div className="col-12" id="section-excel-import">
          <div className="dm-card">
            <div className="dm-card-header">
              <div className="d-flex align-items-center gap-3">
                <div className="dm-section-icon bg-success-subtle text-success">
                  <i className="bi bi-file-earmark-excel-fill"></i>
                </div>
                <div>
                  <h5 className="dm-section-title text-body">Section A: Excel Upload &amp; Data Ingestion</h5>
                  <p className="dm-section-desc">
                    Batch ingest degree &amp; transcript applications exported from university systems or standard templates.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2"
                onClick={() => ExcelService.downloadSampleTemplate()}
                title="Download official sample Excel structure"
              >
                <i className="bi bi-download"></i>
                <span className="d-none d-sm-inline">Download Sample Template</span>
              </button>
            </div>

            <div className="dm-card-body">
              {/* Supported Column Headers Tag Banner */}
              <div className="dm-tag-container mb-3">
                <span className="small text-muted fw-semibold me-1">Supported Columns:</span>
                <span className="dm-tag" title="Auto-detects Student ID, Registration No, CMS ID">
                  <i className="bi bi-person-badge text-primary"></i>Student ID
                </span>
                <span className="dm-tag" title="Auto-detects Student Name, Full Name">
                  <i className="bi bi-person-fill text-info"></i>Student Name
                </span>
                <span className="dm-tag" title="Auto-detects Program, Degree, Department">
                  <i className="bi bi-mortarboard-fill text-success"></i>Degree Program
                </span>
                <span className="dm-tag" title="Auto-detects Date, Application Date, Applied On">
                  <i className="bi bi-calendar-check text-warning"></i>Apply Date
                </span>
                <span className="small text-muted ms-auto d-none d-lg-inline">
                  <i className="bi bi-magic me-1 text-primary"></i>Auto-resolves Odoo CMS combined columns &amp; date serials
                </span>
              </div>

              {/* Upload Controls Row */}
              <div className="row g-3 align-items-stretch">
                {/* File Dropzone / Selector */}
                <div className="col-12 col-lg-5">
                  <div className={`dm-dropzone ${excelFile ? "has-file" : ""}`}>
                    <input
                      type="file"
                      className="dm-dropzone-input"
                      accept=".xlsx, .xls"
                      onChange={(e) => {
                        setExcelFile(e.target.files[0] || null);
                        setExcelParseResult(null);
                      }}
                      id="excelFileInput"
                      aria-label="Upload Excel File"
                    />
                    {excelFile ? (
                      <div className="dm-file-chip">
                        <i className="bi bi-file-earmark-excel-fill text-success fs-5"></i>
                        <div className="text-start">
                          <div className="text-truncate" style={{ maxWidth: "240px" }}>{excelFile.name}</div>
                          <div className="small text-muted">{(excelFile.size / 1024).toFixed(1)} KB</div>
                        </div>
                        <button
                          type="button"
                          className="btn-close ms-2"
                          aria-label="Remove selected file"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setExcelFile(null);
                            setExcelParseResult(null);
                            const el = document.getElementById("excelFileInput");
                            if (el) el.value = "";
                          }}
                        ></button>
                      </div>
                    ) : (
                      <>
                        <i className="bi bi-cloud-arrow-up fs-2 text-primary mb-1"></i>
                        <span className="fw-semibold small text-body">Choose Excel File (.xlsx or .xls)</span>
                        <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                          Click or drag and drop university export file here
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Duplicate Student Handling */}
                <div className="col-12 col-md-6 col-lg-4 d-flex flex-column justify-content-between">
                  <div>
                    <label className="form-label small fw-semibold text-body mb-1" htmlFor="duplicateHandlingSelect">
                      Duplicate Student ID Handling
                    </label>
                    <select
                      id="duplicateHandlingSelect"
                      className="form-select form-select-sm"
                      value={duplicateHandling}
                      onChange={(e) => setDuplicateHandling(e.target.value)}
                    >
                      <option value="skip">Skip Duplicates (Preserve Existing Records)</option>
                      <option value="overwrite">Overwrite Existing Records (Update Data)</option>
                    </select>
                    <div className="form-text small text-muted" style={{ fontSize: "0.75rem" }}>
                      {duplicateHandling === "skip"
                        ? "New students will be appended. Existing student IDs will be preserved safely."
                        : "Existing student IDs found in Excel will have their name and program refreshed."}
                    </div>
                  </div>
                </div>

                {/* Parse & Inspect Action */}
                <div className="col-12 col-md-6 col-lg-3 d-flex align-items-end">
                  <button
                    type="button"
                    className="btn btn-primary w-100 py-2 d-inline-flex align-items-center justify-content-center gap-2 shadow-sm"
                    onClick={handleParseExcel}
                    disabled={!excelFile || isParsingExcel}
                  >
                    {isParsingExcel ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Parsing File...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-search"></i>
                        <span>Parse &amp; Preview File</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Excel Inspection Results & Table Preview Panel */}
              {excelParseResult && (
                <div className="mt-4 p-3 border rounded-3 bg-body-tertiary">
                  {/* Status Banner & Action Buttons */}
                  <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <div>
                      <h6 className="fw-bold mb-1 text-success d-flex align-items-center gap-2">
                        <i className="bi bi-check-circle-fill"></i>
                        <span>Excel Inspection Complete: {excelParseResult.validCount} Valid Records Detected</span>
                      </h6>
                      <span className="text-secondary small">
                        Worksheet: <strong>{excelParseResult.sheetName || "Sheet1"}</strong> &bull; Header Row: <strong>Row {excelParseResult.headerRow}</strong> &bull; Total Scanned: <strong>{excelParseResult.totalRows}</strong> rows
                      </span>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                          setExcelParseResult(null);
                          setExcelFile(null);
                          setPreviewSearch("");
                          setPreviewPage(1);
                        }}
                      >
                        Discard
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-success d-inline-flex align-items-center gap-1 shadow-sm px-3"
                        onClick={handleCommitExcelImport}
                      >
                        <i className="bi bi-cloud-arrow-up-fill"></i>
                        <span>Commit Import ({excelParseResult.validCount} Students)</span>
                      </button>
                    </div>
                  </div>

                  {/* 8 Diagnostic Metrics Grid */}
                  <div className="row g-2 mb-3">
                    <div className="col-6 col-sm-4 col-md-3 col-xl">
                      <div className="dm-metric-card">
                        <div className="dm-metric-label">Total Rows</div>
                        <div className="dm-metric-value text-body">{excelParseResult.totalRows}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 col-xl">
                      <div className="dm-metric-card" style={{ borderColor: "rgba(27, 158, 62, 0.3)", background: "rgba(27, 158, 62, 0.05)" }}>
                        <div className="dm-metric-label text-success">Valid Records</div>
                        <div className="dm-metric-value text-success">{excelParseResult.validCount}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 col-xl">
                      <div className="dm-metric-card">
                        <div className="dm-metric-label">Skipped Rows</div>
                        <div className={`dm-metric-value ${excelParseResult.invalidCount > 0 ? "text-danger" : "text-body"}`}>
                          {excelParseResult.invalidCount}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 col-xl">
                      <div className="dm-metric-card">
                        <div className="dm-metric-label">Duplicate IDs</div>
                        <div className={`dm-metric-value ${excelParseResult.duplicateCount > 0 ? "text-warning" : "text-body"}`}>
                          {excelParseResult.duplicateCount}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 col-xl">
                      <div className="dm-metric-card">
                        <div className="dm-metric-label">Missing IDs</div>
                        <div className={`dm-metric-value ${excelParseResult.missingIdCount > 0 ? "text-danger" : "text-body"}`}>
                          {excelParseResult.missingIdCount}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 col-xl">
                      <div className="dm-metric-card">
                        <div className="dm-metric-label">Missing Names</div>
                        <div className={`dm-metric-value ${excelParseResult.missingNameCount > 0 ? "text-danger" : "text-body"}`}>
                          {excelParseResult.missingNameCount}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 col-xl">
                      <div className="dm-metric-card">
                        <div className="dm-metric-label">Missing Programs</div>
                        <div className="dm-metric-value text-body">{excelParseResult.missingProgCount}</div>
                      </div>
                    </div>
                    <div className="col-6 col-sm-4 col-md-3 col-xl">
                      <div className="dm-metric-card">
                        <div className="dm-metric-label">Missing Dates</div>
                        <div className="dm-metric-value text-body">{excelParseResult.missingDateCount}</div>
                      </div>
                    </div>
                  </div>

                  {/* Skipped Rows Diagnostic Drawer */}
                  {excelParseResult.invalidRows?.length > 0 && (
                    <div className="alert alert-warning py-2 px-3 small mb-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <span>
                          <i className="bi bi-exclamation-triangle-fill me-1"></i>
                          <strong>{excelParseResult.invalidRows.length} row(s) skipped</strong> due to missing mandatory identifiers (e.g. Draft / Cancel rows without Student ID).
                        </span>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                          onClick={() => setShowInvalidDetails(!showInvalidDetails)}
                        >
                          {showInvalidDetails ? "Hide Skipped Rows" : "View Skipped Rows"}
                        </button>
                      </div>
                      {showInvalidDetails && (
                        <div className="mt-2 pt-2 border-top">
                          <ul className="mb-0 ps-3">
                            {excelParseResult.invalidRows.map((inv, idx) => (
                              <li key={idx}>
                                <strong>Row {inv.excelRow}:</strong> {inv.reason}
                                {inv.rawData && inv.rawData[6] ? ` (Raw Status: ${inv.rawData[6]})` : ""}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Preview Search Filter & Pagination Config */}
                  <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                    <div className="input-group input-group-sm" style={{ maxWidth: "340px" }}>
                      <span className="input-group-text bg-body border-end-0"><i className="bi bi-search"></i></span>
                      <input
                        type="text"
                        className="form-control border-start-0"
                        placeholder="Filter preview records..."
                        value={previewSearch}
                        onChange={(e) => {
                          setPreviewSearch(e.target.value);
                          setPreviewPage(1);
                        }}
                      />
                      {previewSearch && (
                        <button className="btn btn-outline-secondary" type="button" onClick={() => setPreviewSearch("")}>
                          &times;
                        </button>
                      )}
                    </div>
                    <div className="d-flex align-items-center gap-2 small">
                      <span className="text-secondary">Rows per page:</span>
                      <select
                        className="form-select form-select-sm"
                        style={{ width: "auto" }}
                        value={previewPerPage}
                        onChange={(e) => {
                          setPreviewPerPage(Number(e.target.value));
                          setPreviewPage(1);
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="text-muted">
                        Showing {filteredPreviewRows.length === 0 ? 0 : (previewPage - 1) * previewPerPage + 1}–
                        {Math.min(previewPage * previewPerPage, filteredPreviewRows.length)} of {filteredPreviewRows.length}
                      </span>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="dm-table-wrapper mb-2">
                    <div className="table-responsive">
                      <table className="dm-table">
                        <thead>
                          <tr>
                            <th style={{ width: "44px" }}>#</th>
                            <th style={{ width: "85px" }}>Excel Row</th>
                            <th style={{ width: "125px" }}>Student ID</th>
                            <th style={{ width: "160px" }}>Student Name</th>
                            <th>Program</th>
                            <th style={{ width: "95px" }}>Apply On</th>
                            <th style={{ width: "95px" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedPreviewRows.map((row, idx) => {
                            const globalIdx = (previewPage - 1) * previewPerPage + idx + 1;
                            return (
                              <tr key={idx}>
                                <td className="text-muted">{globalIdx}</td>
                                <td className="text-secondary">Row {row.excelRow}</td>
                                <td className="fw-bold font-monospace text-primary">{row.studentId}</td>
                                <td className="fw-semibold">{row.name}</td>
                                <td>{row.program}</td>
                                <td>{row.applyOn}</td>
                                <td>
                                  <span className="badge bg-light text-dark border">
                                    {row.rawStatus || "Valid"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {paginatedPreviewRows.length === 0 && (
                            <tr>
                              <td colSpan={7} className="text-center py-4 text-muted">
                                No matching student records found in preview.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination Controls */}
                  {totalPreviewPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-2 small">
                      <span className="text-muted">
                        Page {previewPage} of {totalPreviewPages}
                      </span>
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          disabled={previewPage <= 1}
                          onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          disabled={previewPage >= totalPreviewPages}
                          onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION B – EXCEL EXPORT
            ========================================================================= */}
        <div className="col-12 col-lg-6" id="section-excel-export">
          <div className="dm-card h-100 d-flex flex-column">
            <div className="dm-card-header">
              <div className="d-flex align-items-center gap-3">
                <div className="dm-section-icon bg-success-subtle text-success">
                  <i className="bi bi-file-earmark-spreadsheet-fill"></i>
                </div>
                <div>
                  <h5 className="dm-section-title text-body">Section B: Export Dataset to Excel</h5>
                  <p className="dm-section-desc">Generate multi-sheet workbook (.xlsx) with stage breakdowns.</p>
                </div>
              </div>
            </div>

            <div className="dm-card-body d-flex flex-column justify-content-between flex-grow-1">
              <div>
                <p className="small text-muted mb-3">
                  Downloads an exhaustive university administrative spreadsheet formatted with dedicated sheets:
                </p>

                {/* 7 Worksheets Breakdown Grid */}
                <div className="dm-sheet-grid mb-3">
                  <div className="dm-sheet-item">
                    <span className="dm-sheet-num">1</span>
                    <span>Executive KPI Summary</span>
                  </div>
                  <div className="dm-sheet-item">
                    <span className="dm-sheet-num">2</span>
                    <span>All Student Records (Master)</span>
                  </div>
                  <div className="dm-sheet-item">
                    <span className="dm-sheet-num">3</span>
                    <span>Pending Cases (Stage 0)</span>
                  </div>
                  <div className="dm-sheet-item">
                    <span className="dm-sheet-num">4</span>
                    <span>Case Ready Queue (Stage 1)</span>
                  </div>
                  <div className="dm-sheet-item">
                    <span className="dm-sheet-num">5</span>
                    <span>Sent to Main Campus (Stage 2)</span>
                  </div>
                  <div className="dm-sheet-item">
                    <span className="dm-sheet-num">6</span>
                    <span>Returned Cases (Stage 2b)</span>
                  </div>
                  <div className="dm-sheet-item">
                    <span className="dm-sheet-num">7</span>
                    <span>Received Cases (Stage 3)</span>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2 p-2 bg-body-tertiary rounded small text-muted mb-3">
                  <i className="bi bi-shield-check text-primary fs-6"></i>
                  <span>Includes all dispatch logs, documented return reasons, and activity history.</span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-outline-success w-100 d-inline-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
                onClick={handleExportExcel}
                disabled={students.length === 0}
              >
                <i className="bi bi-download"></i>
                <span>Export Multi-Sheet Excel Workbook</span>
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION C – JSON BACKUP & RESTORE
            ========================================================================= */}
        <div className="col-12 col-lg-6" id="section-json-backup">
          <div className="dm-card h-100 d-flex flex-column">
            <div className="dm-card-header">
              <div className="d-flex align-items-center gap-3">
                <div className="dm-section-icon bg-primary-subtle text-primary">
                  <i className="bi bi-database-check"></i>
                </div>
                <div>
                  <h5 className="dm-section-title text-body">Section C: JSON Backup &amp; Restore</h5>
                  <p className="dm-section-desc">Immutable system snapshots and schema-validated state recovery.</p>
                </div>
              </div>
            </div>

            <div className="dm-card-body d-flex flex-column justify-content-between flex-grow-1">
              <div>
                {/* Block 1: Export JSON Snapshot */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <h6 className="fw-semibold small text-body mb-0">1. Download System State Snapshot</h6>
                    <span className="badge bg-primary-subtle text-primary border">Schema v2.0</span>
                  </div>
                  <p className="text-secondary small mb-2">
                    Exports an immutable JSON file containing all student records, document references, and activity logs.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm d-inline-flex align-items-center gap-2 shadow-sm"
                    onClick={handleExportJson}
                  >
                    <i className="bi bi-filetype-json"></i>
                    <span>Download JSON Backup</span>
                  </button>
                </div>

                <hr className="my-3 opacity-25" />

                {/* Block 2: Restore JSON Snapshot */}
                <div>
                  <h6 className="fw-semibold small text-body mb-1">2. Import / Restore JSON Backup</h6>
                  <p className="text-secondary small mb-2">
                    Upload a verified CaseTrack JSON backup file to restore or merge records.
                  </p>
                  <div className="mb-2">
                    <input
                      type="file"
                      className="form-control form-control-sm"
                      accept=".json"
                      onChange={(e) => setJsonFile(e.target.files[0] || null)}
                      aria-label="Select JSON Backup File"
                    />
                  </div>
                  <div className="row g-2 align-items-center">
                    <div className="col-12 col-sm-7">
                      <select
                        className="form-select form-select-sm"
                        value={restoreMode}
                        onChange={(e) => setRestoreMode(e.target.value)}
                        aria-label="Select Restore Mode"
                      >
                        <option value="replace">Replace Entire Database</option>
                        <option value="merge">Merge (Skip Existing Records)</option>
                      </select>
                    </div>
                    <div className="col-12 col-sm-5">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm w-100"
                        onClick={handleRestoreJson}
                        disabled={!jsonFile || isParsingJson}
                      >
                        {isParsingJson ? "Validating..." : "Restore JSON"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION D – DATABASE OPERATIONS & MAINTENANCE
            ========================================================================= */}
        <div className="col-12" id="section-database-management">
          <div className="dm-card mb-4">
            <div className="dm-card-header">
              <div className="d-flex align-items-center gap-3">
                <div className="dm-section-icon bg-warning-subtle text-warning">
                  <i className="bi bi-shield-lock-fill"></i>
                </div>
                <div>
                  <h5 className="dm-section-title text-body mb-0">Clean Data from Database</h5>
                  <p className="dm-section-desc">
                    Inspect storage distribution, selectively delete records, or perform administrative database resets.
                  </p>
                </div>
              </div>
            </div>

            <div className="dm-card-body card-body">
              {/* D1. Enterprise 100 GB Storage Architecture & Telemetry */}
              <div className="mb-4">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                  <div>
                    <h6 className="fw-bold text-body mb-0 d-flex align-items-center gap-2">
                      <i className="bi bi-hdd-network-fill text-primary"></i>
                      <span>100 GB Storage Architecture &amp; Telemetry</span>
                    </h6>
                    <div className="small text-muted mt-1">
                      Target Capacity: <strong>{targetCapacityFormatted}</strong> &bull; Volume: <strong>Drive {storageMetrics?.physicalDrive?.driveRoot || "C:\\"} ({storageMetrics?.physicalDrive?.freeFormatted || "--"} free)</strong>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                      <i className="bi bi-check-circle-fill me-1"></i>Physical Volume Verified
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                      onClick={refreshStorageMetrics}
                      title="Refresh live storage metrics from backend"
                    >
                      <i className="bi bi-arrow-clockwise"></i>
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {/* Primary 100 GB Storage Cards */}
                <div className="row g-2 mb-3">
                  <div className="col-12 col-sm-6 col-xl-3">
                    <div className="dm-metric-card h-100 border-start border-4 border-primary">
                      <div className="dm-metric-label text-primary">Total Storage Capacity</div>
                      <div className="dm-metric-value fs-4 fw-bold text-body">{targetCapacityFormatted}</div>
                      <div className="small text-muted mt-1">Target Storage Limit</div>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6 col-xl-3">
                    <div className="dm-metric-card h-100 border-start border-4 border-info">
                      <div className="dm-metric-label text-info">Used Storage</div>
                      <div className="dm-metric-value fs-4 fw-bold text-body">{storageFormatted}</div>
                      <div className="small text-muted mt-1">Real Disk Bytes Used</div>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6 col-xl-3">
                    <div className="dm-metric-card h-100 border-start border-4 border-success">
                      <div className="dm-metric-label text-success">Available Storage</div>
                      <div className="dm-metric-value fs-4 fw-bold text-body">{availableFormatted}</div>
                      <div className="small text-muted mt-1">Dynamic Available Space</div>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6 col-xl-3">
                    <div className="dm-metric-card h-100 border-start border-4 border-warning">
                      <div className="dm-metric-label text-warning">Storage Usage</div>
                      <div className="dm-metric-value fs-4 fw-bold text-body">{usagePercent}%</div>
                      <div className="small text-muted mt-1">Capacity Consumed</div>
                    </div>
                  </div>
                </div>

                {/* Storage Progress Bar */}
                <div className="p-3 border rounded bg-body-tertiary mb-3">
                  <div className="d-flex justify-content-between align-items-center small text-muted mb-1">
                    <span className="fw-semibold">Storage Progress: {storageFormatted} of {targetCapacityFormatted}</span>
                    <span className="fw-bold text-primary">{usagePercent}%</span>
                  </div>
                  <div className="progress" style={{ height: "10px", borderRadius: "5px" }}>
                    <div
                      className={`progress-bar ${usagePercent > 90 ? "bg-danger" : usagePercent > 75 ? "bg-warning" : "bg-primary"}`}
                      role="progressbar"
                      style={{ width: `${Math.max(0.5, usagePercent)}%`, transition: "width 0.4s ease" }}
                      aria-valuenow={usagePercent}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                </div>

                {/* Multi-Tier Storage Breakdown Sub-Cards */}
                <div className="row g-2 mb-4">
                  <div className="col-12 col-md-4">
                    <div className="p-3 border rounded h-100 bg-body">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <span className="fw-semibold small text-body d-flex align-items-center gap-2">
                          <i className="bi bi-folder2-open text-primary"></i>
                          <span>Student Documents</span>
                        </span>
                        <span className="badge bg-primary-subtle text-primary fw-bold">
                          {storageMetrics?.breakdown?.studentDocuments?.formatted || "--"}
                        </span>
                      </div>
                      <div className="small text-muted">
                        <strong>{storageMetrics?.breakdown?.studentDocuments?.folderCount || 0}</strong> student directories &bull;{" "}
                        <strong>{storageMetrics?.breakdown?.studentDocuments?.fileCount || 0}</strong> attached files
                      </div>
                      <div className="small text-secondary mt-1 text-truncate" title="documents/">
                        Directory: <code>documents/</code>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <div className="p-3 border rounded h-100 bg-body">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <span className="fw-semibold small text-body d-flex align-items-center gap-2">
                          <i className="bi bi-database-fill text-info"></i>
                          <span>Persistent Database</span>
                        </span>
                        <span className="badge bg-info-subtle text-info fw-bold">
                          {storageMetrics?.breakdown?.database?.formatted || "--"}
                        </span>
                      </div>
                      <div className="small text-muted">
                        <strong>{students.length}</strong> student records &bull;{" "}
                        <strong>{database.history?.length || 0}</strong> audit events
                      </div>
                      <div className="small text-secondary mt-1 text-truncate" title="data/casetrack_database.json">
                        File: <code>data/casetrack_database.json</code>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <div className="p-3 border rounded h-100 bg-body">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <span className="fw-semibold small text-body d-flex align-items-center gap-2">
                          <i className="bi bi-shield-check text-success"></i>
                          <span>Safety Backups</span>
                        </span>
                        <span className="badge bg-success-subtle text-success fw-bold">
                          {storageMetrics?.breakdown?.backups?.formatted || "--"}
                        </span>
                      </div>
                      <div className="small text-muted">
                        <strong>{storageMetrics?.breakdown?.backups?.fileCount || 0}</strong> rotational backups on disk
                      </div>
                      <div className="small text-secondary mt-1 text-truncate" title="backups/">
                        Directory: <code>backups/</code> (25-backup circular)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Student Lifecycle Overview */}
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-bold text-body mb-0 d-flex align-items-center gap-2 small text-uppercase letter-spacing">
                    <i className="bi bi-pie-chart-fill text-secondary"></i>
                    <span>Student Case Lifecycle Distribution</span>
                  </h6>
                  <span className="small text-muted">Active Count: {students.length} Total</span>
                </div>

                <div className="row g-2">
                  <div className="col-6 col-sm-4 col-md-3 col-xl">
                    <div className="dm-metric-card">
                      <div className="dm-metric-label">Total Students</div>
                      <div className="dm-metric-value fs-5 fw-bold text-body">{students.length}</div>
                    </div>
                  </div>
                  <div className="col-6 col-sm-4 col-md-3 col-xl">
                    <div className="dm-metric-card">
                      <div className="dm-metric-label text-secondary">Pending</div>
                      <div className="dm-metric-value fs-5 fw-bold text-secondary">{stats?.counts?.pending || 0}</div>
                    </div>
                  </div>
                  <div className="col-6 col-sm-4 col-md-3 col-xl">
                    <div className="dm-metric-card">
                      <div className="dm-metric-label text-primary">Case Ready</div>
                      <div className="dm-metric-value fs-5 fw-bold text-primary">{stats?.counts?.ready || 0}</div>
                    </div>
                  </div>
                  <div className="col-6 col-sm-4 col-md-3 col-xl">
                    <div className="dm-metric-card">
                      <div className="dm-metric-label text-warning">Sent to Campus</div>
                      <div className="dm-metric-value fs-5 fw-bold text-warning">{stats?.counts?.sent || 0}</div>
                    </div>
                  </div>
                  <div className="col-6 col-sm-4 col-md-3 col-xl">
                    <div className="dm-metric-card">
                      <div className="dm-metric-label text-danger">Returned</div>
                      <div className="dm-metric-value fs-5 fw-bold text-danger">{stats?.counts?.returned || 0}</div>
                    </div>
                  </div>
                  <div className="col-6 col-sm-4 col-md-3 col-xl">
                    <div className="dm-metric-card">
                      <div className="dm-metric-label text-success">Received</div>
                      <div className="dm-metric-value fs-5 fw-bold text-success">{stats?.counts?.received || 0}</div>
                    </div>
                  </div>
                  <div className="col-6 col-sm-4 col-md-3 col-xl">
                    <div className="dm-metric-card">
                      <div className="dm-metric-label text-info">Audit Logs</div>
                      <div className="dm-metric-value fs-5 fw-bold text-info">{database.history?.length || 0}</div>
                    </div>
                  </div>
                  <div className="col-6 col-sm-4 col-md-3 col-xl">
                    <div className="dm-metric-card">
                      <div className="dm-metric-label">Uploaded Files</div>
                      <div className="dm-metric-value fs-5 fw-bold text-body">{totalUploadedDocs}</div>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="my-4 opacity-25" />

              {/* D2. Selective Candidate Deletion */}
              <div className="mb-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                  <div>
                    <h6 className="fw-bold text-body mb-1 d-flex align-items-center gap-2">
                      <i className="bi bi-check2-square text-primary"></i>
                      <span>Selective Record Deletion &amp; Cleanup</span>
                    </h6>
                    <p className="text-secondary small mb-0">
                      Search, inspect, and choose specific student records to permanently delete along with their files.
                    </p>
                  </div>
                  {selectedStudentIds.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm d-inline-flex align-items-center gap-1 shadow-sm"
                      onClick={() => setShowDeleteSelectedModal(true)}
                    >
                      <i className="bi bi-trash3-fill"></i>
                      <span>Delete Selected ({selectedStudentIds.length})</span>
                    </button>
                  )}
                </div>

                {/* Filter and Selection Controls */}
                <div className="row g-2 mb-3">
                  <div className="col-12 col-md-5 col-lg-5">
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-body-tertiary">
                        <i className="bi bi-search"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Filter by Student ID, Name, or Program..."
                        value={cleanSearch}
                        onChange={(e) => setCleanSearch(e.target.value)}
                      />
                      {cleanSearch && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setCleanSearch("")}
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="col-6 col-md-4 col-lg-3">
                    <select
                      className="form-select form-select-sm"
                      value={cleanStageFilter}
                      onChange={(e) => setCleanStageFilter(e.target.value)}
                    >
                      <option value="all">All Stages ({students.length})</option>
                      <option value="Pending">Pending ({stats?.counts?.pending || 0})</option>
                      <option value="Case Ready">Case Ready ({stats?.counts?.ready || 0})</option>
                      <option value="Sent to Main Campus">Sent ({stats?.counts?.sent || 0})</option>
                      <option value="Returned from Main Campus">Returned ({stats?.counts?.returned || 0})</option>
                      <option value="Received from Main Campus">Received ({stats?.counts?.received || 0})</option>
                    </select>
                  </div>
                  <div className="col-6 col-md-3 col-lg-4 text-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary me-2"
                      onClick={handleToggleSelectAll}
                    >
                      {allCandidatesSelected ? "Deselect All" : "Select All Matching"}
                    </button>
                    {selectedStudentIds.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
                        onClick={() => setSelectedStudentIds([])}
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>
                </div>

                {/* Candidate Selection Table */}
                <div className="dm-table-wrapper mb-3" style={{ maxHeight: "320px", overflowY: "auto" }}>
                  <table className="dm-table table-hover">
                    <thead className="sticky-top">
                      <tr>
                        <th style={{ width: "40px" }} className="text-center">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={allCandidatesSelected && cleanupCandidates.length > 0}
                            onChange={handleToggleSelectAll}
                            aria-label="Select all students"
                          />
                        </th>
                        <th style={{ width: "125px" }}>Student ID</th>
                        <th style={{ width: "160px" }}>Name</th>
                        <th>Program</th>
                        <th style={{ width: "135px" }}>Stage</th>
                        <th style={{ width: "75px" }} className="text-center">Docs</th>
                        <th style={{ width: "75px" }} className="text-center">History</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cleanupCandidates.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center text-muted py-4">
                            No student records match the current filter.
                          </td>
                        </tr>
                      ) : (
                        cleanupCandidates.map((s) => {
                          const isSelected = selectedStudentIds.includes(s.id);
                          const docCount = s.documentsList?.length || (s.documentSubmittedAt ? 2 : 0);
                          const histCount = s.activityHistory?.length || 0;
                          return (
                            <tr
                              key={s.id}
                              className={isSelected ? "dm-row-selected" : ""}
                              style={{ cursor: "pointer" }}
                              onClick={() => handleToggleSelect(s.id)}
                            >
                              <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelect(s.id)}
                                />
                              </td>
                              <td className="fw-bold font-monospace text-primary">{s.studentId}</td>
                              <td className="fw-semibold">{s.name}</td>
                              <td><span className="badge program-badge" title={s.program}>{s.program}</span></td>
                              <td><StatusBadge status={s.status} /></td>
                              <td className="text-center">
                                {docCount > 0 ? (
                                  <span className="badge bg-primary-subtle text-primary">{docCount} files</span>
                                ) : (
                                  <span className="text-muted">0</span>
                                )}
                              </td>
                              <td className="text-center text-muted">{histCount}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Selection Summary Callout */}
                {selectedStudentIds.length > 0 && (
                  <div className="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2 mb-0 py-2 px-3 small">
                    <div>
                      <i className="bi bi-info-circle-fill me-1"></i>
                      <strong>{selectedStudentIds.length}</strong> student(s) selected &bull;{" "}
                      <strong>{selectedHistoryCount}</strong> audit records &bull;{" "}
                      <strong>{selectedDocsCount}</strong> uploaded document files &bull;{" "}
                      Estimated storage released: <strong>~{estimatedStorageReleased} KB</strong>
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => setShowDeleteSelectedModal(true)}
                    >
                      <i className="bi bi-trash3 me-1"></i>
                      Confirm Clean Selected
                    </button>
                  </div>
                )}
              </div>

              <hr className="my-4 opacity-25" />

              {/* D3. Critical Maintenance & Destructive Operations */}
              <div className="dm-destructive-zone">
                <div className="d-flex align-items-center gap-2 mb-3 text-danger">
                  <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                  <h6 className="fw-bold mb-0">Critical System Maintenance &amp; Destructive Operations</h6>
                </div>

                <div className="row g-3">
                  {/* Card 1: Clear All Student Data */}
                  <div className="col-12 col-md-6">
                    <div className="dm-destructive-card danger-card">
                      <div>
                        <h6 className="fw-bold text-danger mb-1 d-flex align-items-center gap-2">
                          <i className="bi bi-trash3-fill"></i>
                          <span>Clear All Student Data</span>
                        </h6>
                        <p className="text-muted small mb-3">
                          Purges all student applications, workflow dispatches, and uploaded files. Configuration, branding, and theme settings are strictly preserved.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm d-inline-flex align-items-center justify-content-center gap-2 shadow-sm py-2"
                        onClick={() => {
                          setClearAllConfirmText("");
                          setShowClearAllModal(true);
                        }}
                        disabled={students.length === 0}
                      >
                        <i className="bi bi-trash3"></i>
                        <span>Clear All Student Data ({students.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Factory Reset */}
                  <div className="col-12 col-md-6">
                    <div className="dm-destructive-card">
                      <div>
                        <h6 className="fw-bold text-body mb-1 d-flex align-items-center gap-2">
                          <i className="bi bi-arrow-counterclockwise text-danger"></i>
                          <span>Reset Database (Advanced)</span>
                        </h6>
                        <p className="text-muted small mb-3">
                          Performs a full factory reset. Automatically downloads an offline JSON backup before resetting database to initial blank state.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center gap-2 shadow-sm py-2"
                        onClick={() => {
                          setResetDbConfirmText("");
                          setShowResetDbModal(true);
                        }}
                      >
                        <i className="bi bi-download text-primary"></i>
                        <span>Backup &amp; Reset to Factory Defaults</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CONFIRMATION MODALS
          ========================================================================= */}

      {/* Modal 1: Confirm Delete Selected Students */}
      {showDeleteSelectedModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.65)", zIndex: 1060 }} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-danger text-white py-2 px-3">
                <h6 className="modal-title fw-bold mb-0">Confirm Clean Selected Student Records</h6>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowDeleteSelectedModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body p-3">
                <p className="mb-2">
                  You are about to permanently delete <strong>{selectedStudentIds.length}</strong> selected student record(s) from the database:
                </p>
                <div className="border rounded p-2 mb-3 bg-body-tertiary small" style={{ maxHeight: "150px", overflowY: "auto" }}>
                  <ul className="list-unstyled mb-0">
                    {selectedStudents.map((s) => (
                      <li key={s.id} className="py-1 border-bottom">
                        <strong>{s.studentId}</strong> &bull; {s.name} ({s.program}) &ndash;{" "}
                        <span className="text-muted">{s.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="alert alert-danger py-2 px-3 small mb-0">
                  <i className="bi bi-exclamation-triangle-fill me-1"></i>
                  This will also purge <strong>{selectedDocsCount}</strong> uploaded document files and <strong>{selectedHistoryCount}</strong> activity audit entries. This action cannot be undone.
                </div>
              </div>
              <div className="modal-footer py-2 px-3">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowDeleteSelectedModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={handleConfirmDeleteSelected}
                >
                  <i className="bi bi-trash-fill me-1"></i>
                  Confirm &amp; Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Confirm Clear All Student Data */}
      {showClearAllModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.75)", zIndex: 1060 }} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-danger text-white py-2 px-3">
                <h6 className="modal-title fw-bold mb-0">Clear All Student Data</h6>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowClearAllModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body p-3">
                <div className="text-center mb-3 text-danger">
                  <i className="bi bi-exclamation-octagon-fill fs-1"></i>
                </div>
                <h6 className="fw-bold text-center mb-2">Destructive Operation Warning</h6>
                <p className="small text-muted mb-3 text-center">
                  This will permanently delete all <strong>{students.length}</strong> student applications, all associated documents, and all dispatch history logs. Application branding and configuration settings will be preserved.
                </p>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-danger">
                    Type <code>DELETE ALL STUDENT DATA</code> below to confirm:
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm border-danger"
                    placeholder="DELETE ALL STUDENT DATA"
                    value={clearAllConfirmText}
                    onChange={(e) => setClearAllConfirmText(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer py-2 px-3">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowClearAllModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={clearAllConfirmText !== "DELETE ALL STUDENT DATA"}
                  onClick={handleConfirmClearAll}
                >
                  <i className="bi bi-trash-fill me-1"></i>
                  Purge All Students
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Confirm Reset Database (Advanced) */}
      {showResetDbModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.8)", zIndex: 1060 }} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-dark text-white py-2 px-3">
                <h6 className="modal-title fw-bold mb-0">Reset Database (Factory Defaults)</h6>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowResetDbModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body p-3">
                <div className="text-center mb-3 text-warning">
                  <i className="bi bi-shield-exclamation fs-1"></i>
                </div>
                <h6 className="fw-bold text-center mb-2">Complete System Reset</h6>
                <p className="small text-muted mb-3 text-center">
                  This operation resets the entire database to initial factory defaults. A complete JSON safety backup will be <strong>automatically downloaded to your computer</strong> before the reset occurs.
                </p>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">
                    Type <code>RESET DATABASE</code> below to confirm:
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="RESET DATABASE"
                    value={resetDbConfirmText}
                    onChange={(e) => setResetDbConfirmText(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer py-2 px-3">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowResetDbModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={resetDbConfirmText !== "RESET DATABASE"}
                  onClick={handleConfirmResetDb}
                >
                  <i className="bi bi-download me-1"></i>
                  Backup &amp; Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
