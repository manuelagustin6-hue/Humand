-- ============================================================================
--  RLS — Portal de Proveedores (acceso externo acotado)
--  Ejecutar en el SQL Editor de Supabase (una vez).
--
--  Contexto: la política general `erp_data_select` solo deja leer a MIEMBROS de
--  la empresa (erp_is_member). El portal externo usa la anon key y el proveedor
--  NO es miembro, así que sin estas políticas el portal no puede leer la
--  invitación → "link no válido".
--
--  Diseño seguro: el portal solo necesita
--    (1) LEER las invitaciones (el token del link es el secreto), y
--    (2) INSERTAR solicitudes de cambio (que se revisan/aprueban antes de aplicar).
--  El portal NUNCA lee la tabla de proveedores ni escribe datos autoritativos,
--  así que no expone CBUs ni permite modificar nada directamente.
-- ============================================================================

-- (1) Lectura de invitaciones del portal (anon + autenticado).
--     Solo la colección de invitaciones; el token es el secreto que valida el acceso.
drop policy if exists erp_portal_invites_select on public.erp_data;
create policy erp_portal_invites_select on public.erp_data
  for select
  to anon, authenticated
  using (collection = 'supplierPortalInvites' and deleted = false);

-- (2) Alta de solicitudes de cambio desde el portal (solo INSERT, sin lectura).
--     Se restringe a la colección de solicitudes y a estado 'pending' de origen 'portal'.
--     No se aplican solas: quedan para aprobación en la Central de Proveedores.
drop policy if exists erp_portal_changereq_insert on public.erp_data;
create policy erp_portal_changereq_insert on public.erp_data
  for insert
  to anon, authenticated
  with check (
    collection = 'supplierChangeRequests'
    and (data->>'status') = 'pending'
    and (data->>'source') = 'portal'
  );

-- ============================================================================
--  (3) DASHBOARD EN VIVO: el proveedor lee SOLO su propia ficha.
--  Vinculación segura cuenta(auth.uid) ↔ supplier_id, gateada por el token de la
--  invitación (que solo el proveedor invitado tiene). No requiere edge function.
-- ============================================================================

-- 3a) El proveedor crea su vínculo (uid -> supplier_id) SOLO si el token+supplier_id
--     coinciden con una invitación real. Así no puede vincularse a otro proveedor.
drop policy if exists erp_portal_account_insert on public.erp_data;
create policy erp_portal_account_insert on public.erp_data
  for insert to authenticated
  with check (
    collection = 'supplierPortalAccounts'
    and (data->>'uid') = auth.uid()::text
    and exists (
      select 1 from public.erp_data i
      where i.collection = 'supplierPortalInvites'
        and i.deleted = false
        and i.data->>'token' = erp_data.data->>'token'
        and i.data->>'supplier_id' = erp_data.data->>'supplier_id'
    )
  );

-- 3b) El proveedor lee/actualiza SOLO su propio vínculo.
drop policy if exists erp_portal_account_select on public.erp_data;
create policy erp_portal_account_select on public.erp_data
  for select to authenticated
  using (collection = 'supplierPortalAccounts' and (data->>'uid') = auth.uid()::text);

drop policy if exists erp_portal_account_update on public.erp_data;
create policy erp_portal_account_update on public.erp_data
  for update to authenticated
  using (collection = 'supplierPortalAccounts' and (data->>'uid') = auth.uid()::text)
  with check (collection = 'supplierPortalAccounts' and (data->>'uid') = auth.uid()::text);

-- 3c) El proveedor lee SOLO su propia ficha de proveedor (la vinculada a su uid).
drop policy if exists erp_portal_supplier_select on public.erp_data;
create policy erp_portal_supplier_select on public.erp_data
  for select to authenticated
  using (
    collection = 'suppliers'
    and exists (
      select 1 from public.erp_data a
      where a.collection = 'supplierPortalAccounts'
        and a.data->>'uid' = auth.uid()::text
        and a.data->>'supplier_id' = erp_data.record_id
    )
  );

-- NOTA: el proveedor NO puede leer supplierChangeRequests de otros ni ninguna otra
-- colección. Solo su vínculo, su propia ficha (en vivo) y crear solicitudes.
-- La Central (usuarios internos, miembros) sigue con la política general.

-- Verificación:
--   select policyname, cmd, roles from pg_policies
--   where schemaname='public' and tablename='erp_data'
--     and policyname like 'erp_portal%';
