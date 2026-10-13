# App « Accès permanents » : design

> Validé par Fred le 13/10/2026 (section par section). Branche `suivi-actions`.

## 1. Objectif

Donner à chaque permanent un tableau de bord avec ses outils :
- raccourcis vers **ses entreprises** (app Entreprises filtrée) et **ses délégués** (app Délégués, limitée à
  son périmètre) ;
- un outil **« Fiches de suivi »** : une fiche par moment précis de l'action syndicale (événement en usine ou
  sectoriel), rédigée avec l'aide de l'IA, exportée en PDF ;
- les fiches alimentent le **rapport de congrès** (partie actions syndicales) et forment l'**historique** de la
  fiche entreprise.

Tout reste interne : rien n'est publié sur le site public.

## 2. Décisions de Fred (13/10/2026)

| # | Sujet | Décision |
|---|---|---|
| 1 | Périmètre du permanent | Vient de CG Link : `companies.permanent_email` = adresse de connexion du permanent (vérifié : les 94 entreprises correspondent exactement à un compte PERMANENT ; même répartition que `supabase/donnees/entreprises-2026-10-12.csv`). |
| 2 | Permanent sur la fiche entreprise | Afficher le permanent (nom, e-mail, WhatsApp) sur chaque fiche de l'app Entreprises. |
| 3 | Secteur sur la fiche entreprise | Ajouter le secteur (`site_secteurs`) à chaque fiche entreprise, pré-rempli depuis CG Link, modifiable, filtrable. |
| 4 | Délégués | Accès complet du permanent aux délégués de ses entreprises, **sauf tout ce qui concerne la connexion** (compte CG Link) : masqué et refusé s'il n'est pas SUPER_ADMIN. |
| 5 | Rapport de congrès | Les fiches s'ajoutent au rapport actuel, avec un écran de sélection avant la génération (période, entreprise, secteur, permanent, inclure ou non les actions / les fiches, cases à cocher). |
| 6 | Cycle de vie | Brouillon → Terminée. Tous les permanents lisent toutes les fiches ; chacun modifie les siennes ; un SUPER_ADMIN lit et modifie tout. |
| 7 | Secteurs | Liste `site_secteurs` (celle des actions). |

## 3. Droits et périmètre

- **App `permanents`** (« Accès permanents », icône `key`, couleur `#A0522D`, ordre 35) : rôles PERMANENT
  (par défaut) et SUPER_ADMIN (toujours). La tuile « Bientôt » disparaît.
- **« Mes entreprises »** : entreprises CG Link dont `permanent_email` correspond (sans casse ni espaces) à
  l'e-mail de la personne connectée, plus les fiches qui les regroupent (`autres_company_ids`). Fonction
  serveur unique `perimetrePermanent()` (`lib/permanents/perimetre-serveur.ts`), règles pures testées dans
  `lib/permanents/perimetre.ts`.
- **App Entreprises** : bloc « Permanent » (lecture seule, lu en direct dans CG Link) et champ « Secteur » sur
  chaque fiche ; filtre « Mes entreprises » (coché par défaut pour un PERMANENT) et filtre secteur sur
  `site_secteurs`. Droits d'écriture inchangés.
- **App Délégués** : ouverte aux PERMANENT (`site_app_roles`), limitée aux délégués des fiches de leur
  périmètre. Chaque page et action revérifie le périmètre. Permis : liste, création, identité, adresse, unité,
  notes, mandats, « À vérifier », écarts, changement d'entreprise **vers une entreprise de leur périmètre**.
  Réservé au SUPER_ADMIN (masqué + refusé côté serveur) : panneau « Compte CG Link » (inviter, renvoyer,
  annuler, bloquer, rétablir, retirer le lien), modification de l'e-mail d'un délégué qui a un compte, import
  CG Link, journal. La synchronisation automatique vers CG Link (nom, téléphone, mandats) continue.
- **Fiches de suivi** : lecture pour toute personne qui a l'app ; écriture et suppression pour l'auteur ou un
  SUPER_ADMIN.

## 4. Données (migration `20261013120000_site_fiches_suivi.sql`, à exécuter par Fred)

- `site_entreprises.secteur_id uuid references site_secteurs(id) on delete set null`, rempli par
  correspondance des libellés CG Link (Construction, Bois → Bois / ameublement, Chimie, ETA → Entreprises de
  travail adapté, Nettoyage, Gardiennage → Gardiennage / sécurité, Titres-Services, Carrière → Carrières &
  matériaux ; ALE, CP100, Verre, papier : vides, à choisir sur la fiche).
