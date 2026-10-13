# App « Accès permanents » : contexte

> Ramification de [CLAUDE.md](../../CLAUDE.md). Créé le 13/10/2026.
> Spec : [docs/superpowers/specs/2026-10-13-acces-permanents-design.md](../superpowers/specs/2026-10-13-acces-permanents-design.md).

## Rôle

Le tableau de bord du permanent : ses entreprises, ses délégués et les **fiches de suivi**. Une fiche raconte
un moment précis de l'action syndicale (événement **en usine** ou **sectoriel**). Les fiches forment
l'historique de la fiche entreprise et alimentent le **rapport de congrès** (partie actions syndicales). Rien
n'est publié sur le site public.

## Accès

App `permanents` (« Accès permanents », icône `key`, couleur `#A0522D`, ordre 35) : PERMANENT par défaut
(`site_app_roles`), SUPER_ADMIN toujours. Pages : `exigerApp("permanents")` ; actions : `aApp("permanents")`.
- **Lecture** : toutes les fiches, pour toute personne qui a l'app (décision de Fred, 13/10/2026).
- **Écriture et suppression** : l'auteur de la fiche, ou un SUPER_ADMIN (`peutModifier()`, revérifié côté
  serveur, et RLS `site_fiche_modifiable()`).

## Périmètre du permanent (« mes entreprises »)

Source : **CG Link**, `companies.permanent_email` = adresse de connexion du permanent (sans casse ni espaces).
Vérifié le 13/10/2026 : les 94 entreprises correspondent exactement à un compte PERMANENT (Martin Pierrard 16,
Jonathan Hubert 30, Magali Houba 17, Christelle Palermo 17, Frédéric Lucchetta 14), comme le tableau de Fred.
Les fiches qui regroupent une entreprise du permanent (XLG HOME dans TRIXXO) en font partie.
Code : `lib/permanents/perimetre.ts` (règles pures, testées), `lib/permanents/perimetre-serveur.ts`
(`perimetreDe()`, `monPerimetre()`, `accesDelegues()`, `exigerAccesDelegues()`, `listePermanents()`).

Effets ailleurs :
- **Entreprises** : filtre « Mes entreprises » (coché par défaut pour un PERMANENT, `?mes=1` / `?mes=0`),
  colonne et carte « Permanent » (lecture seule, CG Link) ;
- **Délégués** : un permanent gère les délégués de ses entreprises (voir [delegues.md](delegues.md)).

## Routes

| Route | Contenu |
|---|---|
| `/espace/permanents/accueil` | Tableau de bord : chiffres (entreprises, délégués, à vérifier, brouillons), mes fiches, dernières fiches de l'équipe, mes entreprises. SUPER_ADMIN : sélecteur « Vu comme » (`?permanent=<e-mail>`) |
| `/espace/permanents/fiches` | Toutes les fiches (onglet « Mes fiches », `?vue=mes`), filtres type / statut / secteur, recherche |
| `/espace/permanents/fiches/nouvelle` | Choix du type (deux cartes) : crée le brouillon ; `?entreprise=<id fiche>` pré-remplit l'entreprise (bouton de la fiche entreprise) |
| `/espace/permanents/fiches/<id>` | Lecture : texte, « En bref », photos, documents ; PDF ; Modifier / Supprimer (auteur, SUPER_ADMIN) |
| `/espace/permanents/fiches/<id>/modifier` | Éditeur en 5 étapes (`?etape=0..4`) : Quand et où, Pièces, Le suivi, Rédaction, Finaliser |
| `/api/permanents/redaction` | POST `{ ficheId }` : texte rédigé par Claude Sonnet 5 depuis la fiche relue en base ; rien n'est enregistré |

Badge de la tuile : « N brouillons » (mes fiches).

## Fiche de suivi

