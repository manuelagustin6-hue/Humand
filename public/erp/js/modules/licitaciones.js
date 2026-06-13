/* ===== LICITACIONES ===== */

var _licState = { view: 'list', licId: null, tab: 'resumen', _odpId: null };
var LIC_STATUS = {
  draft:     { label: 'Borrador',    color: '#94a3b8', bg: '#f1f5f9' },
  active:    { label: 'Activa',      color: '#2563eb', bg: '#eff6ff' },
  closed:    { label: 'Cerrada',     color: '#f59e0b', bg: '#fffbeb' },
  awarded:   { label: 'Adjudicada',  color: '#22c55e', bg: '#f0fdf4' },
  cancelled: { label: 'Cancelada',   color: '#ef4444', bg: '#fef2f2' }
};
var INV_STATUS = {
  invited:     { label: 'Invitado',    color: '#2563eb' },
  in_progress: { label: 'En proceso',  color: '#f59e0b' },
  quoted:      { label: 'Cotizado',    color: '#22c55e' },
  rejected:    { label: 'Rechazado',   color: '#ef4444' }
};

/* ─── DISPATCHER ─── */
function renderLicitaciones() {
  if (_licState.view === 'list') {
    _licListView();
  } else if (_licState.view === 'detail') {
    _licDetailView(_licState.licId);
  } else if (_licState.view === 'form') {
    _licFormView(_licState.licId);
  } else {
    _licListView();
  }
}

/* ─── STATUS BADGE HELPER ─── */
function _licBadge(status) {
  var cfg = LIC_STATUS[status] || { label: status, color: '#94a3b8', bg: '#f1f5f9' };
  return '<span style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;color:' +
    cfg.color + ';background:' + cfg.bg + ';border:1px solid ' + cfg.color + '33">' + cfg.label + '</span>';
}

function _invBadge(status) {
  var cfg = INV_STATUS[status] || { label: status, color: '#94a3b8' };
  return '<span style="display:inline-flex;align-items:center;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;color:' +
    cfg.color + ';background:' + cfg.color + '1a;border:1px solid ' + cfg.color + '33">' + cfg.label + '</span>';
}

/* ─── LIST VIEW ─── */
function _licListView() {
  var lics = DB.getAll('licitaciones');
  var projects = DB.getAll('projects');

  var total   = lics.length;
  var active  = lics.filter(function(l) { return l.status === 'active'; }).length;
  var awarded = lics.filter(function(l) { return l.status === 'awarded'; }).length;
  var draft   = lics.filter(function(l) { return l.status === 'draft'; }).length;

  var today = todayStr();

  var allInvs = DB.getAll('lic_invitaciones');
  var allCots = DB.getAll('lic_cotizaciones');

  var rows = lics.length === 0
    ? '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-gavel"></i><p>No hay licitaciones registradas. Creá la primera.</p></div></td></tr>'
    : lics.slice().sort(function(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); }).map(function(l) {
        var proj = projects.find(function(p) { return p.id === l.project_id; });
        var invs = allInvs.filter(function(i) { return i.lic_id === l.id; });
        var cots = allCots.filter(function(c) { return c.lic_id === l.id; });
        var overdue = l.deadline && l.deadline < today && l.status === 'active';
        var deadlineHtml = l.deadline
          ? '<span style="' + (overdue ? 'color:#ef4444;font-weight:600' : '') + '">' + fmtDate(l.deadline) + (overdue ? ' ⚠' : '') + '</span>'
          : '—';
        return '<tr>' +
          '<td><strong>' + escapeHtml(l.title || '—') + '</strong></td>' +
          '<td style="font-size:12px;color:var(--text-muted)">' + (proj ? escapeHtml(proj.name) : '—') + '</td>' +
          '<td>' + deadlineHtml + '</td>' +
          '<td style="text-align:center">' +
            '<span style="font-size:12px;font-weight:600;color:#3b82f6">' + invs.length + '</span>' +
            '<span style="color:var(--text-light);font-size:11px"> / </span>' +
            '<span style="font-size:12px;font-weight:600;color:#22c55e">' + cots.length + '</span>' +
          '</td>' +
          '<td>' + _licBadge(l.status) + '</td>' +
          '<td>' +
            '<div class="table-actions" style="flex-wrap:wrap">' +
              '<button class="btn btn-sm btn-primary" onclick="licOpenDetail(\'' + l.id + '\')"><i class="fas fa-eye"></i> Ver</button>' +
              '<button class="btn btn-sm btn-secondary" onclick="_licState.licId=\'' + l.id + '\';_licState.view=\'form\';renderLicitaciones()"><i class="fas fa-edit"></i></button>' +
              '<button class="btn-ghost btn btn-sm danger" onclick="licDelete(\'' + l.id + '\')"><i class="fas fa-trash"></i></button>' +
            '</div>' +
          '</td>' +
        '</tr>';
      }).join('');

  document.getElementById('content').innerHTML =
    '<div class="page-header">' +
      '<div>' +
        '<div class="page-title">Licitaciones</div>' +
        '<div class="page-subtitle">Gestión de licitaciones, proveedores invitados y comparativa de cotizaciones</div>' +
      '</div>' +
      '<div class="page-actions" style="flex-wrap:wrap">' +
        '<button class="btn btn-primary" onclick="licNueva(null)"><i class="fas fa-plus"></i> Nueva Licitación</button>' +
      '</div>' +
    '</div>' +

    '<div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">' +
      '<div class="stat-card"><div class="stat-icon blue"><i class="fas fa-gavel"></i></div><div>' +
        '<div class="stat-value">' + total + '</div><div class="stat-label">Total</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon blue"><i class="fas fa-broadcast-tower"></i></div><div>' +
        '<div class="stat-value">' + active + '</div><div class="stat-label">Activas</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon green"><i class="fas fa-trophy"></i></div><div>' +
        '<div class="stat-value">' + awarded + '</div><div class="stat-label">Adjudicadas</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-pencil-alt"></i></div><div>' +
        '<div class="stat-value">' + draft + '</div><div class="stat-label">Borradores</div></div></div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="card-body" style="padding:0">' +
        '<div class="table-wrap">' +
          '<table>' +
            '<thead><tr>' +
              '<th>Título</th><th>Proyecto</th><th>Vencimiento</th>' +
              '<th style="text-align:center">Invitados / Cotizados</th>' +
              '<th>Estado</th><th>Acciones</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>';

  if (document.getElementById('breadcrumb')) {
    document.getElementById('breadcrumb').innerHTML = '<i class="fas fa-gavel"></i><span>Licitaciones</span>';
  }
}

/* ─── OPEN DETAIL ─── */
function licOpenDetail(id) {
  _licState.view = 'detail';
  _licState.licId = id;
  _licState.tab = 'resumen';
  var contentEl = document.getElementById('content');
  if (contentEl) contentEl.scrollTop = 0;
  _licDetailView(id);
}

