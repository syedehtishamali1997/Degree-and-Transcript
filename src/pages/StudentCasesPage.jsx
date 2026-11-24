import React, { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useCaseTrack } from "../context/CaseTrackContext";
import { useModals } from "../context/ModalContext";
import { useToast } from "../context/ToastContext";
import { StageWorkflowNav } from "../components/layout/StageWorkflowNav";
import { StudentRecordsTable } from "../components/tables/StudentRecordsTable";
import { Pagination } from "../components/common/Pagination";
import { STATUS } from "../services/WorkflowService";

const STAGE_TITLES = {
  all: "All Student Records",
  pending: "Pending Cases",
  "case-ready": "Case Ready Queue",
  sent: "Sent to Main Campus",
  returned: "Returned Cases",
  received: "Completed / Received Cases"
};

const STAGE_DESCRIPTIONS = {
  all: "Showing all registered student degree & transcript requests across all stages.",
  pending: "Stage 0 cases awaiting verification and graduation clearance before marking ready.",
  "case-ready": "Stage 1 cases cleared and packaged, ready to be dispatched to Main Campus.",
  sent: "Stage 2 cases currently dispatched and in transit or under review at Main Campus.",
  returned: "Cases rejected by Main Campus requiring corrections before re-dispatching.",
  received: "Stage 3 permanently completed cases safely returned with issued degrees/transcripts."
};

