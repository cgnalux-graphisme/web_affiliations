"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/suivi-actions", label: "Toutes les actions" },
  { href: "/suivi-actions/nouvelle", label: "Nouvelle action" },
  { href: "/suivi-actions/rapport", label: "Rapport d'activité" },
];

export default function LiensAdmin() {
  const pathname = usePathname();
  return (
    <nav aria-label="Espace admin">
      <ul className="flex flex-wrap items-center gap-1 lg:flex-col lg:items-stretch lg:gap-0.5">
        {LIENS.map((l) => {
          const actif = pathname === l.href;
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={actif ? "page" : undefined}
                className={`block border-b-[3px] px-2 py-1.5 text-[15px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge lg:border-b-0 lg:border-l-4 lg:px-6 lg:py-2.5 ${
                  actif ? "border-militant-rouge font-bold" : "border-transparent hover:border-militant-ardoise"
                }`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
