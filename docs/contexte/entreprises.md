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
- **Remplissage initial par la migration** (Fred, 12 et 13/10/2026), à partir de son tableau
  `supabase/donnees/entreprises-2026-10-12.csv` (91 entreprises : n° BCE, ONSS et libellés, commentaire →
  notes ; noms identiques à CG Link) : **93 fiches**, chacune avec son site principal et ses ONSS (ceux du
  tableau, puis ceux de CG Link absents du tableau). Cas particuliers décidés par Fred :
  - **HEIDELBERG** (carrières) et **HEIDELBERG MATERIALS BENELUX** (construction) : même maison mère, même
    n° d'entreprise et même ONSS, mais deux entreprises (secteur, délégués et permanent différents) → deux
    fiches. D'où : `numero_bce` non unique, `numero_ue` unique **par fiche** ;
  - **XLG HOME**, rachetée par TRIXXO : pas de fiche ; regroupée dans TRIXXO (`autres_company_ids`) : ses
    562 affiliés s'additionnent à ceux de TRIXXO, ses délégués iront chez TRIXXO (lot B) ;
  - **IL&C LUXEMBOURG** (absente du tableau) : fiche ajoutée, n° BCE à compléter.
- Le tableau comporte aussi le **permanent** de chaque entreprise : non repris (déjà dans CG Link,
  `companies.permanent_name`).
- **Fiche créée à la première modification** d'une entreprise ajoutée ensuite dans CG Link (`ficheDeCle()` dans
  `app/espace/entreprises/actions.ts`) : fiche, site « Site principal », ONSS. Idempotent (`company_id`
  unique, `upsert … ignoreDuplicates`).

## Secteur, permanent et historique (13/10/2026, app Accès permanents)

- **Secteur** : `site_entreprises.secteur_id` (liste `site_secteurs`, celle des actions et des fiches de suivi),
  rempli par la migration `20261013120000` à partir de `companies.sector`, modifiable dans « Identité » ; le
  libellé de CG Link reste affiché à part (« CG Link : … »). Filtre « Secteur » de la liste sur cette liste
  (+ « Secteur à choisir »).
- **Permanent** : lu en direct dans CG Link (`permanent_name`, `permanent_email`, `permanent_whatsapp`), en
  lecture seule (il se change dans CG Link) : colonne de la liste, carte « Permanent » de la fiche (lien
  WhatsApp). Filtre **« Mes entreprises »** (périmètre du permanent : voir [permanents.md](permanents.md)),
  coché par défaut pour un PERMANENT (`?mes=1` / `?mes=0`).
- **Historique** : panneau « Fiches de suivi » (fiches de l'entreprise, puis fiches sectorielles de son
  secteur, repliées), visible avec l'app `permanents`.
- Avant la migration `20261013120000`, la colonne `secteur_id` manque : **l'app Entreprises ne s'ouvre plus**
  (lecture en erreur). Exécuter la migration avant de déployer.

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
- **Une seule unité** : la BCE écrit « **Une** unité d'établissement trouvée. » (et « Aucune » pour 0) au lieu
  d'un chiffre ; géré depuis le 13/10/2026 (31 entreprises sur 91 étaient en échec avant la correction).
- **Captcha anti-robot de la BCE** (constaté le 13/10/2026) : kbopub redirige une demande automatique sur deux
  environ vers `captchaform.html`, même espacée de 8 s. L'app ne le contourne pas : elle le reconnaît
  (`ERREUR_BCE_CAPTCHA`, message « vérification anti-robot, réessayez dans quelques minutes »). L'import groupé
  attend 3 s entre deux fiches, fait une pause de 30 s puis un seul nouvel essai en cas de captcha, et propose
  « Relancer les fiches en erreur ».
- **« Enregistrer tous les changements »** (13/10/2026, demande de Fred) : après la comparaison groupée, un
  bouton (avec confirmation) applique sur chaque fiche tout ce qui serait coché par défaut (dénomination,
  siège, unités nouvelles et modifiées), une fiche après l'autre, avec la même pause anti-robot ; le serveur
  relit la BCE avant d'écrire (`appliquerBce`). « Voir le détail » reste possible fiche par fiche. Piste durable si cela reste gênant : le fichier **Open Data de la BCE**
  (gratuit, inscription au SPF Économie, mise à jour mensuelle), sans captcha.
- Vérifié le 12/10/2026 : lecture réelle depuis le poste de dev. **Non vérifié** : la BCE répond-elle aux
  serveurs de Vercel ? Sinon, message « La BCE n'a pas répondu… » et saisie manuelle.

## Unités suivies (13/10/2026)

La BCE renvoie toutes les unités d'établissement, y compris hors de nos provinces. Case **« Suivie »** par
unité (`site_entreprise_unites.suivie`) : cochée par défaut si le code postal est dans la province de Namur
(5000-5999) ou de Luxembourg (6600-6999) (`dansNosProvinces()`), modifiable à la main. Les unités non suivies
restent sur la fiche dans un bloc replié « pour info » ; **seules les unités suivies apparaissent ailleurs**
(adresse postale d'un site, localités de la liste, rattachement d'un délégué au lot B). Migration
`20261013090000_site_unites_suivies.sql` (à exécuter par Fred).

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

**Migration exécutée par Fred le 13/10/2026** (SQL Editor ; le remplissage tient dans un seul bloc `do`,
car l'éditeur peut changer de connexion entre deux requêtes). Vérifié : 93 fiches, 93 sites principaux,
99 ONSS (6 avec libellé), XLG HOME sans fiche, clé publique refusée.
