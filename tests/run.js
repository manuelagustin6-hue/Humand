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

  summary();
})();
