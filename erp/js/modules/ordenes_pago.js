/* ===== ÓRDENES DE PAGO ===== */
function renderOrdenesPago() {
  const orders = filterByActiveProject(DB.getAll('paymentOrders'));
  const suppliers = DB.getAll('suppliers');
  const projects = DB.getAll('projects');

  const totalGross = orders.reduce((s,o) => s + o.gross_amount, 0);
  const totalRetentions = orders.reduce((s,o) => s + (o.total_retentions||0), 0);
  const totalNet = orders.reduce((s,o) => s + o.net_amount, 0);
  const pending = orders.filter(o => o.status === 'pending').length;

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Órdenes de Pago</div>
    <div class="page-subtitle">Emisión y control de pagos a proveedores con retenciones</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="exportPaymentOrders()"><i class="fas fa-download"></i> Exportar</button>
    <button class="btn btn-primary" onclick="openPaymentOrderForm()"><i class="fas fa-plus"></i> Nueva Orden de Pago</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-file-invoice"></i></div><div>
    <div class="stat-value">${orders.length}</div><div class="stat-label">Total Órdenes</div>
    <div class="stat-delta ${pending?'down':'up'}">${pending} pendientes</div></div></div>
  <div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-dollar-sign"></i></div><div>
    <div class="stat-value">${fmtMoney(totalGross)}</div><div class="stat-label">Bruto Total</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-percentage"></i></div><div>
    <div class="stat-value">${fmtMoney(totalRetentions)}</div><div class="stat-label">Retenciones</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-money-bill-wave"></i></div><div>
    <div class="stat-value">${fmtMoney(totalNet)}</div><div class="stat-label">Neto Pagado</div></div></div>
</div>

<div class="filter-bar mt-2">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar orden, proveedor..." oninput="filterPOs2(this.value)">
  </div>
  <select class="form-control" style="width:140px" onchange="filterPOs2(undefined, this.value)">
    <option value="">Todos los estados</option>
    <option value="draft">Borrador</option>
    <option value="pending">Pendiente</option>
    <option value="paid">Pagada</option>
    <option value="cancelled">Cancelada</option>
  </select>
  <select class="form-control" style="width:160px" onchange="filterPOs2(undefined, undefined, this.value)">
    <option value="">Todo el período</option>
    <option value="month">Este mes</option>
    <option value="prev_month">Mes anterior</option>
    <option value="quarter">Este trimestre</option>
    <option value="year">Este año</option>
  </select>
</div>

<div class="card">
  <div class="card-body" style="padding:0">
    <div class="table-wrap" id="po2-table-wrap">
      ${buildPO2Table(orders, suppliers, projects)}
    </div>
  </div>
</div>
  `;
  window._po2Filters = { q: '', status: '' };
}

function buildPO2Table(orders, suppliers, projects) {
  if (!orders.length) return '<div class="empty-state"><i class="fas fa-file-invoice"></i><p>No hay órdenes de pago</p></div>';

  var ST_COLOR = {
    draft:     { color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0', label: 'Borrador' },
    pending:   { color: '#d97706', bg: '#fef9c3', border: '#fde68a', label: 'Pendiente' },
    paid:      { color: '#059669', bg: '#dcfce7', border: '#86efac', label: 'Pagada' },
    cancelled: { color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', label: 'Cancelada' },
  };

  var allSIs = DB.getAll('supplierInvoices');
  var sorted = orders.slice().sort(function(a,b) { return (b.date||'').localeCompare(a.date||''); });

  var rows = sorted.map(function(o, idx) {
    var sup  = suppliers.find(function(s) { return s.id === o.supplier_id; });
    var proj = projects.find(function(p) { return p.id === o.project_id; });
    var si   = o.supplier_invoice_id ? allSIs.find(function(s) { return s.id === o.supplier_invoice_id; }) : null;
    var st   = ST_COLOR[o.status] || ST_COLOR.draft;
    var rowBg = idx % 2 === 0 ? '#ffffff' : '#f8f9fb';

    return '<tr style="background:' + rowBg + ';border-bottom:1px solid #f1f5f9;cursor:pointer"' +
        ' onclick="viewPaymentOrder(\'' + o.id + '\')"' +
        ' onmouseenter="this.style.background=\'#eef4ff\'" onmouseleave="this.style.background=\'' + rowBg + '\'">' +
      '<td style="padding:10px 12px"><strong style="color:#2563eb">' + escapeHtml(o.number) + '</strong></td>' +
      '<td style="padding:10px 12px;font-size:12px">' + escapeHtml(sup ? sup.name : '-') + '</td>' +
      '<td style="padding:10px 12px;font-size:11px;color:#64748b">' + escapeHtml(proj ? proj.name : '-') + '</td>' +
      '<td style="padding:10px 12px;font-size:12px;white-space:nowrap">' + fmtDate(o.date) + '</td>' +
      '<td style="padding:10px 12px;font-size:11px">' + (si ? '<span style="color:#2563eb;font-weight:600">' + escapeHtml(si.number) + '</span>' : '<span style="color:#94a3b8">—</span>') + '</td>' +
      '<td style="padding:10px 12px;font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(o.concept || '') + '</td>' +
      '<td style="padding:10px 12px;text-align:right;font-variant-numeric:tabular-nums">' + fmtMoney(o.gross_amount) + '</td>' +
      '<td style="padding:10px 12px;text-align:right;font-variant-numeric:tabular-nums;color:#d97706">' + fmtMoney(o.total_retentions||0) + '</td>' +
      '<td style="padding:10px 12px;text-align:right;font-variant-numeric:tabular-nums"><strong>' + fmtMoney(o.net_amount) + '</strong></td>' +
      '<td style="padding:10px 12px">' +
        '<span style="background:' + st.bg + ';color:' + st.color + ';border:1px solid ' + st.border + ';font-size:11px;font-weight:600;padding:3px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:.4px">' + st.label + '</span>' +
      '</td>' +
      '<td style="padding:10px 12px;text-align:center" onclick="event.stopPropagation()">' +
        attBadge(o).replace('{col}','paymentOrders').replace('{id}', o.id) +
      '</td>' +
      '<td style="padding:10px 12px;white-space:nowrap" onclick="event.stopPropagation()">' +
        '<div class="table-actions">' +
          '<button class="btn-ghost btn btn-sm" title="Ver detalle" onclick="viewPaymentOrder(\'' + o.id + '\')"><i class="fas fa-eye"></i></button>' +
          '<button class="btn-ghost btn btn-sm" title="PDF" onclick="printPaymentOrder(\'' + o.id + '\')"><i class="fas fa-file-pdf"></i></button>' +
          '<button class="btn-ghost btn btn-sm" title="Editar" onclick="openPaymentOrderForm(\'' + o.id + '\')"><i class="fas fa-edit"></i></button>' +
          (o.status === 'pending' ? '<button class="btn btn-sm btn-success" onclick="markPOPaid(\'' + o.id + '\')"><i class="fas fa-check"></i> Pagar</button>' : '') +
          '<button class="btn-ghost btn btn-sm danger" title="Eliminar" onclick="deletePaymentOrder(\'' + o.id + '\')"><i class="fas fa-trash"></i></button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');

  return '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
    '<thead><tr style="background:#f8f9fb;border-bottom:2px solid #e2e8f0">' +
      '<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">N° Orden</th>' +
      '<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Proveedor</th>' +
      '<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Proyecto</th>' +
      '<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Fecha</th>' +
      '<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Factura Prov.</th>' +
      '<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Concepto</th>' +
      '<th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;font-weight:600">Bruto</th>' +
      '<th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;font-weight:600">Retenciones</th>' +
      '<th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;font-weight:600">Neto</th>' +
      '<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Estado</th>' +
      '<th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;font-weight:600" title="Comprobantes adjuntos"><i class="fas fa-paperclip"></i></th>' +
      '<th style="padding:10px 12px;font-size:11px;color:#64748b;font-weight:600">Acciones</th>' +
    '</tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
  '</table>';
}

window._po2Filters = { q: '', status: '', period: '' };
function filterPOs2(q, status, period) {
  if (q !== undefined) window._po2Filters.q = q.toLowerCase();
  if (status !== undefined) window._po2Filters.status = status;
  if (period !== undefined) window._po2Filters.period = period;
  let orders = filterByActiveProject(DB.getAll('paymentOrders'));
  const f = window._po2Filters;
  if (f.q) orders = orders.filter(o => {
    var prov = DB.getById('suppliers', o.supplier_id);
    var supplierName = (prov && prov.name) ? prov.name.toLowerCase() : '';
    return (o.number||'').toLowerCase().includes(f.q) || (o.concept||'').toLowerCase().includes(f.q) || supplierName.includes(f.q);
  });
  if (f.status) orders = orders.filter(o => o.status === f.status);
  if (f.period) { const r = _periodRange(f.period); orders = orders.filter(o => o.date && o.date >= r.from && o.date <= r.to); }
  const wrap = document.getElementById('po2-table-wrap');
  if (wrap) wrap.innerHTML = buildPO2Table(orders, DB.getAll('suppliers'), DB.getAll('projects'));
}

function viewPaymentOrder(id) {
  const o = DB.getById('paymentOrders', id);
  if (!o) { toast('Orden no encontrada', 'error'); return; }
  const sup = DB.getById('suppliers', o.supplier_id);
  const proj = DB.getById('projects', o.project_id);
  const acc = DB.getById('bankAccounts', o.account_id);
  const si = o.supplier_invoice_id ? DB.getById('supplierInvoices', o.supplier_invoice_id) : null;

  const _cp = (typeof getCompanyProfile === 'function') ? getCompanyProfile() : {};
  openModal(`Orden de Pago ${o.number}`, `
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
  <div>
    <div style="font-size:20px;font-weight:800;color:var(--primary)">${escapeHtml(_cp.name || 'Mi Empresa')}</div>
    <div style="font-size:11px;color:var(--text-muted)">${_cp.cuit ? 'CUIT: ' + escapeHtml(_cp.cuit) + ' — ' : ''}ORDEN DE PAGO</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:18px;font-weight:700">${o.number}</div>
    <div style="font-size:12px">Fecha: ${fmtDate(o.date)}</div>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;font-size:12px">
  <div style="background:var(--bg);padding:10px;border-radius:6px">
    <div style="font-weight:600;margin-bottom:4px">BENEFICIARIO</div>
    <div><strong>${sup?.name || '-'}</strong></div>
    <div>CUIT: ${sup?.cuit || '-'}</div>
    <div>${sup?.address || ''}</div>
  </div>
  <div style="background:var(--bg);padding:10px;border-radius:6px">
    <div style="font-weight:600;margin-bottom:4px">DATOS DEL PAGO</div>
    <div>Proyecto: <strong>${proj?.name || '-'}</strong></div>
    <div>Cuenta: ${acc?.name || '-'}</div>
    ${si ? `<div>Factura prov.: <strong style="color:var(--primary)">${si.number}</strong> — ${fmtMoney(si.total)}</div>` : `<div>Ref: ${o.reference_doc || '-'}</div>`}
  </div>
</div>

<div style="background:var(--bg);padding:10px;border-radius:6px;margin-bottom:16px;font-size:13px">
  <strong>Concepto:</strong> ${o.concept}
</div>

<div style="max-width:400px;margin-left:auto">
  <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
    <span>Importe Bruto</span><span>${fmtMoney(o.gross_amount)}</span>
  </div>
  ${(o.retentions||[]).map(r => `
  <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;color:var(--text-muted)">
    <span>${r.name} (${r.rate}%)</span><span>- ${fmtMoney(r.amount)}</span>
  </div>`).join('')}
  <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:16px;font-weight:700;color:var(--primary)">
    <span>NETO A PAGAR</span><span>${fmtMoney(o.net_amount)}</span>
  </div>
</div>
${o.notes ? `<div style="font-size:12px;color:var(--text-muted)"><strong>Notas:</strong> ${o.notes}</div>` : ''}
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
<button class="btn btn-secondary" onclick="printPaymentOrder('${o.id}')"><i class="fas fa-file-pdf"></i> PDF</button>
${(o.retentions||[]).length > 0 ? `<button class="btn btn-secondary" onclick="printRetencion('${o.id}')"><i class="fas fa-percentage"></i> Comp. Retención</button>` : ''}
${o.status === 'pending' ? `<button class="btn btn-success" onclick="markPOPaid('${o.id}');closeModal()"><i class="fas fa-check"></i> Marcar Pagada</button>` : ''}
`);
}

function openPaymentOrderForm(id = null, prefillSIId = null) {
  const o = id ? DB.getById('paymentOrders', id) : null;
  DB.markEdit('paymentOrders', id);   // control de concurrencia: revisión base al abrir
  const suppliers = DB.getAll('suppliers');
  const projects = DB.getAll('projects');
  const accounts = DB.getAll('bankAccounts');
  const retentions = DB.getAll('retentions').filter(r => r.active && r.applies_to === 'payment');
  const nextNum = `OP-${new Date().getFullYear()}-${String(DB.getAll('paymentOrders').length + 1).padStart(3,'0')}`;

  // Track which invoices are already applied (for checkbox pre-selection)
  window._poEditApplied = [];
  if (o && o.applied_invoices && o.applied_invoices.length) {
    window._poEditApplied = o.applied_invoices.map(function(x) { return typeof x === 'string' ? x : x.id; });
  } else if (o && o.supplier_invoice_id) {
    window._poEditApplied = [o.supplier_invoice_id];
  }
  if (prefillSIId && window._poEditApplied.indexOf(prefillSIId) === -1) window._poEditApplied.push(prefillSIId);

  // Build payment method rows HTML for existing data
  function buildMethodRows(methods) {
    if (!methods || !methods.length) return '';
    var MET = [['transfer','Transferencia'],['check','Cheque'],['cash','Efectivo'],['other','Otro']];
    return methods.map(function(m) {
      var refPlaceholder = m.type === 'check' ? 'N° cheque / banco' : m.type === 'transfer' ? 'CBU / alias / referencia' : 'Referencia';
      var datePlaceholder = m.type === 'check' ? 'Fecha cheque' : 'Fecha acreditación';
      return '<div class="pm-row" style="display:grid;grid-template-columns:148px 1fr 1fr 120px 32px;gap:6px;margin-bottom:6px;align-items:center">' +
        '<select class="form-control" style="font-size:12px" name="pm-type" onchange="_pmRowTypeChange(this)">' +
        MET.map(function(x) { return '<option value="' + x[0] + '"' + (m.type===x[0]?' selected':'') + '>' + x[1] + '</option>'; }).join('') +
        '</select>' +
        '<input class="form-control" style="font-size:12px" type="text" inputmode="decimal" name="pm-amount" placeholder="0,00" value="' + (m.amount ? numFmt(m.amount) : '') + '" onfocus="var n=numParse(this.value);this.value=n?n:\'\'" onblur="this.value=numFmt(numParse(this.value))">' +
        '<input class="form-control" style="font-size:12px" type="text" name="pm-ref" placeholder="' + refPlaceholder + '" value="' + escapeHtml(m.reference||'') + '">' +
        '<input class="form-control" style="font-size:12px" type="date" name="pm-date" title="' + datePlaceholder + '" value="' + (m.date||'') + '">' +
        '<button type="button" onclick="this.closest(\'.pm-row\').remove()" style="background:#fee2e2;border:none;border-radius:6px;cursor:pointer;width:32px;height:32px;color:#991b1b;font-size:18px;display:flex;align-items:center;justify-content:center;padding:0">×</button>' +
        '</div>';
    }).join('');
  }

  openModal(o ? 'Editar Orden de Pago' : 'Nueva Orden de Pago', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Número</label>
    <input class="form-control" id="op-num" value="${o?.number || nextNum}">
  </div>
  <div class="form-group">
    <label class="form-label">Estado</label>
    <select class="form-control" id="op-status">
      <option value="draft" ${o?.status==='draft'?'selected':''}>Borrador</option>
      <option value="pending" ${o?.status==='pending'||!o?'selected':''}>Pendiente</option>
      <option value="paid" ${o?.status==='paid'?'selected':''}>Pagada</option>
      <option value="cancelled" ${o?.status==='cancelled'?'selected':''}>Cancelada</option>
    </select>
  </div>
  <div class="form-group full">
    <label class="form-label">Proveedor *</label>
    <select class="form-control" id="op-supplier" onchange="reloadPOInvoiceSelect(this.value)">
      <option value="">Seleccionar...</option>
      ${suppliers.map(s => `<option value="${s.id}" ${o?.supplier_id===s.id?'selected':''}>${s.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group full">
    <label class="form-label">Facturas Aplicadas</label>
    <div id="op-inv-wrap" style="border:1px solid var(--border);border-radius:8px;max-height:150px;overflow-y:auto;font-size:13px">
      <div style="padding:10px 12px;font-size:12px;color:var(--text-muted)">Seleccioná un proveedor para ver sus facturas</div>
    </div>
  </div>
  <div class="form-group">
    <label class="form-label">Proyecto</label>
    <select class="form-control" id="op-project">
      <option value="">Sin proyecto</option>
      ${projects.map(p => `<option value="${p.id}" ${o?.project_id===p.id?'selected':''}>${p.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Cuenta Bancaria</label>
    <select class="form-control" id="op-account">
      <option value="">Seleccionar...</option>
      ${accounts.map(a => `<option value="${a.id}" ${o?.account_id===a.id?'selected':''}>${a.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Fecha</label>
    <input class="form-control" id="op-date" type="date" value="${o?.date || todayStr()}">
  </div>
  <div class="form-group full">
    <label class="form-label">Concepto *</label>
    <input class="form-control" id="op-concept" value="${o?.concept || ''}" placeholder="Descripción del pago">
  </div>
  <div class="form-group">
    <label class="form-label">Importe Bruto *</label>
    <input class="form-control" id="op-gross" type="text" inputmode="decimal" value="${o?.gross_amount ? numFmt(o.gross_amount) : ''}" onfocus="var n=numParse(this.value);this.value=n?n:''" onblur="this.value=numFmt(numParse(this.value));recalcPORetentions()" oninput="recalcPORetentions()">
  </div>
  <div class="form-group">
    <label class="form-label">Neto gravado <small style="font-weight:400;color:var(--text-muted)">(sin IVA — base de Ganancias)</small></label>
    <input class="form-control" id="op-net" type="text" inputmode="decimal" value="${o?.net_gravado ? numFmt(o.net_gravado) : ''}" placeholder="Si vacío = bruto" onfocus="var n=numParse(this.value);this.value=n?n:''" onblur="this.value=numFmt(numParse(this.value));recalcPORetentions()" oninput="recalcPORetentions()">
  </div>
</div>
<div class="divider"></div>
<div style="font-size:13px;font-weight:600;margin-bottom:8px">Medios de Pago</div>
<div id="op-methods">${buildMethodRows(o?.payment_methods)}</div>
<button type="button" onclick="addPOMethodRow()" style="font-size:12px;color:var(--primary);background:none;border:1px dashed var(--border);border-radius:6px;padding:5px 14px;cursor:pointer;margin-bottom:14px"><i class="fas fa-plus"></i> Agregar medio de pago</button>
<div class="divider"></div>
<div style="font-size:13px;font-weight:600;margin-bottom:8px">Retenciones a Aplicar</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px" id="op-retentions">
  ${retentions.map(r => `<label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;background:var(--bg);padding:8px;border-radius:6px">
    <input type="checkbox" value="${r.id}" data-name="${escapeHtml(r.name)}" data-rate="${r.rate}" data-base="${(typeof retRuleBase==='function'?retRuleBase(r):(r.base||'bruto'))}" data-min="${r.min_amount||0}" ${(o?.retentions||[]).find(x=>x.retention_id===r.id)?'checked':''} onchange="recalcPORetentions()">
    <span><strong>${escapeHtml(r.name)}</strong> — ${r.rate}% <span style="color:var(--text-muted)">(${(typeof retRuleBase==='function'?retRuleBase(r):(r.base||'bruto'))})</span></span>
  </label>`).join('')}
</div>
<div id="op-totals" style="text-align:right;margin-top:12px;font-size:13px">
  ${calcPOTotalsHtml(o?.gross_amount||0, o?.retentions||[])}
</div>
<div class="form-group full mt-2">
  <label class="form-label">Notas</label>
  <textarea class="form-control" id="op-notes" rows="2">${o?.notes || ''}</textarea>
</div>
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="savePaymentOrder('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);

  // Load invoice checkboxes after modal renders
  setTimeout(function() {
    if (o?.supplier_id || prefillSIId) reloadPOInvoiceSelect(o?.supplier_id || '');
  }, 60);
}

function reloadPOInvoiceSelect(supplierId) {
  var wrap = document.getElementById('op-inv-wrap');
  if (!wrap) return;
  var allSIs = DB.getAll('supplierInvoices');
  var filtered = allSIs.filter(function(si) { return si.status !== 'cancelled' && (!supplierId || si.supplier_id === supplierId); });
  if (!filtered.length) {
    wrap.innerHTML = '<div style="padding:10px 12px;font-size:12px;color:var(--text-muted)">Sin facturas disponibles para este proveedor</div>';
    return;
  }
  var existing = window._poEditApplied || [];
  var stLabel = { pending: 'Pendiente', paid: 'Pagada', overdue: 'Vencida' };
  var stBadge = { pending: 'badge-yellow', paid: 'badge-green', overdue: 'badge-red' };
  wrap.innerHTML = filtered.map(function(si) {
    var checked = existing.indexOf(si.id) !== -1 ? 'checked' : '';
    return '<label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--border-light);cursor:pointer" onclick="prefillPOFromInvoiceCB()">' +
      '<input type="checkbox" name="op-inv-cb" value="' + si.id + '" ' + checked + '>' +
      '<span style="flex:1;font-weight:600;font-size:13px">' + escapeHtml(si.number) + '</span>' +
      '<span style="color:var(--primary);font-variant-numeric:tabular-nums;font-size:13px">' + fmtMoney(si.total) + '</span>' +
      '<span class="badge ' + (stBadge[si.status]||'badge-gray') + '" style="font-size:10px">' + (stLabel[si.status]||si.status) + '</span>' +
      '</label>';
  }).join('');
}

function prefillPOFromInvoiceCB() {
  // Small delay so the checkbox state updates before we read it
  setTimeout(function() {
    var checked = Array.from(document.querySelectorAll('#op-inv-wrap input[name="op-inv-cb"]:checked'));
    if (!checked.length) return;
    var grossEl = document.getElementById('op-gross');
    var conceptEl = document.getElementById('op-concept');
    var projEl = document.getElementById('op-project');
    var firstSI = DB.getById('supplierInvoices', checked[0].value);
    if (!firstSI) return;
    if (grossEl && !numParse(grossEl.value)) {
      var total = checked.reduce(function(s, cb) { var si = DB.getById('supplierInvoices', cb.value); return s + (si ? (si.total||0) : 0); }, 0);
      grossEl.value = numFmt(total);
      recalcPORetentions();
    }
    if (conceptEl && !conceptEl.value) {
      conceptEl.value = checked.length === 1 ? 'Pago factura ' + firstSI.number : 'Pago facturas (' + checked.length + ')';
    }
    if (projEl && firstSI.project_id && !projEl.value) projEl.value = firstSI.project_id;
  }, 10);
}

function addPOMethodRow(type, amount, reference, date) {
  var wrap = document.getElementById('op-methods');
  if (!wrap) return;
  var MET = [['transfer','Transferencia'],['check','Cheque'],['cash','Efectivo'],['other','Otro']];
  var t = type || 'transfer';
  var row = document.createElement('div');
  row.className = 'pm-row';
  row.style.cssText = 'display:grid;grid-template-columns:148px 1fr 1fr 120px 32px;gap:6px;margin-bottom:6px;align-items:center';
  row.innerHTML =
    '<select class="form-control" style="font-size:12px" name="pm-type" onchange="_pmRowTypeChange(this)">' +
    MET.map(function(x) { return '<option value="' + x[0] + '"' + (t===x[0]?' selected':'') + '>' + x[1] + '</option>'; }).join('') +
    '</select>' +
    '<input class="form-control" style="font-size:12px" type="text" inputmode="decimal" name="pm-amount" placeholder="0,00" value="' + (amount ? numFmt(amount) : '') + '" onfocus="var n=numParse(this.value);this.value=n?n:\'\'" onblur="this.value=numFmt(numParse(this.value))">' +
    '<input class="form-control" style="font-size:12px" type="text" name="pm-ref" placeholder="' + (t==='check'?'N° cheque / banco':'CBU / alias / referencia') + '" value="' + escapeHtml(reference||'') + '">' +
    '<input class="form-control" style="font-size:12px" type="date" name="pm-date" title="' + (t==='check'?'Fecha cheque':'Fecha acreditación') + '" value="' + (date||'') + '">' +
    '<button type="button" onclick="this.closest(\'.pm-row\').remove()" style="background:#fee2e2;border:none;border-radius:6px;cursor:pointer;width:32px;height:32px;color:#991b1b;font-size:18px;display:flex;align-items:center;justify-content:center;padding:0">×</button>';
  wrap.appendChild(row);
}

function _pmRowTypeChange(sel) {
  var row = sel.closest('.pm-row');
  if (!row) return;
  var t = sel.value;
  var refEl = row.querySelector('[name="pm-ref"]');
  var dateEl = row.querySelector('[name="pm-date"]');
  if (refEl) refEl.placeholder = t === 'check' ? 'N° cheque / banco' : t === 'cash' ? 'Referencia' : 'CBU / alias / referencia';
  if (dateEl) { dateEl.title = t === 'check' ? 'Fecha cheque' : 'Fecha acreditación'; dateEl.style.display = t === 'cash' ? 'none' : ''; }
}

// Lee bruto/neto del form y calcula cada retención según su BASE (neto/bruto/iva)
// y su mínimo no imponible (se retiene sólo sobre el excedente del mínimo).
function _poReadRetentions() {
  const gross = numParse(document.getElementById('op-gross')?.value) || 0;
  let net = numParse((document.getElementById('op-net') || {}).value) || 0;
  if (!net) net = gross;                 // sin neto discriminado → base = bruto
  const iva = Math.max(0, gross - net);
  const selected = Array.from(document.querySelectorAll('#op-retentions input[type="checkbox"]:checked'));
  const retentions = selected.map(cb => {
    const rate = parseFloat(cb.dataset.rate) || 0;
    const base = cb.dataset.base || 'bruto';
    const min  = parseFloat(cb.dataset.min) || 0;
    const baseAmt = base === 'neto' ? net : (base === 'iva' ? iva : gross);
    const taxable = Math.max(0, baseAmt - min);   // mínimo no sujeto a retención
    return {
      retention_id: cb.value,
      name: cb.dataset.name,
      rate: rate,
      base: base,
      base_amount: Math.round(baseAmt * 100) / 100,
      min_amount: min,
      amount: taxable > 0 ? Math.round(taxable * rate) / 100 : 0,
    };
  });
  return { gross, net, iva, retentions };
}

function recalcPORetentions() {
  const r = _poReadRetentions();
  const el = document.getElementById('op-totals');
  if (el) el.innerHTML = calcPOTotalsHtml(r.gross, r.retentions);
}

function calcPOTotalsHtml(gross, retentions) {
  const totalRet = retentions.reduce((s,r) => s + (r.amount||0), 0);
  const net = gross - totalRet;
  const detail = retentions.filter(r => r.amount > 0).map(r =>
    `<div style="font-size:11px;color:var(--text-muted)">${escapeHtml(r.name)}: ${r.rate}% s/ ${r.base} de ${fmtMoney(r.base_amount)}${r.min_amount ? ' (mín. ' + fmtMoney(r.min_amount) + ')' : ''} = ${fmtMoney(r.amount)}</div>`
  ).join('');
  return `${detail}<div style="margin-top:4px">Bruto: <strong>${fmtMoney(gross)}</strong> &nbsp;|&nbsp; Retenciones: <strong class="text-warning">${fmtMoney(totalRet)}</strong> &nbsp;|&nbsp; <strong style="font-size:15px;color:var(--primary)">Neto a pagar: ${fmtMoney(net)}</strong></div>`;
}

function savePaymentOrder(id) {
  const supplierId = document.getElementById('op-supplier').value;
  const concept = document.getElementById('op-concept').value.trim();
  const gross = numParse(document.getElementById('op-gross').value);
  if (!supplierId || !concept || !gross) { toast('Proveedor, concepto e importe son obligatorios', 'error'); return; }

  const _ret = _poReadRetentions();
  const retentions = _ret.retentions;
  const totalRet = retentions.reduce((s,r) => s + (r.amount || 0), 0);
  const netGravado = _ret.net;

  // Collect applied invoices from checkboxes
  const appliedInvCBs = Array.from(document.querySelectorAll('#op-inv-wrap input[name="op-inv-cb"]:checked'));
  const appliedInvoices = appliedInvCBs.map(function(cb) {
    var si = DB.getById('supplierInvoices', cb.value);
    return si ? { id: si.id, number: si.number, total: si.total } : null;
  }).filter(Boolean);

  // Collect payment methods from rows
  const pmRows = Array.from(document.querySelectorAll('#op-methods .pm-row'));
  const paymentMethods = pmRows.map(function(row) {
    var type = row.querySelector('[name="pm-type"]')?.value || 'transfer';
    var amount = numParse(row.querySelector('[name="pm-amount"]')?.value);
    var ref = (row.querySelector('[name="pm-ref"]')?.value || '').trim();
    var date = (row.querySelector('[name="pm-date"]')?.value || '').trim();
    return amount > 0 ? { type: type, amount: amount, reference: ref, date: date } : null;
  }).filter(Boolean);

  const firstInv = appliedInvoices[0];
  const data = {
    number: document.getElementById('op-num').value,
    supplier_id: supplierId,
    project_id: document.getElementById('op-project').value || '',
    account_id: document.getElementById('op-account').value || '',
    date: document.getElementById('op-date').value,
    supplier_invoice_id: firstInv ? firstInv.id : '',
    reference_doc: firstInv ? firstInv.number : '',
    applied_invoices: appliedInvoices,
    payment_methods: paymentMethods,
    concept,
    gross_amount: gross,
    net_gravado: netGravado,
    retentions,
    total_retentions: totalRet,
    net_amount: gross - totalRet,
    status: document.getElementById('op-status').value,
    notes: document.getElementById('op-notes').value.trim(),
  };

  if (id) {
    var _r = DB.update('paymentOrders', id, data, { expectRev: DB.takeEditExpect('paymentOrders', id) });
    if (_r && _r.__conflict) return;   // otro usuario la cambió; DB avisó, reintento fuerza
    toast('Orden actualizada', 'success');
  }
  else { DB.insert('paymentOrders', data); toast('Orden creada', 'success'); }
  closeModal();
  renderOrdenesPago();
}

function markPOPaid(id) {
  if (!isApproved('payment_order', id)) {
    toast('La orden de pago debe estar aprobada antes de ejecutarla', 'error');
    return;
  }
  const o = DB.getById('paymentOrders', id);
  if (!o) return;
  if (o.status === 'paid') { toast('La orden ya está pagada', 'info'); return; }
  DB.update('paymentOrders', id, { status: 'paid' });
  // Mark all applied invoices as paid
  if (o.applied_invoices && o.applied_invoices.length) {
    o.applied_invoices.forEach(function(inv) { DB.update('supplierInvoices', inv.id, { status: 'paid' }); });
  } else if (o.supplier_invoice_id) {
    DB.update('supplierInvoices', o.supplier_invoice_id, { status: 'paid' });
  }
  // Impacto en Tesorería: egreso por el NETO pagado (las retenciones se retienen,
  // no salen del banco al proveedor). Se genera sólo si hay cuenta bancaria asignada.
  var net = (o.net_amount != null) ? o.net_amount : (o.gross_amount || 0);
  if (o.account_id && net > 0) {
    var supName = '';
    try { var sup = DB.getById('suppliers', o.supplier_id); supName = sup ? (' — ' + sup.name) : ''; } catch(e) {}
    DB.insert('treasuryTx', {
      account_id:  o.account_id,
      project_id:  o.project_id || '',
      type:        'expense',
      book:        'A',
      category:    'Pago a proveedor',
      description: 'Orden de Pago ' + (o.number || o.id) + supName,
      amount:      net,
      date:        o.date || todayStr(),
      reference:   o.number || '',
      source:      'payment_order',
      source_id:   o.id,
      auto_generated: true,
    });
    toast('Orden pagada y egreso registrado en Tesorería', 'success');
  } else {
    toast('Orden marcada como pagada (sin cuenta bancaria: no se registró egreso)', 'warning');
  }
  renderOrdenesPago();
}

function deletePaymentOrder(id) {
  confirmDialog('¿Eliminar esta orden de pago?', () => {
    // Cascada: remover el egreso de tesorería generado por esta OP
    DB.getAll('treasuryTx').filter(function(t) { return t.source === 'payment_order' && t.source_id === id; })
      .forEach(function(t) { DB.remove('treasuryTx', t.id); });
    DB.remove('paymentOrders', id);
    toast('Orden eliminada', 'warning');
    renderOrdenesPago();
  });
}

function printPaymentOrder(id) {
  var o = DB.getById('paymentOrders', id);
  if (!o) return;
  var sup  = DB.getById('suppliers', o.supplier_id);
  var proj = DB.getById('projects', o.project_id);
  var acc  = DB.getById('bankAccounts', o.account_id);
  var company = {};
  try { company = DB.getAllCompanies()[0] || {}; } catch(e) {}

  var ST_BADGE = { draft: 'b-gray', pending: 'b-yellow', paid: 'b-green', cancelled: 'b-red' };
  var ST_LABEL = { draft: 'Borrador', pending: 'Pendiente', paid: 'Pagada', cancelled: 'Cancelada' };
  var METH_LABEL = { transfer: 'Transferencia bancaria', check: 'Cheque', cash: 'Efectivo', other: 'Otro' };
  var INV_ST = { pending: 'Pendiente', paid: 'Pagada', overdue: 'Vencida' };
  var INV_BD = { pending: 'b-yellow', paid: 'b-green', overdue: 'b-red' };

  // Facturas aplicadas: use applied_invoices array (or fall back to single supplier_invoice_id)
  var appliedInvs = [];
  if (o.applied_invoices && o.applied_invoices.length) {
    appliedInvs = o.applied_invoices;
  } else if (o.supplier_invoice_id) {
    var siBack = DB.getById('supplierInvoices', o.supplier_invoice_id);
    if (siBack) appliedInvs = [{ id: siBack.id, number: siBack.number, total: siBack.total }];
  }

  var invSection = '';
  if (appliedInvs.length) {
    var invRows = appliedInvs.map(function(inv) {
      var siLocal = DB.getById('supplierInvoices', inv.id);
      var st = siLocal ? siLocal.status : 'pending';
      return '<tr>' +
        '<td><strong>' + escapeHtml(inv.number) + '</strong></td>' +
        '<td class="tr num">' + fmtMoney(inv.total) + '</td>' +
        '<td><span class="badge ' + (INV_BD[st]||'b-gray') + '">' + (INV_ST[st]||st) + '</span></td>' +
        '</tr>';
    }).join('');
    invSection =
      '<div style="margin-bottom:22px">' +
        '<div class="info-title" style="font-size:9.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.14em;margin-bottom:10px">Facturas Aplicadas</div>' +
        '<table>' +
          '<thead><tr><th>Número de Factura</th><th class="tr">Importe</th><th>Estado</th></tr></thead>' +
          '<tbody>' + invRows + '</tbody>' +
        '</table>' +
      '</div>';
  }

  // ---------- Medios de pago — tabla compacta (una fila por medio) ----------
  var paySection = '<div style="margin-bottom:24px">' +
    '<div style="font-size:10px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:.14em;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #dbeafe">Detalle del Pago</div>';

  // Medios de pago — una fila por medio
  var methRows = '';
  if (o.payment_methods && o.payment_methods.length) {
    methRows = o.payment_methods.map(function(m) {
      var detalle = '';
      if (m.type === 'transfer') {
        var parts = [];
        if (acc) parts.push(escapeHtml(acc.name));
        if (m.reference) parts.push(escapeHtml(m.reference));
        detalle = parts.join(' — ');
      } else {
        detalle = m.reference ? escapeHtml(m.reference) : '';
      }
      var fechaCol = m.type === 'check' ? 'Fecha cheque' : 'Fecha acred.';
      return '<tr>' +
        '<td><strong>' + (METH_LABEL[m.type]||m.type) + '</strong></td>' +
        '<td>' + detalle + '</td>' +
        '<td class="tr num" style="color:#1e3a8a;font-weight:700">' + fmtMoney(m.amount) + '</td>' +
        '<td class="tr" style="color:#64748b">' + (m.date ? fmtDate(m.date) : '—') + '</td>' +
        '</tr>';
    }).join('');
  } else {
    var accDetail = acc ? escapeHtml(acc.name) + (acc.bank ? ' — ' + escapeHtml(acc.bank) : '') : '—';
    methRows = '<tr>' +
      '<td><strong>Transferencia bancaria</strong></td>' +
      '<td>' + accDetail + '</td>' +
      '<td class="tr num" style="color:#1e3a8a;font-weight:700">' + fmtMoney(o.gross_amount) + '</td>' +
      '<td class="tr" style="color:#64748b">—</td>' +
      '</tr>';
  }

  paySection += '<table>' +
    '<thead><tr>' +
      '<th>Medio de pago</th>' +
      '<th>Cuenta / Referencia</th>' +
      '<th class="tr">Monto</th>' +
      '<th class="tr">Fecha</th>' +
    '</tr></thead>' +
    '<tbody>' + methRows + '</tbody>' +
  '</table>';

  // Retenciones — tabla compacta con fondo ámbar
  if (o.retentions && o.retentions.length) {
    var retTbody = (o.retentions||[]).map(function(r) {
      return '<tr>' +
        '<td style="color:#92400e">' + escapeHtml(r.name) + ' (' + r.rate + '%)</td>' +
        '<td class="tr num" style="color:#92400e">− ' + fmtMoney(r.amount) + '</td>' +
      '</tr>';
    }).join('') +
    '<tr style="border-top:2px solid #fde68a">' +
      '<td style="color:#92400e;font-weight:700">Total retenciones</td>' +
      '<td class="tr num" style="color:#92400e;font-weight:700">− ' + fmtMoney(o.total_retentions||0) + '</td>' +
    '</tr>';
    paySection +=
      '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;overflow:hidden;margin-top:2px">' +
        '<table style="margin:0">' +
          '<thead><tr>' +
            '<th style="background:#fef3c7;color:#92400e">Retenciones</th>' +
            '<th class="tr" style="background:#fef3c7;color:#92400e">Monto</th>' +
          '</tr></thead>' +
          '<tbody>' + retTbody + '</tbody>' +
        '</table>' +
      '</div>';
  }

  // Neto a pagar
  paySection +=
    '<div style="background:#1e3a8a;border-radius:8px;padding:13px 20px;display:flex;justify-content:space-between;align-items:center;margin-top:12px">' +
      '<span style="color:#bfdbfe;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em">Neto a Pagar</span>' +
      '<span style="color:#fff;font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.02em">' + fmtMoney(o.net_amount) + '</span>' +
    '</div>' +
  '</div>';

  var html =
    '<div class="doc-header">' +
      '<div><h1>' + escapeHtml(company.name || 'ConstructERP') + '</h1><div class="subtitle">Orden de Pago</div></div>' +
      '<div>' +
        '<div class="doc-num">' + escapeHtml(o.number) + '</div>' +
        '<div class="doc-date">Fecha: ' + fmtDate(o.date) + '</div>' +
        '<div style="margin-top:8px"><span class="badge ' + (ST_BADGE[o.status]||'b-gray') + '">' + (ST_LABEL[o.status]||o.status) + '</span></div>' +
      '</div>' +
    '</div>' +
    _printInfoGrid([
      { title: 'Beneficiario',
        content: '<strong style="font-size:14px">' + escapeHtml(sup ? sup.name : '-') + '</strong>' +
          (sup && sup.cuit ? '<br>CUIT: ' + escapeHtml(sup.cuit) : '') +
          (sup && sup.address ? '<br>' + escapeHtml(sup.address) : '') +
          (sup && sup.email ? '<br>' + escapeHtml(sup.email) : '') },
      { title: 'Datos Generales',
        content: 'Proyecto: <strong>' + escapeHtml(proj ? proj.name : '-') + '</strong>' +
          '<br>Fecha: <strong>' + fmtDate(o.date) + '</strong>' +
          '<br>Importe bruto: <strong>' + fmtMoney(o.gross_amount) + '</strong>' }
    ]) +
    '<div class="concept-box"><strong>Concepto:</strong> ' + escapeHtml(o.concept) + '</div>' +
    invSection +
    paySection +
    (o.notes ? '<div class="notes-box" style="margin-top:4px"><strong>Notas:</strong> ' + escapeHtml(o.notes) + '</div>' : '') +
    '<div class="sign-row">' +
      '<div><div class="sign-line">Firma del Autorizante</div></div>' +
      '<div><div class="sign-line">Conforme — Firma del Beneficiario</div></div>' +
    '</div>';

  _printDoc('Orden de Pago ' + o.number, html);
}

function printRetencion(paymentOrderId) {
  var o = DB.getById('paymentOrders', paymentOrderId);
  if (!o) return;
  var sup = DB.getById('suppliers', o.supplier_id);
  var acc = DB.getById('bankAccounts', o.account_id);
  var company = {};
  try { company = DB.getAllCompanies()[0] || {}; } catch(e) {}

  var retentions = o.retentions || [];
  if (!retentions.length) { toast('Esta orden no tiene retenciones', 'info'); return; }

  // Determine first payment method label for "Forma de pago"
  var firstPaymentMethod = '';
  var METH_LABEL = { transfer: 'Transferencia bancaria', check: 'Cheque', cash: 'Efectivo', other: 'Otro' };
  if (o.payment_methods && o.payment_methods.length) {
    var pm = o.payment_methods[0];
    firstPaymentMethod = METH_LABEL[pm.type] || pm.type || '';
  } else if (acc) {
    firstPaymentMethod = escapeHtml(acc.name || '');
  }

  // Retention rows
  var retRows = retentions.map(function(r) {
    var alicuota = r.rate != null ? (r.rate + '%') : '-';
    var baseImponible = fmtMoney(o.gross_amount);
    var codigo = escapeHtml(r.type || r.name || '-');
    var tipo = escapeHtml(r.name || r.type || '-');
    var importe = fmtMoney(r.amount || 0);
    return '<tr>' +
      '<td>' + tipo + '</td>' +
      '<td>' + codigo + '</td>' +
      '<td class="tr num">' + baseImponible + '</td>' +
      '<td class="tr">' + alicuota + '</td>' +
      '<td class="tr num">' + importe + '</td>' +
    '</tr>';
  }).join('');

  var retTable =
    '<table style="margin-bottom:0">' +
      '<thead><tr>' +
        '<th>Tipo de Retención</th>' +
        '<th>Código Régimen</th>' +
        '<th class="tr">Base Imponible</th>' +
        '<th class="tr">Alícuota</th>' +
        '<th class="tr">Importe Retenido</th>' +
      '</tr></thead>' +
      '<tbody>' + retRows + '</tbody>' +
    '</table>';

  var html =
    '<div class="doc-header">' +
      '<div>' +
        '<h1>' + escapeHtml(company.name || 'ConstructERP') + '</h1>' +
        '<div class="subtitle">Comprobante de Retención</div>' +
      '</div>' +
      '<div>' +
        '<div class="doc-num">CR-' + escapeHtml(o.number) + '</div>' +
        '<div class="doc-date">Fecha: ' + fmtDate(o.date) + '</div>' +
        '<div style="margin-top:8px"><span class="badge b-green">Emitido</span></div>' +
      '</div>' +
    '</div>' +
    _printInfoGrid([
      { title: 'Agente de Retención',
        content: '<strong style="font-size:14px">' + escapeHtml(company.name || '-') + '</strong>' +
          (company.cuit ? '<br>CUIT: ' + escapeHtml(company.cuit) : '') +
          (company.address ? '<br>' + escapeHtml(company.address) : '') },
      { title: 'Sujeto Retenido',
        content: '<strong style="font-size:14px">' + escapeHtml(sup ? sup.name : '-') + '</strong>' +
          (sup && sup.cuit ? '<br>CUIT: ' + escapeHtml(sup.cuit) : '') +
          (sup && sup.address ? '<br>' + escapeHtml(sup.address) : '') },
      { title: 'Comprobante de Referencia',
        content: 'Orden de Pago: <strong>' + escapeHtml(o.number) + '</strong>' +
          '<br>Fecha de pago: <strong>' + fmtDate(o.date) + '</strong>' +
          '<br>Concepto: <strong>' + escapeHtml(o.concept || '-') + '</strong>' },
      { title: 'Datos del Pago',
        content: 'Importe bruto: <strong>' + fmtMoney(o.gross_amount) + '</strong>' +
          '<br>Forma de pago: <strong>' + firstPaymentMethod + '</strong>' }
    ]) +
    retTable +
    _printTotals([
      { label: 'Total Retenido', value: fmtMoney(o.total_retentions || 0), grand: true }
    ]) +
    '<div class="notes-box">Este comprobante es válido como constancia de retención impositiva conforme a la normativa vigente de ARCA/AFIP. Conservarlo junto al comprobante de pago.</div>' +
    '<div class="sign-row">' +
      '<div><div class="sign-line">Firma Autorizada — Agente de Retención</div></div>' +
      '<div><div class="sign-line">Conforme — Sujeto Retenido</div></div>' +
    '</div>';

  _printDoc('Comprobante de Retención ' + o.number, html);
}

function exportPaymentOrders() {
  const suppliers = DB.getAll('suppliers');
  let orders = DB.getAll('paymentOrders');
  const f = window._po2Filters || {};
  if (f.q) orders = orders.filter(o => { const sup = suppliers.find(s=>s.id===o.supplier_id); return (o.number||'').toLowerCase().includes(f.q) || (sup && sup.name.toLowerCase().includes(f.q)) || (o.concept||'').toLowerCase().includes(f.q); });
  if (f.status) orders = orders.filter(o => o.status === f.status);
  if (f.period) { const r = _periodRange(f.period); orders = orders.filter(o => o.date && o.date >= r.from && o.date <= r.to); }
  const projects = DB.getAll('projects');
  const ST = { draft:'Borrador', pending:'Pendiente', paid:'Pagada', cancelled:'Anulada' };
  exportXLSX('ordenes_de_pago.xlsx',
    ['Número','Proveedor','Proyecto','Fecha','Concepto','Bruto','Retenciones','Neto a Pagar','Estado'],
    orders.map(o => [
      o.number,
      suppliers.find(s=>s.id===o.supplier_id)?.name || '',
      projects.find(p=>p.id===o.project_id)?.name || '',
      o.date, o.concept || '',
      o.gross_amount || 0, o.total_retentions || 0, o.net_amount || 0,
      ST[o.status] || o.status
    ])
  );
  toast(orders.length + ' órdenes exportadas', 'success');
}
