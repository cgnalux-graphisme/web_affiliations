"use client";

import React, { useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  pdf,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image as PDFImage,
} from "@react-pdf/renderer";
import { FileDown, CheckCircle } from "lucide-react";

// ── Supabase ────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Types ────────────────────────────────────────────────────────────────────
type AccordCloture = "avec_cloture" | "sans_cloture" | "";

interface FormData {
  nom: string;
  prenom: string;
  niss: string;
  email: string;
  adresseRue: string;
  adresseNumero: string;
  codePostal: string;
  localite: string;
  pays: string;
  nouveauIban: string;
  nouveauBic: string;
  ancienIban: string;
  estTitulaire: boolean;
  nomTitulaire: string;
  accordCloture: AccordCloture;
  dateSig: string;
  lieu: string;
  signature: string;
}

const EMPTY: FormData = {
  nom: "", prenom: "", niss: "", email: "",
  adresseRue: "", adresseNumero: "", codePostal: "", localite: "", pays: "Belgique",
  nouveauIban: "", nouveauBic: "", ancienIban: "",
  estTitulaire: true, nomTitulaire: "",
  accordCloture: "", dateSig: "", lieu: "", signature: "",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function isValidIBAN(iban: string): boolean {
  const raw = iban.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(raw)) return false;
  const rearranged = raw.slice(4) + raw.slice(0, 4);
  const numeric = rearranged.split("").map(c => {
    const code = c.charCodeAt(0);
    return code >= 65 ? (code - 55).toString() : c;
  }).join("");
  let remainder = 0;
  for (const ch of numeric) {
    remainder = (remainder * 10 + parseInt(ch)) % 97;
  }
  return remainder === 1;
}

function isValidBIC(bic: string): boolean {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/i.test(bic.trim());
}

