import { NextResponse } from "next/server";
import { EMAIL_GENERAL } from "@/lib/bureaux";
import { CHAMP_PIEGE, nettoyerContact, validerContact } from "@/lib/contact";
import { htmlContact, sujetContact } from "@/lib/contact-email";
import { isoToDateFr } from "@/lib/dates";
import { getFromEmail, getResendClient } from "@/lib/resend-mail";

/**
 * Formulaire de contact public : un e-mail vers l'adresse générale, « Répondre à » = le visiteur.
 * Rien n'est enregistré ni journalisé (le contenu du message n'apparaît jamais dans les logs).
 */
export async function POST(request: Request) {
  let corps: Record<string, unknown>;
  try {
    corps = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requête illisible." }, { status: 400 });
  }

  // Champ piège rempli : on fait comme si tout s'était bien passé, sans rien envoyer.
  if (typeof corps[CHAMP_PIEGE] === "string" && corps[CHAMP_PIEGE].trim() !== "") {
    return NextResponse.json({ success: true });
  }

  const message = nettoyerContact(corps);
  const erreurs = validerContact(message);
  if (Object.keys(erreurs).length > 0) {
    return NextResponse.json({ error: "Certains champs sont à corriger.", erreurs }, { status: 400 });
  }

  const maintenant = new Date();
  const heure = new Intl.DateTimeFormat("fr-BE", {
    timeZone: "Europe/Brussels",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(maintenant);
  const jour = isoToDateFr(
    new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Brussels" }).format(maintenant) // aaaa-mm-jj
  );

  try {
    const { error } = await getResendClient().emails.send({
      from: getFromEmail(),
      to: [EMAIL_GENERAL],
      replyTo: message.email,
      subject: sujetContact(message),
      html: htmlContact(message, `${jour} à ${heure}`),
    });
    if (error) {
      console.error("[contact] Échec Resend :", error.name);
      return NextResponse.json({ error: "envoi" }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contact] Erreur :", err instanceof Error ? err.message : "inconnue");
    return NextResponse.json({ error: "envoi" }, { status: 500 });
  }
}
