/* ===== CONTRATOS DE OBRA ===== */

const CONTRACT_TYPES = {
  lump_sum:   'Suma Alzada',
  unit_price: 'Por Unidad de Medida',
  cost_plus:  'Coste Más Honorarios',
  mixed:      'Mixto',
};

function renderContratos() {
  const contracts = DB.getAll('contracts');
  const projects  = DB.getAll('projects');
  const suppliers = DB.getAll('suppliers');
  const certs     = DB.getAll('certificates');

  const active     = contracts.filter(c => c.status === 'active').length;
  const totalAmt   = contracts.reduce((s, c) => s + (c.total_amount || 0), 0);
  const totalCert  = certs.filter(c => c.contract_id).reduce((s, c) => s + (c.subtotal || 0), 0);
  const avancePct  = totalAmt > 0 ? totalCert / totalAmt * 100 : 0;

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Contratos de Obra</div>
    <div class="page-subtitle">Contratos con contratistas, partidas de obra y certificaciones vinculadas</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="exportContracts()"><i class="fas fa-download"></i> Exportar</button>
    <button class="btn btn-primary" onclick="openContractForm()"><i class="fas fa-plus"></i> Nuevo Contrato</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-file-contract"></i></div><div>
    <div class="stat-value">${contracts.length}</div><div class="stat-label">Total Contratos</div>
    <div class="stat-delta up">${active} activos</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-dollar-sign"></i></div><div>
    <div class="stat-value">${fmtMoney(totalAmt)}</div><div class="stat-label">Monto Contratado</div></div></div>
  <div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-certificate"></i></div><div>
    <div class="stat-value">${fmtMoney(totalCert)}</div><div class="stat-label">Total Certificado</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-percentage"></i></div><div>
    <div class="stat-value">${fmtPct(avancePct)}</div><div class="stat-label">Avance General</div></div></div>
</div>

<div class="filter-bar mt-2">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar contrato, proyecto, contratista..." oninput="filterContracts(this.value)">
  </div>
  <select class="form-control" style="width:220px" onchange="filterContracts(undefined, this.value)">
    <option value="">Todos los proyectos</option>
    ${projects.map(p => '<option value="' + p.id + '">' + p.name + '</option>').join('')}
  </select>
  <select class="form-control" style="width:150px" onchange="filterContracts(undefined, undefined, this.value)">
    <option value="">Todos los estados</option>
    <option value="draft">Borrador</option>
    <option value="active">Activo</option>
    <option value="completed">Completado</option>
    <option value="cancelled">Cancelado</option>
  </select>
</div>

<div class="card">
  <div class="card-body" style="padding:0">
    <div class="table-wrap" id="contracts-table-wrap">
      ${buildContractsTable(contracts, projects, suppliers, certs)}
    </div>
  </div>
</div>
  `;
  window._contractFilters = { q: '', project: '', status: '' };
}

function buildContractsTable(contracts, projects, suppliers, allCerts) {
  if (!contracts.length) return '<div class="empty-state"><i class="fas fa-file-contract"></i><p>No hay contratos registrados. Crea el primero.</p></div>';

  const statusColor = { draft: 'badge-gray', active: 'badge-green', completed: 'badge-blue', cancelled: 'badge-red' };
  const statusLabel = { draft: 'Borrador', active: 'Activo', completed: 'Completado', cancelled: 'Cancelado' };

  return '<table><thead><tr>' +
    '<th>N° Contrato</th><th>Proyecto</th><th>Contratista</th><th>Tipo</th><th>Inicio</th><th>Fin</th>' +
    '<th class="text-right">Monto</th><th class="text-right">Certificado</th><th>Avance</th>' +
    '<th>Estado</th><th>Acciones</th>' +
  '</tr></thead><tbody>' +
  contracts.sort((a, b) => (b.start_date || '').localeCompare(a.start_date || '')).map(c => {
    const proj  = projects.find(p => p.id === c.project_id);
    const sup   = suppliers.find(s => s.id === c.contractor_id);
    const certified = allCerts.filter(cert => cert.contract_id === c.id).reduce((s, cert) => s + (cert.subtotal || 0), 0);
    const avance = c.total_amount > 0 ? certified / c.total_amount * 100 : 0;
    return '<tr>' +
      '<td><strong>' + c.number + '</strong></td>' +
      '<td>' + (proj ? proj.name : '-') + '</td>' +
      '<td>' + (sup ? sup.name : '-') + '</td>' +
      '<td style="font-size:11px">' + (CONTRACT_TYPES[c.type] || c.type || '-') + '</td>' +
      '<td>' + fmtDate(c.start_date) + '</td>' +
      '<td>' + fmtDate(c.end_date) + '</td>' +
      '<td class="number-cell text-right"><strong>' + fmtMoney(c.total_amount || 0) + '</strong></td>' +
      '<td class="number-cell text-right">' + fmtMoney(certified) + '</td>' +
      '<td style="min-width:120px">' + progressBar(avance) + '</td>' +
      '<td><span class="badge ' + (statusColor[c.status] || 'badge-gray') + '">' + (statusLabel[c.status] || c.status) + '</span></td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-ghost btn btn-sm" title="Ver detalle" onclick="viewContract(\'' + c.id + '\')"><i class="fas fa-eye"></i></button>' +
        '<button class="btn-ghost btn btn-sm" title="Editar" onclick="openContractForm(\'' + c.id + '\')"><i class="fas fa-edit"></i></button>' +
        '<button class="btn btn-sm btn-primary" title="Nueva Certificación" onclick="openContractCertForm(\'' + c.id + '\')"><i class="fas fa-certificate"></i> Certif.</button>' +
        '<button class="btn-ghost btn btn-sm danger" onclick="deleteContract(\'' + c.id + '\')"><i class="fas fa-trash"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join('') +
  '</tbody></table>';
}

window._contractFilters = { q: '', project: '', status: '' };
function filterContracts(q, project, status) {
  if (q !== undefined) window._contractFilters.q = q.toLowerCase();
  if (project !== undefined) window._contractFilters.project = project;
  if (status !== undefined) window._contractFilters.status = status;
  let contracts = DB.getAll('contracts');
  const projects  = DB.getAll('projects');
  const suppliers = DB.getAll('suppliers');
  const f = window._contractFilters;
  if (f.q) contracts = contracts.filter(c => {
    const proj = projects.find(p => p.id === c.project_id);
    const sup  = suppliers.find(s => s.id === c.contractor_id);
    return c.number.toLowerCase().includes(f.q)
      || (proj && proj.name.toLowerCase().includes(f.q))
      || (sup  && sup.name.toLowerCase().includes(f.q));
  });
  if (f.project) contracts = contracts.filter(c => c.project_id === f.project);
  if (f.status)  contracts = contracts.filter(c => c.status === f.status);
  const wrap = document.getElementById('contracts-table-wrap');
  if (wrap) wrap.innerHTML = buildContractsTable(contracts, projects, suppliers, DB.getAll('certificates'));
}

// ---- CONTRACT DETAIL VIEW ----
function viewContract(id) {
  const contract = DB.getById('contracts', id);
  if (!contract) return;
  const proj  = DB.getById('projects',  contract.project_id);
  const sup   = DB.getById('suppliers', contract.contractor_id);
  const certs = DB.getAll('certificates').filter(c => c.contract_id === id);
  const totalCertified = certs.reduce((s, c) => s + (c.subtotal || 0), 0);
  const avance = contract.total_amount > 0 ? totalCertified / contract.total_amount * 100 : 0;

  const itemsHtml = (contract.items || []).length
    ? '<div class="table-wrap" style="margin-bottom:16px"><table><thead><tr>' +
        '<th>Descripción</th><th>Unidad</th><th class="text-right">Cantidad</th>' +
        '<th class="text-right">P.Unit.</th><th class="text-right">Total</th><th>Partida BOQ</th>' +
      '</tr></thead><tbody>' +
      (contract.items || []).map(it => {
        const boqItem = it.boq_item_id ? DB.getById('boqItems', it.boq_item_id) : null;
        return '<tr>' +
          '<td>' + it.description + '</td>' +
          '<td>' + it.unit + '</td>' +
          '<td class="number-cell text-right">' + fmtNum(it.quantity) + '</td>' +
          '<td class="number-cell text-right">' + fmtMoney(it.unit_price) + '</td>' +
          '<td class="number-cell text-right"><strong>' + fmtMoney(it.total) + '</strong></td>' +
          '<td style="font-size:11px;color:var(--text-muted)">' + (boqItem ? boqItem.description : '-') + '</td>' +
          '</tr>';
      }).join('') +
      '<tr class="total-row"><td colspan="4" class="text-right"><strong>TOTAL</strong></td>' +
        '<td class="number-cell text-right"><strong>' + fmtMoney(contract.total_amount || 0) + '</strong></td><td></td></tr>' +
      '</tbody></table></div>'
    : '<div class="empty-state" style="padding:20px"><p>Sin partidas de obra cargadas</p></div>';

  const statusColor = { draft: 'badge-gray', pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red' };
  const statusLabel = { draft: 'Borrador', pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' };

  const certsHtml = certs.length
    ? '<div class="table-wrap"><table><thead><tr>' +
        '<th>N° Cert.</th><th>Período</th><th class="text-right">Monto</th>' +
        '<th class="text-right">Retención</th><th class="text-right">Neto</th><th>Estado</th><th>Acciones</th>' +
      '</tr></thead><tbody>' +
      certs.sort((a, b) => b.date.localeCompare(a.date)).map(c => {
        return '<tr>' +
          '<td><strong>' + c.number + '</strong></td>' +
          '<td style="font-size:11px">' + fmtDate(c.period_from) + ' — ' + fmtDate(c.period_to) + '</td>' +
          '<td class="number-cell text-right">' + fmtMoney(c.subtotal) + '</td>' +
          '<td class="number-cell text-right text-warning">' + fmtMoney(c.retention_amount || 0) + '</td>' +
          '<td class="number-cell text-right"><strong>' + fmtMoney(c.net_amount) + '</strong></td>' +
          '<td><span class="badge ' + (statusColor[c.status] || 'badge-gray') + '">' + (statusLabel[c.status] || c.status) + '</span></td>' +
          '<td><div class="table-actions">' +
            '<button class="btn-ghost btn btn-sm" onclick="viewCert(\'' + c.id + '\')"><i class="fas fa-eye"></i></button>' +
            (c.status === 'pending' ? '<button class="btn btn-sm btn-success" onclick="approveCert(\'' + c.id + '\');closeModal();viewContract(\'' + id + '\')"><i class="fas fa-check"></i></button>' : '') +
          '</div></td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>' +
      '<div style="padding:12px;text-align:right;font-size:13px;border-top:2px solid var(--border)">' +
        'Total Certificado: <strong style="color:var(--primary)">' + fmtMoney(totalCertified) + '</strong> &nbsp;|&nbsp; ' +
        'Avance: <strong>' + fmtPct(avance) + '</strong>' +
      '</div></div>'
    : '<div class="empty-state" style="padding:20px"><i class="fas fa-certificate"></i><p>Sin certificaciones para este contrato</p></div>';

  openModal('Contrato ' + contract.number,
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;font-size:12px">' +
      '<div style="background:var(--bg);padding:12px;border-radius:8px">' +
        '<div style="font-weight:700;margin-bottom:8px;font-size:13px">DATOS DEL CONTRATO</div>' +
        '<div><strong>Proyecto:</strong> ' + (proj ? proj.name : '-') + '</div>' +
        '<div><strong>Contratista:</strong> ' + (sup ? sup.name : '-') + '</div>' +
        '<div><strong>Tipo:</strong> ' + (CONTRACT_TYPES[contract.type] || '-') + '</div>' +
        '<div><strong>Estado:</strong> ' + (contract.status || '-') + '</div>' +
        (contract.notes ? '<div style="margin-top:6px;color:var(--text-muted)"><strong>Notas:</strong> ' + contract.notes + '</div>' : '') +
      '</div>' +
      '<div style="background:var(--bg);padding:12px;border-radius:8px">' +
        '<div style="font-weight:700;margin-bottom:8px;font-size:13px">PLAZOS Y MONTOS</div>' +
        '<div><strong>Inicio:</strong> ' + fmtDate(contract.start_date) + '</div>' +
        '<div><strong>Fin:</strong> ' + fmtDate(contract.end_date) + '</div>' +
        '<div><strong>Monto Total:</strong> ' + fmtMoney(contract.total_amount || 0) + '</div>' +
        '<div><strong>Certificado:</strong> ' + fmtMoney(totalCertified) + ' (' + fmtPct(avance) + ')</div>' +
        '<div style="margin-top:8px">' + progressBar(avance) + '</div>' +
      '</div>' +
    '</div>' +
    '<div id="contract-detail-tabs">' +
      '<div class="tabs">' +
        '<button class="tab-btn" data-tab="ctab-items">Partidas de Obra (' + (contract.items || []).length + ')</button>' +
        '<button class="tab-btn" data-tab="ctab-certs">Certificaciones (' + certs.length + ')</button>' +
      '</div>' +
      '<div id="ctab-items" class="tab-content">' + itemsHtml + '</div>' +
      '<div id="ctab-certs" class="tab-content">' + certsHtml + '</div>' +
    '</div>',
  'modal-xl',
    '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>' +
    '<button class="btn btn-secondary" onclick="closeModal();openContractForm(\'' + id + '\')"><i class="fas fa-edit"></i> Editar</button>' +
    '<button class="btn btn-primary" onclick="closeModal();openContractCertForm(\'' + id + '\')"><i class="fas fa-certificate"></i> Nueva Certificación</button>'
  );
  setTimeout(() => initTabs('contract-detail-tabs'), 50);
}

// ---- CONTRACT FORM ----
function openContractForm(id = null) {
  const contract  = id ? DB.getById('contracts', id) : null;
  const projects  = DB.getAll('projects');
  const suppliers = DB.getAll('suppliers');
  const boqItems  = DB.getAll('boqItems');
  const nextNum   = 'CONT-' + new Date().getFullYear() + '-' + String(DB.getAll('contracts').length + 1).padStart(3, '0');
  const items     = (contract && contract.items) ? contract.items : [{ description: '', unit: 'm²', quantity: 0, unit_price: 0, total: 0, boq_item_id: '' }];

  const boqOpts = boqItems.map(b => '<option value="' + b.id + '">' + b.description + ' (' + b.unit + ')</option>').join('');

  openModal(contract ? 'Editar Contrato' : 'Nuevo Contrato de Obra',
    '<div class="form-grid form-grid-2">' +
      '<div class="form-group"><label class="form-label">Número de Contrato</label>' +
        '<input class="form-control" id="cont-num" value="' + ((contract && contract.number) || nextNum) + '"></div>' +
      '<div class="form-group"><label class="form-label">Estado</label>' +
        '<select class="form-control" id="cont-status">' +
          '<option value="draft" ' + ((contract && contract.status === 'draft') ? 'selected' : '') + '>Borrador</option>' +
          '<option value="active" ' + ((!contract || contract.status === 'active') ? 'selected' : '') + '>Activo</option>' +
          '<option value="completed" ' + ((contract && contract.status === 'completed') ? 'selected' : '') + '>Completado</option>' +
          '<option value="cancelled" ' + ((contract && contract.status === 'cancelled') ? 'selected' : '') + '>Cancelado</option>' +
        '</select></div>' +
      '<div class="form-group"><label class="form-label">Proyecto *</label>' +
        '<select class="form-control" id="cont-project">' +
          '<option value="">Seleccionar...</option>' +
          projects.map(p => '<option value="' + p.id + '" ' + ((contract && contract.project_id === p.id) ? 'selected' : '') + '>' + p.name + '</option>').join('') +
        '</select></div>' +
      '<div class="form-group"><label class="form-label">Contratista *</label>' +
        '<select class="form-control" id="cont-contractor">' +
          '<option value="">Seleccionar...</option>' +
          suppliers.map(s => '<option value="' + s.id + '" ' + ((contract && contract.contractor_id === s.id) ? 'selected' : '') + '>' + s.name + '</option>').join('') +
        '</select></div>' +
      '<div class="form-group"><label class="form-label">Tipo de Contrato</label>' +
        '<select class="form-control" id="cont-type">' +
          '<option value="lump_sum" ' + ((!contract || contract.type === 'lump_sum') ? 'selected' : '') + '>Suma Alzada</option>' +
          '<option value="unit_price" ' + ((contract && contract.type === 'unit_price') ? 'selected' : '') + '>Por Unidad de Medida</option>' +
          '<option value="cost_plus" ' + ((contract && contract.type === 'cost_plus') ? 'selected' : '') + '>Coste Más Honorarios</option>' +
          '<option value="mixed" ' + ((contract && contract.type === 'mixed') ? 'selected' : '') + '>Mixto</option>' +
        '</select></div>' +
      '<div class="form-group"><label class="form-label">Fecha de Inicio</label>' +
        '<input class="form-control" id="cont-start" type="date" value="' + ((contract && contract.start_date) || todayStr()) + '"></div>' +
      '<div class="form-group"><label class="form-label">Fecha de Fin</label>' +
        '<input class="form-control" id="cont-end" type="date" value="' + ((contract && contract.end_date) || addDays(todayStr(), 180)) + '"></div>' +
      '<div class="form-group full"><label class="form-label">Notas</label>' +
        '<textarea class="form-control" id="cont-notes" rows="2">' + ((contract && contract.notes) || '') + '</textarea></div>' +
    '</div>' +
    '<div class="divider"></div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
      '<strong style="font-size:13px">Partidas de Obra</strong>' +
      '<button class="btn btn-sm btn-secondary" onclick="addContractItem()"><i class="fas fa-plus"></i> Agregar partida</button>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:2.5fr 70px 90px 110px 110px 1.5fr 34px;gap:4px;margin-bottom:4px;font-size:10px;font-weight:600;color:var(--text-muted)">' +
      '<span>Descripción</span><span>Unidad</span><span>Cantidad</span><span>P.Unit.</span><span>Total</span><span>Partida BOQ</span><span></span>' +
    '</div>' +
    '<div id="cont-items">' +
      items.map(function(it, i) { return contractItemRow(it, i, boqOpts); }).join('') +
    '</div>' +
    '<div id="cont-totals" style="text-align:right;margin-top:10px;font-size:13px">' +
      calcContractTotalsHtml(items) +
    '</div>',
  'modal-xl',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="saveContract(\'' + (id || '') + '\')"><i class="fas fa-save"></i> Guardar</button>'
  );
  window._contractItems = items.map(function(it) { return Object.assign({}, it); });
}

function contractItemRow(it, i, boqOpts) {
  const opts = boqOpts || DB.getAll('boqItems').map(b => '<option value="' + b.id + '">' + b.description + '</option>').join('');
  return '<div id="coni-row-' + i + '" style="display:grid;grid-template-columns:2.5fr 70px 90px 110px 110px 1.5fr 34px;gap:4px;margin-bottom:6px;align-items:center">' +
    '<input class="form-control" style="font-size:12px" placeholder="Descripción de la partida" value="' + (it.description || '') + '" oninput="updateContractItem(' + i + ',\'description\',this.value)">' +
    '<input class="form-control" style="font-size:12px" value="' + (it.unit || 'm²') + '" oninput="updateContractItem(' + i + ',\'unit\',this.value)">' +
    '<input class="form-control" style="font-size:12px" type="number" min="0" value="' + (it.quantity || 0) + '" oninput="updateContractItem(' + i + ',\'quantity\',+this.value)">' +
    '<input class="form-control" style="font-size:12px" type="number" min="0" value="' + (it.unit_price || 0) + '" oninput="updateContractItem(' + i + ',\'unit_price\',+this.value)">' +
    '<input class="form-control" style="font-size:12px;background:#f8fafc" readonly id="coni-total-' + i + '" value="' + (it.total || 0) + '">' +
    '<select class="form-control" style="font-size:11px" onchange="updateContractItem(' + i + ',\'boq_item_id\',this.value)">' +
      '<option value="">Sin partida BOQ</option>' + opts +
    '</select>' +
    '<button class="btn-ghost btn danger" onclick="removeContractItem(' + i + ')"><i class="fas fa-times"></i></button>' +
    '</div>';
}

window._contractItems = [];
function addContractItem() {
  const it = { description: '', unit: 'm²', quantity: 0, unit_price: 0, total: 0, boq_item_id: '' };
  window._contractItems.push(it);
  const i = window._contractItems.length - 1;
  const cont = document.getElementById('cont-items');
  const div = document.createElement('div');
  div.innerHTML = contractItemRow(it, i);
  cont.appendChild(div.firstElementChild);
}

function updateContractItem(i, field, val) {
  if (!window._contractItems[i]) window._contractItems[i] = { description: '', unit: 'm²', quantity: 0, unit_price: 0, total: 0, boq_item_id: '' };
  window._contractItems[i][field] = val;
  window._contractItems[i].total = (window._contractItems[i].quantity || 0) * (window._contractItems[i].unit_price || 0);
  const totEl = document.getElementById('coni-total-' + i);
  if (totEl) totEl.value = window._contractItems[i].total;
  const totalsEl = document.getElementById('cont-totals');
  if (totalsEl) totalsEl.innerHTML = calcContractTotalsHtml(window._contractItems.filter(Boolean));
}

function removeContractItem(i) {
  const row = document.getElementById('coni-row-' + i);
  if (row) row.remove();
  window._contractItems[i] = null;
  const totalsEl = document.getElementById('cont-totals');
  if (totalsEl) totalsEl.innerHTML = calcContractTotalsHtml(window._contractItems.filter(Boolean));
}

function calcContractTotalsHtml(items) {
  const total = items.filter(Boolean).reduce(function(s, it) { return s + (it.total || 0); }, 0);
  return 'Partidas: <strong>' + items.filter(Boolean).length + '</strong> &nbsp;|&nbsp; TOTAL CONTRATO: <strong style="font-size:15px;color:var(--primary)">' + fmtMoney(total) + '</strong>';
}

function saveContract(id) {
  const projectId    = document.getElementById('cont-project').value;
  const contractorId = document.getElementById('cont-contractor').value;
  if (!projectId || !contractorId) { toast('Proyecto y contratista son obligatorios', 'error'); return; }

  const items = window._contractItems.filter(Boolean).filter(function(it) { return it.description; });
  const total = items.reduce(function(s, it) { return s + (it.total || 0); }, 0);

  const data = {
    number:       document.getElementById('cont-num').value,
    project_id:   projectId,
    contractor_id: contractorId,
    type:         document.getElementById('cont-type').value,
    status:       document.getElementById('cont-status').value,
    start_date:   document.getElementById('cont-start').value,
    end_date:     document.getElementById('cont-end').value,
    notes:        document.getElementById('cont-notes').value.trim(),
    items,
    total_amount: total,
  };

  if (id) { DB.update('contracts', id, data); toast('Contrato actualizado', 'success'); }
  else    { DB.insert('contracts', data);      toast('Contrato creado', 'success'); }

  window._contractItems = [];
  closeModal();
  renderContratos();
}

function deleteContract(id) {
  confirmDialog('¿Eliminar este contrato? Las certificaciones asociadas quedarán sin contrato.', function() {
    DB.remove('contracts', id);
    toast('Contrato eliminado', 'warning');
    renderContratos();
  });
}

// ---- CERTIFICATE FORM FROM CONTRACT ----
function openContractCertForm(contractId) {
  const contract = DB.getById('contracts', contractId);
  if (!contract) return;
  const proj     = DB.getById('projects', contract.project_id);
  const nextNum  = 'CERT-' + new Date().getFullYear() + '-' + String(DB.getAll('certificates').length + 1).padStart(3, '0');

  const contractItems = (contract.items || []);
  const certItems = contractItems.map(function(it) {
    return {
      description:       it.description,
      unit:              it.unit,
      quantity_contract: it.quantity,
      quantity_period:   0,
      unit_price:        it.unit_price,
      amount_period:     0,
      pct_complete:      0,
    };
  });
  if (!certItems.length) certItems.push({ description: '', unit: 'm²', quantity_contract: 0, quantity_period: 0, unit_price: 0, amount_period: 0, pct_complete: 0 });

  openModal('Nueva Certificación — ' + contract.number,
    '<div style="background:var(--bg);padding:10px;border-radius:8px;margin-bottom:14px;font-size:12px">' +
      '<strong>' + contract.number + '</strong> &nbsp;|&nbsp; Proyecto: ' + (proj ? proj.name : '-') +
      ' &nbsp;|&nbsp; Tipo: ' + (CONTRACT_TYPES[contract.type] || '-') +
      ' &nbsp;|&nbsp; Total: ' + fmtMoney(contract.total_amount || 0) +
    '</div>' +
    '<div class="form-grid form-grid-2">' +
      '<div class="form-group"><label class="form-label">Número</label><input class="form-control" id="ccf-num" value="' + nextNum + '"></div>' +
      '<div class="form-group"><label class="form-label">Estado</label>' +
        '<select class="form-control" id="ccf-status">' +
          '<option value="pending">Pendiente de Aprobación</option>' +
          '<option value="draft">Borrador</option>' +
        '</select></div>' +
      '<div class="form-group"><label class="form-label">Fecha</label>' +
        '<input class="form-control" id="ccf-date" type="date" value="' + todayStr() + '"></div>' +
      '<div class="form-group"><label class="form-label">Aprobado por</label>' +
        '<input class="form-control" id="ccf-approver" placeholder="Director de Obra"></div>' +
      '<div class="form-group"><label class="form-label">Período Desde</label>' +
        '<input class="form-control" id="ccf-from" type="date"></div>' +
      '<div class="form-group"><label class="form-label">Período Hasta</label>' +
        '<input class="form-control" id="ccf-to" type="date" value="' + todayStr() + '"></div>' +
      '<div class="form-group"><label class="form-label">% Fondo de Reparo</label>' +
        '<input class="form-control" id="ccf-ret-pct" type="number" min="0" max="20" value="5" oninput="updateContractCertTotals()"></div>' +
    '</div>' +
    '<div class="divider"></div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
      '<strong style="font-size:13px">Ítems a Certificar</strong>' +
      '<button class="btn btn-sm btn-secondary" onclick="addCCertItem()"><i class="fas fa-plus"></i> Ítem</button>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:3fr 60px 90px 90px 110px 110px 80px 30px;gap:4px;margin-bottom:4px;font-size:10px;font-weight:600;color:var(--text-muted)">' +
      '<span>Descripción</span><span>Unidad</span><span>Cant.Contrato</span><span>Cant.Período</span><span>Precio Unit.</span><span>Monto</span><span>% Avance</span><span></span>' +
    '</div>' +
    '<div id="ccert-items">' +
      certItems.map(function(it, i) { return ccertItemRow(it, i); }).join('') +
    '</div>' +
    '<div id="ccert-totals" style="text-align:right;margin-top:10px;font-size:13px">' +
      calcCCertTotalsHtml(certItems, 5) +
    '</div>' +
    '<div class="form-group full mt-2"><label class="form-label">Notas</label>' +
      '<textarea class="form-control" id="ccf-notes" rows="2"></textarea></div>',
  'modal-xl',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="saveContractCert(\'' + contractId + '\')"><i class="fas fa-save"></i> Guardar Certificación</button>'
  );
  window._ccertItems = certItems.map(function(it) { return Object.assign({}, it); });
}

function ccertItemRow(it, i) {
  return '<div id="cci-row-' + i + '" style="display:grid;grid-template-columns:3fr 60px 90px 90px 110px 110px 80px 30px;gap:4px;margin-bottom:4px;align-items:center">' +
    '<input class="form-control" style="font-size:11px" placeholder="Descripción" value="' + (it.description || '') + '" oninput="updateCCI(' + i + ',\'description\',this.value)">' +
    '<input class="form-control" style="font-size:11px" value="' + (it.unit || 'm²') + '" oninput="updateCCI(' + i + ',\'unit\',this.value)">' +
    '<input class="form-control" style="font-size:11px" type="number" min="0" value="' + (it.quantity_contract || 0) + '" oninput="updateCCI(' + i + ',\'quantity_contract\',+this.value)">' +
    '<input class="form-control" style="font-size:11px" type="number" min="0" value="' + (it.quantity_period || 0) + '" oninput="updateCCI(' + i + ',\'quantity_period\',+this.value)">' +
    '<input class="form-control" style="font-size:11px" type="number" min="0" value="' + (it.unit_price || 0) + '" oninput="updateCCI(' + i + ',\'unit_price\',+this.value)">' +
    '<input class="form-control" style="font-size:11px;background:#f8fafc" readonly id="cci-amount-' + i + '" value="' + (it.amount_period || 0) + '">' +
    '<input class="form-control" style="font-size:11px;background:#f8fafc" readonly id="cci-pct-' + i + '" value="' + (it.pct_complete || 0) + '">' +
    '<button class="btn-ghost btn danger" onclick="removeCCI(' + i + ')"><i class="fas fa-times" style="font-size:10px"></i></button>' +
    '</div>';
}

window._ccertItems = [];
function addCCertItem() {
  const it = { description: '', unit: 'm²', quantity_contract: 0, quantity_period: 0, unit_price: 0, amount_period: 0, pct_complete: 0 };
  window._ccertItems.push(it);
  const i = window._ccertItems.length - 1;
  const cont = document.getElementById('ccert-items');
  const div = document.createElement('div');
  div.innerHTML = ccertItemRow(it, i);
  cont.appendChild(div.firstElementChild);
}

function updateCCI(i, field, val) {
  if (!window._ccertItems[i]) window._ccertItems[i] = { description: '', unit: 'm²', quantity_contract: 0, quantity_period: 0, unit_price: 0, amount_period: 0, pct_complete: 0 };
  window._ccertItems[i][field] = val;
  const it = window._ccertItems[i];
  it.amount_period = (it.quantity_period || 0) * (it.unit_price || 0);
  it.pct_complete  = it.quantity_contract > 0 ? Math.round((it.quantity_period / it.quantity_contract) * 1000) / 10 : 0;
  const amtEl = document.getElementById('cci-amount-' + i);
  const pctEl = document.getElementById('cci-pct-' + i);
  if (amtEl) amtEl.value = it.amount_period;
  if (pctEl) pctEl.value = it.pct_complete;
  updateContractCertTotals();
}

function removeCCI(i) {
  const row = document.getElementById('cci-row-' + i);
  if (row) row.remove();
  window._ccertItems[i] = null;
  updateContractCertTotals();
}

function updateContractCertTotals() {
  const retPct = parseFloat(document.getElementById('ccf-ret-pct') ? document.getElementById('ccf-ret-pct').value : 5) || 5;
  const el = document.getElementById('ccert-totals');
  if (el) el.innerHTML = calcCCertTotalsHtml(window._ccertItems.filter(Boolean), retPct);
}

function calcCCertTotalsHtml(items, retPct) {
  retPct = retPct || 5;
  const subtotal  = items.filter(Boolean).reduce(function(s, it) { return s + (it.amount_period || 0); }, 0);
  const retention = subtotal * retPct / 100;
  const net       = subtotal - retention;
  return 'Subtotal: <strong>' + fmtMoney(subtotal) + '</strong> &nbsp;|&nbsp; ' +
    'Fondo Reparo (' + retPct + '%): <strong class="text-warning">' + fmtMoney(retention) + '</strong> &nbsp;|&nbsp; ' +
    '<strong style="font-size:15px;color:var(--primary)">Neto: ' + fmtMoney(net) + '</strong>';
}

function saveContractCert(contractId) {
  const contract = DB.getById('contracts', contractId);
  if (!contract) return;
  const items    = window._ccertItems.filter(Boolean).filter(function(it) { return it.description; });
  const retPct   = parseFloat(document.getElementById('ccf-ret-pct').value) || 5;
  const subtotal = items.reduce(function(s, it) { return s + (it.amount_period || 0); }, 0);
  const retention = subtotal * retPct / 100;

  const data = {
    number:           document.getElementById('ccf-num').value,
    project_id:       contract.project_id,
    contract_id:      contractId,
    status:           document.getElementById('ccf-status').value,
    date:             document.getElementById('ccf-date').value,
    period_from:      document.getElementById('ccf-from').value,
    period_to:        document.getElementById('ccf-to').value,
    approved_by:      document.getElementById('ccf-approver').value.trim(),
    items,
    subtotal,
    retention_pct:    retPct,
    retention_amount: retention,
    net_amount:       subtotal - retention,
    notes:            document.getElementById('ccf-notes').value.trim(),
  };

  DB.insert('certificates', data);
  toast('Certificación creada correctamente', 'success');
  window._ccertItems = [];
  closeModal();
  renderContratos();
}

// ---- EXPORT ----
function exportContracts() {
  const contracts = DB.getAll('contracts');
  const projects  = DB.getAll('projects');
  const suppliers = DB.getAll('suppliers');
  const certs     = DB.getAll('certificates');
  exportXLSX('contratos.xlsx',
    ['Número', 'Proyecto', 'Contratista', 'Tipo', 'Inicio', 'Fin', 'Monto Contrato', 'Certificado', 'Estado'],
    contracts.map(function(c) {
      const certified = certs.filter(function(cert) { return cert.contract_id === c.id; })
                             .reduce(function(s, cert) { return s + (cert.subtotal || 0); }, 0);
      return [
        c.number,
        (projects.find(function(p) { return p.id === c.project_id; }) || {}).name || '',
        (suppliers.find(function(s) { return s.id === c.contractor_id; }) || {}).name || '',
        CONTRACT_TYPES[c.type] || c.type,
        c.start_date,
        c.end_date,
        c.total_amount || 0,
        certified,
        c.status,
      ];
    })
  );
}
