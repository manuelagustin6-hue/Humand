-- ============================================================================
--  Rise — Row Level Security (RLS) + control de acceso server-side
-- ============================================================================
--  Objetivo: que un usuario logueado SOLO pueda leer/escribir datos de las
--  empresas a las que pertenece, aplicado por el servidor (Postgres), no por
--  el navegador. Hoy la seguridad depende del cliente y es evitable.
--
--  Modelo: una tabla de MEMBRESÍAS (usuario Supabase Auth ↔ empresa ↔ rol).
--  Las policies de erp_data consultan esa tabla vía funciones security-definer.
--
--  ⚠️  IMPORTANTE — CORRER POR PASOS, EN ORDEN, REVISANDO ENTRE CADA UNO.
--      No pegues todo de una. El PASO 4 activa RLS: si las membresías no
--      están bien cargadas (PASO 2/3), los usuarios quedan SIN acceso.
--      Al final está el ROLLBACK para desactivar RLS si algo sale mal.
-- ============================================================================


-- ============================================================================
--  PASO 0 — PRE-VUELO (solo lectura, no cambia nada)
--  Muestra usuarios activos de la app que NO tienen cuenta de Supabase Auth.
--  Esos usuarios quedarían BLOQUEADOS al activar RLS hasta que se les cree
--  la cuenta (Authentication → Users → Add user, o invitación por email).
-- ============================================================================
select d.company_id,
       d.data->>'email' as email,
       d.data->>'name'  as nombre,
       d.data->>'role'  as rol
from public.erp_data d
where d.collection = 'users'
  and d.deleted = false
  and coalesce((d.data->>'active')::boolean, true) = true
  and not exists (
    select 1 from auth.users au
    where lower(au.email) = lower(d.data->>'email')
  )
order by d.company_id, email;
-- Si esta consulta devuelve filas: creá esas cuentas de Auth ANTES del PASO 4,
-- o esos usuarios no van a poder trabajar contra la nube.


