import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument } from "pdf-lib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.join(__dirname, "../public/c3-2.pdf");

// Check AcroForm fields
const bytes = fs.readFileSync(pdfPath);
const doc = await PDFDocument.load(bytes);
const form = doc.getForm();
const fields = form.getFields();
console.log("AcroForm fields:", fields.length);
for (const f of fields) {
  console.log(f.getName(), f.constructor.name);
}

// Get page dimensions
const pages = doc.getPages();
const page = pages[0];
const { width, height } = page.getSize();
console.log("Page size:", width, "x", height);

// pdfjs for more detail - look for drawing operations / lines
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const data = new Uint8Array(bytes);
const pdfDoc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
const pdfPage = await pdfDoc.getPage(1);

// Get annotations
const annots = await pdfPage.getAnnotations();
console.log("\nAnnotations:", annots.length);
for (const a of annots) {
  console.log(JSON.stringify(a));
}

// operator list for rectangles near form fields
const ops = await pdfPage.getOperatorList();
console.log("\nOperator list fnArray length:", ops.fnArray.length);
