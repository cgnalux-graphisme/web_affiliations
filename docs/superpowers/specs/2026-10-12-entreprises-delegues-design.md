# Apps « Entreprises » et « Gestion délégués CG Link » : conception

> Validée par Fred section par section le 12/10/2026 (brainstorming dans Claude Code).
> Branche : `entreprises` (créée depuis `suivi-actions`).

---

## 1. Pourquoi

Fred veut une **base de données des entreprises** dans l'Espace CG, socle de plusieurs apps à venir (en
premier : les **publipostages**, avec un bloc adresse par entreprise ou par site). Pour chaque entreprise :
dénomination officielle BCE, unités d'établissement et leurs adresses, sites d'exploitation (UTE), numéros
ONSS, personne de référence, nombre d'affiliés, délégués et leurs mandats.

À moyen terme, **l'Espace CG remplace CG Link pour la gestion des délégués** (Fred est le seul à les gérer).
D'où une seconde app, réservée aux super admins, qui tient les délégués et pilote leurs comptes CG Link.

**Réussi quand :**
- chaque entreprise de CG Link a sa fiche, complétée en un clic depuis la BCE ;
- chaque délégué a une carte d'identité (e-mail, téléphone, mandats structurés et datés) ;
- Fred invite, bloque, met à jour un délégué CG Link depuis l'Espace CG, sans ouvrir CG Link ;
- le bloc adresse d'un courrier se calcule sans ressaisie (« Service Ressources Humaines » par défaut).

## 2. Décisions prises (12/10/2026)

| # | Question | Décision |
|---|---|---|
| 1 | Qui détient la vérité ? | **Complément lié à CG Link** : chaque fiche pointe vers `companies.id` ; nom et affiliés lus en direct dans CG Link ; nouvelles données dans des tables `site_` ; CG Link n'est jamais modifié par l'app Entreprises. |
| 1b | Délégués | **N'ont aucun accès** (ni lecture ni écriture) aux deux apps. |
| 2 | BCE | Bouton **« Importer depuis la BCE »** (lecture de kbopub côté serveur), validé par l'utilisateur avant enregistrement. Saisie manuelle toujours possible. |
| 3 | Site d'exploitation | **= UTE** (élections sociales). Chaque unité d'établissement appartient à un site ; un site regroupe une ou plusieurs unités ; mandats et ONSS se rattachent à un site. |
| 4 | Mandat | **Organe + qualité + fonction facultative + site + dates de début et fin facultatives.** Cumul possible. |
| 5 | Affiliés | Nombre **par entreprise** (CG Link ne rattache pas les affiliés à un site). |
| 6 | Personne de référence | Une pour l'entreprise, **liée au siège social** ; un site peut avoir la sienne et sa propre adresse postale. Nom vide → « Service Ressources Humaines ». |
| 7 | Accès « Entreprises » | SUPER_ADMIN, ADMIN_OP, PERMANENT, lecture et écriture. |
| 8 | Liste des entreprises | Toutes celles de CG Link, **plus** des fiches créées à la main (hors CG Link), reliables plus tard. |
| 9 | Délégués | Nouvelle app **« Gestion délégués CG Link », SUPER_ADMIN uniquement** : import CG Link, cartes, mandats, comptes CG Link, écarts. L'app Entreprises affiche les délégués **en lecture seule**. |
| 10 | Mandats importés | Rangés **directement à la bonne place** ; début = **13/05/2024** (premier jour des élections sociales 2024, 13/05 au 26/05/2024). |
| 11 | Écriture vers CG Link | **Mixte** : invitation et annulation par les fonctions existantes de CG Link (`invite-user`, `cancel-invite`) ; le reste écrit côté serveur dans `companies.delegates` et `profiles`, au format exact de CG Link. |
| 12 | ONSS | **Repris de CG Link à l'import** (pour pouvoir les rattacher à un site), écarts signalés ensuite. |
| 13 | Migration | **Fred autorise la création des tables** (12/10/2026). |

## 3. Constats sur l'existant (relevés le 12/10/2026, lecture seule)

