/* ===== REPORTE DE COSTOS DE OBRA ===== */

window._rptCosFilters = window._rptCosFilters || {
  period: 'year', from: '', to: '', project: '', category: ''
};

function renderReporteCostos() {
  const projects = DB.getAll('projects');

  var allCategories = [...new Set(DB.getAll('actualCosts').map(a => a.category).filter(Boolean))].sort();

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Reporte de Costos de Obra</div>
    <div class="page-subtitle">Control presupuestario y desviación por proyecto</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="exportRptCostos()"><i class="fas fa-download"></i> Exportar CSV</button>
  </div>
</div>

<div id="rpt-cos-kpis" class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px"></div>

<div class="filter-bar mt-0 mb-3">
  <select class="form-control" style="width:170px" id="rpt-cos-period"
    onchange="window._rptCosFilters.period=this.value;document.getElementById('rpt-cos-dates').style.display=this.value==='custom'?'flex':'none';if(this.value!=='custom')_rptCosRefresh()">
    <option value="month"      ${window._rptCosFilters.period==='month'?'selected':''}>Este mes</option>
    <option value="prev_month" ${window._rptCosFilters.period==='prev_month'?'selected':''}>Mes anterior</option>
    <option value="quarter"    ${window._rptCosFilters.period==='quarter'?'selected':''}>Trimestre</option>
    <option value="year"       ${window._rptCosFilters.period==='year'?'selected':''}>Este año</option>
    <option value="all"        ${window._rptCosFilters.period==='all'?'selected':''}>Todo el período</option>
    <option value="custom"     ${window._rptCosFilters.period==='custom'?'selected':''}>Personalizado</option>
  </select>
  <div id="rpt-cos-dates" style="display:${window._rptCosFilters.period==='custom'?'flex':'none'};gap:8px;align-items:center">
    <input type="date" class="form-control" style="width:150px" id="rpt-cos-from"
      value="${window._rptCosFilters.from}" onchange="window._rptCosFilters.from=this.value;_rptCosRefresh()">
    <span style="color:var(--text-muted);font-size:13px">→</span>
    <input type="date" class="form-control" style="width:150px" id="rpt-cos-to"
      value="${window._rptCosFilters.to}" onchange="window._rptCosFilters.to=this.value;_rptCosRefresh()">
  </div>
  <select class="form-control" style="width:220px"
    onchange="window._rptCosFilters.project=this.value;_rptCosRefresh()">
    <option value="">Todas las obras</option>
    ${projects.map(p => `<option value="${p.id}" ${window._rptCosFilters.project===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}
  </select>
  <select class="form-control" style="width:200px"
    onchange="window._rptCosFilters.category=this.value;_rptCosRefresh()">
    <option value="">Todas las categorías</option>
    ${allCategories.map(c => `<option value="${c}" ${window._rptCosFilters.category===c?'selected':''}>${escapeHtml(c)}</option>`).join('')}
  </select>
</div>

<div id="rpt-cos-body"></div>
`;

  _rptCosRefresh();
}

function _rptCosDateRange() {
  var f = window._rptCosFilters;
  var now = new Date();
  var from = '', to = '';
  if (f.period === 'month') {
    from = now.toISOString().slice(0, 7) + '-01';
    var last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    to = last.toISOString().slice(0, 10);
  } else if (f.period === 'prev_month') {
    var pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    from = pm.toISOString().slice(0, 7) + '-01';
    var lastPM = new Date(now.getFullYear(), now.getMonth(), 0);
    to = lastPM.toISOString().slice(0, 10);
  } else if (f.period === 'quarter') {
    var qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    from = qStart.toISOString().slice(0, 10);
    to = now.toISOString().slice(0, 10);
  } else if (f.period === 'year') {
    from = now.getFullYear() + '-01-01';
    to = now.getFullYear() + '-12-31';
  } else if (f.period === 'custom') {
    from = f.from || '';
    to = f.to || '';
  }
  // 'all' → no filter (empty strings)
  return { from, to };
}

function _rptCosRefresh() {
  var f = window._rptCosFilters;
  var range = _rptCosDateRange();
  var projects = DB.getAll('projects');
  var allCosts = DB.getAll('actualCosts');
  var allPOs = DB.getAll('purchaseOrders');
  var allSI = DB.getAll('supplierInvoices');

  // Apply date filter to actualCosts
  var costs = allCosts.filter(function(a) {
    if (range.from && a.date && a.date < range.from) return false;
    if (range.to && a.date && a.date > range.to) return false;
    return true;
  });

  // Apply date filter to supplier invoices (as additional cost source)
  var siCosts = allSI.filter(function(si) {
    if (range.from && si.date && si.date < range.from) return false;
    if (range.to && si.date && si.date > range.to) return false;
    return true;
  });

  // Apply category filter to actualCosts
  if (f.category) {
    costs = costs.filter(function(a) { return a.category === f.category; });
  }

  // Apply project filter
  var filteredProjects = projects;
  if (f.project) {
    filteredProjects = projects.filter(function(p) { return p.id === f.project; });
  }

  // Build per-project rows
  var rows = filteredProjects.map(function(p) {
    var pCosts = costs.filter(function(a) { return a.project_id === p.id; });
    var pSI = f.category ? [] : siCosts.filter(function(si) { return si.project_id === p.id && si.status !== 'cancelled'; });
    var actualTotal = pCosts.reduce(function(s, a) { return s + (a.amount || 0); }, 0);
    var siTotal = pSI.reduce(function(s, si) { return s + (si.total || 0); }, 0);
    var budget = p.budget || 0;
    var totalCost = actualTotal + (f.category ? 0 : siTotal);
    var deviation = budget - totalCost;
    var deviationPct = budget > 0 ? (deviation / budget * 100) : 0;
    var margin = 0; // Will compute based on invoices in KPIs
    return { p, budget, actualTotal, siTotal, totalCost, deviation, deviationPct };
  });

  // KPI totals
  var totalBudget = rows.reduce(function(s, r) { return s + r.budget; }, 0);
  var totalActual = rows.reduce(function(s, r) { return s + r.actualTotal; }, 0);
  var totalSI = rows.reduce(function(s, r) { return s + r.siTotal; }, 0);
  var totalCost = rows.reduce(function(s, r) { return s + r.totalCost; }, 0);
  var totalDev = totalBudget - totalCost;
  var devPct = totalBudget > 0 ? (totalDev / totalBudget * 100) : 0;

  // KPI cards
  var kpiEl = document.getElementById('rpt-cos-kpis');
  if (kpiEl) kpiEl.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon blue"><i class="fas fa-calculator"></i></div>
      <div><div class="stat-value">${fmtMoneyK(totalBudget)}</div><div class="stat-label">Presupuesto</div><div class="stat-delta up"><i class="fas fa-building"></i> ${filteredProjects.length} obra(s)</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon ${totalCost <= totalBudget ? 'green' : 'red'}"><i class="fas fa-hard-hat"></i></div>
      <div><div class="stat-value">${fmtMoneyK(totalCost)}</div><div class="stat-label">Costo Real Total</div>
        <div class="stat-delta up" style="font-size:11px"><i class="fas fa-list"></i> Costos: ${fmtMoneyK(totalActual)}${!f.category ? ' + Fact. prov.: ' + fmtMoneyK(totalSI) : ''}</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon ${totalDev >= 0 ? 'green' : 'red'}"><i class="fas fa-balance-scale"></i></div>
      <div><div class="stat-value ${totalDev >= 0 ? 'text-success' : 'text-danger'}">${fmtMoneyK(Math.abs(totalDev))}</div>
        <div class="stat-label">${totalDev >= 0 ? 'Ahorro' : 'Sobrecosto'}</div>
        <div class="stat-delta ${totalDev >= 0 ? 'up' : 'down'}">${totalDev >= 0 ? '<i class="fas fa-arrow-down"></i>' : '<i class="fas fa-arrow-up"></i>'} ${fmtPct(Math.abs(devPct))}</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon ${devPct >= 10 ? 'green' : devPct >= 0 ? 'yellow' : 'red'}"><i class="fas fa-percentage"></i></div>
      <div><div class="stat-value ${devPct >= 0 ? 'text-success' : 'text-danger'}">${fmtPct(devPct)}</div>
        <div class="stat-label">Desvío presupuestario</div>
        <div class="stat-delta ${devPct >= 0 ? 'up' : 'down'}">${devPct >= 0 ? 'Dentro del presupuesto' : 'Por encima del presupuesto'}</div></div>
    </div>
  `;

  // Main body
  var bodyEl = document.getElementById('rpt-cos-body');
  if (!bodyEl) return;

  var tableRows = rows.map(function(r) {
    var pct = r.budget > 0 ? Math.min(100, r.totalCost / r.budget * 100) : 0;
    var color = r.deviation >= 0 ? 'var(--success)' : 'var(--danger)';
    return `<tr onclick="_rptCosDetail('${r.p.id}')" style="cursor:pointer">
      <td>
        <strong>${escapeHtml(r.p.name)}</strong>
        <div style="font-size:11px;color:var(--text-muted)">${escapeHtml(r.p.client || '')} — ${escapeHtml(r.p.status || '')}</div>
      </td>
      <td class="number-cell">${fmtMoney(r.budget)}</td>
      <td class="number-cell">${fmtMoney(r.actualTotal)}</td>
      ${!f.category ? `<td class="number-cell">${fmtMoney(r.siTotal)}</td>` : ''}
      <td class="number-cell"><strong>${fmtMoney(r.totalCost)}</strong></td>
      <td style="min-width:110px">
        <div class="progress-bar"><div class="progress-fill" style="width:${pct.toFixed(0)}%;background:${r.deviation < 0 ? 'var(--danger)' : 'var(--primary)'}"></div></div>
        <span style="font-size:11px;color:var(--text-muted)">${pct.toFixed(0)}% ejecutado</span>
      </td>
      <td class="number-cell" style="font-weight:700;color:${color}">${r.deviation >= 0 ? '' : '-'}${fmtMoney(Math.abs(r.deviation))}</td>
      <td class="number-cell" style="color:${color};font-weight:600">${r.budget > 0 ? fmtPct(r.deviationPct) : '—'}</td>
    </tr>`;
  }).join('');

  var siCol = f.category ? '' : '<th class="number-cell">Fact. Prov.</th>';

  bodyEl.innerHTML = `
<div class="card mb-3">
  <div class="card-header">
    <span class="card-title"><i class="fas fa-table text-primary"></i> Resumen por Obra</span>
    <span style="font-size:12px;color:var(--text-muted)">Hacé clic en una fila para ver el detalle</span>
  </div>
  <div class="card-body" style="padding:0">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Proyecto</th>
            <th class="number-cell">Presupuesto</th>
            <th class="number-cell">Costos Reg.</th>
            ${siCol}
            <th class="number-cell">Costo Total</th>
            <th>Ejecución</th>
            <th class="number-cell">Desvío $</th>
            <th class="number-cell">Desvío %</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? tableRows : '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px">Sin datos para el período seleccionado</td></tr>'}
        </tbody>
        ${rows.length > 1 ? `<tfoot>
          <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td class="number-cell"><strong>${fmtMoney(totalBudget)}</strong></td>
            <td class="number-cell"><strong>${fmtMoney(totalActual)}</strong></td>
            ${!f.category ? `<td class="number-cell"><strong>${fmtMoney(totalSI)}</strong></td>` : ''}
            <td class="number-cell"><strong>${fmtMoney(totalCost)}</strong></td>
            <td></td>
            <td class="number-cell" style="font-weight:700;color:${totalDev >= 0 ? 'var(--success)' : 'var(--danger)'}">
              ${totalDev >= 0 ? '' : '-'}${fmtMoney(Math.abs(totalDev))}
            </td>
            <td class="number-cell" style="font-weight:700;color:${devPct >= 0 ? 'var(--success)' : 'var(--danger)'}">${fmtPct(devPct)}</td>
          </tr>
        </tfoot>` : ''}
      </table>
    </div>
  </div>
</div>

<div class="grid-2">
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-chart-bar text-primary"></i> Presupuesto vs Costo Real</span>
    </div>
    <div class="card-body">
      <div class="chart-wrap"><canvas id="rpt-cos-chart-main"></canvas></div>
    </div>
  </div>
  <div class="card" id="rpt-cos-detail-card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-list text-primary"></i> Detalle por categoría</span>
    </div>
    <div class="card-body" style="padding:0">
      <div class="empty-state" style="padding:40px"><i class="fas fa-mouse-pointer"></i><p>Hacé clic en una fila para ver el desglose</p></div>
    </div>
  </div>
</div>
`;

  // Render main chart
  var ctx = document.getElementById('rpt-cos-chart-main');
  if (ctx && rows.length) {
    var labels = rows.map(function(r) {
      var n = r.p.name; return n.length > 22 ? n.slice(0, 22) + '…' : n;
    });
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Presupuesto', data: rows.map(function(r) { return r.budget; }), backgroundColor: 'rgba(37,99,235,.55)', borderRadius: 4 },
          { label: 'Costo Real',  data: rows.map(function(r) { return r.totalCost; }), backgroundColor: 'rgba(239,68,68,.75)', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true, indexAxis: 'y',
        plugins: { legend: { labels: { font: { size: 11 } } } },
        scales: {
          x: { ticks: { callback: function(v) { return fmtMoneyK(v); }, font: { size: 10 } }, grid: { color: '#f1f5f9' } },
          y: { ticks: { font: { size: 10 } }, grid: { display: false } }
        }
      }
    });
  }
}

function _rptCosDetail(projectId) {
  var project = DB.getById('projects', projectId);
  if (!project) return;

  var range = _rptCosDateRange();
  var costs = DB.getAll('actualCosts').filter(function(a) {
    if (a.project_id !== projectId) return false;
    if (range.from && a.date && a.date < range.from) return false;
    if (range.to && a.date && a.date > range.to) return false;
    return true;
  });

  var si = DB.getAll('supplierInvoices').filter(function(si) {
    if (si.project_id !== projectId || si.status === 'cancelled') return false;
    if (range.from && si.date && si.date < range.from) return false;
    if (range.to && si.date && si.date > range.to) return false;
    return true;
  });

  // Group by category
  var bycat = {};
  costs.forEach(function(a) {
    var cat = a.category || 'Sin categoría';
    if (!bycat[cat]) bycat[cat] = 0;
    bycat[cat] += (a.amount || 0);
  });
  var siTotal = si.reduce(function(s, x) { return s + (x.total || 0); }, 0);
  if (siTotal > 0) bycat['Facturas de Proveedores'] = siTotal;

  var catRows = Object.keys(bycat).sort().map(function(cat) {
    var amt = bycat[cat];
    var pct = project.budget > 0 ? (amt / project.budget * 100) : 0;
    return `<tr>
      <td style="font-size:12px">${escapeHtml(cat)}</td>
      <td class="number-cell" style="font-size:12px">${fmtMoney(amt)}</td>
      <td class="number-cell" style="font-size:12px;color:var(--text-muted)">${pct.toFixed(1)}%</td>
    </tr>`;
  }).join('');

  var total = Object.values(bycat).reduce(function(s, v) { return s + v; }, 0);
  var card = document.getElementById('rpt-cos-detail-card');
  if (!card) return;
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title"><i class="fas fa-list text-primary"></i> ${escapeHtml(project.name)}</span>
    </div>
    <div class="card-body" style="padding:0">
      ${catRows ? `<div class="table-wrap"><table>
        <thead><tr><th>Categoría</th><th class="number-cell">Importe</th><th class="number-cell">% Ppto.</th></tr></thead>
        <tbody>${catRows}</tbody>
        <tfoot><tr class="total-row">
          <td><strong>Total</strong></td>
          <td class="number-cell"><strong>${fmtMoney(total)}</strong></td>
          <td class="number-cell" style="color:${project.budget >= total ? 'var(--success)' : 'var(--danger)'}">
            <strong>${project.budget > 0 ? fmtPct(total / project.budget * 100) : '—'}</strong>
          </td>
        </tr></tfoot>
      </table></div>` : '<div class="empty-state" style="padding:30px"><i class="fas fa-inbox"></i><p>Sin costos registrados</p></div>'}
    </div>
  `;

  // Also highlight the clicked row
  document.querySelectorAll('#rpt-cos-body tbody tr').forEach(function(tr) {
    tr.style.background = '';
  });
  var rows = document.querySelectorAll('#rpt-cos-body tbody tr');
  rows.forEach(function(tr) {
    if (tr.onclick && tr.onclick.toString().indexOf(projectId) !== -1) {
      tr.style.background = 'var(--bg)';
    }
  });
}

function exportRptCostos() {
  var f = window._rptCosFilters;
  var range = _rptCosDateRange();
  var projects = DB.getAll('projects');
  var costs = DB.getAll('actualCosts').filter(function(a) {
    if (f.project && a.project_id !== f.project) return false;
    if (f.category && a.category !== f.category) return false;
    if (range.from && a.date && a.date < range.from) return false;
    if (range.to && a.date && a.date > range.to) return false;
    return true;
  });

  var rows = [['Proyecto', 'Presupuesto', 'Categoría', 'Descripción', 'Fecha', 'Importe', 'Referencia']];
  costs.forEach(function(a) {
    var p = projects.find(function(x) { return x.id === a.project_id; });
    rows.push([
      (p ? p.name : a.project_id) || '',
      p ? (p.budget || 0) : '',
      a.category || '',
      a.description || '',
      a.date || '',
      (a.amount || 0),
      a.reference || ''
    ]);
  });

  var csv = rows.map(function(r) {
    return r.map(function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(',');
  }).join('\n');

  var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'costos_obra.csv'; a.click();
  URL.revokeObjectURL(url);
}
