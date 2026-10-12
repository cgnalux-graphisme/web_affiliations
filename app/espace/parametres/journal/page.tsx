import type { Metadata } from "next";
import Link from "next/link";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  LayoutGrid,
  ShieldCheck,
  SquareMinus,
  SquarePlus,
  Undo2,
  UserPlus,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import { exigerApp } from "../../../../lib/espace/acces";
import { nomsDesPersonnes } from "../../../../lib/espace/equipe-serveur";
import { phraseJournal, quandJournal, type DetailsJournal } from "../../../../lib/espace/gestion-acces";
import { libelleRole } from "../../../../lib/espace/roles";
import { getSupabaseService } from "../../../../lib/supabase-service";
import { toutesLesApps } from "../../_noyau/registre";
import { Alerte, EnteteEcran, Panneau, Vide } from "../../_partage/ui";

export const metadata: Metadata = { title: "Journal des accès — Espace CG" };

const PAR_PAGE = 50;

const ICONES: Record<string, LucideIcon> = {
  app_ajout: SquarePlus,
  app_retrait: SquareMinus,
  app_exception_supprimee: Undo2,
  role: ShieldCheck,
  invitation: UserPlus,
  reinitialisation: KeyRound,
  suspension: Ban,
  reactivation: UserRoundCheck,
  role_app_ajout: LayoutGrid,
  role_app_retrait: LayoutGrid,
};

type Ligne = { id: string; auteur_id: string | null; cible_id: string | null; action: string; details: DetailsJournal | null; created_at: string };

/** Journal des accès : chaque modification (app, rôle, invitation, réinitialisation, suspension), en phrases. */
export default async function JournalPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await exigerApp("parametres");
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  const db = getSupabaseService();
  const res = db
    ? await db
        .from("site_journal_acces")
        .select("id, auteur_id, cible_id, action, details, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * PAR_PAGE, page * PAR_PAGE - 1)
    : null;

  if (!db || !res || res.error) {
    return (
      <div className="ecg-ecran">
        <Alerte ton="erreur">Le journal ne peut pas être chargé. Rechargez la page.</Alerte>
      </div>
    );
  }

  const lignes = (res.data ?? []) as Ligne[];
  const [noms, apps] = await Promise.all([
    nomsDesPersonnes(db, lignes.flatMap((l) => [l.auteur_id ?? "", l.cible_id ?? ""])),
    toutesLesApps(),
  ]);
  const nomApp = (code?: string) => apps.find((a) => a.code === code)?.nom ?? code ?? "une app";
  const pages = Math.max(1, Math.ceil((res.count ?? 0) / PAR_PAGE));

  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran
        icone="history"
        titre="Journal des accès"
        description="Toutes les modifications d'accès faites depuis l'Espace CG, de la plus récente à la plus ancienne."
        actions={
          <Link href="/espace/parametres/comptes" className="ecg-btn">
            <ChevronLeft size={16} aria-hidden /> Comptes & accès
          </Link>
        }
      />
      <Panneau
        titre="Modifications"
        sousTitre={`${res.count ?? 0} au total`}
        corps={lignes.length === 0}
        pied={
          pages > 1 ? (
            <nav aria-label="Pages du journal" className="flex w-full items-center justify-between gap-3">
              {page > 1 ? (
                <Link href={`?page=${page - 1}`} className="ecg-btn ecg-btn-petit">
                  <ChevronLeft size={15} aria-hidden /> Plus récentes
                </Link>
              ) : (
                <span />
              )}
              <span className="ecg-chiffre text-sm font-semibold">
                Page {page} sur {pages}
              </span>
              {page < pages ? (
                <Link href={`?page=${page + 1}`} className="ecg-btn ecg-btn-petit">
                  Plus anciennes <ChevronRight size={15} aria-hidden />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : undefined
        }
      >
        {lignes.length === 0 ? (
          <Vide icone="history" titre="Aucune modification pour l'instant">
            Chaque changement d&apos;app, de rôle, chaque invitation, réinitialisation ou suspension apparaîtra ici.
          </Vide>
        ) : (
          <ul className="ecg-lignes">
            {lignes.map((l) => {
              const Icone = ICONES[l.action] ?? ShieldCheck;
              const phrase = phraseJournal(l.action, l.details ?? {}, {
                auteur: (l.auteur_id && noms.get(l.auteur_id)) || "Quelqu'un",
                cible: (l.cible_id && noms.get(l.cible_id)) || "une personne",
                nomApp,
                nomRole: (r?: string) => (r ? libelleRole(r) : "inconnu"),
              });
              return (
                <li key={l.id} className="flex items-start gap-3">
                  <span className="ecg-mini mt-0.5" style={{ "--c": "#5B6E7D" } as React.CSSProperties} aria-hidden>
                    <Icone size={15} />
                  </span>
                  <p className="min-w-0 text-[15px]">
                    {phrase}, <span className="ecg-texte-doux ecg-chiffre">{quandJournal(l.created_at)}</span>.
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Panneau>
    </div>
  );
}
