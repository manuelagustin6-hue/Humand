/* ===== REPORTES ===== */
function renderReportes() {
  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Reportes</div>
    <div class="page-subtitle">Informes gerenciales, contables y de control de obra</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="window.print()"><i class="fas fa-print"></i> Imprimir Vista</button>
  </div>
</div>

<div id="rep-tabs">
  <div class="tabs" style="flex-wrap:wrap">
    <button class="tab-btn" data-tab="tab-sumas">Sumas y Saldos</button>
    <button class="tab-btn" data-tab="tab-proyecto">Resumen por Proyecto</button>
    <button class="tab-btn" data-tab="tab-flujo">Flujo Proyectado</button>
    <button class="tab-btn" data-tab="tab-certs-rep">Certificaciones</button>
    <button class="tab-btn" data-tab="tab-aging-rep">Aging</button>
    <button class="tab-btn" data-tab="tab-compras-rep">Compras</button>
  </div>

  <div id="tab-sumas" class="tab-content">${renderSumasYSaldos()}</div>
  <div id="tab-proyecto" class="tab-content">${renderReporteProyecto()}</div>
  <div id="tab-flujo" class="tab-content">${renderFlujoCaja()}</div>
  <div id="tab-certs-rep" class="tab-content">${renderReporteCertificaciones()}</div>
  <div id="tab-aging-rep" class="tab-content">${renderReporteAging()}</div>
  <div id="tab-compras-rep" class="tab-content">${renderReporteCompras()}</div>
</div>
  `;
  initTabs('rep-tabs');
  setTimeout(() => renderFlujoCajaChart(), 100);
}

// ---- SUMAS Y SALDOS ----
function renderSumasYSaldos() {
  const accounts = DB.getAll('accounts');
  const entries = DB.getAll('journalEntries').filter(e => e.status === 'posted');

  // Calc debits and credits per account from posted entries
  const debits = {}, credits = {};
  accounts.forEach(a => { debits[a.code] = 0; credits[a.code] = 0; });

  entries.forEach(e => {
    e.lines.forEach(l => {
      if (!l.account_code) return;
      debits[l.account_code] = (debits[l.account_code]||0) + (l.debit||0);
      credits[l.account_code] = (credits[l.account_code]||0) + (l.credit||0);
    });
  });

  const totalDebit = Object.values(debits).reduce((s,v) => s+v, 0);
  const totalCredit = Object.values(credits).reduce((s,v) => s+v, 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 1;

  const typeLabel = { asset: 'ACTIVO', liability: 'PASIVO', equity: 'PATRIMONIO', revenue: 'INGRESO', expense: 'EGRESO' };
  const typeColor = { asset: 'badge-blue', liability: 'badge-red', equity: 'badge-green', revenue: 'badge-cyan', expense: 'badge-yellow' };

  return `
<div class="card">
  <div class="card-header">
    <span class="card-title"><i class="fas fa-balance-scale text-primary"></i> Sumas y Saldos — Balance de Comprobación</span>
    <div style="display:flex;gap:8px;align-items:center">
      <span style="font-size:11px;color:var(--text-muted)">Solo asientos contabilizados</span>
      <span class="badge ${balanced?'badge-green':'badge-red'}">${balanced?'✓ Cuadrado':'⚠ Desbalanceado'}</span>
      <button class="btn btn-sm btn-secondary" onclick="exportSumasYSaldos()"><i class="fas fa-download"></i> Exportar</button>
    </div>
  </div>
  <div class="card-body" style="padding:0">
    <div class="table-wrap">
      <table><thead><tr>
        <th>Código</th><th>Cuenta</th><th>Tipo</th>
        <th class="text-right">Débitos Acum.</th><th class="text-right">Créditos Acum.</th>
        <th class="text-right">Saldo Deudor</th><th class="text-right">Saldo Acreedor</th>
      </tr></thead>
      <tbody>
        ${accounts.sort((a,b)=>a.code.localeCompare(b.code)).filter(a => debits[a.code]||credits[a.code]).map(a => {
          const d = debits[a.code]||0;
          const c = credits[a.code]||0;
          const saldoD = d > c ? d - c : 0;
          const saldoC = c > d ? c - d : 0;
          return `<tr>
            <td><strong>${a.code}</strong></td>
            <td style="padding-left:${(a.code.split('.').length-1)*12+4}px">${a.name}</td>
            <td><span class="badge ${typeColor[a.type]||'badge-gray'}">${typeLabel[a.type]||a.type}</span></td>
            <td class="number-cell text-right">${d ? fmtMoney(d) : '-'}</td>
            <td class="number-cell text-right">${c ? fmtMoney(c) : '-'}</td>
            <td class="number-cell text-right ${saldoD?'text-primary':''}">${saldoD ? fmtMoney(saldoD) : '-'}</td>
            <td class="number-cell text-right ${saldoC?'text-primary':''}">${saldoC ? fmtMoney(saldoC) : '-'}</td>
          </tr>`;
        }).join('')}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="3"><strong>TOTALES</strong></td>
          <td class="number-cell text-right"><strong>${fmtMoney(totalDebit)}</strong></td>
          <td class="number-cell text-right"><strong>${fmtMoney(totalCredit)}</strong></td>
          <td class="number-cell text-right"><strong>${fmtMoney(Object.values(debits).map((d,i) => { const c = Object.values(credits)[i]; return d>c?d-c:0; }).reduce((s,v)=>s+v,0))}</strong></td>
          <td class="number-cell text-right"><strong>${fmtMoney(Object.values(credits).map((c,i) => { const d = Object.values(debits)[i]; return c>d?c-d:0; }).reduce((s,v)=>s+v,0))}</strong></td>
        </tr>
        ${!balanced ? `<tr><td colspan="7" class="text-danger text-right">⚠ El libro no cuadra — revisá los asientos</td></tr>` : ''}
      </tfoot>
      </table>
    </div>
  </div>
</div>`;
}

function exportSumasYSaldos() {
  const accounts = DB.getAll('accounts');
  const entries = DB.getAll('journalEntries').filter(e => e.status === 'posted');
  const debits = {}, credits = {};
  accounts.forEach(a => { debits[a.code] = 0; credits[a.code] = 0; });
  entries.forEach(e => e.lines.forEach(l => {
    if (!l.account_code) return;
    debits[l.account_code] = (debits[l.account_code]||0) + (l.debit||0);
    credits[l.account_code] = (credits[l.account_code]||0) + (l.credit||0);
  }));
  exportCSV('sumas_y_saldos.csv',
    ['Código','Cuenta','Tipo','Débitos Acum.','Créditos Acum.','Saldo Deudor','Saldo Acreedor'],
    accounts.sort((a,b)=>a.code.localeCompare(b.code)).filter(a=>debits[a.code]||credits[a.code]).map(a => {
      const d = debits[a.code]||0, c = credits[a.code]||0;
      return [a.code, a.name, a.type, d, c, d>c?d-c:0, c>d?c-d:0];
    })
  );
}

// ---- RESUMEN POR PROYECTO ----
function renderReporteProyecto() {
  const projects = DB.getAll('projects');
  const boqItems = DB.getAll('boqItems');
  const actualCosts = DB.getAll('actualCosts');
  const invoices = DB.getAll('invoices');
  const collections = DB.getAll('collections');
  const certificates = DB.getAll('certificates');

  return `<div class="card">
    <div class="card-header"><span class="card-title"><i class="fas fa-building text-primary"></i> Resumen Ejecutivo por Proyecto</span></div>
    <div class="card-body" style="padding:0"><div class="table-wrap">
      <table><thead><tr>
        <th>Proyecto</th><th>Cliente</th><th>Estado</th>
        <th class="text-right">Presupuesto</th><th class="text-right">Costo Real</th><th class="text-right">Desvío</th>
        <th class="text-right">Certificado</th><th class="text-right">Facturado</th><th class="text-right">Cobrado</th>
      </tr></thead>
      <tbody>
        ${projects.map(p => {
          const boqTotal = boqItems.filter(b=>b.project_id===p.id).reduce((s,b)=>s+b.total,0);
          const actualTotal = actualCosts.filter(a=>a.project_id===p.id).reduce((s,a)=>s+a.amount,0);
          const certTotal = certificates.filter(c=>c.project_id===p.id&&c.status==='approved').reduce((s,c)=>s+c.subtotal,0);
          const invTotal = invoices.filter(i=>i.project_id===p.id).reduce((s,i)=>s+i.total,0);
          const budget = p.budget || boqTotal;
          const deviation = actualTotal - budget;
          const invIds = invoices.filter(i=>i.project_id===p.id).map(i=>i.id);
          const collected = collections.filter(c=>invIds.includes(c.invoice_id)).reduce((s,c)=>s+c.amount,0);

          return `<tr>
            <td><strong>${p.name}</strong></td>
            <td style="font-size:12px">${p.client||'-'}</td>
            <td>${statusBadge(p.status)}</td>
            <td class="number-cell text-right">${fmtMoney(budget)}</td>
            <td class="number-cell text-right">${fmtMoney(actualTotal)}</td>
            <td class="number-cell text-right ${deviation>0?'text-danger':'text-success'}">
              ${deviation>0?'+':''}${fmtMoney(deviation)}
            </td>
            <td class="number-cell text-right">${fmtMoney(certTotal)}</td>
            <td class="number-cell text-right">${fmtMoney(invTotal)}</td>
            <td class="number-cell text-right text-success">${fmtMoney(collected)}</td>
          </tr>`;
        }).join('')}
      </tbody>
      <tfoot><tr class="total-row">
        <td colspan="3"><strong>TOTALES</strong></td>
        <td class="number-cell text-right"><strong>${fmtMoney(projects.reduce((s,p)=>s+(p.budget||0),0))}</strong></td>
        <td class="number-cell text-right"><strong>${fmtMoney(actualCosts.reduce((s,a)=>s+a.amount,0))}</strong></td>
        <td></td>
        <td class="number-cell text-right"><strong>${fmtMoney(certificates.filter(c=>c.status==='approved').reduce((s,c)=>s+c.subtotal,0))}</strong></td>
        <td class="number-cell text-right"><strong>${fmtMoney(invoices.reduce((s,i)=>s+i.total,0))}</strong></td>
        <td class="number-cell text-right"><strong>${fmtMoney(collections.reduce((s,c)=>s+c.amount,0))}</strong></td>
      </tr></tfoot>
    </table></div></div></div>`;
}

// ---- FLUJO PROYECTADO ----
function renderFlujoCaja() {
  const projections = DB.getAll('cashflowProjections');
  const txs = DB.getAll('treasuryTx');
  const projects = DB.getAll('projects');

  const totalIncomeProj = projections.filter(p=>p.type==='income').reduce((s,p)=>s+(p.amount*(p.probability||100)/100),0);
  const totalExpenseProj = projections.filter(p=>p.type==='expense').reduce((s,p)=>s+(p.amount*(p.probability||100)/100),0);

  return `
<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-arrow-down"></i></div><div>
    <div class="stat-value text-success">${fmtMoney(totalIncomeProj)}</div><div class="stat-label">Ingresos Proyectados (ponderado)</div></div></div>
  <div class="stat-card"><div class="stat-icon red"><i class="fas fa-arrow-up"></i></div><div>
    <div class="stat-value text-danger">${fmtMoney(totalExpenseProj)}</div><div class="stat-label">Egresos Proyectados (ponderado)</div></div></div>
  <div class="stat-card"><div class="stat-icon ${totalIncomeProj-totalExpenseProj>=0?'cyan':'red'}"><i class="fas fa-balance-scale"></i></div><div>
    <div class="stat-value ${totalIncomeProj-totalExpenseProj>=0?'text-success':'text-danger'}">${fmtMoney(totalIncomeProj-totalExpenseProj)}</div><div class="stat-label">Resultado Neto Proyectado</div></div></div>
</div>

<div class="card mb-2">
  <div class="card-header">
    <span class="card-title"><i class="fas fa-chart-bar text-primary"></i> Flujo de Caja Proyectado</span>
    <button class="btn btn-sm btn-primary" onclick="openProjectionForm()"><i class="fas fa-plus"></i> Proyección</button>
  </div>
  <div class="card-body"><div style="height:280px"><canvas id="flujo-chart"></canvas></div></div>
</div>

<div class="card">
  <div class="card-header"><span class="card-title">Detalle de Proyecciones</span></div>
  <div class="card-body" style="padding:0"><div class="table-wrap">
    <table><thead><tr>
      <th>Fecha Esperada</th><th>Tipo</th><th>Proyecto</th><th>Descripción</th><th>Categoría</th>
      <th class="text-right">Monto</th><th class="text-right">Probabilidad</th><th class="text-right">Ponderado</th><th>Acciones</th>
    </tr></thead>
    <tbody>
      ${projections.sort((a,b)=>a.expected_date.localeCompare(b.expected_date)).map(p => {
        const proj = projects.find(x=>x.id===p.project_id);
        const ponderado = p.amount * (p.probability||100) / 100;
        return `<tr>
          <td>${fmtDate(p.expected_date)}</td>
          <td>${statusBadge(p.type)}</td>
          <td style="font-size:11px">${proj?.name||'-'}</td>
          <td>${p.description}</td>
          <td><span class="badge badge-gray">${p.category||'-'}</span></td>
          <td class="number-cell text-right">${fmtMoney(p.amount)}</td>
          <td class="text-right">
            <div class="progress-bar" style="width:80px;display:inline-block">
              <div class="progress-fill ${p.probability>=80?'green':p.probability>=50?'':''}" style="width:${p.probability||100}%"></div>
            </div>
            <span style="font-size:11px;margin-left:4px">${p.probability||100}%</span>
          </td>
          <td class="number-cell text-right ${p.type==='income'?'text-success':'text-danger'}"><strong>${fmtMoney(ponderado)}</strong></td>
          <td><button class="btn-ghost btn btn-sm danger" onclick="deleteProjection('${p.id}')"><i class="fas fa-trash"></i></button></td>
        </tr>`;
      }).join('')}
    </tbody></table>
  </div></div>
</div>`;
}

function renderFlujoCajaChart() {
  const ctx = document.getElementById('flujo-chart');
  if (!ctx) return;
  const projections = DB.getAll('cashflowProjections');

  // Group by month
  const months = {};
  projections.forEach(p => {
    const m = p.expected_date?.slice(0,7) || '';
    if (!m) return;
    if (!months[m]) months[m] = { income: 0, expense: 0 };
    const val = p.amount * (p.probability||100) / 100;
    if (p.type === 'income') months[m].income += val;
    else months[m].expense += val;
  });

  const labels = Object.keys(months).sort().map(m => {
    const d = new Date(m + '-01');
    return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
  });
  const income = Object.keys(months).sort().map(m => months[m].income);
  const expense = Object.keys(months).sort().map(m => months[m].expense);
  const net = income.map((v,i) => v - expense[i]);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Ingresos', data: income, backgroundColor: 'rgba(16,185,129,.7)', borderRadius: 4 },
        { label: 'Egresos', data: expense, backgroundColor: 'rgba(239,68,68,.7)', borderRadius: 4 },
        { label: 'Neto', data: net, type: 'line', borderColor: '#2563eb', backgroundColor: 'transparent', tension: .4, pointRadius: 4 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { font: { size: 11 } } } },
      scales: {
        y: { ticks: { callback: v => fmtMoney(v), font: { size: 10 } }, grid: { color: '#f1f5f9' } },
        x: { ticks: { font: { size: 10 } }, grid: { display: false } }
      }
    }
  });
}

function openProjectionForm() {
  const projects = DB.getAll('projects');
  openModal('Nueva Proyección de Flujo', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Tipo *</label>
    <select class="form-control" id="pj-type">
      <option value="income">Ingreso</option>
      <option value="expense">Egreso</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Categoría</label>
    <input class="form-control" id="pj-cat" placeholder="Certificación, Pago proveedor...">
  </div>
  <div class="form-group full">
    <label class="form-label">Descripción *</label>
    <input class="form-control" id="pj-desc" placeholder="Descripción de la proyección">
  </div>
  <div class="form-group">
    <label class="form-label">Proyecto</label>
    <select class="form-control" id="pj-proj">
      <option value="">Sin proyecto</option>
      ${projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Fecha Esperada</label>
    <input class="form-control" id="pj-date" type="date" value="${todayStr()}">
  </div>
  <div class="form-group">
    <label class="form-label">Monto *</label>
    <input class="form-control" id="pj-amount" type="number" min="0" placeholder="0">
  </div>
  <div class="form-group">
    <label class="form-label">Probabilidad (%)</label>
    <input class="form-control" id="pj-prob" type="number" min="0" max="100" value="80">
  </div>
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveProjection()"><i class="fas fa-save"></i> Guardar</button>
`);
}

