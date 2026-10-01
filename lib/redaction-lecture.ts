import type Anthropic from "@anthropic-ai/sdk";
import { cleUrl } from "./lien-reel";
import { etatLecture, raisonLecture, type LectureSource, type SourceRedaction } from "./redaction-ia";

/** Rédaction assistée : rattache chaque page lue par l'outil web_fetch à sa source (serveur). */

export type SourceLue = SourceRedaction & { id: string; domaine: string };

/** Texte lu par l'outil web_fetch pour chaque source demandée, et état de chaque lecture. */
export function lecturesDepuis(blocs: Anthropic.ContentBlock[], demandees: SourceLue[]): { lectures: LectureSource[]; texte: string } {
  const urls = new Map<string, string>();
  for (const b of blocs) {
    if (b.type === "server_tool_use" && b.name === "web_fetch") {
      const url = (b.input as { url?: unknown })?.url;
      if (typeof url === "string") urls.set(b.id, url);
    }
  }
  const textes = new Map<string, string>();
  const erreurs = new Map<string, string>();
  for (const b of blocs) {
    if (b.type !== "web_fetch_tool_result") continue;
    const url = b.content.type === "web_fetch_result" ? b.content.url : urls.get(b.tool_use_id);
    // Page lue = la source dont l'adresse (ou à défaut le site) correspond.
    const source =
      url &&
      (demandees.find((s) => cleUrl(s.lien) === cleUrl(url)) ??
        demandees.find((s) => {
          try {
            return new URL(url).hostname === s.domaine;
          } catch {
            return false;
          }
        }));
    if (!source) continue;
    if (b.content.type === "web_fetch_tool_result_error") erreurs.set(source.id, b.content.error_code);
    else if (b.content.content.source.type === "text") {
      textes.set(source.id, `${textes.get(source.id) ?? ""}\n${b.content.content.source.data}`);
    }
  }
  const lectures = demandees.map((s): LectureSource => {
    const nom = s.source_nom ?? s.domaine;
    const etat = etatLecture(textes.get(s.id) ?? "");
    return etat === "echec"
      ? { source: nom, etat, raison: raisonLecture(erreurs.get(s.id)) }
      : { source: nom, etat };
  });
  return { lectures, texte: [...textes.values()].join("\n") };
}

