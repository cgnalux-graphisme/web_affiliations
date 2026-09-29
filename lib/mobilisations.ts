/**
 * Mobilisations (manifestations, grèves à venir) : utilitaires partagés entre l'espace admin et les pages
 * publiques. Fichier sans dépendance serveur (importable côté navigateur).
 * Table site_mobilisations (super admin) ; site_parametres (clé « accueil_mobilisation », « on » / « off ») ;
 * vue publique site_accueil_mobilisation = une ligne seulement si l'interrupteur est sur « on » ET qu'une
 * mobilisation est active. Rien n'est affiché sur le site public sans cette ligne.
 */

export const CLE_ACCUEIL_MOBILISATION = "accueil_mobilisation";
export const PARAM_ON = "on";
export const PARAM_OFF = "off";

/** Images hero : même bucket que le blog, dossier dédié. */
export function cheminHero(mobilisationId: string, id: string): string {
  return `mobilisations/${mobilisationId}/hero-${id}.jpg`;
}

export const CHEMIN_MOBILISATION = "/mobilisation";
export function cheminMobilisation(slug: string): string {
  return `${CHEMIN_MOBILISATION}/${slug}`;
}

/** Colonnes publiques (vue site_accueil_mobilisation). */
export type MobilisationPublique = {
  id: string;
  titre: string;
  slug: string | null;
  date_evenement: string | null;
  lieu: string | null;
  chapo: string | null;
  image_hero: string | null;
  pourquoi: string | null;
  revendications: string | null;
  infos_pratiques: string | null;
  lien_inscription: string | null;
};

export type Mobilisation = MobilisationPublique & { actif: boolean; created_at: string; updated_at: string };

export const COLONNES_PUBLIQUES =
  "id, titre, slug, date_evenement, lieu, chapo, image_hero, pourquoi, revendications, infos_pratiques, lien_inscription";

// ── Dates : saisie jj/mm/aaaa + hh:mm à l'heure de Bruxelles ↔ timestamptz ──

const FUSEAU = "Europe/Brussels";

