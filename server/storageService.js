/**
 * server/storageService.js
 * CaseTrack Enterprise 100 GB Data Storage Architecture Service.
 * Manages physical server-side disk storage for:
 *   1. Student Documents & Consolidated PDFs (documents/)
 *   2. Server-side Persistent Database (data/casetrack_database.json)
 *   3. Automated & Administrative Backups (backups/)
 * 
 * Inspects physical disk volume capacity and enforces 100 GB target quota.
 */

import fs from "node:fs";
import path from "node:path";

// 100 GiB (100 * 1024^3 = 107,374,182,400 bytes)
export const TARGET_STORAGE_CAPACITY_BYTES = 100 * 1024 * 1024 * 1024;
export const TARGET_STORAGE_CAPACITY_GB = 100;

export const DOCUMENTS_DIR = path.resolve(process.cwd(), "documents");
export const DATA_DIR = path.resolve(process.cwd(), "data");
export const BACKUPS_DIR = path.resolve(process.cwd(), "backups");
export const DATABASE_FILE = path.join(DATA_DIR, "casetrack_database.json");

// Ensure required directories exist
export function ensureStorageDirectories() {
  if (!fs.existsSync(DOCUMENTS_DIR)) {
    fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

/**
 * Format bytes into human-readable string (B, KB, MB, GB, TB)
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

/**
 * Recursively inspect directory to calculate total bytes, file count, and folder count
 */
export function calculateDirectorySize(dirPath) {
  let bytes = 0;
  let fileCount = 0;
  let folderCount = 0;

  if (!fs.existsSync(dirPath)) {
    return { bytes: 0, fileCount: 0, folderCount: 0 };
  }

  function traverse(currentDir) {
    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      try {
        if (entry.isDirectory()) {
          folderCount++;
          traverse(fullPath);
        } else if (entry.isFile()) {
          fileCount++;
          const st = fs.statSync(fullPath);
          bytes += st.size;
        }
      } catch {
        // Skip inaccessible entries
      }
    }
  }

  traverse(dirPath);
  return { bytes, fileCount, folderCount };
}

/**
 * Inspect physical disk drive volume for total and available free space
 */
export function getPhysicalDriveStats() {
  try {
    const cwd = process.cwd();
    const driveRoot = path.parse(cwd).root || "/";
    const stat = fs.statfsSync(cwd);

    const bsize = stat.bsize || 4096;
    const totalBytes = Number(stat.blocks) * bsize;
    const freeBytes = Number(stat.bavail) * bsize;
    const usedBytes = Math.max(0, totalBytes - (Number(stat.bfree) * bsize));

    return {
      ok: true,
      driveRoot,
      totalBytes,
      freeBytes,
      usedBytes,
      totalFormatted: formatBytes(totalBytes),
      freeFormatted: formatBytes(freeBytes),
      usedFormatted: formatBytes(usedBytes),
      supportsTargetCapacity: totalBytes >= TARGET_STORAGE_CAPACITY_BYTES
    };
  } catch (err) {
    console.warn("Could not inspect physical drive volume:", err.message);
    return {
      ok: false,
      driveRoot: "Unknown",
      totalBytes: TARGET_STORAGE_CAPACITY_BYTES,
      freeBytes: TARGET_STORAGE_CAPACITY_BYTES,
      usedBytes: 0,
      totalFormatted: formatBytes(TARGET_STORAGE_CAPACITY_BYTES),
      freeFormatted: formatBytes(TARGET_STORAGE_CAPACITY_BYTES),
      usedFormatted: "0.00 B",
      supportsTargetCapacity: true
    };
  }
}

/**
 * Get comprehensive real-time storage metrics across all tiers
 */
export function getStorageMetrics() {
  ensureStorageDirectories();

  // 1. Student documents directory
  const docsStats = calculateDirectorySize(DOCUMENTS_DIR);

  // 2. Database file
  let dbBytes = 0;
  let dbRecordCount = 0;
  let dbLastUpdated = null;
  let dbVersion = "2.0.0";
  if (fs.existsSync(DATABASE_FILE)) {
    try {
      const st = fs.statSync(DATABASE_FILE);
      dbBytes = st.size;
      const raw = fs.readFileSync(DATABASE_FILE, "utf8");
      const parsed = JSON.parse(raw);
      dbRecordCount = Array.isArray(parsed.students) ? parsed.students.length : 0;
      dbLastUpdated = parsed.lastUpdated || st.mtime.toISOString();
      dbVersion = parsed.version || "2.0.0";
    } catch (e) {
      console.warn("Could not read database file stats:", e.message);
    }
  }

  // 3. Backups directory
  const backupStats = calculateDirectorySize(BACKUPS_DIR);
  let latestBackup = null;
  if (fs.existsSync(BACKUPS_DIR)) {
    try {
      const backupFiles = fs.readdirSync(BACKUPS_DIR)
        .filter((f) => f.endsWith(".json"))
        .map((f) => {
          const fp = path.join(BACKUPS_DIR, f);
          const st = fs.statSync(fp);
          return { name: f, time: st.mtimeMs, size: st.size };
        })
        .sort((a, b) => b.time - a.time);
      if (backupFiles.length > 0) {
        latestBackup = backupFiles[0].name;
      }
    } catch {}
  }

  // 4. Physical drive inspection
  const drive = getPhysicalDriveStats();

  // Total used by CaseTrack on disk
  const usedBytes = docsStats.bytes + dbBytes + backupStats.bytes;

  // Available storage: bounded by 100 GB quota AND actual physical free disk space
  const remainingQuota = Math.max(0, TARGET_STORAGE_CAPACITY_BYTES - usedBytes);
  const availableBytes = Math.min(remainingQuota, drive.freeBytes);

  // Storage usage percentage
  const usagePercent = Math.min(100, (usedBytes / TARGET_STORAGE_CAPACITY_BYTES) * 100);

  return {
    ok: true,
    timestamp: new Date().toISOString(),
    targetCapacityGB: TARGET_STORAGE_CAPACITY_GB,
    targetCapacityBytes: TARGET_STORAGE_CAPACITY_BYTES,
    targetCapacityFormatted: `${TARGET_STORAGE_CAPACITY_GB}.00 GB`,
    usedBytes,
    usedFormatted: formatBytes(usedBytes),
    availableBytes,
    availableFormatted: formatBytes(availableBytes),
    usagePercent: parseFloat(usagePercent.toFixed(3)),
    isNearQuota: usagePercent >= 90,
    isQuotaExceeded: usedBytes >= TARGET_STORAGE_CAPACITY_BYTES,
    breakdown: {
      studentDocuments: {
        bytes: docsStats.bytes,
        formatted: formatBytes(docsStats.bytes),
        fileCount: docsStats.fileCount,
        folderCount: docsStats.folderCount,
        path: DOCUMENTS_DIR
      },
      database: {
        bytes: dbBytes,
        formatted: formatBytes(dbBytes),
        exists: fs.existsSync(DATABASE_FILE),
        recordCount: dbRecordCount,
        lastUpdated: dbLastUpdated,
        version: dbVersion,
        path: DATABASE_FILE
      },
      backups: {
        bytes: backupStats.bytes,
        formatted: formatBytes(backupStats.bytes),
        fileCount: backupStats.fileCount,
        latestBackup,
        path: BACKUPS_DIR
      }
    },
    physicalDrive: {
      driveRoot: drive.driveRoot,
      totalBytes: drive.totalBytes,
      freeBytes: drive.freeBytes,
      usedBytes: drive.usedBytes,
      totalFormatted: drive.totalFormatted,
      freeFormatted: drive.freeFormatted,
      usedFormatted: drive.usedFormatted,
      supportsTargetCapacity: drive.supportsTargetCapacity
    }
  };
}

/**
 * Check if storage space is available for an incoming write/upload
 */
export function checkStorageAvailable(incomingSizeBytes = 0) {
  const metrics = getStorageMetrics();
  const projectedUsed = metrics.usedBytes + incomingSizeBytes;

  if (projectedUsed > TARGET_STORAGE_CAPACITY_BYTES) {
    return {
      ok: false,
      error: `Storage capacity limit of ${TARGET_STORAGE_CAPACITY_GB} GB exceeded. Free up storage to proceed.`
    };
  }

  // Safety buffer: at least 50 MB physical free space must remain on disk
  const MIN_FREE_DISK_BUFFER = 50 * 1024 * 1024;
  if (metrics.physicalDrive.freeBytes - incomingSizeBytes < MIN_FREE_DISK_BUFFER) {
    return {
      ok: false,
      error: `Physical disk free space is low (${metrics.physicalDrive.freeFormatted} available). Cannot complete upload.`
    };
  }

  return { ok: true, availableBytes: metrics.availableBytes };
}

/**
 * Save database to server disk with automatic rotational backup
 */
export function saveDatabaseToServer(dbData, options = { createBackup: true }) {
  ensureStorageDirectories();

  if (!dbData || typeof dbData !== "object") {
    throw new Error("Invalid database payload. Expected an object.");
  }

  // Check if writing this database exceeds available storage
  const serialized = JSON.stringify(dbData, null, 2);
  const dataSize = Buffer.byteLength(serialized, "utf8");
  const check = checkStorageAvailable(dataSize);
  if (!check.ok) {
    throw new Error(check.error);
  }

  let backupCreated = null;

  // Create rotational backup if existing database is present
  if (options.createBackup && fs.existsSync(DATABASE_FILE)) {
    try {
      const nowStr = new Date().toISOString().replace(/[:.]/g, "-");
      const backupName = `casetrack_backup_${nowStr}.json`;
      const backupPath = path.join(BACKUPS_DIR, backupName);
      fs.copyFileSync(DATABASE_FILE, backupPath);
      backupCreated = backupName;

      // Keep up to 25 latest backups, prune older
      pruneOldBackups(25);
    } catch (bErr) {
      console.warn("Could not create automatic backup before saving:", bErr.message);
    }
  }

  // Atomic write via temporary file
  const tempPath = path.join(DATA_DIR, `casetrack_db_${Date.now()}.tmp`);
  fs.writeFileSync(tempPath, serialized, "utf8");
  fs.renameSync(tempPath, DATABASE_FILE);

  return {
    ok: true,
    bytes: dataSize,
    formatted: formatBytes(dataSize),
    backupCreated,
    studentCount: Array.isArray(dbData.students) ? dbData.students.length : 0,
    timestamp: new Date().toISOString()
  };
}

/**
 * Load database from server disk
 */
export function loadDatabaseFromServer() {
  ensureStorageDirectories();

  if (!fs.existsSync(DATABASE_FILE)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(DATABASE_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error loading server database:", err);
    throw new Error(`Corrupted database file on server: ${err.message}`);
  }
}

/**
 * Prune older backups keeping only the most recent N files
 */
export function pruneOldBackups(maxKeep = 25) {
  if (!fs.existsSync(BACKUPS_DIR)) return;

  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const fp = path.join(BACKUPS_DIR, f);
        return { name: f, path: fp, time: fs.statSync(fp).mtimeMs };
      })
      .sort((a, b) => b.time - a.time);

    if (files.length > maxKeep) {
      const toDelete = files.slice(maxKeep);
      for (const item of toDelete) {
        try {
          fs.unlinkSync(item.path);
        } catch {}
      }
    }
  } catch (err) {
    console.warn("Error pruning old backups:", err.message);
  }
}

/**
 * List all available backups on server
 */
export function listServerBackups() {
  ensureStorageDirectories();

  if (!fs.existsSync(BACKUPS_DIR)) {
    return [];
  }

  try {
    return fs.readdirSync(BACKUPS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const fp = path.join(BACKUPS_DIR, f);
        const st = fs.statSync(fp);
        return {
          filename: f,
          sizeBytes: st.size,
          sizeFormatted: formatBytes(st.size),
          createdAt: st.mtime.toISOString(),
          timeMs: st.mtimeMs
        };
      })
      .sort((a, b) => b.timeMs - a.timeMs);
  } catch (err) {
    console.error("Error listing server backups:", err);
    return [];
  }
}

/**
 * Restore a specific server backup file to active database
 */
export function restoreServerBackup(filename) {
  ensureStorageDirectories();

  const safeFilename = path.basename(filename);
  const backupPath = path.join(BACKUPS_DIR, safeFilename);

  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file '${safeFilename}' not found.`);
  }

  const raw = fs.readFileSync(backupPath, "utf8");
  const parsed = JSON.parse(raw);

  // Save current database before restoring
  return saveDatabaseToServer(parsed, { createBackup: true });
}
