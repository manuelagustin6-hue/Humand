/* ===== SEGUIMIENTO DE PRESUPUESTO ===== */
function renderSeguimiento() {
  const projects = DB.getAll('projects');
  const activeProjectId = window.APP_STATE.activeProject;

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Control Presupuestal</div>
    <div class="page-subtitle">Seguimiento de costos, desvíos y control por partida de obra</div>
  </div>
  <div class="page-actions">
    <select class="form-control" id="seg-project-sel" onchange="loadSeguimiento(this.value)" style="min-width:220px">
      <option value="">Seleccionar proyecto...</option>
      ${projects.map(p => `<option value="${p.id}" ${p.id===activeProjectId?'selected':''}>${p.name}</option>`).join('')}
    </select>
    <button class="btn btn-primary" onclick="openActualCostForm()"><i class="fas fa-plus"></i> Registrar Costo</button>
  </div>
</div>
<div id="seg-tabs">
  <div class="tabs">
    <button class="tab-btn" data-tab="tab-seg-resumen">Resumen</button>
    <button class="tab-btn" data-tab="tab-seg-partidas">Control por Partida</button>
  </div>
  <div id="tab-seg-resumen" class="tab-content">
    <div id="seg-container">
      ${activeProjectId ? renderSeguimientoContent(activeProjectId) : `<div class="empty-state"><i class="fas fa-chart-line"></i><p>Seleccioná un proyecto para ver el seguimiento</p></div>`}
    </div>
  </div>
  <div id="tab-seg-partidas" class="tab-content">
    <div id="seg-partidas-container">
      ${activeProjectId ? renderControlPresupuestal(activeProjectId) : `<div class="empty-state"><i class="fas fa-table"></i><p>Seleccioná un proyecto para ver el control presupuestal por partida</p></div>`}
    </div>
  </div>
</div>
  `;
  if (activeProjectId) document.getElementById('seg-project-sel').value = activeProjectId;
  initTabs('seg-tabs');
}

function loadSeguimiento(projectId) {
  window.APP_STATE.activeProject = projectId;

  const segContainer = document.getElementById('seg-container');
  if (segContainer) {
    segContainer.innerHTML = projectId
      ? renderSeguimientoContent(projectId)
      : `<div class="empty-state"><i class="fas fa-chart-line"></i><p>Seleccioná un proyecto</p></div>`;
  }

  const partidasContainer = document.getElementById('seg-partidas-container');
  if (partidasContainer) {
    partidasContainer.innerHTML = projectId
      ? renderControlPresupuestal(projectId)
      : `<div class="empty-state"><i class="fas fa-table"></i><p>Seleccioná un proyecto</p></div>`;
  }
}

function renderSeguimientoContent(projectId) {
  const project = DB.getById('projects', projectId);
  const boqItems = DB.getAll('boqItems').filter(b => b.project_id === projectId);
  const actualCosts = DB.getAll('actualCosts').filter(a => a.project_id === projectId);
  const pos = DB.getAll('purchaseOrders').filter(p => p.project_id === projectId && p.status !== 'cancelled');

  const boqTotal = boqItems.reduce((s, b) => s + b.total, 0);
  const actualTotal = actualCosts.reduce((s, a) => s + a.amount, 0);
  const poTotal = pos.reduce((s, p) => s + p.total, 0);
  const committed = actualTotal + poTotal;
  const deviation = actualTotal - boqTotal;
  const deviationPct = boqTotal ? (deviation / boqTotal * 100) : 0;

  const categories = [...new Set([...boqItems.map(b => b.category), ...actualCosts.map(a => a.category)])];
  const catData = categories.map(cat => {
    const budget = boqItems.filter(b => b.category === cat).reduce((s, b) => s + b.total, 0);
    const actual = actualCosts.filter(a => a.category === cat).reduce((s, a) => s + a.amount, 0);
    const diff = actual - budget;
    const pct = budget ? (actual / budget * 100) : 0;
    return { cat, budget, actual, diff, pct };
  });

  const monthlyData = buildMonthlySpend(actualCosts);

  const result = `
<!-- KPI ROW -->
<div class="stats-grid" style="grid-template-columns:repeat(5,1fr)">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-calculator"></i></div><div>
    <div class="stat-value">${fmtMoney(boqTotal)}</div><div class="stat-label">Presupuesto BOQ</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-receipt"></i></div><div>
    <div class="stat-value">${fmtMoney(actualTotal)}</div><div class="stat-label">Costo Real</div></div></div>
  <div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-file-alt"></i></div><div>
    <div class="stat-value">${fmtMoney(poTotal)}</div><div class="stat-label">OC Comprometidas</div></div></div>
  <div class="stat-card"><div class="stat-icon ${deviation > 0 ? 'red' : 'green'}"><i class="fas fa-balance-scale"></i></div><div>
    <div class="stat-value ${deviation > 0 ? 'text-danger' : 'text-success'}">${fmtMoney(Math.abs(deviation))}</div>
    <div class="stat-label">${deviation > 0 ? 'Desvío (+)' : 'Ahorro (-)'}</div>
    <div class="stat-delta ${deviation > 0 ? 'down' : 'up'}">${fmtPct(Math.abs(deviationPct))}</div>
  </div></div>
  <div class="stat-card"><div class="stat-icon ${committed > boqTotal ? 'red' : 'green'}"><i class="fas fa-lock"></i></div><div>
    <div class="stat-value">${fmtMoney(committed)}</div><div class="stat-label">Total Comprometido</div>
    <div class="stat-delta ${committed > boqTotal ? 'down' : 'up'}">${fmtPct(boqTotal ? committed/boqTotal*100 : 0)} del BOQ</div>
  </div></div>
</div>

<!-- CHARTS -->
<div class="grid-2 mt-2">
  <div class="card">
    <div class="card-header"><span class="card-title"><i class="fas fa-chart-bar text-primary"></i> Presupuesto vs Real por Categoría</span></div>
    <div class="card-body"><div class="chart-wrap"><canvas id="seg-cat-chart"></canvas></div></div>
  </div>
  <div class="card">
    <div class="card-header"><span class="card-title"><i class="fas fa-chart-line text-primary"></i> Curva de Gasto Mensual</span></div>
    <div class="card-body"><div class="chart-wrap"><canvas id="seg-monthly-chart"></canvas></div></div>
  </div>
</div>

<!-- CATEGORY TABLE -->
<div class="card mt-2">
  <div class="card-header"><span class="card-title"><i class="fas fa-table text-primary"></i> Análisis por Categoría</span></div>
  <div class="card-body" style="padding:0">
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Categoría</th><th class="text-right">Presupuesto</th><th class="text-right">Real</th>
          <th class="text-right">Desvío</th><th class="text-right">% Ejecución</th><th>Estado</th><th>Avance</th>
        </tr></thead>
        <tbody>
          ${catData.map(c => `<tr>
            <td><strong>${c.cat}</strong></td>
            <td class="number-cell text-right">${fmtMoney(c.budget)}</td>
            <td class="number-cell text-right">${fmtMoney(c.actual)}</td>
            <td class="number-cell text-right ${c.diff > 0 ? 'text-danger' : c.diff < 0 ? 'text-success' : ''}">
              ${c.diff > 0 ? '+' : ''}${fmtMoney(c.diff)}
            </td>
            <td class="text-right">${fmtPct(c.pct)}</td>
            <td>${c.pct > 100 ? `<span class="badge badge-red">Excedido</span>` : c.pct > 80 ? `<span class="badge badge-yellow">Alerta</span>` : `<span class="badge badge-green">OK</span>`}</td>
            <td style="min-width:140px">
              <div class="progress-bar"><div class="progress-fill ${c.pct > 100 ? 'red' : c.pct > 80 ? 'yellow' : ''}" style="width:${Math.min(c.pct,100)}%"></div></div>
            </td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr class="total-row">
          <td><strong>TOTAL</strong></td>
          <td class="number-cell text-right"><strong>${fmtMoney(boqTotal)}</strong></td>
          <td class="number-cell text-right"><strong>${fmtMoney(actualTotal)}</strong></td>
          <td class="number-cell text-right ${deviation > 0 ? 'text-danger' : 'text-success'}"><strong>${deviation > 0 ? '+' : ''}${fmtMoney(deviation)}</strong></td>
          <td class="text-right"><strong>${fmtPct(boqTotal ? actualTotal/boqTotal*100 : 0)}</strong></td>
          <td colspan="2"></td>
        </tr></tfoot>
      </table>
    </div>
  </div>
</div>

<!-- ACTUAL COSTS TABLE -->
<div class="card mt-2">
  <div class="card-header">
    <span class="card-title"><i class="fas fa-receipt text-primary"></i> Costos Reales Registrados</span>
    <button class="btn btn-sm btn-primary" onclick="openActualCostForm('${projectId}')"><i class="fas fa-plus"></i> Agregar</button>
  </div>
  <div class="card-body" style="padding:0">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Referencia</th><th class="text-right">Importe</th><th>Acciones</th></tr></thead>
        <tbody>
          ${actualCosts.length ? actualCosts.map(a => `<tr>
            <td>${fmtDate(a.date)}</td>
            <td><span class="badge badge-blue">${a.category}</span></td>
            <td>${a.description}</td>
            <td><span style="font-size:11px;color:var(--text-muted)">${a.reference || '-'}</span></td>
            <td class="number-cell text-right"><strong>${fmtMoney(a.amount)}</strong></td>
            <td><div class="table-actions">
              <button class="btn-ghost btn btn-sm danger" onclick="deleteActualCost('${a.id}', '${projectId}')"><i class="fas fa-trash"></i></button>
            </div></td>
          </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">Sin costos registrados</td></tr>`}
        </tbody>
        ${actualCosts.length ? `<tfoot><tr class="total-row">
          <td colspan="4"><strong>Total</strong></td>
          <td class="number-cell text-right"><strong>${fmtMoney(actualTotal)}</strong></td>
          <td></td>
        </tr></tfoot>` : ''}
      </table>
    </div>
  </div>
</div>
  `;

  setTimeout(() => {
    renderCatChart(catData);
    renderMonthlyChart(monthlyData);
  }, 100);

  return result;
}

/* ===== CONTROL PRESUPUESTAL POR PARTIDA ===== */
function renderControlPresupuestal(projectId) {
  const rubros = DB.getAll('rubros').filter(r => r.active !== false).sort((a,b) => (a.code||'').localeCompare(b.code||''));
  const indices = DB.getAll('priceIndices');
  const partidas = DB.getAll('presupuestoPartidas').filter(p => p.project_id === projectId);
  const contracts = DB.getAll('contracts').filter(c => c.project_id === projectId && c.status !== 'cancelled');

  const partidaMap = {};
  partidas.forEach(p => { partidaMap[p.rubro_id] = p; });

  const contratoMap = {};
  contracts.forEach(c => {
    (c.items || []).forEach(item => {
      if (item.rubro_id) contratoMap[item.rubro_id] = (contratoMap[item.rubro_id] || 0) + (item.total || 0);
    });
  });

  let totBudget = 0, totAjustado = 0, totContratado = 0, totEjecutado = 0, totPrevision = 0, totCosto = 0, totSaldo = 0;

  function arsNum(v, colorType) {
    const n = Math.abs(v);
    const sign = v < 0 ? '−' : '';
    const str = n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const clr = { blue: '#2563eb', green: '#059669', red: '#dc2626', muted: '#94a3b8' }[colorType] || '#1e293b';
    return '<span style="font-size:10px;color:#94a3b8;font-weight:400">ARS </span><strong style="color:' + clr + ';font-size:13px">' + sign + str + '</strong>';
  }

  function editIcon(pid, rid, field, val) {
    return 'onclick="editPartidaValue(\'' + pid + '\',\'' + rid + '\',\'' + field + '\',' + val + ')" style="cursor:pointer"';
  }

  // Compute per-rubro values
  const rubroData = rubros.map(function(r) {
    const p = partidaMap[r.id] || {};
    const budgetAmt = p.budget_amount || 0;
    const indexId = p.index_id || '';
    const idx = indices.find(function(i) { return i.id === indexId; });
    const factor = (idx && idx.base_value) ? (idx.current_value / idx.base_value) : 1;
    const presupuestoAjustado = budgetAmt * factor;
    const contratado = contratoMap[r.id] || 0;
    const ejecutado = p.executed_external || 0;
    const previsionBruta = p.prevision || 0;
    const previsionEfectiva = Math.max(0, previsionBruta - contratado);
    const costoTotal = contratado + ejecutado + previsionEfectiva;
    const saldo = presupuestoAjustado - costoTotal;
    const hasData = budgetAmt || contratado || ejecutado || previsionBruta;

    totBudget += budgetAmt;
    totAjustado += presupuestoAjustado;
    totContratado += contratado;
    totEjecutado += ejecutado;
    totPrevision += previsionEfectiva;
    totCosto += costoTotal;
    totSaldo += saldo;

    return { r, p, budgetAmt, indexId, idx, factor, presupuestoAjustado, contratado, ejecutado, previsionBruta, previsionEfectiva, costoTotal, saldo, hasData };
  });

  // Group rubros by category
  const groups = [];
  const seenCats = {};
  rubroData.forEach(function(rd) {
    const cat = rd.r.category || 'Sin Categoría';
    if (!seenCats[cat]) {
      seenCats[cat] = { cat: cat, items: [], tB: 0, tA: 0, tC: 0, tE: 0, tP: 0, tCost: 0, tS: 0 };
      groups.push(seenCats[cat]);
    }
    const g = seenCats[cat];
    g.items.push(rd);
    g.tB    += rd.budgetAmt;
    g.tA    += rd.presupuestoAjustado;
    g.tC    += rd.contratado;
    g.tE    += rd.ejecutado;
    g.tP    += rd.previsionEfectiva;
    g.tCost += rd.costoTotal;
    g.tS    += rd.saldo;
  });

  const P = 'padding:9px 12px';
  const emptyEdit = '<span style="color:#cbd5e1;font-size:12px"><i class="fas fa-plus-circle"></i></span>';
  let rows = '';

  groups.forEach(function(g, gi) {
    const gId = 'cpg' + gi;

    // Category header row
    rows += '<tr class="cp-cat-row" data-gid="' + gId + '" onclick="toggleCatRows(\'' + gId + '\')" style="cursor:pointer;background:#edf2fc;border-bottom:2px solid #d1ddf7">' +
      '<td style="' + P + ';width:38px;text-align:center">' +
        '<i id="chev-' + gId + '" class="fas fa-chevron-right" style="color:#2563eb;font-size:10px;transition:transform .2s;pointer-events:none"></i>' +
      '</td>' +
      '<td style="' + P + '"><strong style="font-family:monospace;font-size:13px;color:#2563eb">' + (gi + 1) + '</strong></td>' +
      '<td style="' + P + ';font-size:13px;font-weight:700;color:#1e293b">' + g.cat + '</td>' +
      '<td style="' + P + ';text-align:right;white-space:nowrap">' + (g.tB ? arsNum(g.tB, 'blue') : '<span style="color:#cbd5e1">—</span>') + '</td>' +
      '<td style="' + P + ';text-align:center;color:#94a3b8;font-size:11px">—</td>' +
      '<td style="' + P + ';text-align:right;white-space:nowrap">' + (g.tA ? arsNum(g.tA) : '<span style="color:#cbd5e1">—</span>') + '</td>' +
      '<td style="' + P + ';text-align:right;white-space:nowrap">' + (g.tC > 0 ? arsNum(g.tC, 'blue') : '<span style="color:#cbd5e1">—</span>') + '</td>' +
      '<td style="' + P + ';text-align:right;white-space:nowrap">' + (g.tE > 0 ? arsNum(g.tE, 'blue') : '<span style="color:#cbd5e1">—</span>') + '</td>' +
      '<td style="' + P + ';text-align:right;white-space:nowrap">' + (g.tP > 0 ? arsNum(g.tP, 'blue') : '<span style="color:#cbd5e1">—</span>') + '</td>' +
      '<td style="' + P + ';text-align:right;white-space:nowrap">' + (g.tCost > 0 ? arsNum(g.tCost, g.tCost > g.tA && g.tA > 0 ? 'red' : '') : '<span style="color:#cbd5e1">—</span>') + '</td>' +
      '<td style="' + P + ';text-align:right;white-space:nowrap">' + arsNum(g.tS, g.tS > 0 ? 'green' : g.tS < 0 ? 'red' : 'muted') + '</td>' +
    '</tr>';

    // Child rows (hidden by default)
    g.items.forEach(function(rd) {
      const r = rd.r;
      const idxSel = '<select style="font-size:11px;padding:2px 6px;height:26px;border:1px solid #e2e8f0;border-radius:5px;background:#fff;min-width:76px;color:' + (rd.indexId ? '#1e293b' : '#94a3b8') + '" onchange="updatePartidaIndex(\'' + projectId + '\',\'' + r.id + '\',this.value)">' +
        '<option value="" style="color:#94a3b8">Sin valor</option>' +
        indices.map(function(i) { return '<option value="' + i.id + '"' + (rd.indexId === i.id ? ' selected' : '') + '>' + i.code + '</option>'; }).join('') +
        '</select>';

      const prevTip = rd.previsionBruta !== rd.previsionEfectiva
        ? 'Bruta: ' + fmtMoney(rd.previsionBruta) + ' − Contratado: ' + fmtMoney(rd.contratado) + ' = Efectiva: ' + fmtMoney(rd.previsionEfectiva)
        : 'Editar previsión';
      const prevCell = (rd.previsionEfectiva !== 0 || rd.previsionBruta !== 0)
        ? '<span ' + editIcon(projectId, r.id, 'prevision', rd.previsionBruta) + ' title="' + prevTip + '">' +
            arsNum(rd.previsionEfectiva, rd.previsionEfectiva > 0 ? 'blue' : 'muted') +
            (rd.previsionBruta !== rd.previsionEfectiva ? '<br><span style="font-size:10px;color:#94a3b8">(orig. ' + fmtMoney(rd.previsionBruta) + ')</span>' : '') +
          '</span>'
        : '<span ' + editIcon(projectId, r.id, 'prevision', 0) + ' title="Editar previsión">' + emptyEdit + '</span>';

      rows += '<tr class="cp-child cp-child-' + gId + '" data-has-data="' + (rd.hasData ? '1' : '0') + '" style="display:none;background:#fff;border-bottom:1px solid #f1f5f9">' +
        '<td style="padding:8px 12px;text-align:center;color:#d1ddf7;font-size:13px;font-weight:300">└</td>' +
        '<td style="padding:8px 12px"><strong style="font-family:monospace;font-size:11px;color:#64748b">' + r.code + '</strong></td>' +
        '<td style="padding:8px 12px 8px 24px;font-size:12px;color:#374151">' + r.name + '</td>' +
        '<td style="padding:8px 12px;text-align:right;white-space:nowrap">' +
          '<span ' + editIcon(projectId, r.id, 'budget_amount', rd.budgetAmt) + ' title="Editar monto">' +
            (rd.budgetAmt ? arsNum(rd.budgetAmt, 'blue') : emptyEdit) +
          '</span>' +
        '</td>' +
        '<td style="padding:8px 12px;text-align:center">' + idxSel + '</td>' +
        '<td style="padding:8px 12px;text-align:right;white-space:nowrap">' +
          (rd.budgetAmt
            ? (rd.idx && rd.factor !== 1 ? '<span title="Factor ' + rd.factor.toFixed(4) + '">' + arsNum(rd.presupuestoAjustado) + '</span>' : arsNum(rd.presupuestoAjustado))
            : '<span style="color:#e2e8f0">—</span>') +
        '</td>' +
        '<td style="padding:8px 12px;text-align:right;white-space:nowrap">' +
          (rd.contratado > 0
            ? '<span style="cursor:pointer" onclick="openContratadoDetail(\'' + projectId + '\',\'' + r.id + '\')" title="Ver detalle">' + arsNum(rd.contratado, 'blue') + '</span>'
            : '<span style="color:#cbd5e1">' + arsNum(0, 'muted') + '</span>') +
        '</td>' +
        '<td style="padding:8px 12px;text-align:right;white-space:nowrap">' +
          '<span ' + editIcon(projectId, r.id, 'executed_external', rd.ejecutado) + ' title="Editar ejecutado">' +
            (rd.ejecutado ? arsNum(rd.ejecutado, 'blue') : emptyEdit) +
          '</span>' +
        '</td>' +
        '<td style="padding:8px 12px;text-align:right;white-space:nowrap">' + prevCell + '</td>' +
        '<td style="padding:8px 12px;text-align:right;white-space:nowrap">' +
          (rd.costoTotal > 0
            ? arsNum(rd.costoTotal, rd.costoTotal > rd.presupuestoAjustado && rd.presupuestoAjustado > 0 ? 'red' : '')
            : '<span style="color:#94a3b8">' + arsNum(0, 'muted') + '</span>') +
        '</td>' +
        '<td style="padding:8px 12px;text-align:right;white-space:nowrap">' + arsNum(rd.saldo, rd.saldo > 0 ? 'green' : rd.saldo < 0 ? 'red' : 'muted') + '</td>' +
      '</tr>';
    });
  });

  const hasContracts = contracts.some(c => (c.items || []).some(it => it.rubro_id));

  const summaryCards = [
    { label: 'Presupuesto ajustado', val: totAjustado,   color: '#2563eb' },
    { label: 'Contratado',           val: totContratado, color: '#7c3aed' },
    { label: 'Ejecutado ext.',        val: totEjecutado,  color: '#0891b2' },
    { label: 'Previsión efectiva',    val: totPrevision,  color: '#d97706' },
    { label: 'Saldo',                 val: totSaldo,      color: totSaldo >= 0 ? '#059669' : '#dc2626' },
  ].map(c =>
    '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.04)">' +
      '<div style="font-size:11px;color:#94a3b8;margin-bottom:5px;white-space:nowrap">' + c.label + '</div>' +
      '<div style="line-height:1.1">' +
        '<span style="font-size:10px;color:#94a3b8">ARS </span>' +
        '<span style="font-size:17px;font-weight:700;color:' + c.color + '">' +
          (c.val < 0 ? '−' : '') + Math.abs(c.val).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) +
        '</span>' +
      '</div>' +
    '</div>'
  ).join('');

  const thStyle = 'padding:10px 12px;text-align:right;color:#64748b;font-weight:600;font-size:11px;white-space:nowrap;border-bottom:2px solid #e2e8f0;background:#f1f5f9';
  const thLeft  = thStyle.replace('text-align:right', 'text-align:left');
  const thCtr   = thStyle.replace('text-align:right', 'text-align:center');
  const tfStyle = 'padding:11px 12px;text-align:right;white-space:nowrap;background:#f1f5f9;border-top:2px solid #e2e8f0';

  return `
<style>
#tabla-cp .cp-cat-row:hover { background:#dce7f7 !important; }
#tabla-cp .cp-child:hover   { background:#f0f5ff !important; }
#tabla-cp select:focus      { outline:none; border-color:#2563eb; }
</style>
<div style="padding:2px 0 16px">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;color:#64748b;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:5px 10px">
        <input type="checkbox" id="seg-show-empty" onchange="toggleEmptyPartidas(this.checked)">
        Mostrar partidas sin datos
      </label>
      <button class="btn btn-sm btn-ghost" onclick="expandAllCats()" style="font-size:12px"><i class="fas fa-expand-alt"></i> Expandir todo</button>
      <button class="btn btn-sm btn-ghost" onclick="collapseAllCats()" style="font-size:12px"><i class="fas fa-compress-alt"></i> Colapsar todo</button>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-sm btn-ghost" onclick="openPresupuestoLog('${projectId}')"><i class="fas fa-history"></i> Historial</button>
      <button class="btn btn-sm btn-secondary" onclick="exportControlPresupuestal('${projectId}')"><i class="fas fa-download"></i> Exportar</button>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px">
    ${summaryCards}
  </div>

  ${!hasContracts ? `<div style="padding:8px 12px;background:#fef9c3;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e;margin-bottom:12px">
    <i class="fas fa-info-circle"></i> Los ítems de contratos sin rubro asignado no alimentan la columna <strong>Contratado</strong>. Editá el contrato y asigná el rubro a cada tarea.
  </div>` : ''}

  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.04)">
    <div style="overflow-x:auto">
      <table id="tabla-cp" style="width:100%;border-collapse:collapse;min-width:980px">
        <thead>
          <tr>
            <th style="${thCtr};width:38px"></th>
            <th style="${thLeft};width:58px">Cód.</th>
            <th style="${thLeft};min-width:180px">Categoría / Partida</th>
            <th style="${thStyle}">Monto Ppto.</th>
            <th style="${thCtr}">Índice act.</th>
            <th style="${thStyle}">Ppto. Ajustado</th>
            <th style="${thStyle}">Contratado</th>
            <th style="${thStyle}">Ejec. ext.</th>
            <th style="${thStyle}">Previsión ef.</th>
            <th style="${thStyle}">Costo Total</th>
            <th style="${thStyle}">Saldo</th>
          </tr>
        </thead>
        <tbody id="partidas-tbody">${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="${tfStyle.replace('text-align:right','text-align:left')};font-weight:700;font-size:13px;color:#1e293b">Totales</td>
            <td style="${tfStyle}">${arsNum(totBudget)}</td>
            <td style="${tfStyle}"></td>
            <td style="${tfStyle}">${arsNum(totAjustado)}</td>
            <td style="${tfStyle}">${arsNum(totContratado, totContratado > 0 ? 'blue' : 'muted')}</td>
            <td style="${tfStyle}">${arsNum(totEjecutado, totEjecutado > 0 ? 'blue' : 'muted')}</td>
            <td style="${tfStyle}">${arsNum(totPrevision, totPrevision > 0 ? 'blue' : 'muted')}</td>
            <td style="${tfStyle}">${arsNum(totCosto, totCosto > totAjustado && totAjustado > 0 ? 'red' : '')}</td>
            <td style="${tfStyle}">${arsNum(totSaldo, totSaldo > 0 ? 'green' : totSaldo < 0 ? 'red' : 'muted')}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div style="padding:7px 14px;background:#f8fafc;border-top:1px solid #f1f5f9;font-size:10px;color:#94a3b8">
      <i class="fas fa-chevron-right" style="color:#2563eb;font-size:9px"></i> Clic en categoría para expandir/colapsar partidas.
      <i class="fas fa-pencil-alt" style="color:#2563eb;margin-left:6px"></i> Clic en <i class="fas fa-plus-circle"></i> o en un valor para editar.
      <strong>Contratado</strong> se suma automáticamente desde los contratos.
    </div>
  </div>
</div>
  `;
}

function toggleCatRows(gId) {
  var chev = document.getElementById('chev-' + gId);
  var catRow = document.querySelector('.cp-cat-row[data-gid="' + gId + '"]');
  var isOpen = catRow && catRow.classList.contains('cat-open');
  var children = document.querySelectorAll('.cp-child-' + gId);
  var showEmpty = document.getElementById('seg-show-empty');
  if (isOpen) {
    children.forEach(function(tr) { tr.style.display = 'none'; });
    if (catRow) catRow.classList.remove('cat-open');
    if (chev) chev.style.transform = '';
  } else {
    children.forEach(function(tr) {
      if (tr.dataset.hasData === '1' || (showEmpty && showEmpty.checked)) tr.style.display = '';
    });
    if (catRow) catRow.classList.add('cat-open');
    if (chev) chev.style.transform = 'rotate(90deg)';
  }
}

function toggleEmptyPartidas(show) {
  document.querySelectorAll('#partidas-tbody .cp-child[data-has-data="0"]').forEach(function(tr) {
    var cls = Array.from(tr.classList).find(function(c) { return c.startsWith('cp-child-cpg'); });
    if (!cls) return;
    var gId = cls.replace('cp-child-', '');
    var catRow = document.querySelector('.cp-cat-row[data-gid="' + gId + '"]');
    var catOpen = catRow && catRow.classList.contains('cat-open');
    tr.style.display = (show && catOpen) ? '' : 'none';
  });
}

function expandAllCats() {
  var showEmpty = document.getElementById('seg-show-empty');
  document.querySelectorAll('#partidas-tbody .cp-cat-row').forEach(function(catRow) {
    var gId = catRow.dataset.gid;
    catRow.classList.add('cat-open');
    var chev = document.getElementById('chev-' + gId);
    if (chev) chev.style.transform = 'rotate(90deg)';
    document.querySelectorAll('.cp-child-' + gId).forEach(function(tr) {
      if (tr.dataset.hasData === '1' || (showEmpty && showEmpty.checked)) tr.style.display = '';
    });
  });
}

function collapseAllCats() {
  document.querySelectorAll('#partidas-tbody .cp-cat-row').forEach(function(catRow) {
    var gId = catRow.dataset.gid;
    catRow.classList.remove('cat-open');
    var chev = document.getElementById('chev-' + gId);
    if (chev) chev.style.transform = '';
    document.querySelectorAll('.cp-child-' + gId).forEach(function(tr) { tr.style.display = 'none'; });
  });
}

function editPartidaValue(projectId, rubroId, field, current) {
  const rubro = DB.getById('rubros', rubroId);
  const labels = {
    budget_amount: 'Monto Presupuesto',
    executed_external: 'Ejecutado por fuera de contratos',
    prevision: 'Previsión de economías / demasías'
  };
  const hints = {
    budget_amount: 'Importe base presupuestado para esta partida (sin ajuste por índice).',
    executed_external: 'Costos devengados que no forman parte de ningún contrato (ej. compras directas, facturas sueltas).',
    prevision: 'Ingresá la previsión bruta total. La previsión efectiva se calcula restando el monto ya contratado.'
  };

  // For prevision: compute contratado to show the effective breakdown
  let previsionExtra = '';
  if (field === 'prevision') {
    const contracts = DB.getAll('contracts').filter(c => c.project_id === projectId && c.status !== 'cancelled');
    let contratadoRubro = 0;
    contracts.forEach(c => {
      (c.items || []).forEach(item => {
        if (item.rubro_id === rubroId) contratadoRubro += (item.total || 0);
      });
    });
    const efectiva = Math.max(0, current - contratadoRubro);
    previsionExtra = contratadoRubro > 0
      ? `<div style="margin-top:10px;padding:10px;background:var(--bg);border-radius:6px;font-size:12px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="color:var(--text-muted)">Previsión bruta (ingresada):</span>
            <strong id="pv-bruta-display">${fmtMoney(current)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="color:var(--text-muted)">Contratado para esta partida:</span>
            <span style="color:var(--primary)">− ${fmtMoney(contratadoRubro)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:6px;margin-top:4px">
            <strong>Previsión efectiva resultante:</strong>
            <strong id="pv-efectiva-display" style="color:var(--warning)">${fmtMoney(efectiva)}</strong>
          </div>
        </div>`
      : '';
  }

  openModal(`${labels[field]}`, `
<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
  <strong style="color:var(--text)">${rubro ? rubro.code + ' — ' + rubro.name : ''}</strong>
</div>
<div class="form-group">
  <label class="form-label">${labels[field]}</label>
  <input class="form-control" id="pv-value" type="number" value="${current}" step="1000" style="font-size:16px" oninput="_updatePrevisionPreview(this.value,'${rubroId}','${projectId}')">
  <div style="font-size:11px;color:var(--text-muted);margin-top:6px"><i class="fas fa-info-circle"></i> ${hints[field]}</div>
</div>
${previsionExtra}
  `, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="savePartidaValue('${projectId}','${rubroId}','${field}')"><i class="fas fa-save"></i> Guardar</button>
  `);
  setTimeout(function() { document.getElementById('pv-value') && document.getElementById('pv-value').focus(); }, 100);
}

function _updatePrevisionPreview(val, rubroId, projectId) {
  const bruta = parseFloat(val) || 0;
  const contracts = DB.getAll('contracts').filter(c => c.project_id === projectId && c.status !== 'cancelled');
  let contratado = 0;
  contracts.forEach(c => {
    (c.items || []).forEach(item => {
      if (item.rubro_id === rubroId) contratado += (item.total || 0);
    });
  });
  const ef = document.getElementById('pv-efectiva-display');
  const br = document.getElementById('pv-bruta-display');
  if (ef) ef.textContent = fmtMoney(Math.max(0, bruta - contratado));
  if (br) br.textContent = fmtMoney(bruta);
}

function savePartidaValue(projectId, rubroId, field) {
  const val = document.getElementById('pv-value');
  if (!val) return;
  const value = parseFloat(val.value) || 0;

  const existing = DB.getAll('presupuestoPartidas').find(p => p.project_id === projectId && p.rubro_id === rubroId);
  const oldValue = existing ? (existing[field] || 0) : 0;

  if (existing) {
    const upd = {};
    upd[field] = value;
    DB.update('presupuestoPartidas', existing.id, upd);
  } else {
    const rec = { project_id: projectId, rubro_id: rubroId };
    rec[field] = value;
    DB.insert('presupuestoPartidas', rec);
  }

  // Log the change
  DB.insert('presupuestoLog', {
    project_id: projectId,
    rubro_id: rubroId,
    field,
    old_value: oldValue,
    new_value: value,
    timestamp: new Date().toISOString(),
    user: (window.APP_STATE && window.APP_STATE.currentUser && window.APP_STATE.currentUser.name) || '—',
  });

  toast('Guardado', 'success');
  closeModal();
  refreshSeguimientoPartidas(projectId);
}

function updatePartidaIndex(projectId, rubroId, indexId) {
  const existing = DB.getAll('presupuestoPartidas').find(p => p.project_id === projectId && p.rubro_id === rubroId);
  if (existing) {
    DB.update('presupuestoPartidas', existing.id, { index_id: indexId });
  } else if (indexId) {
    DB.insert('presupuestoPartidas', { project_id: projectId, rubro_id: rubroId, index_id: indexId });
  }
  refreshSeguimientoPartidas(projectId);
}

function refreshSeguimientoPartidas(projectId) {
  const container = document.getElementById('seg-partidas-container');
  if (container) container.innerHTML = renderControlPresupuestal(projectId);
}

function openPresupuestoLog(projectId) {
  const logs = DB.getAll('presupuestoLog')
    .filter(l => l.project_id === projectId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const rubros = DB.getAll('rubros');
  const rubroMap = {};
  rubros.forEach(r => { rubroMap[r.id] = r; });
  const fieldLabels = { budget_amount: 'Monto Ppto.', executed_external: 'Ejec. ext.', prevision: 'Previsión' };

  const rows = logs.length ? logs.map(function(l) {
    const r = rubroMap[l.rubro_id];
    const diff = (l.new_value || 0) - (l.old_value || 0);
    return '<tr>' +
      '<td style="white-space:nowrap;font-size:11px">' + new Date(l.timestamp).toLocaleString('es-AR') + '</td>' +
      '<td style="font-size:11px">' + (r ? '<strong>' + r.code + '</strong> ' + r.name : l.rubro_id) + '</td>' +
      '<td><span class="badge badge-blue" style="font-size:10px">' + (fieldLabels[l.field] || l.field) + '</span></td>' +
      '<td class="number-cell text-right" style="color:var(--text-muted)">' + fmtMoney(l.old_value || 0) + '</td>' +
      '<td class="number-cell text-right"><strong>' + fmtMoney(l.new_value || 0) + '</strong></td>' +
      '<td class="number-cell text-right" style="color:' + (diff > 0 ? 'var(--danger)' : diff < 0 ? 'var(--success)' : 'var(--text-muted)') + ';font-size:11px">' +
        (diff > 0 ? '+' : '') + fmtMoney(diff) +
      '</td>' +
      '<td style="font-size:11px">' + (l.user || '—') + '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">Sin cambios registrados aún. Los cambios se registran automáticamente al guardar.</td></tr>';

  openModal('Historial de Cambios Presupuestales', `
<div class="table-wrap" style="max-height:420px;overflow-y:auto">
  <table style="font-size:12px">
    <thead><tr>
      <th style="white-space:nowrap">Fecha / Hora</th>
      <th style="min-width:160px">Partida</th>
      <th>Campo</th>
      <th class="text-right">Valor Anterior</th>
      <th class="text-right">Valor Nuevo</th>
      <th class="text-right">Variación</th>
      <th>Usuario</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>
  `, '', '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
}

function openContratadoDetail(projectId, rubroId) {
  const rubro = DB.getById('rubros', rubroId);
  const contracts = DB.getAll('contracts').filter(c => c.project_id === projectId && c.status !== 'cancelled');
  const suppliers = DB.getAll('suppliers');

  const itemRows = [];
  let total = 0;
  contracts.forEach(function(c) {
    const sup = suppliers.find(s => s.id === c.contractor_id);
    (c.items || []).forEach(function(item) {
      if (item.rubro_id === rubroId) {
        itemRows.push({ c, sup, item });
        total += (item.total || 0);
      }
    });
  });

  const rows = itemRows.map(function(r) {
    return '<tr>' +
      '<td style="font-size:11px"><a href="#" onclick="renderContractDetail(\'' + r.c.id + '\');closeModal();return false" style="color:var(--primary);font-weight:600">' + r.c.number + '</a></td>' +
      '<td style="font-size:11px">' + (r.sup ? r.sup.name : '—') + '</td>' +
      '<td style="font-size:12px">' + (r.item.description || '—') + '</td>' +
      '<td class="number-cell text-right" style="font-size:11px">' + (r.item.quantity || 0) + ' ' + (r.item.unit || '') + '</td>' +
      '<td class="number-cell text-right" style="font-size:11px">' + fmtMoney(r.item.unit_price || 0) + '</td>' +
      '<td class="number-cell text-right"><strong>' + fmtMoney(r.item.total || 0) + '</strong></td>' +
    '</tr>';
  }).join('');

  openModal(
    'Contratado: ' + (rubro ? rubro.code + ' — ' + rubro.name : ''),
    '<div class="table-wrap" style="max-height:420px;overflow-y:auto">' +
    '<table style="font-size:12px">' +
      '<thead><tr>' +
        '<th style="white-space:nowrap">Contrato</th>' +
        '<th style="min-width:130px">Contratista</th>' +
        '<th style="min-width:160px">Descripción ítem</th>' +
        '<th class="text-right" style="white-space:nowrap">Cantidad</th>' +
        '<th class="text-right" style="white-space:nowrap">P. Unit.</th>' +
        '<th class="text-right" style="white-space:nowrap">Total</th>' +
      '</tr></thead>' +
      '<tbody>' +
        (rows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">Sin ítems contratados para esta partida</td></tr>') +
      '</tbody>' +
      '<tfoot><tr class="total-row">' +
        '<td colspan="5"><strong>TOTAL CONTRATADO</strong></td>' +
        '<td class="number-cell text-right"><strong style="color:var(--primary)">' + fmtMoney(total) + '</strong></td>' +
      '</tr></tfoot>' +
    '</table></div>',
    '',
    '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>'
  );
}

function exportControlPresupuestal(projectId) {
  const proj = DB.getById('projects', projectId);
  const rubros = DB.getAll('rubros').filter(r => r.active !== false).sort((a,b) => (a.code||'').localeCompare(b.code||''));
  const indices = DB.getAll('priceIndices');
  const partidas = DB.getAll('presupuestoPartidas').filter(p => p.project_id === projectId);
  const contracts = DB.getAll('contracts').filter(c => c.project_id === projectId && c.status !== 'cancelled');

  const partidaMap = {};
  partidas.forEach(p => { partidaMap[p.rubro_id] = p; });
  const contratoMap = {};
  contracts.forEach(c => {
    (c.items || []).forEach(item => {
      if (item.rubro_id) contratoMap[item.rubro_id] = (contratoMap[item.rubro_id]||0) + (item.total||0);
    });
  });

  const rows = rubros.map(r => {
    const p = partidaMap[r.id] || {};
    const budgetAmt = p.budget_amount || 0;
    const idx = indices.find(i => i.id === (p.index_id||''));
    const factor = (idx && idx.base_value) ? (idx.current_value / idx.base_value) : 1;
    const ajustado = budgetAmt * factor;
    const contratado = contratoMap[r.id] || 0;
    const ejecutado = p.executed_external || 0;
    const previsionBruta = p.prevision || 0;
    const previsionEfec = Math.max(0, previsionBruta - contratado);
    const costoTotal = contratado + ejecutado + previsionEfec;
    return [r.code, r.name, budgetAmt, idx ? idx.code : '', ajustado, contratado, ejecutado, previsionBruta, costoTotal, ajustado - costoTotal];
  });

  exportXLSX(
    `ControlPresupuestal_${proj?.name?.replace(/\s+/g,'_') || projectId}.xlsx`,
    ['Codificación','Partida','Monto Presupuesto','Índice','Ppto. Ajustado','Contratado','Ejec. Ext.','Previsión','Costo Total','Saldo'],
    rows
  );
}

/* ===== HELPERS ORIGINALES ===== */
function buildMonthlySpend(actualCosts) {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    months.push({ key, label: d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }) });
  }
  return months.map(m => ({
    label: m.label,
    amount: actualCosts.filter(a => a.date && a.date.startsWith(m.key)).reduce((s, a) => s + a.amount, 0)
  }));
}

function renderCatChart(catData) {
  const ctx = document.getElementById('seg-cat-chart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: catData.map(c => c.cat),
      datasets: [
        { label: 'Presupuesto', data: catData.map(c => c.budget), backgroundColor: 'rgba(37,99,235,.7)', borderRadius: 4 },
        { label: 'Real', data: catData.map(c => c.actual), backgroundColor: 'rgba(16,185,129,.7)', borderRadius: 4 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { labels: { font: { size: 11 } } } },
      scales: {
        y: { ticks: { callback: v => fmtMoney(v), font: { size: 10 } }, grid: { color: '#f1f5f9' } },
        x: { ticks: { font: { size: 10 } }, grid: { display: false } }
      }
    }
  });
}

function renderMonthlyChart(monthlyData) {
  const ctx = document.getElementById('seg-monthly-chart');
  if (!ctx) return;
  const cumulative = [];
  let cum = 0;
  monthlyData.forEach(m => { cum += m.amount; cumulative.push(cum); });

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: monthlyData.map(m => m.label),
      datasets: [
        { label: 'Gasto mensual', data: monthlyData.map(m => m.amount), type: 'bar', backgroundColor: 'rgba(245,158,11,.5)', borderRadius: 4 },
        { label: 'Gasto acumulado', data: cumulative, borderColor: '#2563eb', backgroundColor: 'transparent', tension: .4, pointRadius: 4, yAxisID: 'y1' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { labels: { font: { size: 11 } } } },
      scales: {
        y: { ticks: { callback: v => fmtMoney(v), font: { size: 10 } }, grid: { color: '#f1f5f9' } },
        y1: { position: 'right', ticks: { callback: v => fmtMoney(v), font: { size: 10 } }, grid: { display: false } },
        x: { ticks: { font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}

function openActualCostForm(projectId) {
  var pid = projectId || (document.getElementById('seg-project-sel') && document.getElementById('seg-project-sel').value) || window.APP_STATE.activeProject;
  const projects = DB.getAll('projects');
  openModal('Registrar Costo Real', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Proyecto *</label>
    <select class="form-control" id="ac-project">
      <option value="">Seleccionar...</option>
      ${projects.map(p => `<option value="${p.id}" ${p.id===pid?'selected':''}>${p.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Categoría</label>
    <input class="form-control" id="ac-category" list="ac-cat-list" placeholder="Estructura, Mampostería...">
    <datalist id="ac-cat-list">
      ${['Estructura','Mampostería','Instalaciones','Cerramiento','Terminaciones','Mano de Obra','Varios'].map(c=>`<option value="${c}">`).join('')}
    </datalist>
  </div>
  <div class="form-group full">
    <label class="form-label">Descripción *</label>
    <input class="form-control" id="ac-desc" placeholder="Descripción del costo incurrido">
  </div>
  <div class="form-group">
    <label class="form-label">Importe *</label>
    <input class="form-control" id="ac-amount" type="number" min="0" placeholder="0">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha</label>
    <input class="form-control" id="ac-date" type="date" value="${todayStr()}">
  </div>
  <div class="form-group full">
    <label class="form-label">Referencia (OC, Remito, etc.)</label>
    <input class="form-control" id="ac-ref" placeholder="OC-2025-001, Rem-045...">
  </div>
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveActualCost()"><i class="fas fa-save"></i> Registrar</button>
`);
}

function saveActualCost() {
  const projectId = document.getElementById('ac-project').value;
  const description = document.getElementById('ac-desc').value.trim();
  const amount = parseFloat(document.getElementById('ac-amount').value);
  if (!projectId || !description || !amount) { toast('Proyecto, descripción e importe son obligatorios', 'error'); return; }

  DB.insert('actualCosts', {
    project_id: projectId,
    category: document.getElementById('ac-category').value.trim(),
    description,
    amount,
    date: document.getElementById('ac-date').value,
    reference: document.getElementById('ac-ref').value.trim(),
  });

  toast('Costo registrado', 'success');
  closeModal();
  loadSeguimiento(projectId);
}

function deleteActualCost(id, projectId) {
  confirmDialog('¿Eliminar este registro de costo?', function() {
    DB.remove('actualCosts', id);
    toast('Costo eliminado', 'warning');
    loadSeguimiento(projectId);
  });
}
