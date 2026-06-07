/* ===== MÓDULO: VENTAS DE UNIDADES ===== */

var _vuState = { tab: 'unidades', projectFilter: '' };
var _vuBulkRows = [];

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
      '<div style="display:flex;gap:8px;">' +
        '<button class="btn btn-secondary" onclick="vuBulkCreate()"><i class="fas fa-layer-group"></i> Carga Masiva</button>' +
        '<button class="btn btn-primary" onclick="vuNewUnit()"><i class="fas fa-plus"></i> Nueva Unidad</button>' +
      '</div>' +
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

// ---- CARGA MASIVA ----

function vuBulkCreate() {
  var projects = vuGetProjects();
  var currencies = DB.getAllCurrencies() || [];
  var pid = vuProjectFilter();

  var projectOpts = projects.map(function(p) {
    return '<option value="' + p.id + '"' + (p.id === pid ? ' selected' : '') + '>' + p.name + '</option>';
  }).join('');
  var typeOpts = VU_UNIT_TYPES.map(function(t) {
    return '<option value="' + t.id + '">' + t.label + '</option>';
  }).join('');
  var currOpts = currencies.map(function(c) {
    return '<option value="' + c.id + '"' + (c.id === 'USD' ? ' selected' : '') + '>' + c.id + '</option>';
  }).join('');

  var body =
    '<div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;">' +

    // LEFT: Template config
    '<div style="flex:1;min-width:280px;max-width:380px;">' +
      '<div class="card" style="padding:16px;">' +
        '<div style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:12px;"><i class="fas fa-sliders"></i> Plantilla</div>' +

        '<div class="form-group">' +
          '<label>Proyecto *</label>' +
          '<select id="vub-project" class="form-control"><option value="">— Seleccionar —</option>' + projectOpts + '</select>' +
        '</div>' +

        '<div class="form-group">' +
          '<label>Tipo de unidad</label>' +
          '<select id="vub-type" class="form-control">' + typeOpts + '</select>' +
        '</div>' +

        '<div class="form-group">' +
          '<label>Modo de numeración</label>' +
          '<div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">' +
            '<label style="font-weight:normal;display:flex;align-items:center;gap:6px;cursor:pointer;">' +
              '<input type="radio" name="vub-mode" value="floors" checked onchange="vuBulkModeChange()">Pisos y letras</label>' +
            '<label style="font-weight:normal;display:flex;align-items:center;gap:6px;cursor:pointer;">' +
              '<input type="radio" name="vub-mode" value="sequential" onchange="vuBulkModeChange()">Correlativo (cocheras, depósitos...)</label>' +
            '<label style="font-weight:normal;display:flex;align-items:center;gap:6px;cursor:pointer;">' +
              '<input type="radio" name="vub-mode" value="manual" onchange="vuBulkModeChange()">Lista manual</label>' +
          '</div>' +
        '</div>' +

        // Panel: Pisos y letras
        '<div id="vub-panel-floors" style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;margin-bottom:10px;">' +
          '<div class="form-group">' +
            '<label>Pisos (separados por coma)</label>' +
            '<input type="text" id="vub-floors" class="form-control" value="PB, EP, 1, 2, 3, 4, 5" placeholder="PB, EP, 1, 2, 3...">' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Unidades por piso (separadas por coma)</label>' +
            '<input type="text" id="vub-units-per-floor" class="form-control" value="A, B, C, D" placeholder="A, B, C, D...">' +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<div class="form-group" style="flex:1;">' +
              '<label>Prefijo</label>' +
              '<input type="text" id="vub-prefix" class="form-control" placeholder="Ej: Depto ">' +
            '</div>' +
            '<div class="form-group" style="flex:1;">' +
              '<label>Separador</label>' +
              '<select id="vub-sep" class="form-control">' +
                '<option value="">Ninguno → 2A</option>' +
                '<option value="-">Guión → 2-A</option>' +
                '<option value=" ">Espacio → 2 A</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Panel: Correlativo
        '<div id="vub-panel-sequential" style="display:none;border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;margin-bottom:10px;">' +
          '<div class="form-group">' +
            '<label>Prefijo</label>' +
            '<input type="text" id="vub-seq-prefix" class="form-control" placeholder="C- → C-01, C-02...">' +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<div class="form-group" style="flex:1;">' +
              '<label>Desde</label>' +
              '<input type="number" id="vub-seq-from" class="form-control" value="1">' +
            '</div>' +
            '<div class="form-group" style="flex:1;">' +
              '<label>Hasta</label>' +
              '<input type="number" id="vub-seq-to" class="form-control" value="20">' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<div class="form-group" style="flex:1;">' +
              '<label>Relleno ceros</label>' +
              '<select id="vub-seq-pad" class="form-control">' +
                '<option value="0">Sin relleno</option>' +
                '<option value="2" selected>2 dígitos (01…)</option>' +
                '<option value="3">3 dígitos (001…)</option>' +
              '</select>' +
            '</div>' +
            '<div class="form-group" style="flex:1;">' +
              '<label>Piso</label>' +
              '<input type="text" id="vub-seq-floor" class="form-control" placeholder="Opcional">' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Panel: Manual
        '<div id="vub-panel-manual" style="display:none;border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;margin-bottom:10px;">' +
          '<div class="form-group">' +
            '<label>Identificadores (uno por línea)</label>' +
            '<textarea id="vub-manual-list" class="form-control" rows="6" placeholder="Depto 1A&#10;Depto 1B&#10;Local 01&#10;Cochera 01"></textarea>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Piso (aplica a todos)</label>' +
            '<input type="text" id="vub-manual-floor" class="form-control" placeholder="Opcional">' +
          '</div>' +
        '</div>' +

        // Defaults
        '<div style="border-top:1px solid var(--border);padding-top:12px;">' +
          '<div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:8px;">VALORES POR DEFECTO</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<div class="form-group" style="flex:1;">' +
              '<label>m²</label>' +
              '<input type="number" id="vub-area" class="form-control" placeholder="0">' +
            '</div>' +
            '<div class="form-group" style="flex:1;">' +
              '<label>Ambientes</label>' +
              '<input type="number" id="vub-rooms" class="form-control" placeholder="0">' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<div class="form-group" style="flex:2;">' +
              '<label>Precio de lista</label>' +
              '<input type="number" id="vub-price" class="form-control" placeholder="0">' +
            '</div>' +
            '<div class="form-group" style="flex:1;">' +
              '<label>Moneda</label>' +
              '<select id="vub-currency" class="form-control">' + currOpts + '</select>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<button class="btn btn-primary" style="width:100%;margin-top:4px;" onclick="vuGenerateBulkPreview()">' +
          '<i class="fas fa-play"></i> Generar preview' +
        '</button>' +
      '</div>' +
    '</div>' +

    // RIGHT: Preview
    '<div style="flex:2;min-width:340px;">' +
      '<div id="vub-preview-wrap">' +
        '<div class="empty-state" style="min-height:220px;">' +
          '<i class="fas fa-table"></i>' +
          '<p>Configurá la plantilla y presioná "Generar preview"</p>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '</div>';

  _vuBulkRows = [];
  openModal('Carga Masiva de Unidades', body, 'modal-xl',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" id="vub-confirm-btn" onclick="vuConfirmBulkCreate()" style="display:none"><i class="fas fa-save"></i> Crear unidades</button>'
  );
}

