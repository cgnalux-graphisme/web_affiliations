"use client";

import { useEffect, useState } from "react";
import { Check, Facebook, Link2, Mail, MessageCircle, Share2 } from "lucide-react";
import { liensPartage, type LienPartage } from "../../lib/mobilisations";

/** Logo X (pas d'icône à jour dans lucide), monochrome comme les autres. */
function IconeX({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2Z" />
    </svg>
  );
}

const ICONES: Record<LienPartage["reseau"], React.ReactNode> = {
  facebook: <Facebook size={18} aria-hidden />,
  whatsapp: <MessageCircle size={18} aria-hidden />,
  x: <IconeX />,
  email: <Mail size={18} aria-hidden />,
};

/**
 * Partage par le VISITEUR sur ses propres réseaux : partage natif du téléphone (si disponible),
 * Facebook, WhatsApp, X, e-mail et copie du lien. Aucune publication depuis les comptes de la centrale.
 */
export default function BoutonsPartage({
  chemin,
  titre,
  texte,
  fond = "clair",
}: {
  chemin: string;
  titre: string;
  texte: string;
  fond?: "clair" | "sombre";
}) {
  const [url, setUrl] = useState("");
  const [natif, setNatif] = useState(false);
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}${chemin}`);
    setNatif(typeof navigator.share === "function");
  }, [chemin]);

  const forme =
    "inline-flex min-h-[44px] items-center gap-2 rounded-full border-2 px-4 text-[15px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const base =
    fond === "sombre"
      ? `${forme} border-white text-white hover:bg-white hover:text-militant-bordeaux focus-visible:ring-white focus-visible:ring-offset-militant-bordeaux`
      : `${forme} border-militant-charbon text-militant-charbon hover:bg-militant-charbon hover:text-white focus-visible:ring-militant-rouge`;
  // Le partage natif (téléphone) est le geste le plus simple : bouton plein.
  const principal =
    fond === "sombre"
      ? `${forme} border-white bg-white text-militant-bordeaux hover:border-militant-charbon hover:bg-militant-charbon hover:text-white focus-visible:ring-white focus-visible:ring-offset-militant-bordeaux`
      : `${forme} border-militant-bordeaux bg-militant-bordeaux text-white hover:border-militant-charbon hover:bg-militant-charbon focus-visible:ring-militant-rouge`;

  async function partagerNatif() {
    try {
      await navigator.share({ title: titre, text: texte, url });
    } catch {
      // Partage annulé par le visiteur : rien à faire.
    }
  }

  async function copier() {
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2500);
    } catch {
      window.prompt("Copiez ce lien :", url);
    }
  }

  const liens = url ? liensPartage(url, titre, texte) : [];

  return (
    <div className="flex flex-wrap gap-2.5">
      {natif && (
        <button
          type="button"
          onClick={partagerNatif}
          className={principal}
        >
          <Share2 size={18} aria-hidden /> Partager
        </button>
      )}
      {liens.map((l) => (
        <a
          key={l.reseau}
          href={l.href}
          target={l.reseau === "email" ? undefined : "_blank"}
          rel="noopener noreferrer"
          className={base}
        >
          {ICONES[l.reseau]}
          {l.label}
          {l.reseau !== "email" && <span className="sr-only"> (nouvel onglet)</span>}
        </a>
      ))}
      <button type="button" onClick={copier} disabled={!url} className={base} aria-live="polite">
        {copie ? <Check size={18} aria-hidden /> : <Link2 size={18} aria-hidden />}
        {copie ? "Lien copié" : "Copier le lien"}
      </button>
    </div>
  );
}