function saveProjection() {
  const desc = document.getElementById('pj-desc').value.trim();
  const amount = parseFloat(document.getElementById('pj-amount').value);
  if (!desc || !amount) { toast('Descripción y monto son obligatorios', 'error'); return; }

  DB.insert('cashflowProjections', {
    type: document.getElementById('pj-type').value,
    category: document.getElementById('pj-cat').value.trim(),
    description: desc,
    project_id: document.getElementById('pj-proj').value || '',
    expected_date: document.getElementById('pj-date').value,
    amount,
    probability: parseInt(document.getElementById('pj-prob').value) || 80,
  });
  toast('Proyección guardada', 'success');
  closeModal();
  renderReportes();
}

function deleteProjection(id) {
  confirmDialog('¿Eliminar esta proyección?', () => {
    DB.remove('cashflowProjections', id);
    toast('Proyección eliminada', 'warning');
    renderReportes();
  });
}

// ---- CERTIFICACIONES REPORT ----
function renderReporteCertificaciones() {
  const certs = DB.getAll('certificates');
  const projects = DB.getAll('projects');

  const byProject = {};
  certs.forEach(c => {
    if (!byProject[c.project_id]) byProject[c.project_id] = { approved: 0, pending: 0, totalCert: 0, totalRet: 0 };
    if (c.status === 'approved') { byProject[c.project_id].approved++; byProject[c.project_id].totalCert += c.subtotal; byProject[c.project_id].totalRet += c.retention_amount||0; }
    if (c.status === 'pending') byProject[c.project_id].pending++;
  });

  return `<div class="card"><div class="card-header"><span class="card-title"><i class="fas fa-certificate text-primary"></i> Estado de Certificaciones por Proyecto</span></div>
  <div class="card-body" style="padding:0"><div class="table-wrap">
    <table><thead><tr>
      <th>Proyecto</th><th>Presupuesto</th><th>Certificados Aprobados</th><th>Pendientes</th>
      <th class="text-right">Total Certificado</th><th class="text-right">Fondo Reparo</th><th class="text-right">% Avance</th>
    </tr></thead>
    <tbody>
      ${projects.map(p => {
        const data = byProject[p.id] || { approved:0, pending:0, totalCert:0, totalRet:0 };
        const pct = p.budget ? Math.min(100, data.totalCert / p.budget * 100) : 0;
        return `<tr>
          <td><strong>${p.name}</strong></td>
          <td>${fmtMoney(p.budget||0)}</td>
          <td>${data.approved}</td>
          <td>${data.pending}</td>
          <td class="number-cell text-right">${fmtMoney(data.totalCert)}</td>
          <td class="number-cell text-right text-warning">${fmtMoney(data.totalRet)}</td>
          <td>
            <div class="progress-bar"><div class="progress-fill ${pct>=80?'green':''}" style="width:${pct}%"></div></div>
            <span style="font-size:11px">${fmtPct(pct)}</span>
          </td>
        </tr>`;
      }).join('')}
    </tbody></table>
  </div></div></div>`;
}