- `companies` (CG Link, 94 lignes) : `id`, `name`, `sector`, `onss`, `onss2..4` + `onss2_label..onss4_label`,
  `permanent_name`, `permanent_email`, `permanent_whatsapp`, `comment`, `admin_message`, `delegates`
  (jsonb), `strike_status` (jsonb), `created_at`, `updated_at` (trigger).
- `companies.delegates` : tableau d'objets `{ id, name, email, phone, isActive, invitedAt,
  mustChangePassword, profileCompleted, acceptedRgpd, mandateDs, mandateCppt, mandateCe, mandateOther }`.
  176 délégués. `id` = identifiant du compte Auth = `profiles.id`.
- Mandats CG Link :
  - `mandateDs` : Effectif 94, Suppléant 16, Pas de mandat 17 ;
  - `mandateCppt` : Effectif 84, Suppléant 16, Pas de mandat 27 ;
  - `mandateCe` : Effectif 82, Suppléant 16, Pas de mandat 29 ;
  - 49 délégués sans aucun de ces champs ;
  - `mandateOther` : 20 textes libres (CE européen, comité exécutif, vérificateur aux comptes, bureau des
    femmes… et quelques erreurs de saisie : numéro de téléphone, prénom, « O »).
- `workers` (CG Link) : `company_id`, `status` (`Actif` / `Parti` / `Autre Syndicat`), `contract_type`
  (`Ouvrier(e)`, `Employé(e)`, `Intérimaire`, `Apprenti(e)`, `Pensionné(e)`, `Cadre`).
  **Lisible par la clé publique (10 684 lignes)** : signalé à Fred, correctif préparé pour Cursor (hors de
  cette spec, préalable recommandé au lot B3).
- Invitation CG Link (`invite-user`, Edge Function) : session d'un SUPER_ADMIN / ADMIN_OP / PERMANENT,
  corps `{ email, name, role: "DELEGATE", companyId, redirectTo }`. Crée le compte (`generateLink` type
  `invite`), envoie l'e-mail CG Link (code à 8 chiffres) par Resend, écrit `profiles` (`company_id`) et
  ajoute ou met à jour l'entrée dans `companies.delegates` (`phone: ''`, `isActive: true`,
  `invitedAt`). Renvoie `{ success, userId }`.
- Annulation (`cancel-invite`) : supprime le compte Auth, le profil et l'entrée `companies.delegates`.
- Blocage dans CG Link : `isActive: false` dans l'entrée `companies.delegates`.
- Le délégué complète lui-même ses mandats dans CG Link à la première connexion : CG Link reste une source
  de modifications pendant la transition (→ écarts).
- BCE (kbopub, public, joignable depuis le poste de dev) :
  - page entité :
    `https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?nummer=<10 chiffres>&actionLu=Zoek&lang=fr`
    (dénomination, adresse du siège, lien vers les unités) ;
  - liste des unités :
    `vestiginglijst.html?ondernemingsnummer=<numéro sans 0 initial>&lang=fr` (statut, n° d'unité, date de
    début, dénomination, adresse, « Depuis le … ») ;
  - dates en toutes lettres (« 1 janvier 2022 ») ; la localité est parfois collée devant la rue
    (« Libramont,Rue Fonteny Maroy 13 ») ; liste paginée pour les grandes entreprises.

## 4. Découpage

| Lot | Contenu | App |
|---|---|---|
| 0 | Migration : tables, RLS, lignes `site_apps` / `site_app_roles` | — |
| A | Fiches entreprises, BCE, unités, sites, ONSS, personne de référence, affiliés | `entreprises` |
| B1 | Import des délégués et des mandats depuis CG Link | `delegues` |
| B2 | Liste, carte d'identité, mandats, « À vérifier » | `delegues` |
| B3 | Comptes CG Link (inviter, renvoyer, annuler, bloquer, débloquer), écritures vers CG Link, écarts | `delegues` |
| D | Documentation (contexte, carte de CLAUDE.md) | — |

Préalable recommandé avant B3 : correctif RLS `workers` / `profiles.company_id` côté CG Link (prompt Cursor
remis à Fred le 12/10/2026).

## 5. Données

### 5.1 Tables (préfixe `site_`, toutes avec RLS)

Types : `uuid` (`gen_random_uuid()`), `text`, `date`, `timestamptz` (`now()`). Toutes ont `created_at`,
`updated_at` (trigger).

**`site_entreprises`**

| Colonne | Type | Rôle |
|---|---|---|
| `id` | uuid PK | |
| `company_id` | uuid **unique**, null, FK → `companies.id` `ON DELETE SET NULL` | Lien CG Link (null = hors CG Link) |
| `nom` | text null | Nom usuel ; **obligatoire si `company_id` est null** (contrainte `check`) ; sinon le nom vient de `companies.name` |
| `numero_bce` | text null **unique** | 10 chiffres sans points (`0850076920`) |
| `denomination_bce` | text null | Dénomination officielle |
| `siege_rue`, `siege_numero`, `siege_boite`, `siege_code_postal`, `siege_localite` | text null | Adresse du siège social |
| `ref_nom`, `ref_fonction`, `ref_email`, `ref_telephone` | text null | Personne de référence (liée au siège) |
| `bce_importe_le` | timestamptz null | Dernier import BCE validé |
| `notes` | text null | |

**`site_entreprise_sites`** (UTE)

| Colonne | Type | Rôle |
|---|---|---|
| `id` | uuid PK | |
| `entreprise_id` | uuid FK → `site_entreprises` `ON DELETE CASCADE` | |
| `nom` | text not null | « Site principal » à la création |
| `principal` | boolean default false | Un seul par entreprise (index unique partiel) ; reçoit les nouvelles unités |
| `unite_postale_id` | uuid null FK → `site_entreprise_unites` `ON DELETE SET NULL` | Adresse postale du site ; null = siège |
| `ref_nom`, `ref_fonction`, `ref_email`, `ref_telephone` | text null | Personne de référence propre (null = celle de l'entreprise) |
| `ordre` | int default 0 | |

**`site_entreprise_unites`** (unités d'établissement)

| Colonne | Type | Rôle |
|---|---|---|
| `id` | uuid PK | |
| `entreprise_id` | uuid FK `ON DELETE CASCADE` | |
| `site_id` | uuid null FK → `site_entreprise_sites` `ON DELETE SET NULL` | |
| `numero_ue` | text null **unique** | 10 chiffres sans points ; null = unité encodée à la main sans numéro |
| `denomination` | text null | |
| `rue`, `numero`, `boite`, `code_postal`, `localite` | text null | |
| `statut` | text `check in ('actif','arrete')` default `actif` | |
| `date_debut` | date null | |
| `origine` | text `check in ('bce','manuel')` | |

**`site_entreprise_onss`**

| Colonne | Type | Rôle |
|---|---|---|
| `id` | uuid PK | |
| `entreprise_id` | uuid FK `ON DELETE CASCADE` | |
| `site_id` | uuid null FK `ON DELETE SET NULL` | |
| `numero` | text not null | Chiffres seuls ; unique par entreprise |
| `libelle` | text null | |

**`site_delegues`**

| Colonne | Type | Rôle |
|---|---|---|
| `id` | uuid PK | |
| `entreprise_id` | uuid FK → `site_entreprises` `ON DELETE RESTRICT` | |
| `cglink_user_id` | uuid null **unique** | `profiles.id` / `companies.delegates[].id` |
| `prenom`, `nom` | text | `nom` obligatoire |
| `email`, `telephone` | text null | |
| `notes` | text null | |
| `a_verifier` | text null | Raison (« découpage prénom / nom ») ; null = rien à vérifier |

**`site_delegue_mandats`**

| Colonne | Type | Rôle |
|---|---|---|
| `id` | uuid PK | |
| `delegue_id` | uuid FK `ON DELETE CASCADE` | |
| `site_id` | uuid null FK `ON DELETE SET NULL` | |
| `organe` | text `check in ('ds','ce','cppt','cee','instances_cg','autre')` | |
| `libelle` | text null | Précision (obligatoire pour `autre` et `instances_cg`) |
| `qualite` | text null `check in ('effectif','suppleant')` | Obligatoire pour `ds`, `ce`, `cppt` |
| `fonction` | text null | Président DS, secrétaire… |
| `debut`, `fin` | date null | `fin` null = en cours |
| `a_verifier` | text null | Raison (« repris de "Autre" dans CG Link : "…" ») |

**`site_ecarts_ignores`**

`id`, `cible` (`delegue` / `entreprise`), `cible_id` (uuid), `champ` (text), `valeur` (text, la valeur
CG Link ignorée), `ignore_par` (uuid), `created_at`. Unique (`cible`, `cible_id`, `champ`, `valeur`).

**`site_journal_delegues`**

`id`, `auteur_id`, `delegue_id` (null si supprimé), `entreprise_id`, `action` (texte : `import`,
`creation`, `modification`, `mandat_ajout`, `mandat_modification`, `mandat_fin`, `mandat_suppression`,
`invitation`, `invitation_renvoyee`, `invitation_annulee`, `blocage`, `deblocage`,
`changement_entreprise`, `ecart_repris`, `ecart_ignore`, `suppression`), `details` (jsonb), `created_at`.

### 5.2 Règles d'accès (RLS)

- `site_entreprises`, `site_entreprise_sites`, `site_entreprise_unites`, `site_entreprise_onss` :
  SELECT / INSERT / UPDATE / DELETE si `site_a_app('entreprises')`. Les écritures passent par des actions
  serveur avec **la session de l'utilisateur** (la RLS s'applique).
- `site_delegues`, `site_delegue_mandats` : SELECT si `site_a_app('entreprises') or site_a_app('delegues')` ;
  **aucune politique d'écriture** : écritures uniquement côté serveur en service_role, après vérification
  du rôle SUPER_ADMIN.
- `site_ecarts_ignores`, `site_journal_delegues` : SELECT si `site_a_app('delegues')` ; écriture en
  service_role uniquement.
- Aucune politique pour `anon`, et `revoke all … from anon` sur les huit tables.
- Lecture de `companies` et `workers` : **côté serveur en service_role**, après vérification du droit sur
  l'app (on ne dépend pas des règles RLS de CG Link, qui vont changer).

### 5.3 Catalogue des apps

| `code` | `nom` | `icone` | `couleur` | `ordre` | Rôles par défaut (`site_app_roles`) |
|---|---|---|---|---|---|
| `entreprises` | Entreprises | `building` | `#E69F00` | 40 | ADMIN_OP, PERMANENT |
| `delegues` | Gestion délégués CG Link | `id-card` | `#CC79A7` | 50 | aucun (SUPER_ADMIN a tout) |

