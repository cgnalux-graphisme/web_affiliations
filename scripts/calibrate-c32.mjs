import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const H = 842;
const py = (dy) => H - dy;

const bytes = fs.readFileSync(path.join(__dirname, "../public/c3-2.pdf"));
const doc = await PDFDocument.load(bytes);
const font = await doc.embedFont(StandardFonts.Helvetica);
const page = doc.getPage(0);

// Draw calibration grid and test positions
const testPoints = [
  { label: "nom@217,190", x: 217, dy: 190 },
  { label: "niss@350,242", x: 350, dy: 242 },
  { label: "date@450,324", x: 450, dy: 324 },
  { label: "date2@216,334", x: 216, dy: 334 },
  { label: "trav@216,369", x: 216, dy: 369 },
  { label: "appr@216,387", x: 216, dy: 387 },
  { label: "decl@216,467", x: 216, dy: 467 },
  { label: "sigdate@250,547", x: 250, dy: 547 },
  { label: "sig@425,547", x: 425, dy: 547 },
];

for (const p of testPoints) {
  page.drawText("X", { x: p.x, y: py(p.dy), size: 8, font, color: rgb(1, 0, 0) });
  page.drawText(p.label, { x: p.x, y: py(p.dy) - 10, size: 5, font, color: rgb(1, 0, 0) });
}

// Test NISS digit spacing along y=242
for (let i = 0; i < 11; i++) {
  page.drawText(String(i % 10), { x: 350 + i * 18, y: py(242), size: 9, font, color: rgb(0, 0, 1) });
}

// Test date boxes at y=324
const dateXs = [450, 468, 486, 510, 528, 546, 564, 582];
for (let i = 0; i < 8; i++) {
  page.drawText(String(i), { x: dateXs[i], y: py(324), size: 9, font, color: rgb(0, 0.5, 0) });
}

const out = await doc.save();
fs.writeFileSync(path.join(__dirname, "../public/c3-2-calibration.pdf"), out);
console.log("Written c3-2-calibration.pdf");