function vuBulkModeChange() {
  var mode = 'floors';
  var radios = document.querySelectorAll('input[name="vub-mode"]');
  radios.forEach(function(r) { if (r.checked) mode = r.value; });
  ['floors', 'sequential', 'manual'].forEach(function(m) {
    var el = document.getElementById('vub-panel-' + m);
    if (el) el.style.display = (m === mode) ? '' : 'none';
  });
}

function vuBulkGetMode() {
  var mode = 'floors';
  var radios = document.querySelectorAll('input[name="vub-mode"]');
  radios.forEach(function(r) { if (r.checked) mode = r.value; });
  return mode;
}

function _vuBulkGenNumbers() {
  var mode = vuBulkGetMode();
  var results = [];

  if (mode === 'floors') {
    var floorsRaw = (document.getElementById('vub-floors') || {}).value || '';
    var unitsRaw = (document.getElementById('vub-units-per-floor') || {}).value || '';
    var prefix = (document.getElementById('vub-prefix') || {}).value || '';
    var sep = (document.getElementById('vub-sep') || {}).value || '';
    var floors = floorsRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    var units = unitsRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    if (!floors.length || !units.length) return [];
    floors.forEach(function(f) {
      units.forEach(function(u) {
        results.push({ number: prefix + f + sep + u, floor: f });
      });
    });

  } else if (mode === 'sequential') {
    var pfx = (document.getElementById('vub-seq-prefix') || {}).value || '';
    var from = parseInt((document.getElementById('vub-seq-from') || {}).value) || 1;
    var to = parseInt((document.getElementById('vub-seq-to') || {}).value) || 20;
    var pad = parseInt((document.getElementById('vub-seq-pad') || {}).value) || 0;
    var floorVal = (document.getElementById('vub-seq-floor') || {}).value || '';
    if (isNaN(from) || isNaN(to) || from > to) return [];
    if (to - from > 499) { toast('Maximo 500 unidades a la vez', 'error'); return []; }
    for (var i = from; i <= to; i++) {
      var numStr = pad > 0 ? String(i).padStart(pad, '0') : String(i);
      results.push({ number: pfx + numStr, floor: floorVal });
    }

  } else if (mode === 'manual') {
    var lines = ((document.getElementById('vub-manual-list') || {}).value || '').split('\n');
    var floorM = (document.getElementById('vub-manual-floor') || {}).value || '';
    lines.forEach(function(l) {
      l = l.trim();
      if (l) results.push({ number: l, floor: floorM });
    });
  }

  return results;
}

