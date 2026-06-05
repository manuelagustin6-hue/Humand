/* ===== COBRANZAS ===== */
function renderCobranzas() {
  const invoices = DB.getAll('invoices');
  const collections = DB.getAll('collections');
  const projects = DB.getAll('projects');

  const totalInvoiced = invoices.filter(i => i.status !== 'cancelled').reduce((s,i) => s+i.total, 0);
  const totalCollected = collections.reduce((s,c) => s+c.amount, 0);
  const totalPending = invoices.filter(i => ['sent','overdue'].includes(i.status)).reduce((s,i) => {
    const cobrado = collections.filter(c => c.invoice_id === i.id).reduce((s2,c) => s2+c.amount, 0);
    return s + (i.total - cobrado);
  }, 0);
  const overdueAmt = invoices.filter(i => i.status === 'overdue').reduce((s,i) => s+i.total, 0);

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Cobranzas</div>
    <div class="page-subtitle">Gestión de cobros, aging de deudores y seguimiento de pagos</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-primary" onclick="openCollectionForm()"><i class="fas fa-plus"></i> Registrar Cobro</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-file-invoice"></i></div><div>
    <div class="stat-value">${fmtMoney(totalInvoiced)}</div><div class="stat-label">Total Facturado</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div><div>
    <div class="stat-value">${fmtMoney(totalCollected)}</div>
    <div class="stat-label">Total Cobrado</div>
    <div class="stat-delta up">${fmtPct(totalInvoiced ? totalCollected/totalInvoiced*100 : 0)} de efectividad</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-clock"></i></div><div>
    <div class="stat-value">${fmtMoney(totalPending)}</div><div class="stat-label">Pendiente de Cobro</div></div></div>
  <div class="stat-card"><div class="stat-icon red"><i class="fas fa-exclamation-triangle"></i></div><div>
    <div class="stat-value">${fmtMoney(overdueAmt)}</div><div class="stat-label">Deuda Vencida</div></div></div>
</div>

<div id="cobr-tabs">
  <div class="tabs">
    <button class="tab-btn" data-tab="tab-aging">Aging de Deudores</button>
    <button class="tab-btn" data-tab="tab-cobros">Cobros Registrados</button>
    <button class="tab-btn" data-tab="tab-open">Facturas Abiertas</button>
  </div>

  <div id="tab-aging" class="tab-content">
    ${renderAging(invoices, collections, projects)}
  </div>
  <div id="tab-cobros" class="tab-content">
    ${renderCollectionsTable(collections, invoices, projects)}
  </div>
  <div id="tab-open" class="tab-content">
    ${renderOpenInvoices(invoices, collections, projects)}
  </div>
</div>
  `;

  initTabs('cobr-tabs');
}

// ---- AGING REPORT ----
function renderAging(invoices, collections, projects) {
  const today = todayStr();
  const openInvoices = invoices.filter(i => ['sent','overdue'].includes(i.status));

  const agingBuckets = {
    current: { label: 'Al día (no vencidas)', invoices: [], total: 0 },
    '1_30': { label: '1-30 días', invoices: [], total: 0 },
    '31_60': { label: '31-60 días', invoices: [], total: 0 },
    '61_90': { label: '61-90 días', invoices: [], total: 0 },
    '90_plus': { label: 'Más de 90 días', invoices: [], total: 0 },
  };

  openInvoices.forEach(inv => {
    const collected = collections.filter(c => c.invoice_id === inv.id).reduce((s,c) => s+c.amount, 0);
    const balance = inv.total - collected;
    if (balance <= 0) return;
    const daysOverdue = inv.due_date < today ? daysBetween(inv.due_date, today) : 0;
    let bucket;
    if (daysOverdue === 0) bucket = 'current';
    else if (daysOverdue <= 30) bucket = '1_30';
    else if (daysOverdue <= 60) bucket = '31_60';
    else if (daysOverdue <= 90) bucket = '61_90';
    else bucket = '90_plus';
    agingBuckets[bucket].invoices.push({ ...inv, balance, daysOverdue });
    agingBuckets[bucket].total += balance;
  });

  const grandTotal = Object.values(agingBuckets).reduce((s,b) => s+b.total, 0);

  return `
<div class="card mb-2">
  <div class="card-header"><span class="card-title"><i class="fas fa-clock text-warning"></i> Reporte de Aging — Deudores</span></div>
  <div class="card-body" style="padding:0">
    <div class="table-wrap">
      <table><thead><tr>
        <th>Bucket</th><th>Cant.</th><th class="text-right">Saldo</th><th class="text-right">% del Total</th><th>Distribución</th>
      </tr></thead>
      <tbody>
        ${Object.entries(agingBuckets).map(([key, b]) => {
          const pct = grandTotal ? (b.total / grandTotal * 100) : 0;
          const colorMap = { current: '', '1_30': 'yellow', '31_60': 'yellow', '61_90': 'red', '90_plus': 'red' };
          return `<tr>
            <td><strong>${b.label}</strong></td>
            <td>${b.invoices.length}</td>
            <td class="number-cell text-right ${key !== 'current' && b.total > 0 ? 'text-danger' : ''}">${fmtMoney(b.total)}</td>
            <td class="text-right">${fmtPct(pct)}</td>
            <td style="min-width:150px">
              <div class="progress-bar"><div class="progress-fill ${colorMap[key]}" style="width:${pct}%"></div></div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
      <tfoot><tr class="total-row">
        <td><strong>TOTAL</strong></td>
        <td>${openInvoices.length}</td>
        <td class="number-cell text-right"><strong>${fmtMoney(grandTotal)}</strong></td>
        <td colspan="2"></td>
      </tr></tfoot>
    </table>
  </div>
</div>

<!-- Desglose de vencidas -->
${Object.entries(agingBuckets).filter(([k]) => k !== 'current').map(([key, b]) => {
  if (!b.invoices.length) return '';
  return `
<div class="card mb-2">
  <div class="card-header"><span class="card-title text-danger"><i class="fas fa-exclamation-circle"></i> ${b.label}</span></div>
  <div class="card-body" style="padding:0"><div class="table-wrap"><table>
    <thead><tr><th>Factura</th><th>Proyecto</th><th>Cliente</th><th>Vencimiento</th><th>Días mora</th><th class="text-right">Saldo</th><th>Acciones</th></tr></thead>
    <tbody>
      ${b.invoices.map(inv => {
        const proj = DB.getById('projects', inv.project_id);
        return `<tr>
          <td><strong>${inv.number}</strong></td>
          <td>${proj?.name || '-'}</td>
          <td>${inv.client_name}</td>
          <td class="text-danger">${fmtDate(inv.due_date)}</td>
          <td class="text-danger fw-bold">${inv.daysOverdue} días</td>
          <td class="number-cell text-right text-danger"><strong>${fmtMoney(inv.balance)}</strong></td>
          <td><button class="btn btn-sm btn-success" onclick="openCollectionForm('${inv.id}')"><i class="fas fa-dollar-sign"></i> Cobrar</button></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table></div></div>
</div>`;
}).join('')}
</div>`;
}

// ---- COLLECTIONS TABLE ----
function renderCollectionsTable(collections, invoices, projects) {
  if (!collections.length) return `<div class="empty-state"><i class="fas fa-hand-holding-dollar"></i><p>No hay cobros registrados</p></div>`;

  return `<div class="card"><div class="card-body" style="padding:0"><div class="table-wrap">
    <table><thead><tr>
      <th>Fecha</th><th>Factura</th><th>Proyecto</th><th>Método</th><th>Referencia</th><th class="text-right">Importe</th><th>Acciones</th>
    </tr></thead>
    <tbody>
      ${collections.slice().reverse().map(c => {
        const inv = invoices.find(i => i.id === c.invoice_id);
        const proj = inv ? projects.find(p => p.id === inv.project_id) : null;
        return `<tr>
          <td>${fmtDate(c.date)}</td>
          <td>${inv?.number || '-'}</td>
          <td>${proj?.name || '-'}</td>
          <td><span class="badge badge-green">${c.method}</span></td>
          <td><span style="font-size:11px;color:var(--text-muted)">${c.reference || '-'}</span></td>
          <td class="number-cell text-right"><strong>${fmtMoney(c.amount)}</strong></td>
          <td><button class="btn-ghost btn btn-sm danger" onclick="deleteCollection('${c.id}')"><i class="fas fa-trash"></i></button></td>
        </tr>`;
      }).join('')}
    </tbody>
    <tfoot><tr class="total-row">
      <td colspan="5">Total Cobrado</td>
      <td class="number-cell text-right">${fmtMoney(collections.reduce((s,c) => s+c.amount, 0))}</td>
      <td></td>
    </tr></tfoot>
    </table>
  </div></div></div>`;
}

// ---- OPEN INVOICES ----
function renderOpenInvoices(invoices, collections, projects) {
  const open = invoices.filter(i => ['sent','overdue','draft'].includes(i.status));
  if (!open.length) return `<div class="empty-state"><i class="fas fa-check-circle" style="color:var(--success);opacity:1"></i><p>¡Todas las facturas están cobradas!</p></div>`;

  return `<div class="card"><div class="card-body" style="padding:0"><div class="table-wrap">
    <table><thead><tr>
      <th>Factura</th><th>Proyecto</th><th>Cliente</th><th>Emisión</th><th>Vencimiento</th>
      <th class="text-right">Total</th><th class="text-right">Cobrado</th><th class="text-right">Saldo</th><th>Estado</th><th>Acciones</th>
    </tr></thead>
    <tbody>
      ${open.map(inv => {
        const proj = projects.find(p => p.id === inv.project_id);
        const cobrado = collections.filter(c => c.invoice_id === inv.id).reduce((s,c) => s+c.amount, 0);
        const saldo = inv.total - cobrado;
        return `<tr>
          <td><strong>${inv.number}</strong></td>
          <td>${proj?.name || '-'}</td>
          <td>${inv.client_name}</td>
          <td>${fmtDate(inv.date)}</td>
          <td class="${isOverdue(inv.due_date) ? 'text-danger fw-bold' : ''}">${fmtDate(inv.due_date)}</td>
          <td class="number-cell text-right">${fmtMoney(inv.total)}</td>
          <td class="number-cell text-right text-success">${fmtMoney(cobrado)}</td>
          <td class="number-cell text-right ${saldo > 0 ? 'text-danger' : 'text-success'}"><strong>${fmtMoney(saldo)}</strong></td>
          <td>${statusBadge(inv.status)}</td>
          <td><button class="btn btn-sm btn-success" onclick="openCollectionForm('${inv.id}')"><i class="fas fa-dollar-sign"></i> Cobrar</button></td>
        </tr>`;
      }).join('')}
    </tbody>
    </table>
  </div></div></div>`;
}

function openCollectionForm(invoiceId = null) {
  const invoices = DB.getAll('invoices').filter(i => ['sent','overdue'].includes(i.status));
  const projects = DB.getAll('projects');

  openModal('Registrar Cobro', `
<div class="form-grid form-grid-2">
  <div class="form-group full">
    <label class="form-label">Factura *</label>
    <select class="form-control" id="cf-invoice" onchange="updateCollectionBalance(this.value)">
      <option value="">Seleccionar...</option>
      ${invoices.map(i => {
        const p = projects.find(p => p.id === i.project_id);
        return `<option value="${i.id}" ${i.id===invoiceId?'selected':''}>${i.number} — ${i.client_name} — ${fmtMoney(i.total)}</option>`;
      }).join('')}
    </select>
  </div>
  <div class="form-group full" id="collection-balance-info"></div>
  <div class="form-group">
    <label class="form-label">Importe Cobrado *</label>
    <input class="form-control" id="cf-amount" type="number" min="0" placeholder="0">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha del Cobro</label>
    <input class="form-control" id="cf-date" type="date" value="${todayStr()}">
  </div>
  <div class="form-group">
    <label class="form-label">Método de Pago</label>
    <select class="form-control" id="cf-method">
      <option value="transfer">Transferencia bancaria</option>
      <option value="check">Cheque</option>
      <option value="cash">Efectivo</option>
      <option value="other">Otro</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Referencia / N° Operación</label>
    <input class="form-control" id="cf-ref" placeholder="TRF-20250415, CHQ-001122...">
  </div>
  <div class="form-group full">
    <label class="form-label">Notas</label>
    <textarea class="form-control" id="cf-notes" rows="2"></textarea>
  </div>
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-success" onclick="saveCollection()"><i class="fas fa-save"></i> Registrar Cobro</button>
`);

  if (invoiceId) setTimeout(() => updateCollectionBalance(invoiceId), 50);
}

function updateCollectionBalance(invoiceId) {
  if (!invoiceId) return;
  const inv = DB.getById('invoices', invoiceId);
  if (!inv) return;
  const cobrado = DB.getAll('collections').filter(c => c.invoice_id === invoiceId).reduce((s,c) => s+c.amount, 0);
  const saldo = inv.total - cobrado;
  const info = document.getElementById('collection-balance-info');
  if (info) {
    info.innerHTML = `<div style="display:flex;gap:20px;font-size:12px;background:var(--bg);padding:10px;border-radius:6px">
      <span>Total factura: <strong>${fmtMoney(inv.total)}</strong></span>
      <span>Ya cobrado: <strong class="text-success">${fmtMoney(cobrado)}</strong></span>
      <span>Saldo a cobrar: <strong class="text-danger">${fmtMoney(saldo)}</strong></span>
    </div>`;
    const amtEl = document.getElementById('cf-amount');
    if (amtEl && !amtEl.value) amtEl.value = saldo;
  }
}

function saveCollection() {
  const invoiceId = document.getElementById('cf-invoice').value;
  const amount = parseFloat(document.getElementById('cf-amount').value);
  if (!invoiceId || !amount) { toast('Factura e importe son obligatorios', 'error'); return; }

  const inv = DB.getById('invoices', invoiceId);

  DB.insert('collections', {
    invoice_id: invoiceId,
    project_id: inv?.project_id || '',
    amount,
    date: document.getElementById('cf-date').value,
    method: document.getElementById('cf-method').value,
    reference: document.getElementById('cf-ref').value.trim(),
    notes: document.getElementById('cf-notes').value.trim(),
  });

  // Check if fully paid
  const allCollected = DB.getAll('collections').filter(c => c.invoice_id === invoiceId).reduce((s,c) => s+c.amount, 0);
  if (inv && allCollected >= inv.total) {
    DB.update('invoices', invoiceId, { status: 'paid' });
    toast('¡Factura cobrada en su totalidad!', 'success');
  } else {
    toast('Cobro registrado', 'success');
  }

  closeModal();
  renderCobranzas();
}

function deleteCollection(id) {
  confirmDialog('¿Eliminar este cobro?', () => {
    DB.remove('collections', id);
    toast('Cobro eliminado', 'warning');
    renderCobranzas();
  });
}
