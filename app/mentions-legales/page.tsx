import type { Metadata } from "next";
import PageLegale, { Courriel, Liste, Section, Tel } from "../PageLegale";

export const metadata: Metadata = {
  title: "Mentions légales — Centrale Générale FGTB Namur – Luxembourg",
  description: "Éditeur, responsable de la publication, hébergement et conditions d'utilisation du site.",
};

/** Texte : PAGES-LEGALES.md, section 1 (repris tel quel). */
export default function MentionsLegalesPage() {
  return (
    <PageLegale chemin="/mentions-legales" titre="Mentions légales">
      <Section titre="Éditeur du site">
        <p>
          Centrale Générale FGTB Namur-Luxembourg
          <br />
          Association sans personnalité juridique
          <br />
          Siège : Rue Fonteny Maroy 13, 6800 Libramont-Chevigny (Belgique)
          <br />
          Numéro d&apos;entreprise (BCE) : 0850.076.920
        </p>
      </Section>

      <Section titre="Responsable de la publication">
        <p>Jonathan Hubert</p>
      </Section>

      <Section titre="Contact">
        <Liste
          items={[
            <>
              Bureau de Libramont : Rue Fonteny Maroy 13, 6800 Libramont-Chevigny —{" "}
              <Tel numero="+32 (0)61 530 160" lien="+3261530160" />
            </>,
            <>
              Bureau de Namur : Rue Dewez 40-42 (2e étage), 5000 Namur —{" "}
              <Tel numero="+32 (0)81 64 99 61" lien="+3281649961" />
            </>,
            <>
              E-mail : <Courriel adresse="cg.nalux@accg.be" />
            </>,
            <>
              WhatsApp : <Tel numero="+32 (0)478 34 11 79" lien="+32478341179" />
            </>,
          ]}
        />
      </Section>

      <Section titre="Conception et gestion du site">
        <p>
          <Courriel adresse="cgnalux-graphisme@outlook.com" />
        </p>
      </Section>

      <Section titre="Hébergement">
        <Liste
          items={[
            "Application web : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis (vercel.com).",
            "Base de données et fichiers : Supabase, hébergement dans l'Union européenne (région Europe de l'Ouest).",
          ]}
        />
      </Section>

      <Section titre="Propriété intellectuelle">
        <p>
          L&apos;ensemble des contenus de ce site (textes, visuels, mise en page) est la propriété de la Centrale Générale
          FGTB Namur-Luxembourg, sauf mention contraire. Les logos et marques FGTB sont protégés. Toute reproduction ou
          réutilisation, totale ou partielle, est soumise à autorisation préalable.
        </p>
      </Section>

      <Section titre="Responsabilité">
        <p>
          La Centrale Générale FGTB Namur-Luxembourg s&apos;efforce d&apos;assurer l&apos;exactitude des informations
          publiées mais ne peut être tenue responsable d&apos;erreurs, d&apos;omissions, ou de l&apos;indisponibilité du
          site. Les liens vers des sites externes (dont les formulaires d&apos;inscription de la FGTB fédérale)
          n&apos;engagent pas sa responsabilité quant à leur contenu.
        </p>
      </Section>

      <Section titre="Droit applicable">
        <p>
          Le présent site est régi par le droit belge. Tout litige relève de la compétence des tribunaux de
          l&apos;arrondissement compétent.
        </p>
      </Section>
    </PageLegale>
  );
}
