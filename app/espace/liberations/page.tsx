import { redirect } from "next/navigation";
import { routeSection } from "../_noyau/types";
import { manifeste } from "./manifeste";

export default function Page() {
  redirect(routeSection(manifeste.code, manifeste.sections[0].chemin));
}
