import type { Metadata } from "next";
import { LogOut, UserRound } from "lucide-react";
import { monProfil } from "../../../lib/espace/acces";
import { libelleRole } from "../../../lib/espace/roles";
import { deconnexion } from "../../login/actions";
import { appsDeLaPersonne } from "../_noyau/registre";
import { icone } from "../_noyau/icones";
import FormulaireMotDePasse from "./FormulaireMotDePasse";

export const metadata: Metadata = { title: "Mon compte — Espace CG" };

/** Mon compte : profil (lecture seule : nom, e-mail et rôle sont partagés avec CG Link), mot de passe, déconnexion. */
export default async function MonCompte() {
  const [profil, apps] = await Promise.all([monProfil(), appsDeLaPersonne()]);
  if (!profil) return null;

  return (
    <div className="ecg-vue">
      <div className="ecg-entete">
        <span className="ecg-entete-ico" aria-hidden>
          <UserRound size={26} strokeWidth={1.8} />
        </span>
        <div>
          <h1>Mon compte</h1>
          <p>Votre profil et votre mot de passe, les mêmes que dans CG Link.</p>
        </div>
        <div className="ecg-entete-actions">
          <form action={deconnexion}>
            <button type="submit" className="ecg-btn">
              <LogOut size={18} aria-hidden /> Se déconnecter
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ecg-panneau" aria-labelledby="titre-profil">
          <div className="ecg-panneau-tete">
            <h2 id="titre-profil">Profil</h2>
          </div>
          <dl className="ecg-panneau-corps grid gap-3 text-[15px]">
            <div>
              <dt className="text-sm font-semibold">Nom</dt>
              <dd>{profil.nom || "Non renseigné"}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold">Adresse e-mail</dt>
              <dd className="break-all">{profil.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold">Rôle</dt>
              <dd>{libelleRole(profil.role)}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold">Mes apps</dt>
              <dd>
                {apps.length === 0 ? (
                  "Aucune pour le moment"
                ) : (
                  <ul className="mt-1 flex flex-wrap gap-2">
                    {apps.map((a) => {
                      const Icone = icone(a.icone);
                      return (
                        <li
                          key={a.code}
                          className="inline-flex items-center gap-2 rounded-full border border-[#dde2e7] py-1 pl-1 pr-3 text-sm font-semibold"
                        >
                          <span
                            className="ecg-mini"
                            style={{ "--c": a.couleur, width: 22, height: 22 } as React.CSSProperties}
                            aria-hidden
                          >
                            <Icone size={13} strokeWidth={2.2} />
                          </span>
                          {a.nom}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </dd>
            </div>
          </dl>
          <p className="ecg-panneau-corps pt-0 text-sm text-[#56646f]">
            Une erreur dans votre nom ou votre adresse ? Demandez la correction à un super admin.
          </p>
        </section>

        <section className="ecg-panneau" aria-labelledby="titre-mdp">
          <div className="ecg-panneau-tete">
            <h2 id="titre-mdp">Mot de passe</h2>
          </div>
          <div className="ecg-panneau-corps">
            <FormulaireMotDePasse />
          </div>
        </section>
      </div>
    </div>
  );
}
