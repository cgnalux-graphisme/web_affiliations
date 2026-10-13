"use client";

import { useRouter } from "next/navigation";
import { CHAMP, LIBELLE } from "../../_partage/ui";

/** Super admin : regarder le tableau de bord d'un permanent (son périmètre et ses fiches). */
export default function VuComme({ permanents, actuel }: { permanents: { nom: string; email: string }[]; actuel: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="vu-comme" className={LIBELLE}>Vu comme</label>
        <select id="vu-comme" className={`${CHAMP} w-auto`} value={actuel}
          onChange={(e) => router.push(e.target.value ? `?permanent=${encodeURIComponent(e.target.value)}` : "?")}>
          <option value="">Moi</option>
          {permanents.map((p) => <option key={p.email} value={p.email}>{p.nom}</option>)}
        </select>
      </div>
    </div>
  );
}