function vuGenerateBulkPreview() {
  var projectId = (document.getElementById('vub-project') || {}).value || '';
  if (!projectId) { toast('Seleccione un proyecto', 'error'); return; }

  var numbers = _vuBulkGenNumbers();
  if (!numbers.length) { toast('No se generaron unidades con los parametros indicados', 'error'); return; }
  if (numbers.length > 500) { toast('Maximo 500 unidades por vez', 'error'); return; }

  var typeId = (document.getElementById('vub-type') || {}).value || 'dept';
  var area = parseFloat((document.getElementById('vub-area') || {}).value) || 0;
  var rooms = parseInt((document.getElementById('vub-rooms') || {}).value) || 0;
  var price = parseFloat((document.getElementById('vub-price') || {}).value) || 0;
  var currency = (document.getElementById('vub-currency') || {}).value || 'USD';

  _vuBulkRows = numbers.map(function(n, idx) {
    return { _idx: idx, checked: true, number: n.number, floor: n.floor, type: typeId,
             area: area, rooms: rooms, list_price: price, currency: currency, status: 'available' };
  });

  vuRenderBulkPreview();
}

function vuRenderBulkPreview() {
  var wrap = document.getElementById('vub-preview-wrap');
  var confirmBtn = document.getElementById('vub-confirm-btn');
  if (!wrap) return;

  var checkedCnt = _vuBulkRows.filter(function(r) { return r.checked; }).length;
  if (confirmBtn) {
    confirmBtn.style.display = checkedCnt > 0 ? '' : 'none';
    confirmBtn.innerHTML = '<i class="fas fa-save"></i> Crear ' + checkedCnt + ' unidad' + (checkedCnt !== 1 ? 'es' : '');
  }

  if (!_vuBulkRows.length) {
    wrap.innerHTML = '<div class="empty-state"><i class="fas fa-table"></i><p>Sin unidades generadas</p></div>';
    return;
  }

  var typeOpts = VU_UNIT_TYPES.map(function(t) { return '<option value="' + t.id + '">' + t.label + '</option>'; }).join('');
  var statusOpts = Object.keys(VU_UNIT_STATUS).map(function(k) {
    return '<option value="' + k + '">' + VU_UNIT_STATUS[k].label + '</option>';
  }).join('');

  var rows = _vuBulkRows.map(function(r, idx) {
    var selType = typeOpts.replace('value="' + r.type + '"', 'value="' + r.type + '" selected');
    var selStatus = statusOpts.replace('value="' + r.status + '"', 'value="' + r.status + '" selected');
    return '<tr style="' + (r.checked ? '' : 'opacity:0.35') + '">' +
      '<td style="text-align:center;padding:4px 6px;">' +
        '<input type="checkbox"' + (r.checked ? ' checked' : '') + ' onchange="vuBulkToggleRow(' + idx + ',this.checked)">' +
      '</td>' +
      '<td style="padding:4px 6px;"><b style="font-size:12px">' + r.number + '</b></td>' +
      '<td style="padding:4px 6px;font-size:11px;color:var(--text-muted)">' + (r.floor || '—') + '</td>' +
      '<td style="padding:4px 2px;">' +
        '<select class="form-control" style="padding:2px 4px;font-size:11px;height:28px" onchange="vuBulkUpdateRow(' + idx + ',\'type\',this.value)">' + selType + '</select>' +
      '</td>' +
      '<td style="padding:4px 2px;">' +
        '<input type="number" value="' + (r.area || '') + '" class="form-control" style="width:60px;padding:2px 4px;font-size:11px;height:28px" onchange="vuBulkUpdateRow(' + idx + ',\'area\',this.value)">' +
      '</td>' +
      '<td style="padding:4px 2px;">' +
        '<input type="number" value="' + (r.rooms || '') + '" class="form-control" style="width:50px;padding:2px 4px;font-size:11px;height:28px" onchange="vuBulkUpdateRow(' + idx + ',\'rooms\',this.value)">' +
      '</td>' +
      '<td style="padding:4px 2px;">' +
        '<input type="number" value="' + (r.list_price || '') + '" class="form-control" style="width:100px;padding:2px 4px;font-size:11px;height:28px" onchange="vuBulkUpdateRow(' + idx + ',\'list_price\',this.value)">' +
      '</td>' +
      '<td style="padding:4px 2px;">' +
        '<select class="form-control" style="padding:2px 4px;font-size:11px;height:28px" onchange="vuBulkUpdateRow(' + idx + ',\'status\',this.value)">' + selStatus + '</select>' +
      '</td>' +
    '</tr>';
  }).join('');

  var allChecked = _vuBulkRows.every(function(r) { return r.checked; });

  wrap.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
      '<div style="font-size:13px;font-weight:600"><i class="fas fa-table" style="color:var(--primary);margin-right:6px"></i>Vista previa — ' + _vuBulkRows.length + ' unidades</div>' +
      '<button class="btn btn-sm btn-secondary" onclick="vuBulkSelectAll(' + !allChecked + ')">' +
        '<i class="fas ' + (allChecked ? 'fa-square' : 'fa-check-square') + '"></i> ' + (allChecked ? 'Deseleccionar todas' : 'Seleccionar todas') +
      '</button>' +
    '</div>' +
    '<div style="max-height:420px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm);">' +
      '<table class="table" style="margin:0;font-size:12px">' +
        '<thead><tr>' +
          '<th style="width:28px"></th>' +
          '<th>Número</th>' +
          '<th>Piso</th>' +
          '<th>Tipo</th>' +
          '<th>m²</th>' +
          '<th>Amb.</th>' +
          '<th>Precio lista</th>' +
          '<th>Estado inicial</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>';
}