- **Quand et où** : titre court ; une date ou une période (`jj/mm/aaaa`) ; usine : entreprise (mes entreprises
  en tête) et site (UTE) facultatif ; secteur (`site_secteurs`, repris de l'entreprise).
- **Pièces** : documents (PDF, Word, Excel, OpenDocument, JPEG / PNG, texte ; 25 Mo, 20 par fiche) avec leur
  **nature** (courrier envoyé, courrier reçu, PV de réunion, préavis de grève, accord / CCT, tract, article de
  presse, autre + précision) ; photos (12 par fiche, réduites à 2000 px en JPEG, la première est la principale,
  légendes, ordre). Envoi **direct au bucket privé** `fiches-suivi` par lien signé créé côté serveur
  (`preparerEnvoi()` puis `enregistrerFichier()`, qui vérifie que le fichier est bien arrivé) : pas de limite
  de 4,5 Mo de Vercel. Lecture par liens signés d'une heure.
- **Le suivi** : 7 questions courtes, aucune obligatoire (origine, durée, échanges avec la direction, courriers
  envoyés, événements particuliers, résolution, résultat) : `QUESTIONS` dans `lib/fiches-suivi/types.ts`.
- **Rédaction** : « Rédiger avec l'IA » enregistre d'abord, puis appelle la route. Consigne
  (`lib/fiches-suivi/redaction-ia.ts`) : rien d'inventé, documents connus par leur nom et leur nature seulement,
  dates `jj/mm/aaaa`, 150 à 400 mots. Les chiffres absents des réponses sont signalés (`nombresAbsents()`).
  Remplacer un texte retouché demande confirmation. `texte_genere_le` garde la date de la dernière proposition
  enregistrée.
- **Finaliser** : « Marquer comme terminée » exige titre, date, entreprise (usine) ou secteur (sectoriel) et
  texte (`manquantsPourTerminer()`) ; « Repasser en brouillon » possible.
- Chaque changement d'étape enregistre ; le navigateur prévient avant de quitter avec des modifications non
  enregistrées.

## PDF

`lib/fiches-suivi/FichePDF.tsx` (navigateur, `@react-pdf/renderer`), données par `versFichePdf()`
(`lib/fiches-suivi/pdf-donnees.ts`), photos réduites à 900 px (`lib/pdf/photo-pdf.ts`, partagé avec le
rapport). Mise en page : bandeau bordeaux (filet rouge, logo blanc, « FICHE DE SUIVI », titre Barlow Condensed
800, filet blanc), cartouche (type, date, entreprise ou secteur, permanent), photo principale, « Le suivi »,
« En bref », pièces jointes (nature + nom), galerie 2 par ligne, en-tête des pages suivantes, pied « Document
interne · généré le jj/mm/aaaa » + pages (placé avec `top`), filigrane « BROUILLON » dessiné en dernier.
Vérifié le 13/10/2026 par un rendu réel (2 pages). Nom : `fiche-suivi-<aaaa-mm-jj>-<lieu>.pdf`.

## Rapport de congrès

`/espace/actions/rapport` (app `actions`) : **1. Composer** (période, entreprise, secteur, permanent, inclure
les actions, inclure les fiches, brouillons compris) → **2. Choisir les éléments** (liste à cocher, tout coché
par défaut) → PDF. Bilan et chronologie seulement s'il y a des actions ; nouvelle partie « Actions syndicales en
entreprise et en secteur » (`BlocFicheRapport`, par secteur puis date : informations, titre, photo principale,
texte). Les fiches sont lues côté serveur (`chargerFichesRapport()`, service_role après `aApp("actions")`) ;
une fiche est retenue si sa période chevauche celle du rapport (`filtrerFiches()`). L'entreprise d'une action
étant un texte libre, le filtre entreprise la rapproche par le nom ; le filtre permanent ne vaut que pour les
fiches.

## Historique sur la fiche entreprise

Panneau « Fiches de suivi » (si la personne a l'app `permanents`) : fiches de l'entreprise, puis fiches
sectorielles de son secteur (repliées) ; bouton « Nouvelle fiche ».

## Tables (migration `supabase/migrations/20261013120000_site_fiches_suivi.sql`, exécutée par Fred le 13/10/2026 (vérifié : tables, bucket privé, 87 fiches sur 93 avec un secteur, clé publique refusée))

Détail : [base-de-donnees.md](base-de-donnees.md), section « Fiches de suivi ».
