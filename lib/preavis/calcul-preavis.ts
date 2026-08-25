import { moisEntre } from "./anciennete";
import { preavisGeneralEmployeur, preavisGeneralDemission } from "./baremes/general-2014";
import { appliquerReforme2026 } from "./baremes/reforme-2026";
import { tableCP, joursParEraDate, preavisCct75Employeur } from "./baremes/ouvrier-pre-2014";
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
  const cpCouverte = table !== null;

  // Partie 1 : gelée au 31/12/2013. Le correctif 2026 ne s'applique jamais ici :
  // un contrat concerné par la réforme (embauche >= 2026) n'a par construction pas
  // d'ancienneté pré-2014, donc cette branche est déjà à 0 dans ce cas.
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
    regimeApplique: cpCouverte ? "cp-specifique" : "cct75-supletif",
    javantPart1: versDuree(joursPart1),
    japresPart2: versDuree(joursPart2),
    total: versDuree(joursTotal),
    indemniteCompensatoire,
  };
}
