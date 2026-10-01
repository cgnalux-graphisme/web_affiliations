"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle, FileDown, Mail, Send } from "lucide-react";
import { IconeChargement } from "./app/Chargement";
import type { RefDemande } from "./lib/envois";
import { postJson } from "./lib/post-json";
import {
  PROVINCES_BELGIQUE,
  peutEnvoyerAuServiceChomage,
} from "./lib/provinces-service-chomage";
import { downloadPdfFromBase64 } from "./lib/transfer-journey";

export interface DocumentLivraison {
  label: string;
  fileName: string;
  pdfBase64: string;
  /** Demande d'où vient le document : l'envoi apparaît dans son historique (back-office). */
  demande?: RefDemande;
}

interface LivraisonFormulairesProps {
  titre: string;
  description: string;
  nom: string;
  prenom: string;
  emailDeclarant: string;
  documents: DocumentLivraison[];
  /** Phrase courte sous le bouton du service chômage. */
  texteServiceChomage: string;
  accent?: "blue" | "red";
  serviceChomageDejaEnvoye?: boolean;
  /** Doit appeler l'envoi déjà en place (service chômage). */
  onEnvoyerServiceChomage: () => Promise<void>;
}

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LivraisonFormulaires({
  titre,
  description,
  nom,
  prenom,
  emailDeclarant,
  documents,
  texteServiceChomage,
  accent = "blue",
  serviceChomageDejaEnvoye = false,
  onEnvoyerServiceChomage,
}: LivraisonFormulairesProps) {
  const [province, setProvince] = useState("");
  const [emailDestinataire, setEmailDestinataire] = useState("");
  const [emailErreur, setEmailErreur] = useState("");
  const [messageErreur, setMessageErreur] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState<"chomage" | "email" | null>(null);
  const [chomageEnvoye, setChomageEnvoye] = useState(serviceChomageDejaEnvoye);
  const [emailEnvoye, setEmailEnvoye] = useState("");

  const serviceAutorise = peutEnvoyerAuServiceChomage(province);
  const envoiDejaFait = chomageEnvoye || emailEnvoye.length > 0;
  // Boutons : même bouton bordeaux que tous les formulaires (form-btn-principal), quel que soit `accent`.

  function telechargerTout() {
    documents.forEach((document, index) => {
      window.setTimeout(() => {
        downloadPdfFromBase64(document.pdfBase64, document.fileName);
      }, index * 400);
    });
  }

  async function envoyerAuServiceChomage() {
    if (!serviceAutorise || envoiDejaFait || envoiEnCours) return;
    setMessageErreur("");
    setEnvoiEnCours("chomage");
    try {
      await onEnvoyerServiceChomage();
      setChomageEnvoye(true);
    } catch (err) {
      console.error(err);
      setMessageErreur("L'envoi au service chômage n'a pas fonctionné. Réessayez.");
    } finally {
      setEnvoiEnCours(null);
    }
  }

  async function envoyerParEmail(event: FormEvent) {
    event.preventDefault();
    if (envoiDejaFait || envoiEnCours) return;

    const destinataire = emailDestinataire.trim().toLowerCase();
    if (!EMAIL_VALIDE.test(destinataire)) {
      setEmailErreur("Indiquez une adresse e-mail valable.");
      return;
    }

    setEmailErreur("");
    setMessageErreur("");
    setEnvoiEnCours("email");
    try {
      await postJson("/api/send-formulaires-email", {
        nom,
        prenom,
        to: destinataire,
        emailDeclarant,
        documents,
      });
      setEmailEnvoye(destinataire);
    } catch (err) {
      console.error(err);
      setMessageErreur("L'envoi vers cette adresse n'a pas fonctionné. Réessayez.");
    } finally {
      setEnvoiEnCours(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="form-carte etape-entree">
        <CheckCircle className="mx-auto mb-4 text-militant-bordeaux" size={56} strokeWidth={2.2} />
        <h2 className="mb-2 text-center font-condensed text-3xl font-extrabold uppercase leading-tight">{titre}</h2>
        <p className="mb-6 text-center text-[16px]">{description}</p>

        <label className="mb-6 block text-left">
          <span className="form-libelle mb-1.5 block">Votre province</span>
          <select
            value={province}
            onChange={(event) => setProvince(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Choisissez votre province</option>
            {PROVINCES_BELGIQUE.map((nomProvince) => (
              <option key={nomProvince} value={nomProvince}>
                {nomProvince}
              </option>
            ))}
          </select>
          <span className="form-aide mt-1.5 block">
            L&apos;envoi automatique au service chômage est réservé aux provinces de Namur et du Luxembourg.
          </span>
        </label>

        <div className="space-y-4 text-left">
          <section className="rounded-2xl border border-militant-ardoise p-5">
            <h3 className="mb-1 font-condensed text-xl font-bold uppercase leading-tight">Télécharger les PDF</h3>
            <p className="form-aide mb-3">
              Les fichiers restent sur votre appareil.
            </p>
            <div className="space-y-2">
              {documents.map((document) => (
                <button
                  key={document.fileName}
                  type="button"
                  onClick={() => downloadPdfFromBase64(document.pdfBase64, document.fileName)}
                  className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-xl border-2 border-militant-ardoise/60 bg-white px-4 py-3 text-left text-[15px] hover:border-militant-charbon"
                >
                  <span>
                    <span className="block font-bold">{document.label}</span>
                    <span className="block text-[13px]">{document.fileName}</span>
                  </span>
                  <FileDown className="h-4 w-4 shrink-0 text-gray-700" />
                </button>
              ))}
            </div>
            {documents.length > 1 && (
              <button
                type="button"
                onClick={telechargerTout}
                className="form-btn-principal mt-3"
              >
                <FileDown size={16} />
                Tout télécharger
              </button>
            )}
          </section>

          <section className="rounded-2xl border border-militant-ardoise p-5">
            <h3 className="mb-1 font-condensed text-xl font-bold uppercase leading-tight">Envoyer au service chômage</h3>
            {chomageEnvoye ? (
              <p className="text-[15px] font-semibold text-militant-bordeaux">Les formulaires ont été envoyés au service chômage.</p>
            ) : emailEnvoye ? (
              <p className="text-[15px]">Vous avez choisi l&apos;envoi vers une adresse e-mail.</p>
            ) : (
              <>
                <p className="form-aide mb-3">
                  {!province
                    ? "Choisissez d'abord votre province."
                    : serviceAutorise
                      ? texteServiceChomage
                      : "Pour votre province, cet envoi automatique n'est pas disponible."}
                </p>
                <button
                  type="button"
                  onClick={envoyerAuServiceChomage}
                  disabled={!serviceAutorise || envoiDejaFait || envoiEnCours !== null}
                  className="form-btn-principal"
                >
                  {envoiEnCours === "chomage" ? <IconeChargement size={16} /> : <Send size={16} />}
                  {envoiEnCours === "chomage" ? "Envoi en cours…" : "Envoyer au service chômage"}
                </button>
              </>
            )}
          </section>

          <section className="rounded-2xl border border-militant-ardoise p-5">
            <h3 className="mb-1 font-condensed text-xl font-bold uppercase leading-tight">Envoyer à une adresse e-mail</h3>
            {emailEnvoye ? (
              <p className="text-[15px] font-semibold text-militant-bordeaux">Les formulaires ont été envoyés à {emailEnvoye}.</p>
            ) : chomageEnvoye ? (
              <p className="text-[15px]">Vous avez choisi l&apos;envoi au service chômage.</p>
            ) : (
              <form onSubmit={envoyerParEmail}>
                <p className="form-aide mb-3">
                  Indiquez l&apos;adresse qui doit recevoir les formulaires. Seule cette adresse les reçoit.
                </p>
                <label className="mb-3 block">
                  <span className="form-libelle mb-1.5 block">Adresse e-mail</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={emailDestinataire}
                    onChange={(event) => {
                      setEmailDestinataire(event.target.value);
                      setEmailErreur("");
                    }}
                    placeholder="nom@exemple.be"
                    disabled={envoiDejaFait || envoiEnCours !== null}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      emailErreur
                        ? "border-red-400 bg-red-50 focus:ring-red-200"
                        : "border-gray-300 focus:ring-blue-200"
                    }`}
                  />
                  {emailErreur && <span role="alert" className="form-erreur mt-1.5">{emailErreur}</span>}
                </label>
                <button
                  type="submit"
                  disabled={envoiDejaFait || envoiEnCours !== null}
                  className="form-btn-principal"
                >
                  {envoiEnCours === "email" ? <IconeChargement size={16} /> : <Mail size={16} />}
                  {envoiEnCours === "email" ? "Envoi en cours…" : "Envoyer à cette adresse"}
                </button>
              </form>
            )}
          </section>
        </div>

        {messageErreur && (
          <p className="mt-4 text-center text-sm text-red-600" role="alert">
            {messageErreur}
          </p>
        )}
      </div>
    </div>
  );
}
