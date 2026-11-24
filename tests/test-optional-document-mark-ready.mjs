import assert from "node:assert/strict";
import { WorkflowService, STATUS, DOCUMENT_STATUS } from "../src/services/WorkflowService.js";
import { StorageService, normalizeDatabase } from "../src/services/StorageService.js";

console.log("======================================================================");
console.log("  CASETRACK OPTIONAL DOCUMENT UPLOAD & MARK READY TEST SUITE         ");
console.log("======================================================================");

function calculateMockStats(students) {
  const counts = {
    total: students.length,
    pending: students.filter((s) => s.status === STATUS.PENDING).length,
    ready: students.filter((s) => s.status === STATUS.READY).length,
    sent: students.filter((s) => s.status === STATUS.SENT).length,
    returned: students.filter((s) => s.status === STATUS.RETURNED).length,
    received: students.filter((s) => s.status === STATUS.RECEIVED).length
  };
  return counts;
}

// Initial state: Database with 3 pending students
let mockDb = normalizeDatabase({
  version: "2.0.0",
  lastUpdated: new Date().toISOString(),
  settings: { operatorName: "Admin Officer" },
  students: [
    {
      id: "stud-01",
      serialNumber: 1,
      studentId: "IU04-0322-0001",
      name: "Ahmed Raza",
      program: "BSCS",
      applyOn: "2026-11-01",
      status: STATUS.PENDING,
      documentStatus: DOCUMENT_STATUS.NOT_UPLOADED,
      caseReady: null,
      documentsList: [],
      activityHistory: []
    },
    {
      id: "stud-02",
      serialNumber: 2,
      studentId: "IU04-0322-0002",
      name: "Fatima Noor",
      program: "BBA",
      applyOn: "2026-11-02",
      status: STATUS.PENDING,
      documentStatus: DOCUMENT_STATUS.SUBMITTED,
      documentSubmittedAt: "2026-11-02T10:00:00.000Z",
      documentsList: [{ fileName: "EDP_Transcript.pdf" }, { fileName: "Exam_Transcript.pdf" }],
      caseReady: null,
      activityHistory: []
    },
    {
      id: "stud-03",
      serialNumber: 3,
      studentId: "IU04-0322-0003",
      name: "Zainab Ali",
      program: "BSSE",
      applyOn: "2026-11-03",
      status: STATUS.PENDING,
      documentStatus: DOCUMENT_STATUS.PARTIALLY_UPLOADED,
      documentsList: [{ fileName: "Matric_Marksheet.pdf" }],
      caseReady: null,
      activityHistory: []
    }
  ],
  history: [],
  notifications: []
});

console.log("\n[Check Initial Counts]");
let initialCounts = calculateMockStats(mockDb.students);
assert.equal(initialCounts.total, 3);
assert.equal(initialCounts.pending, 3);
assert.equal(initialCounts.ready, 0);
console.log("  ✓ Initial State: Total = 3, Pending = 3, Ready = 0");

// 1. Mark Ready with no documents
console.log("\n[Test 1] Scenario B: Mark Ready with NO documents uploaded");
const s1 = mockDb.students.find((s) => s.id === "stud-01");
assert.equal(WorkflowService.canMarkReady(s1), true, "Pending student must be eligible for Ready");
const res1 = WorkflowService.markCaseReady(s1, "Admin Officer");
assert.equal(res1.ok, true);
assert.equal(res1.student.status, STATUS.READY);
assert.equal(res1.student.documentStatus, DOCUMENT_STATUS.NOT_UPLOADED, "Document status must remain Not Uploaded");
assert.ok(res1.student.caseReady, "caseReady timestamp must be recorded");
// Update DB
mockDb.students = mockDb.students.map((s) => (s.id === s1.id ? res1.student : s));
console.log("  ✓ Case moved to Case Ready successfully without documents.");
console.log("  ✓ Document Status correctly preserved as 'Not Uploaded'.");

// 2. Mark Ready with all documents
console.log("\n[Test 2] Scenario A: Mark Ready with ALL documents uploaded");
const s2 = mockDb.students.find((s) => s.id === "stud-02");
assert.equal(WorkflowService.canMarkReady(s2), true);
const res2 = WorkflowService.markCaseReady(s2, "Admin Officer");
assert.equal(res2.ok, true);
assert.equal(res2.student.status, STATUS.READY);
assert.equal(res2.student.documentStatus, DOCUMENT_STATUS.SUBMITTED, "Document status must remain Submitted");
assert.equal(res2.student.documentsList.length, 2);
assert.ok(res2.student.caseReady);
mockDb.students = mockDb.students.map((s) => (s.id === s2.id ? res2.student : s));
console.log("  ✓ Case moved to Case Ready with existing documents intact.");

// 3. Mark Ready with partially uploaded documents
console.log("\n[Test 3] Mark Ready with PARTIALLY uploaded documents");
const s3 = mockDb.students.find((s) => s.id === "stud-03");
assert.equal(WorkflowService.canMarkReady(s3), true);
const res3 = WorkflowService.markCaseReady(s3, "Admin Officer");
assert.equal(res3.ok, true);
assert.equal(res3.student.status, STATUS.READY);
assert.equal(res3.student.documentStatus, DOCUMENT_STATUS.PARTIALLY_UPLOADED);
assert.equal(res3.student.documentsList.length, 1);
assert.ok(res3.student.caseReady);
mockDb.students = mockDb.students.map((s) => (s.id === s3.id ? res3.student : s));
console.log("  ✓ Case moved to Case Ready with partially uploaded documents preserved.");

