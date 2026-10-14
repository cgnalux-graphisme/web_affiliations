import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DonneesCourrierPdf } from "../courriers";
import { enregistrerPolicesServeur } from "./commun";
import CourrierPdf from "./CourrierPdf";
import AttestationPertePdf, { type DonneesAttestationPerte } from "./AttestationPertePdf";
import FichePaiementPdf, { type DonneesFichePaiement } from "./FichePaiementPdf";
import DossierPdf, { type DonneesDossierPdf } from "./DossierPdf";
import { PDFDocument } from "pdf-lib";

/** Fabrique les PDF des libérations en mémoire (pièces jointes des e-mails, téléchargements). SERVEUR UNIQUEMENT. */

/** Un courrier, ou plusieurs dans un seul PDF (impression groupée). */
export async function pdfCourrier(d: DonneesCourrierPdf | DonneesCourrierPdf[]): Promise<Buffer> {
  enregistrerPolicesServeur();
  return renderToBuffer(<CourrierPdf ds={Array.isArray(d) ? d : [d]} />);
}

export async function pdfAttestationPerte(d: DonneesAttestationPerte | DonneesAttestationPerte[]): Promise<Buffer> {
  enregistrerPolicesServeur();
  return renderToBuffer(<AttestationPertePdf ds={Array.isArray(d) ? d : [d]} />);
}

export async function pdfFichePaiement(d: DonneesFichePaiement): Promise<Buffer> {
  enregistrerPolicesServeur();
  return renderToBuffer(<FichePaiementPdf d={d} />);
}

export async function pdfDossier(x: DonneesDossierPdf): Promise<Buffer> {
  enregistrerPolicesServeur();
  return renderToBuffer(<DossierPdf x={x} />);
}

/**
 * Assemble plusieurs PDF en un seul (pdf-lib). Un PDF illisible (protégé, abîmé) est ignoré et son nom est renvoyé
 * pour être signalé.
 */
export async function assemblerPdf(morceaux: { nom: string; pdf: Buffer | Uint8Array }[]): Promise<{ pdf: Buffer; ignores: string[] }> {
  const final = await PDFDocument.create();
  const ignores: string[] = [];
  for (const m of morceaux) {
    try {
      const doc = await PDFDocument.load(m.pdf, { ignoreEncryption: true });
      const pages = await final.copyPages(doc, doc.getPageIndices());
      for (const p of pages) final.addPage(p);
    } catch {
      ignores.push(m.nom);
    }
  }
  return { pdf: Buffer.from(await final.save()), ignores };
}
