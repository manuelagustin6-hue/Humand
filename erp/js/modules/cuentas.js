/* ===== CLIENTES + CUENTAS CORRIENTES: PROVEEDORES Y CLIENTES ===== */

// =====================================================================
// CLIENTES
// Collection: clientes
// { id, name, doc_type, doc_number, phone, email, address, notes }
// =====================================================================

function renderClientes() {
  var clientes = DB.getAll('clientes');
  var ventas = DB.getAll('ventasUnidades');

  var searchVal = '';
  function buildTable(list) {
    if (!list.length) {
      return '<div class="empty-state"><i class="fas fa-users"></i><p>No hay clientes registrados</p></div>';
    }
    var rows = list.map(function(c) {
      var ccc = ventas.filter(function(v) { return v.buyer_client_id === c.id || v.buyer_doc === c.doc_number; }).length;
      return '<tr>' +
        '<td><b>' + c.name + '</b></td>' +
        '<td style="font-size:12px">' + (c.doc_type || '') + ' ' + (c.doc_number || '') + '</td>' +
        '<td>' + (c.phone || '—') + '</td>' +
        '<td>' + (c.email || '—') + '</td>' +
        '<td>' + (c.address || '—') + '</td>' +
        '<td style="text-align:center">' +
          (ccc > 0 ? '<span class="badge badge-blue">' + ccc + '</span>' : '—') +
        '</td>' +
        '<td style="white-space:nowrap;">' +
          '<button class="btn btn-sm btn-secondary" onclick="clienteEdit(\'' + c.id + '\')"><i class="fas fa-edit"></i></button> ' +
          (ccc > 0
            ? '<button class="btn btn-sm btn-primary" onclick="navigate(\'cuentas_cli\')"><i class="fas fa-list-ol"></i></button> '
            : '') +
          '<button class="btn btn-sm btn-danger" onclick="clienteDelete(\'' + c.id + '\')"><i class="fas fa-trash"></i></button>' +
        '</td>' +
      '</tr>';
    }).join('');
    return '<table class="table"><thead><tr>' +
      '<th>Nombre</th><th>Documento</th><th>Telefono</th><th>Email</th><th>Direccion</th><th>CCC</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
  }

  document.getElementById('content').innerHTML =
    '<div class="page-header"><div>' +
      '<div class="page-title"><i class="fas fa-users" style="margin-right:8px;color:var(--primary)"></i>Clientes</div>' +
      '<div class="page-subtitle">Directorio de compradores e inquilinos</div>' +
    '</div>' +
    '<button class="btn btn-primary" onclick="clienteNuevo()"><i class="fas fa-plus"></i> Nuevo Cliente</button>' +
    '</div>' +
    '<div class="card" style="margin-bottom:16px;padding:10px 16px;">' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<i class="fas fa-search" style="color:var(--text-muted)"></i>' +
        '<input type="text" id="cli-search" class="form-control" style="border:none;padding:0;font-size:14px;" placeholder="Buscar por nombre, documento, email..." oninput="clienteFiltrar(this.value)">' +
      '</div>' +
    '</div>' +
    '<div id="cli-table-wrap">' + buildTable(clientes) + '</div>';
}

function clienteFiltrar(q) {
  var clientes = DB.getAll('clientes');
  var ventas = DB.getAll('ventasUnidades');
  q = (q || '').toLowerCase();
  var filtered = q
    ? clientes.filter(function(c) {
        return (c.name || '').toLowerCase().includes(q) ||
               (c.doc_number || '').toLowerCase().includes(q) ||
               (c.email || '').toLowerCase().includes(q);
      })
    : clientes;

  function cccCount(c) {
    return ventas.filter(function(v) { return v.buyer_client_id === c.id || v.buyer_doc === c.doc_number; }).length;
  }

  var rows = filtered.map(function(c) {
    var ccc = cccCount(c);
    return '<tr>' +
      '<td><b>' + c.name + '</b></td>' +
      '<td style="font-size:12px">' + (c.doc_type || '') + ' ' + (c.doc_number || '') + '</td>' +
      '<td>' + (c.phone || '—') + '</td>' +
      '<td>' + (c.email || '—') + '</td>' +
      '<td>' + (c.address || '—') + '</td>' +
      '<td style="text-align:center">' + (ccc > 0 ? '<span class="badge badge-blue">' + ccc + '</span>' : '—') + '</td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn btn-sm btn-secondary" onclick="clienteEdit(\'' + c.id + '\')"><i class="fas fa-edit"></i></button> ' +
        (ccc > 0 ? '<button class="btn btn-sm btn-primary" onclick="navigate(\'cuentas_cli\')"><i class="fas fa-list-ol"></i></button> ' : '') +
        '<button class="btn btn-sm btn-danger" onclick="clienteDelete(\'' + c.id + '\')"><i class="fas fa-trash"></i></button>' +
      '</td>' +
    '</tr>';
  }).join('');

  var wrap = document.getElementById('cli-table-wrap');
  if (wrap) wrap.innerHTML = rows
    ? '<table class="table"><thead><tr><th>Nombre</th><th>Documento</th><th>Telefono</th><th>Email</th><th>Direccion</th><th>CCC</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>'
    : '<div class="empty-state"><i class="fas fa-search"></i><p>Sin resultados</p></div>';
}

