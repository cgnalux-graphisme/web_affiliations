"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Home, LogOut, Menu, UserRound, X } from "lucide-react";
import { deconnexion } from "../../login/actions";
import { pieger } from "../../pieger-focus";
import { icone } from "./icones";
import type { AppNav } from "./types";
import { FournisseurTransition, LienTransition } from "./Transition";
import { foncePourTexteBlanc } from "../../../lib/espace/couleurs";

export type ProfilCadre = { prenom: string; nomComplet: string; email: string; role: string; initiales: string };

/** Couleur d'accent du tableau de bord (hors app). */
const ACCENT_DEFAUT = "#E32119";

/** Section active d'une app : adresse la plus longue qui correspond, sinon un motif « aussi ». */
function sectionActive(app: AppNav, chemin: string) {
  let meilleure: AppNav["sections"][number] | null = null;
  for (const s of app.sections) {
    if ((chemin === s.route || chemin.startsWith(`${s.route}/`)) && (!meilleure || s.route.length > meilleure.route.length)) {
      meilleure = s;
    }
  }
  return meilleure ?? app.sections.find((s) => s.aussi?.some((m) => new RegExp(m, "i").test(chemin))) ?? null;
}

/**
 * Cadre de l'Espace CG : rail latéral (tableau de bord ou menu de l'app ouverte), fil d'Ariane, contenu.
 * Les apps reçues sont déjà filtrées côté serveur (site_mes_apps) : le navigateur ne décide d'aucun droit.
 */
