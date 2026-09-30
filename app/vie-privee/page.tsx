import type { Metadata } from "next";
import PageLegale, { Courriel, Encadre, LienExterne, Liste, Section } from "../PageLegale";

export const metadata: Metadata = {
  title: "Politique de vie privée — Centrale Générale FGTB Namur-Luxembourg",
  description: "Quelles données personnelles nous traitons, pourquoi, combien de temps, et quels sont vos droits (RGPD).",
};

/** Texte : PAGES-LEGALES.md, section 2 (repris tel quel). */
export default function ViePriveePage() {
  return (
    <PageLegale
      chemin="/vie-privee"
      titre="Politique de vie privée"
      intro={
        <p>
          La protection de vos données personnelles est essentielle pour la Centrale Générale FGTB Namur-Luxembourg. La
          présente politique explique quelles données nous traitons, pourquoi, et quels sont vos droits, conformément au
          Règlement général sur la protection des données (RGPD) et à la loi belge.
        </p>
      }
    >
      <Section titre="Responsable du traitement">
        <p>
          Centrale Générale FGTB Namur-Luxembourg, Rue Fonteny Maroy 13, 6800 Libramont-Chevigny, en tant que section de
          la Centrale Générale – FGTB (Rue Haute 26-28, 1000 Bruxelles).
        </p>
      </Section>

      <Section titre="Données que nous traitons">
        <p>
          Selon les démarches que vous effectuez : identité (nom, prénom, date et lieu de naissance, genre, nationalité),
          coordonnées (adresse, e-mail, téléphone), numéro de registre national, données professionnelles (employeur,
          secteur, commission paritaire), données d&apos;affiliation et statut syndical, coordonnées bancaires (IBAN pour
          le mandat SEPA), données financières et fiscales, documents liés au chômage (C1, C3.2), signature électronique,
          et données de connexion à l&apos;espace réservé.
        </p>
        <Encadre titre="Donnée sensible">
          Votre affiliation syndicale est une donnée à caractère particulier au sens de l&apos;article 9 du RGPD. Nous la
          traitons dans le cadre strict de nos activités syndicales et avec les garanties appropriées.
        </Encadre>
      </Section>

      <Section titre="Finalités">
        <p>
          Gérer votre affiliation, traiter les cotisations et paiements, assurer la défense de vos droits (dossiers
          sociaux et juridiques, démarches chômage), vous informer de nos actions et communications, organiser la vie
          syndicale, et remplir nos obligations légales et comptables.
        </p>
      </Section>

      <Section titre="Bases juridiques">
        <p>
          Selon le cas : l&apos;exécution de nos engagements envers vous (affiliation), le respect d&apos;obligations
          légales, notre intérêt légitime à défendre les travailleurs, et votre consentement (par ex. pour certaines
          communications).
        </p>
      </Section>

      <Section titre="Durées de conservation">
        <Liste
          items={[
            "Communications : jusqu'à votre désinscription ;",
            "Données d'affiliation : 10 ans après la fin de l'affiliation ;",
            "Dossiers juridiques : 5 ans après la clôture du dossier ;",
            "Documents comptables : 10 ans après l'exercice concerné.",
          ]}
        />
      </Section>

      <Section titre="Formulaire de contact">
        <p>
          Quand vous nous écrivez via le formulaire de la page Contact, nous recevons votre nom, votre adresse e-mail, le
          sujet et votre message. Ils servent uniquement à vous répondre (base juridique : notre intérêt légitime à
          répondre aux demandes qui nous sont adressées). Ils ne sont pas enregistrés sur le site : ils nous parviennent
          par e-mail, via notre prestataire d&apos;envoi d&apos;e-mails, et sont conservés dans notre messagerie le temps
          nécessaire au traitement de votre demande et à son suivi.
        </p>
      </Section>

      <Section titre="Cartes Google Maps">
        <p>
          Si vous acceptez l&apos;affichage des cartes (voir la politique cookies), les cartes de la page Contact sont
          chargées depuis les serveurs de Google, qui reçoit alors votre adresse IP et des informations techniques sur
          votre navigateur. Google agit alors selon sa propre politique de confidentialité :{" "}
          <LienExterne href="https://policies.google.com/privacy?hl=fr">https://policies.google.com/privacy?hl=fr</LienExterne>
        </p>
      </Section>

      <Section titre="Partage des données">
        <p>
          Vos données peuvent être partagées, uniquement lorsque c&apos;est nécessaire, avec : les autres sections
          régionales et la FGTB interprofessionnelle, les organismes de paiement (banques, caisse de chômage), les
          autorités publiques (ONEM, sécurité sociale) et nos prestataires techniques (hébergement, envoi
          d&apos;e-mails), tenus à la confidentialité. Vos données ne sont jamais vendues.
        </p>
      </Section>

      <Section titre="Sécurité">
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles appropriées : hébergement de la base de
          données dans l&apos;Union européenne, accès restreint aux seules personnes autorisées, chiffrement des échanges.
        </p>
      </Section>

      <Section titre="Vos droits">
        <p>
          Vous disposez des droits d&apos;accès, de rectification, d&apos;effacement, de limitation, d&apos;opposition et
          de portabilité de vos données. Pour les exercer, contactez notre délégué à la protection des données.
        </p>
      </Section>

      <Section titre="Délégué à la protection des données (DPO)">
        <p>
          E-mail : <Courriel adresse="privacy@accg.be" /> — Rue Haute 26-28, 1000 Bruxelles.
        </p>
      </Section>

      <Section titre="Réclamation">
        <p>
          Vous pouvez introduire une réclamation auprès de l&apos;Autorité de protection des données : Rue de la Presse
          35, 1000 Bruxelles —{" "}
          <LienExterne href="https://www.autoriteprotectiondonnees.be/">https://www.autoriteprotectiondonnees.be/</LienExterne>
        </p>
      </Section>
    </PageLegale>
  );
}
