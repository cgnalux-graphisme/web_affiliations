"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, CircleCheck, Search, UserPlus } from "lucide-react";
import { formaterNiss } from "../../../lib/modification";
import { preparerPhoto } from "../../../lib/photos";
import { MODES_TRAJET, TICKETS_MAX, modeTrajet } from "../../../lib/liberations/jour-j";
import { IconeChargement } from "../../Chargement";
import { ajouterTicket, enregistrerPresence, verifierIdentite } from "./actions";
import Signature from "./Signature";

type Etape = "nom" | "identite" | "signature" | "trajet" | "infos" | "tickets" | "fini";

const CHAMP = "min-h-11 w-full rounded-xl border border-[#7C90A0] px-3 py-2 text-base focus:outline focus:outline-[3px] focus:outline-militant-rouge";
const LIBELLE = "mb-1 block font-semibold";
const BOUTON = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-militant-bordeaux px-5 font-semibold text-white disabled:opacity-50";
const BOUTON_SECOND = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-militant-charbon px-5 font-semibold";
const CHOIX = (actif: boolean) => `flex min-h-12 items-center gap-3 rounded-xl border px-4 py-2 text-left ${actif ? "border-militant-bordeaux bg-[#fbeceb] font-semibold" : "border-[#d5dbe0]"}`;
const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Parcours du participant (téléphone, sans compte) : 1. son nom ; 2. son n° de registre national (vérifié par le
 * serveur) ; 3. sa signature ; 4. son trajet ; 5. seulement s'ils manquent : domicile et genre ; puis les tickets
 * de train. « Je ne suis pas dans la liste » : présence à vérifier par un admin.
 */
