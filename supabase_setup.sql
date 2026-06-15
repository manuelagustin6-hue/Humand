-- ============================================================
-- ERP Construcción — Supabase Setup
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. TABLA erp_data (crear si no existe) ──────────────────
CREATE TABLE IF NOT EXISTS public.erp_data (
  company_id   TEXT        NOT NULL,
  collection   TEXT        NOT NULL,
  record_id    TEXT        NOT NULL,
  data         JSONB       NOT NULL DEFAULT '{}',
  deleted      BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, collection, record_id)
);

CREATE INDEX IF NOT EXISTS idx_erp_data_company  ON public.erp_data (company_id);
CREATE INDEX IF NOT EXISTS idx_erp_data_col      ON public.erp_data (company_id, collection);
CREATE INDEX IF NOT EXISTS idx_erp_data_deleted  ON public.erp_data (company_id, deleted);


-- ── 2. ROW LEVEL SECURITY ────────────────────────────────────
ALTER TABLE public.erp_data ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas viejas si existen
DROP POLICY IF EXISTS "company_isolation"  ON public.erp_data;
DROP POLICY IF EXISTS "anon_read_temp"     ON public.erp_data;

-- Usuarios autenticados sólo ven y modifican datos de SU empresa
-- (company_id viene del JWT user_metadata, se setea al crear el usuario)
CREATE POLICY "company_isolation"
ON public.erp_data
FOR ALL
TO authenticated
USING (
  company_id = COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'company_id'),
    ''
  )
)
WITH CHECK (
  company_id = COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'company_id'),
    ''
  )
);

-- TEMPORAL: permitir acceso anónimo mientras se migran usuarios a Supabase Auth.
-- Una vez que TODOS los usuarios tengan cuenta en Auth, eliminar esta política
-- ejecutando: DROP POLICY "anon_read_temp" ON public.erp_data;
CREATE POLICY "anon_read_temp"
ON public.erp_data
FOR SELECT
TO anon
USING (true);


-- ── 3. FUNCIÓN HELPER: updated_at automático ─────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_erp_data_updated_at ON public.erp_data;
CREATE TRIGGER trg_erp_data_updated_at
  BEFORE UPDATE ON public.erp_data
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ── 4. REALTIME ──────────────────────────────────────────────
-- Habilitar Realtime en la tabla (también se puede hacer desde el Dashboard
-- en Database → Replication → erp_data)
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_data;


-- ── 5. CÓMO CREAR USUARIOS ───────────────────────────────────
-- Opción A (recomendada): Dashboard → Authentication → Users → "Invite User"
--   y completar User Metadata con:
--   { "company_id": "comp-001", "role": "admin", "name": "Nombre Completo" }
--
-- Opción B: SQL (reemplazar valores)
-- SELECT auth.uid(); -- verificar que estés logueado como service_role

-- Ejemplo con service_role (sólo desde el SQL Editor del Dashboard):
/*
SELECT * FROM auth.users; -- ver usuarios existentes

-- Actualizar metadata de un usuario ya existente:
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data ||
  '{"company_id": "comp-001", "role": "admin", "name": "Juan García"}'::jsonb
WHERE email = 'juan@miempresa.com';
*/


-- ── 6. VERIFICAR ─────────────────────────────────────────────
-- Chequear que RLS está activo:
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'erp_data';

-- Ver políticas:
SELECT policyname, cmd, roles, qual FROM pg_policies WHERE tablename = 'erp_data';

-- Contar registros por empresa:
SELECT company_id, COUNT(*) as total FROM erp_data GROUP BY company_id;
