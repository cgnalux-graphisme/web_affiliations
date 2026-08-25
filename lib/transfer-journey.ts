import type { PersonProfile } from "./person-profile";

export type JourneyPhase = "intro" | "affiliation" | "c1" | "c32" | "complete";

export interface JourneyPdf {
  key: "affiliation" | "c1" | "c32";
  label: string;
  fileName: string;
  pdfBase64: string;
}

export interface TransferJourneyState {
  phase: JourneyPhase;
  profile: PersonProfile | null;
  pdfs: JourneyPdf[];
  /** E-mail groupé C1+C3.2 déjà envoyé (évite un doublon en cas de re-soumission). */
  onemEmailSent?: boolean;
  updatedAt: string;
}

const STORAGE_KEY = "fgtb_transfer_journey";

export function loadTransferJourney(): TransferJourneyState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TransferJourneyState;
  } catch {
    return null;
  }
}

export function saveTransferJourney(state: TransferJourneyState): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...state, updatedAt: new Date().toISOString() })
  );
}

export function clearTransferJourney(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function createInitialJourneyState(): TransferJourneyState {
  return {
    phase: "intro",
    profile: null,
    pdfs: [],
    updatedAt: new Date().toISOString(),
  };
}

export function downloadPdfFromBase64(pdfBase64: string, fileName: string): void {
  const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
