/**
 * verify-react-migration.js
 * Comprehensive automated test suite for CaseTrack React 19 / Vite migration.
 * Tests Services, Workflow transitions, Validation, Excel integration, and LocalStorage simulation.
 */

import assert from "node:assert";
import { StorageService, createEmptyDatabase, normalizeStudentRecord, normalizeDatabase, validateDatabaseSchema } from "../src/services/StorageService.js";
import { WorkflowService, STATUS, DOCUMENT_STATUS } from "../src/services/WorkflowService.js";
import { ExcelService } from "../src/services/ExcelService.js";
import { HistoryService } from "../src/services/HistoryService.js";
import { formatTimestamp, formatDateOnly, formatDurationHours, parseToYYYYMMDD } from "../src/utils/dateUtils.js";
import { formatStudentId, formatFullName } from "../src/utils/formatters.js";
import { validateStudentInput, validateReturnReason } from "../src/utils/validators.js";

// Mock localStorage for Node test runner
const mockStorage = new Map();
global.window = {
  localStorage: {
    getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k),
    clear: () => mockStorage.clear(),
    get length() {
      return mockStorage.size;
    },
    key: (i) => Array.from(mockStorage.keys())[i] || null
  }
};

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  [PASS] ${description}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

console.log("\n=======================================================");
console.log("  CASETRACK REACT MIGRATION VERIFICATION SUITE");
console.log("=======================================================\n");

// 1. StorageService Tests
console.log("--- 1. StorageService & Database Normalization ---");
test("Loads empty database when storage is empty", () => {
  mockStorage.clear();
  const { database, recovered } = StorageService.loadDatabase();
  assert.strictEqual(database.version, "2.0.0");
  assert.strictEqual(Array.isArray(database.students), true);
  assert.strictEqual(database.students.length, 0);
  assert.strictEqual(recovered, false);
});

test("Persists and reloads database without data loss", () => {
  const db = createEmptyDatabase();
  db.students.push(
    normalizeStudentRecord({
      studentId: "IU04-0122-0001",
      name: "Ahmed Ali",
      program: "BSCS",
      applyOn: "2026-11-01"
    })
  );
  StorageService.saveDatabase(db);
  const reloaded = StorageService.loadDatabase();
  assert.strictEqual(reloaded.database.students.length, 1);
  assert.strictEqual(reloaded.database.students[0].studentId, "IU04-0122-0001");
  assert.strictEqual(reloaded.database.students[0].name, "Ahmed Ali");
});

test("Schema validation detects non-objects and missing arrays", () => {
  assert.strictEqual(validateDatabaseSchema(null).valid, false);
  assert.strictEqual(validateDatabaseSchema([]).valid, false);
  assert.strictEqual(validateDatabaseSchema({}).valid, false);
  assert.strictEqual(validateDatabaseSchema({ students: "invalid" }).valid, false);
  assert.strictEqual(validateDatabaseSchema({ students: [] }).valid, true);
});

test("Schema validation catches duplicate student IDs in import file", () => {
  const duplicatePayload = {
    students: [
      { studentId: "IU04-0122-0001", name: "Ahmed" },
      { studentId: "iu04-0122-0001", name: "Duplicate" }
    ]
  };
  const res = validateDatabaseSchema(duplicatePayload);
  assert.strictEqual(res.valid, false);
  assert.match(res.error, /duplicate student id/i);
});

// 2. WorkflowService & Stage Transition Tests
console.log("\n--- 2. Workflow Lifecycle & State Machine ---");
test("Creates a new student in Stage 0 (Pending)", () => {
  const student = WorkflowService.createStudent(
    { studentId: "IU04-0122-0010", name: "Sara Khan", program: "BBA", applyOn: "2026-11-05" },
    [],
    "Admin Officer"
  );
  assert.strictEqual(student.status, STATUS.PENDING);
  assert.strictEqual(student.serialNumber, 1);
  assert.strictEqual(student.caseReady, null);
  assert.strictEqual(student.received, null);
  assert.strictEqual(student.sendHistory.length, 0);
  assert.strictEqual(student.activityHistory.length, 1);
});

test("Rejects duplicate student ID creation", () => {
  const existing = [{ studentId: "IU04-0122-0010" }];
  assert.throws(() => {
    WorkflowService.createStudent(
      { studentId: "iu04-0122-0010", name: "Copy", program: "BBA" },
      existing,
      "Admin Officer"
    );
  }, /already exists/i);
});

