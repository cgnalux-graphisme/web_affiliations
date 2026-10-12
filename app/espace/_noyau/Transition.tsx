"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/**
 * Transition fluide à l'ouverture d'une app (et au retour au tableau de bord), avec l'API View Transitions
 * quand le navigateur la connaît. Sans elle, ou en mouvement réduit, la navigation reste instantanée.
 * Le navigateur fige l'ancienne vue, Next.js change de page, puis la nouvelle vue entre (espace.css,
 * « Transitions de vue »). Délai maximum : 1,2 s, pour ne jamais bloquer l'écran.
 */

type Naviguer = (href: string) => void;
const Contexte = createContext<Naviguer | null>(null);

type DocumentAvecTransition = Document & {
  startViewTransition?: (rappel: () => Promise<void>) => unknown;
};

function transitionsPossibles(): boolean {
  if (typeof document === "undefined") return false;
  if (!(document as DocumentAvecTransition).startViewTransition) return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function FournisseurTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const chemin = usePathname();
  const attente = useRef<(() => void) | null>(null);

  // La nouvelle page est affichée : la transition peut jouer.
  useEffect(() => {
    attente.current?.();
    attente.current = null;
  }, [chemin]);

  const naviguer = useCallback<Naviguer>(
    (href) => {
      const doc = document as DocumentAvecTransition;
      if (!transitionsPossibles() || !doc.startViewTransition) return router.push(href);
      doc.startViewTransition(
        () =>
          new Promise<void>((fin) => {
            attente.current = fin;
            router.push(href);
            setTimeout(fin, 1200);
          })
      );
    },
    [router]
  );

  return <Contexte.Provider value={naviguer}>{children}</Contexte.Provider>;
}

/** Lien qui ouvre une app avec la transition (Ctrl / Cmd / clic du milieu gardent leur comportement). */
export function LienTransition({
  href,
  onClick,
  ...props
}: React.ComponentProps<typeof Link> & { href: string }) {
  const naviguer = useContext(Contexte);
  return (
    <Link
      href={href}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (!naviguer || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (!transitionsPossibles()) return;
        e.preventDefault();
        naviguer(href);
      }}
    />
  );
}
