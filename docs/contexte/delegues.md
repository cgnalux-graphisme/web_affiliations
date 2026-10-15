# App « Gestion délégués CG Link » : contexte

> Ramification de [CLAUDE.md](../../CLAUDE.md). Créé le 13/10/2026.
> Spec : [docs/superpowers/specs/2026-10-12-entreprises-delegues-design.md](../superpowers/specs/2026-10-12-entreprises-delegues-design.md)
> (section 7 et 7.1 bis). Plan : [docs/superpowers/plans/2026-10-13-delegues-lot-b-2a.md](../superpowers/plans/2026-10-13-delegues-lot-b-2a.md).

## Rôle

À terme, l'Espace CG remplace CG Link pour la gestion des délégués (Fred est le seul à les gérer). Cette app
tient les délégués, leur carte d'identité et leurs mandats. **Plan 2a (13/10/2026)** : import, liste, carte,
mandats, unité de rattachement, « À vérifier », journal, **sans aucune écriture vers CG Link**. **Plan 2b (13/10/2026)** : comptes CG Link, synchronisation, écarts (voir plus bas).

## Accès

App `delegues` (couleur `#CC79A7`, icône `id-card`, ordre 50).
- **SUPER_ADMIN** : tous les délégués, tout compris.
- **Permanents** (depuis le 13/10/2026, décision de Fred ; rôle par défaut PERMANENT, migration
  `20261013120000`) : **accès complet aux délégués de leurs entreprises** (périmètre CG Link, voir
  [permanents.md](permanents.md)) : liste, création, identité, adresse, unité, mandats, à vérifier, écarts,
  changement d'entreprise vers une de leurs entreprises. **Sauf tout ce qui concerne la connexion**, ni
  affiché ni permis : panneau « Compte CG Link » (inviter, renvoyer, annuler, bloquer, rétablir, retirer le
  lien), colonne et filtre « Compte CG Link », écart d'e-mail ; ni l'import ni le journal (sections du menu
  `superAdmin: true`, pages `exigerSuperAdmin()`).
