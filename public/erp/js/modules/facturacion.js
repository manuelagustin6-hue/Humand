/* ===== FACTURACIÓN ===== */
function renderFacturacion() {
  const invoices = DB.getAll('invoices');
  const projects = DB.getAll('projects');
  const collections = DB.getAll('collections');

  const totalBilled = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalPending = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0);

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Facturación</div>
    <div class="page-subtitle">Gestión de facturas, certificaciones y comprobantes</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="exportInvoices()"><i class="fas fa-download"></i> Exportar</button>
    <button class="btn btn-primary" onclick="openInvoiceForm()"><i class="fas fa-plus"></i> Nueva Factura</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-file-invoice-dollar"></i></div><div>
    <div class="stat-value">${fmtMoney(totalBilled)}</div><div class="stat-label">Facturado Total</div>
    <div class="stat-delta up">${invoices.length} facturas</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div><div>
    <div class="stat-value">${fmtMoney(totalPaid)}</div><div class="stat-label">Cobradas</div>
    <div class="stat-delta up">${invoices.filter(i=>i.status==='paid').length} facturas</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-clock"></i></div><div>
    <div class="stat-value">${fmtMoney(totalPending)}</div><div class="stat-label">Pendientes de Cobro</div>
    <div class="stat-delta">${invoices.filter(i=>i.status==='sent').length} facturas</div></div></div>
  <div class="stat-card"><div class="stat-icon red"><i class="fas fa-exclamation-circle"></i></div><div>
    <div class="stat-value">${fmtMoney(totalOverdue)}</div><div class="stat-label">Vencidas</div>
    <div class="stat-delta down">${invoices.filter(i=>i.status==='overdue').length} facturas</div></div></div>
</div>

<div class="filter-bar mt-2">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar factura, cliente..." oninput="filterInvoices(this.value)">
  </div>
  <select class="form-control" style="width:140px" onchange="filterInvoices(undefined, this.value)">
    <option value="">Todos los estados</option>
    <option value="draft">Borrador</option>
    <option value="sent">Enviada</option>
    <option value="paid">Cobrada</option>
    <option value="overdue">Vencida</option>
    <option value="cancelled">Cancelada</option>
  </select>
  <select class="form-control" style="width:180px" onchange="filterInvoices(undefined, undefined, this.value)">
    <option value="">Todos los proyectos</option>
    ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
  </select>
</div>

<div class="card">
  <div class="card-body" style="padding:0">
    <div class="table-wrap" id="inv-table-wrap">
      ${paginateHtml('inv-table-wrap', invoices, rows => buildInvoiceRows(rows, projects, collections))}
    </div>
  </div>
