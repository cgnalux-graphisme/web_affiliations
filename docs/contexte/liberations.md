# App « Libérations » : contexte

> Ramification de [CLAUDE.md](../../CLAUDE.md). Créé le 13/10/2026 (étape 0), lot 1 écrit le 13/10/2026. S'appuie sur les apps
> [Entreprises](entreprises.md), [Délégués](delegues.md) et [Accès permanents](permanents.md).

## Rôle

App de l'Espace CG (code `liberations`) qui remplace un circuit papier : demande de libération d'un ou
plusieurs délégués pour une réunion ou une formation, courriers aux employeurs et aux délégués, présences le
jour J, frais de déplacement, clôture et archive. Aujourd'hui les documents se perdent et un collègue doit
tout refaire.

## Découpage en 4 lots

| Lot | Contenu | État |
|---|---|---|
| 0 | Cahier des charges, vérifications dans le code, plan, migration | Fait (13/10/2026) |
| 1 | La demande : app dans `site_apps` / `site_app_roles`, formulaire, liste avec filtre par statut, fiche du dossier, Paramètres (lieux, taux kilométrique), tests | Écrit le 13/10/2026 ; migration exécutée et vérifiée ; pas encore testé dans le navigateur |
| 2 | Les courriers : lettre à l'employeur, convocation, attestation de perte de salaire, fiche de paiement, attestation de présence (PDF, e-mail Resend ou impression) | Écrit le 14/10/2026 ; migration `20261014090000` exécutée et vérifiée ; pas encore testé dans le navigateur |
| 3 | Le jour J : QR code sans compte, signature, trajets, calcul des km | Écrit le 14/10/2026 ; migration exécutée ; clé Google Maps en place et vérifiée (`.env.local` et Vercel) ; pas encore testé dans le navigateur |
| 4 | Clôture et archive : PDF de tout, archivage, recherche dans les archives | Écrit le 14/10/2026 (sans migration) ; pas encore testé dans le navigateur |

Lot 1 : **pas** d'envoi de courrier, pas de QR code, pas de PDF.

---

## Cahier des charges (demande de Fred, 13/10/2026)

### Qui a accès

- **Permanent** (PERMANENT) : crée une demande et suit **ses** dossiers. Il choisit les participants dans
  **son périmètre** (ses entreprises, même règle que l'app Accès permanents : `companies.permanent_email`).
  Il ne voit pas les dossiers des autres (confirmé par Fred le 13/10/2026).
- **Admin** (ADMIN_OP et SUPER_ADMIN) : voit tout et traite les dossiers.
- RLS : `site_a_app('liberations')`, plus la restriction « ses dossiers » pour les permanents.

### Parcours d'un dossier (statuts)

1. **Demande** : le permanent remplit le formulaire.
2. **En traitement** : l'admin vérifie, puis génère et envoie les courriers.
3. **Libération envoyée** : employeurs et délégués prévenus.
4. **Jour J** : présences par QR code.
5. **Frais** : trajets déclarés, km calculés, tickets de train vérifiés.
6. **Clôturé** : tout est complet.
7. **Archivé** : bouton « Archiver ». Le dossier sort de la liste active mais reste consultable et exportable.

### Formulaire de demande

- **Type de libération** : congé-éducation, mission syndicale extérieure, crédit d'heures syndicales, heures
  de formation syndicale.
- **Objet / titre de la réunion** (ex. « Commission Professionnelle Construction »).
- **Dates** : une ou plusieurs. Pour chaque date : journée entière ou demi-journée, et heure de début
  (ex. 08h00). Format `jj/mm/aaaa`, jamais de `<input type="date">`.
- **Lieu** : choix dans la liste des Paramètres, ou « Autre » avec une adresse complète en champs séparés
  (rue, numéro, boîte, code postal, localité) et saisie automatique d'adresse. Facultatif : salle
  (ex. « grande salle, 4e étage »).
- **Ordre du jour** (texte libre, facultatif ; sert dans la convocation).
- **Perte de salaire** : oui / non. Si oui : qui prend en charge, employeur ou CG fédérale.
- **Faut-il introduire cette dépense à la CG fédérale** : oui / non. Si non : n° de régime de paiement,
  prérempli avec `63.000.35.26.001` (modifiable).
- **Lunch prévu** : oui / non.
- **Secteur** : liste de `site_secteurs`.
- **Commission paritaire** : liste existante (voir constats).
- **Entreprise spécifique** : oui / non. Si oui : choix dans `site_entreprises`.
- **Pièce jointe** (ex. invitation du fédéral) : PDF ou image, bucket privé.
- **Participants** : fenêtre à part, recherche par nom parmi les délégués (`site_delegues`), entreprise
  affichée ; filtres par entreprise et par secteur. Participant non délégué : voir plan.

### Lieux (en base, modifiables dans Paramètres ; servent au calcul des km)

| Lieu | Adresse |
|---|---|
| CEPAG | Espace Solidarité, Rue de Namur 47, 5000 Beez |
| Centrale Générale Namur | Rue Dewez 40-42, 5000 Namur |
| Centrale Générale Libramont | Rue Fonteny Maroy 13, 6800 Libramont-Chevigny |
| CGSP Namur | Rue de l'Armée Grouchy 41, 5000 Namur |
| Centrale Générale Bruxelles | Rue Watteeu 6, 1000 Bruxelles |

### Données manquantes

- **Domicile ou genre** : demandé au participant la première fois qu'il scanne un QR code, puis gardé.
  L'admin peut aussi compléter à la main.
- **Adresse ou e-mail de l'employeur** : l'admin la complète dans le dossier ; elle est enregistrée dans
  l'app Entreprises pour la suite.
- Le dossier affiche clairement ce qui manque avant l'envoi (« 2 employeurs sans e-mail », « 1 délégué sans
  domicile »).

