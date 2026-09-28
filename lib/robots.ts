/**
 * Lecture d'un robots.txt (RFC 9309, simplifiée) : le site autorise-t-il un robot à lire une page ?
 * Sert à savoir, sans frais, si l'IA peut lire un article : l'outil web_fetch d'Anthropic
 * se présente comme « Claude-User » (vérifié le 28/09/2026 sur rtl.be, qui le bloque, et rtbf.be, qui l'autorise).
 */

export const ROBOT_LECTURE_IA = "claude-user";

type Regle = { autorise: boolean; motif: string };
type Groupe = { agents: string[]; regles: Regle[] };

function lireGroupes(robots: string): Groupe[] {
  const groupes: Groupe[] = [];
  let courant: Groupe | null = null;
  let dansAgents = false;
  for (const brute of robots.split(/\r?\n/)) {
    const ligne = brute.replace(/#.*$/, "").trim();
    const m = ligne.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const cle = m[1].toLowerCase();
    const valeur = m[2].trim();
    if (cle === "user-agent") {
      // Plusieurs lignes User-agent consécutives partagent le même groupe de règles.
      if (!courant || !dansAgents) {
        courant = { agents: [], regles: [] };
        groupes.push(courant);
      }
      courant.agents.push(valeur.toLowerCase());
      dansAgents = true;
    } else if (cle === "allow" || cle === "disallow") {
      dansAgents = false;
      if (!courant) continue;
      // « Disallow: » vide = tout est permis : on ne l'enregistre pas.
      if (valeur) courant.regles.push({ autorise: cle === "allow", motif: valeur });
    } else {
      dansAgents = false;
    }
  }
  return groupes;
}

function motifEnRegex(motif: string): RegExp {
  const fin = motif.endsWith("$");
  const corps = (fin ? motif.slice(0, -1) : motif)
    .split("*")
    .map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${corps}${fin ? "$" : ""}`);
}

/**
 * Le robot `agent` peut-il lire `chemin` (avec la requête, ex. "/article/x?id=1") ?
 * Groupe le plus spécifique (nom du robot) sinon « * » ; la règle la plus longue l'emporte,
 * Allow gagne à égalité ; sans règle applicable, c'est permis.
 */
export function robotAutorise(robots: string, agent: string, chemin: string): boolean {
  const groupes = lireGroupes(robots);
  const nom = agent.toLowerCase();
  const propres = groupes.filter((g) => g.agents.some((a) => a !== "*" && nom.startsWith(a)));
  const applicables = propres.length ? propres : groupes.filter((g) => g.agents.includes("*"));
  let meilleure: Regle | null = null;
  for (const r of applicables.flatMap((g) => g.regles)) {
    if (!motifEnRegex(r.motif).test(chemin)) continue;
    if (
      !meilleure ||
      r.motif.length > meilleure.motif.length ||
      (r.motif.length === meilleure.motif.length && r.autorise)
    ) {
      meilleure = r;
    }
  }
  return meilleure ? meilleure.autorise : true;
}
