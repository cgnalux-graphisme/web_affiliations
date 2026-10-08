# Projet — Site & outil de com ACCG Nalux

> **Fichier de contexte partagé.** À garder à la racine du projet `web_affiliations`,
> à relire et à mettre à jour au fil de l'avancement. Il sert de mémoire commune
> entre Fred, Claude (sur claude.ai), Claude Code et l'assistant de Cursor.
>
> Dernière mise à jour : **08/10/2026**

---

## Vision

Transformer l'app `web_affiliations` en **site complet de l'ACCG Nalux** : vitrine
publique + démarches existantes + suivi des actions syndicales + blog d'analyses
+ publication sur les réseaux. Objectif : sortir la com syndicale de sa léthargie
et automatiser ce qui peut l'être — **avec Fred toujours dans la boucle de
validation** (rien ne se publie sans son OK, pour éviter toute désinformation).

---

## Architecture (décidée)

- **`web_affiliations`** (app Vercel, Next.js) = le **socle du nouveau site**. On
  l'étend, on ne la remplace pas. Elle garde ses démarches (affiliation, mandat
  SEPA, documents C1/C3.2, calcul de préavis), exposées sur le site.
- **CG Link** = app Vercel **distincte** (outil interne réservé aux délégués,
  permanents et administratifs). Reste séparée — on n'y touche pas côté
  fonctionnel.
- **Base de données** : une **seule** base Supabase, celle du projet **CG Link**
  (région Europe), partagée par les deux apps par économie d'abonnement.
  `web_affiliations` y est déjà branché. Les comptes (Supabase Auth) sont ceux de
  CG Link ; le rôle se lit dans `profiles.role`.
- **Nommage des tables** : préfixe **`site_`** pour les tables du nouveau site
  (comme `web_` pour web_affiliations, et les noms nus pour CG Link).
- **RÈGLE D'OR sécurité** : toutes les apps partagent les mêmes clés d'accès à la
  base. Ce qui protège chaque table, c'est sa **serrure (RLS)**. Le site public ne
  doit **jamais** pouvoir lire les tables sensibles (travailleurs, etc.). Chaque
  nouvelle table = RLS activé + politiques d'accès précises.
- **Pages publiques = vues `*_public` uniquement** (jamais les tables `site_*`
  directement) : elles ne renvoient que les actions publiées et les colonnes
  autorisées.
- Le 2ᵉ projet Supabase `accg-nalux-site` (créé le 22/09/2026) s'est révélé être un
  **doublon** → à supprimer.

### Plan du site (routes)

