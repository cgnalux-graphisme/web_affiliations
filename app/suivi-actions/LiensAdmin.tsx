"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/suivi-actions", label: "Toutes les actions" },
  { href: "/suivi-actions/nouvelle", label: "Nouvelle action" },
];

export default function LiensAdmin() {
  const pathname = usePathname();
  return (
    <nav aria-label="Espace admin">
      <ul className="flex items-center gap-1">
        {LIENS.map((l) => {
          const actif = pathname === l.href;
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={actif ? "page" : undefined}
                className={`block border-b-[3px] px-2 py-1 text-[15px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge ${
                  actif ? "border-militant-rouge" : "border-transparent hover:border-militant-ardoise"
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