export default function CadreEspace({
  apps,
  profil,
  children,
}: {
  apps: AppNav[];
  profil: ProfilCadre;
  children: React.ReactNode;
}) {
  const chemin = usePathname();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const railRef = useRef<HTMLElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  const codeApp = chemin.split("/")[2] ?? "";
  const app = apps.find((a) => a.code === codeApp) ?? null;
  const section = app ? sectionActive(app, chemin) : null;
  const surCompte = chemin.startsWith("/espace/compte");

  // Referme le tiroir mobile à chaque navigation.
  useEffect(() => setMenuOuvert(false), [chemin]);

  // Tiroir ouvert : Échap le referme, le focus entre dans le rail puis revient au bouton.
  useEffect(() => {
    if (!menuOuvert) return;
    const bouton = burgerRef.current;
    railRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const surTouche = (e: KeyboardEvent) => e.key === "Escape" && setMenuOuvert(false);
    window.addEventListener("keydown", surTouche);
    return () => {
      window.removeEventListener("keydown", surTouche);
      bouton?.focus();
    };
  }, [menuOuvert]);

  const couleur = app?.couleur ?? ACCENT_DEFAUT;
  // Couleur claire (ex. orange) : version foncée assombrie juste assez pour un texte blanc AA (sinon formule CSS).
  const fonce = foncePourTexteBlanc(couleur);
  const style = {
    "--app": couleur,
    ...(fonce.hex && fonce.part < 72 ? { "--app-fonce": fonce.hex } : {}),
  } as React.CSSProperties;

  return (
    <FournisseurTransition>
    <div className={`ecg${menuOuvert ? " ecg-menu-ouvert" : ""}`} style={style}>
      <a href="#contenu" className="ecg-evitement">
        Aller au contenu
      </a>

      <aside
        ref={railRef}
        id="rail-espace"
        className="ecg-rail"
        aria-label="Navigation de l'Espace CG"
        onKeyDown={(e) => menuOuvert && pieger(e, railRef.current)}
      >
        <LienTransition href="/espace" className="ecg-marque">
          <span className="ecg-marque-signe" aria-hidden>
            <span>CG</span>
          </span>
          <span>
            <b>Espace CG</b>
            <small>Namur-Luxembourg</small>
          </span>
        </LienTransition>

        <div className="ecg-rail-corps">
          {app ? (
            // key : rejoue l'entrée en glissé quand on change d'app.
            <nav key={app.code} aria-label={app.nom} className="ecg-entree">
              <LienTransition href="/espace" className="ecg-retour">
                <ChevronLeft size={18} aria-hidden /> Toutes mes apps
              </LienTransition>
              <div className="ecg-app-tete" style={{ "--i": 1 } as React.CSSProperties}>
                <span className="ecg-app-tete-ico" aria-hidden>
                  <IconeNom nom={app.icone} taille={20} />
                </span>
                <b>{app.nom}</b>
              </div>
              <ul className="ecg-nav">
                {app.sections.map((s, i) => (
                  <li key={s.route} style={{ "--i": i + 2 } as React.CSSProperties}>
                    <Link
                      href={s.route}
                      className="ecg-nav-lien"
                      aria-current={section?.route === s.route ? "page" : undefined}
                    >
                      <IconeNom nom={s.icone} taille={20} />
                      {s.libelle}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : (
            <nav key="accueil" aria-label="Espace CG" className="ecg-entree">
              <Link href="/espace" className="ecg-nav-lien" aria-current={chemin === "/espace" ? "page" : undefined}>
                <Home size={20} aria-hidden /> Tableau de bord
              </Link>
              {apps.length > 0 && (
                <>
                  <p className="ecg-nav-titre" id="titre-mes-apps">
                    Mes apps
                  </p>
                  <ul className="ecg-nav" aria-labelledby="titre-mes-apps">
                    {apps.map((a, i) => (
                      <li key={a.code} style={{ "--i": i + 1 } as React.CSSProperties}>
                        <LienTransition href={`/espace/${a.code}`} className="ecg-nav-lien">
                          <span className="ecg-mini" style={{ "--c": a.couleur } as React.CSSProperties} aria-hidden>
                            <IconeNom nom={a.icone} taille={15} />
                          </span>
                          {a.nom}
                        </LienTransition>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className="ecg-nav-titre" id="titre-mon-compte">
                Mon compte
              </p>
              <ul className="ecg-nav" aria-labelledby="titre-mon-compte">
                <li>
                  <Link href="/espace/compte" className="ecg-nav-lien" aria-current={surCompte ? "page" : undefined}>
                    <UserRound size={20} aria-hidden /> Profil et mot de passe
                  </Link>
                </li>
                <li>
                  <form action={deconnexion}>
                    <button type="submit" className="ecg-nav-lien">
                      <LogOut size={20} aria-hidden /> Se déconnecter
                    </button>
                  </form>
                </li>
              </ul>
            </nav>
          )}
        </div>

        <div className="ecg-rail-pied">
          <Link href="/espace/compte" className="ecg-moi" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="ecg-avatar" aria-hidden>
              {profil.initiales}
            </span>
            <span style={{ minWidth: 0 }}>
              <b title={profil.email}>{profil.nomComplet}</b>
              <small>{profil.role}</small>
            </span>
          </Link>
        </div>
      </aside>

      <button
        type="button"
        className="ecg-voile"
        aria-label="Fermer le menu"
        tabIndex={-1}
        onClick={() => setMenuOuvert(false)}
      />

      <div className="ecg-principal">
        <header className="ecg-barre">
          <button
            ref={burgerRef}
            type="button"
            className="ecg-burger"
            aria-expanded={menuOuvert}
            aria-controls="rail-espace"
            onClick={() => setMenuOuvert((o) => !o)}
          >
            {menuOuvert ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
            Menu
          </button>
          <nav className="ecg-ariane" aria-label="Fil d'Ariane">
            <ol>
              {app || surCompte || chemin !== "/espace" ? (
                <li>
                  <Link href="/espace">Tableau de bord</Link>
                </li>
              ) : (
                <li aria-current="page">Tableau de bord</li>
              )}
              {app && (
                <>
                  <li aria-hidden>/</li>
                  <li>
                    {section ? <Link href={app.sections[0].route}>{app.nom}</Link> : <span aria-current="page">{app.nom}</span>}
                  </li>
                </>
              )}
              {app && section && (
                <>
                  <li aria-hidden>/</li>
                  <li aria-current="page">{section.libelle}</li>
                </>
              )}
              {surCompte && (
                <>
                  <li aria-hidden>/</li>
                  <li aria-current="page">Mon compte</li>
                </>
              )}
            </ol>
          </nav>
        </header>
        <main id="contenu" className="ecg-contenu" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
    </FournisseurTransition>
  );
}

function IconeNom({ nom, taille }: { nom: string; taille: number }) {
  const Icone = icone(nom);
  return <Icone size={taille} strokeWidth={1.8} aria-hidden />;
}
