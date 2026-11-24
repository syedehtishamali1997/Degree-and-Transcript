import React from "react";
import { formatDateOnly, formatTimestamp } from "../../utils/dateUtils";
import { StatusBadge, WorkflowLocationBadge, DocumentStatusBadge } from "../common/Badge";
import { TimestampChip } from "../common/TimestampChip";
import { EmptyState } from "../common/EmptyState";
import { WorkflowService } from "../../services/WorkflowService";
import { useModals } from "../../context/ModalContext";
import "./GlobalTableLayout.css";
import "./PendingTable.css";

export const StudentRecordsTable = React.memo(function StudentRecordsTable({
  students,
  stageMode,
  sortField,
  sortDir,
  onToggleSort,
  onViewStudent,
  onEditStudent,
  onViewHistory,
  onDeleteStudent,
  onMarkReady,
  onSendToCampus,
  onOpenReturnModal,
  onMarkReceived
}) {
  const { openUploadWizard, openViewDocuments } = useModals();

  const getColCount = () => {
    switch (stageMode) {
      case "pending":
      case "case-ready":
        return 8;
      case "all":
      case "sent":
      case "returned":
        return 8;
      case "received":
        return 9;
      default:
        return 8;
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <i className="bi bi-arrow-down-up sort-icon"></i>;
    }
    return (
      <i
        className={`bi ${sortDir === "asc" ? "bi-arrow-up" : "bi-arrow-down"} sort-icon text-primary`}
      ></i>
    );
  };

  const renderTableHead = () => {
    switch (stageMode) {
      case "pending":
        return (
          <tr>
            <th className="sortable text-nowrap col-sno" onClick={() => onToggleSort("serialNumber")}>
              S.No {renderSortIcon("serialNumber")}
            </th>
            <th className="sortable text-nowrap col-student-id" onClick={() => onToggleSort("studentId")}>
              Student ID {renderSortIcon("studentId")}
            </th>
            <th className="sortable text-nowrap col-name" onClick={() => onToggleSort("name")}>
              Name {renderSortIcon("name")}
            </th>
            <th className="sortable text-nowrap col-program" onClick={() => onToggleSort("program")}>
              Program {renderSortIcon("program")}
            </th>
            <th className="sortable text-nowrap col-apply-on" onClick={() => onToggleSort("applyOn")}>
              Apply On {renderSortIcon("applyOn")}
            </th>
            <th className="text-nowrap col-doc-status">Document Status</th>
            <th className="text-end text-nowrap col-actions">Actions</th>
          </tr>
        );

      case "case-ready":
        return (
          <tr>
            <th className="sortable text-nowrap col-sno" onClick={() => onToggleSort("serialNumber")}>
              S.No {renderSortIcon("serialNumber")}
            </th>
            <th className="sortable text-nowrap col-student-id" onClick={() => onToggleSort("studentId")}>
              Student ID {renderSortIcon("studentId")}
            </th>
            <th className="sortable text-nowrap col-name" onClick={() => onToggleSort("name")}>
              Name {renderSortIcon("name")}
            </th>
            <th className="sortable text-nowrap col-program" onClick={() => onToggleSort("program")}>
              Program {renderSortIcon("program")}
            </th>
            <th className="sortable text-nowrap col-apply-on" onClick={() => onToggleSort("applyOn")}>
              Apply On {renderSortIcon("applyOn")}
            </th>
            <th className="sortable text-nowrap col-ready-date" onClick={() => onToggleSort("caseReady")}>
              Case Ready Date {renderSortIcon("caseReady")}
            </th>
            <th className="text-nowrap col-doc-status">Document Status</th>
            <th className="text-end text-nowrap col-actions">Actions</th>
          </tr>
        );

      case "sent":
        return (
          <tr>
            <th className="sortable text-nowrap col-sno" onClick={() => onToggleSort("serialNumber")}>
              S.No {renderSortIcon("serialNumber")}
            </th>
            <th className="sortable text-nowrap col-student-id" onClick={() => onToggleSort("studentId")}>
              Student ID {renderSortIcon("studentId")}
            </th>
            <th className="sortable text-nowrap col-name" onClick={() => onToggleSort("name")}>
              Name {renderSortIcon("name")}
            </th>
            <th className="sortable text-nowrap col-program" onClick={() => onToggleSort("program")}>
              Program {renderSortIcon("program")}
            </th>
            <th className="sortable text-nowrap col-apply-on" onClick={() => onToggleSort("applyOn")}>
              Apply On {renderSortIcon("applyOn")}
            </th>
            <th className="sortable text-nowrap col-sent-date" onClick={() => onToggleSort("latestSentAt")}>
              Sent to Main Campus {renderSortIcon("latestSentAt")}
            </th>
            <th className="text-nowrap col-status">Current Status</th>
            <th className="text-end text-nowrap col-actions">Actions</th>
          </tr>
        );

      case "returned":
        return (
          <tr>
            <th className="sortable text-nowrap col-sno" onClick={() => onToggleSort("serialNumber")}>
              S.No {renderSortIcon("serialNumber")}
            </th>
            <th className="sortable text-nowrap col-student-id" onClick={() => onToggleSort("studentId")}>
              Student ID {renderSortIcon("studentId")}
            </th>
            <th className="sortable text-nowrap col-name" onClick={() => onToggleSort("name")}>
              Name {renderSortIcon("name")}
            </th>
            <th className="sortable text-nowrap col-program" onClick={() => onToggleSort("program")}>
              Program {renderSortIcon("program")}
            </th>
            <th className="sortable text-nowrap col-apply-on" onClick={() => onToggleSort("applyOn")}>
              Apply On {renderSortIcon("applyOn")}
            </th>
            <th className="sortable text-nowrap col-returned-date" onClick={() => onToggleSort("latestReturnedAt")}>
              Returned Date {renderSortIcon("latestReturnedAt")}
            </th>
            <th className="text-nowrap col-return-reason">
              Return Reason
            </th>
            <th className="text-end text-nowrap col-actions">Actions</th>
          </tr>
        );

      case "received":
        return (
          <tr>
            <th className="sortable text-nowrap col-sno" onClick={() => onToggleSort("serialNumber")}>
              S.No {renderSortIcon("serialNumber")}
            </th>
            <th className="sortable text-nowrap col-student-id" onClick={() => onToggleSort("studentId")}>
              Student ID {renderSortIcon("studentId")}
            </th>
            <th className="sortable text-nowrap col-name" onClick={() => onToggleSort("name")}>
              Name {renderSortIcon("name")}
            </th>
            <th className="sortable text-nowrap col-program" onClick={() => onToggleSort("program")}>
              Program {renderSortIcon("program")}
            </th>
            <th className="sortable text-nowrap col-apply-on" onClick={() => onToggleSort("applyOn")}>
              Apply On {renderSortIcon("applyOn")}
            </th>
            <th className="sortable text-nowrap col-sent-date" onClick={() => onToggleSort("latestSentAt")}>
              Sent Date {renderSortIcon("latestSentAt")}
            </th>
            <th className="sortable text-nowrap col-received-date" onClick={() => onToggleSort("received")}>
              Received from Main Campus Date {renderSortIcon("received")}
            </th>
            <th className="text-nowrap col-status">Current Status</th>
            <th className="text-end text-nowrap col-actions">Actions</th>
          </tr>
        );

      case "all":
      default:
        return (
          <tr>
            <th className="sortable text-nowrap col-sno" onClick={() => onToggleSort("serialNumber")}>
              S.No {renderSortIcon("serialNumber")}
            </th>
            <th className="sortable text-nowrap col-student-id" onClick={() => onToggleSort("studentId")}>
              Student ID {renderSortIcon("studentId")}
            </th>
            <th className="sortable text-nowrap col-name" onClick={() => onToggleSort("name")}>
              Name {renderSortIcon("name")}
            </th>
            <th className="sortable text-nowrap col-program" onClick={() => onToggleSort("program")}>
              Program {renderSortIcon("program")}
            </th>
            <th className="sortable text-nowrap col-apply-on" onClick={() => onToggleSort("applyOn")}>
              Apply On {renderSortIcon("applyOn")}
            </th>
            <th className="sortable text-nowrap col-status" onClick={() => onToggleSort("status")}>
              Current Status {renderSortIcon("status")}
            </th>
            <th className="text-nowrap col-location">Current Location / Workflow Stage</th>
            <th className="text-end text-nowrap col-actions">Actions</th>
          </tr>
        );
    }
  };

  const renderRow = (s) => {
    const isStageAll = stageMode === "all";
    const deletable = isStageAll || WorkflowService.canDeleteStudent(s);
    const progTitle = s.programFull ? s.programFull : "";
    const sNoCol = <td className="fw-semibold text-muted col-sno">{s.serialNumber}</td>;
    const idCol = (
      <td className="col-student-id">
        <div className="student-id-text font-monospace text-nowrap">{s.studentId}</div>
      </td>
    );
    const nameCol = (
      <td className="fw-semibold col-name">
        <div className="student-name-text" title={s.name}>{s.name}</div>
      </td>
    );
    const progCol = (
      <td className="col-program">
        <span className="badge program-badge" title={progTitle || s.program}>
          {s.program}
        </span>
      </td>
    );
    const applyOnCol = <td className="text-nowrap col-apply-on">{formatDateOnly(s.applyOn)}</td>;

    const viewBtn = (
      <button
        type="button"
        className="btn btn-outline-secondary btn-view-student"
        title="View Details"
        onClick={() => onViewStudent(s)}
      >
        <i className="bi bi-eye"></i>
      </button>
    );

    const editBtn = (
      <button
        type="button"
        className="btn btn-outline-primary btn-edit-student"
        title="Edit Student Info"
        onClick={() => onEditStudent(s)}
      >
        <i className="bi bi-pencil"></i>
      </button>
    );

    const histBtn = (
      <button
        type="button"
        className="btn btn-outline-info btn-view-history"
        title="View Case History"
        onClick={() => onViewHistory(s)}
      >
        <i className="bi bi-clock-history"></i>
      </button>
    );

    const delBtn = (
      <button
        type="button"
        className={`btn ${deletable ? "btn-outline-danger btn-delete-student" : "btn-outline-secondary"}`}
        disabled={!deletable}
        title={deletable ? "Delete Student Record" : "Processed cases cannot be deleted"}
        onClick={() => deletable && onDeleteStudent(s)}
      >
        <i className="bi bi-trash3"></i>
      </button>
    );

    switch (stageMode) {
      case "pending": {
        const canReady = WorkflowService.canMarkReady(s);

        return (
          <tr key={s.id}>
            <td className="fw-semibold text-muted col-sno">{s.serialNumber}</td>
            <td className="col-student-id">
              <div className="student-id-text font-monospace text-nowrap">{s.studentId}</div>
            </td>
            <td className="fw-semibold col-name">
              <div className="student-name-text" title={s.name}>{s.name}</div>
            </td>
            <td className="col-program">
              <span className="badge program-badge" title={progTitle || s.program}>
                {s.program}
              </span>
            </td>
            <td className="text-nowrap col-apply-on">{formatDateOnly(s.applyOn)}</td>
            <td className="col-doc-status">
              <DocumentStatusBadge status={s.documentStatus} />
            </td>
            <td className="text-end text-nowrap col-actions">
              <div className="table-actions-wrap pending-actions-wrap">
                {/* 1. Edit & Upload Documents */}
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm btn-action-main btn-edit-upload"
                  title="Edit Student Info & Upload Transcripts / Documents"
                  onClick={() => openUploadWizard(s)}
                >
                  <i className="bi bi-file-earmark-arrow-up-fill me-1"></i>
                  <span>Edit &amp; Upload Docs</span>
                </button>

                {/* 2. Mark Ready (Enabled whether documents are uploaded or not) */}
                <button
                  type="button"
                  className="btn btn-primary btn-sm btn-action-main btn-mark-ready"
                  title="Mark case as ready for dispatch"
                  onClick={() => onMarkReady(s.id)}
                  disabled={!canReady}
                >
                  <i className="bi bi-check2-circle me-1"></i>
                  <span>Mark Ready</span>
                </button>

                {/* 3. Secondary Actions Group (View, History, Delete) */}
                <div className="btn-group btn-group-sm table-icon-group pending-icon-group" role="group">
                  {viewBtn}
                  {histBtn}
                  {delBtn}
                </div>
              </div>
            </td>
          </tr>
        );
      }

      case "case-ready": {
        const hasDocs = Boolean(s.documentSubmittedAt || (Array.isArray(s.documentsList) && s.documentsList.length > 0));
        const folderName = s.documentFolder || `${s.studentId}_${(s.name || "").replace(/\s+/g, "_")}`;
        const finalPdfUrl = `/api/documents/${encodeURIComponent(folderName)}/final-pdf`;
        const printUrl = `/api/documents/${encodeURIComponent(folderName)}/print`;

        return (
          <tr key={s.id}>
            {sNoCol}
            {idCol}
            {nameCol}
            {progCol}
            {applyOnCol}
            <td className="col-ready-date">
              <TimestampChip type="ready" timestamp={s.caseReady} title="Case Ready Date" />
            </td>
            <td className="col-doc-status">
              <DocumentStatusBadge status={s.documentStatus} />
            </td>
            <td className="text-end text-nowrap col-actions">
              <div className="table-actions-wrap">
                {/* 1. Upload Docs / View Docs */}
                {hasDocs ? (
                  <button
                    type="button"
                    className="btn btn-outline-info btn-sm btn-action-main"
                    title="View Submitted Documents & Preview"
                    onClick={() => openViewDocuments(s)}
                  >
                    <i className="bi bi-folder2-open me-1"></i>
                    <span>View Docs</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm btn-action-main"
                    title="Upload Transcripts / Documents"
                    onClick={() => openUploadWizard(s)}
                  >
                    <i className="bi bi-file-earmark-arrow-up-fill me-1"></i>
                    <span>Upload Docs</span>
                  </button>
                )}

                {/* 2. Dispatch to Main Campus */}
                <button
                  type="button"
                  className="btn btn-warning text-dark btn-sm btn-action-main btn-send-campus fw-semibold"
                  title="Dispatch case to Main Campus"
                  onClick={() => onSendToCampus(s.id)}
                >
                  <i className="bi bi-send me-1"></i>
                  <span>Send to Campus</span>
                </button>

                {/* 3. Secondary Tools Icon Group */}
                <div className="btn-group btn-group-sm table-icon-group" role="group">
                  {viewBtn}
                  {hasDocs && (
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      title="Upload or Update More Transcripts / Documents"
                      onClick={() => openUploadWizard(s)}
                    >
                      <i className="bi bi-file-earmark-arrow-up"></i>
                    </button>
                  )}
                  {hasDocs ? (
                    <a
                      href={finalPdfUrl}
                      download={`${folderName}_Complete_Documents.pdf`}
                      className="btn btn-outline-success"
                      title="Download Consolidated Document as one PDF"
                    >
                      <i className="bi bi-file-earmark-arrow-down"></i>
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline-secondary disabled"
                      title="No documents uploaded to download"
                      disabled
                    >
                      <i className="bi bi-file-earmark-arrow-down"></i>
                    </button>
                  )}
                  {hasDocs ? (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      title="Print Consolidated Documents"
                      onClick={() => window.open(printUrl, "_blank", "width=900,height=800")}
                    >
                      <i className="bi bi-printer"></i>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline-secondary disabled"
                      title="No documents uploaded to print"
                      disabled
                    >
                      <i className="bi bi-printer"></i>
                    </button>
                  )}
                </div>
              </div>
            </td>
          </tr>
        );
      }

      case "sent": {
        const latestSend = WorkflowService.getLatestSendEntry(s);
        const attemptCount = s.sendHistory?.length || 1;
        const attemptTag = attemptCount > 1 ? `#${attemptCount}` : "";

        return (
          <tr key={s.id}>
            {sNoCol}
            {idCol}
            {nameCol}
            {progCol}
            {applyOnCol}
            <td className="col-sent-date">
              <TimestampChip
                type="sent"
                timestamp={latestSend?.sentAt}
                attemptTag={attemptTag}
                title="Dispatched to Main Campus"
              />
            </td>
            <td className="col-status">
              <StatusBadge status={s.status} />
            </td>
            <td className="text-end text-nowrap col-actions">
              <div className="table-actions-wrap">
                <button
                  type="button"
                  className="btn btn-success btn-sm btn-action-main btn-mark-received"
                  title="Confirm receipt from Main Campus"
                  onClick={() => onMarkReceived(s)}
                >
                  <i className="bi bi-patch-check me-1"></i>
                  <span>Mark Received</span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm btn-action-main btn-return-case"
                  title="Record case returned by Main Campus"
                  onClick={() => onOpenReturnModal(s)}
                >
                  <i className="bi bi-arrow-return-left me-1"></i>
                  <span>Return Case</span>
                </button>
                <div className="btn-group btn-group-sm table-icon-group" role="group">
                  {viewBtn}
                  {histBtn}
                </div>
              </div>
            </td>
          </tr>
        );
      }

      case "returned": {
        const latestRet = WorkflowService.getLatestReturnEntry(s);
        const retCount = WorkflowService.getReturnCount(s);

        return (
          <tr key={s.id}>
            {sNoCol}
            {idCol}
            {nameCol}
            {progCol}
            {applyOnCol}
            <td className="col-returned-date">
              <TimestampChip
                type="returned"
                timestamp={latestRet?.returnedAt}
                returnTag={`#${retCount}`}
                title="Returned by Main Campus"
              />
            </td>
            <td className="col-return-reason">
              <div className="return-reason-box" title={latestRet?.returnReason || "No reason provided"}>
                <div className="fw-bold d-flex align-items-center gap-1 mb-1">
                  <i className="bi bi-exclamation-circle-fill text-danger"></i>
                  <span>Return Reason</span>
                </div>
                <div className="text-break">
                  {latestRet?.returnReason || "No reason provided"}
                </div>
              </div>
            </td>
            <td className="text-end text-nowrap col-actions">
              <div className="table-actions-wrap">
                <button
                  type="button"
                  className="btn btn-warning text-dark btn-sm btn-action-main btn-send-campus"
                  title="Re-dispatch case to Main Campus"
                  onClick={() => onSendToCampus(s)}
                >
                  <i className="bi bi-send-plus me-1"></i>
                  <span>Send to Campus Again</span>
                </button>
                <div className="btn-group btn-group-sm table-icon-group" role="group">
                  {viewBtn}
                  {histBtn}
                </div>
              </div>
            </td>
          </tr>
        );
      }

      case "received": {
        const latestSend = WorkflowService.getLatestSendEntry(s);

        return (
          <tr key={s.id}>
            {sNoCol}
            {idCol}
            {nameCol}
            {progCol}
            {applyOnCol}
            <td className="col-sent-date">
              <TimestampChip type="sent" timestamp={latestSend?.sentAt} title="Dispatched to Main Campus" />
            </td>
            <td className="col-received-date">
              <TimestampChip type="received" timestamp={s.received} title="Received & Completed" />
            </td>
            <td className="col-status">
              <StatusBadge status={s.status} />
            </td>
            <td className="text-end text-nowrap col-actions">
              <div className="btn-group btn-group-sm table-icon-group" role="group">
                {viewBtn}
                {histBtn}
              </div>
            </td>
          </tr>
        );
      }

      case "all":
      default: {
        return (
          <tr key={s.id}>
            {sNoCol}
            {idCol}
            {nameCol}
            {progCol}
            {applyOnCol}
            <td className="col-status">
              <StatusBadge status={s.status} />
            </td>
            <td className="col-location">
              <WorkflowLocationBadge status={s.status} sendHistory={s.sendHistory} />
            </td>
            <td className="text-end text-nowrap col-actions">
              <div className="btn-group btn-group-sm table-icon-group" role="group">
                {viewBtn}
                {editBtn}
                {histBtn}
                {delBtn}
              </div>
            </td>
          </tr>
        );
      }
    }
  };

  return (
    <div className="table-responsive sticky-table-wrapper">
      <table className={`table table-hover align-middle mb-0 student-records-table stage-table-${stageMode}`}>
        <thead>{renderTableHead()}</thead>
        <tbody>
          {students.length === 0 ? (
            <tr>
              <td colSpan={getColCount()}>
                <EmptyState
                  icon="bi-folder-x"
                  message="No student records match the current criteria in this stage."
                />
              </td>
            </tr>
          ) : (
            students.map((s) => renderRow(s))
          )}
        </tbody>
      </table>
    </div>
  );
});
