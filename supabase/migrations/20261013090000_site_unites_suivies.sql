-- ════════════════════════════════════════════════════════════════════════════
-- Unités d'établissement « suivies » par la CG (demande de Fred, 13/10/2026).
-- La BCE renvoie toutes les unités, y compris hors de nos provinces : elles restent sur la fiche pour info,
-- mais seules les unités suivies apparaissent dans les autres menus (adresse postale d'un site, délégués).
-- Par défaut : suivie si le code postal est dans la province de Namur (5000-5999) ou de Luxembourg
-- (6600-6999) ; modifiable à la main. Idempotente : peut être rejouée.
-- ════════════════════════════════════════════════════════════════════════════

-- Colonne ajoutée une seule fois ; les unités déjà importées sont alors classées d'après leur code postal.
-- Rejouer la migration ne touche plus aux cases cochées ou décochées à la main.
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'site_entreprise_unites' and column_name = 'suivie') then
    alter table public.site_entreprise_unites add column suivie boolean not null default true;
    update public.site_entreprise_unites
    -- case : la conversion en nombre n'est tentée que sur un code postal à 4 chiffres.
    set suivie = case when code_postal ~ '^[0-9]{4}$'
                      then code_postal::int between 5000 and 5999 or code_postal::int between 6600 and 6999
                      else false end;
  end if;
end $$;
comment on column public.site_entreprise_unites.suivie is
  'Unité suivie par la CG (nos provinces) : seules celles-ci apparaissent dans les autres menus.';

-- Import BCE : la colonne suivie est reçue de l'app (calculée d'après le code postal).
create or replace function public.site_appliquer_bce(p_entreprise uuid, p_maj jsonb, p_inserer jsonb, p_modifier jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_site uuid;
  m jsonb;
  x jsonb;
begin
  if not (select public.site_a_app('entreprises')) then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  select id into v_site from public.site_entreprise_sites where entreprise_id = p_entreprise and principal;

  insert into public.site_entreprise_unites
    (entreprise_id, site_id, origine, numero_ue, denomination, rue, numero, boite, code_postal, localite, statut, date_debut, suivie)
  select p_entreprise, v_site, 'bce', r.numero_ue, r.denomination, r.rue, r.numero, r.boite, r.code_postal, r.localite,
         coalesce(r.statut, 'actif'), r.date_debut, coalesce(r.suivie, true)
  from jsonb_to_recordset(coalesce(p_inserer, '[]'::jsonb)) as r(
    numero_ue text, denomination text, rue text, numero text, boite text, code_postal text, localite text, statut text, date_debut date, suivie boolean);

  for m in select * from jsonb_array_elements(coalesce(p_modifier, '[]'::jsonb)) loop
    x := m -> 'maj';
    update public.site_entreprise_unites u set
      denomination = case when x ? 'denomination' then x ->> 'denomination' else u.denomination end,
      rue          = case when x ? 'rue' then x ->> 'rue' else u.rue end,
      numero       = case when x ? 'numero' then x ->> 'numero' else u.numero end,
      boite        = case when x ? 'boite' then x ->> 'boite' else u.boite end,
      code_postal  = case when x ? 'code_postal' then x ->> 'code_postal' else u.code_postal end,
      localite     = case when x ? 'localite' then x ->> 'localite' else u.localite end,
      statut       = case when x ? 'statut' then x ->> 'statut' else u.statut end,
      date_debut   = case when x ? 'date_debut' then (x ->> 'date_debut')::date else u.date_debut end
    where u.id = (m ->> 'id')::uuid and u.entreprise_id = p_entreprise;
    if not found then
      raise exception 'Unité introuvable.' using errcode = 'P0002';
    end if;
  end loop;

  update public.site_entreprises e set
    denomination_bce  = case when p_maj ? 'denomination_bce' then p_maj ->> 'denomination_bce' else e.denomination_bce end,
    siege_rue         = case when p_maj ? 'siege_rue' then p_maj ->> 'siege_rue' else e.siege_rue end,
    siege_numero      = case when p_maj ? 'siege_numero' then p_maj ->> 'siege_numero' else e.siege_numero end,
    siege_boite       = case when p_maj ? 'siege_boite' then p_maj ->> 'siege_boite' else e.siege_boite end,
    siege_code_postal = case when p_maj ? 'siege_code_postal' then p_maj ->> 'siege_code_postal' else e.siege_code_postal end,
    siege_localite    = case when p_maj ? 'siege_localite' then p_maj ->> 'siege_localite' else e.siege_localite end,
    bce_importe_le    = now()
  where e.id = p_entreprise;
  if not found then
    raise exception 'Fiche introuvable.' using errcode = 'P0002';
  end if;
end $$;
revoke all on function public.site_appliquer_bce(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.site_appliquer_bce(uuid, jsonb, jsonb, jsonb) to authenticated;
