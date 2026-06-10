/* ===== ÓRDENES DE PAGO ===== */
function renderOrdenesPago() {
  const orders = DB.getAll('paymentOrders');
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
  if (!orders.length) return `<div class="empty-state"><i class="fas fa-file-invoice"></i><p>No hay órdenes de pago</p></div>`;

  const statusColor = { draft: 'badge-gray', pending: 'badge-yellow', paid: 'badge-green', cancelled: 'badge-red' };
  const statusLabel = { draft: 'Borrador', pending: 'Pendiente', paid: 'Pagada', cancelled: 'Cancelada' };

  const allSIs = DB.getAll('supplierInvoices');
  return `<table><thead><tr>
    <th>N° Orden</th><th>Proveedor</th><th>Proyecto</th><th>Fecha</th><th>Factura Prov.</th><th>Concepto</th>
    <th class="text-right">Bruto</th><th class="text-right">Retenciones</th><th class="text-right">Neto</th>
    <th>Estado</th><th>Acciones</th>
  </tr></thead>
  <tbody>
  ${orders.sort((a,b)=>b.date.localeCompare(a.date)).map(o => {
    const sup = suppliers.find(s => s.id === o.supplier_id);
    const proj = projects.find(p => p.id === o.project_id);
    const si = o.supplier_invoice_id ? allSIs.find(s => s.id === o.supplier_invoice_id) : null;
    return `<tr>
      <td><strong>${o.number}</strong></td>
      <td>${sup?.name || '-'}</td>
      <td style="font-size:11px">${proj?.name || '-'}</td>
      <td>${fmtDate(o.date)}</td>
      <td style="font-size:11px">${si ? `<span style="color:var(--primary);font-weight:600">${si.number}</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>
      <td style="font-size:12px">${o.concept}</td>
      <td class="number-cell text-right">${fmtMoney(o.gross_amount)}</td>
      <td class="number-cell text-right text-warning">${fmtMoney(o.total_retentions||0)}</td>
      <td class="number-cell text-right"><strong>${fmtMoney(o.net_amount)}</strong></td>
      <td><span class="badge ${statusColor[o.status]||'badge-gray'}">${statusLabel[o.status]||o.status}</span></td>
      <td><div class="table-actions">
        <button class="btn-ghost btn btn-sm" onclick="viewPaymentOrder('${o.id}')"><i class="fas fa-eye"></i></button>
        <button class="btn-ghost btn btn-sm" onclick="openPaymentOrderForm('${o.id}')"><i class="fas fa-edit"></i></button>
        ${o.status === 'pending' ? `<button class="btn btn-sm btn-success" onclick="markPOPaid('${o.id}')"><i class="fas fa-check"></i> Pagar</button>` : ''}
        <button class="btn-ghost btn btn-sm danger" onclick="deletePaymentOrder('${o.id}')"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('')}
  </tbody></table>`;
}

window._po2Filters = { q: '', status: '' };
function filterPOs2(q, status) {
  if (q !== undefined) window._po2Filters.q = q.toLowerCase();
  if (status !== undefined) window._po2Filters.status = status;
  let orders = DB.getAll('paymentOrders');
  const f = window._po2Filters;
  if (f.q) orders = orders.filter(o => o.number.toLowerCase().includes(f.q) || o.concept.toLowerCase().includes(f.q));
  if (f.status) orders = orders.filter(o => o.status === f.status);
  const wrap = document.getElementById('po2-table-wrap');
  if (wrap) wrap.innerHTML = buildPO2Table(orders, DB.getAll('suppliers'), DB.getAll('projects'));
}

function viewPaymentOrder(id) {
  const o = DB.getById('paymentOrders', id);
  const sup = DB.getById('suppliers', o.supplier_id);
  const proj = DB.getById('projects', o.project_id);
  const acc = DB.getById('bankAccounts', o.account_id);
  const si = o.supplier_invoice_id ? DB.getById('supplierInvoices', o.supplier_invoice_id) : null;

  openModal(`Orden de Pago ${o.number}`, `
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
  <div>
    <div style="font-size:20px;font-weight:800;color:var(--primary)">ConstructERP</div>
    <div style="font-size:11px;color:var(--text-muted)">ORDEN DE PAGO</div>
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
<button class="btn btn-secondary" onclick="window.print()"><i class="fas fa-print"></i> Imprimir</button>
${o.status === 'pending' ? `<button class="btn btn-success" onclick="markPOPaid('${o.id}');closeModal()"><i class="fas fa-check"></i> Marcar Pagada</button>` : ''}
`);
}

function openPaymentOrderForm(id = null, prefillSIId = null) {
  const o = id ? DB.getById('paymentOrders', id) : null;
  const suppliers = DB.getAll('suppliers');
  const projects = DB.getAll('projects');
  const accounts = DB.getAll('bankAccounts');
  const retentions = DB.getAll('retentions').filter(r => r.active && r.applies_to === 'payment');
  const allSIs = DB.getAll('supplierInvoices');
  const nextNum = `OP-${new Date().getFullYear()}-${String(DB.getAll('paymentOrders').length + 1).padStart(3,'0')}`;
  const effectiveSIId = prefillSIId || (o ? o.supplier_invoice_id : null);

  // Build supplier invoice options filtered by current supplier if editing
  function buildSIOpts(supplierId) {
    const filtered = allSIs.filter(si => si.status !== 'cancelled' && (!supplierId || si.supplier_id === supplierId));
    const statusLabel = { pending: 'Pendiente', paid: 'Pagada' };
    return filtered.map(si => '<option value="' + si.id + '" ' + (effectiveSIId===si.id?'selected':'') + '>' + si.number + ' — ' + fmtMoney(si.total) + ' [' + (statusLabel[si.status]||si.status) + ']</option>').join('');
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
    <label class="form-label">Factura del Proveedor</label>
    <select class="form-control" id="op-invoice" onchange="prefillPOFromInvoice(this.value)">
      <option value="">Sin factura de referencia</option>
      ${buildSIOpts(o?.supplier_id || '')}
    </select>
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
    <input class="form-control" id="op-gross" type="number" min="0" value="${o?.gross_amount || ''}" oninput="recalcPORetentions()">
  </div>
</div>
<div class="divider"></div>
<div style="font-size:13px;font-weight:600;margin-bottom:8px">Retenciones a Aplicar</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px" id="op-retentions">
  ${retentions.map(r => `<label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;background:var(--bg);padding:8px;border-radius:6px">
    <input type="checkbox" value="${r.id}" data-name="${r.name}" data-rate="${r.rate}" ${(o?.retentions||[]).find(x=>x.retention_id===r.id)?'checked':''} onchange="recalcPORetentions()">
    <span><strong>${r.name}</strong> — ${r.rate}%</span>
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
  if (prefillSIId) {
    setTimeout(function() {
      var selEl = document.getElementById('op-invoice');
      if (selEl && selEl.value !== prefillSIId) { selEl.value = prefillSIId; prefillPOFromInvoice(prefillSIId); }
      else if (selEl && selEl.value === prefillSIId) prefillPOFromInvoice(prefillSIId);
    }, 80);
  }
}

function reloadPOInvoiceSelect(supplierId) {
  const allSIs = DB.getAll('supplierInvoices');
  const sel = document.getElementById('op-invoice');
  if (!sel) return;
  const statusLabel = { pending: 'Pendiente', paid: 'Pagada' };
  const filtered = allSIs.filter(si => si.status !== 'cancelled' && (!supplierId || si.supplier_id === supplierId));
  sel.innerHTML = '<option value="">Sin factura de referencia</option>' +
    filtered.map(si => '<option value="' + si.id + '">' + si.number + ' — ' + fmtMoney(si.total) + ' [' + (statusLabel[si.status]||si.status) + ']</option>').join('');
}

function prefillPOFromInvoice(invoiceId) {
  if (!invoiceId) return;
  const si = DB.getById('supplierInvoices', invoiceId);
  if (!si) return;
  const grossEl = document.getElementById('op-gross');
  const conceptEl = document.getElementById('op-concept');
  const projEl = document.getElementById('op-project');
  if (grossEl && !grossEl.value) grossEl.value = si.total;
  if (conceptEl && !conceptEl.value) conceptEl.value = 'Pago factura ' + si.number;
  if (projEl && si.project_id) projEl.value = si.project_id;
  recalcPORetentions();
}

function recalcPORetentions() {
  const gross = parseFloat(document.getElementById('op-gross')?.value) || 0;
  const selected = Array.from(document.querySelectorAll('#op-retentions input[type="checkbox"]:checked'));
  const retentions = selected.map(cb => ({
    retention_id: cb.value,
    name: cb.dataset.name,
    rate: parseFloat(cb.dataset.rate),
    amount: gross * parseFloat(cb.dataset.rate) / 100
  }));
  const el = document.getElementById('op-totals');
  if (el) el.innerHTML = calcPOTotalsHtml(gross, retentions);
}

function calcPOTotalsHtml(gross, retentions) {
  const totalRet = retentions.reduce((s,r) => s + (r.amount||0), 0);
  const net = gross - totalRet;
  return `Bruto: <strong>${fmtMoney(gross)}</strong> &nbsp;|&nbsp; Retenciones: <strong class="text-warning">${fmtMoney(totalRet)}</strong> &nbsp;|&nbsp; <strong style="font-size:15px;color:var(--primary)">Neto: ${fmtMoney(net)}</strong>`;
}

function savePaymentOrder(id) {
  const supplierId = document.getElementById('op-supplier').value;
  const concept = document.getElementById('op-concept').value.trim();
  const gross = parseFloat(document.getElementById('op-gross').value);
  if (!supplierId || !concept || !gross) { toast('Proveedor, concepto e importe son obligatorios', 'error'); return; }

  const selected = Array.from(document.querySelectorAll('#op-retentions input[type="checkbox"]:checked'));
  const retentions = selected.map(cb => ({
    retention_id: cb.value,
    name: cb.dataset.name,
    rate: parseFloat(cb.dataset.rate),
    amount: gross * parseFloat(cb.dataset.rate) / 100
  }));
  const totalRet = retentions.reduce((s,r) => s + r.amount, 0);

  const invoiceId = document.getElementById('op-invoice')?.value || '';
  const invoiceRef = invoiceId ? (DB.getById('supplierInvoices', invoiceId)?.number || '') : '';
  const data = {
    number: document.getElementById('op-num').value,
    supplier_id: supplierId,
    project_id: document.getElementById('op-project').value || '',
    account_id: document.getElementById('op-account').value || '',
    date: document.getElementById('op-date').value,
    supplier_invoice_id: invoiceId,
    reference_doc: invoiceRef,
    concept,
    gross_amount: gross,
    retentions,
    total_retentions: totalRet,
    net_amount: gross - totalRet,
    status: document.getElementById('op-status').value,
    notes: document.getElementById('op-notes').value.trim(),
  };

  if (id) { DB.update('paymentOrders', id, data); toast('Orden actualizada', 'success'); }
  else { DB.insert('paymentOrders', data); toast('Orden creada', 'success'); }
  closeModal();
  renderOrdenesPago();
}

function markPOPaid(id) {
  if (!isApproved('payment_order', id)) {
    toast('La orden de pago debe estar aprobada antes de ejecutarla', 'error');
    return;
  }
  DB.update('paymentOrders', id, { status: 'paid' });
  toast('Orden marcada como pagada', 'success');
  renderOrdenesPago();
}

function deletePaymentOrder(id) {
  confirmDialog('¿Eliminar esta orden de pago?', () => {
    DB.remove('paymentOrders', id);
    toast('Orden eliminada', 'warning');
    renderOrdenesPago();
  });
}

function exportPaymentOrders() {
  const orders = DB.getAll('paymentOrders');
  const suppliers = DB.getAll('suppliers');
  const projects = DB.getAll('projects');
  exportXLSX('ordenes_de_pago.xlsx',
    ['Número','Proveedor','Proyecto','Fecha','Concepto','Bruto','Retenciones','Neto','Estado'],
    orders.map(o => [o.number, suppliers.find(s=>s.id===o.supplier_id)?.name||'', projects.find(p=>p.id===o.project_id)?.name||'', o.date, o.concept, o.gross_amount, o.total_retentions||0, o.net_amount, o.status])
  );
}
