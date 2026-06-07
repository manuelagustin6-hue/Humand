/* ===== MÓDULO: VENTAS DE UNIDADES ===== */

var _vuState = { tab: 'unidades', projectFilter: '' };

var VU_UNIT_TYPES = [
  { id: 'dept', label: 'Departamento' },
  { id: 'local', label: 'Local Comercial' },
  { id: 'parking', label: 'Cochera' },
  { id: 'storage', label: 'Deposito' },
  { id: 'house', label: 'Casa / PH' },
];

var VU_PAYMENT_TYPES = [
  { id: 'cash', label: 'Contado' },
  { id: 'installments', label: 'Plan de Cuotas' },
  { id: 'mixed', label: 'Seña + Cuotas' },
];

var VU_UNIT_STATUS = {
  available: { label: 'Disponible', badge: 'badge-green' },
  reserved:  { label: 'Reservado',  badge: 'badge-yellow' },
  sold:      { label: 'Vendido',    badge: 'badge-blue' },
  own_use:   { label: 'Uso propio', badge: 'badge-gray' },
};

var VU_SALE_STATUS = {
  reservation: { label: 'Reserva',    badge: 'badge-yellow' },
  signed:      { label: 'Firmado',    badge: 'badge-blue' },
  active:      { label: 'En curso',   badge: 'badge-green' },
  completed:   { label: 'Completado', badge: 'badge-gray' },
  cancelled:   { label: 'Cancelado',  badge: 'badge-red' },
};

// ---- MAIN RENDER ----
function renderUnidades() {
  var content = document.getElementById('content');
  content.innerHTML =
    '<div class="page-header"><div>' +
      '<div class="page-title"><i class="fas fa-house-chimney" style="margin-right:8px;color:var(--primary)"></i>Ventas de Unidades</div>' +
      '<div class="page-subtitle">Gestion de unidades, contratos de venta y cobranzas inmobiliarias</div>' +
    '</div></div>' +
    '<div id="vu-tabs" class="tabs-container">' +
      '<div class="tabs-header">' +
        '<button class="tab-btn active" data-tab="tab-vu-unidades" onclick="vuSetTab(\'unidades\')">Unidades</button>' +
        '<button class="tab-btn" data-tab="tab-vu-ventas" onclick="vuSetTab(\'ventas\')">Contratos de Venta</button>' +
        '<button class="tab-btn" data-tab="tab-vu-cuotas" onclick="vuSetTab(\'cuotas\')">Cuotas y Cobranzas</button>' +
      '</div>' +
      '<div id="tab-vu-unidades" class="tab-content active"></div>' +
      '<div id="tab-vu-ventas" class="tab-content"></div>' +
      '<div id="tab-vu-cuotas" class="tab-content"></div>' +
    '</div>';

  vuRenderUnidades();
  vuRenderVentas();
  vuRenderCuotas();
}

