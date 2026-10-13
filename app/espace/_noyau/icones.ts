import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Building2,
  CircleHelp,
  FileText,
  Flag,
  FolderOpen,
  History,
  IdCard,
  Inbox,
  KeyRound,
  LayoutGrid,
  Lightbulb,
  List,
  MapPin,
  Mail,
  Megaphone,
  MessageCircle,
  Newspaper,
  PenLine,
  Plus,
  Radar,
  Rss,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Upload,
  type LucideIcon,
} from "lucide-react";

/**
 * Icônes de l'Espace CG, désignées par un nom (texte) : site_apps.icone en base, sections des manifestes.
 * Un nom inconnu affiche un point d'interrogation plutôt que de casser la page.
 * Ajouter une icône = l'importer de lucide-react et l'ajouter ici.
 */
export const ICONES: Record<string, LucideIcon> = {
  megaphone: Megaphone,
  radar: Radar,
  inbox: Inbox,
  settings: Settings,
  book: BookOpen,
  key: KeyRound,
  grid: LayoutGrid,
  list: List,
  plus: Plus,
  flag: Flag,
  "file-text": FileText,
  rss: Rss,
  newspaper: Newspaper,
  pen: PenLine,
  lightbulb: Lightbulb,
  upload: Upload,
  tag: Tag,
  folder: FolderOpen,
  message: MessageCircle,
  sliders: SlidersHorizontal,
  mail: Mail,
  shield: ShieldCheck,
  history: History,
  share: Share2,
  building: Building2,
  "id-card": IdCard,
  "map-pin": MapPin,
  clipboard: ClipboardList,
  "calendar-check": CalendarCheck,
};

export function icone(nom: string | null | undefined): LucideIcon {
  return (nom && ICONES[nom]) || CircleHelp;
}