/* ─── DETAIL VIEW ─── */
function _licDetailView(id) {
  var lic = DB.getById('licitaciones', id);
  if (!lic) { licBackToList(); return; }

  var invs = DB.getAll('lic_invitaciones').filter(function(i) { return i.lic_id === id; });
  var cots = DB.getAll('lic_cotizaciones').filter(function(c) { return c.lic_id === id; });

  var actionBtns = '';
  if (lic.status === 'draft') {
    actionBtns += '<button class="btn btn-primary" onclick="licActivar(\'' + id + '\')"><i class="fas fa-broadcast-tower"></i> Activar</button>';
  }
  if (lic.status === 'active') {
    actionBtns += '<button class="btn btn-secondary" onclick="licCerrar(\'' + id + '\')"><i class="fas fa-times-circle"></i> Cerrar</button>';
  }
  if (lic.status === 'awarded') {
    actionBtns += '<button class="btn btn-primary" onclick="licGenerarOC(\'' + id + '\')"><i class="fas fa-file-alt"></i> Generar OC</button>';
  }
  actionBtns += '<button class="btn btn-secondary" onclick="_licState.licId=\'' + id + '\';_licState.view=\'form\';renderLicitaciones()"><i class="fas fa-edit"></i> Editar</button>';

  var tabs = [
    { key: 'resumen',       label: 'Resumen',       badge: '' },
    { key: 'invitaciones',  label: 'Invitaciones',  badge: invs.length ? '<span style="margin-left:5px;background:#2563eb;color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:20px">' + invs.length + '</span>' : '' },
    { key: 'cotizaciones',  label: 'Cotizaciones',  badge: cots.length ? '<span style="margin-left:5px;background:#22c55e;color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:20px">' + cots.length + '</span>' : '' },
    { key: 'comparativa',   label: 'Comparativa',   badge: '' },
    { key: 'aprobacion',    label: 'Aprobación',    badge: '' }
  ];

  var tabsHtml = tabs.map(function(t) {
    var active = _licState.tab === t.key ? ' active' : '';
    return '<button class="tab-btn' + active + '" id="lic-tab-btn-' + t.key + '" onclick="licSetTab(\'' + t.key + '\',\'' + id + '\')">' + t.label + t.badge + '</button>';
  }).join('');

  document.getElementById('content').innerHTML =
    '<div class="page-header" style="flex-wrap:wrap">' +
      '<div>' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
          '<button class="btn btn-secondary btn-sm" onclick="licBackToList()" style="padding:4px 12px;font-size:12px">' +
            '<i class="fas fa-arrow-left"></i> Licitaciones' +
          '</button>' +
          _licBadge(lic.status) +
        '</div>' +
        '<div class="page-title">' + escapeHtml(lic.title || 'Sin título') + '</div>' +
        (lic.description ? '<div class="page-subtitle">' + escapeHtml(lic.description) + '</div>' : '') +
      '</div>' +
      '<div class="page-actions" style="flex-wrap:wrap">' + actionBtns + '</div>' +
    '</div>' +

    '<div class="tabs-container">' +
      '<div class="tabs-header tabs" style="flex-wrap:wrap">' + tabsHtml + '</div>' +
      '<div id="lic-tab-content" class="tab-content active">' +
        _licTabContent(_licState.tab, lic) +
      '</div>' +
    '</div>';

  if (document.getElementById('breadcrumb')) {
    document.getElementById('breadcrumb').innerHTML =
      '<i class="fas fa-gavel"></i>' +
      '<span onclick="licBackToList()" style="cursor:pointer;color:var(--primary)">Licitaciones</span>' +
      '<i class="fas fa-chevron-right" style="font-size:10px;margin:0 4px;color:var(--text-light)"></i>' +
      '<span>' + escapeHtml(lic.title || 'Detalle') + '</span>';
  }
}

/* ─── SET TAB ─── */
function licSetTab(tab, id) {
  _licState.tab = tab;
  var lic = DB.getById('licitaciones', id || _licState.licId);
  if (!lic) return;

  document.querySelectorAll('[id^="lic-tab-btn-"]').forEach(function(btn) {
    btn.classList.remove('active');
  });
  var activeBtn = document.getElementById('lic-tab-btn-' + tab);
  if (activeBtn) activeBtn.classList.add('active');

  var contentEl = document.getElementById('lic-tab-content');
  if (contentEl) contentEl.innerHTML = _licTabContent(tab, lic);
}

/* ─── TAB CONTENT DISPATCHER ─── */
function _licTabContent(tab, lic) {
  if (tab === 'resumen')      return _licTabResumen(lic);
  if (tab === 'invitaciones') return _licTabInvitaciones(lic);
  if (tab === 'cotizaciones') return _licTabCotizaciones(lic);
  if (tab === 'comparativa')  return _licTabComparativa(lic);
  if (tab === 'aprobacion')   return _licTabAprobacion(lic);
  return _licTabResumen(lic);
}

