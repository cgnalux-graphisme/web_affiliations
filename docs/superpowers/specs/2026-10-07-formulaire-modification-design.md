# Formulaire « Signaler un changement » — conception

> Validée par Fred le 07/10/2026 (échange avec Claude Code). Spec à relire avant le plan d'implémentation.

## But

Permettre à un affilié de signaler facilement, en ligne et signé, un ou plusieurs changements de sa
situation : adresse, e-mail ou téléphone, employeur, régime de travail, situation professionnelle.
Si sa nouvelle profession relève d'une autre centrale de la FGTB, il est informé que **la Centrale
s'occupe du transfert** et que **la nouvelle centrale professionnelle le contactera**. L'affilié n'a
rien d'autre à faire. À l'envoi, un e-mail automatique (PDF signé joint) part à l'affilié et à
l'administration.

Critères de réussite :
- un affilié remplit le formulaire en quelques minutes, sur téléphone comme sur ordinateur ;
- l'administration reçoit un PDF clair qui ne liste que ce qui change, avec la mention
  « Transfert à organiser » quand il le faut ;
- la demande est consultable dans le back-office (fiche, PDF régénéré, historique des e-mails).

## Hors périmètre

- Changement de compte bancaire : formulaire « Mandat SEPA » existant (lien dans le formulaire).
- Envoi automatique vers l'autre centrale, ou déduction automatique de la centrale de destination :
  l'administration organise le transfert elle-même.
- Recalcul de la cotisation : une mention indique qu'elle sera adaptée par nos services.

## Parcours (4 étapes, charte `app/formulaires/`)

Adresse : **`/changement-situation`**. Titre : « Signaler un changement ». En-tête `EnteteFormulaire`,
indicateur `EtapesFormulaire` (retour en arrière cliquable), socle CSS `.formulaire`, classes
`form-*`, `etape-entree`.

### Étape 1 — Vous
Tous obligatoires :
- Nom, prénom ;
- N° de registre national (NISS) : même saisie formatée et même contrôle que le mandat SEPA ;
- E-mail (adresse actuelle, reçoit la copie).

### Étape 2 — Ce qui change
Cases à cocher en grandes tuiles, **au moins une** :
1. Adresse
2. E-mail ou téléphone
3. Employeur
4. Régime de travail
5. Situation professionnelle

Petite note : « Changement de compte bancaire ? Utilisez le formulaire Mandat SEPA » (lien).

### Étape 3 — Le détail
Seuls les blocs cochés s'affichent. Chaque bloc a une date **« À partir du »** (`jj/mm/aaaa`,
champ texte, jamais `<input type="date">`), obligatoire.

- **Adresse** : rue, n°, boîte (facultative), code postal (4 chiffres), localité, avec la saisie
  assistée existante (`/api/address-autocomplete`). Rue, n°, code postal et localité obligatoires.
- **E-mail ou téléphone** : nouvel e-mail et / ou nouveau téléphone, au moins un des deux. Le nouvel
  e-mail reçoit aussi la copie.
- **Employeur** :
  - nom de l'employeur — **obligatoire** ;
  - « N° ONSS ou n° d'entreprise (TVA) — si possible » — facultatif, un seul champ, comme dans le
    formulaire d'affiliation (texte libre, 30 caractères max) ;
  - localité — facultative ;
  - commission paritaire — « si connue » : liste du formulaire d'affiliation, « Je ne sais pas »
    par défaut ;
  - date d'entrée (= « À partir du »).
- **Régime de travail** : temps plein **ou** temps partiel. Temps partiel → **moyenne d'heures par
  semaine** obligatoire (nombre, 1 à 38, décimale permise : « 19 » ou « 19,5 »). Mention : « Votre
  cotisation sera adaptée par nos services. »
- **Situation professionnelle** : un choix parmi
  - *Nouvelle profession* : intitulé (obligatoire) + commission paritaire (liste, « Je ne sais pas »
    par défaut) ;
  - *Chômage* ;
  - *Maladie de longue durée (mutuelle)*.

### Étape 4 — Signature
Récapitulatif de tous les changements, signature dessinée (même composant que le mandat SEPA), lieu,
date (pré-remplie au jour, `jj/mm/aaaa`), puis « Envoyer ». Écran de confirmation : changements
envoyés, message de transfert le cas échéant, téléchargement du PDF.

## Détection du transfert

Liste des commissions paritaires extraite de `FormulaireWebIndependant.tsx` vers
**`lib/commissions-paritaires.ts`** (mêmes entrées, même ordre, l'affiliation l'importe : aucun
changement visible). Règle, appliquée aux CP des blocs *Employeur* et *Nouvelle profession* :

| CP choisie | Statut `transfert` | Message à l'affilié (écran, e-mail, PDF) |
|---|---|---|
| Une CP de la liste (nos secteurs) | `non` | — |
| « 000 - Autre » | `a_organiser` | « Votre nouvelle profession relève d'une autre centrale de la FGTB. Nous nous chargeons de votre transfert. Votre nouvelle centrale professionnelle prendra contact avec vous. » |
| « Je ne sais pas » | `a_verifier` | « Nos services vérifieront votre secteur. Si un transfert vers une autre centrale est nécessaire, nous nous en chargeons et votre nouvelle centrale prendra contact avec vous. » |

Plusieurs CP (employeur + profession) : le statut le plus fort l'emporte
(`a_organiser` > `a_verifier` > `non`). Chômage et mutuelle : pas de transfert. Le message apparaît
sous la liste dès le choix (encadré `form-encart`), puis dans le récapitulatif, l'e-mail et le PDF.
Côté admin : badge **« Transfert à organiser »** (bordeaux) ou **« Secteur à vérifier »** (contour).

