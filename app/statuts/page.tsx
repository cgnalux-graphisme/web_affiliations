import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Statuts — Centrale Générale FGTB Namur-Luxembourg",
  description: "Statuts de la régionale Namur-Luxembourg de la Centrale Générale - FGTB : dénomination, buts, affiliation, instances, cotisations.",
};

/*
 * Texte des statuts repris TEL QUEL du document officiel (statuts.pdf transmis par Fred le 01/10/2026) :
 * ne rien reformuler ni corriger ici. Seule la mise en forme est propre au site.
 */

const CHAPITRES = [
  { id: "chapitre-1", sommaire: "Dénomination et compétences", court: "I", titre: "CHAPITRE I - DENOMINATION & COMPÉTENCES" },
  { id: "chapitre-2", sommaire: "Buts et moyens", court: "II", titre: "CHAPITRE II - BUTS & MOYENS" },
  { id: "chapitre-3", sommaire: "Affiliation, démission, exclusion", court: "III", titre: "CHAPITRE III - AFFILIATION, DEMISSION, EXCLUSION" },
  { id: "chapitre-4", sommaire: "Le Congrès", court: "IV", titre: "CHAPITRE IV - LE CONGRES" },
  { id: "chapitre-5", sommaire: "Le Comité régional", court: "V", titre: "CHAPITRE V - LE COMITE REGIONAL" },
  { id: "chapitre-6", sommaire: "Le Comité exécutif", court: "VI", titre: "CHAPITRE VI - LE COMITE EXECUTIF" },
  { id: "chapitre-7", sommaire: "Le Secrétariat régional", court: "VII", titre: "CHAPITRE VII - LE SECRETARIAT REGIONAL" },
  { id: "chapitre-8", sommaire: "Les Commissions professionnelles", court: "VIII", titre: "CHAPITRE VIII - LES COMMISSIONS PROFESSIONNELLES" },
  { id: "chapitre-9", sommaire: "La Commission de contrôle", court: "IX", titre: "CHAPITRE IX- LA COMMISSION DE CONTROLE" },
  { id: "chapitre-10", sommaire: "Les sections", court: "X", titre: "CHAPITRE X - LES SECTIONS" },
  { id: "chapitre-11", sommaire: "Cotisations et indemnités", court: "XI", titre: "CHAPITRE XI - COTISATIONS & INDEMNITES" },
];

function Chapitre({ n, children }: { n: number; children: ReactNode }) {
  const c = CHAPITRES[n - 1];
  return (
    <section id={c.id} aria-labelledby={`${c.id}-titre`} className="scroll-mt-28">
      <h2 id={`${c.id}-titre`} className="border-b-[6px] border-militant-charbon pb-3 font-condensed text-3xl font-extrabold leading-tight sm:text-[34px]">
        {c.titre}
      </h2>
      <div className="mt-6 space-y-8">{children}</div>
    </section>
  );
}

function Article({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div className="grid gap-x-6 gap-y-1 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
      <h3 className="font-condensed text-xl font-bold leading-tight text-militant-bordeaux sm:pt-0.5">{libelle}</h3>
      <div className="space-y-3 text-[17px] leading-relaxed">{children}</div>
    </div>
  );
}

/** Liste numérotée : les numéros du document sont conservés tels quels. */
function Numeros({ items, marque = "." }: { items: ReactNode[]; marque?: string }) {
  return (
    <ol className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2">
          <span className="font-semibold tabular-nums">
            {i + 1}
            {marque}
          </span>
          <span>{it}</span>
        </li>
      ))}
    </ol>
  );
}

