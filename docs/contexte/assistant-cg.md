# Assistant CG (chatbot d'aiguillage)

> Ramification de [CLAUDE.md](../../CLAUDE.md) (à la racine du projet). Contenu déplacé tel quel le 12/10/2026.

**Assistant CG** (chatbot d'aiguillage, 08/10/2026, demande de Fred ; développé sur une branche `chatbot`, fusionnée dans `suivi-actions` puis supprimée) : bulle
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
