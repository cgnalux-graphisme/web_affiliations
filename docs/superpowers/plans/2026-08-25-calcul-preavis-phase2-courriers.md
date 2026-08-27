# Calcul de préavis — Phase 2 : courriers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Générer, à partir des textes sources verbatim fournis par l'utilisateur, les deux courriers (notification de préavis par le travailleur, convention de rupture de commun accord) avec interpolation des données calculées (Phase 1) et des coordonnées saisies par l'utilisateur.

**Architecture:** Deux modules purs sous `lib/preavis/courriers/` : `templates.ts` (texte source, avec des jetons `{{TOKEN}}` remplaçant à la fois les placeholders légaux `[XXX]` et les blancs à pointillés du document original) et `fusion.ts` (logique de remplacement + fonctions publiques `genererConventionCommunAccord` / `genererNotificationDemission`). Aucune UI dans cette phase — c'est la Phase 4. Le rendu PDF (`@react-pdf/renderer`, mentionné au design spec §7.3) est également différé à la Phase 4, où il sera câblé directement dans le composant qui affiche le résultat.

**Tech Stack:** TypeScript, Vitest (déjà configuré en Phase 1). Réutilise `isoToDateFr` de `lib/dates.ts` (déjà présent dans le projet, format JJ/MM/AAAA).

**Source des textes** : `docs/superpowers/specs/2026-08-25-calcul-preavis-design.md` §7 (textes verbatim, ne pas reformuler le texte légal).

**Pré-requis** : Phase 1 terminée (branche `feature/preavis-moteur`, worktree `.worktrees/preavis-moteur/`). Ce plan continue sur la même branche/worktree.

---

## Task 1: Templates verbatim

**Files:**
- Create: `lib/preavis/courriers/templates.ts`

Les deux textes sources (design spec §7.1 et §7.2), avec les blancs à
pointillés de l'original ET les placeholders `[XXX]` unifiés sous un seul
mécanisme de jetons `{{TOKEN}}` (géré par `fusion.ts` en Task 2/3). Aucun
mot du texte légal n'est modifié par rapport à l'original.

- [ ] **Step 1: Écrire le fichier**

```typescript
/**
 * Textes sources verbatim (design spec §7), fournis par l'utilisateur
 * (documents .doc, auteur Martin Pierrard, FGTB). Le texte légal n'est
 * jamais reformulé : seuls les jetons {{TOKEN}} (blancs à pointillés de
 * l'original + placeholders [XXX] du modèle) sont remplacés par
 * fusion.ts.
 */

export const TEMPLATE_COMMUN_ACCORD = `CONVENTION DE RUPTURE DE COMMUN ACCORD

Entre les soussignés :

D'une part, le travailleur : {{NOM_TRAVAILLEUR}}
domicilié(e) à : {{DOMICILE_TRAVAILLEUR}}

D'autre part, l'employeur / la société : {{NOM_EMPLOYEUR}}
représenté(e) par : {{REPRESENTANT_EMPLOYEUR}}
ayant son siège à : {{SIEGE_EMPLOYEUR}}

Il est convenu ce qui suit :

1) Les parties décident librement et d'un commun accord de mettre fin au
   contrat de travail qui les lie à la date du {{DATE_FIN_CONTRAT}}, {{MENTION_PRESTATION}}.

2) Sous réserve du paiement de la rémunération, du pécule de vacances, des
   avantages acquis et de la remise des documents sociaux dus, chacune des
   parties renonce à réclamer à l'autre une indemnité compensatoire de
   préavis du seul fait de cette rupture.

3) L'employeur remettra au travailleur, dans les délais légaux, le décompte
   final et les documents sociaux requis, notamment le formulaire C4.

4) Chacune des parties reconnaît avoir reçu un original signé de la
   présente convention.

Fait en deux exemplaires à {{LIEU_SIGNATURE}}, le {{DATE_SIGNATURE}}

Signature du travailleur               Signature de l'employeur
« Lu et approuvé »                     « Lu et approuvé »`;

export const TEMPLATE_NOTIFICATION_DEMISSION = `NOTIFICATION DE PRÉAVIS PAR LE TRAVAILLEUR
PAR COURRIER RECOMMANDÉ

Je soussigné(e) : {{NOM_TRAVAILLEUR}}
domicilié(e) à : {{DOMICILE_TRAVAILLEUR}}

avertis par la présente mon employeur, {{NOM_EMPLOYEUR}}
que je mets fin à mon contrat de travail moyennant un délai de préavis.

Compte tenu de mon ancienneté, la durée de mon préavis est de :
{{DUREE_PREAVIS}}

Le délai de préavis débutera le : {{DATE_DEBUT_PREAVIS}}.

Il couvrira la période du {{DATE_DEBUT_PREAVIS}} au {{DATE_FIN_PREAVIS}} inclus.

