import React, { useState, useMemo } from "react";
import { useCaseTrack } from "../context/CaseTrackContext";
import { HistoryService } from "../services/HistoryService";
import { ExcelService } from "../services/ExcelService";
import { HistoryTable } from "../components/tables/HistoryTable";
import { Pagination } from "../components/common/Pagination";
import { useToast } from "../context/ToastContext";

export function HistoryPage() {
  const { database } = useCaseTrack();
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState("all");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Retrieve all events
  const allEvents = useMemo(() => {
    return HistoryService.getAll(database);
  }, [database]);

  // Extract unique actions for filter dropdown
  const uniqueActions = useMemo(() => {
    const set = new Set();
    allEvents.forEach((ev) => {
      if (ev.action) set.add(ev.action);
    });
    return Array.from(set).sort();
  }, [allEvents]);

  // Filter events
  const filteredEvents = useMemo(() => {
    let list = allEvents;

    if (selectedAction !== "all") {
      list = list.filter((ev) => ev.action === selectedAction);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (ev) =>
          (ev.studentId && ev.studentId.toLowerCase().includes(q)) ||
          (ev.studentName && ev.studentName.toLowerCase().includes(q)) ||
          (ev.program && ev.program.toLowerCase().includes(q)) ||
          (ev.operator && ev.operator.toLowerCase().includes(q)) ||
          (ev.details && ev.details.toLowerCase().includes(q)) ||
          (ev.reason && ev.reason.toLowerCase().includes(q)) ||
          (ev.action && ev.action.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allEvents, selectedAction, searchQuery]);

  // Paginate events
  const totalItems = filteredEvents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, currentPage, pageSize]);

  // Export audit log
  const handleExport = () => {
    try {
      ExcelService.exportHistoryToExcel(filteredEvents);
      addToast(`Exported ${filteredEvents.length} audit history events to Excel.`, "success");
    } catch (err) {
      addToast("Failed to export audit log: " + err.message, "danger");
    }
  };

  const hasActiveFilters = searchQuery.trim() !== "" || selectedAction !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedAction("all");
    setCurrentPage(1);
  };

  return (
    <div className="container-fluid px-3 px-md-4 py-3">
      {/* Header Card */}
      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body p-3">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2">
                <h4 className="fw-bold mb-0 text-body">System Activity History</h4>
                <span className="badge bg-secondary rounded-pill px-3 py-1 fs-7">
                  {totalItems} {totalItems === 1 ? "event" : "events"}
                </span>
              </div>
              <p className="text-secondary small mb-0 mt-1">
                Permanent chronological audit trail of all student lifecycle actions, dispatches, returns, and database updates.
              </p>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-outline-success d-inline-flex align-items-center gap-2 shadow-sm"
                onClick={handleExport}
                disabled={totalItems === 0}
              >
                <i className="bi bi-file-earmark-spreadsheet-fill"></i>
                <span>Export Audit Log</span>
              </button>
            </div>
          </div>

          <hr className="my-3 opacity-25" />

          {/* Search & Filters */}
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
                  placeholder="Search ID, name, operator, reason..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                {searchQuery && (
                  <button
                    className="btn btn-outline-secondary border-start-0"
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Action Filter */}
            <div className="col-12 col-sm-6 col-md-4 col-lg-3">
              <select
                className="form-select form-select-sm"
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Action Types ({uniqueActions.length})</option>
                {uniqueActions.map((act) => (
                  <option key={act} value={act}>
                    {act}
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
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <div className="col-6 col-sm-3 col-md-1 col-lg-2 text-md-end">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary w-100"
                  onClick={clearFilters}
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i>
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card shadow-sm border-0 mb-3 overflow-hidden">
        <div className="card-body p-0">
          <HistoryTable events={paginatedEvents} />
        </div>

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
    </div>
  );
}
