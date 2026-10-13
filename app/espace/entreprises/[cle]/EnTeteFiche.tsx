import Link from "next/link";
import { Building2, CalendarClock, ExternalLink, Hash, IdCard, Link2, Link2Off, MapPin, Tag, Upload, Users, type LucideIcon } from "lucide-react";
import { formaterNumeroBce } from "../../../../lib/bce/numero";
import { isoToDateFr } from "../../../../lib/dates";
import type { Fiche } from "../../../../lib/entreprises/donnees-serveur";
import { BTN_PRINCIPAL } from "../../_partage/ui";

/** En-tête de la fiche : nom, puces d'information, chiffres clés (liens vers les sections). */

const pluriel = (n: number, s: string, p = `${s}s`) => (n > 1 ? p : s);

export default function EnTeteFiche({ fiche, nom, cle }: { fiche: Fiche; nom: string; cle: string }) {
  const f = fiche.fiche;
  const unitesSuivies = fiche.unites.filter((u) => u.statut === "actif" && u.suivie).length;
  const stats: { ancre: string; icone: LucideIcon; valeur: number | string; libelle: string }[] = [
    { ancre: "affilies", icone: Users, valeur: fiche.affilies ? fiche.affilies.total : "—", libelle: fiche.affilies ? pluriel(fiche.affilies.total, "affilié actif", "affiliés actifs") : "affiliés (hors CG Link)" },
    { ancre: "sites", icone: MapPin, valeur: fiche.sites.length, libelle: pluriel(fiche.sites.length, "site (UTE)", "sites (UTE)") },
    { ancre: "unites", icone: Building2, valeur: unitesSuivies, libelle: pluriel(unitesSuivies, "unité suivie", "unités suivies") },
    { ancre: "sites", icone: IdCard, valeur: fiche.delegues.length, libelle: pluriel(fiche.delegues.length, "délégué") },
    { ancre: "onss", icone: Hash, valeur: fiche.onss.length, libelle: "n° ONSS" },
  ];

  return (
    <header className="ecg-fiche-tete grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid min-w-0 gap-2">
          <h1>{nom}</h1>
          {f?.denomination_bce && f.denomination_bce !== nom && <p className="ecg-texte-doux">{f.denomination_bce}</p>}
          <div className="ecg-puces">
            {f?.numero_bce ? (
              <a className="ecg-puce" target="_blank" rel="noreferrer"
                href={`https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?nummer=${f.numero_bce}&actionLu=Zoek&lang=fr`}>
                <Hash size={14} aria-hidden /> BCE {formaterNumeroBce(f.numero_bce)} <ExternalLink size={13} aria-hidden />
                <span className="sr-only">(ouvre la BCE dans un nouvel onglet)</span>
              </a>
            ) : (
              <span className="ecg-puce"><Hash size={14} aria-hidden /> N° BCE à compléter</span>
            )}
            {fiche.company?.sector && <span className="ecg-puce"><Tag size={14} aria-hidden /> {fiche.company.sector}</span>}
            {fiche.company ? (
              <span className="ecg-puce"><Link2 size={14} aria-hidden /> Relié à CG Link</span>
            ) : (
              <span className="ecg-puce"><Link2Off size={14} aria-hidden /> Hors CG Link</span>
            )}
            <span className="ecg-puce">
              <CalendarClock size={14} aria-hidden />
              {f?.bce_importe_le ? `BCE importée le ${isoToDateFr(f.bce_importe_le.slice(0, 10))}` : "BCE jamais importée"}
            </span>
          </div>
        </div>
        <Link href={`/espace/entreprises/${cle}/bce`} className={BTN_PRINCIPAL}>
          <Upload size={18} aria-hidden /> Importer depuis la BCE
        </Link>
      </div>
      <nav aria-label="Chiffres clés" className="ecg-stats">
        {stats.map((s) => (
          <a key={s.libelle} href={`#${s.ancre}`} className="ecg-stat">
            <div className="ecg-stat-ico"><s.icone size={18} aria-hidden /></div>
            <div>
              <b>{s.valeur}</b>
              <span>{s.libelle}</span>
            </div>
          </a>
        ))}
      </nav>
    </header>
  );
}
