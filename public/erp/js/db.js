/* ===== DATABASE LAYER (localStorage) ===== */
const DB = {
  _companyId: 'comp-001',
  GLOBAL_KEY: 'erp_global_v1',

  get KEY() { return 'erp_company_' + (this._companyId || 'comp-001') + '_v1'; },

  get() {
    try {
      var raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : this.init();
    } catch(e) { return this.init(); }
  },

  save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  init() {
    var data = this.seed();
    this.save(data);
    return data;
  },

  // ---- CRUD helpers ----
  getAll(collection) { return this.get()[collection] || []; },

  getById(collection, id) {
    return this.getAll(collection).find(function(x) { return x.id === id; }) || null;
  },

  insert(collection, record) {
    var db = this.get();
    if (!db[collection]) db[collection] = [];
    var item = Object.assign({}, record, { id: uuid(), created_at: now() });
    db[collection].push(item);
    this.save(db);
    return item;
  },

  update(collection, id, updates) {
    var db = this.get();
    var idx = (db[collection] || []).findIndex(function(x) { return x.id === id; });
    if (idx === -1) return null;
    db[collection][idx] = Object.assign({}, db[collection][idx], updates, { updated_at: now() });
    this.save(db);
    return db[collection][idx];
  },

  remove(collection, id) {
    var db = this.get();
    db[collection] = (db[collection] || []).filter(function(x) { return x.id !== id; });
    this.save(db);
  },

  // ---- BACKUP / RESTORE ----
  export() {
    var data = this.get();
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'erp_backup_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  importData(jsonStr) {
    try {
      var data = JSON.parse(jsonStr);
      if (typeof data !== 'object' || Array.isArray(data)) throw new Error('Formato invalido');
      if (!Array.isArray(data.projects)) throw new Error('Coleccion "projects" faltante o invalida');
      if (!Array.isArray(data.suppliers)) throw new Error('Coleccion "suppliers" faltante o invalida');
      this.save(data);
      return { ok: true };
    } catch(e) {
      return { ok: false, error: e.message };
    }
  },

  // ---- STATS ----
  stats() {
    var raw = localStorage.getItem(this.KEY) || '';
    var bytes = new Blob([raw]).size;
    var maxBytes = 5 * 1024 * 1024;
    var db = this.get();
    var collections = Object.entries(db)
      .filter(function(entry) { return Array.isArray(entry[1]); })
      .map(function(entry) { return { name: entry[0], count: entry[1].length }; })
      .sort(function(a, b) { return b.count - a.count; });
    return {
      bytes: bytes,
      maxBytes: maxBytes,
      pct: (bytes / maxBytes * 100).toFixed(1),
      kb: (bytes / 1024).toFixed(1),
      collections: collections,
      total: collections.reduce(function(s, c) { return s + c.count; }, 0),
    };
  },

  // ---- INTEGRITY CHECK ----
  integrity() {
    var db = this.get();
    var issues = [];

    var sets = {
      projects:     new Set((db.projects     || []).map(function(p) { return p.id; })),
      suppliers:    new Set((db.suppliers    || []).map(function(s) { return s.id; })),
      bankAccounts: new Set((db.bankAccounts || []).map(function(b) { return b.id; })),
      invoices:     new Set((db.invoices     || []).map(function(i) { return i.id; })),
      accountCodes: new Set((db.accounts     || []).map(function(a) { return a.code; })),
    };

    var chk = function(col, item, field, setKey, label) {
      if (item[field] && !sets[setKey].has(item[field]))
        issues.push({ severity: 'error', collection: col, id: item.id, msg: label + ': referencia "' + field + '" (' + item[field] + ') no existe' });
    };

    (db.purchaseOrders     || []).forEach(function(o)  { chk('purchaseOrders',     o,  'project_id',  'projects',     'OC ' + (o.number||o.id));  chk('purchaseOrders', o, 'supplier_id', 'suppliers', 'OC ' + (o.number||o.id)); });
    (db.purchaseRequisitions || []).forEach(function(r) { chk('purchaseRequisitions', r, 'project_id', 'projects', 'Req ' + (r.number||r.id)); });
    (db.invoices           || []).forEach(function(i)  { chk('invoices',           i, 'project_id', 'projects',     'Fact. ' + (i.number||i.id)); });
    (db.certificates       || []).forEach(function(c)  { chk('certificates',       c, 'project_id', 'projects',     'Cert. ' + (c.number||c.id)); });
    (db.ganttTasks         || []).forEach(function(t)  { chk('ganttTasks',         t, 'project_id', 'projects',     'Tarea ' + (t.name||t.id)); });
    (db.boqItems           || []).forEach(function(b)  { chk('boqItems',           b, 'project_id', 'projects',     'BOQ ' + (b.description||b.id)); });
    (db.actualCosts        || []).forEach(function(c)  { chk('actualCosts',        c, 'project_id', 'projects',     'Costo ' + (c.description||c.id)); });
    (db.treasuryTx         || []).forEach(function(tx) { chk('treasuryTx',         tx,'account_id', 'bankAccounts', 'Mov. ' + (tx.description||tx.id)); });
    (db.paymentOrders      || []).forEach(function(op) { chk('paymentOrders', op, 'supplier_id', 'suppliers', 'OP ' + (op.number||op.id)); chk('paymentOrders', op, 'account_id', 'bankAccounts', 'OP ' + (op.number||op.id)); });
    (db.collections        || []).forEach(function(co) { chk('collections', co, 'invoice_id', 'invoices', 'Cobro ' + (co.reference||co.id)); chk('collections', co, 'project_id', 'projects', 'Cobro ' + (co.reference||co.id)); });

    // Journal entry accounts & balance
    (db.journalEntries || []).forEach(function(je) {
      (je.lines || []).forEach(function(l) {
        if (l.account_code && !sets.accountCodes.has(l.account_code))
          issues.push({ severity: 'error', collection: 'journalEntries', id: je.id, msg: 'Asiento ' + je.number + ': cuenta ' + l.account_code + ' no existe en el plan' });
      });
      if (je.status === 'posted') {
        var td = (je.lines || []).reduce(function(s, l) { return s + (l.debit || 0); }, 0);
        var tc = (je.lines || []).reduce(function(s, l) { return s + (l.credit || 0); }, 0);
        if (Math.abs(td - tc) > 1)
          issues.push({ severity: 'warning', collection: 'journalEntries', id: je.id, msg: 'Asiento ' + je.number + ' contabilizado pero desbalanceado (Debe ' + td.toLocaleString('es-AR') + ' != Haber ' + tc.toLocaleString('es-AR') + ')' });
      }
    });

    // Paid invoices vs collections
    (db.invoices || []).filter(function(inv) { return inv.status === 'paid'; }).forEach(function(inv) {
      var collected = (db.collections || []).filter(function(c) { return c.invoice_id === inv.id; }).reduce(function(s, c) { return s + c.amount; }, 0);
      if (collected < inv.total * 0.99)
        issues.push({ severity: 'warning', collection: 'invoices', id: inv.id, msg: 'Factura ' + inv.number + ' marcada "Cobrada" pero cobros registrados: $' + Math.round(collected).toLocaleString('es-AR') + ' de $' + Math.round(inv.total).toLocaleString('es-AR') });
    });

    // Duplicate PO numbers
    var poNums = (db.purchaseOrders || []).map(function(p) { return p.number; }).filter(Boolean);
    poNums.filter(function(n, i) { return poNums.indexOf(n) !== i; }).forEach(function(n) {
      issues.push({ severity: 'warning', collection: 'purchaseOrders', msg: 'Numero de OC duplicado: ' + n });
    });

    // Duplicate invoice numbers
    var invNums = (db.invoices || []).map(function(i) { return i.number; }).filter(Boolean);
    invNums.filter(function(n, i) { return invNums.indexOf(n) !== i; }).forEach(function(n) {
      issues.push({ severity: 'warning', collection: 'invoices', msg: 'Numero de factura duplicado: ' + n });
    });

    return issues;
  },

  // ---- RESET ----
  resetToSeed() {
    this.save(this.seed());
  },

  // ---- MULTI-COMPANY METHODS ----
  setCompany(id) {
    this._companyId = id;
    var existing = localStorage.getItem(this.KEY);
    if (!existing) {
      this.init();
    }
  },

  getGlobal() {
    try {
      var raw = localStorage.getItem(this.GLOBAL_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        var seed = this._seedGlobal();
        var needsSave = false;
        if (!data.taxPresets) {
          data.taxPresets = seed.taxPresets;
          needsSave = true;
        } else {
          Object.keys(seed.taxPresets).forEach(function(key) {
            if (!data.taxPresets[key]) {
              data.taxPresets[key] = seed.taxPresets[key];
              needsSave = true;
            }
          });
        }
        if (needsSave) this.saveGlobal(data);
        return data;
      }
      return this._initGlobal();
    } catch(e) {
      return this._initGlobal();
    }
  },

  saveGlobal(data) {
    localStorage.setItem(this.GLOBAL_KEY, JSON.stringify(data));
  },

  _initGlobal() {
    var global = this._seedGlobal();
    this.saveGlobal(global);

    // Migrate or seed comp-001
    var comp001Key = 'erp_company_comp-001_v1';
    if (!localStorage.getItem(comp001Key)) {
      var legacy = localStorage.getItem('erp_construccion_v1');
      if (legacy) {
        localStorage.setItem(comp001Key, legacy);
      } else {
        var prevId = this._companyId;
        this._companyId = 'comp-001';
        this.init();
        this._companyId = prevId;
      }
    }

    // Seed comp-002 if not present
    var comp002Key = 'erp_company_comp-002_v1';
    if (!localStorage.getItem(comp002Key)) {
      var prevId2 = this._companyId;
      this._companyId = 'comp-002';
      var uyData = this._seedCompanyUY();
      localStorage.setItem(comp002Key, JSON.stringify(uyData));
      this._companyId = prevId2;
    }

    return global;
  },

  getAllCompanies() {
    return this.getGlobal().companies || [];
  },

  saveCompanyRecord(company) {
    var global = this.getGlobal();
    if (!global.companies) global.companies = [];
    var idx = global.companies.findIndex(function(c) { return c.id === company.id; });
    if (idx === -1) {
      global.companies.push(company);
    } else {
      global.companies[idx] = Object.assign({}, global.companies[idx], company, { updated_at: now() });
    }
    this.saveGlobal(global);
  },

  removeCompanyRecord(id) {
    var global = this.getGlobal();
    global.companies = (global.companies || []).filter(function(c) { return c.id !== id; });
    this.saveGlobal(global);
    var key = 'erp_company_' + id + '_v1';
    localStorage.removeItem(key);
  },

  getAllCurrencies() {
    return this.getGlobal().currencies || [];
  },

  getExchangeRates() {
    return this.getGlobal().exchangeRates || [];
  },

  getTaxPresets() {
    return this.getGlobal().taxPresets || {};
  },

  insertGlobal(collection, record) {
    var global = this.getGlobal();
    if (!global[collection]) global[collection] = [];
    var item = Object.assign({}, record, { id: record.id || uuid(), created_at: now() });
    global[collection].push(item);
    this.saveGlobal(global);
    return item;
  },

  updateGlobal(collection, id, updates) {
    var global = this.getGlobal();
    var idx = (global[collection] || []).findIndex(function(x) { return x.id === id; });
    if (idx === -1) return null;
    global[collection][idx] = Object.assign({}, global[collection][idx], updates, { updated_at: now() });
    this.saveGlobal(global);
    return global[collection][idx];
  },

  removeGlobal(collection, id) {
    var global = this.getGlobal();
    global[collection] = (global[collection] || []).filter(function(x) { return x.id !== id; });
    this.saveGlobal(global);
  },

  getExchangeRate(from, to, date) {
    var rates = this.getExchangeRates();
    var targetDate = date || new Date().toISOString().split('T')[0];
    var matching = rates.filter(function(r) {
      return r.from === from && r.to === to && r.date <= targetDate;
    });
    if (!matching.length) return null;
    matching.sort(function(a, b) { return b.date.localeCompare(a.date); });
    return matching[0];
  },

  getAllForConsolidation(collection) {
    var companies = this.getAllCompanies();
    var result = [];
    var self = this;
    companies.forEach(function(company) {
      try {
        var key = 'erp_company_' + company.id + '_v1';
        var raw = localStorage.getItem(key);
        if (!raw) return;
        var db = JSON.parse(raw);
        var items = db[collection] || [];
        items.forEach(function(item) {
          var enriched = Object.assign({}, item, {
            _company_id: company.id,
            _company_name: company.name
          });
          result.push(enriched);
        });
      } catch(e) {}
    });
    return result;
  },

  _seedGlobal() {
    return {
      companies: [
        { id: 'comp-001', name: 'Constructora Norte', legalName: 'Constructora Norte S.A.', taxId: '30-12345678-1', country: 'AR', currency: 'ARS', taxRegime: 'responsable_inscripto', address: 'Av. Corrientes 1200, CABA', phone: '011-4444-5555', email: 'info@cnorte.com', active: true, created_at: now() },
        { id: 'comp-002', name: 'Inversiones del Sur', legalName: 'Inversiones del Sur S.R.L.', taxId: 'RUT-219876543', country: 'UY', currency: 'UYU', taxRegime: 'contribuyente', address: 'Av. 18 de Julio 1500, Montevideo', phone: '598-2-222-3333', email: 'info@isur.com.uy', active: true, created_at: now() },
      ],
      currencies: [
        { id: 'ARS', name: 'Peso Argentino', symbol: '$', decimals: 0 },
        { id: 'USD', name: 'Dolar Estadounidense', symbol: 'U$S', decimals: 2 },
        { id: 'UYU', name: 'Peso Uruguayo', symbol: '$U', decimals: 0 },
        { id: 'BRL', name: 'Real Brasileno', symbol: 'R$', decimals: 2 },
        { id: 'CLP', name: 'Peso Chileno', symbol: 'CLP$', decimals: 0 },
        { id: 'EUR', name: 'Euro', symbol: 'EUR', decimals: 2 },
      ],
      exchangeRates: [
        { id: 'er-001', date: '2025-06-01', from: 'USD', to: 'ARS', rate: 1100 },
        { id: 'er-002', date: '2025-06-01', from: 'USD', to: 'UYU', rate: 40 },
        { id: 'er-003', date: '2025-06-01', from: 'EUR', to: 'ARS', rate: 1200 },
        { id: 'er-004', date: '2025-06-01', from: 'EUR', to: 'UYU', rate: 44 },
        { id: 'er-005', date: '2025-05-01', from: 'USD', to: 'ARS', rate: 1050 },
        { id: 'er-006', date: '2025-05-01', from: 'USD', to: 'UYU', rate: 39.5 },
        { id: 'er-007', date: '2025-04-01', from: 'USD', to: 'ARS', rate: 1020 },
      ],
      taxPresets: {
        AR: { name: 'Argentina', taxes: [
          { id: 'ar-iva21', name: 'IVA 21%', type: 'iva', rate: 21, applies_to: 'sales' },
          { id: 'ar-iva105', name: 'IVA 10.5%', type: 'iva', rate: 10.5, applies_to: 'sales' },
          { id: 'ar-iva27', name: 'IVA 27%', type: 'iva', rate: 27, applies_to: 'sales' },
          { id: 'ar-ret-gan', name: 'Ret. Ganancias', type: 'withholding', rate: 6, applies_to: 'purchases' },
          { id: 'ar-ret-iva', name: 'Ret. IVA', type: 'withholding', rate: 10.5, applies_to: 'purchases' },
          { id: 'ar-ret-iibb-ba', name: 'Ret. IIBB Bs.As.', type: 'withholding', rate: 3, applies_to: 'purchases' },
          { id: 'ar-ret-iibb-caba', name: 'Ret. IIBB CABA', type: 'withholding', rate: 2.5, applies_to: 'purchases' },
          { id: 'ar-fondo-reparo', name: 'Fondo de Reparo', type: 'retention', rate: 5, applies_to: 'certificates' },
        ]},
        UY: { name: 'Uruguay', taxes: [
          { id: 'uy-iva22', name: 'IVA 22%', type: 'iva', rate: 22, applies_to: 'sales' },
          { id: 'uy-iva10', name: 'IVA Minimo 10%', type: 'iva', rate: 10, applies_to: 'sales' },
          { id: 'uy-irpf', name: 'IRPF', type: 'income_tax', rate: 12, applies_to: 'purchases' },
          { id: 'uy-irnr', name: 'IRNR', type: 'income_tax', rate: 12, applies_to: 'purchases' },
          { id: 'uy-fonasa', name: 'FONASA', type: 'social', rate: 3, applies_to: 'purchases' },
        ]},
        CL: { name: 'Chile', taxes: [
          { id: 'cl-iva19', name: 'IVA 19%', type: 'iva', rate: 19, applies_to: 'sales' },
          { id: 'cl-ret-hon', name: 'Ret. Honorarios', type: 'withholding', rate: 11.5, applies_to: 'purchases' },
          { id: 'cl-muni', name: 'Permiso Municipal', type: 'municipal', rate: 1.5, applies_to: 'construction' },
        ]},
        BR: { name: 'Brasil', taxes: [
          { id: 'br-icms', name: 'ICMS', type: 'sales_tax', rate: 18, applies_to: 'sales' },
          { id: 'br-pis', name: 'PIS', type: 'sales_tax', rate: 1.65, applies_to: 'sales' },
          { id: 'br-cofins', name: 'COFINS', type: 'sales_tax', rate: 7.6, applies_to: 'sales' },
          { id: 'br-iss', name: 'ISS', type: 'service_tax', rate: 5, applies_to: 'sales' },
          { id: 'br-irpj', name: 'IRPJ', type: 'income_tax', rate: 15, applies_to: 'purchases' },
          { id: 'br-csll', name: 'CSLL', type: 'income_tax', rate: 9, applies_to: 'purchases' },
        ]},
        US: { name: 'Estados Unidos', taxes: [
          { id: 'us-sales-tax', name: 'Sales Tax', type: 'sales_tax', rate: 8.5, applies_to: 'sales' },
          { id: 'us-corp-tax', name: 'Federal Corporate Tax', type: 'income_tax', rate: 21, applies_to: 'income' },
          { id: 'us-fica', name: 'FICA Employer', type: 'social', rate: 7.65, applies_to: 'payroll' },
          { id: 'us-fed-wh', name: 'Federal Withholding', type: 'withholding', rate: 24, applies_to: 'purchases' },
          { id: 'us-state-tax', name: 'State Tax (avg)', type: 'income_tax', rate: 5, applies_to: 'income' },
        ]},
      }
    };
  },

  _seedCompanyUY() {
    var p1 = 'proj-uy-001', p2 = 'proj-uy-002';
    var s1 = 'sup-uy-001', s2 = 'sup-uy-002';

    return {
      projects: [
        { id: p1, name: 'Torre Pocitos Montevideo', client: 'Inversiones Pocitos SA', type: 'residential', status: 'active', start_date: '2025-02-01', end_date: '2026-08-31', budget: 1500000, address: 'Av. Brasil 2800, Pocitos, Montevideo', description: 'Edificio residencial 10 pisos, 32 unidades', created_at: now() },
        { id: p2, name: 'Complejo Logistico Ruta 1', client: 'LogiUY SRL', type: 'industrial', status: 'planning', start_date: '2026-01-01', end_date: '2027-06-30', budget: 900000, address: 'Ruta 1 km 28, Montevideo', description: 'Depositos industriales 8.000 m2', created_at: now() },
      ],
      suppliers: [
        { id: s1, name: 'Materiales del Plata UY', cuit: 'RUT-123456789', contact: 'Jorge Fernandez', phone: '598-2-111-2222', email: 'ventas@matplata.com.uy', address: 'Av. Gral. Flores 2500, Montevideo', category: ['Materiales', 'Aridos'], status: 'active', created_at: now() },
        { id: s2, name: 'Construcciones del Este SRL', cuit: 'RUT-987654321', contact: 'Maria Gonzalez', phone: '598-2-333-4444', email: 'info@consteste.com.uy', address: 'Av. Italia 4200, Montevideo', category: ['Mano de Obra', 'Equipos'], status: 'active', created_at: now() },
      ],
      purchaseOrders: [
        { id: 'po-uy-001', number: 'OC-UY-2025-001', project_id: p1, supplier_id: s1, items: [{ description: 'Cemento Portland 50kg', unit: 'Bolsa', quantity: 300, unit_price: 100, total: 30000 }, { description: 'Hormigon H-25', unit: 'm3', quantity: 60, unit_price: 1500, total: 90000 }], subtotal: 120000, tax: 26400, total: 146400, status: 'received', date: '2025-03-10', expected_date: '2025-03-20', notes: '', created_at: now() },
      ],
      purchaseRequisitions: [
        { id: 'req-uy-001', number: 'OP-UY-2025-001', project_id: p1, requested_by: 'Ing. Suarez (Jefe de Obra)', priority: 'urgent', required_date: '2025-05-15', status: 'approved', items: [{ description: 'Hierro nervado 10mm', rubro: 'Estructura', unit: 'kg', quantity: 2000, unit_price: 40, total: 80000 }], total: 80000, notes: 'Para estructura nivel 2 y 3', approved_by: 'Administrador', approved_date: '2025-04-22', submitted_date: '2025-04-20', po_id: null, created_at: now() },
      ],
      boqItems: [
        { id: uuid(), project_id: p1, chapter: '01', item: '01.01', category: 'Estructura', description: 'Hormigon armado fundaciones', unit: 'm3', quantity: 200, unit_price: 2800, total: 560000, created_at: now() },
        { id: uuid(), project_id: p1, chapter: '01', item: '01.02', category: 'Estructura', description: 'Hormigon armado columnas y losas', unit: 'm3', quantity: 600, unit_price: 2600, total: 1560000, created_at: now() },
        { id: uuid(), project_id: p1, chapter: '02', item: '02.01', category: 'Mamposteria', description: 'Albanileria ladrillo hueco', unit: 'm2', quantity: 3200, unit_price: 420, total: 1344000, created_at: now() },
        { id: uuid(), project_id: p2, chapter: '01', item: '01.01', category: 'Estructura', description: 'Pilotes y fundaciones', unit: 'm3', quantity: 400, unit_price: 4200, total: 1680000, created_at: now() },
      ],
      actualCosts: [
        { id: uuid(), project_id: p1, category: 'Estructura', description: 'Hormigon real ejecutado', amount: 600000, date: '2025-03-15', reference: 'OC-UY-2025-001', created_at: now() },
        { id: uuid(), project_id: p1, category: 'Estructura', description: 'Hierros y armaduras', amount: 380000, date: '2025-04-10', reference: 'OC-UY-2025-002', created_at: now() },
      ],
      ganttTasks: [
        { id: 'gt-uy-001', project_id: p1, name: 'Demolicion y limpieza', start_date: '2025-02-01', end_date: '2025-03-01', progress: 100, status: 'completed', assignee: 'Equipo A', color: 'green', dependencies: [], created_at: now() },
        { id: 'gt-uy-002', project_id: p1, name: 'Fundaciones', start_date: '2025-03-01', end_date: '2025-05-31', progress: 70, status: 'in_progress', assignee: 'Equipo B', color: 'blue', dependencies: ['gt-uy-001'], created_at: now() },
        { id: 'gt-uy-003', project_id: p1, name: 'Estructura P1-P5', start_date: '2025-05-01', end_date: '2025-10-31', progress: 20, status: 'in_progress', assignee: 'Equipo C', color: 'blue', dependencies: ['gt-uy-002'], created_at: now() },
      ],
      invoices: [
        { id: 'inv-uy-001', number: 'FA-UY-0001-00000001', type: 'E', project_id: p1, client_name: 'Inversiones Pocitos SA', client_cuit: 'RUT-456789123', client_address: 'Av. Brasil 2800, Pocitos, Montevideo', items: [{ description: 'Certificacion obra - Marzo 2025', unit: 'Global', quantity: 1, unit_price: 450000, total: 450000, tax_rate: 22 }], subtotal: 450000, tax: 99000, total: 549000, status: 'paid', date: '2025-03-31', due_date: '2025-04-30', notes: 'Certificado N1', created_at: now() },
      ],
      collections: [
        { id: uuid(), invoice_id: 'inv-uy-001', project_id: p1, amount: 549000, date: '2025-04-15', method: 'transfer', reference: 'TRF-UY-20250415', notes: '', created_at: now() },
      ],
      bankAccounts: [
        { id: 'ba-uy-001', name: 'Cuenta Operativa BROU', bank: 'Banco de la Republica Oriental del Uruguay', account_number: '001234567890', currency: 'UYU', initial_balance: 200000, type: 'checking', created_at: now() },
        { id: 'ba-uy-002', name: 'Cuenta Dolares Itau', bank: 'Itau Uruguay', account_number: '009876543210', currency: 'USD', initial_balance: 50000, type: 'savings', created_at: now() },
      ],
      treasuryTx: [
        { id: uuid(), account_id: 'ba-uy-001', project_id: p1, type: 'income', category: 'Cobro factura', description: 'Cobro FA-UY-0001-00000001', amount: 549000, date: '2025-04-15', reference: 'TRF-UY-20250415', created_at: now() },
        { id: uuid(), account_id: 'ba-uy-001', project_id: p1, type: 'expense', category: 'Pago proveedor', description: 'Pago OC-UY-2025-001 - Materiales del Plata UY', amount: 146400, date: '2025-03-25', reference: 'PG-UY-0312', created_at: now() },
      ],
      accounts: [
        { id: 'ac-uy-100', code: '1', name: 'ACTIVO', type: 'asset', parent_id: null, active: true, created_at: now() },
        { id: 'ac-uy-101', code: '1.1', name: 'Activo Corriente', type: 'asset', parent_id: 'ac-uy-100', active: true, created_at: now() },
        { id: 'ac-uy-102', code: '1.1.1', name: 'Caja y Bancos', type: 'asset', parent_id: 'ac-uy-101', active: true, created_at: now() },
        { id: 'ac-uy-103', code: '1.1.2', name: 'Cuentas por Cobrar', type: 'asset', parent_id: 'ac-uy-101', active: true, created_at: now() },
        { id: 'ac-uy-200', code: '2', name: 'PASIVO', type: 'liability', parent_id: null, active: true, created_at: now() },
        { id: 'ac-uy-201', code: '2.1', name: 'Pasivo Corriente', type: 'liability', parent_id: 'ac-uy-200', active: true, created_at: now() },
        { id: 'ac-uy-202', code: '2.1.1', name: 'Cuentas por Pagar', type: 'liability', parent_id: 'ac-uy-201', active: true, created_at: now() },
        { id: 'ac-uy-203', code: '2.1.2', name: 'IVA a Pagar', type: 'liability', parent_id: 'ac-uy-201', active: true, created_at: now() },
        { id: 'ac-uy-300', code: '3', name: 'PATRIMONIO NETO', type: 'equity', parent_id: null, active: true, created_at: now() },
        { id: 'ac-uy-301', code: '3.1', name: 'Capital Social', type: 'equity', parent_id: 'ac-uy-300', active: true, created_at: now() },
        { id: 'ac-uy-400', code: '4', name: 'INGRESOS', type: 'revenue', parent_id: null, active: true, created_at: now() },
        { id: 'ac-uy-401', code: '4.1', name: 'Ingresos por Obras', type: 'revenue', parent_id: 'ac-uy-400', active: true, created_at: now() },
        { id: 'ac-uy-500', code: '5', name: 'EGRESOS', type: 'expense', parent_id: null, active: true, created_at: now() },
        { id: 'ac-uy-501', code: '5.1', name: 'Costo de Obras', type: 'expense', parent_id: 'ac-uy-500', active: true, created_at: now() },
        { id: 'ac-uy-502', code: '5.2', name: 'Gastos de Administracion', type: 'expense', parent_id: 'ac-uy-500', active: true, created_at: now() },
      ],
      rubros: [
        { id: 'rub-uy-001', code: '01', name: 'Trabajos Preliminares', unit: 'gl', category: 'Trabajos Preliminares', description: 'Limpieza y preparacion del sitio', active: true, created_at: now() },
        { id: 'rub-uy-002', code: '02', name: 'Movimiento de Suelos', unit: 'm3', category: 'Estructuras', description: 'Excavacion y rellenos', active: true, created_at: now() },
        { id: 'rub-uy-003', code: '03', name: 'Hormigon Armado', unit: 'm3', category: 'Estructuras', description: 'Hormigon estructural H-21 a H-30 con armadura', active: true, created_at: now() },
        { id: 'rub-uy-004', code: '04', name: 'Mamposteria', unit: 'm2', category: 'Albanileria', description: 'Muros de ladrillo ceramico', active: true, created_at: now() },
        { id: 'rub-uy-005', code: '05', name: 'Instalacion Electrica', unit: 'gl', category: 'Instalaciones', description: 'Instalacion electrica completa', active: true, created_at: now() },
        { id: 'rub-uy-006', code: '06', name: 'Instalacion Sanitaria', unit: 'gl', category: 'Instalaciones', description: 'Agua fria caliente y saneamiento', active: true, created_at: now() },
      ],
      certificates: [
        { id: 'cert-uy-001', number: 'CERT-UY-2025-001', project_id: p1, date: '2025-03-31', period_from: '2025-03-01', period_to: '2025-03-31', status: 'approved', approved_by: 'Director de Obra', items: [{ description: 'Fundaciones', unit: 'm3', quantity_contract: 200, quantity_period: 80, unit_price: 2800, amount_period: 224000, pct_complete: 40 }], subtotal: 224000, retention_pct: 5, retention_amount: 11200, net_amount: 212800, invoice_id: 'inv-uy-001', notes: 'Primer certificado', created_at: now() },
      ],
      paymentOrders: [
        { id: 'po-uy-ord-001', number: 'OP-UY-2025-001', supplier_id: s1, project_id: p1, account_id: 'ba-uy-001', date: '2025-03-25', reference_doc: 'OC-UY-2025-001', concept: 'Pago Materiales del Plata UY - OC-UY-2025-001', gross_amount: 146400, retentions: [{ retention_id: 'ret-uy-001', name: 'IRPF', rate: 12, amount: 17568 }], total_retentions: 17568, net_amount: 128832, status: 'paid', notes: '', created_at: now() },
      ],
      retentions: [
        { id: 'ret-uy-001', name: 'IRPF (Impuesto Renta Personas Fisicas)', type: 'IRPF', rate: 12, applies_to: 'payment', active: true, created_at: now() },
        { id: 'ret-uy-002', name: 'IRNR (No Residentes)', type: 'IRNR', rate: 12, applies_to: 'payment', active: true, created_at: now() },
        { id: 'ret-uy-003', name: 'FONASA', type: 'Social', rate: 3, applies_to: 'payment', active: true, created_at: now() },
        { id: 'ret-uy-004', name: 'Fondo de Reparo Obra', type: 'Fondo Reparo', rate: 5, applies_to: 'certificate', active: true, created_at: now() },
      ],
      priceIndices: [
        { id: 'idx-uy-001', name: 'INE - Indice Costo Construccion Uruguay', code: 'ICC-UY', category: 'General', base_date: '2020-01-01', base_value: 100, current_value: 188.5, last_update: '2025-04-01', source: 'Instituto Nacional de Estadistica', active: true, history: [{ date: '2025-01-01', value: 175.0 }, { date: '2025-02-01', value: 180.5 }, { date: '2025-03-01', value: 185.0 }, { date: '2025-04-01', value: 188.5 }], created_at: now() },
      ],
      cashflowProjections: [
        { id: uuid(), project_id: p1, type: 'income', description: 'Certificacion Mayo 2025', amount: 480000, expected_date: '2025-05-31', probability: 90, category: 'Certificacion', created_at: now() },
        { id: uuid(), project_id: p1, type: 'expense', description: 'Pago proveedores Mayo', amount: 200000, expected_date: '2025-05-15', probability: 95, category: 'Pago proveedor', created_at: now() },
      ],
      users: [
        { id: 'usr-uy-001', name: 'Administrador UY', email: 'admin@isur.com.uy', role: 'admin', active: true, last_login: now(), created_at: now() },
        { id: 'usr-uy-002', name: 'Gerente de Obra UY', email: 'gerente@isur.com.uy', role: 'project_manager', active: true, last_login: now(), created_at: now() },
      ],
      journalEntries: [
        { id: 'je-uy-001', number: 'AS-UY-2025-001', date: '2025-03-31', description: 'Facturacion Certificado N1 - Torre Pocitos', lines: [{ account_code: '1.1.2', account_name: 'Cuentas por Cobrar', debit: 549000, credit: 0, description: 'Inversiones Pocitos SA' }, { account_code: '4.1', account_name: 'Ingresos por Obras', debit: 0, credit: 450000, description: 'Ingreso obra Torre Pocitos Cert.1' }, { account_code: '2.1.2', account_name: 'IVA a Pagar', debit: 0, credit: 99000, description: 'IVA FA-UY-0001-00000001' }], status: 'posted', created_at: now() },
      ],
    };
  },

  // ---- SEED DATA ----
  seed() {
    var p1 = 'proj-001', p2 = 'proj-002', p3 = 'proj-003';
    var s1 = 'sup-001', s2 = 'sup-002', s3 = 'sup-003';

    return {
      projects: [
        { id: p1, name: 'Torre Residencial Palermo', client: 'Inversiones RP SA', type: 'residential', status: 'active', start_date: '2025-01-15', end_date: '2026-06-30', budget: 45000000, address: 'Av. Santa Fe 3200, CABA', description: 'Edificio residencial 12 pisos, 48 unidades', created_at: now() },
        { id: p2, name: 'Centro Comercial Quilmes', client: 'Grupo Inversion Sur', type: 'commercial', status: 'active', start_date: '2024-09-01', end_date: '2026-03-31', budget: 82000000, address: 'Av. Calchaqui 1500, Quilmes', description: 'Shopping center 3 niveles, 120 locales', created_at: now() },
        { id: p3, name: 'Complejo Industrial Delta', client: 'LogiPark SRL', type: 'industrial', status: 'planning', start_date: '2026-03-01', end_date: '2027-08-31', budget: 28000000, address: 'Parque Industrial Delta, Tigre', description: 'Galpones industriales 15.000 m2', created_at: now() },
      ],
      suppliers: [
        { id: s1, name: 'Materiales del Norte SA', cuit: '30-12345678-9', contact: 'Carlos Perez', phone: '011-4523-1234', email: 'ventas@matelnorte.com', address: 'Av. Belgrano 1500, CABA', category: ['Materiales', 'Aridos'], status: 'active', created_at: now() },
        { id: s2, name: 'Herramientas Profesionales SRL', cuit: '30-87654321-0', contact: 'Ana Garcia', phone: '011-4987-5678', email: 'info@herpro.com', address: 'Ruta 3 km 42, La Matanza', category: ['Herramientas', 'Equipos'], status: 'active', created_at: now() },
        { id: s3, name: 'Cemento y Hormigon del Plata', cuit: '30-55566677-1', contact: 'Roberto Sanchez', phone: '0800-222-3333', email: 'comercial@chplata.com', address: 'Av. Mitre 8000, Avellaneda', category: ['Cemento', 'Hormigon'], status: 'active', created_at: now() },
      ],
      purchaseOrders: [
        { id: 'po-001', number: 'OC-2025-001', project_id: p1, supplier_id: s3, items: [{ description: 'Cemento Portland 50kg', unit: 'Bolsa', quantity: 500, unit_price: 2800, total: 1400000 }, { description: 'Hormigon H-25', unit: 'm3', quantity: 80, unit_price: 45000, total: 3600000 }], subtotal: 5000000, tax: 1050000, total: 6050000, status: 'received', date: '2025-03-10', expected_date: '2025-03-20', notes: '', created_at: now() },
        { id: 'po-002', number: 'OC-2025-002', project_id: p1, supplier_id: s1, items: [{ description: 'Hierro nervado 12mm', unit: 'kg', quantity: 8000, unit_price: 1200, total: 9600000 }, { description: 'Hierro liso 8mm', unit: 'kg', quantity: 2000, unit_price: 980, total: 1960000 }], subtotal: 11560000, tax: 2427600, total: 13987600, status: 'sent', date: '2025-04-05', expected_date: '2025-04-18', notes: '', created_at: now() },
        { id: 'po-003', number: 'OC-2025-003', project_id: p2, supplier_id: s2, items: [{ description: 'Andamio tubular', unit: 'Modulo', quantity: 200, unit_price: 15000, total: 3000000 }, { description: 'Equipo de soldadura', unit: 'Unidad', quantity: 3, unit_price: 85000, total: 255000 }], subtotal: 3255000, tax: 683550, total: 3938550, status: 'draft', date: '2025-04-20', expected_date: '2025-05-05', notes: 'Incluir seguro de transporte', created_at: now() },
      ],
      purchaseRequisitions: [
        { id: 'req-001', number: 'OP-2025-001', project_id: p1, requested_by: 'Ing. Martinez (Jefe de Obra)', priority: 'urgent', required_date: '2025-05-15', status: 'approved', items: [{ description: 'Hierro nervado 10mm', rubro: 'Estructura', unit: 'kg', quantity: 3000, unit_price: 1100, total: 3300000 }, { description: 'Alambre de atar', rubro: 'Estructura', unit: 'kg', quantity: 50, unit_price: 2500, total: 125000 }], total: 3425000, notes: 'Para estructura nivel 3 y 4', approved_by: 'Administrador', approved_date: '2025-04-22', submitted_date: '2025-04-20', po_id: null, created_at: now() },
        { id: 'req-002', number: 'OP-2025-002', project_id: p2, requested_by: 'Arq. Lopez (Encargado)', priority: 'normal', required_date: '2025-06-10', status: 'submitted', items: [{ description: 'Pintura latex interior blanco 20L', rubro: 'Terminaciones', unit: 'Balde', quantity: 120, unit_price: 18500, total: 2220000 }, { description: 'Sellador para paredes', rubro: 'Terminaciones', unit: 'Balde', quantity: 60, unit_price: 12000, total: 720000 }], total: 2940000, notes: '', approved_by: null, approved_date: null, submitted_date: '2025-05-01', po_id: null, created_at: now() },
        { id: 'req-003', number: 'OP-2025-003', project_id: p1, requested_by: 'Tec. Rodriguez', priority: 'critical', required_date: '2025-04-28', status: 'draft', items: [{ description: 'Encofrado metalico 1.20x2.40m', rubro: 'Encofrados', unit: 'Panel', quantity: 40, unit_price: 45000, total: 1800000 }], total: 1800000, notes: 'Necesario para losa del 5to piso', approved_by: null, approved_date: null, submitted_date: null, po_id: null, created_at: now() },
      ],
      boqItems: [
        // Torre Palermo
        { id: uuid(), project_id: p1, chapter: '01', item: '01.01', category: 'Estructura', description: 'Hormigon armado fundaciones', unit: 'm3', quantity: 320, unit_price: 85000, total: 27200000, created_at: now() },
        { id: uuid(), project_id: p1, chapter: '01', item: '01.02', category: 'Estructura', description: 'Hormigon armado columnas y losas', unit: 'm3', quantity: 1200, unit_price: 78000, total: 93600000, created_at: now() },
        { id: uuid(), project_id: p1, chapter: '02', item: '02.01', category: 'Mamposteria', description: 'Albanileria ladrillo hueco', unit: 'm2', quantity: 4800, unit_price: 12500, total: 60000000, created_at: now() },
        { id: uuid(), project_id: p1, chapter: '02', item: '02.02', category: 'Mamposteria', description: 'Revoques interiores', unit: 'm2', quantity: 9600, unit_price: 4800, total: 46080000, created_at: now() },
        { id: uuid(), project_id: p1, chapter: '03', item: '03.01', category: 'Instalaciones', description: 'Instalacion electrica', unit: 'm2', quantity: 4800, unit_price: 8500, total: 40800000, created_at: now() },
        { id: uuid(), project_id: p1, chapter: '03', item: '03.02', category: 'Instalaciones', description: 'Instalacion sanitaria', unit: 'm2', quantity: 4800, unit_price: 7200, total: 34560000, created_at: now() },
        // Shopping Quilmes
        { id: uuid(), project_id: p2, chapter: '01', item: '01.01', category: 'Estructura', description: 'Pilotes y fundaciones especiales', unit: 'm3', quantity: 850, unit_price: 125000, total: 106250000, created_at: now() },
        { id: uuid(), project_id: p2, chapter: '01', item: '01.02', category: 'Estructura', description: 'Estructura metalica principal', unit: 'tn', quantity: 480, unit_price: 380000, total: 182400000, created_at: now() },
        { id: uuid(), project_id: p2, chapter: '02', item: '02.01', category: 'Cerramiento', description: 'Fachada vidriada', unit: 'm2', quantity: 2800, unit_price: 55000, total: 154000000, created_at: now() },
      ],
      actualCosts: [
        { id: uuid(), project_id: p1, category: 'Estructura', description: 'Hormigon real ejecutado', amount: 28500000, date: '2025-03-15', reference: 'OC-2025-001', created_at: now() },
        { id: uuid(), project_id: p1, category: 'Estructura', description: 'Hierros y armaduras', amount: 13987600, date: '2025-04-10', reference: 'OC-2025-002', created_at: now() },
        { id: uuid(), project_id: p1, category: 'Mamposteria', description: 'Ladrillos semana 1-4', amount: 18500000, date: '2025-04-20', reference: 'Rem-045', created_at: now() },
        { id: uuid(), project_id: p2, category: 'Estructura', description: 'Pilotes ejecutados', amount: 112000000, date: '2025-02-28', reference: 'OC-2024-088', created_at: now() },
      ],
      ganttTasks: [
        { id: 'gt-001', project_id: p1, name: 'Demolicion y limpieza', start_date: '2025-01-15', end_date: '2025-02-15', progress: 100, status: 'completed', assignee: 'Equipo A', color: 'green', dependencies: [], created_at: now() },
        { id: 'gt-002', project_id: p1, name: 'Fundaciones y pilotes', start_date: '2025-02-01', end_date: '2025-04-30', progress: 85, status: 'in_progress', assignee: 'Equipo B', color: 'blue', dependencies: ['gt-001'], created_at: now() },
        { id: 'gt-003', project_id: p1, name: 'Estructura hormigon P1-P6', start_date: '2025-04-01', end_date: '2025-08-31', progress: 40, status: 'in_progress', assignee: 'Equipo C', color: 'blue', dependencies: ['gt-002'], created_at: now() },
        { id: 'gt-004', project_id: p1, name: 'Estructura hormigon P7-P12', start_date: '2025-08-01', end_date: '2025-12-31', progress: 0, status: 'pending', assignee: 'Equipo C', color: 'gray', dependencies: ['gt-003'], created_at: now() },
        { id: 'gt-005', project_id: p1, name: 'Mamposteria y revoques', start_date: '2025-06-01', end_date: '2026-03-31', progress: 10, status: 'in_progress', assignee: 'Equipo D', color: 'yellow', dependencies: ['gt-003'], created_at: now() },
        { id: 'gt-006', project_id: p1, name: 'Instalaciones electricas', start_date: '2025-09-01', end_date: '2026-04-30', progress: 0, status: 'pending', assignee: 'ElecTech SRL', color: 'gray', dependencies: ['gt-004'], created_at: now() },
        { id: 'gt-007', project_id: p1, name: 'Terminaciones y entrega', start_date: '2026-03-01', end_date: '2026-06-30', progress: 0, status: 'pending', assignee: 'Equipo E', color: 'gray', dependencies: ['gt-005', 'gt-006'], created_at: now() },
        { id: 'gt-008', project_id: p2, name: 'Movimiento de suelos', start_date: '2024-09-01', end_date: '2024-11-30', progress: 100, status: 'completed', assignee: 'Vial SA', color: 'green', dependencies: [], created_at: now() },
        { id: 'gt-009', project_id: p2, name: 'Pilotes y fundaciones', start_date: '2024-10-01', end_date: '2025-02-28', progress: 100, status: 'completed', assignee: 'Ciment AR', color: 'green', dependencies: ['gt-008'], created_at: now() },
        { id: 'gt-010', project_id: p2, name: 'Estructura metalica', start_date: '2025-02-01', end_date: '2025-08-31', progress: 60, status: 'in_progress', assignee: 'Metaler SA', color: 'blue', dependencies: ['gt-009'], created_at: now() },
      ],
      invoices: [
        { id: 'inv-001', number: 'FA-0001-00001234', type: 'A', project_id: p1, client_name: 'Inversiones RP SA', client_cuit: '30-99887766-5', client_address: 'Av. Corrientes 1200, CABA', items: [{ description: 'Certificacion obra - Marzo 2025', unit: 'Global', quantity: 1, unit_price: 12500000, total: 12500000, tax_rate: 21 }], subtotal: 12500000, tax: 2625000, total: 15125000, status: 'paid', date: '2025-03-31', due_date: '2025-04-30', notes: 'Certificado N1', created_at: now() },
        { id: 'inv-002', number: 'FA-0001-00001235', type: 'A', project_id: p1, client_name: 'Inversiones RP SA', client_cuit: '30-99887766-5', client_address: 'Av. Corrientes 1200, CABA', items: [{ description: 'Certificacion obra - Abril 2025', unit: 'Global', quantity: 1, unit_price: 14800000, total: 14800000, tax_rate: 21 }], subtotal: 14800000, tax: 3108000, total: 17908000, status: 'sent', date: '2025-04-30', due_date: '2025-05-31', notes: 'Certificado N2', created_at: now() },
        { id: 'inv-003', number: 'FA-0001-00001236', type: 'A', project_id: p2, client_name: 'Grupo Inversion Sur', client_cuit: '30-44556677-8', client_address: 'Av. Rivadavia 5500, CABA', items: [{ description: 'Certificacion obra - Marzo 2025 (estructura)', unit: 'Global', quantity: 1, unit_price: 28000000, total: 28000000, tax_rate: 21 }], subtotal: 28000000, tax: 5880000, total: 33880000, status: 'overdue', date: '2025-03-31', due_date: '2025-04-30', notes: '', created_at: now() },
      ],
      collections: [
        { id: uuid(), invoice_id: 'inv-001', project_id: p1, amount: 15125000, date: '2025-04-15', method: 'transfer', reference: 'TRF-20250415', notes: '', created_at: now() },
        { id: uuid(), invoice_id: 'inv-002', project_id: p1, amount: 5000000, date: '2025-05-10', method: 'check', reference: 'CHQ-001122', notes: 'Pago parcial', created_at: now() },
      ],
      bankAccounts: [
        { id: 'ba-001', name: 'Cuenta Operativa Principal', bank: 'Banco Nacion Argentina', account_number: '0110-0322-33-000012345-6', currency: 'ARS', initial_balance: 5000000, type: 'checking', created_at: now() },
        { id: 'ba-002', name: 'Caja Chica Obra P1', bank: 'Efectivo', account_number: '-', currency: 'ARS', initial_balance: 500000, type: 'cash', created_at: now() },
        { id: 'ba-003', name: 'Cuenta Dolares', bank: 'Banco Galicia', account_number: '0077-0322-41-000098765-4', currency: 'USD', initial_balance: 120000, type: 'savings', created_at: now() },
      ],
      treasuryTx: [
        { id: uuid(), account_id: 'ba-001', project_id: p1, type: 'income', category: 'Cobro factura', description: 'Cobro FA-0001-00001234', amount: 15125000, date: '2025-04-15', reference: 'TRF-20250415', created_at: now() },
        { id: uuid(), account_id: 'ba-001', project_id: p1, type: 'expense', category: 'Pago proveedor', description: 'Pago OC-2025-001 - Cemento y Hormigon del Plata', amount: 6050000, date: '2025-03-25', reference: 'PG-0312', created_at: now() },
        { id: uuid(), account_id: 'ba-001', project_id: p1, type: 'expense', category: 'Sueldos', description: 'Liquidacion sueldos Marzo 2025', amount: 4200000, date: '2025-03-31', reference: 'NOM-202503', created_at: now() },
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
        { id: 'ac-502', code: '5.2', name: 'Gastos de Administracion', type: 'expense', parent_id: 'ac-500', active: true, created_at: now() },
        { id: 'ac-503', code: '5.3', name: 'Sueldos y Cargas Sociales', type: 'expense', parent_id: 'ac-500', active: true, created_at: now() },
      ],
      rubros: [
        { id: 'rub-001', code: '01', name: 'Trabajos Preliminares', unit: 'gl', category: 'Trabajos Preliminares', description: 'Limpieza, cerramiento provisorio, instalaciones temporarias', active: true, created_at: now() },
        { id: 'rub-002', code: '02', name: 'Movimiento de Suelos', unit: 'm3', category: 'Estructuras', description: 'Excavacion, nivelacion y rellenos compactados', active: true, created_at: now() },
        { id: 'rub-003', code: '03', name: 'Hormigon Armado', unit: 'm3', category: 'Estructuras', description: 'Hormigon estructural H-21 a H-30 con armadura', active: true, created_at: now() },
        { id: 'rub-004', code: '04', name: 'Mamposteria', unit: 'm2', category: 'Albanileria', description: 'Muros de ladrillo ceramico hueco', active: true, created_at: now() },
        { id: 'rub-005', code: '05', name: 'Revoques', unit: 'm2', category: 'Terminaciones', description: 'Revoque grueso y fino interior y exterior', active: true, created_at: now() },
        { id: 'rub-006', code: '06', name: 'Carpinteria Metalica', unit: 'un', category: 'Carpinteria', description: 'Ventanas, puertas y marcos metalicos', active: true, created_at: now() },
        { id: 'rub-007', code: '07', name: 'Carpinteria de Madera', unit: 'un', category: 'Carpinteria', description: 'Puertas placares y muebles de madera', active: true, created_at: now() },
        { id: 'rub-008', code: '08', name: 'Instalacion Electrica', unit: 'gl', category: 'Instalaciones', description: 'Instalacion electrica completa tableros y artefactos', active: true, created_at: now() },
        { id: 'rub-009', code: '09', name: 'Instalacion Sanitaria', unit: 'gl', category: 'Instalaciones', description: 'Agua fria caliente y cloacal', active: true, created_at: now() },
        { id: 'rub-010', code: '10', name: 'Cubierta', unit: 'm2', category: 'Cubiertas', description: 'Impermeabilizacion y cubierta de techo', active: true, created_at: now() },
        { id: 'rub-011', code: '11', name: 'Pintura', unit: 'm2', category: 'Terminaciones', description: 'Pintura latex interior y esmalte exterior', active: true, created_at: now() },
        { id: 'rub-012', code: '12', name: 'Pisos y Revestimientos', unit: 'm2', category: 'Terminaciones', description: 'Pisos ceramicos porcelanicos y revestimientos', active: true, created_at: now() },
      ],
      certificates: [
        { id: 'cert-001', number: 'CERT-2025-001', project_id: p1, date: '2025-03-31', period_from: '2025-03-01', period_to: '2025-03-31', status: 'approved', approved_by: 'Director de Obra', items: [{ description: 'Fundaciones y pilotes', unit: 'm3', quantity_contract: 320, quantity_period: 180, unit_price: 85000, amount_period: 15300000, pct_complete: 56.25 }, { description: 'Estructura P1-P3', unit: 'm3', quantity_contract: 1200, quantity_period: 120, unit_price: 78000, amount_period: 9360000, pct_complete: 10 }], subtotal: 24660000, retention_pct: 5, retention_amount: 1233000, net_amount: 23427000, invoice_id: 'inv-001', notes: 'Primer certificado de avance', created_at: now() },
        { id: 'cert-002', number: 'CERT-2025-002', project_id: p1, date: '2025-04-30', period_from: '2025-04-01', period_to: '2025-04-30', status: 'pending', approved_by: '', items: [{ description: 'Estructura P4-P6', unit: 'm3', quantity_contract: 1200, quantity_period: 150, unit_price: 78000, amount_period: 11700000, pct_complete: 12.5 }, { description: 'Mamposteria planta baja', unit: 'm2', quantity_contract: 4800, quantity_period: 480, unit_price: 12500, amount_period: 6000000, pct_complete: 10 }], subtotal: 17700000, retention_pct: 5, retention_amount: 885000, net_amount: 16815000, invoice_id: 'inv-002', notes: 'Segundo certificado', created_at: now() },
        { id: 'cert-003', number: 'CERT-2025-003', project_id: p2, date: '2025-03-31', period_from: '2025-03-01', period_to: '2025-03-31', status: 'approved', approved_by: 'Inspeccion Tecnica', items: [{ description: 'Estructura metalica - Nivel 1', unit: 'tn', quantity_contract: 480, quantity_period: 120, unit_price: 380000, amount_period: 45600000, pct_complete: 25 }], subtotal: 45600000, retention_pct: 5, retention_amount: 2280000, net_amount: 43320000, invoice_id: 'inv-003', notes: '', created_at: now() },
      ],
      paymentOrders: [
        { id: 'po-ord-001', number: 'OP-2025-001', supplier_id: s3, project_id: p1, account_id: 'ba-001', date: '2025-03-25', reference_doc: 'OC-2025-001', concept: 'Pago Cemento y Hormigon del Plata - OC-2025-001', gross_amount: 6050000, retentions: [{ retention_id: 'ret-001', name: 'Ret. IIBB Bs.As.', rate: 3, amount: 181500 }, { retention_id: 'ret-002', name: 'Ret. Ganancias', rate: 2, amount: 121000 }], total_retentions: 302500, net_amount: 5747500, status: 'paid', notes: '', created_at: now() },
        { id: 'po-ord-002', number: 'OP-2025-002', supplier_id: s1, project_id: p1, account_id: 'ba-001', date: '2025-04-15', reference_doc: 'OC-2025-002', concept: 'Pago anticipo hierros - Materiales del Norte SA', gross_amount: 4000000, retentions: [{ retention_id: 'ret-001', name: 'Ret. IIBB Bs.As.', rate: 3, amount: 120000 }], total_retentions: 120000, net_amount: 3880000, status: 'paid', notes: 'Anticipo 30%', created_at: now() },
        { id: 'po-ord-003', number: 'OP-2025-003', supplier_id: s2, project_id: p2, account_id: 'ba-001', date: '2025-05-01', reference_doc: 'OC-2025-003', concept: 'Pago andamios - Herramientas Profesionales SRL', gross_amount: 3938550, retentions: [], total_retentions: 0, net_amount: 3938550, status: 'pending', notes: '', created_at: now() },
      ],
      retentions: [
        { id: 'ret-001', name: 'Ret. IIBB Buenos Aires', type: 'IIBB', rate: 3, applies_to: 'payment', active: true, created_at: now() },
        { id: 'ret-002', name: 'Ret. Ganancias (RG 830)', type: 'Ganancias', rate: 2, applies_to: 'payment', active: true, created_at: now() },
        { id: 'ret-003', name: 'Ret. IVA (RG 2854)', type: 'IVA', rate: 10.5, applies_to: 'payment', active: false, created_at: now() },
        { id: 'ret-004', name: 'Fondo de Reparo Obra', type: 'Fondo Reparo', rate: 5, applies_to: 'certificate', active: true, created_at: now() },
        { id: 'ret-005', name: 'Ret. IIBB CABA', type: 'IIBB', rate: 2.5, applies_to: 'payment', active: true, created_at: now() },
      ],
      priceIndices: [
        { id: 'idx-001', name: 'CAC - Indice General de la Construccion', code: 'CAC', category: 'General', base_date: '2020-01-01', base_value: 100, current_value: 342.5, last_update: '2025-04-01', source: 'Camara Argentina de la Construccion', active: true, history: [{ date: '2025-01-01', value: 295.0 }, { date: '2025-02-01', value: 310.5 }, { date: '2025-03-01', value: 328.0 }, { date: '2025-04-01', value: 342.5 }], created_at: now() },
        { id: 'idx-002', name: 'INDEC - Indice Costo Construccion', code: 'ICC', category: 'General', base_date: '2020-01-01', base_value: 100, current_value: 518.3, last_update: '2025-04-01', source: 'INDEC', active: true, history: [{ date: '2025-01-01', value: 440.0 }, { date: '2025-02-01', value: 468.5 }, { date: '2025-03-01', value: 495.2 }, { date: '2025-04-01', value: 518.3 }], created_at: now() },
        { id: 'idx-003', name: 'UOCRA - Mano de Obra', code: 'MO', category: 'Mano de Obra', base_date: '2020-01-01', base_value: 100, current_value: 425.0, last_update: '2025-04-01', source: 'UOCRA', active: true, history: [{ date: '2025-01-01', value: 370.0 }, { date: '2025-02-01', value: 385.0 }, { date: '2025-03-01', value: 408.0 }, { date: '2025-04-01', value: 425.0 }], created_at: now() },
        { id: 'idx-004', name: 'CAC - Indice de Materiales', code: 'MAT', category: 'Materiales', base_date: '2020-01-01', base_value: 100, current_value: 298.7, last_update: '2025-04-01', source: 'CAC', active: true, history: [{ date: '2025-01-01', value: 255.0 }, { date: '2025-02-01', value: 267.5 }, { date: '2025-03-01', value: 283.0 }, { date: '2025-04-01', value: 298.7 }], created_at: now() },
      ],
      cashflowProjections: [
        { id: uuid(), project_id: p1, type: 'income', description: 'Certificacion Mayo 2025', amount: 16000000, expected_date: '2025-05-31', probability: 90, category: 'Certificacion', created_at: now() },
        { id: uuid(), project_id: p1, type: 'income', description: 'Certificacion Junio 2025', amount: 17500000, expected_date: '2025-06-30', probability: 80, category: 'Certificacion', created_at: now() },
        { id: uuid(), project_id: p1, type: 'expense', description: 'Pago proveedores Mayo', amount: 8500000, expected_date: '2025-05-15', probability: 95, category: 'Pago proveedor', created_at: now() },
        { id: uuid(), project_id: p1, type: 'expense', description: 'Sueldos Mayo 2025', amount: 4500000, expected_date: '2025-05-31', probability: 100, category: 'Sueldos', created_at: now() },
        { id: uuid(), project_id: p2, type: 'income', description: 'Certificacion Mayo - Estructura', amount: 35000000, expected_date: '2025-05-31', probability: 85, category: 'Certificacion', created_at: now() },
        { id: uuid(), project_id: p2, type: 'expense', description: 'Pago estructura metalica', amount: 18000000, expected_date: '2025-05-20', probability: 90, category: 'Pago proveedor', created_at: now() },
      ],
      users: [
        { id: 'usr-001', name: 'Administrador', email: 'admin@constructerp.com', role: 'admin', active: true, last_login: now(), created_at: now() },
        { id: 'usr-002', name: 'Gerente de Obra', email: 'gerente@constructerp.com', role: 'project_manager', active: true, last_login: now(), created_at: now() },
        { id: 'usr-003', name: 'Contador', email: 'contador@constructerp.com', role: 'accountant', active: true, last_login: now(), created_at: now() },
        { id: 'usr-004', name: 'Inspector de Obra', email: 'inspector@constructerp.com', role: 'inspector', active: true, last_login: null, created_at: now() },
        { id: 'usr-005', name: 'Lector', email: 'lector@constructerp.com', role: 'viewer', active: false, last_login: null, created_at: now() },
      ],
      journalEntries: [
        { id: 'je-001', number: 'AS-2025-001', date: '2025-03-31', description: 'Facturacion Certificado N1 - Torre Palermo', lines: [{ account_code: '1.1.2', account_name: 'Cuentas por Cobrar', debit: 15125000, credit: 0, description: 'Inversiones RP SA' }, { account_code: '4.1', account_name: 'Ingresos por Obras', debit: 0, credit: 12500000, description: 'Ingreso obra Torre Palermo Cert.1' }, { account_code: '2.1.2', account_name: 'IVA a Pagar', debit: 0, credit: 2625000, description: 'IVA FA-0001-00001234' }], status: 'posted', created_at: now() },
        { id: 'je-002', number: 'AS-2025-002', date: '2025-04-15', description: 'Cobro FA-0001-00001234', lines: [{ account_code: '1.1.1', account_name: 'Caja y Bancos', debit: 15125000, credit: 0, description: 'TRF-20250415 BNA' }, { account_code: '1.1.2', account_name: 'Cuentas por Cobrar', debit: 0, credit: 15125000, description: 'Cancelacion CxC Inversiones RP SA' }], status: 'posted', created_at: now() },
      ],
    };
  },
};

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function now() { return new Date().toISOString(); }
