import { describe, expect, it } from "vitest";
import {
  appsDuRole,
  appsEffectives,
  bascule,
  etatApp,
  exceptionsInutiles,
  phraseJournal,
  quandJournal,
  refusChangementRole,
  refusGestion,
  refusSuppression,
  refusSuspension,
  type Exception,
} from "./gestion-acces";

const ORDRE = ["actions", "scan-news", "demarches", "parametres"];
const ROLES = [
  { app_code: "actions", role: "SUPER_ADMIN" },
  { app_code: "demarches", role: "ADMIN_OP" },
];

describe("apps d'une personne", () => {
  it("SUPER_ADMIN : toutes les apps, sans regarder site_app_roles", () => {
    expect(appsDuRole("SUPER_ADMIN", ROLES, ORDRE)).toEqual(ORDRE);
    expect(appsEffectives("SUPER_ADMIN", ORDRE, [{ id: "1", app_code: "actions", type: "retrait" }], ORDRE)).toHaveLength(4);
  });

  it("rôle moins les retraits plus les ajouts, dans l'ordre du catalogue", () => {
    const base = appsDuRole("ADMIN_OP", ROLES, ORDRE);
    const ex: Exception[] = [
      { id: "1", app_code: "demarches", type: "retrait" },
      { id: "2", app_code: "actions", type: "ajout" },
    ];
    expect(appsEffectives("ADMIN_OP", base, ex, ORDRE)).toEqual([{ code: "actions", origine: "exception" }]);
    expect(appsEffectives("ADMIN_OP", base, [], ORDRE)).toEqual([{ code: "demarches", origine: "role" }]);
  });

  it("état d'une app", () => {
    expect(etatApp("demarches", ["demarches"], [])).toBe("role");
    expect(etatApp("demarches", ["demarches"], [{ id: "1", app_code: "demarches", type: "retrait" }])).toBe("retiree");
    expect(etatApp("actions", ["demarches"], [{ id: "1", app_code: "actions", type: "ajout" }])).toBe("ajoutee");
    expect(etatApp("actions", ["demarches"], [])).toBe("aucun");
  });
});

describe("interrupteur d'app", () => {
  const base = ["demarches"];
  it("éteindre une app du rôle crée un retrait, la rallumer le supprime", () => {
    expect(bascule("demarches", false, base, [])).toEqual({ faire: "creer", type: "retrait" });
    expect(bascule("demarches", true, base, [{ id: "r", app_code: "demarches", type: "retrait" }])).toEqual({ faire: "supprimer", id: "r" });
  });
  it("allumer une app hors rôle crée un ajout, l'éteindre le supprime", () => {
    expect(bascule("actions", true, base, [])).toEqual({ faire: "creer", type: "ajout" });
    expect(bascule("actions", false, base, [{ id: "a", app_code: "actions", type: "ajout" }])).toEqual({ faire: "supprimer", id: "a" });
  });
  it("rien à faire quand l'état demandé est déjà en place", () => {
    expect(bascule("demarches", true, base, [])).toEqual({ faire: "rien" });
    expect(bascule("actions", false, base, [])).toEqual({ faire: "rien" });
  });
  it("exception devenue inutile : supprimée", () => {
    expect(bascule("demarches", false, base, [{ id: "x", app_code: "demarches", type: "ajout" }])).toEqual({ faire: "supprimer", id: "x" });
  });
  it("exceptions inutiles après un changement de rôle", () => {
    const ex: Exception[] = [
      { id: "1", app_code: "demarches", type: "ajout" },
      { id: "2", app_code: "actions", type: "retrait" },
      { id: "3", app_code: "scan-news", type: "ajout" },
    ];
    expect(exceptionsInutiles(["demarches"], ex, "ADMIN_OP").map((e) => e.id)).toEqual(["1", "2"]);
    expect(exceptionsInutiles(ORDRE, ex, "SUPER_ADMIN")).toHaveLength(3);
  });
});

describe("garde-fous", () => {
  const fred = { id: "f", role: "SUPER_ADMIN" };
  const jo = { id: "j", role: "SUPER_ADMIN" };
  const marie = { id: "m", role: "ADMIN_OP" };
  it("impossible de retirer son propre rôle de super admin", () => {
    expect(refusChangementRole(fred, fred, "ADMIN_OP", [fred, jo])).toMatch(/propre rôle/);
  });
  it("impossible de supprimer le dernier super admin", () => {
    expect(refusChangementRole(fred, jo, "ADMIN_OP", [fred, jo])).toBeNull();
    expect(refusChangementRole({ id: "x", role: "SUPER_ADMIN" }, fred, "PERMANENT", [fred])).toMatch(/au moins un/);
  });
  it("changer un rôle : super admin uniquement", () => {
    expect(refusChangementRole(marie, { id: "p", role: "PERMANENT" }, "ADMIN_OP", [fred])).toMatch(/Seul un super admin/);
  });
  it("suspension : jamais soi-même, jamais le dernier super admin actif", () => {
    expect(refusSuspension(fred, fred, [fred, jo])).toMatch(/propre accès/);
    expect(refusSuspension(fred, jo, [fred, jo])).toBeNull();
    expect(refusSuspension(fred, jo, [{ ...fred, suspendu: true }, jo])).toMatch(/au moins un super admin actif/);
    expect(refusSuspension(marie, jo, [fred, jo])).toMatch(/Seul un super admin/);
  });
  it("suppression définitive : super admin seulement, jamais soi-même, jamais le dernier super admin", () => {
    const paul = { id: "p", role: "PERMANENT" };
    expect(refusSuppression(fred, paul, [fred, jo, paul])).toBeNull();
    expect(refusSuppression(fred, jo, [fred, jo])).toBeNull();
    expect(refusSuppression(fred, fred, [fred, jo])).toMatch(/propre compte/);
    expect(refusSuppression(marie, paul, [fred, paul])).toMatch(/Seul un super admin/);
    expect(refusSuppression({ id: "x", role: "SUPER_ADMIN" }, fred, [fred])).toMatch(/au moins un/);
  });
  it("un non-super-admin ne gère pas un super admin", () => {
    expect(refusGestion(marie, fred)).toMatch(/Seul un super admin/);
    expect(refusGestion(fred, marie)).toBeNull();
  });
});

describe("journal", () => {
  const c = { auteur: "Fred", cible: "Marie Dupont", nomApp: () => "Actions syndicales", nomRole: (r?: string) => (r === "ADMIN_OP" ? "Admin opérationnel" : "Permanent") };
  it("phrases lisibles", () => {
    expect(phraseJournal("app_ajout", { app: "actions" }, c)).toBe("Fred a donné l'accès à Actions syndicales à Marie Dupont");
    expect(phraseJournal("role", { avant: "PERMANENT", apres: "ADMIN_OP" }, c)).toBe(
      "Fred a changé le rôle de Marie Dupont : Permanent → Admin opérationnel"
    );
    expect(phraseJournal("suspension", {}, c)).toBe("Fred a suspendu l'accès de Marie Dupont");
    expect(phraseJournal("suppression_compte", { nom: "Paul Martin" }, { ...c, cible: "Compte supprimé" })).toBe(
      "Fred a supprimé définitivement le compte de Paul Martin"
    );
  });
  it("date jj/mm/aaaa à l'heure de Bruxelles", () => {
    expect(quandJournal("2026-10-08T12:32:00Z")).toBe("le 08/10/2026 à 14:32");
  });
});