-- ============================================================================
--  PASO 1 — Tabla de membresías + funciones de ayuda + sus policies
--  (No activa RLS sobre erp_data todavía; es seguro correrlo.)
-- ============================================================================
create table if not exists public.erp_membership (
  user_id    uuid    not null references auth.users(id) on delete cascade,
  company_id text    not null,
  role       text    not null default 'viewer',
  can_write  boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

alter table public.erp_membership enable row level security;

-- ¿El usuario actual es miembro de la empresa?  (bypassea RLS de la propia tabla)
create or replace function public.erp_is_member(cid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.erp_membership m
    where m.user_id = auth.uid() and m.company_id = cid
  );
$$;

-- ¿Puede escribir en esa empresa?
create or replace function public.erp_can_write(cid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.erp_membership m
    where m.user_id = auth.uid() and m.company_id = cid and m.can_write
  );
$$;

-- ¿Es admin de esa empresa?  (para que un admin gestione membresías)
create or replace function public.erp_is_admin(cid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.erp_membership m
    where m.user_id = auth.uid() and m.company_id = cid and m.role = 'admin'
  );
$$;

-- RPC: un admin de la empresa otorga/actualiza la membresía de alguien por EMAIL.
-- Se llama desde la app al crear/editar un usuario. Si la persona aún no tiene
-- cuenta de Auth, no hace nada (se sembrará luego con el PASO 2 o al crearla).
create or replace function public.erp_grant_membership(p_email text, p_company text, p_role text)
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if not public.erp_is_admin(p_company) then
    raise exception 'No autorizado para gestionar membresías de %', p_company;
  end if;
  select id into v_uid from auth.users where lower(email) = lower(p_email) limit 1;
  if v_uid is null then
    return 'sin_cuenta_auth';   -- el usuario todavía no tiene cuenta de Supabase Auth
  end if;
  insert into public.erp_membership (user_id, company_id, role, can_write)
  values (v_uid, p_company,
          coalesce(nullif(p_role,''),'viewer'),
          coalesce(nullif(p_role,''),'viewer') <> 'viewer')
  on conflict (user_id, company_id)
  do update set role = excluded.role, can_write = excluded.can_write;
  return 'ok';
end;
$$;

-- RPC: el usuario autenticado se auto-otorga su membresía a partir de los
-- usuarios ya cargados en la app (match por email). Seguro: solo concede acceso
-- a las empresas donde su email ya figura como usuario ACTIVO. Se llama desde la
-- app en cada login para que la cobertura de membresías se complete sola.
create or replace function public.erp_self_membership()
returns integer language plpgsql security definer set search_path = public as $$
declare v_email text; v_count int := 0;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then return 0; end if;
  insert into public.erp_membership (user_id, company_id, role, can_write)
  select auth.uid(), d.company_id,
         coalesce(nullif(d.data->>'role',''),'viewer'),
         coalesce(nullif(d.data->>'role',''),'viewer') <> 'viewer'
  from public.erp_data d
  where d.collection = 'users' and d.deleted = false
    and lower(d.data->>'email') = lower(v_email)
    and coalesce((d.data->>'active')::boolean, true) = true
  on conflict (user_id, company_id)
  do update set role = excluded.role, can_write = excluded.can_write;
  get diagnostics v_count = row_count;
  return v_count;
end; $$;

-- RPC: un admin revoca la membresía de alguien (baja/eliminación de usuario).
create or replace function public.erp_revoke_membership(p_email text, p_company text)
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if not public.erp_is_admin(p_company) then
    raise exception 'No autorizado para gestionar membresías de %', p_company;
  end if;
  select id into v_uid from auth.users where lower(email) = lower(p_email) limit 1;
  if v_uid is null then return 'sin_cuenta_auth'; end if;
  delete from public.erp_membership where user_id = v_uid and company_id = p_company;
  return 'ok';
end;
$$;

-- Policies de la tabla de membresías:
drop policy if exists membership_self_read    on public.erp_membership;
drop policy if exists membership_admin_manage on public.erp_membership;

-- cada usuario ve sus propias membresías
create policy membership_self_read on public.erp_membership
  for select using (user_id = auth.uid());

-- un admin de la empresa puede alta/baja/modificar membresías de esa empresa
create policy membership_admin_manage on public.erp_membership
  for all using (public.erp_is_admin(company_id))
  with check (public.erp_is_admin(company_id));


-- ============================================================================
--  PASO 2 — Sembrar membresías desde los usuarios ya cargados en la app
--  Matchea por EMAIL: auth.users  ↔  erp_data (collection 'users').
--  role viewer => solo lectura; cualquier otro rol => puede escribir.
--  Es idempotente (on conflict do nothing): se puede correr varias veces.
-- ============================================================================
insert into public.erp_membership (user_id, company_id, role, can_write)
select au.id,
       d.company_id,
       coalesce(nullif(d.data->>'role',''), 'viewer') as role,
       coalesce(nullif(d.data->>'role',''), 'viewer') <> 'viewer' as can_write
from auth.users au
join public.erp_data d
  on d.collection = 'users'
 and d.deleted = false
 and lower(d.data->>'email') = lower(au.email)
 and coalesce((d.data->>'active')::boolean, true) = true
on conflict (user_id, company_id) do nothing;

-- (Opcional) Garantizá tu propio acceso admin explícito por las dudas.
-- Reemplazá el email y el company_id por los tuyos y descomentá:
-- insert into public.erp_membership (user_id, company_id, role, can_write)
-- select au.id, 'comp-001', 'admin', true
-- from auth.users au where lower(au.email) = lower('TU-EMAIL@dominio.com')
-- on conflict (user_id, company_id) do update set role='admin', can_write=true;


-- ============================================================================
--  PASO 3 — REVISAR antes de activar RLS (solo lectura)
--  Confirmá que cada persona quede con la(s) empresa(s) y permisos correctos.
-- ============================================================================
select m.company_id,
       au.email,
       m.role,
       m.can_write
from public.erp_membership m
join auth.users au on au.id = m.user_id
order by m.company_id, au.email;
-- ⛔ Si algo acá está mal, NO sigas al PASO 4. Corregí las membresías primero
--    (update/delete sobre erp_membership) y volvé a revisar.


-- ============================================================================
--  PASO 4 — CIERRE FINAL: aislamiento real sobre erp_data
--  (⚠️  ESTE es el que "prende" la seguridad de verdad)
--
--  ⛔ NO correr hasta que TODOS los usuarios activos estén migrados a Auth y con
--     membresía:  membresias  ==  usuarios_activos_app  (ver consulta de avance).
--     Este bloque borra las policies permisivas que hoy dejan entrar por la clave
--     anon / a cualquier autenticado; si alguien no tiene membresía, pierde acceso.
-- ============================================================================
alter table public.erp_data enable row level security;

-- 4a) Crear (o recrear) las policies de aislamiento por membresía.
drop policy if exists erp_data_select on public.erp_data;
drop policy if exists erp_data_insert on public.erp_data;
drop policy if exists erp_data_update on public.erp_data;
drop policy if exists erp_data_delete on public.erp_data;

create policy erp_data_select on public.erp_data
  for select using (public.erp_is_member(company_id));

create policy erp_data_insert on public.erp_data
  for insert with check (public.erp_can_write(company_id));

