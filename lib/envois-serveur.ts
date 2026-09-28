import type { Resend } from "resend";
import { DEMANDES, estTypeDemande } from "./demandes";
import { DESTINATAIRES_DEFAUT, emailValide, type Envoi, type EnvoiJournal, type RefDemande } from "./envois";
import { sendIsolatedEmail, type ResultatEnvoi } from "./resend-mail";
import { getSupabaseService } from "./supabase-service";

/**
 * Envois automatiques — SERVEUR UNIQUEMENT (routes /api/send-*).
 * - destinatairesInternes() : adresses de l'écran Paramètres (site_destinataires), lues avec la clé
 *   service_role ; si la table est illisible, adresses par défaut (les envois ne s'arrêtent jamais).
 * - envoyerEtJournaliser() : envoi isolé (un e-mail par destinataire) puis une ligne par demande et par
 *   destinataire dans site_envois_mails. Le journal ne fait jamais échouer un envoi.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function destinatairesInternes(envoi: Envoi): Promise<string[]> {
  const db = getSupabaseService();
  if (db) {
    const { data, error } = await db.from("site_destinataires").select("email").eq("envoi", envoi).eq("actif", true);
    // Table lisible : on respecte ses réglages, même vides (aucune adresse interne active).
    if (!error) return ((data ?? []) as { email: string }[]).map((l) => l.email).filter(emailValide);
    console.error(`[envois] site_destinataires illisible (${error.code ?? ""}) : adresses par défaut pour « ${envoi} ».`);
  }
  return DESTINATAIRES_DEFAUT[envoi];
}

/** Références reçues du navigateur : on ne garde que celles qui désignent une demande existante. */
export function lireRefs(brut: unknown): RefDemande[] {
  const liste = Array.isArray(brut) ? brut : brut ? [brut] : [];
  return liste
    .filter((r): r is RefDemande => {
      const x = r as Partial<RefDemande> | null;
      return Boolean(x && estTypeDemande(x.type) && typeof x.id === "string" && UUID.test(x.id));
    })
    .slice(0, 5);
}

async function refsExistantes(refs: RefDemande[]): Promise<RefDemande[]> {
  const db = getSupabaseService();
  if (!db || !refs.length) return [];
  const gardees: RefDemande[] = [];
  for (const ref of refs) {
    const { data } = await db.from(DEMANDES[ref.type].table).select("id").eq("id", ref.id).maybeSingle();
    if (data) gardees.push(ref);
  }
  return gardees;
}

async function journaliser(refs: RefDemande[], envoi: EnvoiJournal, sujet: string, resultats: ResultatEnvoi[]) {
  try {
    const db = getSupabaseService();
    const valides = await refsExistantes(refs);
    if (!db || !valides.length || !resultats.length) return;
    const lignes = valides.flatMap((ref) =>
      resultats.map((r) => ({
        demande_type: ref.type,
        demande_id: ref.id,
        envoi,
        destinataire: r.to,
        sujet: sujet.slice(0, 300),
        statut: r.erreur ? "echec" : "envoye",
        resend_id: r.id,
        erreur: r.erreur?.slice(0, 500) ?? null,
      }))
    );
    const { error } = await db.from("site_envois_mails").insert(lignes);
    if (error) console.error(`[envois] journal non écrit (${error.code ?? ""} ${error.message}).`);
  } catch (err) {
    console.error("[envois] journal non écrit :", err instanceof Error ? err.message : "erreur");
  }
}

type Options = Parameters<typeof sendIsolatedEmail>[1] & {
  envoi: EnvoiJournal;
  /** Demande(s) concernée(s) : l'envoi apparaît dans leur historique. */
  refs: RefDemande[];
};

export async function envoyerEtJournaliser(resend: Resend, { envoi, refs, ...options }: Options) {
  try {
    const resultat = await sendIsolatedEmail(resend, options);
    await journaliser(refs, envoi, options.subject, resultat.envois);
    return resultat;
  } catch (err) {
    // Panne réseau ou service : aucun destinataire n'a été servi.
    const message = err instanceof Error ? err.message : "Échec";
    await journaliser(
      refs,
      envoi,
      options.subject,
      options.recipients.filter(Boolean).map((to) => ({ to: to.trim().toLowerCase(), id: null, erreur: message }))
    );
    throw err;
  }
}
