/* ===== COMPRAS ===== */
function renderCompras() {
  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div><div class="page-title">Compras</div><div class="page-subtitle">Órdenes de compra, proveedores y materiales</div></div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="openSupplierForm()"><i class="fas fa-truck"></i> Nuevo Proveedor</button>
    <button class="btn btn-primary" onclick="openPOForm()"><i class="fas fa-plus"></i> Nueva OC</button>
  </div>
</div>
<div id="compras-tabs">
  <div class="tabs"><button class="tab-btn" data-tab="tab-oc">Órdenes de Compra</button><button class="tab-btn" data-tab="tab-suppliers">Proveedores</button></div>
  <div id="tab-oc" class="tab-content">${renderPOTable()}</div>
  <div id="tab-suppliers" class="tab-content">${renderSuppliersTable()}</div>
</div>`;
  initTabs('compras-tabs');
}

function renderPOTable() {
  const pos = DB.getAll('purchaseOrders');
  const projects = DB.getAll('projects');
  const suppliers = DB.getAll('suppliers');
  const totalPending = pos.filter(p => ['draft','sent'].includes(p.status)).reduce((s,p) => s+p.total, 0);
  const totalReceived = pos.filter(p => p.status === 'received').reduce((s,p) => s+p.total, 0);
  return `
<div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-file-alt"></i></div><div><div class="stat-value">${pos.length}</div><div class="stat-label">OC Totales</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-clock"></i></div><div><div class="stat-value">${pos.filter(p=>p.status==='sent').length}</div><div class="stat-label">Enviadas</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check"></i></div><div><div class="stat-value">${fmtMoney(totalReceived)}</div><div class="stat-label">Total Recibido</div></div></div>
  <div class="stat-card"><div class="stat-icon red"><i class="fas fa-hourglass"></i></div><div><div class="stat-value">${fmtMoney(totalPending)}</div><div class="stat-label">Pendiente Recepción</div></div></div>
</div>
<div class="filter-bar">
  <div class="search-input-wrap"><i class="fas fa-search"></i><input type="text" placeholder="Buscar OC, proveedor..." oninput="filterPOs(this.value)"></div>
  <select class="form-control" style="width:140px" onchange="filterPOs(undefined, this.value)"><option value="">Todos los estados</option><option value="draft">Borrador</option><option value="sent">Enviada</option><option value="received">Recibida</option><option value="cancelled">Cancelada</option></select>
  <button class="btn btn-secondary" onclick="exportPOs()"><i class="fas fa-download"></i> Exportar</button>
</div>
<div class="card"><div class="card-body" style="padding:0"><div class="table-wrap" id="po-table-wrap">${buildPORows(pos, projects, suppliers)}</div></div></div>`;
}

function buildPORows(pos, projects, suppliers) {
  if (!pos.length) return `<div class="empty-state"><i class="fas fa-shopping-cart"></i><p>No hay órdenes de compra</p></div>`;
  return `<table><thead><tr><th>Número</th><th>Proyecto</th><th>Proveedor</th><th>Fecha</th><th>Entrega Est.</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
  ${pos.map(po => {
    const proj = projects.find(p => p.id === po.project_id);
    const sup = suppliers.find(s => s.id === po.supplier_id);
    return `<tr><td><strong>${po.number}</strong></td><td>${proj ? proj.name : '-'}</td><td>${sup ? sup.name : '-'}</td><td>${fmtDate(po.date)}</td><td>${fmtDate(po.expected_date)}</td><td class="number-cell"><strong>${fmtMoney(po.total)}</strong></td><td>${statusBadge(po.status)}</td><td><div class="table-actions"><button class="btn-ghost btn btn-sm" onclick="viewPO('${po.id}')"><i class="fas fa-eye"></i></button><button class="btn-ghost btn btn-sm" onclick="openPOForm('${po.id}')"><i class="fas fa-edit"></i></button>${po.status === 'sent' ? `<button class="btn btn-sm btn-success" onclick="receivePO('${po.id}')"><i class="fas fa-check"></i> Recibir</button>` : ''}<button class="btn-ghost btn btn-sm danger" onclick="deletePO('${po.id}')"><i class="fas fa-trash"></i></button></div></td></tr>`;
  }).join('')}</tbody></table>`;
}

window._poFilters = { q: '', status: '' };
function filterPOs(q, status) {
  if (q !== undefined) window._poFilters.q = q.toLowerCase();
  if (status !== undefined) window._poFilters.status = status;
  let pos = DB.getAll('purchaseOrders');
  const suppliers = DB.getAll('suppliers');
  const f = window._poFilters;
  if (f.q) pos = pos.filter(po => { const s = suppliers.find(s => s.id === po.supplier_id); return po.number.toLowerCase().includes(f.q) || (s && s.name.toLowerCase().includes(f.q)); });
  if (f.status) pos = pos.filter(po => po.status === f.status);
  const wrap = document.getElementById('po-table-wrap');
  if (wrap) wrap.innerHTML = buildPORows(pos, DB.getAll('projects'), suppliers);
}

function viewPO(id) {
  const po = DB.getById('purchaseOrders', id);
  const proj = DB.getById('projects', po.project_id);
  const sup = DB.getById('suppliers', po.supplier_id);
  openModal(`OC ${po.number}`, `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
  <div><div class="form-label">Proyecto</div><p>${proj?.name || '-'}</p><div class="form-label mt-1">Proveedor</div><p>${sup?.name || '-'}</p></div>
  <div><div class="form-label">Fecha OC</div><p>${fmtDate(po.date)}</p><div class="form-label mt-1">Estado</div><p>${statusBadge(po.status)}</p></div>
</div>
<div class="table-wrap"><table><thead><tr><th>Descripción</th><th>Unidad</th><th>Cantidad</th><th>P. Unitario</th><th>Total</th></tr></thead><tbody>
${po.items.map(it => `<tr><td>${it.description}</td><td>${it.unit}</td><td class="number-cell">${fmtNum(it.quantity)}</td><td class="number-cell">${fmtMoney(it.unit_price)}</td><td class="number-cell"><strong>${fmtMoney(it.total)}</strong></td></tr>`).join('')}
<tr class="total-row"><td colspan="4" class="text-right">Subtotal</td><td class="number-cell">${fmtMoney(po.subtotal)}</td></tr>
<tr class="total-row"><td colspan="4" class="text-right">IVA (21%)</td><td class="number-cell">${fmtMoney(po.tax)}</td></tr>
<tr class="total-row"><td colspan="4" class="text-right fw-bold">TOTAL</td><td class="number-cell fw-bold">${fmtMoney(po.total)}</td></tr>
</tbody></table></div>`, 'modal-lg',
  `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button><button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Imprimir</button>`);
}

function openPOForm(id = null) {
  const po = id ? DB.getById('purchaseOrders', id) : null;
  const projects = DB.getAll('projects');
  const suppliers = DB.getAll('suppliers');
  const items = po?.items || [{ description: '', unit: 'un', quantity: 1, unit_price: 0, total: 0 }];
  const nextNum = `OC-${new Date().getFullYear()}-${String(DB.getAll('purchaseOrders').length + 1).padStart(3, '0')}`;
  window._poItems = [...items];
  openModal(po ? 'Editar OC' : 'Nueva Orden de Compra', `
<div class="form-grid form-grid-2">
  <div class="form-group"><label class="form-label">Número OC</label><input class="form-control" id="po-num" value="${po?.number || nextNum}"></div>
  <div class="form-group"><label class="form-label">Estado</label><select class="form-control" id="po-status">${['draft','sent','received','cancelled'].map(s => `<option value="${s}" ${po?.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
  <div class="form-group"><label class="form-label">Proyecto *</label><select class="form-control" id="po-project"><option value="">Seleccionar...</option>${projects.map(p => `<option value="${p.id}" ${po?.project_id===p.id?'selected':''}>${p.name}</option>`).join('')}</select></div>
  <div class="form-group"><label class="form-label">Proveedor *</label><select class="form-control" id="po-supplier"><option value="">Seleccionar...</option>${suppliers.map(s => `<option value="${s.id}" ${po?.supplier_id===s.id?'selected':''}>${s.name}</option>`).join('')}</select></div>
  <div class="form-group"><label class="form-label">Fecha OC</label><input class="form-control" id="po-date" type="date" value="${po?.date || todayStr()}"></div>
  <div class="form-group"><label class="form-label">Entrega Estimada</label><input class="form-control" id="po-expected" type="date" value="${po?.expected_date || addDays(todayStr(), 15)}"></div>
  <div class="form-group full"><label class="form-label">Notas</label><textarea class="form-control" id="po-notes" rows="2">${po?.notes || ''}</textarea></div>
</div>
<div class="divider"></div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><strong style="font-size:13px">Ítems</strong><button class="btn btn-sm btn-secondary" onclick="addPOItem()"><i class="fas fa-plus"></i> Agregar ítem</button></div>
<div id="po-items">
  <div style="display:grid;grid-template-columns:3fr 80px 80px 120px 120px 36px;gap:6px;margin-bottom:4px;font-size:11px;font-weight:600;color:var(--text-muted)"><span>Descripción</span><span>Unidad</span><span>Cantidad</span><span>P.Unitario</span><span>Total</span><span></span></div>
  ${items.map((it, i) => poItemRow(it, i)).join('')}
</div>
<div class="divider"></div>
<div id="po-totals" style="text-align:right;font-size:13px">${calcPOTotalsHtml(items)}</div>
`, 'modal-lg', `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="savePO('${id||''}')"><i class="fas fa-save"></i> Guardar</button>`);
}

function poItemRow(it, i) {
  return `<div id="poi-row-${i}" style="display:grid;grid-template-columns:3fr 80px 80px 120px 120px 36px;gap:6px;margin-bottom:6px;align-items:center">
    <input class="form-control" style="font-size:12px" placeholder="Descripción" value="${it.description}" oninput="updatePOItem(${i},'description',this.value)">
    <input class="form-control" style="font-size:12px" value="${it.unit}" oninput="updatePOItem(${i},'unit',this.value)">
    <input class="form-control" style="font-size:12px" type="number" min="0" value="${it.quantity}" oninput="updatePOItem(${i},'quantity',+this.value)">
    <input class="form-control" style="font-size:12px" type="number" min="0" value="${it.unit_price}" oninput="updatePOItem(${i},'unit_price',+this.value)">
    <input class="form-control" style="font-size:12px;background:#f8fafc" readonly value="${fmtMoney(it.total).replace('$','').trim()}" id="poi-total-${i}">
    <button class="btn-ghost btn danger" onclick="removePOItem(${i})"><i class="fas fa-times"></i></button>
  </div>`;
}

window._poItems = [];
function addPOItem() {
  window._poItems.push({ description: '', unit: 'un', quantity: 1, unit_price: 0, total: 0 });
  const i = window._poItems.length - 1;
  const cont = document.getElementById('po-items');
  const div = document.createElement('div');
  div.innerHTML = poItemRow({ description: '', unit: 'un', quantity: 1, unit_price: 0, total: 0 }, i);
  cont.appendChild(div.firstElementChild);
}

function updatePOItem(i, field, val) {
  if (!window._poItems[i]) window._poItems[i] = { description: '', unit: 'un', quantity: 1, unit_price: 0, total: 0 };
  window._poItems[i][field] = val;
  window._poItems[i].total = (window._poItems[i].quantity || 0) * (window._poItems[i].unit_price || 0);
  const totEl = document.getElementById(`poi-total-${i}`);
  if (totEl) totEl.value = fmtMoney(window._poItems[i].total).replace('$','').trim();
  document.getElementById('po-totals').innerHTML = calcPOTotalsHtml(window._poItems);
}

function removePOItem(i) {
  const row = document.getElementById(`poi-row-${i}`);
  if (row) row.remove();
  window._poItems[i] = null;
  document.getElementById('po-totals').innerHTML = calcPOTotalsHtml(window._poItems.filter(Boolean));
}

function calcPOTotalsHtml(items) {
  const validItems = items.filter(Boolean);
  const subtotal = validItems.reduce((s, it) => s + (it.total || 0), 0);
  const tax = subtotal * 0.21;
  const total = subtotal + tax;
  return `<span>Subtotal: <strong>${fmtMoney(subtotal)}</strong> &nbsp;|&nbsp; IVA 21%: <strong>${fmtMoney(tax)}</strong> &nbsp;|&nbsp; TOTAL: <strong style="font-size:15px;color:var(--primary)">${fmtMoney(total)}</strong></span>`;
}

function savePO(id) {
  const projectId = document.getElementById('po-project').value;
  const supplierId = document.getElementById('po-supplier').value;
  if (!projectId || !supplierId) { toast('Proyecto y proveedor son obligatorios', 'error'); return; }
  const items = window._poItems.filter(Boolean).filter(it => it.description);
  if (!items.length) {
    const rows = document.querySelectorAll('[id^="poi-row-"]');
    rows.forEach((row) => { const inputs = row.querySelectorAll('input'); if (inputs[0]?.value) items.push({ description: inputs[0].value, unit: inputs[1]?.value || 'un', quantity: +inputs[2]?.value || 1, unit_price: +inputs[3]?.value || 0, total: (+inputs[2]?.value || 1) * (+inputs[3]?.value || 0) }); });
  }
  const subtotal = items.reduce((s,it) => s + it.total, 0);
  const tax = subtotal * 0.21;
  const data = { number: document.getElementById('po-num').value, project_id: projectId, supplier_id: supplierId, status: document.getElementById('po-status').value, date: document.getElementById('po-date').value, expected_date: document.getElementById('po-expected').value, notes: document.getElementById('po-notes').value, items, subtotal, tax, total: subtotal + tax };
  if (id) { DB.update('purchaseOrders', id, data); toast('OC actualizada', 'success'); }
  else { DB.insert('purchaseOrders', data); toast('OC creada', 'success'); }
  window._poItems = []; closeModal(); renderCompras();
}

function receivePO(id) { DB.update('purchaseOrders', id, { status: 'received' }); toast('OC marcada como recibida', 'success'); renderCompras(); }
function deletePO(id) { confirmDialog('¿Eliminar esta orden de compra?', () => { DB.remove('purchaseOrders', id); toast('OC eliminada', 'warning'); renderCompras(); }); }
function exportPOs() {
  const pos = DB.getAll('purchaseOrders'); const projects = DB.getAll('projects'); const suppliers = DB.getAll('suppliers');
  exportCSV('ordenes_compra.csv', ['Número','Proyecto','Proveedor','Fecha','Entrega','Subtotal','IVA','Total','Estado'], pos.map(po => [po.number, projects.find(p=>p.id===po.project_id)?.name||'', suppliers.find(s=>s.id===po.supplier_id)?.name||'', po.date, po.expected_date, po.subtotal, po.tax, po.total, po.status]));
}

function renderSuppliersTable() {
  const suppliers = DB.getAll('suppliers');
  return `<div class="filter-bar"><div class="search-input-wrap"><i class="fas fa-search"></i><input type="text" placeholder="Buscar proveedor..." oninput="filterSuppliers(this.value)"></div><button class="btn btn-primary" onclick="openSupplierForm()"><i class="fas fa-plus"></i> Nuevo Proveedor</button></div>
<div class="card"><div class="card-body" style="padding:0"><div class="table-wrap" id="suppliers-table-wrap">${buildSupplierRows(suppliers)}</div></div></div>`;
}

function buildSupplierRows(suppliers) {
  if (!suppliers.length) return `<div class="empty-state"><i class="fas fa-truck"></i><p>No hay proveedores</p></div>`;
  return `<table><thead><tr><th>Razón Social</th><th>CUIT</th><th>Contacto</th><th>Email</th><th>Teléfono</th><th>Categorías</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
  ${suppliers.map(s => `<tr><td><strong>${s.name}</strong></td><td>${s.cuit}</td><td>${s.contact}</td><td>${s.email}</td><td>${s.phone}</td><td>${(s.category || []).map(c => `<span class="badge badge-gray">${c}</span>`).join(' ')}</td><td>${statusBadge(s.status)}</td><td><div class="table-actions"><button class="btn-ghost btn btn-sm" onclick="openSupplierForm('${s.id}')"><i class="fas fa-edit"></i></button><button class="btn-ghost btn btn-sm danger" onclick="deleteSupplier('${s.id}')"><i class="fas fa-trash"></i></button></div></td></tr>`).join('')}
  </tbody></table>`;
}

function filterSuppliers(q) {
  q = q.toLowerCase();
  let sups = DB.getAll('suppliers');
  if (q) sups = sups.filter(s => s.name.toLowerCase().includes(q) || s.cuit.includes(q));
  const wrap = document.getElementById('suppliers-table-wrap');
  if (wrap) wrap.innerHTML = buildSupplierRows(sups);
}

function openSupplierForm(id = null) {
  const s = id ? DB.getById('suppliers', id) : null;
  openModal(s ? 'Editar Proveedor' : 'Nuevo Proveedor', `
<div class="form-grid form-grid-2">
  <div class="form-group full"><label class="form-label">Razón Social *</label><input class="form-control" id="sf-name" value="${s?.name || ''}"></div>
  <div class="form-group"><label class="form-label">CUIT</label><input class="form-control" id="sf-cuit" value="${s?.cuit || ''}"></div>
  <div class="form-group"><label class="form-label">Contacto</label><input class="form-control" id="sf-contact" value="${s?.contact || ''}"></div>
  <div class="form-group"><label class="form-label">Email</label><input class="form-control" id="sf-email" type="email" value="${s?.email || ''}"></div>
  <div class="form-group"><label class="form-label">Teléfono</label><input class="form-control" id="sf-phone" value="${s?.phone || ''}"></div>
  <div class="form-group"><label class="form-label">Estado</label><select class="form-control" id="sf-status"><option value="active" ${s?.status==='active'?'selected':''}>Activo</option><option value="inactive" ${s?.status==='inactive'?'selected':''}>Inactivo</option></select></div>
  <div class="form-group full"><label class="form-label">Categorías (separadas por coma)</label><input class="form-control" id="sf-category" value="${(s?.category || []).join(', ')}"></div>
</div>`, '', `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveSupplier('${id||''}')"><i class="fas fa-save"></i> Guardar</button>`);
}

function saveSupplier(id) {
  const name = document.getElementById('sf-name').value.trim();
  if (!name) { toast('La razón social es obligatoria', 'error'); return; }
  const data = { name, cuit: document.getElementById('sf-cuit').value.trim(), contact: document.getElementById('sf-contact').value.trim(), email: document.getElementById('sf-email').value.trim(), phone: document.getElementById('sf-phone').value.trim(), status: document.getElementById('sf-status').value, category: document.getElementById('sf-category').value.split(',').map(c => c.trim()).filter(Boolean) };
  if (id) { DB.update('suppliers', id, data); toast('Proveedor actualizado', 'success'); }
  else { DB.insert('suppliers', data); toast('Proveedor creado', 'success'); }
  closeModal(); renderCompras();
}

function deleteSupplier(id) { confirmDialog('¿Eliminar este proveedor?', () => { DB.remove('suppliers', id); toast('Proveedor eliminado', 'warning'); renderCompras(); }); }