create policy erp_data_update on public.erp_data
  for update using (public.erp_can_write(company_id))
             with check (public.erp_can_write(company_id));

create policy erp_data_delete on public.erp_data
  for delete using (public.erp_can_write(company_id));

-- 4b) Borrar las policies VIEJAS permisivas (el agujero real que encontramos).
--     anon_read_temp: la clave pública podía leer todo.
--     auth_*: cualquier autenticado escribía/leía de cualquier empresa.
--     company_isolation: aislamiento anterior por metadata del JWT (lo reemplaza
--     el modelo de membresías). Si en tu proyecto tienen otros nombres, ajustá.
drop policy if exists anon_read_temp    on public.erp_data;
drop policy if exists auth_select       on public.erp_data;
drop policy if exists auth_insert       on public.erp_data;
drop policy if exists auth_update       on public.erp_data;
drop policy if exists auth_delete       on public.erp_data;
drop policy if exists company_isolation on public.erp_data;

-- 4c) Verificar que queden SOLO las 4 mías:
--   select policyname, cmd from pg_policies
--   where schemaname='public' and tablename='erp_data' order by policyname;
--   → deben aparecer exactamente: erp_data_select/insert/update/delete


-- ============================================================================
--  PASO 5 — Activar RLS sobre el bucket de comprobantes (storage)
--  El path de cada archivo es:  <company_id>/<collection>/<record_id>/<archivo>
--  => la primera carpeta del path es el company_id.
-- ============================================================================
drop policy if exists comprobantes_select on storage.objects;
drop policy if exists comprobantes_insert on storage.objects;
drop policy if exists comprobantes_update on storage.objects;
drop policy if exists comprobantes_delete on storage.objects;

create policy comprobantes_select on storage.objects
  for select using (
    bucket_id = 'comprobantes'
    and public.erp_is_member((storage.foldername(name))[1])
  );

create policy comprobantes_insert on storage.objects
  for insert with check (
    bucket_id = 'comprobantes'
    and public.erp_can_write((storage.foldername(name))[1])
  );

create policy comprobantes_update on storage.objects
  for update using (
    bucket_id = 'comprobantes'
    and public.erp_can_write((storage.foldername(name))[1])
  );

create policy comprobantes_delete on storage.objects
  for delete using (
    bucket_id = 'comprobantes'
    and public.erp_can_write((storage.foldername(name))[1])
  );


-- ============================================================================
--  VERIFICACIÓN post-activación
--  Con RLS activo, esta query corrida desde el SQL Editor (rol service) sigue
--  viendo todo. La prueba REAL es desde la app, logueado como un usuario normal.
-- ============================================================================
-- select relname, relrowsecurity from pg_class
-- where relname in ('erp_data') ;   -- relrowsecurity = true  → RLS activo


-- ============================================================================
--  🔙 ROLLBACK  (si algo se rompe y necesitás volver atrás YA)
--  Desactiva RLS: la app vuelve a funcionar como antes (sin seguridad server).
-- ============================================================================
-- alter table public.erp_data disable row level security;
-- alter table storage.objects  disable row level security;   -- (si la activaste)
-- -- Las policies quedan creadas pero inertes mientras RLS esté OFF.


-- ============================================================================
--  EXTRA — Acceso multi-razón-social en un solo RPC (erp_set_access)
--  Otorga (o revoca) a un usuario acceso a TODAS las razones sociales del grupo
--  de una vez. Lo llama la app al crear/editar/borrar usuarios, para no depender
--  de cuál empresa esté activa. El acceso fino por obra lo maneja la app
--  (user.project_ids). Correr una vez.
-- ============================================================================
create or replace function public.erp_set_access(p_email text, p_role text, p_active boolean)
returns integer language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_count int := 0;
begin
  -- solo un admin (de alguna empresa) puede gestionar accesos
  if not exists (select 1 from public.erp_membership m where m.user_id = auth.uid() and m.role = 'admin') then
    raise exception 'No autorizado';
  end if;
  select id into v_uid from auth.users where lower(email) = lower(p_email) limit 1;
  if v_uid is null then return -1; end if;         -- todavía sin cuenta de Auth
  if p_active is false then
    delete from public.erp_membership where user_id = v_uid;   -- baja total
    return 0;
  end if;
  insert into public.erp_membership (user_id, company_id, role, can_write)
  select v_uid, c.company_id,
         coalesce(nullif(p_role,''),'viewer'),
         coalesce(nullif(p_role,''),'viewer') <> 'viewer'
  from (select distinct company_id from public.erp_data) c
  on conflict (user_id, company_id) do update
     set role = excluded.role, can_write = excluded.can_write;
  get diagnostics v_count = row_count;
  return v_count;
end; $$;
