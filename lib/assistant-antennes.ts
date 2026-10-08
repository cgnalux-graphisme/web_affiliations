/**
 * Les deux antennes chômage FGTB les plus proches d'un code postal (Assistant CG, catégorie « chômage »).
 * Tranches de codes postaux rattachées aux deux antennes les plus proches par la route, dans la province
 * (la plus proche d'abord). Validées par Fred le 08/10/2026. Les noms correspondent à la colonne
 * `antenne` de site_chatbot_antennes. Un code postal sans tranche affiche toutes les antennes de la province.
 */

type Tranche = { de: number; a: number; antennes: [string, string]; communes: string };

const NAMUR = "Namur (bureau central)";

export const TRANCHES_ANTENNES: Tranche[] = [
  // Province de Namur
  { de: 5000, a: 5059, antennes: [NAMUR, "Tamines"], communes: "Namur, Gembloux" },
  { de: 5060, a: 5079, antennes: ["Tamines", NAMUR], communes: "Sambreville, Fosses-la-Ville" },
  { de: 5080, a: 5099, antennes: [NAMUR, "Tamines"], communes: "La Bruyère" },
  { de: 5100, a: 5139, antennes: [NAMUR, "Andenne"], communes: "Jambes" },
  { de: 5140, a: 5169, antennes: ["Tamines", NAMUR], communes: "Sombreffe, Floreffe" },
  { de: 5170, a: 5179, antennes: [NAMUR, "Dinant"], communes: "Profondeville" },
  { de: 5180, a: 5299, antennes: ["Tamines", NAMUR], communes: "Jemeppe-sur-Sambre" },
  { de: 5300, a: 5309, antennes: ["Andenne", NAMUR], communes: "Andenne" },
  { de: 5310, a: 5339, antennes: [NAMUR, "Andenne"], communes: "Éghezée, Assesse" },
  { de: 5340, a: 5359, antennes: ["Andenne", NAMUR], communes: "Gesves, Ohey" },
  { de: 5360, a: 5369, antennes: ["Dinant", "Andenne"], communes: "Hamois" },
  { de: 5370, a: 5376, antennes: ["Andenne", "Dinant"], communes: "Havelange" },
  { de: 5377, a: 5379, antennes: ["Dinant", "Andenne"], communes: "Somme-Leuze" },
  { de: 5380, a: 5499, antennes: ["Andenne", NAMUR], communes: "Fernelmont" },
  { de: 5500, a: 5529, antennes: ["Dinant", "Beauraing"], communes: "Dinant, Onhaye" },
  { de: 5530, a: 5539, antennes: ["Dinant", NAMUR], communes: "Yvoir, Anhée" },
  { de: 5540, a: 5549, antennes: ["Dinant", "Beauraing"], communes: "Hastière" },
  { de: 5550, a: 5589, antennes: ["Beauraing", "Dinant"], communes: "Vresse-sur-Semois, Bièvre, Houyet, Beauraing, Gedinne, Rochefort" },
  { de: 5590, a: 5599, antennes: ["Dinant", "Beauraing"], communes: "Ciney" },
  { de: 5600, a: 5639, antennes: ["Mariembourg", "Dinant"], communes: "Philippeville, Florennes, Cerfontaine" },
  { de: 5640, a: 5649, antennes: ["Tamines", NAMUR], communes: "Mettet" },
  { de: 5650, a: 5659, antennes: ["Mariembourg", "Tamines"], communes: "Walcourt" },
  { de: 5660, a: 5999, antennes: ["Mariembourg", "Dinant"], communes: "Couvin, Viroinval, Doische" },
  // Province de Luxembourg
  { de: 6600, a: 6629, antennes: ["Bastogne", "Libramont"], communes: "Bastogne" },
  { de: 6630, a: 6639, antennes: ["Bastogne", "Arlon"], communes: "Martelange, Fauvillers" },
  { de: 6640, a: 6659, antennes: ["Bastogne", "Libramont"], communes: "Vaux-sur-Sûre" },
  { de: 6660, a: 6699, antennes: ["Bastogne", "Marche"], communes: "Houffalize, Gouvy, Sainte-Ode, Bertogne, Vielsalm" },
  { de: 6700, a: 6719, antennes: ["Arlon", "Bastogne"], communes: "Arlon, Attert" },
  { de: 6720, a: 6799, antennes: ["Arlon", "Libramont"], communes: "Habay, Tintigny, Étalle, Musson, Virton, Rouvroy, Meix-devant-Virton, Messancy, Aubange" },
  { de: 6800, a: 6809, antennes: ["Libramont", "Bastogne"], communes: "Libramont" },
  { de: 6810, a: 6829, antennes: ["Libramont", "Arlon"], communes: "Chiny, Florenville" },
  { de: 6830, a: 6859, antennes: ["Libramont", "Bastogne"], communes: "Bouillon, Neufchâteau, Paliseul" },
  { de: 6860, a: 6869, antennes: ["Libramont", "Arlon"], communes: "Léglise" },
  { de: 6870, a: 6879, antennes: ["Libramont", "Marche"], communes: "Saint-Hubert" },
  { de: 6880, a: 6889, antennes: ["Libramont", "Bastogne"], communes: "Bertrix, Herbeumont" },
  { de: 6890, a: 6899, antennes: ["Libramont", "Marche"], communes: "Libin" },
  { de: 6900, a: 6939, antennes: ["Marche", "Libramont"], communes: "Marche-en-Famenne, Wellin, Tellin, Daverdisse" },
  { de: 6940, a: 6949, antennes: ["Marche", "Bastogne"], communes: "Durbuy" },
  { de: 6950, a: 6959, antennes: ["Marche", "Libramont"], communes: "Nassogne" },
  { de: 6960, a: 6969, antennes: ["Marche", "Bastogne"], communes: "Manhay" },
  { de: 6970, a: 6979, antennes: ["Bastogne", "Marche"], communes: "Tenneville" },
  { de: 6980, a: 6999, antennes: ["Marche", "Bastogne"], communes: "La Roche-en-Ardenne, Rendeux, Hotton, Érezée" },
];

/** Les deux antennes les plus proches (la plus proche d'abord), ou null si le code postal n'a pas de tranche. */
export function antennesLesPlusProches(codePostal: string): [string, string] | null {
  const n = Number(codePostal);
  return TRANCHES_ANTENNES.find((t) => n >= t.de && n <= t.a)?.antennes ?? null;
}

/** Les deux antennes les plus proches, dans l'ordre ; sans tranche connue, toutes les antennes de la province. */
export function choisirAntennes<T extends { antenne: string }>(antennes: T[], codePostal: string): T[] {
  const proches = antennesLesPlusProches(codePostal);
  if (!proches) return antennes;
  const choisies = proches.map((nom) => antennes.find((a) => a.antenne === nom)).filter((a): a is T => Boolean(a));
  return choisies.length ? choisies : antennes;
}
