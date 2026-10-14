"use client";

import { Printer } from "lucide-react";
import { BTN_PRINCIPAL } from "../../../_partage/ui";

export default function BoutonImprimer() {
  return (
    <button type="button" className={BTN_PRINCIPAL} onClick={() => window.print()}>
      <Printer size={16} aria-hidden /> Imprimer
    </button>
  );
}
