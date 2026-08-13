/* ===== CENTRAL DE PROVEEDORES — revisión de cambios (anti-BEC) ===== */
// Cola de solicitudes de cambio de datos de proveedor. Los cambios sensibles
// (datos bancarios) NO se aplican directo: quedan pendientes de aprobación, con
// doble aprobación y auditoría. Al aprobar un cambio bancario se levanta el bloqueo
// de pagos del proveedor.

function _cpUser() {
  var u = (window.APP_STATE && window.APP_STATE.currentUser) || {};
  return { email: (u.email || 'sistema'), name: (u.name || u.email || 'sistema'), role: (u.role || 'viewer') };
}
function _cpIso() { return new Date().toISOString(); }

// Etiqueta legible de un campo de datos de pago/perfil.
var CP_FIELD_LABELS = {
  cbu: 'CBU', alias: 'Alias', bank: 'Banco', holder: 'Titular',
  uy_account: 'Nº cuenta (UY)', uy_bank: 'Banco (UY)', uy_holder: 'Titular (UY)', uy_currency: 'Moneda (UY)',
  us_routing: 'Routing (US)', us_account: 'Account (US)', us_iban: 'IBAN', us_swift: 'SWIFT/BIC', us_holder: 'Account holder (US)',
  cuit: 'CUIT/RUT/EIN', iva: 'Condición fiscal', name: 'Razón social', email: 'Email', phone: 'Teléfono', address: 'Dirección', contact: 'Contacto',
};
var CP_BANK_FIELDS = ['cbu','alias','bank','holder','uy_account','uy_bank','uy_holder','uy_currency','us_routing','us_account','us_iban','us_swift','us_holder'];

// Crea una solicitud de cambio. fields = { campo: {old, new} }.
function cpCreateChangeRequest(opts) {
  var isBank = Object.keys(opts.fields || {}).some(function(k) { return CP_BANK_FIELDS.indexOf(k) !== -1; });
  var u = _cpUser();
  var cr = {
    id: (typeof uuid === 'function' ? uuid() : 'cr-' + Date.now() + '-' + Math.round(performance.now())),
    supplier_id: opts.supplier_id,
    supplier_name: opts.supplier_name || '',
    scope_company_id: opts.scope_company_id || DB._companyId,
    type: isBank ? 'bank' : 'general',
    risk: isBank ? 'high' : 'normal',
    fields: opts.fields || {},
    status: 'pending',
    source: opts.source || 'internal',
    requested_by: u.email,
    requested_at: _cpIso(),
    approvals: [],
  };
  DB.insert('supplierChangeRequests', cr);
  return cr;
}

// Todas las solicitudes (consolidado multi-empresa).
function cpAllRequests() {
  var arr = (typeof DB.getAllConsolidated === 'function') ? DB.getAllConsolidated('supplierChangeRequests') : DB.getAll('supplierChangeRequests');
  return arr.slice().sort(function(a, b) { return (b.requested_at || '').localeCompare(a.requested_at || ''); });
}

// Actualiza el proveedor (en TODAS las razones sociales donde exista ese supplier_id)
// aplicando los valores nuevos del cambio, y ajusta bloqueo/estado de revisión.
function cpApplyToSupplier(supplierId, newValues, opts) {
  opts = opts || {};
  var prev = DB._companyId;
  var updatedAny = false;
  try {
    var all = (typeof DB.getAllConsolidated === 'function') ? DB.getAllConsolidated('suppliers') : DB.getAll('suppliers');
    var targets = all.filter(function(s) { return s.id === supplierId; });
    // Empresas donde vive ese proveedor (al menos la activa)
    var byCompany = {};
    targets.forEach(function(s) { byCompany[s._company_id || prev] = true; });
    if (!Object.keys(byCompany).length) byCompany[prev] = true;
    Object.keys(byCompany).forEach(function(cid) {
      try {
        DB.setCompany(cid);
        var s = DB.getById('suppliers', supplierId);
        if (!s) return;
        var patch = {};
        // Aplicar valores de pago (merge sobre payment) y/o campos de perfil.
        var payment = Object.assign({}, s.payment || {});
        Object.keys(newValues).forEach(function(k) {
          if (CP_BANK_FIELDS.indexOf(k) !== -1) payment[k] = newValues[k];
          else patch[k] = newValues[k];
        });
        patch.payment = payment;
        if (opts.setReviewOk) { patch.review_status = 'ok'; patch.payment_blocked = false; }
        DB.update('suppliers', supplierId, patch);
        updatedAny = true;
      } catch(e) {}
    });
  } finally {
    try { DB.setCompany(prev); } catch(e) {}
  }
  return updatedAny;
}