### Données sensibles (RGPD)

Texte initial : le registre national, le domicile et les tickets ne sont visibles que par les admins.
**Décision de Fred du 13/10/2026** : le registre national et le domicile sont visibles par SUPER_ADMIN,
ADMIN_OP **et les permanents** (pas de problème RGPD selon Fred). Jamais sur une page publique. Les tickets
(lot 3) : à décider. Buckets privés, RLS stricte.

### Lot 2 : les courriers

**a) Lettre à l'employeur** (une par participant), modifiable par l'admin avant l'envoi ; envoi au choix :
e-mail (Resend) avec la lettre en PDF jointe, ou impression. Le PDF est toujours généré.
- En haut à droite : nom et adresse de l'employeur.
- « Votre correspondant à Namur » : nom, téléphone et e-mail de **l'admin qui traite le dossier**
  (aujourd'hui David Binamé, 081/649964).
- « Namur, le lundi 12 octobre 2026 » : **date en format long dans les courriers** (exception voulue à la
  règle `jj/mm/aaaa`).
- « Concerne : demande de libération ».
- « Auriez-vous l'obligeance de bien vouloir libérer notre délégué(e) [Prénom Nom], le [date] toute la
  journée dans le cadre de [type]. »
- « Il est bien entendu que le salaire pour la journée est à votre charge. » **seulement si l'employeur
  paie**. Si la CG fédérale prend en charge : autre phrase, et l'attestation de perte de salaire part avec la
  lettre.
- Formule de politesse, signature du **permanent demandeur** (nom + fonction : « Secrétaire permanent »,
  « Secrétaire permanente adjointe », « Secrétaire régional »…).
- **Un texte par type de libération** (aujourd'hui 6 versions où seule la signature change, et un texte qui
  mélange crédit d'heures et mission syndicale). Formation syndicale : « en heures de formation syndicale
  conformément aux dispositions prévues par la Convention Collective de Travail ». Accord délégué /
  déléguée selon le genre.

**b) Convocation** (une par participant) : « Cher(e) Camarade, Nous avons le plaisir de t'inviter à [objet].
Cette réunion aura lieu le [date] à [heure] dans [salle] située [adresse]. Ordre du jour : [liste]. Si tu ne
peux être présent(e) ce jour-là, merci de nous en informer ([correspondant]). Nous avons fait le nécessaire
pour te faire libérer auprès de ton employeur. Reçois, cher(e) Camarade, nos salutations fraternelles. »
Signature du permanent.

**c) Perte de salaire prise en charge par la CG fédérale** :
- **Attestation de perte de salaire**, envoyée à l'employeur, qui la remplit et la renvoie au **siège
  social : Centrale Générale FGTB, Rue Fonteny Maroy 13, 6800 Libramont-Chevigny** (centralisé, même pour
  Namur). Contenu : réunion, code paiement, ouvrier frontalier oui / non, employeur (nom, adresse,
  n° d'entreprise), travailleur (nom, domicile), pour chaque date « … € x … h = … € », tickets-repas (valeur,
  quote-part patronale), régime de travail (heures / semaine), motif si pas droit au salaire (crédit-temps,
  maladie, accident, autre), date, cachet, signature.
- L'admin coche « attestation reçue » et encode les montants.
- **Fiche de paiement individuelle** : section (Centrale Générale de Namur-Luxembourg), conseil,
  participant (nom, n° de registre national, adresse), entreprise (n° d'entreprise, nom, CP), tableau par
  date (salaire brut et primes, déplacements, indemnités, petits frais, chèques-repas part patronale, total
  comptable précomptes inclus), total, n° de compte, remarques.

**d) Attestation de présence** (après la réunion, une par participant) : « Nous attestons par la présente que
[Prénom Nom] était en mission syndicale le [date] toute la journée. Signature. »

