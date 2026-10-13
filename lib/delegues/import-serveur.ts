import { getSupabaseService } from "../supabase-service";
import { importerUnDelegue, planImport, type CompanyImport, type FicheImport } from "./import";

/** Import des délégués de CG Link. SERVEUR UNIQUEMENT, après vérification du rôle SUPER_ADMIN. */

export type RapportImport = {
  crees: number; mandats: number; dejaPresents: number;
  rejetes: { entreprise: string; texte: string }[]; sansFiche: string[]; erreurs: number;
};

export async function executerImport(auteurId: string): Promise<RapportImport | null> {
  const db = getSupabaseService();
  if (!db) return null;
  const [companies, fiches, sites, deja] = await Promise.all([
    db.from("companies").select("id, name, delegates"),
    db.from("site_entreprises").select("id, company_id, autres_company_ids"),
    db.from("site_entreprise_sites").select("id, entreprise_id").eq("principal", true),
    db.from("site_delegues").select("cglink_user_id").not("cglink_user_id", "is", null),
  ]);
  if (companies.error || fiches.error || sites.error || deja.error) {
    console.error("[delegues] import, lecture :", companies.error?.code ?? fiches.error?.code ?? sites.error?.code ?? deja.error?.code);
    return null;
  }
  const principal = new Map(((sites.data ?? []) as { id: string; entreprise_id: string }[]).map((s) => [s.entreprise_id, s.id]));
  const listeCompanies = (companies.data ?? []) as CompanyImport[];
  // Profils CG Link des délégués présents dans plusieurs entreprises (pour choisir la bonne).
  const compte = new Map<string, number>();
  for (const c of listeCompanies) for (const d of c.delegates ?? []) compte.set(d.id, (compte.get(d.id) ?? 0) + 1);
  const multiples = [...compte].filter(([, n]) => n > 1).map(([id]) => id);
  const profils = multiples.length ? await db.from("profiles").select("id, company_id").in("id", multiples) : { data: [] };
  const plan = planImport({
    companies: listeCompanies,
    fiches: ((fiches.data ?? []) as Omit<FicheImport, "site_principal_id">[]).map((f) => ({ ...f, autres_company_ids: f.autres_company_ids ?? [], site_principal_id: principal.get(f.id) ?? null })),
    dejaImportes: new Set(((deja.data ?? []) as { cglink_user_id: string }[]).map((r) => r.cglink_user_id)),
    companyDuProfil: new Map(((profils.data ?? []) as { id: string; company_id: string | null }[]).filter((p) => p.company_id).map((p) => [p.id, p.company_id as string])),
  });

  const rapport: RapportImport = { crees: 0, mandats: 0, dejaPresents: plan.dejaPresents, rejetes: plan.rejetes, sansFiche: plan.sansFiche, erreurs: 0 };
  for (const d of plan.delegues) {
    const resultat = await importerUnDelegue(d, {
      // ignoreDuplicates : un import lancé deux fois en même temps ne crée pas de doublon.
      insererDelegue: async (delegue) => {
        const { data, error } = await db.from("site_delegues").upsert(delegue, { onConflict: "cglink_user_id", ignoreDuplicates: true }).select("id");
        if (error) {
          console.error("[delegues] import, délégué :", error.code);
          return "erreur";
        }
        return { id: ((data ?? [])[0]?.id as string | undefined) ?? null };
      },
      insererMandats: async (id, mandats) => {
        const { error } = await db.from("site_delegue_mandats").insert(mandats.map((m) => ({ ...m, delegue_id: id })));
        if (error) console.error("[delegues] import, mandats :", error.code);
        return !error;
      },
      supprimerDelegue: async (id) => {
        await db.from("site_delegues").delete().eq("id", id);
      },
    });
    if (resultat === "cree") {
      rapport.crees++;
      rapport.mandats += d.mandats.length;
    } else if (resultat === "deja") rapport.dejaPresents++;
    else rapport.erreurs++;
  }
  await db.from("site_journal_delegues").insert({
    auteur_id: auteurId, action: "import",
    details: { crees: rapport.crees, mandats: rapport.mandats, rejetes: rapport.rejetes.length, deja: rapport.dejaPresents, erreurs: rapport.erreurs },
  });
  return rapport;
}
