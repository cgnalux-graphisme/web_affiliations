# App « Entreprises » : contexte

> Ramification de [CLAUDE.md](../../CLAUDE.md) (à la racine du projet). Créé le 12/10/2026.
> Spec : [docs/superpowers/specs/2026-10-12-entreprises-delegues-design.md](../superpowers/specs/2026-10-12-entreprises-delegues-design.md).
> Plan du lot A : [docs/superpowers/plans/2026-10-12-entreprises-lot-a.md](../superpowers/plans/2026-10-12-entreprises-lot-a.md).

## Rôle

Base de données des entreprises de l'Espace CG, socle des apps à venir (d'abord les **publipostages**).
Une fiche par entreprise : dénomination BCE, siège social, personne de référence, sites d'exploitation (UTE),
unités d'établissement, numéros ONSS, affiliés, délégués (lecture seule ; gérés par l'app « Gestion délégués
CG Link », lot B, à venir).

## Accès

App `entreprises` (couleur `#E69F00`, icône `building`, ordre 40) : SUPER_ADMIN, ADMIN_OP, PERMANENT, en
lecture et en écriture. **Les délégués n'y ont pas accès** (choix de Fred, 12/10/2026). Les pages appellent
`exigerApp("entreprises")`, les actions serveur `aApp("entreprises")`.

## Routes

| Route | Contenu |
|---|---|
| `/espace/entreprises/liste` | Toutes les entreprises CG Link + les fiches hors CG Link ; recherche (nom, n° BCE, ONSS, localité), filtre secteur, filtres « BCE non renseignée », « Hors CG Link », « Écarts CG Link » |
| `/espace/entreprises/nouvelle` | Fiche d'une entreprise absente de CG Link (nom, n° BCE facultatif) |
| `/espace/entreprises/<cle>` | Fiche : identité, siège + personne de référence + aperçu du bloc adresse, sites, unités, ONSS, affiliés. `<cle>` = id de `site_entreprises`, ou `c-<companies.id>` pour une entreprise CG Link qui n'a pas encore de fiche |
| `/espace/entreprises/<cle>/bce` | Import BCE : comparaison, cases à cocher, enregistrement |
| `/espace/entreprises/bce` | Import BCE de toutes les fiches qui ont un n° (une à la fois, 2 s entre deux), puis validation fiche par fiche |

Badge de la tuile : « N à compléter » = entreprises CG Link sans n° BCE.

## Sources des données

- **Lu en direct dans CG Link** (service_role, côté serveur) : nom (`companies.name`), secteur ; nombre
  d'affiliés actifs par type de contrat via la fonction `site_compter_affilies()` (appelée **avec la
  session** : elle vérifie elle-même l'app).
- **Repris de CG Link à la création de la fiche** : numéros ONSS (`onss`, `onss2..4` et leurs libellés),
  puis écarts signalés (« Reprendre » / « Ignorer », valeurs ignorées dans `site_ecarts_ignores`).
- **Propre à l'Espace** : tout le reste (tables ci-dessous).
- **Remplissage initial par la migration** (demandé par Fred le 12/10/2026) : une fiche, un site principal
  et les ONSS (chiffres seuls, libellés `onss2..4`) pour chacune des 94 entreprises de CG Link (99 ONSS).
- **Fiche créée à la première modification** d'une entreprise ajoutée ensuite dans CG Link (`ficheDeCle()` dans
  `app/espace/entreprises/actions.ts`) : fiche, site « Site principal », ONSS. Idempotent (`company_id`
  unique, `upsert … ignoreDuplicates`).

## Import BCE

- Pages publiques kbopub, en français : entité
  `zoeknummerform.html?nummer=<10 chiffres>&actionLu=Zoek&lang=fr` (dénomination, siège) ; unités
  `vestiginglijst.html?ondernemingsnummer=<sans 0 initial>&lang=fr&page=<n>` (20 par page).
- Code : `lib/bce/numero.ts` (format, clé modulo 97), `lib/bce/analyse.ts` (HTML → données, pur, testé sur
  des copies réelles dans `lib/bce/__fixtures__/`), `lib/bce/lecture-serveur.ts` (15 s par page, 20 pages
  au plus, erreurs traduites), `lib/bce/comparaison.ts` (différences et application des cases cochées).
- Pièges gérés : dates en toutes lettres (« 1 janvier 2022 ») ; localité collée devant la rue
  (« Libramont,Rue … ») ; boîte vide « . » ; apostrophes encodées.
- L'enregistrement **relit la BCE** côté serveur (on ne fait pas confiance aux données du navigateur) puis
  écrit **tout ou rien** par la fonction SQL `site_appliquer_bce()` (security invoker : RLS de la session).
  Budget de 45 s par lecture ; une liste d'unités incomplète est refusée ; le siège se remplace en bloc. Une
  nouvelle unité va au site principal. Rien n'est supprimé : une unité absente de la BCE est seulement
  signalée.
- Vérifié le 12/10/2026 : lecture réelle depuis le poste de dev. **Non vérifié** : la BCE répond-elle aux
  serveurs de Vercel ? Sinon, message « La BCE n'a pas répondu… » et saisie manuelle.

## Bloc adresse (publipostage)

`blocAdresse(entreprise, nomCgLink, site?, unites?)` (`lib/entreprises/regles.ts`) :

```
À l'attention de <personne de référence ou « Service Ressources Humaines »>
<fonction, si un nom est donné>
<dénomination BCE, sinon nom usuel, sinon nom CG Link>
<rue> <numéro>[ bte <boîte>]
<code postal> <localité>
```

Avec un site : sa personne de référence si renseignée, sinon celle de l'entreprise ; l'adresse de son unité
« adresse postale », sinon le siège. Adresse incomplète → lignes absentes + signal, jamais de texte inventé.

## Tables (migration `supabase/migrations/20261012120000_site_entreprises_delegues.sql`)

Voir le détail dans [base-de-donnees.md](base-de-donnees.md), section « Entreprises et délégués ».
Écritures de l'app : **avec la session** de la personne (`getSupabaseServer()`), la RLS
`site_a_app('entreprises')` s'applique. Exception : `site_ecarts_ignores`, écrit en service_role après
vérification du droit.

Suppression d'un site : le trigger `site_entreprise_sites_avant_suppression` refuse le site principal
(sauf suppression de l'entreprise entière) et déplace unités, ONSS et mandats vers le site principal dans la
même transaction. Pas de contrainte « nom obligatoire » en base (elle bloquerait la suppression d'une
entreprise dans CG Link) : l'app l'exige (`nomManquant()`).

**État de la migration au 12/10/2026 : écrite et commitée, pas encore appliquée** (Fred a refusé
l'application par l'outil Supabase depuis Claude Code ; à exécuter dans Supabase › SQL Editor). Tant
qu'elle n'est pas passée, l'app affiche « Les tables de l'app ne sont pas encore créées ».
