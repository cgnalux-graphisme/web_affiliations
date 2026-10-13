"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MapPin } from "lucide-react";
import { suggestionsPhoton, urlPhoton, type PhotonSuggestion } from "../../../lib/adresse-photon";
import { IconeChargement } from "../../Chargement";
import { CHAMP } from "./ui";

/**
 * Champ « Rue » avec autocomplétion d'adresses belges (Photon, comme le formulaire d'affiliation) :
 * 3 caractères minimum, 350 ms après la dernière frappe. Choisir une suggestion remplit aussi le numéro, le
 * code postal et la localité (onSelect). Clavier : flèches, Entrée, Échap. Sans réseau : simple champ texte.
 */
export default function AutocompleteRue({
  id,
  value,
  onChange,
  onSelect,
  actif = true,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: PhotonSuggestion) => void;
  /** false : pays autre que la Belgique, pas de suggestions. */
  actif?: boolean;
  describedBy?: string;
}) {
  const [suggestions, setSuggestions] = useState<PhotonSuggestion[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [actifIndex, setActifIndex] = useState(-1);
  const [chargement, setChargement] = useState(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cadre = useRef<HTMLDivElement>(null);
  const idListe = `${id}-suggestions`;

  useEffect(() => {
    function dehors(e: MouseEvent) {
      if (cadre.current && !cadre.current.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", dehors);
    return () => {
      document.removeEventListener("mousedown", dehors);
      if (minuterie.current) clearTimeout(minuterie.current);
    };
  }, []);

  function saisir(v: string) {
    onChange(v);
    if (minuterie.current) clearTimeout(minuterie.current);
    if (!actif || v.trim().length < 3) {
      setSuggestions([]);
      setOuvert(false);
      return;
    }
    minuterie.current = setTimeout(async () => {
      setChargement(true);
      try {
        const liste = suggestionsPhoton(await (await fetch(urlPhoton(v))).json());
        setSuggestions(liste);
        setOuvert(liste.length > 0);
        setActifIndex(-1);
      } catch {
        setSuggestions([]);
        setOuvert(false);
      } finally {
        setChargement(false);
      }
    }, 350);
  }

  function choisir(s: PhotonSuggestion) {
    onChange(s.street);
    onSelect(s);
    setSuggestions([]);
    setOuvert(false);
  }

  function touche(e: KeyboardEvent<HTMLInputElement>) {
    if (!ouvert) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActifIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActifIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && actifIndex >= 0) {
      e.preventDefault();
      choisir(suggestions[actifIndex]);
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setOuvert(false);
    }
  }

  return (
    <div ref={cadre} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={ouvert}
        aria-controls={idListe}
        aria-activedescendant={actifIndex >= 0 ? `${idListe}-${actifIndex}` : undefined}
        aria-describedby={describedBy}
        value={value}
        onChange={(e) => saisir(e.target.value)}
        onKeyDown={touche}
        autoComplete="off"
        placeholder={actif ? "Rue de la Loi…" : undefined}
        className={`${CHAMP} pr-9`}
      />
      {chargement && <IconeChargement size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />}
      {ouvert && suggestions.length > 0 && (
        <ul id={idListe} role="listbox" aria-label="Adresses proposées"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-[var(--ecg-trait)] bg-white text-sm shadow-lg">
          {suggestions.map((s, i) => (
            <li
              key={`${s.display}-${i}`}
              id={`${idListe}-${i}`}
              role="option"
              aria-selected={i === actifIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                choisir(s);
              }}
              onMouseEnter={() => setActifIndex(i)}
              className={`flex min-h-[44px] cursor-pointer items-center gap-2 border-b border-[var(--ecg-trait)] px-3 py-2 last:border-0 ${i === actifIndex ? "bg-[var(--app-pale)]" : ""}`}
            >
              <MapPin size={15} aria-hidden className="shrink-0" />
              {s.display}
            </li>
          ))}
        </ul>
      )}
      <p className="sr-only" aria-live="polite">{ouvert ? `${suggestions.length} adresse(s) proposée(s)` : ""}</p>
    </div>
  );
}
