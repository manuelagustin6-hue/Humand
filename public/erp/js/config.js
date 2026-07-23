/* ===== ERP CONFIG =====
 * Multi-user backend configuration.
 *
 * Leave supabaseUrl / supabaseAnonKey empty to run in LOCAL mode
 * (data stored per-browser in localStorage — single user, no sharing).
 *
 * Fill both to run in SUPABASE mode: data is stored in a shared Postgres
 * database, so 50-80 users see and edit the same company data in real time.
 *
 * Setup steps are in public/erp/supabase/README.md — you must run
 * supabase/schema.sql in your Supabase project first.
 */
window.ERP_CONFIG = {
  supabaseUrl: '',       // e.g. 'https://xxxxxxxx.supabase.co'
  supabaseAnonKey: '',   // the project's anon/public key

  // When connecting to an EMPTY Supabase database, load the demo dataset once
  // so the app isn't blank. Set to false for a clean production start.
  seedOnEmpty: true,
};
