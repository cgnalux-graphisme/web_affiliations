import { NextResponse } from "next/server";
import {
  CATEGORIES,
  CHAMP_PIEGE_ASSISTANT,
  ETAT_INITIAL,
  LIBELLES_CATEGORIE,
  chiffresRegistre,
  codePostalValide,
  formaterRegistre,
  nettoyerTransmission,
  regionDuCodePostal,
  validerTransmission,
  type Categorie,
} from "../../../../lib/assistant";
import { assistantActif, chargerDonneesAssistant } from "../../../../lib/assistant-donnees";
import { htmlEmailAssistant, sujetEmailAssistant } from "../../../../lib/assistant-email";
import { resoudreDestinataire } from "../../../../lib/assistant-parcours";
import { accepterRequete, adresseIp } from "../../../../lib/limite-requetes";
import { getFromEmail, getResendClient } from "../../../../lib/resend-mail";
import { getSupabaseService } from "../../../../lib/supabase-service";

export const dynamic = "force-dynamic";

const PRIVE = { "Cache-Control": "private, no-store" };

function erreur(message: string, status: number, erreurs?: Record<string, string>) {
  return NextResponse.json({ erreur: message, ...(erreurs ? { erreurs } : {}) }, { status, headers: PRIVE });
}

function adresseDuSite(request: Request): string {
  const env = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  return env || new URL(request.url).origin;
}

/**
 * Fenêtre « Transmettre ma demande » de l'Assistant CG. Ne passe JAMAIS par l'IA.
 * Entrée : { nom, prenom, email, registre_national?, resume, consentement, site_web (piège),
 * etat: { codePostal, categorie, cpCode, affilie } }. Le destinataire est recalculé ici depuis la base.
 * Enregistre la demande dans site_chatbot_demandes (service_role), puis un e-mail au destinataire,
 * sans le registre national. Le contenu de la demande n'est jamais journalisé.
 */
export async function POST(request: Request) {
  if (!(await assistantActif())) return erreur("L'assistant n'est pas disponible pour le moment.", 404);

  const corps = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!corps) return erreur("Requête illisible.", 400);

  // Champ piège rempli : on fait comme si tout s'était bien passé, sans rien enregistrer ni envoyer.
  if (typeof corps[CHAMP_PIEGE_ASSISTANT] === "string" && corps[CHAMP_PIEGE_ASSISTANT].trim() !== "") {
    return NextResponse.json({ service: "notre équipe" }, { headers: PRIVE });
  }

  if (!accepterRequete(`transmission:${adresseIp(request)}`, 5, 60 * 60_000)) {
    return erreur("Trop de demandes envoyées en peu de temps. Réessayez dans une heure, ou appelez nos bureaux.", 429);
  }

  const demande = nettoyerTransmission(corps);
  const erreurs = validerTransmission(demande);
  if (Object.keys(erreurs).length) return erreur("Certains champs sont à corriger.", 400, erreurs as Record<string, string>);

  const donnees = await chargerDonneesAssistant();
  const supabase = getSupabaseService();
  if (!donnees || !supabase) return erreur("La demande ne peut pas être transmise pour le moment. Appelez nos bureaux.", 503);

  const e = (corps.etat && typeof corps.etat === "object" ? corps.etat : {}) as Record<string, unknown>;
  const codePostal = typeof e.codePostal === "string" && codePostalValide(e.codePostal) ? e.codePostal : null;
  const categorie = (CATEGORIES as readonly string[]).includes(e.categorie as string) ? (e.categorie as Categorie) : null;
  const cpCode = donnees.repartition.some((r) => r.cp_code === e.cpCode) ? (e.cpCode as string) : null;
  const affilie = typeof e.affilie === "boolean" ? e.affilie : null;
  const employeurNettoyage = e.employeurNettoyage === "autre" ? ("autre" as const) : null;
  const region = codePostal ? regionDuCodePostal(codePostal) : null;

  const dest = resoudreDestinataire({ ...ETAT_INITIAL, codePostal, categorie, cpCode, affilie, employeurNettoyage }, donnees);
  if (!dest || !region || !codePostal || !categorie) {
    return erreur("Cette demande ne peut pas être transmise. Recommencez la conversation avec l'assistant.", 400);
  }
  const commission = cpCode ? donnees.repartition.find((r) => r.region === region && r.cp_code === cpCode) : null;
  const registre = chiffresRegistre(demande.registre_national);

  const { data, error } = await supabase
    .from("site_chatbot_demandes")
    .insert({
      nom: demande.nom,
      prenom: demande.prenom,
      email: demande.email,
      message: demande.resume,
      code_postal: codePostal,
      region,
      categorie,
      cp_code: cpCode,
      affilie,
      registre_national: registre ? formaterRegistre(registre) : null,
      destinataire_email: dest.destinataireEmail,
      service_nom: dest.service,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[assistant] Enregistrement impossible :", error?.code ?? "sans réponse");
    return erreur("La demande n'a pas pu être enregistrée. Réessayez, ou appelez nos bureaux.", 500);
  }

  const contenu = {
    categorie: LIBELLES_CATEGORIE[categorie],
    prenom: demande.prenom,
    nom: demande.nom,
    codePostal,
    region,
    commission: commission ? `${commission.cp_code} · ${commission.cp_nom}` : null,
    affilie: categorie === "juridique" ? affilie : null,
    resume: demande.resume,
    email: demande.email,
    lien: `${adresseDuSite(request)}/suivi-actions/chatbot?id=${data.id}`,
  };
  try {
    const { error: echec } = await getResendClient().emails.send({
      from: getFromEmail(),
      to: [dest.destinataireEmail],
      // « Répondre » dans Outlook ouvre une réponse adressée directement à la personne.
      replyTo: demande.email,
      subject: sujetEmailAssistant(contenu),
      html: htmlEmailAssistant(contenu),
    });
    // La demande est enregistrée : elle reste visible dans le back-office même si l'e-mail échoue.
    if (echec) console.error("[assistant] Échec Resend :", echec.name);
  } catch (err) {
    console.error("[assistant] Erreur e-mail :", err instanceof Error ? err.message : "inconnue");
  }

  return NextResponse.json({ service: dest.service }, { headers: PRIVE });
}
