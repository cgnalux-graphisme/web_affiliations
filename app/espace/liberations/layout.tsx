import GardeApp from "../_noyau/GardeApp";

/** Admin (ADMIN_OP, SUPER_ADMIN) : tous les dossiers ; toute autre personne qui a l'app (les permanents) : ses dossiers. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <GardeApp code="liberations">{children}</GardeApp>;
}
