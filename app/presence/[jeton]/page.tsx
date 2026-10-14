import type { Metadata } from "next";
import Image from "next/image";
import { Clock, QrCode } from "lucide-react";
import { dossierParJeton } from "../../../lib/liberations/jour-j-serveur";
import { JETON_QR } from "../../../lib/liberations/jeton-serveur";
import { fenetreQr } from "../../../lib/liberations/jour-j";
import { dateLongue } from "../../../lib/liberations/courriers";
import { STATUTS_QR } from "../../../lib/liberations/statuts";
import { isoToDateFr } from "../../../lib/dates";
import ParcoursPresence from "./ParcoursPresence";

export const metadata: Metadata = { title: "Présence — Centrale Générale FGTB Namur-Luxembourg", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Page du QR code du jour J (publique, sans compte). Elle ne montre que l'objet de la réunion, le nom du lieu et les
 * noms des participants prévus ; jamais d'adresse ni de n° de registre national. Elle ne fait qu'écrire, par le serveur.
 */
export default async function PresencePage({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const dossier = JETON_QR.test(jeton) ? await dossierParJeton(jeton) : null;
  const valable = dossier && STATUTS_QR.includes(dossier.statut);
  const f = valable ? fenetreQr(dossier.dates, new Date()) : null;

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6 text-militant-charbon">
      <Image src="/logo-cg-rouge.png" alt="Centrale Générale FGTB Namur-Luxembourg" width={160} height={56} className="mb-5 h-auto w-40" priority />
      {!valable || !f ? (
        <Message icone={<QrCode size={28} aria-hidden />} titre="Ce QR code n'est plus valable">
          Demande le nouveau QR code au formateur ou à l&apos;animateur.
        </Message>
      ) : !f.ouvert ? (
        <Message icone={<Clock size={28} aria-hidden />} titre="Pas encore, ou plus maintenant">
          Ce QR code est valable de 08h00 à 18h00, les jours de la réunion
          {f.prochaine ? <> (prochain jour : <b>{isoToDateFr(f.prochaine)}</b>)</> : null}.
        </Message>
      ) : (
        <>
          <h1 className="font-condensed text-3xl font-extrabold uppercase leading-tight">{dossier.objet || "Réunion"}</h1>
          <p className="mt-1 text-[#56646F]">
            {dateLongue(f.date.jour).replace(/^./, (c) => c.toUpperCase())}{dossier.lieu ? ` · ${dossier.lieu}` : ""}
          </p>
          <ParcoursPresence jeton={jeton} participants={dossier.participants.map((p) => ({ id: p.id, nom: [p.prenom, p.nom].filter(Boolean).join(" ") }))} />
        </>
      )}
    </main>
  );
}

function Message({ icone, titre, children }: { icone: React.ReactNode; titre: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-[#d5dbe0] p-6 text-center">
      <span className="mx-auto text-militant-bordeaux">{icone}</span>
      <h1 className="font-condensed text-2xl font-extrabold uppercase">{titre}</h1>
      <p>{children}</p>
    </div>
  );
}
