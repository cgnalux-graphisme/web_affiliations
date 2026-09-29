import type { Metadata } from "next";
import PageLegale, { Section } from "../PageLegale";

export const metadata: Metadata = {
  title: "Politique cookies — Centrale Générale FGTB Namur – Luxembourg",
  description: "Les cookies utilisés par le site : uniquement des cookies techniques, aucun traçage publicitaire.",
};

/** Texte : PAGES-LEGALES.md, section 3 (repris tel quel). */
export default function CookiesPage() {
  return (
    <PageLegale
      chemin="/cookies"
      titre="Politique cookies"
      intro={
        <p>
          Un cookie est un petit fichier déposé sur votre appareil lors de la visite d&apos;un site. Voici notre usage,
          volontairement minimal.
        </p>
      }
    >
      <Section titre="Cookies strictement nécessaires">
        <p>
          Notre site utilise uniquement des cookies techniques indispensables à son fonctionnement, notamment pour
          maintenir la session de connexion à l&apos;espace réservé aux administrateurs. Ces cookies ne nécessitent pas
          votre consentement.
        </p>
      </Section>

      <Section titre="Pas de traçage publicitaire">
        <p>
          Nous n&apos;utilisons aucun cookie publicitaire ni outil de traçage tiers. Les vidéos YouTube intégrées sont
          chargées en mode « sans cookie » : aucun cookie YouTube n&apos;est déposé tant que vous ne lancez pas la lecture.
          Les cartes Google Maps de la page Contact ne sont chargées que si vous cliquez sur « Afficher la carte » :
          Google peut alors déposer ses propres cookies.
          Les boutons de partage sont de simples liens, sans traceur.
        </p>
      </Section>

      <Section titre="Statistiques">
        <p>
          À ce jour, nous n&apos;utilisons aucun outil de mesure d&apos;audience. Si nous devions en ajouter un, un bandeau
          de consentement vous serait présenté au préalable, avant tout dépôt de cookie de mesure d&apos;audience.
        </p>
      </Section>

      <Section titre="Gérer les cookies">
        <p>
          Vous pouvez à tout moment consulter et supprimer les cookies via les réglages de votre navigateur (Chrome,
          Firefox, Edge, Safari…).
        </p>
      </Section>
    </PageLegale>
  );
}
