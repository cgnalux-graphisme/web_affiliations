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
    sources/
      accg-preavis-employeur.xlsx  # source maîtresse officielle ACCG (voir §12)
      accg-preavis-travailleur.xlsx
    general-2014.ts              # barème général post-2014 (statut unique), par mois d'ancienneté
    reforme-2026.ts              # correctifs légaux 2026 (plafond 52 sem., 1 sem. <6 mois) appliqués par-dessus
    ouvrier-pre-2014/
      cp<xxx>.ts                 # table "jours avant 31/12/2013" par CP, un fichier par CP couverte
      index.ts                   # registre CP → table + fallback CCT 75 (régime supplétif)
    employe-pre-2014.ts          # règle seuil 32.254€ (formules "3 mois/tranche 5 ans" / "1 mois/an min 3 mois")
    sources.md                   # traçabilité légale : référence + date de vérification par barème
  calcul-preavis.ts              # moteur : ancienneté + barème → durée de préavis / indemnité
  jours-ouvrables.ts             # jours fériés légaux BE + "jour ouvrable" + "premier lundi qui suit"
  dates-preavis.ts               # prise de cours, date de fin, calcul rétroactif date d'envoi recommandé
  courriers/
    templates.ts                 # texte source verbatim des 2 modèles (voir §7)
    fusion.ts                    # remplacement des placeholders par les données calculées/saisies
  contenu-onem-sanctions.ts      # bloc informatif versionné (sanctions chômage volontaire)
  contenu-procedures-envoi.ts    # bloc informatif versionné (pli simple/recommandé/main propre/huissier)
