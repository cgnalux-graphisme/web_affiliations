import Link from "next/link";
import { forms, transferJourney } from "./forms";

const TUILE =
  "flex flex-col gap-2 rounded-2xl border border-militant-ardoise bg-white p-6 transition-shadow hover:border-militant-bordeaux hover:shadow-[inset_0_0_0_1px_#AA0F33] focus:outline-none focus-visible:ring-4 focus-visible:ring-militant-rouge";

/**
 * Grille des démarches en ligne. L'affiliation est la démarche principale : grande
 * tuile bordeaux (2 × 2 sur grand écran). Les 5 autres complètent une grille 3 × 3.
 */
export default function TuilesDemarches() {
  const affiliation = forms.find((f) => f.href === "/affiliation")!;
  const autres = forms.filter((f) => f.href !== "/affiliation");

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <div className="flex flex-col justify-between gap-8 rounded-2xl bg-militant-bordeaux p-8 text-white md:col-span-2 lg:row-span-2 lg:p-10">
        <div>
          <h3 className="font-condensed text-5xl font-extrabold uppercase leading-[0.9] sm:text-6xl">S&apos;affilier à la FGTB</h3>
          <div className="my-5 h-1.5 w-16 bg-white" aria-hidden />
          <p className="max-w-xl text-lg leading-relaxed">
            Rejoignez la Centrale Générale FGTB Namur-Luxembourg. La demande se fait entièrement en ligne, en quelques
            minutes : identité, situation professionnelle, cotisation et signature.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link
            href={affiliation.href}
            className="rounded-xl bg-white px-6 py-4 text-center text-[17px] font-bold text-militant-bordeaux transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-white"
          >
            Remplir le formulaire d&apos;affiliation
          </Link>
          <Link
            href={transferJourney.href}
            className="font-semibold underline decoration-white decoration-2 underline-offset-4 hover:decoration-militant-rouge"
          >
            Vous venez d&apos;un autre syndicat ?
          </Link>
        </div>
      </div>

      <Link href={transferJourney.href} className={TUILE}>
        <span className="font-condensed text-3xl font-extrabold leading-none">Changer de syndicat</span>
        <span className="text-base leading-relaxed">Parcours guidé en 3 étapes : affiliation, C1 et C3.2, dans l&apos;ordre.</span>
        <span className="mt-auto pt-2 font-bold underline decoration-militant-rouge decoration-2 underline-offset-4">
          {transferJourney.cta}
        </span>
      </Link>

      {autres.map((f) => (
        <Link key={f.href} href={f.href} className={TUILE}>
          <span className="font-condensed text-3xl font-extrabold leading-none">{f.shortTitle}</span>
          <span className="text-base leading-relaxed">{f.description}</span>
          <span className="mt-auto pt-2 font-bold underline decoration-militant-rouge decoration-2 underline-offset-4">
            {f.cta}
          </span>
        </Link>
      ))}
    </div>
  );
}
