import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "node:fs";

async function testPdfLib() {
  console.log("Testing pdf-lib functionality...");

  // 1. Create a blank PDF with title
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4 size
  page1.drawText("CaseTrack Document System - Test Page", {
    x: 50,
    y: 780,
    size: 20,
    font,
    color: rgb(0.435, 0.258, 0.757) // Purple #6f42c1
  });

  // 2. Test embedding a 1x1 dummy PNG to verify image embedding
  // 1x1 transparent PNG base64
  const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const pngBytes = Buffer.from(pngBase64, "base64");
  const embeddedPng = await pdfDoc.embedPng(pngBytes);
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  page2.drawImage(embeddedPng, {
    x: 100,
    y: 400,
    width: 200,
    height: 200
  });

  const pdfBytes = await pdfDoc.save();
  console.log(`[PASS] pdf-lib created and saved PDF successfully (${pdfBytes.length} bytes).`);
}

testPdfLib().catch((err) => {
  console.error("[FAIL] pdf-lib test failed:", err);
  process.exit(1);
});
