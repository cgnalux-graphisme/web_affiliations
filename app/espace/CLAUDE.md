# Espace CG (back-office) : contexte

> Ramification de [CLAUDE.md](../../CLAUDE.md) (à la racine du projet). Claude Code charge ce fichier tout seul
> quand il travaille dans `app/espace/`. Contenu déplacé tel quel le 12/10/2026.

### Espace CG (back-office organisé en apps, 08/10/2026)

L'ancien « espace admin » (`/suivi-actions`, réservé aux SUPER_ADMIN) est devenu l'**Espace CG** (`/espace`) :
un espace organisé en **apps**, comme un smartphone. Chaque personne ne voit que les apps auxquelles elle a
droit. Maquette validée par Fred : `espace-cg.html` (supprimée du dépôt le 12/10/2026, fin du lot 3). Rail latéral charbon
(exception voulue à la règle des fonds sombres, comme le pied de page), plan de travail gris très clair,
**une couleur par app** lue dans `site_apps.couleur` (exception à la règle vert / bleu, voulue par Fred :
#0072B2 Scan News, #009E73 Démarches), **toujours doublée d'une icône et d'un nom**. Styles :
`app/espace/espace.css` (classes `ecg-…`). Les écrans existants ont été repris dans ce style (voir « Style
des écrans du back-office »).

**Finition (lot 3, 12/10/2026)** :
- **mouvement** (jamais en `prefers-reduced-motion`, règle globale `.ecg *`) : tuiles du tableau de bord en
  cascade, soulevées au survol **et au focus clavier**, icône qui pivote ; sections du menu qui glissent en
  place à chaque changement d'app ; écrans qui entrent en fondu ; panneau « Gérer » qui coulisse à l'ouverture
  **et à la fermeture** (`ecg-sortie`, 220 ms, puis démontage ; `pied` / `children` de `PanneauLateral` peuvent
  être une fonction qui reçoit `fermer`) avec les lignes d'apps en cascade ;
- **ouverture d'une app** : API View Transitions (`app/espace/_noyau/Transition.tsx` : `FournisseurTransition`
  dans le cadre, `LienTransition` sur les tuiles, les apps du rail, « Toutes mes apps » et la marque). Le rail
  et la barre du haut restent en place (`view-transition-name`), le contenu glisse en fondu (≈ 300 ms). Sans
  l'API, en mouvement réduit ou avec Ctrl / Cmd / clic du milieu : navigation normale ; délai maximum 1,2 s ;
- **échelle des plans** (z-index) documentée en tête de `espace.css` ;
- **contrastes** vérifiés AA : textes doux #56646F (5,5:1 sur le fond), exemples de champ #66747F (4,8:1),
  boutons principaux en couleur d'app foncée (6:1 à 8:1 avec le blanc), statuts (≥ 4,8:1) ;
- **daltonisme** : aucune information portée par la seule couleur (icône + texte partout) ;
- **mobile** : rail en tiroir (bouton « Menu », Échap, focus piégé), tuiles sur 2 colonnes, tableaux qui
  défilent horizontalement dans leur cadre ;
- **clavier** : lien « Aller au contenu », focus visible partout, Échap ferme la fenêtre la plus récente,
  focus piégé dans les panneaux puis rendu ;
- **passe web-design-guidelines** : textes d'exemple terminés par « … », plus de `transition-all`.

**Droits : rien n'est codé en dur.** Tables créées par Fred le 08/10/2026 (**ne pas modifier le schéma**) :

