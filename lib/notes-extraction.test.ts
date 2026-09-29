import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { ErreurNote, extraireTexteNote, formatNote, nettoyerTexte, nomArchive } from "./notes-extraction";

// Notes fictives, fabriquées dans le test.
const PHRASE = "La FGTB demande une revalorisation des salaires minimums dans la commission paritaire 124. ";

async function pdfAvec(texte: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const police = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  texte.match(/.{1,90}(\s|$)/g)?.forEach((ligne, i) => page.drawText(ligne.trim(), { x: 40, y: 800 - i * 14, size: 9, font: police }));
  return doc.save();
}

async function docxAvec(texte: string): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Note FGTB 26I107F</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">${texte}</w:t></w:r></w:p></w:body></w:document>`
  );
  return zip.generateAsync({ type: "uint8array" });
}

describe("notes-extraction", () => {
  it("reconnaît le format par la signature, pas seulement l'extension", () => {
    expect(formatNote("note.pdf", new TextEncoder().encode("%PDF-1.7"))).toBe("pdf");
    expect(formatNote("note.docx", new Uint8Array([0x50, 0x4b, 3, 4]))).toBe("docx");
    expect(formatNote("note.pdf", new Uint8Array([0x50, 0x4b, 3, 4]))).toBeNull();
    expect(formatNote("note.txt", new TextEncoder().encode("%PDF"))).toBeNull();
  });

  it("extrait le texte d'un .docx", async () => {
    const { texte, format } = await extraireTexteNote("Note.docx", await docxAvec(PHRASE.repeat(5)));
    expect(format).toBe("docx");
    expect(texte).toContain("Note FGTB 26I107F");
    expect(texte).toContain("commission paritaire 124");
  });

  it("extrait le texte d'un .pdf", async () => {
    const { texte, format } = await extraireTexteNote("note.pdf", await pdfAvec(PHRASE.repeat(5)));
    expect(format).toBe("pdf");
    expect(texte).toContain("commission paritaire 124");
  });

  it("refuse un .doc, une note vide et un PDF abîmé", async () => {
    await expect(extraireTexteNote("vieux.doc", new Uint8Array([0xd0, 0xcf]))).rejects.toThrow(/\.doc/);
    await expect(extraireTexteNote("court.pdf", await pdfAvec("Trop court."))).rejects.toBeInstanceOf(ErreurNote);
    await expect(extraireTexteNote("casse.pdf", new TextEncoder().encode("%PDF-1.7 n'importe quoi"))).rejects.toBeInstanceOf(
      ErreurNote
    );
  });

  it("nettoie le texte et le nom d'archive", () => {
    expect(nettoyerTexte("a  b\r\n\r\n\r\n c ")).toBe("a b\n\nc");
    expect(nomArchive("Note FGTB 26I107F (version déf).docx", "docx")).toBe("Note-FGTB-26I107F-version-def.docx");
  });
});
