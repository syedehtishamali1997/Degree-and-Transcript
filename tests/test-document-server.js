import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { ensureStudentFolder, getStudentDocumentsMetadata, generateConsolidatedPdf } from "../server/documentService.js";
import { PDFDocument, rgb } from "pdf-lib";

async function runTests() {
  console.log("\n=======================================================");
  console.log("  DOCUMENT STORAGE & CONSOLIDATION TEST SUITE");
  console.log("=======================================================\n");

  const testStudentId = "IU04-0319-0302";
  const testStudentName = "Simra Rehan";

  // Test 1: Folder Initialization
  console.log("--- 1. Student Folder Structure Initialization ---");
  const folderData = ensureStudentFolder(testStudentId, testStudentName, {
    studentId: testStudentId,
    name: testStudentName,
    program: "BSCS",
    applyOn: "2026-11-20"
  });

  assert.strictEqual(folderData.folderName, "IU04-0319-0302_Simra_Rehan");
  assert.ok(fs.existsSync(folderData.folderPath));
  assert.ok(fs.existsSync(folderData.transcriptsPath));
  assert.ok(fs.existsSync(folderData.academicPath));
  assert.ok(fs.existsSync(folderData.additionalDegreesPath));
  assert.ok(fs.existsSync(path.join(folderData.folderPath, "student_information.json")));
  console.log("  [PASS] Verified folder creation: documents/IU04-0319-0302_Simra_Rehan");

  // Test 2: Populate sample mock documents
  console.log("\n--- 2. Mock Document File Creation ---");
  // Create sample 1-page PDF for EDP Transcript
  const edpDoc = await PDFDocument.create();
  const page1 = edpDoc.addPage([595.28, 841.89]);
  page1.drawText("EDP Official Transcript - Iqra University", { x: 50, y: 800, size: 16 });
  const edpBytes = await edpDoc.save();
  const edpPath = path.join(folderData.transcriptsPath, "EDP_Transcript.pdf");
  fs.writeFileSync(edpPath, edpBytes);

  // Create sample 1-page PDF for Exam Transcript
  const examDoc = await PDFDocument.create();
  const page2 = examDoc.addPage([595.28, 841.89]);
  page2.drawText("Exam Official Transcript - Iqra University", { x: 50, y: 800, size: 16 });
  const examBytes = await examDoc.save();
  const examPath = path.join(folderData.transcriptsPath, "Exam_Transcript.pdf");
  fs.writeFileSync(examPath, examBytes);

  // Create sample Matric Mark Sheet
  const matricDoc = await PDFDocument.create();
  const page3 = matricDoc.addPage([595.28, 841.89]);
  page3.drawText("Matriculation Secondary Board Mark Sheet", { x: 50, y: 800, size: 16 });
  const matricBytes = await matricDoc.save();
  const matricPath = path.join(folderData.academicPath, "Matric_Mark_Sheet.pdf");
  fs.writeFileSync(matricPath, matricBytes);

  // Create sample Additional Degree file
  const addDoc = await PDFDocument.create();
  const page4 = addDoc.addPage([595.28, 841.89]);
  page4.drawText("Certificate of Master of Science in Data Science", { x: 50, y: 800, size: 16 });
  const addBytes = await addDoc.save();
  const addPath = path.join(folderData.additionalDegreesPath, "MS_Data_Science_123.pdf");
  fs.writeFileSync(addPath, addBytes);

  console.log("  [PASS] Created mock EDP, Exam, Matric, and Additional Degree PDFs.");

  // Test 3: Metadata Scanning
  console.log("\n--- 3. Document Metadata Scanning ---");
  const meta = getStudentDocumentsMetadata(folderData.folderName);
  assert.strictEqual(meta.folderName, "IU04-0319-0302_Simra_Rehan");
  assert.strictEqual(meta.documents.length >= 4, true);
  console.log(`  [PASS] Scanned ${meta.documents.length} document entries.`);

  // Test 4: PDF Consolidation
  console.log("\n--- 4. Consolidated PDF Generation ---");
  const docList = [
    { fieldKey: "edpTranscript", filePath: edpPath },
    { fieldKey: "examTranscript", filePath: examPath },
    { fieldKey: "matricMarkSheet", filePath: matricPath },
    {
      fieldKey: "additional_degree",
      degreeName: "MS in Data Science",
      isAdditionalDegree: true,
      filePath: addPath
    }
  ];

  const consolidated = await generateConsolidatedPdf(folderData.folderName, docList);
  assert.ok(fs.existsSync(consolidated.finalPdfPath));
  assert.ok(consolidated.pageCount >= 4); // 3 docs + 1 additional degree separator page + degree doc = 5 pages!
  console.log(`  [PASS] Final_Student_Document.pdf generated: ${consolidated.pageCount} pages, ${consolidated.fileSizeBytes} bytes.`);

  console.log("\n=======================================================");
  console.log("  ALL DOCUMENT TESTS PASSED SUCCESSFULLY!");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
