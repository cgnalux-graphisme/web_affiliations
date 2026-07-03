import { NextResponse } from "next/server";
import { buildOnemBundleHtml } from "@/lib/onem-email-html";
import { getResendClient, sendIsolatedEmail } from "@/lib/resend-mail";

const ADMIN_EMAIL = "jonathan.hubert@accg.be";
const OP_EMAIL = "op.namlux@fgtb.be";

interface AttachmentPayload {
  pdfBase64: string;
  fileName: string;
}

interface Payload {
  nom: string;
  prenom: string;
  email: string;
  c1: AttachmentPayload;
  c32: AttachmentPayload;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const { nom, prenom, email, c1, c32 } = body;

    if (!nom || !prenom || !c1?.pdfBase64 || !c1?.fileName || !c32?.pdfBase64 || !c32?.fileName) {
      return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
    }

    const resend = getResendClient();

    const { error } = await sendIsolatedEmail(resend, {
      bcc: [ADMIN_EMAIL, OP_EMAIL, email],
      subject: `Formulaires C1 et C3.2 — ${prenom} ${nom}`,
      html: buildOnemBundleHtml({ nom, prenom, email, adminEmail: ADMIN_EMAIL }),
      attachments: [
        { filename: c1.fileName, content: Buffer.from(c1.pdfBase64, "base64") },
        { filename: c32.fileName, content: Buffer.from(c32.pdfBase64, "base64") },
      ],
    });

    if (error) {
      console.error("[send-onem-bundle] Erreur Resend :", error);
      return NextResponse.json({ error: "Échec envoi email." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-onem-bundle] Erreur :", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