| Objet | Rôle |
|---|---|
| `site_apps` | Catalogue : `code`, `nom`, `description`, `icone` (nom d'icône de `app/espace/_noyau/icones.ts`), `couleur` (#RRGGBB), `ordre`, `actif` |
| `site_app_roles` | Apps par défaut de chaque rôle (`app_code`, `role`) |
| `site_app_acces` | Exceptions par personne (`user_id`, `app_code`, `type` `ajout` / `retrait`, `note`, `accorde_par`), permanentes jusqu'à suppression |
| `site_journal_acces` | Journal des changements d'accès (`auteur_id`, `cible_id`, `action`, `details` jsonb) |
| `site_mes_apps()` | Codes des apps de la personne connectée (SUPER_ADMIN = toutes) |
| `site_a_app(p_code)` | Vrai / faux pour une app |

Au 08/10/2026 : `actions`, `scan-news`, `parametres` → SUPER_ADMIN ; `demarches` → SUPER_ADMIN et ADMIN_OP.
Au 12/10/2026 (migration `20261012120000`, à exécuter par Fred) : `entreprises` → SUPER_ADMIN, ADMIN_OP et
PERMANENT (couleur #E69F00, icône `building`) ; `delegues` (« Gestion délégués CG Link », #CC79A7, `id-card`)
activée le 13/10/2026 (migration `20261013100000`) ; depuis la migration `20261013120000` (exécutée le 13/10/2026),
ouverte aussi aux PERMANENT, limitée à leurs entreprises et sans les paramètres de connexion. `permanents`
(« Accès permanents », #A0522D, `key`, ordre 35) → PERMANENT (SUPER_ADMIN toujours). Détail :
[docs/contexte/delegues.md](../../docs/contexte/delegues.md), [docs/contexte/entreprises.md](../../docs/contexte/entreprises.md),
[docs/contexte/permanents.md](../../docs/contexte/permanents.md).
Une section de manifeste peut porter `superAdmin: true` : elle est masquée du menu des autres (la page
revérifie le rôle).

**Protection côté serveur, à trois niveaux** (`lib/espace/acces.ts`) :
1. `/espace…` exige une connexion (`proxy.ts`, puis `app/espace/layout.tsx`). L'équipe (`ROLES_EQUIPE` :
   SUPER_ADMIN, ADMIN_OP, PERMANENT, `lib/espace/roles.ts`) entre toujours ; un autre rôle (DELEGATE)
   n'entre que si la base lui donne au moins une app, sinon « Espace réservé à l'équipe ». **Ouvrir l'Espace
   aux délégués plus tard = leur donner des apps dans `site_app_roles`**, sans toucher au code.
2. Chaque app vérifie `site_a_app('<code>')` dans son `layout.tsx` (`<GardeApp>`), sinon « Vous n'avez pas
   accès à cette app ».
3. Chaque page (`exigerApp(code)`), action serveur et route API (`aApp(code)`, `aUneDesApps([...])`) revérifie
   le droit avant d'agir. `getSuperAdmin()` ne sert plus que pour ce qui reste réservé aux super admins.
La connexion (`/login`) accepte désormais tout compte CG Link ; c'est l'Espace qui décide ensuite.

**Base alignée sur les apps (12/10/2026, modifié directement en base par Fred)** : les politiques RLS des
tables `site_*` et des buckets `action-photos`, `blog-images`, `notes-sources` utilisent `site_a_app()`
(apps `actions`, `scan-news`, `demarches`) ; l'app `parametres` reste réservée à SUPER_ADMIN. Donner une app
à un rôle ou à une personne ouvre donc l'app **et** ses données (lecture et écriture depuis le navigateur).
La lecture de `web_c1`, `web_c3_2` et `web_mandats_sepa` est réservée à l'app `demarches` (l'ancienne règle
`auth_select` est neutralisée). Les données de l'app `demarches` passent toujours par le serveur
(service_role) après vérification du droit. En base, la suppression d'une demande chatbot
(`site_chatbot_demandes`) est réservée au SUPER_ADMIN ; la liste de toutes les tables restées SUPER_ADMIN est
dans [docs/contexte/base-de-donnees.md](../../docs/contexte/base-de-donnees.md). L'écran « Apps par rôle » le dit (corrigé le
12/10/2026) : seule l'app Paramètres reste réservée au SUPER_ADMIN.