```

Séparation stricte **barèmes (données légales sourcées)** / **moteur de
calcul (logique pure)** : un barème se met à jour sans toucher au code de
calcul, et chaque valeur est traçable à sa source légale et sa date de
vérification dans `sources.md`.

**Source maîtresse retenue (décision utilisateur du 25/08/2026)** : les
fichiers `accg-preavis-employeur.xlsx` et `accg-preavis-travailleur.xlsx`
(outils de calcul internes de la Centrale Générale FGTB, auteur Filip
Misplon, créés le 24/01/2014, mis à jour au 06/12/2022, téléchargés depuis
`accg.be/fr/secteur/construction/outils/outils-de-calcul/`) servent de
source de vérité pour : le barème général post-2014 et le régime "sac à
dos" ouvrier pré-2014 pour toutes les CP couvertes par la Centrale
Générale (~50 CP). Le détail des formules et tables extraites est en §12.
Ces fichiers sont commités dans `lib/preavis/baremes/sources/` pour
traçabilité et re-vérification future.

Deux éléments ne sont **pas** couverts par ce fichier et restent sourcés
séparément :
- la **réforme légale 2026** (le fichier ACCG s'arrête à sa dernière mise à
  jour de 2022) — sourcée indépendamment (SPF Emploi, Securex), voir §12.3 ;
- le régime **employé** pré-2014 (le fichier ACCG ne couvre que les
  ouvriers) — sourcé via SPF Emploi, voir §12.4.

## 5. Moteur de calcul

Logique reproduite fidèlement depuis les formules du classeur ACCG (voir
§12.2), en y ajoutant le correctif légal 2026 (§12.3) que le classeur
n'a pas encore.

- Ancienneté entièrement acquise depuis le 1/1/2014 → barème général seul
  (`general-2014.ts`), en fonction du nombre de mois entiers d'ancienneté.
- Ancienneté commencée avant le 1/1/2014 → règle du **sac à dos** :
  - **Partie 1** (gelée au 31/12/2013) : pour un ouvrier, table
    `ouvrier-pre-2014/cp<xxx>.ts` — une recherche par tranche de date
    d'embauche (pas par ancienneté) donnant un nombre de jours fixe, propre
    à la CP et différent employeur/démission ; pour un employé, formule du
    seuil de rémunération (§12.4).
  - **Partie 2** (depuis le 1/1/2014) : barème général appliqué à
    l'ancienneté acquise depuis cette date uniquement (pas l'ancienneté
    totale).
  - Total employeur = Partie 1 + Partie 2.
  - **Règle du plancher (ouvriers)** : si le barème général appliqué à
    l'**ancienneté totale** (comme si tout était post-2014) donne un
    résultat supérieur au total sac-à-dos, le travailleur a droit à une
    **indemnité compensatoire** égale à la différence. Cette règle,
    identifiée dans le classeur ACCG, n'apparaît dans aucune des sources
    web consultées — elle protège les ouvriers dont le régime pré-2014
    (souvent très court, ex. secteur construction) serait sinon
    désavantageux par rapport au nouveau régime.
  - Côté démission, pas de règle de plancher : total = MIN(Partie 1 +
    Partie 2, 13 semaines / 91 jours), plafond légal général.
- CP sélectionnée sans table dédiée (hors des ~50 CP couvertes par la
  Centrale Générale) → régime légal supplétif (CCT n°75, voir §12.1),
  avec avertissement visible : « régime légal supplétif appliqué, aucune
  dérogation sectorielle connue pour cette CP — à vérifier auprès de votre
  secrétariat ».
- Indemnité compensatoire (rupture immédiate) : (rémunération semaine × nb
  semaines de préavis), avec mention « estimation indicative, hors
  avantages en nature / pécule ».
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

La recherche légale (§12) est faite pour le périmètre v1 retenu avec
l'utilisateur (contrats post-2014 tous statuts + pré-2014 employés + les 6
CP ouvrières prioritaires de la Centrale Générale : 109, 124, 126, 128.01,
128.02, 142.02). Reste à faire, en tâche d'implémentation dédiée : extraire
mécaniquement les ~44 autres tables CP du classeur ACCG (même structure,
donc scriptable — voir §12.2) pour couvrir l'intégralité des CP du
classeur, plutôt que de les re-vérifier une à une sur le web.

## 12. Sources légales confirmées (recherche du 25/08/2026)

### 12.1 Barème général post-2014 (statut unique, Art. 37/2)

Sourcé indépendamment sur SPF Emploi (emploi.belgique.be) et Securex, puis
cross-validé avec la table `'2014'` du classeur ACCG (valeurs identiques en
jours/semaines). Congé donné par l'**employeur**, par mois entiers
d'ancienneté (extrait, voir classeur pour la table complète jusqu'à 51 ans) :
0-3 mois : 1 sem · 3-4 : 3 · 4-5 : 4 · 5-6 : 5 · 6-9 : 6 · 9-12 : 7 ·
12-15 : 8 · 15-18 : 9 · 18-21 : 10 · 21-24 : 11 · 2 ans : 12 · 3 ans : 13 ·
4 ans : 15 · 5 ans : 18 · 6 ans : 21 · 7 ans : 24 · 8 ans : 27 · 9 ans : 30 ·
10 ans : 33 · puis +3 sem/an jusqu'à 20 ans (62 sem), +2 sem pour la 20ᵉ
année, puis +1 sem/an (jusqu'à 93 sem à 51 ans dans le classeur — plafonné
à 52 sem par la réforme 2026, voir §12.3).

Congé donné par le **travailleur** (démission), plafond 13 semaines :
<3 mois : 1 · 3-6 : 2 · 6-12 : 3 · 12-18 : 4 · 18-24 : 5 · 2-4 ans : 6 ·
4-5 : 7 · 5-6 : 9 · 6-7 : 10 · 7-8 : 12 · 8 ans+ : 13 (plafond).

Sources : [Délais de préavis — SPF Emploi](https://emploi.belgique.be/fr/themes/contrats-de-travail/fin-du-contrat-de-travail/fin-du-contrat-duree-indeterminee-11), [Securex](https://www.securex.be/fr/lex4you/employeur/themes/licenciement-et-fin-du-contrat-de-travail/rupture-par-l%E2%80%99employeur/delais-de-preavis-pour-travailleurs-en-service-depuis-le-1er-janvier-2014), classeur ACCG feuille `'2014'`.

### 12.2 Régime ouvrier pré-2014 — classeur ACCG (source maîtresse)

Mécanique commune aux deux classeurs (`accg-preavis-employeur.xlsx` /
`accg-preavis-travailleur.xlsx`), formules extraites directement du XML du
classeur (feuille `Blad1`) :

- Chaque CP a sa propre feuille cachée (ex. `124.00`) avec une table
  `date d'embauche (AAAAMMJJ) → jours de préavis`. Recherche par
  correspondance approximative (VLOOKUP) : on prend la ligne dont la date
  est la plus proche **inférieure ou égale** à la date d'embauche. Le
  résultat est un nombre de jours **fixe**, indépendant de l'ancienneté
  (particularité confirmée du régime ouvrier pré-2014 dans plusieurs
  secteurs, notamment la construction).
