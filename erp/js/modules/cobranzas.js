/* ===== COBRANZAS ===== */
function renderCobranzas() {
  if (typeof DB.ensureAllCompaniesLoaded === 'function' && !window._cobLoadedAll) {
    window._cobLoadedAll = true;
    DB.ensureAllCompaniesLoaded().then(function(ok){ if (ok) { try { renderCobranzas(); } catch(e) {} } });
  }
  const _rk = 'cobranzas';
  const invoices = rsScoped('invoices', _rk);
  let collections = filterByActiveProject((typeof DB.getAllConsolidated === 'function') ? DB.getAllConsolidated('collections') : DB.getAll('collections'), function(c) {
    return c.project_id || (DB.getById('invoices', c.invoice_id) || {}).project_id || '';
  });
  if (rsGet(_rk)) collections = collections.filter(function(c){ return c._company_id === rsGet(_rk); });
  const projects = (typeof DB.getAllProjectsConsolidated === 'function') ? DB.getAllProjectsConsolidated() : DB.getAll('projects');
  const _multiCur = rsIsAll(_rk) && Object.keys(invoices.reduce(function(m,i){ m[rsCur(i)]=1; return m; }, {})).length > 1;

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
    <div class="page-eyebrow"><i class="fas fa-hand-holding-dollar" style="font-size:14px"></i> Clientes</div>
    <div class="page-title">Cobranzas</div>
    <div class="page-subtitle">Gestión de cobros, aging de deudores y seguimiento de pagos</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="exportCobranzas()"><i class="fas fa-download"></i> Exportar</button>
    <button class="btn btn-primary" onclick="openCollectionForm()"><i class="fas fa-plus"></i> Registrar Cobro</button>
  </div>
</div>

${rsSelectorHtml('cobranzas', _multiCur ? '<span style="font-size:11px;color:var(--warning)"><i class="fas fa-triangle-exclamation"></i> Montos en varias monedas — filtrá por razón social para totales exactos</span>' : '')}

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
  if (!collections.length) return '<div class="empty-state"><i class="fas fa-hand-holding-dollar"></i><p>No hay cobros registrados</p></div>';

  var TIPO_LABEL = { factura: 'Factura', cuota_formal: 'Cuota c/IVA', cuota_informal: 'Cuota s/IVA' };
  var sorted = collections.slice().reverse();
  var totalAmt = collections.reduce(function(s,c) { return s+c.amount; }, 0);

  return '<div class="card"><div class="card-body" style="padding:0"><div class="table-wrap">' +
    '<table><thead><tr>' +
    '<th>Fecha</th><th>Tipo</th><th>Factura / Cuota</th><th>Cliente</th><th>Proyecto</th>' +
    '<th>Método</th><th style="text-align:right">Neto</th><th style="text-align:right">IVA</th><th style="text-align:right">Total</th><th></th>' +
    '</tr></thead><tbody>' +
    sorted.map(function(c) {
      var inv     = c.invoice_id ? invoices.find(function(i) { return i.id === c.invoice_id; }) : null;
      var projId  = c.project_id || (inv && inv.project_id) || '';
      var proj    = projId ? projects.find(function(p) { return p.id === projId; }) : null;
      var tipo    = c.tipo_cobranza || 'factura';
      var tipoBadge = tipo === 'cuota_formal'
        ? '<span class="badge badge-blue" style="font-size:10px">Cuota c/IVA</span>'
        : tipo === 'cuota_informal'
        ? '<span class="badge badge-gray" style="font-size:10px">Cuota s/IVA</span>'
        : '<span class="badge badge-green" style="font-size:10px">Factura</span>';
      var ref     = inv ? escapeHtml(inv.number) : (c.reference ? escapeHtml(c.reference) : '—');
      var client  = c.client_name || (inv && inv.client_name) || '—';
      var neto    = c.iva_incluido ? (c.neto || 0) : c.amount;
      var ivaAmt  = c.iva_incluido ? (c.iva_amount || 0) : 0;
      return '<tr>' +
        '<td style="white-space:nowrap">' + fmtDate(c.date) + '</td>' +
        '<td>' + tipoBadge + '</td>' +
        '<td><strong>' + ref + '</strong></td>' +
        '<td style="font-size:12px">' + escapeHtml(client) + '</td>' +
        '<td style="font-size:12px">' + escapeHtml(proj ? proj.name : '—') + '</td>' +
        '<td><span class="badge badge-gray" style="font-size:10px">' + escapeHtml(c.method || '') + '</span></td>' +
        '<td style="text-align:right;font-size:12px">' + fmtMoney(neto) + '</td>' +
        '<td style="text-align:right;font-size:12px;color:' + (ivaAmt > 0 ? 'var(--warning)' : 'var(--text-muted)') + '">' + (ivaAmt > 0 ? fmtMoney(ivaAmt) : '—') + '</td>' +
        '<td style="text-align:right"><strong>' + fmtMoney(c.amount) + '</strong></td>' +
        '<td><div class="table-actions">' +
          '<button class="btn-ghost btn btn-sm" title="Recibo PDF" onclick="printRecibo(\'' + c.id + '\')"><i class="fas fa-file-pdf"></i></button>' +
          '<button class="btn-ghost btn btn-sm danger" onclick="deleteCollection(\'' + c.id + '\')"><i class="fas fa-trash"></i></button>' +
        '</div></td>' +
      '</tr>';
    }).join('') +
    '</tbody><tfoot><tr class="total-row"><td colspan="8">Total Cobrado</td>' +
    '<td style="text-align:right"><strong>' + fmtMoney(totalAmt) + '</strong></td><td></td></tr></tfoot>' +
    '</table></div></div></div>';
}

