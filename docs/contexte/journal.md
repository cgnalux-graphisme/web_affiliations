# Journal : états successifs du projet

> Ramification de [CLAUDE.md](../../CLAUDE.md) (à la racine du projet). Contenu déplacé tel quel le 12/10/2026.

Le plus récent en haut. L'état **actuel** est dans CLAUDE.md (racine), section « État actuel ».

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
