import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

// ── Types ────────────────────────────────────────────────────────────────────
export interface C1Data {
  niss: string; nom: string; prenom: string;
  dateNaissance: string; nationalite: string;
  rue: string; numero: string; boite: string;
  codePostal: string; commune: string; pays: string;
  email: string; telephone: string;
  // Motifs
  motifDemandeAlloc: boolean; motifDemandeAllocDate: string;
  motifFormationAlternance: "oui" | "non" | "";
  motifPremiereFois: boolean; motifApresInterruption: boolean;
  motifChangementOrganisme: boolean; motifChangementOrganismeDate: string;
  motifModification: boolean;
  motifModifAdresse: boolean; motifModifAdresseDate: string;
  motifModifCotisationSyndicale: boolean;
  motifModifPermis: boolean;
  motifModifSituationPersonnelle: boolean; motifModifSituationPersonnelleDate: string;
  motifModifModePaiement: boolean; motifModifModePaiementDate: string;
  // Situation familiale
  sitFamHabiteSeul: boolean;
  sitFamPensionAlimentaire: boolean; sitFamPensionCopie: "joins" | "deja" | "";
  sitFamSepareDesFait: boolean; sitFamSepareCopie: "joins" | "deja" | "";
  sitFamRemarques: string;
  sitFamCohabite: boolean;
  cohabitants: CohabitantRow[];
  sitFamRemarquesCohabitants: string;
  partenaireNom: string; partenaireDeclaration: "premiere_fois" | "inchangee" | "";
  // Activités
  actEtudesPleinExercice: "non" | "oui"; actEtudesDate: string;
  actApprentissage: "non" | "oui"; actApprentissageDate: string;
  actFormationSyntra: "non" | "oui"; actFormationSyntraDate: string;
  actMandatCulturel: "non" | "oui"; actMandatCulturelDecl: "premiere_fois" | "inchangee" | "";
  actMandatPolitique: "non" | "oui"; actMandatPolitiqueDecl: "premiere_fois" | "inchangee" | "";
  actChapitreXII: "non" | "oui";
  actTremplin: "non" | "oui"; actTremplinDecl: "premiere_fois" | "inchangee" | "";
  actActiviteAccessoire: "non" | "oui";
  actAdminSociete: "non" | "oui";
  actInscritIndependant: "non" | "oui"; actIndependantDecl: "premiere_fois" | "inchangee" | "";
  // Revenus
  revPensionComplete: "non" | "oui"; revPensionCompleteDecl: "premiere_fois" | "inchangee" | "";
  revPensionRetraite: "non" | "oui";
  revIndemnitesMaladie: "non" | "oui";
  revIndemnitesAccident: "non" | "oui";
  revAvantageFinancier: "non" | "oui";
  // Mode de paiement
  paiementVirement: boolean; paiementCompteAMonNom: "oui" | "non" | "";
  paiementNomTitulaire: string;
  paiementIban: string; paiementBic: string;
  paiementCheque: boolean;
  // Cotisation syndicale
  cotisationAction: "autorise" | "nAutorise" | "none";
  cotisationMoisAnnee: string;
  // Nationalité non-EEE
  natApplicable: boolean;
  natRefugie: "oui" | "non" | ""; natApatride: "oui" | "non" | "";
  natDocumentSejour: "oui" | "non" | "";
  natAccesMarchePro: "illimite" | "limite" | "aucun" | "";
  natDescriptionLimitation: string;
  // Divers
  divCongesSansSolde: "non" | "oui"; divCongesDu: string; divCongesAu: string;
  divIncapacite33: "non" | "oui";
  // Déclaration
  declAffirme: boolean; declLuFeuille: boolean; declSaitCommuniquer: boolean;
  declDocsAttestation: boolean; declDocsExtrait: boolean;
  declDocsAnnexeRegis: boolean; declDocsPermis: boolean; declDocsAutre: string;
  dateSig: string;
  signature: string; // base64 PNG from canvas
}