// Marca al proveedor bloqueado / en revisión (en todas sus empresas).
function cpFlagSupplier(supplierId, flags) {
  var prev = DB._companyId;
  try {
    var all = (typeof DB.getAllConsolidated === 'function') ? DB.getAllConsolidated('suppliers') : DB.getAll('suppliers');
    var byCompany = {};
    all.filter(function(s){ return s.id === supplierId; }).forEach(function(s){ byCompany[s._company_id || prev] = true; });
    if (!Object.keys(byCompany).length) byCompany[prev] = true;
    Object.keys(byCompany).forEach(function(cid) {
      try { DB.setCompany(cid); if (DB.getById('suppliers', supplierId)) DB.update('suppliers', supplierId, flags); } catch(e) {}
    });
  } finally { try { DB.setCompany(prev); } catch(e) {} }
}

function cpFindRequest(id) {
  return cpAllRequests().find(function(r) { return r.id === id; }) || null;
}

// Actualiza la solicitud en su empresa de origen.
function cpUpdateRequest(cr, patch) {
  var prev = DB._companyId;
  try { DB.setCompany(cr.scope_company_id || prev); DB.update('supplierChangeRequests', cr.id, patch); }
  finally { try { DB.setCompany(prev); } catch(e) {} }
}

function cpApprove(id) {
  var cr = cpFindRequest(id);
  if (!cr || cr.status !== 'pending') return;
  var u = _cpUser();
  var approvals = (cr.approvals || []).slice();
  if (cr.risk === 'high') {
    if (approvals.some(function(a) { return a.by === u.email; })) {
      toast('Ya registraste tu aprobación. Un cambio bancario necesita una 2ª aprobación de OTRA persona.', 'warning');
      return;
    }
    approvals.push({ by: u.email, at: _cpIso() });
    if (approvals.length < 2) {
      cpUpdateRequest(cr, { approvals: approvals });
      toast('1ª aprobación registrada. Falta una 2ª aprobación de otra persona para aplicar el cambio bancario.', 'info');
      renderCentralProveedores();
      return;
    }
  } else {
    approvals.push({ by: u.email, at: _cpIso() });
  }
  // Aplicar
  var newValues = {};
  Object.keys(cr.fields || {}).forEach(function(k) { newValues[k] = cr.fields[k].new; });
  cpApplyToSupplier(cr.supplier_id, newValues, { setReviewOk: true });
  cpUpdateRequest(cr, { status: 'approved', approvals: approvals, reviewed_by: u.email, reviewed_at: _cpIso() });
  if (typeof window.auditLog === 'function') { try { window.auditLog('approve', 'supplierChangeRequests', cr.id, cr); } catch(e) {} }
  toast('Cambio aprobado y aplicado. ' + (cr.risk === 'high' ? 'Pagos desbloqueados.' : ''), 'success');
  renderCentralProveedores();
}

