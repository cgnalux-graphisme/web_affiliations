import type { Metadata } from "next";
import Link from "next/link";
import { exigerSuperAdmin } from "../../../../lib/espace/acces";
import { chargerJournal } from "../../../../lib/delegues/donnees-serveur";
import { isoToDateFr } from "../../../../lib/dates";
import { BTN, EnteteEcran, Panneau, Vide } from "../../_partage/ui";

export const metadata: Metadata = { title: "Journal des délégués — Espace CG", robots: { index: false, follow: false } };

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await exigerSuperAdmin();
  const page = Math.max(0, Number((await searchParams).page ?? 0) || 0);
  const { lignes, total } = await chargerJournal(page);
  const heure = (iso: string) => new Date(iso).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });
  return (
    <div className="ecg-ecran">
      <EnteteEcran icone="history" titre="Journal" description={`${total} opération(s) sur les délégués.`} />
      {lignes.length === 0 ? <Vide icone="history" titre="Aucune opération pour l'instant." /> : (
        <Panneau corps={false}>
          <ul className="ecg-lignes">
            {lignes.map((l) => (
              <li key={l.id} className="py-2 text-sm">
                <span className="ecg-texte-doux">{isoToDateFr(l.created_at.slice(0, 10))} {heure(l.created_at)}</span>
                {l.auteur && <> · {l.auteur}</>}{l.delegue && <> · <b>{l.delegue}</b></>} · {l.phrase}
              </li>
            ))}
          </ul>
        </Panneau>
      )}
      <div className="flex gap-2">
        {page > 0 && <Link className={BTN} href={`?page=${page - 1}`}>Plus récent</Link>}
        {(page + 1) * 50 < total && <Link className={BTN} href={`?page=${page + 1}`}>Plus ancien</Link>}
      </div>
    </div>
  );
}
