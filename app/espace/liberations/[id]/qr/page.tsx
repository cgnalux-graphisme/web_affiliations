import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { origineSite } from "../../../../../lib/liberations/origine-serveur";
import QRCode from "qrcode";
import { ArrowLeft } from "lucide-react";
import { exigerLiberations } from "../../../../../lib/liberations/donnees-serveur";
import { getSupabaseService } from "../../../../../lib/supabase-service";
import { isoToDateFr } from "../../../../../lib/dates";
import { STATUTS_QR } from "../../../../../lib/liberations/statuts";
import { Alerte, BTN, EnteteEcran, Panneau } from "../../../_partage/ui";
import BoutonQr from "../jour-j/BoutonQr";
import BoutonImprimer from "../jour-j/BoutonImprimer";

export const metadata: Metadata = { title: "QR code de présence — Espace CG", robots: { index: false, follow: false } };

/** Le QR code du dossier, en grand, à afficher ou imprimer pendant la réunion. Admin ou permanent demandeur. */
export default async function QrPage({ params }: { params: Promise<{ id: string }> }) {
  const c = await exigerLiberations();
  const { id } = await params;
  const db = getSupabaseService();
  if (!db || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: d } = await db.from("site_liberations").select("id, numero, objet, lieu_nom, statut, demandeur_id, qr_jeton").eq("id", id).maybeSingle();
  if (!d || !(c.admin || d.demandeur_id === c.user.id)) notFound();
  const { data: dates } = await db.from("site_liberation_dates").select("jour").eq("liberation_id", id).order("jour");
  const lien = d.qr_jeton ? `${await origineSite()}/presence/${d.qr_jeton}` : null;
  const svg = lien ? await QRCode.toString(lien, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#222222", light: "#FFFFFF" } }) : null;
  const actif = STATUTS_QR.includes(d.statut);

  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <div className="print:hidden">
        <EnteteEcran icone="calendar-check" titre="QR code de présence" description={`Dossier n° ${d.numero} · ${d.objet ?? ""}`}
          actions={<Link href={`/espace/liberations/${id}`} className={BTN}><ArrowLeft size={18} aria-hidden /> Retour au dossier</Link>} />
      </div>
      {!actif && <Alerte ton="attention">Le QR code ne fonctionne qu&apos;entre la prise en charge du dossier et le jour J.</Alerte>}
      {svg && lien ? (
        <Panneau>
          <div className="grid justify-items-center gap-4 text-center">
            <h1 className="font-condensed text-3xl font-extrabold uppercase">{d.objet}</h1>
            <p className="text-lg">Scanne ce code avec l&apos;appareil photo de ton téléphone pour signer ta présence.</p>
            {/* SVG fabriqué ici par la bibliothèque qrcode à partir de notre propre lien. */}
            <div className="w-full max-w-[420px]" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="ecg-texte-doux text-sm">
              Valable de 08h00 à 18h00 les {((dates ?? []) as { jour: string }[]).map((x) => isoToDateFr(x.jour)).join(", ")}
              {d.lieu_nom ? ` · ${d.lieu_nom}` : ""}
            </p>
            <p className="ecg-texte-doux break-all text-xs print:hidden">{lien}</p>
            <div className="flex flex-wrap justify-center gap-2 print:hidden">
              <BoutonImprimer />
              {actif && <BoutonQr dossierId={id} existe />}
            </div>
          </div>
        </Panneau>
      ) : (
        <Panneau titre="Pas encore de QR code">
          <div className="grid gap-3">
            <p>Créez le QR code, puis affichez-le ou imprimez-le pour le formateur ou l&apos;animateur.</p>
            {actif && <div><BoutonQr dossierId={id} existe={false} /></div>}
          </div>
        </Panneau>
      )}
    </div>
  );
}
