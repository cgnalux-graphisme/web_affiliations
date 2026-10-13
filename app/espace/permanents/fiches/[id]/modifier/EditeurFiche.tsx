"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, CircleCheck, Eye, Factory, Network, Paperclip, PenLine, RotateCcw, Save, Sparkles,
  type LucideIcon,
} from "lucide-react";
import { formatDateFr, isoToDateFr } from "../../../../../../lib/dates";
import { manquantsPourTerminer } from "../../../../../../lib/fiches-suivi/regles";
import { QUESTIONS, libelleType, type FicheAffichee } from "../../../../../../lib/fiches-suivi/types";
import type { EntrepriseChoix } from "../../../../../../lib/fiches-suivi/donnees-serveur";
import { changerStatut, enregistrerFiche } from "../../../actions";
import { IconeChargement } from "../../../../../Chargement";
import { Alerte, AIDE, BTN, BTN_PRINCIPAL, CHAMP, EnteteEcran, LIBELLE, Panneau } from "../../../../_partage/ui";
import PiecesFiche from "./PiecesFiche";
import BoutonPdf from "../BoutonPdf";

const ETAPES: { titre: string; icone: LucideIcon }[] = [
  { titre: "Quand et où", icone: CalendarDays },
  { titre: "Pièces", icone: Paperclip },
  { titre: "Le suivi", icone: PenLine },
  { titre: "Rédaction", icone: Sparkles },
  { titre: "Finaliser", icone: CircleCheck },
];

type Valeurs = Record<string, string>;

function valeursDe(f: FicheAffichee): Valeurs {
  return {
    titre: f.titre ?? "",
    date_debut: f.date_debut ? isoToDateFr(f.date_debut) : "",
    date_fin: f.date_fin ? isoToDateFr(f.date_fin) : "",
    entreprise_id: f.entreprise_id ?? "",
    site_id: f.site_id ?? "",
    secteur_id: f.secteur_id ?? "",
    texte: f.texte ?? "",
    ...Object.fromEntries(QUESTIONS.map((q) => [q.cle, f[q.cle] ?? ""])),
  };
}