- Code : `accesDelegues()` / `exigerAccesDelegues()` / `dansAcces()` (`lib/permanents/perimetre-serveur.ts`) ;
  chaque lecture (`chargerListeDelegues`, `chargerCarte`, `chargerAVerifier`, badge) et chaque action
  (`lireDelegue()` traite un délégué hors périmètre comme introuvable ; `ctxSuperAdmin()` pour les comptes et
  l'import) revérifie. Toute autre personne à qui l'app serait donnée a le même régime que le permanent
  (périmètre vide si elle n'est permanent d'aucune entreprise).
- La synchronisation automatique vers CG Link (nom, téléphone, mandats ; jamais l'e-mail) continue pour les
  modifications d'un permanent. L'e-mail du délégué reste visible (contact).
- L'app Entreprises affiche les délégués en lecture seule (lien « Gérer »).

## Routes

| Route | Contenu |
|---|---|
| `/espace/delegues/liste` | Tous les délégués : recherche, filtres entreprise / mandat / compte CG Link / à vérifier |
| `/espace/delegues/nouveau` | Créer un délégué (entreprise, prénom, nom, e-mail, téléphone) |
| `/espace/delegues/<id>` | Carte d'identité : identité, **unité d'établissement de rattachement**, notes, mandats (en cours, terminés repliés), compte CG Link (lecture seule), historique |
| `/espace/delegues/a-verifier` | Délégués et mandats marqués par l'import : « C'est correct » ou correction sur la carte |
| `/espace/delegues/import` | Import depuis CG Link et rapport |
| `/espace/delegues/journal` | Journal des opérations (50 par page) |

Badge de la tuile : « N à vérifier ».

## Import depuis CG Link (`lib/delegues/import.ts`, `import-serveur.ts`)

- Source : `companies.delegates` (jsonb). Un délégué = un compte CG Link (`cglink_user_id`, unique) :
  **relancer l'import ne recrée ni ne modifie** un délégué déjà importé.
- Fiche d'arrivée : celle de l'entreprise, ou celle qui la regroupe (`autres_company_ids` : XLG HOME →
  TRIXXO). Un délégué présent dans deux entreprises (MARLUX + REMACLE) va dans l'entreprise de son profil
  CG Link (`profiles.company_id`), marqué « à vérifier » avec l'autre nom.
- Nom : « Prénom Nom » (167 / 176) sans marque ; mot en majuscules = nom ; un mot ou 3 et plus → « à
  vérifier » (`decouperNom()`).
- Mandats (`importerMandats()`) : DS, CE, CPPT « Effectif » / « Suppléant » rangés directement (« Pas de
  mandat » ignoré) ; texte « Autre » classé (`classerAutre()`) en CEE (européen), Instances CG (comité
  exécutif, vérificateur, bureau des femmes, régional), CE (« Secrétaire CE » fusionné dans le mandat CE),
  Autre ; numéro, prénom ou lettre isolée → non importé, listé dans le rapport. Tout ce qui vient de
  « Autre » est marqué « à vérifier ». Site : site principal ; début : **13/05/2024**.

## Unité d'établissement de rattachement

`site_delegues.unite_id` : une unité **suivie et active** de la fiche du délégué (`uniteAutorisee()`,
revérifiée côté serveur). Un nouveau mandat sans site choisi prend le site (UTE) de cette unité, sinon le
site principal (`siteParDefaut()`).

## Téléphone et adresse (13/10/2026)

- **Téléphone** au format `+32 (0) 470 12 34 56` (GSM), `+32 (0) 81 64 99 63` / `+32 (0) 2 511 11 11` (fixes),
  `+352 621 123 456`, `+33 (0) 6 12 34 56 78` : `formaterTelephone()` (`lib/telephone.ts`), appliqué en quittant
  le champ (tous les champs « tel » de l'Espace, `ChampsEdition`), à l'enregistrement et à l'import ; les
  numéros déjà en base sont affichés formatés et réécrits au prochain enregistrement.
- **Adresse complète** (`adresse_rue`, `adresse_numero`, `adresse_boite`, `adresse_code_postal`,
  `adresse_localite`, `adresse_pays`, défaut « Belgique ») : champ « Rue » avec **autocomplétion Photon**
  comme le formulaire d'affiliation (`app/espace/_partage/AutocompleteRue.tsx`, logique partagée
  `lib/adresse-photon.ts`, utilisée aussi par `FormulaireWebIndependant.tsx`) ; choisir une adresse remplit
  numéro, code postal et localité ; suggestions seulement pour la Belgique ; clavier (flèches, Entrée,
  Échap). Code postal belge contrôlé (4 chiffres). Migration `20261013110000_site_delegues_adresse.sql`.

## Registre national et genre (13/10/2026, app Libérations)

- **N° de registre national** (`registre_national`, 11 chiffres) : saisi à la main sur la carte (champ formaté
  à la frappe `85.07.30-033.28`, clé modulo 97 vérifiée par `nissValide()`, `lib/modification.ts`), enregistré
  sans points ni tirets. Visible par SUPER_ADMIN, ADMIN_OP et les permanents (décision de Fred, 13/10/2026).
- **Genre** (`genre`, `M` = délégué, `F` = déléguée) : accord des courriers de libération.
- Aussi complétables depuis un dossier de l'app Libérations (bouton « Compléter », même validation, ligne de
  journal avec `source: liberations`). Ni l'un ni l'autre n'est envoyé à CG Link.
- Colonnes ajoutées par la migration `20261013130000_site_liberations.sql` (exécutée le 13/10/2026 ;
  sans elles, l'app Délégués ne pourrait plus lire les cartes).

- **N° de compte** (`iban`, 14/10/2026, lot 2 des Libérations) : pour la fiche de paiement ; clé IBAN vérifiée
  (`ibanValide()`, `lib/iban.ts`), enregistré sans espaces, affiché par groupes de 4. Migration
  `20261014090000_site_liberations_courriers.sql` (exécutée le 14/10/2026 ; sans la colonne, l'app
  Délégués ne pourrait plus lire les cartes). Pas envoyé à CG Link.

## Choisir parmi les travailleurs (15/10/2026, demande de Fred)

- **Nouveau délégué** : après le choix de l'entreprise, « Choisir parmi les travailleurs » ouvre la liste des
  travailleurs de l'entreprise (table `workers` de CG Link, actifs par défaut, recherche) ; le choix remplit
  prénom, nom et **registre national** (modifiables avant de créer).
- **Carte du délégué** : « Retrouver le registre national » (ou « Vérifier dans les travailleurs ») propose d'abord
  les travailleurs au même nom ; le choix enregistre le registre national sur la carte (même validation et même
  journal qu'une saisie).
- Périmètre : `travailleursEntreprise()` (`app/espace/delegues/actions.ts`) n'accepte que les entreprises du
  périmètre de la personne (permanent : ses entreprises). Composant `app/espace/delegues/ChoixTravailleur.tsx`.

## Écritures vers CG Link (plan 2b, 13/10/2026)

Plan : [docs/superpowers/plans/2026-10-13-delegues-lot-b-2b.md](../superpowers/plans/2026-10-13-delegues-lot-b-2b.md).
Préalable vérifié le 13/10/2026 : `workers` n'est plus lisible avec la clé publique (401).

- **Panneau « Compte CG Link »** de la carte : inviter (fonction CG Link `invite-user`, avec la session du super
  admin ; e-mail obligatoire, fiche reliée à CG Link), renvoyer l'invitation, annuler l'invitation
  (`cancel-invite` : compte, profil et entrée supprimés, le délégué reste dans l'Espace), bloquer / rétablir
  (`isActive`), envoyer la carte, retirer le lien d'un compte introuvable. Confirmation avant les actions
  irréversibles.
- **Synchronisation automatique** après toute modification d'identité ou de mandat d'un délégué qui a un compte :
  nom, téléphone, `mandateDs` / `mandateCe` / `mandateCppt` (Effectif, Suppléant, Pas de mandat ; mandats en
  cours seulement, effectif prioritaire), `mandateOther` (CEE, Instances CG, Autre, fonctions), `profiles.name`
  (`versCgLink()`, `synchroniser()`). Échec : l'Espace garde la modification et propose « Envoyer à CG Link ».
- **Jamais l'e-mail** : CG Link retrouve le délégué par `companies.delegates[].email` à la connexion. Pour un
  délégué qui a un compte, l'e-mail est en lecture seule dans l'Espace.
- **Écriture sûre** de `companies.delegates` : relecture, modification de la seule entrée du délégué (autres
  champs conservés : `mustChangePassword`, `acceptedRgpd`, `invitedAt`…), écriture si `updated_at` n'a pas bougé,
  3 essais (`modifierDelegues()`, `fusionnerEntree()`).
- **Entreprise CG Link d'un compte** : celle dont `delegates` contient son identifiant (`companyDuDelegue()`),
  ce qui couvre les entreprises regroupées (XLG HOME dans TRIXXO).
- **Changer d'entreprise** : entrée ajoutée à la nouvelle entreprise CG Link puis retirée de l'ancienne,
  `profiles.company_id` mis à jour ; unité de rattachement vidée ; mandats en cours déplacés au site principal
  de la nouvelle fiche, marqués « à vérifier ».
- **Écarts** (`calculerEcarts()`, panneau « Écarts avec CG Link » et filtre de la liste) : nom, e-mail,
  téléphone, mandats DS / CE / CPPT, autres mandats. « Reprendre » (CG Link → Espace, `planReprise()` : « Pas
  de mandat » termine le mandat, jamais de suppression), « Ignorer » (valeur mémorisée dans
  `site_ecarts_ignores`, réapparaît si elle change), « Envoyer ma carte à CG Link ».

### Limites connues (relecture du 13/10/2026)

- **CG Link réécrit tout le tableau `companies.delegates`** à partir de sa copie en mémoire (rafraîchie toutes
  les 60 s), sans relire ni vérifier `updated_at` (`services/DataContext.tsx`, `updateCurrentDelegate`,
  `setDelegateActive`). Une écriture de CG Link dans la minute qui suit peut donc défaire une écriture de
  l'Espace (blocage, déplacement d'entreprise). À corriger **dans CG Link** (prompt Cursor remis à Fred le
  13/10/2026). En attendant : après un blocage ou un changement d'entreprise, rouvrir la carte une à deux
  minutes plus tard pour vérifier.
- **Fin de mandat** : un mandat est en cours si sa fin est **après** aujourd'hui ; terminé aujourd'hui, il ne
  l'est plus (sinon « Reprendre » un « Pas de mandat » de CG Link était réécrit « Effectif » le jour même).
- La synchronisation n'efface jamais un téléphone de CG Link par une valeur vide (`champsAEnvoyer()`).
- « Reprendre » les autres mandats : élément par élément (liste « a ; b »), sans doublon ; « Secrétaire (CE) »
  devient la fonction du mandat CE en cours.
- Invitation : si `invite-user` répond 200 mais n'a pas pu écrire l'entreprise (défaut côté CG Link), la carte
  montre « Compte CG Link introuvable » ; vérifier dans CG Link avant « Retirer le lien ».

## Écritures

Actions serveur (`app/espace/delegues/actions.ts`) : rôle revérifié, puis **service_role** (les tables
délégués n'ont aucune politique d'écriture). Chaque modification écrit une ligne dans
`site_journal_delegues` (phrases : `phraseJournal()`). Un délégué qui a un compte CG Link ne se supprime pas
ici. Le journal n'a pas de clé étrangère vers les délégués (il survit aux suppressions) : les noms sont lus
par une seconde requête.

## Migrations

`20261013100000_site_delegues_unite.sql` (colonne `unite_id`, app activée) : **à exécuter par Fred** dans
Supabase › SQL Editor, comme `20261013090000_site_unites_suivies.sql`.
