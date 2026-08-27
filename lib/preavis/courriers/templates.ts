/**
 * Textes sources verbatim (design spec §7), fournis par l'utilisateur
 * (documents .doc, auteur Martin Pierrard, FGTB). Le texte légal n'est
 * jamais reformulé : seuls les jetons {{TOKEN}} (blancs à pointillés de
 * l'original + placeholders [XXX] du modèle) sont remplacés par
 * fusion.ts.
 */

export const TEMPLATE_COMMUN_ACCORD = `CONVENTION DE RUPTURE DE COMMUN ACCORD

Entre les soussignés :

D'une part, le travailleur : {{NOM_TRAVAILLEUR}}
domicilié(e) à : {{DOMICILE_TRAVAILLEUR}}

D'autre part, l'employeur / la société : {{NOM_EMPLOYEUR}}
représenté(e) par : {{REPRESENTANT_EMPLOYEUR}}
ayant son siège à : {{SIEGE_EMPLOYEUR}}

Il est convenu ce qui suit :

1) Les parties décident librement et d'un commun accord de mettre fin au
   contrat de travail qui les lie à la date du {{DATE_FIN_CONTRAT}}, {{MENTION_PRESTATION}}.

2) Sous réserve du paiement de la rémunération, du pécule de vacances, des
   avantages acquis et de la remise des documents sociaux dus, chacune des
   parties renonce à réclamer à l'autre une indemnité compensatoire de
   préavis du seul fait de cette rupture.

3) L'employeur remettra au travailleur, dans les délais légaux, le décompte
   final et les documents sociaux requis, notamment le formulaire C4.

4) Chacune des parties reconnaît avoir reçu un original signé de la
   présente convention.

Fait en deux exemplaires à {{LIEU_SIGNATURE}}, le {{DATE_SIGNATURE}}

Signature du travailleur               Signature de l'employeur
« Lu et approuvé »                     « Lu et approuvé »`;

export const TEMPLATE_NOTIFICATION_DEMISSION = `NOTIFICATION DE PRÉAVIS PAR LE TRAVAILLEUR
PAR COURRIER RECOMMANDÉ

Je soussigné(e) : {{NOM_TRAVAILLEUR}}
domicilié(e) à : {{DOMICILE_TRAVAILLEUR}}

avertis par la présente mon employeur, {{NOM_EMPLOYEUR}}
que je mets fin à mon contrat de travail moyennant un délai de préavis.

Compte tenu de mon ancienneté, la durée de mon préavis est de :
{{DUREE_PREAVIS}}

Le délai de préavis débutera le : {{DATE_DEBUT_PREAVIS}}.

Il couvrira la période du {{DATE_DEBUT_PREAVIS}} au {{DATE_FIN_PREAVIS}} inclus.

Fait à {{LIEU_SIGNATURE}}, le {{DATE_SIGNATURE}}

Signature du travailleur,`;

/** Les trois formulations possibles pour la mention "avec/sans prestation" (point 1 de la convention). */
export const MENTION_PRESTATION_AVEC = "après l'exécution de la journée de travail";
export const MENTION_PRESTATION_SANS = "sans prestation ce jour-là";
export const MENTION_PRESTATION_NON_RESOLUE = `${MENTION_PRESTATION_AVEC} / ${MENTION_PRESTATION_SANS}\n   (biffer la mention inutile)`;
