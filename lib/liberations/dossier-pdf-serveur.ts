import { getSupabaseService } from "../supabase-service";
import { isoToDateFr } from "../dates";
import { BUCKET_LIBERATIONS, type ContexteLiberations } from "./donnees-serveur";
import {
  courrierDe, documentAttestationPerte, documentCourrier, documentFichePaiement, nomParticipant, preparerCourriers,
  type LigneCourrier,
} from "./courriers-serveur";
import { chargerJourJ } from "./jour-j-serveur";
import { adresseLieu, heureFr } from "./regles";
import { euros, totalGeneral } from "./montants";
import { libelleCharge, libelleStatut, libelleType } from "./types";
import { assemblerPdf, pdfAttestationPerte, pdfCourrier, pdfDossier, pdfFichePaiement } from "./pdf/rendu";
import type { DonneesDossierPdf, ImagePdf } from "./pdf/DossierPdf";

/**
 * PDF complet d'un dossier (lot 4) : synthèse, documents (lettres, convocations, attestations, fiches de paiement),
 * pièces jointes et tickets en PDF ajoutés tels quels. Enregistré dans le bucket privé (`<dossier>/export/`), puis
 * servi par un lien signé : un dossier avec beaucoup de photos dépasse la limite de 4,5 Mo d'une réponse Vercel.
 * SERVEUR UNIQUEMENT, après vérification du droit (admin ou demandeur).
 */

const ouiNon = (b: boolean | null) => (b === null ? "Pas précisé" : b ? "Oui" : "Non");
const quand = (iso: string) => {
  const d = new Date(iso);
  return `${isoToDateFr(d.toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" }))} ${d.toLocaleTimeString("fr-BE", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit" }).replace(":", "h")}`;
};
const duree = (x: string) => (x === "journee" ? "journée" : x === "matin" ? "matin" : "après-midi");

function etatCourrier(c: LigneCourrier | undefined): string {
  if (!c || c.statut === "a_envoyer") return "Pas encore";
  const le = c.envoye_le ? ` le ${quand(c.envoye_le).split(" ")[0]}` : "";
  if (c.statut === "envoye") return `Envoyé${le}${c.destinataire ? ` à ${c.destinataire}` : ""}`;
  if (c.statut === "imprime") return `Imprimé${le}`;
  return `Échec${c.erreur ? ` (${c.erreur})` : ""}`;
}

function formatImage(b: Buffer, type: string | null): "png" | "jpg" | null {
  if (b[0] === 0x89 && b[1] === 0x50) return "png";
  if (b[0] === 0xff && b[1] === 0xd8) return "jpg";
  return type === "image/png" ? "png" : type === "image/jpeg" ? "jpg" : null;
}

async function telecharger(url: string | null): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

