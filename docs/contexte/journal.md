# Journal : états successifs du projet

> Ramification de [CLAUDE.md](../../CLAUDE.md) (à la racine du projet). Contenu déplacé tel quel le 12/10/2026.

Le plus récent en haut. L'état **actuel** est dans CLAUDE.md (racine), section « État actuel ».

## État au 15/10/2026 matin (audit du site, comptes, ESLint)
- **Une seule branche de travail : `suivi-actions`**, poussée le 15/10/2026 à la demande de Fred (mise en production).
- **Audit du 14/10/2026** : base saine (tout est branché, RLS partout) ; corrigé : e-mails publics neutralisés contre
  l'injection de HTML, limite de débit sur les 11 routes publiques, bibliothèque PDF chargée à la demande (formulaires
  3 fois plus légers), logos optimisés, délais maximum sur les appels externes, message d'erreur des Paramètres › Envois.
- **Migrations** : `20261007120000` (changement de situation), `20261014150000` (index) et `20261014160000`
  (règles RLS en double) **exécutées par Fred** et vérifiées.
- **Nouveau** : suppression définitive d'un compte (Comptes & accès, super admin) ; taux kilométrique légal affiché
  à titre informatif (Libérations › Paramètres) ; Équipe limitée aux comptes actifs qui ont l'app Libérations ;
  signature (fonction) et téléphone dans « Mon compte » ; **ESLint** en place (`npm run lint`).
- **À faire par Fred** : 1. tester dans le navigateur les formulaires affiliation, mandat SEPA, changement de
  situation, préavis (PDF) ; 2. Supabase › Authentication : protection des mots de passe divulgués, codes e-mail
  < 1 h ; 3. les points des Libérations (voir [docs/contexte/liberations.md](docs/contexte/liberations.md)).

## État au 14/10/2026 (Libérations : les 4 lots écrits)
- **Une seule branche de travail : `suivi-actions`**, **poussée le 14/10/2026 à la demande de Fred** (mise en
  production) avec les lots 2, 3 et 4 des Libérations.
- **App Libérations** : [docs/contexte/liberations.md](docs/contexte/liberations.md). Les 4 lots sont écrits :
  1. la demande (en production) ; 2. les courriers (PDF côté serveur, e-mail Resend ou impression, modèles
  modifiables : **textes proposés = brouillons à relire par Fred**) ; 3. le jour J (QR code 08h00-18h00, page publique
  `/presence/<jeton>` sans compte, signature au doigt, trajets, km par Google Maps, frais) ; 4. clôture (avec la
  liste de ce qui manque), PDF complet du dossier (synthèse, signatures, documents, pièces jointes, tickets),
  archive, désarchivage, recherche dans les archives (participants, entreprises, année).
- **Migrations** des lots 1 à 3 exécutées et vérifiées ; le lot 4 n'en demande pas.
- **Google Maps** (`GOOGLE_MAPS_API_KEY`) : dans `.env.local` et Vercel, fonctionne (essai réel du 14/10/2026).
- **Vérifié** : 902 tests, types, build, rendu réel des PDF (courriers, attestations, fiche de paiement, dossier
  complet). **Pas encore vérifié dans le navigateur**, ni avec un téléphone, ni avec un vrai envoi d'e-mail.
- **À faire par Fred** : 1. tester un dossier de bout en bout (voir « À préparer pour la suite » dans
  [docs/contexte/liberations.md](docs/contexte/liberations.md)) ; 2. Paramètres › Équipe et relire les Modèles ;
  3. conseillé : plafond journalier de la Routes API et alerte de budget dans Google Cloud ; 4. points ouverts :
  voir [docs/contexte/journal.md](docs/contexte/journal.md).

## État au 14/10/2026 (Libérations lots 2 et 3)
- **Une seule branche de travail : `suivi-actions`** (dernière mise en production : 13/10/2026, lot 1 des
  Libérations). Les lots 2 et 3 **ne sont pas encore commités ni poussés**.
