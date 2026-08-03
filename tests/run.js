/* Suite de tests de flujos de la app ERP. Correr:  node tests/run.js
   (requiere `npm i` en tests/ una vez, para traer playwright). */
const { withApp, check, near, summary } = require('./harness');

(async () => {
  // ---- 1) Tipos de cambio / conversión (pivote USD) ----
  console.log('\n▶ Conversión de monedas (TC)');
  {
    const { result: r } = await withApp(['utils.js', 'db.js'], () => ({
      usd_ars: (DB.getExchangeRate('USD', 'ARS') || {}).rate,
      usd_uyu: (DB.getExchangeRate('USD', 'UYU') || {}).rate,
      ars_to_uyu: DB.convertCurrency(1100, 'ARS', 'UYU'),
      uyu_to_ars: DB.convertCurrency(40, 'UYU', 'ARS'),
      same: DB.convertCurrency(500, 'ARS', 'ARS'),
    }));
    check('USD→ARS = 1100', r.usd_ars === 1100);
    check('USD→UYU = 40', r.usd_uyu === 40);
    check('1100 ARS → 40 UYU (vía USD)', near(r.ars_to_uyu, 40));
    check('40 UYU → 1100 ARS (round-trip)', near(r.uyu_to_ars, 1100));
    check('misma moneda no cambia', r.same === 500);
  }

  // ---- 2) Numeración correlativa (nextJournalNumber = max+1 por año) ----
  console.log('\n▶ Numeración de asientos');
  {
    const { result: r } = await withApp(['utils.js', 'db.js', 'modules/asientos.js'], () => {
      var y = new Date().getFullYear();
      DB.insert('journalEntries', { number: 'AS-' + y + '-0007', lines: [] });
      DB.insert('journalEntries', { number: 'AS-' + y + '-0003', lines: [] });
      return { next: nextJournalNumber(), year: y };
    });
    check('siguiente asiento = max+1 (0008)', r.next === 'AS-' + r.year + '-0008');
  }

  // ---- 3) Parse de montos es-AR (que no vuelva el bug de parseFloat) ----
  console.log('\n▶ Parseo de montos (es-AR)');
  {
    const { result: r } = await withApp(['utils.js'], () => ({
      mil: numParse('100.000,00'),
      millon: numParse('1.234.567,89'),
      plano: numParse('100000'),
    }));
    check('"100.000,00" → 100000', r.mil === 100000);
    check('"1.234.567,89" → 1234567.89', near(r.millon, 1234567.89, 0.001));
    check('"100000" → 100000', r.plano === 100000);
  }

  // ---- 4) Hitos / milestones ----
  console.log('\n▶ Hitos (Panel de Obra)');
  {
    const { result: r } = await withApp(['utils.js', 'db.js', 'modules/panel_obra.js'], () => {
      DB.insert('projects', { id: 'P1', name: 'Obra Test' });
      DB.insert('milestones', { project_id: 'P1', name: 'A', planned_date: '2025-01-01', completed_date: '2025-01-05' });
      DB.insert('milestones', { project_id: 'P1', name: 'B', planned_date: '2025-06-01', forecast_date: '2025-06-20' });
      DB.insert('milestones', { project_id: 'P1', name: 'C', planned_date: '2030-01-01', forecast_date: '2030-01-01' });
      var ms = _milestones('P1'), by = {}; ms.forEach(function (m) { by[m.name] = m; });
      return {
        order: ms.map(function (m) { return m.name; }),
        delayB: _msDelayDays(by['B']),
        riskA: _msAtRisk(by['A']), riskB: _msAtRisk(by['B']), riskC: _msAtRisk(by['C']),
        sched: _milestonesScheduleDelay('P1'),
      };
    });
    check('orden por fecha A,B,C', JSON.stringify(r.order) === JSON.stringify(['A', 'B', 'C']));
    check('atraso de B = 19 días', r.delayB === 19);
    check('A completado → no en riesgo', r.riskA === false);
    check('B pendiente atrasado → en riesgo', r.riskB === true);
    check('C futuro → no en riesgo', r.riskC === false);
    check('atraso general = 19', r.sched === 19);
  }

  // ---- 5) Concurrencia: _rev y conflicto en update ----
  console.log('\n▶ Concurrencia (versión _rev)');
  {
    const { result: r } = await withApp(['utils.js', 'db.js'], () => {
      var it = DB.insert('contracts', { number: 'C-1' });
      var base = it._rev;                                   // 1
      DB.update('contracts', it.id, { number: 'C-1b' });    // otro usuario: _rev → 2
      var res = DB.update('contracts', it.id, { number: 'C-1c' }, { expectRev: base }); // conflicto
      var forced = DB.update('contracts', it.id, { number: 'C-1d' }); // reintento sin expectRev → pasa
      return { base: base, conflict: !!(res && res.__conflict), forcedNum: forced.number };
    });
    check('_rev base = 1', r.base === 1);
    check('update con expectRev viejo → conflicto', r.conflict === true);
    check('reintento sin expectRev → fuerza (C-1d)', r.forcedNum === 'C-1d');
  }

  // ---- 6) Balance: rollup padre←hijo UNA sola vez (regresión bug 5×) ----
  console.log('\n▶ Balance — rollup sin doble-conteo');
  {
    const { result: r } = await withApp(['utils.js', 'db.js', 'modules/contabilidad.js'], () => {
      var accounts = [
        { id: 'a1',  code: '1',   type: 'asset' },
        { id: 'a11', code: '1.1', type: 'asset', parent_id: 'a1' },
      ];
      var entries = [{ status: 'posted', lines: [{ account_code: '1.1', debit: 100, credit: 0 }] }];
      var b = calcAccountBalances(accounts, entries);
      return { child: b['1.1'], parent: b['1'] };
    });
    check('hijo 1.1 = 100', r.child === 100);
    check('padre 1 = 100 (una vez, no 500)', r.parent === 100);
  }

  // ---- 7) Numeración fiscal por país (ARCA/DGI/libre) ----
  console.log('\n▶ Numeración fiscal por país');
  {
    const { result: r } = await withApp(['utils.js', 'db.js', 'fiscal.js'], () => ({
      ar_next: fiscalNextIssued('AR', 5, 1),
      uy_next: fiscalNextIssued('UY', 5, 'A'),
      us_next: fiscalNextIssued('US', 5),
      ar_norm_ok: fiscalNormalizeNumber('1-5', 'AR'),
      ar_norm_bad: fiscalNormalizeNumber('abc', 'AR').ok,
      uy_norm: fiscalNormalizeNumber('A5', 'UY').value,
      legal_A: fiscalIsLegalType('A'), legal_X: fiscalIsLegalType('X'),
    }));
    check('AR: 00001-00000005', r.ar_next === '00001-00000005');
    check('UY: A-0000005', r.uy_next === 'A-0000005');
    check('US: INV-0005', r.us_next === 'INV-0005');
    check('AR normaliza 1-5 → 00001-00000005', r.ar_norm_ok.ok && r.ar_norm_ok.value === '00001-00000005');
    check('AR rechaza formato inválido', r.ar_norm_bad === false);
    check('UY normaliza A5 → A-0000005', r.uy_norm === 'A-0000005');
    check('tipo A es legal, X no', r.legal_A === true && r.legal_X === false);
  }

  // ---- 8) Fondo de reparo por ítem (certificación) ----
  console.log('\n▶ Fondo de reparo por ítem');
  {
    const { result: r } = await withApp(['utils.js', 'db.js', 'modules/contratos.js'], () => ({
      ret: _ccertRetention([
        { amount_period: 1000, retention_pct: 5 },   // 50
        { amount_period: 2000, retention_pct: 0 },   // 0 (sin retención)
        { amount_period: 500,  retention_pct: 10 },  // 50
      ]),
    }));
    check('retención por ítem = 100 (50+0+50)', near(r.ret, 100));
  }

  // ---- 9) Base de retención por régimen ----
  console.log('\n▶ Base de retención por régimen (F10)');
  {
    const { result: r } = await withApp(['utils.js', 'db.js', 'modules/retenciones.js'], () => ({
      gan: _retDefaultBase('Ret. Ganancias'),
      iva: _retDefaultBase('Ret. IVA'),
      iibb: _retDefaultBase('Ret. IIBB'),
      override: retRuleBase({ type: 'Ganancias', base: 'bruto' }),
    }));
    check('Ganancias → neto', r.gan === 'neto');
    check('IVA → iva', r.iva === 'iva');
    check('IIBB → bruto', r.iibb === 'bruto');
    check('base explícita del rule pisa el default', r.override === 'bruto');
  }

  // ---- 10) Consolidación multi-empresa (getAllConsolidated taguea origen) ----
  console.log('\n▶ Consolidación multi-empresa');
  {
    const { result: r } = await withApp(['utils.js', 'db.js'], () => {
      var g = DB.getGlobal();
      g.companies = [{ id: 'comp-001', name: 'AR SA', currency: 'ARS' }, { id: 'comp-002', name: 'UY SA', currency: 'UYU' }];
      DB.saveGlobal(g);
      localStorage.setItem('erp_company_comp-001_v1', JSON.stringify({ invoices: [{ id: 'i1', total: 100 }] }));
      localStorage.setItem('erp_company_comp-002_v1', JSON.stringify({ invoices: [{ id: 'i2', total: 200 }] }));
      DB._invalidateCache(); DB.setCompany('comp-001');
      var all = DB.getAllConsolidated('invoices'), by = {}; all.forEach(function (x) { by[x.id] = x; });
      return {
        count: all.length,
        i1c: by.i1 && by.i1._company_name, i1cur: by.i1 && by.i1._company_currency,
        i2c: by.i2 && by.i2._company_name, i2cur: by.i2 && by.i2._company_currency,
      };
    });
    check('junta las 2 empresas', r.count === 2);
    check('factura de AR tagueada AR SA / ARS', r.i1c === 'AR SA' && r.i1cur === 'ARS');
    check('factura de UY tagueada UY SA / UYU', r.i2c === 'UY SA' && r.i2cur === 'UYU');
  }

  // ---- 11) Contabilidad: consolidado por moneda (conversión al TC) ----
  console.log('\n▶ Contabilidad — consolidado en USD');
  {
    const { result: r } = await withApp(['utils.js', 'db.js', 'modules/contabilidad.js'], () => {
      var g = DB.getGlobal();
      g.companies = [{ id: 'comp-001', name: 'AR SA', currency: 'ARS' }];
      DB.saveGlobal(g);
      localStorage.setItem('erp_company_comp-001_v1', JSON.stringify({
        journalEntries: [{ id: 'j1', status: 'posted', date: '2025-07-01', lines: [{ account_code: 'x', debit: 1100, credit: 0 }] }]
      }));
      DB._invalidateCache(); DB.setCompany('comp-001');
      window._contaProject = ''; window._contaCompanyId = ''; window._contaBook = ''; window._contaConsol = 'USD';
      var e = _contaScopedEntries().find(function (x) { return x.id === 'j1'; });
      return { cur: e && e.currency, debit: e && e.lines[0].debit };
    });
    check('asiento convertido a USD', r.cur === 'USD');
    check('1100 ARS → 1 USD', near(r.debit, 1));
  }

  // ---- 12) Tesorería: consolidado por moneda (_tesConv) ----
  console.log('\n▶ Tesorería — consolidado por moneda');
  {
    const { result: r } = await withApp(['utils.js', 'db.js', 'modules/tesoreria.js'], () => {
      window._tesConsol = 'USD';
      var conv = _tesConv(1100, 'ARS');
      window._tesConsol = '';
      var noconv = _tesConv(1100, 'ARS');
      return { conv: conv, noconv: noconv };
    });
    check('1100 ARS → 1 USD (consolidado)', near(r.conv, 1));
    check('sin consolidar no convierte', r.noconv === 1100);
  }

  // ---- 13) Helper de consolidación (rsScoped filtra por razón social) ----
  console.log('\n▶ Helper consolidación (rsScoped)');
  {
    const { result: r } = await withApp(['utils.js', 'db.js', 'consolid.js'], () => {
      var g = DB.getGlobal(); g.companies = [{ id: 'comp-001', name: 'AR SA', currency: 'ARS' }, { id: 'comp-002', name: 'UY SA', currency: 'UYU' }]; DB.saveGlobal(g);
      localStorage.setItem('erp_company_comp-001_v1', JSON.stringify({ paymentOrders: [{ id: 'o1', total: 10 }] }));
      localStorage.setItem('erp_company_comp-002_v1', JSON.stringify({ paymentOrders: [{ id: 'o2', total: 20 }] }));
      DB._invalidateCache(); DB.setCompany('comp-001');
      window.APP_STATE = { activeProject: '' };
      window._rsCompany = {};
      var all = rsScoped('paymentOrders', 'x');
      window._rsCompany = { x: 'comp-002' };
      var only2 = rsScoped('paymentOrders', 'x');
      return { all: all.length, only2: only2.map(function (o) { return o.id; }), cur2: only2[0] && rsCur(only2[0]) };
    });
    check('rsScoped "todas" = 2', r.all === 2);
    check('rsScoped filtra por razón social (o2)', JSON.stringify(r.only2) === JSON.stringify(['o2']));
    check('rsCur usa la moneda de la empresa (UYU)', r.cur2 === 'UYU');
  }

  // ---- 14) Asientos A/B automáticos (wrapper autoJournalEntryABImp) ----
  console.log('\n▶ Asientos A/B automáticos');
  {
    const { result: r } = await withApp(['utils.js', 'db.js', 'modules/asientos.js'], () => {
      // Stub del generador real: captura cada llamada (libro + montos) sin tocar el plan de cuentas.
      var calls = [];
      window.autoJournalEntryFromImputacion = function (op, imp, neto, total, taxes, date, ref, opts) {
        calls.push({ book: opts.book, neto: neto, total: total, iva: (taxes || {}).iva || 0, imp: (imp || []).map(function (l) { return l.amount; }) });
        return { id: 'e' + calls.length };
      };
      var imp = [{ account_code: '5', amount: 100 }];
      // Caso A (default)
      autoJournalEntryABImp('fact_emitida', imp, 100, 121, { iva: 21 }, '2025-01-01', 'F1', { contab_tipo: 'A' });
      var a = calls.slice(); calls.length = 0;
      // Caso B
      autoJournalEntryABImp('fact_emitida', imp, 100, 121, { iva: 21 }, '2025-01-01', 'F2', { contab_tipo: 'B' });
      var b = calls.slice(); calls.length = 0;
      // Caso AB 60/40
      autoJournalEntryABImp('fact_emitida', imp, 100, 121, { iva: 21 }, '2025-01-01', 'F3', { contab_tipo: 'AB', contab_pct_a: 60 });
      var ab = calls.slice();
      return { a: a, b: b, ab: ab };
    });
    check('A → 1 asiento en libro A', r.a.length === 1 && r.a[0].book === 'A' && near(r.a[0].total, 121));
    check('B → 1 asiento en libro B', r.b.length === 1 && r.b[0].book === 'B' && near(r.b[0].total, 121));
    check('AB 60/40 → 2 asientos (A y B)', r.ab.length === 2 && r.ab[0].book === 'A' && r.ab[1].book === 'B');
    check('AB: libro A = 60% del total', near(r.ab[0].total, 72.6) && near(r.ab[0].iva, 12.6) && near(r.ab[0].imp[0], 60));
    check('AB: libro B = 40% del total', near(r.ab[1].total, 48.4) && near(r.ab[1].iva, 8.4) && near(r.ab[1].imp[0], 40));
  }

  // ---- 15) Import Excel de ítems (ODP): matching + parseo ----
  console.log('\n▶ Import Excel de ítems (ODP)');
  {
    const { result: r } = await withApp(['utils.js', 'db.js', 'modules/ordenes_pedido.js'], () => {
      DB.insert('rubros', { id: 'r1', code: 'EST', name: 'Estructura', active: true });
      DB.insert('rubros', { id: 'r2', code: 'MAM', name: 'Mampostería', active: true });
      window._odpImport = { headers: ['Rubro','Tipo','Item','Unidad','Cant','Fecha'], rows: [],
        map: { rubro: 0, tipo: 1, item_desc: 2, unit: 3, quantity: 4, delivery_date: 5 } };
      var it = _odpImportRowToItem(['Estructura', 'Material', 'Hierro del 8', 'un', '450', '12/06/2026']);
      return {
        dSlash: _odpParseImpDate('12/06/2026'),
        dISO: _odpParseImpDate('2026-06-12'),
        dEmpty: _odpParseImpDate(''),
        rubroByName: _odpMatchRubro('Estructura'),
        rubroByCode: _odpMatchRubro('EST'),
        rubroMiss: _odpMatchRubro('Inexistente'),
        tipoExact: _odpMatchTipo('Material'),
        tipoCI: _odpMatchTipo('servicio'),
        it: it,
      };
    });
    check('fecha dd/mm/yyyy → yyyy-mm-dd', r.dSlash === '2026-06-12');
    check('fecha yyyy-mm-dd se respeta', r.dISO === '2026-06-12');
    check('fecha vacía → ""', r.dEmpty === '');
    check('rubro por nombre → r1', r.rubroByName === 'r1');
    check('rubro por código → r1', r.rubroByCode === 'r1');
    check('rubro inexistente → ""', r.rubroMiss === '');
    check('tipo exacto', r.tipoExact === 'Material');
    check('tipo case-insensitive', r.tipoCI === 'Servicio');
    check('fila → ítem (rubro/tipo/desc/unid/cant/fecha)',
      r.it.rubro_id === 'r1' && r.it.tipo === 'Material' && r.it.item_desc === 'Hierro del 8' &&
      r.it.unit === 'un' && r.it.quantity === 450 && r.it.delivery_date === '2026-06-12');
  }

  // ---- 16) Migración multi-empresa (Fase A maestros) ----
  console.log('\n▶ Migración — carga multi-empresa (maestros)');
  {
    const { result: r } = await withApp(['utils.js', 'db.js'], async () => {
      var payload = {
        companies: [
          { id: 'lb-a', name: 'Empresa A', currency: 'ARS', _lebane: true },
          { id: 'lb-b', name: 'Empresa B', currency: 'USD', _lebane: true },
        ],
        data: {
          'lb-a': {
            projects: [{ id: 'p1', name: 'Obra 1' }, { id: 'p2', name: 'Obra 2' }],
            suppliers: [{ id: 's1', name: 'Prov 1' }],
            rubros: [{ id: 'r1', code: '100', name: 'Rubro 1', active: true }],
            evil: [{ id: 'x' }], // colección no permitida → debe ignorarse
          },
          'lb-b': {
            projects: [{ id: 'p9', name: 'Obra 9' }],
            suppliers: [{ id: 's8', name: 'Prov 8' }, { id: 's7', name: 'Prov 7' }],
            rubros: [],
          },
        },
      };
      var prev = DB._companyId;
      var res = await DB.migrateLoadMulti(payload, { localOnly: true });
      // Leer de vuelta el estado local por empresa
      var a = JSON.parse(localStorage.getItem('erp_company_lb-a_v1') || '{}');
      var b = JSON.parse(localStorage.getItem('erp_company_lb-b_v1') || '{}');
      var companies = DB.getAllCompanies();
      return {
        restored: DB._companyId === prev,
        summaryCompanies: res.companies,
        summaryRecords: res.totalRecords,
        errors: res.errors.length,
        inGlobalA: companies.some(function (c) { return c.id === 'lb-a' && c.name === 'Empresa A'; }),
        inGlobalB: companies.some(function (c) { return c.id === 'lb-b' && c.currency === 'USD'; }),
        aProjects: (a.projects || []).length,
        aSuppliers: (a.suppliers || []).length,
        aRubros: (a.rubros || []).length,
        aHasAccounts: Array.isArray(a.accounts) && a.accounts.length > 0,
        aNoEvil: a.evil === undefined,
        bProjects: (b.projects || []).length,
        bSuppliers: (b.suppliers || []).length,
      };
    });
    check('_companyId se restaura tras la carga', r.restored === true);
    check('resumen: 2 empresas', r.summaryCompanies === 2);
    check('resumen: 7 registros de maestros', r.summaryRecords === 7);
    check('sin errores', r.errors === 0);
    check('empresa A registrada en global', r.inGlobalA === true);
    check('empresa B registrada en global (USD)', r.inGlobalB === true);
    check('A: 2 proyectos', r.aProjects === 2);
    check('A: 1 proveedor', r.aSuppliers === 1);
    check('A: 1 rubro', r.aRubros === 1);
    check('A: conserva plan de cuentas de seedEmpty', r.aHasAccounts === true);
    check('A: colección no permitida ignorada', r.aNoEvil === true);
    check('B: 1 proyecto', r.bProjects === 1);
    check('B: 2 proveedores', r.bSuppliers === 2);
  }

  // ---- 17) Importador REST de documentos (lotes + errores) ----
  console.log('\n▶ Migración — importador REST de documentos');
  {
    const { result: r } = await withApp(['utils.js', 'db.js'], async () => {
      _SUPA.online = true;
      _SUPA.session = { access_token: 'x' };
      _SUPA.URL = 'http://x';
      var calls = [];
      window.fetch = function(url, opts) {
        var body = JSON.parse(opts.body);
        calls.push(body.length);
        // Falla el 2º lote para probar el manejo de errores
        if (calls.length === 2) return Promise.resolve({ ok: false, status: 401, text: function() { return Promise.resolve('denied'); } });
        return Promise.resolve({ ok: true, status: 201, text: function() { return Promise.resolve(''); } });
      };
      var rows = [];
      for (var i = 0; i < 1200; i++) rows.push({ company_id: 'lb-a', collection: 'supplierInvoices', record_id: 'd' + i, data: { id: 'd' + i } });
      var prog = [];
      var res = await DB.migrateImportDocuments({ rows: rows }, function(done, total) { prog.push(done); });
      return { batches: calls, inserted: res.inserted, total: res.total, errors: res.errors.length, lastProg: prog[prog.length - 1] };
    });
    check('lotea de a 500 (500,500,200)', r.batches.length === 3 && r.batches[0] === 500 && r.batches[2] === 200);
    check('inserta los lotes OK (500+200=700)', r.inserted === 700);
    check('total reportado = 1200', r.total === 1200);
    check('registra 1 lote con error', r.errors === 1);
    check('progreso llega al total', r.lastProg === 1200);
  }

  summary();
})();