Couleurs de la palette Okabe-Ito déjà utilisée pour Scan News et Démarches (à valider par Fred ; bouton
principal en couleur foncée, contraste AA vérifié). Icônes `Building2` et `IdCard` de lucide-react,
ajoutées à `icones.ts`.

**`delegues` est réservée au SUPER_ADMIN par le code** (`layout.tsx`, pages, actions : rôle vérifié en plus
de l'app), comme les écritures de rôle dans « Comptes & accès ». Donner l'app à quelqu'un d'autre dans
« Comptes & accès » n'ouvre rien : l'écran « Apps par rôle » et le panneau « Gérer » l'indiquent
(« réservée aux super admins »).

## 6. Lot A : app « Entreprises »

### 6.1 Écrans

| Route | Contenu |
|---|---|
| `/espace/entreprises` | Renvoie vers `liste` |
| `/espace/entreprises/liste` | Tableau : nom (usuel ou CG Link), dénomination BCE, secteur, affiliés actifs, sites, délégués. Pastilles (icône + texte) : « BCE non renseignée », « Hors CG Link », « Écarts CG Link ». Recherche (nom, n° BCE, ONSS, localité), filtres secteur et état. « Nouvelle entreprise ». « Importer la BCE pour toutes ». |
| `/espace/entreprises/nouvelle` | Fiche hors CG Link : nom, n° BCE facultatif (→ proposition d'import immédiat) |
| `/espace/entreprises/<cle>` | Fiche. `<cle>` = `site_entreprises.id`, ou `c-<companies.id>` pour une entreprise CG Link sans fiche encore (lecture seule de CG Link, la fiche est créée à la première modification) |
| `/espace/entreprises/<cle>/bce` | Comparaison de l'import BCE et validation |
| `/espace/entreprises/bce` | Import groupé : file d'attente et comparaisons à valider |

**Fiche, panneaux :**
1. **Identité** : nom usuel, dénomination BCE, n° d'entreprise (affiché `0850.076.920`, lien vers kbopub),
   secteur (CG Link), lien CG Link ou « Relier à une entreprise CG Link » (liste des `companies` sans fiche).
2. **Siège et personne de référence** + **aperçu du bloc adresse**.
3. **Sites (UTE)** : une carte par site : unités, ONSS, adresse postale (choix d'une unité ou « siège »),
   personne de référence propre, délégués et mandats en cours (lecture seule, lien « Gérer » visible des
   seuls SUPER_ADMIN). Ajouter, renommer, supprimer un site (ses unités et ONSS retournent au site
   principal ; le site principal ne se supprime pas).
4. **Unités d'établissement** : tableau, choix du site par liste déroulante, ajout manuel ; unités
   arrêtées repliées (« 3 unités arrêtées »).
5. **ONSS** : numéro, libellé, site ; écart avec CG Link signalé (« Reprendre » / « Ignorer »).
6. **Affiliés** : actifs et détail par type de contrat (lu en direct), date et heure de lecture.

### 6.2 Création automatique de la fiche

À la première modification d'une entreprise CG Link (ou à l'import des délégués, lot B1) :
`site_entreprises` (`company_id`), site « Site principal » (`principal = true`), ONSS repris de
`companies.onss..onss4` avec leurs libellés. Idempotent (`company_id` unique).

### 6.3 Import BCE

- **Numéro** : saisie libre (`0850.076.920`, `BE 0850 076 920`, `850076920`) → 10 chiffres ; contrôle
  modulo 97 (`97 - (8 premiers chiffres mod 97)` = 2 derniers) avant tout appel.
- **Lecture** (serveur, `lib/bce.ts`, en-tête navigateur, délai 15 s) : page entité → dénomination, adresse
  du siège ; liste des unités, toutes les pages.
- **Nettoyage** (`lib/bce-analyse.ts`, pur, testé) : espaces insécables, localité collée devant la rue
  retirée quand elle égale la localité de l'adresse, séparation rue / numéro / boîte (boîte après « bte »,
  « bus », « / » si reconnaissable, sinon dans le numéro), dates en toutes lettres → ISO.
- **Comparaison** (`comparerBce()`, pur) : dénomination, siège ; unités nouvelles, modifiées (champ par
  champ), devenues arrêtées, absentes de la BCE (signalées, jamais supprimées).
- **Validation** : l'écran montre les différences, cases cochées par défaut ; « Enregistrer » applique les
  cases cochées. Une nouvelle unité va au site principal. `bce_importe_le` mis à jour.
- **Import groupé** : fiches avec n° BCE, une à la fois, 2 s entre deux appels, piloté par le navigateur
  (pas de tâche de fond) ; résultat par fiche : « à jour », « N changements à valider », « erreur ».
- **Erreurs** : BCE injoignable, délai dépassé, page méconnaissable → message, rien n'est enregistré ;
  numéro inconnu de la BCE → « Ce numéro n'existe pas à la BCE ».

### 6.4 Bloc adresse (`lib/bloc-adresse.ts`, pur, testé)

`blocAdresse(entreprise, site?)` renvoie les lignes :

```
À l'attention de <ref_nom ou « Service Ressources Humaines »>
<ref_fonction, si renseignée et ref_nom renseigné>
<dénomination BCE, sinon nom usuel, sinon nom CG Link>
<rue> <numéro>[ bte <boîte>]
<code postal> <localité>
```

Avec un site : personne de référence du site si renseignée, sinon celle de l'entreprise ; adresse de
`unite_postale_id` si renseignée, sinon le siège. Adresse incomplète → lignes absentes + signal
« adresse incomplète » (jamais de « [À COMPLÉTER] »).

### 6.5 Affiliés

`select contract_type from workers where company_id = … and status = 'Actif'` (service_role), compté par
type. Liste : un seul appel groupé pour toutes les entreprises (comptage côté serveur).

## 7. Lot B : app « Gestion délégués CG Link » (SUPER_ADMIN)

### 7.1 Import initial (B1)

Bouton « Importer les délégués de CG Link » (`/espace/delegues/import`), relançable : un délégué déjà
importé (`cglink_user_id`) n'est pas recréé, il apparaît en écart si CG Link a changé.

Pour chaque entreprise CG Link et chaque entrée de `delegates` :
1. fiche entreprise et site principal créés si besoin (6.2) ;
2. **prénom / nom** (`decouperNom()`, pur) : mots tout en majuscules (au moins 2 lettres) = nom, le reste =
   prénom (« DUPONT Jean » → Jean / DUPONT) ; sinon premier mot = prénom, le reste = nom. Toujours
   `a_verifier = 'Découpage prénom / nom à confirmer'`, sauf le cas tout en majuscules + mots en casse mixte ;
3. e-mail, téléphone (vide → null) ;
4. **mandats** (`importerMandats()`, pur), site principal, `debut = 2024-05-13` :
   - `mandateDs` / `mandateCe` / `mandateCppt` : `Effectif` → effectif, `Suppléant` → suppléant ;
     `Pas de mandat` ou vide → rien ;
   - `mandateOther` (`classerAutre()`) :
     - « europ », « cee » → organe `cee`, qualité `suppleant` si « suppl », sinon `effectif` si « effectif »,
       sinon null ; « Tresorier », « Secrétaire » → `fonction` ;
     - « comit », « exécutif » (accents et fautes tolérés : `ex[eéè]cutif`), « vérificateur »,
       « bureau des femmes », « régional » → organe `instances_cg`, `libelle` = texte d'origine ;
     - « secrétaire ce », « délégué ce » → organe `ce`, `fonction` = texte, qualité null ;
     - texte sans lettre (numéro), un ou deux mots sans mot-clé syndical (prénom, « O ») → **non importé**,
       listé dans le rapport ;
     - autre → organe `autre`, `libelle` = texte ;
     - tout mandat issu de `mandateOther` : `a_verifier = 'Repris de « Autre » dans CG Link : "<texte>"'` ;
5. journal `import`.

**Rapport** : délégués créés / déjà présents, mandats créés, éléments à vérifier, textes non importés (avec
l'entreprise), lien vers « À vérifier ».

### 7.2 Écrans (B2)

| Route | Contenu |
|---|---|
| `/espace/delegues` | Renvoie vers `liste` |
| `/espace/delegues/liste` | Tableau : nom, entreprise, mandats en cours (pastilles « DS eff. », « CPPT supp. »…), compte CG Link (actif, invité, bloqué, sans compte). Filtres : entreprise, organe, qualité, compte, « à vérifier », « écarts ». Recherche. « Nouveau délégué ». |
| `/espace/delegues/nouveau` | Prénom, nom, entreprise, e-mail, téléphone, mandats ; case « Inviter dans CG Link » |
| `/espace/delegues/<id>` | Carte d'identité |
| `/espace/delegues/a-verifier` | Délégués et mandats marqués, un par un : « Confirmer » (efface la marque) ou modifier |
| `/espace/delegues/import` | Import et dernier rapport |
| `/espace/delegues/journal` | Journal (phrases, 50 par page) |

**Carte d'identité, panneaux :**
1. **Identité** : prénom, nom, e-mail (`mailto:`), téléphone (`tel:`), entreprise (changement →
   confirmation, voir 7.3), notes.
2. **Mandats** : en cours (organe, qualité, fonction, site, début) ; ajouter, modifier, « Terminer »
   (date de fin, aujourd'hui par défaut), supprimer (confirmation) ; historique replié. Dates
   `jj/mm/aaaa` en champ texte.
3. **Compte CG Link** : état, invité le, dernière connexion (API admin Auth), boutons selon l'état.
4. **Écarts avec CG Link** (si présents) : champ, valeur ici, valeur CG Link, « Reprendre » / « Ignorer ».

Suppression d'un délégué : seulement sans compte CG Link (sinon « Annulez d'abord l'invitation ou
bloquez le compte »).

### 7.3 Écritures vers CG Link (B3)

Toutes en **actions serveur**, après `exigerSuperAdmin()`, journalisées.

| Action | Effet |
|---|---|
| **Inviter** (délégué sans `cglink_user_id`, e-mail obligatoire) | Appel `POST <SUPABASE_URL>/functions/v1/invite-user` avec le jeton de session du super admin, `{ email, name: "<prénom> <nom>", role: "DELEGATE", companyId, redirectTo: "https://cglink-app.vercel.app/" }`. Succès → `cglink_user_id = userId`, puis **synchronisation** (téléphone et mandats, que `invite-user` laisse vides). Entreprise sans `company_id` → « Reliez d'abord l'entreprise à CG Link ». |
| **Renvoyer l'invitation** (compte jamais connecté) | Même appel. Erreur de CG Link (compte déjà activé…) affichée telle quelle. |
| **Annuler l'invitation** (compte jamais connecté) | Appel `POST <SUPABASE_URL>/functions/v1/cancel-invite` avec le jeton de session, `{ companyId, delegateId }`. Succès → `cglink_user_id = null`. Le délégué reste dans l'Espace. |
| **Bloquer / Débloquer** | `isActive` false / true dans l'entrée `companies.delegates`. |
| **Synchroniser** (après toute modification d'identité ou de mandat d'un délégué qui a un compte) | Entrée `companies.delegates` : `name`, `email` (affiché), `phone`, `mandateDs`, `mandateCe`, `mandateCppt`, `mandateOther` ; `profiles.name`. |
| **Changer d'entreprise** | Entrée retirée de l'ancienne `companies.delegates`, ajoutée à la nouvelle (mêmes champs) ; `profiles.company_id`. Les deux entreprises doivent être reliées à CG Link. |

**Conversion Espace → CG Link** (`versCgLink()`, pur, testée) : pour `ds`, `ce`, `cppt`, mandats en cours
(sans `fin` ou `fin` ≥ aujourd'hui) : effectif s'il en existe un, sinon suppléant, sinon
`Pas de mandat`. `mandateOther` = autres mandats en cours, séparés par « ; » :
« CEE effectif », « Instances CG : <libellé> », « <libellé> », suivis de la fonction entre parenthèses.

**E-mail de connexion** : modifier l'e-mail d'un délégué qui a un compte **ne change pas** son adresse de
connexion (seulement l'e-mail affiché dans CG Link). La carte l'indique.

**Écriture concurrente** (`companies.delegates` est un seul champ par entreprise) : lire `delegates` et
`updated_at`, modifier **uniquement l'entrée du délégué** (repérée par `id`), écrire avec
`.eq('updated_at', <lu>)` ; 0 ligne modifiée → relire et recommencer (3 essais), puis « CG Link a été
modifié en même temps. Réessayez. ». Les autres champs de l'entrée (`mustChangePassword`,
`profileCompleted`, `acceptedRgpd`, `invitedAt`…) sont toujours conservés.

### 7.4 Écarts (`calculerEcarts()`, pur, testé)

Comparés à chaque ouverture de carte ou de liste (lecture service_role de `companies`) :
- délégué : `name` vs prénom + nom, `email`, `phone`, `isActive` (affiché), mandats DS / CE / CPPT
  (valeur CG Link vs `versCgLink()`), `mandateOther` ;
- délégué présent dans CG Link mais pas ici → proposé à l'import ;
- délégué lié ici mais absent de CG Link → « Compte CG Link introuvable » (lien à retirer) ;
- entreprise : ONSS CG Link vs `site_entreprise_onss`.

« Reprendre » applique la valeur CG Link ici (pour un mandat : ajout ou modification de la qualité au site
principal, début = aujourd'hui, marqué « à vérifier ») ; « Ignorer » écrit `site_ecarts_ignores`. Un écart
dont la valeur CG Link a encore changé réapparaît. Comparaison des téléphones sur les chiffres seuls, des
e-mails en minuscules.

## 8. Organisation du code

```
app/espace/entreprises/   manifeste.ts, layout.tsx (GardeApp), page.tsx, liste/, nouvelle/, [cle]/, [cle]/bce/, bce/
app/espace/delegues/      manifeste.ts, layout.tsx (GardeApp + super admin), page.tsx, liste/, nouveau/, [id]/,
                          a-verifier/, import/, journal/
lib/entreprises/          types.ts, donnees-serveur.ts (lectures service_role + session), bloc-adresse.ts,
                          affilies-serveur.ts
lib/bce/                  numero.ts (format, modulo 97), analyse.ts (HTML → données, pur), lecture-serveur.ts
                          (fetch), comparaison.ts
lib/delegues/             types.ts, noms.ts (decouperNom), mandats.ts (importerMandats, classerAutre,
                          versCgLink, libellés), ecarts.ts, cglink-serveur.ts (invite, cancel, écriture
                          concurrente), journal.ts (phrases)
lib/espace/acces.ts       + exigerSuperAdmin() (n'existe pas encore : rôle SUPER_ADMIN lu dans profiles)
supabase/migrations/      20261012120000_site_entreprises_delegues.sql
```

Le manifeste `entreprises` a un badge « N à compléter » (fiches CG Link sans n° BCE) ; `delegues` :
« N à vérifier ». Styles et composants : ceux de l'Espace (`ui.tsx`, `ecg-…`), aucun nouveau composant
générique sans besoin réel.

## 9. Erreurs

Messages courts, qui disent ce qui s'est passé et quoi faire :
- tables absentes (`42P01`) → écran « Les tables de l'app ne sont pas encore créées (migration
  20261012120000). » ;
- BCE : voir 6.3 ;
- CG Link refuse (invitation, annulation) → message de la fonction CG Link, rien n'est modifié ici ;
- jeton de session absent ou expiré → « Votre session a expiré. Reconnectez-vous. » ;
- écriture concurrente → voir 7.3 ;
- droit manquant → écrans existants « pas accès » ; action serveur → refus sans rien écrire.

## 10. Tests

Vitest (`lib/**/*.test.ts`), règles pures :
- `bce/numero` : formats d'entrée, modulo 97 (dont 0850.076.920) ;
- `bce/analyse` : copies enregistrées des pages réelles (ACCG : entité + 4 unités ; une grande entreprise
  paginée), dénomination, siège, unités, dates, nettoyage des adresses ;
- `bce/comparaison` : nouvelle, modifiée, arrêtée, absente ;
- `bloc-adresse` : défaut RH, personne du site, adresse postale du site, adresse incomplète ;
- `delegues/noms` : majuscules, casse mixte, un seul mot ;
- `delegues/mandats` : DS / CE / CPPT, **les 20 textes « Autre » réels**, `versCgLink` (effectif prioritaire,
  mandats terminés ignorés, `mandateOther`) ;
- `delegues/ecarts` : chaque champ, valeurs ignorées, normalisation téléphone / e-mail ;
- écriture concurrente : fonction de fusion d'une entrée (`fusionnerEntree()`), champs CG Link conservés.

Contrôles de fin : `tsc`, `npm test`, `npm run build`.

**Non testable depuis Claude Code** : écrans connectés, invitation réelle, blocage, écritures dans CG Link.
Liste de vérification pour Fred, en commençant par **un délégué de test** (adresse secondaire) dans une
entreprise de test.

## 11. Hors champ (plus tard)

- export du publipostage (le bloc adresse est prêt) ;
- changement de l'adresse de connexion d'un délégué ;
- affiliés par site ;
- CG Link qui lit les tables `site_` (fin de la gestion des délégués dans CG Link) ;
- ouverture de l'app Entreprises aux délégués (exclue par Fred) ;
- import du fichier Open Data de la BCE.

## 12. Points ouverts

- Couleurs et icônes des deux apps : proposées en 5.3, à valider par Fred.
- Correctif RLS `workers` / `profiles.company_id` (CG Link, Cursor) : à faire avant le lot B3.
