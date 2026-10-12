# Feuille de route : les phases

> Ramification de [CLAUDE.md](../../CLAUDE.md) (à la racine du projet). Contenu déplacé tel quel le 12/10/2026.

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
