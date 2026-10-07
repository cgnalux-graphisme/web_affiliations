import { ArrowLeftRight, CreditCard, FileSignature, ClipboardList, FileText, CalendarClock, RefreshCw } from "lucide-react";

export const transferJourney = {
  title: "Parcours de transfert syndical",
  shortTitle: "Transfert",
  category: "Parcours guidé",
  description:
    "Vous venez d'un autre syndicat ? Un parcours guidé en trois étapes, dans l'ordre.",
  href: "/parcours-transfert",
  cta: "Démarrer le parcours",
  Icon: ArrowLeftRight,
} as const;

export const forms = [
  {
    title: "Affiliation",
    shortTitle: "Affiliation",
    category: "Adhésion",
    description: "Nouvelle demande d'affiliation.",
    href: "/affiliation",
    cta: "Remplir le formulaire",
    Icon: FileSignature,
  },
  {
    title: "Mandat SEPA (nouveau ou changement de compte)",
    shortTitle: "Mandat SEPA",
    category: "Paiement",
    description: "Créer un nouveau mandat ou signaler un changement de compte bancaire.",
    href: "/mandat-sepa",
    cta: "Remplir le formulaire",
    Icon: CreditCard,
  },
  {
    title: "Signaler un changement",
    shortTitle: "Signaler un changement",
    category: "Mon dossier",
    description: "Nouvelle adresse, nouvel employeur, régime de travail ou situation professionnelle : prévenez-nous.",
    href: "/changement-situation",
    cta: "Remplir le formulaire",
    Icon: RefreshCw,
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
  {
    title: "Calcul de préavis",
    shortTitle: "Calcul préavis",
    category: "Préavis",
    description: "Calculez la durée de votre préavis et générez votre courrier de démission ou de commun accord.",
    href: "/preavis",
    cta: "Calculer mon préavis",
    Icon: CalendarClock,
  },
] as const;
