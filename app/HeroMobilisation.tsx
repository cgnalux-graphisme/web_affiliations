import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { cheminMobilisation, dateMobilisation, lienValide, type MobilisationPublique } from "../lib/mobilisations";
import CompteARebours from "./mobilisation/CompteARebours";
import { BoutonInscription } from "./mobilisation/VueMobilisation";

/** Ouverture de l'accueil quand une mobilisation est mise en avant : grand appel à l'action. */
export default function HeroMobilisation({ m }: { m: MobilisationPublique }) {
  const lien = lienValide(m.lien_inscription) ? m.lien_inscription : null;
  const date = dateMobilisation(m.date_evenement);
  const page = m.slug ? cheminMobilisation(m.slug) : null;

  return (
    <section aria-labelledby="titre-mobilisation" className="py-8 lg:py-12">
      <div className="relative grid overflow-hidden rounded-2xl bg-militant-bordeaux text-white lg:grid-cols-12">
        <div aria-hidden className="absolute inset-y-0 left-0 z-10 w-2 bg-militant-rouge sm:w-3" />
        <div className="relative aspect-[16/9] bg-militant-ardoise lg:order-2 lg:col-span-5 lg:aspect-auto">
          {m.image_hero && (
            <Image src={m.image_hero} alt="" fill priority sizes="(min-width: 1024px) 520px, 100vw" className="object-cover" />
          )}
        </div>
        <div className="flex flex-col px-6 pb-9 pt-7 sm:px-10 sm:pb-12 sm:pt-10 lg:col-span-7 lg:py-14 lg:pl-14">
          <p className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-condensed text-xl font-bold sm:text-2xl">
            {date && (
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={21} aria-hidden /> <span className="tabular-nums">{date}</span>
              </span>
            )}
            {m.lieu && (
              <span className="inline-flex items-center gap-2">
                <MapPin size={21} aria-hidden /> {m.lieu}
              </span>
            )}
          </p>
          <h1
            id="titre-mobilisation"
            className="mt-4 break-words font-condensed text-5xl font-extrabold uppercase leading-[0.86] tracking-tight sm:text-7xl lg:text-[88px]"
          >
            {m.titre}
          </h1>
          {m.chapo && <p className="mt-5 max-w-2xl text-lg font-semibold leading-snug sm:text-xl">{m.chapo}</p>}

          {m.date_evenement && (
            <div className="mt-8 border-t-2 border-white/35 pt-5">
              <CompteARebours date={m.date_evenement} taille="moyen" />
            </div>
          )}

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
            {lien && <BoutonInscription lien={lien} fond="sombre" />}
            {page && (
              <Link
                href={page}
                className="inline-flex min-h-[44px] items-center gap-2 self-start text-lg font-bold underline decoration-white decoration-2 underline-offset-[6px] hover:decoration-militant-rouge focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:self-auto"
              >
                Pourquoi on se mobilise <ArrowRight size={20} aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
