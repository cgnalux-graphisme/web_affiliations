/** Rôles de profiles.role (table partagée avec CG Link). */
export const ROLES = ["SUPER_ADMIN", "ADMIN_OP", "PERMANENT", "DELEGATE"] as const;
export type Role = (typeof ROLES)[number];

/** L'équipe entre toujours dans l'Espace CG (même sans app). Les délégués n'y entrent que si la base leur donne une app. */
export const ROLES_EQUIPE = ["SUPER_ADMIN", "ADMIN_OP", "PERMANENT"] as const;

export const LIBELLES_ROLE: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN_OP: "Admin opérationnel",
  PERMANENT: "Permanent",
  DELEGATE: "Délégué",
};

export function libelleRole(role: string): string {
  return LIBELLES_ROLE[role] ?? (role || "Sans rôle");
}
