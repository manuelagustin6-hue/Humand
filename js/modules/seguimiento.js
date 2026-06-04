/* ===== SEGUIMIENTO DE PRESUPUESTO ===== */
function renderSeguimiento() {
  const projects = DB.getAll('projects');
  const activeProjectId = window.APP_STATE.activeProject;
  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div><div class="page-title">Seguimiento de Presupuesto</div><div class="page-subtitle">Control de desvíos, avance financiero y análisis de costos</div></div>
  <div class="page-actions">
    <select class="form-control" id="seg-project-sel" onchange="loadSeguimiento(this.value)" style="min-width:220px"><option value="">Seleccionar proyecto...</option>${projects.map(p => `<option value="${p.id}" ${p.id===activeProjectId?'selected':''}>${p.name}</option>`).join('')}</select>
    <button class="btn btn-primary" onclick="openActualCostForm()"><i class="fas fa-plus"></i> Registrar Costo Real</button>
  </div>
</div>
<div id="seg-container">${activeProjectId ? renderSeguimientoContent(activeProjectId) : `<div class="empty-state"><i class="fas fa-chart-line"></i><p>Selección un proyecto para ver el seguimiento</p></div>`}</div>`;
  if (activeProjectId) document.getElementById('seg-project-sel').value = activeProjectId;
}

function loadSeguimiento(projectId) {
  window.APP_STATE.activeProject = projectId;
  document.getElementById('seg-container').innerHTML = projectId ? renderSeguimientoContent(projectId) : `<div class="empty-state"><i class="fas fa-chart-line"></i><p>Selección un proyecto</p></div>`;
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
    return { cat, budget, actual, diff: actual - budget, pct: budget ? (actual / budget * 100) : 0 };
  });
  const monthlyData = buildMonthlySpend(actualCosts);
  setTimeout(() => { renderCatChart(catData); renderMonthlyChart(monthlyData); }, 100);
  return `
<div class="stats-grid" style="grid-template-columns:repeat(5,1fr)">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-calculator"></i></div><div><div class="stat-value">${fmtMoney(boqTotal)}</div><div class="stat-label">Presupuesto BOQ</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-receipt"></i></div><div><div class="stat-value">${fmtMoney(actualTotal)}</div><div class="stat-label">Costo Real</div></div></div>
  <div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-file-alt"></i></div><div><div class="stat-value">${fmtMoney(poTotal)}</div><div class="stat-label">OC Comprometidas</div></div></div>
  <div class="stat-card"><div class="stat-icon ${deviation > 0 ? 'red' : 'green'}"><i class="fas fa-balance-scale"></i></div><div><div class="stat-value ${deviation > 0 ? 'text-danger' : 'text-success'}">${fmtMoney(Math.abs(deviation))}</div><div class="stat-label">${deviation > 0 ? 'Desvío (+)' : 'Ahorro (-)'}</div><div class="stat-delta ${deviation > 0 ? 'down' : 'up'}">${fmtPct(Math.abs(deviationPct))}</div></div></div>
  <div class="stat-card"><div class="stat-icon ${committed > boqTotal ? 'red' : 'green'}"><i class="fas fa-lock"></i></div><div><div class="stat-value">${fmtMoney(committed)}</div><div class="stat-label">Total Comprometido</div><div class="stat-delta ${committed > boqTotal ? 'down' : 'up'}">${fmtPct(boqTotal ? committed/boqTotal*100 : 0)} del BOQ</div></div></div>
</div>
<div class="grid-2 mt-2">
  <div class="card"><div class="card-header"><span class="card-title"><i class="fas fa-chart-bar text-primary"></i> Presupuesto vs Real por Categoría</span></div><div class="card-body"><div class="chart-wrap"><canvas id="seg-cat-chart"></canvas></div></div></div>
  <div class="card"><div class="card-header"><span class="card-title"><i class="fas fa-chart-line text-primary"></i> Curva de Gasto Mensual</span></div><div class="card-body"><div class="chart-wrap"><canvas id="seg-monthly-chart"></canvas></div></div></div>
</div>
<div class="card mt-2">
  <div class="card-header"><span class="card-title"><i class="fas fa-table text-primary"></i> Análisis por Categoría</span></div>
  <div class="card-body" style="padding:0"><div class="table-wrap"><table>
    <thead><tr><th>Categoría</th><th class="text-right">Presupuesto</th><th class="text-right">Real</th><th class="text-right">Desvío</th><th class="text-right">% Ejecución</th><th>Estado</th><th>Avance</th></tr></thead>
    <tbody>${catData.map(c => `<tr><td><strong>${c.cat}</strong></td><td class="number-cell text-right">${fmtMoney(c.budget)}</td><td class="number-cell text-right">${fmtMoney(c.actual)}</td><td class="number-cell text-right ${c.diff > 0 ? 'text-danger' : c.diff < 0 ? 'text-success' : ''}">${c.diff > 0 ? '+' : ''}${fmtMoney(c.diff)}</td><td class="text-right">${fmtPct(c.pct)}</td><td>${c.pct > 100 ? '<span class="badge badge-red">Excedido</span>' : c.pct > 80 ? '<span class="badge badge-yellow">Alerta</span>' : '<span class="badge badge-green">OK</span>'}</td><td style="min-width:140px"><div class="progress-bar"><div class="progress-fill ${c.pct > 100 ? 'red' : c.pct > 80 ? 'yellow' : ''}" style="width:${Math.min(c.pct,100)}%"></div></div></td></tr>`).join('')}</tbody>
    <tfoot><tr class="total-row"><td><strong>TOTAL</strong></td><td class="number-cell text-right"><strong>${fmtMoney(boqTotal)}</strong></td><td class="number-cell text-right"><strong>${fmtMoney(actualTotal)}</strong></td><td class="number-cell text-right ${deviation > 0 ? 'text-danger' : 'text-success'}"><strong>${deviation > 0 ? '+' : ''}${fmtMoney(deviation)}</strong></td><td class="text-right"><strong>${fmtPct(boqTotal ? actualTotal/boqTotal*100 : 0)}</strong></td><td colspan="2"></td></tr></tfoot>
  </table></div></div>
</div>
<div class="card mt-2">
  <div class="card-header"><span class="card-title"><i class="fas fa-receipt text-primary"></i> Costos Reales Registrados</span><button class="btn btn-sm btn-primary" onclick="openActualCostForm('${projectId}')"><i class="fas fa-plus"></i> Agregar</button></div>
  <div class="card-body" style="padding:0"><div class="table-wrap"><table>
    <thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Referencia</th><th class="text-right">Importe</th><th>Acciones</th></tr></thead>
    <tbody>${actualCosts.length ? actualCosts.map(a => `<tr><td>${fmtDate(a.date)}</td><td><span class="badge badge-blue">${a.category}</span></td><td>${a.description}</td><td><span style="font-size:11px;color:var(--text-muted)">${a.reference || '-'}</span></td><td class="number-cell text-right"><strong>${fmtMoney(a.amount)}</strong></td><td><button class="btn-ghost btn btn-sm danger" onclick="deleteActualCost('${a.id}', '${projectId}')"><i class="fas fa-trash"></i></button></td></tr>`).join('') : '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">Sin costos registrados</td></tr>'}</tbody>
    ${actualCosts.length ? `<tfoot><tr class="total-row"><td colspan="4"><strong>Total</strong></td><td class="number-cell text-right"><strong>${fmtMoney(actualTotal)}</strong></td><td></td></tr></tfoot>` : ''}
  </table></div></div>
</div>`;
}

function buildMonthlySpend(actualCosts) {
  const months = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); months.push({ key: d.toISOString().slice(0,7), label: d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }) }); }
  return months.map(m => ({ label: m.label, amount: actualCosts.filter(a => a.date && a.date.startsWith(m.key)).reduce((s, a) => s + a.amount, 0) }));
}

function renderCatChart(catData) {
  const ctx = document.getElementById('seg-cat-chart'); if (!ctx) return;
  new Chart(ctx, { type: 'bar', data: { labels: catData.map(c => c.cat), datasets: [{ label: 'Presupuesto', data: catData.map(c => c.budget), backgroundColor: 'rgba(37,99,235,.7)', borderRadius: 4 }, { label: 'Real', data: catData.map(c => c.actual), backgroundColor: 'rgba(16,185,129,.7)', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { font: { size: 11 } } } }, scales: { y: { ticks: { callback: v => fmtMoney(v), font: { size: 10 } }, grid: { color: '#f1f5f9' } }, x: { ticks: { font: { size: 10 } }, grid: { display: false } } } } });
}

function renderMonthlyChart(monthlyData) {
  const ctx = document.getElementById('seg-monthly-chart'); if (!ctx) return;
  const cumulative = []; let cum = 0;
  monthlyData.forEach(m => { cum += m.amount; cumulative.push(cum); });
  new Chart(ctx, { type: 'line', data: { labels: monthlyData.map(m => m.label), datasets: [{ label: 'Gasto mensual', data: monthlyData.map(m => m.amount), type: 'bar', backgroundColor: 'rgba(245,158,11,.5)', borderRadius: 4 }, { label: 'Gasto acumulado', data: cumulative, borderColor: '#2563eb', backgroundColor: 'transparent', tension: .4, pointRadius: 4, yAxisID: 'y1' }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { font: { size: 11 } } } }, scales: { y: { ticks: { callback: v => fmtMoney(v), font: { size: 10 } }, grid: { color: '#f1f5f9' } }, y1: { position: 'right', ticks: { callback: v => fmtMoney(v), font: { size: 10 } }, grid: { display: false } }, x: { ticks: { font: { size: 11 } }, grid: { display: false } } } } });
}

function openActualCostForm(projectId = null) {
  const pid = projectId || document.getElementById('seg-project-sel')?.value || window.APP_STATE.activeProject;
  const projects = DB.getAll('projects');
  openModal('Registrar Costo Real', `
<div class="form-grid form-grid-2">
  <div class="form-group"><label class="form-label">Proyecto *</label><select class="form-control" id="ac-project"><option value="">Seleccionar...</option>${projects.map(p => `<option value="${p.id}" ${p.id===pid?'selected':''}>${p.name}</option>`).join('')}</select></div>
  <div class="form-group"><label class="form-label">Categoría</label><input class="form-control" id="ac-category" placeholder="Estructura, Mampostería..."></div>
  <div class="form-group full"><label class="form-label">Descripción *</label><input class="form-control" id="ac-desc"></div>
  <div class="form-group"><label class="form-label">Importe *</label><input class="form-control" id="ac-amount" type="number" min="0"></div>
  <div class="form-group"><label class="form-label">Fecha</label><input class="form-control" id="ac-date" type="date" value="${todayStr()}"></div>
  <div class="form-group full"><label class="form-label">Referencia</label><input class="form-control" id="ac-ref"></div>
</div>`, '', `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveActualCost()"><i class="fas fa-save"></i> Registrar</button>`);
}

function saveActualCost() {
  const projectId = document.getElementById('ac-project').value;
  const description = document.getElementById('ac-desc').value.trim();
  const amount = parseFloat(document.getElementById('ac-amount').value);
  if (!projectId || !description || !amount) { toast('Proyecto, descripción e importe son obligatorios', 'error'); return; }
  DB.insert('actualCosts', { project_id: projectId, category: document.getElementById('ac-category').value.trim(), description, amount, date: document.getElementById('ac-date').value, reference: document.getElementById('ac-ref').value.trim() });
  toast('Costo registrado', 'success'); closeModal(); loadSeguimiento(projectId);
}

function deleteActualCost(id, projectId) {
  confirmDialog('¿Eliminar este registro de costo?', () => { DB.remove('actualCosts', id); toast('Costo eliminado', 'warning'); loadSeguimiento(projectId); });
}
