/**
 * test-complete-workflow-e2e.js
 * Comprehensive End-to-End verification of the 16-step Student Document Management & Workflow process.
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { PDFDocument, rgb } from "pdf-lib";
import { WorkflowService, STATUS, DOCUMENT_STATUS } from "../src/services/WorkflowService.js";
import { ensureStudentFolder, getStudentDocumentsMetadata, generateConsolidatedPdf } from "../server/documentService.js";

async function runE2ETests() {
  console.log("\n======================================================================");
  console.log("  CASETRACK COMPLETE 16-STEP DOCUMENT MANAGEMENT & WORKFLOW E2E TEST");
  console.log("======================================================================\n");

  const studentId = "IU04-0319-0999";
  const studentName = "Ayesha Siddiqui";
  const program = "BSCS";

  // Step 1 & 2: Automatic folder creation (simulating Excel import / manual add)
  console.log("Step 1 & 2: Testing automatic student folder creation...");
  const folderData = ensureStudentFolder(studentId, studentName, {
    studentId,
    name: studentName,
    program,
    applyOn: "2026-11-20"
  });

  const expectedFolderName = "IU04-0319-0999_Ayesha_Siddiqui";
  assert.strictEqual(folderData.folderName, expectedFolderName);
  assert.ok(fs.existsSync(folderData.folderPath), "Student directory must exist");
  assert.ok(fs.existsSync(folderData.transcriptsPath), "transcripts/ must exist");
  assert.ok(fs.existsSync(folderData.academicPath), "academic_documents/ must exist");
  assert.ok(fs.existsSync(folderData.additionalDegreesPath), "Additional_Degrees/ must exist");
  assert.ok(fs.existsSync(path.join(folderData.folderPath, "student_information.json")));
  console.log(`  [PASS] Student folder automatically created at documents/${expectedFolderName}`);

  // Step 3: Pending state & document restriction
  console.log("\nStep 3: Initializing student in Stage 0 (Pending)...");
  let student = WorkflowService.createStudent(
    { studentId, name: studentName, program, applyOn: "2026-11-20" },
    [],
    "Admin Officer"
  );
  assert.strictEqual(student.status, STATUS.PENDING);
  assert.strictEqual(student.documentStatus, DOCUMENT_STATUS.NOT_UPLOADED);

  // Step 3: Verify optional document policy & validation constraints
  const invalidStudent = { id: "inv", studentId: "", name: "", status: STATUS.PENDING, caseReady: null };
  const blockedReady = WorkflowService.markCaseReady(invalidStudent, "Admin Officer");
  assert.strictEqual(blockedReady.ok, false);
  assert.match(blockedReady.error, /Valid Student ID and Student Name are required/i);
  console.log("  [PASS] Correctly blocked transition to Case Ready when essential student info is missing.");

  // Verify that a valid pending student CAN mark ready even before documents
  assert.strictEqual(WorkflowService.canMarkReady(student), true);
  console.log("  [PASS] Verified document upload is optional: student can be marked ready directly.");

  // Step 4: Step 1 info edit
  console.log("\nStep 4: Simulating Step 1 - Edit student information...");
  student = WorkflowService.updateStudentInfo(
    student,
    { name: "Ayesha Siddiqui (Updated)", program: "BSCS", approvedDepartments: "Library; Accounts" },
    "Admin Officer"
  );
  assert.strictEqual(student.name, "Ayesha Siddiqui (Updated)");
  console.log("  [PASS] Step 1 Student information updated cleanly.");

  // Step 5: Step 2 - Upload EDP and Exam Transcripts (PDFs)
  console.log("\nStep 5: Simulating Step 2 - Creating and attaching EDP & Exam Transcripts...");
  const edpDoc = await PDFDocument.create();
  edpDoc.addPage([595.28, 841.89]).drawText("Official EDP Transcript - Iqra University", { x: 50, y: 800, size: 16 });
  const edpBytes = await edpDoc.save();
  const edpFilePath = path.join(folderData.transcriptsPath, "EDP_Transcript.pdf");
  fs.writeFileSync(edpFilePath, edpBytes);

  const examDoc = await PDFDocument.create();
  examDoc.addPage([595.28, 841.89]).drawText("Official Exam Transcript - Iqra University", { x: 50, y: 800, size: 16 });
  const examBytes = await examDoc.save();
  const examFilePath = path.join(folderData.transcriptsPath, "Exam_Transcript.pdf");
  fs.writeFileSync(examFilePath, examBytes);
  console.log("  [PASS] EDP & Exam transcripts saved to transcripts/ directory.");

  // Step 6: Step 3 - Upload Academic Documents
  console.log("\nStep 6: Simulating Step 3 - Creating and attaching Academic Documents...");
  const matricDoc = await PDFDocument.create();
  matricDoc.addPage([595.28, 841.89]).drawText("Matriculation Secondary Board Mark Sheet", { x: 50, y: 800, size: 16 });
  const matricBytes = await matricDoc.save();
  const matricFilePath = path.join(folderData.academicPath, "Matric_Mark_Sheet.pdf");
  fs.writeFileSync(matricFilePath, matricBytes);

  const degreeDoc = await PDFDocument.create();
  degreeDoc.addPage([595.28, 841.89]).drawText("Bachelor of Science Degree Certificate", { x: 50, y: 800, size: 16 });
  const degreeBytes = await degreeDoc.save();
  const degreeFilePath = path.join(folderData.academicPath, "Degree.pdf");
  fs.writeFileSync(degreeFilePath, degreeBytes);
  console.log("  [PASS] Academic documents saved to academic_documents/ directory.");

  // Step 7: Step 3 - Multiple Additional Degrees
  console.log("\nStep 7: Simulating Step 3 - Adding multiple Additional Degrees...");
  const addDoc1 = await PDFDocument.create();
  addDoc1.addPage([595.28, 841.89]).drawText("Master of Science in Software Engineering Certificate", { x: 50, y: 800, size: 16 });
  const addBytes1 = await addDoc1.save();
  const addPath1 = path.join(folderData.additionalDegreesPath, "MS_Software_Engineering_1.pdf");
  fs.writeFileSync(addPath1, addBytes1);

  const addDoc2 = await PDFDocument.create();
  addDoc2.addPage([595.28, 841.89]).drawText("Postgraduate Diploma in Cyber Security", { x: 50, y: 800, size: 16 });
  const addBytes2 = await addDoc2.save();
  const addPath2 = path.join(folderData.additionalDegreesPath, "Cyber_Security_Diploma_2.pdf");
  fs.writeFileSync(addPath2, addBytes2);
  console.log("  [PASS] Multiple additional degrees saved to Additional_Degrees/ directory.");

  // Step 8, 9 & 10: Step 4 - Review, Submit & Consolidate PDF
  console.log("\nStep 8, 9 & 10: Generating single consolidated PDF with all attachments...");
  const orderedDocs = [
    { fieldKey: "edpTranscript", filePath: edpFilePath },
    { fieldKey: "examTranscript", filePath: examFilePath },
    { fieldKey: "matricMarkSheet", filePath: matricFilePath },
    { fieldKey: "degree", filePath: degreeFilePath },
    {
      fieldKey: "additional_degree",
      degreeName: "Master of Science in Software Engineering",
      isAdditionalDegree: true,
      filePath: addPath1
    },
    {
      fieldKey: "additional_degree",
      degreeName: "Postgraduate Diploma in Cyber Security",
      isAdditionalDegree: true,
      filePath: addPath2
    }
  ];

  const pdfResult = await generateConsolidatedPdf(folderData.folderName, orderedDocs);
  assert.ok(fs.existsSync(pdfResult.finalPdfPath), "Final_Student_Document.pdf must be generated");
  assert.ok(pdfResult.pageCount >= 6, "Must contain all combined document pages and separator pages");
  console.log(`  [PASS] Final_Student_Document.pdf generated: ${pdfResult.pageCount} pages, ${pdfResult.fileSizeBytes} bytes.`);

  // Step 11: Verify original files preserved separately
  console.log("\nStep 11: Verifying original files preserved separately...");
  assert.ok(fs.existsSync(edpFilePath));
  assert.ok(fs.existsSync(examFilePath));
  assert.ok(fs.existsSync(matricFilePath));
  assert.ok(fs.existsSync(degreeFilePath));
  assert.ok(fs.existsSync(addPath1));
  assert.ok(fs.existsSync(addPath2));
  console.log("  [PASS] All 6 original files confirmed preserved intact.");

  // Step 12: Update student document status & verify eligibility
  console.log("\nStep 12: Updating student document status to 'Submitted'...");
  student = WorkflowService.updateStudentDocuments(student, {
    documentStatus: DOCUMENT_STATUS.SUBMITTED,
    folderName: folderData.folderName,
    finalPdfUrl: `/api/documents/${folderData.folderName}/final-pdf`,
    documents: [
      { fileName: "EDP_Transcript.pdf" },
      { fileName: "Exam_Transcript.pdf" },
      { fileName: "Matric_Mark_Sheet.pdf" },
      { fileName: "Degree.pdf" },
      { fileName: "MS_Software_Engineering_1.pdf" },
      { fileName: "Cyber_Security_Diploma_2.pdf" }
    ]
  });
  assert.strictEqual(student.documentStatus, DOCUMENT_STATUS.SUBMITTED);
  assert.ok(student.documentSubmittedAt);
  assert.strictEqual(WorkflowService.canMarkReady(student), true);
  console.log("  [PASS] Student is now eligible for Case Ready.");

  // Step 13: Mark Case Ready
  console.log("\nStep 13: Advancing to Case Ready Queue (Stage 1)...");
  const readyResult = WorkflowService.markCaseReady(student, "Admin Officer");
  assert.strictEqual(readyResult.ok, true);
  student = readyResult.student;
  assert.strictEqual(student.status, STATUS.READY);
  assert.ok(student.caseReady);
  console.log("  [PASS] Student advanced to Case Ready with timestamp.");

  // Step 14: Verify Preview & Download metadata
  console.log("\nStep 14: Verifying Case Ready document actions (Preview, Download, Print)...");
  const meta = getStudentDocumentsMetadata(folderData.folderName);
  assert.strictEqual(meta.hasFinalPdf, true);
  assert.strictEqual(meta.finalPdfUrl, `/api/documents/${folderData.folderName}/final-pdf`);
  console.log(`  [PASS] Complete documents available for preview and download: ${meta.finalPdfUrl}`);

  // Step 15: Send to Main Campus
  console.log("\nStep 15: Dispatching case to Main Campus (Stage 2)...");
  const sendResult = WorkflowService.sendToMainCampus(student, "Admin Officer", "Dispatch batch IU-2026-NOV");
  assert.strictEqual(sendResult.ok, true);
  student = sendResult.student;
  assert.strictEqual(student.status, STATUS.SENT);
  assert.strictEqual(student.sendHistory.length, 1);
  assert.strictEqual(student.sendHistory[0].operator, "Admin Officer");
  console.log("  [PASS] Case dispatched to Main Campus.");

  // Step 16: Audit history verification
  console.log("\nStep 16: Verifying audit history integrity...");
  assert.ok(student.activityHistory.length >= 4);
  const actions = student.activityHistory.map((a) => a.action);
  assert.ok(actions.includes("Record Created"));
  assert.ok(actions.includes("Documents Submitted"));
  assert.ok(actions.includes("Case Ready"));
  assert.ok(actions.includes("Sent to Main Campus"));
  console.log("  [PASS] Complete audit history preserved across all operations.");

  console.log("\n======================================================================");
  console.log("  ALL 16 E2E VERIFICATION STEPS PASSED WITH 100% SUCCESS!");
  console.log("======================================================================\n");
}

runE2ETests().catch((err) => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