export function StudentCasesPage() {
  const { stage = "all" } = useParams();
  const {
    students,
    settings,
    markCaseReady,
    sendToMainCampus,
    markReceived,
    deleteStudent
  } = useCaseTrack();

  const {
    openStudentForm,
    openViewStudent,
    openReturnCase,
    openHistory
  } = useModals();

  const { addToast } = useToast();

  // Filters & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("all");
  const [pageSize, setPageSize] = useState(settings?.pageSize || 25);
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting state
  const [sortField, setSortField] = useState("serialNumber");
  const [sortDir, setSortDir] = useState("asc");

  // Deletion state
  const [studentToDelete, setStudentToDelete] = useState(null);

  // Reset page when stage or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [stage, searchQuery, selectedProgram, pageSize]);

  // Extract distinct programs for filter dropdown
  const uniquePrograms = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.program && s.program.trim()) set.add(s.program.trim());
    });
    return Array.from(set).sort();
  }, [students]);

  // Step 1: Filter students by stage
  const stageFilteredStudents = useMemo(() => {
    switch (stage) {
      case "pending":
        return students.filter((s) => s.status === STATUS.PENDING);
      case "case-ready":
        return students.filter((s) => s.status === STATUS.READY);
      case "sent":
        return students.filter((s) => s.status === STATUS.SENT);
      case "returned":
        return students.filter((s) => s.status === STATUS.RETURNED);
      case "received":
        return students.filter((s) => s.status === STATUS.RECEIVED);
      case "all":
      default:
        return students;
    }
  }, [students, stage]);

  // Step 2: Apply search query and program filters
  const filteredStudents = useMemo(() => {
    let result = stageFilteredStudents;

    if (selectedProgram !== "all") {
      result = result.filter((s) => s.program === selectedProgram);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          (s.studentId && s.studentId.toLowerCase().includes(q)) ||
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.program && s.program.toLowerCase().includes(q)) ||
          (s.notes && s.notes.toLowerCase().includes(q)) ||
          (s.returnReason && s.returnReason.toLowerCase().includes(q))
      );
    }

    return result;
  }, [stageFilteredStudents, selectedProgram, searchQuery]);

  // Step 3: Sort filtered students
  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle numerical sort for serialNumber
      if (sortField === "serialNumber") {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = (valA || "").toString().toLowerCase();
        valB = (valB || "").toString().toLowerCase();
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredStudents, sortField, sortDir]);

  // Step 4: Paginate sorted students
  const totalItems = sortedStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedStudents.slice(start, start + pageSize);
  }, [sortedStudents, currentPage, pageSize]);

  // Toggle sort handler
  const handleToggleSort = (field) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Workflow Action Handlers
  const handleMarkReady = (idOrStudent) => {
    const id = typeof idOrStudent === "object" ? idOrStudent.id : idOrStudent;
    const res = markCaseReady(id);
    if (!res.ok) {
      addToast(res.error || "Failed to mark case ready.", "danger");
    } else {
      addToast("Student case marked Ready for Main Campus.", "success");
    }
  };

  const handleSendToCampus = (idOrStudent) => {
    const id = typeof idOrStudent === "object" ? idOrStudent.id : idOrStudent;
    const res = sendToMainCampus(id);
    if (!res.ok) {
      addToast(res.error || "Failed to send case.", "danger");
    } else {
      addToast("Case dispatched to Main Campus successfully.", "success");
    }
  };

  const handleReceiveCase = (idOrStudent) => {
    const id = typeof idOrStudent === "object" ? idOrStudent.id : idOrStudent;
    const res = markReceived(id);
    if (!res.ok) {
      addToast(res.error || "Failed to mark case received.", "danger");
    } else {
      addToast("Case marked Received from Main Campus. Process complete!", "success");
    }
  };

  const handleDelete = (idOrStudent) => {
    const id = typeof idOrStudent === "object" ? idOrStudent.id : idOrStudent;
    const target = students.find((s) => s.id === id || s.studentId === id);
    if (!target) return;
    setStudentToDelete(target);
  };

  const handleConfirmDeleteIndividual = () => {
    if (!studentToDelete) return;
    const res = deleteStudent(studentToDelete.id, true);
    if (!res.ok) {
      addToast(res.error || "Failed to delete student.", "danger");
    } else {
      addToast(`Student record for ${studentToDelete.name} (${studentToDelete.studentId}) deleted successfully.`, "warning");
    }
    setStudentToDelete(null);
  };

  const hasActiveFilters = searchQuery.trim() !== "" || selectedProgram !== "all";

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedProgram("all");
  };

  return (
    <div className="container-fluid px-3 px-md-4 py-3">
      {/* Stage Navigation Tabs */}
      <StageWorkflowNav currentStage={stage} />

      {/* Header Info & Actions Card */}
      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body p-3">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2">
                <h4 className="fw-bold mb-0 text-body">
                  {STAGE_TITLES[stage] || "Student Cases"}
                </h4>
                <span className="badge bg-primary rounded-pill px-3 py-1 fs-7">
                  {totalItems} {totalItems === 1 ? "record" : "records"}
                </span>
              </div>
              <p className="text-secondary small mb-0 mt-1">
                {STAGE_DESCRIPTIONS[stage] || "Manage degree and transcript requests."}
              </p>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-primary d-inline-flex align-items-center gap-2 shadow-sm"
                onClick={() => openStudentForm(null)}
              >
                <i className="bi bi-person-plus-fill"></i>
                <span>Add Student</span>
              </button>
            </div>
          </div>

          <hr className="my-3 opacity-25" />

          {/* Search & Filters Controls */}
          <div className="row g-2 align-items-center">
            {/* Search Input */}
            <div className="col-12 col-md-5 col-lg-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-body-tertiary border-end-0">
                  <i className="bi bi-search text-secondary"></i>
                </span>
                <input
                  type="text"
                  className="form-control form-control-sm border-start-0"
                  placeholder="Search ID, name, program, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="btn btn-outline-secondary border-start-0"
                    type="button"
                    onClick={() => setSearchQuery("")}
                    title="Clear search"
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Program Filter */}
            <div className="col-12 col-sm-6 col-md-4 col-lg-3">
              <select
                className="form-select form-select-sm"
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
              >
                <option value="all">All Programs ({uniquePrograms.length})</option>
                {uniquePrograms.map((prog) => (
                  <option key={prog} value={prog}>
                    {prog}
                  </option>
                ))}
              </select>
            </div>

            {/* Page Size Select */}
            <div className="col-6 col-sm-3 col-md-2 col-lg-2">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-body-tertiary">Show</span>
                <select
                  className="form-select form-select-sm"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <div className="col-6 col-sm-3 col-md-1 col-lg-2 text-md-end">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary w-100"
                  onClick={clearAllFilters}
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i>
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Student Records Table Card */}
      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body p-0">
          <StudentRecordsTable
            students={paginatedStudents}
            stageMode={stage}
            sortField={sortField}
            sortDir={sortDir}
            onToggleSort={handleToggleSort}
            onViewStudent={(s) => openViewStudent(s)}
            onEditStudent={(s) => openStudentForm(s)}
            onViewHistory={(s) => openHistory(s)}
            onDeleteStudent={handleDelete}
            onMarkReady={handleMarkReady}
            onSendToCampus={handleSendToCampus}
            onOpenReturnModal={(s) => openReturnCase(s)}
            onMarkReceived={handleReceiveCase}
          />
        </div>

        {/* Card Footer with Pagination */}
        {totalItems > 0 && (
          <div className="card-footer bg-body-tertiary p-3 border-0">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </div>

      {/* Dedicated Confirmation Modal for Individual Student Deletion */}
      {studentToDelete && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.65)", zIndex: 1060 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-danger text-white py-2 px-3">
                <h6 className="modal-title fw-bold mb-0">Confirm Delete Student Record</h6>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setStudentToDelete(null)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body p-3">
                <div className="text-center mb-3 text-danger">
                  <i className="bi bi-trash3-fill fs-1"></i>
                </div>
                <h6 className="fw-bold text-center mb-2">Delete Student Confirmation</h6>
                <p className="small text-muted mb-3 text-center">
                  Are you sure you want to permanently delete this student record? This action cannot be undone.
                </p>

                <div className="border rounded p-3 mb-3 bg-body-tertiary small">
                  <div className="row g-2">
                    <div className="col-4 text-muted fw-semibold">Student ID:</div>
                    <div className="col-8 fw-bold text-body">{studentToDelete.studentId}</div>

                    <div className="col-4 text-muted fw-semibold">Name:</div>
                    <div className="col-8 fw-bold text-body">{studentToDelete.name}</div>

                    <div className="col-4 text-muted fw-semibold">Program:</div>
                    <div className="col-8 text-body">{studentToDelete.program || "N/A"}</div>

                    <div className="col-4 text-muted fw-semibold">Current Stage:</div>
                    <div className="col-8">
                      <span className="badge bg-secondary-subtle text-secondary border">
                        {studentToDelete.status || "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="alert alert-danger py-2 px-3 small mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                  <div>All uploaded documents and activity history logs for this student will also be removed.</div>
                </div>
              </div>
              <div className="modal-footer py-2 px-3">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setStudentToDelete(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={handleConfirmDeleteIndividual}
                >
                  <i className="bi bi-trash-fill me-1"></i>
                  Confirm &amp; Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
