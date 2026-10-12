import { LogOut, Users } from "lucide-react";
import { deconnexion } from "../../login/actions";

/** Compte connecté sans accès à l'Espace (délégués pour l'instant) : écran plein, sans menu. */
export default function EspaceReserve({ prenom }: { prenom: string }) {
  return (
    <div className="ecg" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
      <main id="contenu" className="ecg-contenu" style={{ alignSelf: "center", maxWidth: 640 }}>
        <div className="ecg-panneau ecg-vue">
          <div className="ecg-vide">
            <span className="ecg-vide-ico" aria-hidden>
              <Users size={26} strokeWidth={1.8} />
            </span>
            <h1 className="ecg-vide-titre">Espace réservé à l&apos;équipe</h1>
            <p>
              {prenom ? `${prenom}, votre` : "Votre"} compte est bien reconnu, mais l&apos;Espace CG est pour
              l&apos;instant réservé à l&apos;équipe de la Centrale (permanents et administration). Vos outils de
              délégué restent dans CG Link.
            </p>
            <form action={deconnexion}>
              <button type="submit" className="ecg-btn">
                <LogOut size={18} aria-hidden /> Se déconnecter
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
