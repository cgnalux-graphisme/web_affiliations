import Link from "next/link";

/** Pied de page commun : fond blanc, filet rouge, logo rouge. */
export default function PiedDePage() {
  return (
    <footer className="mt-auto border-t-4 border-militant-rouge bg-white font-barlow text-militant-charbon">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo PNG statique */}
        <img src="/logo-cg-rouge.png" width={1772} height={490} alt="Centrale Générale FGTB Namur-Luxembourg" className="h-11 w-auto self-start" />
        <nav aria-label="Pied de page">
          <ul className="flex flex-wrap gap-x-7 gap-y-2 text-[15px] font-semibold">
            <li>
              <Link href="/actualites" className="hover:text-militant-bordeaux">Actualités</Link>
            </li>
            <li>
              <Link href="/actions" className="hover:text-militant-bordeaux">Nos actions</Link>
            </li>
            <li>
              <Link href="/demarches" className="hover:text-militant-bordeaux">Démarches en ligne</Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-militant-bordeaux">Contact</Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-militant-bordeaux">Espace admin</Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
