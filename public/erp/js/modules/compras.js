/* ===== COMPRAS ===== */
function renderCompras() {
  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Compras</div>
    <div class="page-subtitle">Pedidos de materiales y órdenes de compra</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="openSupplierForm()"><i class="fas fa-truck"></i> Nuevo Proveedor</button>
    <button class="btn btn-secondary" onclick="openPOForm()"><i class="fas fa-file-alt"></i> Nueva OC</button>
    <button class="btn btn-primary" onclick="openRequisitionForm()"><i class="fas fa-plus"></i> Nuevo Pedido</button>
  </div>
</div>

<div id="compras-tabs">
  <div class="tabs">
    <button class="tab-btn" data-tab="tab-pedidos">Pedidos de Materiales</button>
    <button class="tab-btn" data-tab="tab-oc">Órdenes de Compra</button>
    <button class="tab-btn" data-tab="tab-suppliers">Proveedores</button>
  </div>
  <div id="tab-pedidos" class="tab-content">
    ${renderRequisitionsTab()}
  </div>
  <div id="tab-oc" class="tab-content">
    ${renderPOTable()}
  </div>
  <div id="tab-suppliers" class="tab-content">
    ${renderSuppliersTable()}
  </div>
</div>
  `;
  initTabs('compras-tabs');
}

// ==== REQUISITIONS (PEDIDOS DE MATERIALES) ====

function renderRequisitionsTab() {
  const reqs = DB.getAll('purchaseRequisitions');
  const projects = DB.getAll('projects');

  const pending = reqs.filter(r => r.status === 'submitted').length;
  const approved = reqs.filter(r => r.status === 'approved').length;
  const converted = reqs.filter(r => r.status === 'converted').length;
  const totalAmt = reqs.reduce((s, r) => s + (r.total || 0), 0);

  return `
<div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-clipboard-list"></i></div><div>
    <div class="stat-value">${reqs.length}</div><div class="stat-label">Total Pedidos</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-clock"></i></div><div>
    <div class="stat-value">${pending}</div><div class="stat-label">Pendientes Aprobación</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div><div>
    <div class="stat-value">${approved}</div><div class="stat-label">Aprobados</div></div></div>
  <div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-exchange-alt"></i></div><div>
    <div class="stat-value">${fmtMoney(totalAmt)}</div><div class="stat-label">Monto Total Est.</div></div></div>
</div>
<div class="filter-bar">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar pedido, proyecto, solicitante..." oninput="filterRequisitions(this.value)">
  </div>
  <select class="form-control" style="width:170px" onchange="filterRequisitions(undefined, this.value)">
    <option value="">Todos los estados</option>
    <option value="draft">Borrador</option>
    <option value="submitted">Enviado</option>
    <option value="approved">Aprobado</option>
    <option value="rejected">Rechazado</option>
    <option value="converted">Convertido a OC</option>
  </select>
  <select class="form-control" style="width:130px" onchange="filterRequisitions(undefined, undefined, this.value)">
    <option value="">Toda prioridad</option>
    <option value="normal">Normal</option>
    <option value="urgent">Urgente</option>
    <option value="critical">Crítico</option>
  </select>
  <button class="btn btn-secondary" onclick="exportRequisitions()"><i class="fas fa-download"></i> Exportar</button>
</div>
<div class="card">
  <div class="card-body" style="padding:0">
    <div class="table-wrap" id="req-table-wrap">
      ${buildRequisitionRows(reqs, projects)}
    </div>
  </div>
</div>`;
}

function reqPriorityBadge(priority) {
  const map = { normal: ['badge-gray','Normal'], urgent: ['badge-yellow','Urgente'], critical: ['badge-red','Crítico'] };
  const [cls, label] = map[priority] || ['badge-gray', priority];
  return `<span class="badge ${cls}">${label}</span>`;
}

function buildRequisitionRows(reqs, projects) {
  if (!reqs.length) return `<div class="empty-state"><i class="fas fa-clipboard-list"></i><p>No hay pedidos de materiales</p></div>`;
  return `<table><thead><tr>
    <th>Número</th><th>Proyecto</th><th>Solicitado por</th><th>Prioridad</th><th>Fecha Nec.</th><th>Total Est.</th><th>Estado</th><th>Acciones</th>
  </tr></thead>
  <tbody>
  ${reqs.map(req => {
    const proj = projects.find(p => p.id === req.project_id);
    return `<tr>
      <td><strong>${req.number}</strong></td>
      <td>${proj ? proj.name : '-'}</td>
      <td style="font-size:12px">${req.requested_by || '-'}</td>
      <td>${reqPriorityBadge(req.priority)}</td>
      <td>${fmtDate(req.required_date)}</td>
      <td class="number-cell"><strong>${fmtMoney(req.total || 0)}</strong></td>
      <td>${statusBadge(req.status)}</td>
      <td><div class="table-actions">
        <button class="btn-ghost btn btn-sm" title="Ver detalle" onclick="viewRequisition('${req.id}')"><i class="fas fa-eye"></i></button>
        ${req.status === 'draft' ? `
          <button class="btn-ghost btn btn-sm" title="Editar" onclick="openRequisitionForm('${req.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-primary" onclick="submitRequisition('${req.id}')"><i class="fas fa-paper-plane"></i> Enviar</button>
        ` : ''}
        ${req.status === 'submitted' ? `
          <button class="btn btn-sm btn-success" onclick="approveRequisition('${req.id}')"><i class="fas fa-check"></i> Aprobar</button>
          <button class="btn btn-sm btn-danger" onclick="openRejectRequisition('${req.id}')"><i class="fas fa-times"></i> Rechazar</button>
        ` : ''}
        ${req.status === 'approved' ? `
          <button class="btn btn-sm btn-primary" onclick="convertRequisitionToOC('${req.id}')"><i class="fas fa-file-alt"></i> Generar OC</button>
        ` : ''}
        ${['draft', 'rejected'].includes(req.status) ? `
          <button class="btn-ghost btn btn-sm danger" onclick="deleteRequisition('${req.id}')"><i class="fas fa-trash"></i></button>
        ` : ''}
      </div></td>
    </tr>`;
  }).join('')}
  </tbody></table>`;
}

window._reqFilters = { q: '', status: '', priority: '' };
function filterRequisitions(q, status, priority) {
  if (q !== undefined) window._reqFilters.q = q.toLowerCase();
  if (status !== undefined) window._reqFilters.status = status;
  if (priority !== undefined) window._reqFilters.priority = priority;
  let reqs = DB.getAll('purchaseRequisitions');
  const projects = DB.getAll('projects');
  const f = window._reqFilters;
  if (f.q) reqs = reqs.filter(r => {
    const proj = projects.find(p => p.id === r.project_id);
    return r.number.toLowerCase().includes(f.q)
      || (r.requested_by || '').toLowerCase().includes(f.q)
      || (proj && proj.name.toLowerCase().includes(f.q));
  });
  if (f.status) reqs = reqs.filter(r => r.status === f.status);
  if (f.priority) reqs = reqs.filter(r => r.priority === f.priority);
  const wrap = document.getElementById('req-table-wrap');
  if (wrap) wrap.innerHTML = buildRequisitionRows(reqs, projects);
}

function viewRequisition(id) {
  const req = DB.getById('purchaseRequisitions', id);
  const proj = DB.getById('projects', req.project_id);
  const linkedPO = req.po_id ? DB.getById('purchaseOrders', req.po_id) : null;

  openModal(`Pedido ${req.number}`, `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
  <div>
    <div class="form-label">Proyecto</div><p>${proj?.name || '-'}</p>
    <div class="form-label mt-1">Solicitado por</div><p>${req.requested_by || '-'}</p>
    <div class="form-label mt-1">Prioridad</div><p>${reqPriorityBadge(req.priority)}</p>
  </div>
  <div>
    <div class="form-label">Fecha de Necesidad</div><p>${fmtDate(req.required_date)}</p>
    <div class="form-label mt-1">Estado</div><p>${statusBadge(req.status)}</p>
    ${req.approved_by ? `<div class="form-label mt-1">Aprobado por</div><p>${req.approved_by} — ${fmtDate(req.approved_date)}</p>` : ''}
    ${req.rejection_reason ? `<div class="form-label mt-1">Motivo rechazo</div><p class="text-danger">${req.rejection_reason}</p>` : ''}
    ${linkedPO ? `<div class="form-label mt-1">OC Generada</div><p style="color:var(--primary);font-weight:600">${linkedPO.number}</p>` : ''}
  </div>
</div>
${req.notes ? `<div style="margin-bottom:12px;padding:10px;background:var(--bg);border-radius:6px;font-size:13px"><strong>Notas:</strong> ${req.notes}</div>` : ''}
<div class="table-wrap">
<table><thead><tr>
  <th>Descripción</th><th>Rubro</th><th>Unidad</th>
  <th class="text-right">Cantidad</th><th class="text-right">P.Est. Unit.</th><th class="text-right">Total Est.</th>
</tr></thead>
<tbody>
${(req.items || []).map(it => `<tr>
  <td>${it.description}</td>
  <td style="font-size:11px;color:var(--text-muted)">${it.rubro || '-'}</td>
  <td>${it.unit}</td>
  <td class="number-cell text-right">${fmtNum(it.quantity)}</td>
  <td class="number-cell text-right">${fmtMoney(it.unit_price)}</td>
  <td class="number-cell text-right"><strong>${fmtMoney(it.total)}</strong></td>
</tr>`).join('')}
<tr class="total-row">
  <td colspan="5" class="text-right"><strong>TOTAL ESTIMADO</strong></td>
  <td class="number-cell text-right"><strong>${fmtMoney(req.total || 0)}</strong></td>
</tr>
</tbody></table>
</div>
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
${req.status === 'draft' ? `<button class="btn btn-secondary" onclick="closeModal(); openRequisitionForm('${req.id}')"><i class="fas fa-edit"></i> Editar</button><button class="btn btn-primary" onclick="closeModal(); submitRequisition('${req.id}')"><i class="fas fa-paper-plane"></i> Enviar</button>` : ''}
${req.status === 'submitted' ? `
  <button class="btn btn-success" onclick="closeModal(); approveRequisition('${req.id}')"><i class="fas fa-check"></i> Aprobar</button>
  <button class="btn btn-danger" onclick="closeModal(); openRejectRequisition('${req.id}')"><i class="fas fa-times"></i> Rechazar</button>
` : ''}
${req.status === 'approved' ? `<button class="btn btn-primary" onclick="closeModal(); convertRequisitionToOC('${req.id}')"><i class="fas fa-file-alt"></i> Generar OC</button>` : ''}
<button class="btn btn-secondary" onclick="window.print()"><i class="fas fa-print"></i> Imprimir</button>
`);
}

// ---- REQUISITION FORM ----
function openRequisitionForm(id = null) {
  const req = id ? DB.getById('purchaseRequisitions', id) : null;
  const projects = DB.getAll('projects');
  const rubros = DB.getAll('rubros');
  const nextNum = `OP-${new Date().getFullYear()}-${String(DB.getAll('purchaseRequisitions').length + 1).padStart(3, '0')}`;
  const items = req?.items || [{ description: '', rubro: '', unit: 'un', quantity: 1, unit_price: 0, total: 0 }];
  const rubroOpts = rubros.map(r => `<option value="${r.name}">${r.code} — ${r.name}</option>`).join('');

  openModal(req ? 'Editar Pedido' : 'Nuevo Pedido de Materiales', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Número</label>
    <input class="form-control" id="req-num" value="${req?.number || nextNum}">
  </div>
  <div class="form-group">
    <label class="form-label">Prioridad</label>
    <select class="form-control" id="req-priority">
      <option value="normal" ${!req || req.priority === 'normal' ? 'selected' : ''}>Normal</option>
      <option value="urgent" ${req?.priority === 'urgent' ? 'selected' : ''}>Urgente</option>
      <option value="critical" ${req?.priority === 'critical' ? 'selected' : ''}>Crítico</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Proyecto *</label>
    <select class="form-control" id="req-project">
      <option value="">Seleccionar...</option>
      ${projects.map(p => `<option value="${p.id}" ${req?.project_id === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Fecha de Necesidad *</label>
    <input class="form-control" id="req-date" type="date" value="${req?.required_date || addDays(todayStr(), 7)}">
  </div>
  <div class="form-group">
    <label class="form-label">Solicitado por</label>
    <input class="form-control" id="req-by" value="${req?.requested_by || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">Notas</label>
    <input class="form-control" id="req-notes" value="${req?.notes || ''}">
  </div>
</div>

<div class="divider"></div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
  <strong style="font-size:13px">Ítems Solicitados</strong>
  <button class="btn btn-sm btn-secondary" onclick="addReqItem()"><i class="fas fa-plus"></i> Agregar ítem</button>
</div>
<div id="req-items">
  <div style="display:grid;grid-template-columns:2.5fr 1.5fr 70px 80px 110px 110px 34px;gap:5px;margin-bottom:4px;font-size:10px;font-weight:600;color:var(--text-muted)">
    <span>Descripción</span><span>Rubro</span><span>Unidad</span><span>Cant.</span><span>P.Est.Unit.</span><span>Total Est.</span><span></span>
  </div>
  ${items.map((it, i) => reqItemRow(it, i, rubroOpts)).join('')}
</div>
<div class="divider"></div>
<div id="req-totals" style="text-align:right;font-size:13px">
  ${calcReqTotalsHtml(items)}
</div>
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveRequisition('${id || ''}')"><i class="fas fa-save"></i> Guardar</button>
`);
  window._reqItems = [...items];
}

function reqItemRow(it, i, rubroOpts) {
  const ro = rubroOpts || DB.getAll('rubros').map(r => `<option value="${r.name}">${r.code} — ${r.name}</option>`).join('');
  return `<div id="reqitem-row-${i}" style="display:grid;grid-template-columns:2.5fr 1.5fr 70px 80px 110px 110px 34px;gap:5px;margin-bottom:6px;align-items:center">
    <input class="form-control" style="font-size:12px" placeholder="Descripción del material" value="${it.description || ''}" oninput="updateReqItem(${i},'description',this.value)">
    <select class="form-control" style="font-size:11px" onchange="updateReqItem(${i},'rubro',this.value)">
      <option value="">Sin rubro</option>${ro}
    </select>
    <input class="form-control" style="font-size:12px" value="${it.unit || 'un'}" oninput="updateReqItem(${i},'unit',this.value)">
    <input class="form-control" style="font-size:12px" type="number" min="0" value="${it.quantity || 1}" oninput="updateReqItem(${i},'quantity',+this.value)">
    <input class="form-control" style="font-size:12px" type="number" min="0" value="${it.unit_price || 0}" placeholder="0" oninput="updateReqItem(${i},'unit_price',+this.value)">
    <input class="form-control" style="font-size:12px;background:#f8fafc" readonly value="${fmtMoney(it.total || 0).replace('$', '').trim()}" id="reqitem-total-${i}">
    <button class="btn-ghost btn danger" onclick="removeReqItem(${i})"><i class="fas fa-times"></i></button>
  </div>`;
}

window._reqItems = [];
function addReqItem() {
  window._reqItems.push({ description: '', rubro: '', unit: 'un', quantity: 1, unit_price: 0, total: 0 });
  const i = window._reqItems.length - 1;
  const cont = document.getElementById('req-items');
  const ro = DB.getAll('rubros').map(r => `<option value="${r.name}">${r.code} — ${r.name}</option>`).join('');
  const div = document.createElement('div');
  div.innerHTML = reqItemRow({ description: '', rubro: '', unit: 'un', quantity: 1, unit_price: 0, total: 0 }, i, ro);
  cont.appendChild(div.firstElementChild);
}

function updateReqItem(i, field, val) {
  if (!window._reqItems[i]) window._reqItems[i] = { description: '', rubro: '', unit: 'un', quantity: 1, unit_price: 0, total: 0 };
  window._reqItems[i][field] = val;
  window._reqItems[i].total = (window._reqItems[i].quantity || 0) * (window._reqItems[i].unit_price || 0);
  const totEl = document.getElementById(`reqitem-total-${i}`);
  if (totEl) totEl.value = fmtMoney(window._reqItems[i].total).replace('$', '').trim();
  document.getElementById('req-totals').innerHTML = calcReqTotalsHtml(window._reqItems.filter(Boolean));
}

function removeReqItem(i) {
  const row = document.getElementById(`reqitem-row-${i}`);
  if (row) row.remove();
  window._reqItems[i] = null;
  document.getElementById('req-totals').innerHTML = calcReqTotalsHtml(window._reqItems.filter(Boolean));
}

function calcReqTotalsHtml(items) {
  const valid = items.filter(Boolean);
  const total = valid.reduce((s, it) => s + (it.total || 0), 0);
  return `<span>Ítems: <strong>${valid.length}</strong> &nbsp;|&nbsp; TOTAL ESTIMADO: <strong style="font-size:15px;color:var(--primary)">${fmtMoney(total)}</strong></span>`;
}

function saveRequisition(id) {
  const projectId = document.getElementById('req-project').value;
  if (!projectId) { toast('El proyecto es obligatorio', 'error'); return; }

  const items = window._reqItems.filter(Boolean).filter(it => it.description);
  if (!items.length) {
    document.querySelectorAll('[id^="reqitem-row-"]').forEach(row => {
      const inputs = row.querySelectorAll('input');
      const selects = row.querySelectorAll('select');
      if (inputs[0]?.value) items.push({
        description: inputs[0].value,
        rubro: selects[0]?.value || '',
        unit: inputs[1]?.value || 'un',
        quantity: +inputs[2]?.value || 1,
        unit_price: +inputs[3]?.value || 0,
        total: (+inputs[2]?.value || 1) * (+inputs[3]?.value || 0),
      });
    });
  }
  if (!items.length) { toast('Agregá al menos un ítem', 'error'); return; }

  const total = items.reduce((s, it) => s + (it.total || 0), 0);
  const data = {
    number: document.getElementById('req-num').value,
    project_id: projectId,
    priority: document.getElementById('req-priority').value,
    required_date: document.getElementById('req-date').value,
    requested_by: document.getElementById('req-by').value.trim(),
    notes: document.getElementById('req-notes').value.trim(),
    status: id ? (DB.getById('purchaseRequisitions', id)?.status || 'draft') : 'draft',
    items,
    total,
  };

  if (id) { DB.update('purchaseRequisitions', id, data); toast('Pedido actualizado', 'success'); }
  else { DB.insert('purchaseRequisitions', data); toast('Pedido creado', 'success'); }

  window._reqItems = [];
  closeModal();
  renderCompras();
}

// ---- WORKFLOW ACTIONS ----
function submitRequisition(id) {
  confirmDialog('¿Enviar el pedido para aprobación?', () => {
    DB.update('purchaseRequisitions', id, { submitted_date: todayStr() });
    submitForApproval('purchase_requisition', id); // engine sets status + creates instance if workflow configured
    renderCompras();
  });
}

function approveRequisition(id) {
  // If a workflow instance exists, route through the engine; otherwise direct approve
  const inst = getApprovalInstance('purchase_requisition', id);
  if (inst && inst.status === 'pending') {
    openApproveApprModal(inst.id);
    return;
  }
  DB.update('purchaseRequisitions', id, {
    status: 'approved',
    approved_by: 'Administrador',
    approved_date: todayStr(),
  });
  toast('Pedido aprobado', 'success');
  renderCompras();
}

function openRejectRequisition(id) {
  openModal('Rechazar Pedido', `
<div class="form-group">
  <label class="form-label">Motivo del rechazo *</label>
  <textarea class="form-control" id="reject-reason" rows="3" placeholder="Indicá el motivo del rechazo..."></textarea>
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-danger" onclick="rejectRequisition('${id}')"><i class="fas fa-times"></i> Rechazar</button>
`);
}

function rejectRequisition(id) {
  const reason = document.getElementById('reject-reason').value.trim();
  if (!reason) { toast('El motivo del rechazo es obligatorio', 'error'); return; }
  DB.update('purchaseRequisitions', id, {
    status: 'rejected',
    rejection_reason: reason,
    rejected_date: todayStr(),
  });
  toast('Pedido rechazado', 'warning');
  closeModal();
  renderCompras();
}

function convertRequisitionToOC(reqId) {
  const req = DB.getById('purchaseRequisitions', reqId);
  if (!req) return;
  const suppliers = DB.getAll('suppliers').filter(s => s.status === 'active');

  openModal('Convertir Pedido a Orden de Compra', `
<p style="margin-bottom:14px;font-size:13px;padding:10px;background:var(--bg);border-radius:6px">
  <strong>${req.number}</strong> — ${req.items?.length || 0} ítems — Total estimado: <strong>${fmtMoney(req.total || 0)}</strong>
</p>
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Proveedor *</label>
    <select class="form-control" id="req-conv-supplier">
      <option value="">Seleccionar proveedor...</option>
      ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Fecha de Entrega Estimada</label>
    <input class="form-control" type="date" id="req-conv-date" value="${req.required_date || addDays(todayStr(), 15)}">
  </div>
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="doConvertToOC('${reqId}')"><i class="fas fa-file-alt"></i> Crear OC</button>
`);
}

function doConvertToOC(reqId) {
  const req = DB.getById('purchaseRequisitions', reqId);
  const supplierId = document.getElementById('req-conv-supplier').value;
  const expectedDate = document.getElementById('req-conv-date').value;
  if (!supplierId) { toast('Seleccioná un proveedor', 'error'); return; }

  const items = (req.items || []).map(it => ({
    description: it.description,
    unit: it.unit,
    quantity: it.quantity,
    unit_price: it.unit_price,
    total: it.total,
  }));
  const subtotal = items.reduce((s, it) => s + (it.total || 0), 0);
  const tax = subtotal * 0.21;
  const nextNum = `OC-${new Date().getFullYear()}-${String(DB.getAll('purchaseOrders').length + 1).padStart(3, '0')}`;

  const po = DB.insert('purchaseOrders', {
    number: nextNum,
    project_id: req.project_id,
    supplier_id: supplierId,
    req_id: reqId,         // link back to purchase requisition (used in approval conditions)
    status: 'draft',
    date: todayStr(),
    expected_date: expectedDate,
    notes: `Generada desde pedido ${req.number}`,
    items,
    subtotal,
    tax,
    total: subtotal + tax,
  });

  DB.update('purchaseRequisitions', reqId, { status: 'converted', po_id: po.id });

  // Auto-submit PO for approval if a workflow is configured
  const poDoc = DB.getById('purchaseOrders', po.id);
  if (poDoc && apprGetWorkflow('purchase_order', poDoc)) {
    submitForApproval('purchase_order', po.id);
    toast(`OC ${nextNum} creada y enviada a aprobación`, 'success');
  } else {
    toast(`OC ${nextNum} creada correctamente`, 'success');
  }
  closeModal();
  renderCompras();
}

function deleteRequisition(id) {
  confirmDialog('¿Eliminar este pedido?', () => {
    DB.remove('purchaseRequisitions', id);
    toast('Pedido eliminado', 'warning');
    renderCompras();
  });
}

function exportRequisitions() {
  const reqs = DB.getAll('purchaseRequisitions');
  const projects = DB.getAll('projects');
  exportXLSX('pedidos_materiales.xlsx',
    ['Número', 'Proyecto', 'Solicitado por', 'Prioridad', 'Fecha Necesidad', 'Total Est.', 'Estado'],
    reqs.map(r => [
      r.number,
      projects.find(p => p.id === r.project_id)?.name || '',
      r.requested_by || '',
      r.priority,
      r.required_date,
      r.total || 0,
      r.status,
    ])
  );
}

// ---- PURCHASE ORDERS ----
function renderPOTable() {
  const pos = DB.getAll('purchaseOrders');
  const projects = DB.getAll('projects');
  const suppliers = DB.getAll('suppliers');

  const totalPending = pos.filter(p => ['draft','sent'].includes(p.status)).reduce((s,p) => s+p.total, 0);
  const totalReceived = pos.filter(p => p.status === 'received').reduce((s,p) => s+p.total, 0);

  return `
<div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-file-alt"></i></div><div>
    <div class="stat-value">${pos.length}</div><div class="stat-label">OC Totales</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-clock"></i></div><div>
    <div class="stat-value">${pos.filter(p=>p.status==='sent').length}</div><div class="stat-label">Enviadas</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check"></i></div><div>
    <div class="stat-value">${fmtMoney(totalReceived)}</div><div class="stat-label">Total Recibido</div></div></div>
  <div class="stat-card"><div class="stat-icon red"><i class="fas fa-hourglass"></i></div><div>
    <div class="stat-value">${fmtMoney(totalPending)}</div><div class="stat-label">Pendiente Recepción</div></div></div>
</div>
<div class="filter-bar">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar OC, proveedor..." oninput="filterPOs(this.value)">
  </div>
  <select class="form-control" style="width:140px" onchange="filterPOs(undefined, this.value)">
    <option value="">Todos los estados</option>
    <option value="draft">Borrador</option>
    <option value="sent">Enviada</option>
    <option value="received">Recibida</option>
    <option value="cancelled">Cancelada</option>
  </select>
  <button class="btn btn-secondary" onclick="exportPOs()"><i class="fas fa-download"></i> Exportar</button>
</div>
<div class="card">
  <div class="card-body" style="padding:0">
    <div class="table-wrap" id="po-table-wrap">
      ${buildPORows(pos, projects, suppliers)}
    </div>
  </div>
</div>`;
}

function buildPORows(pos, projects, suppliers) {
  if (!pos.length) return `<div class="empty-state"><i class="fas fa-shopping-cart"></i><p>No hay órdenes de compra</p></div>`;
  return `<table><thead><tr>
    <th>Número</th><th>Proyecto</th><th>Proveedor</th><th>Fecha</th><th>Entrega Est.</th><th>Total</th><th>Estado</th><th>Acciones</th>
  </tr></thead>
  <tbody>
  ${pos.map(po => {
    const proj = projects.find(p => p.id === po.project_id);
    const sup = suppliers.find(s => s.id === po.supplier_id);
    return `<tr>
      <td><strong>${po.number}</strong></td>
      <td>${proj ? proj.name : '-'}</td>
      <td>${sup ? sup.name : '-'}</td>
      <td>${fmtDate(po.date)}</td>
      <td>${fmtDate(po.expected_date)}</td>
      <td class="number-cell"><strong>${fmtMoney(po.total)}</strong></td>
      <td>${statusBadge(po.status)}</td>
      <td><div class="table-actions">
        <button class="btn-ghost btn btn-sm" onclick="viewPO('${po.id}')"><i class="fas fa-eye"></i></button>
        <button class="btn-ghost btn btn-sm" onclick="openPOForm('${po.id}')"><i class="fas fa-edit"></i></button>
        ${po.status === 'sent' ? `<button class="btn btn-sm btn-success" onclick="receivePO('${po.id}')"><i class="fas fa-check"></i> Recibir</button>` : ''}
        ${po.status === 'received' ? `<button class="btn btn-sm btn-primary" onclick="generateSIFromPO('${po.id}')"><i class="fas fa-file-invoice"></i> Factura</button>` : ''}
        <button class="btn-ghost btn btn-sm danger" onclick="deletePO('${po.id}')"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('')}
  </tbody></table>`;
}

window._poFilters = { q: '', status: '' };
function filterPOs(q, status) {
  if (q !== undefined) window._poFilters.q = q.toLowerCase();
  if (status !== undefined) window._poFilters.status = status;
  let pos = DB.getAll('purchaseOrders');
  const suppliers = DB.getAll('suppliers');
  const f = window._poFilters;
  if (f.q) pos = pos.filter(po => {
    const s = suppliers.find(s => s.id === po.supplier_id);
    return po.number.toLowerCase().includes(f.q) || (s && s.name.toLowerCase().includes(f.q));
  });
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
  <div>
    <div class="form-label">Proyecto</div><p>${proj?.name || '-'}</p>
    <div class="form-label mt-1">Proveedor</div><p>${sup?.name || '-'}</p>
    <div class="form-label mt-1">CUIT Proveedor</div><p>${sup?.cuit || '-'}</p>
  </div>
  <div>
    <div class="form-label">Fecha OC</div><p>${fmtDate(po.date)}</p>
    <div class="form-label mt-1">Entrega Estimada</div><p>${fmtDate(po.expected_date)}</p>
    <div class="form-label mt-1">Estado</div><p>${statusBadge(po.status)}</p>
  </div>
</div>
<div class="table-wrap">
<table><thead><tr><th>Descripción</th><th>Unidad</th><th>Cantidad</th><th>P. Unitario</th><th>Total</th></tr></thead>
<tbody>
${po.items.map(it => `<tr>
  <td>${it.description}</td>
  <td>${it.unit}</td>
  <td class="number-cell">${fmtNum(it.quantity)}</td>
  <td class="number-cell">${fmtMoney(it.unit_price)}</td>
  <td class="number-cell"><strong>${fmtMoney(it.total)}</strong></td>
</tr>`).join('')}
<tr class="total-row">
  <td colspan="4" class="text-right">Subtotal</td><td class="number-cell">${fmtMoney(po.subtotal)}</td>
</tr>
<tr class="total-row">
  <td colspan="4" class="text-right">IVA (21%)</td><td class="number-cell">${fmtMoney(po.tax)}</td>
</tr>
<tr class="total-row">
  <td colspan="4" class="text-right fw-bold">TOTAL</td><td class="number-cell fw-bold">${fmtMoney(po.total)}</td>
</tr>
</tbody></table>
</div>
${po.notes ? `<div class="mt-2"><strong>Notas:</strong> ${po.notes}</div>` : ''}
`, 'modal-lg',
  `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
   <button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Imprimir</button>`);
}

function openPOForm(id = null) {
  const po = id ? DB.getById('purchaseOrders', id) : null;
  const projects = DB.getAll('projects');
  const suppliers = DB.getAll('suppliers');
  const items = po?.items || [{ description: '', unit: 'un', quantity: 1, unit_price: 0, total: 0 }];
  const nextNum = `OC-${new Date().getFullYear()}-${String(DB.getAll('purchaseOrders').length + 1).padStart(3, '0')}`;

  openModal(po ? 'Editar OC' : 'Nueva Orden de Compra', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Número OC</label>
    <input class="form-control" id="po-num" value="${po?.number || nextNum}">
  </div>
  <div class="form-group">
    <label class="form-label">Estado</label>
    <select class="form-control" id="po-status">
      ${['draft','sent','received','cancelled'].map(s => `<option value="${s}" ${po?.status===s?'selected':''}>${statusBadge(s).replace(/<[^>]+>/g,'')}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Proyecto *</label>
    <select class="form-control" id="po-project">
      <option value="">Seleccionar...</option>
      ${projects.map(p => `<option value="${p.id}" ${po?.project_id===p.id?'selected':''}>${p.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Proveedor *</label>
    <select class="form-control" id="po-supplier">
      <option value="">Seleccionar...</option>
      ${suppliers.map(s => `<option value="${s.id}" ${po?.supplier_id===s.id?'selected':''}>${s.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Fecha OC</label>
    <input class="form-control" id="po-date" type="date" value="${po?.date || todayStr()}">
  </div>
  <div class="form-group">
    <label class="form-label">Entrega Estimada</label>
    <input class="form-control" id="po-expected" type="date" value="${po?.expected_date || addDays(todayStr(), 15)}">
  </div>
  <div class="form-group full">
    <label class="form-label">Notas</label>
    <textarea class="form-control" id="po-notes" rows="2">${po?.notes || ''}</textarea>
  </div>
</div>

<div class="divider"></div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
  <strong style="font-size:13px">Ítems</strong>
  <button class="btn btn-sm btn-secondary" onclick="addPOItem()"><i class="fas fa-plus"></i> Agregar ítem</button>
</div>
<div id="po-items">
  <div style="display:grid;grid-template-columns:3fr 80px 80px 120px 120px 36px;gap:6px;margin-bottom:4px;font-size:11px;font-weight:600;color:var(--text-muted)">
    <span>Descripción</span><span>Unidad</span><span>Cantidad</span><span>P.Unitario</span><span>Total</span><span></span>
  </div>
  ${items.map((it, i) => poItemRow(it, i)).join('')}
</div>
<div class="divider"></div>
<div id="po-totals" style="text-align:right;font-size:13px">
  ${calcPOTotalsHtml(items)}
</div>
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="savePO('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
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
  const cont = document.getElementById('po-items');
  const i = window._poItems.length - 1;
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
    rows.forEach((row, i) => {
      const inputs = row.querySelectorAll('input');
      if (inputs[0]?.value) items.push({ description: inputs[0].value, unit: inputs[1]?.value || 'un', quantity: +inputs[2]?.value || 1, unit_price: +inputs[3]?.value || 0, total: (+inputs[2]?.value || 1) * (+inputs[3]?.value || 0) });
    });
  }

  const subtotal = items.reduce((s,it) => s + it.total, 0);
  const tax = subtotal * 0.21;

  const data = {
    number: document.getElementById('po-num').value,
    project_id: projectId,
    supplier_id: supplierId,
    status: document.getElementById('po-status').value,
    date: document.getElementById('po-date').value,
    expected_date: document.getElementById('po-expected').value,
    notes: document.getElementById('po-notes').value,
    items,
    subtotal,
    tax,
    total: subtotal + tax,
  };

  if (id) { DB.update('purchaseOrders', id, data); toast('OC actualizada', 'success'); }
  else { DB.insert('purchaseOrders', data); toast('OC creada', 'success'); }

  window._poItems = [];
  closeModal();
  renderCompras();
}

function receivePO(id) {
  DB.update('purchaseOrders', id, { status: 'received' });
  toast('OC marcada como recibida', 'success');
  renderCompras();
}

function deletePO(id) {
  confirmDialog('¿Eliminar esta orden de compra?', () => {
    DB.remove('purchaseOrders', id);
    toast('OC eliminada', 'warning');
    renderCompras();
  });
}

function exportPOs() {
  const pos = DB.getAll('purchaseOrders');
  const projects = DB.getAll('projects');
  const suppliers = DB.getAll('suppliers');
  exportXLSX('ordenes_compra.xlsx',
    ['Número','Proyecto','Proveedor','Fecha','Entrega','Subtotal','IVA','Total','Estado'],
    pos.map(po => [
      po.number,
      projects.find(p=>p.id===po.project_id)?.name || '',
      suppliers.find(s=>s.id===po.supplier_id)?.name || '',
      po.date, po.expected_date, po.subtotal, po.tax, po.total, po.status
    ])
  );
}

// ---- SUPPLIERS ----
function renderSuppliersTable() {
  const suppliers = DB.getAll('suppliers');
  return `
<div class="filter-bar">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar proveedor..." oninput="filterSuppliers(this.value)">
  </div>
  <button class="btn btn-primary" onclick="openSupplierForm()"><i class="fas fa-plus"></i> Nuevo Proveedor</button>
</div>
<div class="card">
  <div class="card-body" style="padding:0">
    <div class="table-wrap" id="suppliers-table-wrap">
      ${buildSupplierRows(suppliers)}
    </div>
  </div>
</div>`;
}

function buildSupplierRows(suppliers) {
  if (!suppliers.length) return `<div class="empty-state"><i class="fas fa-truck"></i><p>No hay proveedores</p></div>`;
  return `<table><thead><tr>
    <th>Razón Social</th><th>CUIT</th><th>Contacto</th><th>Email</th><th>Teléfono</th><th>Categorías</th><th>Estado</th><th>Acciones</th>
  </tr></thead>
  <tbody>
  ${suppliers.map(s => `<tr>
    <td><strong>${s.name}</strong></td>
    <td>${s.cuit}</td>
    <td>${s.contact}</td>
    <td>${s.email}</td>
    <td>${s.phone}</td>
    <td>${(s.category || []).map(c => `<span class="badge badge-gray">${c}</span>`).join(' ')}</td>
    <td>${statusBadge(s.status)}</td>
    <td><div class="table-actions">
      <button class="btn-ghost btn btn-sm" onclick="openSupplierForm('${s.id}')"><i class="fas fa-edit"></i></button>
      <button class="btn-ghost btn btn-sm danger" onclick="deleteSupplier('${s.id}')"><i class="fas fa-trash"></i></button>
    </div></td>
  </tr>`).join('')}
  </tbody></table>`;
}

function filterSuppliers(q) {
  q = q.toLowerCase();
  let sups = DB.getAll('suppliers');
  if (q) sups = sups.filter(s => s.name.toLowerCase().includes(q) || s.cuit.includes(q) || s.contact.toLowerCase().includes(q));
  const wrap = document.getElementById('suppliers-table-wrap');
  if (wrap) wrap.innerHTML = buildSupplierRows(sups);
}

function openSupplierForm(id = null) {
  const s = id ? DB.getById('suppliers', id) : null;
  openModal(s ? 'Editar Proveedor' : 'Nuevo Proveedor', `
<div class="form-grid form-grid-2">
  <div class="form-group full">
    <label class="form-label">Razón Social *</label>
    <input class="form-control" id="sf-name" value="${s?.name || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">CUIT</label>
    <input class="form-control" id="sf-cuit" value="${s?.cuit || ''}" placeholder="30-12345678-9">
  </div>
  <div class="form-group">
    <label class="form-label">Contacto</label>
    <input class="form-control" id="sf-contact" value="${s?.contact || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">Email</label>
    <input class="form-control" id="sf-email" type="email" value="${s?.email || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">Teléfono</label>
    <input class="form-control" id="sf-phone" value="${s?.phone || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">Estado</label>
    <select class="form-control" id="sf-status">
      <option value="active" ${s?.status==='active'?'selected':''}>Activo</option>
      <option value="inactive" ${s?.status==='inactive'?'selected':''}>Inactivo</option>
    </select>
  </div>
  <div class="form-group full">
    <label class="form-label">Dirección</label>
    <input class="form-control" id="sf-address" value="${s?.address || ''}">
  </div>
  <div class="form-group full">
    <label class="form-label">Categorías (separadas por coma)</label>
    <input class="form-control" id="sf-category" value="${(s?.category || []).join(', ')}" placeholder="Materiales, Equipos, Servicios">
  </div>
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveSupplier('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
}

function saveSupplier(id) {
  const name = document.getElementById('sf-name').value.trim();
  if (!name) { toast('La razón social es obligatoria', 'error'); return; }
  const data = {
    name,
    cuit: document.getElementById('sf-cuit').value.trim(),
    contact: document.getElementById('sf-contact').value.trim(),
    email: document.getElementById('sf-email').value.trim(),
    phone: document.getElementById('sf-phone').value.trim(),
    status: document.getElementById('sf-status').value,
    address: document.getElementById('sf-address').value.trim(),
    category: document.getElementById('sf-category').value.split(',').map(c => c.trim()).filter(Boolean),
  };
  if (id) { DB.update('suppliers', id, data); toast('Proveedor actualizado', 'success'); }
  else { DB.insert('suppliers', data); toast('Proveedor creado', 'success'); }
  closeModal();
  renderCompras();
}

function deleteSupplier(id) {
  confirmDialog('¿Eliminar este proveedor?', () => {
    DB.remove('suppliers', id);
    toast('Proveedor eliminado', 'warning');
    renderCompras();
  });
}

// ==== FACTURAS DE PROVEEDORES ====

function renderSupplierInvoicesTab() {
  const sis = DB.getAll('supplierInvoices');
  const suppliers = DB.getAll('suppliers');
  const projects = DB.getAll('projects');
  const pos = DB.getAll('purchaseOrders');

  const totalPending = sis.filter(s => s.status === 'pending').reduce((acc, s) => acc + s.total, 0);
  const totalPaid = sis.filter(s => s.status === 'paid').reduce((acc, s) => acc + s.total, 0);
  const pending = sis.filter(s => s.status === 'pending').length;

  return `
<div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-file-invoice"></i></div><div>
    <div class="stat-value">${sis.length}</div><div class="stat-label">Total Facturas</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-clock"></i></div><div>
    <div class="stat-value">${pending}</div><div class="stat-label">Pendientes de Pago</div></div></div>
  <div class="stat-card"><div class="stat-icon red"><i class="fas fa-dollar-sign"></i></div><div>
    <div class="stat-value">${fmtMoney(totalPending)}</div><div class="stat-label">Monto Pendiente</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div><div>
    <div class="stat-value">${fmtMoney(totalPaid)}</div><div class="stat-label">Monto Pagado</div></div></div>
</div>
<div class="filter-bar">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar factura, proveedor..." oninput="filterSIs(this.value)">
  </div>
  <select class="form-control" style="width:160px" onchange="filterSIs(undefined, this.value)">
    <option value="">Todos los estados</option>
    <option value="pending">Pendiente</option>
    <option value="paid">Pagada</option>
    <option value="cancelled">Cancelada</option>
  </select>
  <button class="btn btn-secondary" onclick="exportSIs()"><i class="fas fa-download"></i> Exportar</button>
  <button class="btn btn-primary" onclick="openSIForm()"><i class="fas fa-plus"></i> Nueva Factura</button>
</div>
<div class="card">
  <div class="card-body" style="padding:0">
    <div class="table-wrap" id="si-table-wrap">
      ${buildSITable(sis, suppliers, projects, pos)}
    </div>
  </div>
</div>`;
}

function buildSITable(sis, suppliers, projects, pos) {
  if (!sis.length) return '<div class="empty-state"><i class="fas fa-file-invoice"></i><p>No hay facturas de proveedores. Generalas desde una OC recibida, desde una certificación aprobada o creá una manualmente.</p></div>';
  const statusColor = { pending: 'badge-yellow', paid: 'badge-green', cancelled: 'badge-red' };
  const statusLabel = { pending: 'Pendiente', paid: 'Pagada', cancelled: 'Cancelada' };
  const certs = DB.getAll('certificates');
  const contracts = DB.getAll('contracts');
  return '<table><thead><tr>' +
    '<th>N° Factura</th><th>Origen</th><th>Proveedor</th><th>Proyecto</th><th>Fecha</th><th>Vencimiento</th>' +
    '<th class="text-right">Subtotal</th><th class="text-right">IVA</th><th class="text-right">Total</th>' +
    '<th>Estado</th><th>Acciones</th>' +
  '</tr></thead><tbody>' +
  sis.sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); }).map(function(si) {
    var sup  = suppliers.find(function(s) { return s.id === si.supplier_id; });
    var proj = projects.find(function(p) { return p.id === si.project_id; });
    var po   = si.po_id   ? pos.find(function(p) { return p.id === si.po_id; }) : null;
    var cert = si.cert_id ? certs.find(function(c) { return c.id === si.cert_id; }) : null;
    var contract = cert && cert.contract_id ? contracts.find(function(ct) { return ct.id === cert.contract_id; }) : null;
    var origenHtml = '';
    if (po)   origenHtml += '<div style="font-size:11px;color:var(--text-muted)"><i class="fas fa-shopping-cart" style="font-size:9px"></i> ' + po.number + '</div>';
    if (cert) origenHtml += '<div style="font-size:11px;color:var(--primary)"><i class="fas fa-certificate" style="font-size:9px"></i> ' + cert.number + (contract ? ' (' + contract.number + ')' : '') + '</div>';
    if (!origenHtml) origenHtml = '<span style="font-size:11px;color:var(--text-muted)">—</span>';
    var isOverdueFlag = si.due_date && si.due_date < todayStr() && si.status === 'pending';
    return '<tr>' +
      '<td><strong>' + si.number + '</strong></td>' +
      '<td>' + origenHtml + '</td>' +
      '<td>' + (sup ? sup.name : '-') + '</td>' +
      '<td style="font-size:11px">' + (proj ? proj.name : '-') + '</td>' +
      '<td>' + fmtDate(si.date) + '</td>' +
      '<td style="' + (isOverdueFlag ? 'color:var(--danger);font-weight:600' : '') + '">' + fmtDate(si.due_date) + '</td>' +
      '<td class="number-cell text-right">' + fmtMoney(si.subtotal) + '</td>' +
      '<td class="number-cell text-right">' + fmtMoney(si.tax) + '</td>' +
      '<td class="number-cell text-right"><strong>' + fmtMoney(si.total) + '</strong></td>' +
      '<td><span class="badge ' + (statusColor[si.status] || 'badge-gray') + '">' + (statusLabel[si.status] || si.status) + '</span></td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-ghost btn btn-sm" onclick="openSIForm(\'' + si.id + '\')"><i class="fas fa-edit"></i></button>' +
        (si.status === 'pending' ? '<button class="btn btn-sm btn-success" onclick="markSIPaid(\'' + si.id + '\')"><i class="fas fa-check"></i> Pagar</button>' : '') +
        '<button class="btn-ghost btn btn-sm danger" onclick="deleteSI(\'' + si.id + '\')"><i class="fas fa-trash"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join('') + '</tbody></table>';
}

window._siFilters = { q: '', status: '' };
function filterSIs(q, status) {
  if (q !== undefined) window._siFilters.q = q.toLowerCase();
  if (status !== undefined) window._siFilters.status = status;
  let sis = DB.getAll('supplierInvoices');
  const suppliers = DB.getAll('suppliers');
  const f = window._siFilters;
  if (f.q) sis = sis.filter(si => {
    const sup = suppliers.find(s => s.id === si.supplier_id);
    return si.number.toLowerCase().includes(f.q) || (sup && sup.name.toLowerCase().includes(f.q));
  });
  if (f.status) sis = sis.filter(si => si.status === f.status);
  const wrap = document.getElementById('si-table-wrap');
  if (wrap) wrap.innerHTML = buildSITable(sis, suppliers, DB.getAll('projects'), DB.getAll('purchaseOrders'));
}

function generateSIFromPO(poId) {
  openSIForm(null, poId);
}

function openSIForm(id, prefillPoId, prefillCertId) {
  id = id || null; prefillPoId = prefillPoId || null; prefillCertId = prefillCertId || null;
  const si        = id ? DB.getById('supplierInvoices', id) : null;
  const pos       = DB.getAll('purchaseOrders').filter(function(p) { return p.status === 'received'; });
  const suppliers = DB.getAll('suppliers');
  const projects  = DB.getAll('projects');
  const nextNum   = 'FPROV-' + new Date().getFullYear() + '-' + String(DB.getAll('supplierInvoices').length + 1).padStart(3, '0');

  // certs that are approved and either not linked or are the current si's cert
  const certs     = DB.getAll('certificates').filter(function(c) {
    return c.status === 'approved' && (!c.supplier_invoice_id || c.supplier_invoice_id === id);
  });
  const contracts = DB.getAll('contracts');

  const prefillPO   = prefillPoId   ? DB.getById('purchaseOrders', prefillPoId)   : null;
  const prefillCert = prefillCertId ? DB.getById('certificates',   prefillCertId) : null;
  const prefillContractForCert = prefillCert && prefillCert.contract_id ? DB.getById('contracts', prefillCert.contract_id) : null;

  const selectedPoId       = (si && si.po_id)       || prefillPoId       || '';
  const selectedCertId     = (si && si.cert_id)      || prefillCertId     || '';
  const selectedSupplierId = (si && si.supplier_id)  || (prefillPO && prefillPO.supplier_id) || (prefillContractForCert && prefillContractForCert.contractor_id) || '';
  const selectedProjectId  = (si && si.project_id)   || (prefillPO && prefillPO.project_id)  || (prefillCert && prefillCert.project_id) || '';
  const defaultSubtotal    = si ? si.subtotal : (prefillPO ? (prefillPO.subtotal || '') : (prefillCert ? (prefillCert.net_amount || '') : ''));
  const defaultTax         = si ? si.tax      : (prefillPO ? (prefillPO.tax || '')      : (prefillCert ? ((prefillCert.net_amount || 0) * 0.21) : ''));
  const defaultTotal       = si ? si.total    : (prefillPO ? (prefillPO.total || '')    : (prefillCert ? ((prefillCert.net_amount || 0) * 1.21) : ''));

  openModal(si ? 'Editar Factura Proveedor' : 'Nueva Factura de Proveedor',
    '<div class="form-grid form-grid-2">' +
      '<div class="form-group"><label class="form-label">N° Factura Proveedor</label>' +
        '<input class="form-control" id="si-num" value="' + ((si && si.number) || nextNum) + '"></div>' +
      '<div class="form-group"><label class="form-label">Estado</label>' +
        '<select class="form-control" id="si-status">' +
          '<option value="pending" ' + ((!si || si.status === 'pending') ? 'selected' : '') + '>Pendiente de Pago</option>' +
          '<option value="paid" '    + ((si && si.status === 'paid')      ? 'selected' : '') + '>Pagada</option>' +
          '<option value="cancelled" '+ ((si && si.status === 'cancelled') ? 'selected' : '') + '>Cancelada</option>' +
        '</select></div>' +
      // OC reference
      '<div class="form-group"><label class="form-label"><i class="fas fa-shopping-cart" style="font-size:10px;color:var(--text-muted)"></i> OC de Origen</label>' +
        '<select class="form-control" id="si-po" onchange="prefillSIFromPO(this.value)">' +
          '<option value="">Sin OC de referencia</option>' +
          pos.map(function(p) {
            var sName = (suppliers.find(function(s) { return s.id === p.supplier_id; }) || {}).name || '';
            return '<option value="' + p.id + '" ' + (selectedPoId === p.id ? 'selected' : '') + '>' + p.number + ' — ' + sName + '</option>';
          }).join('') +
        '</select></div>' +
      // Cert reference
      '<div class="form-group"><label class="form-label"><i class="fas fa-certificate" style="font-size:10px;color:var(--primary)"></i> Certificado de Obra</label>' +
        '<select class="form-control" id="si-cert" onchange="prefillSIFromCert(this.value)">' +
          '<option value="">Sin certificado de referencia</option>' +
          certs.map(function(c) {
            var ct = c.contract_id ? contracts.find(function(ct) { return ct.id === c.contract_id; }) : null;
            return '<option value="' + c.id + '" ' + (selectedCertId === c.id ? 'selected' : '') + '>' +
              c.number + ' — ' + fmtMoney(c.net_amount || 0) + (ct ? ' [' + ct.number + ']' : '') + '</option>';
          }).join('') +
        '</select></div>' +
      '<div class="form-group"><label class="form-label">Proveedor *</label>' +
        '<select class="form-control" id="si-supplier">' +
          '<option value="">Seleccionar...</option>' +
          suppliers.map(function(s) { return '<option value="' + s.id + '" ' + (selectedSupplierId === s.id ? 'selected' : '') + '>' + s.name + '</option>'; }).join('') +
        '</select></div>' +
      '<div class="form-group"><label class="form-label">Proyecto</label>' +
        '<select class="form-control" id="si-project">' +
          '<option value="">Sin proyecto</option>' +
          projects.map(function(p) { return '<option value="' + p.id + '" ' + (selectedProjectId === p.id ? 'selected' : '') + '>' + p.name + '</option>'; }).join('') +
        '</select></div>' +
      '<div class="form-group"><label class="form-label">Fecha Factura</label>' +
        '<input class="form-control" id="si-date" type="date" value="' + ((si && si.date) || todayStr()) + '"></div>' +
      '<div class="form-group"><label class="form-label">Fecha Vencimiento</label>' +
        '<input class="form-control" id="si-due" type="date" value="' + ((si && si.due_date) || addDays(todayStr(), 30)) + '"></div>' +
      '<div class="form-group"><label class="form-label">Subtotal (sin IVA)</label>' +
        '<input class="form-control" id="si-subtotal" type="number" min="0" value="' + defaultSubtotal + '" oninput="recalcSI()"></div>' +
      '<div class="form-group"><label class="form-label">IVA 21%</label>' +
        '<input class="form-control" id="si-tax" type="number" min="0" value="' + defaultTax + '" oninput="recalcSI()"></div>' +
      '<div class="form-group"><label class="form-label">Total</label>' +
        '<input class="form-control" id="si-total" type="number" min="0" value="' + defaultTotal + '" style="font-weight:700;color:var(--primary)"></div>' +
      '<div class="form-group full"><label class="form-label">Notas</label>' +
        '<textarea class="form-control" id="si-notes" rows="2">' + ((si && si.notes) || '') + '</textarea></div>' +
    '</div>',
  'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="saveSI(\'' + (id || '') + '\')"><i class="fas fa-save"></i> Guardar</button>'
  );
}

function prefillSIFromPO(poId) {
  if (!poId) return;
  const po = DB.getById('purchaseOrders', poId);
  if (!po) return;
  // clear cert selection if PO selected
  const certEl = document.getElementById('si-cert');
  if (certEl) certEl.value = '';
  const subEl  = document.getElementById('si-subtotal');
  const taxEl  = document.getElementById('si-tax');
  const totEl  = document.getElementById('si-total');
  const supEl  = document.getElementById('si-supplier');
  const projEl = document.getElementById('si-project');
  if (subEl)  subEl.value  = po.subtotal || 0;
  if (taxEl)  taxEl.value  = po.tax || 0;
  if (totEl)  totEl.value  = po.total || 0;
  if (supEl)  supEl.value  = po.supplier_id || '';
  if (projEl) projEl.value = po.project_id || '';
}

function prefillSIFromCert(certId) {
  if (!certId) return;
  const cert = DB.getById('certificates', certId);
  if (!cert) return;
  const contract = cert.contract_id ? DB.getById('contracts', cert.contract_id) : null;
  // clear PO selection if cert selected
  const poEl   = document.getElementById('si-po');
  if (poEl) poEl.value = '';
  const net    = cert.net_amount || 0;
  const tax    = Math.round(net * 21) / 100;
  const subEl  = document.getElementById('si-subtotal');
  const taxEl  = document.getElementById('si-tax');
  const totEl  = document.getElementById('si-total');
  const supEl  = document.getElementById('si-supplier');
  const projEl = document.getElementById('si-project');
  if (subEl)  subEl.value  = net;
  if (taxEl)  taxEl.value  = tax;
  if (totEl)  totEl.value  = (net + tax).toFixed(2);
  if (supEl  && contract && contract.contractor_id) supEl.value  = contract.contractor_id;
  if (projEl && cert.project_id)                    projEl.value = cert.project_id;
  // prefill notes
  const notesEl = document.getElementById('si-notes');
  if (notesEl && !notesEl.value) {
    notesEl.value = 'Factura de certificación ' + cert.number + (contract ? ' — Contrato ' + contract.number : '');
  }
}

function recalcSI() {
  const sub = parseFloat(document.getElementById('si-subtotal')?.value) || 0;
  const tax = parseFloat(document.getElementById('si-tax')?.value) || sub * 0.21;
  const totEl = document.getElementById('si-total');
  if (totEl) totEl.value = (sub + tax).toFixed(2);
}

function saveSI(id) {
  const supplierId = document.getElementById('si-supplier').value;
  if (!supplierId) { toast('El proveedor es obligatorio', 'error'); return; }
  const sub    = parseFloat(document.getElementById('si-subtotal').value) || 0;
  const tax    = parseFloat(document.getElementById('si-tax').value) || 0;
  const certId = document.getElementById('si-cert').value || '';
  const data = {
    number:      document.getElementById('si-num').value,
    po_id:       document.getElementById('si-po').value || '',
    cert_id:     certId,
    supplier_id: supplierId,
    project_id:  document.getElementById('si-project').value || '',
    date:        document.getElementById('si-date').value,
    due_date:    document.getElementById('si-due').value,
    subtotal:    sub,
    tax,
    total:       parseFloat(document.getElementById('si-total').value) || sub + tax,
    status:      document.getElementById('si-status').value,
    notes:       document.getElementById('si-notes').value.trim(),
  };
  var savedId;
  if (id) { DB.update('supplierInvoices', id, data); toast('Factura actualizada', 'success'); savedId = id; }
  else    { var nsi = DB.insert('supplierInvoices', data); toast('Factura creada', 'success'); savedId = nsi.id; }

  // bidirectional link: update cert with supplier_invoice_id
  if (certId) {
    DB.update('certificates', certId, { supplier_invoice_id: savedId });
  }
  closeModal();
  renderCompras();
}

function markSIPaid(id) {
  DB.update('supplierInvoices', id, { status: 'paid' });
  toast('Factura marcada como pagada', 'success');
  renderCompras();
}

function deleteSI(id) {
  confirmDialog('¿Eliminar esta factura de proveedor?', () => {
    DB.remove('supplierInvoices', id);
    toast('Factura eliminada', 'warning');
    renderCompras();
  });
}

function exportSIs() {
  const sis = DB.getAll('supplierInvoices');
  const suppliers = DB.getAll('suppliers');
  const projects = DB.getAll('projects');
  const pos = DB.getAll('purchaseOrders');
  exportXLSX('facturas_proveedores.xlsx',
    ['N° Factura', 'OC Origen', 'Proveedor', 'Proyecto', 'Fecha', 'Vencimiento', 'Subtotal', 'IVA', 'Total', 'Estado'],
    sis.map(si => [
      si.number,
      pos.find(p=>p.id===si.po_id)?.number || '',
      suppliers.find(s=>s.id===si.supplier_id)?.name || '',
      projects.find(p=>p.id===si.project_id)?.name || '',
      si.date, si.due_date, si.subtotal, si.tax, si.total, si.status,
    ])
  );
}
