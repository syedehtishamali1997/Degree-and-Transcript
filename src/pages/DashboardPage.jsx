import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCaseTrack } from "../context/CaseTrackContext";
import { useModals } from "../context/ModalContext";
import { ProgramReportTable } from "../components/tables/ProgramReportTable";
import { HistoryService } from "../services/HistoryService";
import { formatTimestamp } from "../utils/dateUtils";
import { ExcelService } from "../services/ExcelService";

export function DashboardPage() {
  const navigate = useNavigate();
  const { students, stats, database } = useCaseTrack();
  const { openStudentForm } = useModals();

  const recentEvents = HistoryService.getAllGlobalEvents(students).slice(0, 10);

  const handleExportExcel = () => {
    ExcelService.exportToExcel(students, stats);
  };

  return (
    <div className="dashboard-page container-fluid px-3 px-md-4 py-3">
      {/* Overview Top Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h2 className="h5 fw-bold text-body-emphasis mb-0">Overview &amp; Workflow Metrics</h2>
          <p className="small text-muted mb-0">Real-time status of student degree &amp; transcript dispatches.</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => openStudentForm(null)}
          >
            <i className="bi bi-person-plus-fill me-1"></i>Add Student
          </button>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => navigate("/data-management")}
          >
            <i className="bi bi-file-earmark-excel me-1"></i>Import Excel
          </button>
          <button
            type="button"
            className="btn btn-outline-success btn-sm"
            onClick={handleExportExcel}
          >
            <i className="bi bi-file-earmark-arrow-down me-1"></i>Export Excel
          </button>
        </div>
      </div>

      {/* 6 CoreUI CWidgetStatsA Style KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-md-6 col-lg-4 col-xxl-2">
          <div
            className="stat-card stat-total"
            role="button"
            title="Click to view all student cases"
            onClick={() => navigate("/students/all")}
          >
            <div className="stat-header">
              <div className="stat-icon">
                <i className="bi bi-folder2-open"></i>
              </div>
              <i className="bi bi-arrow-right stat-action-btn"></i>
            </div>
            <div>
              <div className="stat-value">{stats?.counts?.total ?? 0}</div>
              <div className="stat-label">Total Cases</div>
            </div>
            <div className="stat-chart-bar">
              <div className="stat-chart-bar-fill"></div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-md-6 col-lg-4 col-xxl-2">
          <div
            className="stat-card stat-pending"
            role="button"
            title="Click to view pending cases"
            onClick={() => navigate("/students/pending")}
          >
            <div className="stat-header">
              <div className="stat-icon">
                <i className="bi bi-hourglass-split"></i>
              </div>
              <i className="bi bi-arrow-right stat-action-btn"></i>
            </div>
            <div>
              <div className="stat-value">{stats?.counts?.pending ?? 0}</div>
              <div className="stat-label">Pending Cases</div>
            </div>
            <div className="stat-chart-bar">
              <div className="stat-chart-bar-fill"></div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-md-6 col-lg-4 col-xxl-2">
          <div
            className="stat-card stat-ready"
            role="button"
            title="Click to view cases ready for dispatch"
            onClick={() => navigate("/students/case-ready")}
          >
            <div className="stat-header">
              <div className="stat-icon">
                <i className="bi bi-check2-circle"></i>
              </div>
              <i className="bi bi-arrow-right stat-action-btn"></i>
            </div>
            <div>
              <div className="stat-value">{stats?.counts?.ready ?? 0}</div>
              <div className="stat-label">Case Ready</div>
            </div>
            <div className="stat-chart-bar">
              <div className="stat-chart-bar-fill"></div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-md-6 col-lg-4 col-xxl-2">
          <div
            className="stat-card stat-sent"
            role="button"
            title="Click to view dispatched cases"
            onClick={() => navigate("/students/sent")}
          >
            <div className="stat-header">
              <div className="stat-icon">
                <i className="bi bi-send"></i>
              </div>
              <i className="bi bi-arrow-right stat-action-btn"></i>
            </div>
            <div>
              <div className="stat-value">{stats?.counts?.sent ?? 0}</div>
              <div className="stat-label">Sent to Campus</div>
            </div>
            <div className="stat-chart-bar">
              <div className="stat-chart-bar-fill"></div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-md-6 col-lg-4 col-xxl-2">
          <div
            className="stat-card stat-returned"
            role="button"
            title="Click to view returned cases"
            onClick={() => navigate("/students/returned")}
          >
            <div className="stat-header">
              <div className="stat-icon">
                <i className="bi bi-arrow-return-left"></i>
              </div>
              <i className="bi bi-arrow-right stat-action-btn"></i>
            </div>
            <div>
              <div className="stat-value">{stats?.counts?.returned ?? 0}</div>
              <div className="stat-label">Returned Cases</div>
            </div>
            <div className="stat-chart-bar">
              <div className="stat-chart-bar-fill"></div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-md-6 col-lg-4 col-xxl-2">
          <div
            className="stat-card stat-received"
            role="button"
            title="Click to view received and completed cases"
            onClick={() => navigate("/students/received")}
          >
            <div className="stat-header">
              <div className="stat-icon">
                <i className="bi bi-patch-check-fill"></i>
              </div>
              <i className="bi bi-arrow-right stat-action-btn"></i>
            </div>
            <div>
              <div className="stat-value">{stats?.counts?.received ?? 0}</div>
              <div className="stat-label">Received Cases</div>
            </div>
            <div className="stat-chart-bar">
              <div className="stat-chart-bar-fill"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Program Summary & Turnaround Efficiency Metrics */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card admin-card h-100">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
              <h3 className="card-title mb-0">
                <i className="bi bi-bar-chart-steps me-2 text-primary"></i>Degree Program Distribution
              </h3>
              <span className="badge bg-light text-muted border">
                Updated: {formatTimestamp(database.lastUpdated)}
              </span>
            </div>

            <div className="card-body">
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="metric-box">
                    <div className="metric-title">Completion Rate</div>
                    <div className="metric-number text-success">{stats?.completionRate ?? "0%"}</div>
                    <div className="metric-sub">Received / Total Dispatches</div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="metric-box">
                    <div className="metric-title">Avg Turnaround</div>
                    <div className="metric-number text-primary">{stats?.avgTurnaround ?? "--"}</div>
                    <div className="metric-sub">Case Ready to Received</div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="metric-box">
                    <div className="metric-title">Returns Logged</div>
                    <div className="metric-number text-danger">{stats?.counts?.totalReturnsLogged ?? 0}</div>
                    <div className="metric-sub">Cumulative logged returns</div>
                  </div>
                </div>
              </div>

              <ProgramReportTable programs={stats?.programs || []} />
            </div>
          </div>
        </div>

        {/* Recent Activity Panel */}
        <div className="col-lg-4">
          <div className="card admin-card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title mb-0">
                <i className="bi bi-activity me-2 text-primary"></i>Recent Activity
              </h3>
              <Link to="/history" className="small text-decoration-none fw-semibold">
                View All
              </Link>
            </div>

            <div className="card-body p-0">
              <div className="activity-feed p-3" style={{ maxHeight: "450px", overflowY: "auto" }}>
                {recentEvents.length === 0 ? (
                  <div className="empty-state py-5 text-center">
                    <i className="bi bi-inbox fs-2 text-muted"></i>
                    <p className="mb-0 mt-2 text-muted small">No recent case activity recorded yet.</p>
                  </div>
                ) : (
                  recentEvents.map((ev, idx) => {
                    const color = HistoryService.getDotColor(ev.action);
                    return (
                      <div key={idx} className="activity-feed-item d-flex gap-2 mb-3 pb-2 border-bottom">
                        <span
                          className="activity-dot rounded-circle flex-shrink-0 mt-1"
                          style={{ width: "10px", height: "10px", backgroundColor: color }}
                        ></span>
                        <div className="flex-grow-1 min-w-0">
                          <div className="d-flex justify-content-between align-items-start gap-2">
                            <div className="small fw-bold text-truncate">{ev.action}</div>
                            <span className="text-muted" style={{ fontSize: "0.71rem", whiteSpace: "nowrap" }}>
                              {formatTimestamp(ev.timestamp)}
                            </span>
                          </div>
                          <div className="small text-secondary">
                            {ev.studentName} <span className="text-muted">({ev.studentId})</span>
                          </div>
                          {ev.reason && (
                            <div className="small text-danger mt-1">
                              <strong>Reason:</strong> {ev.reason}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
