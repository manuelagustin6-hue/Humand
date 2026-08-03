-- ============================================================================
--  Rise — RLS a NIVEL ORGANIZACIÓN (todos los usuarios ven todas las razones sociales)
-- ============================================================================
--  Cambia el modelo de acceso de "membresía por razón social" a "membresía por
--  organización": un usuario HABILITADO (con al menos una fila en erp_membership)
--  puede leer/escribir TODAS las razones sociales. Sumar una razón social nueva ya
--  no requiere otorgar permisos uno por uno.
--
--  Cómo funciona: se redefinen las 3 funciones que consultan las policies de
--  erp_data (erp_is_member / erp_can_write / erp_is_admin) para que IGNOREN el
--  company_id y sólo miren si el usuario está habilitado. Las policies existentes
--  quedan igual — pasan a ser org-level automáticamente.
--
--  Seguridad: sigue cerrado. Sin cuenta de Auth + sin fila en erp_membership = sin
--  acceso. El día que vendas Rise a varias organizaciones distintas, se reintroduce
--  el aislamiento por organización (una columna org_id) sin perder este trabajo.
--
--  Correr por pasos, en orden.
-- ============================================================================


-- ============================================================================
--  PASO 1 — Redefinir las funciones a nivel organización (ignoran el company_id)
-- ============================================================================

-- ¿El usuario está habilitado en la organización? (tiene ALGUNA membresía)
create or replace function public.erp_is_member(cid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.erp_membership m
    where m.user_id = auth.uid()
  );
$$;

-- ¿Puede escribir? (tiene ALGUNA membresía con can_write, o es admin)
create or replace function public.erp_can_write(cid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.erp_membership m
    where m.user_id = auth.uid() and (m.can_write or m.role = 'admin')
  );
$$;

-- ¿Es admin de la organización? (rol admin en ALGUNA fila) — habilita gestionar accesos
create or replace function public.erp_is_admin(cid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.erp_membership m
    where m.user_id = auth.uid() and m.role = 'admin'
  );
$$;


-- ============================================================================
--  PASO 2 — Bootstrap: habilitar tu usuario admin en la organización
--  (una sola fila alcanza; el company_id acá es simbólico — el acceso es global).
--  Cambiá el email si hace falta.
-- ============================================================================
insert into public.erp_membership (user_id, company_id, role, can_write)
select id, '_org', 'admin', true
from auth.users
where lower(email) = lower('manuelagustin6@gmail.com')
on conflict (user_id, company_id)
  do update set role = 'admin', can_write = true;


-- ============================================================================
--  PASO 3 — Verificación (solo lectura)
-- ============================================================================
-- Usuarios habilitados en la organización (con al menos una membresía):
select u.email,
       bool_or(m.role = 'admin')  as es_admin,
       bool_or(m.can_write)       as puede_escribir
from public.erp_membership m
join auth.users u on u.id = m.user_id
group by u.email
order by u.email;

-- Confirmá que RLS quede ACTIVA:
-- alter table public.erp_data enable row level security;
