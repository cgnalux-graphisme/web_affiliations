import type { Metadata } from "next";
import ParcoursTransfert from "../../ParcoursTransfert";

export const metadata: Metadata = {
  title: "Parcours de transfert syndical — Centrale Générale FGTB Namur-Luxembourg",
  description: "Vous venez d'un autre syndicat ? Un parcours guidé en trois étapes, dans l'ordre.",
};

export default function ParcoursTransfertPage() {
  return (
    <div className="formulaire">
      <ParcoursTransfert />
    </div>
  );
}
