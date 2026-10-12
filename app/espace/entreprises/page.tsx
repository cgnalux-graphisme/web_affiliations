import { redirect } from "next/navigation";
import { routeSection } from "../_noyau/types";
import { manifeste } from "./manifeste";

/** L'app s'ouvre sur sa première section. */
export default function Page() {
  redirect(routeSection(manifeste.code, manifeste.sections[0].chemin));
}
