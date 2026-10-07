import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSupabase } from "../../lib/supabase";
import { PHOTOS, type CleePhoto } from "../../lib/pourquoi-s-affilier";
import BandeauSecteurs from "./BandeauSecteurs";
import Compteur from "./Compteur";
import { BandePrime, BiseauLumiere } from "./Fonds";
import Foule from "./Foule";
import PhrasePivot from "./PhrasePivot";
import { PhotoEnsemble, PhotoPoids } from "./Photos";
import PointsIsoles from "./PointsIsoles";
import { Apparition, Filet, Surgissement } from "./Revelation";

export const metadata: Metadata = {
  // Pas de tiret cadratin sur cette page (demande de Fred du 06/10/2026), titre d'onglet compris.
  title: "Pourquoi s’affilier - Centrale Générale FGTB Namur-Luxembourg",
  description:
    "Défense juridique sans frais en plus, prime syndicale, allocations payées vite, 4 bureaux en provinces de Namur et de Luxembourg : seul, on subit ; ensemble, on décide.",
};

/*
 * Récit en 4 temps (maquette validée par Fred, textes repris tels quels) :
 * 1. Seul : un point rouge dans le vide. 2. Les preuves, chacune dans une mise en page différente.
 * 3. Ensemble : la foule se forme autour du point (section épinglée). 4. Agir : bloc rouge.
 * Lumière (07/10/2026, Fred trouvait la page sombre « triste et austère ») : seule l'ouverture est
 * sombre, c'est le moment où l'on est seul ; la lumière entre ensuite en biais et le reste du récit
 * se déroule sur du blanc, avec des aplats bordeaux et rouges.
 */

/** URL publique des photos choisies, lues dans la vue publique (jamais la table). Absente = pas de photo. */
async function chargerPhotos(): Promise<Partial<Record<CleePhoto, string>>> {
  const { data, error } = await getSupabase().from("site_photos_public").select("url");
  if (error || !data) return {};
  const urls: Partial<Record<CleePhoto, string>> = {};
  for (const cle of Object.keys(PHOTOS) as CleePhoto[]) {
    const trouvee = data.find((p) => typeof p.url === "string" && p.url.endsWith(`/action-photos/${PHOTOS[cle].chemin}`));
    if (trouvee) urls[cle] = trouvee.url;
  }
  return urls;
}

/** Bouton d'affiliation de la page (une seule formulation pour une seule intention). */
function BoutonAffiliation({ variante }: { variante: "rouge" | "blanc" }) {
  const couleurs =
    variante === "rouge"
      ? "bg-militant-rouge text-white hover:bg-white hover:text-militant-bordeaux focus-visible:outline-white"
      : "bg-white text-militant-bordeaux hover:bg-militant-charbon hover:text-white focus-visible:outline-militant-charbon";
  return (
    <Link
      href="/affiliation"
      className={`group inline-flex min-h-[56px] touch-manipulation items-center gap-3 whitespace-nowrap px-7 pb-[15px] pt-[17px] font-condensed text-[clamp(1.25rem,1.8vw,1.5rem)] font-extrabold uppercase leading-none tracking-[0.02em] transition-[background-color,color,transform] duration-200 [-webkit-tap-highlight-color:transparent] focus:outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 active:translate-y-px active:scale-[0.98] ${couleurs}`}
    >
      M&rsquo;affilier en ligne
      <ArrowRight
        aria-hidden
        size={22}
        strokeWidth={2.5}
        className="-mt-0.5 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
      />
    </Link>
  );
}

const BUREAUX = [
  { ville: "Namur", province: "Province de Namur" },
  { ville: "Libramont", province: "Province de Luxembourg" },
  { ville: "Marche", province: "Province de Luxembourg" },
  { ville: "Arlon", province: "Province de Luxembourg" },
];

const titreBloc = "mb-4 font-condensed text-[clamp(1.8rem,2.8vw,2.5rem)] font-extrabold uppercase leading-none [text-wrap:balance]";
const grosChiffre =
  "font-condensed font-extrabold leading-[0.8] tracking-[-0.03em] [font-variant-numeric:tabular-nums] whitespace-nowrap";