test("Allows marking Case Ready even when no documents are uploaded (optional document workflow)", () => {
  const student = WorkflowService.createStudent(
    { studentId: "IU04-0122-0019", name: "NoDocs", program: "BSCS" },
    [],
    "Admin"
  );
  const res = WorkflowService.markCaseReady(student, "Admin");
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.student.status, STATUS.READY);
  assert.strictEqual(res.student.documentStatus, DOCUMENT_STATUS.NOT_UPLOADED);
  assert.ok(res.student.caseReady);
});

test("Rejects marking Case Ready if student ID or name is missing", () => {
  const invalidStudent = {
    id: "test-inv",
    studentId: "",
    name: "",
    status: STATUS.PENDING,
    caseReady: null
  };
  const res = WorkflowService.markCaseReady(invalidStudent, "Admin");
  assert.strictEqual(res.ok, false);
  assert.match(res.error, /Valid Student ID and Student Name are required/i);
});

test("Advances Stage 0 (Pending) -> Stage 1 (Case Ready) when documents submitted", () => {
  let student = WorkflowService.createStudent(
    { studentId: "IU04-0122-0020", name: "Bilal", program: "BSCS" },
    [],
    "Admin"
  );
  student = WorkflowService.updateStudentDocuments(student, {
    documentStatus: DOCUMENT_STATUS.SUBMITTED,
    folderName: "IU04-0122-0020_Bilal",
    documents: [{ fileName: "EDP_Transcript.pdf" }]
  });
  const res = WorkflowService.markCaseReady(student, "Admin");
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.student.status, STATUS.READY);
  assert.ok(res.student.caseReady);
  assert.strictEqual(res.student.activityHistory.length, 3);
});

test("Advances Stage 1 (Case Ready) -> Stage 2 (Sent to Main Campus)", () => {
  let student = WorkflowService.createStudent(
    { studentId: "IU04-0122-0021", name: "Zainab", program: "BSSE" },
    [],
    "Admin"
  );
  student = WorkflowService.updateStudentDocuments(student, {
    documentStatus: DOCUMENT_STATUS.SUBMITTED,
    folderName: "IU04-0122-0021_Zainab"
  });
  const ready = WorkflowService.markCaseReady(student, "Admin").student;
  const sent = WorkflowService.sendToMainCampus(ready, "Admin", "Dispatch batch 101");
  assert.strictEqual(sent.ok, true);
  assert.strictEqual(sent.student.status, STATUS.SENT);
  assert.strictEqual(sent.student.sendHistory.length, 1);
  assert.strictEqual(sent.student.sendHistory[0].operator, "Admin");
  assert.strictEqual(sent.student.sendHistory[0].notes, "Dispatch batch 101");
  assert.strictEqual(sent.isResend, false);
});

test("Stage 2 (Sent) -> Returned Case enforces mandatory reason (min 5 chars)", () => {
  let student = WorkflowService.createStudent(
    { studentId: "IU04-0122-0022", name: "Tariq", program: "MBA" },
    [],
    "Admin"
  );
  student = WorkflowService.updateStudentDocuments(student, {
    documentStatus: DOCUMENT_STATUS.SUBMITTED,
    folderName: "IU04-0122-0022_Tariq"
  });
  const ready = WorkflowService.markCaseReady(student, "Admin").student;
  const sent = WorkflowService.sendToMainCampus(ready, "Admin").student;

  // Short reason (< 5 chars) rejected
  const fail = WorkflowService.returnCase(sent, "No", "Admin");
  assert.strictEqual(fail.ok, false);
  assert.match(fail.error, /at least 5 characters/i);

  // Valid reason (>= 5 chars) accepted
  const success = WorkflowService.returnCase(sent, "Fee clearance certificate missing from record.", "Admin");
  assert.strictEqual(success.ok, true);
  assert.strictEqual(success.student.status, STATUS.RETURNED);
  assert.strictEqual(WorkflowService.getReturnCount(success.student), 1);
});

test("Returned Case -> Resend to Main Campus advances attempt counter", () => {
  let student = WorkflowService.createStudent(
    { studentId: "IU04-0122-0023", name: "Hina", program: "Pharm-D" },
    [],
    "Admin"
  );
  student = WorkflowService.updateStudentDocuments(student, {
    documentStatus: DOCUMENT_STATUS.SUBMITTED,
    folderName: "IU04-0122-0023_Hina"
  });
  const ready = WorkflowService.markCaseReady(student, "Admin").student;
  const sent = WorkflowService.sendToMainCampus(ready, "Admin").student;
  const returned = WorkflowService.returnCase(sent, "Missing transcript copy from matric.", "Admin").student;

  const resent = WorkflowService.sendToMainCampus(returned, "Admin", "Fee receipt attached now.");
  assert.strictEqual(resent.ok, true);
  assert.strictEqual(resent.isResend, true);
  assert.strictEqual(resent.attemptNo, 2);
  assert.strictEqual(resent.student.status, STATUS.SENT);
  assert.strictEqual(resent.student.sendHistory.length, 2);
});

