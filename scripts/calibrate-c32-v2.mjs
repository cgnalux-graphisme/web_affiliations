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

// Mesurer où commencent les underscores via largeur du préfixe
function prefixWidth(text, prefix) {
  return font.widthOfTextAtSize(prefix, 9);
}

const anchors = [
  { label: "nom", prefixes: [
    { prefix: "Prénom et nom ", x: 97, dy: 190 },
    { prefix: "", x: 217, dy: 190 },
  ]},
];

// NISS line starts at x=216, text at displayY=242 (pdfY 600)
const nissFull = "Numéro de Registre national (NISS) ";
const nissPrefixW = font.widthOfTextAtSize(nissFull, 9);
console.log("NISS prefix width:", nissPrefixW, "=> startX:", 216 + nissPrefixW);

// Each "__ " pair is roughly width of 2 underscores + space
// Measure "__ " width
const pairW = font.widthOfTextAtSize("__ ", 9);
const slashW = font.widthOfTextAtSize("/ ", 9);
const dashW = font.widthOfTextAtSize("- ", 9);
console.log("pairW:", pairW, "slashW:", slashW, "dashW:", dashW);

let x = 216 + nissPrefixW;
const nissOffsets = [];
for (let g = 0; g < 6; g++) { nissOffsets.push(x); x += pairW; }
x += slashW - pairW + pairW; // after /
for (let g = 0; g < 3; g++) { nissOffsets.push(x); x += pairW; }
x += dashW - pairW + pairW;
for (let g = 0; g < 2; g++) { nissOffsets.push(x); x += pairW; }
console.log("NISS digit X positions:", nissOffsets.map(v => Math.round(v)));

// Date début line
const datePrefix = "Je demande des allocations de chômage temporaire à partir du ";
const dateStartX = 216 + font.widthOfTextAtSize(datePrefix, 9);
console.log("Date début startX:", Math.round(dateStartX), "dy: 324");

// Date sig line
const sigPrefix = "Date : ";
const sigStartX = 216 + font.widthOfTextAtSize(sigPrefix, 9);
console.log("Date sig startX:", Math.round(sigStartX), "dy: 547");

// Draw test digits at computed positions
const niss = "85100246371";
nissOffsets.forEach((ox, i) => {
  if (niss[i]) page.drawText(niss[i], { x: ox + 2, y: py(242), size: 9, font, color: rgb(1, 0, 0) });
});

// Date 09/06/2026 - line1: dd mm yy(2), line2: yy(2)
const dateXs = [];
let dx = dateStartX;
for (let i = 0; i < 8; i++) {
  dateXs.push(dx);
  dx += pairW;
}
const dateVal = "09062026";
dateXs.forEach((ox, i) => {
  const dy = i < 6 ? 324 : 334;
  const idx = i < 6 ? i : i - 6 + 6;
  page.drawText(dateVal[i], { x: ox + 2, y: py(dy), size: 9, font, color: rgb(0, 0, 1) });
});

// Sig date all on one line
let sx = sigStartX;
for (let i = 0; i < 8; i++) {
  page.drawText(dateVal[i], { x: sx + 2, y: py(547), size: 9, font, color: rgb(0, 0.5, 0) });
  sx += pairW;
}

// Name
page.drawText("Frédéric BLANCHARD", { x: 217, y: py(190), size: 9, font, color: rgb(0.5, 0, 0.5) });

// Checkboxes
page.drawText("X", { x: 217, y: py(369), size: 8, font, color: rgb(1, 0, 0) });

const out = await doc.save();
fs.writeFileSync(path.join(__dirname, "../public/c3-2-calib-v2.pdf"), out);
console.log("Written c3-2-calib-v2.pdf");
