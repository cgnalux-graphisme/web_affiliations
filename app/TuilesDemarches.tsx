import Link from "next/link";
import { forms, transferJourney } from "./forms";

/**
 * Grille des démarches en ligne : le parcours de transfert mis en avant (bordeaux,
 * trois étapes dans l'ordre), puis une tuile par formulaire.
 */
export default function TuilesDemarches() {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <Link
        href={transferJourney.href}
        className="group flex flex-col justify-between gap-6 rounded-2xl bg-militant-bordeaux p-7 text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 lg:row-span-2"
      >
        <span>
          <span className="block font-condensed text-4xl font-extrabold leading-[0.95]">Changer de syndicat</span>
          <span className="mt-3 block text-[17px] leading-relaxed">{transferJourney.description}</span>
        </span>
        <ol className="flex flex-col gap-2.5 text-[17px] font-semibold">
          <li className="border-t border-white pt-2.5">1. Affiliation</li>
          <li className="border-t border-white pt-2.5">2. Formulaire C1</li>
          <li className="border-t border-white pt-2.5">3. Formulaire C3.2</li>
        </ol>
        <span className="self-start rounded-xl bg-white px-4 py-3 font-bold text-militant-bordeaux transition-colors group-hover:bg-militant-charbon group-hover:text-white">
          {transferJourney.cta}
        </span>
      </Link>
      {forms.map((f) => (
        <Link
          key={f.href}
          href={f.href}
          className="flex flex-col gap-2 rounded-2xl border border-militant-ardoise bg-white p-6 transition-shadow hover:border-militant-bordeaux hover:shadow-[inset_0_0_0_1px_#AA0F33] focus:outline-none focus-visible:ring-4 focus-visible:ring-militant-rouge"
        >
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
