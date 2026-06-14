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
    <div class="page-title">Facturacion</div>
    <div class="page-subtitle">Gestion de facturas, certificaciones y comprobantes</div>
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
      ${buildInvoiceRows(invoices, projects, collections)}
    </div>
  </div>
</div>
  `;

  window._invFilters = { q: '', status: '', project: '' };
}

function buildInvoiceRows(invoices, projects, collections) {
  if (!invoices.length) return `<div class="empty-state"><i class="fas fa-file-invoice"></i><p>No hay facturas</p></div>`;
  const sourceLabels = { manual: 'Manual', certificacion: 'Certificacion', oc: 'Desde OC' };
  return `<table><thead><tr>
    <th>Numero</th><th>Tipo</th><th>Origen</th><th>Proyecto</th><th>Cliente</th><th>Fecha</th><th>Vencimiento</th>
    <th class="text-right">Subtotal</th><th class="text-right">IVA</th><th class="text-right">Total</th>
    <th>Estado</th><th>Acciones</th>
  </tr></thead>
  <tbody>
  ${invoices.map(inv => {
    const proj = projects.find(p => p.id === inv.project_id);
    const overdue = isOverdue(inv.due_date) && inv.status !== 'paid';
    const src = inv.source || 'manual';
    const srcBadge = src === 'certificacion'
      ? '<span class="badge badge-green" style="font-size:10px">Certif.</span>'
      : src === 'oc'
      ? '<span class="badge badge-blue" style="font-size:10px">OC</span>'
      : '<span class="badge badge-gray" style="font-size:10px">Manual</span>';
    return `<tr>
      <td><strong>${inv.number}</strong></td>
      <td><span class="badge badge-cyan">Fact. ${inv.type}</span></td>
      <td>${srcBadge}</td>
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
  if (wrap) wrap.innerHTML = buildInvoiceRows(invs, DB.getAll('projects'), DB.getAll('collections'));
}

function viewInvoice(id) {
  const inv = DB.getById('invoices', id);
  const proj = DB.getById('projects', inv.project_id);
  const collections = DB.getAll('collections').filter(c => c.invoice_id === id);
  const totalCollected = collections.reduce((s,c) => s+c.amount, 0);
  const imputacion = inv.imputacion || [];

  openModal(`Factura ${inv.number}`, `
<div class="invoice-preview">
  <div class="invoice-logo-row">
    <div>
      <div style="font-size:22px;font-weight:800;color:var(--primary)">ConstructERP</div>
      <div style="font-size:12px;color:var(--text-muted)">Sistema de Gestion</div>
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
      <p><strong>ConstructERP SA</strong><br>CUIT: 30-00000000-0<br>Direccion Comercial<br>${proj ? `Proyecto: ${proj.name}` : ''}</p>
    </div>
    <div class="invoice-party-box">
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px">RECEPTOR</div>
      <p><strong>${inv.client_name}</strong><br>CUIT: ${inv.client_cuit}<br>${inv.client_address}</p>
    </div>
  </div>

  <div class="table-wrap" style="margin-bottom:16px">
  <table><thead><tr><th>Descripcion</th><th class="text-center">Unidad</th><th class="text-right">Cantidad</th><th class="text-right">P.Unit.</th><th class="text-right">Total</th></tr></thead>
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

${imputacion.length ? `
<div class="divider"></div>
<div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Imputacion Contable</div>
<table style="font-size:12px"><thead><tr><th>Rubro</th><th>Cuenta Contable</th><th class="text-right">Importe</th></tr></thead>
<tbody>
${imputacion.map(l => {
  const rb = l.rubro_id ? DB.getById('rubros', l.rubro_id) : null;
  return `<tr><td>${rb ? `<b>${rb.code}</b> ${rb.name}` : '—'}</td><td>${l.account_code ? `<b>${l.account_code}</b> ${l.account_name||''}` : '—'}</td><td class="text-right">${fmtMoney(l.amount||0)}</td></tr>`;
}).join('')}
<tr style="border-top:2px solid var(--border)"><td colspan="2"><strong>Total imputado</strong></td><td class="text-right"><strong>${fmtMoney(imputacion.reduce((s,l)=>s+(l.amount||0),0))}</strong></td></tr>
</tbody></table>
` : ''}

${collections.length ? `
<div class="divider"></div>
<div class="form-label">Pagos registrados</div>
<table style="font-size:12px"><thead><tr><th>Fecha</th><th>Metodo</th><th>Ref.</th><th>Importe</th></tr></thead>
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
  const source = inv?.source || 'manual';
  const imputacion = inv?.imputacion || [];

  openModal(inv ? 'Editar Factura' : 'Nueva Factura', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Numero</label>
    <input class="form-control" id="if-num" value="${inv?.number || nextNum}">
  </div>
  <div class="form-group">
    <label class="form-label">Tipo</label>
    <select class="form-control" id="if-type">
      <option value="A" ${inv?.type==='A'?'selected':''}>Factura A (IVA discriminado)</option>
      <option value="B" ${inv?.type==='B'?'selected':''}>Factura B</option>
      <option value="C" ${inv?.type==='C'?'selected':''}>Factura C (Monotributo)</option>
      <option value="M" ${inv?.type==='M'?'selected':''}>Factura M</option>
      <option value="X" ${inv?.type==='X'?'selected':''}>Sin IVA / No AFIP</option>
      <option value="I" ${inv?.type==='I'?'selected':''}>Interna / Informal</option>
    </select>
    <small style="color:var(--text-muted)">A/B/C/M van al Libro IVA. X e Interna se excluyen.</small>
  </div>
  <div class="form-group">
    <label class="form-label">Empresa del Grupo</label>
    <select class="form-control" id="if-company">
      <option value="">Sin empresa asignada</option>
      ${(function(){ try { return DB.getAllCompanies().map(c => '<option value="'+c.id+'"'+(inv?.company_id===c.id?' selected':'')+'>'+escapeHtml(c.name)+'</option>').join(''); } catch(e){ return ''; } })()}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Origen</label>
    <select class="form-control" id="if-source" onchange="invToggleImputacion(this.value)">
      <option value="manual" ${source==='manual'?'selected':''}>Manual (sin OC ni certificado)</option>
      <option value="certificacion" ${source==='certificacion'?'selected':''}>Desde Certificacion de Obra</option>
      <option value="oc" ${source==='oc'?'selected':''}>Desde Orden de Compra</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Referencia Origen</label>
    <input class="form-control" id="if-ref" placeholder="N° de OC / N° de certificado" value="${inv?.source_ref||''}">
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
    <label class="form-label">Razon Social Cliente *</label>
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
    <label class="form-label">Fecha Emision</label>
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
  <strong style="font-size:13px">Items de Factura</strong>
  <button class="btn btn-sm btn-secondary" onclick="addInvItem()"><i class="fas fa-plus"></i> Item</button>
</div>
<div id="inv-items">
  <div style="display:grid;grid-template-columns:3fr 80px 80px 120px 120px 36px;gap:6px;margin-bottom:4px;font-size:11px;font-weight:600;color:var(--text-muted)">
    <span>Descripcion</span><span>Unidad</span><span>Cantidad</span><span>P.Unit.</span><span>Total</span><span></span>
  </div>
  ${items.map((it, i) => invItemRow(it, i)).join('')}
</div>
<div id="inv-totals" style="text-align:right;font-size:13px;margin-top:12px">
  ${calcInvTotalsHtml(items)}
</div>

<div class="divider"></div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
  <div>
    <strong style="font-size:13px">Imputacion Contable</strong>
    <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Rubros imputados en esta factura (la cuenta surge del rubro)</div>
  </div>
  <button class="btn btn-sm btn-secondary" onclick="addImpLine()"><i class="fas fa-plus"></i> Linea</button>
</div>
<div id="imp-lines">
  <div style="display:grid;grid-template-columns:3fr 2fr 130px 36px;gap:6px;margin-bottom:4px;font-size:11px;font-weight:600;color:var(--text-muted)">
    <span>Rubro</span><span>Cuenta contable</span><span>Importe</span><span></span>
  </div>
  ${imputacion.map((l, i) => invImpRow(l, i)).join('')}
</div>
<div id="imp-totals" style="text-align:right;font-size:12px;color:var(--text-muted);margin-top:8px">
  ${calcImpTotalsHtml(imputacion, items.reduce((s, it) => s + (it.total || 0), 0))}
</div>
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveInvoice('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
  window._invItems = [...items];
  window._impLines = imputacion.map(l => Object.assign({}, l));
}

// ---- ITEMS ----
function invItemRow(it, i) {
  return `<div id="ivi-row-${i}" style="display:grid;grid-template-columns:3fr 80px 80px 120px 120px 36px;gap:6px;margin-bottom:6px;align-items:center">
    <input class="form-control" style="font-size:12px" placeholder="Descripcion" value="${it.description||''}" oninput="updateInvItem(${i},'description',this.value)">
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
  const impEl = document.getElementById('imp-totals');
  if (impEl) impEl.innerHTML = calcImpTotalsHtml(window._impLines.filter(Boolean));
}

function removeInvItem(i) {
  const row = document.getElementById(`ivi-row-${i}`);
  if (row) row.remove();
  window._invItems[i] = null;
  document.getElementById('inv-totals').innerHTML = calcInvTotalsHtml(window._invItems.filter(Boolean));
  const impEl = document.getElementById('imp-totals');
  if (impEl) impEl.innerHTML = calcImpTotalsHtml(window._impLines.filter(Boolean));
}

function calcInvTotalsHtml(items) {
  const validItems = items.filter(Boolean);
  const subtotal = validItems.reduce((s, it) => s + (it.total||0), 0);
  const tax = subtotal * 0.21;
  const total = subtotal + tax;
  return `Subtotal: <strong>${fmtMoney(subtotal)}</strong> &nbsp;|&nbsp; IVA 21%: <strong>${fmtMoney(tax)}</strong> &nbsp;|&nbsp; <strong style="font-size:15px;color:var(--primary)">TOTAL: ${fmtMoney(total)}</strong>`;
}

// ---- IMPUTACION ----
window._impLines = [];

function invImpRow(line, i) {
  const rubros = DB.getAll('rubros').filter(r => r.active !== false).sort((a, b) => a.code.localeCompare(b.code));
  const rHtml = '<option value="">— Rubro —</option>' +
    rubros.map(r => `<option value="${r.id}" data-account="${r.account_code||''}" data-aname="${r.account_name||''}" ${line.rubro_id===r.id?'selected':''}>${r.code} — ${r.name}</option>`).join('');
  const acctText = line.account_code ? (line.account_code + (line.account_name ? ' — ' + line.account_name : '')) : '—';
  return `<div id="imp-row-${i}" style="display:grid;grid-template-columns:3fr 2fr 130px 36px;gap:6px;margin-bottom:6px;align-items:center">
    <select class="form-control" style="font-size:12px" onchange="impOnRubroChange(${i},this)">${rHtml}</select>
    <div id="imp-acct-${i}" style="font-size:11px;color:var(--text-muted);padding:2px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:var(--bg);border-radius:var(--radius-sm);min-height:32px;display:flex;align-items:center">${acctText}</div>
    <input class="form-control" style="font-size:12px" type="number" min="0" value="${line.amount||0}" oninput="impUpdateField(${i},'amount',+this.value)">
    <button class="btn-ghost btn danger" onclick="removeImpLine(${i})"><i class="fas fa-times"></i></button>
  </div>`;
}

function impOnRubroChange(i, sel) {
  if (!window._impLines[i]) window._impLines[i] = {};
  const opt = sel.options[sel.selectedIndex];
  window._impLines[i].rubro_id = opt.value;
  window._impLines[i].account_code = opt.getAttribute('data-account') || '';
  window._impLines[i].account_name = opt.getAttribute('data-aname') || '';
  const el = document.getElementById('imp-acct-' + i);
  if (el) {
    const code = window._impLines[i].account_code;
    const name = window._impLines[i].account_name;
    el.textContent = code ? (code + (name ? ' — ' + name : '')) : '—';
    el.style.color = code ? 'var(--text)' : 'var(--text-muted)';
  }
}

function impUpdateField(i, field, val) {
  if (!window._impLines[i]) window._impLines[i] = {};
  window._impLines[i][field] = val;
  const el = document.getElementById('imp-totals');
  if (el) el.innerHTML = calcImpTotalsHtml(window._impLines.filter(Boolean));
}

function addImpLine() {
  const newLine = { rubro_id: '', account_code: '', account_name: '', amount: 0 };
  window._impLines.push(newLine);
  const i = window._impLines.length - 1;
  const cont = document.getElementById('imp-lines');
  const div = document.createElement('div');
  div.innerHTML = invImpRow(newLine, i);
  cont.appendChild(div.firstElementChild);
}

function removeImpLine(i) {
  const row = document.getElementById('imp-row-' + i);
  if (row) row.remove();
  window._impLines[i] = null;
  const el = document.getElementById('imp-totals');
  if (el) el.innerHTML = calcImpTotalsHtml(window._impLines.filter(Boolean));
}

function calcImpTotalsHtml(lines, netoOverride) {
  const valid = lines.filter(Boolean);
  const imputado = valid.reduce((s, l) => s + (l.amount || 0), 0);
  const neto = (netoOverride !== undefined && netoOverride !== null)
    ? netoOverride
    : (window._invItems || []).filter(Boolean).reduce((s, it) => s + (it.total || 0), 0);
  if (!valid.length) {
    if (neto > 0) return `<span style="color:var(--warning,#f59e0b)"><i class="fas fa-exclamation-triangle"></i> Sin imputar — Neto a imputar: <strong>${fmtMoney(neto)}</strong></span>`;
    return '<span style="color:var(--text-muted)">Sin lineas de imputacion</span>';
  }
  const diff = neto - imputado;
  const ok = Math.abs(diff) < 0.01;
  const color = ok ? 'var(--success,#22c55e)' : (diff > 0 ? 'var(--warning,#f59e0b)' : 'var(--danger,#ef4444)');
  return `Neto: <strong>${fmtMoney(neto)}</strong> &nbsp;|&nbsp; Imputado: <strong style="color:${color}">${fmtMoney(imputado)}</strong>` +
    (ok ? ` <i class="fas fa-check-circle" style="color:${color}"></i>`
        : ` &nbsp;|&nbsp; <span style="color:${color};font-weight:600">${diff > 0 ? `Faltan ${fmtMoney(diff)} por imputar` : `Excede por ${fmtMoney(-diff)}`}</span>`);
}

// ---- SAVE ----
function saveInvoice(id) {
  const projectId = document.getElementById('if-project').value;
  const clientName = document.getElementById('if-client').value.trim();
  if (!projectId || !clientName) { toast('Proyecto y cliente son obligatorios', 'error'); return; }

  const items = window._invItems.filter(Boolean).filter(it => it.description);
  if (!items.length) { toast('Agrega al menos un item', 'error'); return; }

  const subtotal = items.reduce((s, it) => s+it.total, 0);
  const tax = subtotal * 0.21;
  const source = document.getElementById('if-source').value;
  const imputacion = (window._impLines || []).filter(Boolean).filter(l => l.rubro_id || l.amount);

  if (imputacion.length) {
    const imputado = imputacion.reduce((s, l) => s + (l.amount || 0), 0);
    if (Math.abs(imputado - subtotal) > 0.01) {
      toast(`Imputacion incorrecta: se imputaron ${fmtMoney(imputado)} pero el neto es ${fmtMoney(subtotal)}`, 'error');
      return;
    }
  }

  const invType = document.getElementById('if-type').value;
  const data = {
    number: document.getElementById('if-num').value,
    type: invType,
    tipo_comprobante: invType,
    company_id: document.getElementById('if-company')?.value || '',
    project_id: projectId,
    status: document.getElementById('if-status').value,
    client_name: clientName,
    client_cuit: document.getElementById('if-cuit').value.trim(),
    client_address: document.getElementById('if-addr').value.trim(),
    date: document.getElementById('if-date').value,
    due_date: document.getElementById('if-due').value,
    notes: document.getElementById('if-notes').value.trim(),
    source: source,
    source_ref: document.getElementById('if-ref').value.trim(),
    items,
    imputacion,
    subtotal,
    tax,
    total: subtotal + tax,
  };

  if (id) { DB.update('invoices', id, data); toast('Factura actualizada', 'success'); }
  else { DB.insert('invoices', data); toast('Factura creada', 'success'); }

  // Generate journal entry from imputacion lines
  if (typeof autoJournalEntryFromImputacion === 'function') {
    autoJournalEntryFromImputacion('fact_emitida', imputacion, subtotal, data.total, { iva: tax }, data.date, data.number);
  }

  window._invItems = [];
  window._impLines = [];
  closeModal();
  renderFacturacion();
}

function markInvoicePaid(id) {
  DB.update('invoices', id, { status: 'paid' });
  toast('Factura marcada como cobrada', 'success');
  renderFacturacion();
}

function deleteInvoice(id) {
  confirmDialog('Eliminar esta factura?', () => {
    DB.remove('invoices', id);
    toast('Factura eliminada', 'warning');
    renderFacturacion();
  });
}

function exportInvoices() {
  const invs = DB.getAll('invoices');
  const projects = DB.getAll('projects');
  exportXLSX('facturas.xlsx',
    ['Numero','Tipo','Origen','Proyecto','Cliente','CUIT','Fecha','Vencimiento','Subtotal','IVA','Total','Estado'],
    invs.map(i => [i.number, i.type, i.source||'manual', projects.find(p=>p.id===i.project_id)?.name||'', i.client_name, i.client_cuit, i.date, i.due_date, i.subtotal, i.tax, i.total, i.status])
  );
}
