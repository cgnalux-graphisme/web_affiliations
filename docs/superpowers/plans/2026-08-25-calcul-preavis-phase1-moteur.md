# Calcul de préavis — Phase 1 : moteur de calcul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter, avec tests, le moteur de calcul pur (aucune UI) qui donne la durée de préavis (employeur et démission), l'indemnité compensatoire éventuelle, et les dates clés, pour un ouvrier ou un employé, en tenant compte du régime transitoire pré-2014 et des réformes 2026.

**Architecture:** Modules TypeScript purs sous `lib/preavis/`, séparant strictement les données légales sourcées (`baremes/`) de la logique de calcul (`calcul-preavis.ts`, `jours-ouvrables.ts`, `dates-preavis.ts`). Aucune dépendance React/Next — testable en isolation avec Vitest. Ce plan ne couvre pas encore l'UI (`app/preavis/page.tsx`), les courriers, ni les contenus informatifs ONEM — ce sont des phases suivantes distinctes (voir §"Suite" en fin de plan), le spec `docs/superpowers/specs/2026-08-25-calcul-preavis-design.md` couvrant plusieurs sous-systèmes indépendants qu'il vaut mieux planifier séparément.

**Tech Stack:** TypeScript, Vitest (à installer — le projet n'a aucun framework de test actuellement).

**Source des données légales :** `docs/superpowers/specs/2026-08-25-calcul-preavis-design.md` §12, et les classeurs `lib/preavis/baremes/sources/accg-preavis-employeur.xlsx` / `accg-preavis-travailleur.xlsx`.

---

## Task 0: Installer et configurer Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Installer les dépendances**

Run: `npm install -D vitest`
Expected: ajout de `vitest` dans `devDependencies` de `package.json`.

- [ ] **Step 2: Ajouter le script de test**

Dans `package.json`, dans `"scripts"`, ajouter :

```json
"test": "vitest run"
```

- [ ] **Step 3: Créer la config Vitest**

Créer `vitest.config.ts` :

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Vérifier que Vitest se lance (aucun test encore)**

Run: `npm test`
Expected: `No test files found` (pas d'erreur de configuration).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for lib/preavis unit tests"
```

---

## Task 1: Types du domaine

**Files:**
- Create: `lib/preavis/types.ts`

- [ ] **Step 1: Écrire les types**

```typescript
export type Statut = "ouvrier" | "employe";

export type QuiRompt = "employeur" | "travailleur";

/** Date au format ISO AAAA-MM-JJ (voir lib/dates.ts). */
export type DateISO = string;

export interface DureePreavis {
  jours: number;
  semaines: number;
}

export interface ResultatPreavisOuvrier {
  statut: "ouvrier";
  quiRompt: QuiRompt;
  cp: string;
  cpCouverte: boolean;
  regimeApplique: "cp-specifique" | "cct75-supletif";
  javantPart1: DureePreavis;
  japresPart2: DureePreavis;
  total: DureePreavis;
  indemniteCompensatoire: DureePreavis | null;
}

export interface ResultatPreavisEmploye {
  statut: "employe";
  quiRompt: QuiRompt;
  seuilDepasse: boolean;
  part1: DureePreavis;
  part2: DureePreavis;
  total: DureePreavis;
  part1DemissionIncertaine: boolean;
}

export type ResultatPreavis = ResultatPreavisOuvrier | ResultatPreavisEmploye;
```

- [ ] **Step 2: Commit**

```bash
git add lib/preavis/types.ts
git commit -m "feat(preavis): add domain types"
```

---

## Task 2: Utilitaire de mois d'ancienneté

**Files:**
- Create: `lib/preavis/anciennete.ts`
- Test: `lib/preavis/anciennete.test.ts`

- [ ] **Step 1: Écrire les tests (cas réels tirés du classeur ACCG)**

```typescript
import { describe, expect, it } from "vitest";
import { moisEntre } from "./anciennete";

describe("moisEntre", () => {
  it("calcule les mois entiers entre deux dates (exemple employeur ACCG CP124)", () => {
    // Embauche 02/02/1998, début préavis 06/12/2022 -> 298 mois (valeur cachée I9 du classeur)
    expect(moisEntre("1998-02-02", "2022-12-06")).toBe(298);
  });

  it("calcule l'ancienneté acquise depuis le 1/1/2014 (exemple ACCG CP124)", () => {
    expect(moisEntre("2014-01-01", "2022-12-06")).toBe(107);
  });

  it("calcule l'exemple démission ACCG (embauche 1993)", () => {
    expect(moisEntre("1993-02-02", "2022-12-06")).toBe(358);
  });

  it("ne décompte pas le mois courant si le jour n'est pas encore atteint", () => {
    expect(moisEntre("2020-01-15", "2020-03-10")).toBe(1);
  });

  it("décompte le mois courant si le jour est atteint ou dépassé", () => {
    expect(moisEntre("2020-01-15", "2020-03-15")).toBe(2);
  });

  it("retourne 0 si les dates sont identiques", () => {
    expect(moisEntre("2020-01-15", "2020-01-15")).toBe(0);
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `npm test -- anciennete`
Expected: FAIL — `Cannot find module './anciennete'`

- [ ] **Step 3: Implémenter**

```typescript
import type { DateISO } from "./types";

function parseISO(date: DateISO): { y: number; m: number; d: number } {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}

/** Nombre de mois entiers écoulés entre deux dates ISO (AAAA-MM-JJ). */
export function moisEntre(debutISO: DateISO, finISO: DateISO): number {
  const debut = parseISO(debutISO);
  const fin = parseISO(finISO);

  let mois = (fin.y - debut.y) * 12 + (fin.m - debut.m);
  if (fin.d < debut.d) {
    mois -= 1;
  }
  return Math.max(0, mois);
}
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `npm test -- anciennete`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/preavis/anciennete.ts lib/preavis/anciennete.test.ts
git commit -m "feat(preavis): add seniority-in-months calculation, validated against ACCG worked examples"
```

---

## Task 3: Barème général post-2014 (statut unique)

**Files:**
- Create: `lib/preavis/baremes/general-2014.ts`
- Test: `lib/preavis/baremes/general-2014.test.ts`

**Source :** design spec §12.1 (SPF Emploi + Securex + classeur ACCG feuille `'2014'`, cross-validés).

- [ ] **Step 1: Écrire les tests**

```typescript
import { describe, expect, it } from "vitest";
import { preavisGeneralEmployeur, preavisGeneralDemission } from "./general-2014";

describe("preavisGeneralEmployeur", () => {
  it("donne 1 semaine sous 3 mois", () => {
    expect(preavisGeneralEmployeur(0)).toBe(1);
    expect(preavisGeneralEmployeur(2)).toBe(1);
  });

  it("suit la progression mensuelle jusqu'à 2 ans", () => {
    expect(preavisGeneralEmployeur(3)).toBe(3);
    expect(preavisGeneralEmployeur(6)).toBe(6);
    expect(preavisGeneralEmployeur(12)).toBe(8);
    expect(preavisGeneralEmployeur(24)).toBe(12);
  });

  it("donne 62 semaines à 20 ans (240 mois) et 66 à 24 ans (exemple ACCG)", () => {
    expect(preavisGeneralEmployeur(240)).toBe(62);
    expect(preavisGeneralEmployeur(288)).toBe(66);
  });

  it("continue de croître d'1 semaine/an après 20 ans", () => {
    expect(preavisGeneralEmployeur(612)).toBe(93);
  });
});

describe("preavisGeneralDemission", () => {
  it("donne 1 semaine sous 3 mois", () => {
    expect(preavisGeneralDemission(0)).toBe(1);
  });

  it("plafonne à 13 semaines dès 8 ans (96 mois)", () => {
    expect(preavisGeneralDemission(96)).toBe(13);
    expect(preavisGeneralDemission(300)).toBe(13);
  });

  it("donne 91 jours (13 sem) pour l'exemple ACCG CP124 démission (358 mois d'ancienneté totale, 107 depuis 2014)", () => {
    expect(preavisGeneralDemission(107)).toBe(13);
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `npm test -- general-2014`
Expected: FAIL — module introuvable

- [ ] **Step 3: Implémenter**

```typescript
interface Palier {
  moisMin: number;
  semaines: number;
}

function lookup(paliers: Palier[], mois: number): number {
  let semaines = paliers[0].semaines;
  for (const palier of paliers) {
    if (mois >= palier.moisMin) {
      semaines = palier.semaines;
    } else {
      break;
    }
  }
  return semaines;
}

/**
 * Barème général employeur, statut unique (Art. 37/2 loi du 3/7/1978),
 * en semaines par mois d'ancienneté acquise. Source: SPF Emploi + Securex,
 * cross-validé classeur ACCG feuille '2014'. Voir design spec §12.1.
 * Valide pour les contrats commencés avant le 1/6/2026 (pas de plafond
 * 52 semaines) — voir baremes/reforme-2026.ts pour le correctif.
 */
const PALIERS_EMPLOYEUR: Palier[] = [
  { moisMin: 0, semaines: 1 },
  { moisMin: 3, semaines: 3 },
  { moisMin: 4, semaines: 4 },
  { moisMin: 5, semaines: 5 },
  { moisMin: 6, semaines: 6 },
  { moisMin: 9, semaines: 7 },
  { moisMin: 12, semaines: 8 },
  { moisMin: 15, semaines: 9 },
  { moisMin: 18, semaines: 10 },
  { moisMin: 21, semaines: 11 },
  { moisMin: 24, semaines: 12 },
  { moisMin: 36, semaines: 13 },
  { moisMin: 48, semaines: 15 },
  { moisMin: 60, semaines: 18 },
  { moisMin: 72, semaines: 21 },
  { moisMin: 84, semaines: 24 },
  { moisMin: 96, semaines: 27 },
  { moisMin: 108, semaines: 30 },
  { moisMin: 120, semaines: 33 },
  { moisMin: 132, semaines: 36 },
  { moisMin: 144, semaines: 39 },
  { moisMin: 156, semaines: 42 },
  { moisMin: 168, semaines: 45 },
  { moisMin: 180, semaines: 48 },
  { moisMin: 192, semaines: 51 },
  { moisMin: 204, semaines: 54 },
  { moisMin: 216, semaines: 57 },
  { moisMin: 228, semaines: 60 },
  { moisMin: 240, semaines: 62 },
  { moisMin: 252, semaines: 63 },
  { moisMin: 264, semaines: 64 },
  { moisMin: 276, semaines: 65 },
  { moisMin: 288, semaines: 66 },
  { moisMin: 300, semaines: 67 },
  { moisMin: 312, semaines: 68 },
  { moisMin: 324, semaines: 69 },
  { moisMin: 336, semaines: 70 },
  { moisMin: 348, semaines: 71 },
  { moisMin: 360, semaines: 72 },
  { moisMin: 372, semaines: 73 },
  { moisMin: 384, semaines: 74 },
  { moisMin: 396, semaines: 75 },
  { moisMin: 408, semaines: 76 },
  { moisMin: 420, semaines: 77 },
  { moisMin: 432, semaines: 78 },
  { moisMin: 444, semaines: 79 },
  { moisMin: 456, semaines: 80 },
  { moisMin: 468, semaines: 81 },
  { moisMin: 480, semaines: 82 },
  { moisMin: 492, semaines: 83 },
  { moisMin: 504, semaines: 84 },
  { moisMin: 516, semaines: 85 },
  { moisMin: 528, semaines: 86 },
  { moisMin: 540, semaines: 87 },
  { moisMin: 552, semaines: 88 },
  { moisMin: 564, semaines: 89 },
  { moisMin: 576, semaines: 90 },
  { moisMin: 588, semaines: 91 },
  { moisMin: 600, semaines: 92 },
  { moisMin: 612, semaines: 93 },
];

/**
 * Barème général démission, statut unique, plafonné à 13 semaines.
 * Source: SPF Emploi, régime du 28/10/2023. Voir design spec §12.1.
 */
const PALIERS_DEMISSION: Palier[] = [
  { moisMin: 0, semaines: 1 },
  { moisMin: 3, semaines: 2 },
  { moisMin: 6, semaines: 3 },
  { moisMin: 12, semaines: 4 },
  { moisMin: 18, semaines: 5 },
  { moisMin: 24, semaines: 6 },
  { moisMin: 48, semaines: 7 },
  { moisMin: 60, semaines: 9 },
  { moisMin: 72, semaines: 10 },
  { moisMin: 84, semaines: 12 },
  { moisMin: 96, semaines: 13 },
];

export function preavisGeneralEmployeur(moisAnciennete: number): number {
  return lookup(PALIERS_EMPLOYEUR, moisAnciennete);
}

export function preavisGeneralDemission(moisAnciennete: number): number {
  return lookup(PALIERS_DEMISSION, moisAnciennete);
}
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `npm test -- general-2014`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/preavis/baremes/general-2014.ts lib/preavis/baremes/general-2014.test.ts
git commit -m "feat(preavis): add general post-2014 notice barème (statut unique)"
```

---

## Task 4: Correctif légal 2026

**Files:**
- Create: `lib/preavis/baremes/reforme-2026.ts`
- Test: `lib/preavis/baremes/reforme-2026.test.ts`

**Source :** design spec §12.3 (loi du 3/7/2026, en vigueur 1/8/2026 — non confirmée sur source primaire Moniteur belge, à valider avant mise en production).

- [ ] **Step 1: Écrire les tests**

```typescript
import { describe, expect, it } from "vitest";
import { appliquerReforme2026 } from "./reforme-2026";

describe("appliquerReforme2026", () => {
  it("ne change rien pour un contrat commencé avant le 1/6/2026", () => {
    expect(appliquerReforme2026({ dateEmbauche: "2020-01-01", moisAnciennete: 240, semaines: 62 })).toBe(62);
  });

  it("plafonne à 52 semaines dès 17 ans pour un contrat commencé après le 31/5/2026", () => {
    expect(appliquerReforme2026({ dateEmbauche: "2026-06-01", moisAnciennete: 240, semaines: 62 })).toBe(52);
  });

  it("ne plafonne pas sous 17 ans même pour un contrat post-2026-06-01", () => {
    expect(appliquerReforme2026({ dateEmbauche: "2026-06-01", moisAnciennete: 120, semaines: 33 })).toBe(33);
  });

  it("impose 1 semaine forfaitaire sous 6 mois pour un contrat commencé après le 31/7/2026", () => {
    expect(appliquerReforme2026({ dateEmbauche: "2026-08-01", moisAnciennete: 4, semaines: 4 })).toBe(1);
  });

  it("n'impose pas le forfait 1 semaine pour un contrat commencé entre le 1/6 et le 31/7/2026", () => {
    expect(appliquerReforme2026({ dateEmbauche: "2026-06-15", moisAnciennete: 4, semaines: 4 })).toBe(4);
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `npm test -- reforme-2026`
Expected: FAIL — module introuvable

- [ ] **Step 3: Implémenter**

```typescript
import type { DateISO } from "../types";

const DATE_PLAFOND = "2026-06-01";
const DATE_SEMAINE_UNIQUE = "2026-08-01";

interface ParamsReforme2026 {
  dateEmbauche: DateISO;
  moisAnciennete: number;
  semaines: number;
}

/**
 * Applique les correctifs de la loi du 3 juillet 2026 (entrée en vigueur
 * le 1/8/2026) par-dessus le barème général post-2014, pour les contrats
 * concernés par leur date de début. Non confirmé sur source primaire
 * (Moniteur belge) — voir design spec §12.3, à valider avant mise en
 * production.
 */
export function appliquerReforme2026(params: ParamsReforme2026): number {
  const { dateEmbauche, moisAnciennete, semaines } = params;
  let resultat = semaines;

  if (dateEmbauche >= DATE_SEMAINE_UNIQUE && moisAnciennete < 6) {
    resultat = 1;
  }

  if (dateEmbauche >= DATE_PLAFOND && moisAnciennete >= 204) {
    resultat = Math.min(resultat, 52);
  }

  return resultat;
}
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `npm test -- reforme-2026`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/preavis/baremes/reforme-2026.ts lib/preavis/baremes/reforme-2026.test.ts
git commit -m "feat(preavis): apply 2026 notice-period reform (52-week cap, 1-week first 6 months)"
```

---

## Task 5: Tables ouvrier pré-2014 (6 CP prioritaires + CCT 75 supplétif)

**Files:**
- Create: `lib/preavis/baremes/ouvrier-pre-2014/types.ts`
- Create: `lib/preavis/baremes/ouvrier-pre-2014/cp-124-construction.ts`
- Create: `lib/preavis/baremes/ouvrier-pre-2014/cp-126-ameublement.ts`
- Create: `lib/preavis/baremes/ouvrier-pre-2014/cp-142-02-recuperation-metaux.ts`
- Create: `lib/preavis/baremes/ouvrier-pre-2014/cp-109-confection.ts`
- Create: `lib/preavis/baremes/ouvrier-pre-2014/cp-128-01-tanneries.ts`
- Create: `lib/preavis/baremes/ouvrier-pre-2014/cp-128-02-cuir.ts`
- Create: `lib/preavis/baremes/ouvrier-pre-2014/cct-75-supletif.ts`
- Create: `lib/preavis/baremes/ouvrier-pre-2014/index.ts`
- Test: `lib/preavis/baremes/ouvrier-pre-2014/index.test.ts`

**Source :** design spec §12.2 — classeur ACCG (source maîtresse) pour les 6 CP, CCT n°75 du 20/12/1999 (texte primaire cnt-nar.be) pour le régime supplétif.

- [ ] **Step 1: Écrire le type partagé**

```typescript
// types.ts
export interface EraJours {
  /** Date d'embauche à partir de laquelle cette valeur s'applique (AAAA-MM-JJ). */
  depuis: string;
  jours: number;
}

export interface TableCP {
  cp: string;
  nom: string;
  employeur: EraJours[];
  demission: EraJours[];
}
```

- [ ] **Step 2: Écrire les 6 tables CP (données extraites du classeur ACCG, design spec §12.2)**

```typescript
// cp-124-construction.ts
import type { TableCP } from "./types";

export const cp124Construction: TableCP = {
  cp: "124.00",
  nom: "Construction",
  employeur: [
    { depuis: "1900-01-01", jours: 56 },
    { depuis: "1994-01-01", jours: 28 },
    { depuis: "2011-01-01", jours: 14 },
    { depuis: "2012-01-01", jours: 16 },
    { depuis: "2013-07-01", jours: 4 },
    { depuis: "2014-01-01", jours: 0 },
  ],
  demission: [
    { depuis: "1900-01-01", jours: 28 },
    { depuis: "1994-01-01", jours: 14 },
    { depuis: "2011-01-01", jours: 7 },
    { depuis: "2012-01-01", jours: 7 },
    { depuis: "2013-07-01", jours: 1 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
```

```typescript
// cp-126-ameublement.ts
import type { TableCP } from "./types";

export const cp126Ameublement: TableCP = {
  cp: "126.00",
  nom: "Ameublement et industrie transformatrice du bois",
  employeur: [
    { depuis: "1900-01-01", jours: 112 },
    { depuis: "1994-01-01", jours: 28 },
    { depuis: "2013-01-01", jours: 32 },
    { depuis: "2014-01-01", jours: 0 },
  ],
  demission: [
    { depuis: "1900-01-01", jours: 28 },
    { depuis: "1994-01-01", jours: 14 },
    { depuis: "2013-01-01", jours: 14 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
```

```typescript
// cp-142-02-recuperation-metaux.ts
import type { TableCP } from "./types";

export const cp14202RecuperationMetaux: TableCP = {
  cp: "142.02",
  nom: "Récupération de métaux",
  employeur: [
    { depuis: "1900-01-01", jours: 112 },
    { depuis: "1994-01-01", jours: 42 },
    { depuis: "2009-01-01", jours: 28 },
    { depuis: "2012-01-01", jours: 32 },
    { depuis: "2013-07-01", jours: 28 },
    { depuis: "2014-01-01", jours: 0 },
  ],
  demission: [
    { depuis: "1900-01-01", jours: 56 },
    { depuis: "1994-01-01", jours: 21 },
    { depuis: "2009-01-01", jours: 14 },
    { depuis: "2012-01-01", jours: 14 },
    { depuis: "2013-07-01", jours: 14 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
```

```typescript
// cp-109-confection.ts
import type { TableCP } from "./types";

export const cp109Confection: TableCP = {
  cp: "109.00",
  nom: "Confection et habillement",
  employeur: [
    { depuis: "1900-01-01", jours: 64 },
    { depuis: "1994-01-01", jours: 32 },
    { depuis: "2014-01-01", jours: 0 },
  ],
  demission: [
    { depuis: "1900-01-01", jours: 28 },
    { depuis: "1994-01-01", jours: 14 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
```

```typescript
// cp-128-01-tanneries.ts
import type { TableCP } from "./types";

export const cp12801Tanneries: TableCP = {
  cp: "128.01",
  nom: "Tanneries",
  employeur: [
    { depuis: "1900-01-01", jours: 129 },
    { depuis: "1994-01-01", jours: 97 },
    { depuis: "1999-01-01", jours: 64 },
    { depuis: "2004-01-01", jours: 48 },
    { depuis: "2009-01-01", jours: 40 },
    { depuis: "2013-07-01", jours: 28 },
    { depuis: "2014-01-01", jours: 0 },
  ],
  demission: [
    { depuis: "1900-01-01", jours: 28 },
    { depuis: "1994-01-01", jours: 14 },
    { depuis: "1999-01-01", jours: 14 },
    { depuis: "2004-01-01", jours: 14 },
    { depuis: "2009-01-01", jours: 14 },
    { depuis: "2013-07-01", jours: 14 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
```

```typescript
// cp-128-02-cuir.ts
import type { TableCP } from "./types";

export const cp12802Cuir: TableCP = {
  cp: "128.02",
  nom: "Commerce et industrie du cuir (sous-secteur)",
  employeur: [
    { depuis: "1900-01-01", jours: 64 },
    { depuis: "1994-01-01", jours: 32 },
    { depuis: "2014-01-01", jours: 0 },
  ],
  demission: [
    { depuis: "1900-01-01", jours: 28 },
    { depuis: "1994-01-01", jours: 14 },
    { depuis: "1999-01-01", jours: 14 },
    { depuis: "2004-01-01", jours: 14 },
    { depuis: "2009-01-01", jours: 14 },
    { depuis: "2013-07-01", jours: 14 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
```

- [ ] **Step 3: Écrire le régime supplétif CCT 75 (ancienneté, pas date d'embauche — voir la note de fonction)**

```typescript
// cct-75-supletif.ts

/**
 * Régime intersectoriel supplétif, CCT n°75 du 20/12/1999, art. 2.
 * Contrairement aux tables par CP (indexées par date d'embauche), ce
 * régime est indexé par ANCIENNETÉ au 31/12/2013 (en mois). S'applique
 * en licenciement par l'employeur uniquement — la CCT 75 ne couvre pas
 * la démission (voir design spec §12.2).
 * Non couvert : ancienneté < 6 mois au 31/12/2013 (non trouvé dans les
 * sources consultées) — retourne null, à traiter par message
 * d'orientation côté appelant.
 */
export function preavisCct75Employeur(moisAncienneteAu20131231: number): number | null {
  if (moisAncienneteAu20131231 < 6) return null;
  if (moisAncienneteAu20131231 < 60) return 35;
  if (moisAncienneteAu20131231 < 120) return 42;
  if (moisAncienneteAu20131231 < 180) return 56;
  if (moisAncienneteAu20131231 < 240) return 84;
  return 112;
}
```

- [ ] **Step 4: Écrire le registre + tests**

```typescript
// index.ts
import type { TableCP } from "./types";
import { cp124Construction } from "./cp-124-construction";
import { cp126Ameublement } from "./cp-126-ameublement";
import { cp14202RecuperationMetaux } from "./cp-142-02-recuperation-metaux";
import { cp109Confection } from "./cp-109-confection";
import { cp12801Tanneries } from "./cp-128-01-tanneries";
import { cp12802Cuir } from "./cp-128-02-cuir";

const REGISTRE: Record<string, TableCP> = {
  "124.00": cp124Construction,
  "126.00": cp126Ameublement,
  "142.02": cp14202RecuperationMetaux,
  "109.00": cp109Confection,
  "128.01": cp12801Tanneries,
  "128.02": cp12802Cuir,
};

export function tableCP(cp: string): TableCP | null {
  return REGISTRE[cp] ?? null;
}

/** Recherche par correspondance approximative : dernière entrée dont `depuis` <= dateEmbauche. */
export function joursParEraDate(eras: { depuis: string; jours: number }[], dateEmbauche: string): number {
  let jours = eras[0].jours;
  for (const era of eras) {
    if (era.depuis <= dateEmbauche) {
      jours = era.jours;
    } else {
      break;
    }
  }
  return jours;
}

export { preavisCct75Employeur } from "./cct-75-supletif";
```

```typescript
// index.test.ts
import { describe, expect, it } from "vitest";
import { tableCP, joursParEraDate, preavisCct75Employeur } from "./index";

describe("tableCP", () => {
  it("retrouve la table CP124", () => {
    expect(tableCP("124.00")?.nom).toBe("Construction");
  });

  it("retourne null pour une CP non couverte", () => {
    expect(tableCP("999.99")).toBeNull();
  });
});

describe("joursParEraDate — exemple ACCG CP124 employeur (embauche 1998-02-02 -> 28 jours)", () => {
  it("retourne 28 jours", () => {
    const cp124 = tableCP("124.00")!;
    expect(joursParEraDate(cp124.employeur, "1998-02-02")).toBe(28);
  });
});

describe("joursParEraDate — exemple ACCG CP124 démission (embauche 1993-02-02 -> 28 jours)", () => {
  it("retourne 28 jours", () => {
    const cp124 = tableCP("124.00")!;
    expect(joursParEraDate(cp124.demission, "1993-02-02")).toBe(28);
  });
});

describe("preavisCct75Employeur", () => {
  it("retourne null sous 6 mois (non sourcé)", () => {
    expect(preavisCct75Employeur(3)).toBeNull();
  });

  it("retourne 35 jours entre 6 mois et 5 ans", () => {
    expect(preavisCct75Employeur(6)).toBe(35);
    expect(preavisCct75Employeur(59)).toBe(35);
  });

  it("retourne 112 jours à partir de 20 ans", () => {
    expect(preavisCct75Employeur(240)).toBe(112);
  });
});
```

- [ ] **Step 5: Lancer les tests, vérifier le succès**

Run: `npm test -- ouvrier-pre-2014`
Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/preavis/baremes/ouvrier-pre-2014/
git commit -m "feat(preavis): add pre-2014 ouvrier notice tables for 6 priority CP + CCT75 fallback"
```

---

## Task 6: Régime employé pré-2014

**Files:**
- Create: `lib/preavis/baremes/employe-pre-2014.ts`
- Test: `lib/preavis/baremes/employe-pre-2014.test.ts`

**Source :** design spec §12.4 (SPF Emploi). Le régime de démission pour les employés « supérieurs » n'est pas confirmé sur source primaire — implémenté avec un flag d'incertitude explicite dans le résultat (voir types.ts `part1DemissionIncertaine`).

- [ ] **Step 1: Écrire les tests**

```typescript
import { describe, expect, it } from "vitest";
import { preavisEmployePre2014 } from "./employe-pre-2014";

describe("preavisEmployePre2014", () => {
  it("applique 3 mois par tranche de 5 ans entamée sous le seuil (licenciement)", () => {
    // 7 ans d'ancienneté au 31/12/2013 = 2 tranches de 5 ans entamées -> 6 mois
    expect(preavisEmployePre2014({ anneesAnciennete: 7, remunerationAnnuelle: 30000, quiRompt: "employeur" })).toEqual({
      mois: 6,
      incertain: false,
    });
  });

  it("applique 1 mois/an (min 3) au-dessus du seuil (licenciement)", () => {
    expect(preavisEmployePre2014({ anneesAnciennete: 10, remunerationAnnuelle: 50000, quiRompt: "employeur" })).toEqual({
      mois: 10,
      incertain: false,
    });
  });

  it("applique le minimum de 3 mois au-dessus du seuil même à faible ancienneté", () => {
    expect(preavisEmployePre2014({ anneesAnciennete: 1, remunerationAnnuelle: 50000, quiRompt: "employeur" })).toEqual({
      mois: 3,
      incertain: false,
    });
  });

  it("marque le résultat comme incertain pour une démission au-dessus du seuil", () => {
    const resultat = preavisEmployePre2014({ anneesAnciennete: 10, remunerationAnnuelle: 50000, quiRompt: "travailleur" });
    expect(resultat.incertain).toBe(true);
    expect(resultat.mois).toBe(5); // moitié de 10 mois, règle non confirmée sur source primaire
  });

  it("n'est pas incertain pour une démission sous le seuil (règle légale claire)", () => {
    const resultat = preavisEmployePre2014({ anneesAnciennete: 7, remunerationAnnuelle: 30000, quiRompt: "travailleur" });
    expect(resultat.incertain).toBe(false);
    expect(resultat.mois).toBe(6);
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `npm test -- employe-pre-2014`
Expected: FAIL — module introuvable

- [ ] **Step 3: Implémenter**

```typescript
import type { QuiRompt } from "../types";

/** Seuil de rémunération annuelle brute au 31/12/2013 (design spec §12.4). */
export const SEUIL_REMUNERATION_2013 = 32254;

interface ParamsEmployePre2014 {
  anneesAnciennete: number;
  remunerationAnnuelle: number;
  quiRompt: QuiRompt;
}

interface ResultatEmployePre2014 {
  mois: number;
  incertain: boolean;
}

export function preavisEmployePre2014(params: ParamsEmployePre2014): ResultatEmployePre2014 {
  const { anneesAnciennete, remunerationAnnuelle, quiRompt } = params;
  const sousLeSeuil = remunerationAnnuelle <= SEUIL_REMUNERATION_2013;

  if (sousLeSeuil) {
    // 3 mois par tranche de 5 ans entamée, même règle employeur/démission (source confirmée).
    const tranches = Math.ceil(anneesAnciennete / 5);
    return { mois: tranches * 3, incertain: false };
  }

  // Au-dessus du seuil : 1 mois par année entamée, minimum 3 mois (licenciement, confirmé).
  const moisLicenciement = Math.max(3, Math.ceil(anneesAnciennete) || 1);

  if (quiRompt === "employeur") {
    return { mois: moisLicenciement, incertain: false };
  }

  // Démission au-dessus du seuil : règle non confirmée sur source primaire
  // (design spec §12.4) — approximation "moitié, plafond 13 semaines/~3 mois".
  const moisDemission = Math.round(moisLicenciement / 2);
  return { mois: moisDemission, incertain: true };
}
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `npm test -- employe-pre-2014`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/preavis/baremes/employe-pre-2014.ts lib/preavis/baremes/employe-pre-2014.test.ts
git commit -m "feat(preavis): add pre-2014 employé notice rule with explicit uncertainty flag on resignation side"
```

---

## Task 7: Moteur `calcul-preavis.ts` — ouvrier

**Files:**
- Create: `lib/preavis/calcul-preavis.ts`
- Test: `lib/preavis/calcul-preavis.test.ts`

Ce module assemble tout : sac-à-dos, règle du plancher (indemnité
compensatoire), plafond démission.

- [ ] **Step 1: Écrire les tests (reproduit l'exemple exact du classeur ACCG CP124)**

```typescript
import { describe, expect, it } from "vitest";
import { calculerPreavisOuvrier } from "./calcul-preavis";

describe("calculerPreavisOuvrier — exemple ACCG CP124 employeur", () => {
  it("reproduit exactement le résultat du classeur (217 jours + 245 jours d'indemnité)", () => {
    const resultat = calculerPreavisOuvrier({
      cp: "124.00",
      dateEmbauche: "1998-02-02",
      dateDebutPreavis: "2022-12-06",
      quiRompt: "employeur",
    });

    expect(resultat.javantPart1.jours).toBe(28);
    expect(resultat.japresPart2.jours).toBe(189);
    expect(resultat.total.jours).toBe(217);
    expect(resultat.indemniteCompensatoire?.jours).toBe(245);
    expect(resultat.regimeApplique).toBe("cp-specifique");
    expect(resultat.cpCouverte).toBe(true);
  });
});

describe("calculerPreavisOuvrier — exemple ACCG CP124 démission", () => {
  it("reproduit le plafond de 91 jours (13 semaines)", () => {
    const resultat = calculerPreavisOuvrier({
      cp: "124.00",
      dateEmbauche: "1993-02-02",
      dateDebutPreavis: "2022-12-06",
      quiRompt: "travailleur",
    });

    expect(resultat.javantPart1.jours).toBe(28);
    expect(resultat.total.jours).toBe(91);
    expect(resultat.total.semaines).toBe(13);
    expect(resultat.indemniteCompensatoire).toBeNull();
  });
});

describe("calculerPreavisOuvrier — ancienneté entièrement post-2014", () => {
  it("n'applique aucune partie 1 (sac à dos vide)", () => {
    const resultat = calculerPreavisOuvrier({
      cp: "124.00",
      dateEmbauche: "2015-01-01",
      dateDebutPreavis: "2020-01-01",
      quiRompt: "employeur",
    });

    expect(resultat.javantPart1.jours).toBe(0);
    expect(resultat.total.semaines).toBe(resultat.japresPart2.semaines);
  });
});

describe("calculerPreavisOuvrier — CP non couverte", () => {
  it("bascule sur le régime supplétif CCT 75", () => {
    const resultat = calculerPreavisOuvrier({
      cp: "999.99",
      dateEmbauche: "2005-01-01",
      dateDebutPreavis: "2020-01-01",
      quiRompt: "employeur",
    });

    expect(resultat.cpCouverte).toBe(false);
    expect(resultat.regimeApplique).toBe("cct75-supletif");
    // moisEntre("2005-01-01", "2013-12-31") = 107 mois (8 ans et 11 mois) -> palier "5 à 10 ans" -> 42 jours.
    expect(resultat.javantPart1.jours).toBe(42);
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `npm test -- calcul-preavis`
Expected: FAIL — module introuvable

- [ ] **Step 3: Implémenter**

```typescript
import { moisEntre } from "./anciennete";
import { preavisGeneralEmployeur, preavisGeneralDemission } from "./baremes/general-2014";
import { tableCP, joursParEraDate, preavisCct75Employeur } from "./baremes/ouvrier-pre-2014";
import type { DateISO, DureePreavis, QuiRompt, ResultatPreavisOuvrier } from "./types";

const DATE_PIVOT = "2014-01-01";
const DATE_FIN_2013 = "2013-12-31";

function versDuree(jours: number): DureePreavis {
  return { jours, semaines: Math.round((jours / 7) * 100) / 100 };
}

interface ParamsCalculOuvrier {
  cp: string;
  dateEmbauche: DateISO;
  dateDebutPreavis: DateISO;
  quiRompt: QuiRompt;
}

export function calculerPreavisOuvrier(params: ParamsCalculOuvrier): ResultatPreavisOuvrier {
  const { cp, dateEmbauche, dateDebutPreavis, quiRompt } = params;

  const anciennePost2014 = dateEmbauche >= DATE_PIVOT;
  const table = tableCP(cp);
  const cpCouverte = table !== null;

  // Partie 1 : gelée au 31/12/2013.
  let joursPart1 = 0;
  if (!anciennePost2014) {
    if (table) {
      const eras = quiRompt === "employeur" ? table.employeur : table.demission;
      joursPart1 = joursParEraDate(eras, dateEmbauche);
    } else if (quiRompt === "employeur") {
      const moisAu20131231 = moisEntre(dateEmbauche, DATE_FIN_2013);
      joursPart1 = preavisCct75Employeur(moisAu20131231) ?? 0;
    }
    // Démission hors CP couvertes : régime supplétif démission non sourcé (design spec §12.2) -> 0,
    // à signaler à l'appelant via cpCouverte=false + regimeApplique.
  }

  // Partie 2 : depuis le 1/1/2014 (ou depuis l'embauche si post-2014).
  const moisPart2 = anciennePost2014
    ? moisEntre(dateEmbauche, dateDebutPreavis)
    : moisEntre(DATE_PIVOT, dateDebutPreavis);
  const semainesPart2 =
    quiRompt === "employeur" ? preavisGeneralEmployeur(moisPart2) : preavisGeneralDemission(moisPart2);
  const joursPart2 = semainesPart2 * 7;

  let joursTotal = joursPart1 + joursPart2;
  let indemniteCompensatoire: DureePreavis | null = null;

  if (quiRompt === "employeur") {
    const moisTotal = moisEntre(dateEmbauche, dateDebutPreavis);
    const joursNouvelleFormuleComplete = preavisGeneralEmployeur(moisTotal) * 7;
    if (joursNouvelleFormuleComplete > joursTotal) {
      indemniteCompensatoire = versDuree(joursNouvelleFormuleComplete - joursTotal);
    }
  } else {
    joursTotal = Math.min(joursTotal, 91);
  }

  return {
    statut: "ouvrier",
    quiRompt,
    cp,
    cpCouverte,
    regimeApplique: cpCouverte ? "cp-specifique" : "cct75-supletif",
    javantPart1: versDuree(joursPart1),
    japresPart2: versDuree(joursPart2),
    total: versDuree(joursTotal),
    indemniteCompensatoire,
  };
}
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `npm test -- calcul-preavis`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/preavis/calcul-preavis.ts lib/preavis/calcul-preavis.test.ts
git commit -m "feat(preavis): add ouvrier notice engine (sac-à-dos + plancher indemnité + plafond démission)"
```

---

## Task 8: Calendrier des jours ouvrables belges

**Files:**
- Create: `lib/preavis/jours-ouvrables.ts`
- Test: `lib/preavis/jours-ouvrables.test.ts`

**Règle légale (design spec §6)** : jour ouvrable = tout jour sauf
dimanche et jour férié légal (le samedi compte). Jours fériés légaux
belges : 1er janvier, lundi de Pâques, 1er mai, Ascension, lundi de
Pentecôte, 21 juillet, 15 août, 1er novembre, 11 novembre, 25 décembre.
Pâques est calculé par l'algorithme de Gauss (dates mobiles).

- [ ] **Step 1: Écrire les tests**

```typescript
import { describe, expect, it } from "vitest";
import { estJourFerieLegalBE, estJourOuvrable, joursOuvrablesApres, premierLundiApres } from "./jours-ouvrables";

describe("estJourFerieLegalBE", () => {
  it("reconnaît le 1er mai comme férié", () => {
    expect(estJourFerieLegalBE("2026-05-01")).toBe(true);
  });

  it("calcule Pâques 2026 (5 avril) et le lundi de Pâques (6 avril)", () => {
    expect(estJourFerieLegalBE("2026-04-06")).toBe(true);
  });

  it("ne considère pas un jour ordinaire comme férié", () => {
    expect(estJourFerieLegalBE("2026-05-02")).toBe(false);
  });
});

describe("estJourOuvrable", () => {
  it("compte le samedi comme jour ouvrable", () => {
    // 2026-08-22 est un samedi
    expect(estJourOuvrable("2026-08-22")).toBe(true);
  });

  it("ne compte pas le dimanche comme jour ouvrable", () => {
    // 2026-08-23 est un dimanche
    expect(estJourOuvrable("2026-08-23")).toBe(false);
  });

  it("ne compte pas un jour férié comme jour ouvrable", () => {
    expect(estJourOuvrable("2026-05-01")).toBe(false);
  });
});

describe("joursOuvrablesApres", () => {
  it("avance de 3 jours ouvrables en sautant le dimanche", () => {
    // Vendredi 2026-08-21 + 3 jours ouvrables -> samedi 22 (1), lundi 24 (2, dimanche 23 sauté), mardi 25 (3)
    expect(joursOuvrablesApres("2026-08-21", 3)).toBe("2026-08-25");
  });
});

describe("premierLundiApres", () => {
  it("retourne le même jour si c'est déjà un lundi", () => {
    expect(premierLundiApres("2026-08-24")).toBe("2026-08-24");
  });

  it("avance au lundi suivant sinon", () => {
    expect(premierLundiApres("2026-08-25")).toBe("2026-08-31");
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `npm test -- jours-ouvrables`
Expected: FAIL — module introuvable

- [ ] **Step 3: Implémenter**

```typescript
import type { DateISO } from "./types";

function toDate(iso: DateISO): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date: Date): DateISO {
  return date.toISOString().slice(0, 10);
}

/** Dimanche de Pâques (calendrier grégorien) via l'algorithme de Gauss/Meeus. */
function paques(annee: number): Date {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(annee, mois - 1, jour));
}

function ajouterJours(date: Date, jours: number): Date {
  const copie = new Date(date);
  copie.setUTCDate(copie.getUTCDate() + jours);
  return copie;
}

function joursFeriesLegauxBE(annee: number): Set<DateISO> {
  const p = paques(annee);
  const dates = [
    new Date(Date.UTC(annee, 0, 1)),
    ajouterJours(p, 1), // lundi de Pâques
    new Date(Date.UTC(annee, 4, 1)),
    ajouterJours(p, 39), // Ascension
    ajouterJours(p, 50), // lundi de Pentecôte
    new Date(Date.UTC(annee, 6, 21)),
    new Date(Date.UTC(annee, 7, 15)),
    new Date(Date.UTC(annee, 10, 1)),
    new Date(Date.UTC(annee, 10, 11)),
    new Date(Date.UTC(annee, 11, 25)),
  ];
  return new Set(dates.map(toISO));
}

export function estJourFerieLegalBE(iso: DateISO): boolean {
  const annee = Number(iso.slice(0, 4));
  return joursFeriesLegauxBE(annee).has(iso);
}

/** Jour ouvrable au sens de l'art. 37 : tout jour sauf dimanche et jour férié légal (le samedi compte). */
export function estJourOuvrable(iso: DateISO): boolean {
  const dimanche = toDate(iso).getUTCDay() === 0;
  return !dimanche && !estJourFerieLegalBE(iso);
}

export function joursOuvrablesApres(iso: DateISO, nombre: number): DateISO {
  let date = toDate(iso);
  let restant = nombre;
  while (restant > 0) {
    date = ajouterJours(date, 1);
    if (estJourOuvrable(toISO(date))) {
      restant -= 1;
    }
  }
  return toISO(date);
}

export function premierLundiApres(iso: DateISO): DateISO {
  const date = toDate(iso);
  const jourSemaine = date.getUTCDay(); // 0 = dimanche, 1 = lundi
  if (jourSemaine === 1) return iso;
  const decalage = jourSemaine === 0 ? 1 : 8 - jourSemaine;
  return toISO(ajouterJours(date, decalage));
}
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `npm test -- jours-ouvrables`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/preavis/jours-ouvrables.ts lib/preavis/jours-ouvrables.test.ts
git commit -m "feat(preavis): add Belgian legal business-day calendar (Easter-based holidays, jour ouvrable rule)"
```

---

## Task 9: Dates clés — calcul direct et inverse

**Files:**
- Create: `lib/preavis/dates-preavis.ts`
- Test: `lib/preavis/dates-preavis.test.ts`

**Règle (design spec §6)** : date d'envoi du recommandé → 3ᵉ jour
ouvrable suivant → premier lundi qui suit = début du préavis → + N
semaines = fin.

- [ ] **Step 1: Écrire les tests**

```typescript
import { describe, expect, it } from "vitest";
import { debutPreavisDepuisEnvoi, finPreavis, dateLimiteEnvoiRecommande } from "./dates-preavis";

describe("debutPreavisDepuisEnvoi", () => {
  it("calcule le début de préavis pour un envoi un vendredi", () => {
    // Envoi vendredi 2026-08-21 -> 3e jour ouvrable = mardi 2026-08-25 -> premier lundi qui suit = 2026-08-31
    expect(debutPreavisDepuisEnvoi("2026-08-21")).toBe("2026-08-31");
  });
});

describe("finPreavis", () => {
  it("ajoute N semaines complètes au début du préavis", () => {
    expect(finPreavis("2026-08-31", 4)).toBe("2026-09-27");
  });
});

describe("dateLimiteEnvoiRecommande", () => {
  it("est l'inverse exact de debutPreavisDepuisEnvoi pour une date de début tombant un lundi", () => {
    const envoi = "2026-08-21";
    const debut = debutPreavisDepuisEnvoi(envoi);
    const limite = dateLimiteEnvoiRecommande(debut);
    // La date limite trouvée doit elle-même produire ce même début si on l'utilise comme date d'envoi.
    expect(debutPreavisDepuisEnvoi(limite)).toBe(debut);
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `npm test -- dates-preavis`
Expected: FAIL — module introuvable

- [ ] **Step 3: Implémenter**

```typescript
import { joursOuvrablesApres, premierLundiApres } from "./jours-ouvrables";
import type { DateISO } from "./types";

function toDate(iso: DateISO): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date: Date): DateISO {
  return date.toISOString().slice(0, 10);
}

/** Date de début du préavis à partir d'une date d'envoi du recommandé (Art. 37 §2). */
export function debutPreavisDepuisEnvoi(dateEnvoi: DateISO): DateISO {
  const troisiemeJourOuvrable = joursOuvrablesApres(dateEnvoi, 3);
  return premierLundiApres(troisiemeJourOuvrable);
}

/** Date de fin (dernier jour inclus) du préavis, N semaines après le début. */
export function finPreavis(dateDebut: DateISO, semaines: number): DateISO {
  const debut = toDate(dateDebut);
  debut.setUTCDate(debut.getUTCDate() + semaines * 7 - 1);
  return toISO(debut);
}

/**
 * Date limite d'envoi du recommandé pour obtenir un début de préavis à la
 * date donnée. Remonte jour par jour depuis la date de début souhaitée
 * jusqu'à trouver le dernier jour d'envoi qui produit ce même résultat via
 * debutPreavisDepuisEnvoi — approche directe et sûre (pas d'inversion
 * algébrique du calendrier), au prix d'une boucle bornée à 21 jours.
 */
export function dateLimiteEnvoiRecommande(dateDebutSouhaitee: DateISO): DateISO {
  let candidate = toDate(dateDebutSouhaitee);
  candidate.setUTCDate(candidate.getUTCDate() - 21);

  let meilleureDate: DateISO | null = null;
  for (let i = 0; i < 28; i++) {
    const iso = toISO(candidate);
    if (debutPreavisDepuisEnvoi(iso) === dateDebutSouhaitee) {
      meilleureDate = iso;
    }
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }

  if (!meilleureDate) {
    throw new Error(`Aucune date d'envoi trouvée produisant un début de préavis le ${dateDebutSouhaitee}`);
  }
  return meilleureDate;
}
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `npm test -- dates-preavis`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/preavis/dates-preavis.ts lib/preavis/dates-preavis.test.ts
git commit -m "feat(preavis): add direct and reverse key-date calculation for recommandé notice"
```

---

## Task 10: Suite complète — vérification finale

- [ ] **Step 1: Lancer toute la suite de tests**

Run: `npm test`
Expected: PASS — tous les tests des tâches 1 à 9 (environ 45 tests).

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Commit final de vérification (si des ajustements ont été faits)**

```bash
git add -A
git commit -m "test(preavis): fix any remaining type/test issues found during full suite run"
```

(Ne committer que s'il y a effectivement des changements après les
ajustements ; sinon, cette étape est un simple constat de succès sans
commit.)

---

## Suite (phases non couvertes par ce plan)

Ce plan livre un moteur de calcul complet, testé et fonctionnel pour :
statut ouvrier (6 CP prioritaires + repli CCT75), statut employé
(pré/post-2014), démission et licenciement, dates clés directes et
inverses. Il ne couvre pas encore :

- **Phase 2 — Courriers** : `lib/preavis/courriers/` (templates verbatim
  §7 du design spec + moteur de fusion des placeholders + rendu PDF via
  `@react-pdf/renderer`).
- **Phase 3 — Contenus informatifs** : sanctions ONEM démission,
  procédures d'envoi (pli simple/recommandé/main propre/huissier).
- **Phase 4 — UI** : `app/preavis/page.tsx` (wizard), entrée dans
  `app/forms.ts`, intégration visuelle avec le reste de l'application,
  test manuel en navigateur (golden path + cas limites).
- **Phase 5 — Couverture CP étendue** : extraction mécanique des ~44
  tables CP restantes du classeur ACCG (structure identique aux 6 déjà
  faites — voir Task 5), pour couvrir l'intégralité des secteurs de la
  Centrale Générale plutôt que les 6 prioritaires.
- **À valider par le secrétariat juridique FGTB avant mise en
  production** (voir design spec §12) : le correctif légal 2026 (aucune
  source primaire Moniteur belge récupérée), le régime de démission des
  employés « supérieurs » pré-2014, le régime démission hors CP
  couvertes (< 6 mois CCT75), et le barème de sanction ONEM détaillé.

Chacune de ces phases mérite son propre plan d'implémentation (le spec
couvre plusieurs sous-systèmes assez indépendants pour être planifiés
séparément), à écrire avec la skill `writing-plans` le moment venu.