function formatNiss(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 6) return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
  if (digits.length <= 9) return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 6)}-${digits.slice(6, 9)}.${digits.slice(9)}`;
}

function isValidNISS(niss: string): boolean {
  const digits = niss.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  const base = parseInt(digits.slice(0, 9));
  const check = parseInt(digits.slice(9));
  const born2000 = 97 - ((2000000000 + base) % 97) === check;
  const bornPre2000 = 97 - (base % 97) === check;
  return born2000 || bornPre2000;
}

function formatIBAN(value: string): string {
  return value.replace(/\s/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}

// ── Logo (chargé une fois) ───────────────────────────────────────────────────
async function fetchLogoBase64(): Promise<string> {
  const res = await fetch("/Logo CG Blanc.png");
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

// ── PDF ──────────────────────────────────────────────────────────────────────
const pdfStyles = StyleSheet.create({
  page: { fontSize: 9, fontFamily: "Helvetica", padding: "30 36 30 36", color: "#111" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: "#b91c1c" },
  headerTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#b91c1c", textTransform: "uppercase" },
  headerSub: { fontSize: 8, color: "#555", marginTop: 2 },
  logo: { width: 80, height: 40, objectFit: "contain" },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#fff", backgroundColor: "#b91c1c", padding: "4 8", marginBottom: 6, marginTop: 10 },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { fontFamily: "Helvetica-Bold", width: 160, color: "#333" },
  value: { flex: 1, color: "#111" },
  divider: { borderBottomWidth: 0.5, borderBottomColor: "#ddd", marginVertical: 6 },
  rgpd: { fontSize: 7, color: "#666", marginTop: 18, borderTopWidth: 0.5, borderTopColor: "#ccc", paddingTop: 6, lineHeight: 1.5 },
  sigBox: { borderWidth: 0.5, borderColor: "#ccc", height: 50, marginTop: 4, padding: 4, justifyContent: "flex-end" },
  sigText: { fontSize: 7, color: "#999" },
  sigImage: { maxHeight: 42, objectFit: "contain", alignSelf: "flex-start" },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6 },
  metaText: { fontSize: 7, color: "#888" },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, borderTopWidth: 0.5, borderTopColor: "#e5e7eb", paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: "#9ca3af" },
});

function MandatPDF({ data, logoBase64, ipAddress, dateHeure }: {
  data: FormData;
  logoBase64: string;
  ipAddress: string;
  dateHeure: string;
}) {
  const ibanAffiche = data.nouveauIban
    ? formatIBAN(data.nouveauIban)
    : "—";

  return (
    <Document title="Changement de compte - Mandat SEPA">
      <Page size="A4" style={pdfStyles.page}>

        {/* En-tête */}
        <View style={pdfStyles.header}>
          <View>
            <Text style={pdfStyles.headerTitle}>Changement de numéro de compte — Mandat</Text>
            <Text style={pdfStyles.headerSub}>Centrale Générale FGTB Namur – Luxembourg</Text>
            <Text style={pdfStyles.headerSub}>Rue Fonteny Maroy, 13 · 6800 Libramont-Chevigny · N° BE00000647821</Text>
          </View>
          {logoBase64 ? (
            <PDFImage src={logoBase64} style={pdfStyles.logo} />
          ) : null}
        </View>

        {/* Note légale mandat */}
        <View style={{ backgroundColor: "#fef2f2", padding: "6 8", marginBottom: 8, borderLeftWidth: 3, borderLeftColor: "#b91c1c" }}>
          <Text style={{ fontSize: 7.5, color: "#7f1d1d", lineHeight: 1.5 }}>
            En signant ce mandat de domiciliation, vous autorisez la Centrale Générale FGTB Namur - Luxembourg à envoyer des instructions à votre banque pour débiter votre compte bancaire, et ce conformément aux instructions disponibles sur simple demande. Vous bénéficiez d&apos;un droit de remboursement par votre banque selon les conditions légales.
          </Text>
        </View>

        {/* Section A */}
        <Text style={pdfStyles.sectionTitle}>A. IDENTIFICATION DU MANDAT (Réservé au service)</Text>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Type d&apos;encaissement :</Text><Text style={pdfStyles.value}>Récurrent</Text></View>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Périodicité :</Text><Text style={pdfStyles.value}>Mensuel</Text></View>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Description :</Text><Text style={pdfStyles.value}>Convention pour la perception syndicale</Text></View>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Catégorie cotisation :</Text><Text style={[pdfStyles.value, { color: "#b91c1c" }]}>À compléter par le service</Text></View>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Numéro de mandat :</Text><Text style={[pdfStyles.value, { color: "#b91c1c" }]}>À compléter par le service</Text></View>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Date d&apos;enregistrement :</Text><Text style={[pdfStyles.value, { color: "#b91c1c" }]}>À compléter par le service</Text></View>

        {/* Section B */}
        <Text style={pdfStyles.sectionTitle}>B. COORDONNÉES & IDENTIFICATION BANCAIRE</Text>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Nom, prénom :</Text><Text style={pdfStyles.value}>{data.nom} {data.prenom}</Text></View>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Adresse :</Text><Text style={pdfStyles.value}>{data.adresseRue} {data.adresseNumero}</Text></View>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Code postal / Localité / Pays :</Text><Text style={pdfStyles.value}>{data.codePostal} {data.localite} — {data.pays}</Text></View>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>N° registre national :</Text><Text style={pdfStyles.value}>{data.niss || "—"}</Text></View>
        <View style={pdfStyles.divider} />
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Nouveau IBAN :</Text><Text style={[pdfStyles.value, { fontFamily: "Helvetica-Bold" }]}>{ibanAffiche}</Text></View>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Nouveau BIC :</Text><Text style={pdfStyles.value}>{data.nouveauBic.toUpperCase() || "—"}</Text></View>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Ancien IBAN :</Text><Text style={pdfStyles.value}>{data.ancienIban ? formatIBAN(data.ancienIban) : "—"}</Text></View>

        {/* Section C */}
        <Text style={pdfStyles.sectionTitle}>C. AUTORISATION & SIGNATURE</Text>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Titulaire du compte :</Text><Text style={pdfStyles.value}>{data.estTitulaire ? "Oui" : "Non"}</Text></View>
        {!data.estTitulaire && (
          <View style={pdfStyles.row}><Text style={pdfStyles.label}>Nom du titulaire :</Text><Text style={pdfStyles.value}>{data.nomTitulaire || "—"}</Text></View>
        )}
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>Accord transfert :</Text>
          <Text style={pdfStyles.value}>
            {data.accordCloture === "avec_cloture" ? "Oui, avec clôture du compte précédent" :
             data.accordCloture === "sans_cloture" ? "Oui, sans clôture du compte précédent" : "—"}
          </Text>
        </View>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Date :</Text><Text style={pdfStyles.value}>{data.dateSig || "—"}</Text></View>
        <View style={pdfStyles.row}><Text style={pdfStyles.label}>Lieu :</Text><Text style={pdfStyles.value}>{data.lieu || "—"}</Text></View>

        <Text style={{ fontSize: 8, marginTop: 10, marginBottom: 4, fontFamily: "Helvetica-Bold", color: "#333" }}>Signature du titulaire :</Text>
        <View style={pdfStyles.sigBox}>
          {data.signature ? (
            <PDFImage src={data.signature} style={pdfStyles.sigImage} />
          ) : (
            <Text style={pdfStyles.sigText}>Signature non fournie</Text>
          )}
        </View>

        {/* Méta */}
        <View style={pdfStyles.metaRow}>
          <Text style={pdfStyles.metaText}>Généré le {dateHeure} · IP : {ipAddress}</Text>
        </View>

        {/* RGPD */}
        <Text style={pdfStyles.rgpd}>
          Vos données personnelles sont traitées conformément au règlement européen RGPD. Vous pouvez lire la politique de confidentialité de la Centrale Générale via https://www.accg.be/fr/protection-de-la-vie-privee. Pour toute question : privacy@accg.be
        </Text>

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>Centrale Générale FGTB Namur – Luxembourg · cg.namurluxembourg@accg.be</Text>
          <Text style={pdfStyles.footerText}>IBAN BE94 8791 5049 0114</Text>
        </View>

      </Page>
    </Document>
  );
}

// ── Composant signature (canvas) ─────────────────────────────────────────────
function SignaturePad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    const { x, y } = getPos(e);
    ctx.moveTo(x, y);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDraw() {
    drawing.current = false;
    onSave(canvasRef.current!.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    onSave("");
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={480}
        height={100}
        style={{ border: "1px solid #d1d5db", borderRadius: "6px", touchAction: "none", background: "#fff", width: "100%", maxWidth: "480px", cursor: "crosshair" }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      <button type="button" onClick={clear} className="mt-1 text-xs text-gray-500 underline">Effacer</button>
    </div>
  );
}

// ── Formulaire principal ─────────────────────────────────────────────────────
export default function FormulaireChangementCompte() {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfError, setPdfError] = useState(false);

  function set(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.nom.trim()) e.nom = "Requis";
    if (!form.prenom.trim()) e.prenom = "Requis";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email invalide";
    if (form.niss && !isValidNISS(form.niss)) e.niss = "NISS invalide";
    if (!form.adresseRue.trim()) e.adresseRue = "Requis";
    if (!form.adresseNumero.trim()) e.adresseNumero = "Requis";
    if (!form.codePostal.trim()) e.codePostal = "Requis";
    if (!form.localite.trim()) e.localite = "Requis";
    if (!form.nouveauIban.trim()) {
      e.nouveauIban = "Requis";
    } else if (!isValidIBAN(form.nouveauIban)) {
      e.nouveauIban = "IBAN invalide";
    }
    if (!form.nouveauBic.trim()) {
      e.nouveauBic = "Requis";
    } else if (!isValidBIC(form.nouveauBic)) {
      e.nouveauBic = "BIC invalide";
    }
    if (!form.estTitulaire && !form.nomTitulaire.trim()) e.nomTitulaire = "Requis si vous n'êtes pas titulaire";
    if (!form.accordCloture) e.accordCloture = "Requis";
    if (!form.dateSig) e.dateSig = "Requis";
    if (!form.lieu.trim()) e.lieu = "Requis";
    if (!form.signature) e.signature = "La signature est requise";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setPdfError(false);

    try {
      // IP
      let ipAddress = "";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ipAddress = ipData.ip ?? "";
      } catch { /* silencieux */ }

      const now = new Date();
      const dateHeure = now.toLocaleString("fr-BE", { timeZone: "Europe/Brussels" });

      // Logo
      const logoBase64 = await fetchLogoBase64().catch(() => "");

      // Génération PDF
      const blob = await pdf(
        <MandatPDF data={form} logoBase64={logoBase64} ipAddress={ipAddress} dateHeure={dateHeure} />
      ).toBlob();
      setPdfBlob(blob);

      // Supabase
      const { error: dbError } = await supabase.from("web_mandats_sepa").insert({
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        niss: form.niss.replace(/\D/g, "") || null,
        email: form.email.trim().toLowerCase(),
        adresse_rue: form.adresseRue.trim(),
        adresse_numero: form.adresseNumero.trim(),
        code_postal: form.codePostal.trim(),
        localite: form.localite.trim(),
        pays: form.pays.trim(),
        nouveau_iban: form.nouveauIban.replace(/\s/g, "").toUpperCase(),
        nouveau_bic: form.nouveauBic.trim().toUpperCase(),
        ancien_iban: form.ancienIban ? form.ancienIban.replace(/\s/g, "").toUpperCase() : null,
        est_titulaire: form.estTitulaire,
        nom_titulaire: form.estTitulaire ? null : form.nomTitulaire.trim(),
        accord_cloture: form.accordCloture,
        date_signature: form.dateSig,
        lieu_signature: form.lieu.trim(),
        signature: form.signature,
        ip_address: ipAddress,
      });

      if (dbError) throw new Error(`Supabase: ${dbError.message}`);

      // Base64 pour email
      const pdfBase64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const fileName = `changement-compte-${form.nom.toLowerCase()}-${form.prenom.toLowerCase()}.pdf`;

      const emailRes = await fetch("/api/send-mandat-sepa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          nom: form.nom.trim(),
          prenom: form.prenom.trim(),
          pdfBase64,
          fileName,
          nouveauIban: formatIBAN(form.nouveauIban),
        }),
      });

      if (!emailRes.ok) {
        console.error("Erreur envoi email, mais données sauvegardées");
        setPdfError(true);
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue. Veuillez réessayer ou nous contacter.");
    } finally {
      setLoading(false);
    }
  }

  function downloadPdf() {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `changement-compte-${form.nom.toLowerCase()}-${form.prenom.toLowerCase()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Écran succès ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-white rounded-xl shadow p-8 text-center">
        <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Demande enregistrée</h2>
        <p className="text-gray-600 text-sm mb-6">
          Votre demande de changement de compte a bien été transmise. Un email de confirmation vous a été envoyé à <strong>{form.email}</strong>.
        </p>
        {pdfError && (
          <p className="text-amber-700 bg-amber-50 rounded p-3 text-xs mb-4">
            L&apos;email n&apos;a pas pu être envoyé, mais vos données sont bien enregistrées. Vous pouvez télécharger le PDF ci-dessous.
          </p>
        )}
        {pdfBlob && (
          <button
            onClick={downloadPdf}
            className="inline-flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-5 rounded-lg text-sm"
          >
            <FileDown size={16} /> Télécharger le PDF
          </button>
        )}
      </div>
    );
  }

  // ── Rendu du formulaire ──────────────────────────────────────────────────
  const err = errors;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Titre */}
      <div className="bg-red-700 text-white rounded-t-xl px-6 py-4 mb-0">
        <h1 className="text-lg font-bold uppercase tracking-wide">Changement de numéro de compte — Mandat</h1>
        <p className="text-red-200 text-xs mt-1">Centrale Générale FGTB Namur – Luxembourg</p>
      </div>

      {/* Note légale */}
      <div className="bg-red-50 border-l-4 border-red-700 px-5 py-3 text-xs text-red-800 leading-relaxed mb-6">
        En signant ce mandat de domiciliation, vous autorisez la Centrale Générale FGTB Namur - Luxembourg à envoyer des instructions à votre banque pour débiter votre compte bancaire. Vous bénéficiez d&apos;un droit de remboursement par votre banque selon les conditions légales.
      </div>

      <form onSubmit={handleSubmit} noValidate className="bg-white rounded-b-xl shadow space-y-0">

        {/* ── SECTION A ── */}
        <SectionTitle>A. Identification du mandat (réservé au service)</SectionTitle>
        <div className="px-6 py-3 bg-gray-50 text-xs text-gray-500 space-y-1">
          <p><span className="font-semibold text-gray-700">Type d&apos;encaissement :</span> Récurrent</p>
          <p><span className="font-semibold text-gray-700">Périodicité :</span> Mensuel</p>
          <p><span className="font-semibold text-gray-700">Description :</span> Convention pour la perception syndicale</p>
          <p className="text-amber-700 font-medium">La catégorie de cotisation et le numéro de mandat seront complétés par notre service.</p>
        </div>

        {/* ── SECTION B ── */}
        <SectionTitle>B. Coordonnées & Identification bancaire</SectionTitle>
        <div className="px-6 py-5 space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <Field label="Nom *" error={err.nom}>
              <input className={input(err.nom)} value={form.nom} onChange={e => set("nom", e.target.value)} />
            </Field>
            <Field label="Prénom *" error={err.prenom}>
              <input className={input(err.prenom)} value={form.prenom} onChange={e => set("prenom", e.target.value)} />
            </Field>
          </div>

          <Field label="Email * (pour recevoir la confirmation)" error={err.email}>
            <input type="email" className={input(err.email)} value={form.email} onChange={e => set("email", e.target.value)} />
          </Field>

          <Field label="N° registre national (NISS)" error={err.niss} hint="Format : AA.MM.JJ-XXX.CC">
            <input
              className={input(err.niss)}
              value={form.niss}
              onChange={e => set("niss", formatNiss(e.target.value))}
              placeholder="85.04.12-123.45"
              maxLength={15}
            />
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Field label="Rue *" error={err.adresseRue}>
                <input className={input(err.adresseRue)} value={form.adresseRue} onChange={e => set("adresseRue", e.target.value)} />
              </Field>
            </div>
            <Field label="N° *" error={err.adresseNumero}>
              <input className={input(err.adresseNumero)} value={form.adresseNumero} onChange={e => set("adresseNumero", e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Code postal *" error={err.codePostal}>
              <input className={input(err.codePostal)} value={form.codePostal} onChange={e => set("codePostal", e.target.value)} maxLength={6} />
            </Field>
            <div className="col-span-2">
              <Field label="Localité *" error={err.localite}>
                <input className={input(err.localite)} value={form.localite} onChange={e => set("localite", e.target.value)} />
              </Field>
            </div>
          </div>

          <Field label="Pays">
            <input className={input()} value={form.pays} onChange={e => set("pays", e.target.value)} />
          </Field>

          <div className="border-t pt-4 space-y-4">
            <Field label="Nouveau IBAN * (belge ou européen)" error={err.nouveauIban} hint="Commencez par BE pour un IBAN belge">
              <input
                className={input(err.nouveauIban)}
                value={form.nouveauIban}
                onChange={e => set("nouveauIban", formatIBAN(e.target.value))}
                placeholder="BE68 5390 0754 7034"
                maxLength={42}
              />
            </Field>

            <Field label="Nouveau BIC *" error={err.nouveauBic}>
              <input
                className={`${input(err.nouveauBic)} uppercase`}
                value={form.nouveauBic}
                onChange={e => set("nouveauBic", e.target.value.toUpperCase())}
                placeholder="GEBABEBB"
                maxLength={11}
              />
            </Field>

            <Field label="Ancien IBAN" error={err.ancienIban}>
              <input
                className={input(err.ancienIban)}
                value={form.ancienIban}
                onChange={e => set("ancienIban", formatIBAN(e.target.value))}
                placeholder="BE…"
                maxLength={42}
              />
            </Field>
          </div>
        </div>

        {/* ── SECTION C ── */}
        <SectionTitle>C. Autorisation & Signature</SectionTitle>
        <div className="px-6 py-5 space-y-4">

          <Field label="Êtes-vous le titulaire du compte ? *">
            <div className="flex gap-6 mt-1">
              {[true, false].map(v => (
                <label key={String(v)} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="titulaire"
                    checked={form.estTitulaire === v}
                    onChange={() => set("estTitulaire", v)}
                    className="accent-red-700"
                  />
                  {v ? "Oui" : "Non"}
                </label>
              ))}
            </div>
          </Field>

          {!form.estTitulaire && (
            <Field label="Nom du titulaire du compte *" error={err.nomTitulaire}>
              <input className={input(err.nomTitulaire)} value={form.nomTitulaire} onChange={e => set("nomTitulaire", e.target.value)} />
            </Field>
          )}

          <Field label="Accord transfert de l'ordre de paiement *" error={err.accordCloture}>
            <div className="space-y-2 mt-1">
              {([
                ["avec_cloture", "Oui, avec clôture du compte précédent"],
                ["sans_cloture", "Oui, sans clôture du compte précédent"],
              ] as [AccordCloture, string][]).map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="accordCloture"
                    checked={form.accordCloture === val}
                    onChange={() => set("accordCloture", val)}
                    className="accent-red-700"
                  />
                  {label}
                </label>
              ))}
            </div>
            {err.accordCloture && <p className="text-red-600 text-xs mt-1">{err.accordCloture}</p>}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date *" error={err.dateSig}>
              <input type="date" className={input(err.dateSig)} value={form.dateSig} onChange={e => set("dateSig", e.target.value)} />
            </Field>
            <Field label="Lieu *" error={err.lieu}>
              <input className={input(err.lieu)} value={form.lieu} onChange={e => set("lieu", e.target.value)} placeholder="Namur" />
            </Field>
          </div>

          <Field label="Signature du titulaire *" error={err.signature}>
            <p className="text-xs text-gray-500 mb-2">Dessinez votre signature dans le cadre ci-dessous</p>
            <SignaturePad onSave={(dataUrl) => set("signature", dataUrl)} />
            {err.signature && <p className="text-red-600 text-xs mt-1">{err.signature}</p>}
          </Field>

          {/* RGPD */}
          <p className="text-xs text-gray-500 leading-relaxed border-t pt-4">
            Vos données personnelles sont traitées conformément au règlement européen RGPD.{" "}
            <a href="https://www.accg.be/fr/protection-de-la-vie-privee" target="_blank" rel="noopener noreferrer" className="text-red-700 underline">
              Politique de confidentialité
            </a>{" "}
            · Questions : <a href="mailto:privacy@accg.be" className="text-red-700 underline">privacy@accg.be</a>
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-700 hover:bg-red-800 disabled:bg-red-300 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
          >
            {loading ? "Envoi en cours…" : "Envoyer ma demande"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Composants UI ────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-red-700 text-white px-6 py-2 text-xs font-bold uppercase tracking-wider">
      {children}
    </div>
  );
}

function Field({ label, error, hint, children }: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      {children}
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}

function input(error?: string) {
  return `w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
    error
      ? "border-red-400 focus:ring-red-300 bg-red-50"
      : "border-gray-300 focus:ring-red-200"
  }`;
}
