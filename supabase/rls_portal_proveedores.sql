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

-- NOTA: el proveedor NO puede leer supplierChangeRequests (solo insertar), ni leer
-- 'suppliers' ni ninguna otra colección. La Central (usuarios internos, miembros)
-- lee y aprueba con la política general erp_data_select.

-- Verificación:
--   select policyname, cmd, roles from pg_policies
--   where schemaname='public' and tablename='erp_data'
--     and policyname like 'erp_portal%';