function _clienteForm(c) {
  c = c || {};
  return '<div class="form-grid">' +
    '<div class="form-group"><label>Nombre completo *</label>' +
      '<input type="text" id="cf-name" class="form-control" value="' + (c.name || '') + '" placeholder="Nombre y apellido"></div>' +
    '<div class="form-group"><label>Tipo Documento</label>' +
      '<select id="cf-doctype" class="form-control">' +
        ['DNI','CUIT','PASSPORT','Otro'].map(function(t) { return '<option' + (c.doc_type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') +
      '</select></div>' +
    '<div class="form-group"><label>N° Documento</label>' +
      '<input type="text" id="cf-docnum" class="form-control" value="' + (c.doc_number || '') + '"></div>' +
    '<div class="form-group"><label>Telefono *</label>' +
      '<input type="text" id="cf-phone" class="form-control" value="' + (c.phone || '') + '" placeholder="+54 11 1234-5678"></div>' +
    '<div class="form-group"><label>Email *</label>' +
      '<input type="email" id="cf-email" class="form-control" value="' + (c.email || '') + '" placeholder="correo@ejemplo.com"></div>' +
    '<div class="form-group"><label>Direccion</label>' +
      '<input type="text" id="cf-address" class="form-control" value="' + (c.address || '') + '"></div>' +
  '</div>' +
  '<div class="form-group"><label>Notas</label>' +
    '<textarea id="cf-notes" class="form-control" rows="2">' + (c.notes || '') + '</textarea></div>';
}

function clienteNuevo() {
  openModal('Nuevo Cliente', _clienteForm(), 'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="clienteGuardar(null)"><i class="fas fa-save"></i> Guardar</button>'
  );
}

function clienteEdit(id) {
  var c = DB.getById('clientes', id);
  if (!c) return;
  openModal('Editar Cliente', _clienteForm(c), 'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="clienteGuardar(\'' + id + '\')"><i class="fas fa-save"></i> Guardar</button>'
  );
}

function clienteGuardar(id) {
  var g = function(eid) { return (document.getElementById(eid) || {}).value || ''; };
  var name = g('cf-name').trim();
  var phone = g('cf-phone').trim();
  var email = g('cf-email').trim();
  if (!name) { toast('El nombre es obligatorio', 'error'); return; }
  if (!phone) { toast('El telefono es obligatorio', 'error'); return; }
  if (!email) { toast('El email es obligatorio', 'error'); return; }
  var data = {
    name: name,
    doc_type: g('cf-doctype'),
    doc_number: g('cf-docnum'),
    phone: g('cf-phone'),
    email: g('cf-email'),
    address: g('cf-address'),
    notes: g('cf-notes'),
  };
  if (id) { DB.update('clientes', id, data); toast('Cliente actualizado', 'success'); }
  else { DB.insert('clientes', data); toast('Cliente creado', 'success'); }
  closeModal();
  renderClientes();
}

function clienteDelete(id) {
  var ventas = DB.getAll('ventasUnidades');
  var c = DB.getById('clientes', id);
  var hasCC = c && ventas.some(function(v) { return v.buyer_client_id === id || v.buyer_doc === (c && c.doc_number); });
  if (hasCC) { toast('No se puede eliminar: tiene cuentas corrientes asociadas', 'error'); return; }
  confirmDialog('Eliminar cliente permanentemente.', function() {
    DB.remove('clientes', id);
    renderClientes();
    toast('Cliente eliminado', 'success');
  });
}

// =====================================================================
// CUENTAS CORRIENTES PROVEEDORES
// Collections: suppliers, supplierInvoices, paymentOrders
// =====================================================================

var _cprovState = { supplierId: null, tab: 'actividad' };

function renderCuentasProv() {
  var suppliers = DB.getAll('suppliers');
  var invoices  = DB.getAll('supplierInvoices');
  var payments  = DB.getAll('paymentOrders');

  var totalFacturado = 0, totalPagado = 0;
  var rows = '';

  suppliers.forEach(function(s) {
    var invs = invoices.filter(function(i) { return i.supplier_id === s.id; });
    var pays = payments.filter(function(p) { return p.supplier_id === s.id; });
    var facturado = invs.reduce(function(sum, i) { return sum + (i.total || 0); }, 0);
    var pagado    = pays.reduce(function(sum, p) { return sum + (p.net_amount || 0); }, 0);
    var saldo     = facturado - pagado;
    totalFacturado += facturado; totalPagado += pagado;

    var catArr = Array.isArray(s.category) ? s.category : (s.category ? [s.category] : []);
    var catHtml = catArr.map(function(c) {
      return '<span class="badge badge-gray" style="font-size:10px">' + c + '</span>';
    }).join(' ');

    var saldoBadge = saldo > 0
      ? '<span class="badge badge-red">' + fmtMoney(saldo) + '</span>'
      : (saldo < 0 ? '<span class="badge badge-yellow">' + fmtMoney(saldo) + '</span>'
                   : '<span class="badge badge-green">Saldado</span>');

    rows += '<tr style="cursor:pointer" onclick="cprovOpenDetail(\'' + s.id + '\')">' +
      '<td>' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<div style="width:36px;height:36px;border-radius:10px;background:var(--primary-muted,#eff6ff);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:var(--primary);flex-shrink:0">' +
            _cprovInitials(s.name) +
          '</div>' +
          '<div><strong>' + s.name + '</strong>' +
            '<div style="font-size:11px;color:var(--text-muted)">' + (s.cuit || '') + '</div>' +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td>' + catHtml + '</td>' +
      '<td class="number-cell">' + fmtMoney(facturado) + '</td>' +
      '<td class="number-cell">' + fmtMoney(pagado) + '</td>' +
      '<td class="number-cell">' + saldoBadge + '</td>' +
      '<td><button class="btn btn-sm btn-primary" onclick="event.stopPropagation();cprovOpenDetail(\'' + s.id + '\')">' +
        '<i class="fas fa-arrow-right"></i> Ver cuenta' +
      '</button></td>' +
    '</tr>';
  });

  if (!rows) rows = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-building"></i><p>No hay proveedores registrados</p></div></td></tr>';

  var totalSaldo = totalFacturado - totalPagado;
  document.getElementById('content').innerHTML =
    '<div class="page-header"><div>' +
      '<div class="page-title"><i class="fas fa-building-columns" style="margin-right:8px;color:var(--primary)"></i>Cuentas Corrientes Proveedores</div>' +
      '<div class="page-subtitle">Saldos, facturas y pagos por proveedor</div>' +
    '</div></div>' +
    '<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">' +
      '<div class="stat-card"><div class="stat-icon blue"><i class="fas fa-file-invoice"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalFacturado) + '</div><div class="stat-label">Total Facturado</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon green"><i class="fas fa-money-bill-wave"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalPagado) + '</div><div class="stat-label">Total Pagado</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon ' + (totalSaldo > 0 ? 'red' : 'green') + '"><i class="fas fa-scale-balanced"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalSaldo) + '</div><div class="stat-label">Saldo a Pagar</div></div></div>' +
    '</div>' +
    '<div class="card" style="padding:0">' +
      '<table class="table"><thead><tr>' +
        '<th>Proveedor</th><th>Categoría</th>' +
        '<th class="text-right">Facturado</th><th class="text-right">Pagado</th>' +
        '<th class="text-right">Saldo</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</div>';
}

function _cprovInitials(name) {
  return (name || '?').split(/\s+/).slice(0, 2).map(function(w) { return w[0] || ''; }).join('').toUpperCase() || '?';
}

// ---- SUPPLIER DETAIL PAGE ----
function cprovOpenDetail(supplierId) {
  _cprovState.supplierId = supplierId;
  _cprovState.tab = 'actividad';
  var s = DB.getById('suppliers', supplierId);
  if (!s) return;

  var catArr = Array.isArray(s.category) ? s.category : (s.category ? [s.category] : []);
  var catHtml = catArr.map(function(c) {
    return '<span class="badge badge-gray" style="margin-right:4px">' + c + '</span>';
  }).join('');

  document.getElementById('content').innerHTML =
    // Breadcrumb back button
    '<div style="margin-bottom:16px">' +
      '<button class="btn btn-secondary btn-sm" onclick="renderCuentasProv()">' +
        '<i class="fas fa-arrow-left"></i> Volver a Proveedores' +
      '</button>' +
    '</div>' +

    // Header card
    '<div class="card" style="margin-bottom:0;border-bottom-left-radius:0;border-bottom-right-radius:0;border-bottom:none">' +
      '<div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">' +
        '<div style="width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#eff6ff,#dbeafe);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;color:var(--primary);flex-shrink:0">' +
          _cprovInitials(s.name) +
        '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:18px;font-weight:700;color:var(--text)">' + s.name + '</div>' +
          '<div style="font-size:12px;color:var(--text-muted);margin-top:2px">' +
            (s.cuit ? 'CUIT: ' + s.cuit + ' &nbsp;&bull;&nbsp; ' : '') +
            (s.email || '') +
          '</div>' +
          '<div style="margin-top:6px">' + catHtml + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Tabs
    '<div style="background:var(--surface);border:1px solid var(--border);border-top:none;border-bottom-left-radius:var(--radius);border-bottom-right-radius:var(--radius);margin-bottom:20px">' +
      '<div style="display:flex;overflow-x:auto;border-bottom:1px solid var(--border)">' +
        _cprovTabBtn('resumen',   'Resumen',   'fa-chart-pie') +
        _cprovTabBtn('actividad', 'Actividad', 'fa-list') +
        _cprovTabBtn('facturas',  'Facturas',  'fa-file-invoice') +
        _cprovTabBtn('pagos',     'Pagos',     'fa-money-bill-wave') +
      '</div>' +
      '<div id="cprov-tab-content" style="padding:20px"></div>' +
    '</div>';

  cprovRenderTab('actividad', supplierId);
}

function _cprovTabBtn(tab, label, icon) {
  var active = _cprovState.tab === tab;
  return '<button id="cprov-tab-btn-' + tab + '" onclick="cprovRenderTab(\'' + tab + '\',\'' + _cprovState.supplierId + '\')" ' +
    'style="padding:12px 20px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:' + (active ? '700' : '500') + ';' +
    'color:' + (active ? 'var(--primary)' : 'var(--text-muted)') + ';' +
    'border-bottom:2px solid ' + (active ? 'var(--primary)' : 'transparent') + ';white-space:nowrap;transition:all .15s">' +
    '<i class="fas ' + icon + '" style="margin-right:6px"></i>' + label +
    '</button>';
}

function cprovRenderTab(tab, supplierId) {
  _cprovState.tab = tab;
  // Update tab button styles
  ['resumen','actividad','facturas','pagos'].forEach(function(t) {
    var btn = document.getElementById('cprov-tab-btn-' + t);
    if (!btn) return;
    var active = t === tab;
    btn.style.fontWeight = active ? '700' : '500';
    btn.style.color = active ? 'var(--primary)' : 'var(--text-muted)';
    btn.style.borderBottom = active ? '2px solid var(--primary)' : '2px solid transparent';
  });
  var panel = document.getElementById('cprov-tab-content');
  if (!panel) return;
  if (tab === 'resumen')   panel.innerHTML = cprovTabResumen(supplierId);
  if (tab === 'actividad') panel.innerHTML = cprovTabActividad(supplierId);
  if (tab === 'facturas')  panel.innerHTML = cprovTabFacturas(supplierId);
  if (tab === 'pagos')     panel.innerHTML = cprovTabPagos(supplierId);
}

function cprovTabResumen(supplierId) {
  var invoices = DB.getAll('supplierInvoices').filter(function(i) { return i.supplier_id === supplierId; });
  var payments = DB.getAll('paymentOrders').filter(function(p) { return p.supplier_id === supplierId; });
  var facturado = invoices.reduce(function(s, i) { return s + (i.total || 0); }, 0);
  var pagado    = payments.reduce(function(s, p) { return s + (p.net_amount || 0); }, 0);
  var saldo     = facturado - pagado;
  var pendientes = invoices.filter(function(i) { return i.status !== 'paid'; });
  var vencidas   = pendientes.filter(function(i) { return i.due_date && i.due_date < todayStr(); });

  var pendRows = pendientes.map(function(i) {
    var overdue = i.due_date && i.due_date < todayStr();
    return '<tr style="cursor:pointer" onclick="cprovInvoiceDetail(\'' + i.id + '\')">' +
      '<td><strong>' + (i.number || '—') + '</strong></td>' +
      '<td>' + fmtDate(i.date) + '</td>' +
      '<td style="color:' + (overdue ? 'var(--danger)' : '') + '">' + (i.due_date ? fmtDate(i.due_date) : '—') + '</td>' +
      '<td class="number-cell"><strong>' + fmtMoney(i.total || 0) + '</strong></td>' +
      '<td>' + (overdue ? '<span class="badge badge-red">Vencida</span>' : '<span class="badge badge-yellow">Pendiente</span>') + '</td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px">Sin facturas pendientes</td></tr>';

  return '<div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">' +
    '<div class="stat-card"><div class="stat-icon blue"><i class="fas fa-file-invoice"></i></div>' +
      '<div><div class="stat-value">' + fmtMoney(facturado) + '</div><div class="stat-label">Facturado Total</div></div></div>' +
    '<div class="stat-card"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div>' +
      '<div><div class="stat-value">' + fmtMoney(pagado) + '</div><div class="stat-label">Pagado Total</div></div></div>' +
    '<div class="stat-card"><div class="stat-icon ' + (saldo > 0 ? 'red' : 'green') + '"><i class="fas fa-scale-balanced"></i></div>' +
      '<div><div class="stat-value">' + fmtMoney(saldo) + '</div><div class="stat-label">Saldo</div></div></div>' +
    '<div class="stat-card"><div class="stat-icon red"><i class="fas fa-exclamation-triangle"></i></div>' +
      '<div><div class="stat-value">' + vencidas.length + '</div><div class="stat-label">Facturas Vencidas</div></div></div>' +
  '</div>' +
  '<h4 style="font-size:13px;font-weight:600;margin-bottom:10px">Facturas Pendientes</h4>' +
  '<div class="card" style="padding:0"><table class="table">' +
    '<thead><tr><th>N° Factura</th><th>Fecha</th><th>Vencimiento</th><th class="text-right">Total</th><th>Estado</th></tr></thead>' +
    '<tbody>' + pendRows + '</tbody>' +
  '</table></div>';
}

function cprovTabActividad(supplierId) {
  var invoices = DB.getAll('supplierInvoices').filter(function(i) { return i.supplier_id === supplierId; });
  var payments = DB.getAll('paymentOrders').filter(function(p) { return p.supplier_id === supplierId; });
  var projects = DB.getAll('projects');

  var movements = [];
  invoices.forEach(function(i) {
    var proj = projects.find(function(p) { return p.id === i.project_id; });
    movements.push({ date: i.date || '', type: 'factura', ref: i.number || '—',
      concept: (i.tipo_comprobante || 'Factura') + (proj ? ' — ' + proj.name : ''),
      debit: i.total || 0, credit: 0, id: i.id });
  });
  payments.forEach(function(p) {
    var proj = projects.find(function(pr) { return pr.id === p.project_id; });
    movements.push({ date: p.date || '', type: 'pago', ref: p.number || '—',
      concept: (p.concept || 'Orden de Pago') + (proj ? ' — ' + proj.name : ''),
      debit: 0, credit: p.net_amount || 0, id: p.id });
  });
  movements.sort(function(a, b) { return a.date.localeCompare(b.date); });

  if (!movements.length) return '<div class="empty-state"><i class="fas fa-list"></i><p>Sin movimientos</p></div>';

  var balance = 0;
  var rows = movements.map(function(m) {
    balance += m.debit - m.credit;
    var isFactura = m.type === 'factura';
    var badge = isFactura
      ? '<span class="badge badge-blue">Factura</span>'
      : '<span class="badge badge-green">Pago</span>';
    var clickFn = isFactura
      ? 'cprovInvoiceDetail(\'' + m.id + '\')'
      : 'cprovPaymentDetail(\'' + m.id + '\')';
    return '<tr style="cursor:pointer" onclick="' + clickFn + '" title="Ver detalle">' +
      '<td>' + fmtDate(m.date) + '</td>' +
      '<td>' + badge + '</td>' +
      '<td><strong>' + m.ref + '</strong></td>' +
      '<td style="font-size:12px;color:var(--text-muted)">' + m.concept + '</td>' +
      '<td class="number-cell" style="color:var(--danger)">' + (m.debit ? fmtMoney(m.debit) : '—') + '</td>' +
      '<td class="number-cell" style="color:var(--success)">' + (m.credit ? fmtMoney(m.credit) : '—') + '</td>' +
      '<td class="number-cell"><strong style="color:' + (balance > 0 ? 'var(--danger)' : 'var(--success)') + '">' + fmtMoney(balance) + '</strong></td>' +
      '<td><i class="fas fa-chevron-right" style="color:var(--text-muted);font-size:11px"></i></td>' +
    '</tr>';
  }).join('');

  return '<div class="card" style="padding:0">' +
    '<table class="table">' +
    '<thead><tr><th>Fecha</th><th>Tipo</th><th>N°</th><th>Concepto</th>' +
    '<th class="text-right" style="color:var(--danger)">Debe</th>' +
    '<th class="text-right" style="color:var(--success)">Haber</th>' +
    '<th class="text-right">Saldo</th><th></th></tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '<tfoot><tr style="background:var(--bg)">' +
      '<td colspan="4" style="font-weight:600;padding:10px 12px">Totales</td>' +
      '<td class="number-cell" style="font-weight:700;color:var(--danger)">' + fmtMoney(movements.reduce(function(s,m){return s+m.debit;},0)) + '</td>' +
      '<td class="number-cell" style="font-weight:700;color:var(--success)">' + fmtMoney(movements.reduce(function(s,m){return s+m.credit;},0)) + '</td>' +
      '<td class="number-cell" style="font-weight:700;color:' + (balance > 0 ? 'var(--danger)' : 'var(--success)') + '">' + fmtMoney(balance) + '</td>' +
      '<td></td>' +
    '</tr></tfoot>' +
    '</table></div>';
}

function cprovTabFacturas(supplierId) {
  var invoices = DB.getAll('supplierInvoices').filter(function(i) { return i.supplier_id === supplierId; });
  var projects = DB.getAll('projects');

  if (!invoices.length) return '<div class="empty-state"><i class="fas fa-file-invoice"></i><p>Sin facturas registradas</p></div>';

  var stColors = { pending: 'badge-yellow', paid: 'badge-green', overdue: 'badge-red' };
  var stLabels = { pending: 'Pendiente', paid: 'Pagada', overdue: 'Vencida' };

  var rows = invoices.sort(function(a,b){return (b.date||'').localeCompare(a.date||'');}).map(function(i) {
    var proj = projects.find(function(p) { return p.id === i.project_id; });
    var effectiveStatus = (i.status !== 'paid' && i.due_date && i.due_date < todayStr()) ? 'overdue' : (i.status || 'pending');
    return '<tr style="cursor:pointer" onclick="cprovInvoiceDetail(\'' + i.id + '\')" title="Ver detalle">' +
      '<td><strong>' + (i.number || '—') + '</strong>' +
        '<div style="font-size:10px;color:var(--text-muted)">' + (i.tipo_comprobante || '') + '</div>' +
      '</td>' +
      '<td>' + fmtDate(i.date) + '</td>' +
      '<td style="color:' + (effectiveStatus === 'overdue' ? 'var(--danger)' : '') + '">' + (i.due_date ? fmtDate(i.due_date) : '—') + '</td>' +
      '<td style="font-size:12px">' + (proj ? proj.name : '—') + '</td>' +
      '<td class="number-cell">' + fmtMoney(i.subtotal || 0) + '</td>' +
      '<td class="number-cell">' + fmtMoney((i.tax || 0) + (i.perc_iva || 0) + (i.perc_iibb || 0)) + '</td>' +
      '<td class="number-cell"><strong>' + fmtMoney(i.total || 0) + '</strong></td>' +
      '<td><span class="badge ' + (stColors[effectiveStatus] || 'badge-gray') + '">' + (stLabels[effectiveStatus] || effectiveStatus) + '</span></td>' +
      '<td><i class="fas fa-chevron-right" style="color:var(--text-muted);font-size:11px"></i></td>' +
    '</tr>';
  }).join('');

  return '<div class="card" style="padding:0"><table class="table">' +
    '<thead><tr><th>N° Factura</th><th>Fecha</th><th>Vencimiento</th><th>Proyecto</th>' +
    '<th class="text-right">Neto</th><th class="text-right">Impuestos</th><th class="text-right">Total</th>' +
    '<th>Estado</th><th></th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table></div>';
}

function cprovTabPagos(supplierId) {
  var payments = DB.getAll('paymentOrders').filter(function(p) { return p.supplier_id === supplierId; });
  var invoices = DB.getAll('supplierInvoices');
  var accounts = DB.getAll('bankAccounts');
  var projects = DB.getAll('projects');

  if (!payments.length) return '<div class="empty-state"><i class="fas fa-money-bill-wave"></i><p>Sin pagos registrados</p></div>';

  var stColors = { draft:'badge-gray', pending:'badge-yellow', paid:'badge-green', cancelled:'badge-red' };
  var stLabels = { draft:'Borrador', pending:'Pendiente', paid:'Pagado', cancelled:'Cancelado' };

  var rows = payments.sort(function(a,b){return (b.date||'').localeCompare(a.date||'');}).map(function(p) {
    var inv = p.supplier_invoice_id ? invoices.find(function(i){return i.id===p.supplier_invoice_id;}) : null;
    var acc = p.account_id ? accounts.find(function(a){return a.id===p.account_id;}) : null;
    var proj = projects.find(function(pr){return pr.id===p.project_id;});
    return '<tr style="cursor:pointer" onclick="cprovPaymentDetail(\'' + p.id + '\')" title="Ver detalle">' +
      '<td><strong>' + (p.number || '—') + '</strong></td>' +
      '<td>' + fmtDate(p.date) + '</td>' +
      '<td>' +
        (inv
          ? '<span style="font-size:12px;color:var(--primary);cursor:pointer" onclick="event.stopPropagation();cprovInvoiceDetail(\'' + inv.id + '\')">' +
              '<i class="fas fa-file-invoice" style="margin-right:4px"></i>' + (inv.number || inv.id.slice(0,8)) +
            '</span>'
          : '<span style="color:var(--text-muted);font-size:12px">—</span>') +
      '</td>' +
      '<td style="font-size:12px">' + (acc ? acc.name + ' <span style="color:var(--text-muted)">(' + (acc.currency || 'ARS') + ')</span>' : '—') + '</td>' +
      '<td style="font-size:12px;color:var(--text-muted)">' + (proj ? proj.name : '—') + '</td>' +
      '<td class="number-cell">' + fmtMoney(p.gross_amount || 0) + '</td>' +
      '<td class="number-cell" style="color:var(--warning)">' + fmtMoney(p.total_retentions || 0) + '</td>' +
      '<td class="number-cell"><strong>' + fmtMoney(p.net_amount || 0) + '</strong></td>' +
      '<td><span class="badge ' + (stColors[p.status] || 'badge-gray') + '">' + (stLabels[p.status] || p.status) + '</span></td>' +
      '<td><i class="fas fa-chevron-right" style="color:var(--text-muted);font-size:11px"></i></td>' +
    '</tr>';
  }).join('');

  return '<div class="card" style="padding:0"><table class="table">' +
    '<thead><tr><th>N° Orden</th><th>Fecha</th><th>Factura Aplicada</th><th>Cuenta/Caja</th><th>Proyecto</th>' +
    '<th class="text-right">Bruto</th><th class="text-right">Retenciones</th><th class="text-right">Neto</th>' +
    '<th>Estado</th><th></th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table></div>';
}

// ---- DETAIL MODALS ----
function cprovInvoiceDetail(invoiceId) {
  var inv = DB.getById('supplierInvoices', invoiceId);
  if (!inv) return;
  var supplier = DB.getById('suppliers', inv.supplier_id);
  var project  = DB.getById('projects', inv.project_id);

  var rets = Array.isArray(inv.taxes) ? inv.taxes : [];
  var retsHtml = rets.length
    ? rets.map(function(t) {
        return '<tr><td>' + (t.name||t.type||'—') + '</td><td class="number-cell">' + fmtMoney(t.amount||0) + '</td></tr>';
      }).join('')
    : '<tr><td colspan="2" style="color:var(--text-muted);font-size:12px">Sin impuestos adicionales</td></tr>';

  var effectiveStatus = (inv.status !== 'paid' && inv.due_date && inv.due_date < todayStr()) ? 'Vencida' : (inv.status === 'paid' ? 'Pagada' : 'Pendiente');
  var statusColor = effectiveStatus === 'Vencida' ? 'badge-red' : (effectiveStatus === 'Pagada' ? 'badge-green' : 'badge-yellow');

  var body =
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:8px">' +
      '<div>' +
        '<div style="font-size:20px;font-weight:700">' + (inv.number || 'Sin número') + '</div>' +
        '<div style="font-size:13px;color:var(--text-muted)">' + (inv.tipo_comprobante || 'Factura') + '</div>' +
      '</div>' +
      '<span class="badge ' + statusColor + '" style="font-size:13px;padding:6px 12px">' + effectiveStatus + '</span>' +
    '</div>' +
    '<div class="form-grid" style="margin-bottom:16px">' +
      '<div><span style="font-size:11px;color:var(--text-muted)">PROVEEDOR</span><div style="font-weight:600">' + (supplier ? supplier.name : '—') + '</div></div>' +
      '<div><span style="font-size:11px;color:var(--text-muted)">PROYECTO</span><div>' + (project ? project.name : '—') + '</div></div>' +
      '<div><span style="font-size:11px;color:var(--text-muted)">FECHA</span><div>' + fmtDate(inv.date) + '</div></div>' +
      '<div><span style="font-size:11px;color:var(--text-muted)">VENCIMIENTO</span><div style="color:' + (effectiveStatus==='Vencida'?'var(--danger)':'') + '">' + (inv.due_date ? fmtDate(inv.due_date) : '—') + '</div></div>' +
    '</div>' +
    '<table class="table" style="margin-bottom:0">' +
      '<thead><tr><th>Concepto</th><th class="text-right">Importe</th></tr></thead>' +
      '<tbody>' +
        '<tr><td>Subtotal (neto)</td><td class="number-cell">' + fmtMoney(inv.subtotal || 0) + '</td></tr>' +
        '<tr><td>IVA ' + (inv.iva_rate ? inv.iva_rate + '%' : '') + '</td><td class="number-cell">' + fmtMoney(inv.tax || 0) + '</td></tr>' +
        (inv.perc_iva ? '<tr><td>Perc. IVA</td><td class="number-cell">' + fmtMoney(inv.perc_iva) + '</td></tr>' : '') +
        (inv.perc_iibb ? '<tr><td>Perc. IIBB</td><td class="number-cell">' + fmtMoney(inv.perc_iibb) + '</td></tr>' : '') +
        retsHtml +
        '<tr style="background:var(--bg)"><td><strong>TOTAL</strong></td><td class="number-cell"><strong style="font-size:16px">' + fmtMoney(inv.total || 0) + '</strong></td></tr>' +
      '</tbody>' +
    '</table>' +
    (inv.notes ? '<div style="margin-top:12px;padding:10px;background:var(--bg);border-radius:var(--radius-sm);font-size:12px;color:var(--text-muted)"><i class="fas fa-sticky-note" style="margin-right:6px"></i>' + inv.notes + '</div>' : '');

  openModal('Detalle de Factura', body, 'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
}

function cprovPaymentDetail(paymentId) {
  var p = DB.getById('paymentOrders', paymentId);
  if (!p) return;
  var supplier = DB.getById('suppliers', p.supplier_id);
  var inv      = p.supplier_invoice_id ? DB.getById('supplierInvoices', p.supplier_invoice_id) : null;
  var acc      = p.account_id ? DB.getById('bankAccounts', p.account_id) : null;
  var project  = DB.getById('projects', p.project_id);

  var stColors = { draft:'badge-gray', pending:'badge-yellow', paid:'badge-green', cancelled:'badge-red' };
  var stLabels = { draft:'Borrador', pending:'Pendiente', paid:'Pagado', cancelled:'Cancelado' };

  var rets = Array.isArray(p.retentions) ? p.retentions : [];
  var retsHtml = rets.length
    ? rets.map(function(r) {
        return '<tr><td>' + (r.name||r.type||'—') + '</td><td class="number-cell" style="color:var(--warning)">' + fmtMoney(r.amount||0) + '</td></tr>';
      }).join('')
    : '<tr><td colspan="2" style="color:var(--text-muted);font-size:12px">Sin retenciones</td></tr>';

  var body =
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:8px">' +
      '<div>' +
        '<div style="font-size:20px;font-weight:700">' + (p.number || 'Sin número') + '</div>' +
        '<div style="font-size:13px;color:var(--text-muted)">Orden de Pago</div>' +
      '</div>' +
      '<span class="badge ' + (stColors[p.status] || 'badge-gray') + '" style="font-size:13px;padding:6px 12px">' + (stLabels[p.status] || p.status) + '</span>' +
    '</div>' +
    '<div class="form-grid" style="margin-bottom:16px">' +
      '<div><span style="font-size:11px;color:var(--text-muted)">PROVEEDOR</span><div style="font-weight:600">' + (supplier ? supplier.name : '—') + '</div></div>' +
      '<div><span style="font-size:11px;color:var(--text-muted)">FECHA DE PAGO</span><div>' + fmtDate(p.date) + '</div></div>' +
      '<div><span style="font-size:11px;color:var(--text-muted)">CUENTA / CAJA</span><div>' + (acc ? acc.name + ' (' + (acc.currency||'ARS') + ')' : '—') + '</div></div>' +
      '<div><span style="font-size:11px;color:var(--text-muted)">PROYECTO</span><div>' + (project ? project.name : '—') + '</div></div>' +
    '</div>' +
    // Invoice applied
    (inv
      ? '<div style="padding:12px 16px;background:var(--primary-muted,#eff6ff);border-radius:var(--radius-sm);border:1px solid var(--primary-light,#bfdbfe);margin-bottom:16px;cursor:pointer" onclick="closeModal();setTimeout(function(){cprovInvoiceDetail(\'' + inv.id + '\')},100)">' +
          '<div style="font-size:11px;color:var(--primary);font-weight:600;margin-bottom:4px">FACTURA APLICADA</div>' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<div><i class="fas fa-file-invoice" style="margin-right:6px;color:var(--primary)"></i><strong>' + (inv.number || '—') + '</strong>' +
              '<span style="font-size:12px;color:var(--text-muted);margin-left:8px">' + fmtDate(inv.date) + '</span></div>' +
            '<div style="font-weight:700;color:var(--primary)">' + fmtMoney(inv.total || 0) + ' <i class="fas fa-arrow-right" style="font-size:10px"></i></div>' +
          '</div>' +
        '</div>'
      : '<div style="padding:10px;background:var(--bg);border-radius:var(--radius-sm);margin-bottom:16px;font-size:12px;color:var(--text-muted)"><i class="fas fa-info-circle" style="margin-right:6px"></i>Sin factura específica aplicada</div>') +
    // Amounts breakdown
    '<table class="table" style="margin-bottom:0">' +
      '<thead><tr><th>Concepto</th><th class="text-right">Importe</th></tr></thead>' +
      '<tbody>' +
        '<tr><td>Importe Bruto</td><td class="number-cell">' + fmtMoney(p.gross_amount || 0) + '</td></tr>' +
        retsHtml +
        '<tr style="background:var(--bg)"><td><strong>NETO A PAGAR</strong></td><td class="number-cell"><strong style="font-size:16px;color:var(--success)">' + fmtMoney(p.net_amount || 0) + '</strong></td></tr>' +
      '</tbody>' +
    '</table>' +
    (p.notes ? '<div style="margin-top:12px;padding:10px;background:var(--bg);border-radius:var(--radius-sm);font-size:12px;color:var(--text-muted)"><i class="fas fa-sticky-note" style="margin-right:6px"></i>' + p.notes + '</div>' : '');

  openModal('Detalle de Pago', body, 'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
}

// =====================================================================
// CUENTAS CORRIENTES CLIENTES (COMPRADORES INMOBILIARIOS)
// Collections: ventasUnidades, cobrosVentas, unidades, projects
// =====================================================================

var _ccliSelectedId = null;

function renderCuentasCli() {
  _ccliSelectedId = null;
  var ventas = DB.getAll('ventasUnidades');
  var cobros = DB.getAll('cobrosVentas');
  var units  = DB.getAll('unidades');
  var projects = DB.getAll('projects');

  var totalVendido = 0, totalCobrado = 0;
  var rows = '';
  var today = todayStr();

  ventas.forEach(function(v) {
    var unit = units.find(function(u) { return u.id === v.unit_id; });
    var proj = unit ? projects.find(function(p) { return p.id === unit.project_id; }) : null;
    var ventaCobros = cobros.filter(function(c) { return c.sale_id === v.id; });
    var cobrado = ventaCobros.reduce(function(s, c) { return s + (c.amount || 0); }, 0);
    var saldo = (v.sale_price || 0) - cobrado;
    totalVendido += v.sale_price || 0;
    totalCobrado += cobrado;

    var insts = v.installments || [];
    var vencidas = insts.filter(function(i) { return i.status !== 'paid' && i.due_date < today; }).length;
    var proximas = insts.filter(function(i) { return i.status !== 'paid' && i.due_date >= today; }).length;

    var stBadge = saldo <= 0
      ? '<span class="badge badge-green">Saldado</span>'
      : (vencidas > 0
          ? '<span class="badge badge-red">' + vencidas + ' vencida' + (vencidas > 1 ? 's' : '') + '</span>'
          : '<span class="badge badge-yellow">' + proximas + ' pendiente' + (proximas !== 1 ? 's' : '') + '</span>');

    var isSelected = _ccliSelectedId === v.id;
    rows +=
      '<tr style="cursor:pointer;' + (isSelected ? 'background:var(--primary-light,rgba(59,130,246,0.06))' : '') + '" onclick="ccliSelectRow(\'' + v.id + '\')">' +
        '<td><b>' + (v.buyer_name || '—') + '</b>' +
          '<div style="font-size:11px;color:var(--text-muted)">' + (v.buyer_doc_type || '') + ' ' + (v.buyer_doc || '') + '</div>' +
        '</td>' +
        '<td>' + (unit ? unit.number : '—') + '<div style="font-size:11px;color:var(--text-muted)">' + (proj ? proj.name : '') + '</div></td>' +
        '<td>' + fmtMoney(v.list_price || 0, v.currency) + '</td>' +
        '<td><b>' + fmtMoney(v.sale_price || 0, v.currency) + '</b></td>' +
        '<td style="color:var(--success)">' + fmtMoney(cobrado, v.currency) + '</td>' +
        '<td style="color:' + (saldo > 0 ? 'var(--danger)' : 'var(--success)') + '">' + fmtMoney(saldo, v.currency) + '</td>' +
        '<td>' + stBadge + '</td>' +
        '<td style="white-space:nowrap;">' +
          '<button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();ccliSelectRow(\'' + v.id + '\')">' +
            '<i class="fas fa-list-ol"></i>' +
          '</button>' +
        '</td>' +
      '</tr>';
  });

  if (!rows) {
    rows = '<tr><td colspan="8"><div class="empty-state" style="padding:40px"><i class="fas fa-users"></i><p>No hay cuentas corrientes. Crea una nueva.</p></div></td></tr>';
  }

  var totalSaldo = totalVendido - totalCobrado;

  document.getElementById('content').innerHTML =
    '<div class="page-header"><div>' +
      '<div class="page-title"><i class="fas fa-users-between-lines" style="margin-right:8px;color:var(--primary)"></i>Cuentas Corrientes Clientes</div>' +
      '<div class="page-subtitle">Ventas de unidades, condiciones de pago y cobranzas</div>' +
    '</div>' +
    '<button class="btn btn-primary" onclick="ccliNuevaCuenta()"><i class="fas fa-plus"></i> Nueva Cuenta Corriente</button>' +
    '</div>' +

    '<div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap;">' +
      '<div class="card" style="flex:1;min-width:130px;padding:16px;text-align:center;">' +
        '<div style="font-size:22px;font-weight:700;color:var(--primary)">' + ventas.length + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted)">Cuentas abiertas</div>' +
      '</div>' +
      '<div class="card" style="flex:1;min-width:130px;padding:16px;text-align:center;">' +
        '<div style="font-size:22px;font-weight:700;">' + fmtMoney(totalVendido) + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted)">Total vendido</div>' +
      '</div>' +
      '<div class="card" style="flex:1;min-width:130px;padding:16px;text-align:center;">' +
        '<div style="font-size:22px;font-weight:700;color:var(--success)">' + fmtMoney(totalCobrado) + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted)">Total cobrado</div>' +
      '</div>' +
      '<div class="card" style="flex:1;min-width:130px;padding:16px;text-align:center;">' +
        '<div style="font-size:22px;font-weight:700;color:' + (totalSaldo > 0 ? 'var(--danger)' : 'var(--success)') + '">' + fmtMoney(totalSaldo) + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted)">Saldo pendiente</div>' +
      '</div>' +
    '</div>' +

    '<div class="card" style="padding:0;">' +
      '<table class="table">' +
        '<thead><tr>' +
          '<th>Comprador</th><th>Unidad</th><th>Precio Lista</th><th>Precio Cerrado</th>' +
          '<th>Cobrado</th><th>Saldo</th><th>Estado</th><th></th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>' +
    '<div id="ccli-detail-panel" style="margin-top:20px"></div>';

  if (_ccliSelectedId) ccliRenderDetail(_ccliSelectedId);
}

function ccliSelectRow(saleId) {
  _ccliSelectedId = (_ccliSelectedId === saleId) ? null : saleId;
  renderCuentasCli();
}

function ccliRenderDetail(saleId) {
  var venta = DB.getById('ventasUnidades', saleId);
  if (!venta) return;
  var cobros = DB.getAll('cobrosVentas').filter(function(c) { return c.sale_id === saleId; });
  var unit = DB.getById('unidades', venta.unit_id);
  var today = todayStr();
  var insts = venta.installments || [];

  var totalCobrado = cobros.reduce(function(s, c) { return s + (c.amount || 0); }, 0);
  var saldo = (venta.sale_price || 0) - totalCobrado;

  var rows = insts.map(function(inst) {
    var cobro = cobros.find(function(c) { return c.installment_id === inst.id; });
    var isOverdue = inst.status !== 'paid' && inst.due_date < today;
    var stHtml = inst.status === 'paid'
      ? '<span class="badge badge-green">Pagado</span>'
      : (isOverdue ? '<span class="badge badge-red">Vencido</span>' : '<span class="badge badge-yellow">Pendiente</span>');
    return '<tr' + (isOverdue ? ' style="background:rgba(239,68,68,0.04)"' : '') + '>' +
      '<td>' + inst.number + '</td>' +
      '<td>' + (inst.concept || '') + '</td>' +
      '<td>' + fmtDate(inst.due_date) + '</td>' +
      '<td>' + fmtMoney(inst.amount, venta.currency) + '</td>' +
      '<td>' + stHtml + '</td>' +
      '<td>' + (cobro ? fmtDate(cobro.date) : '—') + '</td>' +
      '<td>' + (cobro ? fmtMoney(cobro.amount, venta.currency) : '—') + '</td>' +
      '<td>' +
        (inst.status !== 'paid'
          ? '<button class="btn btn-sm btn-primary" onclick="ccliRegistrarCobro(\'' + saleId + '\',\'' + inst.id + '\',' + inst.amount + ',\'' + (venta.currency || 'ARS') + '\')"><i class="fas fa-dollar-sign"></i> Cobrar</button>'
          : '') +
      '</td>' +
    '</tr>';
  }).join('');

  var panel = document.getElementById('ccli-detail-panel');
  if (!panel) return;
  panel.innerHTML =
    '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
        '<div>' +
          '<b style="font-size:15px;">' + (venta.buyer_name || '') + '</b>' +
          (unit ? '<span style="font-size:12px;color:var(--text-muted);margin-left:12px">Unidad ' + unit.number + '</span>' : '') +
          '<span style="font-size:12px;color:var(--text-muted);margin-left:12px">Contrato: ' + (venta.contract_number || '') + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:12px;font-size:13px;align-items:center;">' +
          '<span>Vendido: <b>' + fmtMoney(venta.sale_price, venta.currency) + '</b></span>' +
          '<span style="color:var(--success)">Cobrado: <b>' + fmtMoney(totalCobrado, venta.currency) + '</b></span>' +
          '<span style="color:' + (saldo > 0 ? 'var(--danger)' : 'var(--success)') + '">Saldo: <b>' + fmtMoney(saldo, venta.currency) + '</b></span>' +
          '<button class="btn btn-sm btn-secondary" onclick="_ccliSelectedId=null;document.getElementById(\'ccli-detail-panel\').innerHTML=\'\'">Cerrar</button>' +
        '</div>' +
      '</div>' +
      '<table class="table">' +
        '<thead><tr><th>#</th><th>Concepto</th><th>Vencimiento</th><th>Importe</th><th>Estado</th><th>F. Pago</th><th>Cobrado</th><th></th></tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">Sin cuotas</td></tr>') + '</tbody>' +
      '</table>' +
    '</div>';
}

function ccliNuevaCuenta() {
  var availableUnits = DB.getAll('unidades').filter(function(u) { return u.status === 'available'; });
  var projects = DB.getAll('projects');
  var currencies = DB.getAllCurrencies() || [];
  var today = todayStr();

  var unitOptions = '<option value="">— Seleccionar unidad —</option>' +
    availableUnits.map(function(u) {
      var proj = projects.find(function(p) { return p.id === u.project_id; });
      var desc = (proj ? proj.name + ' — ' : '') + 'Unidad ' + u.number;
      if (u.area) desc += ' (' + u.area + 'm2';
      if (u.rooms) desc += ', ' + u.rooms + ' amb';
      if (u.area || u.rooms) desc += ')';
      desc += ' | ' + fmtMoney(u.list_price, u.currency);
      return '<option value="' + u.id + '" data-price="' + (u.list_price || 0) + '" data-currency="' + (u.currency || 'USD') + '">' + desc + '</option>';
    }).join('');

  var clientes = DB.getAll('clientes');
  var clienteOptions = '<option value="">— Seleccionar cliente existente —</option>' +
    clientes.map(function(c) {
      return '<option value="' + c.id + '" data-name="' + (c.name || '') + '" data-doctype="' + (c.doc_type || '') + '" data-docnum="' + (c.doc_number || '') + '" data-phone="' + (c.phone || '') + '" data-email="' + (c.email || '') + '">' +
        c.name + (c.doc_number ? ' — ' + c.doc_type + ' ' + c.doc_number : '') +
      '</option>';
    }).join('');

  var body =
    '<div class="form-group" style="margin-bottom:16px;padding:12px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border)">' +
      '<label style="font-size:12px;font-weight:600;color:var(--primary)">Seleccionar cliente del directorio</label>' +
      '<div style="display:flex;gap:8px;margin-top:6px;">' +
        '<select id="ccli-cliente-sel" class="form-control" onchange="ccliOnClienteChange(this)" style="flex:1">' + clienteOptions + '</select>' +
        '<button class="btn btn-sm btn-secondary" onclick="ccliNuevoClienteInline()" type="button"><i class="fas fa-plus"></i> Nuevo</button>' +
      '</div>' +
    '</div>' +
    '<div class="form-grid">' +
      '<div class="form-group" style="grid-column:1/-1">' +
        '<label>Unidad *</label>' +
        '<select id="ccli-unit" class="form-control" onchange="ccliOnUnitChange(this)">' + unitOptions + '</select>' +
      '</div>' +
      '<div class="form-group"><label>Precio de Lista</label>' +
        '<input type="number" id="ccli-list-price" class="form-control" readonly style="background:var(--bg-muted,#f9f9f9)"></div>' +
      '<div class="form-group"><label>Precio Cerrado *</label>' +
        '<input type="number" id="ccli-sale-price" class="form-control" placeholder="Precio negociado"></div>' +
      '<div class="form-group"><label>Moneda</label>' +
        '<select id="ccli-currency" class="form-control">' +
          currencies.map(function(c) { return '<option value="' + c.id + '"' + (c.id === 'USD' ? ' selected' : '') + '>' + c.id + '</option>'; }).join('') +
        '</select></div>' +
    '</div>' +
    '<hr style="margin:16px 0;border:none;border-top:1px solid var(--border)">' +
    '<b style="font-size:13px;">Datos del Comprador</b>' +
    '<div class="form-grid" style="margin-top:12px;">' +
      '<div class="form-group"><label>Nombre completo *</label>' +
        '<input type="text" id="ccli-buyer" class="form-control" placeholder="Nombre y apellido"></div>' +
      '<div class="form-group"><label>Tipo Doc.</label>' +
        '<select id="ccli-doctype" class="form-control"><option>DNI</option><option>CUIT</option><option>PASSPORT</option></select></div>' +
      '<div class="form-group"><label>N° Documento</label>' +
        '<input type="text" id="ccli-docnum" class="form-control"></div>' +
      '<div class="form-group"><label>Telefono</label>' +
        '<input type="text" id="ccli-phone" class="form-control"></div>' +
      '<div class="form-group"><label>Email</label>' +
        '<input type="email" id="ccli-email" class="form-control"></div>' +
      '<div class="form-group"><label>Fecha de venta</label>' +
        '<input type="date" id="ccli-date" class="form-control" value="' + today + '"></div>' +
    '</div>' +
    '<hr style="margin:16px 0;border:none;border-top:1px solid var(--border)">' +
    '<b style="font-size:13px;">Condiciones de Venta</b>' +
    '<div class="form-grid" style="margin-top:12px;">' +
      '<div class="form-group"><label>Forma de pago</label>' +
        '<select id="ccli-paytype" class="form-control" onchange="ccliToggleInstFields(this.value)">' +
          '<option value="cash">Contado</option>' +
          '<option value="mixed" selected>Seña + Cuotas</option>' +
          '<option value="installments">Plan de Cuotas</option>' +
        '</select></div>' +
    '</div>' +
    '<div id="ccli-inst-fields">' +
      '<div class="form-grid">' +
        '<div class="form-group"><label>Seña / Anticipo</label>' +
          '<input type="number" id="ccli-down" class="form-control" placeholder="0"></div>' +
        '<div class="form-group"><label>Fecha seña</label>' +
          '<input type="date" id="ccli-down-date" class="form-control" value="' + today + '"></div>' +
        '<div class="form-group"><label>Cantidad de cuotas</label>' +
          '<input type="number" id="ccli-n" class="form-control" placeholder="Ej: 24" min="1"></div>' +
        '<div class="form-group"><label>Primera cuota</label>' +
          '<input type="date" id="ccli-start" class="form-control" value="' + today + '"></div>' +
      '</div>' +
    '</div>' +
    '<div class="form-group" style="margin-top:12px;">' +
      '<label>Condiciones / Observaciones</label>' +
      '<textarea id="ccli-notes" class="form-control" rows="2" placeholder="Condiciones especiales, ajuste por indice, etc."></textarea>' +
    '</div>';

  openModal('Nueva Cuenta Corriente', body, 'modal-xl',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="ccliGuardarCuenta()"><i class="fas fa-save"></i> Crear Cuenta Corriente</button>'
  );

  setTimeout(function() { ccliToggleInstFields('mixed'); }, 50);
}

function ccliOnClienteChange(sel) {
  var opt = sel.options[sel.selectedIndex];
  if (!opt || !opt.value) return;
  var fields = { 'ccli-buyer': 'data-name', 'ccli-doctype': 'data-doctype', 'ccli-docnum': 'data-docnum', 'ccli-phone': 'data-phone', 'ccli-email': 'data-email' };
  Object.keys(fields).forEach(function(fid) {
    var el = document.getElementById(fid);
    if (el) el.value = opt.getAttribute(fields[fid]) || '';
  });
}

function ccliNuevoClienteInline() {
  var sub = document.createElement('div');
  sub.id = 'ccli-inline-cliente';
  sub.style.cssText = 'margin-top:8px;padding:12px;border:1px dashed var(--primary);border-radius:var(--radius-sm);background:var(--bg)';
  sub.innerHTML =
    '<b style="font-size:12px;color:var(--primary)">Crear nuevo cliente</b>' +
    '<div class="form-grid" style="margin-top:8px">' +
      '<div class="form-group"><label>Nombre *</label><input type="text" id="ccli-nc-name" class="form-control"></div>' +
      '<div class="form-group"><label>Tipo Doc.</label><select id="ccli-nc-doctype" class="form-control"><option>DNI</option><option>CUIT</option><option>PASSPORT</option></select></div>' +
      '<div class="form-group"><label>N° Doc.</label><input type="text" id="ccli-nc-docnum" class="form-control"></div>' +
      '<div class="form-group"><label>Telefono *</label><input type="text" id="ccli-nc-phone" class="form-control" placeholder="+54 11 1234-5678"></div>' +
      '<div class="form-group"><label>Email *</label><input type="email" id="ccli-nc-email" class="form-control" placeholder="correo@ejemplo.com"></div>' +
    '</div>' +
    '<button class="btn btn-sm btn-primary" onclick="ccliCrearYUsarCliente()" type="button"><i class="fas fa-save"></i> Crear y usar</button>' +
    '<button class="btn btn-sm btn-secondary" onclick="document.getElementById(\'ccli-inline-cliente\').remove()" type="button" style="margin-left:8px">Cancelar</button>';
  var sel = document.getElementById('ccli-cliente-sel');
  if (sel && sel.parentNode) sel.parentNode.parentNode.appendChild(sub);
}

function ccliCrearYUsarCliente() {
  var g = function(id) { return (document.getElementById(id) || {}).value || ''; };
  var name = g('ccli-nc-name').trim();
  var phone = g('ccli-nc-phone').trim();
  var email = g('ccli-nc-email').trim();
  if (!name) { toast('Ingrese el nombre', 'error'); return; }
  if (!phone) { toast('El telefono es obligatorio', 'error'); return; }
  if (!email) { toast('El email es obligatorio', 'error'); return; }
  var saved = DB.insert('clientes', {
    name: name,
    doc_type: g('ccli-nc-doctype'),
    doc_number: g('ccli-nc-docnum'),
    phone: g('ccli-nc-phone'),
    email: g('ccli-nc-email'),
  });
  // Fill buyer fields
  var fill = { 'ccli-buyer': name, 'ccli-doctype': g('ccli-nc-doctype'), 'ccli-docnum': g('ccli-nc-docnum'), 'ccli-phone': g('ccli-nc-phone'), 'ccli-email': g('ccli-nc-email') };
  Object.keys(fill).forEach(function(fid) {
    var el = document.getElementById(fid);
    if (el) el.value = fill[fid];
  });
  // Update selector
  var sel = document.getElementById('ccli-cliente-sel');
  if (sel) {
    var opt = document.createElement('option');
    opt.value = saved.id;
    opt.selected = true;
    opt.setAttribute('data-name', name);
    opt.textContent = name + (saved.doc_number ? ' — ' + saved.doc_type + ' ' + saved.doc_number : '');
    sel.appendChild(opt);
    sel.value = saved.id;
  }
  var inline = document.getElementById('ccli-inline-cliente');
  if (inline) inline.remove();
  toast('Cliente creado', 'success');
}

function ccliOnUnitChange(sel) {
  var opt = sel.options[sel.selectedIndex];
  var price = opt ? (parseFloat(opt.getAttribute('data-price')) || 0) : 0;
  var cur = opt ? (opt.getAttribute('data-currency') || 'USD') : 'USD';
  var lp = document.getElementById('ccli-list-price');
  var sp = document.getElementById('ccli-sale-price');
  var cu = document.getElementById('ccli-currency');
  if (lp) lp.value = price || '';
  if (sp && !sp.value) sp.value = price || '';
  if (cu && cur) cu.value = cur;
}

function ccliToggleInstFields(payType) {
  var el = document.getElementById('ccli-inst-fields');
  if (el) el.style.display = (payType === 'cash') ? 'none' : '';
}

function ccliGuardarCuenta() {
  var g = function(id) { return (document.getElementById(id) || {}).value || ''; };
  var unitId = g('ccli-unit');
  var buyerName = g('ccli-buyer').trim();
  var salePrice = parseFloat(g('ccli-sale-price')) || 0;
  var listPrice = parseFloat(g('ccli-list-price')) || 0;
  var saleDate = g('ccli-date');
  var payType = g('ccli-paytype') || 'cash';

  if (!unitId) { toast('Seleccione una unidad', 'error'); return; }
  if (!buyerName) { toast('Ingrese el nombre del comprador', 'error'); return; }
  if (!salePrice) { toast('Ingrese el precio cerrado', 'error'); return; }

  // Build installment schedule
  var installments = [];
  if (payType === 'cash') {
    installments = [{ id: uuid(), number: 1, concept: 'Pago contado', due_date: saleDate, amount: salePrice, status: 'pending' }];
  } else {
    var down = parseFloat(g('ccli-down')) || 0;
    var downDate = g('ccli-down-date') || saleDate;
    var n = parseInt(g('ccli-n')) || 1;
    var startDate = g('ccli-start') || saleDate;
    var remaining = salePrice - down;
    var installAmt = n > 0 ? Math.round(remaining / n) : remaining;
    if (down > 0) {
      installments.push({ id: uuid(), number: 0, concept: 'Seña / Anticipo', due_date: downDate, amount: down, status: 'pending' });
    }
    for (var i = 1; i <= n; i++) {
      var dDate = ccliAddMonths(startDate, i - 1);
      var amt = (i === n) ? (remaining - installAmt * (n - 1)) : installAmt;
      installments.push({ id: uuid(), number: i, concept: 'Cuota ' + i + '/' + n, due_date: dDate, amount: amt, status: 'pending' });
    }
  }

  var ventas = DB.getAll('ventasUnidades');
  var contratNum = 'CCC-' + new Date().getFullYear() + '-' + String(ventas.length + 1).padStart(3, '0');

  DB.insert('ventasUnidades', {
    unit_id: unitId,
    contract_number: contratNum,
    buyer_client_id: g('ccli-cliente-sel') || null,
    buyer_name: buyerName,
    buyer_doc_type: g('ccli-doctype'),
    buyer_doc: g('ccli-docnum'),
    buyer_phone: g('ccli-phone'),
    buyer_email: g('ccli-email'),
    sale_date: saleDate,
    currency: g('ccli-currency') || 'USD',
    list_price: listPrice,
    sale_price: salePrice,
    payment_type: payType,
    installments: installments,
    status: 'active',
    notes: g('ccli-notes'),
  });

  // Mark unit as sold
  DB.update('unidades', unitId, { status: 'sold' });

  closeModal();
  toast('Cuenta corriente creada. Unidad marcada como vendida.', 'success');
  renderCuentasCli();
}

function ccliRegistrarCobro(saleId, installmentId, amount, currency) {
  var currencies = DB.getAllCurrencies() || [];
  var body =
    '<div class="form-grid">' +
      '<div class="form-group"><label>Fecha *</label><input type="date" id="ccp-date" class="form-control" value="' + todayStr() + '"></div>' +
      '<div class="form-group"><label>Importe *</label><input type="number" id="ccp-amount" class="form-control" value="' + amount + '"></div>' +
      '<div class="form-group"><label>Moneda</label><select id="ccp-currency" class="form-control">' +
        currencies.map(function(c) { return '<option value="' + c.id + '"' + (c.id === currency ? ' selected' : '') + '>' + c.id + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="form-group"><label>Forma de cobro</label><select id="ccp-method" class="form-control">' +
        '<option value="transfer">Transferencia</option><option value="check">Cheque</option>' +
        '<option value="cash">Efectivo</option><option value="card">Tarjeta</option>' +
      '</select></div>' +
    '</div>' +
    '<div class="form-group"><label>Referencia</label><input type="text" id="ccp-ref" class="form-control"></div>' +
    '<div class="form-group"><label>Notas</label><textarea id="ccp-notes" class="form-control" rows="2"></textarea></div>';

  openModal('Registrar Cobro', body, 'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="ccliConfirmarCobro(\'' + saleId + '\',\'' + installmentId + '\')"><i class="fas fa-check"></i> Confirmar</button>'
  );
}

function ccliConfirmarCobro(saleId, installmentId) {
  var g = function(id) { return (document.getElementById(id) || {}).value || ''; };
  var cobDate = g('ccp-date');
  var cobAmt = parseFloat(g('ccp-amount')) || 0;
  if (!cobDate || !cobAmt) { toast('Complete fecha e importe', 'error'); return; }

  DB.insert('cobrosVentas', {
    sale_id: saleId, installment_id: installmentId,
    date: cobDate, amount: cobAmt,
    currency: g('ccp-currency'), method: g('ccp-method'),
    reference: g('ccp-ref'), notes: g('ccp-notes'),
  });

  // Mark installment as paid
  var venta = DB.getById('ventasUnidades', saleId);
  if (venta && venta.installments) {
    DB.update('ventasUnidades', saleId, {
      installments: venta.installments.map(function(i) {
        return i.id === installmentId ? Object.assign({}, i, { status: 'paid', paid_date: cobDate, paid_amount: cobAmt }) : i;
      })
    });
  }

  // Auto journal entry
  try { autoJournalEntry('cobro_cliente', cobAmt, cobDate, g('ccp-ref') || saleId.slice(0,8), 'Cobro cuota CCC'); } catch(e) {}

  // Check if all paid → complete
  var updated = DB.getById('ventasUnidades', saleId);
  if (updated && updated.installments && updated.installments.every(function(i) { return i.status === 'paid'; })) {
    DB.update('ventasUnidades', saleId, { status: 'completed' });
  }

  closeModal();
  _ccliSelectedId = saleId;
  toast('Cobro registrado', 'success');
  renderCuentasCli();
}

function ccliAddMonths(dateStr, months) {
  if (!dateStr) return dateStr;
  var d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

// =====================================================================
// CASH FLOW CLIENTES
// Collections: invoices, collections, cashflowProjections
// =====================================================================

function renderCashflowCli() {
  var invoices = DB.getAll('invoices');
  var collections = DB.getAll('collections');
  var projections = DB.getAll('cashflowProjections');
  var projects = DB.getAll('projects');

  // Build month buckets
  var monthMap = {};

  function getMonthKey(dateStr) {
    if (!dateStr) return 'Sin fecha';
    return dateStr.substring(0, 7); // YYYY-MM
  }

  function ensureMonth(key) {
    if (!monthMap[key]) {
      monthMap[key] = { key: key, facturado: 0, cobrado: 0, proyectado: 0 };
    }
  }

  // Pending/overdue invoices -> proyectado
  invoices.forEach(function(inv) {
    if (inv.status === 'sent' || inv.status === 'overdue') {
      var mk = getMonthKey(inv.due_date || inv.date);
      ensureMonth(mk);
      monthMap[mk].facturado += inv.total || 0;
    }
  });

  // Collections -> cobrado
  collections.forEach(function(col) {
    var mk = getMonthKey(col.date);
    ensureMonth(mk);
    monthMap[mk].cobrado += col.amount || 0;
  });

  // Cashflow projections income -> proyectado
  projections.filter(function(p) { return p.type === 'income'; }).forEach(function(p) {
    var mk = getMonthKey(p.expected_date);
    ensureMonth(mk);
    monthMap[mk].proyectado += (p.amount || 0) * ((p.probability || 100) / 100);
  });

  var months = Object.keys(monthMap).sort();

  var monthNames = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
  };

  function fmtMonth(mk) {
    var parts = mk.split('-');
    return (monthNames[parts[1]] || parts[1]) + ' ' + parts[0];
  }

  var rows = '';
  var acumCobrado = 0;
  months.forEach(function(mk) {
    var m = monthMap[mk];
    acumCobrado += m.cobrado;
    var pctBadge = m.facturado > 0
      ? '<span class="badge badge-' + (m.cobrado >= m.facturado ? 'green' : 'yellow') + '">' +
          Math.round((m.cobrado / m.facturado) * 100) + '%</span>'
      : '-';

    rows +=
      '<tr>' +
        '<td><strong>' + fmtMonth(mk) + '</strong></td>' +
        '<td class="number-cell">' + (m.facturado ? fmtMoney(m.facturado) : '-') + '</td>' +
        '<td class="number-cell">' + (m.cobrado ? fmtMoney(m.cobrado) : '-') + '</td>' +
        '<td class="number-cell">' + (m.proyectado ? fmtMoney(m.proyectado) : '-') + '</td>' +
        '<td class="number-cell">' + pctBadge + '</td>' +
        '<td class="number-cell"><strong>' + fmtMoney(acumCobrado) + '</strong></td>' +
      '</tr>';
  });

  if (!rows) {
    rows = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-chart-line"></i><p>Sin datos de cashflow</p></div></td></tr>';
  }

  // Summary stats
  var totalPendiente = invoices
    .filter(function(i) { return i.status === 'sent' || i.status === 'overdue'; })
    .reduce(function(s, i) { return s + (i.total || 0); }, 0);
  var totalCobrado = collections.reduce(function(s, c) { return s + (c.amount || 0); }, 0);
  var totalProyectado = projections
    .filter(function(p) { return p.type === 'income'; })
    .reduce(function(s, p) { return s + ((p.amount || 0) * ((p.probability || 100) / 100)); }, 0);

  // Projections detail table
  var projRows = '';
  projections.filter(function(p) { return p.type === 'income'; }).forEach(function(p) {
    var proj = projects.find(function(pr) { return pr.id === p.project_id; });
    projRows +=
      '<tr>' +
        '<td>' + fmtDate(p.expected_date) + '</td>' +
        '<td>' + (proj ? proj.name : '-') + '</td>' +
        '<td>' + (p.description || '-') + '</td>' +
        '<td class="number-cell">' + fmtMoney(p.amount || 0) + '</td>' +
        '<td class="number-cell">' +
          '<span class="badge badge-' + ((p.probability || 0) >= 80 ? 'green' : 'yellow') + '">' +
            (p.probability || 0) + '%' +
          '</span>' +
        '</td>' +
        '<td class="number-cell">' + fmtMoney((p.amount || 0) * ((p.probability || 100) / 100)) + '</td>' +
      '</tr>';
  });
  if (!projRows) {
    projRows = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-calendar"></i><p>Sin proyecciones</p></div></td></tr>';
  }

  document.getElementById('content').innerHTML =
    '<div class="page-header">' +
      '<div>' +
        '<div class="page-title"><i class="fas fa-money-bill-trend-up" style="margin-right:8px;color:var(--primary)"></i>Cash Flow Clientes</div>' +
        '<div class="page-subtitle">Proyeccion de ingresos y flujo de caja por cliente y proyecto</div>' +
      '</div>' +
    '</div>' +

    '<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">' +
      '<div class="stat-card">' +
        '<div class="stat-icon yellow"><i class="fas fa-clock"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalPendiente) + '</div><div class="stat-label">Por Cobrar (pendiente/vencido)</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon green"><i class="fas fa-check-circle"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalCobrado) + '</div><div class="stat-label">Cobrado Historico</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon blue"><i class="fas fa-chart-line"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalProyectado) + '</div><div class="stat-label">Proyectado Ajustado</div></div>' +
      '</div>' +
    '</div>' +

    '<div id="cf-tabs" class="tabs-container">' +
      '<div class="tabs-header">' +
        '<button class="tab-btn active" data-tab="tab-cf-resumen" onclick="cfSetTab(\'resumen\')">Resumen por Mes</button>' +
        '<button class="tab-btn" data-tab="tab-cf-proyecciones" onclick="cfSetTab(\'proyecciones\')">Proyecciones</button>' +
      '</div>' +
      '<div id="tab-cf-resumen" class="tab-content active">' +
        '<div class="card">' +
          '<div class="card-body" style="padding:0">' +
            '<div class="table-wrap">' +
              '<table>' +
                '<thead><tr>' +
                  '<th>Mes</th>' +
                  '<th class="text-right">Facturado Pendiente</th>' +
                  '<th class="text-right">Cobrado</th>' +
                  '<th class="text-right">Proyectado</th>' +
                  '<th class="text-right">% Cobrado</th>' +
                  '<th class="text-right">Cobrado Acumulado</th>' +
                '</tr></thead>' +
                '<tbody>' + rows + '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div id="tab-cf-proyecciones" class="tab-content">' +
        '<div class="card">' +
          '<div class="card-body" style="padding:0">' +
            '<div class="table-wrap">' +
              '<table>' +
                '<thead><tr>' +
                  '<th>Fecha Esperada</th><th>Proyecto</th><th>Descripcion</th>' +
                  '<th class="text-right">Monto</th><th class="text-right">Probabilidad</th><th class="text-right">Monto Ajustado</th>' +
                '</tr></thead>' +
                '<tbody>' + projRows + '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function cfSetTab(tab) {
  var tabs = ['resumen', 'proyecciones'];
  tabs.forEach(function(t) {
    var btn = document.querySelector('[data-tab="tab-cf-' + t + '"]');
    var panel = document.getElementById('tab-cf-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
    if (panel) panel.classList.toggle('active', t === tab);
  });
}
