/**
 * CaseTrackContext.jsx
 * Centralized React state management for students, workflow, settings, and stats.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { StorageService, createEmptyDatabase, normalizeStudentRecord, normalizeDatabase } from "../services/StorageService";
import { WorkflowService, STATUS } from "../services/WorkflowService";
import { BrandingService, DEFAULT_BRANDING } from "../services/BrandingService";
import { formatDurationHours, nowLocalISO } from "../utils/dateUtils";
import { generateId } from "../utils/formatters";

const CaseTrackContext = createContext(null);

export function CaseTrackProvider({ children }) {
  const [database, setDatabase] = useState(() => {
    const { database: loaded } = StorageService.loadDatabase();
    return loaded;
  });

  const students = useMemo(() => database.students || [], [database.students]);
  const settings = useMemo(() => database.settings || {}, [database.settings]);
  const notifications = useMemo(() => database.notifications || [], [database.notifications]);
  const history = useMemo(() => database.history || [], [database.history]);

  // Enterprise 100 GB storage telemetry state
  const [storageMetrics, setStorageMetrics] = useState(null);

  const refreshStorageMetrics = useCallback(async () => {
    try {
      const data = await StorageService.fetchStorageMetrics();
      if (data) {
        setStorageMetrics(data);
      }
    } catch (e) {
      console.warn("Could not refresh storage metrics:", e);
    }
  }, []);

  // Synchronize database to LocalStorage (client cache) and server disk (100 GB persistent store)
  const persistDatabase = useCallback((updater) => {
    setDatabase((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const normalized = normalizeDatabase(next);
      // Fast client cache save
      StorageService.saveDatabase(normalized);
      // Asynchronous persistent server disk sync & rotational safety backup
      StorageService.syncDatabaseToServer(normalized)
        .then(() => refreshStorageMetrics())
        .catch((err) => console.warn("Server disk persistence offline:", err));
      return normalized;
    });
  }, [refreshStorageMetrics]);

  // Initial load: fetch 100 GB storage metrics and reconcile with server disk persistence
  useEffect(() => {
    refreshStorageMetrics();

    StorageService.loadDatabaseFromServer()
      .then((serverRes) => {
        if (serverRes?.ok && serverRes.found && serverRes.database?.students?.length > 0) {
          const localCount = database.students?.length || 0;
          const serverCount = serverRes.database.students.length;
          // Reconcile if client was completely blank
          if (localCount === 0 && serverCount > 0) {
            const normalized = normalizeDatabase(serverRes.database);
            setDatabase(normalized);
            StorageService.saveDatabase(normalized);
          }
        } else if (database.students?.length > 0) {
          // Sync client data to server storage if server doesn't have it yet
          StorageService.syncDatabaseToServer(database)
            .then(() => refreshStorageMetrics())
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // Calculate live statistics
  const stats = useMemo(() => {
    const counts = {
      total: students.length,
      pending: 0,
      ready: 0,
      sent: 0,
      returned: 0,
      received: 0,
      totalReturnsLogged: 0
    };

    let turnaroundSumMs = 0;
    let turnaroundCount = 0;
    const programMap = {};

    students.forEach((s) => {
      if (!programMap[s.program]) {
        programMap[s.program] = {
          program: s.program,
          total: 0,
          pending: 0,
          ready: 0,
          sent: 0,
          returned: 0,
          received: 0
        };
      }
      const p = programMap[s.program];
      p.total++;

      switch (s.status) {
        case STATUS.PENDING:
          counts.pending++;
          p.pending++;
          break;
        case STATUS.READY:
          counts.ready++;
          p.ready++;
          break;
        case STATUS.SENT:
          counts.sent++;
          p.sent++;
          break;
        case STATUS.RETURNED:
          counts.returned++;
          p.returned++;
          break;
        case STATUS.RECEIVED:
          counts.received++;
          p.received++;
          break;
        default:
          break;
      }

      counts.totalReturnsLogged += WorkflowService.getReturnCount(s);

      if (s.caseReady && s.received) {
        const diff = new Date(s.received).getTime() - new Date(s.caseReady).getTime();
        if (isFinite(diff) && diff >= 0) {
          turnaroundSumMs += diff;
          turnaroundCount++;
        }
      }
    });

    const completionRate = counts.total > 0 ? ((counts.received / counts.total) * 100).toFixed(1) + "%" : "0%";
    const avgTurnaround = turnaroundCount > 0 ? formatDurationHours(turnaroundSumMs / turnaroundCount) : "--";
    const programs = Object.values(programMap).sort((a, b) => b.total - a.total);

    return {
      counts,
      completionRate,
      avgTurnaround,
      programs
    };
  }, [students]);

  // Notifications
  const pushNotification = useCallback((message, level = "info") => {
    persistDatabase((prev) => {
      const newNotif = {
        id: "notif-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        message,
        level,
        timestamp: nowLocalISO()
      };
      const notifs = [newNotif, ...(prev.notifications || [])].slice(0, 30);
      return { ...prev, notifications: notifs };
    });
  }, [persistDatabase]);

  const clearNotifications = useCallback(() => {
    persistDatabase((prev) => ({ ...prev, notifications: [] }));
  }, [persistDatabase]);

  // Student CRUD
  const addStudent = useCallback((data) => {
    const newStudent = WorkflowService.createStudent(data, students, settings.operatorName);
    persistDatabase((prev) => ({
      ...prev,
      students: [newStudent, ...prev.students]
    }));

    // Automatically initialize student document directory on backend
    fetch("/api/students/init-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStudent)
    }).catch((err) => console.warn("Backend folder init offline:", err));

    pushNotification(`Student '${newStudent.name}' (${newStudent.studentId}) registered successfully.`, "success");
    return { ok: true, student: newStudent };
  }, [students, settings.operatorName, persistDatabase, pushNotification]);

  const updateStudentDocuments = useCallback((id, uploadResult) => {
    let updatedStudent = null;
    persistDatabase((prev) => {
      const nextStudents = prev.students.map((s) => {
        if (s.id === id) {
          updatedStudent = WorkflowService.updateStudentDocuments(s, uploadResult, settings.operatorName);
          return updatedStudent;
        }
        return s;
      });
      return { ...prev, students: nextStudents };
    });
    if (updatedStudent) {
      pushNotification(`Documents updated for '${updatedStudent.name}'.`, "success");
    }
    return { ok: true, student: updatedStudent };
  }, [settings.operatorName, persistDatabase, pushNotification]);

  const updateStudent = useCallback((id, data) => {
    let updatedStudent = null;
    persistDatabase((prev) => {
      const nextStudents = prev.students.map((s) => {
        if (s.id === id) {
          updatedStudent = WorkflowService.updateStudentInfo(s, data, settings.operatorName);
          return updatedStudent;
        }
        return s;
      });
      return { ...prev, students: nextStudents };
    });
    if (updatedStudent) {
      pushNotification(`Student '${updatedStudent.name}' updated.`, "success");
    }
    return { ok: true, student: updatedStudent };
  }, [settings.operatorName, persistDatabase, pushNotification]);

  const deleteStudent = useCallback((id, force = true) => {
    const target = students.find((s) => s.id === id || s.studentId === id);
    if (!target) return { ok: false, error: "Student record not found." };
    if (!force && !WorkflowService.canDeleteStudent(target)) {
      return { ok: false, error: "Processed cases cannot be deleted to preserve audit integrity." };
    }

    const now = nowLocalISO();
    const deleteEvent = {
      id: generateId(),
      action: "Student Record Deleted",
      timestamp: now,
      operator: settings?.operatorName || "Admin Officer",
      studentId: target.studentId,
      studentName: target.name,
      program: target.program,
      description: `Student '${target.name}' (${target.studentId}) was permanently deleted from the system.`
    };

    persistDatabase((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== target.id && s.studentId !== target.studentId),
      history: [deleteEvent, ...(prev.history || [])]
    }));

    // Clean up physical student documents on backend
    fetch("/api/students/cleanup-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds: [target.studentId] })
    }).catch((err) => console.warn("Backend student folder cleanup offline:", err));

    pushNotification(`Student '${target.name}' (${target.studentId}) deleted successfully.`, "warning");
    return { ok: true };
  }, [students, settings?.operatorName, persistDatabase, pushNotification]);

  // Workflow Actions
  const markCaseReady = useCallback((id) => {
    const target = students.find((s) => s.id === id || s.studentId === id);
    if (!target) return { ok: false, error: "Student record not found." };

    const res = WorkflowService.markCaseReady(target, settings.operatorName);
    if (!res.ok) return res;

    persistDatabase((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === target.id ? res.student : s))
    }));
    pushNotification(`Case Ready marked for '${target.name}' (${target.studentId}).`, "success");
    return res;
  }, [students, settings.operatorName, persistDatabase, pushNotification]);

  const sendToMainCampus = useCallback((id, notes = "") => {
    const target = students.find((s) => s.id === id || s.studentId === id);
    if (!target) return { ok: false, error: "Student record not found." };

    const res = WorkflowService.sendToMainCampus(target, settings.operatorName, notes);
    if (!res.ok) return res;

    persistDatabase((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === target.id ? res.student : s))
    }));

    const msg = res.isResend
      ? `Case resent to Main Campus for '${target.name}' (Attempt #${res.attemptNo}).`
      : `Case sent to Main Campus for '${target.name}' (${target.studentId}).`;
    pushNotification(msg, "success");
    return res;
  }, [students, settings.operatorName, persistDatabase, pushNotification]);

  const returnCase = useCallback((id, reason) => {
    const target = students.find((s) => s.id === id || s.studentId === id);
    if (!target) return { ok: false, error: "Student record not found." };

    const res = WorkflowService.returnCase(target, reason, settings.operatorName);
    if (!res.ok) return res;

    persistDatabase((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === target.id ? res.student : s))
    }));
    pushNotification(`Case returned for '${target.name}'. Reason: ${reason}`, "danger");
    return res;
  }, [students, settings.operatorName, persistDatabase, pushNotification]);

  const markReceived = useCallback((id) => {
    const target = students.find((s) => s.id === id || s.studentId === id);
    if (!target) return { ok: false, error: "Student record not found." };

    const res = WorkflowService.markReceived(target, settings.operatorName);
    if (!res.ok) return res;

    persistDatabase((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === target.id ? res.student : s))
    }));
    pushNotification(`Case for '${target.name}' marked Received from Main Campus. Degree issued!`, "success");
    return res;
  }, [students, settings.operatorName, persistDatabase, pushNotification]);

  // Bulk Ingestion & Database Management
  const importExcelStudents = useCallback((parsedRows, duplicateHandling = "skip") => {
    let addedCount = 0;
    let updatedCount = 0;
    const duplicates = [];

    persistDatabase((prev) => {
      const studentMap = new Map();
      prev.students.forEach((s) => {
        studentMap.set(s.studentId.trim().toLowerCase(), s);
      });

      let nextSno = prev.students.reduce((max, s) => Math.max(max, Number(s.serialNumber) || 0), 0) + 1;
      const updatedList = [...prev.students];

      parsedRows.forEach((row, idx) => {
        const key = row.studentId.trim().toLowerCase();
        if (studentMap.has(key)) {
          duplicates.push(row.studentId);
          if (duplicateHandling === "overwrite") {
            const existing = studentMap.get(key);
            existing.name = row.name || existing.name;
            existing.program = row.program || existing.program;
            existing.applyOn = row.applyOn || existing.applyOn;
            existing.updatedAt = nowLocalISO();
            updatedCount++;
          }
        } else {
          const newStudent = normalizeStudentRecord(
            {
              studentId: row.studentId,
              name: row.name,
              program: row.program,
              applyOn: row.applyOn,
              status: STATUS.PENDING,
              serialNumber: nextSno++
            },
            idx
          );
          studentMap.set(key, newStudent);
          updatedList.push(newStudent);
          addedCount++;
        }
      });

      return {
        ...prev,
        students: updatedList
      };
    });

    // Automatically initialize student document directories in bulk on backend
    fetch("/api/students/init-folders-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ students: parsedRows })
    }).catch((err) => console.warn("Backend bulk folder init offline:", err));

    const msg = `Excel import finished: ${addedCount} student(s) added, ${duplicates.length} duplicate(s) handled.`;
    pushNotification(msg, "success");
    return { ok: true, addedCount, updatedCount, duplicates };
  }, [persistDatabase, pushNotification]);

  const replaceDatabase = useCallback((newDbJson) => {
    const normalized = normalizeDatabase(newDbJson);
    StorageService.saveDatabase(normalized);
    setDatabase(normalized);
    pushNotification(`Database replaced successfully (${normalized.students.length} records loaded).`, "warning");
    return { ok: true };
  }, [pushNotification]);

  const mergeDatabase = useCallback((newDbJson) => {
    let addedCount = 0;
    const duplicates = [];

    persistDatabase((prev) => {
      const existingIds = new Set(prev.students.map((s) => s.studentId.trim().toLowerCase()));
      let nextSno = prev.students.reduce((max, s) => Math.max(max, Number(s.serialNumber) || 0), 0) + 1;
      const mergedList = [...prev.students];

      (newDbJson.students || []).forEach((incoming, idx) => {
        const key = incoming.studentId.trim().toLowerCase();
        if (existingIds.has(key)) {
          duplicates.push(incoming.studentId);
        } else {
          const clean = normalizeStudentRecord(incoming, idx);
          clean.serialNumber = nextSno++;
          mergedList.push(clean);
          existingIds.add(key);
          addedCount++;
        }
      });

      return {
        ...prev,
        students: mergedList
      };
    });

    pushNotification(`JSON merge completed: ${addedCount} added, ${duplicates.length} duplicate(s) skipped.`, "success");
    return { ok: true, addedCount, duplicates };
  }, [persistDatabase, pushNotification]);

  const wipeDatabase = useCallback(() => {
    const emptyDb = createEmptyDatabase();
    StorageService.saveDatabase(emptyDb);
    setDatabase(emptyDb);
    pushNotification("Database has been completely cleared.", "danger");
    return { ok: true };
  }, [pushNotification]);

  const deleteMultipleStudents = useCallback((targetIds = []) => {
    if (!targetIds.length) return { ok: false, error: "No student IDs specified." };
    const idSet = new Set(targetIds.map((id) => String(id).toLowerCase().trim()));

    const now = nowLocalISO();
    const removedStudents = students.filter(
      (s) => idSet.has(String(s.id).toLowerCase()) || idSet.has(String(s.studentId).toLowerCase().trim())
    );
    const removedCount = removedStudents.length;
    const removedStudentIds = removedStudents.map((s) => s.studentId);

    persistDatabase((prev) => {
      const remainingStudents = prev.students.filter(
        (s) => !idSet.has(String(s.id).toLowerCase()) && !idSet.has(String(s.studentId).toLowerCase().trim())
      );

      const cleanupEvent = {
        id: generateId(),
        action: "Cleaned Selected Records",
        timestamp: now,
        operator: settings?.operatorName || "Admin Officer",
        studentId: `${removedCount} Records`,
        studentName: "Bulk Removal",
        program: "Multiple",
        description: `Successfully cleaned ${removedCount} student records from database.`
      };

      return {
        ...prev,
        students: remainingStudents,
        history: [cleanupEvent, ...(prev.history || [])]
      };
    });

    // Remove physical folders via backend asynchronously
    if (removedStudentIds.length > 0) {
      fetch("/api/students/cleanup-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: removedStudentIds })
      }).catch((err) => console.warn("Backend student folder cleanup offline:", err));
    }

    pushNotification(`Successfully deleted ${removedCount} student record(s) and associated files.`, "success");
    return { ok: true, count: removedCount };
  }, [students, settings?.operatorName, persistDatabase, pushNotification]);

  const clearAllStudentData = useCallback(() => {
    const totalCount = students.length;
    const now = nowLocalISO();

    // 1. Take an automatic JSON backup before deletion (Requirement 5.5)
    try {
      StorageService.exportDatabaseToJson(database);
    } catch (e) {
      console.warn("Auto-backup failed before clear all:", e);
    }

    // 2. Clear all student records and student dispatch history safely
    persistDatabase((prev) => {
      const purgeEvent = {
        id: generateId(),
        action: "All Student Data Cleared",
        timestamp: now,
        operator: settings?.operatorName || "Admin Officer",
        studentId: "ALL",
        studentName: "Database Purge",
        program: "ALL",
        description: `All ${totalCount} student records, workflow dispatches, and associated documents were purged by administrator.`
      };

      return {
        ...prev,
        students: [],
        history: [purgeEvent]
      };
    });

    // 3. Purge all physical document folders on backend
    fetch("/api/students/clear-all-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }).catch((err) => console.warn("Backend clear all folders offline:", err));

    pushNotification(`All student data (${totalCount} records) has been cleared from database.`, "warning");
    return { ok: true, count: totalCount };
  }, [students.length, database, settings?.operatorName, persistDatabase, pushNotification]);

  const resetDatabaseToFactory = useCallback(() => {
    // 1. Automatically trigger and download full JSON backup before wiping
    StorageService.exportDatabaseToJson(database);

    // 2. Wipe database and restore fresh schema
    const emptyDb = createEmptyDatabase();
    StorageService.saveDatabase(emptyDb);
    setDatabase(emptyDb);

    // 3. Purge physical folders
    fetch("/api/students/clear-all-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }).catch((err) => console.warn("Backend clear all folders offline:", err));

    pushNotification("Database has been reset to factory defaults. Safety backup was downloaded.", "danger");
    return { ok: true };
  }, [database, pushNotification]);

  const updateSettings = useCallback((partial) => {
    persistDatabase((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...partial }
    }));
  }, [persistDatabase]);

  // Centralized dynamic branding state
  const branding = useMemo(() => {
    return BrandingService.normalizeBranding(settings.branding || {
      appName: "CaseTrack",
      campusSubtitle: settings.campusName || "by Iqra University"
    });
  }, [settings.branding, settings.campusName]);

  const updateBranding = useCallback((partial) => {
    persistDatabase((prev) => {
      const current = prev.settings?.branding || DEFAULT_BRANDING;
      const updated = BrandingService.normalizeBranding({
        ...current,
        ...partial,
        updatedAt: nowLocalISO()
      });
      return {
        ...prev,
        settings: {
          ...prev.settings,
          campusName: updated.campusSubtitle || prev.settings.campusName,
          branding: updated
        }
      };
    });
    pushNotification("Application branding updated successfully.", "success");
  }, [persistDatabase, pushNotification]);

  const resetBrandingToDefault = useCallback(() => {
    persistDatabase((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        campusName: DEFAULT_BRANDING.campusSubtitle,
        branding: { ...DEFAULT_BRANDING, updatedAt: nowLocalISO() }
      }
    }));
    pushNotification("Branding restored to default CaseTrack identity.", "info");
  }, [persistDatabase, pushNotification]);

  // Apply dynamic branding (Document Title & Favicon) on change
  useEffect(() => {
    BrandingService.applyBrandingToDom(branding);
  }, [branding]);

  // Apply light/dark theme to html root attribute
  useEffect(() => {
    const mode = settings.theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-bs-theme", mode);
    document.documentElement.setAttribute("data-coreui-theme", mode);
  }, [settings.theme]);

  const value = {
    database,
    students,
    settings,
    branding,
    updateBranding,
    resetBrandingToDefault,
    notifications,
    history,
    stats,
    addStudent,
    updateStudent,
    updateStudentDocuments,
    deleteStudent,
    markCaseReady,
    sendToMainCampus,
    returnCase,
    markReceived,
    importExcelStudents,
    replaceDatabase,
    mergeDatabase,
    wipeDatabase,
    deleteMultipleStudents,
    clearAllStudentData,
    resetDatabaseToFactory,
    updateSettings,
    pushNotification,
    clearNotifications,
    storageMetrics,
    refreshStorageMetrics
  };

  return <CaseTrackContext.Provider value={value}>{children}</CaseTrackContext.Provider>;
}

export function useCaseTrack() {
  const ctx = useContext(CaseTrackContext);
  if (!ctx) {
    throw new Error("useCaseTrack must be used within a CaseTrackProvider");
  }
  return ctx;
}
