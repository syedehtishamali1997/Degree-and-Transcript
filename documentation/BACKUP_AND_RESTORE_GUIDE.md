# CaseTrack - Backup, Restore & Disaster Recovery Guide
### JSON Snapshots, Schema Validation, Crash Recovery & Factory Reset (v2.2.0)

This document provides administrative and technical instructions for backing up, restoring, recovering, and resetting data in **CaseTrack**.

---

## 1. Backup Architecture Overview

Because CaseTrack persists application data client-side in browser `LocalStorage` (`casetrack_db_v2`), robust backup and restore mechanisms are critical for disaster recovery and cross-device migration.

The application implements a 3-tier protection framework:
1. **Manual On-Demand Snapshots**: Complete JSON state export triggered by administrator.
2. **Automatic Pre-Destructive Safety Backups**: Automated JSON backup triggered immediately prior to database purges or factory resets.
3. **Crash & Corruption Mirroring**: Transparent mirror backup (`casetrack_db_v2_last_valid_backup`) updated on every valid write.

---

## 2. On-Demand JSON Backup

### 2.1 Exporting a Snapshot
- In Data Management → **Section C: JSON Backup & Restore**, click **Download JSON Backup**.
- Generates an immutable, timestamped file:
  `casetrack_backup_YYYY-MM-DD_HH-mm-ss.json`
- The file contains the full application state:
  - `version`: Application schema version.
  - `lastUpdated`: ISO timestamp.
  - `settings`: Operator name, campus branding, theme preference, page size.
  - `students`: Complete student array with all documents and workflow history.
  - `history`: Complete chronological activity log.

---

## 3. JSON Database Restore Engine

### 3.1 Restore Modes
When uploading a previously exported JSON backup file, administrators can choose between two restore modes:

1. **Completely Replace Database**:
   - Clears existing records and replaces the database with the snapshot.
   - Recommended for disaster recovery or restoring to a clean state.
2. **Merge with Existing Records**:
   - Retains existing records in LocalStorage.
   - Appends non-duplicate students from the backup.
   - Skips records whose Student ID matches an existing record to prevent collisions.

### 3.2 Schema Validation During Restore
Before committing incoming JSON to LocalStorage, `StorageService.validateDatabaseSchema()` verifies:
- The payload is a valid JSON object.
- The `students` property is an array.
- All student records possess unique, non-empty `studentId` fields.
- Required fields (`name`, `program`, `status`) exist and contain valid values.
If validation fails, the restore is blocked with an informative error message.

---

## 4. Automatic Pre-Purge Safety Backups

Whenever an administrator initiates a destructive operation:
- **Clear All Student Data (Purge)** in Data Management.
- **Reset to Factory Defaults** in Data Management or Settings.

The system automatically calls `StorageService.exportDatabaseToJson(database)` before any records are cleared. A file named `casetrack_safety_backup_*.json` is automatically downloaded to the operator's computer.

---

## 5. Crash & Corruption Auto-Recovery

If browser LocalStorage becomes corrupted (e.g. abrupt power failure during write, invalid manual edits):
1. Upon startup, `StorageService.loadDatabase()` parses `casetrack_db_v2`.
2. If `JSON.parse` throws an exception, the system catches it and checks `casetrack_db_v2_last_valid_backup`.
3. If the mirror backup is healthy, it automatically restores state from the mirror and logs a warning.
4. If both are invalid, it safely initializes a blank database without crashing the application.

---

## 6. Factory Reset Procedure

- Located in Data Management → Section D (Advanced).
- Resets the database to a blank initial state:
  1. Triggers automatic offline JSON safety backup.
  2. Sets `students: []`.
  3. Resets settings to default (operator: "Admin Officer", theme: "light").
  4. Calls `POST /api/students/clear-all-folders` to purge physical files from disk.
