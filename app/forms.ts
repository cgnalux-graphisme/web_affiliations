import { ArrowLeftRight, CreditCard, FileSignature, ClipboardList, FileText } from "lucide-react";

export const transferJourney = {
  title: "Parcours de transfert syndical",
  shortTitle: "Transfert",
  category: "Parcours guidé",
  description:
    "Rejoignez la FGTB en complétant les 3 formulaires dans l'ordre : affiliation, C1 et C3.2.",
  href: "/parcours-transfert",
  cta: "Démarrer le parcours",
  Icon: ArrowLeftRight,
} as const;

export const forms = [
  {
    title: "Affiliation",
    shortTitle: "Affiliation",
    category: "Adhesion",
    description: "Nouvelle demande d'affiliation.",
    href: "/affiliation",
    cta: "Remplir le formulaire",
    Icon: FileSignature,
  },
  {
    title: "Mandat SEPA (nouveau ou changement de compte)",
    shortTitle: "Mandat SEPA",
    category: "Paiement",
    description: "Creer un nouveau mandat ou signaler un changement de compte bancaire.",
    href: "/mandat-sepa",
    cta: "Remplir le formulaire",
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
  {
    title: "Formulaire C3.2 — Chômage temporaire",
    shortTitle: "Formulaire C3.2",
    category: "ONEM",
    description: "Demande d'allocations de chômage temporaire (formulaire officiel ONEM).",
    href: "/formulaire-c3-2",
    cta: "Remplir le formulaire",
    Icon: FileText,
  },
] as const;