function vuSetTab(tab) {
  _vuState.tab = tab;
  ['unidades', 'ventas', 'cuotas'].forEach(function(t) {
    var btn = document.querySelector('[data-tab="tab-vu-' + t + '"]');
    var panel = document.getElementById('tab-vu-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
    if (panel) panel.classList.toggle('active', t === tab);
  });
}

// ---- HELPERS ----
function vuGetProjects() { return DB.getAll('projects'); }
function vuGetUnidades() { return DB.getAll('unidades'); }
function vuGetVentas() { return DB.getAll('ventasUnidades'); }
function vuGetCobros() { return DB.getAll('cobrosVentas'); }

function vuProjectFilter() {
  var pid = (window.APP_STATE && window.APP_STATE.activeProject) || '';
  return pid;
}

function vuProjectSelect(selectedId) {
  var projects = vuGetProjects();
  return '<select id="vu-project" class="form-control">' +
    '<option value="">— Seleccionar proyecto —</option>' +
    projects.map(function(p) {
      return '<option value="' + p.id + '"' + (p.id === selectedId ? ' selected' : '') + '>' + p.name + '</option>';
    }).join('') +
  '</select>';
}

// ---- TAB 1: UNIDADES ----
function vuRenderUnidades() {
  var units = vuGetUnidades();
  var projects = vuGetProjects();
  var pid = vuProjectFilter();
  if (pid) units = units.filter(function(u) { return u.project_id === pid; });

  var html =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
      '<div style="display:flex;gap:12px;align-items:center;">' +
        '<b style="font-size:14px;">Unidades</b>' +
        (pid ? '' :
          '<select class="form-control" style="width:220px" onchange="vuFilterProject(this.value)">' +
            '<option value="">Todos los proyectos</option>' +
            projects.map(function(p) { return '<option value="' + p.id + '">' + p.name + '</option>'; }).join('') +
          '</select>'
        ) +
      '</div>' +
      '<button class="btn btn-primary" onclick="vuNewUnit()"><i class="fas fa-plus"></i> Nueva Unidad</button>' +
    '</div>';

  // Summary badges
  var avail = units.filter(function(u) { return u.status === 'available'; }).length;
  var reserved = units.filter(function(u) { return u.status === 'reserved'; }).length;
  var sold = units.filter(function(u) { return u.status === 'sold'; }).length;
  html +=
    '<div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap;">' +
      '<div class="card" style="flex:1;min-width:110px;text-align:center;padding:16px 12px;">' +
        '<div style="font-size:24px;font-weight:700;color:var(--success)">' + avail + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted)">Disponibles</div>' +
      '</div>' +
      '<div class="card" style="flex:1;min-width:110px;text-align:center;padding:16px 12px;">' +
        '<div style="font-size:24px;font-weight:700;color:var(--warning)">' + reserved + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted)">Reservadas</div>' +
      '</div>' +
      '<div class="card" style="flex:1;min-width:110px;text-align:center;padding:16px 12px;">' +
        '<div style="font-size:24px;font-weight:700;color:var(--primary)">' + sold + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted)">Vendidas</div>' +
      '</div>' +
      '<div class="card" style="flex:1;min-width:110px;text-align:center;padding:16px 12px;">' +
        '<div style="font-size:24px;font-weight:700;color:var(--text)">' + units.length + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted)">Total</div>' +
      '</div>' +
    '</div>';

  if (!units.length) {
    html += '<div class="empty-state"><i class="fas fa-house-chimney"></i><p>No hay unidades registradas</p></div>';
  } else {
    html += '<table class="table">' +
      '<thead><tr>' +
        '<th>Unidad</th><th>Proyecto</th><th>Tipo</th><th>Piso</th><th>Sup. (m2)</th><th>Ambientes</th><th>Precio Lista</th><th>Estado</th><th></th>' +
      '</tr></thead><tbody>';
    units.forEach(function(u) {
      var proj = projects.find(function(p) { return p.id === u.project_id; });
      var st = VU_UNIT_STATUS[u.status] || VU_UNIT_STATUS.available;
      var typeLabel = (VU_UNIT_TYPES.find(function(t) { return t.id === u.type; }) || {}).label || u.type;
      html += '<tr>' +
        '<td><b>' + u.number + '</b></td>' +
        '<td style="font-size:12px">' + (proj ? proj.name : '-') + '</td>' +
        '<td>' + typeLabel + '</td>' +
        '<td>' + (u.floor || '-') + '</td>' +
        '<td>' + (u.area || '-') + '</td>' +
        '<td>' + (u.rooms || '-') + '</td>' +
        '<td>' + fmtMoney(u.list_price, u.currency) + '</td>' +
        '<td><span class="badge ' + st.badge + '">' + st.label + '</span></td>' +
        '<td style="white-space:nowrap;">' +
          '<button class="btn btn-sm btn-secondary" onclick="vuEditUnit(\'' + u.id + '\')"><i class="fas fa-edit"></i></button> ' +
          (u.status === 'available' ? '<button class="btn btn-sm btn-primary" onclick="vuNewVentaForUnit(\'' + u.id + '\')"><i class="fas fa-handshake"></i> Vender</button> ' : '') +
          '<button class="btn btn-sm btn-danger" onclick="vuDeleteUnit(\'' + u.id + '\')"><i class="fas fa-trash"></i></button>' +
        '</td>' +
      '</tr>';
    });
    html += '</tbody></table>';
  }

  var panel = document.getElementById('tab-vu-unidades');
  if (panel) panel.innerHTML = html;
}

function vuFilterProject(pid) {
  _vuState.projectFilter = pid;
  window.APP_STATE = window.APP_STATE || {};
  window.APP_STATE.activeProject = pid;
  vuRenderUnidades();
  vuRenderVentas();
  vuRenderCuotas();
}