/* ─── TAB: RESUMEN ─── */
function _licTabResumen(lic) {
  var proj = lic.project_id ? DB.getById('projects', lic.project_id) : null;
  var odp  = lic.odp_id     ? DB.getById('purchaseRequests', lic.odp_id) : null;
  var cfg  = LIC_STATUS[lic.status] || { label: lic.status, color: '#94a3b8', bg: '#f1f5f9' };

  var infoCard =
    '<div class="card" style="margin-bottom:16px">' +
      '<div class="card-body">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px">' +
          '<div>' +
            '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Proyecto</div>' +
            '<div style="font-size:14px;font-weight:500">' + (proj ? escapeHtml(proj.name) : '—') + '</div>' +
          '</div>' +
          '<div>' +
            '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">ODP de Origen</div>' +
            '<div style="font-size:14px;font-weight:500">' + (odp ? escapeHtml(odp.number || odp.id) : '—') + '</div>' +
          '</div>' +
          '<div>' +
            '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Fecha Límite</div>' +
            '<div style="font-size:14px;font-weight:500">' + (lic.deadline ? fmtDate(lic.deadline) : '—') + '</div>' +
          '</div>' +
          '<div>' +
            '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Estado</div>' +
            '<div>' + _licBadge(lic.status) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  var items = lic.items || [];
  var itemsTable = items.length === 0
    ? '<div class="empty-state" style="padding:32px 16px"><i class="fas fa-list"></i><p>Sin ítems cargados</p></div>'
    : '<div class="table-wrap"><table>' +
        '<thead><tr>' +
          '<th>Descripción</th><th>Cantidad</th><th>Unidad</th><th>Especificaciones</th>' +
        '</tr></thead>' +
        '<tbody>' +
        items.map(function(it) {
          return '<tr>' +
            '<td><strong>' + escapeHtml(it.description || '—') + '</strong></td>' +
            '<td style="text-align:center">' + (it.quantity || '—') + '</td>' +
            '<td>' + escapeHtml(it.unit || '—') + '</td>' +
            '<td style="font-size:12px;color:var(--text-muted)">' + escapeHtml(it.specs || '—') + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div>';

  return infoCard +
    '<div class="card">' +
      '<div class="card-body" style="padding:0">' +
        '<div style="padding:14px 16px;border-bottom:1px solid var(--border)">' +
          '<strong style="font-size:13px">Ítems de la Licitación</strong>' +
        '</div>' +
        itemsTable +
      '</div>' +
    '</div>';
}

/* ─── TAB: INVITACIONES ─── */
function _licTabInvitaciones(lic) {
  var invs = DB.getAll('lic_invitaciones').filter(function(i) { return i.lic_id === lic.id; });
  var suppliers = DB.getAll('suppliers');

  var baseUrl = window.location.origin +
    window.location.pathname.replace(/\/[^/]*$/, '/') + 'licitacion.html';

  var canAdd = (lic.status === 'active' || lic.status === 'draft');
  var isDraft = lic.status === 'draft';

  var addBtn = canAdd
    ? '<button class="btn btn-primary" onclick="licAgregarProveedor(\'' + lic.id + '\')"><i class="fas fa-plus"></i> Agregar Proveedor</button>'
    : '';

  var rows = invs.length === 0
    ? '<tr><td colspan="5"><div class="empty-state" style="padding:32px 16px"><i class="fas fa-user-plus"></i><p>No hay proveedores invitados aún.</p></div></td></tr>'
    : invs.map(function(inv) {
        var sup = suppliers.find(function(s) { return s.id === inv.supplier_id; });
        var link = baseUrl + '?token=' + encodeURIComponent(inv.token) + '&lic=' + encodeURIComponent(lic.id);
        var encodedLink = encodeURIComponent(link);
        var encodedEmail = encodeURIComponent(inv.email || '');
        var encodedTitle = encodeURIComponent(lic.title || '');
        var encodedDeadline = encodeURIComponent(lic.deadline ? fmtDate(lic.deadline) : '');

        return '<tr>' +
          '<td>' +
            '<div style="font-weight:600;font-size:13px">' + escapeHtml(inv.supplier_name || (sup ? sup.name : '—')) + '</div>' +
            '<div style="font-size:11px;color:var(--text-muted)">' + escapeHtml(inv.email || '') + '</div>' +
          '</td>' +
          '<td>' + _invBadge(inv.status || 'invited') + '</td>' +
          '<td style="font-size:12px;color:var(--text-muted)">' + fmtDate(inv.invited_date) + '</td>' +
          '<td>' +
            '<div class="table-actions" style="flex-wrap:wrap">' +
              '<button class="btn btn-sm btn-secondary" title="Copiar enlace" onclick="licCopiarLink(\'' + encodedLink + '\',' + isDraft + ')"><i class="fas fa-link"></i> Copiar link</button>' +
              '<button class="btn btn-sm btn-secondary" title="Enviar por email" onclick="licEnviarEmail(\'' + encodedEmail + '\',\'' + encodedTitle + '\',\'' + encodedLink + '\',\'' + encodedDeadline + '\')"><i class="fas fa-envelope"></i></button>' +
              (canAdd ? '<button class="btn-ghost btn btn-sm danger" title="Eliminar invitación" onclick="licEliminarInv(\'' + inv.id + '\')"><i class="fas fa-trash"></i></button>' : '') +
            '</div>' +
          '</td>' +
        '</tr>';
      }).join('');

  var draftWarning = isDraft
    ? '<div style="padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:var(--radius);margin-bottom:12px;font-size:13px;color:#92400e;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">' +
        '<span><i class="fas fa-exclamation-triangle" style="margin-right:6px"></i>' +
        '<strong>Licitación en borrador.</strong> Los links compartidos con proveedores no funcionarán hasta que la actives.</span>' +
        '<button class="btn btn-primary" style="font-size:12px;padding:6px 14px" onclick="licActivar(\'' + lic.id + '\')"><i class="fas fa-broadcast-tower"></i> Activar ahora</button>' +
      '</div>'
    : '';

  var infoCard =
    '<div style="padding:12px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:var(--radius);margin-bottom:16px;font-size:12px;color:#1e40af">' +
      '<i class="fas fa-info-circle" style="margin-right:6px"></i>' +
      '<strong>¿Cómo funciona?</strong> Cada proveedor invitado recibe un enlace único con un token de acceso. ' +
      'Al ingresar al portal, pueden cargar su cotización directamente.' +
    '</div>';

  return draftWarning +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
      '<strong style="font-size:14px">Proveedores Invitados (' + invs.length + ')</strong>' +
      addBtn +
    '</div>' +
    infoCard +
    '<div class="card">' +
      '<div class="card-body" style="padding:0">' +
        '<div class="table-wrap">' +
          '<table>' +
            '<thead><tr>' +
              '<th>Proveedor</th><th>Estado</th><th>Invitado</th><th>Acciones</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>';
}

/* ─── TAB: COTIZACIONES ─── */
function _licTabCotizaciones(lic) {
  var cots = DB.getAll('lic_cotizaciones').filter(function(c) { return c.lic_id === lic.id; });
  var invs = DB.getAll('lic_invitaciones').filter(function(i) { return i.lic_id === lic.id; });

  if (cots.length === 0) {
    return '<div class="empty-state" style="padding:48px 16px">' +
      '<i class="fas fa-file-invoice-dollar"></i>' +
      '<p>No se han recibido cotizaciones aún.</p>' +
      '<p style="font-size:12px;color:var(--text-muted)">Los proveedores invitados podrán cargar sus ofertas a través del portal.</p>' +
    '</div>';
  }

  return cots.map(function(cot) {
    var inv = invs.find(function(i) { return i.id === cot.inv_id; }) ||
              (cot.supplier_id ? invs.find(function(i) { return i.supplier_id === cot.supplier_id; }) : null);
    var supplierName = cot.supplier_name || (inv ? inv.supplier_name : '—');
    var items = cot.items || [];
    var total = items.reduce(function(s, it) { return s + (it.total || (it.unit_price || 0) * ((it.quantity || 1))); }, 0);

    var itemsRows = items.map(function(it) {
      var itTotal = it.total || (it.unit_price || 0) * (it.quantity || 1);
      return '<tr>' +
        '<td>' + escapeHtml(it.description || '—') + '</td>' +
        '<td class="number-cell">' + fmtMoney(it.unit_price || 0) + '</td>' +
        '<td class="number-cell">' + fmtMoney(itTotal) + '</td>' +
        '<td style="text-align:center">' + (it.delivery_days ? it.delivery_days + ' días' : '—') + '</td>' +
        '<td style="font-size:12px;color:var(--text-muted)">' + escapeHtml(cot.payment_terms || '—') + '</td>' +
      '</tr>';
    }).join('');

    return '<div class="card" style="margin-bottom:16px">' +
      '<div class="card-body">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px">' +
          '<div>' +
            '<div style="font-size:15px;font-weight:700">' + escapeHtml(supplierName) + '</div>' +
            '<div style="font-size:12px;color:var(--text-muted)">Enviado: ' + fmtDate(cot.submitted_date || cot.submittedAt || cot.created_at) + '</div>' +
          '</div>' +
          '<div style="font-size:18px;font-weight:800;color:var(--primary)">' + fmtMoney(total) + '</div>' +
        '</div>' +
        '<div class="table-wrap">' +
          '<table>' +
            '<thead><tr>' +
              '<th>Descripción</th><th>Precio Unitario</th><th>Total</th><th>Plazo Entrega</th><th>Condición Pago</th>' +
            '</tr></thead>' +
            '<tbody>' + itemsRows + '</tbody>' +
          '</table>' +
        '</div>' +
        (cot.general_notes ? '<div style="margin-top:10px;padding:10px 12px;background:var(--bg);border-radius:var(--radius-sm);font-size:12px;color:var(--text-muted)">' +
          '<i class="fas fa-comment" style="margin-right:6px"></i>' + escapeHtml(cot.general_notes) +
        '</div>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}

/* ─── TAB: COMPARATIVA ─── */
function _licTabComparativa(lic) {
  var cots = DB.getAll('lic_cotizaciones').filter(function(c) { return c.lic_id === lic.id; });

  if (cots.length === 0) {
    return '<div class="empty-state" style="padding:48px 16px">' +
      '<i class="fas fa-balance-scale"></i>' +
      '<p>No hay cotizaciones para comparar.</p>' +
      '<p style="font-size:12px;color:var(--text-muted)">Recibirás cotizaciones de los proveedores invitados a través del portal.</p>' +
    '</div>';
  }

  var items = lic.items || [];
  var cotTotals = cots.map(function() { return 0; });

  var bodyRows = items.map(function(item) {
    var prices = cots.map(function(cot) {
      var ci = (cot.items || []).find(function(ci) { return ci.description === item.description; });
      return ci ? (ci.unit_price || 0) : null;
    });

    var validPrices = prices.filter(function(p) { return p !== null && p > 0; });
    var minPrice = validPrices.length > 0 ? Math.min.apply(null, validPrices) : null;

    var cells = prices.map(function(price, ci) {
      if (price === null) return '<td style="text-align:center;color:var(--text-light);font-size:12px">—</td>';
      var isBest = minPrice !== null && price === minPrice && validPrices.length > 1;
      var cotItem = (cots[ci].items || []).find(function(it) { return it.description === item.description; });
      var delivery = cotItem ? cotItem.delivery_days : null;
      cotTotals[ci] += price * (item.quantity || 1);
      return '<td style="text-align:center;' + (isBest ? 'background:#f0fdf4;' : '') + '">' +
        '<div style="font-weight:700;font-size:13px;color:' + (isBest ? '#16a34a' : 'var(--text)') + '">' + fmtMoney(price) + '</div>' +
        (isBest ? '<div style="font-size:10px;color:#16a34a;font-weight:600">↓ Mejor precio</div>' : '') +
        (delivery ? '<div style="font-size:10px;color:var(--text-muted)">' + delivery + ' días</div>' : '') +
      '</td>';
    });

    return '<tr>' +
      '<td style="font-weight:500">' + escapeHtml(item.description || '—') + '</td>' +
      cells.join('') +
    '</tr>';
  });

  var minTotal = cotTotals.length > 0 ? Math.min.apply(null, cotTotals) : null;
  var totalRow = '<tr style="border-top:2px solid var(--border);background:var(--bg)">' +
    '<td style="font-weight:700;font-size:13px">TOTAL</td>' +
    cotTotals.map(function(t, ci) {
      var isBest = minTotal !== null && t === minTotal && cotTotals.length > 1;
      return '<td style="text-align:center;font-weight:800;font-size:14px;color:' + (isBest ? '#16a34a' : 'var(--primary)') + ';' + (isBest ? 'background:#f0fdf4;' : '') + '">' +
        fmtMoney(t) + '</td>';
    }).join('') +
  '</tr>';

  var headerCells = cots.map(function(cot) {
    return '<th style="text-align:center;min-width:160px">' +
      '<div style="font-weight:700">' + escapeHtml(cot.supplier_name || '—') + '</div>' +
    '</th>';
  }).join('');

  var adjudicarButtons = cots.map(function(cot, ci) {
    var isWinner = lic.winner_cot_id === cot.id;
    return '<div style="text-align:center;padding:0 8px">' +
      '<button class="btn btn-sm ' + (isWinner ? 'btn-success' : 'btn-secondary') + '" ' +
        'onclick="licAdjudicar(\'' + lic.id + '\',\'' + cot.id + '\')" ' +
        'style="width:100%">' +
        (isWinner ? '<i class="fas fa-trophy"></i> Ganador seleccionado' : 'Seleccionar ganador') +
      '</button>' +
    '</div>';
  }).join('');

  var canAward = (lic.status === 'active' || lic.status === 'closed');

  return '<div style="overflow-x:auto">' +
    '<table style="width:100%;border-collapse:collapse">' +
      '<thead>' +
        '<tr style="background:var(--bg)">' +
          '<th style="min-width:200px">Ítem</th>' + headerCells +
        '</tr>' +
      '</thead>' +
      '<tbody>' + bodyRows.join('') + totalRow + '</tbody>' +
    '</table>' +
  '</div>' +
  (canAward ?
    '<div style="margin-top:16px">' +
      '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;font-weight:600">Adjudicar licitación:</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">' + adjudicarButtons + '</div>' +
    '</div>'
  : '');
}

/* ─── TAB: APROBACIÓN ─── */
function _licTabAprobacion(lic) {
  if (!lic.winner_cot_id) {
    return '<div class="empty-state" style="padding:48px 16px">' +
      '<i class="fas fa-user-check"></i>' +
      '<p>Primero seleccioná un ganador en la pestaña Comparativa.</p>' +
    '</div>';
  }

  var winnerCot = DB.getById('lic_cotizaciones', lic.winner_cot_id);
  if (!winnerCot) {
    return '<div class="empty-state" style="padding:48px 16px">' +
      '<i class="fas fa-exclamation-triangle"></i>' +
      '<p>La cotización ganadora guardada ya no es válida.</p>' +
      '<p style="font-size:12px;color:var(--text-muted)">Volvé a la pestaña Comparativa y seleccioná nuevamente el ganador.</p>' +
      '<button class="btn btn-primary" style="margin-top:12px" onclick="licSetTab(\'comparativa\',\'' + lic.id + '\')">' +
        '<i class="fas fa-balance-scale"></i> Ir a Comparativa' +
      '</button>' +
    '</div>';
  }

  var winnerTotal = (winnerCot.items || []).reduce(function(s, it) {
    return s + (it.total || (it.unit_price || 0) * (it.quantity || 1));
  }, 0);

  var approvals = lic.approvals || [];

  var steps = [
    { key: 'jefe_compras',  label: 'Jefe de Compras', role: 'Jefe de Compras' },
    { key: 'gerencia',      label: 'Gerencia',         role: 'Gerente General' },
    { key: 'direccion',     label: 'Dirección',        role: 'Director' }
  ];

  var allApproved = steps.every(function(s) {
    var a = approvals.find(function(a) { return a.key === s.key; });
    return a && a.approved === true;
  });

  var anyRejected = steps.some(function(s) {
    var a = approvals.find(function(a) { return a.key === s.key; });
    return a && a.approved === false;
  });

  function stepDone(key) {
    return approvals.find(function(a) { return a.key === key; });
  }

  function prevApproved(idx) {
    if (idx === 0) return true;
    var prev = approvals.find(function(a) { return a.key === steps[idx - 1].key; });
    return prev && prev.approved === true;
  }

  var stepsHtml = steps.map(function(step, idx) {
    var done = stepDone(step.key);
    var canAct = !done && prevApproved(idx) && lic.status !== 'awarded' && lic.status !== 'cancelled';
    var iconColor = done ? (done.approved ? '#22c55e' : '#ef4444') : '#94a3b8';
    var iconClass = done ? (done.approved ? 'fa-check-circle' : 'fa-times-circle') : 'fa-clock';
    var border = done ? (done.approved ? '#22c55e' : '#ef4444') : '#e2e8f0';

    return '<div style="display:flex;align-items:flex-start;gap:14px;padding:16px;border:1px solid ' + border + ';border-radius:var(--radius);margin-bottom:10px;background:' + (done && done.approved ? '#f0fdf4' : done && !done.approved ? '#fef2f2' : '#fff') + '">' +
      '<div style="font-size:24px;color:' + iconColor + ';flex-shrink:0;margin-top:2px"><i class="fas ' + iconClass + '"></i></div>' +
      '<div style="flex:1">' +
        '<div style="font-weight:700;font-size:14px">' + escapeHtml(step.label) + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted)">' + escapeHtml(step.role) + '</div>' +
        (done ? '<div style="font-size:12px;margin-top:4px;color:' + (done.approved ? '#16a34a' : '#dc2626') + '">' +
          (done.approved ? 'Aprobado' : 'Rechazado') +
          (done.approver ? ' por <strong>' + escapeHtml(done.approver) + '</strong>' : '') +
          (done.date ? ' — ' + fmtDate(done.date) : '') +
        '</div>' : '') +
      '</div>' +
      (canAct ?
        '<div style="display:flex;gap:8px;flex-shrink:0">' +
          '<button class="btn btn-sm btn-secondary" onclick="licAprobarStep(\'' + lic.id + '\',\'' + step.key + '\',false)" style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5">' +
            '<i class="fas fa-times"></i> Rechazar' +
          '</button>' +
          '<button class="btn btn-sm btn-primary" onclick="licAprobarStep(\'' + lic.id + '\',\'' + step.key + '\',true)">' +
            '<i class="fas fa-check"></i> Aprobar' +
          '</button>' +
        '</div>'
      : '') +
    '</div>';
  }).join('');

  var winnerCard =
    '<div style="padding:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:var(--radius);margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
      '<div>' +
        '<div style="font-size:11px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Proveedor Seleccionado</div>' +
        '<div style="font-size:16px;font-weight:800;color:#1e40af">' + escapeHtml(winnerCot.supplier_name || '—') + '</div>' +
      '</div>' +
      '<div style="text-align:right">' +
        '<div style="font-size:11px;color:#1e40af;font-weight:600">Monto total ofertado</div>' +
        '<div style="font-size:20px;font-weight:800;color:#1e40af">' + fmtMoney(winnerTotal) + '</div>' +
      '</div>' +
    '</div>';

  var awardedCard = '';
  if (lic.status === 'awarded') {
    awardedCard =
      '<div style="padding:16px;background:#f0fdf4;border:1px solid #86efac;border-radius:var(--radius);margin-top:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<i class="fas fa-trophy" style="font-size:24px;color:#16a34a"></i>' +
          '<div>' +
            '<div style="font-size:14px;font-weight:700;color:#15803d">¡Licitación Adjudicada!</div>' +
            '<div style="font-size:12px;color:#16a34a">La licitación fue aprobada en todos los niveles.</div>' +
          '</div>' +
        '</div>' +
        '<button class="btn btn-primary" onclick="licGenerarOC(\'' + lic.id + '\')"><i class="fas fa-file-alt"></i> Generar Orden de Compra</button>' +
      '</div>';
  }

  return winnerCard + stepsHtml + awardedCard;
}

/* ─── FORM VIEW (full-page) ─── */
function _licFormView(id) {
  var lic = id ? DB.getById('licitaciones', id) : null;
  var projects = DB.getAll('projects');
  var odp = _licState._odpId ? DB.getById('purchaseRequests', _licState._odpId) : (lic && lic.odp_id ? DB.getById('purchaseRequests', lic.odp_id) : null);

  // Auto-import items from ODP when creating new licitación from an ODP
  var items;
  if (!id && odp && odp.items && odp.items.length > 0) {
    items = odp.items.filter(Boolean).map(function(it) {
      return {
        description: it.item_desc || '',
        quantity:    it.quantity  || 1,
        unit:        it.unit      || 'un',
        specs:       it.tipo      || ''
      };
    }).filter(function(it) { return it.description; });
    if (!items.length) items = [{ description: '', quantity: 1, unit: 'un', specs: '' }];
  } else {
    items = (lic && lic.items) ? lic.items : [{ description: '', quantity: 1, unit: 'un', specs: '' }];
  }
  window._licFormItems = items.slice();

  // Pre-select project from ODP when creating new
  var selProjId = (lic && lic.project_id) || (!id && odp && odp.project_id) || '';
  var projectOpts = '<option value="">Sin proyecto</option>' +
    projects.map(function(p) {
      return '<option value="' + p.id + '"' + (selProjId === p.id ? ' selected' : '') + '>' + escapeHtml(p.name) + '</option>';
    }).join('');

  // Pre-fill title from ODP number when creating new
  var titleVal = lic ? (lic.title || '') : (odp ? ('Licitación - ODP ' + escapeHtml(odp.number || odp.id || '')) : '');

  var odpImportBanner = (!id && odp && odp.items && odp.items.length > 0)
    ? '<div style="padding:10px 14px;background:#f0fdf4;border:1px solid #86efac;border-radius:var(--radius);margin-bottom:16px;font-size:12px;color:#166534">' +
        '<i class="fas fa-check-circle" style="margin-right:6px"></i>' +
        '<strong>' + odp.items.filter(Boolean).filter(function(it){return it.item_desc;}).length + ' ítems importados desde ODP ' + escapeHtml(odp.number || '') + '.</strong>' +
        ' Podés editarlos o agregar más.' +
      '</div>'
    : '';

  var itemsHtml = items.map(function(it, i) {
    return _licItemRow(it, i);
  }).join('');

  document.getElementById('content').innerHTML =
    '<div class="page-header">' +
      '<div>' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
          '<button class="btn btn-secondary btn-sm" onclick="licBackToList()" style="padding:4px 12px;font-size:12px">' +
            '<i class="fas fa-arrow-left"></i> Licitaciones' +
          '</button>' +
        '</div>' +
        '<div class="page-title">' + (id ? 'Editar Licitación' : 'Nueva Licitación') + '</div>' +
        '<div class="page-subtitle">' + (id ? 'Modificar datos de la licitación' : 'Crear una nueva licitación') + '</div>' +
      '</div>' +
    '</div>' +

    '<div class="card" style="max-width:860px">' +
      '<div class="card-body">' +
        odpImportBanner +

        '<div class="form-grid form-grid-2" style="margin-bottom:16px">' +
          '<div class="form-group" style="grid-column:1/-1">' +
            '<label class="form-label">Título *</label>' +
            '<input class="form-control" id="lic-f-title" placeholder="Ej: Licitación materiales eléctricos..." value="' + escapeHtml(titleVal) + '">' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">Proyecto</label>' +
            '<select class="form-control" id="lic-f-project">' + projectOpts + '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">Fecha Límite *</label>' +
            '<input class="form-control" id="lic-f-deadline" type="date" value="' + (lic ? (lic.deadline || '') : '') + '">' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">ODP de Origen</label>' +
            '<select class="form-control" id="lic-f-odp" onchange="_licOnODPChange()">' +
              (function() {
                var opts = '<option value="">Sin ODP</option>';
                var allOdps = DB.getAll('purchaseRequests');
                var curOdpId = odp ? odp.id : (lic && lic.odp_id ? lic.odp_id : '');
                allOdps.forEach(function(o) {
                  var label = (o.number || o.id);
                  var proj = projects.find(function(p) { return p.id === o.project_id; });
                  if (proj) label += ' — ' + proj.name;
                  opts += '<option value="' + o.id + '"' + (curOdpId === o.id ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
                });
                return opts;
              })() +
            '</select>' +
          '</div>' +
          '<div class="form-group" style="grid-column:1/-1">' +
            '<label class="form-label">Descripción</label>' +
            '<textarea class="form-control" id="lic-f-desc" rows="3" placeholder="Descripción general de la licitación...">' + escapeHtml(lic ? (lic.description || '') : '') + '</textarea>' +
          '</div>' +
        '</div>' +

        '<div style="border-top:1px solid var(--border);padding-top:16px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
            '<strong style="font-size:13px">Ítems de la Licitación</strong>' +
            '<button class="btn btn-sm btn-secondary" onclick="_licAddItem()"><i class="fas fa-plus"></i> Agregar ítem</button>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:2.5fr 80px 80px 2fr 34px;gap:6px;margin-bottom:6px;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">' +
            '<span>Descripción</span><span>Cantidad</span><span>Unidad</span><span>Especificaciones</span><span></span>' +
          '</div>' +
          '<div id="lic-items-list">' + itemsHtml + '</div>' +
        '</div>' +

        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;flex-wrap:wrap">' +
          '<button class="btn btn-secondary" onclick="licBackToList()">Cancelar</button>' +
          '<button class="btn btn-primary" onclick="licGuardar(\'' + (id || '') + '\')"><i class="fas fa-save"></i> Guardar</button>' +
        '</div>' +

      '</div>' +
    '</div>';

  if (document.getElementById('breadcrumb')) {
    document.getElementById('breadcrumb').innerHTML =
      '<i class="fas fa-gavel"></i>' +
      '<span onclick="licBackToList()" style="cursor:pointer;color:var(--primary)">Licitaciones</span>' +
      '<i class="fas fa-chevron-right" style="font-size:10px;margin:0 4px;color:var(--text-light)"></i>' +
      '<span>' + (id ? 'Editar' : 'Nueva') + '</span>';
  }
}

/* ─── ODP change handler ─── */
function _licOnODPChange() {
  var odpSel = document.getElementById('lic-f-odp');
  if (!odpSel || !odpSel.value) return;
  var odp = DB.getById('purchaseRequests', odpSel.value);
  if (!odp || !odp.items || !odp.items.length) return;

  var newItems = odp.items.filter(Boolean).map(function(it) {
    return { description: it.item_desc || '', quantity: it.quantity || 1, unit: it.unit || 'un', specs: it.tipo || '' };
  }).filter(function(it) { return it.description; });
  if (!newItems.length) return;

  var hasExisting = (window._licFormItems || []).some(function(it) { return it && it.description; });
  if (hasExisting && !confirm('¿Reemplazar los ítems con los de la ODP seleccionada?')) return;

  window._licFormItems = newItems.slice();
  var cont = document.getElementById('lic-items-list');
  if (cont) cont.innerHTML = newItems.map(function(it, i) { return _licItemRow(it, i); }).join('');

  // Pre-fill project from ODP if not already set
  var projSel = document.getElementById('lic-f-project');
  if (projSel && !projSel.value && odp.project_id) projSel.value = odp.project_id;

  toast(newItems.length + ' ítems importados desde ODP', 'success');
}

function _licItemRow(it, i) {
  return '<div id="lic-item-row-' + i + '" style="display:grid;grid-template-columns:2.5fr 80px 80px 2fr 34px;gap:6px;margin-bottom:8px;align-items:center">' +
    '<input class="form-control" style="font-size:12px" placeholder="Descripción del ítem" value="' + escapeHtml(it.description || '') + '" oninput="window._licFormItems[' + i + '].description=this.value">' +
    '<input class="form-control" style="font-size:12px;text-align:center" type="number" min="0" value="' + (it.quantity || 1) + '" oninput="window._licFormItems[' + i + '].quantity=+this.value">' +
    '<input class="form-control" style="font-size:12px" placeholder="un" value="' + escapeHtml(it.unit || 'un') + '" oninput="window._licFormItems[' + i + '].unit=this.value">' +
    '<input class="form-control" style="font-size:12px" placeholder="Especificaciones técnicas..." value="' + escapeHtml(it.specs || '') + '" oninput="window._licFormItems[' + i + '].specs=this.value">' +
    '<button class="btn-ghost btn danger" onclick="_licRemoveItem(' + i + ')"><i class="fas fa-times"></i></button>' +
  '</div>';
}

window._licFormItems = [];
function _licAddItem() {
  var blank = { description: '', quantity: 1, unit: 'un', specs: '' };
  window._licFormItems.push(blank);
  var i = window._licFormItems.length - 1;
  var cont = document.getElementById('lic-items-list');
  if (cont) {
    var div = document.createElement('div');
    div.innerHTML = _licItemRow(blank, i);
    cont.appendChild(div.firstElementChild);
  }
}

function _licRemoveItem(i) {
  var row = document.getElementById('lic-item-row-' + i);
  if (row) row.remove();
  window._licFormItems[i] = null;
}

/* ─── licNueva ─── */
function licNueva(odpId) {
  if (typeof canView === 'function' && window.APP_STATE && window.APP_STATE.currentUser && !canView('licitaciones')) {
    toast('Sin acceso: no tenés permiso para ver este módulo', 'warning');
    return;
  }
  _licState.view = 'form';
  _licState.licId = null;
  _licState.tab = 'resumen';
  _licState._odpId = odpId || null;
  navigate('licitaciones');
}

/* ─── licGuardar ─── */
function licGuardar(id) {
  var title = (document.getElementById('lic-f-title').value || '').trim();
  var deadline = document.getElementById('lic-f-deadline').value;
  if (!title) { toast('El título es obligatorio', 'error'); return; }
  if (!deadline) { toast('La fecha límite es obligatoria', 'error'); return; }

  var items = (window._licFormItems || []).filter(function(it) { return it && it.description; });

  var projectId = document.getElementById('lic-f-project').value;
  var description = document.getElementById('lic-f-desc').value.trim();
  var odpSel = document.getElementById('lic-f-odp');
  var odpId = (odpSel ? odpSel.value : null) || _licState._odpId || (id ? (DB.getById('licitaciones', id) || {}).odp_id : null) || null;

  var data = {
    title: title,
    project_id: projectId,
    deadline: deadline,
    description: description,
    items: items,
    odp_id: odpId,
    updated_at: todayStr()
  };

  if (id) {
    DB.update('licitaciones', id, data);
    toast('Licitación actualizada', 'success');
    _licState.view = 'detail';
    _licState.licId = id;
  } else {
    data.status = 'draft';
    data.created_at = todayStr();
    var rec = DB.insert('licitaciones', data);
    toast('Licitación creada', 'success');
    _licState.view = 'detail';
    _licState.licId = rec.id;
    _licState._odpId = null;
  }

  window._licFormItems = [];
  navigate('licitaciones');
}

/* ─── licActivar ─── */
function licActivar(id) {
  confirmDialog('¿Activar esta licitación? Los proveedores podrán ser invitados a cotizar.', function() {
    DB.update('licitaciones', id, { status: 'active', activated_at: todayStr() });
    toast('Licitación activada', 'success');
    _licDetailView(id);
  });
}

/* ─── licCerrar ─── */
function licCerrar(id) {
  confirmDialog('¿Cerrar esta licitación? Ya no se aceptarán nuevas cotizaciones.', function() {
    DB.update('licitaciones', id, { status: 'closed', closed_at: todayStr() });
    toast('Licitación cerrada', 'success');
    _licDetailView(id);
  });
}

/* ─── licDelete ─── */
function licDelete(id) {
  confirmDialog('¿Eliminar esta licitación? Esta acción no se puede deshacer.', function() {
    DB.remove('licitaciones', id);
    var invs = DB.getAll('lic_invitaciones').filter(function(i) { return i.lic_id === id; });
    invs.forEach(function(i) { DB.remove('lic_invitaciones', i.id); });
    var cots = DB.getAll('lic_cotizaciones').filter(function(c) { return c.lic_id === id; });
    cots.forEach(function(c) { DB.remove('lic_cotizaciones', c.id); });
    toast('Licitación eliminada', 'warning');
    licBackToList();
  });
}

/* ─── licBackToList ─── */
function licBackToList() {
  _licState.view = 'list';
  _licState.licId = null;
  _licState.tab = 'resumen';
  _licState._odpId = null;
  window._licFormItems = [];
  navigate('licitaciones');
}

/* ─── licAgregarProveedor ─── */
function licAgregarProveedor(licId) {
  var suppliers = DB.getAll('suppliers').filter(function(s) { return s.status !== 'inactive'; });
  var existingInvs = DB.getAll('lic_invitaciones').filter(function(i) { return i.lic_id === licId; });
  var invitedIds = existingInvs.map(function(i) { return i.supplier_id; });

  var supplierOpts = '<option value="">Seleccionar proveedor existente...</option>' +
    suppliers.map(function(s) {
      var alreadyInvited = invitedIds.indexOf(s.id) !== -1;
      return '<option value="' + s.id + '"' + (alreadyInvited ? ' disabled' : '') + '>' +
        escapeHtml(s.name) + (alreadyInvited ? ' (ya invitado)' : '') +
      '</option>';
    }).join('');

  var body =
    '<div class="form-group" style="margin-bottom:14px">' +
      '<label class="form-label">Proveedor registrado</label>' +
      '<select class="form-control" id="lic-inv-supplier" onchange="licOnSupplierChange()">' + supplierOpts + '</select>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">O completá los datos manualmente a continuación</div>' +
    '</div>' +
    '<div class="form-grid form-grid-2">' +
      '<div class="form-group">' +
        '<label class="form-label">Nombre / Razón Social *</label>' +
        '<input class="form-control" id="lic-inv-name" placeholder="Nombre del proveedor...">' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Email de contacto *</label>' +
        '<input class="form-control" id="lic-inv-email" type="email" placeholder="email@proveedor.com">' +
      '</div>' +
    '</div>';

  var footer =
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="licConfirmarInv(\'' + licId + '\')"><i class="fas fa-user-plus"></i> Agregar</button>';

  openModal('Agregar Proveedor a la Licitación', body, 'modal-lg', footer);
}

/* ─── licOnSupplierChange ─── */
function licOnSupplierChange() {
  var sel = document.getElementById('lic-inv-supplier');
  var supplierId = sel ? sel.value : '';
  if (!supplierId) return;
  var supplier = DB.getById('suppliers', supplierId);
  if (!supplier) return;
  var nameEl = document.getElementById('lic-inv-name');
  var emailEl = document.getElementById('lic-inv-email');
  if (nameEl) nameEl.value = supplier.name || '';
  if (emailEl) emailEl.value = supplier.email || supplier.contact_email || '';
}

/* ─── licConfirmarInv ─── */
function licConfirmarInv(licId) {
  var name  = (document.getElementById('lic-inv-name').value || '').trim();
  var email = (document.getElementById('lic-inv-email').value || '').trim();
  var supplierId = document.getElementById('lic-inv-supplier').value;

  if (!name)  { toast('El nombre del proveedor es obligatorio', 'error'); return; }
  if (!email) { toast('El email es obligatorio', 'error'); return; }

  var token = _licGenToken();
  DB.insert('lic_invitaciones', {
    lic_id: licId,
    supplier_id: supplierId || null,
    supplier_name: name,
    email: email,
    token: token,
    status: 'invited',
    invited_date: todayStr()
  });

  toast('Proveedor invitado correctamente', 'success');
  closeModal();
  _licState.tab = 'invitaciones';
  _licDetailView(licId);
}

/* ─── _licGenToken ─── */
function _licGenToken() {
  var arr = new Uint8Array(20);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(function(b) {
    return ('0' + b.toString(16)).slice(-2);
  }).join('');
}

/* ─── licEliminarInv ─── */
function licEliminarInv(invId) {
  confirmDialog('¿Eliminar la invitación de este proveedor?', function() {
    DB.remove('lic_invitaciones', invId);
    toast('Invitación eliminada', 'warning');
    var licId = _licState.licId;
    _licState.tab = 'invitaciones';
    _licDetailView(licId);
  });
}

/* ─── licCopiarLink ─── */
function licCopiarLink(encodedLink, isDraft) {
  var link = decodeURIComponent(encodedLink);

  // Force-push this invitation + licitación to Supabase now,
  // in case they were created while the app was offline.
  try {
    var params    = new URLSearchParams(link.split('?')[1] || '');
    var token     = params.get('token');
    var licId     = params.get('lic');
    var cid       = DB._companyId;
    if (token && licId && typeof _SUPA !== 'undefined') {
      var licRec = DB.getById('licitaciones', licId);
      if (licRec) _SUPA.upsert(cid, 'licitaciones', licRec);
      DB.getAll('lic_invitaciones').filter(function(i) {
        return i.lic_id === licId;
      }).forEach(function(inv) { _SUPA.upsert(cid, 'lic_invitaciones', inv); });
    }
  } catch(e) { console.warn('[licCopiarLink] sync:', e.message); }

  var msg = isDraft
    ? 'Link copiado — activá la licitación para que funcione'
    : 'Enlace copiado. Datos sincronizados con el servidor.';
  var level = isDraft ? 'warning' : 'success';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).then(function() {
      toast(msg, level);
    }).catch(function() {
      _licCopyFallback(link, msg, level);
    });
  } else {
    _licCopyFallback(link, msg, level);
  }
}

function _licCopyFallback(text, msg, level) {
  var el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  try {
    document.execCommand('copy');
    toast(msg || 'Enlace copiado al portapapeles', level || 'success');
  } catch (e) {
    toast('No se pudo copiar. Enlace: ' + text, 'warning');
  }
  document.body.removeChild(el);
}

/* ─── licEnviarEmail ─── */
function licEnviarEmail(encodedEmail, encodedTitle, encodedLink, encodedDeadline) {
  var email    = decodeURIComponent(encodedEmail);
  var title    = decodeURIComponent(encodedTitle);
  var link     = decodeURIComponent(encodedLink);
  var deadline = decodeURIComponent(encodedDeadline);

  var subject = encodeURIComponent('Invitación a cotizar: ' + title);
  var body = encodeURIComponent(
    'Estimado proveedor,\n\n' +
    'Le informamos que ha sido invitado a participar en la siguiente licitación:\n\n' +
    'Licitación: ' + title + '\n' +
    (deadline ? 'Fecha límite para cotizar: ' + deadline + '\n' : '') +
    '\nPuede ingresar su cotización a través del siguiente enlace:\n' +
    link + '\n\n' +
    'Por favor, complete su cotización antes de la fecha indicada.\n\n' +
    'Ante cualquier consulta, no dude en contactarnos.\n\n' +
    'Saludos cordiales.'
  );

  window.location.href = 'mailto:' + email + '?subject=' + subject + '&body=' + body;
}

/* ─── licAdjudicar ─── */
function licAdjudicar(licId, cotId) {
  var lic = DB.getById('licitaciones', licId);
  if (!lic) return;

  var patch = { winner_cot_id: cotId };
  if (lic.status === 'active') patch.status = 'closed';

  DB.update('licitaciones', licId, patch);
  toast('Cotización seleccionada como ganadora', 'success');

  _licState.tab = 'comparativa';
  _licDetailView(licId);
}

/* ─── licAprobarStep ─── */
function licAprobarStep(licId, key, approved) {
  var lic = DB.getById('licitaciones', licId);
  if (!lic) return;
  if (lic.status === 'awarded' || lic.status === 'cancelled') {
    toast('Esta licitación ya fue ' + (lic.status === 'awarded' ? 'adjudicada' : 'cancelada') + ' y no puede modificarse.', 'warning');
    return;
  }
  var existingVote = (lic.approvals || []).find(function(a) { return a.key === key; });
  if (existingVote) {
    toast('Este paso ya fue votado y no puede modificarse.', 'warning');
    return;
  }

  var approvals = (lic.approvals || []).slice();
  var currentUser = (window.APP_STATE && window.APP_STATE.currentUser && window.APP_STATE.currentUser.name) || 'Sistema';

  approvals.push({
    key: key,
    approved: approved,
    approver: currentUser,
    date: todayStr()
  });

  var steps = ['jefe_compras', 'gerencia', 'direccion'];
  var allApproved = steps.every(function(s) {
    return approvals.some(function(a) { return a.key === s && a.approved === true; });
  });
  var anyRejected = steps.some(function(s) {
    return approvals.some(function(a) { return a.key === s && a.approved === false; });
  });

  var patch = { approvals: approvals };
  if (allApproved) {
    patch.status = 'awarded';
    patch.awarded_at = todayStr();
    toast('¡Licitación adjudicada! Todos los niveles aprobaron.', 'success');
  } else if (anyRejected) {
    patch.status = 'cancelled';
    patch.cancelled_at = todayStr();
    toast('Licitación cancelada por rechazo en aprobación.', 'warning');
  } else {
    toast(approved ? 'Paso aprobado' : 'Paso rechazado', approved ? 'success' : 'warning');
  }

  DB.update('licitaciones', licId, patch);
  _licState.tab = 'aprobacion';
  _licDetailView(licId);
}

/* ─── licGenerarOC ─── */
function licGenerarOC(licId) {
  var lic = DB.getById('licitaciones', licId);
  if (!lic || !lic.winner_cot_id) {
    toast('No hay cotización ganadora seleccionada', 'error');
    return;
  }

  var winnerCot = DB.getById('lic_cotizaciones', lic.winner_cot_id);
  if (!winnerCot) {
    toast('No se encontró la cotización ganadora', 'error');
    return;
  }

  var invs = DB.getAll('lic_invitaciones').filter(function(i) { return i.lic_id === licId; });
  var inv = invs.find(function(i) { return i.id === winnerCot.inv_id || i.supplier_id === winnerCot.supplier_id; });
  var supplierId = (inv && inv.supplier_id) ? inv.supplier_id : null;
  var supplierName = winnerCot.supplier_name || (inv ? inv.supplier_name : '—');

  var proj = lic.project_id ? DB.getById('projects', lic.project_id) : null;

  var allOCs = DB.getAll('purchaseOrders');
  var yr = new Date().getFullYear();
  var seq = allOCs.filter(function(o) { return (o.number || '').startsWith('OC-' + yr); }).length + 1;
  var ocNumber = 'OC-' + yr + '-' + String(seq).padStart(3, '0');

  var items = (winnerCot.items || []).map(function(it) {
    var qty = it.quantity || 1;
    var up = it.unit_price || 0;
    return {
      description: it.description || '—',
      unit: it.unit || 'un',
      quantity: qty,
      unit_price: up,
      total: it.total || (up * qty),
      delivery_days: it.delivery_days || null,
      payment_terms: it.payment_terms || null
    };
  });

  var total = items.reduce(function(s, it) { return s + (it.total || 0); }, 0);

  DB.insert('purchaseOrders', {
    number: ocNumber,
    supplier_id: supplierId,
    supplier_name: supplierName,
    project_id: lic.project_id || null,
    project_name: proj ? proj.name : null,
    date: todayStr(),
    items: items,
    subtotal: total,
    tax: 0,
    total: total,
    status: 'draft',
    notes: 'Generada desde licitación: ' + (lic.title || licId),
    lic_id: licId
  });

  DB.update('licitaciones', licId, { oc_generated: true, oc_number: ocNumber });

  toast('Orden de Compra ' + ocNumber + ' generada correctamente', 'success');
  navigate('ordenes_compra');
}