export interface CohabitantRow {
  nomPrenom: string; lienParente: string; dateNaissance: string;
  allocFamiliales: boolean;
  typeActivite: string; montantActivite: string;
  typeRevenu: string; montantRevenu: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
// Convert display-y (top=0) to PDF-y (bottom=0) for A4
const H = 842;
const py = (dy: number) => H - dy;

const BLACK = rgb(0, 0, 0);
const FONT_SIZE = 7.5;
const CHECK_SIZE = 7;

interface DrawCtx {
  page: ReturnType<PDFDocument["getPage"]>;
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
}

function txt(ctx: DrawCtx, text: string, x: number, displayY: number, size = FONT_SIZE, useBold = false) {
  if (!text) return;
  ctx.page.drawText(text, { x, y: py(displayY), size, font: useBold ? ctx.bold : ctx.font, color: BLACK });
}

// Draw X mark for checkbox (displayY = same as checkbox label's y in extracted coords)
function chk(ctx: DrawCtx, checked: boolean, x: number, displayY: number) {
  if (!checked) return;
  ctx.page.drawText("X", { x: x + 1, y: py(displayY) + 1, size: CHECK_SIZE, font: ctx.bold, color: BLACK });
}

// Radio: draw X on the correct option
function radio(ctx: DrawCtx, value: string, testValue: string, x: number, displayY: number) {
  chk(ctx, value === testValue, x, displayY);
}

function fmtDate(d: string) {
  // Already DD/MM/YYYY or convert from YYYY-MM-DD
  if (!d) return "";
  if (d.includes("-") && d.length === 10) {
    const [y, m, dd] = d.split("-");
    return `${dd}/${m}/${y}`;
  }
  return d;
}

// ── Page 1 fill ───────────────────────────────────────────────────────────────
function fillPage1(ctx: DrawCtx, d: C1Data) {
  // ── IDENTITÉ ──
  txt(ctx, d.niss, 72, 132);
  txt(ctx, d.nom, 240, 132);
  txt(ctx, d.prenom, 435, 132);
  txt(ctx, fmtDate(d.dateNaissance), 37, 154);
  txt(ctx, d.nationalite, 157, 154);

  // ── ADRESSE ──
  txt(ctx, d.rue, 40, 193);
  txt(ctx, d.numero, 390, 193);
  txt(ctx, d.boite, 493, 193);
  txt(ctx, d.codePostal, 40, 214);
  txt(ctx, d.commune, 107, 214);
  txt(ctx, d.pays, 265, 214);
  txt(ctx, d.email, 40, 239);
  txt(ctx, d.telephone, 430, 239);

  // ── MOTIFS ──
  chk(ctx, d.motifDemandeAlloc, 39, 280);
  if (d.motifDemandeAlloc) {
    txt(ctx, fmtDate(d.motifDemandeAllocDate), 177, 280);
  }
  if (d.motifFormationAlternance === "oui") chk(ctx, true, 515, 280);
  if (d.motifFormationAlternance === "non") chk(ctx, true, 546, 280);
  chk(ctx, d.motifPremiereFois, 310, 310);
  chk(ctx, d.motifApresInterruption, 415, 310);

  chk(ctx, d.motifChangementOrganisme, 39, 325);
  if (d.motifChangementOrganisme) {
    txt(ctx, fmtDate(d.motifChangementOrganismeDate), 213, 325);
  }

  const hasModif = d.motifModifAdresse || d.motifModifCotisationSyndicale ||
    d.motifModifPermis || d.motifModifSituationPersonnelle || d.motifModifModePaiement;
  chk(ctx, hasModif, 39, 337);

  chk(ctx, d.motifModifAdresse, 49, 350);
  if (d.motifModifAdresse) txt(ctx, fmtDate(d.motifModifAdresseDate), 145, 350);
  chk(ctx, d.motifModifCotisationSyndicale, 49, 361);
  chk(ctx, d.motifModifPermis, 49, 372);
  chk(ctx, d.motifModifSituationPersonnelle, 310, 350);
  if (d.motifModifSituationPersonnelle) txt(ctx, fmtDate(d.motifModifSituationPersonnelleDate), 361, 365);
  chk(ctx, d.motifModifModePaiement, 310, 378);
  if (d.motifModifModePaiement) txt(ctx, fmtDate(d.motifModifModePaiementDate), 364, 391);

  // ── SITUATION FAMILIALE ──
  const skipFam = d.motifDemandeAlloc && d.motifFormationAlternance !== "oui";
  if (!skipFam) {
    chk(ctx, d.sitFamHabiteSeul, 37, 428);
    chk(ctx, d.sitFamPensionAlimentaire, 48, 439);
    if (d.sitFamPensionAlimentaire) {
      chk(ctx, d.sitFamPensionCopie === "joins", 467, 439);
      chk(ctx, d.sitFamPensionCopie === "deja", 467, 449);
    }
    chk(ctx, d.sitFamSepareDesFait, 48, 449);
    if (d.sitFamRemarques) txt(ctx, d.sitFamRemarques, 120, 461);
    chk(ctx, d.sitFamCohabite, 37, 487);

    // Cohabitation table (5 rows)
    const rowDisplayY = [547, 576, 606, 636, 666];
    const rowY2 = [560, 589, 619, 649, 679];
    d.cohabitants.slice(0, 5).forEach((c, i) => {
      txt(ctx, c.nomPrenom, 40, rowDisplayY[i]);
      txt(ctx, c.lienParente, 162, rowDisplayY[i]);
      txt(ctx, fmtDate(c.dateNaissance), 219, rowY2[i]);
      chk(ctx, c.allocFamiliales, 303, rowY2[i]);
      txt(ctx, c.typeActivite, 340, rowDisplayY[i]);
      txt(ctx, c.montantActivite, 397, rowY2[i]);
      txt(ctx, c.typeRevenu, 456, rowDisplayY[i]);
      txt(ctx, c.montantRevenu, 523, rowY2[i]);
    });

    if (d.sitFamRemarquesCohabitants) txt(ctx, d.sitFamRemarquesCohabitants, 120, 702);

    if (d.partenaireNom) txt(ctx, d.partenaireNom, 322, 741);
    chk(ctx, d.partenaireDeclaration === "premiere_fois", 37, 763);
    chk(ctx, d.partenaireDeclaration === "inchangee", 37, 774);
  }
}

// ── Page 2 fill ───────────────────────────────────────────────────────────────
function fillPage2(ctx: DrawCtx, d: C1Data) {
  // Header repeat
  txt(ctx, d.niss, 117, 29);
  txt(ctx, d.nom, 310, 29);

  // ── MES ACTIVITÉS ──
  // non/oui positions: non@x=259, oui@x=289 for each row
  type ActRow = { field: keyof C1Data; dy: number; dateField: keyof C1Data; datex: number };
  const actRows: ActRow[] = [
    { field: "actEtudesPleinExercice", dy: 55, dateField: "actEtudesDate", datex: 351 },
    { field: "actApprentissage", dy: 64, dateField: "actApprentissageDate", datex: 351 },
    { field: "actFormationSyntra", dy: 81, dateField: "actFormationSyntraDate", datex: 349 },
  ];

  for (const row of actRows) {
    const val = d[row.field] as string;
    chk(ctx, val === "non", 246, row.dy);
    chk(ctx, val === "oui", 277, row.dy);
    if (val === "oui") txt(ctx, fmtDate(d[row.dateField] as string), row.datex, row.dy);
  }

  // Mandat culturel (multi-line, y=99)
  chk(ctx, d.actMandatCulturel === "non", 246, 99);
  chk(ctx, d.actMandatCulturel === "oui", 277, 99);
  if (d.actMandatCulturel === "oui") {
    chk(ctx, d.actMandatCulturelDecl === "premiere_fois", 315, 98);
    chk(ctx, d.actMandatCulturelDecl === "inchangee", 315, 116);
  }

  // Mandat politique (y=128)
  chk(ctx, d.actMandatPolitique === "non", 246, 128);
  chk(ctx, d.actMandatPolitique === "oui", 277, 128);
  if (d.actMandatPolitique === "oui") {
    chk(ctx, d.actMandatPolitiqueDecl === "premiere_fois", 315, 128);
    chk(ctx, d.actMandatPolitiqueDecl === "inchangee", 316, 146);
  }

  // Chapitre XII (y=156)
  chk(ctx, d.actChapitreXII === "non", 246, 156);
  chk(ctx, d.actChapitreXII === "oui", 277, 156);

  // Tremplin (y=186)
  chk(ctx, d.actTremplin === "non", 246, 186);
  chk(ctx, d.actTremplin === "oui", 277, 186);
  if (d.actTremplin === "oui") {
    chk(ctx, d.actTremplinDecl === "premiere_fois", 316, 186);
    chk(ctx, d.actTremplinDecl === "inchangee", 316, 205);
  }

  // Activité accessoire / admin / indépendant (y=214, 223, 232)
  chk(ctx, d.actActiviteAccessoire === "non", 246, 214);
  chk(ctx, d.actActiviteAccessoire === "oui", 277, 214);
  chk(ctx, d.actAdminSociete === "non", 246, 223);
  chk(ctx, d.actAdminSociete === "oui", 277, 223);
  chk(ctx, d.actInscritIndependant === "non", 246, 232);
  chk(ctx, d.actInscritIndependant === "oui", 277, 232);
  if (d.actActiviteAccessoire === "oui" || d.actAdminSociete === "oui" || d.actInscritIndependant === "oui") {
    chk(ctx, d.actIndependantDecl === "premiere_fois", 317, 214);
    chk(ctx, d.actIndependantDecl === "inchangee", 317, 232);
  }

  // ── MES REVENUS ──
  // Pension complète (y=271)
  chk(ctx, d.revPensionComplete === "non", 245, 271);
  chk(ctx, d.revPensionComplete === "oui", 278, 271);
  if (d.revPensionComplete === "oui") {
    chk(ctx, d.revPensionCompleteDecl === "premiere_fois", 318, 271);
    chk(ctx, d.revPensionCompleteDecl === "inchangee", 318, 290);
  }
  // Pension retraite (y=281)
  chk(ctx, d.revPensionRetraite === "non", 245, 281);
  chk(ctx, d.revPensionRetraite === "oui", 278, 281);
  // Maladie/invalidité (y=290)
  chk(ctx, d.revIndemnitesMaladie === "non", 245, 290);
  chk(ctx, d.revIndemnitesMaladie === "oui", 278, 290);
  // Accident travail (y=299)
  chk(ctx, d.revIndemnitesAccident === "non", 245, 299);
  chk(ctx, d.revIndemnitesAccident === "oui", 278, 299);
  // Avantage financier (y=317)
  chk(ctx, d.revAvantageFinancier === "non", 245, 317);
  chk(ctx, d.revAvantageFinancier === "oui", 278, 317);

  // ── MODE DE PAIEMENT ──
  chk(ctx, d.paiementVirement, 37, 381);
  if (d.paiementVirement) {
    chk(ctx, d.paiementCompteAMonNom === "oui", 216, 381);
    chk(ctx, d.paiementCompteAMonNom === "non", 240, 381);
    if (d.paiementCompteAMonNom === "non" && d.paiementNomTitulaire) {
      txt(ctx, d.paiementNomTitulaire, 310, 381);
    }
    if (d.paiementIban) {
      const iban = d.paiementIban.replace(/\s/g, "").toUpperCase();
      if (iban.startsWith("BE")) {
        // Cases individuelles : B=x122, E=x137, espacement=15pt par case
        // On dessine chaque chiffre après "BE" centré dans sa case
        const digits = iban.slice(2); // 14 caractères
        for (let i = 0; i < digits.length; i++) {
          txt(ctx, digits[i], 154 + i * 15, 398, 10);
        }
      } else {
        // IBAN étranger : ligne pointillée (y=414)
        txt(ctx, iban, 138, 414, 9);
        if (d.paiementBic) txt(ctx, d.paiementBic.toUpperCase(), 398, 427, 9);
      }
    }
  }
  chk(ctx, d.paiementCheque, 37, 455);

  // ── COTISATION SYNDICALE ──
  if (d.cotisationAction !== "none" && d.cotisationMoisAnnee) {
    chk(ctx, d.cotisationAction === "autorise", 37, 483);
    if (d.cotisationAction === "autorise") {
      txt(ctx, d.cotisationMoisAnnee, 373, 483);
    }
    chk(ctx, d.cotisationAction === "nAutorise", 37, 493);
    if (d.cotisationAction === "nAutorise") {
      txt(ctx, d.cotisationMoisAnnee, 404, 493);
    }
  }

  // ── NATIONALITÉ NON-EEE ──
  if (d.natApplicable) {
    chk(ctx, d.natRefugie === "oui", 220, 524);
    chk(ctx, d.natRefugie === "non", 370, 524);
    chk(ctx, d.natApatride === "oui", 220, 547);
    chk(ctx, d.natApatride === "non", 371, 547);
    if (d.natRefugie !== "oui" && d.natApatride !== "oui") {
      chk(ctx, d.natDocumentSejour === "oui", 220, 569);
      chk(ctx, d.natDocumentSejour === "non", 246, 569);
      if (d.natDocumentSejour === "oui") {
        chk(ctx, d.natAccesMarchePro === "illimite", 257, 581);
        chk(ctx, d.natAccesMarchePro === "limite", 257, 594);
        if (d.natDescriptionLimitation) txt(ctx, d.natDescriptionLimitation, 285, 625);
        chk(ctx, d.natAccesMarchePro === "aucun", 257, 637);
      }
    }
  }

  // ── DIVERS ──
  chk(ctx, d.divCongesSansSolde === "non", 281, 657);
  chk(ctx, d.divCongesSansSolde === "oui", 319, 657);
  if (d.divCongesSansSolde === "oui") {
    txt(ctx, fmtDate(d.divCongesDu), 353, 657);
    txt(ctx, fmtDate(d.divCongesAu), 463, 657);
  }
  chk(ctx, d.divIncapacite33 === "non", 281, 666);
  chk(ctx, d.divIncapacite33 === "oui", 319, 666);

  // ── MA DÉCLARATION ──
  chk(ctx, d.declAffirme, 37, 687);
  chk(ctx, d.declLuFeuille, 37, 697);
  chk(ctx, d.declSaitCommuniquer, 37, 707);

  // Documents joints
  chk(ctx, d.declDocsAttestation, 37, 733);
  chk(ctx, d.declDocsExtrait, 37, 749);
  chk(ctx, d.declDocsAnnexeRegis, 309, 733);
  chk(ctx, d.declDocsPermis, 309, 741);
  if (d.declDocsAutre) txt(ctx, d.declDocsAutre, 365, 749);

  // Date signature
  txt(ctx, fmtDate(d.dateSig), 101, 802);
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const data = (await request.json()) as C1Data;

    const pdfPath = path.join(process.cwd(), "public", "c1.pdf");
    const pdfBytes = await readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const ctx1: DrawCtx = { page: pdfDoc.getPage(0), font, bold };
    const ctx2: DrawCtx = { page: pdfDoc.getPage(1), font, bold };

    fillPage1(ctx1, data);
    fillPage2(ctx2, data);

    // Draw signature image on page 2 if provided
    if (data.signature && data.signature.startsWith("data:image/png")) {
      const sigBytes = Buffer.from(data.signature.split(",")[1], "base64");
      const sigImage = await pdfDoc.embedPng(sigBytes);
      ctx2.page.drawImage(sigImage, { x: 251, y: py(816), width: 150, height: 30 });
    }

    // Output only the first 2 pages (pages 0 and 1 of the original 6-page PDF)
    const outDoc = await PDFDocument.create();
    const [page1, page2] = await outDoc.copyPages(pdfDoc, [0, 1]);
    outDoc.addPage(page1);
    outDoc.addPage(page2);

    const filledBytes = await outDoc.save();
    const base64 = Buffer.from(filledBytes).toString("base64");

    return NextResponse.json({ pdfBase64: base64 });

  } catch (err) {
    console.error("[fill-c1]", err);
    return NextResponse.json({ error: "Erreur lors du remplissage du PDF." }, { status: 500 });
  }
}
