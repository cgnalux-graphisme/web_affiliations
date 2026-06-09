import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const H = 842;
const py = (dy) => H - dy;
const BLACK = rgb(0, 0, 0);
const FONT_SIZE = 9;

function drawDigit(ctx, digit, x, displayY, size = FONT_SIZE) {
  ctx.page.drawText(digit, { x, y: py(displayY), size, font: ctx.font, color: BLACK });
}

function drawNiss(ctx, niss, startX, displayY) {
  const d = niss.replace(/\D/g, "").slice(0, 11);
  // Groups: 6 + 3 + 2 with separators at specific offsets
  const offsets = [
    0, 14, 28, 42, 56, 70, // 6 birth date digits
    88, 102, 116, // 3 serial after /
    134, 148, // 2 check after -
  ];
  for (let i = 0; i < d.length && i < offsets.length; i++) {
    drawDigit(ctx, d[i], startX + offsets[i], displayY);
  }
}

function drawDateBoxes(ctx, date, startX, displayY, yearSecondLine = false) {
  const parts = date.split("/");
  if (parts.length !== 3) return;
  const [dd, mm, yyyy] = parts;
  const dayXs = [startX, startX + 16];
  const monthXs = [startX + 44, startX + 60];
  const year1Xs = [startX + 88, startX + 104];
  const year2Xs = [216, 232]; // second line for last 2 year digits

  dd.padStart(2, "0").split("").forEach((c, i) => drawDigit(ctx, c, dayXs[i], displayY));
  mm.padStart(2, "0").split("").forEach((c, i) => drawDigit(ctx, c, monthXs[i], displayY));
  yyyy.padStart(4, "0").slice(0, 2).split("").forEach((c, i) => drawDigit(ctx, c, year1Xs[i], displayY));
  if (yearSecondLine) {
    yyyy.padStart(4, "0").slice(2, 4).split("").forEach((c, i) => drawDigit(ctx, c, year2Xs[i], displayY + 10));
  } else {
    yyyy.padStart(4, "0").slice(2, 4).split("").forEach((c, i) => drawDigit(ctx, c, year1Xs[i] + 32, displayY));
  }
}

function chk(ctx, checked, x, displayY) {
  if (!checked) return;
  ctx.page.drawText("X", { x: x + 1, y: py(displayY) + 1, size: 8, font: ctx.bold, color: BLACK });
}

const bytes = fs.readFileSync(path.join(__dirname, "../public/c3-2.pdf"));
const doc = await PDFDocument.load(bytes);
const font = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const ctx = { page: doc.getPage(0), font, bold };

// Name
ctx.page.drawText("Jean DUPONT", { x: 220, y: py(190), size: 9, font, color: BLACK });

// NISS - try startX=391
drawNiss(ctx, "85041212345", 391, 242);

// Date début
drawDateBoxes(ctx, "15/03/2026", 468, 324, true);

// Type
chk(ctx, true, 216, 369); // Travailleur

// Signature date
drawDateBoxes(ctx, "09/06/2026", 262, 547, false);

const out = await doc.save();
fs.writeFileSync(path.join(__dirname, "../public/c3-2-test.pdf"), out);
console.log("Written c3-2-test.pdf");