test("Stage 2 (Sent) -> Stage 3 (Received from Main Campus) completes case", () => {
  let student = WorkflowService.createStudent(
    { studentId: "IU04-0122-0024", name: "Farhan", program: "BBA" },
    [],
    "Admin"
  );
  student = WorkflowService.updateStudentDocuments(student, {
    documentStatus: DOCUMENT_STATUS.SUBMITTED,
    folderName: "IU04-0122-0024_Farhan"
  });
  const ready = WorkflowService.markCaseReady(student, "Admin").student;
  const sent = WorkflowService.sendToMainCampus(ready, "Admin").student;
  const received = WorkflowService.markReceived(sent, "Admin");

  assert.strictEqual(received.ok, true);
  assert.strictEqual(received.student.status, STATUS.RECEIVED);
  assert.ok(received.student.received);
});

test("Rejects illegal transitions (e.g. pending directly to received)", () => {
  const student = WorkflowService.createStudent(
    { studentId: "IU04-0122-0025", name: "Usman", program: "BSCS" },
    [],
    "Admin"
  );
  const badReceive = WorkflowService.markReceived(student, "Admin");
  assert.strictEqual(badReceive.ok, false);

  const badSend = WorkflowService.sendToMainCampus(student, "Admin");
  assert.strictEqual(badSend.ok, false);
});

test("Deletion integrity: prevents deleting processed student records", () => {
  const pending = WorkflowService.createStudent(
    { studentId: "IU04-0122-0026", name: "DeleteMe", program: "BSCS" },
    [],
    "Admin"
  );
  assert.strictEqual(WorkflowService.canDeleteStudent(pending), true);

  const processed = WorkflowService.markCaseReady(pending, "Admin").student;
  assert.strictEqual(WorkflowService.canDeleteStudent(processed), false);
});

// 3. Validation and Formatting Tests
console.log("\n--- 3. Validation & Formatters ---");
test("Validates student form inputs", () => {
  const emptyRes = validateStudentInput({});
  assert.strictEqual(emptyRes.valid, false);
  assert.strictEqual(emptyRes.errors.length > 0, true);

  const validRes = validateStudentInput({
    studentId: "IU04-0122-0001",
    name: "Ahmad Raza",
    program: "BSCS",
    applyOn: "2026-11-01"
  });
  assert.strictEqual(validRes.valid, true);
});

test("Validates return reason constraints", () => {
  assert.strictEqual(validateReturnReason("").valid, false);
  assert.strictEqual(validateReturnReason("ok").valid, false);
  assert.strictEqual(validateReturnReason("Original transcript copy missing from folder.").valid, true);
});

test("Date formatting handles ISO strings, dates, and durations", () => {
  assert.strictEqual(formatDateOnly("2026-11-20T10:30:00"), "20-Nov-2026");
  assert.strictEqual(parseToYYYYMMDD("2026-11-20"), "2026-11-20");
  assert.strictEqual(formatDurationHours(3600000 * 25), "25.0 hrs");
  assert.strictEqual(formatDurationHours(3600000 * 72), "3.0 days");
  assert.strictEqual(formatDurationHours(3600000 * 5), "5.0 hrs");
});

// 4. Excel Service Column Matching
console.log("\n--- 4. Excel Flexible Synonym Matching ---");
test("Matches various standard column header synonyms", () => {
  const headers = ["Roll No", "Student_Name", "Department", "Date Applied"];
  const idIdx = ExcelService.matchColumnIndex(headers, ExcelService.FIELD_SYNONYMS.studentId);
  const nameIdx = ExcelService.matchColumnIndex(headers, ExcelService.FIELD_SYNONYMS.name);
  const progIdx = ExcelService.matchColumnIndex(headers, ExcelService.FIELD_SYNONYMS.program);
  const dateIdx = ExcelService.matchColumnIndex(headers, ExcelService.FIELD_SYNONYMS.applyOn);

  assert.strictEqual(idIdx, 0);
  assert.strictEqual(nameIdx, 1);
  assert.strictEqual(progIdx, 2);
  assert.strictEqual(dateIdx, 3);
});

console.log("\n=======================================================");
console.log(`  TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