function partiesBruxelles(d: Date) {
  const p = new Intl.DateTimeFormat("fr-BE", {
    timeZone: FUSEAU,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const v = (t: string) => Number(p.find((x) => x.type === t)?.value ?? "0");
  return { annee: v("year"), mois: v("month"), jour: v("day"), heure: v("hour"), minute: v("minute"), seconde: v("second") };
}

/** Décalage de Bruxelles par rapport à UTC (en ms) à un instant donné. */
function decalage(instant: number): number {
  const b = partiesBruxelles(new Date(instant));
  return Date.UTC(b.annee, b.mois - 1, b.jour, b.heure, b.minute, b.seconde) - Math.floor(instant / 1000) * 1000;
}

/** « 14/10/2026 » + « 10:30 » (heure de Bruxelles) → horodatage ISO UTC ; null si invalide. */
export function versHorodatage(date: string, heure: string): string | null {
  const d = date.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const h = (heure.trim() || "00:00").match(/^(\d{1,2})[:hH](\d{2})$/);
  if (!d || !h) return null;
  const [jour, mois, annee, hh, mm] = [+d[1], +d[2], +d[3], +h[1], +h[2]];
  if (hh > 23 || mm > 59) return null;
  const local = Date.UTC(annee, mois - 1, jour, hh, mm);
  const verif = new Date(local);
  if (verif.getUTCFullYear() !== annee || verif.getUTCMonth() !== mois - 1 || verif.getUTCDate() !== jour) return null;
  // Deux passes : le décalage dépend de l'heure d'été, calculée à l'instant visé.
  let instant = local - decalage(local);
  instant = local - decalage(instant);
  return new Date(instant).toISOString();
}

/** Horodatage → { date: « jj/mm/aaaa », heure: « hh:mm » } à l'heure de Bruxelles. */
export function depuisHorodatage(horodatage: string | null | undefined): { date: string; heure: string } {
  if (!horodatage) return { date: "", heure: "" };
  const t = new Date(horodatage);
  if (Number.isNaN(t.getTime())) return { date: "", heure: "" };
  const b = partiesBruxelles(t);
  const z = (n: number) => String(n).padStart(2, "0");
  return { date: `${z(b.jour)}/${z(b.mois)}/${b.annee}`, heure: `${z(b.heure)}:${z(b.minute)}` };
}

/** « 14/10/2026 » ou « 14/10/2026 à 10 h 30 » (l'heure est omise si elle vaut 00:00). */
export function dateMobilisation(horodatage: string | null | undefined, avecHeure = true): string {
  const { date, heure } = depuisHorodatage(horodatage);
  if (!date) return "";
  if (!avecHeure || heure === "00:00") return date;
  const [h, m] = heure.split(":");
  return `${date} à ${Number(h)} h ${m}`;
}

/** Heure de l'événement renseignée (≠ minuit) ? */
export function aUneHeure(horodatage: string | null | undefined): boolean {
  const { heure } = depuisHorodatage(horodatage);
  return Boolean(heure) && heure !== "00:00";
}

export type Rebours = { jours: number; heures: number; minutes: number; secondes: number };

/** Temps restant jusqu'à l'événement ; null s'il est passé. */
export function rebours(horodatage: string, maintenant: number): Rebours | null {
  const reste = new Date(horodatage).getTime() - maintenant;
  if (!(reste > 0)) return null;
  const s = Math.floor(reste / 1000);
  return { jours: Math.floor(s / 86400), heures: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), secondes: s % 60 };
}

/** L'événement a lieu aujourd'hui (à Bruxelles) ? */
export function estLeJourJ(horodatage: string, maintenant: number): boolean {
  const a = depuisHorodatage(horodatage).date;
  return Boolean(a) && a === depuisHorodatage(new Date(maintenant).toISOString()).date;
}

const MOIS: Record<string, string> = {
  janvier: "01",
  fevrier: "02",
  mars: "03",
  avril: "04",
  mai: "05",
  juin: "06",
  juillet: "07",
  aout: "08",
  septembre: "09",
  octobre: "10",
  novembre: "11",
  decembre: "12",
};

/**
 * Convention du site : jamais de mois en toutes lettres. « 14 octobre » → « 14/10/2026 » (année écrite,
 * sinon `annee`) ; « 1er mai 2027 » → « 01/05/2027 ». Sans année connue, le texte est laissé tel quel.
 */
export function datesEnChiffres(texte: string, annee: string | null): string {
  return texte.replace(
    /\b(\d{1,2})(?:er)?\s+(janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[ûu]t|septembre|octobre|novembre|d[ée]cembre)(?:\s+(\d{4}))?\b/gi,
    (tout, jour: string, mois: string, an?: string) => {
      const m = MOIS[mois.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")];
      const a = an ?? annee;
      if (!m || !a || Number(jour) < 1 || Number(jour) > 31) return tout;
      return `${jour.padStart(2, "0")}/${m}/${a}`;
    }
  );
}

// ── Textes ──

/** Paragraphes d'un texte brut (séparés par une ligne vide). */
export function paragraphes(texte: string | null | undefined): string[] {
  return (texte ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

/** Une ligne « Libellé : valeur » (infos pratiques) → libellé en gras ; sinon texte seul. */
export function ligneInfo(ligne: string): { libelle: string | null; texte: string } {
  const m = ligne.match(/^([^:]{2,40}?)\s*:\s+(.+)$/);
  if (m && !/https?$/i.test(m[1])) return { libelle: m[1].trim(), texte: m[2].trim() };
  return { libelle: null, texte: ligne };
}

/** Lien d'inscription accepté : http(s) uniquement. */
export function lienValide(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

// ── Partage par le visiteur, sur ses propres réseaux (aucune publication depuis nos comptes) ──

export type LienPartage = { reseau: "facebook" | "whatsapp" | "x" | "email"; label: string; href: string };

export function liensPartage(url: string, titre: string, texte: string): LienPartage[] {
  const e = encodeURIComponent;
  const message = `${titre} : ${texte}`.trim();
  return [
    { reseau: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}` },
    { reseau: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${e(`${message}\n${url}`)}` },
    { reseau: "x", label: "X", href: `https://x.com/intent/post?text=${e(message)}&url=${e(url)}` },
    {
      reseau: "email",
      label: "E-mail",
      href: `mailto:?subject=${e(titre)}&body=${e(`${texte}\n\nToutes les infos et l'inscription : ${url}`)}`,
    },
  ];
}