// ---- OPEN INVOICES ----
function renderOpenInvoices(invoices, collections, projects) {
  const open = invoices.filter(i => ['sent','overdue'].includes(i.status)); // criterio unificado con aging/KPIs (draft no es factura abierta)
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

function _cobrCompanyOpts(selId) {
  try {
    return DB.getAllCompanies().map(function(c) {
      return '<option value="' + c.id + '"' + (selId === c.id ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>';
    }).join('');
  } catch(e) { return ''; }
}

function openCollectionForm(invoiceId) {
  invoiceId = invoiceId || null;
  if (invoiceId) rsEnsureCompany('invoices', invoiceId);
  const invoices = DB.getAll('invoices').filter(function(i) { return ['sent','overdue'].includes(i.status); });
  const projects = DB.getAll('projects');
  const tipo = invoiceId ? 'factura' : 'factura';

  openModal('Registrar Cobro', `
<div class="form-grid form-grid-2">

  <div class="form-group full">
    <label class="form-label">Tipo de cobro</label>
    <select class="form-control" id="cf-tipo" onchange="cobrTipoChange()">
      <option value="factura">Cobro de factura emitida</option>
      <option value="cuota_formal">Cuota / anticipo con IVA (declarable AFIP)</option>
      <option value="cuota_informal">Cuota / anticipo informal (sin IVA)</option>
    </select>
  </div>

  <!-- Sección: cobro de factura -->
  <div id="cf-sec-factura" class="form-group full" style="margin:0">
    <label class="form-label">Factura *</label>
    <select class="form-control" id="cf-invoice" onchange="updateCollectionBalance(this.value)">
      <option value="">Seleccionar...</option>
      ${invoices.map(function(i) {
        return '<option value="'+i.id+'"'+(i.id===invoiceId?' selected':'')+'>'+escapeHtml(i.number)+' — '+escapeHtml(i.client_name)+' — '+fmtMoney(i.total)+'</option>';
      }).join('')}
    </select>
    <div id="collection-balance-info" style="margin-top:6px"></div>
  </div>

  <!-- Sección: cuota sin factura -->
  <div id="cf-sec-cuota" style="display:none;grid-column:1/-1;display:none">
    <div class="form-grid form-grid-2" style="margin:0">
      <div class="form-group">
        <label class="form-label">Razón Social / Comprador *</label>
        <input class="form-control" id="cf-client" placeholder="Nombre del comprador">
      </div>
      <div class="form-group">
        <label class="form-label">CUIT Comprador</label>
        <input class="form-control" id="cf-cuit" placeholder="20-12345678-9">
      </div>
      <div class="form-group full">
        <label class="form-label">Proyecto</label>
        <select class="form-control" id="cf-project-cuota">
          <option value="">Sin proyecto</option>
          ${projects.map(function(p) { return '<option value="'+p.id+'">'+escapeHtml(p.name)+'</option>'; }).join('')}
        </select>
      </div>
    </div>
  </div>

  <!-- Empresa del grupo -->
  <div class="form-group">
    <label class="form-label">Empresa del Grupo</label>
    <select class="form-control" id="cf-company">
      <option value="">Sin empresa asignada</option>
      ${_cobrCompanyOpts('')}
    </select>
  </div>

  <!-- IVA (solo para cuota_formal) -->
  <div class="form-group" id="cf-iva-field" style="display:none">
    <label class="form-label">Alícuota IVA</label>
    <select class="form-control" id="cf-iva-rate" onchange="cobrIvaCalc()">
      <option value="10.5">10,5% (Vivienda)</option>
      <option value="21" >21% (Comercial)</option>
      <option value="27" >27%</option>
    </select>
  </div>

  <!-- Importe -->
  <div class="form-group">
    <label class="form-label">Importe Cobrado * <span id="cf-iva-label" style="font-size:11px;color:var(--primary)"></span></label>
    <input class="form-control" id="cf-amount" type="text" inputmode="decimal" placeholder="0,00" onfocus="var n=numParse(this.value);this.value=n?n:''" onblur="this.value=numFmt(numParse(this.value))" oninput="cobrIvaCalc()">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha del Cobro</label>
    <input class="form-control" id="cf-date" type="date" value="${todayStr()}">
  </div>

  <!-- Desglose IVA (visible solo cuota formal) -->
  <div class="form-group full" id="cf-iva-preview" style="display:none">
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:10px 14px;font-size:12px;display:flex;gap:24px;flex-wrap:wrap">
      <span>Neto gravado: <strong id="cf-iva-neto">—</strong></span>
      <span>IVA: <strong id="cf-iva-amt">—</strong></span>
      <span style="color:var(--primary)">→ Declarable en IVA Ventas del período</span>
    </div>
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
    <label class="form-label">Cuenta / Caja que recibe</label>
    <select class="form-control" id="cf-account">
      <option value="">— No registrar en Tesorería —</option>
      ${DB.getAll('bankAccounts').map(a => `<option value="${a.id}">${escapeHtml(a.name)} (${a.currency||'ARS'})</option>`).join('')}
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

  if (invoiceId) setTimeout(function() { updateCollectionBalance(invoiceId); }, 50);
}

function cobrTipoChange() {
  var tipo = document.getElementById('cf-tipo')?.value || 'factura';
  var secFac  = document.getElementById('cf-sec-factura');
  var secCuota= document.getElementById('cf-sec-cuota');
  var ivaField= document.getElementById('cf-iva-field');
  var ivaPrev = document.getElementById('cf-iva-preview');
  var ivaLabel= document.getElementById('cf-iva-label');

  var esFact  = tipo === 'factura';
  var esFormal= tipo === 'cuota_formal';

  if (secFac)   secFac.style.display   = esFact    ? '' : 'none';
  if (secCuota) secCuota.style.display = !esFact   ? '' : 'none';
  if (ivaField) ivaField.style.display = esFormal  ? '' : 'none';
  if (ivaPrev)  ivaPrev.style.display  = esFormal  ? '' : 'none';
  if (ivaLabel) ivaLabel.textContent   = esFormal  ? '(IVA incluido)' : '';
  cobrIvaCalc();
}

function cobrIvaCalc() {
  var tipo  = document.getElementById('cf-tipo')?.value || 'factura';
  if (tipo !== 'cuota_formal') return;
  var total = numParse(document.getElementById('cf-amount')?.value);
  var rate  = parseFloat(document.getElementById('cf-iva-rate')?.value) || 10.5;
  var neto  = total / (1 + rate / 100);
  var ivaAmt= total - neto;
  var elN = document.getElementById('cf-iva-neto');
  var elI = document.getElementById('cf-iva-amt');
  if (elN) elN.textContent = fmtMoney(neto);
  if (elI) elI.textContent = fmtMoney(ivaAmt);
  var ivaPrev = document.getElementById('cf-iva-preview');
  if (ivaPrev) ivaPrev.style.display = total > 0 ? '' : 'none';
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
    if (amtEl && !numParse(amtEl.value)) amtEl.value = numFmt(saldo);
  }
}

// Genera un ingreso en Tesorería para un cobro (si se eligió cuenta que recibe).
function _cobranzaToTesoreria(accountId, coll, clientName) {
  if (!accountId || !(coll.amount > 0)) return;
  DB.insert('treasuryTx', {
    account_id:  accountId,
    project_id:  coll.project_id || '',
    type:        'income',
    book:        (coll.iva_incluido === false && coll.tipo_cobranza && coll.tipo_cobranza !== 'factura') ? 'B' : 'A',
    category:    'Cobranza a cliente',
    description: 'Cobro' + (clientName ? ' — ' + clientName : '') + (coll.reference ? ' (' + coll.reference + ')' : ''),
    amount:      coll.amount,
    date:        coll.date || todayStr(),
    reference:   coll.reference || '',
    source:      'collection',
    source_id:   coll.id,
    auto_generated: true,
  });
}

function saveCollection() {
  var tipo      = document.getElementById('cf-tipo')?.value || 'factura';
  var amount    = numParse(document.getElementById('cf-amount')?.value);
  var companyId = document.getElementById('cf-company')?.value || '';
  var date      = document.getElementById('cf-date')?.value;
  var method    = document.getElementById('cf-method')?.value;
  var accountId = document.getElementById('cf-account')?.value || '';
  var reference = document.getElementById('cf-ref')?.value.trim() || '';
  var notes     = document.getElementById('cf-notes')?.value.trim() || '';

  if (!amount || amount <= 0) { toast('El importe es obligatorio', 'error'); return; }

  var data = { amount, date, method, reference, notes, company_id: companyId, tipo_cobranza: tipo };

  if (tipo === 'factura') {
    var invoiceId = document.getElementById('cf-invoice')?.value;
    if (!invoiceId) { toast('Seleccioná una factura', 'error'); return; }
    var inv = DB.getById('invoices', invoiceId);
    data.invoice_id = invoiceId;
    data.project_id = inv?.project_id || '';
    data.client_name = inv?.client_name || '';
    data.client_cuit = inv?.client_cuit || '';
    data.iva_incluido = false;

    var _coll = DB.insert('collections', data);
    _cobranzaToTesoreria(accountId, _coll || data, data.client_name);

    var allCollected = DB.getAll('collections').filter(function(c) { return c.invoice_id === invoiceId; }).reduce(function(s,c){ return s+c.amount; }, 0);
    if (inv && allCollected >= inv.total) {
      DB.update('invoices', invoiceId, { status: 'paid' });
      toast('¡Factura cobrada en su totalidad!', 'success');
    } else {
      toast('Cobro registrado', 'success');
    }

  } else {
    // Cuota sin factura (formal o informal)
    var clientName  = document.getElementById('cf-client')?.value.trim() || '';
    var clientCuit  = document.getElementById('cf-cuit')?.value.trim() || '';
    var projectId   = document.getElementById('cf-project-cuota')?.value || '';
    if (!clientName) { toast('La razón social del comprador es obligatoria', 'error'); return; }

    var ivaFormal = tipo === 'cuota_formal';
    var ivaRate   = ivaFormal ? (parseFloat(document.getElementById('cf-iva-rate')?.value) || 10.5) : 0;
    var neto      = ivaFormal ? amount / (1 + ivaRate / 100) : amount;
    var ivaAmt    = ivaFormal ? amount - neto : 0;

    data.invoice_id   = '';
    data.project_id   = projectId;
    data.client_name  = clientName;
    data.client_cuit  = clientCuit;
    data.iva_incluido = ivaFormal;
    data.iva_rate     = ivaRate;
    data.neto         = Math.round(neto * 100) / 100;
    data.iva_amount   = Math.round(ivaAmt * 100) / 100;

    var _collC = DB.insert('collections', data);
    _cobranzaToTesoreria(accountId, _collC || data, data.client_name);
    toast('Cuota registrada' + (accountId ? ' e ingreso en Tesorería' : ''), 'success');
  }

  closeModal();
  renderCobranzas();
}

function deleteCollection(id) {
  rsEnsureCompany('collections', id);
  confirmDialog('¿Eliminar este cobro?', () => {
    // Cascada: remover el ingreso de tesorería generado por este cobro
    DB.getAll('treasuryTx').filter(function(t) { return t.source === 'collection' && t.source_id === id; })
      .forEach(function(t) { DB.remove('treasuryTx', t.id); });
    // Si la factura estaba marcada pagada por este cobro, revertirla a 'sent'
    var col = DB.getById('collections', id);
    DB.remove('collections', id);
    if (col && col.invoice_id) {
      var inv = DB.getById('invoices', col.invoice_id);
      if (inv && inv.status === 'paid') {
        var rest = DB.getAll('collections').filter(function(c) { return c.invoice_id === col.invoice_id; })
          .reduce(function(s, c) { return s + (c.amount || 0); }, 0);
        if (rest < (inv.total || 0)) DB.update('invoices', col.invoice_id, { status: 'sent' });
      }
    }
    toast('Cobro eliminado', 'warning');
    renderCobranzas();
  });
}

function printRecibo(id) {
  var col = DB.getById('collections', id);
  if (!col) return;
  var inv   = col.invoice_id ? DB.getById('invoices', col.invoice_id) : null;
  var proj  = inv ? DB.getById('projects', inv.project_id) : null;
  var company = {};
  try { company = DB.getAllCompanies()[0] || {}; } catch(e) {}

  var MET = { transfer: 'Transferencia Bancaria', check: 'Cheque', cash: 'Efectivo', other: 'Otro' };
  var recNum = 'REC-' + (col.date || '').replace(/-/g,'') + '-' + (col.id || '').slice(-4).toUpperCase();

  var isCuota = col.tipo_cobranza && col.tipo_cobranza !== 'factura';
  var clientName = col.client_name || (inv ? inv.client_name : '-');
  var clientCuit = col.client_cuit || (inv ? inv.client_cuit : '-');

  var totalsRows = [];
  if (col.iva_incluido && col.iva_amount > 0) {
    totalsRows.push({ label: 'Neto gravado', value: fmtMoney(col.neto || 0) });
    totalsRows.push({ label: 'IVA ' + (col.iva_rate || '') + '%', value: fmtMoney(col.iva_amount) });
  }
  totalsRows.push({ label: 'Total Cobrado', value: fmtMoney(col.amount), grand: true });

  var html =
    '<div class="doc-header">' +
      '<div><h1>' + escapeHtml(company.name || 'ConstructERP') + '</h1><div class="subtitle">Recibo de Cobro</div></div>' +
      '<div>' +
        '<div class="doc-num">' + recNum + '</div>' +
        '<div class="doc-date">Fecha: ' + fmtDate(col.date) + '</div>' +
        '<div style="margin-top:6px"><span class="badge b-green">Cobrado</span></div>' +
      '</div>' +
    '</div>' +
    _printInfoGrid([
      { title: isCuota ? 'Cuota / Anticipo' : 'Factura de Referencia', content:
          (isCuota
            ? 'Tipo: <strong>' + (col.tipo_cobranza === 'cuota_formal' ? 'Cuota con IVA (AFIP)' : 'Cuota informal') + '</strong><br>'
            : 'N° Factura: <strong>' + escapeHtml(inv ? inv.number : '-') + '</strong><br>' +
              'Total factura: ' + fmtMoney(inv ? inv.total : 0) + '<br>') +
          'Proyecto: ' + escapeHtml(proj ? proj.name : '-') },
      { title: 'Datos del Cobrador / Pagador', content:
          'Empresa: <strong>' + escapeHtml(company.name || '-') + '</strong><br>' +
          'Cliente: <strong>' + escapeHtml(clientName) + '</strong><br>' +
          (clientCuit ? 'CUIT: ' + escapeHtml(clientCuit) + '<br>' : '') +
          'Método: <strong>' + (MET[col.method] || escapeHtml(col.method || '-')) + '</strong><br>' +
          'Referencia: ' + escapeHtml(col.reference || '-') }
    ]) +
    _printTotals(totalsRows) +
    (col.notes ? '<div class="notes-box"><strong>Notas:</strong> ' + escapeHtml(col.notes) + '</div>' : '') +
    '<div class="sign-row">' +
      '<div><div class="sign-line">Firma del Pagador</div></div>' +
      '<div><div class="sign-line">Firma del Receptor</div></div>' +
    '</div>';

  _printDoc('Recibo ' + recNum, html);
}

function exportCobranzas() {
  const invoices = DB.getAll('invoices');
  const projects = DB.getAll('projects');
  const collections = DB.getAll('collections');
  const MET = { transfer:'Transferencia', check:'Cheque', cash:'Efectivo', other:'Otro' };
  exportXLSX('cobranzas.xlsx',
    ['Fecha','Tipo','N° Factura','Cliente','Proyecto','Método','Referencia','Neto','IVA','Total'],
    collections.map(c => {
      const inv  = c.invoice_id ? invoices.find(i => i.id === c.invoice_id) : null;
      const proj = projects.find(p => p.id === (c.project_id || (inv && inv.project_id) || ''));
      return [
        c.date, c.tipo_cobranza || 'factura',
        inv ? inv.number : (c.reference || ''),
        c.client_name || (inv && inv.client_name) || '',
        proj ? proj.name : '',
        MET[c.method] || c.method || '',
        c.reference || '',
        c.iva_incluido ? (c.neto || 0) : c.amount,
        c.iva_incluido ? (c.iva_amount || 0) : 0,
        c.amount
      ];
    })
  );
  toast(collections.length + ' cobros exportados', 'success');
}