function cpReject(id) {
  var cr = cpFindRequest(id);
  if (!cr || cr.status !== 'pending') return;
  openModal('Rechazar cambio', '<div class="form-group"><label class="form-label">Motivo del rechazo</label>' +
    '<textarea class="form-control" id="cp-reject-note" rows="3" placeholder="Ej.: no se pudo verificar el CBU con el proveedor"></textarea></div>', 'modal-sm',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-danger" onclick="cpDoReject(\'' + cr.id + '\')">Rechazar</button>');
}
function cpDoReject(id) {
  var cr = cpFindRequest(id);
  if (!cr) return;
  var note = (document.getElementById('cp-reject-note') || {}).value || '';
  var u = _cpUser();
  cpUpdateRequest(cr, { status: 'rejected', reviewed_by: u.email, reviewed_at: _cpIso(), decision_note: note });
  // Si era bancario y no quedan otros cambios bancarios pendientes, levantar el bloqueo
  // (el dato viejo sigue vigente; se rechazó el nuevo).
  if (cr.risk === 'high') {
    var stillPending = cpAllRequests().some(function(r) { return r.supplier_id === cr.supplier_id && r.risk === 'high' && r.status === 'pending' && r.id !== cr.id; });
    if (!stillPending) cpFlagSupplier(cr.supplier_id, { payment_blocked: false, review_status: 'ok' });
  }
  closeModal();
  toast('Cambio rechazado. El dato anterior sigue vigente.', 'success');
  renderCentralProveedores();
}

/* ---- VISTA ---- */
function renderCentralProveedores() {
  var reqs = cpAllRequests();
  var pending = reqs.filter(function(r) { return r.status === 'pending'; });
  var suppliers = (typeof DB.getAllConsolidated === 'function') ? DB.getAllConsolidated('suppliers') : DB.getAll('suppliers');
  // dedupe proveedores por id (aparecen en varias empresas)
  var supById = {}; suppliers.forEach(function(s) { if (!supById[s.id]) supById[s.id] = s; });
  var supArr = Object.keys(supById).map(function(k) { return supById[k]; });
  var blocked = supArr.filter(function(s) { return s.payment_blocked; });
  var review = supArr.filter(function(s) { return s.review_status === 'under_review'; });

  document.getElementById('content').innerHTML =
    '<div class="page-header"><div>' +
    '<div class="page-eyebrow"><i class="fas fa-shield-halved" style="font-size:14px"></i> Proveedores</div>' +
    '<div class="page-title">Central de Proveedores</div>' +
    '<div class="page-subtitle">Revisión y aprobación de cambios de datos (control anti-fraude BEC)</div>' +
    '</div></div>' +
    '<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">' +
      '<div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-clock"></i></div><div>' +
        '<div class="stat-value">' + pending.length + '</div><div class="stat-label">Cambios pendientes</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon red"><i class="fas fa-lock"></i></div><div>' +
        '<div class="stat-value">' + blocked.length + '</div><div class="stat-label">Con pagos bloqueados</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon blue"><i class="fas fa-user-check"></i></div><div>' +
        '<div class="stat-value">' + review.length + '</div><div class="stat-label">En revisión</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon green"><i class="fas fa-truck"></i></div><div>' +
        '<div class="stat-value">' + supArr.length + '</div><div class="stat-label">Proveedores</div></div></div>' +
    '</div>' +
    '<div class="card"><div class="card-header"><span class="card-title"><i class="fas fa-list-check text-primary"></i> Cambios pendientes de aprobación</span></div>' +
    '<div class="card-body" style="padding:0"><div class="table-wrap">' + _cpPendingTable(pending) + '</div></div></div>' +
    '<div class="card mt-3"><div class="card-header"><span class="card-title"><i class="fas fa-history text-primary"></i> Historial de cambios</span></div>' +
    '<div class="card-body" style="padding:0"><div class="table-wrap">' + _cpHistoryTable(reqs.filter(function(r){ return r.status !== 'pending'; }).slice(0, 40)) + '</div></div></div>';
}

function _cpChangesHtml(cr) {
  return Object.keys(cr.fields || {}).map(function(k) {
    var f = cr.fields[k];
    return '<div style="font-size:12px;margin:2px 0">' +
      '<span style="color:var(--text-muted)">' + escapeHtml(CP_FIELD_LABELS[k] || k) + ':</span> ' +
      '<span style="text-decoration:line-through;color:#94a3b8">' + escapeHtml(String(f.old || '—')) + '</span> ' +
      '<i class="fas fa-arrow-right" style="font-size:9px;color:#94a3b8"></i> ' +
      '<strong>' + escapeHtml(String(f.new || '—')) + '</strong></div>';
  }).join('');
}

function _cpPendingTable(pending) {
  if (!pending.length) return '<div class="empty-state"><i class="fas fa-check-circle" style="color:var(--success)"></i><p>No hay cambios pendientes</p></div>';
  return '<table><thead><tr><th>Proveedor</th><th>Cambios</th><th>Origen</th><th>Riesgo</th><th>Solicitado</th><th>Acciones</th></tr></thead><tbody>' +
    pending.map(function(cr) {
      var bankBadge = cr.risk === 'high' ? '<span class="badge badge-red"><i class="fas fa-university"></i> Bancario</span>' : '<span class="badge badge-gray">General</span>';
      var appr = (cr.approvals || []).length;
      var apprNote = cr.risk === 'high' ? '<div style="font-size:11px;color:var(--text-muted)">' + appr + '/2 aprobaciones</div>' : '';
      return '<tr>' +
        '<td><strong>' + escapeHtml(cr.supplier_name || cr.supplier_id) + '</strong>' + apprNote + '</td>' +
        '<td>' + _cpChangesHtml(cr) + '</td>' +
        '<td><span class="badge badge-' + (cr.source === 'portal' ? 'blue' : 'gray') + '">' + (cr.source === 'portal' ? 'Portal' : 'Interno') + '</span></td>' +
        '<td>' + bankBadge + '</td>' +
        '<td style="font-size:11px">' + fmtDate((cr.requested_at || '').slice(0,10)) + '<br><span style="color:var(--text-muted)">' + escapeHtml(cr.requested_by || '') + '</span></td>' +
        '<td><div class="table-actions">' +
          '<button class="btn btn-sm btn-primary" onclick="cpApprove(\'' + cr.id + '\')"><i class="fas fa-check"></i> Aprobar</button> ' +
          '<button class="btn btn-sm btn-secondary danger" onclick="cpReject(\'' + cr.id + '\')"><i class="fas fa-times"></i></button>' +
        '</div>' +
        (cr.risk === 'high' ? '<div style="font-size:10px;color:#b45309;margin-top:4px"><i class="fas fa-phone"></i> Verificá el CBU por teléfono con un contacto conocido antes de aprobar.</div>' : '') +
        '</td></tr>';
    }).join('') + '</tbody></table>';
}

function _cpHistoryTable(rows) {
  if (!rows.length) return '<div class="empty-state"><i class="fas fa-history"></i><p>Sin historial</p></div>';
  return '<table><thead><tr><th>Proveedor</th><th>Cambios</th><th>Estado</th><th>Resuelto por</th><th>Fecha</th></tr></thead><tbody>' +
    rows.map(function(cr) {
      var st = cr.status === 'approved' ? '<span class="badge badge-green">Aprobado</span>' : '<span class="badge badge-red">Rechazado</span>';
      return '<tr><td><strong>' + escapeHtml(cr.supplier_name || cr.supplier_id) + '</strong></td>' +
        '<td>' + _cpChangesHtml(cr) + (cr.decision_note ? '<div style="font-size:11px;color:var(--danger)">Motivo: ' + escapeHtml(cr.decision_note) + '</div>' : '') + '</td>' +
        '<td>' + st + '</td>' +
        '<td style="font-size:11px">' + escapeHtml(cr.reviewed_by || '') + '</td>' +
        '<td style="font-size:11px">' + fmtDate((cr.reviewed_at || '').slice(0,10)) + '</td></tr>';
    }).join('') + '</tbody></table>';
}