// ---- AGING REPORT ----
function renderReporteAging() {
  const invoices = DB.getAll('invoices');
  const collections = DB.getAll('collections');
  const today = todayStr();
  const open = invoices.filter(i => ['sent','overdue'].includes(i.status));

  const buckets = [
    { label: 'Al día', min: null, max: 0, total: 0, count: 0 },
    { label: '1-30 días', min: 1, max: 30, total: 0, count: 0 },
    { label: '31-60 días', min: 31, max: 60, total: 0, count: 0 },
    { label: '61-90 días', min: 61, max: 90, total: 0, count: 0 },
    { label: '+90 días', min: 91, max: null, total: 0, count: 0 },
  ];

  open.forEach(inv => {
    const cobrado = collections.filter(c=>c.invoice_id===inv.id).reduce((s,c)=>s+c.amount,0);
    const balance = inv.total - cobrado;
    if (balance <= 0) return;
    const days = inv.due_date < today ? daysBetween(inv.due_date, today) : 0;
    const bucket = buckets.find(b => (b.max === null || days <= b.max) && (b.min === null || days >= b.min));
    if (bucket) { bucket.total += balance; bucket.count++; }
  });

  const grandTotal = buckets.reduce((s,b)=>s+b.total,0);

  return `<div class="card"><div class="card-header"><span class="card-title"><i class="fas fa-clock text-warning"></i> Aging de Deudores</span></div>
  <div class="card-body" style="padding:0"><div class="table-wrap">
    <table><thead><tr><th>Rango</th><th>Facturas</th><th class="text-right">Saldo</th><th class="text-right">% del Total</th><th>Distribución</th></tr></thead>
    <tbody>
      ${buckets.map((b,i) => {
        const pct = grandTotal ? b.total/grandTotal*100 : 0;
        return `<tr>
          <td><strong>${b.label}</strong></td>
          <td>${b.count}</td>
          <td class="number-cell text-right ${i>0&&b.total>0?'text-danger':''}">${fmtMoney(b.total)}</td>
          <td class="text-right">${fmtPct(pct)}</td>
          <td><div class="progress-bar"><div class="progress-fill ${i>=3?'red':i>=1?'yellow':''}" style="width:${pct}%"></div></div></td>
        </tr>`;
      }).join('')}
    </tbody>
    <tfoot><tr class="total-row"><td><strong>TOTAL</strong></td><td>${open.length}</td><td class="number-cell text-right"><strong>${fmtMoney(grandTotal)}</strong></td><td colspan="2"></td></tr></tfoot>
    </table>
  </div></div></div>`;
}

