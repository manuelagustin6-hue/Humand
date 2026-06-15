/* ===== AUDIT LOG ===== */

var AUDIT_COL_LABELS = {
  supplierInvoices:      'Factura Proveedor',
  paymentOrders:         'Orden de Pago',
  invoices:              'Factura Emitida',
  collections:           'Recibo de Cobranza',
  purchaseOrders:        'Orden de Compra',
  purchaseRequisitions:  'Pedido de Materiales',
  projects:              'Proyecto',
  suppliers:             'Proveedor',
  clients:               'Cliente',
  users:                 'Usuario',
  boqItems:              'Presupuesto (BOQ)',
  certificates:          'Certificación',
  contracts:             'Contrato',
  bankAccounts:          'Cuenta Bancaria',
  treasuryTx:            'Tesorería',
  journalEntries:        'Asiento Contable',
  cheques:               'Cheque',
  leads:                 'Lead Comercial',
  unidades:              'Unidad',
  ganttTasks:            'Tarea Gantt',
  minutas:               'Minuta',
  partes:                'Parte Diario',
  stock:                 'Stock',
};

var AUDIT_ACTION_CFG = {
  create: { label: 'Creó',     color: '#22c55e', icon: 'fa-plus-circle'  },
  update: { label: 'Modificó', color: '#3b82f6', icon: 'fa-pen'          },
  delete: { label: 'Eliminó',  color: '#ef4444', icon: 'fa-trash'        },
};

// Fields too large or irrelevant to store in audit entries
var _AUDIT_SKIP_FIELDS = ['attachments', 'lines', 'steps', 'items', 'cuotas'];

function _auditSanitize(data) {
  if (!data || typeof data !== 'object') return data;
  var out = {};
  Object.keys(data).forEach(function(k) {
    if (_AUDIT_SKIP_FIELDS.indexOf(k) === -1) out[k] = data[k];
  });
  return out;
}

function _auditRef(data) {
  if (!data) return null;
  return data.number || data.reference || data.name || data.description || null;
}

// ── Main hook — called by DB.insert / DB.update / DB.remove ────
function auditLog(action, collection, recordId, data) {
  try {
    var user = window.APP_STATE && window.APP_STATE.currentUser;
    var changes = null;
    if (action === 'delete') {
      changes = _auditSanitize(data);
    } else if (action === 'update') {
      changes = _auditSanitize(data);
    }
    // For create we only keep a slim summary to save space
    var ref = _auditRef(data);
    var entry = {
      id: uuid(),
      action: action,
      collection: collection,
      record_id: recordId,
      record_ref: ref,
      user_id:    user ? user.id    : null,
      user_name:  user ? (user.name || user.email) : 'Sistema',
      user_email: user ? user.email : null,
      changes:    changes,
      created_at: new Date().toISOString(),
    };
    DB.insert('auditLog', entry);
  } catch(e) {}
}

// ── State ───────────────────────────────────────────────────────
var _auditState = {
  filterCol:  '',
  filterUser: '',
  filterDate: '',
  page:       0,
  pageSize:   50,
};

// ── Render ──────────────────────────────────────────────────────
function renderAuditLog() {
  document.getElementById('content').innerHTML = _auditBuild();
}