export default function EditeurFiche({ fiche, entreprises, secteurs, mesEntreprises, etapeInitiale }: {
  fiche: FicheAffichee;
  entreprises: EntrepriseChoix[];
  secteurs: { id: string; nom: string }[];
  mesEntreprises: string[];
  etapeInitiale: number;
}) {
  const router = useRouter();
  const [etape, setEtape] = useState(etapeInitiale);
  const [v, setV] = useState<Valeurs>(() => valeursDe(fiche));
  const [periode, setPeriode] = useState(Boolean(fiche.date_fin && fiche.date_fin !== fiche.date_debut));
  const [sale, setSale] = useState(false);
  const [texteGenere, setTexteGenere] = useState(false);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ton: "succes" | "erreur" | "attention"; texte: string } | null>(null);
  const [avertissements, setAvertissements] = useState<string[]>([]);
  const [confirmerRegeneration, setConfirmerRegeneration] = useState(false);
  const usine = fiche.type === "usine";

  // Modifications non enregistrées : le navigateur prévient avant de quitter la page.
  useEffect(() => {
    if (!sale) return;
    const avertir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, [sale]);

  const mes = useMemo(() => new Set(mesEntreprises), [mesEntreprises]);
  const entreprise = entreprises.find((e) => e.id === v.entreprise_id);

  function changer(cle: string, valeur: string) {
    setV((x) => ({ ...x, [cle]: valeur }));
    setSale(true);
    setMessage(null);
  }

  function choisirEntreprise(id: string) {
    const e = entreprises.find((x) => x.id === id);
    setV((x) => ({ ...x, entreprise_id: id, site_id: "", secteur_id: e?.secteurId ?? x.secteur_id }));
    setSale(true);
  }

  async function sauver(): Promise<boolean> {
    if (!sale) return true;
    setEnCours("sauver");
    const champs = { ...v, date_fin: periode ? v.date_fin : "", ...(texteGenere ? { texte_genere: "1" } : {}) };
    const r = await enregistrerFiche(fiche.id, champs).catch(() => ({ ok: false as const, erreur: "La base n'a pas répondu. Réessayez." }));
    setEnCours(null);
    if (!r.ok) {
      setMessage({ ton: "erreur", texte: r.erreur });
      return false;
    }
    setSale(false);
    setTexteGenere(false);
    setMessage({ ton: "succes", texte: "Fiche enregistrée." });
    router.refresh();
    return true;
  }

  async function aller(n: number) {
    if (n === etape || !(await sauver())) return;
    setEtape(n);
    setMessage(null);
    router.replace(`?etape=${n}`, { scroll: false });
    document.getElementById("contenu-etape")?.focus();
  }

  async function rediger() {
    setConfirmerRegeneration(false);
    if (!(await sauver())) return;
    setEnCours("ia");
    setAvertissements([]);
    try {
      const reponse = await fetch("/api/permanents/redaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ficheId: fiche.id }),
      });
      const r = (await reponse.json().catch(() => ({}))) as { texte?: string; avertissements?: string[]; erreur?: string };
      if (!reponse.ok || !r.texte) {
        setMessage({ ton: "erreur", texte: r.erreur ?? "La rédaction a échoué. Réessayez." });
        return;
      }
      setV((x) => ({ ...x, texte: r.texte! }));
      setSale(true);
      setTexteGenere(true);
      setAvertissements(r.avertissements ?? []);
      setMessage({ ton: "attention", texte: "Texte proposé par l'IA : relisez-le, corrigez-le, puis enregistrez." });
    } catch {
      setMessage({ ton: "erreur", texte: "Le service de rédaction est injoignable. Vérifiez votre connexion puis réessayez." });
    } finally {
      setEnCours(null);
    }
  }

  async function basculerStatut() {
    if (!(await sauver())) return;
    setEnCours("statut");
    const terminee = fiche.statut !== "terminee";
    const r = await changerStatut(fiche.id, terminee).catch(() => ({ ok: false as const, erreur: "La base n'a pas répondu. Réessayez." }));
    setEnCours(null);
    setMessage(r.ok ? { ton: "succes", texte: r.message ?? "C'est fait." } : { ton: "erreur", texte: r.erreur });
    router.refresh();
  }

  const champDate = (cle: "date_debut" | "date_fin", libelle: string) => (
    <div>
      <label htmlFor={cle} className={LIBELLE}>{libelle}</label>
      <input id={cle} type="text" inputMode="numeric" autoComplete="off" placeholder="jj/mm/aaaa" maxLength={10}
        className={`${CHAMP} ecg-chiffre`} value={v[cle]} onChange={(e) => changer(cle, formatDateFr(e.target.value))} />
    </div>
  );

  const manque = manquantsPourTerminer({
    type: fiche.type, titre: v.titre, date_debut: v.date_debut || null, entreprise_id: v.entreprise_id || null,
    secteur_id: v.secteur_id || null, texte: v.texte,
  });
  const TypeIcone = usine ? Factory : Network;

  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran icone="clipboard" titre={v.titre.trim() || "Nouvelle fiche de suivi"}
        description={<span className="inline-flex items-center gap-1"><TypeIcone size={15} aria-hidden /> {libelleType(fiche.type)} · {fiche.statut === "terminee" ? "terminée" : "brouillon"}</span>}
        actions={<Link href={`/espace/permanents/fiches/${fiche.id}`} className={BTN}><Eye size={18} aria-hidden /> Voir la fiche</Link>} />

      {/* Étapes : on peut sauter de l'une à l'autre, chaque passage enregistre. */}
      <nav aria-label="Étapes de la fiche">
        <ol className="grid grid-cols-5 gap-1.5">
          {ETAPES.map((e, i) => {
            const actif = i === etape;
            return (
              <li key={e.titre}>
                <button type="button" onClick={() => aller(i)} aria-current={actif ? "step" : undefined} disabled={enCours !== null}
                  className={`grid min-h-11 w-full justify-items-center gap-1 rounded-xl px-1 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                    actif ? "bg-[var(--app-fonce)] text-white" : "bg-[var(--ecg-surface)] text-[var(--ecg-texte)] hover:bg-[var(--app-pale)]"}`}>
                  <span className="inline-flex items-center gap-1">
                    {i < etape ? <Check size={15} aria-hidden /> : <e.icone size={15} aria-hidden />}
                    <span className="tabular-nums">{i + 1}</span>
                  </span>
                  <span className="hidden sm:inline">{e.titre}</span>
                  <span className="sr-only sm:hidden">{e.titre}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div id="contenu-etape" tabIndex={-1} className="grid gap-6 outline-none">
        {etape === 0 && (
          <Panneau titre="Quand et où" sousTitre={usine ? "L'entreprise et, si besoin, le site concerné." : "Le secteur concerné par l'événement."}>
            <div className="grid gap-4">
              <div>
                <label htmlFor="titre" className={LIBELLE}>Titre court</label>
                <input id="titre" className={CHAMP} value={v.titre} maxLength={160} onChange={(e) => changer("titre", e.target.value)}
                  placeholder={usine ? "Exemple : Grève contre la fermeture de la ligne 2…" : "Exemple : Négociation de l'accord sectoriel…"} />
              </div>
              <fieldset className="grid gap-3">
                <legend className={LIBELLE}>Date</legend>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Date unique ou période">
                  <button type="button" className="ecg-onglet" aria-pressed={!periode} onClick={() => { setPeriode(false); setSale(true); }}>Une date</button>
                  <button type="button" className="ecg-onglet" aria-pressed={periode} onClick={() => { setPeriode(true); setSale(true); }}>Une période</button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {champDate("date_debut", periode ? "Du" : "Le")}
                  {periode && champDate("date_fin", "Au")}
                </div>
              </fieldset>
              {usine && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="entreprise" className={LIBELLE}>Entreprise</label>
                    <select id="entreprise" className={CHAMP} value={v.entreprise_id} onChange={(e) => choisirEntreprise(e.target.value)}>
                      <option value="">Choisir…</option>
                      {mes.size > 0 && (
                        <optgroup label="Mes entreprises">
                          {entreprises.filter((e) => mes.has(e.id)).map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                        </optgroup>
                      )}
                      <optgroup label={mes.size ? "Autres entreprises" : "Entreprises"}>
                        {entreprises.filter((e) => !mes.has(e.id)).map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="site" className={LIBELLE}>Site (UTE)</label>
                    <select id="site" className={CHAMP} value={v.site_id} onChange={(e) => changer("site_id", e.target.value)} disabled={!entreprise?.sites.length}>
                      <option value="">Toute l&apos;entreprise</option>
                      {entreprise?.sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div className="sm:max-w-[50%]">
                <label htmlFor="secteur" className={LIBELLE}>Secteur</label>
                <select id="secteur" className={CHAMP} value={v.secteur_id} onChange={(e) => changer("secteur_id", e.target.value)} aria-describedby="secteur-aide">
                  <option value="">{usine ? "Celui de l'entreprise" : "Choisir…"}</option>
                  {secteurs.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
                <p id="secteur-aide" className={AIDE}>{usine ? "Repris de la fiche de l'entreprise ; il sert à classer le rapport de congrès." : "Il sert à classer le rapport de congrès."}</p>
              </div>
            </div>
          </Panneau>
        )}

        {etape === 1 && <PiecesFiche fiche={fiche} />}

        {etape === 2 && (
          <Panneau titre="Le suivi" sousTitre="Quelques mots par question suffisent. Une question sans réponse reste muette dans la fiche.">
            <div className="grid gap-5">
              {QUESTIONS.map((q) => (
                <div key={q.cle}>
                  <label htmlFor={q.cle} className={LIBELLE}>{q.question}</label>
                  <textarea id={q.cle} rows={3} className={CHAMP} value={v[q.cle]} onChange={(e) => changer(q.cle, e.target.value)}
                    aria-describedby={`${q.cle}-aide`} placeholder={`${q.aide.replace(/…$/, "")}…`} />
                  <p id={`${q.cle}-aide`} className={AIDE}>{q.libelle}</p>
                </div>
              ))}
            </div>
          </Panneau>
        )}

        {etape === 3 && (
          <Panneau titre="Rédaction" sousTitre="L'IA écrit le texte de la fiche à partir de vos réponses, sans rien inventer. Vous le relisez et le corrigez."
            actions={
              <button type="button" className={BTN_PRINCIPAL} disabled={enCours !== null}
                onClick={() => (v.texte.trim() && !texteGenere ? setConfirmerRegeneration(true) : rediger())}>
                {enCours === "ia" ? <IconeChargement size={18} /> : v.texte.trim() ? <RotateCcw size={18} aria-hidden /> : <Sparkles size={18} aria-hidden />}
                {enCours === "ia" ? "Rédaction en cours…" : v.texte.trim() ? "Rédiger à nouveau" : "Rédiger avec l'IA"}
              </button>
            }>
            <div className="grid gap-3">
              {confirmerRegeneration && (
                <div role="alertdialog" aria-labelledby="confirmer-ia" className="grid gap-2 rounded-xl bg-[var(--ecg-fond)] p-3">
                  <b id="confirmer-ia">Remplacer votre texte par une nouvelle proposition de l&apos;IA ?</b>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" autoFocus onClick={rediger} className={BTN_PRINCIPAL}>Remplacer</button>
                    <button type="button" onClick={() => setConfirmerRegeneration(false)} className={BTN}>Garder mon texte</button>
                  </div>
                </div>
              )}
              {avertissements.length > 0 && (
                <Alerte ton="attention" titre="À vérifier">
                  <ul className="list-disc pl-5">{avertissements.map((a) => <li key={a}>{a}</li>)}</ul>
                </Alerte>
              )}
              <label htmlFor="texte" className={LIBELLE}>Texte de la fiche</label>
              <textarea id="texte" rows={16} className={`${CHAMP} leading-relaxed`} value={v.texte} onChange={(e) => changer("texte", e.target.value)}
                aria-describedby="texte-aide" placeholder="Rédigez vous-même, ou utilisez « Rédiger avec l'IA »…" />
              <p id="texte-aide" className={AIDE}>Séparez les paragraphes par une ligne vide. C&apos;est ce texte qui part dans le PDF et le rapport de congrès.</p>
            </div>
          </Panneau>
        )}

        {etape === 4 && (
          <Panneau titre="Finaliser" sousTitre="Une fiche terminée peut entrer dans le rapport de congrès. Vous pouvez toujours la rouvrir.">
            <div className="grid gap-4">
              {fiche.statut === "terminee" ? (
                <Alerte ton="succes" titre="Fiche terminée.">Elle apparaît dans l&apos;historique de l&apos;entreprise et peut être retenue pour le rapport de congrès.</Alerte>
              ) : manque.length ? (
                <Alerte ton="attention" titre="Pour terminer la fiche, il manque :">
                  <ul className="list-disc pl-5">{manque.map((m) => <li key={m}>{m}</li>)}</ul>
                </Alerte>
              ) : (
                <Alerte ton="info" titre="La fiche est complète.">Marquez-la comme terminée quand vous l&apos;avez relue.</Alerte>
              )}
              <div className="flex flex-wrap items-start gap-3">
                <button type="button" className={fiche.statut === "terminee" ? BTN : BTN_PRINCIPAL} onClick={basculerStatut}
                  disabled={enCours !== null || (fiche.statut !== "terminee" && manque.length > 0)}>
                  {enCours === "statut" ? <IconeChargement size={18} /> : fiche.statut === "terminee" ? <RotateCcw size={18} aria-hidden /> : <CircleCheck size={18} aria-hidden />}
                  {fiche.statut === "terminee" ? "Repasser en brouillon" : "Marquer comme terminée"}
                </button>
                {sale ? (
                  <p className="ecg-texte-doux self-center text-sm">Enregistrez avant de générer le PDF.</p>
                ) : (
                  <BoutonPdf fiche={fiche} />
                )}
              </div>
            </div>
          </Panneau>
        )}
      </div>

      {message && <Alerte ton={message.ton}>{message.texte}</Alerte>}

      <div className="ecg-barre-actions">
        <span className="ecg-texte-doux text-sm" aria-live="polite">{sale ? "Modifications non enregistrées" : "Tout est enregistré"}</span>
        <div className="flex flex-wrap gap-2">
          {etape > 0 && (
            <button type="button" className={BTN} onClick={() => aller(etape - 1)} disabled={enCours !== null}>
              <ArrowLeft size={18} aria-hidden /> Précédent
            </button>
          )}
          <button type="button" className={BTN} onClick={sauver} disabled={!sale || enCours !== null}>
            {enCours === "sauver" ? <IconeChargement size={18} /> : <Save size={18} aria-hidden />} Enregistrer
          </button>
          {etape < ETAPES.length - 1 && (
            <button type="button" className={BTN_PRINCIPAL} onClick={() => aller(etape + 1)} disabled={enCours !== null}>
              Suivant <ArrowRight size={18} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
