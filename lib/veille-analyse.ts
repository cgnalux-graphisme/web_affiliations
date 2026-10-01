import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dateArticle } from "./articles";
import { VEILLE_IGNORE } from "./veille";
import { lienReel } from "./lien-reel";
import { verifierLisibilite } from "./lisibilite";
import { FENETRE_HEURES, type AnalyseEnregistree, type ResultatAnalyse } from "./veille-tri";
import {
  ARTICLES_MAX,
  CONSIGNE_TRI,
  MODELE_TRI,
  SchemaTri,
  construireResultat,
  fusionnerDoublons,
  messageTri,
  type ArticleFil,
} from "./veille-tri-ia";

/** Erreur à afficher telle quelle à l'écran (avec son code HTTP). */
export class ErreurAnalyse extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const PUBLICATIONS_JOURS = 15;

/**
 * « Check IA » : soumet à Claude Sonnet 5 les articles du fil des 48 dernières heures (hors ignorés),
 * enregistre le classement dans site_veille_analyses et le renvoie.
 * `supabase` = client service_role (serveur uniquement). Les erreurs de l'API Anthropic remontent telles quelles.
 */
export async function analyserFil(supabase: SupabaseClient, origine: "manuel" | "auto"): Promise<AnalyseEnregistree> {
  const maintenant = Date.now();
  const debut = new Date(maintenant - FENETRE_HEURES * 60 * 60 * 1000).toISOString();
  const depuisPublications = new Date(maintenant - PUBLICATIONS_JOURS * 24 * 60 * 60 * 1000).toISOString();

  const [resFil, resPublications] = await Promise.all([
    supabase
      .from("site_veille")
      .select("id, titre, resume, lien, source_nom, date_publication, created_at, statut")
      .neq("statut", VEILLE_IGNORE)
      .or(`date_publication.gte.${debut},and(date_publication.is.null,created_at.gte.${debut})`)
      .order("date_publication", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(ARTICLES_MAX),
    supabase
      .from("site_articles")
      .select("titre")
      .gte("date_publication", depuisPublications)
      .order("date_publication", { ascending: false })
      .limit(60),
  ]);
  if (resFil.error) {
    console.error("check IA : lecture du fil", resFil.error);
    throw new ErreurAnalyse("Le fil ne peut pas être lu. Réessayez dans un instant.", 500);
  }
  const articles = (resFil.data ?? []) as ArticleFil[];
  if (!articles.length) {
    throw new ErreurAnalyse("Aucun article dans le fil des 48 dernières heures : rien à analyser.", 422);
  }
  // Les publications servent seulement à éviter les doublons : leur absence n'empêche pas l'analyse.
  if (resPublications.error) console.error("check IA : lecture des publications", resPublications.error);
  const publications = ((resPublications.data ?? []) as { titre: string }[]).map((p) => p.titre).filter(Boolean);

  const client = new Anthropic({ timeout: 240_000 });
  const reponse = await client.messages.parse({
    model: MODELE_TRI,
    max_tokens: 24000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: zodOutputFormat(SchemaTri) },
    system: CONSIGNE_TRI,
    messages: [{ role: "user", content: messageTri(articles, publications, dateArticle(new Date(maintenant).toISOString())) }],
  });
  if (reponse.stop_reason === "refusal") {
    throw new ErreurAnalyse("L'IA a refusé d'analyser le fil. Triez-le vous-même ou réessayez plus tard.", 422);
  }
  if (reponse.stop_reason !== "end_turn" || !reponse.parsed_output) {
    console.error("check IA : réponse incomplète", reponse.stop_reason);
    throw new ErreurAnalyse("L'IA a renvoyé une réponse vide ou incomplète. Réessayez.", 502);
  }

  const resultat = await enrichir(construireResultat(reponse.parsed_output, articles));
  const { data, error } = await supabase
    .from("site_veille_analyses")
    .insert({ origine, nb_articles: articles.length, resultat, modele: MODELE_TRI })
    .select("id, created_at, origine, nb_articles, resultat")
    .single();
  if (error || !data) {
    console.error("check IA : enregistrement", error);
    throw new ErreurAnalyse(
      "Le classement a été fait mais n'a pas pu être enregistré. La table site_veille_analyses existe-t-elle ? (migration du 01/10/2026)",
      500
    );
  }
  return data as AnalyseEnregistree;
}

/** Traite une liste par paquets de `n` en parallèle. */
async function parPaquets<T>(elements: T[], n: number, f: (e: T) => Promise<void>) {
  for (let i = 0; i < elements.length; i += n) await Promise.all(elements.slice(i, i + n).map(f));
}

/**
 * Après le classement (gratuit, sans IA) :
 * 1. alertes Google : adresse réelle du média retrouvée ;
 * 2. doublons fusionnés dans chaque sujet (l'alerte qui reprend l'article d'un média) ;
 * 3. rangs S, A, B : l'IA pourra-t-elle lire chaque article ? (robots.txt du média)
 * Un échec laisse l'article tel quel : jamais bloquant.
 */
async function enrichir(resultat: ResultatAnalyse): Promise<ResultatAnalyse> {
  const tous = resultat.sujets.flatMap((s) => s.articles);
  await parPaquets(
    tous.filter((a) => a.lien.includes("news.google.com")),
    4,
    async (a) => {
      const reel = await lienReel(a.lien);
      a.alerte = reel.alerte;
      a.lien = reel.lien;
    }
  );
  for (const s of resultat.sujets) s.articles = fusionnerDoublons(s.articles);
  const aVerifier = resultat.sujets.filter((s) => s.rang === "S" || s.rang === "A" || s.rang === "B").flatMap((s) => s.articles);
  await parPaquets(aVerifier, 6, async (a) => {
    a.lisible = (await verifierLisibilite(a.lien)).lisible;
  });
  return resultat;
}