**Style des écrans du back-office** (08/10/2026, demande de Fred : « uniformise et rends le tout digeste ») :
tous les écrans des apps suivent la maquette, **le site public n'est pas concerné**. Briques communes :
- styles `app/espace/espace-composants.css` (importé par `app/espace/layout.tsx`) ; composants et classes dans
  `app/espace/_partage/ui.tsx` : `EnteteEcran` (pastille d'icône à la couleur de l'app, titre, description,
  actions à droite), `Panneau` (blanc, en-tête, pied), `Alerte` (succès / erreur / info / attention, toujours
  icône + texte), `Vide` (état vide), `Statut` (pastille icône + texte), constantes `BTN`, `BTN_PRINCIPAL`,
  `CHAMP`… et `Interrupteur` (`_partage/Interrupteur.tsx`, interrupteur de la maquette) ;
- un écran = `<div className="ecg-ecran">` (ou `ecg-ecran ecg-ecran-etroit` pour un formulaire, 920 px) avec
  `EnteteEcran`, puis des panneaux sur le fond gris. Plus de grands titres en majuscules sur filet de 6 px dans
  l'Espace ;
- **bouton principal = couleur de l'app foncée** (`--app-fonce`, texte blanc lisible) ; secondaire blanc bordé ;
  `ecg-btn-danger` / `-fantome-danger` pour supprimer ; onglets et filtres = `ecg-onglet` (pilule, charbon quand
  actif) ; tableaux = `ecg-tableau` dans `ecg-tableau-cadre` (défilement horizontal) ; listes = `ecg-lignes` ;
  champs = `ecg-champ` (+ `ecg-champ-erreur`), groupes préfixés `ecg-champ-groupe`, éditeur `ecg-cadre-editeur` ;
  choix en cartes `ecg-choix` ; dépôt de fichier `ecg-depot` ;
- couleurs de statut ponctuelles permises **dans l'Espace seulement** (vert « ok », orange « attente », bleu
  « info », bordeaux « erreur »), toujours doublées d'une icône et d'un texte ;
- piège : Tailwind charge son reset et ses utilitaires **avant** ces styles. Les valeurs par défaut qu'un
  écran peut vouloir changer (largeur et marges des champs, `display` des alertes, alignement du pied de
  panneau…) sont donc déclarées sous `:where()` / `:is(input…):where()` pour qu'une classe utilitaire posée sur
  l'élément (`w-auto`, `mt-0`, `pl-9`, `block`…) l'emporte toujours.

**Comptes & accès (lot 2, 08/10/2026)** — `app/espace/parametres/comptes/` (écran, `actions.ts`),
`lib/espace/gestion-acces.ts` (règles pures, testées), `lib/espace/equipe-serveur.ts` (lecture service_role) :
- **interrupteur d'app** : app du rôle éteinte = ligne `retrait` dans `site_app_acces` ; app hors rôle allumée =
  ligne `ajout` ; remettre dans l'état du rôle supprime l'exception (`bascule()`). Un SUPER_ADMIN a toujours tout
  (aucune exception). Un changement de rôle supprime les exceptions devenues inutiles ;
- **rôle** : SUPER_ADMIN uniquement, avec confirmation (« partagé avec CG Link ») ; écrit `profiles.role` avec la
  **session du super admin** (trigger `site_protect_profiles_role`) et met à jour `user_metadata.role` ;