export default function ParcoursPresence({ jeton, participants }: { jeton: string; participants: { id: string; nom: string }[] }) {
  const [etape, setEtape] = useState<Etape>("nom");
  const [q, setQ] = useState("");
  const [qui, setQui] = useState<{ id: string; nom: string } | null>(null);
  const [horsListe, setHorsListe] = useState(false);
  const [hors, setHors] = useState({ prenom: "", nom: "", entreprise: "" });
  const [registre, setRegistre] = useState("");
  const [passe, setPasse] = useState<string | null>(null);
  const [manque, setManque] = useState({ domicile: false, genre: false });
  const [signature, setSignature] = useState<string | null>(null);
  const [trajet, setTrajet] = useState({ mode: "", departDomicile: true, departAdresse: "", etapeAdresse: "", conducteurNom: "" });
  const [domicile, setDomicile] = useState({ rue: "", numero: "", boite: "", code_postal: "", localite: "" });
  const [genre, setGenre] = useState<"M" | "F" | null>(null);
  const [passeTickets, setPasseTickets] = useState<string | null>(null);
  const [tickets, setTickets] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [fin, setFin] = useState("");

  const visibles = useMemo(() => participants.filter((p) => !q.trim() || sansAccents(p.nom).includes(sansAccents(q.trim()))), [participants, q]);
  const mode = modeTrajet(trajet.mode);
  // Sans domicile connu (hors liste) : l'adresse de départ est demandée.
  const departDomicilePossible = !horsListe;
  const aller = (e: Etape) => { setErreur(""); setEtape(e); window.scrollTo({ top: 0 }); };

  async function verifier() {
    setEnCours(true);
    setErreur("");
    const r = await verifierIdentite(jeton, qui!.id, registre).catch(() => ({ ok: false as const, erreur: "Pas de connexion. Réessaie." }));
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    if (r.donnees!.dejaSigne) {
      setFin("Ta présence est déjà enregistrée aujourd'hui. Merci !");
      return aller("fini");
    }
    setPasse(r.donnees!.passe);
    setManque(r.donnees!.manque);
    aller("signature");
  }

  // Le domicile est demandé s'il manque et qu'il sert de départ au calcul des kilomètres.
  const domicileRequis = !horsListe && manque.domicile && trajet.departDomicile && mode?.rembourse !== "aucun";
  const besoinInfos = !horsListe && (manque.genre || domicileRequis);

  async function envoyer() {
    setEnCours(true);
    setErreur("");
    const r = await enregistrerPresence(jeton, {
      passe,
      horsListe: horsListe ? { ...hors, registre } : null,
      signature: signature ?? "",
      trajet: { ...trajet, departDomicile: departDomicilePossible ? trajet.departDomicile : false },
      domicile: !horsListe && manque.domicile && domicile.rue.trim() ? domicile : null,
      genre: !horsListe && manque.genre ? genre : null,
    }).catch(() => ({ ok: false as const, erreur: "Pas de connexion. Réessaie." }));
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    if (r.donnees!.passeTickets) {
      setPasseTickets(r.donnees!.passeTickets);
      return aller("tickets");
    }
    setFin(horsListe ? "Ta présence est enregistrée. Un responsable la vérifiera. Merci !" : "Ta présence est enregistrée. Merci, et bonne réunion !");
    aller("fini");
  }

  async function envoyerTickets(fichiers: File[]) {
    setEnCours(true);
    setErreur("");
    let refus = 0;
    for (const f of fichiers.slice(0, TICKETS_MAX - tickets)) {
      try {
        const corps = f.type.startsWith("image/") ? await preparerPhoto(f) : f;
        const fd = new FormData();
        fd.set("ticket", new File([corps], f.name.replace(/\.[^.]+$/, "") + (f.type.startsWith("image/") ? ".jpg" : ".pdf"), { type: f.type.startsWith("image/") ? "image/jpeg" : f.type }));
        const r = await ajouterTicket(jeton, passeTickets!, fd);
        if (r.ok) setTickets((n) => n + 1);
        else { refus++; setErreur(r.erreur); }
      } catch {
        refus++;
        setErreur("Une photo n'a pas pu être lue. Réessaie.");
      }
    }
    setEnCours(false);
    if (!refus) setErreur("");
  }

  const precedent = (e: Etape) => (
    <button type="button" className={BOUTON_SECOND} onClick={() => aller(e)} disabled={enCours}>
      <ArrowLeft size={18} aria-hidden /> Retour
    </button>
  );

  return (
    <div className="mt-6 grid gap-5">
      {etape === "nom" && (
        <section className="grid gap-3" aria-labelledby="t-nom">
          <h2 id="t-nom" className="text-xl font-semibold">1. Qui es-tu ?</h2>
          <label htmlFor="cherche" className="sr-only">Chercher ton nom</label>
          <div className="relative">
            <Search size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
            <input id="cherche" type="search" className={`${CHAMP} pl-10`} placeholder="Tape ton nom…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
          </div>
          <ul className="grid gap-2">
            {visibles.map((p) => (
              <li key={p.id}>
                <button type="button" className={`${CHOIX(false)} w-full`} onClick={() => { setQui(p); setHorsListe(false); setRegistre(""); aller("identite"); }}>
                  {p.nom}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className={`${BOUTON_SECOND} w-full`} onClick={() => { setQui(null); setHorsListe(true); setRegistre(""); aller("identite"); }}>
            <UserPlus size={18} aria-hidden /> Je ne suis pas dans la liste
          </button>
        </section>
      )}

      {etape === "identite" && (
        <section className="grid gap-4" aria-labelledby="t-id">
          <h2 id="t-id" className="text-xl font-semibold">2. {horsListe ? "Ton identité" : `Bonjour ${qui?.nom.split(" ")[0] ?? ""}`}</h2>
          {horsListe && (
            <>
              <div><label htmlFor="h-prenom" className={LIBELLE}>Prénom</label><input id="h-prenom" className={CHAMP} value={hors.prenom} autoComplete="given-name" onChange={(e) => setHors({ ...hors, prenom: e.target.value })} /></div>
              <div><label htmlFor="h-nom" className={LIBELLE}>Nom</label><input id="h-nom" className={CHAMP} value={hors.nom} autoComplete="family-name" onChange={(e) => setHors({ ...hors, nom: e.target.value })} /></div>
              <div><label htmlFor="h-ent" className={LIBELLE}>Entreprise</label><input id="h-ent" className={CHAMP} value={hors.entreprise} onChange={(e) => setHors({ ...hors, entreprise: e.target.value })} /></div>
            </>
          )}
          <div>
            <label htmlFor="registre" className={LIBELLE}>Ton n° de registre national</label>
            <input id="registre" className={CHAMP} inputMode="numeric" autoComplete="off" placeholder="85.07.30-033.28" maxLength={15}
              value={registre} onChange={(e) => setRegistre(formaterNiss(e.target.value))} aria-describedby="aide-registre" />
            <p id="aide-registre" className="mt-1 text-sm text-[#56646F]">Au dos de ta carte d&apos;identité. Il sert seulement à vérifier que c&apos;est bien toi.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {precedent("nom")}
            <button type="button" className={BOUTON} disabled={enCours || registre.replace(/\D/g, "").length !== 11 || (horsListe && (!hors.prenom.trim() || !hors.nom.trim()))}
              onClick={() => (horsListe ? aller("signature") : verifier())}>
              {enCours ? <IconeChargement size={18} /> : <ArrowRight size={18} aria-hidden />} Continuer
            </button>
          </div>
        </section>
      )}

      {etape === "signature" && (
        <section className="grid gap-4" aria-labelledby="t-sig">
          <h2 id="t-sig" className="text-xl font-semibold">3. Ta signature</h2>
          <Signature onChange={setSignature} />
          <div className="flex flex-wrap gap-2">
            {precedent("identite")}
            <button type="button" className={BOUTON} disabled={!signature} onClick={() => aller("trajet")}>
              <ArrowRight size={18} aria-hidden /> Continuer
            </button>
          </div>
        </section>
      )}

      {etape === "trajet" && (
        <section className="grid gap-4" aria-labelledby="t-traj">
          <h2 id="t-traj" className="text-xl font-semibold">4. Ton trajet aujourd&apos;hui</h2>
          <fieldset className="grid gap-2">
            <legend className={LIBELLE}>Comment es-tu venu(e) ?</legend>
            {MODES_TRAJET.map((m) => (
              <label key={m.code} className={CHOIX(trajet.mode === m.code)}>
                <input type="radio" name="mode" checked={trajet.mode === m.code} onChange={() => setTrajet({ ...trajet, mode: m.code })} />
                {m.libelle}
              </label>
            ))}
          </fieldset>
          {mode && mode.rembourse !== "aucun" && (
            departDomicilePossible ? (
              <fieldset className="grid gap-2">
                <legend className={LIBELLE}>Tu pars de ton domicile ?</legend>
                <div className="grid grid-cols-2 gap-2">
                  <label className={CHOIX(trajet.departDomicile)}><input type="radio" name="depart" checked={trajet.departDomicile} onChange={() => setTrajet({ ...trajet, departDomicile: true })} /> Oui</label>
                  <label className={CHOIX(!trajet.departDomicile)}><input type="radio" name="depart" checked={!trajet.departDomicile} onChange={() => setTrajet({ ...trajet, departDomicile: false })} /> Non, autre adresse</label>
                </div>
              </fieldset>
            ) : null
          )}
          {mode && mode.rembourse !== "aucun" && (!departDomicilePossible || !trajet.departDomicile) && (
            <div>
              <label htmlFor="depart" className={LIBELLE}>Adresse de départ</label>
              <input id="depart" className={CHAMP} placeholder="Rue et numéro, code postal, localité…" value={trajet.departAdresse} onChange={(e) => setTrajet({ ...trajet, departAdresse: e.target.value })} />
            </div>
          )}
          {mode?.etape && (
            <div>
              <label htmlFor="etape" className={LIBELLE}>{mode.etape === "gare" ? "Gare de départ du train" : "Adresse du point de rendez-vous"}</label>
              <input id="etape" className={CHAMP} placeholder={mode.etape === "gare" ? "Exemple : Gare de Ciney…" : "Rue, localité…"} value={trajet.etapeAdresse} onChange={(e) => setTrajet({ ...trajet, etapeAdresse: e.target.value })} />
            </div>
          )}
          {mode?.conducteur && (
            <div>
              <label htmlFor="conducteur" className={LIBELLE}>Nom du conducteur ou de la conductrice</label>
              <input id="conducteur" className={CHAMP} value={trajet.conducteurNom} onChange={(e) => setTrajet({ ...trajet, conducteurNom: e.target.value })} />
            </div>
          )}
          {mode?.tickets && <p className="text-sm text-[#56646F]">Tu pourras photographier tes tickets de train à l&apos;étape suivante.</p>}
          <div className="flex flex-wrap gap-2">
            {precedent("signature")}
            <button type="button" className={BOUTON} disabled={!mode || enCours} onClick={() => (besoinInfos ? aller("infos") : envoyer())}>
              {enCours ? <IconeChargement size={18} /> : <ArrowRight size={18} aria-hidden />} {besoinInfos ? "Continuer" : "Enregistrer ma présence"}
            </button>
          </div>
        </section>
      )}

      {etape === "infos" && (
        <section className="grid gap-4" aria-labelledby="t-infos">
          <h2 id="t-infos" className="text-xl font-semibold">5. Il nous manque…</h2>
          {manque.genre && (
            <fieldset className="grid gap-2">
              <legend className={LIBELLE}>Pour tes courriers, on écrit…</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className={CHOIX(genre === "M")}><input type="radio" name="genre" checked={genre === "M"} onChange={() => setGenre("M")} /> délégué</label>
                <label className={CHOIX(genre === "F")}><input type="radio" name="genre" checked={genre === "F"} onChange={() => setGenre("F")} /> déléguée</label>
              </div>
            </fieldset>
          )}
          {manque.domicile && (
            <fieldset className="grid gap-3">
              <legend className={LIBELLE}>Ton domicile (pour calculer tes kilomètres)</legend>
              <div><label htmlFor="d-rue" className="mb-1 block text-sm">Rue</label><input id="d-rue" className={CHAMP} autoComplete="address-line1" value={domicile.rue} onChange={(e) => setDomicile({ ...domicile, rue: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label htmlFor="d-num" className="mb-1 block text-sm">Numéro</label><input id="d-num" className={CHAMP} value={domicile.numero} onChange={(e) => setDomicile({ ...domicile, numero: e.target.value })} /></div>
                <div><label htmlFor="d-bte" className="mb-1 block text-sm">Boîte</label><input id="d-bte" className={CHAMP} value={domicile.boite} onChange={(e) => setDomicile({ ...domicile, boite: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
                <div><label htmlFor="d-cp" className="mb-1 block text-sm">Code postal</label><input id="d-cp" className={CHAMP} inputMode="numeric" maxLength={4} autoComplete="postal-code" value={domicile.code_postal} onChange={(e) => setDomicile({ ...domicile, code_postal: e.target.value.replace(/\D/g, "") })} /></div>
                <div><label htmlFor="d-loc" className="mb-1 block text-sm">Localité</label><input id="d-loc" className={CHAMP} autoComplete="address-level2" value={domicile.localite} onChange={(e) => setDomicile({ ...domicile, localite: e.target.value })} /></div>
              </div>
            </fieldset>
          )}
          <div className="flex flex-wrap gap-2">
            {precedent("trajet")}
            <button type="button" className={BOUTON} onClick={envoyer}
              disabled={enCours || (manque.genre && !genre) || (domicileRequis && !(domicile.rue.trim() && /^\d{4}$/.test(domicile.code_postal) && domicile.localite.trim()))}>
              {enCours ? <IconeChargement size={18} /> : <CircleCheck size={18} aria-hidden />} Enregistrer ma présence
            </button>
          </div>
        </section>
      )}

      {etape === "tickets" && (
        <section className="grid gap-4" aria-labelledby="t-tickets">
          <h2 id="t-tickets" className="text-xl font-semibold">Ta présence est enregistrée. Tes tickets de train ?</h2>
          <p>Photographie chaque ticket (aller et retour). {tickets ? <b>{tickets} ticket{tickets > 1 ? "s" : ""} envoyé{tickets > 1 ? "s" : ""}.</b> : null}</p>
          {tickets < TICKETS_MAX && (
            <label className={`${BOUTON} cursor-pointer`}>
              {enCours ? <IconeChargement size={18} /> : <Camera size={18} aria-hidden />} Photographier un ticket
              <input type="file" accept="image/*,application/pdf" capture="environment" multiple className="sr-only" disabled={enCours}
                onChange={(e) => {
                  // Copier la liste AVANT de vider le champ (Chrome et Edge vident aussi la FileList).
                  const f = Array.from(e.currentTarget.files ?? []);
                  e.currentTarget.value = "";
                  envoyerTickets(f);
                }} />
            </label>
          )}
          <button type="button" className={BOUTON_SECOND} disabled={enCours} onClick={() => { setFin("C'est noté. Merci, et bonne réunion !"); aller("fini"); }}>
            {tickets ? "J'ai terminé" : "Je n'ai pas de ticket maintenant"}
          </button>
        </section>
      )}

      {etape === "fini" && (
        <section className="grid justify-items-center gap-3 rounded-2xl border border-[#d5dbe0] p-6 text-center" role="status">
          <CircleCheck size={40} className="text-militant-bordeaux" aria-hidden />
          <p className="text-lg font-semibold">{fin}</p>
        </section>
      )}

      {erreur && <p role="alert" className="rounded-xl border border-militant-bordeaux bg-[#fbeceb] p-3 font-semibold text-militant-bordeaux">{erreur}</p>}
    </div>
  );
}
