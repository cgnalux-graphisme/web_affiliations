import type { Metadata } from "next";
import Link from "next/link";
import BoutonReglagesCookies from "../BoutonReglagesCookies";
import PageLegale, { Courriel, Encadre, LienExterne, Liste, Section } from "../PageLegale";

export const metadata: Metadata = {
  title: "Politique cookies — Centrale Générale FGTB Namur – Luxembourg",
  description:
    "Les cookies du site : les indispensables, les cartes Google Maps avec votre accord, aucune publicité ni mesure d'audience.",
};

const LIEN_INTERNE =
  "font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge";

const code = (t: string) => <code className="rounded bg-militant-ardoise/15 px-1.5 py-0.5 text-[0.9em]">{t}</code>;

/** Texte : PAGES-LEGALES.md, section 3 (repris tel quel). */
export default function CookiesPage() {
  return (
    <PageLegale
      chemin="/cookies"
      titre="Politique cookies"
      intro={
        <p>
          Un cookie est un petit fichier déposé sur votre appareil par un site que vous visitez. Le « stockage local » et
          le « stockage de session » de votre navigateur fonctionnent de la même façon. Cette politique couvre les trois.
          Notre usage est volontairement minimal : pas de publicité, pas de mesure d&apos;audience, pas de revente de
          données.
        </p>
      }
    >
      <Section titre="Vos choix">
        <p>
          Vous pouvez à tout moment accepter ou refuser les cartes Google Maps, ou retirer votre accord.
        </p>
        <BoutonReglagesCookies className="inline-flex min-h-[48px] items-center rounded-xl bg-militant-bordeaux px-6 font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2">
          Gérer mes cookies
        </BoutonReglagesCookies>
      </Section>

      <Section titre="Qui est responsable ?">
        <p>
          La Centrale Générale FGTB Namur-Luxembourg, Rue Fonteny Maroy 13, 6800 Libramont-Chevigny (voir les{" "}
          <Link href="/mentions-legales" className={LIEN_INTERNE}>
            mentions légales
          </Link>
          ).
        </p>
      </Section>

      <Section titre="1. Indispensables — toujours actifs">
        <p>Ils sont nécessaires au fonctionnement du site et ne demandent pas votre accord.</p>
        <Liste
          items={[
            <>
              Votre choix de cookies ({code("accg-consentement")}, stockage local, 6 mois) : retenir votre choix pour ne
              pas vous le redemander à chaque page ;
            </>,
            <>
              Bandeau de mobilisation refermé ({code("bandeau-mobilisation-ferme")}, stockage de session, jusqu&apos;à la
              fermeture de l&apos;onglet) : ne plus afficher le bandeau que vous avez fermé ;
            </>,
            <>
              Parcours de transfert ({code("fgtb_transfer_journey")}, stockage de session, jusqu&apos;à la fermeture de
              l&apos;onglet) : garder votre progression d&apos;une étape à l&apos;autre du parcours ;
            </>,
            <>
              Session des administrateurs ({code("sb-…-auth-token")}, cookie, jusqu&apos;à la déconnexion et au plus 400
              jours) : uniquement pour les membres de l&apos;équipe connectés à l&apos;espace réservé.
            </>,
          ]}
        />
      </Section>

      <Section titre="2. Cartes Google Maps — avec votre accord">
        <p>
          La page Contact peut afficher une carte pour chacun de nos bureaux. Ces cartes sont fournies par Google : en
          les affichant, Google peut déposer ses propres cookies et lire des informations sur votre appareil. Leur nom,
          leur durée et leur usage sont fixés par Google :{" "}
          <LienExterne href="https://policies.google.com/technologies/cookies?hl=fr">
            https://policies.google.com/technologies/cookies?hl=fr
          </LienExterne>
        </p>
        <p>
          Sans votre accord, aucune carte n&apos;est chargée et aucune donnée n&apos;est envoyée à Google : un plan
          décoratif s&apos;affiche à la place, avec l&apos;adresse et un lien « Itinéraire ».
        </p>
      </Section>

      <Section titre="3. Vidéos YouTube — à votre demande">
        <p>
          Les vidéos de nos actions sont intégrées en mode « sans cookie » (youtube-nocookie.com) : rien n&apos;est chargé
          depuis le lecteur YouTube tant que vous ne cliquez pas sur une vidéo. En lançant la lecture, YouTube (Google)
          peut stocker des informations sur votre appareil.
        </p>
      </Section>

      <Section titre="Pas de publicité, pas de statistiques">
        <p>
          Nous n&apos;utilisons aucun cookie publicitaire, aucun outil de mesure d&apos;audience et aucun traceur de réseau
          social. Les boutons de partage et les liens vers nos réseaux sont de simples liens. Si nous ajoutions un jour
          un outil de mesure d&apos;audience, il serait soumis à votre accord préalable.
        </p>
      </Section>

      <Section titre="Votre accord">
        <p>
          À votre première visite, une fenêtre vous demande si vous acceptez les cartes Google Maps. Refuser est aussi
          simple qu&apos;accepter et ne vous prive d&apos;aucun service : les adresses, les horaires et les itinéraires
          restent disponibles. Votre choix est conservé 6 mois, puis vous est redemandé.
        </p>
        <Encadre titre="Changer d'avis">
          Vous pouvez modifier votre choix ou retirer votre accord à tout moment via le lien « Gérer les cookies », en
          bas de chaque page, ou avec le bouton « Gérer mes cookies » ci-dessus.
        </Encadre>
      </Section>

      <Section titre="Supprimer les cookies">
        <p>
          Retirer votre accord empêche le chargement des cartes, mais n&apos;efface pas les cookies que Google a déjà
          déposés : vous pouvez les supprimer dans les réglages de votre navigateur (Chrome, Firefox, Edge, Safari…), qui
          permettent aussi de bloquer les cookies.
        </p>
      </Section>

      <Section titre="Questions">
        <p>
          Pour toute question sur les cookies ou vos données : notre délégué à la protection des données,{" "}
          <Courriel adresse="privacy@accg.be" /> (voir la{" "}
          <Link href="/vie-privee" className={LIEN_INTERNE}>
            politique de vie privée
          </Link>
          ).
        </p>
      </Section>
    </PageLegale>
  );
}
