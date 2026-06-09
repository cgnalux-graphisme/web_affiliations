import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

const data = new Uint8Array(fs.readFileSync(path.join(__dirname, "../public/c3-2.pdf")));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
const page = await doc.getPage(1);

// Find underscore-only text segments and their positions
const content = await page.getTextContent();
const H = 842;
for (const it of content.items) {
  const str = it.str;
  if (str.includes("_") || str.includes("")) {
    const x = Math.round(it.transform[4]);
    const y = Math.round(it.transform[5]);
    const dy = H - y;
    console.log(JSON.stringify({ str: str.slice(0, 80), x, pdfY: y, displayY: dy, w: Math.round(it.width) }));
  }
}

// Character-level for NISS line
const nissItem = content.items.find((it) => it.str.includes("NISS"));
if (nissItem) {
  console.log("\nNISS full item:", nissItem.str);
  console.log("x:", nissItem.transform[4], "y:", nissItem.transform[5]);
}
