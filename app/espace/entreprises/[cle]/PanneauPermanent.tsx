import { Mail, MessageCircle, UserRound } from "lucide-react";
import { formaterTelephone } from "../../../../lib/telephone";
import type { Fiche } from "../../../../lib/entreprises/donnees-serveur";
import { Panneau } from "../../_partage/ui";

/** Permanent de l'entreprise, lu en direct dans CG Link (lecture seule : il se change dans CG Link). */
export default function PanneauPermanent({ fiche, estMoi }: { fiche: Fiche; estMoi: boolean }) {
  const c = fiche.company;
  if (!c) return null;
  const nom = c.permanent_name?.trim();
  const email = c.permanent_email?.trim();
  const whatsapp = c.permanent_whatsapp?.trim();
  const chiffresWa = whatsapp ? formaterTelephone(whatsapp).replace(/\(0\)/g, "").replace(/\D/g, "") : "";

  return (
    <Panneau id="permanent" titre="Permanent" sousTitre="Lu dans CG Link, où il se modifie.">
      {nom || email ? (
        <div className="grid gap-2">
          <p className="flex items-center gap-3">
            <span className="ecg-stat-ico bg-[var(--app-pale)]" aria-hidden><UserRound size={18} /></span>
            <b>{nom ?? email}</b>
            {estMoi && <span className="ecg-puce">Vous</span>}
          </p>
          {email && (
            <a className="ecg-lien inline-flex items-center gap-1 text-sm" href={`mailto:${email}`}>
              <Mail size={15} aria-hidden /> {email}
            </a>
          )}
          {whatsapp && (
            <a className="ecg-lien inline-flex items-center gap-1 text-sm" href={chiffresWa ? `https://wa.me/${chiffresWa}` : undefined} target="_blank" rel="noreferrer">
              <MessageCircle size={15} aria-hidden /> WhatsApp {formaterTelephone(whatsapp)}
              <span className="sr-only">(ouvre WhatsApp dans un nouvel onglet)</span>
            </a>
          )}
        </div>
      ) : (
        <p className="ecg-texte-doux">Aucun permanent indiqué dans CG Link.</p>
      )}
    </Panneau>
  );
}
