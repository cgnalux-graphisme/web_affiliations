import { moisEntre } from "./anciennete";
import { preavisGeneralEmployeur, preavisGeneralDemission } from "./baremes/general-2014";
import { appliquerReforme2026 } from "./baremes/reforme-2026";
import {
  tableCP,
  joursParEraDate,
  tableCPAnciennete,
  regimeParDateEmbauche,
  joursParPalierAnciennete,
  preavisCct75Employeur,
} from "./baremes/ouvrier-pre-2014";
import type { DateISO, DureePreavis, QuiRompt, ResultatPreavisOuvrier } from "./types";

const DATE_PIVOT = "2014-01-01";
const DATE_FIN_2013 = "2013-12-31";

function versDuree(jours: number): DureePreavis {
  return { jours, semaines: Math.round((jours / 7) * 100) / 100 };
}

function semainesBaremeGeneral(quiRompt: QuiRompt, mois: number): number {
  return quiRompt === "employeur" ? preavisGeneralEmployeur(mois) : preavisGeneralDemission(mois);
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
  // Deux mécanismes mutuellement exclusifs pour la Partie 1 (voir types.ts) : `table`
  // (jours fixes par date d'embauche) ou `tableAnc` (barème gradué par ancienneté).
  const tableAnc = table === null ? tableCPAnciennete(cp) : null;
  const cpCouverte = table !== null || tableAnc !== null;

  // Partie 1 : gelée au 31/12/2013. Le correctif 2026 ne s'applique jamais ici :
  // un contrat concerné par la réforme (embauche >= 2026) n'a par construction pas
  // d'ancienneté pré-2014, donc cette branche est déjà à 0 dans ce cas.
  let joursPart1 = 0;
  let avertissementNonSource = false;
  let regimeApplique: ResultatPreavisOuvrier["regimeApplique"] = cpCouverte ? "cp-specifique" : "non-source";

  if (!anciennePost2014) {
    if (table) {
      const eras = quiRompt === "employeur" ? table.employeur : table.demission;
      joursPart1 = joursParEraDate(eras, dateEmbauche);
      // regimeApplique reste "cp-specifique" (déjà positionné ci-dessus).
    } else if (tableAnc) {
      const regime = regimeParDateEmbauche(tableAnc.regimes, dateEmbauche);
      const paliers = quiRompt === "employeur" ? regime.paliersEmployeur : regime.paliersDemission;
      const moisAu20131231 = moisEntre(dateEmbauche, DATE_FIN_2013);
      const jours = joursParPalierAnciennete(paliers, moisAu20131231);
      if (jours !== null) {
        joursPart1 = jours;
        // regimeApplique reste "cp-specifique" (déjà positionné ci-dessus).
      } else {
        // Palier démission non sourcé (mention ONEM "régime légal" sans détail
        // fiable) ou ancienneté sous le premier palier documenté — voir
        // joursParPalierAnciennete.
        avertissementNonSource = true;
      }
    } else if (quiRompt === "employeur") {
      const moisAu20131231 = moisEntre(dateEmbauche, DATE_FIN_2013);
      const joursCct75 = preavisCct75Employeur(moisAu20131231);
      if (joursCct75 !== null) {
        joursPart1 = joursCct75;
        regimeApplique = "cct75-supletif";
      } else {
        // < 6 mois d'ancienneté au 31/12/2013, non sourcé par la CCT75 (design spec §12.2).
        avertissementNonSource = true;
      }
    } else {
      // Démission hors CP couvertes : régime supplétif démission non sourcé (design spec §12.2).
      avertissementNonSource = true;
    }
  }

  // Partie 2 : depuis le 1/1/2014 (ou depuis l'embauche si post-2014), corrigée par la réforme 2026.
  const moisPart2 = anciennePost2014
    ? moisEntre(dateEmbauche, dateDebutPreavis)
    : moisEntre(DATE_PIVOT, dateDebutPreavis);
  const semainesPart2 = appliquerReforme2026({
    dateEmbauche,
    moisAnciennete: moisPart2,
    semaines: semainesBaremeGeneral(quiRompt, moisPart2),
  });
  const joursPart2 = semainesPart2 * 7;

  let joursTotal = joursPart1 + joursPart2;
  let indemniteCompensatoire: DureePreavis | null = null;

  if (quiRompt === "employeur") {
    // La comparaison "nouvelle formule complète" doit elle aussi subir le correctif 2026,
    // sinon un plafond appliqué à joursPart2 mais pas ici créerait une fausse indemnité
    // compensatoire (voir revue de code Task 4).
    const moisTotal = moisEntre(dateEmbauche, dateDebutPreavis);
    const semainesNouvelleFormuleComplete = appliquerReforme2026({
      dateEmbauche,
      moisAnciennete: moisTotal,
      semaines: preavisGeneralEmployeur(moisTotal),
    });
    const joursNouvelleFormuleComplete = semainesNouvelleFormuleComplete * 7;
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
    regimeApplique,
    avertissementNonSource,
    javantPart1: versDuree(joursPart1),
    japresPart2: versDuree(joursPart2),
    total: versDuree(joursTotal),
    indemniteCompensatoire,
  };
}