/** Liste à tirets du document, en puces carrées rouges comme ailleurs sur le site. */
function Tirets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden className="mt-[0.6em] h-2 w-2 shrink-0 bg-militant-rouge" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/** Composition par province (Comité régional, Comité exécutif). */
function Composition({ titre, items }: { titre: ReactNode; items: string[] }) {
  return (
    <div className="rounded-2xl border border-militant-ardoise px-5 py-4">
      <p className="font-semibold">{titre}</p>
      <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it} className="flex gap-2.5">
            <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 bg-militant-rouge" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function StatutsPage() {
  return (
    <main className="bg-white font-barlow text-militant-charbon">
      <header className="mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <h1 className="font-condensed text-5xl font-extrabold uppercase leading-[0.88] tracking-tight sm:text-7xl">STATUTS</h1>
        <div className="mt-6 h-2 w-24 bg-militant-rouge" aria-hidden />
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-24 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-8">
        {/* Sommaire : liste sur mobile, colonne collante sur grand écran. */}
        <nav aria-label="Sommaire des statuts" className="lg:sticky lg:top-6 lg:self-start">
          <p className="font-condensed text-lg font-bold uppercase tracking-wide">Sommaire</p>
          <ol className="mt-2 border-l-4 border-militant-rouge">
            {CHAPITRES.map((c) => (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  className="grid min-h-[40px] grid-cols-[2.6rem_minmax(0,1fr)] items-center gap-1 py-1 pl-3 text-[15px] leading-snug hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
                >
                  <span className="font-condensed font-bold text-militant-bordeaux">{c.court}</span>
                  <span>{c.sommaire}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="max-w-[72ch] space-y-14">
          <p className="rounded-2xl border-2 border-militant-bordeaux px-5 py-4 text-[17px] font-semibold leading-relaxed">
            Préambule : Pour faciliter la lecture, les statuts utilisent le masculin comme forme neutre. Cette convention
            n&apos;enlève rien à l&apos;importance fondamentale du respect des genres et de l&apos;égalité entre toutes et
            tous. Par ailleurs, toute référence à une “majorité” dans le présent document doit être comprise comme une
            majorité supérieure à 50 % des voix
          </p>

          <Chapitre n={1}>
            <Article libelle="Art.1">
              <p>
                La régionale «Namur-Luxembourg» de « LA CENTRALE GENERALE –FGTB » son activité sur les provinces du
                Luxembourg et de Namur.
                <br />
                Elle constitue une section de l&apos;organisation syndicale &quot;La Centrale Générale - FGTB&quot; dont le
                siège est à Bruxelles, 26/28, rue Haute.
              </p>
              <p>
                Elle est le fruit de la fusion de LA CENTRALE GENERALE de Namur et de LA CENTRALE GENERALE du Luxembourg.
              </p>
              <p>
                La « CENTRALE GENERALE Namur-Luxembourg » n&apos;est compétente que pour les litiges liés au droit du
                travail belge. La section ne prendra pas en charge les frais concernant un litige né ou survenu hors de la
                Belgique.
              </p>
            </Article>
            <Article libelle="Art. 2">
              <p>
                La régionale «Namur-Luxembourg» de la Centrale Générale s&apos;assigne comme tâche de grouper dans une
                seule organisation, sans distinction d&apos;opinion politique ou philosophique, tous les travailleurs des
                secteurs suivants (sauf en ce qui concerne l&apos;article 7 ):
              </p>
              <Numeros
                items={[
                  "le secteur de la construction",
                  "l’industrie des mines",
                  "les industries productrices et transformatrices du bois et les professions apparentées",
                  "l'industrie du verre",
                  "l'industrie de la céramique et les briqueteries",
                  "l'industrie chimique et des produits plastiques",
                  "l'industrie du pétrole et de la pétrochimie",
                  "les industries du ciment, le fibrociment, le béton",
                  "les industries des carrières et de production de chaux",
                  "les industries productrices et transformatrices du papier, la récupération du papier",
                  "l'industrie de la chaussure et du cuir",
                  "l'industrie du tabac",
                  "les entreprises de nettoyage, de collecte des déchets et de titres-services",
                  "les entreprises de gardiennage",
                  "les entreprises de travail adapté",
                  "la coiffure, les soins de beauté et fitness",
                  "les entreprises de travail intérimaire",
                  "le secteur des maitres-tailleurs",
                  "l’industrie du vêtement et de la confection",
                  "le secteur de l’entretien du textile",
                  "l’industrie du textile et de la bonneterie",
                  "la Commission paritaire auxiliaire pour ouvriers et employés",
                  "tous les secteurs pour lesquels il n'y a pas d'organisation à la FGTB",
                ]}
              />
            </Article>
          </Chapitre>

          <Chapitre n={2}>
            <Article libelle="Art. 3">
              <p>
                La régionale «Namur-Luxembourg» de la Centrale Générale a pour objectif la défense des intérêts matériels
                et moraux de ses affiliés dans le but final d&apos;arriver au plus tôt à l&apos;abolition de
                l&apos;exploitation de l&apos;homme par l&apos;homme et à la socialisation des moyens de production et
                d&apos;échange.
              </p>
            </Article>
            <Article libelle="Art. 4">
              <Numeros
                items={[
                  "La régionale «Namur-Luxembourg» de la Centrale Générale poursuit ses buts par tous les moyens compatibles avec un régime de saine démocratie.",
                  "Elle est indépendante vis-à-vis des partis politiques.",
                  "La régionale «Namur-Luxembourg» adhère aux régionales de la FGTB dont elle dépend et pour lesquelles, elle accepte les programmes et les statuts. Sa désaffiliation ne pourra être décidée que dans les formes d'une modification statutaire.",
                ]}
              />
            </Article>
            <Article libelle="Art. 5">
              <Numeros
                items={[
                  "Toute décision est prise dans le strict respect des règles de la démocratie.",
                  "Par son affiliation à l'organisation, chaque affilié souscrit à toutes les clauses inscrites dans les statuts ou règlements de la régionale «Namur-Luxembourg» de la Centrale Générale et aux décisions de ses congrès.",
                  "La discussion de toutes les questions qui se posent est libre, jusqu'à ce qu'une décision soit intervenue. Dès qu'une décision est arrêtée, elle doit être respectée, même si une partie des affiliés et d'entreprises ne l'approuvent pas.",
                  "Quiconque adhère ou participe en dehors du syndicat, sous quelque forme que ce soit, à des groupements qui mènent une opposition systématique contre les organisations régulièrement affiliées à la FGTB ou contre leurs décisions se place hors du cadre de la régionale «Namur-Luxembourg» de la Centrale Générale. Il n'est fait aucune distinction entre les faits qui se passent à l'étranger et ceux qui se produisent dans le pays.",
                  "Lors de l'examen de problème au sein des assemblées, il est expressément recommandé de ne jamais se départir des règles de la courtoisie et de la fraternité que tous les affiliés se doivent d'observer.",
                ]}
              />
            </Article>
          </Chapitre>

          <Chapitre n={3}>
            <Article libelle="Art. 6">
              <p>
                L&apos;inscription des affiliés se fait dans les bureaux de la régionale (Arlon, Libramont, Marche, Namur),
                au sein des services de la FGTB interprofessionnelle, dans les entreprises où la régionale est
                syndicalement représentée, ou en ligne sur le site www.accg-nalux.be
              </p>
            </Article>
            <Article libelle="Art.7">
              <p>
                La qualité d&apos;affilié de la régionale «Namur-Luxembourg» de la Centrale Générale se perd; par la
                démission, le non-paiement des cotisations pendant 15 mois (une attention particulière sera donnée aux
                intérimaires) ou par l&apos;exclusion.
              </p>
              <p>
                Pour pouvoir bénéficier des services, l&apos;affilié doit payer ses cotisations de manière régulière soit
                mensuellement, soit trimestriellement soit annuellement en retenue sur prime.
              </p>
              <p>
                Il n&apos;y a pas de place à la régionale «Namur-Luxembourg» de LA CENTRALE GENERALE FGTB pour les idées et
                comportements racistes, xénophobes, sexistes ou fascistes. C&apos;est pourquoi, l&apos;affiliation à la
                régionale «Namur-Luxembourg» de la CG est incompatible avec l&apos;adhésion à des partis ou mouvements
                d&apos;extrême droite et justifie l&apos;exclusion.
              </p>
            </Article>
            <Article libelle="Art. 8">
              <p>
                L&apos;exclusion sera en règle générale prononcée pour manquement grave au respect des statuts et pour
                conduite contraire aux intérêts de l&apos;organisation.
              </p>
              <Numeros
                items={[
                  "L'exclusion est décidée à la majorité des mandatés présents au Comité régional « Namur-Luxembourg » de la Centrale Générale. L’exclusion d’un membre doit être clairement indiquée dans la convocation.",
                  "Chaque affilié dont l'exclusion est portée à l'ordre du jour doit être invité à la réunion qui est appelée à statuer sur son cas, soit par lettre recommandée à la poste, soit par lettre remise contre récépissé.",
                  "L'exclusion prononcée doit être communiquée à l'intéressé dans les 8 jours ouvrables du Comité Régional, par lettre recommandée à la poste ou par lettre remise contre récépissé.",
                  "Chaque affilié exclu peut interjeter appel devant le Comité fédéral. Pour être recevable, l'appel doit être adressé au Président fédéral de la Centrale Générale endéans le mois de la signification de l'exclusion de l’affilié.",
                  "L'appel contre l'exclusion est déféré par le Comité fédéral endéans le mois à une commission spéciale, celle-ci est composée de trois membres du Comité fédéral, désignés par celui-ci et de trois membres du Comité Régional de la Centrale Générale Namur-Luxembourg, désignés par l’ affilié en question.",
                  "L'appel suspend l'exclusion, mais pendant son examen la qualité d’affilié est suspendue, elle aussi.",
                  "La suspension de la qualité d’affilié se transforme en exclusion définitive si l’affilié en appel n'a pas désigné ses trois représentants endéans le mois de l'envoi de la lettre recommandée ou de la réception de la lettre remise contre récépissé l'engageant à les désigner.",
                  "Le Comité fédéral approuve ou désapprouve les conclusions de la commission spéciale; il tranche la question si la commission spéciale n'a pas pu formuler des conclusions pour cause de parité de voix.",
                ]}
              />
            </Article>
            <Article libelle="Art. 9">
              <p>La fin de l&apos;affiliation entraîne la perte de tout droit aux avantages de l&apos;organisation.</p>
            </Article>
          </Chapitre>

          <Chapitre n={4}>
            <Article libelle="Art. 10">
              <p>Le Congrès constitue l&apos;instance suprême de la régionale «Namur-Luxembourg» de la Centrale Générale.</p>
              <p>Les attributions du Congrès comprennent notamment</p>
              <Tirets
                items={[
                  "la discussion et l’approbation des rapports du Secrétariat régional",
                  "la discussion des modifications de statuts",
                  "la nomination des membres du Comité régional et des membres de la Commission de contrôle",
                  "la discussion sur les perspectives d’avenir de la régionale",
                ]}
              />
            </Article>
            <Article libelle="Art. 11">
              <p>
                Un Congrès statutaire est convoqué tous les quatre ans. Des Congrès extraordinaires peuvent être convoqués
                par le Comité exécutif ou le Comité régional de la régionale «Namur-Luxembourg» de la Centrale Générale, si
                la majorité de leurs membres en font la demande.
              </p>
            </Article>
            <Article libelle="Art. 12">
              <p>
                Tant pour les Congrès statutaires que pour les Congrès extraordinaires, le Comité exécutif de la régionale
                «Namur-Luxembourg» de la Centrale Générale propose au Comité régional la date et l&apos;ordre du jour qui
                sera transmis aux mandatés.
              </p>
              <p>
                Les mandatés sont les délégués disposant d&apos;un mandat effectif en délégation syndicale ainsi que les
                membres du Comité Régional.
              </p>
            </Article>
            <Article libelle="Art. 13">
              <p>
                Le Congrès décide à la majorité des voix des délégués présents. En cas de parité de voix, la proposition
                est rejetée. Les votes au congrès ont lieu à main levée sauf si 10% des délégués présents font la demande
                d&apos;un vote secret. Les votes concernant des personnes auront toujours lieu à bulletins secrets.
                <br />
                Les membres du Secrétariat n&apos;ont pas le droit de vote au congrès.
              </p>
            </Article>
            <Article libelle="Art. 14">
              <p>
                L&apos;ordre du jour du Congrès comprend toutes les questions portées à l&apos;initiative du Comité régional
                de la régionale «Namur-Luxembourg» de la Centrale Générale ou inscrites selon les règles établies par le
                présent article à la demande d&apos;une section d&apos;entreprise.
              </p>
              <Numeros
                items={[
                  "La date du Congrès statutaire et l'ordre du jour provisoirement arrêté par le Comité régional de la régionale «Namur-Luxembourg» de la Centrale Générale sont envoyés au moins deux mois avant la date du Congrès.",
                  "Le Comité régional veillera à ce que le lieu choisi pour l’organisation du Congrès se situe à des distances raisonnables pour l’ensemble des mandataires.",
                  "Pour les Congrès extraordinaires, les délais établis par le présent article seront observés autant que possible et dans la mesure où les circonstances le permettent.",
                  "La demande d'inscription d'un point à l'ordre du jour du Congrès régional, émanant d'entreprise doit parvenir au Secrétariat de la régionale «Namur-Luxembourg» de la Centrale Générale au moins 6 semaines avant la date du Congrès et doit être accompagnée d'un exposé des motifs.",
                  "Les rapports concernant les points de l'ordre du jour sont transmis aux mandatés quatre semaines avant le Congrès en vue de leur discussion.",
                  "Lors de l’approbation de l’ordre du jour, le Congrès peut, à la majorité des 2/3 des délégués présents avec droit de vote, inscrire d’urgence d’autres points à l’ordre du jour qui auraient été déposés par écrit hors délai statutaire.",
                  "Le Secrétariat soumet au Congrès un rapport sur ses activités ; par l’adoption de ce rapport, son mandat est renouvelé. Le Congrès peut décider de scinder ce rapport afin de lui permettre de juger en particulier de l’activité d’un ou de chacun des membres du Secrétariat. Dans ce cas, le rejet de la partie du rapport qui concerne l’activ ité d’un membre du Secrétariat régional entraîne la fin du mandat de celui-ci.",
                  "Le Congrès détermine la composition du Comité régional sur proposition de ce dernier.",
                ]}
              />
            </Article>
          </Chapitre>

          <Chapitre n={5}>
            <Article libelle="Art. 15">
              <p>
                Les Commissions professionnelles désignent les membres du Comité régional qui doit se réunir au moins 4 fois
                par an. Une réunion supplémentaire devra être convoquée à la demande soit
              </p>
              <Tirets items={["d’ 1/5 des membres du Comité régional", "d’1/3 des membres du Comité exécutif", "d’ 1 membre du Secrétariat"]} />
              <p>
                Le Comité exécutif veillera à ce que le lieu choisi pour l&apos;organisation du Comité régional se situe à
                des distances raisonnables pour l&apos;ensemble des mandataires.
              </p>
              <p>
                Le Comité régional a pour mission de diriger la régionale entre deux Congrès statutaires et de prendre
                position sur les problèmes d&apos;intérêt général, tels que par exemple :
              </p>
              <Numeros
                items={[
                  "Désignation ou remplacement des membres du Comité exécutif présentés par les Commissions professionnelles concernées ou de la Commission de contrôle ;",
                  "Désignation ou remplacement éventuel d'un membre du Secrétariat régional ; désignation du Secrétaire régional parmi les membres du Secrétariat et fixation des modalités de fin de mandat d’un membre du Secrétariat qui aurait été mis en cause par le Congrès ;",
                  "Décision quant à un mouvement de grève intersectoriel ;",
                  "Modifications des statuts régionaux ;",
                  "Exclusion des affiliés ;",
                  "Désignation par cooptation de représentants des groupes spécifiques ;",
                  "Décision à propos d’actions d’envergure menées par la régionale ;",
                  "prise de position sur des sujets d’intérêt général.",
                ]}
              />
              <p>
                Le Comité régional décide à la majorité des voix des délégués présents. En cas de parité de voix, la
                proposition est rejetée. Les votes au Comité régional ont lieu à main levée sauf si 10% des délégués
                présents font la demande d&apos;un vote secret. Les votes concernant des personnes auront toujours lieu à
                bulletins secrets.
              </p>
              <p>Toutes les décisions sont prises en tenant compte :</p>
              <Tirets
                items={[
                  "Que 50% des délégués représentant la province de Namur soient présents",
                  "Que 50% des délégués représentant la province du Luxembourg soient présents",
                ]}
              />
              <p>
                Lors d&apos;un vote, les voix de chaque province feront l&apos;objet d&apos;une pondération pour ne pas
                excéder 50 % du total des votes.
              </p>
              <p>
                Si l&apos;une des deux Provinces n&apos;atteint pas le quorum (50% de présence des élus), le point est
                reporté à la réunion suivante, où il ne sera plus tenu compte du quorum.
              </p>
              <p>Le Comité régional est composé de :</p>
              <p className="font-condensed text-xl font-bold">LE COMITE REGIONAL</p>
              <Composition
                titre="Pour les représentants des secteurs de la province de Namur (20):"
                items={[
                  "Construction : 4",
                  "Titres-services : 2",
                  "Chimie : 3",
                  "Petits secteurs (gardiennage, nettoyage, béton, verre, bois) : 4",
                  "Carrières : 2",
                  "ETA : 2",
                  "Groupes cibles (TSE et Pensionnés/RCC) : 2",
                  "Jeunes : 1",
                ]}
              />
              <Composition
                titre="Pour les représentants des secteurs de la province de Luxembourg (20):"
                items={[
                  "Chimie : 6",
                  "ETA : 3",
                  "Construction : 1",
                  "Scieries : 1",
                  "Transfo bois : 1",
                  "Prod et Transfo papier : 2",
                  "Petits secteurs (gardiennage, nettoyage) : 2",
                  "Titres-Services: 2",
                  "CP 100: 1",
                  "Jeunes : 1",
                ]}
              />
            </Article>
          </Chapitre>

          <Chapitre n={6}>
            <Article libelle="Art. 16">
              <p>Le Comité exécutif se compose, outre les membres du Secrétariat, de :</p>
              <Composition
                titre={<span className="underline">Pour les représentants des secteurs de la province de Namur (10 effectifs et 10 suppléants):</span>}
                items={[
                  "Construction : 3",
                  "Titres-services : 1",
                  "Chimie : 1",
                  "Petits secteurs (gardiennage, nettoyage, béton, verre, bois) : 1",
                  "Carrières : 1",
                  "ETA : 1",
                  "Groupes cibles (TSE et Pensionnés/RCC) : 1",
                  "Jeunes : 1",
                ]}
              />
              <Composition
                titre={<span className="underline">Pour les représentants des secteurs de la province de Luxembourg (10 effectifs et 10 suppléants):</span>}
                items={[
                  "Chimie : 2",
                  "ETA : 1",
                  "Scieries : 1",
                  "Transfo bois : 1",
                  "Prod et Transfo papier : 1",
                  "Petits secteurs (gardiennage, nettoyage) : 1",
                  "Titres-services : 1",
                  "CP 100: 1",
                  "Jeunes : 1",
                ]}
              />
              <p>
                Les mandats sectoriels devront être définis dans un délai de trois mois à compter de la date du Congrès. Les
                Secrétaires permanents organiseront des commissions professionnelles afin que celles-ci désignent leurs
                mandatés. Il ne peut y avoir deux représentants d&apos;une même entreprise/d&apos;un même groupe. Lors du
                vote, les trois entreprises comptant le plus grand nombre d&apos;affiliés disposeront de deux voix chacune.
              </p>
              <p>
                Si un secteur n&apos;occupe pas un mandat, celui-ci sera temporairement octroyé à un autre secteur. La
                décision de ce remplacement se fera lors d&apos;une réunion du Comité Exécutif. Le Secrétariat s&apos;engage
                à tout mettre en œuvre afin que ce remplacement soit de courte durée.
              </p>
              <p>
                Les représentants des groupes cibles s&apos;abstiendront de voter si les décisions à prendre ne concernent
                que les travailleurs actifs.
              </p>
              <p>
                Le Comité exécutif se réunit aussi souvent que nécessaire, mais au moins six fois sur une année civile et
                s&apos;occupe de tous les faits et événements qui intéressent la vie de la régionale. Si une question
                intéressant un secteur non représenté au Comité exécutif est à l&apos;ordre du jour, un représentant de ce
                secteur au Comité régional sera convoqué à la séance du Comité exécutif.
              </p>
              <p>
                Un Comité exécutif extraordinaire doit être convoqué à la demande d&apos;un tiers de ses membres.
                <br />
                Le Secrétariat veillera à ce que le lieu choisi pour l&apos;organisation du Comité exécutif se situe à des
                distances raisonnables pour l&apos;ensemble des mandataires.
              </p>
            </Article>
            <Article libelle="Art. 17">
              <p>
                Le Comité exécutif veille à l&apos;exécution des décisions prises par le Comité régional et prend toutes les
                mesures qui peuvent concourir au bon fonctionnement et au développement de l&apos;organisation dans son
                ensemble.
                <br />
                Il est chargé de la gestion générale de l&apos;organisation et soumet au Comité régional les orientations de
                la politique syndicale de la section.
              </p>
            </Article>
            <Article libelle="Art. 18">
              <p>
                A tout moment, il a le droit de suspendre un membre du Secrétariat régional. Un Rapport sur cette suspension
                sera fait aussitôt que possible au Comité régional qui décide finalement de la sanction éventuelle.
              </p>
            </Article>
            <Article libelle="Art.19">
              <p>
                Le Comité exécutif rend compte de sa mission au Comité régional dont il prépare les réunions. Les membres du
                Comité exécutif ont le devoir de participer aux réunions du Comité régional. Ce dernier peut à tout moment
                porter à son ordre du jour les décis ions et actes du Comité exécutif qu&apos;il juge devoir examiner.
              </p>
            </Article>
            <Article libelle="Art. 20">
              <p>En cas de vote, les décisions ne peuvent être prises que si :</p>
              <Tirets
                items={[
                  "50% des délégués représentant la province de Namur sont présents",
                  "50% des délégués représentant la province du Luxembourg sont présents",
                ]}
              />
              <p>
                Lors d&apos;un vote, les voix de chaque province feront l&apos;objet d&apos;une pondération pour ne pas
                excéder 50 % du total des votes.
              </p>
              <p>
                Si l&apos;une des deux Provinces n&apos;atteint pas le quorum (50% de présence des élus ), le point est
                reporté à la réunion suivante, où il ne sera plus tenu compte du quorum.
              </p>
              <p>
                S&apos;il y a parité de voix, la demande est rejetée. Les votes au Comité exécutif ont lieu à main levée sauf
                si 2 des membres présents font la demande d&apos;un vote secret. Les votes concernant des personnes auront
                toujours lieu à bulletins secrets.
              </p>
              <p>Les décisions du Comité exécutif seront transmises au Comité régional à la fin de chaque réunion.</p>
              <p>Le règlement d&apos;ordre intérieur du Comité Exécutif est annexé au présent statut</p>
            </Article>
          </Chapitre>

          <Chapitre n={7}>
            <Article libelle="Art. 21">
              <p>Le Secrétariat régional qui assure la gestion journalière ne peut valablement siéger que si :</p>
              <Numeros
                items={[
                  "Le Secrétaire régional est présent",
                  "Plus de la moitié des membres sont présents (dont au moins 1 membre de chaque province)",
                ]}
              />
              <p>Composition du Secrétariat :</p>
              <Tirets items={["1 Secrétaire régional", "4 Secrétaires permanents"]} />
              <p>
                Le Secrétariat doit toujours être composé de 2 membres dont l&apos;activité se concentre majoritairement sur
                la province du Luxembourg et de 3 membres dont l&apos;activité se concentre majoritairement sur la province
                de Namur.
              </p>
              <p>
                En cas de vote, le Secrétariat régional décide à la majorité des membres présents. S&apos;il y a parité de
                voix, le point est rejeté.
              </p>
              <p>
                Le responsable de la gestion quotidienne est le Secrétaire régional. Son mandat peut lui être retiré avant
                terme par le Comité fédéral sur base du service audit de la CG moyennant décision prise à la majorité des
                voix émises, abstention non comprises dans chaque rôle linguistique. Le Comité régional est informé du début
                de la procédure ainsi que de son résultat. Les motifs du retrait ne peuvent être inhérents à l&apos;exercice
                politico-syndical du mandat.
              </p>
              <p>
                Le cas échéant, pour les mêmes motifs, le mandat peut être suspendu sur rapport provisoire du service audit
                par le Président et le Secrétaire général agissant de concert pour une durée ne pouvant excéder 3 mois et
                renouvelable pour une période de même durée en cas d&apos;enquête pénale. En attendant la désignation
                d&apos;un Secrétaire régional intérimaire par le Comité régional, le Comité exécutif de la Centrale fédérale
                peut désigner un Secrétaire intérimaire chargé de la gestion financière de la section pour une durée
                qu&apos;il détermine.
              </p>
            </Article>
            <Article libelle="Art. 22">
              <p>
                Dans l&apos;éventualité où une suggestion est rejetée par parité de voix, l&apos;auteur de la suggestion
                rejetée pourra demander de faire inscrire le point à l&apos;ordre du jour du plus prochain Comité exécutif
                régional.
              </p>
            </Article>
          </Chapitre>

          <Chapitre n={8}>
            <Article libelle="Art. 23">
              <p>
                Le Comité exécutif de la régionale institue des Commissions professionnelles pour chacune des branches
                d&apos;activité où cela s&apos;avère nécessaire et/ou possible.
              </p>
              <p>
                Ces commissions professionnelles décideront d&apos;organiser leurs réunions soit par province soit de
                manière groupée.
              </p>
              <p>
                Dans tous les cas, le/les Secrétaire(s) permanent(s) tenteront d&apos;obtenir une position commune pour la
                régionale «Namur-Luxembourg».
              </p>
              <p>
                Il est également possible de rejoindre une autre section régionale afin de participer à sa commission
                professionnelle.
              </p>
              <p>
                Ces Commissions se réunissent quand nécessaire et sont chargées de la préparation et de l&apos;agencement de
                l&apos;activité syndicale dans leur branche.
              </p>
              <p>
                Avant le Congrès, le secrétaire responsable du secteur fait son rapport d&apos;activité devant les
                Commissions professionnelles concernées et demande leur approbation ; en cas de désapprobation de son
                rapport d&apos;activité, le point sera abordé au Congrès régional.
              </p>
              <p>
                Entre 2 Congrès, communication sera faite au Comité exécutif et ensuite au Comité régional de la
                désapprobation ou des critiques importantes émises au sujet de l&apos;activité du/des secrétaire(s)
                concerné(s).
              </p>
              <p>
                Lors de la première réunion post congrès (dans les 3 mois), la commission devra désigner ses représentants
                qui siégeront au Comité Régional. Parmi ces mandataires, la commission devra désigner les représentants du
                Comité Exécutif.
              </p>
              <p>
                Afin de permettre une communication optimale le Secrétariat mettra à disposition un outil de communication
                entre délégués (WhatsApp,…)
              </p>
              <p>
                C&apos;est la Commission professionnelle qui propose ses représentants aux différentes instances de la
                régionale «Namur-Luxembourg» de la CENTRALE GENERALE, en respectant les dispositions prévues à
                l&apos;article 16.
              </p>
            </Article>
          </Chapitre>

          <Chapitre n={9}>
            <Article libelle="Article 24">
              <p>
                Les comptes de la régionale sont régulièrement contrôlés par des contrôleurs aux comptes venant de la
                Centrale Générale fédérale. En outre, le Congrès désigne sur proposition du Comité régional, 6 délégués (en
                respectant une parité entre les deux provinces) chargés du contrôle des comptes de la section. Pour se
                faire, avant chaque Congrès statutaire, un appel à candidatures sera réalisé au moins deux mois avant la
                date du Congrès. Les candidatures doivent parvenir au Secrétariat de la régionale «Namur-Luxembourg» de la
                Centrale Générale au moins 1 mois avant la date du Congrès. Si plus de 6 délégués sont candidats, un vote
                sera réalisé au Comité Régional.
                <br />
                Par souci d&apos;indépendance, les membres de la Commission de contrôle ne peuvent pas être membres des
                Comité exécutif et Comité régional de la régionale « Namur-Luxembourg » de la Centrale Générale.
                <br />
                Cette Commission se réunit au moins une fois par an et fait rapport au Comité exécutif. Elle dispose des
                pouvoirs les plus étendus de contrôle, de vérification et d&apos;investigation. Elle peut rencontrer à sa
                demande le contrôleur de la Centrale Générale fédérale. Le Comité exécutif peut demander des réunions
                supplémentaires de cette commission. La Commission de contrôle fait rapport de sa mission à chaque Congrès
                statutaire.
              </p>
            </Article>
          </Chapitre>

          <Chapitre n={10}>
            <Article libelle="Art.25">
              <p>
                La régionale «Namur-Luxembourg» de la Centrale Générale se compose d&apos;entreprises et de groupes cibles
                (pensionnés, bénéficiaires du régime de chômage avec complément d&apos;entreprise, travailleurs sans emploi,
                jeunes, femmes, immigrés). Des groupes de travail sur des thèmes et/ou objectifs déterminés par les
                instances régionales peuvent être chargés d&apos;une mission et rendront compte de celle-ci devant les
                instances régionales.
              </p>
            </Article>
          </Chapitre>

          <Chapitre n={11}>
            <Article libelle="Art. 26">
              <p>
                Les cotisations sont indexées annuellement. Le Secrétariat informera annuellement et anticipativement le
                Comité exécutif et le Comité régional de sa décision d&apos;appliquer totalement ou partiellement
                l&apos;indexation.
              </p>
            </Article>
            <Article libelle="Art. 27">
              <p>
                Les affiliés ne peuvent bénéficier des avantages qu&apos;après l&apos;accomplissement du stage et
                vérification du paiement de leurs cotisations syndicales.
              </p>
            </Article>
            <Article libelle="Art 28.">
              <p>
                Le membre devra avoir respecté un stage de 3 mois accompli, à la connaissance du litige, pour pouvoir
                bénéficier de l&apos;ensemble des services de la FGTB.
              </p>
              <p>
                Dans les cas suivants : stage non accompli, nouvelle affiliation ou naissance du litige avant
                l&apos;accomplissement du stage, la règle générale est qu&apos;il n&apos;y a pas de prise en charge du
                dossier litige. Le Secrétariat peut décider exceptionnellement de déroger à cette règle.
                <br />
                Si le membre fait partie d&apos;une entreprise où la régionale « Namur-Luxembourg de la Centrale Générale
                est représentée syndicalement, l&apos;avis du délégué sera pris en compte avant de statuer sur la prise en
                charge ou non du dossier.,
              </p>
              <p>
                Si un avis positif ressort, l&apos;affilié devra régulariser un arriéré de cotisations* selon les conditions
                suivantes :
              </p>
              <Numeros
                marque=")"
                items={[
                  <>
                    Minimum 6 mois de cotisations** pour l&apos;intervention du service social (1<sup>ère</sup> ligne).
                  </>,
                  "Minimum 15 mois de cotisations** si le dossier nécessite l’intervention du service juridique (ODS, juriste,…)",
                ]}
              />
              <p>
                En cas de prise en charge d&apos;un dossier litige, alors que le membre n&apos;a pas accompli pleinement la
                durée du stage de 3 mois, un rapport sera rendu auprès du Comité Régional par le Secrétariat.
              </p>
              <p>
                Dans le cadre des demandes d&apos;accompagnement pour les auditions ONEm/FOREM ou pour les dossiers «
                faillite », la durée du stage sera réduite à 1 mois.
              </p>
              <p>
                En fonction des circonstances, le Secrétaire régional pourra déroger aux règles définies au présent article.
              </p>
              <div className="space-y-1 border-t border-militant-ardoise pt-3 text-[15px]">
                <p>** les cotisations déjà versées seront déduites</p>
                <p>
                  * le jour de la signature de l&apos;affiliation, la première ligne fera un premier courrier concernant les
                  éléments suivants (documents sociaux, réclamation salaires impayés,…)
                </p>
              </div>
            </Article>
            <Article libelle="Art.29">
              <p>
                Les jeunes, les nouveaux occupants du sol belge, qui adhèrent dès leur mise au travail ainsi que les affiliés
                transférés d&apos;une autre organisation syndicale sont exempts de ce stage.
              </p>
            </Article>
            <Article libelle="Art. 30">
              <p>L&apos;affilié qui, démissionnaire ou rayé, se fait réinscrire est soumis au stage réglementaire.</p>
            </Article>
          </Chapitre>
        </div>
      </div>
    </main>
  );
}