- La table est **différente** entre le classeur employeur et le classeur
  démission pour une même CP (la démission est structurellement plus
  courte, généralement environ la moitié).
- Partie 2 (post-2014) : recherche dans la table générale (§12.1) par mois
  d'ancienneté acquise depuis le 1/1/2014 uniquement.
- Total employeur = Partie 1 + Partie 2, avec la règle du plancher
  (indemnité compensatoire si le barème général sur l'ancienneté totale
  aurait donné plus) — voir §5.
- Total démission = MIN(Partie 1 + Partie 2, 91 jours).

Tables « jours avant le 31/12/2013 » extraites pour les 6 CP prioritaires
de la Centrale Générale (`date d'embauche → jours`) :

| CP | Secteur | Employeur | Démission |
|---|---|---|---|
| 109.00 | Confection/habillement | 1900:64 · 1994:32 · 2014:0 | 1900:28 · 1994:14 · 2014:0 |
| 124.00 | Construction | 1900:56 · 1994:28 · 2011:14 · 2012:16 · 2013-07:4 · 2014:0 | 1900:28 · 1994:14 · 2011:7 · 2012:7 · 2013-07:1 · 2014:0 |
| 126.00 | Ameublement / bois | 1900:112 · 1994:28 · 2013:32 · 2014:0 | 1900:28 · 1994:14 · 2013:14 · 2014:0 |
| 128.01 | Tanneries | 1900:129 · 1994:97 · 1999:64 · 2004:48 · 2009:40 · 2013-07:28 · 2014:0 | 1900:28 · 1994:14 · 1999:14 · 2004:14 · 2009:14 · 2013-07:14 · 2014:0 |
| 128.02 | Cuir (sous-secteur) | 1900:64 · 1994:32 · 2014:0 | 1900:28 · 1994:14 · 1999:14 · 2004:14 · 2009:14 · 2013-07:14 · 2014:0 |
| 142.02 | Récupération de métaux | 1900:112 · 1994:42 · 2009:28 · 2012:32 · 2013-07:28 · 2014:0 | 1900:56 · 1994:21 · 2009:14 · 2012:14 · 2013-07:14 · 2014:0 |

