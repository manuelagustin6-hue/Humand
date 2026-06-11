/* ===== DATABASE LAYER (localStorage) ===== */
const DB = {
  _companyId: 'comp-001',
  GLOBAL_KEY: 'erp_global_v1',

  get KEY() { return 'erp_company_' + (this._companyId || 'comp-001') + '_v1'; },

  get() {
    try {
      var raw = localStorage.getItem(this.KEY);
      var data = raw ? JSON.parse(raw) : this.init();
      // Migration: seed default users if the collection is missing or empty
      if (!data.users || !data.users.length) {
        data.users = this._defaultUsers();
        this.save(data);
      }
      return data;
    } catch(e) { return this.init(); }
  },

  _defaultUsers() {
    // Comp-specific defaults keyed by company id
    var byCompany = {
      'comp-002': [
        { id: 'usr-uy-001', name: 'Administrador UY',  email: 'admin@isur.com.uy',   role: 'admin',           active: true,  password: null, last_login: null, created_at: now() },
        { id: 'usr-uy-002', name: 'Gerente de Obra UY', email: 'gerente@isur.com.uy', role: 'project_manager', active: true,  password: null, last_login: null, created_at: now() },
      ],
    };
    return byCompany[this._companyId] || [
      { id: 'usr-001', name: 'Administrador',   email: 'admin@constructerp.com',     role: 'admin',           active: true,  password: null, last_login: null, created_at: now() },
      { id: 'usr-002', name: 'Gerente de Obra', email: 'gerente@constructerp.com',   role: 'project_manager', active: true,  password: null, last_login: null, created_at: now() },
      { id: 'usr-003', name: 'Contador',        email: 'contador@constructerp.com',  role: 'accountant',      active: true,  password: null, last_login: null, created_at: now() },
      { id: 'usr-004', name: 'Inspector',       email: 'inspector@constructerp.com', role: 'inspector',       active: true,  password: null, last_login: null, created_at: now() },
    ];
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
        {id:'acc-1',code:'1',name:'ACTIVO',type:'asset',parent_id:null,active:true,created_at:now()},
        {id:'acc-1-1',code:'1.1',name:'ACTIVO CORRIENTE',type:'asset',parent_id:'acc-1',active:true,created_at:now()},
        {id:'acc-1-1-1',code:'1.1.1',name:'Disponibilidades',type:'asset',parent_id:'acc-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1',code:'1.1.1.1',name:'Cajas',type:'asset',parent_id:'acc-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-1',code:'1.1.1.1.1',name:'Caja - Libertador 2 ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-2',code:'1.1.1.1.2',name:'Caja - Riverside House SA USD',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-3',code:'1.1.1.1.3',name:'Caja - Nuevo Beccar Central ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-4',code:'1.1.1.1.4',name:'Caja - Libertador 2 USD',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-6',code:'1.1.1.1.6',name:'Caja - Sense Manantiales ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-7',code:'1.1.1.1.7',name:'Caja - Grand Atlantida ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-9',code:'1.1.1.1.9',name:'Caja - Grand Atlantida USD',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-10',code:'1.1.1.1.10',name:'Caja - HA Emprendimientos ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-11',code:'1.1.1.1.11',name:'Caja - HA Emprendimientos USD',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-12',code:'1.1.1.1.12',name:'Caja - Fondo compensador HA ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-13',code:'1.1.1.1.13',name:'Caja - HA Projects LLC ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-15',code:'1.1.1.1.15',name:'Caja - Fondo compensador HA USD',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-21',code:'1.1.1.1.21',name:'Caja - Riverside House SA ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-23',code:'1.1.1.1.23',name:'Caja - SENSE 22 ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-27',code:'1.1.1.1.27',name:'Caja importacion de datos ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-28',code:'1.1.1.1.28',name:'Caja importacion de datos USD',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-29',code:'1.1.1.1.29',name:'Caja - HA SAS ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-30',code:'1.1.1.1.30',name:'Caja - HA SAS USD',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-31',code:'1.1.1.1.31',name:'Caja - Concreto Moldeado ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-33',code:'1.1.1.1.33',name:'Caja - Radian Capital S.A. ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-34',code:'1.1.1.1.34',name:'Caja - Radian Capital S.A. USD',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-37',code:'1.1.1.1.37',name:'Caja - Sense Olivos ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-38',code:'1.1.1.1.38',name:'Caja - Sense Olivos USD',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-39',code:'1.1.1.1.39',name:'Caja - Barbarita ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-1-41',code:'1.1.1.1.41',name:'Caja - Sense La Barra ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-2',code:'1.1.1.2',name:'Bancos Nacionales',type:'asset',parent_id:'acc-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-2-2',code:'1.1.1.2.2',name:'Galicia $ - Fiduciaria Central SA',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-3',code:'1.1.1.2.3',name:'Cheque Galicia $ - Fiduciaria Central SA',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-4',code:'1.1.1.2.4',name:'Galicia $ - Fideicomiso Edificio Atlantida',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-5',code:'1.1.1.2.5',name:'Cheque Galicia $ - Fideicomiso Edificio Atlantida',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-6',code:'1.1.1.2.6',name:'Galicia U$S - Fideicomiso Edificio Atlantida',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-7',code:'1.1.1.2.7',name:'Galicia $ - Concreto Moldeado',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-9',code:'1.1.1.2.9',name:'Galicia $ - BBS Emprendimientos',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-10',code:'1.1.1.2.10',name:'Cheque Galicia $ - Concreto Moldeado',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-12',code:'1.1.1.2.12',name:'Galicia U$S - Concreto Moleado',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-13',code:'1.1.1.2.13',name:'Galicia U$S - BBS Emprendimientos SA',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-16',code:'1.1.1.2.16',name:'Galicia Golf $ - Riverside House SA',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-18',code:'1.1.1.2.18',name:'Galicia U$S - Fiduciaria Central SA',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-21',code:'1.1.1.2.21',name:'Galicia Laguna $ - Riverside House SA',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-22',code:'1.1.1.2.22',name:'Cheque Galicia Laguna $ - Riverside House SA',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-23',code:'1.1.1.2.23',name:'Galicia Laguna U$S - Riverside House SA',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-25',code:'1.1.1.2.25',name:'Galicia Mas $ - HA Emprendimientos S.R.L.',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-27',code:'1.1.1.2.27',name:'Galicia Mas $ - Fiduciaria Central SA',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-29',code:'1.1.1.2.29',name:'Galicia U$S - HA Emprendimientos S.R.L.',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-31',code:'1.1.1.2.31',name:'Galicia $ - HA Emprendimientos S.R.L.',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-32',code:'1.1.1.2.32',name:'Cheque Galicia $ - HA Emprendimientos S.R.L.',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-35',code:'1.1.1.2.35',name:'Galicia $ - Fideicomiso del Bajo',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-41',code:'1.1.1.2.41',name:'Credicoop $ - Concreto Moldeado SA',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-43',code:'1.1.1.2.43',name:'Mercadopago - Concreto Moldeado',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-45',code:'1.1.1.2.45',name:'VISA HA 4937-0200-0240-3101',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-46',code:'1.1.1.2.46',name:'VISA RS 4937-0200-0420-1644',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-47',code:'1.1.1.2.47',name:'Galicia $ - Riox SA',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-49',code:'1.1.1.2.49',name:'BBVA $ - Fiduciaria Central SA - Consorcio NBC',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-2-51',code:'1.1.1.2.51',name:'BBVA $ - Fiduciaria Central SA - Consorcio LIB',type:'asset',parent_id:'acc-1-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-1-3',code:'1.1.1.3',name:'Bancos Extranjeros',type:'asset',parent_id:'acc-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-3-7',code:'1.1.1.3.7',name:'CITI BANK - New Sense LLC',type:'asset',parent_id:'acc-1-1-1-3',active:true,created_at:now()},
        {id:'acc-1-1-1-3-12',code:'1.1.1.3.12',name:'CITI BANK - HA Projects LLC',type:'asset',parent_id:'acc-1-1-1-3',active:true,created_at:now()},
        {id:'acc-1-1-1-5',code:'1.1.1.5',name:'Otros valores',type:'asset',parent_id:'acc-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-5-1',code:'1.1.1.5.1',name:'Valores a depositar',type:'asset',parent_id:'acc-1-1-1-5',active:true,created_at:now()},
        {id:'acc-1-1-1-7',code:'1.1.1.7',name:'Deudores varios',type:'asset',parent_id:'acc-1-1-1',active:true,created_at:now()},
        {id:'acc-1-1-1-7-1',code:'1.1.1.7.1',name:'Deudores por ventas',type:'asset',parent_id:'acc-1-1-1-7',active:true,created_at:now()},
        {id:'acc-1-1-2',code:'1.1.2',name:'Inversiones Corrientes',type:'asset',parent_id:'acc-1-1',active:true,created_at:now()},
        {id:'acc-1-1-2-4',code:'1.1.2.4',name:'Fondos de Inversion (FIMA)',type:'asset',parent_id:'acc-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-2-4-1',code:'1.1.2.4.1',name:'FIMA - Galicia Fiduciaria Central',type:'asset',parent_id:'acc-1-1-2-4',active:true,created_at:now()},
        {id:'acc-1-1-2-4-2',code:'1.1.2.4.2',name:'FIMA - Galicia Laguna Riverside $',type:'asset',parent_id:'acc-1-1-2-4',active:true,created_at:now()},
        {id:'acc-1-1-2-4-3',code:'1.1.2.4.3',name:'FIMA - Galicia HA $',type:'asset',parent_id:'acc-1-1-2-4',active:true,created_at:now()},
        {id:'acc-1-1-2-4-4',code:'1.1.2.4.4',name:'FIMA - Galicia FEA $',type:'asset',parent_id:'acc-1-1-2-4',active:true,created_at:now()},
        {id:'acc-1-1-2-4-6',code:'1.1.2.4.6',name:'FIMA - Galicia CM $',type:'asset',parent_id:'acc-1-1-2-4',active:true,created_at:now()},
        {id:'acc-1-1-2-5',code:'1.1.2.5',name:'Inversiones Financieras',type:'asset',parent_id:'acc-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-2-5-1',code:'1.1.2.5.1',name:'Aldazabal & Cia',type:'asset',parent_id:'acc-1-1-2-5',active:true,created_at:now()},
        {id:'acc-1-1-2-5-1-1',code:'1.1.2.5.1.1',name:'Aldazabal & Cia - Fiduciaria Central',type:'asset',parent_id:'acc-1-1-2-5-1',active:true,created_at:now()},
        {id:'acc-1-1-2-5-1-2',code:'1.1.2.5.1.2',name:'Aldazabal & Cia - Fideicomiso Edificio Atlantida',type:'asset',parent_id:'acc-1-1-2-5-1',active:true,created_at:now()},
        {id:'acc-1-1-2-5-1-3',code:'1.1.2.5.1.3',name:'Aldazabal & cia $ - Riverside House SA',type:'asset',parent_id:'acc-1-1-2-5-1',active:true,created_at:now()},
        {id:'acc-1-1-2-5-1-4',code:'1.1.2.5.1.4',name:'Aldazabal & cia $ - HA Emprendimientos SRL',type:'asset',parent_id:'acc-1-1-2-5-1',active:true,created_at:now()},
        {id:'acc-1-1-2-5-1-5',code:'1.1.2.5.1.5',name:'Aldazabal & cia $ - Concreto Moldeado SA',type:'asset',parent_id:'acc-1-1-2-5-1',active:true,created_at:now()},
        {id:'acc-1-1-2-5-1-6',code:'1.1.2.5.1.6',name:'Aldazabal & cia $ - Fideicomiso del Bajo',type:'asset',parent_id:'acc-1-1-2-5-1',active:true,created_at:now()},
        {id:'acc-1-1-2-8',code:'1.1.2.8',name:'Inversiones - Bonos',type:'asset',parent_id:'acc-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-2-9',code:'1.1.2.9',name:'Aportes al fideicomiso Beccar Central II',type:'asset',parent_id:'acc-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-2-10',code:'1.1.2.10',name:'Inversiones RIOX SA',type:'asset',parent_id:'acc-1-1-2',active:true,created_at:now()},
        {id:'acc-1-1-3',code:'1.1.3',name:'Anticipos Entregados',type:'asset',parent_id:'acc-1-1',active:true,created_at:now()},
        {id:'acc-1-1-3-1',code:'1.1.3.1',name:'Anticipo a proveedores',type:'asset',parent_id:'acc-1-1-3',active:true,created_at:now()},
        {id:'acc-1-1-4',code:'1.1.4',name:'Creditos Fiscales',type:'asset',parent_id:'acc-1-1',active:true,created_at:now()},
        {id:'acc-1-1-4-1',code:'1.1.4.1',name:'IVA',type:'asset',parent_id:'acc-1-1-4',active:true,created_at:now()},
        {id:'acc-1-1-4-1-1',code:'1.1.4.1.1',name:'IVA Credito Fiscal',type:'asset',parent_id:'acc-1-1-4-1',active:true,created_at:now()},
        {id:'acc-1-1-4-1-1-1',code:'1.1.4.1.1.1',name:'IVA Tasa General 21%',type:'asset',parent_id:'acc-1-1-4-1-1',active:true,created_at:now()},
        {id:'acc-1-1-4-1-1-2',code:'1.1.4.1.1.2',name:'IVA Tasa 10,5%',type:'asset',parent_id:'acc-1-1-4-1-1',active:true,created_at:now()},
        {id:'acc-1-1-4-1-1-3',code:'1.1.4.1.1.3',name:'IVA Servicios 27%',type:'asset',parent_id:'acc-1-1-4-1-1',active:true,created_at:now()},
        {id:'acc-1-1-4-1-1-4',code:'1.1.4.1.1.4',name:'Percepcion IVA',type:'asset',parent_id:'acc-1-1-4-1-1',active:true,created_at:now()},
        {id:'acc-1-1-4-1-1-5',code:'1.1.4.1.1.5',name:'IVA saldo tecnico a favor',type:'asset',parent_id:'acc-1-1-4-1-1',active:true,created_at:now()},
        {id:'acc-1-1-4-1-1-6',code:'1.1.4.1.1.6',name:'IVA saldo de libre disponibilidad',type:'asset',parent_id:'acc-1-1-4-1-1',active:true,created_at:now()},
        {id:'acc-1-1-4-2',code:'1.1.4.2',name:'Ingresos Brutos',type:'asset',parent_id:'acc-1-1-4',active:true,created_at:now()},
        {id:'acc-1-1-4-2-1',code:'1.1.4.2.1',name:'IIBB CABA a favor',type:'asset',parent_id:'acc-1-1-4-2',active:true,created_at:now()},
        {id:'acc-1-1-4-2-3',code:'1.1.4.2.3',name:'SIRCREB CABA',type:'asset',parent_id:'acc-1-1-4-2',active:true,created_at:now()},
        {id:'acc-1-1-4-2-4',code:'1.1.4.2.4',name:'SIRCREB BS AS',type:'asset',parent_id:'acc-1-1-4-2',active:true,created_at:now()},
        {id:'acc-1-1-4-2-5',code:'1.1.4.2.5',name:'Ret. y Perc. IIBB CABA',type:'asset',parent_id:'acc-1-1-4-2',active:true,created_at:now()},
        {id:'acc-1-1-4-2-6',code:'1.1.4.2.6',name:'Ret. y Perc. IIBB BS AS',type:'asset',parent_id:'acc-1-1-4-2',active:true,created_at:now()},
        {id:'acc-1-1-4-3',code:'1.1.4.3',name:'Otros Impuestos',type:'asset',parent_id:'acc-1-1-4',active:true,created_at:now()},
        {id:'acc-1-1-4-3-1',code:'1.1.4.3.1',name:'Ley 25.413 Impuesto al credito bancario computable',type:'asset',parent_id:'acc-1-1-4-3',active:true,created_at:now()},
        {id:'acc-1-1-4-3-3',code:'1.1.4.3.3',name:'No Gravado',type:'asset',parent_id:'acc-1-1-4-3',active:true,created_at:now()},
        {id:'acc-1-1-4-3-4',code:'1.1.4.3.4',name:'Retenciones a cobrar',type:'asset',parent_id:'acc-1-1-4-3',active:true,created_at:now()},
        {id:'acc-1-1-4-4',code:'1.1.4.4',name:'Impuesto a las Ganancias',type:'asset',parent_id:'acc-1-1-4',active:true,created_at:now()},
        {id:'acc-1-1-4-4-1',code:'1.1.4.4.1',name:'Retenciones impuesto a las ganancias',type:'asset',parent_id:'acc-1-1-4-4',active:true,created_at:now()},
        {id:'acc-1-1-4-4-2',code:'1.1.4.4.2',name:'Anticipos impuesto a las ganancias',type:'asset',parent_id:'acc-1-1-4-4',active:true,created_at:now()},
        {id:'acc-1-1-5',code:'1.1.5',name:'Otras Cuentas del Activo Corriente',type:'asset',parent_id:'acc-1-1',active:true,created_at:now()},
        {id:'acc-1-1-5-1',code:'1.1.5.1',name:'Fondos Fijos y Cuentas Particulares',type:'asset',parent_id:'acc-1-1-5',active:true,created_at:now()},
        {id:'acc-1-1-5-1-1',code:'1.1.5.1.1',name:'Fondo fijo Agustin Cinalli $',type:'asset',parent_id:'acc-1-1-5-1',active:true,created_at:now()},
        {id:'acc-1-1-5-1-2',code:'1.1.5.1.2',name:'Fondo fijo Gabriel Ruiz Diaz $',type:'asset',parent_id:'acc-1-1-5-1',active:true,created_at:now()},
        {id:'acc-1-1-5-1-3',code:'1.1.5.1.3',name:'Fondo fijo Jorge Vilca $',type:'asset',parent_id:'acc-1-1-5-1',active:true,created_at:now()},
        {id:'acc-1-1-5-1-5',code:'1.1.5.1.5',name:'Fondo fijo Marcelo Fontana $',type:'asset',parent_id:'acc-1-1-5-1',active:true,created_at:now()},
        {id:'acc-1-1-5-1-8',code:'1.1.5.1.8',name:'Fondo fijo Omar Debloc $',type:'asset',parent_id:'acc-1-1-5-1',active:true,created_at:now()},
        {id:'acc-1-1-5-1-9',code:'1.1.5.1.9',name:'Fondo fijo Bernardo Dopazo $',type:'asset',parent_id:'acc-1-1-5-1',active:true,created_at:now()},
        {id:'acc-1-1-5-1-11',code:'1.1.5.1.11',name:'Fondo fijo Ronit Gorosstiaga $',type:'asset',parent_id:'acc-1-1-5-1',active:true,created_at:now()},
        {id:'acc-1-1-5-1-12',code:'1.1.5.1.12',name:'Fondo fijo Arturo Yarati $',type:'asset',parent_id:'acc-1-1-5-1',active:true,created_at:now()},
        {id:'acc-1-1-5-1-13',code:'1.1.5.1.13',name:'Fondo fijo Sergio Araoz $',type:'asset',parent_id:'acc-1-1-5-1',active:true,created_at:now()},
        {id:'acc-1-1-5-1-17',code:'1.1.5.1.17',name:'Fondo fijo Eduardo Sampaolesi $',type:'asset',parent_id:'acc-1-1-5-1',active:true,created_at:now()},
        {id:'acc-1-1-5-1-20',code:'1.1.5.1.20',name:'ACT - Cuentas particulares Palito',type:'asset',parent_id:'acc-1-1-5-1',active:true,created_at:now()},
        {id:'acc-1-1-5-1-22',code:'1.1.5.1.22',name:'Fondo fijo Aldana Belen Rossi $',type:'asset',parent_id:'acc-1-1-5-1',active:true,created_at:now()},
        {id:'acc-1-1-5-1-23',code:'1.1.5.1.23',name:'Fondo Fijo Dario Post Vta $',type:'asset',parent_id:'acc-1-1-5-1',active:true,created_at:now()},
        {id:'acc-1-1-5-1-24',code:'1.1.5.1.24',name:'ACT - Cuentas particulares Sebastian Del Campo',type:'asset',parent_id:'acc-1-1-5-1',active:true,created_at:now()},
        {id:'acc-1-1-5-1-25',code:'1.1.5.1.25',name:'Fondo Fijo Comercial',type:'asset',parent_id:'acc-1-1-5-1',active:true,created_at:now()},
        {id:'acc-1-1-5-1-26',code:'1.1.5.1.26',name:'Cuenta Particular - Condal S.A.',type:'asset',parent_id:'acc-1-1-5-1',active:true,created_at:now()},
        {id:'acc-1-1-5-2',code:'1.1.5.2',name:'Cuentas Particulares Intercompany',type:'asset',parent_id:'acc-1-1-5',active:true,created_at:now()},
        {id:'acc-1-1-5-2-1',code:'1.1.5.2.1',name:'Cta Particular - Fiduciaria Central',type:'asset',parent_id:'acc-1-1-5-2',active:true,created_at:now()},
        {id:'acc-1-1-5-2-3',code:'1.1.5.2.3',name:'Cta Particular - Flia Hardoy',type:'asset',parent_id:'acc-1-1-5-2',active:true,created_at:now()},
        {id:'acc-1-1-5-2-4',code:'1.1.5.2.4',name:'Cta Particular - Fideicomiso Edificio Atlantida',type:'asset',parent_id:'acc-1-1-5-2',active:true,created_at:now()},
        {id:'acc-1-1-5-2-7',code:'1.1.5.2.7',name:'Cta Particular - HA Emprendimientos SRL',type:'asset',parent_id:'acc-1-1-5-2',active:true,created_at:now()},
        {id:'acc-1-1-5-2-8',code:'1.1.5.2.8',name:'Cta particular - New Sense LLC',type:'asset',parent_id:'acc-1-1-5-2',active:true,created_at:now()},
        {id:'acc-1-1-5-2-9',code:'1.1.5.2.9',name:'Cta particular - Riverside House SA',type:'asset',parent_id:'acc-1-1-5-2',active:true,created_at:now()},
        {id:'acc-1-1-5-2-10',code:'1.1.5.2.10',name:'Cta particular - HA Projects LLC',type:'asset',parent_id:'acc-1-1-5-2',active:true,created_at:now()},
        {id:'acc-1-1-5-2-12',code:'1.1.5.2.12',name:'Cta particular - Concreto Moldeado SA',type:'asset',parent_id:'acc-1-1-5-2',active:true,created_at:now()},
        {id:'acc-1-1-5-2-14',code:'1.1.5.2.14',name:'Cta particular - Radian Consulting LLC',type:'asset',parent_id:'acc-1-1-5-2',active:true,created_at:now()},
        {id:'acc-1-1-5-2-16',code:'1.1.5.2.16',name:'Cta particular - Radian Capital SA',type:'asset',parent_id:'acc-1-1-5-2',active:true,created_at:now()},
        {id:'acc-1-1-5-2-18',code:'1.1.5.2.18',name:'Cta particular - Fideicomiso Beccar Central II',type:'asset',parent_id:'acc-1-1-5-2',active:true,created_at:now()},
        {id:'acc-1-1-5-2-19',code:'1.1.5.2.19',name:'Cta particular - Fideicomiso VM 58733/2017',type:'asset',parent_id:'acc-1-1-5-2',active:true,created_at:now()},
        {id:'acc-1-1-5-2-20',code:'1.1.5.2.20',name:'Cta Particular - Ignacio Aldazabal',type:'asset',parent_id:'acc-1-1-5-2',active:true,created_at:now()},
        {id:'acc-1-1-5-2-21',code:'1.1.5.2.21',name:'Cta particular - HA SAS',type:'asset',parent_id:'acc-1-1-5-2',active:true,created_at:now()},
        {id:'acc-1-1-5-2-23',code:'1.1.5.2.23',name:'Cta particular - RIOX S.A.',type:'asset',parent_id:'acc-1-1-5-2',active:true,created_at:now()},
        {id:'acc-1-1-5-3',code:'1.1.5.3',name:'Creditos Financieros Internos',type:'asset',parent_id:'acc-1-1-5',active:true,created_at:now()},
        {id:'acc-1-1-5-3-3',code:'1.1.5.3.3',name:'Cred. Fin. Int. - Riox',type:'asset',parent_id:'acc-1-1-5-3',active:true,created_at:now()},
        {id:'acc-1-1-5-3-4',code:'1.1.5.3.4',name:'Cred. Fin. Int. - Fiduciaria Central',type:'asset',parent_id:'acc-1-1-5-3',active:true,created_at:now()},
        {id:'acc-1-1-5-3-7',code:'1.1.5.3.7',name:'Cred. Fin. Int. - Fideicomiso Edificio Atlantida',type:'asset',parent_id:'acc-1-1-5-3',active:true,created_at:now()},
        {id:'acc-1-1-5-3-9',code:'1.1.5.3.9',name:'Cred. Fin. Int. - Edgewater 28 LLC',type:'asset',parent_id:'acc-1-1-5-3',active:true,created_at:now()},
        {id:'acc-1-1-5-3-13',code:'1.1.5.3.13',name:'Cred. Fin. Int - CM',type:'asset',parent_id:'acc-1-1-5-3',active:true,created_at:now()},
        {id:'acc-1-1-5-5',code:'1.1.5.5',name:'Cuentas Particulares IC',type:'asset',parent_id:'acc-1-1-5',active:true,created_at:now()},
        {id:'acc-1-1-5-5-1',code:'1.1.5.5.1',name:'Cta Particular IC - BBS',type:'asset',parent_id:'acc-1-1-5-5',active:true,created_at:now()},
        {id:'acc-1-1-5-5-2',code:'1.1.5.5.2',name:'Cta Particular IC - HA',type:'asset',parent_id:'acc-1-1-5-5',active:true,created_at:now()},
        {id:'acc-1-1-5-5-3',code:'1.1.5.5.3',name:'Cta Particular IC - FC',type:'asset',parent_id:'acc-1-1-5-5',active:true,created_at:now()},
        {id:'acc-1-1-5-5-4',code:'1.1.5.5.4',name:'Cta Particular IC - FEA',type:'asset',parent_id:'acc-1-1-5-5',active:true,created_at:now()},
        {id:'acc-1-1-5-6',code:'1.1.5.6',name:'Vales a Rendir',type:'asset',parent_id:'acc-1-1-5',active:true,created_at:now()},
        {id:'acc-1-1-5-6-8',code:'1.1.5.6.8',name:'Vales a rendir - Sebastian Del Campo',type:'asset',parent_id:'acc-1-1-5-6',active:true,created_at:now()},
        {id:'acc-1-2',code:'1.2',name:'ACTIVO NO CORRIENTE',type:'asset',parent_id:'acc-1',active:true,created_at:now()},
        {id:'acc-1-2-1',code:'1.2.1',name:'Bienes de Cambio y Uso',type:'asset',parent_id:'acc-1-2',active:true,created_at:now()},
        {id:'acc-1-2-1-1',code:'1.2.1.1',name:'Terrenos',type:'asset',parent_id:'acc-1-2-1',active:true,created_at:now()},
        {id:'acc-1-2-1-1-1',code:'1.2.1.1.1',name:'ACT - Terreno',type:'asset',parent_id:'acc-1-2-1-1',active:true,created_at:now()},
        {id:'acc-1-2-1-2',code:'1.2.1.2',name:'Bienes en Construccion',type:'asset',parent_id:'acc-1-2-1',active:true,created_at:now()},
        {id:'acc-1-2-1-2-1',code:'1.2.1.2.1',name:'Obra - Libertador 2',type:'asset',parent_id:'acc-1-2-1-2',active:true,created_at:now()},
        {id:'acc-1-2-1-2-1-37',code:'1.2.1.2.1.37',name:'ESTRUCTURA RESISTENTE DE HORMIGON',type:'asset',parent_id:'acc-1-2-1-2-1',active:true,created_at:now()},
        {id:'acc-1-2-1-2-1-41',code:'1.2.1.2.1.41',name:'CONTRAPISOS Y CARPETAS',type:'asset',parent_id:'acc-1-2-1-2-1',active:true,created_at:now()},
        {id:'acc-1-2-1-2-1-50',code:'1.2.1.2.1.50',name:'Mano de obra directa',type:'asset',parent_id:'acc-1-2-1-2-1',active:true,created_at:now()},
        {id:'acc-1-2-1-2-1-55',code:'1.2.1.2.1.55',name:'Mano de obra Bienes de cambio',type:'asset',parent_id:'acc-1-2-1-2-1',active:true,created_at:now()},
        {id:'acc-1-2-1-2-1-60',code:'1.2.1.2.1.60',name:'DIVISIONS - MAMPOSTERIA',type:'asset',parent_id:'acc-1-2-1-2-1',active:true,created_at:now()},
        {id:'acc-1-2-1-2-2',code:'1.2.1.2.2',name:'Obra - Beccar Central',type:'asset',parent_id:'acc-1-2-1-2',active:true,created_at:now()},
        {id:'acc-1-2-1-2-2-14',code:'1.2.1.2.2.14',name:'INSTALACIONES SANITARIAS',type:'asset',parent_id:'acc-1-2-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-1-2-2-16',code:'1.2.1.2.2.16',name:'ARTEFACTOS (solo material)',type:'asset',parent_id:'acc-1-2-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-1-2-2-33',code:'1.2.1.2.2.33',name:'LIMP/SEG/VIG Obra - Ayuda de gremios',type:'asset',parent_id:'acc-1-2-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-1-2-2-51',code:'1.2.1.2.2.51',name:'Materiales por canje',type:'asset',parent_id:'acc-1-2-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-1-2-2-52',code:'1.2.1.2.2.52',name:'Materiales Bienes de cambio',type:'asset',parent_id:'acc-1-2-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-1-2-2-53',code:'1.2.1.2.2.53',name:'EQUIPAMIENTO',type:'asset',parent_id:'acc-1-2-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-1-2-2-54',code:'1.2.1.2.2.54',name:'DIVISIONS - REQUISITOS GENERALES',type:'asset',parent_id:'acc-1-2-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-1-2-2-57',code:'1.2.1.2.2.57',name:'DIVISIONS - MAMPOSTERIA',type:'asset',parent_id:'acc-1-2-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-1-2-2-58',code:'1.2.1.2.2.58',name:'DIVISIONS - METALES',type:'asset',parent_id:'acc-1-2-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-1-2-2-61',code:'1.2.1.2.2.61',name:'DIVISIONS - ABERTURAS',type:'asset',parent_id:'acc-1-2-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-1-2-2-62',code:'1.2.1.2.2.62',name:'DIVISIONS - TERMINACIONES',type:'asset',parent_id:'acc-1-2-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-1-2-2-69',code:'1.2.1.2.2.69',name:'DIVISIONS - PLOMERIA',type:'asset',parent_id:'acc-1-2-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-1-2-2-72',code:'1.2.1.2.2.72',name:'DIVISIONS - ELECTRICIDAD',type:'asset',parent_id:'acc-1-2-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4',code:'1.2.1.2.4',name:'Obra - Grand Atlantida',type:'asset',parent_id:'acc-1-2-1-2',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-1',code:'1.2.1.2.4.1',name:'TRABAJOS PRELIMINARES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-2',code:'1.2.1.2.4.2',name:'JARDINERIA Y PARQUIZACION',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-3',code:'1.2.1.2.4.3',name:'PARRILLAS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-4',code:'1.2.1.2.4.4',name:'PILETA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-5',code:'1.2.1.2.4.5',name:'HERRERIA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-6',code:'1.2.1.2.4.6',name:'HERRERIA DE OBRA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-7',code:'1.2.1.2.4.7',name:'PUERTAS MADERA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-8',code:'1.2.1.2.4.8',name:'PUERTAS METALICAS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-9',code:'1.2.1.2.4.9',name:'CARPINTERIAS PVC/ALUMINIO',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-10',code:'1.2.1.2.4.10',name:'INSTALACIONES SANITARIAS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-11',code:'1.2.1.2.4.11',name:'DEMOLICION',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-12',code:'1.2.1.2.4.12',name:'FACHADA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-13',code:'1.2.1.2.4.13',name:'BOMBAS Y TANQUES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-14',code:'1.2.1.2.4.14',name:'INSTALACION DE GAS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-15',code:'1.2.1.2.4.15',name:'INSTALACION CONTRA INCENDIO',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-16',code:'1.2.1.2.4.16',name:'INSTALACION ELECTRICA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-18',code:'1.2.1.2.4.18',name:'CONDUCTOS Y VENTILACIONES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-20',code:'1.2.1.2.4.20',name:'MARMOL Y GRANITOS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-21',code:'1.2.1.2.4.21',name:'ELEMENTOS DE MADERA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-22',code:'1.2.1.2.4.22',name:'PINTURA INTERIOR',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-23',code:'1.2.1.2.4.23',name:'PAVIMENTOS EXTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-24',code:'1.2.1.2.4.24',name:'PINTURA EXTERIOR',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-25',code:'1.2.1.2.4.25',name:'MOVIMIENTO DE SUELO',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-26',code:'1.2.1.2.4.26',name:'ASCENSORES Y ELEVADORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-27',code:'1.2.1.2.4.27',name:'LIMP/SEG/VIG Obra - Ayuda de gremios',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-28',code:'1.2.1.2.4.28',name:'TRASLADOS Y FLETES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-29',code:'1.2.1.2.4.29',name:'ENCOFRADOS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-30',code:'1.2.1.2.4.30',name:'EQUIPOS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-31',code:'1.2.1.2.4.31',name:'ESTRUCTURA RESISTENTE DE HORMIGON',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-33',code:'1.2.1.2.4.33',name:'MUROS Y TABIQUES EXTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-34',code:'1.2.1.2.4.34',name:'PISOS EXTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-35',code:'1.2.1.2.4.35',name:'MUROS Y TABIQUES INTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-36',code:'1.2.1.2.4.36',name:'CONTRAPISOS Y CARPETAS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-37',code:'1.2.1.2.4.37',name:'AISLACIONES ACUSTICAS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-38',code:'1.2.1.2.4.38',name:'AISLACIONES HIDROFUGA EN EXTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-39',code:'1.2.1.2.4.39',name:'AISLACIONES HIDROFUGA EN INTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-40',code:'1.2.1.2.4.40',name:'AISLACIONES HIDROFUGA EN SUBSUELO',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-41',code:'1.2.1.2.4.41',name:'AISLACIONES TANQUES Y PILETA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-42',code:'1.2.1.2.4.42',name:'AISLACIONES TERMICAS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-43',code:'1.2.1.2.4.43',name:'REVOQUES EXTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-44',code:'1.2.1.2.4.44',name:'REVOQUES INTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-45',code:'1.2.1.2.4.45',name:'PISOS INTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-46',code:'1.2.1.2.4.46',name:'VIATICOS Y GESTION DE OBRA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-49',code:'1.2.1.2.4.49',name:'SUELDOS Y CS. SOCIALES DE OBRA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-50',code:'1.2.1.2.4.50',name:'REVESTIMIENTOS ESPECIALES EN PIEZAS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-51',code:'1.2.1.2.4.51',name:'REVESTIMIENTOS ESTANDAR PISO Y PARED DE CERAMICO O PORCELLANATO',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-53',code:'1.2.1.2.4.53',name:'CIELORRASO',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-55',code:'1.2.1.2.4.55',name:'DIVISIONS - REQUISITOS GENERALES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-58',code:'1.2.1.2.4.58',name:'DIVISIONS - MAMPOSTERIA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-59',code:'1.2.1.2.4.59',name:'DIVISIONS - METALES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-62',code:'1.2.1.2.4.62',name:'DIVISIONS - ABERTURAS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-63',code:'1.2.1.2.4.63',name:'DIVISIONS - TERMINACIONES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-73',code:'1.2.1.2.4.73',name:'DIVISIONS - ELECTRICIDAD',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-4-77',code:'1.2.1.2.4.77',name:'DIVISIONS - OBRAS EXTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true,created_at:now()},
        {id:'acc-1-2-1-2-13',code:'1.2.1.2.13',name:'Gastos y Comisiones Bancarias',type:'asset',parent_id:'acc-1-2-1-2',active:true,created_at:now()},
        {id:'acc-1-2-1-4',code:'1.2.1.4',name:'Inmuebles',type:'asset',parent_id:'acc-1-2-1',active:true,created_at:now()},
        {id:'acc-1-2-1-4-1',code:'1.2.1.4.1',name:'Inmueble',type:'asset',parent_id:'acc-1-2-1-4',active:true,created_at:now()},
        {id:'acc-1-2-2',code:'1.2.2',name:'Bienes de Uso',type:'asset',parent_id:'acc-1-2',active:true,created_at:now()},
        {id:'acc-1-2-2-1',code:'1.2.2.1',name:'Muebles y utiles',type:'asset',parent_id:'acc-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-2-2',code:'1.2.2.2',name:'Maquinarias',type:'asset',parent_id:'acc-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-2-3',code:'1.2.2.3',name:'Amortizacion Maquinarias',type:'asset',parent_id:'acc-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-2-4',code:'1.2.2.4',name:'Amortizacion Muebles y utiles',type:'asset',parent_id:'acc-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-2-7',code:'1.2.2.7',name:'Instalaciones',type:'asset',parent_id:'acc-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-2-8',code:'1.2.2.8',name:'Amortizacion Instalaciones',type:'asset',parent_id:'acc-1-2-2',active:true,created_at:now()},
        {id:'acc-1-2-2-10',code:'1.2.2.10',name:'Inmuebles',type:'asset',parent_id:'acc-1-2-2',active:true,created_at:now()},
        {id:'acc-2',code:'2',name:'PASIVO',type:'liability',parent_id:null,active:true,created_at:now()},
        {id:'acc-2-1',code:'2.1',name:'PASIVO CORRIENTE',type:'liability',parent_id:'acc-2',active:true,created_at:now()},
        {id:'acc-2-1-1',code:'2.1.1',name:'Cuentas por Pagar',type:'liability',parent_id:'acc-2-1',active:true,created_at:now()},
        {id:'acc-2-1-1-1',code:'2.1.1.1',name:'Proveedores',type:'liability',parent_id:'acc-2-1-1',active:true,created_at:now()},
        {id:'acc-2-1-1-1-1',code:'2.1.1.1.1',name:'Proveedores Argentina',type:'liability',parent_id:'acc-2-1-1-1',active:true,created_at:now()},
        {id:'acc-2-1-1-1-2',code:'2.1.1.1.2',name:'Proveedores Exterior',type:'liability',parent_id:'acc-2-1-1-1',active:true,created_at:now()},
        {id:'acc-2-1-1-2',code:'2.1.1.2',name:'Anticipos de Clientes',type:'liability',parent_id:'acc-2-1-1',active:true,created_at:now()},
        {id:'acc-2-1-1-2-1',code:'2.1.1.2.1',name:'Anticipos de clientes - Argentina',type:'liability',parent_id:'acc-2-1-1-2',active:true,created_at:now()},
        {id:'acc-2-1-1-2-2',code:'2.1.1.2.2',name:'Anticipos de clientes - Exterior',type:'liability',parent_id:'acc-2-1-1-2',active:true,created_at:now()},
        {id:'acc-2-1-3',code:'2.1.3',name:'Cargas Sociales a Pagar',type:'liability',parent_id:'acc-2-1',active:true,created_at:now()},
        {id:'acc-2-1-3-1',code:'2.1.3.1',name:'Sueldos a pagar',type:'liability',parent_id:'acc-2-1-3',active:true,created_at:now()},
        {id:'acc-2-1-3-2',code:'2.1.3.2',name:'Suss a pagar',type:'liability',parent_id:'acc-2-1-3',active:true,created_at:now()},
        {id:'acc-2-1-3-5',code:'2.1.3.5',name:'IERIC a pagar',type:'liability',parent_id:'acc-2-1-3',active:true,created_at:now()},
        {id:'acc-2-1-3-7',code:'2.1.3.7',name:'UOCRA a pagar',type:'liability',parent_id:'acc-2-1-3',active:true,created_at:now()},
        {id:'acc-2-1-4',code:'2.1.4',name:'Impuestos y Tasas a Pagar',type:'liability',parent_id:'acc-2-1',active:true,created_at:now()},
        {id:'acc-2-1-4-2',code:'2.1.4.2',name:'Impuestos Nacionales a Pagar',type:'liability',parent_id:'acc-2-1-4',active:true,created_at:now()},
        {id:'acc-2-1-4-2-2',code:'2.1.4.2.2',name:'SICORE a pagar',type:'liability',parent_id:'acc-2-1-4-2',active:true,created_at:now()},
        {id:'acc-2-1-4-2-6',code:'2.1.4.2.6',name:'Impuesto a las ganancias a pagar',type:'liability',parent_id:'acc-2-1-4-2',active:true,created_at:now()},
        {id:'acc-2-1-4-2-8',code:'2.1.4.2.8',name:'SIRE a pagar',type:'liability',parent_id:'acc-2-1-4-2',active:true,created_at:now()},
        {id:'acc-2-1-4-3',code:'2.1.4.3',name:'IIBB a Pagar',type:'liability',parent_id:'acc-2-1-4',active:true,created_at:now()},
        {id:'acc-2-1-4-3-2',code:'2.1.4.3.2',name:'Ret. y Perc. IIBB BS AS',type:'liability',parent_id:'acc-2-1-4-3',active:true,created_at:now()},
        {id:'acc-2-1-4-3-3',code:'2.1.4.3.3',name:'IIBB BS AS a pagar',type:'liability',parent_id:'acc-2-1-4-3',active:true,created_at:now()},
        {id:'acc-2-1-4-3-4',code:'2.1.4.3.4',name:'Ret. y Perc. IIBB CABA',type:'liability',parent_id:'acc-2-1-4-3',active:true,created_at:now()},
        {id:'acc-2-1-4-3-5',code:'2.1.4.3.5',name:'Ret. y Perc. IIBB CABA',type:'liability',parent_id:'acc-2-1-4-3',active:true,created_at:now()},
        {id:'acc-2-1-4-3-6',code:'2.1.4.3.6',name:'Ret. y Perc. IIBB BS AS',type:'liability',parent_id:'acc-2-1-4-3',active:true,created_at:now()},
        {id:'acc-2-1-4-3-7',code:'2.1.4.3.7',name:'Ret. y Perc. IIBB BS AS',type:'liability',parent_id:'acc-2-1-4-3',active:true,created_at:now()},
        {id:'acc-2-1-4-3-8',code:'2.1.4.3.8',name:'Ret. y Perc. IIBB BS AS',type:'liability',parent_id:'acc-2-1-4-3',active:true,created_at:now()},
        {id:'acc-2-1-4-3-9',code:'2.1.4.3.9',name:'Ret. y Perc. IIBB CABA',type:'liability',parent_id:'acc-2-1-4-3',active:true,created_at:now()},
        {id:'acc-2-1-4-3-10',code:'2.1.4.3.10',name:'Ret. y Perc. IIBB CABA',type:'liability',parent_id:'acc-2-1-4-3',active:true,created_at:now()},
        {id:'acc-2-1-4-6',code:'2.1.4.6',name:'IVA Debito Fiscal',type:'liability',parent_id:'acc-2-1-4',active:true,created_at:now()},
        {id:'acc-2-1-4-6-1',code:'2.1.4.6.1',name:'IVA debito fiscal 21',type:'liability',parent_id:'acc-2-1-4-6',active:true,created_at:now()},
        {id:'acc-2-1-4-6-2',code:'2.1.4.6.2',name:'IVA debito fiscal 10.5',type:'liability',parent_id:'acc-2-1-4-6',active:true,created_at:now()},
        {id:'acc-2-1-4-7',code:'2.1.4.7',name:'ARCA A PAGAR - por ajuste de inspeccion',type:'liability',parent_id:'acc-2-1-4',active:true,created_at:now()},
        {id:'acc-2-1-6',code:'2.1.6',name:'Deudas Financieras',type:'liability',parent_id:'acc-2-1',active:true,created_at:now()},
        {id:'acc-2-1-6-1',code:'2.1.6.1',name:'Mutuos - Accionistas',type:'liability',parent_id:'acc-2-1-6',active:true,created_at:now()},
        {id:'acc-2-1-6-1-1',code:'2.1.6.1.1',name:'Deuda por mutuos - Daniel Fantin',type:'liability',parent_id:'acc-2-1-6-1',active:true,created_at:now()},
        {id:'acc-2-1-6-2',code:'2.1.6.2',name:'Mutuos - Terceros',type:'liability',parent_id:'acc-2-1-6',active:true,created_at:now()},
        {id:'acc-2-1-6-2-28',code:'2.1.6.2.28',name:'Deuda por mutuos - Paola Tandredi',type:'liability',parent_id:'acc-2-1-6-2',active:true,created_at:now()},
        {id:'acc-2-1-6-2-35',code:'2.1.6.2.35',name:'Deuda por mutuos - Roque Stefanelli',type:'liability',parent_id:'acc-2-1-6-2',active:true,created_at:now()},
        {id:'acc-2-1-6-2-44',code:'2.1.6.2.44',name:'Deuda por mutuos - IA Temporal',type:'liability',parent_id:'acc-2-1-6-2',active:true,created_at:now()},
        {id:'acc-2-1-6-3',code:'2.1.6.3',name:'Deudas Financieras Internas',type:'liability',parent_id:'acc-2-1-6',active:true,created_at:now()},
        {id:'acc-2-1-6-3-3',code:'2.1.6.3.3',name:'Deud. Fin. Int. - Fiduciaria Central',type:'liability',parent_id:'acc-2-1-6-3',active:true,created_at:now()},
        {id:'acc-2-1-6-3-4',code:'2.1.6.3.4',name:'Deud. Fin. Int. - Riverside',type:'liability',parent_id:'acc-2-1-6-3',active:true,created_at:now()},
        {id:'acc-2-1-6-3-8',code:'2.1.6.3.8',name:'Deud. Fin. Int - Ha emprendimientos srl',type:'liability',parent_id:'acc-2-1-6-3',active:true,created_at:now()},
        {id:'acc-2-1-6-5',code:'2.1.6.5',name:'Otras Deudas Financieras',type:'liability',parent_id:'acc-2-1-6',active:true,created_at:now()},
        {id:'acc-2-1-6-5-1',code:'2.1.6.5.1',name:'GA 313',type:'liability',parent_id:'acc-2-1-6-5',active:true,created_at:now()},
        {id:'acc-2-1-6-5-1-1',code:'2.1.6.5.1.1',name:'GA 313',type:'liability',parent_id:'acc-2-1-6-5-1',active:true,created_at:now()},
        {id:'acc-2-2',code:'2.2',name:'PASIVO NO CORRIENTE',type:'liability',parent_id:'acc-2',active:true,created_at:now()},
        {id:'acc-2-2-3',code:'2.2.3',name:'Depositos en Garantia',type:'liability',parent_id:'acc-2-2',active:true,created_at:now()},
        {id:'acc-2-2-3-1',code:'2.2.3.1',name:'Depositos en garantia - Inquilinos',type:'liability',parent_id:'acc-2-2-3',active:true,created_at:now()},
        {id:'acc-3',code:'3',name:'PATRIMONIO NETO',type:'equity',parent_id:null,active:true,created_at:now()},
        {id:'acc-3-1',code:'3.1',name:'Capital y Reservas',type:'equity',parent_id:'acc-3',active:true,created_at:now()},
        {id:'acc-3-1-1',code:'3.1.1',name:'Cuentas de Capital',type:'equity',parent_id:'acc-3-1',active:true,created_at:now()},
        {id:'acc-3-1-1-1',code:'3.1.1.1',name:'Capital Social',type:'equity',parent_id:'acc-3-1-1',active:true,created_at:now()},
        {id:'acc-3-1-1-2',code:'3.1.1.2',name:'Resultados No Asignados',type:'equity',parent_id:'acc-3-1-1',active:true,created_at:now()},
        {id:'acc-3-1-1-3',code:'3.1.1.3',name:'Ajuste Capital',type:'equity',parent_id:'acc-3-1-1',active:true,created_at:now()},
        {id:'acc-3-1-1-4',code:'3.1.1.4',name:'Aportes irrevocables',type:'equity',parent_id:'acc-3-1-1',active:true,created_at:now()},
        {id:'acc-3-1-1-5',code:'3.1.1.5',name:'Reserva Legal',type:'equity',parent_id:'acc-3-1-1',active:true,created_at:now()},
        {id:'acc-3-1-1-6',code:'3.1.1.6',name:'Otras reservas',type:'equity',parent_id:'acc-3-1-1',active:true,created_at:now()},
        {id:'acc-4',code:'4',name:'INGRESOS',type:'revenue',parent_id:null,active:true,created_at:now()},
        {id:'acc-4-1',code:'4.1',name:'Ingresos Ordinarios',type:'revenue',parent_id:'acc-4',active:true,created_at:now()},
        {id:'acc-4-1-1',code:'4.1.1',name:'Ingresos Operativos',type:'revenue',parent_id:'acc-4-1',active:true,created_at:now()},
        {id:'acc-4-1-1-1',code:'4.1.1.1',name:'Ingresos por servicios',type:'revenue',parent_id:'acc-4-1-1',active:true,created_at:now()},
        {id:'acc-4-1-1-3',code:'4.1.1.3',name:'Fee de desarrollo/construccion',type:'revenue',parent_id:'acc-4-1-1',active:true,created_at:now()},
        {id:'acc-4-1-1-4',code:'4.1.1.4',name:'Alquileres R+ $',type:'revenue',parent_id:'acc-4-1-1',active:true,created_at:now()},
        {id:'acc-4-1-1-6',code:'4.1.1.6',name:'Venta de bienes de uso',type:'revenue',parent_id:'acc-4-1-1',active:true,created_at:now()},
        {id:'acc-4-1-2',code:'4.1.2',name:'Resultados Financieros',type:'revenue',parent_id:'acc-4-1',active:true,created_at:now()},
        {id:'acc-4-1-2-1',code:'4.1.2.1',name:'ARG - Resultados financieros',type:'revenue',parent_id:'acc-4-1-2',active:true,created_at:now()},
        {id:'acc-4-1-2-2',code:'4.1.2.2',name:'USA - Resultados financieros',type:'revenue',parent_id:'acc-4-1-2',active:true,created_at:now()},
        {id:'acc-4-1-4',code:'4.1.4',name:'Recuperos e Ingresos Varios',type:'revenue',parent_id:'acc-4-1',active:true,created_at:now()},
        {id:'acc-4-1-4-1',code:'4.1.4.1',name:'Recupero de gastos expensables FBCII',type:'revenue',parent_id:'acc-4-1-4',active:true,created_at:now()},
        {id:'acc-4-1-4-2',code:'4.1.4.2',name:'Recupero ART CM',type:'revenue',parent_id:'acc-4-1-4',active:true,created_at:now()},
        {id:'acc-4-1-4-3',code:'4.1.4.3',name:'Ingresos varios',type:'revenue',parent_id:'acc-4-1-4',active:true,created_at:now()},
        {id:'acc-4-1-4-4',code:'4.1.4.4',name:'Recupero de gastos expensables LIB',type:'revenue',parent_id:'acc-4-1-4',active:true,created_at:now()},
        {id:'acc-4-1-4-5',code:'4.1.4.5',name:'Recupero de gastos expensables RV',type:'revenue',parent_id:'acc-4-1-4',active:true,created_at:now()},
        {id:'acc-4-1-4-6',code:'4.1.4.6',name:'Recupero de gastos FEA',type:'revenue',parent_id:'acc-4-1-4',active:true,created_at:now()},
        {id:'acc-4-1-4-7',code:'4.1.4.7',name:'Recupero de gastos expensables Terrero 910',type:'revenue',parent_id:'acc-4-1-4',active:true,created_at:now()},
        {id:'acc-4-1-4-8',code:'4.1.4.8',name:'Recupero de gastos expensables Zarate al Rio',type:'revenue',parent_id:'acc-4-1-4',active:true,created_at:now()},
        {id:'acc-4-1-4-9',code:'4.1.4.9',name:'Recupero Afip',type:'revenue',parent_id:'acc-4-1-4',active:true,created_at:now()},
        {id:'acc-4-1-4-10',code:'4.1.4.10',name:'Recupero de gastos Mercado pago CM',type:'revenue',parent_id:'acc-4-1-4',active:true,created_at:now()},
        {id:'acc-4-1-4-11',code:'4.1.4.11',name:'Recupero de gastos de Fondos de Reserva',type:'revenue',parent_id:'acc-4-1-4',active:true,created_at:now()},
        {id:'acc-4-1-4-13',code:'4.1.4.13',name:'Recupero embargos ARBA Fiduciaria Central',type:'revenue',parent_id:'acc-4-1-4',active:true,created_at:now()},
        {id:'acc-5',code:'5',name:'EGRESOS',type:'expense',parent_id:null,active:true,created_at:now()},
        {id:'acc-5-1',code:'5.1',name:'Gastos Operativos',type:'expense',parent_id:'acc-5',active:true,created_at:now()},
        {id:'acc-5-1-1',code:'5.1.1',name:'Gastos Comerciales',type:'expense',parent_id:'acc-5-1',active:true,created_at:now()},
        {id:'acc-5-1-1-2',code:'5.1.1.2',name:'COM - Comisiones por ventas',type:'expense',parent_id:'acc-5-1-1',active:true,created_at:now()},
        {id:'acc-5-1-1-5',code:'5.1.1.5',name:'COM - Publicidad',type:'expense',parent_id:'acc-5-1-1',active:true,created_at:now()},
        {id:'acc-5-1-1-6',code:'5.1.1.6',name:'COM - Carteleria',type:'expense',parent_id:'acc-5-1-1',active:true,created_at:now()},
        {id:'acc-5-1-1-8',code:'5.1.1.8',name:'COM - Merchandising',type:'expense',parent_id:'acc-5-1-1',active:true,created_at:now()},
        {id:'acc-5-1-1-10',code:'5.1.1.10',name:'COM - Eventos internos',type:'expense',parent_id:'acc-5-1-1',active:true,created_at:now()},
        {id:'acc-5-1-1-11',code:'5.1.1.11',name:'COM - Eventos externos',type:'expense',parent_id:'acc-5-1-1',active:true,created_at:now()},
        {id:'acc-5-1-1-12',code:'5.1.1.12',name:'COM - Eventos',type:'expense',parent_id:'acc-5-1-1',active:true,created_at:now()},
        {id:'acc-5-1-1-13',code:'5.1.1.13',name:'COM - Partnerships',type:'expense',parent_id:'acc-5-1-1',active:true,created_at:now()},
        {id:'acc-5-1-1-14',code:'5.1.1.14',name:'COM - Marketing',type:'expense',parent_id:'acc-5-1-1',active:true,created_at:now()},
        {id:'acc-5-1-1-15',code:'5.1.1.15',name:'COM - Regalos + carteleria',type:'expense',parent_id:'acc-5-1-1',active:true,created_at:now()},
        {id:'acc-5-1-2',code:'5.1.2',name:'Mano de Obra de Obra',type:'expense',parent_id:'acc-5-1',active:true,created_at:now()},
        {id:'acc-5-1-2-1',code:'5.1.2.1',name:'INTERNA',type:'expense',parent_id:'acc-5-1-2',active:true,created_at:now()},
        {id:'acc-5-1-2-2',code:'5.1.2.2',name:'COOPERATIVA',type:'expense',parent_id:'acc-5-1-2',active:true,created_at:now()},
        {id:'acc-5-1-2-3',code:'5.1.2.3',name:'SUBCONTRATISTAS',type:'expense',parent_id:'acc-5-1-2',active:true,created_at:now()},
        {id:'acc-5-1-2-5',code:'5.1.2.5',name:'CS. SOCIALES',type:'expense',parent_id:'acc-5-1-2',active:true,created_at:now()},
        {id:'acc-5-1-2-6',code:'5.1.2.6',name:'SERVICIOS COOP',type:'expense',parent_id:'acc-5-1-2',active:true,created_at:now()},
        {id:'acc-5-1-2-9',code:'5.1.2.9',name:'AVANCE DE OBRA',type:'expense',parent_id:'acc-5-1-2',active:true,created_at:now()},
        {id:'acc-5-1-3',code:'5.1.3',name:'Gastos de Obra',type:'expense',parent_id:'acc-5-1',active:true,created_at:now()},
        {id:'acc-5-1-3-4',code:'5.1.3.4',name:'MANTENIMIENTO',type:'expense',parent_id:'acc-5-1-3',active:true,created_at:now()},
        {id:'acc-5-1-3-5',code:'5.1.3.5',name:'MOVILIDAD Y VIATICOS',type:'expense',parent_id:'acc-5-1-3',active:true,created_at:now()},
        {id:'acc-5-1-3-8',code:'5.1.3.8',name:'SERVICIOS',type:'expense',parent_id:'acc-5-1-3',active:true,created_at:now()},
        {id:'acc-5-1-3-9',code:'5.1.3.9',name:'GASTOS VARIOS',type:'expense',parent_id:'acc-5-1-3',active:true,created_at:now()},
        {id:'acc-5-1-3-11',code:'5.1.3.11',name:'RETIRO DE SOCIOS',type:'expense',parent_id:'acc-5-1-3',active:true,created_at:now()},
        {id:'acc-5-1-4',code:'5.1.4',name:'Gastos de Administracion',type:'expense',parent_id:'acc-5-1',active:true,created_at:now()},
        {id:'acc-5-1-4-1',code:'5.1.4.1',name:'9400 - ADM - SUELDOS',type:'expense',parent_id:'acc-5-1-4',active:true,created_at:now()},
        {id:'acc-5-1-4-1-1',code:'5.1.4.1.1',name:'Sueldos GA',type:'expense',parent_id:'acc-5-1-4-1',active:true,created_at:now()},
        {id:'acc-5-1-4-1-2',code:'5.1.4.1.2',name:'Sueldos HA',type:'expense',parent_id:'acc-5-1-4-1',active:true,created_at:now()},
        {id:'acc-5-1-4-1-3',code:'5.1.4.1.3',name:'Sueldos Sense Olivos',type:'expense',parent_id:'acc-5-1-4-1',active:true,created_at:now()},
        {id:'acc-5-1-4-1-5',code:'5.1.4.1.5',name:'Sueldos Numa - Barbarita',type:'expense',parent_id:'acc-5-1-4-1',active:true,created_at:now()},
        {id:'acc-5-1-4-1-8',code:'5.1.4.1.8',name:'Sueldos HA Projects',type:'expense',parent_id:'acc-5-1-4-1',active:true,created_at:now()},
        {id:'acc-5-1-4-1-9',code:'5.1.4.1.9',name:'Sueldos HA SAS',type:'expense',parent_id:'acc-5-1-4-1',active:true,created_at:now()},
        {id:'acc-5-1-4-1-10',code:'5.1.4.1.10',name:'Sueldos La Barra',type:'expense',parent_id:'acc-5-1-4-1',active:true,created_at:now()},
        {id:'acc-5-1-4-1-11',code:'5.1.4.1.11',name:'Sueldos Post Venta',type:'expense',parent_id:'acc-5-1-4-1',active:true,created_at:now()},
        {id:'acc-5-1-4-2',code:'5.1.4.2',name:'IMP, TASAS Y CONT',type:'expense',parent_id:'acc-5-1-4',active:true,created_at:now()},
        {id:'acc-5-1-4-3',code:'5.1.4.3',name:'GASTOS VARIOS',type:'expense',parent_id:'acc-5-1-4',active:true,created_at:now()},
        {id:'acc-5-1-4-4',code:'5.1.4.4',name:'CS. SOCIALES',type:'expense',parent_id:'acc-5-1-4',active:true,created_at:now()},
        {id:'acc-5-1-4-6',code:'5.1.4.6',name:'ALQUILERES',type:'expense',parent_id:'acc-5-1-4',active:true,created_at:now()},
        {id:'acc-5-1-4-7',code:'5.1.4.7',name:'HONORARIOS',type:'expense',parent_id:'acc-5-1-4',active:true,created_at:now()},
        {id:'acc-5-1-4-8',code:'5.1.4.8',name:'LIMPIEZA Y MERCADO',type:'expense',parent_id:'acc-5-1-4',active:true,created_at:now()},
        {id:'acc-5-1-4-10',code:'5.1.4.10',name:'LIBRERIA',type:'expense',parent_id:'acc-5-1-4',active:true,created_at:now()},
        {id:'acc-5-1-4-11',code:'5.1.4.11',name:'GESTION ADMINISTRATIVA',type:'expense',parent_id:'acc-5-1-4',active:true,created_at:now()},
        {id:'acc-5-1-4-12',code:'5.1.4.12',name:'9404 - ADM - MOVILIDAD Y VIATICOS',type:'expense',parent_id:'acc-5-1-4',active:true,created_at:now()},
        {id:'acc-5-1-4-13',code:'5.1.4.13',name:'Impuesto al debito bancario',type:'expense',parent_id:'acc-5-1-4',active:true,created_at:now()},
        {id:'acc-5-1-4-15',code:'5.1.4.15',name:'SEGUROS',type:'expense',parent_id:'acc-5-1-4',active:true,created_at:now()},
        {id:'acc-5-1-4-16',code:'5.1.4.16',name:'Deudas Afip - Planes de pagos',type:'expense',parent_id:'acc-5-1-4',active:true,created_at:now()},
        {id:'acc-5-1-4-18',code:'5.1.4.18',name:'Diferencias temporales',type:'expense',parent_id:'acc-5-1-4',active:true,created_at:now()},
        {id:'acc-5-1-4-19',code:'5.1.4.19',name:'GASTOS BANCARIOS',type:'expense',parent_id:'acc-5-1-4',active:true,created_at:now()},
        {id:'acc-5-1-4-20',code:'5.1.4.20',name:'9408 - ADM - IMPUESTOS NACIONALES',type:'expense',parent_id:'acc-5-1-4',active:true,created_at:now()},
        {id:'acc-5-1-4-21',code:'5.1.4.21',name:'Deuda ARBA - Planes de pago',type:'expense',parent_id:'acc-5-1-4',active:true,created_at:now()},
        {id:'acc-5-1-4-22',code:'5.1.4.22',name:'ADM - Servicios',type:'expense',parent_id:'acc-5-1-4',active:true,created_at:now()},
        {id:'acc-5-1-7',code:'5.1.7',name:'Resultados Extraordinarios',type:'expense',parent_id:'acc-5-1',active:true,created_at:now()},
        {id:'acc-5-1-7-1',code:'5.1.7.1',name:'Resultado negativo por perdidas extraordinarias',type:'expense',parent_id:'acc-5-1-7',active:true,created_at:now()},
        {id:'acc-5-1-7-2',code:'5.1.7.2',name:'Gastos no computables',type:'expense',parent_id:'acc-5-1-7',active:true,created_at:now()},
        {id:'acc-5-1-9',code:'5.1.9',name:'Recursos Humanos',type:'expense',parent_id:'acc-5-1',active:true,created_at:now()},
        {id:'acc-5-1-9-1',code:'5.1.9.1',name:'RRHH - Honorarios',type:'expense',parent_id:'acc-5-1-9',active:true,created_at:now()},
        {id:'acc-5-1-9-3',code:'5.1.9.3',name:'RRHH - Gastos Varios',type:'expense',parent_id:'acc-5-1-9',active:true,created_at:now()},
        {id:'acc-5-1-9-4',code:'5.1.9.4',name:'RRHH - Capacitaciones',type:'expense',parent_id:'acc-5-1-9',active:true,created_at:now()},
        {id:'acc-5-1-9-5',code:'5.1.9.5',name:'RRHH - Busqueda de personal',type:'expense',parent_id:'acc-5-1-9',active:true,created_at:now()},
        {id:'acc-5-2',code:'5.2',name:'Cuentas Regularizadoras',type:'expense',parent_id:'acc-5',active:true,created_at:now()},
        {id:'acc-5-2-1',code:'5.2.1',name:'Regularizadoras',type:'expense',parent_id:'acc-5-2',active:true,created_at:now()},
        {id:'acc-5-2-1-1',code:'5.2.1.1',name:'Regularizadora gastos bancarios',type:'expense',parent_id:'acc-5-2-1',active:true,created_at:now()},
        {id:'acc-5-2-1-2',code:'5.2.1.2',name:'Regularizadora tarjeta visa',type:'expense',parent_id:'acc-5-2-1',active:true,created_at:now()}
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
      clientes: [
        { id: 'cli-001', name: 'Carlos Fernandez', doc_type: 'DNI', doc_number: '28456789', phone: '011-1534-5678', email: 'carlos.f@email.com', address: 'Av. Corrientes 3400 Piso 2, CABA', notes: '', created_at: now() },
        { id: 'cli-002', name: 'Maria Elena Suarez', doc_type: 'DNI', doc_number: '31987654', phone: '011-1567-8901', email: 'msuarez@gmail.com', address: 'Tucuman 1200, CABA', notes: '', created_at: now() },
        { id: 'cli-003', name: 'Roberto Alvarez', doc_type: 'CUIT', doc_number: '20-25678901-4', phone: '011-4543-2211', email: 'ralvarez@empresa.com', address: 'Libertad 890, San Isidro', notes: 'Compra para inversion', created_at: now() },
      ],
      unidades: [
        { id: 'un-001', project_id: p1, number: '1A', type: 'dept', floor: '1', area: 62, rooms: 2, list_price: 95000, currency: 'USD', status: 'sold',      notes: '', created_at: now() },
        { id: 'un-002', project_id: p1, number: '1B', type: 'dept', floor: '1', area: 75, rooms: 3, list_price: 115000, currency: 'USD', status: 'reserved',  notes: '', created_at: now() },
        { id: 'un-003', project_id: p1, number: '2A', type: 'dept', floor: '2', area: 62, rooms: 2, list_price: 97000,  currency: 'USD', status: 'available', notes: '', created_at: now() },
        { id: 'un-004', project_id: p1, number: '2B', type: 'dept', floor: '2', area: 75, rooms: 3, list_price: 118000, currency: 'USD', status: 'available', notes: '', created_at: now() },
        { id: 'un-005', project_id: p1, number: '3A', type: 'dept', floor: '3', area: 62, rooms: 2, list_price: 99000,  currency: 'USD', status: 'available', notes: '', created_at: now() },
        { id: 'un-006', project_id: p1, number: 'PH', type: 'dept', floor: '12', area: 140, rooms: 4, list_price: 280000, currency: 'USD', status: 'available', notes: 'Penthouse con terraza privada', created_at: now() },
        { id: 'un-007', project_id: p1, number: 'C-01', type: 'parking', floor: 'PB', area: 14, rooms: 0, list_price: 18000, currency: 'USD', status: 'sold', notes: '', created_at: now() },
        { id: 'un-008', project_id: p1, number: 'C-02', type: 'parking', floor: 'PB', area: 14, rooms: 0, list_price: 18000, currency: 'USD', status: 'available', notes: '', created_at: now() },
      ],
      ventasUnidades: [
        { id: 'vta-001', unit_id: 'un-001', contract_number: 'VTA-2025-001', buyer_client_id: 'cli-001', buyer_name: 'Carlos Fernandez', buyer_doc_type: 'DNI', buyer_doc: '28456789', buyer_phone: '011-1534-5678', buyer_email: 'carlos.f@email.com', sale_date: '2025-02-10', currency: 'USD', sale_price: 93000, payment_type: 'mixed', installments: [{ id: 'inst-001', number: 0, concept: 'Seña / Anticipo', due_date: '2025-02-10', amount: 20000, status: 'paid', paid_date: '2025-02-10' }, { id: 'inst-002', number: 1, concept: 'Cuota 1/24', due_date: '2025-03-10', amount: 3041, status: 'paid', paid_date: '2025-03-12' }, { id: 'inst-003', number: 2, concept: 'Cuota 2/24', due_date: '2025-04-10', amount: 3042, status: 'pending' }, { id: 'inst-004', number: 3, concept: 'Cuota 3/24', due_date: '2025-05-10', amount: 3042, status: 'pending' }], status: 'active', notes: '', created_at: now() },
      ],
      cobrosVentas: [
        { id: 'cob-001', sale_id: 'vta-001', installment_id: 'inst-001', date: '2025-02-10', amount: 20000, currency: 'USD', method: 'transfer', reference: 'TRF-20250210', notes: 'Seña inicial', created_at: now() },
        { id: 'cob-002', sale_id: 'vta-001', installment_id: 'inst-002', date: '2025-03-12', amount: 3041, currency: 'USD', method: 'transfer', reference: 'TRF-20250312', notes: '', created_at: now() },
      ],
      cheques: [],
      bankAccounts: [
        { id: 'ba-001', name: 'Cuenta Corriente BNA', bank: 'Banco Nacion Argentina', account_number: '0110-0000-0001234567', currency: 'ARS', type: 'checking', initial_balance: 5000000, notes: 'Cuenta operativa principal', created_at: now() },
        { id: 'ba-002', name: 'Caja USD', bank: 'Caja interna', account_number: '', currency: 'USD', type: 'cash', initial_balance: 15000, notes: 'Fondos en caja en dolares', created_at: now() },
      ],
      bankMovements: [
        { id: 'bm-001', account_id: 'ba-001', date: '2025-03-25', type: 'debit', amount: 5747500, concept: 'OP-2025-001 Pago proveedor CHP', reference: 'OP-2025-001', created_at: now() },
        { id: 'bm-002', account_id: 'ba-001', date: '2025-04-15', type: 'debit', amount: 3880000, concept: 'OP-2025-002 Anticipo hierros', reference: 'OP-2025-002', created_at: now() },
        { id: 'bm-003', account_id: 'ba-001', date: '2025-04-15', type: 'credit', amount: 15125000, concept: 'Cobro FA-0001-00001234 Inversiones RP SA', reference: 'TRF-20250415', created_at: now() },
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