- **invitation** : `auth.admin.inviteUserByEmail` (service_role) avec les métadonnées de CG Link (`name`, `role`,
  `invited`, `must_change_password` / `mustChangePassword`), puis ligne `profiles` avec **uniquement** `id`,
  `email`, `name`, `role` (choix de Fred du 08/10/2026 ; `company_id` reste vide comme pour toute l'équipe ;
  `profiles` n'exige que `id`, `email`, `role` ; aucun trigger ne crée le profil). Profil impossible = compte
  supprimé (pas de compte sans profil). Rôle SUPER_ADMIN invitable par un super admin seulement ;
- **lien de réinitialisation** : `auth.resetPasswordForEmail` ; **suspension** : `ban_duration` 876000 h (plus
  de connexion ici ni dans CG Link ; une session ouverte expire au plus tard avec son jeton, ~1 h) ;
  **Réactiver** : `ban_duration: "none"` (choix de Fred) ;
- **page `/login/nouveau-mot-de-passe`** (choix de Fred : le mot de passe se choisit dans l'Espace CG) : accepte
  les 3 formes de lien Supabase (`#access_token`, `?code`, `?token_hash`), retire les jetons de l'adresse, puis
  `updateUser({ password, data: { must_change_password: false, mustChangePassword: false } })`. **À faire par
  Fred** : ajouter `<adresse du site>/login/nouveau-mot-de-passe` (local, preview et production) dans Supabase ›
  Authentication › URL Configuration › Redirect URLs, sinon le lien mène à l'« URL du site » (CG Link). Les
  e-mails gardent les modèles du projet (ceux de CG Link). Adresse du lien : `SITE_URL`, sinon l'adresse de la
  requête ;
- **garde-fous** (code, revérifiés à chaque action) : impossible de retirer son propre rôle SUPER_ADMIN, de se
  suspendre soi-même, de retirer le rôle du dernier SUPER_ADMIN ou de suspendre le dernier SUPER_ADMIN actif ; un
  non-super-admin (s'il reçoit l'app Paramètres) ne gère pas les comptes super admin et n'invite pas de super admin ;
- **journal** : chaque modification écrit une ligne (`auteur_id`, `cible_id`, `action`, `details`) ; actions
  `app_ajout`, `app_retrait`, `app_exception_supprimee`, `role`, `invitation`, `reinitialisation`, `suspension`,
  `reactivation`, `role_app_ajout`, `role_app_retrait` ; phrases par `phraseJournal()`. Les écritures d'accès et
  du journal passent par la clé service_role, après vérification du droit sur l'app « parametres ».
- Fenêtres : `app/espace/_partage/Fenetres.tsx` (`PanneauLateral`, `Confirmation`) : rendues dans le cadre `.ecg`,
  Échap ferme la plus récente, focus piégé puis rendu, défilement bloqué.

**Organisation du code, une app = un dossier** `app/espace/<code>/` :
- `manifeste.ts` : sections du menu (`chemin`, `libelle`, `icone`, `aussi` = autres adresses où la section
  reste active) et `badge()` facultatif (texte de la tuile, calculé côté serveur) ;
- `layout.tsx` : `<GardeApp code="<code>">` ; `page.tsx` : renvoie vers la première section ;
- un dossier par section (`/espace/<code>/<chemin>`) et ses propres composants.
Socle commun : `app/espace/_noyau/` (registre `registre.ts`, cadre `CadreEspace.tsx`, icônes, garde, écrans
« pas accès » et « réservé »), `app/espace/_partage/` (composants partagés par plusieurs apps).

**Ajouter une app** :
1. créer `app/espace/<code>/` avec `manifeste.ts`, `layout.tsx` (garde), `page.tsx` et ses sections ;
2. ajouter son manifeste à `MANIFESTES` dans `app/espace/_noyau/registre.ts` ;
3. insérer sa ligne dans `site_apps` (même `code`, nom, description, icône, couleur, ordre) et ses rôles par
   défaut dans `site_app_roles` (Fred, dans Supabase ; ou l'écran de gestion des rôles, lot 2) ;
4. une icône absente de `icones.ts` : l'y ajouter (lucide-react) ;
5. ses pages appellent `exigerApp("<code>")`, ses actions et routes API `aApp("<code>")` ;
6. si ses écrans lisent ou écrivent des tables `site_*` depuis le navigateur, leurs politiques RLS doivent
   utiliser `site_a_app('<code>')`, comme les autres (à faire par Fred dans Supabase, pas de migration sans
   sa demande).
Une app présente en base mais sans dossier n'apparaît pas ; les apps « Bientôt » sont dans `PROCHAINES_APPS`.

**Anciennes adresses** : `/suivi-actions/…` → redirections permanentes vers `/espace/…` dans `next.config.ts`
(`ANCIEN_ADMIN`, paramètres d'adresse conservés ; toute adresse inconnue → `/espace`). Liens internes,
`revalidatePath`, lien de l'e-mail du chatbot et pages publiques (bandeau, assistant, cookies masqués sur
`/espace`) mis à jour. La navigation et le pied de page du site public ne s'affichent pas dans l'Espace
(`NavigationSite`, `HorsEspace`).


### Adresses de l'Espace CG et routes API réservées

| Route | Accès | Rôle |
|---|---|---|
| `/espace` | connecté (équipe) | **Espace CG** (08/10/2026) : « Bonjour <prénom> », la date, une tuile par app de la personne (badge : « N à trier », « N nouvelles »…), tuile « Bientôt » (Mémoire CG). Aucune app = écran « demandez un accès ». L'ancien tableau de bord `/suivi-actions` est supprimé (redirigé) |
| `/espace/compte` | connecté (équipe) | Mon compte : profil en lecture seule, changement du mot de passe (le même que CG Link), déconnexion |
| `/espace/sans-acces` | connecté | « Vous n'avez pas accès à cette app » (une page d'app y renvoie quand le droit manque) |
| `/espace/<code>` | app `<code>` | Ouvre la première section de l'app |
| `/espace/parametres/comptes` | app `parametres` | **Comptes & accès** (lot 2, 08/10/2026) : l'équipe (SUPER_ADMIN, ADMIN_OP, PERMANENT ; pas les délégués), rôle, apps (exceptions en pointillé « exception »), dernière connexion (API admin Auth), filtres par rôle, recherche ; panneau « Gérer » ; « Inviter un collègue » |
| `/espace/parametres/roles` | app `parametres` (modifier : SUPER_ADMIN) | **Apps par rôle** : apps par défaut d'ADMIN_OP, PERMANENT, DELEGATE (`site_app_roles`) ; SUPER_ADMIN = toujours tout |
| `/espace/parametres/journal` | app `parametres` | **Journal des accès** (`site_journal_acces`) en phrases, 50 par page |
| `/login/nouveau-mot-de-passe` | public (lien de l'e-mail) | Choisir son mot de passe après une invitation ou une réinitialisation, puis entrée dans `/espace` |
| `/espace/actions/liste` | app `actions` | Liste de toutes les actions (publiées ou non) |
| `/espace/actions/nouvelle` | app `actions` | Encoder une action |
| `/espace/actions/<id>/modifier` | app `actions` | Modifier / supprimer une action |
| `/espace/actions/rapport` | app `actions` | Rapport de congrès PDF : composer (période, entreprise, secteur, permanent, actions et / ou fiches de suivi), cocher les éléments, générer |
| `/espace/permanents/accueil` · `/fiches` · `/fiches/nouvelle` · `/fiches/<id>` · `/fiches/<id>/modifier` | app `permanents` | **Accès permanents** (13/10/2026) : tableau de bord, fiches de suivi (lecture : tous ; modification : auteur ou SUPER_ADMIN), éditeur en 5 étapes, PDF. Détail : [docs/contexte/permanents.md](../../docs/contexte/permanents.md) |
| `/api/permanents/redaction` | app `permanents` (auteur ou SUPER_ADMIN) | Texte d'une fiche de suivi rédigé par Claude Sonnet 5 (POST `{ ficheId }`), rien n'est enregistré |
| `/espace/demarches/demandes` | app `demarches` | Back-office des demandes : historique des formulaires par type (onglets), recherche, dates, tri, pagination |
| `/espace/demarches/demandes/<type>/<id>` | app `demarches` | Une demande : toutes ses informations, signature, « Régénérer le PDF » + « Télécharger » |
| `/espace/scan-news/articles` | app `scan-news` | Liste des articles (brouillons et publiés) : modifier, publier / dépublier, supprimer |
| `/espace/scan-news/articles/nouveau` | app `scan-news` | Écrire un article ; `?veille=<id>` pré-remplit depuis un article du fil, `?analyse=<id>&sujet=<n>` depuis un sujet du Check IA (toutes ses sources) ; `&ia=1` met le focus sur le panneau de rédaction assistée |
| `/espace/scan-news/articles/<id>/modifier` · `/apercu` | app `scan-news` | Modifier / supprimer ; aperçu tel que sur le site (brouillon compris) |
| `/espace/scan-news/explications` | app `scan-news` | Liste des explications (« On vous explique ») : modifier, publier / dépublier, réseaux, supprimer |
| `/espace/scan-news/explications/nouvelle` | app `scan-news` | Importer une note FGTB (.docx / .pdf) à vulgariser → formulaire d'article pré-rempli (categorie `explication`) |
| `/espace/scan-news/articles/<id>/reseaux` | app `scan-news` | Déclinaison d'un article publié en posts Facebook, Instagram, TikTok, YouTube : générer, modifier, enregistrer, copier |
| `/espace/scan-news/fil` | app `scan-news` | **Scan News › Le fil** : barre d'état (fil rafraîchi à…, Check IA de…) + « Rafraîchir » et « Check IA », puis **deux onglets** : `?vue=check` = Check IA en « conférence de rédaction » (défaut s'il existe un classement), `?vue=fil` = les articles ramassés (filtres pertinence / statut / source, ignorer, rédiger, brouillon IA) |
| `/espace/scan-news/sources` | app `scan-news` | Flux RSS de la veille : ajouter, modifier, activer / désactiver, supprimer |
| `/espace/scan-news/themes` | app `scan-news` | Mots-clés de pertinence de la veille : ajouter, activer / désactiver, supprimer |
| `/espace/actions/mobilisations` · `/nouvelle` · `/<id>/modifier` · `/<id>/apercu` | app `actions` | Mobilisations (manifs, grèves à venir) : créer, modifier, supprimer, interrupteur « mise en avant » (une seule à la fois), aperçu de la page campagne, « pourquoi » rédigé par l'IA |
| `/espace/demarches/chatbot` | app `demarches` | **Demandes chatbot** : filtre par statut (`?statut=nouveau` / `en_cours` / `traite`), changement de statut, suppression, registre national masqué (••••) et lu seulement au clic « Afficher » (server actions, service_role) ; `?id=` met une demande en évidence (lien de l'e-mail) |
| `/espace/parametres/site` | app `parametres` | Paramètres du site : interrupteur « Afficher le bloc mobilisation sur l'accueil » (`site_parametres`, clé `accueil_mobilisation`, `on` / `off`) et interrupteur « Afficher l'Assistant CG » (clé `chatbot_actif`) |
| `/api/mobilisations/analyse` | app `actions` | Textes collés (articles, tracts, communiqués) → tous les champs d'une nouvelle mobilisation proposés par Claude Sonnet 5 (POST `{ textes }`), rien n'est enregistré |
| `/api/mobilisations/pourquoi` | app `actions` | « Pourquoi on se mobilise » rédigé par Claude Sonnet 5 depuis les points de Fred (POST `{ points, titre?, date?, lieu?, revendications? }`), rien n'est enregistré |
| `/espace/entreprises/liste` | app `entreprises` | **Entreprises** (12/10/2026) : entreprises CG Link + fiches hors CG Link, recherche, filtres (BCE non renseignée, hors CG Link, écarts) |
| `/espace/entreprises/nouvelle` | app `entreprises` | Fiche d'une entreprise absente de CG Link |
| `/espace/entreprises/<cle>` · `/bce` | app `entreprises` | Fiche (`<cle>` = id de fiche ou `c-<companies.id>`) : identité, siège, personne de référence, bloc adresse, sites (UTE), unités, ONSS, affiliés ; import BCE avec comparaison |
| `/espace/entreprises/bce` | app `entreprises` | Import BCE de toutes les fiches qui ont un n° d'entreprise |
| `/espace/delegues/liste` · `/nouveau` · `/<id>` | app `delegues` (SUPER_ADMIN : tous ; permanent : ses entreprises, sans compte CG Link) | **Gestion délégués CG Link** (13/10/2026) : liste filtrable, création, carte d'identité (unité de rattachement, mandats, compte CG Link en lecture seule, historique) |
| `/espace/delegues/a-verifier` · `/import` · `/journal` | app `delegues` (à vérifier : périmètre ; import et journal : SUPER_ADMIN par le rôle) | Éléments marqués par l'import ; import depuis CG Link (relançable) ; journal des opérations |
| `/espace/parametres/envois` | app `parametres` | Paramètres : adresses internes qui reçoivent chaque envoi automatique des formulaires (ajouter, activer / désactiver, supprimer) |
| `/api/admin/demandes` | app `demarches` | Liste d'un type de demande (GET `?type=&q=&du=&au=&tri=&page=`) — clé service_role |
| `/api/admin/demandes/<type>/<id>` · `/pdf` · `/liees` · `/envois` | app `demarches` | Détail complet d'une demande ; PDF C1 / C3.2 rempli côté serveur ; demandes de la même personne ; historique des e-mails |
| `/api/image-distante` | app `actions` ou `scan-news` | Télécharge une image glissée depuis une autre page web (POST `{ url }`) |
| `/api/redaction/lisibilite` | app `scan-news` | L'IA peut-elle lire l'article ? Vérification gratuite du `robots.txt` du média (GET `?veilleId=`) ; renvoie aussi l'adresse réelle (alerte Google résolue) |
| `/api/redaction/brouillon` | app `scan-news` | Brouillon d'article proposé par Claude Sonnet 5, une ou plusieurs sources (POST `{ veilleIds, lire?, textes?, notes?, consignes? }`) |
| `/api/redaction/note` | app `scan-news` | Note FGTB (multipart, champ `fichier`) → texte extrait, vulgarisé par Claude Sonnet 5, fichier archivé dans `notes-sources` |
| `/api/reseaux/declinaison` | app `scan-news` | Posts réseaux proposés par Claude Sonnet 5 (POST `{ articleId, reseau? }` ; sans `reseau` = les 4) |
| `/api/veille/ramasser` | CRON_SECRET ou app `scan-news` | Ramassage des flux + purge des articles de plus de 3 jours (POST = bouton « Rafraîchir maintenant ») |
| `/api/logo-media` | app `scan-news` | Logo d'un média (GET `?domaine=`) : icône récupérée sur le site du média lui-même (`lib/logo-media.ts`), 404 sans logo |
| `/api/veille/analyse` | cron ou app `scan-news` | **Check IA** : GET = Vercel Cron (6 h et 7 h UTC : ramassage + purge, puis analyse seulement s'il est 8 h à Bruxelles) ; POST = bouton (fil rafraîchi depuis moins de 2 h) |

**Nom « Scan News »** (ex-« veille ») partout à l'écran : **Scan News** = la
section (l'app) ; **Le fil** = son écran de consultation des articles ramassés. Le
nom de l'app est rappelé par le rail et le fil d'Ariane de l'Espace CG (l'ancien repère
`RepereSection.tsx` a été retiré le 08/10/2026). Le code, les tables (`site_veille`…) et les adresses
(`/espace/scan-news/fil`, `/api/veille/ramasser`) gardent « veille ».