export async function exporterDossier(id: string, c: ContexteLiberations): Promise<{ ok: true; url: string; ignores: string[] } | { ok: false; erreur: string }> {
  const db = getSupabaseService();
  const prep = await preparerCourriers(id, c);
  if (!db || !prep) return { ok: false, erreur: "Dossier introuvable." };
  const d = prep.dossier;
  const jourJ = await chargerJourJ(id, "", false);
  const cg = d.perte_salaire === true && d.perte_salaire_charge === "cg_federale";

  // Signatures, tickets et pièces jointes (images), téléchargés depuis le bucket privé.
  const presences = await Promise.all((jourJ?.dates ?? []).map(async (x) => ({
    date: x.libelle,
    lignes: await Promise.all(x.presences.map(async (p) => ({
      nom: p.nom,
      heure: quand(p.signeLe).split(" ")[1],
      note: [p.horsListe ? "pas dans la liste" : "", p.aVerifier ? "à vérifier" : ""].filter(Boolean).join(", "),
      signature: await telecharger(p.signatureUrl),
    }))),
    absents: x.absents,
  })));
  const images: ImagePdf[] = [];
  const pdfsJoints: { nom: string; pdf: Buffer }[] = [];
  for (const x of jourJ?.dates ?? []) {
    for (const p of x.presences) {
      for (const [i, t] of (p.trajet?.tickets ?? []).entries()) {
        const b = await telecharger(t.url);
        if (!b) continue;
        if (b.subarray(0, 5).toString() === "%PDF-") pdfsJoints.push({ nom: `ticket de ${p.nom}`, pdf: b });
        else {
          const f = formatImage(b, null);
          if (f) images.push({ titre: `Ticket de train ${i + 1} : ${p.nom}, ${x.libelle}`, data: b, format: f });
        }
      }
    }
  }
  const pieces: { nom: string; pdf: Buffer }[] = [];
  for (const f of d.fichiers) {
    const b = await telecharger(f.url);
    if (!b) continue;
    if (f.type_mime === "application/pdf") pieces.push({ nom: f.nom_origine, pdf: b });
    else {
      const fmt = formatImage(b, f.type_mime);
      if (fmt) images.push({ titre: `Pièce jointe : ${f.nom_origine}`, data: b, format: fmt });
    }
  }

  const x: DonneesDossierPdf = {
    titre: d.objet ?? "",
    numero: d.numero,
    genereLe: quand(new Date().toISOString()),
    demande: [
      ["Type de libération", libelleType(d.type)],
      ["Objet", d.objet ?? ""],
      ["Dates", d.dates.map((t) => `${isoToDateFr(t.jour)} (${duree(t.duree)}${t.heure_debut ? `, ${heureFr(t.heure_debut)}` : ""})`).join(" ; ")],
      ["Lieu", [d.lieu_nom, adresseLieu(d), d.salle].filter(Boolean).join(", ")],
      ["Secteur", d.secteur ?? ""],
      ["Commission paritaire", d.commission],
      ["Entreprise", d.entreprise ?? (d.entreprise_specifique ? "" : "Pas d'entreprise précise")],
      ["Demandé par", d.demandeur],
      ["Envoyée le", d.soumis_le ? quand(d.soumis_le).split(" ")[0] : ""],
      ["Traité par", d.traitePar ?? ""],
      ["Statut", libelleStatut(d.statut)],
    ],
    ordreDuJour: (d.ordre_du_jour ?? "").split("\n").map((l) => l.replace(/^[-•*\s]+/, "").trim()).filter(Boolean),
    priseEnCharge: [
      ["Perte de salaire", `${ouiNon(d.perte_salaire)}${d.perte_salaire && d.perte_salaire_charge ? `, à charge de ${libelleCharge(d.perte_salaire_charge).replace(/^L/, "l")}` : ""}`],
      ["Dépense introduite à la CG fédérale", `${ouiNon(d.introduire_cg_federale)}${d.introduire_cg_federale === false && d.regime_paiement ? ` (régime ${d.regime_paiement})` : ""}`],
      ["Lunch prévu", ouiNon(d.lunch)],
      ...(cg ? [["Conseil", d.conseil ?? ""] as [string, string]] : []),
    ],
    participants: d.participants.map((p) => ({ nom: nomParticipant(p), entreprise: p.entreprise, employeur: [p.employeurNom, p.employeurEmail].filter(Boolean).join(" · ") })),
    courriers: d.participants.map((p) => ({ nom: nomParticipant(p), lettre: etatCourrier(courrierDe(prep, p.id, "lettre_employeur")), convocation: etatCourrier(courrierDe(prep, p.id, "convocation")) })),
    presences,
    frais: (jourJ?.dates ?? []).flatMap((jour) => jour.presences.flatMap((p) => p.trajet ? [{
      date: jour.libelle.split(" ")[0],
      nom: p.nom,
      trajet: [p.trajet.libelleMode, p.trajet.etape].filter(Boolean).join(" · "),
      km: p.trajet.km === null ? "" : p.trajet.km.toFixed(1).replace(".", ","),
      montantKm: euros(p.trajet.montantKm),
      tickets: p.trajet.montantTickets !== null ? `${euros(p.trajet.montantTickets)}${p.trajet.ticketsVerifies ? " (vérifiés)" : ""}` : "",
    }] : [])),
    totaux: (jourJ?.totaux ?? []).map((t) => ({
      nom: t.nom, km: t.km.toFixed(1).replace(".", ","), montantKm: euros(t.montantKm), tickets: euros(t.tickets),
      total: euros(Math.round((t.montantKm + t.tickets) * 100) / 100),
    })),
    paiement: cg ? d.participants.map((p) => ({
      nom: nomParticipant(p),
      attestation: p.attestation_recue_le ? `Reçue le ${quand(p.attestation_recue_le).split(" ")[0]}` : "Non reçue",
      total: euros(totalGeneral(prep.montants.filter((m) => m.participant_id === p.id))),
    })) : null,
    historique: [...d.historique].reverse().map((h) => ({ quand: quand(h.created_at), statut: libelleStatut(h.statut_apres), auteur: h.auteur || (h.statut_apres === "jour_j" ? "Première signature" : "") })),
    pieces: d.fichiers.map((f) => f.nom_origine),
    images,
  };

  try {
    const morceaux: { nom: string; pdf: Buffer }[] = [{ nom: "synthèse", pdf: await pdfDossier(x) }];
    if (d.participants.length) {
      morceaux.push({ nom: "lettres", pdf: await pdfCourrier(d.participants.map((p) => documentCourrier(prep, p, "lettre_employeur"))) });
      morceaux.push({ nom: "convocations", pdf: await pdfCourrier(d.participants.map((p) => documentCourrier(prep, p, "convocation"))) });
      const presents = d.participants.filter((p) => (jourJ?.dates ?? []).some((j) => j.presences.some((x) => x.participantId === p.id)));
      if (presents.length) morceaux.push({ nom: "attestations de présence", pdf: await pdfCourrier(presents.map((p) => documentCourrier(prep, p, "attestation_presence"))) });
      if (cg) {
        morceaux.push({ nom: "attestations de perte de salaire", pdf: await pdfAttestationPerte(d.participants.map((p) => documentAttestationPerte(prep, p))) });
        for (const p of d.participants) morceaux.push({ nom: `fiche de paiement de ${nomParticipant(p)}`, pdf: await pdfFichePaiement(documentFichePaiement(prep, p)) });
      }
    }
    const { pdf, ignores } = await assemblerPdf([...morceaux, ...pieces, ...pdfsJoints]);
    const chemin = `${id}/export/dossier-${d.numero}.pdf`;
    const { error } = await db.storage.from(BUCKET_LIBERATIONS).upload(chemin, pdf, { contentType: "application/pdf", upsert: true });
    if (error) {
      console.error("[liberations] export :", error.message);
      return { ok: false, erreur: "Le PDF a été fabriqué mais n'a pas pu être enregistré. Réessayez." };
    }
    const { data } = await db.storage.from(BUCKET_LIBERATIONS).createSignedUrl(chemin, 60 * 60, { download: `dossier-liberation-${d.numero}.pdf` });
    if (!data?.signedUrl) return { ok: false, erreur: "Le lien de téléchargement n'a pas pu être créé. Réessayez." };
    return { ok: true, url: data.signedUrl, ignores };
  } catch (err) {
    console.error("[liberations] export :", err instanceof Error ? err.message : "erreur");
    return { ok: false, erreur: "Le PDF complet n'a pas pu être fabriqué. Réessayez, ou signalez-le si cela se répète." };
  }
}