// ---- COMPRAS REPORT ----
function renderReporteCompras() {
  const pos = DB.getAll('purchaseOrders');
  const suppliers = DB.getAll('suppliers');
  const projects = DB.getAll('projects');

  const totalPOs = pos.reduce((s,o)=>s+o.total,0);
  const byStatus = {};
  pos.forEach(o => { byStatus[o.status] = (byStatus[o.status]||0) + o.total; });

  const bySupplier = {};
  pos.forEach(o => {
    const s = suppliers.find(s=>s.id===o.supplier_id)?.name||'Desconocido';
    bySupplier[s] = (bySupplier[s]||0) + o.total;
  });

  return `
<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-shopping-cart"></i></div><div>
    <div class="stat-value">${pos.length}</div><div class="stat-label">Órdenes de Compra</div></div></div>
  <div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-dollar-sign"></i></div><div>
    <div class="stat-value">${fmtMoney(totalPOs)}</div><div class="stat-label">Monto Total Compras</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check"></i></div><div>
    <div class="stat-value">${fmtMoney(byStatus['received']||0)}</div><div class="stat-label">Recibido</div></div></div>
</div>

<div class="card"><div class="card-header"><span class="card-title"><i class="fas fa-chart-bar text-primary"></i> Compras por Proveedor</span></div>
<div class="card-body" style="padding:0"><div class="table-wrap">
  <table><thead><tr><th>Proveedor</th><th class="text-right">Total Comprado</th><th class="text-right">% del Total</th><th>Participación</th></tr></thead>
  <tbody>
    ${Object.entries(bySupplier).sort((a,b)=>b[1]-a[1]).map(([name, total]) => {
      const pct = totalPOs ? total/totalPOs*100 : 0;
      return `<tr>
        <td><strong>${name}</strong></td>
        <td class="number-cell text-right">${fmtMoney(total)}</td>
        <td class="text-right">${fmtPct(pct)}</td>
        <td><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div></td>
      </tr>`;
    }).join('')}
  </tbody>
  <tfoot><tr class="total-row"><td>TOTAL</td><td class="number-cell text-right">${fmtMoney(totalPOs)}</td><td colspan="2"></td></tr></tfoot>
  </table>
</div></div></div>`;
}