function vuNewUnit(prefillProjectId) {
  var body =
    '<div class="form-grid">' +
      '<div class="form-group">' +
        '<label>Proyecto *</label>' + vuProjectSelect(prefillProjectId || '') +
      '</div>' +
      '<div class="form-group">' +
        '<label>Numero / Identificador *</label>' +
        '<input type="text" id="vu-u-number" class="form-control" placeholder="Ej: 3A, 5B, PH-2">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Tipo</label>' +
        '<select id="vu-u-type" class="form-control">' +
          VU_UNIT_TYPES.map(function(t) { return '<option value="' + t.id + '">' + t.label + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Piso</label>' +
        '<input type="text" id="vu-u-floor" class="form-control" placeholder="Ej: PB, 2, 5">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Superficie total (m2)</label>' +
        '<input type="number" id="vu-u-area" class="form-control" placeholder="0">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Ambientes</label>' +
        '<input type="number" id="vu-u-rooms" class="form-control" placeholder="0">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Precio de Lista *</label>' +
        '<input type="number" id="vu-u-price" class="form-control" placeholder="0">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Moneda</label>' +
        '<select id="vu-u-currency" class="form-control">' +
          (DB.getAllCurrencies() || []).map(function(c) { return '<option value="' + c.id + '"' + (c.id === 'USD' ? ' selected' : '') + '>' + c.id + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Estado</label>' +
        '<select id="vu-u-status" class="form-control">' +
          Object.keys(VU_UNIT_STATUS).map(function(k) { return '<option value="' + k + '">' + VU_UNIT_STATUS[k].label + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Observaciones</label>' +
      '<textarea id="vu-u-notes" class="form-control" rows="2" placeholder="Descripcion, caracteristicas..."></textarea>' +
    '</div>';

  openModal('Nueva Unidad', body, 'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="vuSaveUnit(null)"><i class="fas fa-save"></i> Guardar</button>'
  );
}

function vuEditUnit(id) {
  var u = DB.getById('unidades', id);
  if (!u) return;
  var body =
    '<div class="form-grid">' +
      '<div class="form-group">' +
        '<label>Proyecto</label>' + vuProjectSelect(u.project_id) +
      '</div>' +
      '<div class="form-group">' +
        '<label>Numero / Identificador *</label>' +
        '<input type="text" id="vu-u-number" class="form-control" value="' + (u.number || '') + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Tipo</label>' +
        '<select id="vu-u-type" class="form-control">' +
          VU_UNIT_TYPES.map(function(t) { return '<option value="' + t.id + '"' + (u.type === t.id ? ' selected' : '') + '>' + t.label + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Piso</label>' +
        '<input type="text" id="vu-u-floor" class="form-control" value="' + (u.floor || '') + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Superficie (m2)</label>' +
        '<input type="number" id="vu-u-area" class="form-control" value="' + (u.area || '') + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Ambientes</label>' +
        '<input type="number" id="vu-u-rooms" class="form-control" value="' + (u.rooms || '') + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Precio de Lista</label>' +
        '<input type="number" id="vu-u-price" class="form-control" value="' + (u.list_price || '') + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Moneda</label>' +
        '<select id="vu-u-currency" class="form-control">' +
          (DB.getAllCurrencies() || []).map(function(c) { return '<option value="' + c.id + '"' + (c.id === u.currency ? ' selected' : '') + '>' + c.id + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Estado</label>' +
        '<select id="vu-u-status" class="form-control">' +
          Object.keys(VU_UNIT_STATUS).map(function(k) { return '<option value="' + k + '"' + (u.status === k ? ' selected' : '') + '>' + VU_UNIT_STATUS[k].label + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Observaciones</label>' +
      '<textarea id="vu-u-notes" class="form-control" rows="2">' + (u.notes || '') + '</textarea>' +
    '</div>';

  openModal('Editar Unidad', body, 'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="vuSaveUnit(\'' + id + '\')"><i class="fas fa-save"></i> Guardar</button>'
  );
}

function vuSaveUnit(id) {
  var g = function(eid) { return (document.getElementById(eid) || {}).value || ''; };
  var number = g('vu-u-number').trim();
  var project_id = g('vu-project');
  if (!number || !project_id) { toast('Complete proyecto y numero de unidad', 'error'); return; }

  var data = {
    project_id: project_id,
    number: number,
    type: g('vu-u-type'),
    floor: g('vu-u-floor'),
    area: parseFloat(g('vu-u-area')) || 0,
    rooms: parseInt(g('vu-u-rooms')) || 0,
    list_price: parseFloat(g('vu-u-price')) || 0,
    currency: g('vu-u-currency') || 'USD',
    status: g('vu-u-status') || 'available',
    notes: g('vu-u-notes'),
  };

  if (id) { DB.update('unidades', id, data); toast('Unidad actualizada', 'success'); }
  else { DB.insert('unidades', data); toast('Unidad creada', 'success'); }
  closeModal();
  vuRenderUnidades();
}

function vuDeleteUnit(id) {
  confirmDialog('Eliminar unidad. Se perderan los datos asociados.', function() {
    DB.remove('unidades', id);
    vuRenderUnidades();
    toast('Unidad eliminada', 'success');
  });
}

// ---- TAB 2: CONTRATOS DE VENTA ----
function vuRenderVentas() {
  var ventas = vuGetVentas();
  var units = vuGetUnidades();
  var projects = vuGetProjects();
  var cobros = vuGetCobros();
  var pid = vuProjectFilter();

  if (pid) {
    var unitIds = units.filter(function(u) { return u.project_id === pid; }).map(function(u) { return u.id; });
    ventas = ventas.filter(function(v) { return unitIds.indexOf(v.unit_id) !== -1; });
  }

  var html =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
      '<b style="font-size:14px;">Contratos de Venta</b>' +
      '<button class="btn btn-primary" onclick="vuNewVenta()"><i class="fas fa-plus"></i> Nueva Venta</button>' +
    '</div>';

  if (!ventas.length) {
    html += '<div class="empty-state"><i class="fas fa-handshake"></i><p>No hay ventas registradas</p></div>';
  } else {
    html += '<table class="table">' +
      '<thead><tr><th>Contrato</th><th>Unidad</th><th>Comprador</th><th>Fecha</th><th>Precio</th><th>Cobrado</th><th>Saldo</th><th>Estado</th><th></th></tr></thead><tbody>';
    ventas.forEach(function(v) {
      var unit = units.find(function(u) { return u.id === v.unit_id; });
      var proj = unit ? projects.find(function(p) { return p.id === unit.project_id; }) : null;
      var st = VU_SALE_STATUS[v.status] || VU_SALE_STATUS.active;
      var totalCobrado = cobros.filter(function(c) { return c.sale_id === v.id; }).reduce(function(s, c) { return s + (c.amount || 0); }, 0);
      var saldo = (v.sale_price || 0) - totalCobrado;
      html += '<tr>' +
        '<td><b>' + (v.contract_number || v.id.slice(0, 8)) + '</b><br><span style="font-size:11px;color:var(--text-muted)">' + (proj ? proj.name : '') + '</span></td>' +
        '<td>' + (unit ? unit.number : '-') + '</td>' +
        '<td>' + (v.buyer_name || '-') + '<br><span style="font-size:11px;color:var(--text-muted)">' + (v.buyer_phone || '') + '</span></td>' +
        '<td style="font-size:12px">' + fmtDate(v.sale_date) + '</td>' +
        '<td>' + fmtMoney(v.sale_price, v.currency) + '</td>' +
        '<td style="color:var(--success)">' + fmtMoney(totalCobrado, v.currency) + '</td>' +
        '<td style="' + (saldo > 0 ? 'color:var(--danger)' : 'color:var(--success)') + '">' + fmtMoney(saldo, v.currency) + '</td>' +
        '<td><span class="badge ' + st.badge + '">' + st.label + '</span></td>' +
        '<td style="white-space:nowrap;">' +
          '<button class="btn btn-sm btn-secondary" onclick="vuEditVenta(\'' + v.id + '\')"><i class="fas fa-edit"></i></button> ' +
          '<button class="btn btn-sm btn-primary" onclick="vuSetTab(\'cuotas\'); vuRenderCuotas(\'' + v.id + '\')"><i class="fas fa-list"></i></button>' +
        '</td>' +
      '</tr>';
    });
    html += '</tbody></table>';
  }

  var panel = document.getElementById('tab-vu-ventas');
  if (panel) panel.innerHTML = html;
}

function vuNewVentaForUnit(unitId) {
  vuSetTab('ventas');
  setTimeout(function() { vuNewVenta(unitId); }, 80);
}

function vuNewVenta(prefillUnitId) {
  var units = vuGetUnidades().filter(function(u) { return u.status === 'available' || u.status === 'reserved'; });
  var currencies = DB.getAllCurrencies() || [];
  var today = todayStr();

  var unitOptions = '<option value="">— Seleccionar unidad —</option>' +
    units.map(function(u) {
      var p = (vuGetProjects().find(function(p2) { return p2.id === u.project_id; }) || {}).name || '';
      return '<option value="' + u.id + '"' + (u.id === prefillUnitId ? ' selected' : '') + '>' + p + ' - ' + u.number + ' (' + (u.area || '?') + 'm2)</option>';
    }).join('');

  var body =
    '<div class="form-grid">' +
      '<div class="form-group">' +
        '<label>Unidad *</label>' +
        '<select id="vu-v-unit" class="form-control" onchange="vuFillUnitPrice(this.value)">' + unitOptions + '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>N° Contrato</label>' +
        '<input type="text" id="vu-v-contract" class="form-control" placeholder="Ej: VTA-2025-001">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Comprador - Nombre completo *</label>' +
        '<input type="text" id="vu-v-buyer" class="form-control" placeholder="Nombre y apellido">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Tipo documento</label>' +
        '<select id="vu-v-doctype" class="form-control">' +
          '<option value="DNI">DNI</option><option value="CUIT">CUIT</option><option value="PASSPORT">Pasaporte</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>N° Documento</label>' +
        '<input type="text" id="vu-v-docnum" class="form-control" placeholder="...">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Telefono</label>' +
        '<input type="text" id="vu-v-phone" class="form-control" placeholder="+54 9 11 ...">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Email</label>' +
        '<input type="email" id="vu-v-email" class="form-control" placeholder="correo@email.com">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Fecha de venta *</label>' +
        '<input type="date" id="vu-v-date" class="form-control" value="' + today + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Precio de venta *</label>' +
        '<input type="number" id="vu-v-price" class="form-control" placeholder="0">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Moneda</label>' +
        '<select id="vu-v-currency" class="form-control">' +
          currencies.map(function(c) { return '<option value="' + c.id + '"' + (c.id === 'USD' ? ' selected' : '') + '>' + c.id + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Forma de pago</label>' +
        '<select id="vu-v-paytype" class="form-control" onchange="vuToggleInstallmentFields(this.value)">' +
          VU_PAYMENT_TYPES.map(function(t) { return '<option value="' + t.id + '">' + t.label + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Estado del contrato</label>' +
        '<select id="vu-v-status" class="form-control">' +
          Object.keys(VU_SALE_STATUS).map(function(k) { return '<option value="' + k + '"' + (k === 'signed' ? ' selected' : '') + '>' + VU_SALE_STATUS[k].label + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
    '</div>' +
    '<div id="vu-installment-fields" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">' +
      '<b style="font-size:13px;color:var(--text)">Plan de Cuotas</b>' +
      '<div class="form-grid" style="margin-top:12px;">' +
        '<div class="form-group">' +
          '<label>Seña / Anticipo</label>' +
          '<input type="number" id="vu-v-down" class="form-control" placeholder="0">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Fecha seña</label>' +
          '<input type="date" id="vu-v-down-date" class="form-control" value="' + today + '">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Cantidad de cuotas</label>' +
          '<input type="number" id="vu-v-installments-n" class="form-control" placeholder="Ej: 24" min="1">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Inicio primera cuota</label>' +
          '<input type="date" id="vu-v-installments-start" class="form-control" value="' + today + '">' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Observaciones</label>' +
      '<textarea id="vu-v-notes" class="form-control" rows="2" placeholder="Condiciones especiales, comisiones..."></textarea>' +
    '</div>';

  openModal('Nueva Venta', body, 'modal-xl',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="vuSaveVenta(null)"><i class="fas fa-save"></i> Guardar y Generar Cuotas</button>'
  );

  // Pre-fill unit price if unit selected
  if (prefillUnitId) setTimeout(function() { vuFillUnitPrice(prefillUnitId); }, 60);
  setTimeout(function() { vuToggleInstallmentFields('cash'); }, 60);
}

function vuFillUnitPrice(unitId) {
  var unit = DB.getById('unidades', unitId);
  if (!unit) return;
  var priceField = document.getElementById('vu-v-price');
  var currField = document.getElementById('vu-v-currency');
  if (priceField && !priceField.value) priceField.value = unit.list_price || '';
  if (currField && unit.currency) currField.value = unit.currency;
}

function vuToggleInstallmentFields(payType) {
  var el = document.getElementById('vu-installment-fields');
  if (!el) return;
  el.style.display = (payType === 'installments' || payType === 'mixed') ? '' : 'none';
}

function vuSaveVenta(id) {
  var g = function(eid) { return (document.getElementById(eid) || {}).value || ''; };
  var unitId = g('vu-v-unit');
  var buyerName = g('vu-v-buyer').trim();
  var salePrice = parseFloat(g('vu-v-price')) || 0;
  var saleDate = g('vu-v-date');
  var payType = g('vu-v-paytype') || 'cash';

  if (!unitId || !buyerName || !salePrice) { toast('Complete unidad, comprador y precio', 'error'); return; }

  // Build installment schedule
  var installments = [];
  if (payType === 'cash') {
    installments = [{ id: uuid(), number: 1, concept: 'Pago contado', due_date: saleDate, amount: salePrice, status: 'pending' }];
  } else {
    var down = parseFloat(g('vu-v-down')) || 0;
    var downDate = g('vu-v-down-date') || saleDate;
    var n = parseInt(g('vu-v-installments-n')) || 1;
    var startDate = g('vu-v-installments-start') || saleDate;
    var remaining = salePrice - down;
    var installAmt = n > 0 ? Math.round(remaining / n) : remaining;

    if (down > 0) {
      installments.push({ id: uuid(), number: 0, concept: 'Seña / Anticipo', due_date: downDate, amount: down, status: 'pending' });
    }
    for (var i = 1; i <= n; i++) {
      var dDate = vuAddMonths(startDate, i - 1);
      var amt = (i === n) ? (remaining - installAmt * (n - 1)) : installAmt; // last cuota absorbs rounding
      installments.push({ id: uuid(), number: i, concept: 'Cuota ' + i + '/' + n, due_date: dDate, amount: amt, status: 'pending' });
    }
  }

  var data = {
    unit_id: unitId,
    contract_number: g('vu-v-contract') || ('VTA-' + new Date().getFullYear() + '-' + String((vuGetVentas().length + 1)).padStart(3, '0')),
    buyer_name: buyerName,
    buyer_doc_type: g('vu-v-doctype'),
    buyer_doc: g('vu-v-docnum'),
    buyer_phone: g('vu-v-phone'),
    buyer_email: g('vu-v-email'),
    sale_date: saleDate,
    currency: g('vu-v-currency') || 'USD',
    sale_price: salePrice,
    payment_type: payType,
    installments: installments,
    status: g('vu-v-status') || 'signed',
    notes: g('vu-v-notes'),
  };

  if (id) {
    DB.update('ventasUnidades', id, data);
    toast('Venta actualizada', 'success');
  } else {
    DB.insert('ventasUnidades', data);
    // Update unit status
    DB.update('unidades', unitId, { status: 'sold' });
    toast('Venta registrada y cuotas generadas', 'success');
  }

  closeModal();
  vuRenderUnidades();
  vuRenderVentas();
  vuRenderCuotas();
}

function vuEditVenta(id) {
  var v = DB.getById('ventasUnidades', id);
  if (!v) return;
  var body =
    '<div class="form-grid">' +
      '<div class="form-group"><label>Comprador</label><input type="text" id="vu-v-buyer" class="form-control" value="' + (v.buyer_name || '') + '"></div>' +
      '<div class="form-group"><label>Telefono</label><input type="text" id="vu-v-phone" class="form-control" value="' + (v.buyer_phone || '') + '"></div>' +
      '<div class="form-group"><label>Email</label><input type="email" id="vu-v-email" class="form-control" value="' + (v.buyer_email || '') + '"></div>' +
      '<div class="form-group"><label>Precio</label><input type="number" id="vu-v-price" class="form-control" value="' + (v.sale_price || '') + '"></div>' +
      '<div class="form-group"><label>Estado</label><select id="vu-v-status" class="form-control">' +
        Object.keys(VU_SALE_STATUS).map(function(k) { return '<option value="' + k + '"' + (v.status === k ? ' selected' : '') + '>' + VU_SALE_STATUS[k].label + '</option>'; }).join('') +
      '</select></div>' +
    '</div>' +
    '<div class="form-group"><label>Notas</label><textarea id="vu-v-notes" class="form-control" rows="2">' + (v.notes || '') + '</textarea></div>';

  openModal('Editar Venta', body, 'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="vuQuickUpdateVenta(\'' + id + '\')"><i class="fas fa-save"></i> Guardar</button>'
  );
}

function vuQuickUpdateVenta(id) {
  var g = function(eid) { return (document.getElementById(eid) || {}).value || ''; };
  DB.update('ventasUnidades', id, {
    buyer_name: g('vu-v-buyer'),
    buyer_phone: g('vu-v-phone'),
    buyer_email: g('vu-v-email'),
    sale_price: parseFloat(g('vu-v-price')) || 0,
    status: g('vu-v-status'),
    notes: g('vu-v-notes'),
  });
  closeModal();
  vuRenderVentas();
  toast('Venta actualizada', 'success');
}

// ---- TAB 3: CUOTAS Y COBRANZAS ----
function vuRenderCuotas(filterSaleId) {
  var ventas = vuGetVentas();
  var units = vuGetUnidades();
  var cobros = vuGetCobros();
  var pid = vuProjectFilter();

  if (pid) {
    var unitIds = units.filter(function(u) { return u.project_id === pid; }).map(function(u) { return u.id; });
    ventas = ventas.filter(function(v) { return unitIds.indexOf(v.unit_id) !== -1; });
  }

  var html = '<div style="margin-bottom:20px;">';
  if (ventas.length > 0) {
    html += '<select class="form-control" style="max-width:380px" id="vu-cuotas-filter" onchange="vuRenderCuotas(this.value)">' +
      '<option value="">Todos los contratos</option>' +
      ventas.map(function(v) {
        var unit = units.find(function(u) { return u.id === v.unit_id; });
        return '<option value="' + v.id + '"' + (filterSaleId === v.id ? ' selected' : '') + '>' + (v.contract_number || v.id.slice(0,8)) + ' - ' + (v.buyer_name || '') + (unit ? ' (' + unit.number + ')' : '') + '</option>';
      }).join('') +
    '</select>';
  }
  html += '</div>';

  var displayVentas = filterSaleId ? ventas.filter(function(v) { return v.id === filterSaleId; }) : ventas;

  if (!displayVentas.length) {
    html += '<div class="empty-state"><i class="fas fa-list"></i><p>Sin contratos para mostrar</p></div>';
  } else {
    displayVentas.forEach(function(v) {
      var unit = units.find(function(u) { return u.id === v.unit_id; });
      var ventaCobros = cobros.filter(function(c) { return c.sale_id === v.id; });
      var totalCobrado = ventaCobros.reduce(function(s, c) { return s + (c.amount || 0); }, 0);
      var saldo = (v.sale_price || 0) - totalCobrado;
      var installments = v.installments || [];

      html +=
        '<div class="card" style="margin-bottom:20px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:8px;">' +
            '<div>' +
              '<b style="font-size:14px;">' + (v.contract_number || '') + '</b>' +
              '<span style="font-size:12px;color:var(--text-muted);margin-left:12px">' + (v.buyer_name || '') + '</span>' +
              (unit ? '<span style="font-size:12px;color:var(--text-muted);margin-left:8px">| Unidad ' + unit.number + '</span>' : '') +
            '</div>' +
            '<div style="display:flex;gap:12px;font-size:13px;">' +
              '<span>Total: <b>' + fmtMoney(v.sale_price, v.currency) + '</b></span>' +
              '<span style="color:var(--success)">Cobrado: <b>' + fmtMoney(totalCobrado, v.currency) + '</b></span>' +
              '<span style="color:' + (saldo > 0 ? 'var(--danger)' : 'var(--success)') + '">Saldo: <b>' + fmtMoney(saldo, v.currency) + '</b></span>' +
            '</div>' +
          '</div>' +
          '<table class="table">' +
            '<thead><tr><th>#</th><th>Concepto</th><th>Vencimiento</th><th>Importe</th><th>Estado</th><th>Fecha pago</th><th>Importe cobrado</th><th></th></tr></thead>' +
            '<tbody>' +
            installments.map(function(inst) {
              var cobro = ventaCobros.find(function(c) { return c.installment_id === inst.id; });
              var today = todayStr();
              var isOverdue = inst.status === 'pending' && inst.due_date < today;
              var statusLabel = inst.status === 'paid' ? '<span class="badge badge-green">Pagado</span>' :
                (isOverdue ? '<span class="badge badge-red">Vencido</span>' : '<span class="badge badge-yellow">Pendiente</span>');
              return '<tr' + (isOverdue ? ' style="background:rgba(239,68,68,0.04)"' : '') + '>' +
                '<td>' + inst.number + '</td>' +
                '<td>' + (inst.concept || '') + '</td>' +
                '<td>' + fmtDate(inst.due_date) + '</td>' +
                '<td>' + fmtMoney(inst.amount, v.currency) + '</td>' +
                '<td>' + statusLabel + '</td>' +
                '<td style="font-size:12px">' + (cobro ? fmtDate(cobro.date) : '—') + '</td>' +
                '<td>' + (cobro ? fmtMoney(cobro.amount, v.currency) : '—') + '</td>' +
                '<td>' +
                  (inst.status !== 'paid'
                    ? '<button class="btn btn-sm btn-primary" onclick="vuRegistrarCobro(\'' + v.id + '\',\'' + inst.id + '\',' + (inst.amount || 0) + ',\'' + (v.currency || 'ARS') + '\')"><i class="fas fa-dollar-sign"></i> Cobrar</button>'
                    : '') +
                '</td>' +
              '</tr>';
            }).join('') +
            '</tbody>' +
          '</table>' +
        '</div>';
    });
  }

  var panel = document.getElementById('tab-vu-cuotas');
  if (panel) panel.innerHTML = html;
}

function vuRegistrarCobro(saleId, installmentId, amount, currency) {
  var currencies = DB.getAllCurrencies() || [];
  var body =
    '<div class="form-grid">' +
      '<div class="form-group"><label>Fecha *</label><input type="date" id="vu-c-date" class="form-control" value="' + todayStr() + '"></div>' +
      '<div class="form-group"><label>Importe recibido *</label><input type="number" id="vu-c-amount" class="form-control" value="' + amount + '"></div>' +
      '<div class="form-group"><label>Moneda</label><select id="vu-c-currency" class="form-control">' +
        currencies.map(function(c) { return '<option value="' + c.id + '"' + (c.id === currency ? ' selected' : '') + '>' + c.id + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="form-group"><label>Forma de cobro</label><select id="vu-c-method" class="form-control">' +
        '<option value="transfer">Transferencia</option><option value="check">Cheque</option><option value="cash">Efectivo</option><option value="card">Tarjeta</option>' +
      '</select></div>' +
    '</div>' +
    '<div class="form-group"><label>Referencia / N° comprobante</label><input type="text" id="vu-c-ref" class="form-control" placeholder="..."></div>' +
    '<div class="form-group"><label>Notas</label><textarea id="vu-c-notes" class="form-control" rows="2"></textarea></div>';

  openModal('Registrar Cobro', body, 'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="vuConfirmCobro(\'' + saleId + '\',\'' + installmentId + '\')"><i class="fas fa-check"></i> Confirmar Cobro</button>'
  );
}

function vuConfirmCobro(saleId, installmentId) {
  var g = function(eid) { return (document.getElementById(eid) || {}).value || ''; };
  var cobDate = g('vu-c-date');
  var cobAmt = parseFloat(g('vu-c-amount')) || 0;
  if (!cobDate || !cobAmt) { toast('Complete fecha e importe', 'error'); return; }

  DB.insert('cobrosVentas', {
    sale_id: saleId,
    installment_id: installmentId,
    date: cobDate,
    amount: cobAmt,
    currency: g('vu-c-currency'),
    method: g('vu-c-method'),
    reference: g('vu-c-ref'),
    notes: g('vu-c-notes'),
  });

  // Mark installment as paid
  var venta = DB.getById('ventasUnidades', saleId);
  if (venta && venta.installments) {
    var insts = venta.installments.map(function(inst) {
      if (inst.id === installmentId) return Object.assign({}, inst, { status: 'paid', paid_date: cobDate, paid_amount: cobAmt });
      return inst;
    });
    DB.update('ventasUnidades', saleId, { installments: insts });
  }

  // Auto journal entry for collection
  try {
    var ref = g('vu-c-ref') || ('COBRO-VTA-' + saleId.slice(0, 8));
    autoJournalEntry('cobro_cliente', cobAmt, cobDate, ref, 'Cobro cuota venta unidad');
  } catch(e) {}

  // Check if all installments paid → mark sale as completed
  var updVenta = DB.getById('ventasUnidades', saleId);
  if (updVenta && updVenta.installments) {
    var allPaid = updVenta.installments.every(function(i) { return i.status === 'paid'; });
    if (allPaid) DB.update('ventasUnidades', saleId, { status: 'completed' });
  }

  closeModal();
  vuRenderCuotas(saleId);
  vuRenderVentas();
  toast('Cobro registrado', 'success');
}

// ---- UTILITY ----
function vuAddMonths(dateStr, months) {
  if (!dateStr) return dateStr;
  var d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}