Fait à {{LIEU_SIGNATURE}}, le {{DATE_SIGNATURE}}

Signature du travailleur,`;

/** Les trois formulations possibles pour la mention "avec/sans prestation" (point 1 de la convention). */
export const MENTION_PRESTATION_AVEC = "après l'exécution de la journée de travail";
export const MENTION_PRESTATION_SANS = "sans prestation ce jour-là";
export const MENTION_PRESTATION_NON_RESOLUE = `${MENTION_PRESTATION_AVEC} / ${MENTION_PRESTATION_SANS}\n   (biffer la mention inutile)`;
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur (fichier de constantes, pas de test dédié — il est exercé par les tests de Task 2/3).

- [ ] **Step 3: Commit**

```bash
git add lib/preavis/courriers/templates.ts
git commit -m "feat(preavis): add verbatim letter templates (démission, rupture de commun accord)"
```

---

## Task 2: Fusion — convention de rupture de commun accord

**Files:**
- Create: `lib/preavis/courriers/fusion.ts`
- Test: `lib/preavis/courriers/fusion.test.ts`

**Source :** design spec §7.1 (champs interpolés : `DATE_FIN_CONTRAT`, choix
« avec/sans prestation », identité/domicile/employeur/siège/lieu de
signature pré-remplis si saisis, sinon pointillés d'origine conservés — §3).

- [ ] **Step 1: Écrire les tests**

```typescript
import { describe, expect, it } from "vitest";
import { genererConventionCommunAccord } from "./fusion";
import { MENTION_PRESTATION_AVEC, MENTION_PRESTATION_SANS, MENTION_PRESTATION_NON_RESOLUE } from "./templates";

