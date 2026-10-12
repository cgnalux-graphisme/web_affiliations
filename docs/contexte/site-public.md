# Site public : pages, navigation, cookies, démarches

> Ramification de [CLAUDE.md](../../CLAUDE.md) (à la racine du projet). Contenu déplacé tel quel le 12/10/2026.

## Plan du site public (routes)

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
| `/api/send-modification` | public | E-mail « Changement de situation » (PDF joint) à l'affilié (adresse actuelle + nouvelle si donnée) et aux adresses internes de l'envoi `modification` ; le serveur recalcule récapitulatif et transfert depuis les données reçues |

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
gestion (actions, articles, Scan News, demandes, paramètres) vit dans l'**Espace CG**,
sous `/espace/<app>/…` (voir [app/espace/CLAUDE.md](../../app/espace/CLAUDE.md)).


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
