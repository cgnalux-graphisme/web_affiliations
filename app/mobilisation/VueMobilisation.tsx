import Image from "next/image";
import { CalendarDays, Clock, ExternalLink, MapPin, Share2 } from "lucide-react";
import { lignes } from "../../lib/articles";
import {
  aUneHeure,
  cheminMobilisation,
  dateMobilisation,
  depuisHorodatage,
  ligneInfo,
  lienValide,
  paragraphes,
  type MobilisationPublique,
} from "../../lib/mobilisations";
import BoutonsPartage from "./BoutonsPartage";
import CompteARebours from "./CompteARebours";

/** Bouton « Je m'inscris » : formulaire de la FGTB fédérale, nouvel onglet. */
export function BoutonInscription({
  lien,
  fond = "clair",
  grand = false,
  className = "",
}: {
  lien: string;
  fond?: "clair" | "sombre";
  grand?: boolean;
  className?: string;
}) {
  const couleurs =
    fond === "sombre"
      ? "bg-white text-militant-bordeaux hover:bg-militant-charbon hover:text-white focus-visible:ring-white focus-visible:ring-offset-militant-bordeaux"
      : "bg-militant-bordeaux text-white hover:bg-militant-charbon focus-visible:ring-militant-rouge";
  return (
    <a
      href={lien}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2.5 rounded-xl font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        grand ? "min-h-[60px] px-8 text-xl" : "min-h-[52px] px-6 text-[17px]"
      } ${couleurs} ${className}`}
    >
      Je m&apos;inscris
      <ExternalLink size={grand ? 20 : 18} aria-hidden />
      <span className="sr-only"> (formulaire de la FGTB, nouvel onglet)</span>
    </a>
  );
}

/**
 * Page campagne d'une mobilisation (site public et aperçu de l'espace admin).
 * En-tête choc sur aplat bordeaux, compte à rebours, pourquoi, revendications, infos pratiques,
 * inscription répétée et partage par le visiteur.
 */
export default function VueMobilisation({ m, apercu = false }: { m: MobilisationPublique; apercu?: boolean }) {
  const lien = lienValide(m.lien_inscription) ? m.lien_inscription : null;
  const pourquoi = paragraphes(m.pourquoi);
  const revendications = lignes(m.revendications);
  const infos = lignes(m.infos_pratiques).map(ligneInfo);
  const date = dateMobilisation(m.date_evenement, false);
  const [hh, mm] = depuisHorodatage(m.date_evenement).heure.split(":");
  const heure = aUneHeure(m.date_evenement) ? `${Number(hh)} h ${mm}` : null;
  const chemin = m.slug ? cheminMobilisation(m.slug) : "/";
  const textePartage = [date, m.lieu].filter(Boolean).join(", ") || m.chapo || "";

  return (
    <main className={`bg-white font-barlow text-militant-charbon ${lien && !apercu ? "pb-24 lg:pb-0" : ""}`}>
      {/* ── En-tête ── */}
      <section className="relative overflow-hidden bg-militant-bordeaux text-white">
        <div aria-hidden className="absolute inset-y-0 left-0 w-2 bg-militant-rouge sm:w-3" />
        <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-14 pt-8 sm:px-8 sm:pb-20 sm:pt-12 lg:grid-cols-12 lg:gap-12 lg:px-10 lg:pt-16">
          <div className={`campagne-entree flex flex-col ${m.image_hero ? "lg:col-span-7" : "lg:col-span-12"}`}>
            <p className="flex flex-wrap items-center gap-x-5 gap-y-2 font-condensed text-2xl font-bold sm:text-3xl">
              {date && (
                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={24} aria-hidden /> <span className="tabular-nums">{date}</span>
                </span>
              )}
              {m.lieu && (
                <span className="inline-flex items-center gap-2">
                  <MapPin size={24} aria-hidden /> {m.lieu}
                </span>
              )}
            </p>
            <h1 className="mt-5 break-words font-condensed text-[52px] font-extrabold uppercase leading-[0.86] tracking-tight sm:text-7xl lg:text-[104px]">
              {m.titre}
            </h1>
            {m.chapo && <p className="mt-6 max-w-2xl text-xl font-semibold leading-snug sm:text-2xl">{m.chapo}</p>}

            {m.date_evenement && (
              <div className="mt-9 border-t-2 border-white/35 pt-6">
                <CompteARebours date={m.date_evenement} />
              </div>
            )}

            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              {lien && <BoutonInscription lien={lien} fond="sombre" grand />}
              <a
                href="#partager"
                className="inline-flex min-h-[44px] items-center gap-2 self-start text-lg font-bold underline decoration-white decoration-2 underline-offset-[6px] hover:decoration-militant-rouge focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:self-auto"
              >
                <Share2 size={20} aria-hidden /> Faire passer le mot
              </a>
            </div>
          </div>

          {m.image_hero && (
            <div className="-order-1 flex justify-center lg:order-none lg:col-span-5 lg:items-center">
              {/* Image entière à sa proportion naturelle ; l'aplat rouge décalé suit sa taille : effet affiche. */}
              <div className="relative mb-3 mr-3 w-fit max-w-full sm:mb-4 sm:mr-4">
                <div aria-hidden className="absolute -bottom-3 -right-3 left-6 top-6 rounded-2xl bg-militant-rouge sm:-bottom-4 sm:-right-4" />
                <Image
                  src={m.image_hero}
                  alt=""
                  width={1200}
                  height={1200}
                  priority
                  sizes="(min-width: 1024px) 480px, 100vw"
                  className="relative block h-auto max-h-[70vh] w-auto max-w-full rounded-2xl lg:max-h-[85vh]"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        {/* ── Pourquoi ── */}
        {pourquoi.length > 0 && (
          <section aria-labelledby="titre-pourquoi" className="mx-auto max-w-3xl pt-16 sm:pt-24">
            <TitreSection id="titre-pourquoi">Pourquoi on se mobilise</TitreSection>
            <div className="mt-8 space-y-5">
              {pourquoi.map((p, i) => (
                <p
                  key={i}
                  className={i === 0 ? "text-2xl font-bold leading-snug sm:text-[28px]" : "text-lg leading-relaxed sm:text-xl"}
                >
                  {p}
                </p>
              ))}
            </div>
            {lien && (
              <div className="mt-10 flex flex-col gap-4 border-l-[6px] border-militant-rouge py-2 pl-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-condensed text-3xl font-extrabold leading-none">Vous en êtes ?</p>
                <BoutonInscription lien={lien} />
              </div>
            )}
          </section>
        )}

        {/* ── Revendications ── */}
        {revendications.length > 0 && (
          <section aria-labelledby="titre-demandes" className="mx-auto max-w-5xl pt-16 sm:pt-24">
            <TitreSection id="titre-demandes">Ce qu&apos;on demande</TitreSection>
            <ul className="mt-4">
              {revendications.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-4 border-b border-militant-ardoise py-5 last:border-b-0 sm:gap-6 sm:py-6"
                >
                  <span aria-hidden className="mt-2 h-4 w-4 shrink-0 bg-militant-rouge sm:mt-3 sm:h-5 sm:w-5" />
                  <span className="min-w-0 break-words font-condensed text-3xl font-extrabold leading-[1.02] sm:text-[44px]">
                    {r}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Comment y aller ── */}
        {(date || heure || m.lieu || infos.length > 0) && (
        <section aria-labelledby="titre-infos" className="mx-auto max-w-5xl pt-16 sm:pt-24">
          <TitreSection id="titre-infos">Comment y aller</TitreSection>
          <dl className="mt-8 grid gap-4 sm:grid-cols-3">
            {date && <Repere icone={<CalendarDays size={22} aria-hidden />} libelle="Date" valeur={date} />}
            {heure && <Repere icone={<Clock size={22} aria-hidden />} libelle="Heure" valeur={heure} />}
            {m.lieu && <Repere icone={<MapPin size={22} aria-hidden />} libelle="Lieu" valeur={m.lieu} />}
          </dl>
          {infos.length > 0 && (
            <ul className="mt-6 divide-y divide-militant-ardoise border-y border-militant-ardoise">
              {infos.map((info, i) => (
                <li key={i} className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
                  {info.libelle && <span className="shrink-0 text-lg font-bold sm:w-48">{info.libelle}</span>}
                  <span className="text-lg leading-relaxed">{info.texte}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        )}
      </div>

      {/* ── Appel final + partage ── */}
      <section
        id="partager"
        aria-labelledby="titre-final"
        className="mx-auto mb-16 mt-16 max-w-7xl scroll-mt-6 px-5 sm:mb-24 sm:mt-24 sm:px-8 lg:px-10"
      >
        <div className="relative overflow-hidden rounded-2xl bg-militant-bordeaux px-6 py-10 text-white sm:px-12 sm:py-14">
          <div aria-hidden className="absolute inset-y-0 left-0 w-3 bg-militant-rouge" />
          <h2 id="titre-final" className="font-condensed text-5xl font-extrabold uppercase leading-[0.9] sm:text-7xl">
            On compte sur vous.
          </h2>
          <p className="mt-4 max-w-2xl text-xl font-semibold leading-snug">
            Inscrivez-vous, puis faites passer le mot à vos collègues : chaque personne en plus compte.
          </p>
          {lien && <BoutonInscription lien={lien} fond="sombre" grand className="mt-8" />}
          <div className="mt-10 border-t-2 border-white/35 pt-6">
            <p className="mb-4 text-lg font-bold">Partager sur vos réseaux</p>
            <BoutonsPartage chemin={chemin} titre={m.titre} texte={textePartage} fond="sombre" />
          </div>
        </div>
      </section>

      {/* ── Mobile : inscription toujours à portée de pouce ── */}
      {lien && !apercu && (
        <div className="barre-inscription-mobile fixed inset-x-0 bottom-0 z-30 border-t-4 border-militant-rouge bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 lg:hidden">
          <BoutonInscription lien={lien} className="w-full" />
        </div>
      )}
    </main>
  );
}

function TitreSection({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="border-b-[6px] border-militant-charbon pb-2.5 font-condensed text-4xl font-extrabold uppercase leading-none sm:text-6xl"
    >
      {children}
    </h2>
  );
}

function Repere({ icone, libelle, valeur }: { icone: React.ReactNode; libelle: string; valeur: string }) {
  return (
    <div className="rounded-2xl border border-militant-ardoise p-5">
      <dt className="flex items-center gap-2 text-[15px] font-bold">
        <span className="text-militant-rouge">{icone}</span> {libelle}
      </dt>
      <dd className="mt-2 break-words font-condensed text-3xl font-extrabold leading-tight tabular-nums">{valeur}</dd>
    </div>
  );
}
