# Base de données : tables, règles métier, envois

> Ramification de [CLAUDE.md](../../CLAUDE.md) (à la racine du projet). Contenu déplacé tel quel le 12/10/2026.

## Base de données — tables du site

> **Accès depuis le 12/10/2026** (politiques RLS modifiées directement en base, déclaré par Fred) : les tables
> `site_*` et les buckets suivent les apps de l'Espace CG via `site_a_app()` : apps `actions`, `scan-news`,
> `demarches` ; ce qui relève de l'app `parametres` reste réservé à SUPER_ADMIN. Dans les tableaux
> ci-dessous, « app `x` » = l'app qui gère la table (correspondance tirée des écrans ; la règle exacte est en
> base). Les vues `*_public` restent en lecture publique. Règles vérifiées en base le 12/10/2026 (par
> Claude sur claude.ai, qui gère la base). SUPER_ADMIN garde partout l'accès en plus de l'app.
> **Restent SUPER_ADMIN uniquement** : `site_parametres`, `site_destinataires`, `site_envois_mails`,
> `site_services`, `site_faq`, `site_apps` (écriture), `site_app_roles` (écriture), `site_app_acces`,
> `site_journal_acces`.

Créées le **24/09/2026** dans la base CG Link :

| Objet | Rôle | Accès |
|---|---|---|
| `site_secteurs` | Liste modifiable des secteurs (11 pré-remplis) | Lecture publique, ajout : app `actions` |
| `site_actions` | Les actions syndicales (suivi + rapport de congrès) | App `actions` (lecture/écriture) |
| `site_photos` | Photos rattachées à chaque action (`action_id`, `url`, `legende`) | App `actions` |
| `site_videos` | Vidéos YouTube d'une action (`action_id`, `url`, `titre`) | App `actions` |
| `site_actions_public` | Vue : actions publiées, colonnes autorisées (l'entreprise seulement pour un piquet) | Lecture publique |
| `site_photos_public` / `site_videos_public` | Vues : photos / vidéos des actions publiées | Lecture publique |
| Bucket `action-photos` | Fichiers photo (public en lecture) | Écriture : app `actions` |

`site_photos` et `site_videos` → `site_actions` en `ON DELETE CASCADE`.

Blog (créés côté Supabase avant le 28/09/2026, aucune migration dans le dépôt) :

| Objet | Rôle | Accès |
|---|---|---|
| `site_articles` | Articles du blog **et** explications (« On vous explique »), distingués par `categorie` | App `scan-news` (lecture/écriture) |
| `site_articles_public` | Vue : articles publiés (sans `statut`, `created_at`, `updated_at`), **avec `categorie`** | Lecture publique |
| Bucket `blog-images` | Images de couverture, et image des mobilisations (public en lecture) | Écriture : app `scan-news` ou app `actions` (deux règles en base ; la seconde, ajoutée le 12/10/2026 à 10:20 pour les images des mobilisations, vaut pour tout le bucket) |
| Bucket `notes-sources` | **Privé** : notes FGTB d'origine des explications (traçabilité interne) | App `scan-news` (en plus de SUPER_ADMIN) ; le code n'y accède que **côté serveur** (service_role) |

`categorie` et `document_source` ajoutés par Fred avant le 29/09/2026 (aucune
migration dans le dépôt) : `categorie` = `article` (défaut, blog) ou `explication`
(On vous explique) ; `document_source` = chemin de la note dans `notes-sources`
(`<aaaa>/<uuid>-<nom>.docx|pdf`).

Veille (créés côté Supabase avant le 28/09/2026) :

| Objet | Rôle | Accès |
|---|---|---|
| `site_sources` | Flux RSS suivis : `nom`, `url_flux`, `actif` | App `scan-news` |
| `site_themes` | Mots-clés de pertinence : `mot_cle`, `actif` (pré-remplie) | App `scan-news` |
| `site_veille` | Articles ramassés : `source_id`, `source_nom`, `titre`, `resume`, `lien` (**index unique**), `date_publication`, `statut` (`nouveau` / `traite` / `ignore`) | App `scan-news` ; écriture du ramassage en service_role |
| `site_veille_analyses` | Classements « Check IA » : `origine` (`manuel` / `auto`), `nb_articles`, `resultat` (jsonb, `ResultatAnalyse` de `lib/veille-tri.ts`), `modele`, `created_at` ; purgés après 7 jours | Lecture : app `scan-news` ; écriture et purge **uniquement** en service_role |

Migration `supabase/migrations/20261001090000_site_veille_analyses.sql` **demandée par Fred le
01/10/2026** (idempotente), **exécutée par Fred le 01/10/2026**. Si la table manquait, le fil
s'afficherait normalement mais « Check IA » échouerait à l'enregistrement (message clair).
`site_parametres` reçoit aussi la clé `veille_dernier_ramassage` (date ISO du dernier ramassage,
écrite en service_role).

Mobilisations (créés par Fred avant le 29/09/2026, aucune migration dans le dépôt ;
colonnes relevées par l'OpenAPI de PostgREST) :

| Objet | Rôle | Accès |
|---|---|---|
| `site_mobilisations` | `titre`, `slug`, `date_evenement` (timestamptz ; saisie `jj/mm/aaaa` + `hh:mm` à l'heure de Bruxelles, `versHorodatage()`), `lieu`, `chapo`, `image_hero` (bucket `blog-images`, `mobilisations/<id>/hero-<uuid>.jpg`), `pourquoi` (texte, paragraphes séparés par une ligne vide), `revendications` et `infos_pratiques` (une ligne par élément ; « Libellé : détail » met le libellé en gras), `lien_inscription` (formulaire FGTB fédérale, http(s)), `actif` (défaut false), `created_at`, `updated_at` | App `actions` |
| `site_parametres` | `cle` (clé primaire), `valeur`, `updated_at` ; `accueil_mobilisation` = `on` / `off` | SUPER_ADMIN (app `parametres`) |
| `site_accueil_mobilisation` | Vue : **une ligne seulement si** l'interrupteur est sur `on` **et** qu'une mobilisation est active (colonnes publiques) | Lecture publique |

**Règle** : bloc d'accueil, bandeau et page campagne ne s'affichent **que** si la
vue renvoie une ligne (`chargerMobilisationActive()`, `lib/mobilisations-public.ts`,
jamais la table). Sinon, ouverture habituelle et aucun bandeau : jamais de bloc
vide. Activer une mobilisation désactive les autres (côté code). Après tout
changement : `revalidatePath("/", "layout")` ; le layout a `revalidate = 60`
(toutes les pages publiques sont donc régénérées au plus toutes les minutes).
Compte à rebours calculé dans le navigateur seulement (`CompteARebours.tsx`) ;
« C'est aujourd'hui. » le jour J, rien après. **Fin automatique** (02/10/2026, demande de Fred) :
la mise en avant s'arrête **1 h après l'heure de l'événement** (sans heure saisie : à minuit à la fin
du jour J), `finMiseEnAvant()` / `miseEnAvantTerminee()` (`lib/mobilisations.ts`), appliquée par
`chargerMobilisationActive()` (bloc, bandeau et page campagne disparaissent ; `actif` reste vrai en
base, la liste admin affiche « Terminée ») ; le bandeau se retire aussi dans le navigateur à l'heure
dite et recharge la page (page déjà ouverte ou encore en cache). Sans date : pas de fin automatique. Partage : partage natif du
téléphone + Facebook, WhatsApp, X, e-mail, copier le lien (`liensPartage()`),
icônes monochromes (pas de bleu ni de vert de marque) ; aucune publication depuis
nos comptes. « Pourquoi » par l'IA (`lib/mobilisation-ia.ts`) : texte percutant
pour convaincre même les réticents, aucun fait / chiffre / revendication / action
absent des points de Fred, chiffres absents signalés (`nombresAbsents()`), rappel
« à relire, corriger et valider ».

**Point 0 « Partir de textes existants »** (création seulement, demande de Fred du
29/09/2026) : Fred colle des textes trouvés un peu partout (articles, tract,
communiqué, 60 000 caractères max, `ANALYSE_MAX`) ; `/api/mobilisations/analyse`
(Claude Sonnet 5, sortie structurée, ~20 s, ~1 c.) pré-remplit titre, date, heure,
lieu, chapô, pourquoi, revendications, infos pratiques et lien d'inscription.
L'image et la mise en avant restent manuelles ; confirmation avant d'écraser des
champs remplis ; rien n'est enregistré avant « Enregistrer ». **Garde-fous côté
code** (`construireAnalyse()`) : date / heure gardées seulement si valides ; lien
d'inscription gardé **seulement s'il figure tel quel dans les textes** ; chiffres
absents des textes signalés ; passages repris mot pour mot (≥ 8 mots,
`contientReprise()`) signalés ; puis mois en toutes lettres convertis
(`datesEnChiffres()`, « 14 octobre » → « 14/10/2026 », après les contrôles pour
éviter les fausses alertes). Essai réel du 29/09/2026 sur des textes fictifs :
tous les champs remplis, chiffre de presse non confirmé écarté par l'IA, reprise
signalée.

Réseaux sociaux (créé côté Supabase avant le 28/09/2026) :

| Objet | Rôle | Accès |
|---|---|---|
| `site_publications_reseaux` | Posts déclinés d'un article : `article_id` (→ `site_articles`), `reseau` (`facebook` / `instagram` / `tiktok` / `youtube`), `contenu`, `statut` (défaut `brouillon`, non utilisé par le code), `created_at`, `updated_at` | App `scan-news` |

Colonnes relevées par l'OpenAPI de PostgREST ; aucune contrainte d'unicité visible sur (`article_id`, `reseau`) : le code met à jour la ligne la plus récente, sinon en insère une. YouTube : titre sur la 1re ligne, ligne vide, puis description (`composerYoutube()` / `lireYoutube()`, `lib/reseaux.ts`). Si la base contraint `reseau` à d'autres valeurs, adapter `RESEAUX`.

Assistant CG (**créées et remplies directement dans Supabase par Fred le 07/10/2026**, aucune migration dans
le dépôt ; **ne pas modifier le schéma**). `anon` n'a aucun droit (vérifié le 08/10/2026). Règles en base depuis le 12/10/2026 : voir la colonne
« Accès » (app `demarches`, en plus de SUPER_ADMIN). Le code passe toujours par le serveur, en service_role
(`lib/assistant-donnees.ts`, cache mémoire 5 min ; back-office par actions serveur) :

| Objet | Rôle | Accès |
|---|---|---|
| `site_chatbot_repartition` | `region` (Namur / Luxembourg), `cp_code`, `cp_nom`, `contact_nom` / `contact_email` / `contact_tel` (= la **1re ligne**, qui reçoit les questions juridiques), `permanent_nom` / `permanent_email` (**jamais lus par le chatbot**), `actif` ; 76 lignes au 08/10/2026 (conformes à `Répartition des secteurs 2025.xlsx`) | Lecture : app `demarches` |
| `site_chatbot_secteurs` | `mot_cle`, `centrales` (plusieurs séparées par « ; »), `remarque` (arbitrages) ; 79 lignes | Lecture : app `demarches` |
| `site_chatbot_centrales` | Coordonnées des centrales FGTB par province (17 lignes) | Lecture : app `demarches` |
| `site_chatbot_antennes` | Antennes chômage FGTB par province (10 lignes, pas d'e-mail : contact écrit par My FGTB) | Lecture : app `demarches` |
| `site_chatbot_demandes` | Demandes transmises : `nom`, `prenom`, `email`, `message`, `code_postal`, `region`, `categorie`, `cp_code`, `affilie`, `registre_national`, `destinataire_email`, `service_nom`, `statut` (défaut `nouveau` ; le code utilise aussi `en_cours` et `traite`, **non vérifié contre une éventuelle contrainte**), `created_at` | Lecture et mise à jour : app `demarches` ; suppression : SUPER_ADMIN uniquement ; insertion par la route de transmission (service_role) |

Entreprises et délégués (migration `supabase/migrations/20261012120000_site_entreprises_delegues.sql`,
**autorisée par Fred le 12/10/2026, écrite mais pas encore exécutée**). Spec :
[docs/superpowers/specs/2026-10-12-entreprises-delegues-design.md](../superpowers/specs/2026-10-12-entreprises-delegues-design.md).

| Objet | Rôle | Accès |
|---|---|---|
| `site_entreprises` | Fiche : `company_id` (lien CG Link, unique, null = hors CG Link), `nom` (obligatoire hors CG Link), `numero_bce` (10 chiffres, **non unique** : HEIDELBERG / HEIDELBERG MATERIALS), `denomination_bce`, `siege_*`, `ref_*` (personne de référence), `bce_importe_le`, `notes`, `autres_company_ids` (entreprises CG Link regroupées, ex. XLG HOME dans TRIXXO), `secteur_id` (→ `site_secteurs`, 13/10/2026, migration `20261013120000`) | App `entreprises` (session) |
| `site_entreprise_sites` | Sites = UTE : `nom`, `principal` (un seul par entreprise), `unite_postale_id`, `ref_*`, `ordre` | App `entreprises` |
| `site_entreprise_unites` | Unités d'établissement : `numero_ue` (unique par fiche), adresse, `statut` (`actif` / `arrete`), `date_debut`, `site_id`, `origine` (`bce` / `manuel`), `suivie` (unité suivie par la CG, 13/10/2026) | App `entreprises` |
| `site_entreprise_onss` | ONSS : `numero` (chiffres, unique par entreprise), `libelle`, `site_id` | App `entreprises` |
| `site_delegues` | Délégués : `entreprise_id`, `cglink_user_id` (unique), `unite_id` (unité suivie de rattachement, 13/10/2026), `adresse_*` (rue, numéro, boîte, code postal, localité, pays ; 13/10/2026), `prenom`, `nom`, `email`, `telephone`, `notes`, `a_verifier` | Lecture : apps `entreprises` ou `delegues` ; écriture : service_role seulement |
| `site_delegue_mandats` | Mandats : `organe` (`ds`, `ce`, `cppt`, `cee`, `instances_cg`, `autre`), `qualite` (`effectif` / `suppleant`, obligatoire pour DS / CE / CPPT), `libelle`, `fonction`, `site_id`, `debut`, `fin`, `a_verifier` | Idem |
| `site_ecarts_ignores` | Écarts CG Link ignorés (`cible`, `cible_id`, `champ`, `valeur`) | Lecture : app `delegues` ; écriture : service_role |
| `site_journal_delegues` | Journal de la gestion des délégués (lot B) | Idem |
| `site_appliquer_bce()` | Import BCE en une transaction (unités créées / modifiées, dénomination, siège, `bce_importe_le`) | `authenticated` (security invoker, vérifie l'app) |
| Trigger `site_entreprise_sites_avant_suppression` | Site principal non supprimable ; unités, ONSS, mandats d'un site supprimé → site principal | — |
| `site_compter_affilies()` | Affiliés `Actif` de `workers` par `company_id` et `contract_type` ; renvoie 0 ligne sans l'app `entreprises` ou `delegues` | `authenticated` (security definer) ; pas `anon` |

Fiches de suivi (migration `supabase/migrations/20261013120000_site_fiches_suivi.sql`, design validé par Fred le
13/10/2026, **exécutée par Fred le 13/10/2026 (vérifié : tables, bucket privé, 87 fiches sur 93 avec un secteur, clé publique refusée)**). Contexte : [permanents.md](permanents.md).

| Objet | Rôle | Accès |
|---|---|---|
| `site_fiches_suivi` | Une fiche : `type` (`usine` / `sectoriel`), `titre`, `date_debut`, `date_fin` (null = date unique, ≥ début), `entreprise_id`, `site_id`, `secteur_id`, réponses `origine`, `duree`, `echanges_direction`, `courriers`, `evenements`, `resolution`, `resultat`, `texte`, `texte_genere_le`, `statut` (`brouillon` / `terminee`), `auteur_id` (défaut `auth.uid()`), `created_at`, `updated_at` (trigger) | Lecture : app `permanents` ; insertion : app + auteur = soi ; modification / suppression : `site_fiche_modifiable(auteur_id)` (app + auteur ou SUPER_ADMIN) |
| `site_fiches_suivi_fichiers` | Documents et photos : `fiche_id` (cascade), `genre` (`document` / `photo`), `chemin` (unique), `nom_origine`, `taille`, `type_mime`, `nature` (`courrier_envoye`, `courrier_recu`, `pv`, `preavis`, `accord`, `tract`, `presse`, `autre`), `nature_autre`, `legende`, `ordre` | Lecture : app `permanents` ; écriture : selon la fiche |
| `site_fiche_modifiable(uuid)` | Vrai si app `permanents` et (auteur = soi ou SUPER_ADMIN) | `authenticated` (security definer) |
| Bucket `fiches-suivi` | **Privé**, 25 Mo par fichier, **aucune politique** : envois et lectures uniquement par liens signés créés côté serveur (service_role) après vérification | — |

La migration ajoute aussi l'app `permanents` à `site_apps` et les rôles par défaut (`permanents` et `delegues`
pour PERMANENT), et remplit `site_entreprises.secteur_id` à partir de `companies.sector` (Construction, Bois,
Chimie, ETA, Nettoyage, Gardiennage, Titres-Services, Carrière ; ALE, CP100, Verre et papier restent à choisir).

Libérations (migration `supabase/migrations/20261013130000_site_liberations.sql`, plan validé par Fred le
13/10/2026, **exécutée par Fred le 13/10/2026**, vérifiée). Détail des colonnes : [liberations.md](liberations.md), section « Tables ».

| Objet | Rôle | Accès |
|---|---|---|
| `site_liberations` | Dossiers de libération (demande → archive) | Lecture : app `liberations` et (admin ou demandeur) ; écriture : service_role |
| `site_liberation_dates`, `site_liberation_participants`, `site_liberation_fichiers`, `site_liberation_historique` | Dates, participants (délégués), pièces jointes, changements de statut | Lecture : `site_liberation_lisible(liberation_id)` ; écriture : service_role |
| `site_liberations_lieux`, `site_liberations_taux_km` | Lieux des réunions, taux kilométrique daté | Lecture : app `liberations` ; écriture : service_role (admins) |
| `site_equipe_profils` | Fonction et téléphone de l'équipe (courriers, lot 2) | Lecture : équipe ; écriture : service_role |
| `site_delegues.registre_national`, `site_delegues.genre` | Registre national (11 chiffres) et genre (`M` / `F`) | Comme `site_delegues` |
| Bucket `liberations` | **Privé**, 25 Mo, aucune politique : liens signés côté serveur | — |
| `site_liberations_modeles`, `site_liberation_courriers`, `site_liberation_montants` (lot 2, migration `20261014090000`, exécutée le 14/10/2026) | Textes modifiés des courriers ; courriers par participant (texte retouché, envoi) ; montants de la fiche de paiement | Modèles : lecture avec l'app ; courriers et montants : `site_liberation_lisible()` ; écriture : service_role |
| `site_delegues.iban`, `site_liberations.conseil`, `site_liberation_participants.attestation_recue_le` / `.remarques_paiement` (lot 2) | N° de compte, « Conseil », attestation reçue, remarques | Comme leur table |
| `site_liberation_presences`, `site_liberation_trajets`, `site_liberation_tickets`, `site_liberations.qr_jeton` (lot 3, migration `20261014120000`, exécutée le 14/10/2026) | Signatures du jour J, trajets et km, photos des tickets, jeton du QR | Lecture : `site_liberation_lisible()` ; écriture : service_role (page publique par actions serveur) |
| `site_liberation_tentatives` (lot 3) | Essais de la page publique du QR (empreinte d'IP, réussi) | Aucune lecture ni écriture hors service_role |
| `site_liberations_admin()`, `site_liberation_lisible(uuid)` | Admin = ADMIN_OP ou SUPER_ADMIN avec l'app ; dossier lisible | `authenticated` (security definer) |

### Colonnes de `site_articles`
`titre`, `slug` (adresse `/blog/<slug>` ou `/on-vous-explique/<slug>` selon
`categorie`), `chapo` (accroche), `points_cles`
(encart « En bref », **texte, une ligne par point**), `contenu` (**HTML** produit
par l'éditeur Tiptap), `image_couverture` (URL publique du bucket), `sources`
(**texte, un lien par ligne**, libellé facultatif avant le lien :
« Le Soir – https://… » ; pour une explication, une ligne peut être une simple
référence sans lien), `statut` (`brouillon` / `publie`), `date_publication`
(timestamptz), `created_at`, `updated_at`, `categorie` (`article` / `explication`),
`document_source` (note FGTB archivée). Types relevés par sondage de l'API
(pas d'accès au schéma) : si la base contraint `statut` à d'autres valeurs,
adapter `STATUT_*` dans `lib/articles.ts`.

### Colonnes de `site_actions`
`nom` (titre court de la une), `date_action`, `ville`, `type_action` +
`type_action_autre` (détail si « autre »), `secteur_id` (→ `site_secteurs`),
`front_commun` + `front_commun_csc` + `front_commun_synova`, `entreprise`,
`deplacement_bus` + `deplacement_train`, `description` (interne), `info_web`
(texte public), `visible_public` (publication sur le site), `participants_total`,
`participants_centrale`, `created_at`.

### Règles métier
- **Type d'action** : grève générale · manifestation nationale · manifestation ·
  piquet en entreprise · action · autre (à préciser dans `type_action_autre`).
- **Titre d'une action** : son `nom`, sinon son type (`titreAction()` dans
  `lib/actions.ts`).
- **Secteur** : liste modifiable — Fred peut ajouter un secteur, qui devient alors
  réutilisable.
- **Front commun** : oui / non ; si oui, cases **CSC** et **Synova** (nouveau nom
  de la CGSLB). Couleurs d'identité : **CSC = vert** (`#1E8C45`), **Synova = bleu**
  (`#1F5FAD`) — valeurs approximatives, à remplacer par les codes officiels si
  disponibles. Ne jamais utiliser de vert ni de bleu pour autre chose (seule exception : l'Espace CG,
  couleurs d'app et statuts, voir [app/espace/CLAUDE.md](../../app/espace/CLAUDE.md)).
- **Déplacement organisé** : bus et/ou train.
- **Participants** : on stocke des **nombres** uniquement, pas de noms (plus simple
  côté RGPD).
- **Publication** : une action n'apparaît sur le site que si `visible_public` est
  coché. La `description` reste interne ; le site affiche `info_web`.
- **Photos** : l'ordre est porté par le nom du fichier
  (`<action_id>/<rang>-<uuid>.jpg`, rang `00` = photo principale) ; les pages
  trient par URL (`lib/photos.ts`). Réduites à 2000 px en JPEG avant envoi.
  Changer l'ordre = renommer le fichier (`move`) puis mettre à jour l'URL.
- **Vidéos** : liens YouTube validés et normalisés
  (`https://www.youtube.com/watch?v=<id>`, `lib/youtube.ts`) ; lecteur
  youtube-nocookie chargé au clic seulement.
- **Suppression d'une action** : fichiers photo du bucket d'abord, puis la ligne
  `site_actions`. Si l'effacement des fichiers échoue réellement, l'action est
  conservée (pas de photos orphelines en ligne).

### Tables des formulaires publics (back-office des demandes)

Tables `web_*` écrites par les formulaires avec la clé publique, **jamais lisibles
par elle** (vérifié le 28/09/2026 : 0 ligne renvoyée à `anon`). **Ne pas les
modifier, pas de migration.** **Lecture resserrée le 12/10/2026** (directement en base, par Fred) :
`web_c1`, `web_c3_2` et `web_mandats_sepa` ne sont lisibles qu'avec l'app `demarches` (`site_a_app()`) ;
l'ancienne politique `auth_select`, qui laissait tout compte connecté (délégués compris) lire NISS et IBAN,
est neutralisée (`false`). Relevé initial du 07/10/2026. `anon` / `authenticated` gardent leurs droits SQL :
la RLS seule protège. `web_affiliations` n'a jamais été lisible (règle SELECT `false`) : rien n'a changé.

| Table | Formulaire | Contenu |
|---|---|---|
| `web_affiliations` | `FormulaireWebIndependant` | Colonnes à plat (identité, adresse, situation, transfert, cotisation, IBAN, mentions, signature) ; colonne `status` (défaut `en_attente`) jamais utilisée par la centrale : **masquée** dans le back-office (choix de Fred, 28/09/2026) |
| `web_mandats_sepa` | `FormulaireChangementCompte` | Mandat SEPA **et** changement de compte, distingués par `type_demande` (`nouveau_mandat` / `changement_compte` ; vide = compté comme nouveau mandat) |
| `web_c1`, `web_c3_2` | `FormulaireC1`, `FormulaireC32` | `nom`, `prenom`, `niss`, `email` + le formulaire complet dans `data` (jsonb) |
| `web_modifications` | `FormulaireModification` | (07/10/2026) Colonnes à plat : identité, `changements` (text[]), un groupe de colonnes par bloc (`adresse_*`, `nouvel_email` / `nouveau_telephone`, `employeur_*`, `regime` / `regime_heures`, `situation` / `profession` / `profession_cp`, chacun avec sa date `*_depuis`), `transfert` (`non` / `a_organiser` / `a_verifier`), signature. Créée par la migration `20261007120000_web_modifications.sql` (**demandée par Fred le 07/10/2026**, idempotente, à exécuter par Fred) : `anon` **insère seulement** ; lecture **super admin uniquement** (plus strict que les autres `web_*`) ; ajoute aussi `modification` aux contrôles de `site_destinataires` (+ `admin.nalux@accg.be`) et `site_envois_mails`. Back-office : onglet « Changements de situation », badge « Transfert à organiser » / « Secteur à vérifier », PDF régénéré dans le navigateur ; table absente = comptée vide (tableau de bord, demandes liées) |

**Back-office des demandes** (28/09/2026) — données personnelles (NISS, IBAN,
signature) :
- Lecture **uniquement** par les routes `/api/admin/demandes…` : session
  SUPER_ADMIN vérifiée, puis clé **service_role** (`lib/demandes-serveur.ts`,
  serveur uniquement). Réponses `Cache-Control: private, no-store`, aucune
  donnée de demande journalisée. La liste ne renvoie que date, nom, prénom,
  e-mail ; le reste seulement dans le détail. Rien n'est jamais écrit.
- Recherche : chaque mot doit figurer dans le nom, le prénom ou l'e-mail
  (caractères de filtre PostgREST retirés, `motsRecherche()`) ; dates
  `jj/mm/aaaa` à l'heure de Bruxelles ; 25 lignes par page ; une page hors
  limites renvoie la dernière.
- **PDF régénérés avec le code existant, mise en page inchangée** :
  affiliation et mandat SEPA / changement de compte **dans le navigateur**
  (`genererPdfAffiliationEnregistree()` et `genererPdfMandatEnregistre()`,
  exportées des formulaires ; ligne en base → données du formulaire, **datées
  du jour de la demande** via l'option `dateDocument`) ; C1 et C3.2 **sur le
  serveur**, en appelant tels quels les handlers `POST` de `/api/fill-c1` et
  `/api/fill-c3-2` avec `data`. L'IP n'est pas conservée pour
  l'affiliation (elle n'apparaît pas dans son PDF).
- **Parcours de transfert** (`/parcours-transfert`) : pas de table à lui. Chaque
  étape enregistre dans la table de son formulaire (`web_affiliations`, `web_c1`,
  `web_c3_2`) et **rien ne relie les 3 lignes** (pas d'identifiant de parcours) :
  un dossier de parcours apparaît donc éclaté dans 3 onglets.
  Palliatif (28/09/2026) : encadré « Autres demandes de la même personne » dans
  la fiche (`/api/admin/demandes/<type>/<id>/liees`, `lib/demandes-liees.ts`) —
  même NISS (11 chiffres ; l'affiliation le garde au format `99.99.99-999.99`)
  ou même e-mail, jamais le nom seul ; « même dossier probable » si moins de
  24 h d'écart. Déduction : à vérifier avant de rapprocher.
- Libellés et sections du détail : `lib/demandes-affichage.ts` ; une colonne
  ajoutée plus tard en base apparaît dans « Autres informations ».

### Envois automatiques : paramètres et historique (28/09/2026)

Migration **demandée par Fred** le 28/09/2026 :
`supabase/migrations/20260928120000_site_destinataires_envois_mails.sql`
(première migration du dépôt, idempotente), **exécutée par Fred le 28/09/2026**
(vérifié : 9 adresses en place, `anon` refusé sur les deux tables). Si la table
devenait illisible, les envois repartiraient vers `DESTINATAIRES_DEFAUT`
(`lib/envois.ts`).

| Objet | Rôle | Accès |
|---|---|---|
| `site_destinataires` | Adresses internes par envoi : `envoi` (`affiliation`, `sepa`, `changement`, `c1`, `c32`, `parcours_onem`, `modification` depuis le 07/10/2026), `email` (minuscules, unique par envoi), `actif` ; pré-remplie avec les adresses du code au 28/09/2026 | SUPER_ADMIN (app `parametres`, lecture / écriture) ; lue par les routes d'envoi en service_role |
| `site_envois_mails` | Journal : une ligne par demande et par destinataire (`demande_type`, `demande_id`, `envoi` ou `copie_personnelle`, `destinataire`, `sujet`, `statut` `envoye` / `echec`, `resend_id`, `erreur`) | SUPER_ADMIN uniquement (lecture) ; écriture **uniquement** en service_role (aucune politique d'écriture) |

- Routes d'envoi (`/api/send-*`) : `destinatairesInternes()` puis
  `envoyerEtJournaliser()` (`lib/envois-serveur.ts`). Le **demandeur reçoit
  toujours sa copie** ; seules les adresses internes se règlent. Toutes les
  adresses internes désactivées = seul le demandeur reçoit (avertissement à
  l'écran). Le journal ne fait jamais échouer un envoi ; une référence de
  demande n'est journalisée que si la demande existe.
- `sendIsolatedEmail()` renvoie aussi `envois` (résultat par destinataire).
- Rattachement mail → demande : les formulaires choisissent l'`id` de la ligne
  dans le navigateur (`insererDemande()`, `lib/insertion-demande.ts`, la clé
  publique ne peut pas relire la ligne) et le passent à l'envoi (`demandeId`,
  ou `demande` sur chaque document de `LivraisonFormulaires`, parcours compris).
  Si la base refuse l'`id` fourni (erreur 42501), la demande est enregistrée
  sans lui (pas d'historique, mais le formulaire marche).
- L'historique ne couvre que les demandes reçues après la mise en ligne.
- Les adresses citées **dans le texte** des mails (`ADMIN_EMAIL` des routes)
  restent dans le code : ce sont des contacts, pas des destinataires.