| Route | Accès | Rôle |
|---|---|---|
| `/` | public | Accueil (29/09/2026) : 1. ouverture = **mobilisation mise en avant** si la vue `site_accueil_mobilisation` renvoie une ligne (titre, date, lieu, chapô, image, compte à rebours, « Je m'inscris », « Pourquoi on se mobilise »), sinon l'ouverture habituelle ; 2. 4 dernières publications (pastilles) ; 3. démarches ; 4. 3 dernières actions passées (photos) |
| `/pourquoi-s-affilier` | public | (06/10/2026, maquette validée par Fred, textes repris tels quels) Page « motion design » en 4 temps. **De l'ombre à la lumière** (07/10/2026, Fred trouvait la version toute sombre « triste et austère ») : seule l'ouverture est en charbon (le moment où l'on est seul), puis un biais à 10° (l'angle de l'encart « FGTB » du logo) fait entrer la lumière et le reste est sur fond blanc avec aplats bordeaux / rouges. 1. « Seul, on subit. » + point rouge qui palpite dans un halo, entouré de points isolés pâles qui se rapprochent de lui au défilement (`PointsIsoles.tsx`) ; 2. phrase-pivot (mots allumés au défilement) + 4 preuves, chacune dans une mise en page différente (0 €, 145 € sur une bande bordeaux en biais à rayures qui glissent, banderole rouge penchée des secteurs qui avance **avec le défilement seulement**, 4 bureaux) ; fonds animés dans `Fonds.tsx`, **tous liés au défilement, aucune boucle** ; 3. foule en canvas **épinglée** sur fond blanc, points bordeaux et ardoise (`Foule.tsx`) : le point rouge rejoint par d'autres, compteur 1 → 25 000, légende « 1 point ≈ X affiliés » calculée, place vide « Il ne manque que vous » ; 4. bloc rouge « Ensemble, on décide. » sur photo en bichromie. Photos réelles lues dans `site_photos_public` (choix dans `PHOTOS`, `lib/pourquoi-s-affilier.ts` ; absentes = page sans photo). **Aucun tiret cadratin** sur la page, titre d'onglet compris (demande de Fred). Mouvement réduit : état final d'emblée (règles CSS, même rendu serveur) |
| `/mobilisation/<slug>` | public | Page campagne de la mobilisation mise en avant (seulement elle, via la vue ; sinon 404) : en-tête bordeaux, compte à rebours, pourquoi, « Ce qu'on demande », « Comment y aller », « Je m'inscris » répété (+ barre fixe sur mobile), partage par le visiteur |
| `/actions` | public | Vitrine des actions publiées (frise + « unes ») |
| `/actualites` | public | **Page unifiée** (29/09/2026) : articles du blog **et** explications mélangés, du plus récent au plus ancien (le plus récent en grand) ; pastille de rubrique sur chaque photo ; sélecteur à segments « Tout · Actualités · On vous explique » filtré dans le navigateur (`?rubrique=actualites` / `on-vous-explique` pré-applique le filtre) |
| `/blog`, `/on-vous-explique` | public | Redirigées (308, `next.config.ts`) vers `/actualites?rubrique=…` |
| `/blog/<slug>` | public | Un article : pastille « Actualité », encart « En bref », chapô, image, contenu, sources |
| `/on-vous-explique/<slug>` | public | Une explication : même mise en page, pastille « On vous explique » |
| `/demarches` | public | Toutes les démarches en ligne (tuiles, l'affiliation en tête) |
| `/contact` | public | (29/09/2026) **Nos bureaux** (4 bureaux de `lib/bureaux.ts` : bascule année / été, statut « ouvert maintenant » + « Ferme à… / Ouvre… » (`prochainChangement()`), résumé « En ce moment », Appeler, Itinéraire, **cartes Google Maps affichées directement si le visiteur a accepté les cookies**, sinon plan décoratif + « Afficher les cartes » (= accepter) ; cartes **en couleurs d'origine** (choix de Fred du 29/09/2026 : exception à la règle vert / bleu, c'est un contenu de Google)) · **Nous joindre** (e-mail + copier, WhatsApp, réseaux de `app/ReseauxSociaux.tsx`) · **formulaire de contact** |
| `/api/contact` | public | Formulaire de contact (POST `{ nom, email, sujet, message, site_web }`) → un e-mail Resend vers `cg.nalux@accg.be`, « Répondre à » = le visiteur. Validation `lib/contact.ts` (partagée navigateur / serveur) ; champ piège `site_web` rempli = réponse « succès » sans envoi ; **rien d'enregistré**, contenu jamais journalisé |
| `/mentions-legales`, `/vie-privee`, `/cookies` | public | Pages légales (29/09/2026 ; politique cookies réécrite et vie privée complétée — formulaire de contact, Google Maps — le même jour) : texte repris **tel quel** de `PAGES-LEGALES.md` (sans ses notes internes « à faire valider »), mise en page commune `app/PageLegale.tsx`. **Validés par Fred le 29/09/2026.** Modifier le texte = modifier `PAGES-LEGALES.md` **et** la page |
| `/statuts` | public | Statuts de la régionale (01/10/2026) : texte repris **tel quel** du document officiel (`statuts.pdf` transmis par Fred), **ne jamais le reformuler ni le corriger** ; mise en page propre (sommaire collant par chapitre, articles en deux colonnes). Lien dans le pied de page et dans la case « Accord général » du formulaire d'affiliation (nouvel onglet) |
| `/affiliation`, `/mandat-sepa`, `/formulaire-c1`, `/formulaire-c3-2`, `/preavis`, `/parcours-transfert` | public | Formulaires existants |
| `/changement-situation` | public | (07/10/2026) **Signaler un changement** (`FormulaireModification.tsx`, règles `lib/modification.ts`) : 4 étapes (Vous : nom, prénom, NISS, e-mail · Ce qui change : adresse, e-mail / téléphone, employeur, régime, situation professionnelle, plusieurs choix · Le détail, date « à partir du » par bloc · Signature). Employeur : nom obligatoire, ONSS / TVA, localité et CP facultatifs ; régime : temps plein ou temps partiel + moyenne d'heures / semaine (1 à 38) ; situation : nouvelle profession (+ CP), chômage ou mutuelle. Dates « à partir du » et de signature pré-remplies au jour (modifiables). Conception : `docs/superpowers/specs/2026-10-07-formulaire-modification-design.md`. **Transfert** : CP « 000 - Autre » → `a_organiser` (« nous nous chargeons de votre transfert, votre nouvelle centrale prendra contact avec vous »), « Je ne sais pas » → `a_verifier`, sinon `non` (`statutTransfert()`). PDF « Registre » d'une page (bloc « Nos bureaux »), table `web_modifications`, e-mail `/api/send-modification` |
| (adresse inconnue) | public | Page 404 du site (`app/not-found.tsx`, 30/09/2026) : « 404 · Page introuvable » au style des autres pages + liens vers les rubriques ; sert aussi aux `notFound()` (article, explication, mobilisation introuvables) |
| `/api/assistant` | public (si `chatbot_actif` = `on`) | **Assistant CG**, un tour de conversation (POST `{ etat, tours, message }` ou `{ etat, action }`) → `{ etat, blocs }` écrits par le code. 30 messages / 10 min / IP, 500 caractères, 20 messages par conversation. Rien n'est enregistré |
| `/api/assistant/transmettre` | public (si `chatbot_actif` = `on`) | « Transmettre ma demande » (jamais d'IA) : destinataire recalculé côté serveur, ligne dans `site_chatbot_demandes` (service_role), e-mail Resend **sans registre national** ; « Répondre à » = la personne et bouton « Répondre à <prénom nom> » (mailto, objet prérempli) qui ouvre un nouveau message dans Outlook (demande de Fred, 08/10/2026). Champ piège `site_web`, 5 demandes / heure / IP |
| `/login` | public | Connexion (identifiants CG Link) |
| `/suivi-actions` | SUPER_ADMIN | **Tableau de bord** : une tuile par domaine (Scan News, Démarches affiliés, Actions syndicales, Publications) avec les chiffres clés ; chaque tuile ouvre sa section |
| `/suivi-actions/actions` | SUPER_ADMIN | Liste de toutes les actions (publiées ou non) — avant le 28/09/2026, elle était à `/suivi-actions` |
| `/suivi-actions/nouvelle` | SUPER_ADMIN | Encoder une action |
| `/suivi-actions/<id>/modifier` | SUPER_ADMIN | Modifier / supprimer une action |
| `/suivi-actions/rapport` | SUPER_ADMIN | Rapport d'activité PDF (congrès) |
| `/suivi-actions/demandes` | SUPER_ADMIN | Back-office des demandes : historique des formulaires par type (onglets), recherche, dates, tri, pagination |
| `/suivi-actions/demandes/<type>/<id>` | SUPER_ADMIN | Une demande : toutes ses informations, signature, « Régénérer le PDF » + « Télécharger » |
| `/suivi-actions/articles` | SUPER_ADMIN | Liste des articles (brouillons et publiés) : modifier, publier / dépublier, supprimer |
| `/suivi-actions/articles/nouveau` | SUPER_ADMIN | Écrire un article ; `?veille=<id>` pré-remplit depuis un article du fil, `?analyse=<id>&sujet=<n>` depuis un sujet du Check IA (toutes ses sources) ; `&ia=1` met le focus sur le panneau de rédaction assistée |
| `/suivi-actions/articles/<id>/modifier` · `/apercu` | SUPER_ADMIN | Modifier / supprimer ; aperçu tel que sur le site (brouillon compris) |
| `/suivi-actions/explications` | SUPER_ADMIN | Liste des explications (« On vous explique ») : modifier, publier / dépublier, réseaux, supprimer |
| `/suivi-actions/explications/nouvelle` | SUPER_ADMIN | Importer une note FGTB (.docx / .pdf) à vulgariser → formulaire d'article pré-rempli (categorie `explication`) |
| `/suivi-actions/articles/<id>/reseaux` | SUPER_ADMIN | Déclinaison d'un article publié en posts Facebook, Instagram, TikTok, YouTube : générer, modifier, enregistrer, copier |
| `/suivi-actions/veille` | SUPER_ADMIN | **Scan News › Le fil** : barre d'état (fil rafraîchi à…, Check IA de…) + « Rafraîchir » et « Check IA », puis **deux onglets** : `?vue=check` = Check IA en « conférence de rédaction » (défaut s'il existe un classement), `?vue=fil` = les articles ramassés (filtres pertinence / statut / source, ignorer, rédiger, brouillon IA) |
| `/suivi-actions/sources` | SUPER_ADMIN | Flux RSS de la veille : ajouter, modifier, activer / désactiver, supprimer |
| `/suivi-actions/themes` | SUPER_ADMIN | Mots-clés de pertinence de la veille : ajouter, activer / désactiver, supprimer |
| `/suivi-actions/mobilisations` · `/nouvelle` · `/<id>/modifier` · `/<id>/apercu` | SUPER_ADMIN | Mobilisations (manifs, grèves à venir) : créer, modifier, supprimer, interrupteur « mise en avant » (une seule à la fois), aperçu de la page campagne, « pourquoi » rédigé par l'IA |
| `/suivi-actions/chatbot` | SUPER_ADMIN | **Demandes chatbot** : filtre par statut (`?statut=nouveau` / `en_cours` / `traite`), changement de statut, suppression, registre national masqué (••••) et lu seulement au clic « Afficher » (server actions, service_role) ; `?id=` met une demande en évidence (lien de l'e-mail) |
| `/suivi-actions/parametres-site` | SUPER_ADMIN | Paramètres du site : interrupteur « Afficher le bloc mobilisation sur l'accueil » (`site_parametres`, clé `accueil_mobilisation`, `on` / `off`) et interrupteur « Afficher l'Assistant CG » (clé `chatbot_actif`) |
| `/api/mobilisations/analyse` | SUPER_ADMIN | Textes collés (articles, tracts, communiqués) → tous les champs d'une nouvelle mobilisation proposés par Claude Sonnet 5 (POST `{ textes }`), rien n'est enregistré |
| `/api/mobilisations/pourquoi` | SUPER_ADMIN | « Pourquoi on se mobilise » rédigé par Claude Sonnet 5 depuis les points de Fred (POST `{ points, titre?, date?, lieu?, revendications? }`), rien n'est enregistré |
| `/suivi-actions/parametres` | SUPER_ADMIN | Paramètres : adresses internes qui reçoivent chaque envoi automatique des formulaires (ajouter, activer / désactiver, supprimer) |
| `/api/send-modification` | public | E-mail « Changement de situation » (PDF joint) à l'affilié (adresse actuelle + nouvelle si donnée) et aux adresses internes de l'envoi `modification` ; le serveur recalcule récapitulatif et transfert depuis les données reçues |
| `/api/admin/demandes` | SUPER_ADMIN | Liste d'un type de demande (GET `?type=&q=&du=&au=&tri=&page=`) — clé service_role |
| `/api/admin/demandes/<type>/<id>` · `/pdf` · `/liees` · `/envois` | SUPER_ADMIN | Détail complet d'une demande ; PDF C1 / C3.2 rempli côté serveur ; demandes de la même personne ; historique des e-mails |
| `/api/image-distante` | SUPER_ADMIN | Télécharge une image glissée depuis une autre page web (POST `{ url }`) |
| `/api/redaction/lisibilite` | SUPER_ADMIN | L'IA peut-elle lire l'article ? Vérification gratuite du `robots.txt` du média (GET `?veilleId=`) ; renvoie aussi l'adresse réelle (alerte Google résolue) |
| `/api/redaction/brouillon` | SUPER_ADMIN | Brouillon d'article proposé par Claude Sonnet 5, une ou plusieurs sources (POST `{ veilleIds, lire?, textes?, notes?, consignes? }`) |
| `/api/redaction/note` | SUPER_ADMIN | Note FGTB (multipart, champ `fichier`) → texte extrait, vulgarisé par Claude Sonnet 5, fichier archivé dans `notes-sources` |
| `/api/reseaux/declinaison` | SUPER_ADMIN | Posts réseaux proposés par Claude Sonnet 5 (POST `{ articleId, reseau? }` ; sans `reseau` = les 4) |
| `/api/veille/ramasser` | CRON_SECRET ou SUPER_ADMIN | Ramassage des flux + purge des articles de plus de 3 jours (POST = bouton « Rafraîchir maintenant ») |
| `/api/logo-media` | SUPER_ADMIN | Logo d'un média (GET `?domaine=`) : icône récupérée sur le site du média lui-même (`lib/logo-media.ts`), 404 sans logo |
| `/api/veille/analyse` | cron ou SUPER_ADMIN | **Check IA** : GET = Vercel Cron (6 h et 7 h UTC : ramassage + purge, puis analyse seulement s'il est 8 h à Bruxelles) ; POST = bouton (fil rafraîchi depuis moins de 2 h) |

**Consentement aux cookies** (29/09/2026, demandes de Fred) : deux catégories soumises à l'accord,
**cartes Google Maps** (`/contact`) et **vidéos YouTube** (`/actions` : sans accord, ni miniature ni
lecteur ; « Autoriser YouTube et lire » = accord vidéos seulement). Choix dans le stockage local
(`accg-consentement`, `lib/consentement.ts`, `{ cartes, videos }`), valable 6 mois, redemandé si
`VERSION_CONSENTEMENT` change (à augmenter si une catégorie est ajoutée ; 2 depuis l'ajout des vidéos).
- **Pop-up** (`app/ConsentementCookies.tsx`, dans le layout) **réduit au strict minimum** : icône +
  « Vos cookies, vos choix », petit lien « En savoir plus » (→ `/cookies#reglages`), « Refuser » et
  « Tout accepter » (toutes les catégories d'un coup), même bouton bordeaux pour les deux. Seulement
  tant qu'aucun choix n'est fait ; masqué sur `/cookies`, dans l'admin et sur `/login`.
- **Réglages détaillés** sur `/cookies#reglages` (`app/cookies/ReglagesCookies.tsx`) : chaque élément
  stocké (nom, rôle, fournisseur, type, durée) avec son interrupteur, enregistré dès qu'on le bascule ;
  indispensables verrouillés « Toujours actif » ; « Tout refuser » / « Tout accepter ». Liste unique :
  `ELEMENTS_COOKIES` (`lib/consentement.ts`). « Gérer les cookies » (pied de page) mène à ces réglages.
- Hook `useConsentement()` / `autoriser()` / `enregistrerChoix()` (`app/useConsentement.ts`).
  **Rien de tiers ne se charge avant l'accord.** Tout nouveau service tiers ou tout nouvel élément
  stocké = l'ajouter à `ELEMENTS_COOKIES` (et à une catégorie si besoin) et à `PAGES-LEGALES.md`.

Navigation publique (ordre du 29/09/2026, + « Pourquoi s’affilier » en 2e position le 06/10/2026 ; liens resserrés entre 1024 et 1280 px pour tenir sur une ligne) : Accueil · Pourquoi s’affilier · Actualités (une seule entrée
pour le blog et « On vous explique », active aussi sur `/blog/…` et
`/on-vous-explique/…`) · Nos actions · Démarches en ligne · Contact + bouton
« S'affilier ». **Bandeau d'alerte** (`app/BandeauMobilisation.tsx`, dans le
layout) au-dessus de la navigation de toutes les pages publiques quand la vue
`site_accueil_mobilisation` renvoie une ligne ; refermable (mémorisé pour la
session, par mobilisation) ; masqué dans l'espace admin, sur `/login` et sur la
page campagne. Les formulaires sont **regroupés** sous « Démarches en
ligne » (pas un onglet par formulaire). Rubrique à venir : « Trouver votre
contact » (permanent et juriste par secteur / commission paritaire). Toute la
gestion (actions, articles, Scan News, demandes, paramètres) vit sous
`/suivi-actions/…` pour profiter du même verrou super admin (proxy + layout +
chaque page).

**Menu de l'espace admin** (`app/suivi-actions/MenuAdmin.tsx`, refonte du
28/09/2026) : Tableau de bord, puis sections titrées — **Actions syndicales**
(Toutes les actions · Nouvelle action · Rapport d'activité), **Publications**
(Articles · Écrire un article · On vous explique · Importer une note), **Scan News** (Le fil · Sources · Thématiques),
**Démarches affiliés** (Demandes · Demandes chatbot) — « Mobilisations » est dans Actions syndicales —
et, séparés en pied : Paramètres du site, Paramètres des envois,
compte connecté, Se déconnecter. Mobile : bouton « Menu ». Lien actif = barre
rouge sur un rail ardoise.

**Nom « Scan News »** (ex-« veille ») partout à l'écran : **Scan News** = la
section ; **Le fil** = son écran de consultation des articles ramassés. Les
écrans de la section portent le repère « Scan News » au-dessus de leur titre
(`RepereSection.tsx`). Le code, les tables (`site_veille`…) et les adresses
(`/suivi-actions/veille`, `/api/veille/ramasser`) gardent « veille ».

**L'affiliation est la démarche la plus importante** : grande tuile bordeaux en
tête de la grille des démarches (`app/TuilesDemarches.tsx`) et bouton
« S'affilier » dans la barre de navigation.

**Grille des démarches** (refonte du 07/10/2026, demande de Fred : plus de tuile seule sur sa
ligne) : grand écran sur 4 colonnes = affiliation 2 × 2 + 4 tuiles carrées (Changer de syndicat,
Signaler un changement, Mandat SEPA, Calcul préavis), puis C1 et C3.2 en tuiles larges côte à côte
(listes `CARREES` / `LARGES` : une démarche ajoutée doit y trouver sa place). Chaque tuile a son
icône (`Icon` de `app/forms.ts`). Seul geste fort : la **bande rouge à 10°** du logo qui traverse le
bas de la tuile S'affilier (décor, jamais sous le texte : `pb-44`). Animations (`globals.css`,
« Démarches en ligne ») : la bande glisse en place et les tuiles montent en cascade, une fois
(`entree="chargement"` sur `/demarches`, animation dès le premier affichage ; à l'entrée à l'écran
sur l'accueil) ; au survol, tuile soulevée, icône basculée à 10° et remplie, filet rouge en biais
sous la tuile. Aucune boucle, rien en mouvement réduit.

---

**Assistant CG** (chatbot d'aiguillage, 08/10/2026, branche `chatbot`, demande de Fred) : bulle
« Une question ? » en bas à droite de toutes les pages publiques (`app/AssistantCG.tsx`, dans le layout ;
**pastille blanche bordée de charbon** pour rester visible sur les fonds bordeaux (refonte du 08/10/2026,
demande de Fred), tuile rouge inclinée à 10° (encart « FGTB » du logo) qui salue avec une onde rouge 3 fois
espacées de 8 s puis s'arrête, se redresse au survol, rien en mouvement réduit ;
masquée dans l'admin et sur `/login` ; plein écran sur mobile ; Échap, focus piégé, `role="log"`).
**Règle n° 1 : il oriente, il ne répond JAMAIS sur le fond** (ni conseil juridique, ni montant, ni délai,
ni interprétation). **L'IA classe, le code décide** : Claude Sonnet 5 (`lib/assistant-ia.ts`, effort `low`,
3 000 jetons max) ne rédige aucun texte affiché ; il remplit une fiche à valeurs fermées tirées de la base
(catégorie, code postal, secteur, statut ouvrier / employé, commission paritaire, affilié, demande sur le
fond, résumé), revérifiée par `verifierExtraction()`. Tous les textes et contacts viennent du code
(`lib/assistant-parcours.ts`, fonctions pures testées) et des tables `site_chatbot_*`. Parcours : code postal
d'abord (5000-5999 Namur, 6600-6999 Luxembourg, sinon lien `accg.be/fr/sections`) → chômage = **les deux antennes
les plus proches** (demande de Fred, 08/10/2026 ; `lib/assistant-antennes.ts`, tranches de codes postaux
**validées par Fred le 08/10/2026** ; code postal sans tranche = toutes les antennes de la province) + My FGTB,
sans transmission → secteur d'une autre centrale = sa fiche, sans transmission ; **secteurs transférés à
l'Horval** (`SECTEURS_TRANSFERES` / `CP_TRANSFERES`, CP 132, 144, 145 et 146 « résiduel », confirmé par Fred
le 08/10/2026 : Agriculture → CP 144 ; Horticulture, Floriculture, Pépinières, Maraîchers, Parcs et jardins,
Fruiticulture → CP 145 ; Entreprises forestières, Sylviculture → CP 146 ; CP 132 repérée par sa commission,
choisie dans la liste ou reconnue par l'IA) : historiquement à la Centrale Générale, passés à l'Horval lors de
la répartition FGTB ; l'assistant demande « Êtes-vous déjà
affilié(e) à la Centrale Générale ? » : oui = reste CG (CP « résiduel », 1re ligne), non = fiche Horval; **nettoyage : c'est l'employeur qui compte** (précision de Fred, 08/10/2026) : la
Centrale Générale ne couvre que les entreprises de nettoyage (CP 121, même chez un client hôpital ou école) et
les titres-services (CP 322,01). Dire seulement *où* l'on nettoie ne suffit pas : l'assistant demande « Qui est votre
employeur ? Par exemple : une société de nettoyage, un hôpital, un hôtel… » (entreprise de nettoyage → CP 121 ; titres-services → CP 322,01 ; directement le lieu → « Où
travaillez-vous ? » : hôtel / restaurant → Horval, commune / CPAS / hôpital public → CGSP, autre employeur ou
lieu non reconnu → accueil `cg.nalux@accg.be`, sans question « affilié ») ; la question est aussi posée quand
la CP 121 est choisie dans la liste (`normaliser()`, `EtatAssistant.employeurNettoyage`) → démarche en ligne = lien direct → juridique = 1re ligne de
`site_chatbot_repartition` (région + CP ; secteur introuvable après 2 tentatives → `cg.nalux@accg.be`),
question « affilié ? » (non = message affiliation + arriérés, transmission quand même) → administratif /
prime syndicale = `admin.nalux@accg.be` → autre = `cg.nalux@accg.be`. Demande sur le fond ou manipulation
→ « Je ne peux pas répondre à cette question, mais je peux vous orienter… » puis orientation normale.
Les adresses des personnes (1re ligne) ne sont **jamais affichées** ; seules les adresses génériques le sont.
**Confidentialité** : l'IA ne reçoit que la conversation, **masquée côté serveur** (registre national,
IBAN, e-mail, téléphone : `masquerDonneesSensibles()`) ; aucune conversation enregistrée ; seules les
demandes transmises sont gardées. **Le registre national ne passe jamais par l'IA ni par e-mail** : saisi
uniquement dans la fenêtre de transmission (`app/FenetreTransmission.tsx`, facultatif, modulo 97 avec
naissances à partir de 2000), stocké dans `site_chatbot_demandes`, visible seulement dans le back-office.
Interrupteur `site_parametres.chatbot_actif` (`on` / `off`, **laissé sur `off`**, Fred l'activera) : coupé =
pas de bulle et routes `/api/assistant…` en 404 ; **en développement local, toujours visible**
(`assistantActif()`). Limitation par IP en mémoire (`lib/limite-requetes.ts`, au mieux, par instance).
Fichiers sources des contacts : `docs-internes/` (hors de `public/`, ignoré par Git, jamais commités).

## Base de données — tables du site

Créées le **24/09/2026** dans la base CG Link :

| Objet | Rôle | Accès |
|---|---|---|
| `site_secteurs` | Liste modifiable des secteurs (11 pré-remplis) | Lecture publique, ajout super admin |
| `site_actions` | Les actions syndicales (suivi + rapport de congrès) | Super admin (lecture/écriture) |
| `site_photos` | Photos rattachées à chaque action (`action_id`, `url`, `legende`) | Super admin |
| `site_videos` | Vidéos YouTube d'une action (`action_id`, `url`, `titre`) | Super admin |
| `site_actions_public` | Vue : actions publiées, colonnes autorisées (l'entreprise seulement pour un piquet) | Lecture publique |
| `site_photos_public` / `site_videos_public` | Vues : photos / vidéos des actions publiées | Lecture publique |
| Bucket `action-photos` | Fichiers photo (public en lecture) | Écriture super admin |

`site_photos` et `site_videos` → `site_actions` en `ON DELETE CASCADE`.

Blog (créés côté Supabase avant le 28/09/2026, aucune migration dans le dépôt) :

| Objet | Rôle | Accès |
|---|---|---|
| `site_articles` | Articles du blog **et** explications (« On vous explique »), distingués par `categorie` | Super admin (lecture/écriture) |
| `site_articles_public` | Vue : articles publiés (sans `statut`, `created_at`, `updated_at`), **avec `categorie`** | Lecture publique |
| Bucket `blog-images` | Images de couverture (public en lecture) | Écriture super admin |
| Bucket `notes-sources` | **Privé** : notes FGTB d'origine des explications (traçabilité interne) | Lecture et écriture **côté serveur uniquement** (service_role) |

`categorie` et `document_source` ajoutés par Fred avant le 29/09/2026 (aucune
migration dans le dépôt) : `categorie` = `article` (défaut, blog) ou `explication`
(On vous explique) ; `document_source` = chemin de la note dans `notes-sources`
(`<aaaa>/<uuid>-<nom>.docx|pdf`).

Veille (créés côté Supabase avant le 28/09/2026) :

| Objet | Rôle | Accès |
|---|---|---|
| `site_sources` | Flux RSS suivis : `nom`, `url_flux`, `actif` | Super admin |
| `site_themes` | Mots-clés de pertinence : `mot_cle`, `actif` (pré-remplie) | Super admin |
| `site_veille` | Articles ramassés : `source_id`, `source_nom`, `titre`, `resume`, `lien` (**index unique**), `date_publication`, `statut` (`nouveau` / `traite` / `ignore`) | Super admin ; écriture du ramassage en service_role |
| `site_veille_analyses` | Classements « Check IA » : `origine` (`manuel` / `auto`), `nb_articles`, `resultat` (jsonb, `ResultatAnalyse` de `lib/veille-tri.ts`), `modele`, `created_at` ; purgés après 7 jours | Lecture super admin ; écriture et purge **uniquement** en service_role |

Migration `supabase/migrations/20261001090000_site_veille_analyses.sql` **demandée par Fred le
01/10/2026** (idempotente), **exécutée par Fred le 01/10/2026**. Si la table manquait, le fil
s'afficherait normalement mais « Check IA » échouerait à l'enregistrement (message clair).
`site_parametres` reçoit aussi la clé `veille_dernier_ramassage` (date ISO du dernier ramassage,
écrite en service_role).

Mobilisations (créés par Fred avant le 29/09/2026, aucune migration dans le dépôt ;
colonnes relevées par l'OpenAPI de PostgREST) :

| Objet | Rôle | Accès |
|---|---|---|
| `site_mobilisations` | `titre`, `slug`, `date_evenement` (timestamptz ; saisie `jj/mm/aaaa` + `hh:mm` à l'heure de Bruxelles, `versHorodatage()`), `lieu`, `chapo`, `image_hero` (bucket `blog-images`, `mobilisations/<id>/hero-<uuid>.jpg`), `pourquoi` (texte, paragraphes séparés par une ligne vide), `revendications` et `infos_pratiques` (une ligne par élément ; « Libellé : détail » met le libellé en gras), `lien_inscription` (formulaire FGTB fédérale, http(s)), `actif` (défaut false), `created_at`, `updated_at` | Super admin |
| `site_parametres` | `cle` (clé primaire), `valeur`, `updated_at` ; `accueil_mobilisation` = `on` / `off` | Super admin |
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
| `site_publications_reseaux` | Posts déclinés d'un article : `article_id` (→ `site_articles`), `reseau` (`facebook` / `instagram` / `tiktok` / `youtube`), `contenu`, `statut` (défaut `brouillon`, non utilisé par le code), `created_at`, `updated_at` | Super admin |

Colonnes relevées par l'OpenAPI de PostgREST ; aucune contrainte d'unicité visible sur (`article_id`, `reseau`) : le code met à jour la ligne la plus récente, sinon en insère une. YouTube : titre sur la 1re ligne, ligne vide, puis description (`composerYoutube()` / `lireYoutube()`, `lib/reseaux.ts`). Si la base contraint `reseau` à d'autres valeurs, adapter `RESEAUX`.

Assistant CG (**créées et remplies directement dans Supabase par Fred le 07/10/2026**, aucune migration dans
le dépôt ; **ne pas modifier le schéma**). `anon` n'a aucun droit (vérifié le 08/10/2026) : lecture et écriture
**uniquement côté serveur, en service_role** (`lib/assistant-donnees.ts`, cache mémoire 5 min) :

| Objet | Rôle | Accès |
|---|---|---|
| `site_chatbot_repartition` | `region` (Namur / Luxembourg), `cp_code`, `cp_nom`, `contact_nom` / `contact_email` / `contact_tel` (= la **1re ligne**, qui reçoit les questions juridiques), `permanent_nom` / `permanent_email` (**jamais lus par le chatbot**), `actif` ; 76 lignes au 08/10/2026 (conformes à `Répartition des secteurs 2025.xlsx`) | service_role |
| `site_chatbot_secteurs` | `mot_cle`, `centrales` (plusieurs séparées par « ; »), `remarque` (arbitrages) ; 79 lignes | service_role |
| `site_chatbot_centrales` | Coordonnées des centrales FGTB par province (17 lignes) | service_role |
| `site_chatbot_antennes` | Antennes chômage FGTB par province (10 lignes, pas d'e-mail : contact écrit par My FGTB) | service_role |
| `site_chatbot_demandes` | Demandes transmises : `nom`, `prenom`, `email`, `message`, `code_postal`, `region`, `categorie`, `cp_code`, `affilie`, `registre_national`, `destinataire_email`, `service_nom`, `statut` (défaut `nouveau` ; le code utilise aussi `en_cours` et `traite`, **non vérifié contre une éventuelle contrainte**), `created_at` | service_role (route de transmission, back-office) |

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
  disponibles. Ne jamais utiliser de vert ni de bleu pour autre chose.
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
modifier, pas de migration.** **À signaler à Fred** (relevé le 07/10/2026) : sur
`web_mandats_sepa` et `web_c1` (et sans doute les autres anciennes `web_*`), la
politique `auth_select` laisse **tout compte connecté** (délégué CG Link compris)
lire ces tables, NISS et IBAN compris ; et `anon` / `authenticated` ont tous les
droits SQL (la RLS seule protège). À resserrer sur demande de Fred.

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
| `site_destinataires` | Adresses internes par envoi : `envoi` (`affiliation`, `sepa`, `changement`, `c1`, `c32`, `parcours_onem`, `modification` depuis le 07/10/2026), `email` (minuscules, unique par envoi), `actif` ; pré-remplie avec les adresses du code au 28/09/2026 | Super admin (lecture / écriture) ; lue par les routes d'envoi en service_role |
| `site_envois_mails` | Journal : une ligne par demande et par destinataire (`demande_type`, `demande_id`, `envoi` ou `copie_personnelle`, `destinataire`, `sujet`, `statut` `envoye` / `echec`, `resend_id`, `erreur`) | Lecture super admin ; écriture **uniquement** en service_role (aucune politique d'écriture) |

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

---

## Sécurité base de données — correctifs déjà appliqués côté Supabase (invisibles depuis le code)

Appliqués directement dans la base CG Link, sans migration dans ce dépôt (seule
exception : la migration des envois, voir plus haut, demandée par Fred).
**Ne pas créer de migration** sans demande explicite de Fred.

- **Rôles dans `profiles`** : le trigger `trg_site_protect_profiles_role` (fonction
  `site_protect_profiles_role`) empêche tout utilisateur connecté qui n'est pas
  `SUPER_ADMIN` de changer un rôle dans `profiles`. Vérifié par test : la promotion
  abusive est bloquée. **Ne pas re-signaler comme faille ouverte.**
- **Vues `*_public`** : lecture seule pour `anon` et `authenticated` (droits
  d'écriture révoqués, seul `SELECT` reste accordé).
- **Écriture sur `site_*`** : réservée aux super admins via `site_is_super_admin()`.
- **Bucket `action-photos`** : la policy `site_actions_photos_select` (SELECT réservé
  aux super admins) **existe déjà** côté base, en plus d'INSERT / UPDATE / DELETE.
  Elle permet `remove` et `move` (suppression et réordonnancement des photos).
  **Ne plus la redemander.**
- **Reste à faire** (non critique, à planifier) : resserrer les politiques
  d'écriture globales sur `profiles`. Un utilisateur connecté peut encore modifier
  ou supprimer d'autres fiches que la sienne.

---

## Les phases

### Phase 0 — Fondations
- [x] Base de données prête (tables `site_*` dans CG Link)
- [ ] Supprimer le projet Supabase doublon `accg-nalux-site`
- [~] Partie publique du site : accueil, `/demarches`, `/actions`, `/actualites`
      (blog + « On vous explique »), `/contact` et pages légales (validées par Fred) faits ; **manque** la présentation
- [ ] « Trouver votre contact » → voir Phase 4, lié à l'assistant-aiguilleur
- [x] Refonte graphique « direction D » (éditorial + modulaire, sans fond noir) —
      voir Conventions > Design
- [ ] Rebrancher le domaine du site (quitter e-monsite) — plus tard. **Attention** : le PDF
      d'affiliation et les e-mails citent **`accg-nalux.be`** (choix de Fred du 01/10/2026 pour
      l'adresse des statuts : `www.accg-nalux.be/statuts`), alors que les exemples de `SITE_URL`
      citent `accg-nalux.com`. À trancher au branchement du domaine ; la page `/statuts` doit
      répondre à l'adresse imprimée dans les PDF.

### Phase 1 — Suivi des actions *(fonctionnel sur la branche `suivi-actions`)*
- [x] Tables, vues et bucket
- [x] Connexion `/login` (Supabase Auth) + verrou `SUPER_ADMIN` (proxy + layout +
      chaque page)
- [x] Formulaire d'encodage et de modification (`FormulaireAction`) : nom, date,
      type (+ détail), secteur, front commun, entreprise, déplacement, description,
      participants, photos, vidéos, info web, publication
- [x] Liste de gestion, modification, suppression
- [x] Vitrine `/actions` : frise chronologique (une ligne = une année, curseurs
      d'année, clic = défilement vers la une `#une-<id>`), unes avec photos
      (galerie + agrandissement) et vidéos
- [x] Rapport d'activité (congrès) en PDF : période au choix, toutes les actions,
      bilan en chiffres, graphiques, chronologie détaillée avec photo principale

### Phase 2 — Veille + blog *(fonctionnel sur `suivi-actions`, 28/09/2026)*
Principe : veille sur des sources belges fiables → tri → brouillon (à la main ou
avec l'IA) → **Fred vérifie, corrige et valide** → publication. Droit d'auteur :
reformuler, citer et lier la source, jamais recopier.

#### Blog (Actualités)
- [x] Gestion admin : liste (brouillons et publiés), éditeur riche Tiptap (gras,
      sous-titres, listes, liens, citations), image de couverture, sources,
      brouillon / publié, date `jj/mm/aaaa`, aperçu, suppression.
- [x] Pages `/blog` et `/blog/<slug>` (encart « En bref » sous le titre, temps de
      lecture), lien « Actualités » dans la navigation et le pied de page.
- Contenu HTML **nettoyé à l'affichage** (`lib/articles-html.ts`,
  `sanitize-html`). Temps de lecture : 220 mots/min (`tempsLecture()`). Date
  future = article programmé (les pages publiques filtrent
  `date_publication <= maintenant`).
- **Image de couverture** : `<article_id>/couverture-<uuid>.jpg` dans
  `blog-images`, réduite comme les photos d'actions. Choix par bouton ou
  **glisser-déposer** (fichier de l'ordinateur ou image tirée d'une autre page
  web). Une image web n'arrive que sous forme d'adresse : `/api/image-distante`
  la télécharge côté serveur (super admin, http(s), **adresses publiques
  uniquement, chaque redirection revérifiée** — `lib/adresse-publique.ts`,
  protection contre les requêtes vers le réseau interne —, images ≤ 20 Mo).
  Rappel affiché : photo de la centrale ou banque libre ; une photo de presse est
  protégée. **Glisser-déposer commun à toutes les insertions d'images** (02/10/2026, demande de
  Fred) : `app/ZoneDepotImages.tsx` (couverture d'article, photos d'actions `ChoixPhotos.tsx`
  — plusieurs à la fois —, image de mobilisation) + `lib/image-deposee.ts` (types acceptés
  JPEG, PNG, WebP, GIF, AVIF, 20 Mo max, tous convertis en JPEG). Un fichier lâché à côté de la
  zone n'ouvre pas l'image dans l'onglet. Toute nouvelle insertion d'image utilise ce composant. Suppression d'un article = image d'abord, puis la ligne.

#### Veille RSS (sans IA)
- [x] Écran **Sources** : nom + URL du flux + actif / inactif.
- [x] **Ramassage** : `lib/veille-flux.ts` lit RSS 2.0 / Atom / RDF (50 items max
      par flux, résumé sans HTML, 5 000 caractères max) ; `lib/veille-ramassage.ts`
      insère en `upsert … ignoreDuplicates` sur `lien` avec la clé **service_role**
      (`lib/supabase-service.ts`, serveur uniquement). Route protégée par
      `CRON_SECRET` (en-tête `Authorization: Bearer`) ou session super admin.
      Crons `vercel.json` (depuis le 01/10/2026) : `0 6 * * *` et `0 7 * * *` vers
      `/api/veille/analyse` (ramassage à chaque passage, Check IA à 8 h Bruxelles), compatibles
      plan Hobby (une exécution par jour chacun, décalable dans l'heure) ; en plus,
      bouton « Rafraîchir maintenant ». Les crons ne tournent qu'en production.
- [x] Écran **Veille** : les « nouveau » d'abord, filtres statut / source, résumé
      du flux **en entier**, lien vers l'article d'origine, « Ignorer »,
      « Remettre à trier », « Rédiger un article » (item → `traite`, formulaire
      pré-rempli : titre + lien dans les sources), « Brouillon IA ».
- [x] **Thématiques / pertinence par mots-clés** : écran Thématiques
      (`site_themes`) ; Veille filtrée par défaut sur « Pertinents »
      (`?pertinence=tous` pour tout voir), compteur « X pertinents sur Y »,
      mots-clés retenus affichés. Règle (`lib/themes.ts`) : au moins un mot-clé
      actif dans le titre ou le résumé, insensible à la casse et aux accents, le
      mot-clé doit **commencer un mot** (« salaire » → « salaires », mais « cp »
      ↛ « capacité »). Filtre d'affichage uniquement : rien n'est effacé.
- **Longueur des résumés = celle du flux** : la RTBF
  (`highlight_rtbf_info.xml`) n'envoie qu'environ 120 caractères terminés par
  « ... », sans `content:encoded` ; Le Soir envoie plus. Les items ramassés avant
  le 28/09/2026 ont un résumé coupé à 600 caractères (le ramassage ne réécrit
  jamais une ligne). Le **ramassage** ne lit jamais la page de l'article ; seule
  la rédaction assistée la lit, sur demande.
- [x] **Mémoire du fil limitée à 3 jours** (choix de Fred, 01/10/2026, `MEMOIRE_JOURS`,
      `lib/veille.ts`) : chaque ramassage efface les articles de plus de 3 jours (date de publication,
      sinon date de ramassage, `purgerFil()`) **et n'ajoute plus aucun article publié il y a plus de
      3 jours** (`dansLaMemoire()`) — sinon un article effacé encore présent dans le flux reviendrait
      « nouveau » (l'index unique sur `lien` ne le retient plus). Un article sans date reste admis.
- [x] **Écran « conférence de rédaction »** (01/10/2026, piste 1 choisie par Fred parmi trois
      maquettes : https://claude.ai/artifact/UNFLDtyEHWKdhSr5rdeofs) :
      `app/suivi-actions/veille/ConferenceRedaction.tsx`. Synthèse du jour en tête, puis un cadre en
      deux colonnes : **à gauche la liste** des sujets S, A, B (rangs vides masqués ; « À surveiller »
      et « Pas pour nous » repliés en bas) avec la barre « Sujets traités : 2 sur 5 » ; **à droite le
      sujet ouvert** (rang, format, état, intitulé en grand, « Notre angle » mis en avant, pourquoi,
      sources sur une ligne chacune avec logo, titre tronqué en entier au survol, lisibilité et
      doublons repliés), boutons « Brouillon IA », « Rédiger un article », « Ignorer ». **État d'un
      sujet** (02/10/2026) : **« Brouillon enregistré » / « Publié »** si un article enregistré cite
      les liens du sujet dans ses sources (`articlesLiesAuxSujets()`, `lib/veille-articles-lies.ts`,
      rapprochement par adresse, faute de lien en base) — encart avec son titre et bouton
      « Continuer le brouillon » / « Ouvrir l'article » ; **« Commencé »** si ses articles sont
      « traités » sans article enregistré (relancer « Brouillon IA ») ; **« Ignoré »** (tous ignorés,
      barré). **Marquer « traité » avant d'ouvrir le formulaire a un délai de 8 s** (`avecDelai()`,
      `lib/delai.ts`) : sans réponse, le formulaire s'ouvre quand même (un client de session
      Supabase bloqué dans le navigateur — vu le 01/10/2026 après de nombreux rechargements à chaud,
      réglé par F5 — ne bloque plus « Brouillon IA »). **Ignorer** enchaîne sur le sujet suivant et affiche un bandeau
      bordeaux « Sujet ignoré · Annuler » pendant 8 s (statuts d'avant restaurés). **Clavier** :
      ↑ ↓ dans la liste, B brouillon IA, R rédiger, I ignorer (jamais dans un champ de saisie).
      Mobile : la liste, puis le sujet en dessous (clic = défilement, « Retour à la liste »).
      Ne pas revenir à la tier list empilée (rejetée par Fred : trop de lecture, pas de vue d'ensemble).
- [x] **Logos des médias** (01/10/2026, demande de Fred) : `LogoMedia.tsx` (pastille ronde 22-24 px)
      dans la conférence et dans le fil, servi par `/api/logo-media` : icône déclarée par la page
      d'accueil du média (apple-touch-icon d'abord, SVG écartés), sinon `/favicon.ico` ; adresses
      publiques uniquement (`verifierAdressePublique`, chaque redirection revérifiée), 300 Ko max,
      cache serveur 24 h et navigateur 7 jours ; jamais de service tiers. Sans logo : initiales du
      média. Alerte Google : logo et nom du média d'origine (« dhnet.be (alerte Google) »). Vérifié le
      01/10/2026 : RTBF, L'Avenir, RTL, Le Soir, Trends, DH, Bruxelles Today, Google Actualités.
- [x] **Check IA** (01/10/2026, demandé par Fred) : bouton à côté de « Rafraîchir maintenant »,
      actif seulement si le dernier ramassage date de moins de 2 h (`ramassageRecent()`, vérifié
      aussi par le serveur). Claude Sonnet 5 (`lib/veille-tri-ia.ts`, `lib/veille-analyse.ts`, sortie
      structurée, effort `medium`) reçoit les articles des **48 dernières heures** hors ignorés
      (300 max, titre + résumé tronqué à 600 caractères, **jamais la page de l'article**), marqués
      « déjà traité » s'il y a lieu, et les titres des publications des 15 derniers jours (éviter les
      doublons). **Grille FGTB / pouvoir d'achat** (`CONSIGNE_TRI`) : index, salaires, énergie,
      logement, TVA, pensions, chômage, fiscalité, concertation, restructurations, secteurs de la
      Centrale, mobilisations, bonus Namur-Luxembourg. **Tier list** : S « À poster » (rare) ·
      A « Ça vaut le coup » · B « Post rapide » · C « À surveiller » · « Pas pour nous » (repliée,
      sujets plausibles mais à ne pas relayer, avec la raison) ; les articles sans rapport ne sont
      classés nulle part (comptés). Chaque sujet : intitulé, pourquoi, « Notre angle », format
      suggéré, articles regroupés (plusieurs médias = un sujet), et sur chaque article « L'IA peut
      lire » / « À lire vous-même » (rangs S, A, B : `robots.txt` vérifié pendant l'analyse,
      `lib/lisibilite.ts`). Boutons **du sujet entier** (`ActionsSujet`) : « Brouillon IA » et
      « Rédiger un article » passent tous ses articles en « traité » et ouvrent le formulaire
      pré-rempli depuis le sujet (`cheminRedactionSujet()` : intitulé en titre, liens de toutes ses
      sources, « Angle à prendre : … » en consignes) ; « Ignorer le sujet » (ou « Remettre à
      trier »). **Alertes Google** (source « Google FGTB », liens `news.google.com/rss/articles/…`
      chiffrés) : adresse réelle du média retrouvée côté serveur (`lib/lien-reel.ts`, page Google
      puis point d'accès « batchexecute », méthode **non officielle**, vérifiée le 01/10/2026 ; en
      cas d'échec le lien Google reste, illisible par l'IA) ; dans un sujet, l'alerte qui reprend
      l'article d'un média (même adresse, ou même titre sans « - Média ») est **fusionnée** dans
      celui-ci (`fusionnerDoublons()`, champ `doublons`, traitée et ignorée avec lui). **Garde-fous côté code** (`construireResultat()`) :
      l'IA ne voit que des références `a1`, `a2`… (jamais les id) ; référence inconnue écartée ; un
      article dans un seul sujet (le mieux classé) ; rangs triés et plafonnés ; liens retirés ;
      format cohérent avec le rang. Rappel affiché : « Classement IA indicatif ». Le dernier
      classement s'affiche dans l'onglet « Check IA » (note s'il a plus de 48 h ; article « Effacé du fil »
      après la purge). **Analyse automatique à 8 h (Bruxelles)** : deux crons (`0 6` et `0 7` UTC,
      `vercel.json`) qui ramassent et purgent à chaque passage ; l'analyse ne part que s'il est 8 h
      à Bruxelles (6 h UTC en été, 7 h UTC en hiver) et qu'aucune analyse auto n'a eu lieu dans les
      20 h. Sur le plan Hobby, Vercel peut décaler un cron dans l'heure : l'analyse arrive donc entre
      8 h et 9 h. Essai réel du 01/10/2026 sur le vrai fil (47 articles) : ~30 s, environ
      11 000 jetons en entrée et 3 000 en sortie (quelques centimes).
- Une modale « Aperçu » a été essayée puis retirée le 28/09/2026 (n'apportait
  rien de plus que la liste) : **ne pas la reproposer**.

#### Rédaction assistée par IA
- [x] Modèle **`claude-sonnet-5`** (choix de Fred), appel **uniquement serveur**
      (`app/api/redaction/brouillon`, SDK `@anthropic-ai/sdk`, sortie structurée
      `zod`, réflexion adaptative, effort `medium`). La route reçoit les ids des
      sources et relit titre / résumé / lien en base. Coût mesuré le 01/10/2026 :
      1 à 3 c. sans lecture, **environ 10 c. avec une lecture** (4 sources, RTBF
      lue : ~25 000 jetons en entrée, ~40 s).
- [x] **Plusieurs sources** (01/10/2026, demande de Fred) : un brouillon part d'un
      article du fil **ou de tous les articles d'un sujet du Check IA** (12 max,
      `SOURCES_MAX` ; bouton « Retirer » / « Remettre » sur chaque source, les sources au-delà de 12
      sont retirées d'office) → **un seul article de synthèse** (consigne : fait commun dit
      une fois, fait d'une seule source attribué « selon L'Avenir… »,
      contradictions entre sources signalées sans trancher, toutes les sources
      dans la liste des sources).
- [x] **Panneau de rédaction assistée** (`app/suivi-actions/articles/PanneauRedaction.tsx`,
      « Brouillon IA » l'ouvre avec le focus, rien ne démarre sans clic), 4 étapes :
      1. **Les sources**, une ligne chacune : média, titre, puce de lisibilité
         (vérifiée gratuitement à l'ouverture pour chaque source,
         `/api/redaction/lisibilite`, `lib/lisibilite.ts` : `robots.txt` du média
         pour le robot **`Claude-User`** d'Anthropic, mis en cache 1 h par site ;
         RTBF l'autorise, RTL l'interdit ; « non » est fiable, « oui » ne garantit
         pas un article payant), puis **Ouvrir**, **Faire lire** (sources
         lisibles, **2 au maximum**, `LECTURES_MAX`, désactivé par défaut) et
         **Coller** (lit le presse-papiers en un clic ; si le navigateur refuse,
         champ ouvert avec « Ctrl+V » ; coller retire la demande de lecture de
         cette source, inutile de payer deux fois). Rail de gauche : ardoise =
         résumé seul, rouge = lue par l'IA, bordeaux = texte collé (le texte de la
         ligne le dit aussi). Confirmation de collage : voile bordeaux qui s'efface
         (`.source-confirmee`, rien en mouvement réduit).
      2. **Vos notes** (faits, contexte local).
      3. **Consignes** (2 000 caractères max ; pré-remplies avec l'angle du Check IA).
      4. **Créer** : récapitulatif de ce que l'IA utilisera et **coût estimé**.
      **Jauge « Matière »** en tête du panneau (`lib/matiere.ts`, estimation en
      mots : résumés, lectures demandées, textes collés, notes) : Maigre / Correcte /
      Solide, remplissage animé à chaque geste, et **conseil du geste suivant**
      (faire lire la source lisible la plus détaillée, sinon ouvrir et coller la
      plus détaillée, sinon ajouter des notes). Limites dans
      `lib/redaction-limites.ts` (fichier sans dépendance) : 60 000 caractères par
      texte, 120 000 au total.
- **Lecture des articles** (si demandée, dans le même appel que la rédaction) :
  outil serveur `web_fetch_20250910` (version de base : renvoie le texte lu tel
  quel, nécessaire au garde-fou), `max_uses` = nombre de sources à lire,
  `allowed_domains` = leurs domaines, `max_content_tokens: 30000`, relance sur
  `pause_turn` (3 fois max). Chaque page lue est rattachée à sa source
  (`lib/redaction-lecture.ts`) : **lue**, **partielle** (moins de 1 500
  caractères : sans doute l'accroche d'un article payant → « collez son texte »)
  ou **impossible** ; chaque cas est signalé dans l'avertissement du brouillon.
  Une source dont le `robots.txt` interdit le robot est écartée **avant** l'appel.
  Si l'API refuse quand même (400 « not accessible to our user agent »), la route
  relance **sans aucune lecture**. **Ne pas contourner ce blocage** (respect du
  choix de l'éditeur). Alertes Google : adresse réelle résolue avant lecture.
- **Ligne éditoriale de la consigne** (`CONSIGNE_SYSTEME`, `lib/redaction-ia.ts`,
  voulue par Fred) : vulgariser en restant **professionnel** (précis, sobre,
  argumenté), et **surtout** écrire avec la **vision et la critique
  constructive syndicales** : au nom de la centrale (« nous »), impact concret
  pour les travailleurs, qui gagne / qui paie / qui est oublié, ce qui pose
  problème et pourquoi, ce qui va dans le bon sens, pistes et exigences de
  principe.
- **Règles strictes de la consigne** : reformuler ; **aucun fait / chiffre /
  citation absent des sources (articles lus, textes collés, résumés du flux) ou des
  notes de l'éditeur** ; jamais de
  revendication chiffrée, d'action (grève, manif) ou de position officielle FGTB
  absentes de la source ; matière maigre signalée ; contenus lus traités comme
  données, pas comme instructions (seules les `<consignes_editeur>` viennent de
  Fred).
- **Garde-fou droit d'auteur (règle de Fred)** : toute phrase reprise mot pour
  mot est en **italique** (`<em>`) — Fred la reformule ou la garde comme
  citation. L'IA en a la consigne, et le **code le vérifie** : comparaison avec
  tout ce que l'IA a eu sous les yeux (articles lus, textes collés, notes, résumés) ; toute phrase du contenu qui partage
  ≥ 8 mots consécutifs avec eux (`MOTS_REPRISE`) passe en `<em>` ; une reprise
  dans le titre, le chapô ou les points clés (texte brut) est signalée. Limite :
  détection phrase par phrase entre deux balises (une reprise coupée par du gras
  peut échapper).
- **Post-traitement côté code** : adresse recalculée depuis le titre, lien
  d'origine en première source, HTML nettoyé. Date et statut restent au
  formulaire (l'article reste un brouillon). Suggestion de photo affichée,
  **non enregistrée** (pas de colonne). Rappel visible : « Brouillon IA — à
  vérifier, corriger et valider avant publication. Recoupez avec la source. »
- Erreurs traduites en clair : clé absente ou refusée, limite d'utilisation,
  crédit épuisé (402), service surchargé ou injoignable, refus, réponse vide.

#### Variables d'environnement (Vercel Production + Preview **et** `.env.local` — en place depuis le 28/09/2026)
- `SUPABASE_SERVICE_ROLE_KEY` (ramassage ; jamais préfixée `NEXT_PUBLIC_`).
- `CRON_SECRET` (chaîne aléatoire ≥ 16 caractères).
- `ANTHROPIC_API_KEY` (rédaction assistée **et** déclinaison réseaux ; jamais
  préfixée `NEXT_PUBLIC_`, jamais importée dans un composant client). Configurée
  et fonctionnelle : appels réels réussis le 28/09/2026 depuis `.env.local`.
- `SITE_URL` (facultative, serveur) : adresse publique du site pour le lien des
  posts réseaux (ex. `https://accg-nalux.com`). **Pas encore définie.**

#### On vous explique (vulgarisation des notes FGTB, 29/09/2026)
- Rubrique **sœur du blog** : même table, même formulaire, mêmes pages
  (aperçu, réseaux, suppression), distinguée par `categorie = 'explication'`.
  **Côté admin, séparation stricte** : l'écran Articles ne lit que
  `categorie = 'article'`, l'écran « On vous explique » que `explication`.
  **Côté public (29/09/2026, demande de Fred)** : une seule liste `/actualites`
  (`chargerPublications()`, `app/actualites/`) ; les pages de détail restent par
  rubrique (`chargerArticle(slug, categorie)`, `lib/articles-public.ts`).
  **Pastille** (`Pastille`, `app/blog/CartesArticles.tsx`) en haut à gauche de la
  photo et en tête de la page de détail : « Actualité » fond rouge `#E32119`,
  « On vous explique » fond bordeaux `#931510`, texte blanc — le texte est
  toujours présent (la couleur n'est qu'un renfort). Filtre : sélecteur à
  segments (aplat rouge qui glisse, fondu de la liste au changement d'onglet
  seulement), **jamais de `<select>` ni de cases à cocher** ; l'adresse suit le
  filtre (`history.replaceState`). Filtres et adresses : `FILTRES_PUBLICATIONS`,
  `filtreDepuisParam()`, `cheminActualites()` (`lib/articles.ts`). Libellés et chemins par rubrique :
  `RUBRIQUES`, `cheminPublic()`, `categorieDe()` (`lib/articles.ts`). Liste
  admin partagée : `app/suivi-actions/articles/ListePublications.tsx`.
- **Import** (`PanneauNote.tsx` dans le formulaire, nouvelle explication
  seulement) : .docx ou .pdf, **4 Mo max** (limite des requêtes vers une
  fonction Vercel : 4,5 Mo). Extraction **côté serveur** (`lib/notes-extraction.ts`) :
  type vérifié par la signature du fichier (« PK » / « %PDF »), `.docx` via
  **mammoth**, `.pdf` via **unpdf** (conçu pour le serverless) ; `.doc`
  refusé avec consigne ; PDF scanné (< 300 caractères) refusé ; 150 000
  caractères max.
- **Vulgarisation** (`lib/vulgarisation-ia.ts`, `/api/redaction/note`) : Claude
  Sonnet 5, sortie structurée `zod`, réflexion adaptative, effort `high`
  (~15 s et quelques centimes pour une note courte). Structure imposée :
  titre, chapô (1-2 phrases), « En bref » (3-4 puces), 4 sous-titres `<h2>` —
  « De quoi s'agit-il ? », « Ce qui est proposé ou ce qui change », « La
  position de la FGTB », « Ce que ça change concrètement pour vous » —, sources =
  « Note FGTB <référence> ». Consigne : langage grand public, **chaque sigle ou
  terme technique expliqué** (CNT, CCE, CCT, commission paritaire, 2e pilier…),
  **position FGTB restituée telle qu'écrite** (ni inventée, ni adoucie, ni
  durcie, ni nuancée), aucun fait / chiffre / opinion absent de la note, ton
  engagé mais pédagogique, note maigre ou ambiguë signalée.
- **Garde-fous côté code** : référence de note gardée seulement si elle figure
  dans le texte ; sous-titres manquants signalés ; **tout nombre du texte
  produit absent de la note est signalé** (« Chiffres absents de la note, à
  vérifier ») ; liens retirés, HTML nettoyé, adresse depuis le titre. Date et
  statut restent au formulaire (brouillon). Rappel visible : « Vulgarisation IA
  — vérifier la fidélité à la note FGTB avant publication. »
- **Suggestion de photo** (29/09/2026, demandée par Fred) : l'IA décrit la photo de
  couverture idéale (scène concrète, prise par la centrale ou banque libre, jamais
  de photo de presse ni de personne réelle identifiable) ; affichée au-dessus de
  la zone image comme pour un brouillon d'article, **non enregistrée**.
- **Archive** : la note d'origine est déposée dans `notes-sources` (service_role)
  et son chemin enregistré dans `document_source` ; la page Modifier affiche un
  lien de téléchargement temporaire (1 h). Un échec d'archivage n'empêche pas
  d'utiliser la vulgarisation (message affiché). Supprimer une explication ne
  supprime pas sa note archivée.
- **Sources** : pour une explication, une ligne peut être une simple référence
  sans lien (`lireReferences()`) ; le blog exige toujours un lien par ligne.
- La déclinaison réseaux fonctionne aussi pour une explication (lien vers
  `/on-vous-explique/<slug>`). Le tableau de bord (tuile Publications) compte
  les articles et, à part, les explications.

### Phase 3 — Publication réseaux
- [x] **Déclinaison par l'IA** (28/09/2026, `suivi-actions`) : depuis un article
      **publié** (bouton « Réseaux » de la liste, bandeau de la page Modifier),
      `/suivi-actions/articles/<id>/reseaux`. Claude Sonnet 5, serveur uniquement
      (`app/api/reseaux/declinaison`, `lib/reseaux-ia.ts`, sortie structurée `zod`,
      réflexion adaptative, effort `medium`, ~1 c. et 15 s pour les 4). Source =
      titre + chapô + points clés + contenu + lien de l'article. Consigne : fidélité
      stricte à l'article validé (aucun ajout, chiffres et nuances conservés), ton
      militant mais factuel, longueur et style propres à chaque réseau.
      **Post-traitement côté code** : Facebook et description YouTube = seul le lien
      de l'article (ajouté s'il manque) ; Instagram et TikTok = aucun lien,
      « Lien en bio » garanti sur Instagram. Écran : 4 cartes côte à côte, chacune
      éditable, compteur de caractères (limites : Facebook 63 206, Instagram 2 200 +
      30 hashtags, TikTok 4 000, YouTube titre 100 / description 5 000), Copier,
      Enregistrer (écriture navigateur, RLS super admin), Régénérer (une seule
      version) ; confirmation avant de remplacer une version, alerte en quittant
      avec des modifications non enregistrées. **Aucune publication automatique** :
      Fred copie-colle.
- Lien des posts : `SITE_URL` (ex. `https://accg-nalux.com`, variable facultative,
  serveur) sinon l'adresse par laquelle l'admin consulte le site (la preview
  donnerait un lien de preview : définir `SITE_URL` avant usage réel).
- [ ] **Brancher la déclinaison aux futurs outils de génération** (visuels et
      vidéo, phase 4) : un post = son texte (`site_publications_reseaux`) + son
      visuel ou son extrait vidéo au format du réseau, préparés ensemble depuis
      l'écran `/suivi-actions/articles/<id>/reseaux`.
- [ ] **Publication en 1 clic** (à étudier) : envoyer un post validé vers le
      réseau depuis ce même écran, via un **outil-pont** (Ayrshare / Metricool /
      Buffer — à choisir) plutôt que coder chaque réseau. À vérifier : coût,
      réseaux couverts (TikTok, YouTube), comptes de la centrale, programmation.
      `site_publications_reseaux.statut` (défaut `brouillon`) pourra alors suivre
      l'état (validé, publié).
- Fred valide chaque post avant publication. D'ici là : copier / coller.

### Phase 4 — Plus-values *(plus tard)*
- **Générateur de visuels** : gabarits auto aux formats réseaux, dans la charte
  (automatisation de gabarits, pas génération IA — Fred garde la main). La
  direction « L'Affiche » (aplats rouges, typographie poster) des maquettes du
  25/09/2026 peut servir de base pour ces visuels.
- **Outils vidéo** : transcription/sous-titres auto + découpe de vidéos longues en
  extraits courts (TikTok/Reels).
- **Mémoire de la centrale** : base consultable des CCT, accords sectoriels,
  précédents.
- **Assistant-aiguilleur IA** : comprend la demande, répond au pratique simple,
  oriente vers le bon service — ne donne **jamais** de conseil juridique en
  autonomie. **Lié à « Trouver votre contact »** : l'assistant s'appuie sur le même
  annuaire pour orienter vers le bon permanent ou le service juridique.
- **« Trouver votre contact »** (nouvelle branche du site, idée retenue le
  25/09/2026). Aujourd'hui sur l'ancien site : choix de la province puis de la
  commission paritaire (CP) → permanent(s) + service juridique 1re ligne ; données
  écrites dans le code, e-mails personnels visibles. Pistes :
  1. **Annuaire en base** (table `site_contacts` : province, CP, permanent(s),
     service juridique), modifiable depuis l'espace admin — plus de modification
     de code quand l'équipe change ;
  2. **Une seule recherche** : métier, secteur, entreprise ou n° de CP (ex.
     « maçon » → CP 124 Construction), en réutilisant le catalogue officiel des CP
     déjà présent pour le calcul de préavis (`lib/preavis`) + synonymes ;
  3. aide **« Je ne connais pas ma CP »** (où la trouver sur la fiche de paie ou le
     contrat) ;
  4. **province déduite du code postal**, avec le bureau le plus proche, ses
     horaires et son statut « ouvert » (`lib/bureaux.ts`) ;
  5. **contact sans exposer les e-mails** : formulaire « Écrire à mon permanent »
     routé par Resend (anti-spam, RGPD, traçabilité) ; téléphones des bureaux
     visibles ;
  6. **liens partageables** (`/contact/trouver?cp=124`) pour tracts et QR codes ;
  7. **lien avec l'affiliation** : afficher « Votre permanent » en fin de
     formulaire et dans l'e-mail de confirmation (CP et adresse déjà connues) ;
  8. **statistiques** des recherches sans résultat (trous de couverture ou de
     vocabulaire).
  Démarrage suggéré : 1, 2, 4, 5 ; les noms et e-mails des permanents viennent de
  l'ancien site (données personnelles : ne pas les publier en clair).
- Autres idées évoquées : calculateurs publics comme produits d'appel, newsletter
  automatique, alerte-mobilisation ciblée, espace affilié, tableau de bord réseaux.

---

## État au 08/10/2026
- **Assistant CG** sur la branche **`chatbot`** (créée depuis `suivi-actions`), **commitée et poussée sur
  GitHub le 08/10/2026 à la demande de Fred** ; **rien sur `suivi-actions`** (en production : ne rien y
  fusionner sans l'accord de Fred). Interrupteur `chatbot_actif` toujours sur `off`. Vérifié en local :
  types, 606 tests, build de production, les 10 scénarios de Fred et les cas nettoyage / agriculture avec la
  vraie IA et la vraie base (lecture). **Non testé** : une transmission réelle (insertion + e-mail avec
  bouton « Répondre »), pour ne rien écrire en base sans Fred, et l'écran admin « Demandes chatbot » connecté.
  À faire par Fred : un essai réel avec sa propre adresse, puis activer l'interrupteur dans « Paramètres du
  site » après fusion.
- Le 08/10/2026 (retours de Fred) : deux antennes chômage les plus proches ; règle des secteurs transférés à
  l'Horval (nouveaux → Horval, anciens affiliés CG → CG) ; section « Assistant CG (aide à l'orientation) »
  ajoutée à `/vie-privee` **et** à `PAGES-LEGALES.md` (orientation seulement, conversation jamais
  enregistrée, analyse par Anthropic après masquage, demande transmise enregistrée avec consentement,
  registre national jamais par e-mail ni à l'IA) + Anthropic cité dans « Partage des données ».
- Validé par Fred le 08/10/2026 : les deux antennes par code postal ; la règle des secteurs transférés
  s'applique aussi aux CP 145 et 132.
- **Vie privée, section Assistant CG réécrite le 08/10/2026** (texte de Fred, mot pour mot ; `/vie-privee` et
  `PAGES-LEGALES.md`) : transfert vers Anthropic (États-Unis), droit de retrait du consentement, durée de
  conservation des demandes, ligne ajoutée aux « Durées de conservation », date de la page au 08/10/2026
  (prop `miseAJour` de `PageLegale`, les autres pages légales gardent le 29/09/2026). Les deux valeurs **à
  valider par le DPO** sont dans `lib/vie-privee.ts` : `GARANTIE_TRANSFERT`, `DUREE_DEMANDES` (« 12 mois »).
  **Non poussé** : Fred attend la validation du DPO. Masquage revérifié (test « ce qui part réellement vers
  l'IA ») ; motif IBAN resserré (il avalait les mots suivants).
- **Suppression des demandes après traitement** (option A choisie par Fred le 08/10/2026) : migration
  `supabase/migrations/20261008120000_site_chatbot_demandes_traite_le.sql` (**demandée par Fred, idempotente,
  à exécuter par Fred**) : colonne `traite_le` + trigger qui la remplit au passage à `traite` (et la vide si la
  demande change de statut). Le cron quotidien (`/api/veille/analyse`, les deux passages) appelle
  `purgerDemandesChatbot()` (`lib/assistant-purge.ts`) : suppression des demandes `traite` dont `traite_le`
  dépasse `DUREE_DEMANDES_MOIS` (12, `lib/vie-privee.ts`, même valeur que la page). Sans la migration : rien
  n'est supprimé (journal « colonne traite_le absente »), la liste admin s'affiche quand même. La fiche d'une
  demande traitée affiche sa date de suppression prévue.
- **Bandeau de mobilisation refait** (08/10/2026, demande de Fred) : étiquette rouge en parallélogramme à 10°
  (éclair + « Mobilisation », ou l'échéance courte sur mobile), échéance « Aujourd'hui / Demain / Dans N
  jours » (`echeance()`, `lib/mobilisations.ts`, calculée dans le navigateur), bouton blanc « Je m'inscris »
  avec flèche ; reflet en biais, éclair qui claque et flèche qui avance, 3 fois espacées de 7 s puis plus rien ;
  rien en mouvement réduit (`globals.css`, « Bandeau de mobilisation »).
- Le 08/10/2026 aussi : règle du nettoyage (« Qui est votre employeur ? »), bouton « Répondre » dans l'e-mail
  de transmission, refonte de la bulle « Une question ? ».

## État au 07/10/2026
- **Commité sur `suivi-actions`, pas encore poussé** : formulaire « Signaler un changement »
  (`/changement-situation`, table `web_modifications`, e-mail, back-office) et refonte de la grille
  des démarches (4 colonnes, bande à 10°, animations).
- **À faire par Fred** : exécuter la migration `20261007120000_web_modifications.sql` dans
  Supabase (sinon le formulaire ne peut rien enregistrer), puis un **essai réel** avec sa propre
  adresse (enregistrement, e-mail avec PDF, fiche et historique dans le back-office). Vérifié en
  local seulement : types, tests, page, PDF du cas le plus long sur une page.
- **Sécurité à décider par Fred** : lecture des anciennes tables `web_*` ouverte à tout compte
  connecté (voir « Tables des formulaires publics »).

## État au 02/10/2026
- **Poussé sur `suivi-actions` les 01/10 et 02/10/2026** (rien sur `main`) : Check IA et écran
  « conférence de rédaction », brouillon IA multi-sources (jusqu'à 12 sources, « Retirer » /
  « Remettre », jauge « Matière »), logos des médias, fil limité à 3 jours, page `/statuts` et
  nouvel « Accord général », uniformisation visuelle de tous les formulaires (`app/formulaires/`),
  question « titulaire du compte » sous le bloc RIB (affiliation), bloc « Nos bureaux » sur les
  PDF d'affiliation et de mandat, sujets du Check IA reliés à leur article enregistré.
- **Accès** : deux comptes SUPER_ADMIN dans `profiles` (Frédéric Blanchard, Jonathan Hubert),
  vérifié le 01/10/2026. **Vercel Authentication est activée sur toutes les adresses
  `.vercel.app`** (production comprise, sauf domaine propre) : un collègue sans compte dans
  l'équipe Vercel est bloqué avant la page de connexion. Solutions : lien de partage du
  déploiement (« Share »), ou désactiver la protection des prévisualisations (Settings ›
  Deployment Protection) — à décider par Fred ; un domaine propre branché en production n'est pas
  concerné.
- Analyse automatique du Check IA à 8 h : seulement en production (les crons Vercel ne tournent
  pas sur les prévisualisations).

## État au 29/09/2026
- Tout le travail est sur la branche **`suivi-actions`** : rien sur `main`, rien
  déployé. À relire puis fusionner quand Fred valide.
- Migration des envois exécutée le 28/09/2026. À tester par Fred : un envoi
  réel (SEPA, C1) doit apparaître dans l'historique de la demande.
- À faire par Fred : **supprimer** le projet Supabase `accg-nalux-site`
  (dashboard).
- Bureaux (`lib/bureaux.ts`) repris de l'ancien site le 25/09/2026 : Libramont
  (siège), Namur, Arlon, Marche-en-Famenne. À tenir à jour à chaque changement
  d'horaire ; le statut « ouvert » est calculé à l'heure de Bruxelles.
- PDF **Affiliation** et **Mandat SEPA** passés à la charte du site (proposition
  « Registre » du 25/09/2026). Les PDF **C1, C3.2 et Calcul de préavis ne doivent
  pas être modifiés**.
- **En place sur `suivi-actions`, commité et poussé sur GitHub le 29/09/2026**
  (déploiement de prévisualisation Vercel) : blog, Scan News (ex-veille RSS :
  sources, ramassage quotidien, thématiques), **rédaction assistée par IA**
  (tunnel en 5 étapes, garde-fou droit d'auteur), **déclinaison réseaux**
  (Facebook, Instagram, TikTok, YouTube, sans publication automatique),
  **back-office des demandes** (PDF régénérés, demandes liées, historique des
  e-mails), **paramètres des envois**, **refonte de l'espace admin** (tableau de
  bord, menu par sections), rubrique **« On vous explique »** (vulgarisation des
  notes FGTB, suggestion de photo) et **indicateur de chargement** unique. Rien
  sur `main`, rien en production.
- `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` et `ANTHROPIC_API_KEY` sont
  **configurées** dans `.env.local` (vérifié le 28/09/2026 ; la clé Anthropic
  répond, testée sur la déclinaison réseaux) **et ajoutées dans Vercel par Fred le
  28/09/2026** (déclaré par Fred, non vérifiable depuis Claude Code sans accès
  Vercel). Une variable ajoutée ou modifiée dans Vercel ne s'applique qu'aux
  **déploiements suivants** : redéployer la preview si besoin.
- Le 28/09/2026 : **back-office des demandes** (`/suivi-actions/demandes`) sur
  `suivi-actions` : 238 affiliations, 20 mandats SEPA, 11 changements de compte,
  29 C1 et 27 C3.2 à cette date.
- Le 29/09/2026 : rubrique **« On vous explique »** (import de notes FGTB .docx /
  .pdf, vulgarisation par Claude Sonnet 5, pages publiques) sur `suivi-actions`.
  Vérifié : extraction réelle .docx et .pdf (tests), vulgarisation d'une note
  fictive par l'API. **Pas encore testé** : l'archivage réel dans
  `notes-sources` et une note FGTB réelle.
- Avant un usage réel de la déclinaison réseaux : définir `SITE_URL` dans
  Vercel, sinon les posts générés depuis la preview pointent vers la preview.
- **Le 29/09/2026 après-midi, sur `suivi-actions`, poussé sur GitHub** :
  - **Page unifiée `/actualites`** (blog + « On vous explique », pastilles,
    sélecteur à segments) ; `/blog` et `/on-vous-explique` redirigés ; menu :
    Accueil · Actualités · Nos actions · Démarches en ligne · Contact.
  - **Mobilisations** : admin (liste, formulaire, aperçu, « pourquoi » et point 0
    « Partir de textes existants » par l'IA), **Paramètres du site**
    (interrupteur de l'accueil), bloc d'accueil avec compte à rebours, page
    campagne `/mobilisation/<slug>`, bandeau d'alerte sur tout le site. Image hero
    affichée entière à sa proportion naturelle. Fred a créé et activé une
    première mobilisation (« Ligne rouge », 09/10/2026) : enregistrement,
    image et interrupteur fonctionnent.
  - **Accueil réordonné** : mobilisation ou ouverture habituelle · 4 dernières
    publications · démarches · dernières actions passées.
  - **Pages légales** `/mentions-legales`, `/vie-privee`, `/cookies` (texte de
    `PAGES-LEGALES.md`) — **validées par Fred le 29/09/2026**.
  - **Page Contact refaite** (bureaux, cartes Google Maps en couleurs, canaux,
    formulaire Resend) et **consentement aux cookies** : pop-up minimal
    (Refuser / Tout accepter) + réglages détaillés sur `/cookies#reglages`
    (un interrupteur par élément ; catégories cartes Google Maps et vidéos
    YouTube).
  - **Pied de page refait** sur fond charbon (seule exception à la règle des fonds
    sombres), logo blanc, bouton « S'affilier », réseaux sociaux.
  - **Bordeaux `#931510`** partout (site, PDF, rapport) et **nouveau
    `logo-cg-rouge.png`**.
- Pistes suivantes : brancher la déclinaison aux futurs outils de visuels et de
  vidéo, publication en 1 clic (phase 3, outil-pont, à étudier), images
  (génération / gabarits, plus tard), page de présentation de la centrale,
  « Trouver votre contact » (phase 4, avec l'assistant).

---

## Conventions

### Dates
- **Format : toujours `jj/mm/aaaa`** (ex. `24/09/2026`), partout : interface,
  saisie, e-mails, PDF, courriers et ce fichier. Pas de mois en toutes lettres, pas
  d'année sur 2 chiffres. Côté code : `formatDateFr()`, `isoToDateFr()` et
  `dateFrToIso()` dans `lib/dates.ts`. En base, les dates restent au format ISO
  (`aaaa-mm-jj`).
- **Jamais de `<input type="date">`** : le navigateur l'affiche dans la langue de
  l'ordinateur (souvent `mm/dd/yyyy`). Utiliser un champ texte `jj/mm/aaaa` avec
  `formatDateFr()` à la frappe et `dateFrToIso()` à l'enregistrement.
- Les axes de graphiques ou de frises utilisent des numéros de mois (`01`…`12`,
  `mm/aaaa`), jamais les noms.

### Design — « direction D » (mélange éditorial A + modulaire C)
Maquettes de référence : page de maquettes claude.ai « Propositions design ACCG
Nalux » (rangée D pour le site, rangée « PDF » pour les documents) :
https://claude.ai/artifact/Gcfj9m7DxfpyLAB1yBL18c
- **Palette stricte** : `#E32119` rouge, `#931510` bordeaux, `#222222` charbon,
  `#FFFFFF` blanc, `#7C90A0` ardoise. Dans le code : couleurs Tailwind
  `militant-rouge`, `militant-bordeaux`, `militant-charbon`, `militant-ardoise`.
  Bordeaux = `#931510` depuis le 29/09/2026 (demande de Fred).
  Contrastes vérifiés : blanc sur bordeaux **8,9:1** (AAA, avant 7,4:1) ; bordeaux
  sur blanc 8,9:1 ; rouge / bordeaux 1,9:1 (pastilles « Actualité » / « On vous
  explique » : le texte les distingue) ; filet blanc 35 % sur bordeaux 2,2:1
  (décoratif). Seul recul : charbon / bordeaux 1,8:1 (avant 2,1:1) → ne jamais
  distinguer une information par ces deux seules couleurs (survol bordeaux →
  charbon des boutons = simple renfort, le texte reste blanc ; camembert du
  rapport : filets blancs entre les parts + légende).
- **Limiter les fonds noirs** : le noir est politiquement associé à l'extrême
  droite, que la centrale combat. Le charbon sert au texte, aux filets et aux petits
  détails (survol de bouton, puce), **jamais aux grandes surfaces** (barres,
  bandeaux, grands blocs, barres latérales). Surfaces fortes :
  **bordeaux** avec texte blanc ; sinon fond blanc et filets épais. Emplacements
  photo vides : ardoise. **Seule exception : le pied de page**, en charbon
  (demande explicite de Fred du 29/09/2026, pour ancrer le bas de page).
- **Lisibilité** : texte courant en charbon sur fond clair ; ardoise réservé aux
  filets, bordures et textes d'exemple (placeholder) — trop pâle pour du petit
  texte sur blanc ; rouge `#E32119` uniquement en grand texte (dates, chiffres,
  année) ou en filet / aplat ; texte blanc sur bouton → fond bordeaux (le blanc sur
  rouge vif n'est lisible qu'en grand).
- **Typographie** : Barlow (texte) et Barlow Condensed (titres, dates, chiffres),
  auto-hébergées (`app/fonts.ts`, paquets `@fontsource`), appliquées à tout le
  site. Grands titres de page et de section : Barlow Condensed extra-gras en
  majuscules, posés sur un **filet charbon de 6 px**.
- **Composants** : tuiles blanches arrondies (16 px) à fin contour ardoise ; tuile
  mise en avant en bordeaux ; bouton principal bordeaux (survol charbon), bouton
  secondaire contour charbon ; badges en contour ; lien actif souligné de rouge ;
  filet rouge de 4 px sous la barre de navigation, 3 px au-dessus du pied de page.
  **Pied de page** (`app/PiedDePage.tsx`, refait le 29/09/2026) : **fond charbon**,
  texte blanc, secondaires en ardoise (4,8:1), **logo blanc**. 4 colonnes alignées
  en haut (identité : bureaux de Libramont et Namur côte à côte, e-mail, WhatsApp ·
  Le site · Démarches · bouton rouge « S'affilier » puis Suivez-nous : Facebook,
  Instagram, YouTube, TikTok en icônes rondes monochromes, jamais aux couleurs des
  marques, remplies de rouge au survol) + barre du bas en ardoise (© 2026 · Mentions
  légales · Vie privée · Cookies · Espace admin). **Liens : le texte reste blanc au
  survol** (rouge sur charbon = 3,4:1, trop faible pour du petit texte) ; le rouge
  vient par un soulignement qui se trace (`.pied-lien-texte`). Colonnes en cascade
  à l'entrée à l'écran (`Revelation.tsx`, composant générique partagé avec les démarches, une fois, rien en mouvement réduit ni
  si le pied de page est déjà visible). Mobile : identité, puis « Le site » et
  « Démarches » côte à côte, puis bouton et réseaux. Page campagne mobile : marge
  basse sous la barre fixe « Je m'inscris » (`.barre-inscription-mobile`) ; en
  développement seulement, marge basse pour l'indicateur flottant de Next.js.
  Icônes : `lucide-react` (jamais d'emoji comme icône).
- **Logos** (`public/`) : `logo-cg-rouge.png` sur fond blanc (usage principal),
  `logo-cg-blanc.png` sur fond bordeaux ou charbon (connexion, couverture du rapport PDF, pied de page),
  `logo-cg-noir.png` réservé à l'impression noir et blanc — pas sur le site.
  **Favicon** (07/10/2026, demande de Fred) : l'encart rouge incliné à 10° du logo (celui de
  « FGTB ») avec « CG » en blanc, Barlow Condensed extra-gras inclinée du même angle (tracés réels
  de la police). Fichiers servis par Next : `app/icon.svg` (onglets, coins transparents),
  `app/favicon.ico` (16, 32, 48 px), `app/apple-icon.png` (180 px, carré rouge plein : iOS arrondit
  lui-même).
- **Documents PDF** (affiliation, mandat SEPA, rapport) : charte « Registre » —
  page blanche, logo rouge en tête, titre en majuscules condensées sur filet
  charbon, sections numérotées en rouge sur filet, lignes libellé / valeur sur
  filets ardoise, encadrés en bordeaux, pied de page avec filet rouge. Polices
  Barlow via `enregistrerPolicesPdf()` (`lib/pdf/charte.ts`). **Bloc « Nos bureaux »** (01/10/2026, demande de Fred) :
  adresse et téléphone des 4 bureaux (`lib/bureaux.ts`) au-dessus du pied de page, composant
  `BureauxPdf` (`lib/pdf/BureauxPdf.tsx`, `fixed` + `render` sur une seule page) : **page 2** du PDF
  d'affiliation, **page 1** du mandat SEPA (une seule page : espacements resserrés pour lui faire
  place, tailles de texte et mentions inchangées ; position `haut={738}`). Vérifié le 01/10/2026 sur
  le cas le plus long (changement de compte, titulaire tiers, signature réelle) : rien ne se chevauche.
  Toute ligne ajoutée au mandat doit être revérifiée contre ce bloc. **Logo** : si le logo
  préchargé manque, le PDF le télécharge lui-même depuis le site (`/logo-cg-rouge.png`) — jamais le
  nom de la centrale en texte à la place (02/10/2026). **Section « Transfert syndical »** du PDF
  d'affiliation : seules les lignes présentes, réparties à gauche puis à droite (pas de colonne
  vide). Mention « Accord général » du PDF : adresse des statuts `www.accg-nalux.be/statuts`. **Ne jamais supprimer
  une mention légale** (surtout le mandat SEPA : texte de domiciliation, créancier,
  ICS, RGPD, certification de signature). Les PDF officiels C1 / C3.2 et le
  courrier de préavis ne suivent pas cette charte.
- **Nom de la centrale** : toujours « Centrale Générale FGTB **Namur-Luxembourg** » (trait
  d'union sans espaces), titres d'onglet compris (`<page> — Centrale Générale FGTB
  Namur-Luxembourg`). Harmonisé le 30/09/2026.
- **E-mails automatiques** (confirmation d'affiliation, mandat SEPA, C1 / C3.2 :
  `app/api/send-confirmation`, `app/api/send-mandat-sepa`, `lib/onem-email-html.ts`) :
  palette du site depuis le 30/09/2026 (plus de gris, rouge ni orange Tailwind).
- **Exceptions de palette connues** (audit du 30/09/2026) : vert CSC / bleu Synova,
  2 couleurs de graphique du rapport, noir des PDF officiels C1 / C3.2 et du courrier
  de préavis (à ne pas modifier), cartes Google Maps, **logos des médias** dans Scan News
  (espace admin, en petit, couleurs d'origine : contenus de tiers, 01/10/2026). Tout le reste = 5 couleurs.
- **« Accord général » du formulaire d'affiliation** (réécrit le 01/10/2026, demande de Fred) :
  reconnaissance de la prise de connaissance des statuts (lien `/statuts`) dans leur version en
  vigueur à la date de la demande, acceptation sans réserve, engagement à respecter statuts,
  règlements et décisions des congrès (reprend l'art. 5.2 des statuts). Résumé repris dans le PDF
  d'affiliation (`mentionsList`). Colonne en base inchangée (`mention_accord`).
- **Adresses e-mail** : contact général `cg.nalux@accg.be` (site, page Contact) ;
  administration `admin.nalux@accg.be` (PDF affiliation et SEPA, envois
  automatiques). `cg.namurluxembourg@accg.be` est obsolète.
- **Graphiques** (rapport PDF…) : couleurs libres, à valider (daltonisme,
  contraste), **hors vert et bleu** réservés à la CSC et à Synova. Camembert des
  types : `#222222` `#E32119` `#7C90A0` `#B8720F` `#931510` `#9C6FB3`.
- **Couche de compatibilité** (`tailwind.config.ts`) : les anciennes classes
  `red-*`, `gray-*`, `slate-*`, `blue-*`, `green-*`, `emerald-*`, `amber-*` des
  anciens formulaires sont **remappées sur la palette** (teintes claires → blanc,
  bordures → ardoise, soutenues → bordeaux ou charbon, jamais de grand fond
  noir). Pour tout **nouveau** code, utiliser les couleurs `militant-*`.
- **Formulaires** (uniformisation visuelle du 01/10/2026, demande de Fred : apparence seulement,
  aucun champ ni fonctionnement modifié, PDF intacts) : affiliation, mandat SEPA, C1, C3.2, préavis,
  parcours de transfert et écran d'envoi partagent la même charte, calquée sur le formulaire de
  contact. **Socle CSS** `.formulaire` (posé sur chaque page, `app/globals.css`) : champs 48 px,
  texte 16 px (pas de zoom iPhone), **réponse saisie en charbon demi-gras, exemple (placeholder) en
  ardoise maigre** (jamais de `placeholder:text-gray-400`, que la couche de compatibilité rendait
  charbon), bordure ardoise → charbon au survol → charbon + filet rouge au focus, erreur = bordure
  bordeaux 2 px (repérée par `aria-invalid` ou une classe `border-red-*`), listes à flèche du site,
  cases et radios dessinées (bordeaux, coche qui « claque »), messages d'erreur qui glissent,
  boutons qui s'enfoncent. Le sélecteur de base est sous `:where()` pour que les états l'emportent.
  **Composants** `app/formulaires/Charte.tsx` : `EnteteFormulaire` (bandeau bordeaux, grand titre
  condensé ; **pas de « Centrale Générale FGTB Namur-Luxembourg » dans les en-têtes**, demande de
  Fred) et `EtapesFormulaire` (pastilles numérotées, filet qui se remplit, « Étape 2 sur 6 · … »,
  retour en arrière cliquable si `onRevenir`). **Classes** : `form-cadre`, `form-carte`,
  `form-section`, `form-libelle`, `form-aide`, `form-erreur`, `form-encart`, `form-actions`,
  `form-btn-principal` / `-secondaire` / `-retour`, `etape-entree` (le contenu d'une étape monte en
  fondu ; `key={step}` sur son conteneur). Tout nouveau formulaire les utilise.
- **Motion** : animations sobres, une seule à l'ouverture d'un écran au maximum ;
  toujours respecter `prefers-reduced-motion`.
- **Chargement : toujours visible** (règle de Fred, 29/09/2026). Indicateur
  unique du site, inspiré d'un cercle « loop out » (l'arc s'allonge, fait le
  tour puis se rétracte) : `app/Chargement.tsx`, animations `.chargement-*`
  dans `app/globals.css` (en mouvement réduit : arc fixe + texte).
  `IconeChargement` = petite icône dans un bouton ou devant un texte « … en
  cours » (couleur du texte : blanc sur bouton bordeaux, `text-militant-rouge`
  ailleurs) ; `EcranChargement` = grand cercle rouge + arc bordeaux intérieur
  avec un texte, pour une attente longue (IA, première liste, fiche). **Pas
  d'écran de chargement entre deux pages** (pas de `loading.tsx`, choix de Fred
  du 29/09/2026). **Ne plus utiliser `Loader2` ni
  `animate-spin`** : tout nouveau chargement passe par ces deux composants, avec
  un texte qui dit ce qui se passe.
- **Accessibilité** : vrais `<button>` / `<a>` / `<label>`, focus visible,
  cibles tactiles ≥ 44 px, `aria-label` sur les boutons-icônes.

### Rédaction
- Français, phrases courtes, voix active. Les messages d'erreur disent ce qui s'est
  passé et comment réagir, sans s'excuser.
- Pas de contenu inventé sur le site : une donnée inconnue reste absente (pas de
  « [À COMPLÉTER] » visible en production).

## Rappels techniques
- Stack : Next.js 16 (App Router, Node 24), Supabase, Vercel, Resend (envoi
  d'e-mails), Tailwind 3, `@react-pdf/renderer`, Vitest, Tiptap (éditeur),
  `sanitize-html`, `fast-xml-parser` (flux RSS), `motion` (animations de `/pourquoi-s-affilier`, `motion/react`), `@anthropic-ai/sdk` + `zod`
  (rédaction assistée, déclinaison réseaux et vulgarisation, serveur uniquement ;
  erreurs de l'API traduites par `lib/anthropic-erreurs.ts`), `mammoth` (.docx) et
  `unpdf` (.pdf) pour l'extraction des notes FGTB, serveur uniquement.
- Le `.env.local` de `web_affiliations` pointe **déjà** vers CG Link — ne pas le
  modifier. Les clés restent dans `.env.local` (jamais dans ce fichier ni sur GitHub).
- **Next.js 16** : le middleware s'appelle `proxy.ts` (verrou de `/suivi-actions`).
- **Clients Supabase** (`lib/supabase.ts`, `lib/supabase-server.ts`) :
  `getSupabase()` = public sans session (vues publiques, anciens formulaires) ;
  `getSupabaseAuth()` = navigateur avec session en cookies (`@supabase/ssr`,
  écritures admin) ; `getSupabaseServer()` / `getSuperAdmin()` = côté serveur.
- **Piège Next.js** : une fonction exportée d'un fichier `"use client"` ne peut pas
  être appelée depuis un composant serveur. Les utilitaires partagés vont dans
  `lib/` (ex. `titreAction`, `ancreUne` dans `lib/actions.ts`).
- **Polices** : `next/font/local` exige des chemins écrits en toutes lettres (pas
  de variable). Google Fonts n'est pas joignable depuis le poste de dev (proxy
  réseau) → polices auto-hébergées.
- **PDF (`@react-pdf/renderer`)** : généré dans le navigateur ; polices en `.woff`
  dans `public/fonts/` ; les éléments `fixed` positionnés avec `bottom` sortent de
  la page → les placer avec `top` (A4 = 842 pt de haut) ; un élément `absolute`
  **sans** `fixed` placé avec `top` sur un document de plusieurs pages fait tourner
  la génération sans fin → toujours `fixed` pour un pied de page ; les emojis et
  symboles (⚠…) sont retirés (absents des polices).
- **Images** : photos du bucket servies via `next/image` (domaine Supabase
  autorisé dans `next.config.ts`). Pages publiques revalidées toutes les 60 s.
- **Pièges rencontrés (blog, veille, IA)** :
  - un `page.tsx` ne peut exporter que les noms prévus par Next.js (pas de
    constante ni de composant en plus) → les mettre dans `lib/` ou un fichier
    voisin ;
  - un composant client ne doit importer de `lib/` que des fichiers **sans
    dépendance serveur** (sinon `sanitize-html`, `zod`, `fast-xml-parser`
    partent dans le navigateur) : `import type` est sans risque, les constantes
    partagées vont dans un petit fichier dédié (`lib/redaction-limites.ts`,
    `lib/veille.ts`) ;
  - champ fichier : copier `input.files[0]` **avant** `input.value = ""` (vider
    le champ vide aussi sa `FileList` dans Chrome et Edge) ;
  - Tiptap : `immediatelyRender: false` (rendu serveur) ; l'éditeur ne relit sa
    valeur qu'à sa création → changer sa `key` pour recharger un contenu ;
  - Supabase : le schéma n'est pas lisible avec la clé publique ; les colonnes
    ont été relevées par sondage en lecture seule (`select=<col>&limit=0`).
    **Aucune écriture de test dans la base.**
- **Tests** : `npm test` (Vitest, fichiers `lib/**/*.test.ts`).
- **Git** : travailler sur la branche de la fonctionnalité (actuellement
  `suivi-actions`), jamais directement sur `main`, rien déployer sans l'accord de
  Fred.