function vuBulkToggleRow(idx, checked) {
  if (_vuBulkRows[idx]) {
    _vuBulkRows[idx].checked = !!checked;
    var cnt = _vuBulkRows.filter(function(r) { return r.checked; }).length;
    var btn = document.getElementById('vub-confirm-btn');
    if (btn) {
      btn.style.display = cnt > 0 ? '' : 'none';
      btn.innerHTML = '<i class="fas fa-save"></i> Crear ' + cnt + ' unidad' + (cnt !== 1 ? 'es' : '');
    }
    var tr = document.querySelectorAll('#vub-preview-wrap tbody tr')[idx];
    if (tr) tr.style.opacity = checked ? '1' : '0.35';
  }
}

function vuBulkUpdateRow(idx, field, value) {
  if (!_vuBulkRows[idx]) return;
  if (field === 'area' || field === 'list_price') _vuBulkRows[idx][field] = parseFloat(value) || 0;
  else if (field === 'rooms') _vuBulkRows[idx][field] = parseInt(value) || 0;
  else _vuBulkRows[idx][field] = value;
}

function vuBulkSelectAll(sel) {
  _vuBulkRows.forEach(function(r) { r.checked = !!sel; });
  vuRenderBulkPreview();
}

function vuConfirmBulkCreate() {
  var projectId = (document.getElementById('vub-project') || {}).value || '';
  if (!projectId) { toast('Seleccione un proyecto', 'error'); return; }

  var toCreate = _vuBulkRows.filter(function(r) { return r.checked; });
  if (!toCreate.length) { toast('No hay unidades seleccionadas', 'error'); return; }

  var existing = DB.getAll('unidades');
  var existNums = {};
  existing.forEach(function(u) { if (u.project_id === projectId) existNums[u.number] = true; });

  var dups = toCreate.filter(function(r) { return existNums[r.number]; });
  if (dups.length) {
    var names = dups.slice(0, 4).map(function(d) { return d.number; }).join(', ');
    toast('Numeros duplicados: ' + names + (dups.length > 4 ? '...' : ''), 'error');
    return;
  }

  toCreate.forEach(function(r) {
    DB.insert('unidades', {
      project_id: projectId,
      number: r.number,
      floor: r.floor || '',
      type: r.type || 'dept',
      area: r.area || 0,
      rooms: r.rooms || 0,
      list_price: r.list_price || 0,
      currency: r.currency || 'USD',
      status: r.status || 'available',
      notes: '',
    });
  });

  closeModal();
  toast(toCreate.length + ' unidades creadas correctamente', 'success');
  vuRenderUnidades();
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
