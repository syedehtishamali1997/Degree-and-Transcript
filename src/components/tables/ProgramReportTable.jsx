import React from "react";
import "./GlobalTableLayout.css";

export const ProgramReportTable = React.memo(function ProgramReportTable({ programs = [] }) {
  if (programs.length === 0) {
    return (
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0 small program-report-data-table table-fixed-layout">
          <thead className="table-light">
            <tr>
              <th className="col-rep-prog">Program</th>
              <th className="text-center col-rep-num">Total</th>
              <th className="text-center col-rep-num">Pending</th>
              <th className="text-center col-rep-num">Ready</th>
              <th className="text-center col-rep-num">Sent</th>
              <th className="text-center col-rep-num">Returned</th>
              <th className="text-center col-rep-num">Received</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="7" className="text-center text-muted py-4">
                No student records yet. Import an Excel file or add students manually.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0 small program-report-data-table table-fixed-layout">
        <thead className="table-light">
          <tr>
            <th className="col-rep-prog">Program</th>
            <th className="text-center col-rep-num">Total</th>
            <th className="text-center col-rep-num">Pending</th>
            <th className="text-center col-rep-num">Ready</th>
            <th className="text-center col-rep-num">Sent</th>
            <th className="text-center col-rep-num">Returned</th>
            <th className="text-center col-rep-num">Received</th>
          </tr>
        </thead>
        <tbody>
          {programs.map((p) => (
            <tr key={p.program}>
              <td className="fw-semibold col-rep-prog">{p.program}</td>
              <td className="text-center fw-bold col-rep-num">{p.total}</td>
              <td className="text-center text-secondary col-rep-num">{p.pending}</td>
              <td className="text-center text-primary col-rep-num">{p.ready}</td>
              <td className="text-center text-warning fw-semibold col-rep-num">{p.sent}</td>
              <td className="text-center text-danger col-rep-num">{p.returned}</td>
              <td className="text-center text-success fw-semibold col-rep-num">{p.received}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