- `site_fiches_suivi` : `id`, `type` (`usine` / `sectoriel`), `titre`, `date_debut`, `date_fin` (null = date
  unique, sinon ≥ début), `entreprise_id` (→ `site_entreprises`, obligatoire si `usine`), `site_id`
  (→ `site_entreprise_sites`, facultatif), `secteur_id` (→ `site_secteurs`, obligatoire si `sectoriel`),
  `origine`, `duree`, `echanges_direction`, `courriers`, `evenements`, `resolution`, `resultat`, `texte`,
  `texte_genere_le`, `statut` (`brouillon` / `terminee`), `auteur_id` (→ `auth.users`, défaut `auth.uid()`),
  `created_at`, `updated_at` (trigger).
- `site_fiches_suivi_fichiers` : `id`, `fiche_id` (cascade), `genre` (`document` / `photo`), `chemin`,
  `nom_origine`, `taille`, `type_mime`, `nature` (documents : `courrier_envoye`, `courrier_recu`, `pv`,
  `preavis`, `accord`, `tract`, `presse`, `autre`), `nature_autre`, `legende`, `ordre`, `created_at`.
- Bucket **privé** `fiches-suivi` : `<fiche_id>/<uuid>-<nom>`. Fichiers lus par liens signés courts, servis
  côté serveur.
- RLS : lecture `site_a_app('permanents')` ; insertion / modification / suppression si
  `site_a_app('permanents')` et (`auteur_id = auth.uid()` ou SUPER_ADMIN). Fichiers : mêmes règles via la
  fiche. Bucket : mêmes règles via le premier segment du chemin.
- `site_apps` : ligne `permanents` ; `site_app_roles` : (`permanents`, PERMANENT), (`delegues`, PERMANENT).

## 5. Écrans

- `/espace/permanents/accueil` : tuiles Mes entreprises / Mes délégués (dont à vérifier) / Mes brouillons,
  bouton « Nouvelle fiche de suivi », mes 5 dernières fiches, 5 dernières de l'équipe.
- `/espace/permanents/fiches` : liste filtrable (mes fiches / toutes, type, statut, entreprise, secteur,
  recherche).
- `/espace/permanents/fiches/nouvelle` : choix du type (deux cartes) puis création du brouillon.
- `/espace/permanents/fiches/<id>` : lecture (cartouche, texte, réponses, pièces, photos), boutons Modifier,
  PDF, Supprimer.
- `/espace/permanents/fiches/<id>/modifier` : étapes Quand et où → Pièces → Le suivi (7 questions) →
  Rédaction (IA + éditeur) → Finaliser (statut, PDF).
- Fiche entreprise : panneau « Fiches de suivi » (fiches de l'entreprise, puis fiches sectorielles du secteur,
  repliées).

Les 7 questions : origine (« D'où vient le conflit ? »), durée, échanges avec la direction, courriers envoyés,
événements particuliers, résolution, résultat. Aucune n'est obligatoire.

## 6. Rédaction IA

`/api/permanents/redaction` (POST `{ ficheId }`), app `permanents`, auteur ou SUPER_ADMIN. Relit la fiche en
base, envoie à Claude Sonnet 5 (`claude-sonnet-5`) le contexte (type, dates, entreprise / site ou secteur,
titre, réponses non vides, liste des documents : nom + nature) et renvoie un texte en paragraphes, sans rien
enregistrer. Consignes : français, voix active, phrases courtes, ton factuel de rapport syndical, **aucune
information inventée**, pas de noms de personnes non fournis, 150 à 400 mots. Erreurs traduites par
`lib/anthropic-erreurs.ts`.

## 7. PDF

`lib/fiches-suivi/FichePDF.tsx`, généré dans le navigateur, charte `lib/pdf/charte.ts` : en-tête fixe, titre
Barlow Condensed 800 + filet rouge 44 × 5, cartouche (Type, Date, Entreprise ou Secteur, Permanent), photo
principale, texte, « En bref » (réponses non vides), pièces jointes (nom + nature), galerie 2 par ligne, pied
fixe (placé avec `top`) « Document interne · généré le jj/mm/aaaa » + pages, filigrane « BROUILLON » si non
terminée.

## 8. Rapport de congrès

`/espace/actions/rapport` : écran « Composer le rapport » : période, entreprise, secteur, permanent, cases
« Inclure les actions » / « Inclure les fiches de suivi » (+ « brouillons compris »), liste à cocher groupée
(tout coché par défaut). Le PDF garde bilan et chronologie pour les actions cochées et ajoute la partie
« Actions syndicales en entreprise et en secteur » (fiches cochées, par secteur puis date : titre, cartouche
réduit, texte, photo principale). Fiches lues côté serveur (service_role) après vérification de l'app
`actions`.

## 9. Tests

Vitest sur les règles pures : périmètre, correspondance des secteurs, validation d'une fiche, droits (fiche,
délégué), préparation du message IA, sélection du rapport. Puis `npm test`, build, parcours réel.
