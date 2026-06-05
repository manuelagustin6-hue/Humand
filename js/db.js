/* ===== DATABASE LAYER (localStorage) ===== */
const DB = {
  KEY: 'erp_construccion_v1',

  get() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : this.init();
    } catch { return this.init(); }
  },

  save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  init() {
    const data = this.seed();
    this.save(data);
    return data;
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
    this.save(db);
    return item;
  },

  update(collection, id, updates) {
    const db = this.get();
    const idx = (db[collection] || []).findIndex(x => x.id === id);
    if (idx === -1) return null;
    db[collection][idx] = { ...db[collection][idx], ...updates, updated_at: now() };
    this.save(db);
    return db[collection][idx];
  },

  remove(collection, id) {
    const db = this.get();
    db[collection] = (db[collection] || []).filter(x => x.id !== id);
    this.save(db);
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
        { id: uuid(), project_id: p1, chapter: '01', item: '01.01', category: 'Estructura', description: 'Hormigón armado fundaciones', unit: 'm3', quantity: 320, unit_price: 85000, total: 27200000, created_at: now() },
        { id: uuid(), project_id: p1, chapter: '01', item: '01.02', category: 'Estructura', description: 'Hormigón armado columnas y losas', unit: 'm3', quantity: 1200, unit_price: 78000, total: 93600000, created_at: now() },
        { id: uuid(), project_id: p1, chapter: '02', item: '02.01', category: 'Mampostería', description: 'Albañilería ladrillo hueco', unit: 'm2', quantity: 4800, unit_price: 12500, total: 60000000, created_at: now() },
        { id: uuid(), project_id: p1, chapter: '02', item: '02.02', category: 'Mampostería', description: 'Revoques interiores', unit: 'm2', quantity: 9600, unit_price: 4800, total: 46080000, created_at: now() },
        { id: uuid(), project_id: p1, chapter: '03', item: '03.01', category: 'Instalaciones', description: 'Instalación eléctrica', unit: 'm2', quantity: 4800, unit_price: 8500, total: 40800000, created_at: now() },
        { id: uuid(), project_id: p1, chapter: '03', item: '03.02', category: 'Instalaciones', description: 'Instalación sanitaria', unit: 'm2', quantity: 4800, unit_price: 7200, total: 34560000, created_at: now() },
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
        { id: 'gt-001', project_id: p1, name: 'Demolición y limpieza', start_date: '2025-01-15', end_date: '2025-02-15', progress: 100, status: 'completed', assignee: 'Equipo A', color: 'green', dependencies: [], approval_status: 'approved', created_at: now() },
        { id: 'gt-002', project_id: p1, name: 'Fundaciones y pilotes', start_date: '2025-02-01', end_date: '2025-04-30', progress: 85, status: 'in_progress', assignee: 'Equipo B', color: 'blue', dependencies: ['gt-001'], approval_status: 'approved', created_at: now() },
        { id: 'gt-003', project_id: p1, name: 'Estructura hormigón P1-P6', start_date: '2025-04-01', end_date: '2025-08-31', progress: 40, status: 'in_progress', assignee: 'Equipo C', color: 'blue', dependencies: ['gt-002'], approval_status: 'pending', created_at: now() },
        { id: 'gt-004', project_id: p1, name: 'Estructura hormigón P7-P12', start_date: '2025-08-01', end_date: '2025-12-31', progress: 0, status: 'pending', assignee: 'Equipo C', color: 'gray', dependencies: ['gt-003'], approval_status: 'pending', created_at: now() },
        { id: 'gt-005', project_id: p1, name: 'Mampostería y revoques', start_date: '2025-06-01', end_date: '2026-03-31', progress: 10, status: 'in_progress', assignee: 'Equipo D', color: 'yellow', dependencies: ['gt-003'], approval_status: 'pending', created_at: now() },
        { id: 'gt-006', project_id: p1, name: 'Instalaciones eléctricas', start_date: '2025-09-01', end_date: '2026-04-30', progress: 0, status: 'pending', assignee: 'ElecTech SRL', color: 'gray', dependencies: ['gt-004'], approval_status: 'pending', created_at: now() },
        { id: 'gt-007', project_id: p1, name: 'Terminaciones y entrega', start_date: '2026-03-01', end_date: '2026-06-30', progress: 0, status: 'pending', assignee: 'Equipo E', color: 'gray', dependencies: ['gt-005', 'gt-006'], approval_status: 'pending', created_at: now() },
        { id: 'gt-008', project_id: p2, name: 'Movimiento de suelos', start_date: '2024-09-01', end_date: '2024-11-30', progress: 100, status: 'completed', assignee: 'Vial SA', color: 'green', dependencies: [], approval_status: 'approved', created_at: now() },
        { id: 'gt-009', project_id: p2, name: 'Pilotes y fundaciones', start_date: '2024-10-01', end_date: '2025-02-28', progress: 100, status: 'completed', assignee: 'Ciment AR', color: 'green', dependencies: ['gt-008'], approval_status: 'approved', created_at: now() },
        { id: 'gt-010', project_id: p2, name: 'Estructura metálica', start_date: '2025-02-01', end_date: '2025-08-31', progress: 60, status: 'in_progress', assignee: 'Metaler SA', color: 'blue', dependencies: ['gt-009'], approval_status: 'pending', created_at: now() },
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
        { id: 'ac-100', code: '1', name: 'ACTIVO', type: 'asset', parent_id: null, active: true, created_at: now() },
        { id: 'ac-101', code: '1.1', name: 'Activo Corriente', type: 'asset', parent_id: 'ac-100', active: true, created_at: now() },
        { id: 'ac-102', code: '1.1.1', name: 'Caja y Bancos', type: 'asset', parent_id: 'ac-101', active: true, created_at: now() },
        { id: 'ac-103', code: '1.1.2', name: 'Cuentas por Cobrar', type: 'asset', parent_id: 'ac-101', active: true, created_at: now() },
        { id: 'ac-104', code: '1.2', name: 'Activo No Corriente', type: 'asset', parent_id: 'ac-100', active: true, created_at: now() },
        { id: 'ac-105', code: '1.2.1', name: 'Obras en Curso', type: 'asset', parent_id: 'ac-104', active: true, created_at: now() },
        { id: 'ac-200', code: '2', name: 'PASIVO', type: 'liability', parent_id: null, active: true, created_at: now() },
        { id: 'ac-201', code: '2.1', name: 'Pasivo Corriente', type: 'liability', parent_id: 'ac-200', active: true, created_at: now() },
        { id: 'ac-202', code: '2.1.1', name: 'Cuentas por Pagar', type: 'liability', parent_id: 'ac-201', active: true, created_at: now() },
        { id: 'ac-203', code: '2.1.2', name: 'IVA a Pagar', type: 'liability', parent_id: 'ac-201', active: true, created_at: now() },
        { id: 'ac-300', code: '3', name: 'PATRIMONIO NETO', type: 'equity', parent_id: null, active: true, created_at: now() },
        { id: 'ac-301', code: '3.1', name: 'Capital Social', type: 'equity', parent_id: 'ac-300', active: true, created_at: now() },
        { id: 'ac-302', code: '3.2', name: 'Resultados Acumulados', type: 'equity', parent_id: 'ac-300', active: true, created_at: now() },
        { id: 'ac-400', code: '4', name: 'INGRESOS', type: 'revenue', parent_id: null, active: true, created_at: now() },
        { id: 'ac-401', code: '4.1', name: 'Ingresos por Obras', type: 'revenue', parent_id: 'ac-400', active: true, created_at: now() },
        { id: 'ac-402', code: '4.2', name: 'Otros Ingresos', type: 'revenue', parent_id: 'ac-400', active: true, created_at: now() },
        { id: 'ac-500', code: '5', name: 'EGRESOS', type: 'expense', parent_id: null, active: true, created_at: now() },
        { id: 'ac-501', code: '5.1', name: 'Costo de Obras', type: 'expense', parent_id: 'ac-500', active: true, created_at: now() },
        { id: 'ac-502', code: '5.2', name: 'Gastos de Administración', type: 'expense', parent_id: 'ac-500', active: true, created_at: now() },
        { id: 'ac-503', code: '5.3', name: 'Sueldos y Cargas Sociales', type: 'expense', parent_id: 'ac-500', active: true, created_at: now() },
      ],
      rubros: [
        { id: 'rub-001', code: '01', name: 'Trabajos Preliminares', unit: 'gl', category: 'Trabajos Preliminares', description: 'Limpieza, cerramiento provisorio, instalaciones temporarias', active: true, created_at: now() },
        { id: 'rub-002', code: '02', name: 'Movimiento de Suelos', unit: 'm³', category: 'Estructuras', description: 'Excavación, nivelación y rellenos compactados', active: true, created_at: now() },
        { id: 'rub-003', code: '03', name: 'Hormigón Armado', unit: 'm³', category: 'Estructuras', description: 'Hormigón estructural H-21 a H-30 con armadura', active: true, created_at: now() },
        { id: 'rub-004', code: '04', name: 'Mampostería', unit: 'm²', category: 'Albañilería', description: 'Muros de ladrillo cerámico hueco', active: true, created_at: now() },
        { id: 'rub-005', code: '05', name: 'Revoques', unit: 'm²', category: 'Terminaciones', description: 'Revoque grueso y fino interior y exterior', active: true, created_at: now() },
        { id: 'rub-006', code: '06', name: 'Carpintería Metálica', unit: 'un', category: 'Carpintería', description: 'Ventanas, puertas y marcos metálicos', active: true, created_at: now() },
        { id: 'rub-007', code: '07', name: 'Carpintería de Madera', unit: 'un', category: 'Carpintería', description: 'Puertas placares y muebles de madera', active: true, created_at: now() },
        { id: 'rub-008', code: '08', name: 'Instalación Eléctrica', unit: 'gl', category: 'Instalaciones', description: 'Instalación eléctrica completa tableros y artefactos', active: true, created_at: now() },
        { id: 'rub-009', code: '09', name: 'Instalación Sanitaria', unit: 'gl', category: 'Instalaciones', description: 'Agua fría caliente y cloacal', active: true, created_at: now() },
        { id: 'rub-010', code: '10', name: 'Cubierta', unit: 'm²', category: 'Cubiertas', description: 'Impermeabilización y cubierta de techo', active: true, created_at: now() },
        { id: 'rub-011', code: '11', name: 'Pintura', unit: 'm²', category: 'Terminaciones', description: 'Pintura látex interior y esmalte exterior', active: true, created_at: now() },
        { id: 'rub-012', code: '12', name: 'Pisos y Revestimientos', unit: 'm²', category: 'Terminaciones', description: 'Pisos cerámicos porcelánicos y revestimientos', active: true, created_at: now() },
      ],
      certificates: [
        { id: 'cert-001', number: 'CERT-2025-001', project_id: p1, date: '2025-03-31', period_from: '2025-03-01', period_to: '2025-03-31', status: 'approved', approved_by: 'Director de Obra', items: [{ description: 'Fundaciones y pilotes', unit: 'm³', quantity_contract: 320, quantity_period: 180, unit_price: 85000, amount_period: 15300000, pct_complete: 56.25 }, { description: 'Estructura P1-P3', unit: 'm³', quantity_contract: 1200, quantity_period: 120, unit_price: 78000, amount_period: 9360000, pct_complete: 10 }], subtotal: 24660000, retention_pct: 5, retention_amount: 1233000, net_amount: 23427000, invoice_id: 'inv-001', notes: 'Primer certificado de avance', created_at: now() },
        { id: 'cert-002', number: 'CERT-2025-002', project_id: p1, date: '2025-04-30', period_from: '2025-04-01', period_to: '2025-04-30', status: 'pending', approved_by: '', items: [{ description: 'Estructura P4-P6', unit: 'm³', quantity_contract: 1200, quantity_period: 150, unit_price: 78000, amount_period: 11700000, pct_complete: 12.5 }, { description: 'Mampostería planta baja', unit: 'm²', quantity_contract: 4800, quantity_period: 480, unit_price: 12500, amount_period: 6000000, pct_complete: 10 }], subtotal: 17700000, retention_pct: 5, retention_amount: 885000, net_amount: 16815000, invoice_id: 'inv-002', notes: 'Segundo certificado', created_at: now() },
        { id: 'cert-003', number: 'CERT-2025-003', project_id: p2, date: '2025-03-31', period_from: '2025-03-01', period_to: '2025-03-31', status: 'approved', approved_by: 'Inspección Técnica', items: [{ description: 'Estructura metálica - Nivel 1', unit: 'tn', quantity_contract: 480, quantity_period: 120, unit_price: 380000, amount_period: 45600000, pct_complete: 25 }], subtotal: 45600000, retention_pct: 5, retention_amount: 2280000, net_amount: 43320000, invoice_id: 'inv-003', notes: '', created_at: now() },
      ],
      paymentOrders: [
        { id: 'po-ord-001', number: 'OP-2025-001', supplier_id: s3, project_id: p1, account_id: 'ba-001', date: '2025-03-25', reference_doc: 'OC-2025-001', concept: 'Pago Cemento y Hormigón del Plata - OC-2025-001', gross_amount: 6050000, retentions: [{ retention_id: 'ret-001', name: 'Ret. IIBB Bs.As.', rate: 3, amount: 181500 }, { retention_id: 'ret-002', name: 'Ret. Ganancias', rate: 2, amount: 121000 }], total_retentions: 302500, net_amount: 5747500, status: 'paid', notes: '', created_at: now() },
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
        { id: 'idx-001', name: 'CAC - Índice General de la Construcción', code: 'CAC', category: 'General', base_date: '2020-01-01', base_value: 100, current_value: 342.5, last_update: '2025-04-01', source: 'Cámara Argentina de la Construcción', active: true, history: [{ date: '2025-01-01', value: 295.0 }, { date: '2025-02-01', value: 310.5 }, { date: '2025-03-01', value: 328.0 }, { date: '2025-04-01', value: 342.5 }], created_at: now() },
        { id: 'idx-002', name: 'INDEC - Índice Costo Construcción', code: 'ICC', category: 'General', base_date: '2020-01-01', base_value: 100, current_value: 518.3, last_update: '2025-04-01', source: 'INDEC', active: true, history: [{ date: '2025-01-01', value: 440.0 }, { date: '2025-02-01', value: 468.5 }, { date: '2025-03-01', value: 495.2 }, { date: '2025-04-01', value: 518.3 }], created_at: now() },
        { id: 'idx-003', name: 'UOCRA - Mano de Obra', code: 'MO', category: 'Mano de Obra', base_date: '2020-01-01', base_value: 100, current_value: 425.0, last_update: '2025-04-01', source: 'UOCRA', active: true, history: [{ date: '2025-01-01', value: 370.0 }, { date: '2025-02-01', value: 385.0 }, { date: '2025-03-01', value: 408.0 }, { date: '2025-04-01', value: 425.0 }], created_at: now() },
        { id: 'idx-004', name: 'CAC - Índice de Materiales', code: 'MAT', category: 'Materiales', base_date: '2020-01-01', base_value: 100, current_value: 298.7, last_update: '2025-04-01', source: 'CAC', active: true, history: [{ date: '2025-01-01', value: 255.0 }, { date: '2025-02-01', value: 267.5 }, { date: '2025-03-01', value: 283.0 }, { date: '2025-04-01', value: 298.7 }], created_at: now() },
      ],
      cashflowProjections: [
        { id: uuid(), project_id: p1, type: 'income', description: 'Certificación Mayo 2025', amount: 16000000, expected_date: '2025-05-31', probability: 90, category: 'Certificación', created_at: now() },
        { id: uuid(), project_id: p1, type: 'income', description: 'Certificación Junio 2025', amount: 17500000, expected_date: '2025-06-30', probability: 80, category: 'Certificación', created_at: now() },
        { id: uuid(), project_id: p1, type: 'expense', description: 'Pago proveedores Mayo', amount: 8500000, expected_date: '2025-05-15', probability: 95, category: 'Pago proveedor', created_at: now() },
        { id: uuid(), project_id: p1, type: 'expense', description: 'Sueldos Mayo 2025', amount: 4500000, expected_date: '2025-05-31', probability: 100, category: 'Sueldos', created_at: now() },
        { id: uuid(), project_id: p2, type: 'income', description: 'Certificación Mayo - Estructura', amount: 35000000, expected_date: '2025-05-31', probability: 85, category: 'Certificación', created_at: now() },
        { id: uuid(), project_id: p2, type: 'expense', description: 'Pago estructura metálica', amount: 18000000, expected_date: '2025-05-20', probability: 90, category: 'Pago proveedor', created_at: now() },
      ],
      users: [
        { id: 'usr-001', name: 'Administrador', email: 'admin@constructerp.com', role: 'admin', active: true, last_login: now(), created_at: now() },
        { id: 'usr-002', name: 'Gerente de Obra', email: 'gerente@constructerp.com', role: 'project_manager', active: true, last_login: now(), created_at: now() },
        { id: 'usr-003', name: 'Contador', email: 'contador@constructerp.com', role: 'accountant', active: true, last_login: now(), created_at: now() },
        { id: 'usr-004', name: 'Inspector de Obra', email: 'inspector@constructerp.com', role: 'inspector', active: true, last_login: null, created_at: now() },
        { id: 'usr-005', name: 'Lector', email: 'lector@constructerp.com', role: 'viewer', active: false, last_login: null, created_at: now() },
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
