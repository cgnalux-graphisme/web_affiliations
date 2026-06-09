import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

export interface C32Data {
  prenom: string;
  nom: string;
  niss: string;
  email: string;
  dateDebutChomage: string;
  typeDemandeur: "travailleur" | "apprenti" | "";
  declAffirme: boolean;
  dateSig: string;
  signature: string;
}

const H = 842;
const py = (dy: number) => H - dy;
const BLACK = rgb(0, 0, 0);
const FONT_SIZE = 9;
const CHECK_SIZE = 8;

// Positions extraites du modèle officiel c3-2.pdf (version 18.12.2024)
const POS = {
  name: { x: 218, dy: 191 },
  niss: {
    dy: 243,
  },
  dateDebut: {
    line1Dy: 324,
    line2Dy: 334,
  },
  checkbox: {
    travailleur: { x: 217, dy: 370 },
    apprenti: { x: 217, dy: 388 },
  },
  dateSig: { dy: 548 },
  signature: { x: 400, dy: 552, width: 145, height: 38 },
} as const;

// Centres des cases NISS mesurés sur le PDF source
const NISS_BOX_X = [364, 376, 389, 401, 414, 426, 447, 460, 472, 493, 505];

const DATE_DEBUT_PREFIX = "Je demande des allocations de chômage temporaire à partir du ";
const DATE_SIG_PREFIX = "Date : ";
const DATE_LINE_ORIGIN_X = 216;
const DATE_DEBUT_LINE2_X = [220, 233];

interface DrawCtx {
  page: ReturnType<PDFDocument["getPage"]>;
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
}

function drawDigit(ctx: DrawCtx, digit: string, x: number, displayY: number, size = FONT_SIZE) {
  ctx.page.drawText(digit, { x, y: py(displayY), size, font: ctx.font, color: BLACK });
}

function chk(ctx: DrawCtx, checked: boolean, x: number, displayY: number) {
  if (!checked) return;
  ctx.page.drawText("X", { x, y: py(displayY), size: CHECK_SIZE, font: ctx.bold, color: BLACK });
}

function fmtDate(d: string) {
  if (!d) return "";
  if (d.includes("-") && d.length === 10) {
    const [y, m, dd] = d.split("-");
    return `${dd}/${m}/${y}`;
  }
  return d;
}

function parseDateParts(date: string): [string, string, string] | null {
  const parts = fmtDate(date).split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy) return null;
  return [dd.padStart(2, "0"), mm.padStart(2, "0"), yyyy.padStart(4, "0")];
}

function drawDigitsInBoxes(ctx: DrawCtx, digits: string, boxes: number[], displayY: number) {
  const chars = digits.replace(/\D/g, "");
  for (let i = 0; i < chars.length && i < boxes.length; i++) {
    drawDigit(ctx, chars[i], boxes[i], displayY);
  }
}

/** Calcule les X des cases date à partir de la police de remplissage (évite le chevauchement avec le texte fixe). */
function computePairedDateBoxes(
  ctx: DrawCtx,
  prefix: string,
  pairCount: number,
  opts?: { originX?: number; safetyRight?: number; digitOffset?: number },
) {
  const originX = opts?.originX ?? DATE_LINE_ORIGIN_X;
  const safetyRight = opts?.safetyRight ?? 5;
  const digitOffset = opts?.digitOffset ?? 3;
  const pairW = ctx.font.widthOfTextAtSize("__ ", FONT_SIZE);
  const slashGap = ctx.font.widthOfTextAtSize("/ ", FONT_SIZE);

  let x = originX + ctx.font.widthOfTextAtSize(prefix, FONT_SIZE) + safetyRight;
  const boxes: number[] = [];

  for (let i = 0; i < pairCount; i++) {
    boxes.push(x + digitOffset);
    x += pairW;
    if (i % 2 === 1 && i < pairCount - 1) x += slashGap;
  }

  return boxes;
}

function drawNissBoxes(ctx: DrawCtx, niss: string) {
  drawDigitsInBoxes(ctx, niss.replace(/\D/g, "").slice(0, 11), NISS_BOX_X, POS.niss.dy);
}

/** Date début : DD/MM/AA sur ligne 1, AA sur ligne 2 */
function drawDateDebutChomage(ctx: DrawCtx, date: string) {
  const parts = parseDateParts(date);
  if (!parts) return;
  const [dd, mm, yyyy] = parts;
  const line1 = dd + mm + yyyy.slice(0, 2);
  const line2 = yyyy.slice(2, 4);

  const line1Boxes = computePairedDateBoxes(ctx, DATE_DEBUT_PREFIX, 6, { safetyRight: 6 });
  drawDigitsInBoxes(ctx, line1, line1Boxes, POS.dateDebut.line1Dy);
  drawDigitsInBoxes(ctx, line2, DATE_DEBUT_LINE2_X, POS.dateDebut.line2Dy);
}

function drawDateSignature(ctx: DrawCtx, date: string) {
  const parts = parseDateParts(date);
  if (!parts) return;
  const [dd, mm, yyyy] = parts;
  const sigBoxes = computePairedDateBoxes(ctx, DATE_SIG_PREFIX, 8, { safetyRight: 3 });
  drawDigitsInBoxes(ctx, dd + mm + yyyy, sigBoxes, POS.dateSig.dy);
}

function fillPage(ctx: DrawCtx, d: C32Data) {
  const nomComplet = [d.prenom.trim(), d.nom.trim().toUpperCase()].filter(Boolean).join(" ");
  if (nomComplet) {
    ctx.page.drawText(nomComplet, {
      x: POS.name.x,
      y: py(POS.name.dy),
      size: FONT_SIZE,
      font: ctx.font,
      color: BLACK,
    });
  }

  drawNissBoxes(ctx, d.niss);
  drawDateDebutChomage(ctx, d.dateDebutChomage);

  chk(ctx, d.typeDemandeur === "travailleur", POS.checkbox.travailleur.x, POS.checkbox.travailleur.dy);
  chk(ctx, d.typeDemandeur === "apprenti", POS.checkbox.apprenti.x, POS.checkbox.apprenti.dy);

  drawDateSignature(ctx, d.dateSig);
}

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as C32Data;

    const pdfPath = path.join(process.cwd(), "public", "c3-2.pdf");
    const pdfBytes = await readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const ctx: DrawCtx = { page: pdfDoc.getPage(0), font, bold };

    fillPage(ctx, data);

    if (data.signature?.startsWith("data:image/png")) {
      const sigBytes = Buffer.from(data.signature.split(",")[1], "base64");
      const sigImage = await pdfDoc.embedPng(sigBytes);
      const { x, dy, width, height } = POS.signature;
      ctx.page.drawImage(sigImage, { x, y: py(dy + height), width, height });
    }

    const filledBytes = await pdfDoc.save();
    const base64 = Buffer.from(filledBytes).toString("base64");

    return NextResponse.json({ pdfBase64: base64 });
  } catch (err) {
    console.error("[fill-c3-2]", err);
    return NextResponse.json({ error: "Erreur lors du remplissage du PDF." }, { status: 500 });
  }
}
