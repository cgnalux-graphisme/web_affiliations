import { NextResponse } from "next/server";
import { buildC1Html } from "@/lib/onem-email-html";
import { getResendClient, sendIsolatedEmail } from "@/lib/resend-mail";

const ADMIN_EMAIL = "jonathan.hubert@accg.be";
const OP_EMAIL = "op.namlux@fgtb.be";

interface Payload {
  nom: string;
  prenom: string;
  email: string;
  pdfBase64: string;
  fileName: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const { nom, prenom, email, pdfBase64, fileName } = body;

    if (!nom || !prenom || !pdfBase64 || !fileName) {
      return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
    }

    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const resend = getResendClient();

    const { error } = await sendIsolatedEmail(resend, {
      bcc: [ADMIN_EMAIL, OP_EMAIL, email],
      subject: `Formulaire C1 — ${prenom} ${nom}`,
      html: buildC1Html({ nom, prenom, email, adminEmail: ADMIN_EMAIL }),
      attachments: [{ filename: fileName, content: pdfBuffer }],
    });

    if (error) {
      console.error("[send-c1] Erreur Resend :", error);
      return NextResponse.json({ error: "Échec envoi email." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-c1] Erreur :", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
