import type { Metadata } from "next";
import Link from "next/link";
import ReglagesCookies from "./ReglagesCookies";
import PageLegale, { Courriel, Encadre, LienExterne, Section } from "../PageLegale";

export const metadata: Metadata = {
  title: "Politique cookies — Centrale Générale FGTB Namur – Luxembourg",
  description:
    "Chaque cookie du site en détail, avec la possibilité de l'activer ou de le désactiver. Aucune publicité ni mesure d'audience.",
};

const LIEN_INTERNE =
  "font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge";

/** Texte : PAGES-LEGALES.md, section 3 (repris tel quel) ; liste détaillée : ELEMENTS_COOKIES (lib/consentement.ts). */
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
      <div id="reglages" className="scroll-mt-28">
        <Section titre="Réglages et liste des cookies">
          <p>
            Voici tout ce que le site peut enregistrer sur votre appareil. Activez ou désactivez chaque élément soumis à
            votre accord : votre choix est enregistré immédiatement.
          </p>
          <ReglagesCookies />
        </Section>
      </div>

      <Section titre="Qui est responsable ?">
        <p>
          La Centrale Générale FGTB Namur-Luxembourg, Rue Fonteny Maroy 13, 6800 Libramont-Chevigny (voir les{" "}
          <Link href="/mentions-legales" className={LIEN_INTERNE}>
            mentions légales
          </Link>
          ).
        </p>
      </Section>

      <Section titre="Cartes Google Maps — avec votre accord">
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

      <Section titre="Vidéos YouTube — avec votre accord">
        <p>
          Les vidéos de nos actions sont intégrées en mode « sans cookie » (youtube-nocookie.com). Sans votre accord, ni
          l&apos;aperçu ni le lecteur ne sont chargés depuis YouTube. Avec votre accord, l&apos;aperçu s&apos;affiche et
          le lecteur se charge quand vous cliquez sur une vidéo : YouTube (Google) peut alors stocker des informations
          sur votre appareil.
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
          À votre première visite, une fenêtre vous propose de tout refuser ou de tout accepter. Refuser est aussi
          simple qu&apos;accepter et ne vous prive d&apos;aucun service essentiel : les adresses, les horaires et les
          itinéraires restent disponibles. Votre choix est conservé 6 mois, puis vous est redemandé.
        </p>
        <Encadre titre="Changer d'avis">
          Vous pouvez modifier chaque choix ou retirer votre accord à tout moment, dans les réglages ci-dessus. Le lien
          « Gérer les cookies », en bas de chaque page, vous y amène.
        </Encadre>
      </Section>

      <Section titre="Supprimer les cookies">
        <p>
          Retirer votre accord empêche le chargement des cartes et des vidéos, mais n&apos;efface pas les cookies que
          Google a déjà déposés : vous pouvez les supprimer dans les réglages de votre navigateur (Chrome, Firefox, Edge,
          Safari…), qui permettent aussi de bloquer les cookies.
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
