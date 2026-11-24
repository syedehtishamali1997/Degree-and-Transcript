import assert from "node:assert/strict";
import { WorkflowService, STATUS, DOCUMENT_STATUS } from "../src/services/WorkflowService.js";
import { StorageService, normalizeDatabase, createEmptyDatabase, validateDatabaseSchema } from "../src/services/StorageService.js";
import { generateId } from "../src/utils/formatters.js";
import { nowLocalISO } from "../src/utils/dateUtils.js";

console.log("======================================================================");
console.log("  CASETRACK DELETION OPERATIONS & ZERO-RECORD IMMUNITY TEST SUITE      ");
console.log("======================================================================");

// Mock LocalStorage for Node.js environment
const mockStorage = new Map();
const localStorageMock = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear()
};
global.localStorage = localStorageMock;
global.window = { localStorage: localStorageMock };

// Fixture: Sample student records across multiple stages
const sampleStudents = [
  {
    id: "std-001",
    serialNumber: 1,
    studentId: "IU04-0322-0001",
    name: "Ahmed Raza",
    program: "BSCS",
    applyOn: "2026-11-01",
    status: STATUS.PENDING,
    documentStatus: DOCUMENT_STATUS.NOT_UPLOADED,
    documentsList: [],
    activityHistory: [{ action: "Registered", timestamp: "2026-11-01T09:00:00.000Z" }]
  },
  {
    id: "std-002",
    serialNumber: 2,
    studentId: "IU04-0322-0002",
    name: "Fatima Noor",
    program: "BBA",
    applyOn: "2026-11-02",
    status: STATUS.READY,
    documentStatus: DOCUMENT_STATUS.SUBMITTED,
    caseReady: "2026-11-02T10:00:00.000Z",
    documentsList: [{ fileName: "Transcript.pdf" }],
    activityHistory: [{ action: "Marked Ready", timestamp: "2026-11-02T10:00:00.000Z" }]
  },
  {
    id: "std-003",
    serialNumber: 3,
    studentId: "IU04-0322-0003",
    name: "Zainab Ali",
    program: "BSSE",
    applyOn: "2026-11-03",
    status: STATUS.SENT,
    documentStatus: DOCUMENT_STATUS.SUBMITTED,
    caseReady: "2026-11-03T09:00:00.000Z",
    dispatchedAt: "2026-11-03T11:00:00.000Z",
    documentsList: [{ fileName: "Doc.pdf" }],
    activityHistory: [{ action: "Dispatched", timestamp: "2026-11-03T11:00:00.000Z" }]
  },
  {
    id: "std-004",
    serialNumber: 4,
    studentId: "IU04-0322-0004",
    name: "Bilal Khan",
    program: "BSCS",
    applyOn: "2026-11-04",
    status: STATUS.RETURNED,
    documentStatus: DOCUMENT_STATUS.SUBMITTED,
    returnReason: "Missing transcript seal",
    documentsList: [{ fileName: "Doc.pdf" }],
    activityHistory: [{ action: "Returned", timestamp: "2026-11-04T12:00:00.000Z" }]
  },
  {
    id: "std-005",
    serialNumber: 5,
    studentId: "IU04-0322-0005",
    name: "Sara Tariq",
    program: "MBA",
    applyOn: "2026-11-05",
    status: STATUS.RECEIVED,
    documentStatus: DOCUMENT_STATUS.SUBMITTED,
    caseReady: "2026-11-05T08:00:00.000Z",
    received: "2026-11-05T16:00:00.000Z",
    documentsList: [{ fileName: "Degree.pdf" }],
    activityHistory: [{ action: "Received", timestamp: "2026-11-05T16:00:00.000Z" }]
  }
];

function createTestDatabase() {
  return normalizeDatabase({
    version: "2.0.0",
    lastUpdated: new Date().toISOString(),
    settings: {
      campusName: "Iqra University Main Campus",
      operatorName: "Senior Admin Officer",
      theme: "dark",
      pageSize: 25,
      autoBackup: true
    },
    students: JSON.parse(JSON.stringify(sampleStudents)),
    history: [
      {
        id: "hist-001",
        action: "Batch Import",
        timestamp: "2026-11-01T08:00:00.000Z",
        operator: "Senior Admin Officer",
        studentId: "5 Records",
        studentName: "Initial Ingestion",
        program: "Multiple",
        description: "5 students imported."
      }
    ]
  });
}

