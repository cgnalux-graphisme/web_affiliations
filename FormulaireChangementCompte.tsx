"use client";

import React, { useEffect, useRef, useState } from "react";
import { dateFrToIso, formatDateFr, isValidDateFr } from "./lib/dates";
import { getSupabase } from "./lib/supabase";
import { postJson } from "./lib/post-json";
import { useOnceSubmit } from "./lib/use-once-submit";
import {
  pdf,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image as PDFImage,
} from "@react-pdf/renderer";
import { FileDown, CheckCircle, Loader2, MapPin } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
type AccordCloture = "avec_cloture" | "sans_cloture" | "";
type TypeDemande = "nouveau_mandat" | "changement_compte" | "";

interface FormData {
  typeDemande: TypeDemande;
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
  typeDemande: "",
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

function isBelgianIban(value: string): boolean {
  return value.replace(/\s/g, "").toUpperCase().startsWith("BE");
}

interface PhotonSuggestion {
  street: string;
  housenumber: string;
  postcode: string;
  city: string;
  display: string;
}

function AddressAutocomplete({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: PhotonSuggestion) => void;
}) {
  const [suggestions, setSuggestions] = useState<PhotonSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function handleChange(v: string) {
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (v.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url =
          `https://photon.komoot.io/api/?q=${encodeURIComponent(v)}` +
          `&lang=fr&limit=10&bbox=2.376,49.496,6.628,51.547`;
        const res = await fetch(url);
        const json = await res.json();
        const features: unknown[] = json.features ?? [];

        const raw: PhotonSuggestion[] = (features as Array<{
          properties: {
            countrycode?: string;
            street?: string;
            housenumber?: string;
            postcode?: string;
            city?: string;
            locality?: string;
            district?: string;
          };
        }>)
          .filter((f) => f.properties?.countrycode === "BE" && f.properties?.street)
          .map((f) => {
            const p = f.properties;
            const street = p.street ?? "";
            const housenumber = p.housenumber ?? "";
            const postcode = p.postcode ?? "";
            const city = p.city ?? p.locality ?? p.district ?? "";
            const display = [
              street + (housenumber ? ` ${housenumber}` : ""),
              [postcode, city].filter(Boolean).join(" "),
            ]
              .filter(Boolean)
              .join(", ");
            return { street, housenumber, postcode, city, display };
          });

        const seen = new Set<string>();
        const unique = raw.filter((r) => {
          const key = `${r.street}|${r.postcode}|${r.city}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setSuggestions(unique.slice(0, 6));
        setOpen(unique.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  function handleSelect(s: PhotonSuggestion) {
    onChange(s.street);
    onSelect(s);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Rue de la Loi"
          autoComplete="off"
          className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors border-gray-300 focus:ring-red-200"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin pointer-events-none" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden text-sm">
          {suggestions.map((s, i) => (
            <li
              key={i}
              onMouseDown={() => handleSelect(s)}
              className="px-3 py-2.5 cursor-pointer hover:bg-red-50 hover:text-red-700 border-b border-gray-100 last:border-0 flex items-center gap-2"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0 text-red-400" />
              {s.display}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Logo (chargé une fois) ───────────────────────────────────────────────────
async function fetchLogoBase64(): Promise<string> {
  const res = await fetch("/Logo CG Blanc.png");
  if (!res.ok) return "";
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

// ── PDF (look aligné sur le formulaire d'affiliation) ────────────────────────
const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    paddingRight: 40,
    backgroundColor: "#ffffff",
    color: "#111827",
  },
  header: {
    backgroundColor: "#b91c1c",
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 10,
    paddingRight: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logoImage: {
    width: 96,
    marginRight: 12,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  headerSubtitle: {
    color: "#fca5a5",
    fontSize: 7.5,
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerDateLabel: {
    color: "#fecaca",
    fontSize: 6.5,
  },
  headerDateValue: {
    color: "#ffffff",
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 1,
  },
  headerMember: {
    color: "#fecaca",
    fontSize: 7,
    marginTop: 3,
    textAlign: "right",
  },
  body: {
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 10,
  },
  sectionTitle: {
    backgroundColor: "#b91c1c",
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 7,
    paddingRight: 7,
    marginBottom: 5,
    marginTop: 7,
    borderRadius: 2,
  },
  section: { marginBottom: 3 },
  twoCol: { flexDirection: "row" },
  colLeft: { flex: 1, marginRight: 12 },
  colRight: { flex: 1 },
  row: {
    flexDirection: "row",
    marginBottom: 3.5,
  },
  label: {
    width: "42%",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: "#6b7280",
  },
  value: {
    width: "58%",
    fontSize: 7.5,
    color: "#111827",
  },
  adminBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    borderRadius: 3,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 10,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  adminFieldWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  adminFieldLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    marginRight: 6,
    width: "52%",
  },
  adminFieldLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    borderBottomStyle: "solid",
    height: 12,
  },
  sepaBox: {
    backgroundColor: "#fff8f8",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderTopStyle: "solid",
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    borderRightStyle: "solid",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    borderBottomStyle: "solid",
    borderLeftWidth: 3,
    borderLeftColor: "#b91c1c",
    borderLeftStyle: "solid",
    borderRadius: 3,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 8,
    marginTop: 4,
  },
  infoBoxTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    marginBottom: 3,
  },
  signatureBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "solid",
    borderRadius: 3,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 8,
    paddingRight: 8,
    marginTop: 3,
    backgroundColor: "#f9fafb",
    alignItems: "center",
  },
  signatureImage: {
    width: 150,
    alignSelf: "center",
  },
  signatureDate: {
    fontSize: 6.5,
    color: "#6b7280",
    marginTop: 3,
    fontFamily: "Helvetica-Oblique",
  },
  luApprouve: {
    fontSize: 7,
    color: "#6b7280",
    marginTop: 6,
    lineHeight: 1.5,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderTopStyle: "solid",
    paddingTop: 5,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 6,
    color: "#9ca3af",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderTopStyle: "solid",
    paddingTop: 4,
  },
});

const v = (val?: string) => val?.trim() || "—";

function PdfRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={pdfStyles.row}>
      <Text style={pdfStyles.label}>{label}</Text>
      <Text style={pdfStyles.value}>{value}</Text>
    </View>
  );
}

function MandatPDF({ data, logoBase64, ipAddress, dateHeure }: {
  data: FormData;
  logoBase64: string;
  ipAddress: string;
  dateHeure: string;
}) {
  const now = new Date();
  const dateDoc = now.toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const dateSignLong = now.toLocaleDateString("fr-BE", { day: "2-digit", month: "long", year: "numeric" });

  const titreDemande =
    data.typeDemande === "nouveau_mandat"
      ? "Nouveau mandat SEPA"
      : data.typeDemande === "changement_compte"
        ? "Changement de numéro de compte"
        : "Mandat SEPA";
  const typeDemandeLabel =
    data.typeDemande === "nouveau_mandat" ? "Nouveau mandat"
    : data.typeDemande === "changement_compte" ? "Changement de compte"
    : "—";
  const ibanAffiche = data.nouveauIban ? formatIBAN(data.nouveauIban) : "—";
  const titulaireLabel = data.estTitulaire ? "Oui" : "Non";
  const accordLabel =
    data.accordCloture === "avec_cloture" ? "Oui, avec clôture du compte précédent"
    : data.accordCloture === "sans_cloture" ? "Oui, sans clôture du compte précédent"
    : "—";

  return (
    <Document
      title={`${titreDemande} - Mandat SEPA`}
      author="Centrale Générale FGTB Namur-Luxembourg"
      subject="Mandat SEPA"
    >
      <Page size="A4" style={pdfStyles.page}>

        <View style={pdfStyles.header}>
          <View style={pdfStyles.headerLeft}>
            {logoBase64 ? (
              <PDFImage src={logoBase64} style={pdfStyles.logoImage} />
            ) : (
              <View style={{ width: 96, marginRight: 12, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 4, alignItems: "center", justifyContent: "center", paddingTop: 8, paddingBottom: 8 }}>
                <Text style={{ color: "#fff", fontSize: 10, fontFamily: "Helvetica-Bold" }}>CG</Text>
              </View>
            )}
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={pdfStyles.headerTitle}>{titreDemande}</Text>
              <Text style={pdfStyles.headerSubtitle}>Centrale Générale FGTB Namur-Luxembourg</Text>
            </View>
          </View>
          <View style={pdfStyles.headerRight}>
            <Text style={pdfStyles.headerDateLabel}>Document du</Text>
            <Text style={pdfStyles.headerDateValue}>{dateDoc}</Text>
            <Text style={pdfStyles.headerMember}>{data.prenom} {data.nom}</Text>
          </View>
        </View>

        <View style={pdfStyles.body}>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>0. Réservé à l&apos;administration</Text>
            <View style={pdfStyles.adminBox}>
              <View style={pdfStyles.adminFieldWrap}>
                <Text style={pdfStyles.adminFieldLabel}>N° de mandat :</Text>
                <View style={pdfStyles.adminFieldLine} />
              </View>
              <View style={[pdfStyles.adminFieldWrap, { marginRight: 0 }]}>
                <Text style={pdfStyles.adminFieldLabel}>Date d&apos;encodage :</Text>
                <View style={pdfStyles.adminFieldLine} />
              </View>
            </View>
            <View style={pdfStyles.adminBox}>
              <View style={[pdfStyles.adminFieldWrap, { marginRight: 0 }]}>
                <Text style={pdfStyles.adminFieldLabel}>Catégorie cotisation :</Text>
                <View style={pdfStyles.adminFieldLine} />
              </View>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>1. Identité</Text>
            <View style={pdfStyles.twoCol}>
              <View style={pdfStyles.colLeft}>
                <PdfRow label="Nom :" value={v(data.nom)} />
                <PdfRow label="Prénom :" value={v(data.prenom)} />
                <PdfRow label="NISS :" value={v(data.niss)} />
              </View>
              <View style={pdfStyles.colRight}>
                <PdfRow label="Email :" value={v(data.email)} />
                <PdfRow label="Type de demande :" value={typeDemandeLabel} />
              </View>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>2. Adresse</Text>
            <View style={pdfStyles.twoCol}>
              <View style={pdfStyles.colLeft}>
                <PdfRow label="Rue :" value={v(data.adresseRue)} />
                <PdfRow label="Code postal :" value={v(data.codePostal)} />
                <PdfRow label="Pays :" value={v(data.pays)} />
              </View>
              <View style={pdfStyles.colRight}>
                <PdfRow label="N° :" value={v(data.adresseNumero)} />
                <PdfRow label="Localité :" value={v(data.localite)} />
              </View>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>3. Créancier SEPA</Text>
            <View style={pdfStyles.sepaBox}>
              <Text style={[pdfStyles.infoBoxTitle, { color: "#b91c1c", fontSize: 7.5 }]}>
                Informations créancier SEPA
              </Text>
              <View style={pdfStyles.twoCol}>
                <View style={pdfStyles.colLeft}>
                  <PdfRow label="Créancier :" value="Centrale Générale FGTB Namur-Luxembourg" />
                  <PdfRow label="Adresse :" value="Rue Fonteny Maroy, 13" />
                  <PdfRow label="Localité :" value="6800 Libramont-Chevigny" />
                </View>
                <View style={pdfStyles.colRight}>
                  <PdfRow label="Identifiant (ICS) :" value="BE00000647821" />
                  <PdfRow label="Type d'encaissement :" value="Récurrent" />
                  <PdfRow label="Périodicité :" value="Mensuel" />
                </View>
              </View>
              <PdfRow label="Description :" value="Convention pour la perception syndicale" />
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>4. Coordonnées bancaires</Text>
            <View style={pdfStyles.twoCol}>
              <View style={pdfStyles.colLeft}>
                <View style={pdfStyles.row}>
                  <Text style={pdfStyles.label}>Nouvel IBAN :</Text>
                  <Text style={[pdfStyles.value, { fontFamily: "Helvetica-Bold" }]}>{ibanAffiche}</Text>
                </View>
                <PdfRow label="BIC / SWIFT :" value={v(data.nouveauBic.toUpperCase())} />
              </View>
              <View style={pdfStyles.colRight}>
                <PdfRow label="Titulaire du compte :" value={titulaireLabel} />
                {!data.estTitulaire && (
                  <PdfRow label="Nom du titulaire :" value={v(data.nomTitulaire)} />
                )}
                {data.typeDemande === "changement_compte" && (
                  <PdfRow
                    label="Ancien IBAN :"
                    value={data.ancienIban ? formatIBAN(data.ancienIban) : "—"}
                  />
                )}
              </View>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>5. Autorisation</Text>
            <View style={pdfStyles.sepaBox}>
              <Text style={[pdfStyles.infoBoxTitle, { color: "#b91c1c", fontSize: 7.5 }]}>
                Mandat de domiciliation
              </Text>
              <Text style={{ fontSize: 7, color: "#7f1d1d", lineHeight: 1.5 }}>
                En signant ce mandat de domiciliation, vous autorisez la Centrale Générale FGTB Namur - Luxembourg à envoyer des instructions à votre banque pour débiter votre compte bancaire, et ce conformément aux instructions disponibles sur simple demande. Vous bénéficiez d&apos;un droit de remboursement par votre banque selon les conditions légales.
              </Text>
            </View>
            <View style={[pdfStyles.twoCol, { marginTop: 6 }]}>
              <View style={pdfStyles.colLeft}>
                <PdfRow label="Date :" value={v(data.dateSig)} />
                {data.typeDemande === "changement_compte" && (
                  <PdfRow label="Accord transfert :" value={accordLabel} />
                )}
              </View>
              <View style={pdfStyles.colRight}>
                <PdfRow label="Lieu :" value={v(data.lieu)} />
              </View>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>6. Signature du membre</Text>
            <View style={pdfStyles.signatureBox}>
              {data.signature ? (
                <PDFImage src={data.signature} style={pdfStyles.signatureImage} />
              ) : (
                <Text style={{ fontSize: 8, color: "#9ca3af", alignSelf: "center" }}>
                  (aucune signature fournie)
                </Text>
              )}
              <Text style={[pdfStyles.signatureDate, { textAlign: "center" }]}>
                Signé électroniquement le {dateSignLong}
              </Text>
              <Text style={pdfStyles.luApprouve}>
                Lu et approuvé. Mandat complété en ligne le {dateHeure} via accg-nalux.be.{"\n"}
                Certifié conforme par signature électronique.{ipAddress ? ` IP : ${ipAddress}` : ""}{"\n"}
                Vos données personnelles sont traitées conformément au RGPD. Politique de confidentialité : https://www.accg.be/fr/protection-de-la-vie-privee — privacy@accg.be
              </Text>
            </View>
          </View>

        </View>

        <Text style={pdfStyles.footer} fixed>
          Centrale Générale FGTB Namur-Luxembourg · cg.namurluxembourg@accg.be · Données traitées conformément au RGPD
        </Text>

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
  const { acquire, release } = useOnceSubmit();

  function set(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.typeDemande) e.typeDemande = "Requis";
    if (!form.nom.trim()) e.nom = "Requis";
    if (!form.prenom.trim()) e.prenom = "Requis";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email invalide";
    if (!form.niss.trim()) {
      e.niss = "Requis";
    } else if (!isValidNISS(form.niss)) {
      e.niss = "NISS invalide";
    }
    if (!form.adresseRue.trim()) e.adresseRue = "Requis";
    if (!form.adresseNumero.trim()) e.adresseNumero = "Requis";
    if (!form.codePostal.trim()) e.codePostal = "Requis";
    if (!form.localite.trim()) e.localite = "Requis";
    if (!form.nouveauIban.trim()) {
      e.nouveauIban = "Requis";
    } else if (!isValidIBAN(form.nouveauIban)) {
      e.nouveauIban = "IBAN invalide";
    }
    const bicRequired = !isBelgianIban(form.nouveauIban);
    if (bicRequired && !form.nouveauBic.trim()) {
      e.nouveauBic = "Requis pour un IBAN non belge";
    } else if (form.nouveauBic.trim() && !isValidBIC(form.nouveauBic)) {
      e.nouveauBic = "BIC invalide";
    }
    if (!form.pays.trim()) e.pays = "Requis";
    if (!form.estTitulaire && !form.nomTitulaire.trim()) e.nomTitulaire = "Requis si vous n'êtes pas titulaire";
    if (form.typeDemande === "changement_compte") {
      if (!form.accordCloture) e.accordCloture = "Requis";
      if (!form.ancienIban.trim()) {
        e.ancienIban = "Requis pour un changement de compte";
      } else if (!isValidIBAN(form.ancienIban)) {
        e.ancienIban = "IBAN invalide";
      } else if (
        form.ancienIban.replace(/\s/g, "").toUpperCase() ===
        form.nouveauIban.replace(/\s/g, "").toUpperCase()
      ) {
        e.ancienIban = "L'ancien et le nouveau IBAN doivent être différents";
      }
    }
    if (!form.dateSig) {
      e.dateSig = "Requis";
    } else if (!isValidDateFr(form.dateSig)) {
      e.dateSig = "Date invalide (format jj/mm/aaaa)";
    }
    if (!form.lieu.trim()) e.lieu = "Requis";
    if (!form.signature) e.signature = "La signature est requise";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acquire() || loading) return;
    if (!validate()) {
      release();
      return;
    }
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

      // Supabase — colonnes alignées sur web_mandats_sepa (IBAN BE/EU séparés)
      const ibanNorm = form.nouveauIban.replace(/\s/g, "").toUpperCase();
      const ibanBelge = isBelgianIban(ibanNorm);
      const dateIso = dateFrToIso(form.dateSig);
      if (!dateIso) throw new Error("Date de signature invalide.");

      const supabase = getSupabase();
      const { error: dbError } = await supabase.from("web_mandats_sepa").insert({
        type_demande: form.typeDemande,
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        niss: form.niss.replace(/\D/g, ""),
        email: form.email.trim().toLowerCase(),
        adresse_rue: form.adresseRue.trim(),
        adresse_numero: form.adresseNumero.trim(),
        code_postal: form.codePostal.trim(),
        localite: form.localite.trim(),
        pays: form.pays.trim(),
        nouveau_iban_be: ibanBelge ? ibanNorm : null,
        nouveau_iban_eu: ibanBelge ? null : ibanNorm,
        nouveau_bic: form.nouveauBic.trim().toUpperCase(),
        ancien_iban: form.ancienIban.trim()
          ? form.ancienIban.replace(/\s/g, "").toUpperCase()
          : null,
        categorie_cotisation: "À compléter",
        est_titulaire: form.estTitulaire,
        nom_titulaire: form.estTitulaire ? null : form.nomTitulaire.trim(),
        accord_cloture: form.accordCloture || "non_applicable",
        date_signature: dateIso,
        lieu_signature: form.lieu.trim(),
        signature: form.signature,
        ip_address: ipAddress || null,
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

      const prefix = form.typeDemande === "nouveau_mandat" ? "nouveau-mandat" : "changement-compte";
      const fileName = `${prefix}-${form.nom.toLowerCase()}-${form.prenom.toLowerCase()}.pdf`;

      try {
        await postJson("/api/send-mandat-sepa", {
          email: form.email.trim().toLowerCase(),
          nom: form.nom.trim(),
          prenom: form.prenom.trim(),
          pdfBase64,
          fileName,
          nouveauIban: formatIBAN(form.nouveauIban),
          typeDemande: form.typeDemande,
        });
      } catch (emailErr) {
        // L'enregistrement a réussi : on laisse télécharger le PDF même si l'e-mail échoue.
        console.error("Erreur envoi email :", emailErr);
        setPdfError(true);
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      release();
      const msg = err instanceof Error ? err.message : "Une erreur est survenue.";
      alert(`${msg}\n\nSi le problème persiste, contactez-nous.`);
    } finally {
      setLoading(false);
    }
  }

  function downloadPdf() {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    const prefix = form.typeDemande === "nouveau_mandat" ? "nouveau-mandat" : "changement-compte";
    a.download = `${prefix}-${form.nom.toLowerCase()}-${form.prenom.toLowerCase()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Écran succès ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-5">
          <header className="bg-red-700 rounded-2xl px-6 py-5 text-white shadow-lg">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 rounded-xl p-2.5 shrink-0">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white text-lg font-semibold leading-snug">
                  Demande enregistrée
                </p>
                <p className="text-red-100 text-sm mt-1">
                  Votre demande a bien été transmise.
                </p>
              </div>
            </div>
          </header>

          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            {!pdfError ? (
              <p className="text-gray-600 text-sm mb-6">
                Un email de confirmation a été envoyé à <strong>{form.email}</strong>.
              </p>
            ) : (
              <p className="text-amber-700 bg-amber-50 rounded-xl p-3 text-sm mb-4">
                L&apos;e-mail n&apos;a pas pu être envoyé, mais vos données sont bien enregistrées. Vous pouvez télécharger le PDF ci-dessous.
              </p>
            )}
            {pdfBlob && (
              <button
                onClick={downloadPdf}
                className="inline-flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors"
              >
                <FileDown size={16} /> Télécharger le PDF
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Rendu du formulaire ──────────────────────────────────────────────────
  const err = errors;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Titre */}
        <header className="bg-red-700 rounded-2xl px-6 py-5 text-white shadow-lg">
          <h1 className="text-xl font-semibold leading-snug">Mandat SEPA — Nouveau mandat ou changement de compte</h1>
          <p className="text-red-100 text-sm mt-1.5">Centrale Générale FGTB Namur – Luxembourg</p>
        </header>

        {/* Note légale */}
        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 text-sm text-red-800 leading-relaxed">
          En signant ce mandat de domiciliation, vous autorisez la Centrale Générale FGTB Namur - Luxembourg à envoyer des instructions à votre banque pour débiter votre compte bancaire. Vous bénéficiez d&apos;un droit de remboursement par votre banque selon les conditions légales.
        </div>

        <form onSubmit={handleSubmit} noValidate className="bg-white rounded-2xl shadow-sm space-y-0">

        {/* ── CHOIX TYPE DE DEMANDE ── */}
        <div className="px-6 py-6 border-b border-gray-100">
          <Field
            label="Que souhaitez-vous faire ? *"
            error={err.typeDemande}
            hint="Choisissez le type de demande avant de continuer."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {([
                [
                  "nouveau_mandat",
                  "Créer un nouveau mandat",
                  "Je mets en place un mandat SEPA pour la première fois.",
                ],
                [
                  "changement_compte",
                  "Changer de compte bancaire",
                  "J'ai déjà un mandat et je souhaite modifier le compte.",
                ],
              ] as [TypeDemande, string, string][]).map(([val, title, description]) => (
                <label
                  key={val}
                  className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                    form.typeDemande === val
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 hover:border-red-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="typeDemande"
                      checked={form.typeDemande === val}
                      onChange={() => set("typeDemande", val)}
                      className="mt-1 accent-red-700"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{title}</p>
                      <p className="text-xs text-gray-500 mt-1">{description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </Field>
        </div>

        {/* ── SECTION A ── */}
        <SectionTitle>A. Identification du mandat</SectionTitle>
        <div className="px-6 py-3 bg-gray-50 text-xs text-gray-500 space-y-1 border-b border-gray-100">
          <p><span className="font-semibold text-gray-700">Type d&apos;encaissement :</span> Récurrent</p>
          <p><span className="font-semibold text-gray-700">Périodicité :</span> Mensuel</p>
          <p><span className="font-semibold text-gray-700">Description :</span> Convention pour la perception syndicale</p>
          <p className="text-amber-700 font-medium">La catégorie de cotisation et le numéro de mandat seront complétés par notre service.</p>
        </div>

        {/* ── SECTION B ── */}
        <SectionTitle>B. Coordonnées & Identification bancaire</SectionTitle>
        <div className="px-6 py-6 space-y-5">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <Field label="N° registre national (NISS) *" error={err.niss}>
            <input
              className={input(err.niss)}
              value={form.niss}
              onChange={e => set("niss", formatNiss(e.target.value))}
              placeholder="85.04.12-123.45"
              maxLength={15}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Field label="Rue *" error={err.adresseRue}>
                {form.pays.trim().toLowerCase() === "belgique" ? (
                  <AddressAutocomplete
                    value={form.adresseRue}
                    onChange={(v) => set("adresseRue", v)}
                    onSelect={(s) => {
                      setForm((prev) => ({
                        ...prev,
                        adresseRue: s.street,
                        adresseNumero: s.housenumber || prev.adresseNumero,
                        codePostal: s.postcode || prev.codePostal,
                        localite: s.city || prev.localite,
                      }));
                      setErrors((prev) => ({
                        ...prev,
                        adresseRue: undefined,
                        adresseNumero: undefined,
                        codePostal: undefined,
                        localite: undefined,
                      }));
                    }}
                  />
                ) : (
                  <input className={input(err.adresseRue)} value={form.adresseRue} onChange={e => set("adresseRue", e.target.value)} />
                )}
              </Field>
            </div>
            <Field label="N° *" error={err.adresseNumero}>
              <input className={input(err.adresseNumero)} value={form.adresseNumero} onChange={e => set("adresseNumero", e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Code postal *" error={err.codePostal}>
              <input className={input(err.codePostal)} value={form.codePostal} onChange={e => set("codePostal", e.target.value)} maxLength={6} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Localité *" error={err.localite}>
                <input className={input(err.localite)} value={form.localite} onChange={e => set("localite", e.target.value)} />
              </Field>
            </div>
          </div>

          <Field label="Pays *" error={err.pays}>
            <input className={input(err.pays)} value={form.pays} onChange={e => set("pays", e.target.value)} />
          </Field>

          <div className="border-t border-gray-100 pt-4 space-y-4">
            <Field label="Nouveau IBAN * (belge ou européen)" error={err.nouveauIban} hint="Commencez par BE pour un IBAN belge">
              <input
                className={input(err.nouveauIban)}
                value={form.nouveauIban}
                onChange={e => set("nouveauIban", formatIBAN(e.target.value))}
                placeholder="BE68 5390 0754 7034"
                maxLength={42}
              />
            </Field>

            <Field
              label="Nouveau BIC (obligatoire si IBAN non belge)"
              error={err.nouveauBic}
            >
              <input
                className={`${input(err.nouveauBic)} uppercase`}
                value={form.nouveauBic}
                onChange={e => set("nouveauBic", e.target.value.toUpperCase())}
                placeholder="GEBABEBB"
                maxLength={11}
              />
            </Field>

            {form.typeDemande === "changement_compte" && (
              <Field label="Ancien IBAN *" error={err.ancienIban}>
                <input
                  className={input(err.ancienIban)}
                  value={form.ancienIban}
                  onChange={e => set("ancienIban", formatIBAN(e.target.value))}
                  placeholder="BE68 5390 0754 7034"
                  maxLength={42}
                />
              </Field>
            )}

          </div>
        </div>

        {/* ── SECTION C ── */}
        <SectionTitle>C. Autorisation & Signature</SectionTitle>
        <div className="px-6 py-6 space-y-5">

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

          {form.typeDemande === "changement_compte" && (
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
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date *" error={err.dateSig}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="jj/mm/aaaa"
                className={input(err.dateSig)}
                value={form.dateSig}
                onChange={e => set("dateSig", formatDateFr(e.target.value))}
                maxLength={10}
              />
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
          <p className="text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-5">
            Vos données personnelles sont traitées conformément au règlement européen RGPD.{" "}
            <a href="https://www.accg.be/fr/protection-de-la-vie-privee" target="_blank" rel="noopener noreferrer" className="text-red-700 underline">
              Politique de confidentialité
            </a>{" "}
            · Questions : <a href="mailto:privacy@accg.be" className="text-red-700 underline">privacy@accg.be</a>
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-700 hover:bg-red-800 disabled:bg-red-300 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            {loading ? "Envoi en cours…" : "Envoyer ma demande"}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}

// ── Composants UI ────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-red-700 text-white px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em]">
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
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}

function input(error?: string) {
  return `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors ${
    error
      ? "border-red-400 focus:ring-red-300 bg-red-50"
      : "border-gray-300 focus:ring-red-200"
  }`;
}
