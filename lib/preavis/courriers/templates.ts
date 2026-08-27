/**
 * Textes sources verbatim, reproduits depuis les Annexes A et B du support
 * interne "Récap démission" de la Centrale Générale FGTB Namur-Luxembourg
 * (analysé le 2026-08-27, remplace les modèles .doc fournis initialement à
 * la demande de l'utilisateur). Le texte légal n'est jamais reformulé :
 * seuls les jetons {{TOKEN}} (blancs à pointillés/soulignés de l'original)
 * sont remplacés par fusion.ts.
 *
 * Contrairement au modèle précédent, les blocs d'adresse de l'expéditeur et
 * du destinataire de l'Annexe A sont rendus par le composant PDF
 * (LettrePDF) et NE FONT PAS partie de ce texte — celui-ci démarre à la
 * ligne "Lieu, Date". L'Annexe B (convention), à l'inverse, est un document
 * contractuel autonome dont les blocs d'identité des deux parties font
 * partie intégrante du corps.
 */

export const TEMPLATE_NOTIFICATION_DEMISSION = `{{LIEU_SIGNATURE}}, le {{DATE_SIGNATURE}}

Madame, Monsieur,

Concerne : rupture de contrat de travail à l'initiative du travailleur - démission
Courrier recommandé

Par la présente, je vous annonce que je mets fin à mon contrat de travail.

Mon préavis, d'une durée de {{DUREE_SEMAINES}} (en toutes lettres : {{DUREE_SEMAINES_LETTRES}}) semaines, débutera le lundi {{DATE_DEBUT_PREAVIS}}.

Au terme de mon préavis, je vous prie de m'adresser l'ensemble des documents légaux relatifs à mon occupation dans votre entreprise (notamment, formulaire C4, fiche(s) de salaires, attestation(s) en vue de la déclaration fiscale, …) et de solder mon salaire.

Je vous prie, Madame, Monsieur, d'agréer mes sincères salutations.


Signature


Si l'employeur accepte la remise par le travailleur / la travailleuse de ce courrier en mains propres, l'employeur doit dater, cacheter et signer une copie de ce courrier POUR RECEPTION ET POUR ACCORD (en écrivant explicitement ces deux termes à côté de sa signature et de la date) et la remettre au travailleur / à la travailleuse.`;

export const TEMPLATE_COMMUN_ACCORD = `Convention de rupture de contrat de commun accord


Entre l'employeur :

{{NOM_EMPLOYEUR}}
{{SIEGE_EMPLOYEUR}}

Et le travailleur :

{{NOM_TRAVAILLEUR}}
{{DOMICILE_TRAVAILLEUR}}


Il a été convenu ce qui suit :

Les parties déclarent mettre fin, d'un commun accord, au contrat de travail conclu entre elles le {{DATE_ENTREE_SERVICE}}, pour la fonction de {{FONCTION}}.

Cette rupture prendra effet à la date du {{DATE_FIN_CONTRAT}} et ce, sans préavis.

Les parties confirment qu'il s'agit d'une rupture amiable, librement consentie, sans vice du consentement, et qu'aucune autre indemnité que celles prévues par la loi ne sera due.

Les documents de fin de contrat (certificat de travail, C4, compte individuel, fiche fiscale) seront remis au Travailleur dans les délais légaux.

Fait à {{LIEU_SIGNATURE}}, le {{DATE_SIGNATURE}}.

Signatures :

L'Employeur :                                    Le Travailleur :
[Nom + Signature]                                [Nom + Signature]`;
