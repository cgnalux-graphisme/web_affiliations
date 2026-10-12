# Design : direction D, palette, composants, PDF

> Ramification de [CLAUDE.md](../../CLAUDE.md) (à la racine du projet). Contenu déplacé tel quel le 12/10/2026.

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
