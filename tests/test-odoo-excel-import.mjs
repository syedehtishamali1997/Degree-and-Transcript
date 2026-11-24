import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ExcelService, splitCombinedStudent, parseExcelDate } from "../src/services/ExcelService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log("=== Testing ExcelService Odoo & Template Parsing ===");

  // Test 1: Helper unit tests
  console.log("\n[Test 1] splitCombinedStudent tests:");
  const test1 = splitCombinedStudent("IU04-0322-0490 - Syeda Yusra Erum");
  assert.equal(test1.studentId, "IU04-0322-0490");
  assert.equal(test1.name, "Syeda Yusra Erum");
  console.log("  ✓ Standard hyphen delimiter passed");

  const test2 = splitCombinedStudent("IU04-0321-0109 – Muhammad Abdullah Ibn E Saleem");
  assert.equal(test2.studentId, "IU04-0321-0109");
  assert.equal(test2.name, "Muhammad Abdullah Ibn E Saleem");
  console.log("  ✓ En-dash delimiter passed");

  const test3 = splitCombinedStudent("IU04-0221-0125 Muhammad Shahwaiz Sohail");
  assert.equal(test3.studentId, "IU04-0221-0125");
  assert.equal(test3.name, "Muhammad Shahwaiz Sohail");
  console.log("  ✓ Space prefix without hyphen passed");

  // Test 2: parseExcelDate tests
  console.log("\n[Test 2] parseExcelDate tests:");
  const d1 = parseExcelDate(45973); // Excel serial for 2025-11-12
  assert.equal(d1, "2025-11-12");
  console.log("  ✓ Excel serial number 45973 -> 2025-11-12");

  const d2 = parseExcelDate("2026-11-20");
  assert.equal(d2, "2026-11-20");
  console.log("  ✓ ISO string 2026-11-20 passed");

  const d3 = parseExcelDate(new Date(2026, 10, 20));
  assert.equal(d3, "2026-11-20");
  console.log("  ✓ Date object passed");

  // Test 3: Real Odoo Excel file parsing
  console.log("\n[Test 3] Parsing actual university Odoo Excel file:");
  const odooPath = path.join(__dirname, "..", "Student Transcript (odoocms.student.transcript).xlsx");
  assert.ok(fs.existsSync(odooPath), "Odoo file must exist at project root");

  const odooBuffer = fs.readFileSync(odooPath);
  const result = await ExcelService.parseExcelFile(odooBuffer);
  console.log("  Sheet Name:", result.sheetName);
  console.log("  Header Row:", result.headerRow);
  console.log("  Total Data Rows:", result.totalRows);
  console.log("  Valid Records Extracted:", result.validCount);
  console.log("  Invalid Rows Skipped:", result.invalidCount);
  console.log("  Duplicate Student IDs within file:", result.duplicateCount);
  console.log("  Missing Student IDs:", result.missingIdCount);
  console.log("  Missing Names:", result.missingNameCount);
  console.log("  Missing Programs:", result.missingProgCount);
  console.log("  Missing Dates:", result.missingDateCount);

  assert.equal(result.sheetName, "Sheet1");
  assert.equal(result.headerRow, 1);
  assert.equal(result.totalRows, 1087);
  assert.equal(result.validCount, 1085);
  assert.equal(result.invalidCount, 2);
  assert.equal(result.duplicateCount, 56);
  assert.equal(result.missingIdCount, 2);
  assert.equal(result.missingNameCount, 0);

  // Check first student record
  const first = result.rows[0];
  assert.equal(first.studentId, "IU04-0322-0490");
  assert.equal(first.name, "Syeda Yusra Erum");
  assert.equal(first.program, "AD(DM)-66-ASSOCIATE DEGREE IN DIGITAL MARKETING - FBA");
  assert.equal(first.applyOn, "2025-11-12");
  assert.equal(first.rawStatus, "Done");
  console.log("  ✓ First student record verified:", first.studentId, first.name, first.applyOn);

  // Check last student record
  const last = result.rows[result.rows.length - 1];
  assert.equal(last.studentId, "IU04-0122-1229");
  assert.equal(last.name, "Ayaz Ali");
  assert.equal(last.program, "BS(NURSING)-139-BACHELOR OF SCIENCE IN NURSING - FHS");
  assert.equal(last.applyOn, "2026-11-18");
  assert.equal(last.rawStatus, "Submit");
  console.log("  ✓ Last student record verified:", last.studentId, last.name, last.applyOn);

  // Verify the 2 invalid rows
  assert.equal(result.invalidRows.length, 2);
  assert.equal(result.invalidRows[0].excelRow, 739);
  assert.equal(result.invalidRows[1].excelRow, 1046);
  console.log("  ✓ Expected invalid rows (739, 1046) properly isolated");

  // Test 4: Standard template compatibility test
  console.log("\n[Test 4] Standard sample template compatibility test:");
  const sampleData = [
    ["S.No", "Student ID", "Student Name", "Program", "Apply On Date", "Notes"],
    [1, "IU04-0122-0001", "Muhammad Ahmed", "BSCS", "2026-11-01", "Degree clearance completed"],
    [2, "IU04-0122-0002", "Ayesha Khan", "BBA", "2026-11-02", "Transcript request"],
    [3, "IU04-0122-0003", "Zainab Fatima", "BSSE", "2026-11-03", "Urgent degree delivery"],
    [4, "IU04-0122-0004", "Hamza Ali", "MBA", "2026-11-04", "Regular clearance"]
  ];
  const XLSX = await import("xlsx");
  const wbSample = XLSX.utils.book_new();
  const wsSample = XLSX.utils.aoa_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(wbSample, wsSample, "Sample");
  const sampleResult = ExcelService.processWorkbook(wbSample);
  assert.equal(sampleResult.validCount, 4);
  assert.equal(sampleResult.invalidCount, 0);
  assert.equal(sampleResult.rows[0].studentId, "IU04-0122-0001");
  assert.equal(sampleResult.rows[0].name, "Muhammad Ahmed");
  assert.equal(sampleResult.rows[0].program, "BSCS");
  assert.equal(sampleResult.rows[0].applyOn, "2026-11-01");
  console.log("  ✓ Standard template parsed correctly (4 valid rows)");

  console.log("\n=== All Odoo Excel Import & Standard Template Tests Passed Successfully! ===");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
