import { CreditCard, FileSignature, ClipboardList } from "lucide-react";

export const forms = [
  {
    title: "Affiliation",
    shortTitle: "Affiliation",
    category: "Adhesion",
    description: "Nouvelle demande d'affiliation.",
    href: "/affiliation",
    cta: "Ouvrir le formulaire",
    Icon: FileSignature,
  },
  {
    title: "Mandat SEPA (nouveau ou changement de compte)",
    shortTitle: "Mandat SEPA",
    category: "Paiement",
    description: "Creer un nouveau mandat ou signaler un changement de compte bancaire.",
    href: "/mandat-sepa",
    cta: "Acceder au formulaire",
    Icon: CreditCard,
  },
  {
    title: "Formulaire C1 — Déclaration de situation",
    shortTitle: "Formulaire C1",
    category: "ONEM",
    description: "Déclaration de la situation personnelle et familiale (formulaire officiel ONEM).",
    href: "/formulaire-c1",
    cta: "Remplir le formulaire",
    Icon: ClipboardList,
  },
] as const;