</div>
  `;

  window._invFilters = { q: '', status: '', project: '' };
}

function buildInvoiceRows(invoices, projects, collections) {
  if (!invoices.length) return `<div class="empty-state"><i class="fas fa-file-invoice"></i><p>No hay facturas</p></div>`;
  return `<table><thead><tr>
    <th>Número</th><th>Tipo</th><th>Proyecto</th><th>Cliente</th><th>Fecha</th><th>Vencimiento</th>
    <th class="text-right">Subtotal</th><th class="text-right">IVA</th><th class="text-right">Total</th>
    <th>Estado</th><th>Acciones</th>
  </tr></thead>
  <tbody>
  ${invoices.map(inv => {
    const proj = projects.find(p => p.id === inv.project_id);
    const collected = collections.filter(c => c.invoice_id === inv.id).reduce((s,c) => s+c.amount, 0);
    const overdue = isOverdue(inv.due_date) && inv.status !== 'paid';
    return `<tr>
      <td><strong>${inv.number}</strong></td>
      <td><span class="badge badge-cyan">Fact. ${inv.type}</span></td>
      <td>${proj ? proj.name : '-'}</td>
      <td>${inv.client_name}</td>
      <td>${fmtDate(inv.date)}</td>
      <td class="${overdue ? 'text-danger fw-bold' : ''}">${fmtDate(inv.due_date)}</td>
      <td class="number-cell text-right">${fmtMoney(inv.subtotal)}</td>
      <td class="number-cell text-right">${fmtMoney(inv.tax)}</td>
      <td class="number-cell text-right"><strong>${fmtMoney(inv.total)}</strong></td>
      <td>${statusBadge(inv.status)}</td>
      <td><div class="table-actions">
        <button class="btn-ghost btn btn-sm" onclick="viewInvoice('${inv.id}')"><i class="fas fa-eye"></i></button>
        <button class="btn-ghost btn btn-sm" onclick="openInvoiceForm('${inv.id}')"><i class="fas fa-edit"></i></button>
        ${inv.status !== 'paid' ? `<button class="btn btn-sm btn-success" onclick="markInvoicePaid('${inv.id}')"><i class="fas fa-check"></i></button>` : ''}
        <button class="btn-ghost btn btn-sm danger" onclick="deleteInvoice('${inv.id}')"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('')}
  </tbody></table>`;
}

window._invFilters = { q: '', status: '', project: '' };
function filterInvoices(q, status, project) {
  if (q !== undefined) window._invFilters.q = q.toLowerCase();
  if (status !== undefined) window._invFilters.status = status;
  if (project !== undefined) window._invFilters.project = project;
  let invs = DB.getAll('invoices');
  const f = window._invFilters;
  if (f.q) invs = invs.filter(i => i.number.toLowerCase().includes(f.q) || i.client_name.toLowerCase().includes(f.q));
  if (f.status) invs = invs.filter(i => i.status === f.status);
  if (f.project) invs = invs.filter(i => i.project_id === f.project);
  const wrap = document.getElementById('inv-table-wrap');
  if (wrap) wrap.innerHTML = paginateHtml('inv-table-wrap', invs, rows => buildInvoiceRows(rows, DB.getAll('projects'), DB.getAll('collections')));
}

function viewInvoice(id) {
  const inv = DB.getById('invoices', id);
  const proj = DB.getById('projects', inv.project_id);
  const collections = DB.getAll('collections').filter(c => c.invoice_id === id);
  const totalCollected = collections.reduce((s,c) => s+c.amount, 0);

  openModal(`Factura ${inv.number}`, `
<div class="invoice-preview">
  <div class="invoice-logo-row">
    <div>
      <div style="font-size:22px;font-weight:800;color:var(--primary)">ConstructERP</div>
      <div style="font-size:12px;color:var(--text-muted)">Sistema de Gestión</div>
    </div>
    <div class="invoice-number-box">
      <div style="font-size:11px;color:var(--text-muted);font-weight:600">FACTURA ${inv.type}</div>
      <div class="num">${inv.number}</div>
      <div style="font-size:12px">Fecha: ${fmtDate(inv.date)}</div>
      <div style="font-size:12px">Vence: ${fmtDate(inv.due_date)}</div>
      <div style="margin-top:6px">${statusBadge(inv.status)}</div>
    </div>
  </div>

  <div class="invoice-parties">
    <div class="invoice-party-box">
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px">EMISOR</div>
      <p><strong>ConstructERP SA</strong><br>CUIT: 30-00000000-0<br>Dirección Comercial<br>${proj ? `Proyecto: ${proj.name}` : ''}</p>
    </div>
    <div class="invoice-party-box">
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px">RECEPTOR</div>
      <p><strong>${inv.client_name}</strong><br>CUIT: ${inv.client_cuit}<br>${inv.client_address}</p>
    </div>
  </div>

  <div class="table-wrap" style="margin-bottom:16px">
  <table><thead><tr><th>Descripción</th><th class="text-center">Unidad</th><th class="text-right">Cantidad</th><th class="text-right">P.Unit.</th><th class="text-right">Total</th></tr></thead>
  <tbody>
  ${inv.items.map(it => `<tr><td>${it.description}</td><td class="text-center">${it.unit}</td>
    <td class="number-cell text-right">${fmtNum(it.quantity)}</td>
    <td class="number-cell text-right">${fmtMoney(it.unit_price)}</td>
    <td class="number-cell text-right"><strong>${fmtMoney(it.total)}</strong></td></tr>`).join('')}
  </tbody></table>
  </div>

  <div style="display:flex;justify-content:flex-end">
    <div class="invoice-totals">
      <div class="invoice-total-row"><span>Subtotal</span><span>${fmtMoney(inv.subtotal)}</span></div>
      <div class="invoice-total-row"><span>IVA (21%)</span><span>${fmtMoney(inv.tax)}</span></div>
      <div class="invoice-total-row grand"><span>TOTAL</span><span>${fmtMoney(inv.total)}</span></div>
    </div>
  </div>

  ${inv.notes ? `<div style="margin-top:12px;font-size:12px;color:var(--text-muted)"><strong>Notas:</strong> ${inv.notes}</div>` : ''}
</div>

${collections.length ? `
<div class="divider"></div>
<div class="form-label">Pagos registrados</div>
<table style="font-size:12px"><thead><tr><th>Fecha</th><th>Método</th><th>Ref.</th><th>Importe</th></tr></thead>
<tbody>${collections.map(c => `<tr><td>${fmtDate(c.date)}</td><td>${c.method}</td><td>${c.reference}</td><td>${fmtMoney(c.amount)}</td></tr>`).join('')}
<tr class="total-row"><td colspan="3">Total cobrado</td><td>${fmtMoney(totalCollected)}</td></tr>
<tr><td colspan="3">Saldo pendiente</td><td class="${inv.total - totalCollected > 0 ? 'text-danger' : 'text-success'}">${fmtMoney(inv.total - totalCollected)}</td></tr>
</tbody></table>` : ''}
`, 'modal-lg',
  `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
   <button class="btn btn-secondary" onclick="window.print()"><i class="fas fa-print"></i> Imprimir</button>
   ${inv.status !== 'paid' ? `<button class="btn btn-success" onclick="markInvoicePaid('${inv.id}'); closeModal()"><i class="fas fa-check"></i> Marcar Cobrada</button>` : ''}`);
}

function openInvoiceForm(id = null) {
  const inv = id ? DB.getById('invoices', id) : null;
  const projects = DB.getAll('projects');
  const items = inv?.items || [{ description: '', unit: 'Global', quantity: 1, unit_price: 0, total: 0, tax_rate: 21 }];
  const nextNum = `FA-0001-${String(DB.getAll('invoices').length + 1235).padStart(8,'0')}`;

  openModal(inv ? 'Editar Factura' : 'Nueva Factura', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Número</label>
    <input class="form-control" id="if-num" value="${inv?.number || nextNum}">
  </div>
  <div class="form-group">
    <label class="form-label">Tipo</label>
    <select class="form-control" id="if-type">
      <option value="A" ${inv?.type==='A'?'selected':''}>Factura A</option>
      <option value="B" ${inv?.type==='B'?'selected':''}>Factura B</option>
      <option value="C" ${inv?.type==='C'?'selected':''}>Factura C</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Proyecto *</label>
    <select class="form-control" id="if-project">
      <option value="">Seleccionar...</option>
      ${projects.map(p => `<option value="${p.id}" ${inv?.project_id===p.id?'selected':''}>${p.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Estado</label>
    <select class="form-control" id="if-status">
      ${['draft','sent','paid','overdue','cancelled'].map(s => `<option value="${s}" ${inv?.status===s?'selected':''}>${s}</option>`).join('')}
    </select>
  </div>
  <div class="form-group full">
    <label class="form-label">Razón Social Cliente *</label>
    <input class="form-control" id="if-client" value="${inv?.client_name || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">CUIT Cliente</label>
    <input class="form-control" id="if-cuit" value="${inv?.client_cuit || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">Domicilio Cliente</label>
    <input class="form-control" id="if-addr" value="${inv?.client_address || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha Emisión</label>
    <input class="form-control" id="if-date" type="date" value="${inv?.date || todayStr()}">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha Vencimiento</label>
    <input class="form-control" id="if-due" type="date" value="${inv?.due_date || addDays(todayStr(), 30)}">
  </div>
  <div class="form-group full">
    <label class="form-label">Notas</label>
    <textarea class="form-control" id="if-notes" rows="2">${inv?.notes || ''}</textarea>
  </div>
</div>

<div class="divider"></div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
  <strong style="font-size:13px">Ítems de Factura</strong>
  <button class="btn btn-sm btn-secondary" onclick="addInvItem()"><i class="fas fa-plus"></i> Ítem</button>
</div>
<div id="inv-items">
  <div style="display:grid;grid-template-columns:3fr 80px 80px 120px 120px 36px;gap:6px;margin-bottom:4px;font-size:11px;font-weight:600;color:var(--text-muted)">
    <span>Descripción</span><span>Unidad</span><span>Cantidad</span><span>P.Unit.</span><span>Total</span><span></span>
  </div>
  ${items.map((it, i) => invItemRow(it, i)).join('')}
</div>
<div id="inv-totals" style="text-align:right;font-size:13px;margin-top:12px">
  ${calcInvTotalsHtml(items)}
</div>
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveInvoice('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
  window._invItems = [...items];
}

function invItemRow(it, i) {
  return `<div id="ivi-row-${i}" style="display:grid;grid-template-columns:3fr 80px 80px 120px 120px 36px;gap:6px;margin-bottom:6px;align-items:center">
    <input class="form-control" style="font-size:12px" placeholder="Descripción" value="${it.description||''}" oninput="updateInvItem(${i},'description',this.value)">
    <input class="form-control" style="font-size:12px" value="${it.unit||'Global'}" oninput="updateInvItem(${i},'unit',this.value)">
    <input class="form-control" style="font-size:12px" type="number" min="0" step="0.01" value="${it.quantity||1}" oninput="updateInvItem(${i},'quantity',+this.value)">
    <input class="form-control" style="font-size:12px" type="number" min="0" value="${it.unit_price||0}" oninput="updateInvItem(${i},'unit_price',+this.value)">
    <input class="form-control" style="font-size:12px;background:#f8fafc" readonly id="ivi-total-${i}" value="${it.total||0}">
    <button class="btn-ghost btn danger" onclick="removeInvItem(${i})"><i class="fas fa-times"></i></button>
  </div>`;
}

window._invItems = [];
function addInvItem() {
  const newItem = { description: '', unit: 'Global', quantity: 1, unit_price: 0, total: 0, tax_rate: 21 };
  window._invItems.push(newItem);
  const i = window._invItems.length - 1;
  const cont = document.getElementById('inv-items');
  const div = document.createElement('div');
  div.innerHTML = invItemRow(newItem, i);
  cont.appendChild(div.firstElementChild);
}

function updateInvItem(i, field, val) {
  if (!window._invItems[i]) window._invItems[i] = { description:'', unit:'Global', quantity:1, unit_price:0, total:0, tax_rate:21 };
  window._invItems[i][field] = val;
  window._invItems[i].total = (window._invItems[i].quantity||0) * (window._invItems[i].unit_price||0);
  const el = document.getElementById(`ivi-total-${i}`);
  if (el) el.value = window._invItems[i].total;
  document.getElementById('inv-totals').innerHTML = calcInvTotalsHtml(window._invItems.filter(Boolean));
}

function removeInvItem(i) {
  const row = document.getElementById(`ivi-row-${i}`);
  if (row) row.remove();
  window._invItems[i] = null;
  document.getElementById('inv-totals').innerHTML = calcInvTotalsHtml(window._invItems.filter(Boolean));
}

function calcInvTotalsHtml(items) {
  const validItems = items.filter(Boolean);
  const subtotal = validItems.reduce((s, it) => s + (it.total||0), 0);
  const tax = subtotal * 0.21;
  const total = subtotal + tax;
  return `Subtotal: <strong>${fmtMoney(subtotal)}</strong> &nbsp;|&nbsp; IVA 21%: <strong>${fmtMoney(tax)}</strong> &nbsp;|&nbsp; <strong style="font-size:15px;color:var(--primary)">TOTAL: ${fmtMoney(total)}</strong>`;
}

function saveInvoice(id) {
  const projectId = document.getElementById('if-project').value;
  const clientName = document.getElementById('if-client').value.trim();
  if (!projectId || !clientName) { toast('Proyecto y cliente son obligatorios', 'error'); return; }

  const items = window._invItems.filter(Boolean).filter(it => it.description);
  if (!items.length) { toast('Agregá al menos un ítem', 'error'); return; }

  const subtotal = items.reduce((s, it) => s+it.total, 0);
  const tax = subtotal * 0.21;

  const data = {
    number: document.getElementById('if-num').value,
    type: document.getElementById('if-type').value,
    project_id: projectId,
    status: document.getElementById('if-status').value,
    client_name: clientName,
    client_cuit: document.getElementById('if-cuit').value.trim(),
    client_address: document.getElementById('if-addr').value.trim(),
    date: document.getElementById('if-date').value,
    due_date: document.getElementById('if-due').value,
    notes: document.getElementById('if-notes').value.trim(),
    items,
    subtotal,
    tax,
    total: subtotal + tax,
  };

  if (id) { DB.update('invoices', id, data); toast('Factura actualizada', 'success'); }
  else { DB.insert('invoices', data); toast('Factura creada', 'success'); }

  window._invItems = [];
  closeModal();
  renderFacturacion();
}

function markInvoicePaid(id) {
  DB.update('invoices', id, { status: 'paid' });
  toast('Factura marcada como cobrada', 'success');
  renderFacturacion();
}

function deleteInvoice(id) {
  confirmDialog('¿Eliminar esta factura?', () => {
    DB.remove('invoices', id);
    toast('Factura eliminada', 'warning');
    renderFacturacion();
  });
}

function exportInvoices() {
  const invs = DB.getAll('invoices');
  const projects = DB.getAll('projects');
  exportCSV('facturas.csv',
    ['Número','Tipo','Proyecto','Cliente','CUIT','Fecha','Vencimiento','Subtotal','IVA','Total','Estado'],
    invs.map(i => [i.number, i.type, projects.find(p=>p.id===i.project_id)?.name||'', i.client_name, i.client_cuit, i.date, i.due_date, i.subtotal, i.tax, i.total, i.status])
  );
}
