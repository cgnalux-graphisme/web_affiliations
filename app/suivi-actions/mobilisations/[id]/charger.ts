import { redirect, notFound } from "next/navigation";
import type { Mobilisation } from "../../../../lib/mobilisations";
import { getSuperAdmin, getSupabaseServer } from "../../../../lib/supabase-server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Une mobilisation de la table (super admin uniquement), ou 404. */
export async function chargerMobilisationAdmin(id: string, retour: string): Promise<Mobilisation> {
  if (!(await getSuperAdmin())) redirect(`/login?next=${encodeURIComponent(retour)}`);
  if (!UUID.test(id)) notFound();
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.from("site_mobilisations").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Chargement de la mobilisation impossible : ${error.message}`);
  if (!data) notFound();
  return data as Mobilisation;
}