function _auditBuild() {
  var allLogs = DB.getAll('auditLog').slice().reverse(); // newest first
  var users   = _auditUsers(allLogs);

  // Apply filters
  var logs = allLogs;
  if (_auditState.filterCol)  logs = logs.filter(function(l) { return l.collection === _auditState.filterCol; });
  if (_auditState.filterUser) logs = logs.filter(function(l) { return l.user_id === _auditState.filterUser || l.user_email === _auditState.filterUser; });
  if (_auditState.filterDate) logs = logs.filter(function(l) { return (l.created_at || '').startsWith(_auditState.filterDate); });

  var total      = logs.length;
  var page       = _auditState.page;
  var size       = _auditState.pageSize;
  var slice      = logs.slice(page * size, (page + 1) * size);
  var totalPages = Math.max(1, Math.ceil(total / size));

  // Build unique collection list from actual log entries (not the full label map)
  var seenCols = {};
  allLogs.forEach(function(l) { seenCols[l.collection] = true; });
  var colOptions = Object.keys(seenCols).sort().map(function(k) {
    var lbl = AUDIT_COL_LABELS[k] || k;
    return '<option value="' + k + '"' + (_auditState.filterCol === k ? ' selected' : '') + '>' + escapeHtml(lbl) + '</option>';
  }).join('');

  var userOptions = users.map(function(u) {
    var val = escapeHtml(u.id || u.email || '');
    return '<option value="' + val + '"' + (_auditState.filterUser === (u.id || u.email) ? ' selected' : '') + '>' + escapeHtml(u.name || u.email || '—') + '</option>';
  }).join('');

  var rows = slice.map(function(log) {
    var cfg      = AUDIT_ACTION_CFG[log.action] || { label: log.action, color: '#6b7280', icon: 'fa-circle' };
    var colLabel = AUDIT_COL_LABELS[log.collection] || log.collection;
    var dt       = log.created_at ? new Date(log.created_at).toLocaleString('es-AR') : '—';
    var ref      = log.record_ref ? '<small style="color:var(--text-muted);margin-left:4px">— ' + escapeHtml(String(log.record_ref)) + '</small>' : '';
    var detailBtn = log.changes
      ? '<button class="btn btn-sm btn-secondary" onclick="auditShowDetail(\'' + log.id + '\')" title="Ver detalle"><i class="fas fa-eye"></i></button>'
      : '<span style="color:var(--text-muted);font-size:11px">—</span>';
    return '<tr>' +
      '<td style="color:var(--text-muted);white-space:nowrap;font-size:12px">' + dt + '</td>' +
      '<td style="white-space:nowrap"><span style="background:' + cfg.color + '1a;color:' + cfg.color + ';padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600"><i class="fas ' + cfg.icon + '" style="margin-right:4px"></i>' + cfg.label + '</span></td>' +
      '<td>' + escapeHtml(colLabel) + ref + '</td>' +
      '<td style="color:var(--text-muted);font-size:13px">' + escapeHtml(log.user_name || '—') + '</td>' +
      '<td style="text-align:center">' + detailBtn + '</td>' +
    '</tr>';
  }).join('');

  var pagination = '';
  if (totalPages > 1) {
    pagination = '<div style="display:flex;align-items:center;gap:8px;margin-top:12px;justify-content:flex-end">' +
      (page > 0 ? '<button class="btn btn-sm btn-secondary" onclick="_auditPage(' + (page - 1) + ')"><i class="fas fa-chevron-left"></i> Anterior</button>' : '') +
      '<span style="font-size:13px;color:var(--text-muted)">Pág. ' + (page + 1) + ' de ' + totalPages + ' (' + total + ' eventos)</span>' +
      (page < totalPages - 1 ? '<button class="btn btn-sm btn-secondary" onclick="_auditPage(' + (page + 1) + ')">Siguiente <i class="fas fa-chevron-right"></i></button>' : '') +
    '</div>';
  }

  var tableOrEmpty = total === 0
    ? '<div style="text-align:center;padding:48px;color:var(--text-muted)"><i class="fas fa-history" style="font-size:36px;opacity:.25;display:block;margin-bottom:14px"></i>' +
      (allLogs.length === 0 ? 'Sin eventos registrados aún.<br><small>Los cambios realizados en el sistema quedarán registrados aquí.</small>' : 'Sin resultados para los filtros aplicados.') +
      '</div>'
    : '<div class="table-wrap"><table style="font-size:13px"><thead><tr>' +
        '<th style="width:160px">Fecha y hora</th><th style="width:110px">Acción</th><th>Módulo / Registro</th><th style="width:160px">Usuario</th><th style="width:48px"></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' + pagination;

  return '<div style="padding-bottom:24px">' +
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">' +
      '<h2 style="margin:0;font-size:18px;font-weight:700"><i class="fas fa-history" style="color:var(--primary);margin-right:8px"></i>Registro de Auditoría</h2>' +
      '<span style="margin-left:auto;font-size:12px;color:var(--text-muted)">' + allLogs.length + ' evento' + (allLogs.length !== 1 ? 's' : '') + ' en total</span>' +
      '<button class="btn btn-sm btn-secondary" onclick="_auditExport()"><i class="fas fa-download"></i> Exportar</button>' +
      '<button class="btn btn-sm" style="color:var(--danger)" onclick="_auditClear()"><i class="fas fa-trash"></i> Limpiar</button>' +
    '</div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">' +
      '<select class="form-control" style="flex:1;min-width:180px;max-width:260px" onchange="_auditFilter(\'col\',this.value)">' +
        '<option value="">— Todos los módulos —</option>' + colOptions +
      '</select>' +
      '<select class="form-control" style="flex:1;min-width:160px;max-width:220px" onchange="_auditFilter(\'user\',this.value)">' +
        '<option value="">— Todos los usuarios —</option>' + userOptions +
      '</select>' +
      '<input type="date" class="form-control" style="width:160px" value="' + escapeHtml(_auditState.filterDate || '') + '" onchange="_auditFilter(\'date\',this.value)" title="Filtrar por fecha">' +
      ((_auditState.filterCol || _auditState.filterUser || _auditState.filterDate)
        ? '<button class="btn btn-sm btn-secondary" onclick="_auditClearFilters()"><i class="fas fa-times"></i> Limpiar filtros</button>'
        : '') +
    '</div>' +
    tableOrEmpty +
  '</div>';
}