describe("genererConventionCommunAccord", () => {
  it("garde les pointillés d'origine quand aucune coordonnée n'est fournie", () => {
    const texte = genererConventionCommunAccord({ dateFinContratIso: "2026-09-30" });

    expect(texte).toContain("CONVENTION DE RUPTURE DE COMMUN ACCORD");
    expect(texte).toContain("D'une part, le travailleur : ...");
    expect(texte).toContain("l'employeur / la société : ...");
    expect(texte).not.toContain("{{");
  });

  it("interpole la date de fin de contrat au format JJ/MM/AAAA", () => {
    const texte = genererConventionCommunAccord({ dateFinContratIso: "2026-09-30" });
    expect(texte).toContain("à la date du 30/09/2026,");
  });

  it("pré-remplit les coordonnées fournies", () => {
    const texte = genererConventionCommunAccord({
      dateFinContratIso: "2026-09-30",
      nomTravailleur: "Jean Dupont",
      domicileTravailleur: "Rue de la Paix 1, 5000 Namur",
      nomEmployeur: "SPRL Bâtiment Wallon",
      siegeEmployeur: "Chaussée de Charleroi 10, 6000 Charleroi",
      lieuSignature: "Namur",
    });

    expect(texte).toContain("le travailleur : Jean Dupont");
    expect(texte).toContain("domicilié(e) à : Rue de la Paix 1, 5000 Namur");
    expect(texte).toContain("la société : SPRL Bâtiment Wallon");
    expect(texte).toContain("son siège à : Chaussée de Charleroi 10, 6000 Charleroi");
    expect(texte).toContain("Fait en deux exemplaires à Namur,");
    // Champ non collecté par le wizard (design spec §3) : reste en pointillés.
    expect(texte).toContain("représenté(e) par : ...");
  });

  it("laisse les deux options + la note « biffer » si avecPrestation n'est pas précisé", () => {
    const texte = genererConventionCommunAccord({ dateFinContratIso: "2026-09-30" });
    expect(texte).toContain(MENTION_PRESTATION_NON_RESOLUE);
  });

  it("résout la mention sur « après l'exécution de la journée de travail » si avecPrestation=true", () => {
    const texte = genererConventionCommunAccord({ dateFinContratIso: "2026-09-30", avecPrestation: true });
    expect(texte).toContain(`la date du 30/09/2026, ${MENTION_PRESTATION_AVEC}.`);
    expect(texte).not.toContain("biffer");
  });

  it("résout la mention sur « sans prestation ce jour-là » si avecPrestation=false", () => {
    const texte = genererConventionCommunAccord({ dateFinContratIso: "2026-09-30", avecPrestation: false });
    expect(texte).toContain(`la date du 30/09/2026, ${MENTION_PRESTATION_SANS}.`);
    expect(texte).not.toContain("biffer");
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `npm test -- fusion`
Expected: FAIL — module `./fusion` introuvable

- [ ] **Step 3: Implémenter**

```typescript
import { isoToDateFr } from "../../dates";
import type { DateISO } from "../types";
import {
  TEMPLATE_COMMUN_ACCORD,
  TEMPLATE_NOTIFICATION_DEMISSION,
  MENTION_PRESTATION_AVEC,
  MENTION_PRESTATION_SANS,
  MENTION_PRESTATION_NON_RESOLUE,
} from "./templates";

/** Pointillés de remplacement pour un champ non renseigné (fidèle à la mise en page des documents originaux). */
const POINTILLES = "...........................................";

type Champs = Record<string, string>;

function fusionner(template: string, champs: Champs): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_correspondance, jeton: string) => champs[jeton] ?? POINTILLES);
}

/** Coordonnées d'identité communes aux deux courriers, toutes optionnelles (design spec §3). */
export interface DonneesIdentite {
  nomTravailleur?: string;
  domicileTravailleur?: string;
  nomEmployeur?: string;
  lieuSignature?: string;
}

export interface DonneesConventionCommunAccord extends DonneesIdentite {
  siegeEmployeur?: string;
  dateFinContratIso: DateISO;
  /** true = "après l'exécution de la journée de travail", false = "sans prestation ce jour-là", non précisé = les deux options + note "biffer" (comme l'original). */
  avecPrestation?: boolean;
}

function formaterMentionPrestation(avecPrestation: boolean | undefined): string {
  if (avecPrestation === true) return MENTION_PRESTATION_AVEC;
  if (avecPrestation === false) return MENTION_PRESTATION_SANS;
  return MENTION_PRESTATION_NON_RESOLUE;
}

export function genererConventionCommunAccord(donnees: DonneesConventionCommunAccord): string {
  const champs: Champs = {
    NOM_TRAVAILLEUR: donnees.nomTravailleur ?? POINTILLES,
    DOMICILE_TRAVAILLEUR: donnees.domicileTravailleur ?? POINTILLES,
    NOM_EMPLOYEUR: donnees.nomEmployeur ?? POINTILLES,
    // Non collecté par le wizard (design spec §3) : toujours en pointillés.
    REPRESENTANT_EMPLOYEUR: POINTILLES,
    SIEGE_EMPLOYEUR: donnees.siegeEmployeur ?? POINTILLES,
    DATE_FIN_CONTRAT: isoToDateFr(donnees.dateFinContratIso),
    MENTION_PRESTATION: formaterMentionPrestation(donnees.avecPrestation),
    LIEU_SIGNATURE: donnees.lieuSignature ?? POINTILLES,
    // Non collecté par le wizard (design spec §3) : toujours en pointillés.
    DATE_SIGNATURE: POINTILLES,
  };
  return fusionner(TEMPLATE_COMMUN_ACCORD, champs);
}
```

Note : `genererNotificationDemission` (Task 3) sera ajouté au même fichier
`fusion.ts` — ne pas le créer ici, la Task 3 fournit son code complet.

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `npm test -- fusion`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/preavis/courriers/fusion.ts lib/preavis/courriers/fusion.test.ts
git commit -m "feat(preavis): generate convention de rupture de commun accord letter"
```

---

## Task 3: Fusion — notification de préavis par le travailleur

**Files:**
- Modify: `lib/preavis/courriers/fusion.ts`
- Modify: `lib/preavis/courriers/fusion.test.ts`

**Source :** design spec §7.2 (champs interpolés : `DUREE_PREAVIS`,
`DATE_DEBUT_PREAVIS` ×2, `DATE_FIN_PREAVIS`, calculés par le moteur des
Phases 1 ; identité/domicile/nom employeur/lieu pré-remplis si saisis).

- [ ] **Step 1: Ajouter les tests**

Ajouter à la fin de `lib/preavis/courriers/fusion.test.ts` (après le
`describe("genererConventionCommunAccord", ...)` existant) :

```typescript
import { genererNotificationDemission } from "./fusion";

describe("genererNotificationDemission", () => {
  it("garde les pointillés d'origine quand aucune coordonnée n'est fournie", () => {
    const texte = genererNotificationDemission({
      dureeJours: 91,
      dateDebutPreavisIso: "2026-09-07",
      dateFinPreavisIso: "2026-11-15",
    });

    expect(texte).toContain("NOTIFICATION DE PRÉAVIS PAR LE TRAVAILLEUR");
    expect(texte).toContain("Je soussigné(e) : ...");
    expect(texte).not.toContain("{{");
  });

  it("affiche la durée en jours et semaines quand le nombre de jours est un multiple de 7", () => {
    const texte = genererNotificationDemission({
      dureeJours: 91,
      dateDebutPreavisIso: "2026-09-07",
      dateFinPreavisIso: "2026-11-15",
    });
    expect(texte).toContain("91 jours (13 semaines)");
  });

  it("affiche la durée en jours seulement quand ce n'est pas un multiple de 7", () => {
    const texte = genererNotificationDemission({
      dureeJours: 44,
      dateDebutPreavisIso: "2026-09-07",
      dateFinPreavisIso: "2026-10-20",
    });
    expect(texte).toContain("44 jours");
    expect(texte).not.toContain("semaines)");
  });

  it("interpole les dates au format JJ/MM/AAAA et répète correctement la date de début (×2)", () => {
    const texte = genererNotificationDemission({
      dureeJours: 91,
      dateDebutPreavisIso: "2026-09-07",
      dateFinPreavisIso: "2026-11-15",
    });

    expect(texte).toContain("débutera le : 07/09/2026.");
    expect(texte).toContain("Il couvrira la période du 07/09/2026 au 15/11/2026 inclus.");
  });

  it("pré-remplit les coordonnées fournies", () => {
    const texte = genererNotificationDemission({
      dureeJours: 91,
      dateDebutPreavisIso: "2026-09-07",
      dateFinPreavisIso: "2026-11-15",
      nomTravailleur: "Jean Dupont",
      domicileTravailleur: "Rue de la Paix 1, 5000 Namur",
      nomEmployeur: "SPRL Bâtiment Wallon",
      lieuSignature: "Namur",
    });

    expect(texte).toContain("Je soussigné(e) : Jean Dupont");
    expect(texte).toContain("domicilié(e) à : Rue de la Paix 1, 5000 Namur");
    expect(texte).toContain("mon employeur, SPRL Bâtiment Wallon");
    expect(texte).toContain("Fait à Namur,");
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `npm test -- fusion`
Expected: FAIL — `genererNotificationDemission` n'est pas exporté par `./fusion`

- [ ] **Step 3: Ajouter à `lib/preavis/courriers/fusion.ts`**

Ajouter ce code à la fin du fichier existant (ne pas toucher au code de
Task 2 au-dessus) :

```typescript
export interface DonneesNotificationDemission extends DonneesIdentite {
  dureeJours: number;
  dateDebutPreavisIso: DateISO;
  dateFinPreavisIso: DateISO;
}

/** "91 jours (13 semaines)" si le nombre de jours est un multiple de 7, sinon "44 jours" seul. */
export function formaterDureePreavis(jours: number): string {
  if (jours % 7 === 0) {
    return `${jours} jours (${jours / 7} semaines)`;
  }
  return `${jours} jours`;
}

export function genererNotificationDemission(donnees: DonneesNotificationDemission): string {
  const champs: Champs = {
    NOM_TRAVAILLEUR: donnees.nomTravailleur ?? POINTILLES,
    DOMICILE_TRAVAILLEUR: donnees.domicileTravailleur ?? POINTILLES,
    NOM_EMPLOYEUR: donnees.nomEmployeur ?? POINTILLES,
    DUREE_PREAVIS: formaterDureePreavis(donnees.dureeJours),
    DATE_DEBUT_PREAVIS: isoToDateFr(donnees.dateDebutPreavisIso),
    DATE_FIN_PREAVIS: isoToDateFr(donnees.dateFinPreavisIso),
    LIEU_SIGNATURE: donnees.lieuSignature ?? POINTILLES,
    // Non collecté par le wizard (design spec §3) : toujours en pointillés.
    DATE_SIGNATURE: POINTILLES,
  };
  return fusionner(TEMPLATE_NOTIFICATION_DEMISSION, champs);
}
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `npm test -- fusion`
Expected: PASS (11 tests : 6 de Task 2 + 5 de Task 3)

- [ ] **Step 5: Commit**

```bash
git add lib/preavis/courriers/fusion.ts lib/preavis/courriers/fusion.test.ts
git commit -m "feat(preavis): generate notification de préavis par le travailleur letter"
```

---

## Task 4: Suite complète — vérification finale

- [ ] **Step 1: Lancer toute la suite de tests**

Run: `npm test`
Expected: PASS — tous les tests des Phases 1 et 2 (73 tests de la Phase 1 + 11 nouveaux = 84 tests).

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Commit final de vérification (si des ajustements ont été faits)**

```bash
git add -A
git commit -m "test(preavis): fix any remaining issues found during full suite run"
```

(Ne committer que s'il y a effectivement des changements ; sinon, simple
constat de succès sans commit.)

---

## Suite (phases non couvertes par ce plan)

- **Phase 3 — Contenus informatifs** : sanctions ONEM démission, procédures
  d'envoi (pli simple/recommandé/main propre/huissier) — design spec §8.
- **Phase 4 — UI** : `app/preavis/page.tsx` (wizard), entrée dans
  `app/forms.ts`, rendu PDF des courriers (`@react-pdf/renderer`, différé
  depuis cette Phase 2 — voir design spec §7.3), test manuel en navigateur.
- **Phase 5 — Couverture CP étendue** : les ~44 CP restantes du classeur ACCG.
