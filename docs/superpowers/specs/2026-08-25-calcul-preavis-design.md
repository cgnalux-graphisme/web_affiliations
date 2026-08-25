# Module de calcul de préavis (droit belge) — Design

Date : 2026-08-25
Statut : en attente de revue utilisateur

## 1. Objectif et périmètre

Ajouter un module public, visuellement cohérent avec le reste de l'application
(cartes rouge/blanc FGTB), qui aide **le travailleur** à :

1. calculer la durée légale de son préavis (qu'il soit donné par l'employeur
   ou par lui-même en cas de démission), et l'indemnité compensatoire estimée
   en cas de rupture immédiate ;
2. comprendre les sanctions ONEM liées à une démission (chômage volontaire) ;
3. connaître les procédures légales de notification (pli simple, recommandé,
   remise en main propre, huissier) selon qui rompt le contrat ;
4. calculer les dates clés : date limite d'envoi d'un recommandé, date de
   début de préavis, date de fin ;
5. générer, prêts à l'emploi, les courriers de **démission** et de **rupture
   de commun accord** (voir §6 — textes sourcés, fournis par l'utilisateur).

**Hors périmètre, explicitement exclu** : rédaction d'un courrier de
licenciement côté employeur. L'outil aide uniquement le travailleur ; le
scénario « licenciement par l'employeur » reste un calcul d'information
(durée de préavis / indemnité à laquelle il a droit), sans génération de
courrier associée.

**Stockage** : aucun envoi ni enregistrement serveur. Calcul et génération de
courrier entièrement côté client (cohérent avec le traitement de données
personnelles — salaire, dates, identité — dans un outil public).

**Utilisateurs** : grand public (affiliés) et permanents FGTB, même parcours
pour les deux.

## 2. Scénarios couverts

| Scénario | Calcul | Courrier généré |
|---|---|---|
| Licenciement par l'employeur (préavis presté) | Durée de préavis + dates | — |
| Licenciement avec indemnité (rupture immédiate) | Indemnité compensatoire estimée | — |
| Démission du travailleur | Durée de préavis + dates + sanctions ONEM | Notification de préavis par le travailleur |
| Rupture de commun accord | — (pas de délai légal imposé) | Convention de rupture de commun accord |

## 3. Modèle de données (entrées du wizard)

Étape « situation » :
- Statut : ouvrier / employé
- Date d'entrée en service
- Commission paritaire (liste recherchable ; option « je ne sais pas / régime général »)
- Rémunération annuelle brute (nécessaire pour le régime transitoire pré-2014,
  seuils bas/haut salaire employés)
- Qui rompt : employeur / travailleur / commun accord
- Si employeur : mode = préavis presté vs rupture immédiate avec indemnité
- Date de rupture envisagée (date de notification / d'envoi prévue), ou en
  mode inversé : date de début ou de fin de préavis souhaitée

Étape « vos coordonnées » (uniquement si démission ou commun accord, pour
pré-remplir le courrier) :
- Nom du travailleur, domicile
- Nom de l'employeur / de la société, siège
- Lieu de signature souhaité

Ces champs restent optionnels : si non renseignés, le courrier généré garde
les pointillés du document original (comme le modèle source), donc l'outil
reste utilisable même sans cette étape.

## 4. Architecture

```
app/preavis/
  page.tsx                       # wizard multi-étapes (client component)
lib/preavis/
  types.ts                       # types du domaine
  baremes/
    general.ts                   # barème légal général (statut unique, Art. 37/2)
    sac-a-dos.ts                 # régime transitoire pré-2014 (partie gelée + partie post-2014)
    commissions-paritaires/
      cp<xxx>.ts                 # dérogations sectorielles connues et documentées
      index.ts                   # registre + fallback régime légal supplétif
    sources.md                   # traçabilité légale : référence + date de vérification par barème
  calcul-preavis.ts              # moteur : ancienneté + barème → durée de préavis / indemnité
  jours-ouvrables.ts             # jours fériés légaux BE + "jour ouvrable" + "premier lundi qui suit"
  dates-preavis.ts               # prise de cours, date de fin, calcul rétroactif date d'envoi recommandé
  courriers/
    templates.ts                 # texte source verbatim des 2 modèles (voir §6)
    fusion.ts                    # remplacement des placeholders par les données calculées/saisies
  contenu-onem-sanctions.ts      # bloc informatif versionné (sanctions chômage volontaire)
  contenu-procedures-envoi.ts    # bloc informatif versionné (pli simple/recommandé/main propre/huissier)
```

Séparation stricte **barèmes (données légales sourcées)** / **moteur de
calcul (logique pure)** : un barème se met à jour sans toucher au code de
calcul, et chaque valeur est traçable à sa source légale et sa date de
vérification dans `sources.md`.

Aucun chiffre légal n'est fixé dans ce design : l'étape d'implémentation
commence par une recherche des textes à jour (Art. 37/2 statut unique,
seuils de rémunération, régimes transitoires par statut, liste des CP à
inclure en priorité, régime de sanction ONEM actuel) avant d'écrire les
barèmes.

## 5. Moteur de calcul

- Ancienneté ≥ 1/1/2014 uniquement → barème général seul.
- Ancienneté commencée avant 1/1/2014 → règle du **sac à dos** : partie 1
  gelée au 31/12/2013 selon l'ancien régime (dépend du statut, et pour les
  ouvriers souvent de la CP) + partie 2 selon le barème général sur
  l'ancienneté acquise depuis 2014. Les deux parties s'additionnent.
- CP sélectionnée avec dérogation connue et documentée → prime sur le régime
  légal supplétif, avec mention explicite « régime spécifique CP xxx ».
  Sinon, avertissement visible : « régime légal général appliqué, aucune
  dérogation sectorielle connue pour cette CP — à vérifier auprès de votre
  secrétariat ».
- Démission : même mécanique, barème travailleur (plus court, plafonné).
- Indemnité compensatoire : (rémunération semaine × nb semaines de préavis),
  avec mention « estimation indicative, hors avantages en nature / pécule ».
- Commun accord : pas de calcul de délai, bascule directe vers la génération
  de la convention.

## 6. Dates légales

- Calendrier des jours fériés légaux belges (fixes + mobiles) encodé pour
  plusieurs années.
- « Jour ouvrable » au sens de l'art. 37 = tous les jours sauf dimanche et
  jours fériés légaux (le samedi compte comme jour ouvrable).
- Calcul direct : date d'envoi du recommandé → 3ᵉ jour ouvrable suivant →
  premier lundi qui suit = début du préavis → + N semaines = fin.
- Calcul inverse : à partir d'une date de début (ou de fin) de préavis
  souhaitée, remonter à la date limite d'envoi du recommandé.
- Le mode de notification proposé dépend de qui rompt : le travailleur peut
  remettre la lettre en main propre (effet immédiat) ou l'envoyer en
  recommandé (effet différé) ; l'employeur ne peut plus notifier en main
  propre depuis la réforme (recommandé ou huissier uniquement). Le contenu
  informatif s'adapte en fonction de la réponse « qui rompt ».

## 7. Courriers générés — textes sources (verbatim, fournis par l'utilisateur)

Ces deux modèles ont été extraits de documents `.doc` fournis par
l'utilisateur (auteur : Martin Pierrard, FGTB) et sont repris **sans
reformulation du texte légal** ; seuls les champs entre crochets sont
interpolés par le moteur de fusion.

### 7.1 Convention de rupture de commun accord

```
CONVENTION DE RUPTURE DE COMMUN ACCORD

Entre les soussignés :

D'une part, le travailleur : ..........................................
domicilié(e) à : .......................................................

D'autre part, l'employeur / la société : ...............................
représenté(e) par : .....................................................
ayant son siège à : .....................................................

Il est convenu ce qui suit :

1) Les parties décident librement et d'un commun accord de mettre fin au
   contrat de travail qui les lie à la date du [DATE_FIN_CONTRAT], après
   l'exécution de la journée de travail / sans prestation ce jour-là
   (biffer la mention inutile).

2) Sous réserve du paiement de la rémunération, du pécule de vacances, des
   avantages acquis et de la remise des documents sociaux dus, chacune des
   parties renonce à réclamer à l'autre une indemnité compensatoire de
   préavis du seul fait de cette rupture.

3) L'employeur remettra au travailleur, dans les délais légaux, le décompte
   final et les documents sociaux requis, notamment le formulaire C4.

4) Chacune des parties reconnaît avoir reçu un original signé de la
   présente convention.

Fait en deux exemplaires à ..................., le ...................

Signature du travailleur               Signature de l'employeur
« Lu et approuvé »                     « Lu et approuvé »
```

Champs interpolés : `[DATE_FIN_CONTRAT]` ; choix « avec / sans prestation ce
jour-là » (case à cocher dans le wizard, remplace la mention à biffer) ;
identité/domicile/employeur/siège/lieu de signature pré-remplis si saisis
(§3), sinon pointillés d'origine conservés.

### 7.2 Notification de préavis par le travailleur (par courrier recommandé)

```
NOTIFICATION DE PRÉAVIS PAR LE TRAVAILLEUR
PAR COURRIER RECOMMANDÉ

Je soussigné(e) : .......................................................
domicilié(e) à : .........................................................

avertis par la présente mon employeur, .................................
que je mets fin à mon contrat de travail moyennant un délai de préavis.

Compte tenu de mon ancienneté, la durée de mon préavis est de :
[DUREE_PREAVIS]

Le délai de préavis débutera le : [DATE_DEBUT_PREAVIS].

Il couvrira la période du [DATE_DEBUT_PREAVIS] au [DATE_FIN_PREAVIS] inclus.

Fait à ..................., le ...................

Signature du travailleur,
```

Champs interpolés : `[DUREE_PREAVIS]`, `[DATE_DEBUT_PREAVIS]` (×2),
`[DATE_FIN_PREAVIS]`, calculés par le moteur (§5-6) ; identité/domicile/nom
employeur/lieu pré-remplis si saisis, sinon pointillés d'origine conservés.

### 7.3 Rendu

Texte affiché à l'écran (modifiable avant usage), avec bouton « copier » et
bouton « télécharger en PDF » (réutilise `@react-pdf/renderer`, déjà en
place pour C1/C3.2, pour un rendu cohérent).

## 8. Contenus informatifs

- **Sanctions ONEM en cas de démission** : principe du chômage volontaire,
  régime de sanction/exclusion, recommandation de contacter un conseiller
  FGTB avant de démissionner si l'affilié compte sur des allocations. Bloc
  versionné avec date de dernière vérification affichée.
- **Procédures d'envoi** (pli simple / recommandé / main propre / huissier) :
  conditionné par « qui rompt », effets juridiques de chaque mode.
- Bandeau disclaimer permanent : « outil d'aide, ne remplace pas un conseil
  personnalisé — contactez votre secrétariat FGTB ».

## 9. UI / intégration

- Route `/preavis`, wizard en étapes, style existant (`rounded-3xl border
  border-red-100 bg-white shadow-sm`, boutons `bg-red-700 hover:bg-red-800`).
- Nouvelle entrée dans `app/forms.ts` (catégorie « Préavis ») → apparaît
  automatiquement dans la grille d'accueil et la nav.
- Résultat final façon « rapport » : durée de préavis, dates clés (envoi
  limite, début, fin), courrier généré, avertissements légaux.

## 10. Fiabilité / maintenance

- `lib/preavis/baremes/sources.md` centralise les références légales
  utilisées avec date de vérification par barème.
- Bandeau « dernière mise à jour du contenu légal : JJ/MM/AAAA » visible
  dans le module.

## 11. Étape suivante avant implémentation

Rechercher et sourcer précisément, avant d'écrire le moindre barème :
- le barème général actuel (Art. 37/2 Loi du 3/7/1978, statut unique) ;
- les seuils de rémunération applicables ;
- les régimes transitoires pré-2014 par statut ;
- le régime de sanction ONEM actuel (démission / chômage volontaire) ;
- la liste des CP à dérogation connue à couvrir en priorité.

Cette liste de sources sera proposée à validation avant tout code.