function _auditUsers(logs) {
  var seen = {};
  var result = [];
  logs.forEach(function(l) {
    var key = l.user_id || l.user_email;
    if (key && !seen[key]) {
      seen[key] = true;
      result.push({ id: l.user_id, email: l.user_email, name: l.user_name });
    }
  });
  return result.sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); });
}

function _auditFilter(type, val) {
  if (type === 'col')  _auditState.filterCol  = val;
  if (type === 'user') _auditState.filterUser = val;
  if (type === 'date') _auditState.filterDate = val;
  _auditState.page = 0;
  renderAuditLog();
}

function _auditClearFilters() {
  _auditState.filterCol  = '';
  _auditState.filterUser = '';
  _auditState.filterDate = '';
  _auditState.page = 0;
  renderAuditLog();
}

function _auditPage(p) {
  _auditState.page = p;
  renderAuditLog();
}

// ── Detail modal ────────────────────────────────────────────────
function auditShowDetail(logId) {
  var log = DB.getById('auditLog', logId);
  if (!log || !log.changes) return;
  var cfg      = AUDIT_ACTION_CFG[log.action] || { label: log.action, color: '#6b7280', icon: 'fa-circle' };
  var colLabel = AUDIT_COL_LABELS[log.collection] || log.collection;
  var dt       = log.created_at ? new Date(log.created_at).toLocaleString('es-AR') : '—';

  var body = '<div style="font-size:12px;color:var(--text-muted);margin-bottom:14px;display:flex;gap:16px;flex-wrap:wrap">' +
    '<span><i class="fas fa-user" style="margin-right:4px"></i>' + escapeHtml(log.user_name || '—') + '</span>' +
    '<span><i class="fas fa-clock" style="margin-right:4px"></i>' + dt + '</span>' +
    '<span><i class="fas fa-database" style="margin-right:4px"></i>' + escapeHtml(colLabel) + '</span>' +
  '</div>';

  if (log.action === 'update') {
    var skip = ['updated_at', 'id'];
    var keys = Object.keys(log.changes).filter(function(k) { return skip.indexOf(k) === -1; });
    if (keys.length) {
      body += '<div class="table-wrap"><table style="font-size:12px"><thead><tr><th>Campo</th><th>Nuevo valor</th></tr></thead><tbody>' +
        keys.map(function(k) {
          var v = log.changes[k];
          var vStr;
          if (v === null || v === undefined) {
            vStr = '<em style="color:var(--text-muted)">vacío</em>';
          } else if (typeof v === 'object') {
            vStr = '<code style="font-size:11px">' + escapeHtml(JSON.stringify(v)) + '</code>';
          } else {
            vStr = escapeHtml(String(v));
          }
          return '<tr><td style="color:var(--text-muted);white-space:nowrap;padding-right:16px">' + escapeHtml(k) + '</td><td>' + vStr + '</td></tr>';
        }).join('') +
      '</tbody></table></div>';
    } else {
      body += '<p style="color:var(--text-muted);font-size:13px">Sin campos con cambios registrados.</p>';
    }
  } else {
    body += '<pre style="background:var(--bg-secondary,#f8fafc);border:1px solid var(--border);padding:12px;border-radius:6px;font-size:11px;overflow:auto;max-height:360px;margin:0">' +
      escapeHtml(JSON.stringify(log.changes, null, 2)) + '</pre>';
  }

  openModal(
    '<i class="fas ' + cfg.icon + '" style="margin-right:8px;color:' + cfg.color + '"></i>' +
    cfg.label + ' — ' + escapeHtml(colLabel) + (log.record_ref ? ' <small style="font-weight:400;color:var(--text-muted)">(' + escapeHtml(String(log.record_ref)) + ')</small>' : ''),
    body,
    '',
    '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>'
  );
}

// ── Export ──────────────────────────────────────────────────────
function _auditExport() {
  var logs = DB.getAll('auditLog').slice().reverse();
  var csv  = 'Fecha,Accion,Modulo,Referencia,Usuario,Email\n';
  logs.forEach(function(l) {
    var dt  = l.created_at ? new Date(l.created_at).toLocaleString('es-AR') : '';
    var col = AUDIT_COL_LABELS[l.collection] || l.collection;
    var q   = function(s) { return '"' + String(s || '').replace(/"/g, '""') + '"'; };
    csv += [q(dt), q(l.action), q(col), q(l.record_ref || ''), q(l.user_name || ''), q(l.user_email || '')].join(',') + '\n';
  });
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  a.download = 'auditoria_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Clear ────────────────────────────────────────────────────────
function _auditClear() {
  if (!confirm('¿Borrar todo el registro de auditoría? Esta acción no se puede deshacer.')) return;
  var db = DB.get();
  db.auditLog = [];
  try { localStorage.setItem(DB.KEY, JSON.stringify(db)); } catch(e) {}
  if (_SUPA.online) _SUPA.pushCollection(DB._companyId, 'auditLog', []).catch(function() {});
  toast('Registro de auditoría limpiado', 'success');
  renderAuditLog();
}
