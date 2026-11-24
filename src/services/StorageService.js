/**
 * StorageService.js
 * Single-source-of-truth persistence service interfacing with browser LocalStorage.
 * Key: casetrack_db_v2
 */

import { nowLocalISO, todayYYYYMMDD, parseToYYYYMMDD } from "../utils/dateUtils.js";
import { generateId } from "../utils/formatters.js";
import { BrandingService, DEFAULT_BRANDING } from "./BrandingService.js";

export const STORAGE_KEY = "casetrack_db_v2";
export const RECOVERY_BACKUP_KEY = "casetrack_db_v2_last_valid_backup";

// 100 GB Enterprise Storage Target
export const TARGET_STORAGE_CAPACITY_GB = 100;
export const TARGET_STORAGE_CAPACITY_BYTES = 100 * 1024 * 1024 * 1024; // 107,374,182,400 bytes

/**
 * Format raw bytes into human-readable representation (B, KB, MB, GB, TB)
 */
export function formatBytes(bytes, decimals = 2) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return "0.00 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeIdx = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeIdx)).toFixed(dm))} ${sizes[safeIdx]}`;
}

export const VALID_STATUSES = [
  "Pending",
  "Case Ready",
  "Sent to Main Campus",
  "Returned from Main Campus",
  "Received from Main Campus"
];

export function defaultSettings() {
  return {
    campusName: "by Iqra University",
    operatorName: "Admin Officer",
    defaultPageSize: 25,
    theme: "light",
    sidebarCollapsed: false,
    branding: { ...DEFAULT_BRANDING }
  };
}

export function createEmptyDatabase() {
  return {
    version: "2.0.0",
    lastUpdated: nowLocalISO(),
    settings: defaultSettings(),
    students: [],
    history: [],
    notifications: []
  };
}

export function normalizeStudentRecord(s, idx = 0) {
  return {
    id: s.id ? String(s.id) : generateId(),
    serialNumber: Number.isInteger(s.serialNumber) && s.serialNumber > 0 ? s.serialNumber : idx + 1,
    studentId: String(s.studentId || "").trim(),
    name: String(s.name || "").trim(),
    program: String(s.program || "").trim(),
    programFull: s.programFull ? String(s.programFull).trim() : null,
    approvedDepartments: s.approvedDepartments ? String(s.approvedDepartments).trim() : null,
    applyOn: parseToYYYYMMDD(s.applyOn) || todayYYYYMMDD(),
    status: VALID_STATUSES.includes(s.status) ? s.status : deriveStatusFromFields(s),
    caseReady: s.caseReady || null,
    documentStatus: s.documentStatus || "Not Uploaded",
    documentFolder: s.documentFolder || null,
    documentSubmittedAt: s.documentSubmittedAt || null,
    finalPdfUrl: s.finalPdfUrl || null,
    documentsList: Array.isArray(s.documentsList) ? s.documentsList : [],
    sendHistory: Array.isArray(s.sendHistory)
      ? s.sendHistory.map((entry) => ({
          sentAt: entry.sentAt || null,
          operator: entry.operator || "Admin Officer",
          notes: entry.notes || null,
          returnedAt: entry.returnedAt || null,
          returnReason: entry.returnReason || null
        }))
      : [],
    received: s.received || null,
    activityHistory: Array.isArray(s.activityHistory) ? s.activityHistory.slice() : [],
    createdAt: s.createdAt || nowLocalISO(),
    updatedAt: s.updatedAt || nowLocalISO()
  };
}

export function deriveStatusFromFields(s) {
  if (s.received) return "Received from Main Campus";
  if (Array.isArray(s.sendHistory) && s.sendHistory.length > 0) {
    const last = s.sendHistory[s.sendHistory.length - 1];
    return last.returnedAt ? "Returned from Main Campus" : "Sent to Main Campus";
  }
  if (s.caseReady) return "Case Ready";
  return "Pending";
}

export function normalizeDatabase(db) {
  const base = createEmptyDatabase();
  const rawSettings = db?.settings || {};
  return {
    version: db?.version || base.version,
    lastUpdated: db?.lastUpdated || base.lastUpdated,
    settings: {
      ...base.settings,
      ...rawSettings,
      branding: BrandingService.normalizeBranding(rawSettings.branding || {
        appName: "CaseTrack",
        campusSubtitle: rawSettings.campusName || "by Iqra University"
      })
    },
    students: Array.isArray(db?.students) ? db.students.map(normalizeStudentRecord) : [],
    history: Array.isArray(db?.history) ? db.history : [],
    notifications: Array.isArray(db?.notifications) ? db.notifications : []
  };
}

export function validateDatabaseSchema(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { valid: false, error: "Root JSON must be an object." };
  }
  if (!Array.isArray(obj.students)) {
    return { valid: false, error: "JSON database must contain a 'students' array." };
  }
  const seenIds = new Set();
  for (let i = 0; i < obj.students.length; i++) {
    const s = obj.students[i];
    if (!s || typeof s !== "object") {
      return { valid: false, error: `Student entry at index ${i} is invalid.` };
    }
    const sid = String(s.studentId || "").trim().toLowerCase();
    if (!sid) {
      return { valid: false, error: `Student at index ${i} is missing studentId.` };
    }
    if (seenIds.has(sid)) {
      return { valid: false, error: `Duplicate Student ID '${s.studentId}' found in import file.` };
    }
    seenIds.add(sid);
  }
  return { valid: true };
}

