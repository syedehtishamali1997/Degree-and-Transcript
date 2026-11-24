import React from "react";
import { formatTimestamp } from "../../utils/dateUtils";

export function TimestampChip({ type, timestamp, attemptTag = "", returnTag = "", title = "" }) {
  if (!timestamp) return <span className="text-muted small">--</span>;

  let chipClass = "timestamp-chip";
  let icon = "bi-clock";

  if (type === "ready") {
    chipClass += " ts-ready";
    icon = "bi-lock-fill";
  } else if (type === "sent") {
    chipClass += " ts-sent";
    icon = "bi-send-check";
  } else if (type === "returned") {
    chipClass += " ts-returned";
    icon = "bi-arrow-return-left";
  } else if (type === "received") {
    chipClass += " ts-received";
    icon = "bi-patch-check-fill";
  }

  return (
    <div className={chipClass} title={title || formatTimestamp(timestamp)}>
      <i className={`bi ${icon}`}></i>
      <span>{formatTimestamp(timestamp)}</span>
      {attemptTag && <span className="badge bg-secondary ms-1">{attemptTag}</span>}
      {returnTag && <span className="badge bg-danger ms-1">{returnTag}</span>}
    </div>
  );
}
