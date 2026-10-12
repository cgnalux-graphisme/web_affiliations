import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

/** Écran « pas accès » : affiché par la garde d'une app et par /espace/sans-acces. */
export default function SansAcces({ nomApp }: { nomApp?: string | null }) {
  return (
    <div className="ecg-panneau ecg-vue">
      <div className="ecg-vide">
        <span className="ecg-vide-ico" aria-hidden>
          <Lock size={26} strokeWidth={1.8} />
        </span>
        <h1 className="ecg-vide-titre">Vous n&apos;avez pas accès à cette app</h1>
        <p>
          {nomApp ? <>L&apos;app « {nomApp} » n&apos;est pas ouverte pour votre compte. </> : null}
          Si vous en avez besoin, demandez un accès à un super admin.
        </p>
        <Link href="/espace" className="ecg-btn ecg-btn-principal">
          <ArrowLeft size={18} aria-hidden /> Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
