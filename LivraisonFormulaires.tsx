"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle, FileDown, Mail, Send } from "lucide-react";
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
  const boutonPrincipal =
    accent === "red"
      ? "bg-red-900 hover:bg-red-950 disabled:bg-red-300"
      : "bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300";

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
      <div className="rounded-2xl bg-white p-8 shadow-lg">
        <CheckCircle className="mx-auto mb-4 text-green-500" size={52} />
        <h2 className="mb-2 text-center text-xl font-bold text-gray-900">{titre}</h2>
        <p className="mb-6 text-center text-sm text-gray-600">{description}</p>

        <label className="mb-6 block text-left">
          <span className="mb-1 block text-sm font-medium text-gray-800">Votre province</span>
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
          <span className="mt-1 block text-xs text-gray-500">
            L&apos;envoi automatique au service chômage est réservé aux provinces de Namur et du Luxembourg.
          </span>
        </label>

        <div className="space-y-4 text-left">
          <section className="rounded-xl border border-gray-200 p-4">
            <h3 className="mb-1 text-sm font-semibold text-gray-900">Télécharger les PDF</h3>
            <p className="mb-3 text-xs text-gray-500">
              Les fichiers restent sur votre appareil.
            </p>
            <div className="space-y-2">
              {documents.map((document) => (
                <button
                  key={document.fileName}
                  type="button"
                  onClick={() => downloadPdfFromBase64(document.pdfBase64, document.fileName)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm transition hover:border-gray-300 hover:bg-gray-100"
                >
                  <span>
                    <span className="block font-medium text-gray-900">{document.label}</span>
                    <span className="block text-xs text-gray-500">{document.fileName}</span>
                  </span>
                  <FileDown className="h-4 w-4 shrink-0 text-gray-700" />
                </button>
              ))}
            </div>
            {documents.length > 1 && (
              <button
                type="button"
                onClick={telechargerTout}
                className={`mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${boutonPrincipal}`}
              >
                <FileDown size={16} />
                Tout télécharger
              </button>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 p-4">
            <h3 className="mb-1 text-sm font-semibold text-gray-900">Envoyer au service chômage</h3>
            {chomageEnvoye ? (
              <p className="text-sm text-green-700">Les formulaires ont été envoyés au service chômage.</p>
            ) : emailEnvoye ? (
              <p className="text-sm text-gray-600">Vous avez choisi l&apos;envoi vers une adresse e-mail.</p>
            ) : (
              <>
                <p className="mb-3 text-xs text-gray-500">
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
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed ${boutonPrincipal}`}
                >
                  <Send size={16} />
                  {envoiEnCours === "chomage" ? "Envoi…" : "Envoyer au service chômage"}
                </button>
              </>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 p-4">
            <h3 className="mb-1 text-sm font-semibold text-gray-900">Envoyer à une adresse e-mail</h3>
            {emailEnvoye ? (
              <p className="text-sm text-green-700">Les formulaires ont été envoyés à {emailEnvoye}.</p>
            ) : chomageEnvoye ? (
              <p className="text-sm text-gray-600">Vous avez choisi l&apos;envoi au service chômage.</p>
            ) : (
              <form onSubmit={envoyerParEmail}>
                <p className="mb-3 text-xs text-gray-500">
                  Indiquez l&apos;adresse qui doit recevoir les formulaires. Seule cette adresse les reçoit.
                </p>
                <label className="mb-3 block">
                  <span className="mb-1 block text-sm font-medium text-gray-800">Adresse e-mail</span>
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
                  {emailErreur && <span className="mt-1 block text-xs text-red-600">{emailErreur}</span>}
                </label>
                <button
                  type="submit"
                  disabled={envoiDejaFait || envoiEnCours !== null}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed ${boutonPrincipal}`}
                >
                  <Mail size={16} />
                  {envoiEnCours === "email" ? "Envoi…" : "Envoyer à cette adresse"}
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
