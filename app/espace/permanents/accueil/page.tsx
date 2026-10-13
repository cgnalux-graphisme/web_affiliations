import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ClipboardList, Flag, IdCard, Plus } from "lucide-react";
import { exigerApp, monProfil, utilisateurConnecte } from "../../../../lib/espace/acces";
import { getSupabaseService } from "../../../../lib/supabase-service";
import { listePermanents, perimetreDe } from "../../../../lib/permanents/perimetre-serveur";
import { entreprisesChoix, lignesFiches } from "../../../../lib/fiches-suivi/donnees-serveur";
import LignesFiches from "../../_partage/LignesFiches";
import { Alerte, BTN_PRINCIPAL, EnteteEcran, Panneau, Vide } from "../../_partage/ui";
import VuComme from "./VuComme";

export const metadata: Metadata = { title: "Accès permanents — Espace CG", robots: { index: false, follow: false } };

const pluriel = (n: number, s: string, p = `${s}s`) => (n > 1 ? p : s);

export default async function AccueilPage({ searchParams }: { searchParams: Promise<{ permanent?: string }> }) {
  await exigerApp("permanents");
  const [profil, user, permanents, { permanent }] = await Promise.all([monProfil(), utilisateurConnecte(), listePermanents(), searchParams]);
  const superAdmin = profil?.role === "SUPER_ADMIN";
  // Un super admin peut regarder le tableau de bord d'un permanent (« Vu comme »).
  const vu = superAdmin && permanent ? permanents.find((p) => p.email === permanent) ?? null : null;
  const email = vu?.email ?? profil?.email ?? "";
  const auteurId = vu?.id ?? user?.id ?? "";

  const db = getSupabaseService();
  const [perimetre, entreprises, mesFiches, equipe, delegues] = await Promise.all([
    perimetreDe(email),
    entreprisesChoix(),
    lignesFiches({ auteurId }),
    lignesFiches({}, 6),
    db ? db.from("site_delegues").select("id, entreprise_id, a_verifier") : Promise.resolve({ data: [] }),
  ]);
  const mesEntreprises = entreprises.filter((e) => perimetre.ficheIds.has(e.id));
  const mesDelegues = ((delegues.data ?? []) as { id: string; entreprise_id: string; a_verifier: string | null }[])
    .filter((d) => perimetre.ficheIds.has(d.entreprise_id));
  const aVerifier = mesDelegues.filter((d) => d.a_verifier).length;
  const fiches = mesFiches.ok ? mesFiches.lignes : [];
  const brouillons = fiches.filter((f) => f.statut === "brouillon").length;
  const fichesParEntreprise = new Map<string, number>();
  for (const f of fiches) if (f.entrepriseId) fichesParEntreprise.set(f.entrepriseId, (fichesParEntreprise.get(f.entrepriseId) ?? 0) + 1);
  const delParEntreprise = new Map<string, number>();
  for (const d of mesDelegues) delParEntreprise.set(d.entreprise_id, (delParEntreprise.get(d.entreprise_id) ?? 0) + 1);
  const prenom = (vu?.nom ?? profil?.nom ?? "").split(" ")[0];
  const tablesAbsentes = !mesFiches.ok && mesFiches.tablesAbsentes;

  const tuiles = [
    { href: "/espace/entreprises/liste?mes=1", icone: Building2, valeur: mesEntreprises.length, libelle: pluriel(mesEntreprises.length, "entreprise suivie", "entreprises suivies") },
    { href: "/espace/delegues/liste", icone: IdCard, valeur: mesDelegues.length, libelle: pluriel(mesDelegues.length, "délégué") },
    { href: "/espace/delegues/a-verifier", icone: Flag, valeur: aVerifier, libelle: `${pluriel(aVerifier, "délégué")} à vérifier` },
    { href: "/espace/permanents/fiches?vue=mes", icone: ClipboardList, valeur: brouillons, libelle: `${pluriel(brouillons, "fiche")} en brouillon` },
  ];

  return (
    <div className="ecg-ecran">
      <EnteteEcran icone="key" titre={vu ? `Tableau de bord de ${vu.nom}` : prenom ? `Bonjour ${prenom}` : "Tableau de bord"}
        description="Vos entreprises, vos délégués et vos fiches de suivi pour le rapport de congrès."
        actions={<Link href="/espace/permanents/fiches/nouvelle" className={BTN_PRINCIPAL}><Plus size={18} aria-hidden /> Nouvelle fiche de suivi</Link>} />
      {superAdmin && <VuComme permanents={permanents} actuel={vu?.email ?? ""} />}
      {tablesAbsentes && (
        <Alerte ton="attention" titre="Fiches de suivi indisponibles">
          Les tables des fiches ne sont pas encore créées : exécutez la migration 20261013120000 dans Supabase.
        </Alerte>
      )}
      {mesEntreprises.length === 0 && (
        <Alerte ton="info" titre="Aucune entreprise à votre nom">
          Le périmètre vient de CG Link : une entreprise vous est attribuée quand son e-mail de permanent est {email || "votre adresse"}.
        </Alerte>
      )}

      <nav aria-label="Mes chiffres" className="ecg-stats">
        {tuiles.map((t) => (
          <Link key={t.href} href={t.href} className="ecg-stat">
            <div className="ecg-stat-ico"><t.icone size={18} aria-hidden /></div>
            <div><b>{t.valeur}</b><span>{t.libelle}</span></div>
          </Link>
        ))}
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panneau titre={vu ? "Ses fiches" : "Mes fiches"} corps={false}
          actions={<Link href="/espace/permanents/fiches?vue=mes" className="ecg-lien text-sm">Toutes</Link>}>
          <div className="px-5 pb-2">
            {fiches.length ? <LignesFiches lignes={fiches.slice(0, 6)} /> : (
              <Vide icone="clipboard" titre="Aucune fiche pour l'instant.">
                Une fiche raconte un moment de l'action syndicale : elle nourrit l'historique de l'entreprise et le rapport de congrès.
              </Vide>
            )}
          </div>
        </Panneau>
        <Panneau titre="Dernières fiches de l'équipe" corps={false}
          actions={<Link href="/espace/permanents/fiches" className="ecg-lien text-sm">Toutes</Link>}>
          <div className="px-5 pb-2">
            {equipe.ok && equipe.lignes.length ? <LignesFiches lignes={equipe.lignes} /> : <p className="ecg-texte-doux py-4">Aucune fiche.</p>}
          </div>
        </Panneau>
      </div>

      {mesEntreprises.length > 0 && (
        <Panneau titre={vu ? "Ses entreprises" : "Mes entreprises"} corps={false}
          actions={<Link href="/espace/entreprises/liste?mes=1" className="ecg-lien text-sm">Ouvrir dans Entreprises</Link>}>
          <ul className="grid gap-x-6 px-5 pb-3 sm:grid-cols-2 lg:grid-cols-3">
            {mesEntreprises.map((e) => (
              <li key={e.id} className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--ecg-trait)] py-2">
                <Link href={`/espace/entreprises/${e.id}`} className="ecg-lien min-w-0 truncate font-semibold">{e.nom}</Link>
                <span className="ecg-texte-doux flex-none text-sm tabular-nums">
                  {delParEntreprise.get(e.id) ?? 0} {pluriel(delParEntreprise.get(e.id) ?? 0, "délégué")} · {fichesParEntreprise.get(e.id) ?? 0} {pluriel(fichesParEntreprise.get(e.id) ?? 0, "fiche")}
                </span>
              </li>
            ))}
          </ul>
        </Panneau>
      )}
    </div>
  );
}
