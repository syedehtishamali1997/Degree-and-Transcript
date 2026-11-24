/**
 * dateUtils.js
 * Comprehensive date, duration, and ISO timestamp formatting utilities.
 */

export function nowLocalISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  const secs = pad(d.getSeconds());
  return `${year}-${month}-${day}T${hours}:${mins}:${secs}`;
}

export function todayYYYYMMDD() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseToYYYYMMDD(val) {
  if (val === null || val === undefined || val === "") return null;
  const pad = (n) => String(n).padStart(2, "0");

  if (val instanceof Date && !isNaN(val.getTime())) {
    return `${val.getFullYear()}-${pad(val.getMonth() + 1)}-${pad(val.getDate())}`;
  }

  // Handle Excel serial date codes (e.g., 45973 -> 2025-11-12)
  if (typeof val === "number" && isFinite(val) && val > 1000 && val < 200000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + val * 86400000);
    if (!isNaN(d.getTime())) {
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    }
  }

  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const mIso = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (mIso) return `${mIso[1]}-${pad(mIso[2])}-${pad(mIso[3])}`;

  const mDmy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (mDmy) {
    let year = mDmy[3];
    if (year.length === 2) year = "20" + year;
    return `${year}-${pad(mDmy[2])}-${pad(mDmy[1])}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
  }
  return null;
}

export function extractYYYYMMDDFromISO(isoString) {
  if (!isoString) return null;
  const m = String(isoString).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export function formatDateOnly(isoOrDateStr) {
  if (!isoOrDateStr) return "--";
  const ymd = parseToYYYYMMDD(isoOrDateStr);
  if (!ymd) return String(isoOrDateStr);

  const parts = ymd.split("-");
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parts[2];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mName = monthNames[monthIdx] || parts[1];
  return `${day}-${mName}-${year}`;
}

export function formatTimestamp(isoString) {
  if (!isoString) return "--";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return String(isoString);

  const pad = (n) => String(n).padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = pad(d.getDate());
  const mon = monthNames[d.getMonth()];
  const yr = d.getFullYear();
  let hrs = d.getHours();
  const ampm = hrs >= 12 ? "PM" : "AM";
  hrs = hrs % 12 || 12;
  const mins = pad(d.getMinutes());

  return `${day}-${mon}-${yr} ${pad(hrs)}:${mins} ${ampm}`;
}

export function formatDurationHours(durationMs) {
  if (!isFinite(durationMs) || durationMs < 0) return "--";
  const totalHours = durationMs / (1000 * 60 * 60);
  if (totalHours < 1) {
    const mins = Math.round(durationMs / (1000 * 60));
    return `${mins} min${mins === 1 ? "" : "s"}`;
  }
  if (totalHours < 48) {
    return `${totalHours.toFixed(1)} hrs`;
  }
  const days = (totalHours / 24).toFixed(1);
  return `${days} days`;
}