L'ancienne « liste des frais de déplacement » par réunion disparaît : les frais sont calculés à partir des
trajets réels.

### Lot 3 : le jour J (QR code, sans compte)

- L'admin ou le permanent génère à la demande un QR code pour le dossier et le donne au formateur ou à
  l'animateur, qui l'affiche.
- **Un seul QR par dossier, valable uniquement aux dates et heures prévues** (contrôle par l'horodatage, marge
  à proposer). Plusieurs jours : même QR, **une signature par jour**.
- Le participant scanne, sans compte : 1. choisit son nom parmi les participants prévus ; 2. tape son
  numéro de registre national, vérifié côté serveur contre celui enregistré (il ne peut pas signer pour un
  autre) ; 3. signe avec le doigt ; 4. répond aux questions de trajet ; 5. seulement s'ils manquent : domicile
  et genre.
- « Je ne suis pas dans la liste » : présence enregistrée, **à vérifier** par l'admin.
- La page publique ne montre jamais d'adresse ni de numéro de registre national ; elle ne fait qu'écrire.
  Départ : « Tu pars de ton domicile ? Oui / Non, autre adresse ».
- Écriture uniquement par une route serveur (service_role), limite de tentatives, jeton du QR vérifié.

Cas de trajet :
1. **Voiture** : km domicile (ou autre départ) → lieu, aller-retour, calculés automatiquement.
2. **Covoiturage, conducteur** : km calculés et remboursés.
3. **Covoiturage, passager** : nom du conducteur, pas de remboursement.
4. **Voiture jusqu'à un point de rendez-vous, puis passager** : seuls les km domicile → point de rendez-vous
   (aller-retour) sont remboursés.
5. **Train** : photo du ou des tickets.
6. **Mixte voiture + train** : km domicile → gare (aller-retour) + photo des tickets.

En covoiturage, seul le conducteur est remboursé. Taux kilométrique réglable dans Paramètres. Service de
calcul des km à proposer (OpenRouteService, Google Maps…), clé d'API côté serveur.

### Lot 4 : clôture et archive

- PDF de chaque document et PDF complet du dossier (demande, courriers, présences et signatures, frais,
  tickets).
- Bouton « Archiver » quand tout est complet, recherche dans les archives.

---

## Constats de l'étape 0 (vérifiés dans le code et le schéma le 13/10/2026)

