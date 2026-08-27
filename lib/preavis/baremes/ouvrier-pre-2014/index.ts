import type { TableCP } from "./types";
import { cp124Construction } from "./cp-124-construction";
import { cp126Ameublement } from "./cp-126-ameublement";
import { cp14202RecuperationMetaux } from "./cp-142-02-recuperation-metaux";
import { cp109Confection } from "./cp-109-confection";
import { cp12801Tanneries } from "./cp-128-01-tanneries";
import { cp12802Cuir } from "./cp-128-02-cuir";
import { cp10000CommissionParitaireAuxiliairePour } from "./cp-100-00-commission-paritaire-auxiliaire-pour-ouvriers";
import { cp10201IndustrieDesCarrieresDe } from "./cp-102-01-industrie-des-carrieres-de-petit-granit-et-de-calc";
import { cp10202IndustrieDesCarrieresDe } from "./cp-102-02-industrie-des-carrieres-de-petit-granit-et-de-calc";
import { cp10203CarrieresDePorphyreHainaut } from "./cp-102-03-carrieres-de-porphyre-hainaut-et-carrieres-de-quar";
import { cp10204IndustrieDesCarrieresDe } from "./cp-102-04-industrie-des-carrieres-de-gres-et-de-quartzite";
import { cp10205IndustrieDesCarrieresDe } from "./cp-102-05-industrie-des-carrieres-de-kaolin-et-de-sable";
import { cp10206IndustrieDesCarrieresDe } from "./cp-102-06-industrie-des-carrieres-de-gravier-et-de-sable";
import { cp10207CarrieresCimenteriesEtFours } from "./cp-102-07-carrieres-cimenteries-et-fours-a-chaux-de-tournai";
import { cp10208IndustrieDesCarrieresEt } from "./cp-102-08-industrie-des-carrieres-et-scieries-de-marbres";
import { cp10209CarrieresDeCalcaireNon } from "./cp-102-09-carrieres-de-calcaire-non-taille-et-fours-a-chaux";
import { cp10601FabriquesDeCiment } from "./cp-106-01-fabriques-de-ciment";
import { cp10602IndustrieDuBeton } from "./cp-106-02-industrie-du-beton";
import { cp10603Fibrociment } from "./cp-106-03-fibrociment";
import { cp10700MaitresTailleursTailleusesEt } from "./cp-107-00-maitres-tailleurs-tailleuses-et-couturieres";
import { cp11000EntretienDuTextile } from "./cp-110-00-entretien-du-textile";
import { cp11300IndustrieCeramique } from "./cp-113-00-industrie-ceramique";
import { cp11304Tuileries } from "./cp-113-04-tuileries";
import { cp11400IndustrieDesBriques } from "./cp-114-00-industrie-des-briques";
import { cp11500IndustrieVerriere } from "./cp-115-00-industrie-verriere";
import { cp11600IndustrieChimique } from "./cp-116-00-industrie-chimique";
import { cp11700IndustrieEtCommerceDu } from "./cp-117-00-industrie-et-commerce-du-petrole";
import { cp12000IndustrieTextileEtDe } from "./cp-120-00-industrie-textile-et-de-la-bonneterie";
import { cp12001IndustrieTextileDeL } from "./cp-120-01-industrie-textile-de-l-arrondissement-de-verviers";
import { cp12002PreparationDuLin } from "./cp-120-02-preparation-du-lin";
import { cp12003FabricationEtCommerceDe } from "./cp-120-03-fabrication-et-commerce-de-sacs-en-jute";
import { cp12100EntreprisesDeNettoyageEt } from "./cp-121-00-entreprises-de-nettoyage-et-de-desinfection";
import { cp12500IndustrieDuBois } from "./cp-125-00-industrie-du-bois";
import { cp12501ExploitationsForestieres } from "./cp-125-01-exploitations-forestieres";
import { cp12502ScieriesEtIndustriesConnexes } from "./cp-125-02-scieries-et-industries-connexes";
import { cp12503CommerceDuBois } from "./cp-125-03-commerce-du-bois";
import { cp12803MaroquinerieEtGanterie } from "./cp-128-03-maroquinerie-et-ganterie";
import { cp12805SellerieFabricationDeCourroies } from "./cp-128-05-sellerie-fabrication-de-courroies-et-articles-indu";
import { cp12806ChaussuresOrthopediques } from "./cp-128-06-chaussures-orthopediques";
import { cp12900ProductionDesPatesPapiers } from "./cp-129-00-production-des-pates-papiers-et-cartons";
import { cp13000ImprimerieArtsGraphiquesEt } from "./cp-130-00-imprimerie-arts-graphiques-et-journaux";
import { cp13200EntreprisesDeTravauxTechniques } from "./cp-132-00-entreprises-de-travaux-techniques-agricoles-et-hor";
import { cp13300IndustrieDesTabacs } from "./cp-133-00-industrie-des-tabacs";
import { cp13600TransformationDuPapierEt } from "./cp-136-00-transformation-du-papier-et-du-carton";
import { cp14203RecuperationDuPapier } from "./cp-142-03-recuperation-du-papier";
import { cp14204RecuperationDeProduitsDivers } from "./cp-142-04-recuperation-de-produits-divers";
import { cp14400Agriculture } from "./cp-144-00-agriculture";
import { cp14500EntreprisesHorticoles } from "./cp-145-00-entreprises-horticoles";
import { cp14600EntreprisesForestieres } from "./cp-146-00-entreprises-forestieres";
import { cp14801CouperieDePoils } from "./cp-148-01-couperie-de-poils";
import { cp14803FabricationIndustrielleEtArtisanale } from "./cp-148-03-fabrication-industrielle-et-artisanale-de-fourrure";
import { cp14805TanneriesDePeaux } from "./cp-148-05-tanneries-de-peaux";
import { cp15200InstitutionsSubsidieesDeL } from "./cp-152-00-institutions-subsidiees-de-l-enseignement-libre";
import { cp30303ExploitationDeSallesDe } from "./cp-303-03-exploitation-de-salles-de-cinema";
import { cp31100GrandesEntreprisesDeVente } from "./cp-311-00-grandes-entreprises-de-vente-au-detail";

