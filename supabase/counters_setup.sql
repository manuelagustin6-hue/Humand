-- ============================================================================
--  ConstructERP — Numeración server-side (secuencias atómicas)
-- ============================================================================
--  Problema: los números de factura y asiento se calculan como max+1 desde la
--  copia local del navegador. Con varios usuarios a la vez, dos pueden sacar el
--  MISMO número → numeración ARCA/DGI rota (debe ser única y correlativa).
--
--  Solución: un contador por (empresa, tipo de documento) en Postgres, y una
--  función que lo incrementa de forma ATÓMICA y devuelve el próximo número. Dos
--  llamadas simultáneas nunca reciben el mismo valor.
--
--  Aplicá los 2 bloques en el SQL Editor. Es seguro e idempotente.
-- ============================================================================


-- ============================================================================
--  BLOQUE 1 — Tabla de contadores + función atómica
-- ============================================================================
create table if not exists public.erp_counters (
  company_id text not null,
  key        text not null,            -- 'invoice', 'journal:2026', etc.
  value      bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (company_id, key)
);

-- La tabla queda protegida por RLS; se accede solo por la función (security definer).
alter table public.erp_counters enable row level security;

-- Devuelve el próximo número para (empresa, key), de forma atómica.
-- p_min actúa como PISO: si el contador está atrasado respecto de los datos ya
-- existentes, el cliente pasa (máximo local + 1) y la función nunca retrocede.
create or replace function public.erp_next_number(p_company text, p_key text, p_min bigint default 1)
returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  insert into public.erp_counters (company_id, key, value, updated_at)
  values (p_company, p_key, greatest(coalesce(p_min, 1), 1), now())
  on conflict (company_id, key)
  do update set value = greatest(public.erp_counters.value + 1, coalesce(p_min, 1)),
                updated_at = now()
  returning value into v;
  return v;
end; $$;


-- ============================================================================
--  BLOQUE 2 — (Opcional pero recomendado) Sembrar el contador de FACTURAS desde
--  el máximo ya existente, por empresa. Así el primer número server-side arranca
--  donde corresponde aunque nadie tenga la copia local completa.
--  (El de asientos se auto-ajusta con el piso que manda el cliente.)
-- ============================================================================
insert into public.erp_counters (company_id, key, value)
select company_id, 'invoice', count(*)
from public.erp_data
where collection = 'invoices' and deleted = false
group by company_id
on conflict (company_id, key)
do update set value = greatest(public.erp_counters.value, excluded.value);


-- ============================================================================
--  Verificación
-- ============================================================================
-- select * from public.erp_counters order by company_id, key;
