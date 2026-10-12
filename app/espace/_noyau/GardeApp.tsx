import { aApp } from "../../../lib/espace/acces";
import { appParCode } from "./registre";
import SansAcces from "./SansAcces";

/**
 * Garde serveur d'une app (posée dans app/espace/<code>/layout.tsx) : site_a_app('<code>') doit être vrai,
 * sinon l'écran « pas accès ». Les pages, actions serveur et routes API de l'app revérifient de leur côté.
 */
export default async function GardeApp({ code, children }: { code: string; children: React.ReactNode }) {
  if (await aApp(code)) return <>{children}</>;
  const app = await appParCode(code);
  return <SansAcces nomApp={app?.nom} />;
}