/** Exporté (en plus de `tableCP`) pour permettre les tests d'intégrité sur l'ensemble du registre. */
export const REGISTRE: Record<string, TableCP> = {
  "124.00": cp124Construction,
  "126.00": cp126Ameublement,
  "142.02": cp14202RecuperationMetaux,
  "109.00": cp109Confection,
  "128.01": cp12801Tanneries,
  "128.02": cp12802Cuir,
  "100.00": cp10000CommissionParitaireAuxiliairePour,
  "102.01": cp10201IndustrieDesCarrieresDe,
  "102.02": cp10202IndustrieDesCarrieresDe,
  "102.03": cp10203CarrieresDePorphyreHainaut,
  "102.04": cp10204IndustrieDesCarrieresDe,
  "102.05": cp10205IndustrieDesCarrieresDe,
  "102.06": cp10206IndustrieDesCarrieresDe,
  "102.07": cp10207CarrieresCimenteriesEtFours,
  "102.08": cp10208IndustrieDesCarrieresEt,
  "102.09": cp10209CarrieresDeCalcaireNon,
  "106.01": cp10601FabriquesDeCiment,
  "106.02": cp10602IndustrieDuBeton,
  "106.03": cp10603Fibrociment,
  "107.00": cp10700MaitresTailleursTailleusesEt,
  "110.00": cp11000EntretienDuTextile,
  "113.00": cp11300IndustrieCeramique,
  "113.04": cp11304Tuileries,
  "114.00": cp11400IndustrieDesBriques,
  "115.00": cp11500IndustrieVerriere,
  "116.00": cp11600IndustrieChimique,
  "117.00": cp11700IndustrieEtCommerceDu,
  "120.00": cp12000IndustrieTextileEtDe,
  "120.01": cp12001IndustrieTextileDeL,
  "120.02": cp12002PreparationDuLin,
  "120.03": cp12003FabricationEtCommerceDe,
  "121.00": cp12100EntreprisesDeNettoyageEt,
  "125.00": cp12500IndustrieDuBois,
  "125.01": cp12501ExploitationsForestieres,
  "125.02": cp12502ScieriesEtIndustriesConnexes,
  "125.03": cp12503CommerceDuBois,
  "128.03": cp12803MaroquinerieEtGanterie,
  "128.05": cp12805SellerieFabricationDeCourroies,
  "128.06": cp12806ChaussuresOrthopediques,
  "129.00": cp12900ProductionDesPatesPapiers,
  "130.00": cp13000ImprimerieArtsGraphiquesEt,
  "132.00": cp13200EntreprisesDeTravauxTechniques,
  "133.00": cp13300IndustrieDesTabacs,
  "136.00": cp13600TransformationDuPapierEt,
  "142.03": cp14203RecuperationDuPapier,
  "142.04": cp14204RecuperationDeProduitsDivers,
  "144.00": cp14400Agriculture,
  "145.00": cp14500EntreprisesHorticoles,
  "146.00": cp14600EntreprisesForestieres,
  "148.01": cp14801CouperieDePoils,
  "148.03": cp14803FabricationIndustrielleEtArtisanale,
  "148.05": cp14805TanneriesDePeaux,
  "152.00": cp15200InstitutionsSubsidieesDeL,
  "303.03": cp30303ExploitationDeSallesDe,
  "311.00": cp31100GrandesEntreprisesDeVente,
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
