import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

const data = new Uint8Array(fs.readFileSync(path.join(__dirname, "../public/c3-2.pdf")));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
const page = await doc.getPage(1);
const content = await page.getTextContent();

const H = 842;

for (const it of content.items) {
  const str = it.str;
  if (!str.includes("_") && str !== "\uf072" && !str.includes("Date :")) continue;
  const x = it.transform[4];
  const y = it.transform[5];
  const dy = Math.round(H - y);
  const charW = it.width / Math.max(str.length, 1);
  console.log(`\n"${str}" x=${x.toFixed(1)} dy=${dy} w=${it.width.toFixed(1)} charW=${charW.toFixed(2)}`);

  // Estimate each underscore pair position
  let cx = x;
  const parts = str.split(/(\s+|\/|-)/);
  for (const part of parts) {
    if (part === "/" || part === "-") {
      console.log(`  sep "${part}" at x=${cx.toFixed(1)}`);
      cx += part.length * charW;
    } else if (part.trim()) {
      const pairs = part.match(/__|./g) || [];
      for (const p of pairs) {
        if (p === "__") {
          console.log(`  box at x=${(cx + charW * 0.3).toFixed(1)}`);
          cx += 2 * charW;
        } else {
          cx += p.length * charW;
        }
      }
    } else if (part) {
      cx += part.length * charW;
    }
  }
}
