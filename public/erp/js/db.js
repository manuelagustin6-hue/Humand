/* ===== DATABASE LAYER =====
 * Two interchangeable backends behind one synchronous API so the 11 modules
 * never change:
 *   - 'local'    : per-browser localStorage (single user).
 *   - 'supabase' : shared Postgres — multi-user, concurrent, real-time.
 *
 * In both modes reads are served synchronously from an in-memory cache that is
 * loaded once at bootstrap(). Writes update the cache immediately (optimistic)
 * and are persisted to the active backend.
 */
const DB = {
  KEY: 'erp_construccion_v1',
  TABLE: 'erp_records',
  _cache: null,
  mode: 'local',   // 'local' | 'supabase'
  _sb: null,       // Supabase client

  _authUser: null,

  // ---- CLIENT / AUTH ----
  isSupabaseConfigured() {
    const cfg = window.ERP_CONFIG || {};
    return !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && window.supabase.createClient);
  },

  initClient() {
    if (this._sb) return true;
    if (!this.isSupabaseConfigured()) return false;
    const cfg = window.ERP_CONFIG;
    try {
      this._sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      return true;
    } catch (e) {
      console.error('Supabase client init failed:', e);
      this._sb = null;
      return false;
    }
  },

  async getSession() {
    if (!this._sb) return null;
    try {
      const { data } = await this._sb.auth.getSession();
      this._authUser = data.session ? data.session.user : null;
      return data.session || null;
    } catch (e) {
      console.error('getSession failed:', e);
      return null;
    }
  },

  async signIn(email, password) {
    if (!this._sb) throw new Error('Supabase no está configurado');
    const { data, error } = await this._sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this._authUser = data.user;
    return data;
  },

  async signOut() {
    if (this._sb) { try { await this._sb.auth.signOut(); } catch (e) { console.error(e); } }
    this._authUser = null;
  },

  currentUser() { return this._authUser || null; },

  // ---- BOOTSTRAP (async, called once on startup, after auth) ----
  async bootstrap() {
    if (!this._sb) this.initClient();
    if (this._sb) {
      try {
        await this._loadFromSupabase(window.ERP_CONFIG || {});
        this.mode = 'supabase';
        this._subscribeRealtime();
        return this.mode;
      } catch (e) {
        console.error('Supabase load failed, falling back to local storage.', e);
        if (typeof toast === 'function') {
          toast('No se pudo cargar la base de datos; usando modo local.', 'warning');
        }
      }
    }
    // Local fallback (also the default when no credentials are configured).
    this.mode = 'local';
    this.get(); // seeds if empty
    return this.mode;
  },

  async _loadFromSupabase(cfg) {
    const all = {};
    let from = 0;
    const page = 1000;
    // Page through the table so large datasets load fully.
    while (true) {
      const { data, error } = await this._sb
        .from(this.TABLE)
        .select('collection,id,data')
        .range(from, from + page - 1);
      if (error) throw error;
      for (const row of (data || [])) {
        (all[row.collection] = all[row.collection] || []).push({ ...row.data, id: row.id });
      }
      if (!data || data.length < page) break;
      from += page;
    }

    const isEmpty = Object.keys(all).length === 0;
    if (isEmpty && cfg.seedOnEmpty) {
      // First run against an empty DB: publish the demo dataset once.
      const seeded = this.seed();
      this._cache = seeded;
      await this._remoteReplaceAll(seeded);
    } else {
      // Ensure every known collection exists so modules never see undefined.
      const defaults = this.seed();
      for (const k of Object.keys(defaults)) if (!(k in all)) all[k] = [];
      this._cache = all;
    }
  },

  // ---- REMOTE WRITE HELPERS (fire-and-forget, optimistic UI) ----
  _remoteError(e) {
    console.error('Supabase write failed:', e);
    if (typeof toast === 'function') toast('No se pudo guardar en la base de datos', 'error');
  },

  _remoteUpsert(collection, item) {
    if (this.mode !== 'supabase' || !this._sb) return;
    this._sb.from(this.TABLE)
      .upsert({ collection, id: item.id, data: item, updated_at: new Date().toISOString() })
      .then(({ error }) => { if (error) this._remoteError(error); });
  },

  _remoteDelete(collection, id) {
    if (this.mode !== 'supabase' || !this._sb) return;
    this._sb.from(this.TABLE).delete().match({ collection, id })
      .then(({ error }) => { if (error) this._remoteError(error); });
  },

  async _remoteReplaceAll(data) {
    if (!this._sb) return;
    const rows = [];
    for (const collection of Object.keys(data)) {
      for (const item of (data[collection] || [])) {
        rows.push({ collection, id: item.id, data: item, updated_at: new Date().toISOString() });
      }
    }
    if (!rows.length) return;
    // Upsert in chunks to stay within request limits.
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await this._sb.from(this.TABLE).upsert(rows.slice(i, i + 500));
      if (error) throw error;
    }
  },

  // ---- REALTIME (keep every browser's cache in sync) ----
  _subscribeRealtime() {
    try {
      this._sb.channel('erp_records_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: this.TABLE },
            payload => this._applyRealtime(payload))
        .subscribe();
    } catch (e) {
      console.error('Realtime subscription failed (data still works, refresh to see others\' changes):', e);
    }
  },

  _applyRealtime(payload) {
    if (!this._cache) return;
    const n = payload.new, o = payload.old;
    const coll = (n && n.collection) || (o && o.collection);
    if (!coll) return;
    const arr = this._cache[coll] = this._cache[coll] || [];
    if (payload.eventType === 'DELETE') {
      this._cache[coll] = arr.filter(x => x.id !== (o && o.id));
    } else if (n) {
      const item = { ...n.data, id: n.id };
      const idx = arr.findIndex(x => x.id === item.id);
      if (idx === -1) arr.push(item); else arr[idx] = item;
    }
    // Refresh the view to reflect other users' changes, but never interrupt a
    // user mid-edit (an open modal).
    const modalOpen = (document.getElementById('modal-overlay') || {}).style
      && document.getElementById('modal-overlay').style.display === 'flex';
    if (modalOpen) return;
    if (typeof populateProjectSelector === 'function') populateProjectSelector();
    if (typeof navigate === 'function' && window.APP_STATE) navigate(window.APP_STATE.currentModule);
  },

  get() {
    // Serve from the in-memory cache to avoid re-parsing the whole store on
    // every read (getAll/getById are called inside render loops).
    if (this._cache) return this._cache;

    // In Supabase mode the cache is populated by bootstrap(); never fall back to
    // localStorage seeding here (that would diverge from the shared database).
    if (this.mode === 'supabase') { this._cache = {}; return this._cache; }

    let data;
    try {
      const raw = localStorage.getItem(this.KEY);
      data = raw ? JSON.parse(raw) : null;
    } catch (e) {
      // Corrupted JSON in storage — recover by re-seeding instead of crashing.
      console.error('DB: stored data is corrupted, re-seeding.', e);
      data = null;
    }

    if (!data || typeof data !== 'object') {
      this._cache = this.seed();
      this._persist();
      return this._cache;
    }

    // Backfill any collection added after this store was first written, so a
    // schema that grew over time never returns `undefined` to a module.
    const defaults = this.seed();
    let changed = false;
    for (const key of Object.keys(defaults)) {
      if (!(key in data)) { data[key] = defaults[key]; changed = true; }
    }

    this._cache = data;
    if (changed) this._persist();
    return this._cache;
  },

  // Write the current cache to localStorage, tolerating quota/availability
  // failures so the in-memory session keeps working.
  _persist() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this._cache));
      return true;
    } catch (e) {
      console.error('DB: could not persist to localStorage.', e);
      if (typeof toast === 'function') {
        const full = e && (e.name === 'QuotaExceededError' || e.code === 22);
        toast(full
          ? 'Almacenamiento lleno: los cambios no se guardarán de forma permanente.'
          : 'No se pudieron guardar los cambios de forma permanente.', 'warning');
      }
      return false;
    }
  },

  save(data) {
    this._cache = data;
    if (this.mode === 'supabase') {
      this._remoteReplaceAll(data).catch(e => this._remoteError(e));
      return true;
    }
    return this._persist();
  },

  init() {
    this._cache = this.seed();
    this._persist();
    return this._cache;
  },

  // Wipe all data and rebuild from seed (recovery / demo reset).
  reset() {
    if (this.mode === 'supabase') {
      const seeded = this.seed();
      this._cache = seeded;
      this._remoteReplaceAll(seeded).catch(e => this._remoteError(e));
      return this._cache;
    }
    this._cache = null;
    try { localStorage.removeItem(this.KEY); } catch (e) { /* ignore */ }
    return this.get();
  },

  // ---- CRUD helpers ----
  getAll(collection) { return this.get()[collection] || []; },

  getById(collection, id) {
    return this.getAll(collection).find(x => x.id === id) || null;
  },

  insert(collection, record) {
    const db = this.get();
    if (!db[collection]) db[collection] = [];
    const item = { ...record, id: uuid(), created_at: now() };
    db[collection].push(item);
    this._cache = db;
    if (this.mode === 'supabase') this._remoteUpsert(collection, item);
    else this._persist();
    return item;
  },

  update(collection, id, updates) {
    const db = this.get();
    const idx = (db[collection] || []).findIndex(x => x.id === id);
    if (idx === -1) return null;
    const item = { ...db[collection][idx], ...updates, updated_at: now() };
    db[collection][idx] = item;
    this._cache = db;
    if (this.mode === 'supabase') this._remoteUpsert(collection, item);
    else this._persist();
    return item;
  },

  remove(collection, id) {
    const db = this.get();
    db[collection] = (db[collection] || []).filter(x => x.id !== id);
    this._cache = db;
    if (this.mode === 'supabase') this._remoteDelete(collection, id);
    else this._persist();
  },

  // ---- SEED DATA ----
  seed() {
    const p1 = 'proj-001', p2 = 'proj-002', p3 = 'proj-003';
    const s1 = 'sup-001', s2 = 'sup-002', s3 = 'sup-003';

    return {
      projects: [
        { id: p1, name: 'Torre Residencial Palermo', client: 'Inversiones RP SA', type: 'residential', status: 'active', start_date: '2025-01-15', end_date: '2026-06-30', budget: 45000000, address: 'Av. Santa Fe 3200, CABA', description: 'Edificio residencial 12 pisos, 48 unidades', created_at: now() },
        { id: p2, name: 'Centro Comercial Quilmes', client: 'Grupo Inversión Sur', type: 'commercial', status: 'active', start_date: '2024-09-01', end_date: '2026-03-31', budget: 82000000, address: 'Av. Calchaquí 1500, Quilmes', description: 'Shopping center 3 niveles, 120 locales', created_at: now() },
        { id: p3, name: 'Complejo Industrial Delta', client: 'LogiPark SRL', type: 'industrial', status: 'planning', start_date: '2026-03-01', end_date: '2027-08-31', budget: 28000000, address: 'Parque Industrial Delta, Tigre', description: 'Galpones industriales 15.000 m2', created_at: now() },
      ],
      suppliers: [
        { id: s1, name: 'Materiales del Norte SA', cuit: '30-12345678-9', contact: 'Carlos Pérez', phone: '011-4523-1234', email: 'ventas@matelnorte.com', address: 'Av. Belgrano 1500, CABA', category: ['Materiales', 'Áridos'], status: 'active', created_at: now() },
        { id: s2, name: 'Herramientas Profesionales SRL', cuit: '30-87654321-0', contact: 'Ana García', phone: '011-4987-5678', email: 'info@herpro.com', address: 'Ruta 3 km 42, La Matanza', category: ['Herramientas', 'Equipos'], status: 'active', created_at: now() },
        { id: s3, name: 'Cemento y Hormigón del Plata', cuit: '30-55566677-1', contact: 'Roberto Sánchez', phone: '0800-222-3333', email: 'comercial@chplata.com', address: 'Av. Mitre 8000, Avellaneda', category: ['Cemento', 'Hormigón'], status: 'active', created_at: now() },
      ],
      purchaseOrders: [
        { id: 'po-001', number: 'OC-2025-001', project_id: p1, supplier_id: s3, items: [{ description: 'Cemento Portland 50kg', unit: 'Bolsa', quantity: 500, unit_price: 2800, total: 1400000 }, { description: 'Hormigón H-25', unit: 'm3', quantity: 80, unit_price: 45000, total: 3600000 }], subtotal: 5000000, tax: 1050000, total: 6050000, status: 'received', date: '2025-03-10', expected_date: '2025-03-20', notes: '', created_at: now() },
        { id: 'po-002', number: 'OC-2025-002', project_id: p1, supplier_id: s1, items: [{ description: 'Hierro nervado 12mm', unit: 'kg', quantity: 8000, unit_price: 1200, total: 9600000 }, { description: 'Hierro liso 8mm', unit: 'kg', quantity: 2000, unit_price: 980, total: 1960000 }], subtotal: 11560000, tax: 2427600, total: 13987600, status: 'sent', date: '2025-04-05', expected_date: '2025-04-18', notes: '', created_at: now() },
        { id: 'po-003', number: 'OC-2025-003', project_id: p2, supplier_id: s2, items: [{ description: 'Andamio tubular', unit: 'Módulo', quantity: 200, unit_price: 15000, total: 3000000 }, { description: 'Equipo de soldadura', unit: 'Unidad', quantity: 3, unit_price: 85000, total: 255000 }], subtotal: 3255000, tax: 683550, total: 3938550, status: 'draft', date: '2025-04-20', expected_date: '2025-05-05', notes: 'Incluir seguro de transporte', created_at: now() },
      ],
      boqItems: [
        // Torre Palermo
        { id: uuid(), project_id: p1, chapter: '01', item: '01.01', category: 'Estructura', description: 'Hormigón armado fundaciones', unit: 'm3', quantity: 320, unit_price: 85000, total: 27200000, created_at: now() },
        { id: uuid(), project_id: p1, chapter: '01', item: '01.02', category: 'Estructura', description: 'Hormigón armado columnas y losas', unit: 'm3', quantity: 1200, unit_price: 78000, total: 93600000, created_at: now() },
        { id: uuid(), project_id: p1, chapter: '02', item: '02.01', category: 'Mampostería', description: 'Albañilería ladrillo hueco', unit: 'm2', quantity: 4800, unit_price: 12500, total: 60000000, created_at: now() },
        { id: uuid(), project_id: p1, chapter: '02', item: '02.02', category: 'Mampostería', description: 'Revoques interiores', unit: 'm2', quantity: 9600, unit_price: 4800, total: 46080000, created_at: now() },
        { id: uuid(), project_id: p1, chapter: '03', item: '03.01', category: 'Instalaciones', description: 'Instalación eléctrica', unit: 'm2', quantity: 4800, unit_price: 8500, total: 40800000, created_at: now() },
        { id: uuid(), project_id: p1, chapter: '03', item: '03.02', category: 'Instalaciones', description: 'Instalación sanitaria', unit: 'm2', quantity: 4800, unit_price: 7200, total: 34560000, created_at: now() },
        // Shopping Quilmes
        { id: uuid(), project_id: p2, chapter: '01', item: '01.01', category: 'Estructura', description: 'Pilotes y fundaciones especiales', unit: 'm3', quantity: 850, unit_price: 125000, total: 106250000, created_at: now() },
        { id: uuid(), project_id: p2, chapter: '01', item: '01.02', category: 'Estructura', description: 'Estructura metálica principal', unit: 'tn', quantity: 480, unit_price: 380000, total: 182400000, created_at: now() },
        { id: uuid(), project_id: p2, chapter: '02', item: '02.01', category: 'Cerramiento', description: 'Fachada vidriada', unit: 'm2', quantity: 2800, unit_price: 55000, total: 154000000, created_at: now() },
      ],
      actualCosts: [
        { id: uuid(), project_id: p1, category: 'Estructura', description: 'Hormigón real ejecutado', amount: 28500000, date: '2025-03-15', reference: 'OC-2025-001', created_at: now() },
        { id: uuid(), project_id: p1, category: 'Estructura', description: 'Hierros y armaduras', amount: 13987600, date: '2025-04-10', reference: 'OC-2025-002', created_at: now() },
        { id: uuid(), project_id: p1, category: 'Mampostería', description: 'Ladrillería semana 1-4', amount: 18500000, date: '2025-04-20', reference: 'Rem-045', created_at: now() },
        { id: uuid(), project_id: p2, category: 'Estructura', description: 'Pilotes ejecutados', amount: 112000000, date: '2025-02-28', reference: 'OC-2024-088', created_at: now() },
      ],
      ganttTasks: [
        { id: 'gt-001', project_id: p1, name: 'Demolición y limpieza', start_date: '2025-01-15', end_date: '2025-02-15', progress: 100, status: 'completed', assignee: 'Equipo A', color: 'green', dependencies: [], created_at: now() },
        { id: 'gt-002', project_id: p1, name: 'Fundaciones y pilotes', start_date: '2025-02-01', end_date: '2025-04-30', progress: 85, status: 'in_progress', assignee: 'Equipo B', color: 'blue', dependencies: ['gt-001'], created_at: now() },
        { id: 'gt-003', project_id: p1, name: 'Estructura hormigón P1-P6', start_date: '2025-04-01', end_date: '2025-08-31', progress: 40, status: 'in_progress', assignee: 'Equipo C', color: 'blue', dependencies: ['gt-002'], created_at: now() },
        { id: 'gt-004', project_id: p1, name: 'Estructura hormigón P7-P12', start_date: '2025-08-01', end_date: '2025-12-31', progress: 0, status: 'pending', assignee: 'Equipo C', color: 'gray', dependencies: ['gt-003'], created_at: now() },
        { id: 'gt-005', project_id: p1, name: 'Mampostería y revoques', start_date: '2025-06-01', end_date: '2026-03-31', progress: 10, status: 'in_progress', assignee: 'Equipo D', color: 'yellow', dependencies: ['gt-003'], created_at: now() },
        { id: 'gt-006', project_id: p1, name: 'Instalaciones eléctricas', start_date: '2025-09-01', end_date: '2026-04-30', progress: 0, status: 'pending', assignee: 'ElecTech SRL', color: 'gray', dependencies: ['gt-004'], created_at: now() },
        { id: 'gt-007', project_id: p1, name: 'Terminaciones y entrega', start_date: '2026-03-01', end_date: '2026-06-30', progress: 0, status: 'pending', assignee: 'Equipo E', color: 'gray', dependencies: ['gt-005', 'gt-006'], created_at: now() },
        { id: 'gt-008', project_id: p2, name: 'Movimiento de suelos', start_date: '2024-09-01', end_date: '2024-11-30', progress: 100, status: 'completed', assignee: 'Vial SA', color: 'green', dependencies: [], created_at: now() },
        { id: 'gt-009', project_id: p2, name: 'Pilotes y fundaciones', start_date: '2024-10-01', end_date: '2025-02-28', progress: 100, status: 'completed', assignee: 'Ciment AR', color: 'green', dependencies: ['gt-008'], created_at: now() },
        { id: 'gt-010', project_id: p2, name: 'Estructura metálica', start_date: '2025-02-01', end_date: '2025-08-31', progress: 60, status: 'in_progress', assignee: 'Metaler SA', color: 'blue', dependencies: ['gt-009'], created_at: now() },
      ],
      invoices: [
        { id: 'inv-001', number: 'FA-0001-00001234', type: 'A', project_id: p1, client_name: 'Inversiones RP SA', client_cuit: '30-99887766-5', client_address: 'Av. Corrientes 1200, CABA', items: [{ description: 'Certificación obra - Marzo 2025', unit: 'Global', quantity: 1, unit_price: 12500000, total: 12500000, tax_rate: 21 }], subtotal: 12500000, tax: 2625000, total: 15125000, status: 'paid', date: '2025-03-31', due_date: '2025-04-30', notes: 'Certificado N°1', created_at: now() },
        { id: 'inv-002', number: 'FA-0001-00001235', type: 'A', project_id: p1, client_name: 'Inversiones RP SA', client_cuit: '30-99887766-5', client_address: 'Av. Corrientes 1200, CABA', items: [{ description: 'Certificación obra - Abril 2025', unit: 'Global', quantity: 1, unit_price: 14800000, total: 14800000, tax_rate: 21 }], subtotal: 14800000, tax: 3108000, total: 17908000, status: 'sent', date: '2025-04-30', due_date: '2025-05-31', notes: 'Certificado N°2', created_at: now() },
        { id: 'inv-003', number: 'FA-0001-00001236', type: 'A', project_id: p2, client_name: 'Grupo Inversión Sur', client_cuit: '30-44556677-8', client_address: 'Av. Rivadavia 5500, CABA', items: [{ description: 'Certificación obra - Marzo 2025 (estructura)', unit: 'Global', quantity: 1, unit_price: 28000000, total: 28000000, tax_rate: 21 }], subtotal: 28000000, tax: 5880000, total: 33880000, status: 'overdue', date: '2025-03-31', due_date: '2025-04-30', notes: '', created_at: now() },
      ],
      collections: [
        { id: uuid(), invoice_id: 'inv-001', project_id: p1, amount: 15125000, date: '2025-04-15', method: 'transfer', reference: 'TRF-20250415', notes: '', created_at: now() },
        { id: uuid(), invoice_id: 'inv-002', project_id: p1, amount: 5000000, date: '2025-05-10', method: 'check', reference: 'CHQ-001122', notes: 'Pago parcial', created_at: now() },
      ],
      bankAccounts: [
        { id: 'ba-001', name: 'Cuenta Operativa Principal', bank: 'Banco Nación Argentina', account_number: '0110-0322-33-000012345-6', currency: 'ARS', initial_balance: 5000000, type: 'checking', created_at: now() },
        { id: 'ba-002', name: 'Caja Chica Obra P1', bank: 'Efectivo', account_number: '-', currency: 'ARS', initial_balance: 500000, type: 'cash', created_at: now() },
        { id: 'ba-003', name: 'Cuenta Dólares', bank: 'Banco Galicia', account_number: '0077-0322-41-000098765-4', currency: 'USD', initial_balance: 120000, type: 'savings', created_at: now() },
      ],
      treasuryTx: [
        { id: uuid(), account_id: 'ba-001', project_id: p1, type: 'income', category: 'Cobro factura', description: 'Cobro FA-0001-00001234', amount: 15125000, date: '2025-04-15', reference: 'TRF-20250415', created_at: now() },
        { id: uuid(), account_id: 'ba-001', project_id: p1, type: 'expense', category: 'Pago proveedor', description: 'Pago OC-2025-001 - Cemento y Hormigón del Plata', amount: 6050000, date: '2025-03-25', reference: 'PG-0312', created_at: now() },
        { id: uuid(), account_id: 'ba-001', project_id: p1, type: 'expense', category: 'Sueldos', description: 'Liquidación sueldos Marzo 2025', amount: 4200000, date: '2025-03-31', reference: 'NOM-202503', created_at: now() },
        { id: uuid(), account_id: 'ba-001', project_id: p2, type: 'income', category: 'Cobro parcial', description: 'Pago parcial FA-0001-00001236', amount: 10000000, date: '2025-04-20', reference: 'TRF-20250420', created_at: now() },
        { id: uuid(), account_id: 'ba-002', project_id: p1, type: 'expense', category: 'Materiales menores', description: 'Compra materiales obra semana 15', amount: 145000, date: '2025-04-10', reference: 'CC-045', created_at: now() },
      ],
      accounts: [
        // Activo
        { id: 'ac-100', code: '1', name: 'ACTIVO', type: 'asset', parent_id: null, active: true, created_at: now() },
        { id: 'ac-101', code: '1.1', name: 'Activo Corriente', type: 'asset', parent_id: 'ac-100', active: true, created_at: now() },
        { id: 'ac-102', code: '1.1.1', name: 'Caja y Bancos', type: 'asset', parent_id: 'ac-101', active: true, created_at: now() },
        { id: 'ac-103', code: '1.1.2', name: 'Cuentas por Cobrar', type: 'asset', parent_id: 'ac-101', active: true, created_at: now() },
        { id: 'ac-104', code: '1.2', name: 'Activo No Corriente', type: 'asset', parent_id: 'ac-100', active: true, created_at: now() },
        { id: 'ac-105', code: '1.2.1', name: 'Obras en Curso', type: 'asset', parent_id: 'ac-104', active: true, created_at: now() },
        // Pasivo
        { id: 'ac-200', code: '2', name: 'PASIVO', type: 'liability', parent_id: null, active: true, created_at: now() },
        { id: 'ac-201', code: '2.1', name: 'Pasivo Corriente', type: 'liability', parent_id: 'ac-200', active: true, created_at: now() },
        { id: 'ac-202', code: '2.1.1', name: 'Cuentas por Pagar', type: 'liability', parent_id: 'ac-201', active: true, created_at: now() },
        { id: 'ac-203', code: '2.1.2', name: 'IVA a Pagar', type: 'liability', parent_id: 'ac-201', active: true, created_at: now() },
        // Patrimonio
        { id: 'ac-300', code: '3', name: 'PATRIMONIO NETO', type: 'equity', parent_id: null, active: true, created_at: now() },
        { id: 'ac-301', code: '3.1', name: 'Capital Social', type: 'equity', parent_id: 'ac-300', active: true, created_at: now() },
        { id: 'ac-302', code: '3.2', name: 'Resultados Acumulados', type: 'equity', parent_id: 'ac-300', active: true, created_at: now() },
        // Ingresos
        { id: 'ac-400', code: '4', name: 'INGRESOS', type: 'revenue', parent_id: null, active: true, created_at: now() },
        { id: 'ac-401', code: '4.1', name: 'Ingresos por Obras', type: 'revenue', parent_id: 'ac-400', active: true, created_at: now() },
        { id: 'ac-402', code: '4.2', name: 'Otros Ingresos', type: 'revenue', parent_id: 'ac-400', active: true, created_at: now() },
        // Egresos
        { id: 'ac-500', code: '5', name: 'EGRESOS', type: 'expense', parent_id: null, active: true, created_at: now() },
        { id: 'ac-501', code: '5.1', name: 'Costo de Obras', type: 'expense', parent_id: 'ac-500', active: true, created_at: now() },
        { id: 'ac-502', code: '5.2', name: 'Gastos de Administración', type: 'expense', parent_id: 'ac-500', active: true, created_at: now() },
        { id: 'ac-503', code: '5.3', name: 'Sueldos y Cargas Sociales', type: 'expense', parent_id: 'ac-500', active: true, created_at: now() },
      ],
      journalEntries: [
        { id: 'je-001', number: 'AS-2025-001', date: '2025-03-31', description: 'Facturación Certificado N°1 - Torre Palermo', lines: [{ account_code: '1.1.2', account_name: 'Cuentas por Cobrar', debit: 15125000, credit: 0, description: 'Inversiones RP SA' }, { account_code: '4.1', account_name: 'Ingresos por Obras', debit: 0, credit: 12500000, description: 'Ingreso obra Torre Palermo Cert.1' }, { account_code: '2.1.2', account_name: 'IVA a Pagar', debit: 0, credit: 2625000, description: 'IVA FA-0001-00001234' }], status: 'posted', created_at: now() },
        { id: 'je-002', number: 'AS-2025-002', date: '2025-04-15', description: 'Cobro FA-0001-00001234', lines: [{ account_code: '1.1.1', account_name: 'Caja y Bancos', debit: 15125000, credit: 0, description: 'TRF-20250415 BNA' }, { account_code: '1.1.2', account_name: 'Cuentas por Cobrar', debit: 0, credit: 15125000, description: 'Cancelación CxC Inversiones RP SA' }], status: 'posted', created_at: now() },
      ],
    };
  },
};

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function now() { return new Date().toISOString(); }