Schéma relevé en lecture seule (description de l'API, aucune donnée lue).

- **Délégués** (`site_delegues`) : `prenom`, `nom`, `email`, `telephone`, `unite_id`, `adresse_*`. **Ni
  registre national, ni genre.** L'adresse n'est **pas** lue sur une carte d'identité électronique : la
  « carte d'identité » est l'écran du délégué, l'adresse y est tapée à la main (autocomplétion Photon).
- **Lecture de `site_delegues` en base** : toute personne qui a l'app `entreprises` **ou** `delegues`, sans
  limite de périmètre. Les permanents ont ces deux apps : ils peuvent donc lire **le domicile de tous les
  délégués** depuis le navigateur (l'écran, lui, limite au périmètre). Contraire à la règle RGPD ci-dessus.
- **Travailleurs** (`workers`, CG Link) : `first_name`, `last_name`, `niss`, `is_niss_missing`,
  `affiliation_number`, `company_id`, `status`, `contract_type`… **Pas d'adresse ni de genre.** Rien ne
  relie aujourd'hui un délégué à un travailleur.
- **Employeurs** : `site_entreprises` (`denomination_bce`, `numero_bce`, `siege_*`, `ref_nom`,
  `ref_fonction`, `ref_email`) ; `site_entreprise_sites` (`ref_*`, `unite_postale_id` = l'unité dont
  l'adresse sert d'adresse postale). `blocAdresse()` (`lib/entreprises/regles.ts`) sait déjà composer
  l'adresse d'un site : référent du site sinon de l'entreprise, adresse de l'unité postale sinon le siège.
- **Périmètre du permanent** : `perimetreDe()` / `monPerimetre()` (`lib/permanents/perimetre-serveur.ts`),
  à réutiliser tel quel.
- **Commissions paritaires** : liste dans le code, `lib/commissions-paritaires.ts` (`COMMISSIONS_PARITAIRES`,
  30 CP de nos secteurs + « Je ne sais pas » et « Autre », utilisée par le formulaire d'affiliation).
  `site_chatbot_repartition` contient aussi des CP (76 lignes par région), mais c'est la table de l'Assistant.
- **Fonction et téléphone de l'équipe** : absents. `profiles` n'a que `id`, `role`, `company_id`, `email`,
  `name`. Le seul téléphone connu est `companies.permanent_whatsapp` (par entreprise, pas par personne).

---

## Décisions de Fred (13/10/2026)

- **Registre national et genre** : saisis **à la main** sur la carte du délégué (app Délégués), visibles par
  SUPER_ADMIN, ADMIN_OP et les permanents. Pas de lien avec `workers`.
- **Participants** : **uniquement des délégués** (`site_delegues`). Une personne qui n'est pas déléguée doit
  d'abord être créée dans l'app Délégués.
- Le permanent ne voit que **ses** dossiers.
- Statuts ajoutés : **Brouillon** (avant l'envoi) et **Annulé**.
- Demi-journée : **matin** ou **après-midi**.
- Pièces jointes : **jusqu'à 10** par dossier.
- App : couleur **#D55E00**, icône **calendar-check** (`CalendarCheck` de lucide-react).
- Commissions paritaires : la liste du code (`lib/commissions-paritaires.ts`), sans « Je ne sais pas ».
- Choix par défaut de Claude (non écrits dans la demande, à revoir si besoin) : secteur et CP facultatifs ;
  le lieu choisi est **copié** dans le dossier (un lieu modifié plus tard ne change pas les anciens
  dossiers) ; un taux kilométrique a une **date de début** (un trajet garde le taux du jour de la réunion) ;
  aucun taux n'est pré-rempli (valeur inconnue).

## Lot 1 : ce qui est construit (13/10/2026)

### Accès

- App `liberations` (« Libérations », #D55E00, `calendar-check`, ordre 45) : ADMIN_OP et PERMANENT par
  `site_app_roles`, SUPER_ADMIN toujours.
- **Admin** = ADMIN_OP ou SUPER_ADMIN (`contexteLiberations()`, `lib/liberations/donnees-serveur.ts` ; en base
  `site_liberations_admin()`) : tous les dossiers, tous les délégués, Paramètres.
- **Autre personne avec l'app** (les permanents) : ses dossiers (`demandeur_id`), les délégués de ses
  entreprises (`monPerimetre()`).
- Section de menu réservée à des rôles : nouvelle option `roles` des sections de manifeste
  (`app/espace/_noyau/types.ts`, filtrée par `registre.ts`) ; la page revérifie (`exigerAdminLiberations()`).

### Parcours (lot 1) : `lib/liberations/statuts.ts` (testé)

| Action | De → vers | Qui |
|---|---|---|
| Envoyer la demande | brouillon → demande | demandeur, admin ; exige un dossier complet (`manquantsPourEnvoyer()`) |
| Repasser en brouillon | demande → brouillon | demandeur, admin |
| Prendre en charge | demande → en traitement (`traite_par` = l'admin, futur correspondant) | admin |
| Annuler | brouillon … frais → annulé | demandeur tant que pas pris en charge ; admin |
| Archiver | clôturé ou annulé → archivé (`archive_le`) | admin |

Modifier : le demandeur en brouillon ou demande ; l'admin jusqu'à « frais ». Une demande envoyée doit rester
complète. Supprimer : un brouillon seulement. Chaque changement de statut est écrit dans
`site_liberation_historique` ; la mise à jour est conditionnelle (rien n'est écrit si le statut a changé
entre-temps).

### Routes

| Route | Contenu |
|---|---|
| `/espace/liberations/dossiers` | Liste : onglets Actifs / Archivés, filtres statut, type, secteur, recherche (objet, n°, permanent) ; `?statut=` et `?vue=archives` |
| `/espace/liberations/nouvelle` | Quatre cartes (types) : crée le brouillon et ouvre le formulaire |
| `/espace/liberations/<id>` | Fiche : réunion, prise en charge, participants (employeur, adresse, e-mail, ce qui manque, « Compléter »), pièces jointes, « À compléter avant les courriers », actions, historique |
| `/espace/liberations/<id>/modifier` | Formulaire : réunion, dates (plusieurs, durée, heure), lieu (liste ou « Autre » avec autocomplétion Photon), prise en charge, secteur / CP / entreprise, participants (fenêtre latérale : recherche, filtres entreprise et secteur, cases à cocher), pièces jointes, « Envoyer la demande » |
| `/espace/liberations/parametres` | Admins : lieux (modifier, ne plus proposer, supprimer, ajouter) et taux kilométrique (avec date de début) |

Badge de la tuile : « N à traiter » (admin) ou « N brouillons » (permanent).

### Ce qui manque avant les courriers

Calculé à l'ouverture du dossier (`chargerDossier()`, `manquesDelegue()`, `resumeManques()`) : délégué sans
domicile, sans genre, sans registre national ; employeur sans adresse complète ou sans e-mail. **Employeur
d'un participant** : le site de son unité de rattachement (référent et unité « adresse postale » du site),
sinon le siège (`blocAdresse()` de l'app Entreprises) ; e-mail = référent du site, sinon de l'entreprise.
« Compléter » (`completerDelegue()`) écrit genre, registre national et domicile sur la carte du délégué
(journal des délégués, `source: liberations`) ; l'employeur se complète dans l'app Entreprises (lien).

### Écritures

`app/espace/liberations/actions.ts` : droit revérifié à chaque action, puis **service_role** (aucune
politique d'écriture en base). Pièces jointes : bucket privé `liberations`, lien d'envoi signé créé par le
serveur (`preparerEnvoi()`), arrivée vérifiée (`enregistrerFichier()`), lecture par liens signés d'une heure.

### Tables (migration `supabase/migrations/20261013130000_site_liberations.sql`, **exécutée par Fred le 13/10/2026** ; vérifié : 8 tables, 5 lieux, app et rôles, bucket privé, clé publique refusée)

| Objet | Rôle |
|---|---|
| `site_delegues.registre_national` (11 chiffres), `site_delegues.genre` (`M` / `F`) | Saisis sur la carte du délégué |
| `site_liberations` | Dossier : `numero` (identité), `type`, `objet`, lieu copié (`lieu_id`, `lieu_autre`, `lieu_nom`, `lieu_complement`, `lieu_rue`…), `salle`, `ordre_du_jour`, `perte_salaire` + `perte_salaire_charge` (`employeur` / `cg_federale`), `introduire_cg_federale` + `regime_paiement`, `lunch` (null = pas répondu), `secteur_id`, `commission_paritaire`, `entreprise_specifique` + `entreprise_id`, `statut`, `demandeur_id`, `traite_par`, `soumis_le`, `archive_le` |
| `site_liberation_dates` | `jour`, `duree` (`journee` / `matin` / `apres_midi`), `heure_debut` ; unique (dossier, jour, durée) |
| `site_liberation_participants` | `delegue_id` + nom, prénom et entreprise copiés à l'ajout ; unique (dossier, délégué) |
| `site_liberation_fichiers` | Pièces jointes (bucket privé `liberations`, 25 Mo) |
| `site_liberation_historique` | Changements de statut (avant, après, auteur, date) |
| `site_liberations_lieux` | Les 5 lieux, pré-remplis (CEPAG avec la précision « Espace Solidarité ») |
| `site_liberations_taux_km` | `valable_du` (unique), `taux` (€ / km) |
| `site_equipe_profils` | Fonction (signature) et téléphone (correspondant) de chaque membre de l'équipe : **préparée pour le lot 2**, sans écran |
| `site_liberations_admin()`, `site_liberation_lisible(uuid)` | Fonctions des serrures |

Serrures : lecture des dossiers et de leurs tables si l'app **et** (admin ou demandeur) ; lieux et taux : lecture
avec l'app ; `site_equipe_profils` : lecture par l'équipe ; aucune écriture depuis le navigateur ; `anon` : rien.

### Code

`lib/liberations/` : `types.ts` (listes, types), `regles.ts` (validation des champs, des dates et heures, des
lieux et taux ; ce qui manque ; adresses ; testé), `statuts.ts` (parcours ; testé), `donnees-serveur.ts`
(lectures, droits). `app/espace/liberations/` : `manifeste.ts`, `actions.ts`, `StatutDossier.tsx`,
`dossiers/`, `nouvelle/`, `[id]/` (fiche, actions, participants, compléter), `[id]/modifier/` (formulaire,
participants, pièces), `parametres/` (lieux, taux).

## Lot 2 : les courriers (écrit le 14/10/2026)

### Décisions de Fred (14/10/2026)

- **Textes modifiables dans Paramètres** (« Modèles de courriers ») : le code propose un texte (brouillons
  écrits par Claude à partir du modèle actuel, **à relire par Fred**) ; un texte modifié est enregistré dans
  `site_liberations_modeles` et remplace le texte proposé ; « Rétablir » y revient.
- **Convocation** : par e-mail au délégué (PDF joint) s'il a une adresse sur sa carte, sinon impression ; l'admin
  choisit à chaque fois, comme pour la lettre.
- **N° de compte** (fiche de paiement) : saisi par un admin (ou un permanent) via « Compléter » ou la carte du
  délégué, gardé sur la carte (`site_delegues.iban`, clé IBAN vérifiée).
- **« Conseil »** de la fiche de paiement : champ libre du dossier (`site_liberations.conseil`).

### Ce qui est construit

- **Qui** : les admins (ADMIN_OP, SUPER_ADMIN), à partir de la prise en charge (statuts `en_traitement` à
  `frais`, `STATUTS_COURRIERS`). Panneau « Courriers » de la fiche du dossier.
- **Par participant** : lettre à l'employeur, convocation, attestation de présence : PDF, « Texte » (retouche pour
  ce participant seulement, `site_liberation_courriers.corps` ; « Revenir au modèle »), « Envoyer » (e-mail Resend,
  PDF joint ; avec l'attestation de perte de salaire si la CG fédérale paie ; réponse dirigée vers le
  correspondant), « Imprimé » (et « Annuler imprimé »). État : à envoyer, envoyé le … à …, imprimé le …, échec.
- **Groupé** : « Envoyer les lettres / convocations par e-mail » (celles pas encore faites, à ceux qui ont un
  e-mail ; les autres sont signalés « à imprimer »), « Imprimer toutes les lettres / convocations », toutes les
  attestations de présence, toutes les attestations de perte de salaire (un seul PDF).
- **Perte de salaire prise en charge par la CG fédérale** : attestation de perte de salaire (formulaire pré-rempli
  pour l'employeur, retour au siège de Libramont), « Paiement » (attestation reçue, montants par date : salaire
  brut et primes, déplacements, indemnités, petits frais, chèques-repas ; remarques), fiche de paiement (PDF),
  champ « Conseil ».
- **Libération envoyée** : nouvelle action admin « Marquer la libération envoyée » (en traitement → libération
  envoyée), refusée tant qu'une lettre ou une convocation n'est ni envoyée ni imprimée.
- **Signature** : nom du permanent demandeur + sa **fonction** ; **correspondant** : l'admin qui a pris le dossier
  en charge (nom, **téléphone**, e-mail). Fonction et téléphone : Paramètres › « Équipe : signatures et
  correspondants » (`site_equipe_profils`). Le dossier signale ce qui manque.
- **Dates dans les courriers en toutes lettres** (« lundi 12 octobre 2026 ») : exception voulue à la règle
  `jj/mm/aaaa`. Les formulaires (attestation de perte de salaire, fiche de paiement) gardent `jj/mm/aaaa`.
- **Accords** : délégué / déléguée, Cher / Chère, présent / présente selon le genre ; les deux formes si le genre
  n'est pas renseigné (« délégué(e) »).
- Ville d'expédition (« Namur, le … », « Votre correspondant à Namur », bureau expéditeur) : modèle « Ville
  d'expédition ».

### PDF fabriqués sur le serveur (nouveau)

Pour joindre les PDF aux e-mails, ils sont fabriqués **côté serveur** (`@react-pdf/renderer`, `renderToBuffer`),
à partir des données relues en base : `lib/liberations/pdf/` (`commun.tsx` : polices Barlow et logo lus dans
`public/`, `CourrierPdf.tsx`, `AttestationPertePdf.tsx`, `FichePaiementPdf.tsx`, `rendu.tsx`). Polices et logo
embarqués dans les fonctions Vercel par `outputFileTracingIncludes` (`next.config.ts` ; vérifié dans le build).
Rendu réel testé (`lib/liberations/pdf/rendu.test.ts` ; `PDF_SORTIE=<dossier>` enregistre les fichiers).
Téléchargement : `GET /api/liberations/<id>/pdf?doc=<document>&participant=<id|tous>` (admins).

### Tables (migration `supabase/migrations/20261014090000_site_liberations_courriers.sql`, **exécutée par Fred le 14/10/2026**, vérifiée)

| Objet | Rôle |
|---|---|
| `site_delegues.iban` | N° de compte (sans espaces, format IBAN contrôlé) |
| `site_liberations.conseil` | « Conseil » de la fiche de paiement |
| `site_liberation_participants.attestation_recue_le`, `.remarques_paiement` | Attestation de perte de salaire reçue ; remarques |
| `site_liberations_modeles` | Textes modifiés (`code`, `objet` pour les e-mails, `texte`) |
| `site_liberation_courriers` | Par participant et par courrier (`lettre_employeur`, `convocation`, `attestation_presence`) : texte retouché, statut, mode, destinataire, identifiant Resend, erreur, date et auteur de l'envoi |
| `site_liberation_montants` | Montants par participant et par date |

Serrures : lecture si l'app et (admin ou demandeur) ; modèles : lecture avec l'app ; écriture : serveur seulement.

### Code

`lib/liberations/courriers.ts` (modèles, variables, fusion, dates en toutes lettres, accords ; testé),
`montants.ts` (testé), `courriers-serveur.ts` (préparation, vue de l'écran, équipe), `lib/iban.ts` (testé),
`app/espace/liberations/courriers-actions.ts`, `[id]/courriers/` (panneau, texte, paiement),
`parametres/Equipe.tsx`, `parametres/modeles/`, `app/api/liberations/[id]/pdf/route.ts`.
`sendIsolatedEmail()` accepte maintenant `replyTo` (facultatif, sans effet sur les envois existants).

## Lot 3 : le jour J (écrit le 14/10/2026)

### Décisions de Fred (14/10/2026)

- Calcul des kilomètres : **Google Maps** (Routes API, `computeRoutes`), clé `GOOGLE_MAPS_API_KEY` côté serveur.
- QR code valable **de 08h00 à 18h00** (heure de Bruxelles), chaque jour du dossier.
- Tickets (et signatures) visibles par les admins **et le permanent demandeur**.

### Parcours du participant (`/presence/<jeton>`, public, sans compte)

1. Il choisit son nom dans la liste des participants (recherche), ou « Je ne suis pas dans la liste » (prénom,
   nom, entreprise).
2. Il tape son **n° de registre national** : vérifié côté serveur contre celui de sa carte de délégué ; s'il
   correspond, le serveur lui donne un **passe** signé (HMAC, 30 minutes). Carte sans numéro : présence acceptée
   mais **à vérifier**. Hors liste : numéro contrôlé (clé) et gardé pour l'admin, présence à vérifier.
3. Il **signe avec le doigt** (image PNG, bucket privé `liberations/<dossier>/presences/`).
4. Son **trajet** : voiture seul, covoiturage conducteur, covoiturage passager (nom du conducteur), voiture
   jusqu'à un point de rendez-vous puis passager, train, voiture jusqu'à la gare puis train. « Tu pars de ton
   domicile ? Oui / Non, autre adresse ».
5. Seulement s'ils manquent : **genre** et **domicile** (si le domicile sert de départ). Écrits sur la carte du
   délégué **sans jamais écraser** une valeur (journal des délégués, `source: presence`).
6. Train : photos des tickets (réduites dans le téléphone, 6 au plus, 3,5 Mo chacune).

Une signature par participant et par jour. La page ne montre que l'objet, le nom du lieu, la date et les noms des
participants ; jamais d'adresse ni de numéro. Menu, pied de page, bandeau, assistant et cookies du site masqués.

### Sécurité de la page publique

- Jeton du QR : 24 octets aléatoires ; « Nouveau QR code » le remplace (l'ancien ne marche plus).
- Statut du dossier : en traitement, libération envoyée ou jour J (`STATUTS_QR`) ; horaire vérifié côté serveur.
- Essais : au plus 8 numéros faux par appareil en 15 minutes, 5 par participant en une heure, 5 « hors liste »
  réussis par appareil et par heure (`site_liberation_tentatives` ; seule une **empreinte** salée de l'adresse IP
  est gardée).
- Toutes les écritures : actions serveur en service_role (`app/presence/[jeton]/actions.ts`) ; aucune table n'est
  accessible avec la clé publique.

### Kilomètres et frais

- Remboursé : départ → lieu (voiture, conducteur), départ → point de rendez-vous ou gare ; rien pour le
  passager ni le train seul (`trajetAMesurer()`). Aller-retour, à 0,1 km près (`kmAllerRetour()`).
- Calcul à l'enregistrement de la présence (Google Maps) ; en cas d'échec ou sans clé, message sur le trajet, et
  l'admin **recalcule** ou **corrige** à la main (`km_manuel`, jamais écrasé par un recalcul automatique).
- Montant = km × taux kilométrique **du jour de la réunion** (Paramètres). Tickets : montant encodé et « vérifiés »
  par l'admin. Totaux par participant (km, montant km, tickets) sur la fiche.

### Côté Espace

- Panneau « Jour J : présences et frais » de la fiche (admins et permanent demandeur) : QR code, signatures par
  date (heure, image), trajets, km, tickets, absents, totaux. « Gérer » (admins) : confirmer une présence à
  vérifier, corriger ou recalculer les km, tickets (montant, vérifiés), supprimer une présence.
- `/espace/liberations/<id>/qr` : le QR code en grand (imprimer, nouveau QR). Lien : `SITE_URL`, sinon l'adresse de
  la requête.
- Parcours : **Jour J** arrive tout seul à la première signature (depuis « Libération envoyée ») ; action admin
  **« Passer aux frais »** (libération envoyée ou jour J → frais ; le QR ne fonctionne plus).

### Tables (migration `supabase/migrations/20261014120000_site_liberations_jour_j.sql`, **exécutée par Fred le 14/10/2026**, vérifiée)

| Objet | Rôle |
|---|---|
| `site_liberations.qr_jeton`, `.qr_cree_le` | Jeton du QR code (unique) |
| `site_liberation_presences` | Signature : date, participant (ou hors liste : prénom, nom, entreprise, n° saisi), image, à vérifier, vérifiée par |
| `site_liberation_trajets` | Un par présence : mode, départ, étape, conducteur, km (manuel, erreur), montant des tickets, vérifiés |
| `site_liberation_tickets` | Photos des tickets (bucket privé) |
| `site_liberation_tentatives` | Essais de la page publique (empreinte, réussi) ; aucune lecture hors serveur |

### Code

`lib/liberations/jour-j.ts` (modes, fenêtre du QR, km, essais ; testé), `jeton-serveur.ts` (jetons, passe,
empreinte ; testé), `google-km.ts`, `jour-j-serveur.ts` (dossier par jeton, calcul des km, vue), `origine-serveur.ts` ;
`app/presence/[jeton]/` (page, parcours, signature, actions) ; `app/espace/liberations/jour-j-actions.ts`,
`[id]/jour-j/`, `[id]/qr/`. Bibliothèque ajoutée : `qrcode` (QR en SVG côté serveur). Actions serveur : limite
du corps portée à 4 Mo (`next.config.ts`, photos des tickets).

## Lot 4 : clôture et archive (écrit le 14/10/2026, sans migration)

### Décisions de Fred (14/10/2026)

- **Clôture** : l'app liste ce qui manque encore ; l'admin peut **clôturer quand même** après confirmation
  (délégué absent, ticket perdu…).
- **Désarchiver** : possible par un admin ; le dossier reprend son statut d'avant l'archive (clôturé ou annulé,
  lu dans l'historique).

### Ce qui est construit

- Actions admin « **Clôturer le dossier** » (frais → clôturé) et « **Désarchiver** » (archivé → clôturé ou annulé,
  `archive_le` vidé). « Archiver » existait (clôturé ou annulé → archivé).
- **Ce qui manque pour clôturer** (`manquantsPourCloturer()`, `lib/liberations/cloture.ts`, testé) : présences à
  vérifier, participants sans aucune signature, km à calculer ou saisir, tickets de train non vérifiés,
  attestations de perte de salaire non reçues (si la CG fédérale paie). Affiché dans la confirmation.
- **PDF complet du dossier** (bouton « PDF complet » de la fiche, admins et permanent demandeur, dès que la demande
  est envoyée) : `GET /api/liberations/<id>/dossier`. Contenu, dans l'ordre :
  1. synthèse (`lib/liberations/pdf/DossierPdf.tsx`) : la demande, la prise en charge, les participants, l'état
     des courriers, les présences par date avec l'**image de chaque signature**, les frais (trajets, km, montants,
     tickets) et les totaux, la perte de salaire (attestation, total de la fiche de paiement), les pièces jointes et
     l'historique, puis une page par **photo** (tickets, pièces jointes en image) ;
  2. les documents : lettres à l'employeur, convocations, attestations de présence (participants qui ont signé),
     et si la CG fédérale paie : attestations de perte de salaire et fiches de paiement ;
  3. les pièces jointes et les tickets envoyés en PDF, ajoutés tels quels (`assemblerPdf()`, `pdf-lib` ; un PDF
     illisible est sauté).
  Le PDF est enregistré dans le bucket privé (`<dossier>/export/dossier-<n°>.pdf`, remplacé à chaque
  génération) puis servi par un **lien signé d'une heure** (un dossier riche en photos dépasse la limite de
  4,5 Mo d'une réponse Vercel). Code : `lib/liberations/dossier-pdf-serveur.ts`. Rendu réel testé.
- **Recherche** (liste des dossiers, archives comprises) : chaque mot doit se trouver dans le n°, l'objet, le
  permanent, le type, le **nom d'un participant ou de son entreprise** ; filtre **Année** (première date du
  dossier) en plus du statut, du type et du secteur.

## Ajustements du 15/10/2026

- **Paramètres › Taux kilométrique** : rappel du **taux légal, à titre informatif** (`lib/liberations/taux-legal.ts`,
  relevé à la main) : 0,4452 € / km du 01/10/2026 au 31/12/2026 (indemnité des fonctionnaires fédéraux, système
  trimestriel, circulaire n° 771 du 16/09/2026) ; système annuel 0,4761 € / km. Bouton « Reprendre ce taux » (pré-remplit
  l'ajout). **À mettre à jour chaque trimestre.**
- **Paramètres › Équipe** : seulement les comptes gérés dans Comptes & accès qui ont l'app Libérations (rôle ou
  exception) et ne sont pas suspendus.
- **Mon compte** : chaque membre de l'équipe règle sa fonction (signature) et son téléphone (correspondant).

## À préparer pour la suite

- **Lot 2, à faire par Fred** : relire les modèles de courriers (Paramètres › Modèles), remplir fonctions et
  téléphones (Paramètres › Équipe), envoyer une lettre de test à sa propre adresse.
- **Lot 3, à faire par Fred** : essai réel avec un téléphone (dossier de test daté d'aujourd'hui, entre 08h00 et
  18h00) ; conseillé : plafond journalier de la Routes API et alerte de budget dans Google Cloud.
- **Lot 4, à faire par Fred** : clôturer un dossier de test, télécharger le PDF complet, archiver, chercher dans
  les archives, désarchiver.
- **Idée** : reprendre automatiquement les frais de déplacement dans la colonne « Déplacements » de la fiche de
  paiement (aujourd'hui saisie à la main).
- Points à revoir avec Fred : un admin voit aussi les **brouillons** des permanents dans la liste (filtrables
  par statut) ; un admin qui crée une demande en est le demandeur (pas de choix du permanent signataire).