Fonctions pures dans **`lib/modification.ts`** : types, `statutTransfert()`, `validerEtape()`,
libellés, conversion formulaire ↔ ligne en base. Tests Vitest dans `lib/modification.test.ts`.

## Base de données

Migration **demandée par Fred le 07/10/2026**,
`supabase/migrations/20261007120000_web_modifications.sql`, idempotente, exécutée par Fred dans
l'éditeur SQL. Avant de l'écrire : relever en lecture seule les droits et politiques réels d'une
table `web_*` existante (ex. `web_mandats_sepa`) pour les reproduire à l'identique.

**`web_modifications`** :
- `id uuid` (défaut `gen_random_uuid()`, fourni par le navigateur via `insererDemande()`),
  `created_at timestamptz`;
- identité : `nom`, `prenom`, `niss` (11 chiffres), `email` ;
- `changements text[]` (`adresse`, `contact`, `employeur`, `regime`, `situation`) ;
- adresse : `adresse_rue`, `adresse_numero`, `adresse_boite`, `adresse_code_postal`,
  `adresse_localite`, `adresse_depuis date` ;
- contact : `nouvel_email`, `nouveau_telephone`, `contact_depuis date` ;
- employeur : `employeur_nom`, `employeur_onss_tva`, `employeur_localite`, `employeur_cp`,
  `employeur_depuis date` ;
- régime : `regime` (`temps_plein` / `temps_partiel`), `regime_heures numeric`, `regime_depuis date` ;
- situation : `situation` (`profession` / `chomage` / `mutuelle`), `profession`, `profession_cp`,
  `situation_depuis date` ;
- `transfert` (`non` / `a_organiser` / `a_verifier`) ;
- `date_signature date`, `lieu_signature`, `signature` (image en data URL).

Contraintes `check` sur les valeurs fermées. RLS activé : `anon` et `authenticated` peuvent **insérer
seulement** (jamais relire) ; lecture par les routes admin en service_role. Aucune politique de
lecture pour `anon`.

Contrôles existants élargis (drop / add de la contrainte, idempotent) :
- `site_destinataires.envoi` : + `modification` ; ligne pré-remplie `('modification', 'admin.nalux@accg.be')` ;
- `site_envois_mails.demande_type` et `.envoi` : + `modification`.

## E-mail automatique

Route **`/api/send-modification`** (POST : `email`, `nom`, `prenom`, `nouvelEmail?`, `pdfBase64`,
`fileName`, `transfert`, `changements`, `demandeId?`), calquée sur `/api/send-mandat-sepa` :
`destinatairesInternes("modification")` puis `envoyerEtJournaliser()`. Destinataires : l'affilié
(adresse actuelle **et** nouvelle si fournie) + adresses internes actives. Sujet, identique pour tous
les destinataires : « Changement de situation — Centrale Générale FGTB Namur-Luxembourg ». Corps : palette du site, liste des changements signalés, message de transfert le cas
échéant, contacts. Contenu de la demande jamais journalisé.

## PDF

`genererPdfModification()` (exporté du formulaire, dans le navigateur, `@react-pdf/renderer`),
charte « Registre » : logo rouge, titre « Changement de situation », sections numérotées (Identité,
puis un bloc par changement coché uniquement), encadré bordeaux du transfert le cas échéant,
signature + « Certifié conforme par signature électronique », bloc `BureauxPdf`, pied de page.
`genererPdfModificationEnregistree(ligne)` pour le back-office, daté du jour de la demande
(`dateDocument`).

## Back-office

- `lib/demandes.ts` : type `modification` (« Modifications » / « Changement de situation »,
  table `web_modifications`, PDF navigateur, fichier `changement-situation`).
- `lib/envois.ts` : envoi `modification` (« Changement de situation », « Dès qu'un affilié signale un
  changement, avec le PDF. ») + `DESTINATAIRES_DEFAUT`.
- `lib/insertion-demande.ts` : table ajoutée.
- `lib/demandes-affichage.ts` : libellés et sections ; badge de transfert en tête de la fiche.
- `DetailDemande.tsx` : branche PDF pour `modification`.
- Demandes liées : même NISS / e-mail (fonctionne tel quel si le type est enregistré).

## Site

- `app/forms.ts` : tuile « Signaler un changement » (« Adresse, employeur, régime de travail ou
  situation professionnelle : prévenez-nous en ligne. »).
- `app/changement-situation/page.tsx` : métadonnées « Signaler un changement — Centrale Générale FGTB
  Namur-Luxembourg ».
- CLAUDE.md : route, table, envoi, migration.

## Erreurs et cas limites

- Validation par étape : impossible d'avancer avec un champ obligatoire vide ou invalide ; messages
  `form-erreur` qui disent quoi corriger.
- Enregistrement refusé par la base → message clair, rien n'est envoyé, l'affilié peut réessayer.
- Enregistré mais e-mail en échec → la demande est conservée, l'écran le dit et propose de
  télécharger le PDF (comme le mandat SEPA).
- Double clic : `use-once-submit` existant.
- Migration pas encore exécutée → l'insertion échoue avec un message clair (ne pas mettre la tuile en
  ligne avant l'exécution).

## Tests

- Vitest (`lib/modification.test.ts`) : `statutTransfert()` (CP à nous, « Autre », « Je ne sais
  pas », combinaisons, chômage / mutuelle), validation de chaque bloc (heures 1–38, au moins un
  changement, au moins un des deux contacts, dates), conversion formulaire ↔ ligne.
- Test de non-régression : la liste des CP de l'affiliation est identique après extraction.
- Vérification manuelle en local : parcours complet, PDF sur le cas le plus long (5 changements +
  transfert) sans chevauchement avec le bloc « Nos bureaux », rendu mobile. Pas d'écriture de test
  dans la base réelle sans l'accord de Fred.