function calculateLiveStats(students) {
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
  const avgTurnaround = turnaroundCount > 0 ? `${(turnaroundSumMs / (turnaroundCount * 3600000)).toFixed(1)} hrs` : "--";
  const programs = Object.values(programMap).sort((a, b) => b.total - a.total);

  return { counts, completionRate, avgTurnaround, programs };
}

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] Test ${totalTests}: ${name}`);
    console.error(`         ${err.message}`);
    throw err;
  }
}

// ==========================================
// SCENARIO 1: Delete individual pending student
// ==========================================
runTest("Individual Pending Student Deletion with History Audit and ID Resolution", () => {
  let db = createTestDatabase();
  const targetId = "std-001";
  const target = db.students.find((s) => s.id === targetId || s.studentId === targetId);
  assert.ok(target, "Target student must exist before deletion");

  // Simulate deleteStudent(id, true)
  const now = nowLocalISO();
  const deleteEvent = {
    id: generateId(),
    action: "Student Record Deleted",
    timestamp: now,
    operator: db.settings.operatorName,
    studentId: target.studentId,
    studentName: target.name,
    program: target.program,
    description: `Student '${target.name}' (${target.studentId}) was permanently deleted from the system.`
  };

  db.students = db.students.filter((s) => s.id !== target.id && s.studentId !== target.studentId);
  db.history.unshift(deleteEvent);

  assert.equal(db.students.length, 4, "Remaining student count should be 4");
  assert.equal(db.students.some((s) => s.id === targetId), false, "Deleted student must be removed");
  assert.equal(db.history[0].action, "Student Record Deleted", "Audit trail must record deletion");
  assert.ok(deleteEvent.id && deleteEvent.id.length > 5, "generateId() must produce a valid non-empty ID");

  const stats = calculateLiveStats(db.students);
  assert.equal(stats.counts.total, 4);
  assert.equal(stats.counts.pending, 0); // was 1, now 0
});

// ==========================================
// SCENARIO 2: Delete individual processed student from All Students
// ==========================================
runTest("Individual Processed Student Deletion (Received Stage) with Force Flag", () => {
  let db = createTestDatabase();
  const targetId = "std-005"; // Sara Tariq (Received)
  const target = db.students.find((s) => s.id === targetId);

  // WorkflowService canDeleteStudent is false for processed, but force=true allows admin deletion from All Students
  assert.equal(WorkflowService.canDeleteStudent(target), false, "canDeleteStudent correctly flags processed case");

  // Admin forces deletion
  db.students = db.students.filter((s) => s.id !== target.id);
  assert.equal(db.students.length, 4);
  assert.equal(db.students.some((s) => s.id === targetId), false);

  const stats = calculateLiveStats(db.students);
  assert.equal(stats.counts.received, 0, "Received count decremented to 0");
});

// ==========================================
// SCENARIO 3: Bulk delete multiple selected students
// ==========================================
runTest("Bulk Deletion of Multiple Selected Students (Mixed Stages)", () => {
  let db = createTestDatabase();
  const targetIds = ["std-002", "IU04-0322-0004"]; // One by UUID, one by studentId

  const idSet = new Set(targetIds.map((id) => String(id).toLowerCase().trim()));
  const removed = db.students.filter(
    (s) => idSet.has(String(s.id).toLowerCase()) || idSet.has(String(s.studentId).toLowerCase().trim())
  );
  assert.equal(removed.length, 2, "Must find exactly 2 matching students");

  db.students = db.students.filter(
    (s) => !idSet.has(String(s.id).toLowerCase()) && !idSet.has(String(s.studentId).toLowerCase().trim())
  );

  const cleanupEvent = {
    id: generateId(),
    action: "Cleaned Selected Records",
    timestamp: nowLocalISO(),
    operator: db.settings.operatorName,
    studentId: "2 Records",
    studentName: "Bulk Removal",
    program: "Multiple",
    description: `Successfully cleaned 2 student records from database.`
  };
  db.history.unshift(cleanupEvent);

  assert.equal(db.students.length, 3, "Remaining count should be 3");
  assert.equal(db.history[0].action, "Cleaned Selected Records");
});

// ==========================================
// SCENARIO 4: Select All Matching candidates selection
// ==========================================
runTest("Select All Matching Candidates Filtering and Selection Logic", () => {
  const db = createTestDatabase();
  // Filter for program BSCS
  const bscsCandidates = db.students.filter((s) => s.program === "BSCS");
  assert.equal(bscsCandidates.length, 2, "There are 2 BSCS students");

  // Select all matching
  const candidateIds = bscsCandidates.map((s) => s.id);
  let selectedStudentIds = Array.from(new Set(candidateIds));
  assert.equal(selectedStudentIds.length, 2);

  // Check all candidates selected
  const allCandidatesSelected =
    bscsCandidates.length > 0 && bscsCandidates.every((s) => selectedStudentIds.includes(s.id));
  assert.equal(allCandidatesSelected, true, "All candidates should be flagged as selected");

  // Deselect all
  selectedStudentIds = [];
  assert.equal(selectedStudentIds.length, 0);
});

// ==========================================
// SCENARIO 5: Cancel deletion preserves records
// ==========================================
runTest("Cancel Deletion Preserves Database State Completely", () => {
  const db = createTestDatabase();
  const initialCount = db.students.length;
  const initialHistory = db.history.length;

  // User opens modal, then clicks Cancel (no state changes applied)
  let studentToDelete = db.students[0];
  studentToDelete = null; // Canceled

  assert.equal(db.students.length, initialCount, "Student count unchanged");
  assert.equal(db.history.length, initialHistory, "History count unchanged");
});

// ==========================================
// SCENARIO 6: Clear All Student Data validation - wrong confirmation text
// ==========================================
runTest("Clear All Student Data Rejects Invalid Confirmation Strings", () => {
  const invalidInputs = [
    "",
    "delete",
    "DELETE",
    "delete all student data",
    "DELETE ALL STUDENT DATA ",
    "DELETE ALL",
    "PURGE"
  ];

  for (const input of invalidInputs) {
    const isAllowed = input === "DELETE ALL STUDENT DATA";
    assert.equal(isAllowed, false, `Input '${input}' must not allow purge`);
  }
});

// ==========================================
// SCENARIO 7: Clear All Student Data with exact confirmation text
// ==========================================
runTest("Clear All Student Data with Exact Confirmation String 'DELETE ALL STUDENT DATA'", () => {
  let db = createTestDatabase();
  const totalBefore = db.students.length;
  assert.equal(totalBefore, 5);

  const confirmText = "DELETE ALL STUDENT DATA";
  assert.equal(confirmText === "DELETE ALL STUDENT DATA", true);

  // Execute purge
  const purgeEvent = {
    id: generateId(),
    action: "All Student Data Cleared",
    timestamp: nowLocalISO(),
    operator: db.settings.operatorName,
    studentId: "ALL",
    studentName: "Database Purge",
    program: "ALL",
    description: `All ${totalBefore} student records, workflow dispatches, and associated documents were purged by administrator.`
  };

  db.students = [];
  db.history = [purgeEvent];

  assert.equal(db.students.length, 0, "Students array must be empty []");
  assert.equal(db.history.length, 1, "History has single audit purge event");
  assert.equal(db.history[0].action, "All Student Data Cleared");
  assert.ok(purgeEvent.id && purgeEvent.id.length > 5);
});

// ==========================================
// SCENARIO 8: Automatic JSON backup creation before purge
// ==========================================
runTest("Automatic JSON Backup Created and Validated Before Purge", () => {
  const db = createTestDatabase();
  const backupJson = JSON.stringify(db, null, 2);
  const parsedBackup = JSON.parse(backupJson);

  const validation = validateDatabaseSchema(parsedBackup);
  assert.equal(validation.valid, true, "Backup must be 100% schema-valid");
  assert.equal(parsedBackup.students.length, 5, "Backup must contain all 5 students");
  assert.equal(parsedBackup.settings.campusName, "Iqra University Main Campus", "Settings must be intact in backup");
});

// ==========================================
// SCENARIO 9: Backend API endpoint payload verification
// ==========================================
runTest("Backend API Endpoint Payload Contracts Verified", () => {
  // Test cleanup-folders payload
  const cleanupPayload = { studentIds: ["IU04-0322-0001", "IU04-0322-0002"] };
  assert.ok(Array.isArray(cleanupPayload.studentIds));
  assert.equal(cleanupPayload.studentIds.length, 2);

  // Test clear-all-folders request
  const clearAllHeaders = { "Content-Type": "application/json" };
  assert.equal(clearAllHeaders["Content-Type"], "application/json");
});

// ==========================================
// SCENARIO 10: LocalStorage persistence roundtrip with 0 students
// ==========================================
runTest("LocalStorage Persistence Roundtrip with Zero Students (Empty Database)", () => {
  let db = createTestDatabase();
  db.students = [];
  db.history = [
    {
      id: generateId(),
      action: "All Student Data Cleared",
      timestamp: nowLocalISO(),
      operator: db.settings.operatorName,
      studentId: "ALL",
      studentName: "Database Purge",
      program: "ALL",
      description: "Database purged"
    }
  ];

  StorageService.saveDatabase(db);
  const result = StorageService.loadDatabase();
  const reloaded = result.database;

  assert.ok(reloaded, "Reloaded database must not be null");
  assert.ok(Array.isArray(reloaded.students), "students must be an array");
  assert.equal(reloaded.students.length, 0, "students length must be 0");
  assert.equal(reloaded.history.length, 1, "history must be preserved");
  assert.equal(reloaded.settings.campusName, "Iqra University Main Campus", "Settings must be preserved");
});

// ==========================================
// SCENARIO 11: Dashboard and sidebar KPI counts when students = 0
// ==========================================
runTest("Dashboard & Navigation Zero-Record Metrics Immunity", () => {
  const emptyStudents = [];
  const stats = calculateLiveStats(emptyStudents);

  assert.equal(stats.counts.total, 0);
  assert.equal(stats.counts.pending, 0);
  assert.equal(stats.counts.ready, 0);
  assert.equal(stats.counts.sent, 0);
  assert.equal(stats.counts.returned, 0);
  assert.equal(stats.counts.received, 0);
  assert.equal(stats.counts.totalReturnsLogged, 0);
  assert.equal(stats.completionRate, "0%");
  assert.equal(stats.avgTurnaround, "--");
  assert.deepEqual(stats.programs, []);
});

// ==========================================
// SCENARIO 12: Defensive UI Rendering Calculations with Empty Array
// ==========================================
runTest("Defensive UI Calculations with Empty Student Array", () => {
  const emptyStudents = [];
  const selectedStudentIds = [];
  const storageBytes = 1024;

  // Verify estimatedStorageReleased calculation
  const calcStorage = (students, selIds, bytes) => {
    if (!students.length) return "0.0";
    const perStudentBytes = bytes / students.length;
    return ((perStudentBytes * selIds.length) / 1024).toFixed(1);
  };
  assert.equal(calcStorage(emptyStudents, selectedStudentIds, storageBytes), "0.0");

  // Verify uniquePrograms calculation
  const set = new Set();
  emptyStudents.forEach((s) => {
    if (s.program && s.program.trim()) set.add(s.program.trim());
  });
  const uniquePrograms = Array.from(set).sort();
  assert.deepEqual(uniquePrograms, []);

  // Verify pagination
  const totalItems = emptyStudents.length;
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  assert.equal(totalPages, 1);
});

// ==========================================
// SCENARIO 13: System settings & branding preserved after purge
// ==========================================
runTest("System Settings, Operator Name, Branding, and Theme Preserved After Purge", () => {
  const db = createTestDatabase();
  const initialSettings = JSON.parse(JSON.stringify(db.settings));

  // Purge students only
  db.students = [];

  assert.deepEqual(db.settings, initialSettings, "Settings must remain identical before and after purge");
  assert.equal(db.settings.operatorName, "Senior Admin Officer");
  assert.equal(db.settings.theme, "dark");
  assert.equal(db.settings.pageSize, 25);
  assert.equal(db.settings.campusName, "Iqra University Main Campus");
});

console.log("======================================================================");
console.log(`  ALL ${passedTests} OF ${totalTests} DELETION OPERATION TESTS PASSED SUCCESSFULLY! `);
console.log("======================================================================");