// 4. Upload documents after marking Ready
console.log("\n[Test 4] Upload documents AFTER marking Ready (stud-01)");
const readyStudent = mockDb.students.find((s) => s.id === "stud-01");
assert.equal(readyStudent.status, STATUS.READY);
assert.equal(readyStudent.documentStatus, DOCUMENT_STATUS.NOT_UPLOADED);

const updatedWithDocs = WorkflowService.updateStudentDocuments(readyStudent, {
  documentStatus: DOCUMENT_STATUS.SUBMITTED,
  folderName: "IU04-0322-0001_Ahmed_Raza",
  finalPdfUrl: "/api/documents/IU04-0322-0001_Ahmed_Raza/final-pdf",
  documents: [
    { fileName: "EDP_Transcript.pdf", category: "Transcripts" },
    { fileName: "Exam_Transcript.pdf", category: "Transcripts" },
    { fileName: "Consolidated_Clearance.pdf", category: "Consolidated" }
  ]
}, "Admin Officer");

// Verify that workflow status did not reset and no duplicate created
assert.equal(updatedWithDocs.id, "stud-01");
assert.equal(updatedWithDocs.status, STATUS.READY, "Workflow status must remain Case Ready after later upload");
assert.equal(updatedWithDocs.documentStatus, DOCUMENT_STATUS.SUBMITTED);
assert.equal(updatedWithDocs.documentsList.length, 3);
assert.ok(updatedWithDocs.caseReady, "caseReady timestamp must be preserved");

mockDb.students = mockDb.students.map((s) => (s.id === "stud-01" ? updatedWithDocs : s));
console.log("  ✓ Documents uploaded later: status retained as 'Case Ready', files attached cleanly.");

// 5. Refresh application / reload database simulation
console.log("\n[Test 5] Refresh & LocalStorage reload simulation");
const serialized = JSON.stringify(mockDb);
const reloadedDb = normalizeDatabase(JSON.parse(serialized));
assert.equal(reloadedDb.students.length, 3);
const reloadedS1 = reloadedDb.students.find((s) => s.id === "stud-01");
assert.equal(reloadedS1.status, STATUS.READY);
assert.equal(reloadedS1.documentStatus, DOCUMENT_STATUS.SUBMITTED);
assert.equal(reloadedS1.documentsList.length, 3);
console.log("  ✓ Database persisted and reloaded cleanly with zero state corruption.");

// 6. Verify correct Pending Cases count
console.log("\n[Test 6] Verify Pending Cases count");
const pendingCount = reloadedDb.students.filter((s) => s.status === STATUS.PENDING).length;
assert.equal(pendingCount, 0, "All 3 students were marked ready, so Pending Cases must be 0");
console.log(`  ✓ Pending Cases count correctly reduced to: ${pendingCount}`);

// 7. Verify correct Case Ready count
console.log("\n[Test 7] Verify Case Ready count");
const readyCount = reloadedDb.students.filter((s) => s.status === STATUS.READY).length;
assert.equal(readyCount, 3, "All 3 students are now in Case Ready");
console.log(`  ✓ Case Ready count correctly increased to: ${readyCount}`);

// 8. Verify dashboard metrics
console.log("\n[Test 8] Verify Dashboard metrics calculation");
const updatedMetrics = calculateMockStats(reloadedDb.students);
assert.equal(updatedMetrics.total, 3);
assert.equal(updatedMetrics.pending, 0);
assert.equal(updatedMetrics.ready, 3);
assert.equal(updatedMetrics.sent, 0);
assert.equal(updatedMetrics.returned, 0);
assert.equal(updatedMetrics.received, 0);
console.log("  ✓ Dashboard metrics calculation matches updated state exactly:", updatedMetrics);

// 9. Verify workflow history and timestamps
console.log("\n[Test 9] Verify Workflow history and timestamps");
assert.ok(reloadedS1.activityHistory.length >= 2);
const readyHistory = reloadedS1.activityHistory.find((h) => h.action === "Case Ready");
assert.ok(readyHistory, "History must contain 'Case Ready' event");
assert.ok(readyHistory.timestamp, "History event must have ISO timestamp");
assert.equal(readyHistory.operator, "Admin Officer");

const docsHistory = reloadedS1.activityHistory.find((h) => h.action === "Documents Submitted");
assert.ok(docsHistory, "History must contain 'Documents Submitted' event from later upload");
console.log("  ✓ Case Ready & Documents Submitted history logged chronologically with timestamps.");

// 10. Verify no duplicate student records are created
console.log("\n[Test 10] Verify No Duplicate Student Records");
const studentIds = reloadedDb.students.map((s) => s.studentId);
const uniqueIds = new Set(studentIds);
assert.equal(uniqueIds.size, studentIds.length, "Zero duplicate student IDs must exist");
assert.equal(reloadedDb.students.length, 3, "Total student records remains strictly 3");
console.log("  ✓ Unique student records confirmed: zero duplicates generated.");

console.log("\n======================================================================");
console.log("  ALL 10 OPTIONAL DOCUMENT & MARK READY TESTS PASSED (100% SUCCESS)! ");
console.log("======================================================================\n");