- **App Libérations** (4 lots) : [docs/contexte/liberations.md](liberations.md). Lot 1 en
  production. **Lot 2 (courriers)** écrit, migration exécutée ; **textes proposés = brouillons à relire par Fred**.
  **Lot 3 (jour J)** écrit : QR code par dossier (08h00-18h00 les jours de la réunion), page publique
  `/presence/<jeton>` sans compte (nom, n° de registre national vérifié, signature au doigt, trajet, domicile et
  genre s'ils manquent, photos des tickets), km calculés par Google Maps, frais (taux du jour), panneau « Jour J »
  de la fiche, étapes « Jour J » (automatique) et « Passer aux frais ».
- **Migration `20261014120000_site_liberations_jour_j.sql`** exécutée par Fred le 14/10/2026 (vérifié : 4 tables,
  colonnes du QR, clé publique refusée).
- **Clé Google Maps** (`GOOGLE_MAPS_API_KEY`) : dans `.env.local` et Vercel, **fonctionne** (essai réel du 14/10/2026).
- **Vérifié** : 898 tests, types, build. **Pas encore vérifié dans le navigateur**, ni avec un téléphone, ni avec
  un vrai envoi d'e-mail.
- **À faire par Fred** : 1. (fait) migration du lot 3 ; 2. (fait) Google Maps ; conseillé : plafond journalier de la Routes API et alerte de budget ; 3. lot 2 : Paramètres › Équipe,
  relire les Modèles, lettre de test à sa propre adresse ; 4. lot 3 : dossier de test daté d'aujourd'hui,
  scanner le QR avec un téléphone entre 08h00 et 18h00 ; 5. points ouverts : voir
  [docs/contexte/journal.md](journal.md).

## État au 14/10/2026 (Libérations lot 2)
- Lot 2 des Libérations écrit (courriers : lettre, convocation, attestations, fiche de paiement, PDF côté serveur,
  e-mail Resend ou impression, modèles modifiables, équipe). Pas encore commité.
- Migration `20261014090000_site_liberations_courriers.sql` exécutée par Fred le 14/10/2026 (vérifié).
- Vérifié : 884 tests, types, build, rendu des 5 PDF. Pas encore dans le navigateur.

## État au 13/10/2026 (Libérations lot 1)
- **Branche `suivi-actions` poussée le 13/10/2026 à la demande de Fred** (mise en production) avec le lot 1 des
  Libérations (commit `5a7d5ec`).
- **App Libérations, lot 1** : demande (formulaire, dates, lieu, prise en charge, participants = délégués, pièces
  jointes), liste par statut, fiche du dossier (ce qui manque, « Compléter »), parcours brouillon → demande → en
  traitement → annulé / archivé, Paramètres (lieux, taux kilométrique daté). Contexte :
  [liberations.md](liberations.md).
- **App Délégués** : registre national et genre sur la carte.
- **Migration `20261013130000_site_liberations.sql`** exécutée par Fred le 13/10/2026 (vérifié).
- **Vérifié** : 857 tests, types, build ; pas encore dans le navigateur.
- **À faire par Fred** : tester le lot 1 (permanent, ADMIN_OP), ajouter le taux kilométrique réel.

## État au 13/10/2026 (nuit)
- **Une seule branche de travail : `suivi-actions`**, **poussée le 13/10/2026 (nuit) à la demande de Fred**
  (mise en production) avec l'app **Accès permanents**.
- **App Accès permanents** (nouvelle, design validé par Fred le 13/10/2026) : tableau de bord du permanent,
  périmètre lu dans CG Link (`companies.permanent_email`), **fiches de suivi** (usine / sectoriel, date ou
  période, pièces avec leur nature, photos, 7 questions, rédaction par l'IA, PDF à la charte), historique sur
  la fiche entreprise, partie « Actions syndicales en entreprise et en secteur » du **rapport de congrès** avec
  écran de sélection. Contexte : [permanents.md](permanents.md).
- **App Délégués** ouverte aux permanents (leurs entreprises, sans les paramètres de connexion) ; **app
  Entreprises** : secteur (`site_secteurs`), permanent, filtre « Mes entreprises ».
- **Secteurs** : 5 secteurs ajoutés le 13/10/2026 (Verre, Production du papier, Transformation du papier, ALE,
  CP 100) ; les 93 entreprises ont un secteur.
- **Migration `20261013120000_site_fiches_suivi.sql`** exécutée par Fred le 13/10/2026 (vérifié : tables, bucket
  privé, 87 fiches sur 93 avec un secteur, clé publique refusée).
- **Vérifié** : 821 tests, build, rendu réel des PDF (fiche sur 2 pages, rapport). **Pas encore vérifié dans le
  navigateur** avec un vrai compte permanent.
- **À faire par Fred** : 1. tester avec un compte permanent (périmètre, délégués sans compte CG Link, une fiche
  complète avec photos, IA et PDF), puis le rapport de congrès ; 2. points ouverts du 13/10/2026 (soir) : voir
  plus bas.

## État au 13/10/2026 (soir)
- **Une seule branche de travail : `suivi-actions`**, **poussée le 13/10/2026 à la demande de Fred** (mise en
  production) : apps Entreprises et Gestion délégués CG Link, refonte de la fiche entreprise.
- **App Entreprises** : 93 fiches (tableau de Fred + HEIDELBERG MATERIALS BENELUX + IL&C LUXEMBOURG ; XLG HOME
  regroupée dans TRIXXO), 99 ONSS, unités **suivies** (nos provinces), fiche refondue (en-tête à chiffres clés,
  lecture d'abord, carte Courrier). Import BCE : pages « Une unité » lues, captcha anti-robot de la BCE
  reconnu (pause 30 s, relance des fiches en erreur), « Enregistrer tous les changements ». Contexte :
  [docs/contexte/entreprises.md](docs/contexte/entreprises.md).
- **App Gestion délégués CG Link** (SUPER_ADMIN par le rôle) : import CG Link, cartes (unité de rattachement,
  adresse avec autocomplétion Photon, téléphone `+32 (0) …`), mandats, à vérifier, journal ; **plan 2b** :
  comptes CG Link (inviter, renvoyer, annuler, bloquer, rétablir), synchronisation automatique de la carte
  (jamais l'e-mail : adresse de connexion CG Link), changement d'entreprise, écarts (Reprendre / Ignorer /
  Envoyer). Contexte : [docs/contexte/delegues.md](docs/contexte/delegues.md).
- **Migrations exécutées par Fred** : `20261012120000`, `20261013090000`, `20261013100000`,
  `20261013110000` (adresse des délégués : à confirmer par Fred si pas encore fait).
- **Sécurité CG Link** : `workers` n'est plus lisible avec la clé publique (vérifié le 13/10/2026).
- **À faire par Fred** : 1. tester le plan 2b avec un délégué de test sur une adresse secondaire (inviter,
  synchro, bloquer, écart, changement d'entreprise, annulation) ; 2. faire corriger dans CG Link (Cursor)
  l'écriture de `companies.delegates` sans relecture ni garde `updated_at` (prompt du 13/10/2026) ; 3. vérifier
  avec Cursor qu'un délégué ne peut pas changer son propre `profiles.company_id` ; 4. choisir la suite
  (proposition : publipostage, puis Open Data BCE, annuaire des délégués).
- Les points ouverts des états précédents (Redirect URLs, tests des comptes) : voir
  [docs/contexte/journal.md](docs/contexte/journal.md).

## État au 13/10/2026 (après-midi)
- **Une seule branche de travail : `suivi-actions`** (`entreprises` fusionnée puis supprimée le 13/10/2026).
  Rien n'est poussé.
- **App Entreprises** en place et vérifiée par Fred (migration `20261012120000` exécutée : 93 fiches, 99 ONSS).
  Ajout du 13/10/2026 : unités d'établissement **suivies** (nos provinces), les autres gardées pour info.
- **App Gestion délégués CG Link (plan 2a)** construite : import CG Link, liste, carte d'identité avec unité
  de rattachement, mandats, à vérifier, journal ; SUPER_ADMIN uniquement ; aucune écriture vers CG Link.
  Contexte : [docs/contexte/delegues.md](docs/contexte/delegues.md).
- **À faire par Fred** : 1. exécuter `20261013090000_site_unites_suivies.sql` puis
  `20261013100000_site_delegues_unite.sql` (SQL Editor) ; 2. lancer l'import des délégués et traiter
  « À vérifier » ; 3. corriger `workers` / `profiles.company_id` côté CG Link (prompt Cursor du 12/10/2026),
  ✔ fait (vérifié le 13/10/2026 : `workers` refusé à la clé publique).
- **Plan 2b construit (13/10/2026)** : comptes CG Link (inviter, bloquer, annuler), synchronisation automatique
  de la carte vers CG Link (jamais l'e-mail), changement d'entreprise, écarts. À tester par Fred avec un
  délégué de test sur une adresse secondaire.
- Les points ouverts des états précédents (Redirect URLs, tests des comptes) : voir
  [docs/contexte/journal.md](docs/contexte/journal.md).

## État au 12/10/2026 (après-midi)
- **App Entreprises (lot A) construite sur la branche `entreprises`** (créée depuis `suivi-actions`, **non
  poussée**) : liste, fiche, sites (UTE), unités d'établissement, ONSS, personne de référence et bloc adresse,
  affiliés, import BCE (une fiche ou toutes). Vérifié en local : types, 676 tests, build de production,
  redirection vers `/login` sans session, lecture réelle de la BCE. Contexte :
  [docs/contexte/entreprises.md](docs/contexte/entreprises.md). Spec et plans dans `docs/superpowers/`.
- **Migration `20261012120000_site_entreprises_delegues.sql` exécutée par Fred le 13/10/2026** et vérifiée
  (lecture seule) : 93 fiches (tableau de Fred + HEIDELBERG MATERIALS BENELUX + IL&C LUXEMBOURG ; XLG HOME
  regroupée dans TRIXXO), 93 sites principaux, 99 ONSS ; clé publique refusée partout.
- **Faille signalée à Fred le 12/10/2026** : la table CG Link `workers` (NISS, noms, 10 684 lignes) est
  lisible avec la clé publique. Prompt de correction remis à Fred pour sa session Cursor de CG Link (RLS de
  `workers` + verrou sur `profiles.company_id`). À faire avant le lot B3 (écritures vers CG Link).
- **À faire par Fred** : 1. compléter le n° BCE d'IL&C LUXEMBOURG ; 2. parcourir l'app Entreprises connecté (liste de
  vérification dans le message de fin du 12/10/2026) ; 3. valider couleurs et icônes (`#E69F00` bâtiment,
  `#CC79A7` carte d'identité) ; 4. corriger `workers` côté CG Link. Ensuite : plan du lot B (app « Gestion
  délégués CG Link », SUPER_ADMIN uniquement).
- Les points « À faire par Fred » de l'état précédent (Redirect URLs, tests des comptes) restent ouverts :
  voir [docs/contexte/journal.md](docs/contexte/journal.md).

## État au 12/10/2026 (matin)
- **Espace CG, lots 1 à 3 terminés et vérifiés en local** (types, 631 tests, build de production) sur
  `suivi-actions`, **commités et poussés le 12/10/2026** (mise en production), avec la doc découpée et les
  règles RLS alignées sur les apps : back-office en apps (`/espace`), écrans repris dans le
  style de la maquette, Comptes & accès, Apps par rôle, Journal des accès, page
  `/login/nouveau-mot-de-passe`, transitions et finitions (lot 3). `espace-cg.html` supprimé.
- **Non testé** (pas de session ni d'écriture en base depuis Claude Code) : tous les écrans connectés et
  les actions réelles (interrupteurs d'apps, rôle, invitation, lien de réinitialisation, suspension).
- **À faire par Fred** : 1. ajouter `<adresse du site>/login/nouveau-mot-de-passe` (local, preview,
  production) dans Supabase › Authentication › URL Configuration › Redirect URLs ; 2. parcourir les 4 apps
  connecté ; 3. essayer une invitation sur une adresse secondaire (e-mail, mot de passe, entrée dans
  l'Espace, connexion à CG Link), une réinitialisation et une suspension / réactivation ; 4. vérifier
  qu'un compte ADMIN_OP ou PERMANENT à qui l'on donne une app (Actions, Scan News) lit et écrit bien ses
  données depuis l'Espace (les politiques RLS suivent les apps depuis le 12/10/2026).

## État au 08/10/2026
- **Assistant CG en production** : fusionné dans `suivi-actions` et **poussé par Fred le 08/10/2026** ; la
  branche `chatbot` est supprimée (sur le poste et sur GitHub) : **on travaille uniquement sur
  `suivi-actions`**. Pousser cette branche = mise en production, lancé par Fred (Claude Code n'a pas le droit
  de pousser en production). Interrupteur `chatbot_actif` encore sur `off` (vérifié le 08/10/2026) : la bulle
  apparaîtra quand Fred l'activera dans Paramètres du site. Également en ligne : la politique de vie privée
  du 08/10/2026 (valeurs validées par le DPO), la suppression automatique des demandes et le nouveau bandeau. Vérifié en local :
  types, 606 tests, build de production, les 10 scénarios de Fred et les cas nettoyage / agriculture avec la
  vraie IA et la vraie base (lecture). **Non testé** : une transmission réelle (insertion + e-mail avec
  bouton « Répondre »), pour ne rien écrire en base sans Fred, et l'écran admin « Demandes chatbot » connecté.
  À faire par Fred : un essai réel avec sa propre adresse, puis activer l'interrupteur dans « Paramètres du
  site » après fusion.
- Le 08/10/2026 (retours de Fred) : deux antennes chômage les plus proches ; règle des secteurs transférés à
  l'Horval (nouveaux → Horval, anciens affiliés CG → CG) ; section « Assistant CG (aide à l'orientation) »
  ajoutée à `/vie-privee` **et** à `PAGES-LEGALES.md` (orientation seulement, conversation jamais
  enregistrée, analyse par Anthropic après masquage, demande transmise enregistrée avec consentement,
  registre national jamais par e-mail ni à l'IA) + Anthropic cité dans « Partage des données ».
- Validé par Fred le 08/10/2026 : les deux antennes par code postal ; la règle des secteurs transférés
  s'applique aussi aux CP 145 et 132.
- **Vie privée, section Assistant CG réécrite le 08/10/2026** (texte de Fred, mot pour mot ; `/vie-privee` et
  `PAGES-LEGALES.md`) : transfert vers Anthropic (États-Unis), droit de retrait du consentement, durée de
  conservation des demandes, ligne ajoutée aux « Durées de conservation », date de la page au 08/10/2026
  (prop `miseAJour` de `PageLegale`, les autres pages légales gardent le 29/09/2026). Les deux valeurs **à
  valider par le DPO** sont dans `lib/vie-privee.ts` : `GARANTIE_TRANSFERT`, `DUREE_DEMANDES` (« 12 mois ») :
  **validées par le DPO le 08/10/2026** (déclaré par Fred). Masquage revérifié (test « ce qui part réellement vers
  l'IA ») ; motif IBAN resserré (il avalait les mots suivants).
- **Suppression des demandes après traitement** (option A choisie par Fred le 08/10/2026) : migration
  `supabase/migrations/20261008120000_site_chatbot_demandes_traite_le.sql` (**demandée par Fred, idempotente,
  exécutée par Fred le 08/10/2026**, colonne vérifiée) : colonne `traite_le` + trigger qui la remplit au passage à `traite` (et la vide si la
  demande change de statut). Le cron quotidien (`/api/veille/analyse`, les deux passages) appelle
  `purgerDemandesChatbot()` (`lib/assistant-purge.ts`) : suppression des demandes `traite` dont `traite_le`
  dépasse `DUREE_DEMANDES_MOIS` (12, `lib/vie-privee.ts`, même valeur que la page). Sans la migration : rien
  n'est supprimé (journal « colonne traite_le absente »), la liste admin s'affiche quand même. La fiche d'une
  demande traitée affiche sa date de suppression prévue.
- **Bandeau de mobilisation refait** (08/10/2026, demande de Fred) : étiquette rouge en parallélogramme à 10°
  (éclair + « Mobilisation », ou l'échéance courte sur mobile), échéance « Aujourd'hui / Demain / Dans N
  jours » (`echeance()`, `lib/mobilisations.ts`, calculée dans le navigateur), bouton blanc « Je m'inscris »
  avec flèche ; reflet en biais, éclair qui claque et flèche qui avance, 3 fois espacées de 7 s puis plus rien ;
  rien en mouvement réduit (`globals.css`, « Bandeau de mobilisation »).
- Le 08/10/2026 aussi : règle du nettoyage (« Qui est votre employeur ? »), bouton « Répondre » dans l'e-mail
  de transmission, refonte de la bulle « Une question ? ».

## État au 07/10/2026
- **Commité sur `suivi-actions`, pas encore poussé** : formulaire « Signaler un changement »
  (`/changement-situation`, table `web_modifications`, e-mail, back-office) et refonte de la grille
  des démarches (4 colonnes, bande à 10°, animations).
- **À faire par Fred** : exécuter la migration `20261007120000_web_modifications.sql` dans
  Supabase (sinon le formulaire ne peut rien enregistrer), puis un **essai réel** avec sa propre
  adresse (enregistrement, e-mail avec PDF, fiche et historique dans le back-office). Vérifié en
  local seulement : types, tests, page, PDF du cas le plus long sur une page.
- **Sécurité à décider par Fred** : lecture des anciennes tables `web_*` ouverte à tout compte
  connecté (voir « Tables des formulaires publics » dans [base-de-donnees.md](base-de-donnees.md)).

## État au 02/10/2026
- **Poussé sur `suivi-actions` les 01/10 et 02/10/2026** (rien sur `main`) : Check IA et écran
  « conférence de rédaction », brouillon IA multi-sources (jusqu'à 12 sources, « Retirer » /
  « Remettre », jauge « Matière »), logos des médias, fil limité à 3 jours, page `/statuts` et
  nouvel « Accord général », uniformisation visuelle de tous les formulaires (`app/formulaires/`),
  question « titulaire du compte » sous le bloc RIB (affiliation), bloc « Nos bureaux » sur les
  PDF d'affiliation et de mandat, sujets du Check IA reliés à leur article enregistré.
- **Accès** : deux comptes SUPER_ADMIN dans `profiles` (Frédéric Blanchard, Jonathan Hubert),
  vérifié le 01/10/2026. **Vercel Authentication est activée sur toutes les adresses
  `.vercel.app`** (production comprise, sauf domaine propre) : un collègue sans compte dans
  l'équipe Vercel est bloqué avant la page de connexion. Solutions : lien de partage du
  déploiement (« Share »), ou désactiver la protection des prévisualisations (Settings ›
  Deployment Protection) — à décider par Fred ; un domaine propre branché en production n'est pas
  concerné.
- Analyse automatique du Check IA à 8 h : seulement en production (les crons Vercel ne tournent
  pas sur les prévisualisations).

## État au 29/09/2026
- Tout le travail est sur la branche **`suivi-actions`** : rien sur `main`, rien
  déployé. À relire puis fusionner quand Fred valide.
- Migration des envois exécutée le 28/09/2026. À tester par Fred : un envoi
  réel (SEPA, C1) doit apparaître dans l'historique de la demande.
- À faire par Fred : **supprimer** le projet Supabase `accg-nalux-site`
  (dashboard).
- Bureaux (`lib/bureaux.ts`) repris de l'ancien site le 25/09/2026 : Libramont
  (siège), Namur, Arlon, Marche-en-Famenne. À tenir à jour à chaque changement
  d'horaire ; le statut « ouvert » est calculé à l'heure de Bruxelles.
- PDF **Affiliation** et **Mandat SEPA** passés à la charte du site (proposition
  « Registre » du 25/09/2026). Les PDF **C1, C3.2 et Calcul de préavis ne doivent
  pas être modifiés**.
- **En place sur `suivi-actions`, commité et poussé sur GitHub le 29/09/2026**
  (déploiement de prévisualisation Vercel) : blog, Scan News (ex-veille RSS :
  sources, ramassage quotidien, thématiques), **rédaction assistée par IA**
  (tunnel en 5 étapes, garde-fou droit d'auteur), **déclinaison réseaux**
  (Facebook, Instagram, TikTok, YouTube, sans publication automatique),
  **back-office des demandes** (PDF régénérés, demandes liées, historique des
  e-mails), **paramètres des envois**, **refonte de l'espace admin** (tableau de
  bord, menu par sections), rubrique **« On vous explique »** (vulgarisation des
  notes FGTB, suggestion de photo) et **indicateur de chargement** unique. Rien
  sur `main`, rien en production.
- `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` et `ANTHROPIC_API_KEY` sont
  **configurées** dans `.env.local` (vérifié le 28/09/2026 ; la clé Anthropic
  répond, testée sur la déclinaison réseaux) **et ajoutées dans Vercel par Fred le
  28/09/2026** (déclaré par Fred, non vérifiable depuis Claude Code sans accès
  Vercel). Une variable ajoutée ou modifiée dans Vercel ne s'applique qu'aux
  **déploiements suivants** : redéployer la preview si besoin.
- Le 28/09/2026 : **back-office des demandes** (`/espace/demarches/demandes`) sur
  `suivi-actions` : 238 affiliations, 20 mandats SEPA, 11 changements de compte,
  29 C1 et 27 C3.2 à cette date.
- Le 29/09/2026 : rubrique **« On vous explique »** (import de notes FGTB .docx /
  .pdf, vulgarisation par Claude Sonnet 5, pages publiques) sur `suivi-actions`.
  Vérifié : extraction réelle .docx et .pdf (tests), vulgarisation d'une note
  fictive par l'API. **Pas encore testé** : l'archivage réel dans
  `notes-sources` et une note FGTB réelle.
- Avant un usage réel de la déclinaison réseaux : définir `SITE_URL` dans
  Vercel, sinon les posts générés depuis la preview pointent vers la preview.
- **Le 29/09/2026 après-midi, sur `suivi-actions`, poussé sur GitHub** :
  - **Page unifiée `/actualites`** (blog + « On vous explique », pastilles,
    sélecteur à segments) ; `/blog` et `/on-vous-explique` redirigés ; menu :
    Accueil · Actualités · Nos actions · Démarches en ligne · Contact.
  - **Mobilisations** : admin (liste, formulaire, aperçu, « pourquoi » et point 0
    « Partir de textes existants » par l'IA), **Paramètres du site**
    (interrupteur de l'accueil), bloc d'accueil avec compte à rebours, page
    campagne `/mobilisation/<slug>`, bandeau d'alerte sur tout le site. Image hero
    affichée entière à sa proportion naturelle. Fred a créé et activé une
    première mobilisation (« Ligne rouge », 09/10/2026) : enregistrement,
    image et interrupteur fonctionnent.
  - **Accueil réordonné** : mobilisation ou ouverture habituelle · 4 dernières
    publications · démarches · dernières actions passées.
  - **Pages légales** `/mentions-legales`, `/vie-privee`, `/cookies` (texte de
    `PAGES-LEGALES.md`) — **validées par Fred le 29/09/2026**.
  - **Page Contact refaite** (bureaux, cartes Google Maps en couleurs, canaux,
    formulaire Resend) et **consentement aux cookies** : pop-up minimal
    (Refuser / Tout accepter) + réglages détaillés sur `/cookies#reglages`
    (un interrupteur par élément ; catégories cartes Google Maps et vidéos
    YouTube).
  - **Pied de page refait** sur fond charbon (seule exception à la règle des fonds
    sombres), logo blanc, bouton « S'affilier », réseaux sociaux.
  - **Bordeaux `#931510`** partout (site, PDF, rapport) et **nouveau
    `logo-cg-rouge.png`**.
- Pistes suivantes : brancher la déclinaison aux futurs outils de visuels et de
  vidéo, publication en 1 clic (phase 3, outil-pont, à étudier), images
  (génération / gabarits, plus tard), page de présentation de la centrale,
  « Trouver votre contact » (phase 4, avec l'assistant).