Pour toute autre CP hors de ces 6 : le classeur ACCG contient en réalité
~44 tables CP supplémentaires (structure identique, extraction mécanique
lors de l'implémentation — voir §11) couvrant la quasi-totalité des
secteurs de la Centrale Générale. En dehors de ces ~50 CP, régime
supplétif CCT n°75 du 20/12/1999 (licenciement par l'employeur uniquement,
texte primaire consulté intégralement) : 6 mois-5 ans : 35 jours ·
5-10 ans : 42 · 10-15 ans : 56 · 15-20 ans : 84 · 20 ans+ : 112 (ne
s'applique pas si un régime CP dérogatoire plus favorable existe — Art. 3
CCT 75). Sous 6 mois d'ancienneté et régime démission hors CP couvertes :
non trouvé dans les sources consultées — à sourcer avant mise en
production (Art. 59 loi du 3/7/1978 de base) ou à traiter par message
d'orientation « contactez votre secrétariat ».

Source primaire CCT 75 : [cnt-nar.be, texte coordonné](https://cnt-nar.be/sites/default/files/documents/CCT-COORD/cct-075.pdf).
Source primaire classeurs : `accg.be/fr/secteur/construction/outils/outils-de-calcul/preavis-employeur` et `.../preavis-travailleur`, auteur Filip Misplon, commités dans `lib/preavis/baremes/sources/`.

### 12.3 Réformes légales 2026 (absentes du classeur ACCG, sourcées indépendamment)

- **Préavis** — loi du 3 juillet 2026 modifiant l'art. 37/2, en vigueur le
  1ᵉʳ août 2026 : pour les contrats **commencés après le 31/07/2026**,
  préavis uniforme d'1 semaine pendant les 6 premiers mois (employeur et
  travailleur). Plafond de 52 semaines dès 17 ans d'ancienneté pour les
  contrats **commencés après le 31/05/2026**. Les contrats antérieurs à ces
  dates gardent le régime décrit en §12.1/12.2 sans ces correctifs.
  Source : [Feong, actualités été 2026](https://feong.be/actualites/quelques-nouveautes-de-lete-2026-delais-de-preavis-temps-de-travail-flexi-jobs-et-actualisation-de-certains-montants/) — à confirmer auprès du texte publié au Moniteur belge avant mise en production, aucune source primaire belge (ejustice.just.fgov.be) n'a pu être récupérée intégralement par l'outil de recherche.
- **Chômage après démission (ONEM)** — réforme du 1ᵉʳ mars 2026, régime
  « droit au rebond » : une démission n'entraîne plus une exclusion
  automatique ; sous condition d'environ 10 ans de carrière (3 120 jours),
  allocations possibles pendant 6 mois maximum. Sanction pour motif non
  légitime ≈ 8-9 semaines de suspension (régime « modéré ») plutôt
  qu'exclusion pure. Chiffres exacts (barème de sanction complet, liste des
  motifs légitimes) non confirmés en détail — contenu à afficher comme
  bloc informatif non calculé, avec date de vérification visible, et à
  faire relire par le secrétariat juridique FGTB avant mise en production.

### 12.4 Régime employé pré-2014 (hors classeur ACCG, sourcé SPF Emploi)

Seuil de rémunération annuelle brute au 31/12/2013 : **32.254 €**.
- Employés « inférieurs » (≤ seuil) : 3 mois de préavis par tranche de 5
  ans d'ancienneté entamée (ancienneté au 31/12/2013), licenciement et
  démission.
- Employés « supérieurs » (> seuil) : 1 mois par année d'ancienneté
  entamée, minimum 3 mois (ancienneté au 31/12/2013), pour le licenciement
  par l'employeur — confirmé par source officielle.
  **Non confirmé avec certitude** : le régime de démission pour cette
  catégorie. Une source (Claeys & Engels) évoque une règle générale
  pré-2014 de « moitié du préavis employeur, plafonnée à 13 semaines » qui
  serait cohérente avec le reste du droit belge (le préavis travailleur
  est structurellement plus court), mais ceci n'a pas été confirmé sur une
  source primaire. **À faire valider par le secrétariat juridique FGTB
  avant mise en production** ; en attendant, coder la règle « moitié,
  plafond 13 semaines » avec un avertissement visible sur le résultat pour
  ce cas précis.

Source : [Délais de préavis pré-2014, employés — SPF Emploi](https://emploi.belgique.be/fr/themes/contrats-de-travail/fin-du-contrat-de-travail/fin-du-contrat-duree-indeterminee-10).