export const StorageService = {
  formatBytes,
  TARGET_STORAGE_CAPACITY_GB,
  TARGET_STORAGE_CAPACITY_BYTES,

  loadDatabase() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const fresh = createEmptyDatabase();
        this.saveDatabase(fresh);
        return { database: fresh, recovered: false };
      }
      const parsed = JSON.parse(raw);
      const normalized = normalizeDatabase(parsed);
      return { database: normalized, recovered: false };
    } catch (err) {
      console.warn("Storage load error, attempting recovery backup:", err);
      const backupRaw = window.localStorage.getItem(RECOVERY_BACKUP_KEY);
      if (backupRaw) {
        try {
          const recovered = normalizeDatabase(JSON.parse(backupRaw));
          this.saveDatabase(recovered);
          return { database: recovered, recovered: true };
        } catch {
          // Fall through
        }
      }
      const emptyDb = createEmptyDatabase();
      this.saveDatabase(emptyDb);
      return { database: emptyDb, recovered: true };
    }
  },

  saveDatabase(db) {
    try {
      db.lastUpdated = nowLocalISO();
      const serialized = JSON.stringify(db);
      window.localStorage.setItem(STORAGE_KEY, serialized);
      window.localStorage.setItem(RECOVERY_BACKUP_KEY, serialized);
      return { ok: true };
    } catch (err) {
      console.error("LocalStorage save error:", err);
      const isQuota =
        err &&
        (err.name === "QuotaExceededError" ||
          err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
          err.code === 22);
      const msg = isQuota
        ? "Browser LocalStorage quota exceeded. Please export a JSON backup immediately."
        : "Failed to persist data: " + err.message;
      return { ok: false, error: msg };
    }
  },

  getStorageUsageBytes() {
    try {
      let total = 0;
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        const val = window.localStorage.getItem(key);
        if (key && val) {
          total += (key.length + val.length) * 2;
        }
      }
      return total;
    } catch {
      return 0;
    }
  },

  exportDatabaseToJson(db) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const dlAnchor = document.createElement("a");
    const dateStr = todayYYYYMMDD();
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `CaseTrack_Backup_${dateStr}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  },

  readJsonFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          resolve(parsed);
        } catch {
          reject(new Error("File content is not valid JSON."));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read JSON file."));
      reader.readAsText(file);
    });
  },

  /**
   * Fetch live 100 GB multi-tier storage metrics from the server.
   * Falls back gracefully if backend server is unreachable.
   */
  async fetchStorageMetrics() {
    try {
      const res = await fetch("/api/storage/metrics");
      if (res.ok) {
        const data = await res.json();
        if (data && data.ok) {
          return data;
        }
      }
    } catch (e) {
      console.warn("Storage telemetry API offline, calculating client fallback:", e);
    }

    // Defensive fallback if server is offline
    const localBytes = this.getStorageUsageBytes();
    const remaining = Math.max(0, TARGET_STORAGE_CAPACITY_BYTES - localBytes);
    const usagePct = (localBytes / TARGET_STORAGE_CAPACITY_BYTES) * 100;

    return {
      ok: true,
      timestamp: new Date().toISOString(),
      targetCapacityGB: TARGET_STORAGE_CAPACITY_GB,
      targetCapacityBytes: TARGET_STORAGE_CAPACITY_BYTES,
      targetCapacityFormatted: `${TARGET_STORAGE_CAPACITY_GB}.00 GB`,
      usedBytes: localBytes,
      usedFormatted: formatBytes(localBytes),
      availableBytes: remaining,
      availableFormatted: formatBytes(remaining),
      usagePercent: parseFloat(usagePct.toFixed(4)),
      isNearQuota: false,
      isQuotaExceeded: false,
      breakdown: {
        studentDocuments: {
          bytes: 0,
          formatted: "0.00 B",
          fileCount: 0,
          folderCount: 0
        },
        database: {
          bytes: localBytes,
          formatted: formatBytes(localBytes),
          exists: true,
          recordCount: 0,
          version: "2.0.0"
        },
        backups: {
          bytes: 0,
          formatted: "0.00 B",
          fileCount: 0,
          latestBackup: null
        }
      },
      physicalDrive: {
        driveRoot: "Client-Local",
        totalBytes: TARGET_STORAGE_CAPACITY_BYTES,
        freeBytes: remaining,
        usedBytes: localBytes,
        totalFormatted: `${TARGET_STORAGE_CAPACITY_GB}.00 GB`,
        freeFormatted: formatBytes(remaining),
        usedFormatted: formatBytes(localBytes),
        supportsTargetCapacity: true
      }
    };
  },

  /**
   * Synchronize active database state to server-side persistent storage
   */
  async syncDatabaseToServer(db) {
    try {
      const res = await fetch("/api/database/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ database: db, createBackup: true })
      });
      if (res.ok) {
        return await res.json();
      }
      const errData = await res.json().catch(() => ({}));
      return { ok: false, error: errData.error || `HTTP ${res.status}` };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  /**
   * Load database from server disk
   */
  async loadDatabaseFromServer() {
    try {
      const res = await fetch("/api/database");
      if (res.ok) {
        return await res.json();
      }
      return { ok: false, found: false };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  /**
   * List available server-side rotational backups
   */
  async fetchServerBackups() {
    try {
      const res = await fetch("/api/storage/backups");
      if (res.ok) {
        const data = await res.json();
        return data.backups || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Restore a specific server-side backup
   */
  async restoreServerBackup(filename) {
    try {
      const res = await fetch("/api/storage/backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename })
      });
      return await res.json();
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
};
