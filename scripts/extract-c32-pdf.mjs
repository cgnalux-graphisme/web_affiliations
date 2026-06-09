import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

const data = new Uint8Array(fs.readFileSync(path.join(__dirname, "../public/c3-2.pdf")));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
console.log("Pages:", doc.numPages);

for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const viewport = page.getViewport({ scale: 1 });
  console.log(`\n=== PAGE ${p} (${viewport.width} x ${viewport.height}) ===`);
  const content = await page.getTextContent();
  const items = content.items
    .map((it) => ({
      str: it.str,
      x: Math.round(it.transform[4]),
      y: Math.round(it.transform[5]),
      w: Math.round(it.width),
      h: Math.round(it.height),
    }))
  items.sort((a, b) => b.y - a.y || a.x - b.x);
  for (const it of items) {
    if (it.str.trim()) console.log(JSON.stringify(it));
  }
}