export default async function PourquoiSAffilier() {
  const photos = await chargerPhotos();

  return (
    <main className="pourquoi overflow-x-clip bg-white text-lg leading-[1.55] text-militant-charbon antialiased">
      {/* ── 1. Seul ── seul moment sombre de la page. Hauteur : écran moins la navigation et
          l'éventuel bandeau de mobilisation, pour que la phrase et le bouton restent visibles. */}
      <section
        aria-labelledby="titre-seul"
        className="relative grid min-h-[calc(100svh-160px)] grid-rows-[auto_1fr] overflow-hidden bg-militant-charbon pb-[clamp(32px,6vh,72px)] pt-7 text-white"
      >
        {/* Les autres isolés, pâles et dispersés : ils se rapprochent du point rouge au défilement. */}
        <PointsIsoles />
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-[15px] font-semibold text-militant-ardoise">
            <span translate="no" className="text-white">
              Centrale Générale FGTB
            </span>{" "}
            <span translate="no">Namur-Luxembourg</span>
          </p>
        </div>
        {/* Le travailleur isolé : un point rouge qui palpite, dans un halo (on le retrouve au cœur de la foule). */}
        <div aria-hidden className="pourquoi-seul absolute right-[max(28px,16vw)] top-[22%] h-4 w-4 rounded-full bg-militant-rouge md:top-[34%]" />
        <div className="relative mx-auto w-full max-w-7xl self-end px-4 sm:px-6 lg:px-8">
          <h1 id="titre-seul" className="font-condensed text-[clamp(4.5rem,min(19vw,26svh),19rem)] font-extrabold uppercase leading-[0.8] tracking-[-0.015em]">
            <span className="block overflow-hidden pb-[0.04em]">
              <span className="pourquoi-ligne block">Seul,</span>
            </span>
            <span className="block overflow-hidden pb-[0.04em]">
              <span className="pourquoi-ligne pourquoi-ligne-2 block">on subit.</span>
            </span>
          </h1>
          <div className="pourquoi-suite mt-[clamp(28px,4vw,48px)] flex flex-wrap items-center gap-x-12 gap-y-6">
            <p className="max-w-[30ch] text-[clamp(1.15rem,1.6vw,1.35rem)] leading-[1.45]">
              Un licenciement, une fiche de paie fausse, un chef qui abuse.{" "}
              <span className="text-militant-ardoise">Seul, vous ne pesez rien.</span>
            </p>
            <BoutonAffiliation variante="rouge" />
          </div>
        </div>
      </section>

      {/* La lumière entre, en biais. */}
      <BiseauLumiere />

      {/* ── 2. Les preuves : quatre mises en page différentes ── */}
      <section aria-labelledby="titre-poids" className="pt-[clamp(48px,7vw,110px)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Phrase de transition, avec une vraie photo d'action quand elle est publiée. */}
          <div
            className={
              photos.poids ? "grid items-end gap-10 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-16" : undefined
            }
          >
            <PhrasePivot id="titre-poids" texte="Avec la Centrale Générale, vous avez du poids." accent={["poids"]} />
            {photos.poids && <PhotoPoids url={photos.poids} alt={PHOTOS.poids.alt} />}
          </div>

          {/* A. Chiffre à gauche, texte à droite */}
          <article className="grid items-end gap-[clamp(24px,4vw,64px)] pt-[clamp(80px,11vw,160px)] md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <p aria-hidden className={`${grosChiffre} text-[clamp(8rem,24vw,20rem)] text-militant-rouge`}>
              <Surgissement>
                0<span className="ml-[0.05em] text-[0.42em] tracking-normal">€</span>
              </Surgissement>
            </p>
            <Apparition>
              <h3 className={titreBloc}>
                <span className="sr-only">0 € </span>Pour vous faire défendre
              </h3>
              <p className="max-w-[44ch]">
                Licenciement abusif, salaire impayé, harcèlement&nbsp;: nos juristes en droit du travail prennent votre
                dossier, sans frais en plus.
              </p>
              <Filet className="mt-6 h-0.5 bg-militant-charbon" />
              <p className="flex items-baseline gap-3 pt-4">
                <Compteur
                  valeur={1000}
                  className="font-condensed text-[2rem] font-extrabold leading-none text-militant-rouge [font-variant-numeric:tabular-nums]"
                />
                <span className="font-medium">
                  <span className="sr-only">1 000 </span>dossiers juridiques par an
                </span>
              </p>
            </Apparition>
          </article>
        </div>

        {/* B. Chiffre géant pleine largeur, sur une bande bordeaux en biais */}
        <article className="mt-[clamp(72px,10vw,150px)]">
          <BandePrime>
            <div className="mx-auto max-w-7xl px-4 pb-[calc(8.8vw+clamp(48px,6vw,96px))] pt-[calc(8.8vw+clamp(32px,4vw,64px))] sm:px-6 lg:px-8">
              <p aria-hidden className={`${grosChiffre} -mr-[0.04em] text-right text-[clamp(9rem,33vw,30rem)]`}>
                <Compteur valeur={145} />
                <span className="ml-[0.05em] text-[0.42em] tracking-normal">€</span>
              </p>
              <Apparition className="ml-0 mt-[clamp(24px,3vw,40px)] max-w-[520px] md:ml-auto">
                <h3 className={titreBloc}>
                  <span className="sr-only">145 € </span>De prime syndicale par an, au maximum
                </h3>
                <p className="max-w-[44ch]">Prime sectorielle, elle rembourse une grande partie de votre cotisation.</p>
                <p className="mt-3 max-w-[44ch] font-semibold">
                  Au chômage, temporaire ou complet&nbsp;? Vos allocations sont payées vite.
                </p>
              </Apparition>
            </div>
          </BandePrime>
        </article>

        {/* C. Banderole des secteurs, pleine largeur, qui avance avec le défilement */}
        <article className="pt-[clamp(56px,8vw,120px)]">
          <BandeauSecteurs />
          <Apparition className="mx-auto mt-[clamp(24px,3vw,40px)] max-w-7xl px-4 sm:px-6 lg:px-8">
            <h3 className={titreBloc}>Votre secteur, on le connaît par cœur</h3>
            <p className="max-w-[44ch]">
              Construction, nettoyage, gardiennage, chimie, bois, verre, intérim. Indexation, prime de fin d&rsquo;année,
              éco-chèques&nbsp;: on vérifie que vous touchez tout.
            </p>
          </Apparition>
        </article>

        {/* D. Grille des quatre bureaux */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <article className="pt-[clamp(100px,14vw,200px)]">
            <div className="mb-[clamp(32px,4vw,56px)] flex items-end gap-[clamp(16px,2vw,28px)]">
              <p aria-hidden className={`${grosChiffre} text-[clamp(8rem,18vw,15rem)] text-militant-rouge`}>
                <Compteur valeur={4} />
              </p>
              <h3 className="mb-[0.35em] max-w-[9ch] font-condensed text-[clamp(2rem,4vw,3.4rem)] font-extrabold uppercase leading-none [text-wrap:balance]">
                <span className="sr-only">4 </span>Bureaux près de chez vous
              </h3>
            </div>
            <Filet className="h-1.5 bg-militant-charbon" />
            <ul className="grid grid-cols-2 gap-y-7 md:grid-cols-4 md:gap-y-0">
              {BUREAUX.map((b, i) => (
                <li key={b.ville} className="min-w-0 pr-[clamp(12px,2vw,28px)] pt-[22px]">
                  <Apparition delai={i * 0.08}>
                    <span className="block font-condensed text-[clamp(1.8rem,3.4vw,3rem)] font-extrabold uppercase leading-none">
                      {b.ville}
                    </span>
                    <span className="mt-2 block text-[15px] font-medium text-militant-bordeaux">{b.province}</span>
                  </Apparition>
                </li>
              ))}
            </ul>
            <Apparition className="mt-[clamp(28px,3vw,40px)]">
              <p className="max-w-[44ch]">
                Un rendez-vous en face-à-face, pas un labyrinthe téléphonique. Et des délégués dans une centaine
                d&rsquo;entreprises de la région.
              </p>
            </Apparition>
          </article>
        </div>
      </section>

      {/* ── 3. Ensemble (le moment fort) ── */}
      <Foule />

      {/* ── 4. Agir : le bloc rouge ── */}
      <section
        aria-labelledby="titre-agir"
        className={`relative isolate overflow-hidden bg-militant-rouge py-[clamp(88px,12vw,170px)] text-white ${photos.ensemble ? "pb-[75vw] md:pb-[clamp(88px,12vw,170px)]" : ""}`}
      >
        {photos.ensemble && <PhotoEnsemble url={photos.ensemble} alt={PHOTOS.ensemble.alt} />}
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            id="titre-agir"
            className="font-condensed text-[clamp(3.4rem,15vw,13rem)] font-extrabold uppercase leading-[0.8] tracking-[-0.015em]"
          >
            <Surgissement className="pb-[0.04em]">Ensemble,</Surgissement>
            <Surgissement className="pb-[0.04em]">on décide.</Surgissement>
          </h2>
          <Apparition className="mt-[clamp(36px,5vw,64px)] flex flex-wrap items-center gap-x-9 gap-y-5">
            <BoutonAffiliation variante="blanc" />
            <p className="text-2xl font-medium">Quelques minutes suffisent.</p>
          </Apparition>
        </div>
      </section>
    </main>
  );
}
