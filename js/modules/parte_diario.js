/* ===== PARTE DIARIO DE OBRA ===== */

var _pdState = { view: 'list', id: null, filter_project: '', filter_date_from: '', filter_date_to: '' };
var _pdFormRows = { personal: [], maquinaria: [], tareas: [], materiales: [] };

/* ---- Entry point ---- */
function renderParteDiario() {
  var bc = document.getElementById('breadcrumb-section');
  if (bc) bc.textContent = 'Parte Diario';

  if (_pdState.view === 'detail' && _pdState.id) {
    _pdDetailView(_pdState.id);
  } else if (_pdState.view === 'form') {
    _pdFormView(_pdState.id);
  } else {
    _pdState.view = 'list';
    _pdListView();
  }
}

/* ================================================================
   LIST VIEW
   ================================================================ */
function _pdListView() {
  var partes   = DB.getAll('partesDiarios');
  var projects = DB.getAll('projects');
  var today    = todayStr();

  /* --- KPIs --- */
  var partesHoy      = partes.filter(function(p) { return p.fecha === today; });
  var totalPersonal  = partesHoy.reduce(function(sum, p) {
    return sum + (p.personal || []).reduce(function(s, row) { return s + (Number(row.cantidad) || 0); }, 0);
  }, 0);
  var proyectosHoy   = (function() {
    var seen = {};
    partesHoy.forEach(function(p) { if (p.project_id) seen[p.project_id] = 1; });
    return Object.keys(seen).length;
  }());
  var totalHistorico = partes.length;

  /* --- Filtering --- */
  var filtered = partes.filter(function(p) {
    if (_pdState.filter_project && p.project_id !== _pdState.filter_project) return false;
    if (_pdState.filter_date_from && p.fecha < _pdState.filter_date_from) return false;
    if (_pdState.filter_date_to   && p.fecha > _pdState.filter_date_to)   return false;
    return true;
  });
  filtered.sort(function(a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });

  /* --- Project options --- */
  var projOpts = '<option value="">Todos los proyectos</option>' +
    projects.map(function(p) {
      return '<option value="' + p.id + '"' + (_pdState.filter_project === p.id ? ' selected' : '') + '>' + escapeHtml(p.name) + '</option>';
    }).join('');

  /* --- Table rows --- */
  var climaIcons = { soleado: 'fa-sun', nublado: 'fa-cloud', lluvioso: 'fa-cloud-rain', tormenta: 'fa-bolt', helada: 'fa-snowflake' };
  var rows = filtered.length ? filtered.map(function(pd) {
    var proj      = projects.find(function(p) { return p.id === pd.project_id; });
    var climaIcon = climaIcons[pd.clima_condicion] || 'fa-cloud';
    var nPersonal = (pd.personal || []).reduce(function(s, r) { return s + (Number(r.cantidad) || 0); }, 0);
    var nMaq      = (pd.maquinaria || []).length;
    var estadoBadge = pd.status === 'enviado'
      ? '<span class="badge badge-green">Enviado</span>'
      : '<span class="badge badge-yellow">Borrador</span>';

    return '<tr>' +
      '<td>' + fmtDate(pd.fecha) + '</td>' +
      '<td>' + (proj ? escapeHtml(proj.name) : '<span style="color:var(--text-muted)">—</span>') + '</td>' +
      '<td>' + escapeHtml(pd.supervisor || '—') + '</td>' +
      '<td style="text-align:center"><i class="fas ' + climaIcon + '" title="' + escapeHtml(pd.clima_condicion || '') + '" style="color:var(--primary)"></i></td>' +
      '<td style="text-align:center">' + nPersonal + '</td>' +
      '<td style="text-align:center">' + nMaq + '</td>' +
      '<td>' + estadoBadge + '</td>' +
      '<td>' +
        '<div class="table-actions">' +
          '<button class="btn btn-ghost btn-sm" onclick="pdViewDetail(\'' + pd.id + '\')"><i class="fas fa-eye"></i></button>' +
          '<button class="btn btn-ghost btn-sm" onclick="pdOpenForm(\'' + pd.id + '\')"><i class="fas fa-edit"></i></button>' +
          '<button class="btn btn-ghost btn-sm danger" onclick="pdDelete(\'' + pd.id + '\')"><i class="fas fa-trash"></i></button>' +
        '</div>' +
      '</td>' +
      '</tr>';
  }).join('') : '';

  var tableOrEmpty = filtered.length
    ? '<div class="table-wrap"><table>' +
        '<thead><tr>' +
          '<th>Fecha</th><th>Proyecto</th><th>Supervisor</th><th style="text-align:center">Clima</th>' +
          '<th style="text-align:center">Personal</th><th style="text-align:center">Maquinaria</th>' +
          '<th>Estado</th><th>Acciones</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div>'
    : '<div class="empty-state">' +
        '<i class="fas fa-hard-hat"></i>' +
        '<p>No hay partes diarios' + ((_pdState.filter_project || _pdState.filter_date_from || _pdState.filter_date_to) ? ' para los filtros seleccionados.' : ' registrados aún.') + '</p>' +
        '<button class="btn btn-primary" onclick="pdOpenForm()"><i class="fas fa-plus"></i> Nuevo Parte</button>' +
      '</div>';

  document.getElementById('content').innerHTML =
    /* Page header */
    '<div class="page-header">' +
      '<div class="page-title">' +
        '<i class="fas fa-hard-hat" style="margin-right:8px;color:var(--primary)"></i>Parte Diario de Obra' +
        '<div class="page-subtitle">Registro diario de personal, maquinaria, trabajos y novedades</div>' +
      '</div>' +
      '<div class="page-actions">' +
        '<button class="btn btn-primary" onclick="pdOpenForm()"><i class="fas fa-plus"></i> Nuevo Parte</button>' +
      '</div>' +
    '</div>' +

    /* KPIs */
    '<div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">' +
      '<div class="stat-card">' +
        '<div class="stat-icon blue"><i class="fas fa-file-alt"></i></div>' +
        '<div><div class="stat-value">' + partesHoy.length + '</div><div class="stat-label">Partes hoy</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon green"><i class="fas fa-users"></i></div>' +
        '<div><div class="stat-value">' + totalPersonal + '</div><div class="stat-label">Personal en obra hoy</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon yellow"><i class="fas fa-building"></i></div>' +
        '<div><div class="stat-value">' + proyectosHoy + '</div><div class="stat-label">Proyectos activos hoy</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon blue"><i class="fas fa-archive"></i></div>' +
        '<div><div class="stat-value">' + totalHistorico + '</div><div class="stat-label">Total histórico</div></div>' +
      '</div>' +
    '</div>' +

    /* Filter bar */
    '<div class="filter-bar" style="margin-bottom:16px">' +
      '<select class="form-control" style="min-width:200px" onchange="pdSetFilter(\'filter_project\',this.value)">' + projOpts + '</select>' +
      '<label class="form-label" style="margin:0;white-space:nowrap;color:var(--text-muted)">Desde:</label>' +
      '<input type="date" class="form-control" style="width:150px" value="' + escapeHtml(_pdState.filter_date_from) + '" onchange="pdSetFilter(\'filter_date_from\',this.value)">' +
      '<label class="form-label" style="margin:0;white-space:nowrap;color:var(--text-muted)">Hasta:</label>' +
      '<input type="date" class="form-control" style="width:150px" value="' + escapeHtml(_pdState.filter_date_to) + '" onchange="pdSetFilter(\'filter_date_to\',this.value)">' +
      '<button class="btn btn-secondary" onclick="pdClearFilters()"><i class="fas fa-times"></i> Limpiar</button>' +
    '</div>' +

    /* Table card */
    '<div class="card"><div class="card-body" style="padding:0">' +
      tableOrEmpty +
    '</div></div>';
}

/* ================================================================
   DETAIL VIEW
   ================================================================ */
function _pdDetailView(id) {
  var pd       = DB.getById('partesDiarios', id);
  var projects = DB.getAll('projects');

  if (!pd) {
    toast('Parte diario no encontrado', 'error');
    _pdState.view = 'list';
    _pdListView();
    return;
  }

  var proj = projects.find(function(p) { return p.id === pd.project_id; });
  var climaLabels = { soleado: 'Soleado', nublado: 'Nublado', lluvioso: 'Lluvioso', tormenta: 'Tormenta', helada: 'Helada' };
  var climaIcons  = { soleado: 'fa-sun', nublado: 'fa-cloud', lluvioso: 'fa-cloud-rain', tormenta: 'fa-bolt', helada: 'fa-snowflake' };

  /* Personal table */
  var personalRows = (pd.personal || []).map(function(r) {
    return '<tr><td>' + escapeHtml(r.gremio || '—') + '</td><td style="text-align:center">' + (r.cantidad || 0) + '</td><td style="text-align:center">' + (r.horas || 0) + '</td></tr>';
  }).join('');
  var personalTable = personalRows
    ? '<div class="table-wrap"><table><thead><tr><th>Gremio / Oficio</th><th style="text-align:center">Cantidad</th><th style="text-align:center">Horas</th></tr></thead><tbody>' + personalRows + '</tbody></table></div>'
    : '<p style="color:var(--text-muted);margin:8px 0">Sin personal registrado.</p>';

  /* Maquinaria table */
  var maqRows = (pd.maquinaria || []).map(function(r) {
    return '<tr><td>' + escapeHtml(r.descripcion || '—') + '</td><td style="text-align:center">' + (r.cantidad || 0) + '</td><td style="text-align:center">' + (r.horas || 0) + '</td></tr>';
  }).join('');
  var maqTable = maqRows
    ? '<div class="table-wrap"><table><thead><tr><th>Descripción</th><th style="text-align:center">Cantidad</th><th style="text-align:center">Horas</th></tr></thead><tbody>' + maqRows + '</tbody></table></div>'
    : '<p style="color:var(--text-muted);margin:8px 0">Sin maquinaria registrada.</p>';

  /* Tareas table */
  var tareasRows = (pd.tareas || []).map(function(r) {
    return '<tr><td>' + escapeHtml(r.sector || '—') + '</td><td>' + escapeHtml(r.descripcion || '—') + '</td><td style="text-align:center">' + (r.avance !== '' && r.avance !== undefined ? r.avance + '%' : '—') + '</td></tr>';
  }).join('');
  var tareasTable = tareasRows
    ? '<div class="table-wrap"><table><thead><tr><th>Sector / Área</th><th>Descripción</th><th style="text-align:center">% Avance</th></tr></thead><tbody>' + tareasRows + '</tbody></table></div>'
    : '<p style="color:var(--text-muted);margin:8px 0">Sin trabajos registrados.</p>';

  /* Materiales table */
  var matRows = (pd.materiales || []).map(function(r) {
    return '<tr><td>' + escapeHtml(r.descripcion || '—') + '</td><td style="text-align:center">' + (r.cantidad || 0) + '</td><td>' + escapeHtml(r.unidad || '—') + '</td></tr>';
  }).join('');
  var matTable = matRows
    ? '<div class="table-wrap"><table><thead><tr><th>Descripción</th><th style="text-align:center">Cantidad</th><th>Unidad</th></tr></thead><tbody>' + matRows + '</tbody></table></div>'
    : '<p style="color:var(--text-muted);margin:8px 0">Sin materiales registrados.</p>';

  var estadoBadge = pd.status === 'enviado'
    ? '<span class="badge badge-green" style="font-size:13px;padding:4px 12px">Enviado</span>'
    : '<span class="badge badge-yellow" style="font-size:13px;padding:4px 12px">Borrador</span>';

  document.getElementById('content').innerHTML =
    '<div class="page-header">' +
      '<div class="page-title">' +
        '<i class="fas fa-file-alt" style="margin-right:8px;color:var(--primary)"></i>Parte Diario' +
        '<div class="page-subtitle">' + fmtDate(pd.fecha) + ' — ' + escapeHtml(proj ? proj.name : 'Sin proyecto') + '</div>' +
      '</div>' +
      '<div class="page-actions">' +
        '<button class="btn btn-secondary" onclick="pdGoList()"><i class="fas fa-arrow-left"></i> Volver</button>' +
        '<button class="btn btn-primary" onclick="pdOpenForm(\'' + pd.id + '\')"><i class="fas fa-edit"></i> Editar</button>' +
      '</div>' +
    '</div>' +

    /* Header info card */
    '<div class="card" style="margin-bottom:16px"><div class="card-body">' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px">' +
        '<div><span style="color:var(--text-muted);font-size:12px">FECHA</span><div style="font-weight:600;margin-top:2px">' + fmtDate(pd.fecha) + '</div></div>' +
        '<div><span style="color:var(--text-muted);font-size:12px">PROYECTO</span><div style="font-weight:600;margin-top:2px">' + escapeHtml(proj ? proj.name : '—') + '</div></div>' +
        '<div><span style="color:var(--text-muted);font-size:12px">SUPERVISOR</span><div style="font-weight:600;margin-top:2px">' + escapeHtml(pd.supervisor || '—') + '</div></div>' +
        '<div><span style="color:var(--text-muted);font-size:12px">CLIMA</span><div style="font-weight:600;margin-top:2px"><i class="fas ' + (climaIcons[pd.clima_condicion] || 'fa-cloud') + '" style="margin-right:4px"></i>' + (climaLabels[pd.clima_condicion] || '—') + (pd.temperatura !== '' && pd.temperatura !== undefined ? ' · ' + pd.temperatura + '°C' : '') + '</div></div>' +
        '<div><span style="color:var(--text-muted);font-size:12px">ESTADO</span><div style="margin-top:4px">' + estadoBadge + '</div></div>' +
      '</div>' +
    '</div></div>' +

    /* Personal */
    '<div class="card" style="margin-bottom:16px"><div class="card-body">' +
      '<h3 style="margin:0 0 12px;font-size:15px;font-weight:600"><i class="fas fa-users" style="margin-right:6px;color:var(--primary)"></i>Personal en Obra</h3>' +
      personalTable +
    '</div></div>' +

    /* Maquinaria */
    '<div class="card" style="margin-bottom:16px"><div class="card-body">' +
      '<h3 style="margin:0 0 12px;font-size:15px;font-weight:600"><i class="fas fa-truck" style="margin-right:6px;color:var(--primary)"></i>Maquinaria y Equipos</h3>' +
      maqTable +
    '</div></div>' +

    /* Tareas */
    '<div class="card" style="margin-bottom:16px"><div class="card-body">' +
      '<h3 style="margin:0 0 12px;font-size:15px;font-weight:600"><i class="fas fa-tasks" style="margin-right:6px;color:var(--primary)"></i>Trabajos Realizados</h3>' +
      tareasTable +
    '</div></div>' +

    /* Materiales */
    '<div class="card" style="margin-bottom:16px"><div class="card-body">' +
      '<h3 style="margin:0 0 12px;font-size:15px;font-weight:600"><i class="fas fa-boxes" style="margin-right:6px;color:var(--primary)"></i>Materiales Ingresados</h3>' +
      matTable +
    '</div></div>' +

    /* Incidentes + Observaciones */
    '<div class="card"><div class="card-body">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">' +
        '<div>' +
          '<h3 style="margin:0 0 8px;font-size:15px;font-weight:600"><i class="fas fa-exclamation-triangle" style="margin-right:6px;color:var(--primary)"></i>Incidentes / Novedades</h3>' +
          '<p style="white-space:pre-wrap;color:' + (pd.incidentes ? 'var(--text)' : 'var(--text-muted)') + ';margin:0">' + escapeHtml(pd.incidentes || 'Sin novedades.') + '</p>' +
        '</div>' +
        '<div>' +
          '<h3 style="margin:0 0 8px;font-size:15px;font-weight:600"><i class="fas fa-comment-alt" style="margin-right:6px;color:var(--primary)"></i>Observaciones Generales</h3>' +
          '<p style="white-space:pre-wrap;color:' + (pd.observaciones ? 'var(--text)' : 'var(--text-muted)') + ';margin:0">' + escapeHtml(pd.observaciones || 'Sin observaciones.') + '</p>' +
        '</div>' +
      '</div>' +
    '</div></div>';
}

/* ================================================================
   FORM VIEW
   ================================================================ */
function _pdFormView(id) {
  var projects = DB.getAll('projects');
  var pd       = id ? DB.getById('partesDiarios', id) : null;
  var isEdit   = !!pd;

  /* Initialise row state from existing data or fresh */
  _pdFormRows.personal   = pd && pd.personal   ? pd.personal.map(function(r) { return Object.assign({}, r); })   : [];
  _pdFormRows.maquinaria = pd && pd.maquinaria ? pd.maquinaria.map(function(r) { return Object.assign({}, r); }) : [];
  _pdFormRows.tareas     = pd && pd.tareas     ? pd.tareas.map(function(r) { return Object.assign({}, r); })     : [];
  _pdFormRows.materiales = pd && pd.materiales ? pd.materiales.map(function(r) { return Object.assign({}, r); }) : [];

  /* Default supervisor from current user */
  var defaultSupervisor = '';
  if (window.APP_STATE && window.APP_STATE.currentUser && window.APP_STATE.currentUser.name) {
    defaultSupervisor = window.APP_STATE.currentUser.name;
  }

  var projOpts = '<option value="">Seleccionar proyecto...</option>' +
    projects.map(function(p) {
      return '<option value="' + p.id + '"' + (pd && pd.project_id === p.id ? ' selected' : '') + '>' + escapeHtml(p.name) + '</option>';
    }).join('');

  var climaOpts = ['soleado', 'nublado', 'lluvioso', 'tormenta', 'helada'].map(function(c) {
    var label = { soleado: 'Soleado', nublado: 'Nublado', lluvioso: 'Lluvioso', tormenta: 'Tormenta', helada: 'Helada' }[c];
    return '<option value="' + c + '"' + (pd && pd.clima_condicion === c ? ' selected' : '') + '>' + label + '</option>';
  }).join('');

  document.getElementById('content').innerHTML =
    '<div class="page-header">' +
      '<div class="page-title">' +
        '<i class="fas fa-' + (isEdit ? 'edit' : 'plus-circle') + '" style="margin-right:8px;color:var(--primary)"></i>' +
        (isEdit ? 'Editar Parte Diario' : 'Nuevo Parte Diario') +
        '<div class="page-subtitle">' + (isEdit ? 'Modificar parte del ' + fmtDate(pd.fecha) : 'Registrar actividad diaria de obra') + '</div>' +
      '</div>' +
      '<div class="page-actions">' +
        '<button class="btn btn-secondary" onclick="pdGoList()"><i class="fas fa-times"></i> Cancelar</button>' +
        '<button class="btn btn-primary" onclick="pdGuardar()"><i class="fas fa-save"></i> Guardar</button>' +
      '</div>' +
    '</div>' +

    '<div class="card"><div class="card-body">' +

      /* Row 1: Fecha / Proyecto / Supervisor */
      '<div style="display:grid;grid-template-columns:1fr 2fr 1fr;gap:16px;margin-bottom:16px">' +
        '<div class="form-group">' +
          '<label class="form-label">Fecha <span style="color:var(--danger)">*</span></label>' +
          '<input type="date" id="pd-fecha" class="form-control" value="' + (pd ? pd.fecha : todayStr()) + '">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Proyecto <span style="color:var(--danger)">*</span></label>' +
          '<select id="pd-project" class="form-control">' + projOpts + '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Supervisor</label>' +
          '<input type="text" id="pd-supervisor" class="form-control" placeholder="Nombre del supervisor" value="' + escapeHtml(pd ? (pd.supervisor || '') : defaultSupervisor) + '">' +
        '</div>' +
      '</div>' +

      /* Row 2: Clima */
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">' +
        '<div class="form-group">' +
          '<label class="form-label">Condición climática</label>' +
          '<select id="pd-clima-condicion" class="form-control">' +
            '<option value="">Seleccionar...</option>' +
            climaOpts +
          '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Temperatura (°C)</label>' +
          '<input type="number" id="pd-temperatura" class="form-control" placeholder="Ej: 22" value="' + (pd && pd.temperatura !== undefined ? pd.temperatura : '') + '">' +
        '</div>' +
      '</div>' +

      /* Personal */
      '<div style="margin-bottom:24px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
          '<h3 style="margin:0;font-size:15px;font-weight:600"><i class="fas fa-users" style="margin-right:6px;color:var(--primary)"></i>Personal en Obra</h3>' +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="pdAddRow(\'personal\')"><i class="fas fa-plus"></i> Agregar fila</button>' +
        '</div>' +
        '<div class="table-wrap" id="pd-table-personal">' +
          _pdBuildRowTable('personal') +
        '</div>' +
      '</div>' +

      /* Maquinaria */
      '<div style="margin-bottom:24px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
          '<h3 style="margin:0;font-size:15px;font-weight:600"><i class="fas fa-truck" style="margin-right:6px;color:var(--primary)"></i>Maquinaria y Equipos</h3>' +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="pdAddRow(\'maquinaria\')"><i class="fas fa-plus"></i> Agregar fila</button>' +
        '</div>' +
        '<div class="table-wrap" id="pd-table-maquinaria">' +
          _pdBuildRowTable('maquinaria') +
        '</div>' +
      '</div>' +

      /* Tareas */
      '<div style="margin-bottom:24px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
          '<h3 style="margin:0;font-size:15px;font-weight:600"><i class="fas fa-tasks" style="margin-right:6px;color:var(--primary)"></i>Trabajos Realizados</h3>' +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="pdAddRow(\'tareas\')"><i class="fas fa-plus"></i> Agregar fila</button>' +
        '</div>' +
        '<div class="table-wrap" id="pd-table-tareas">' +
          _pdBuildRowTable('tareas') +
        '</div>' +
      '</div>' +

      /* Materiales */
      '<div style="margin-bottom:24px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
          '<h3 style="margin:0;font-size:15px;font-weight:600"><i class="fas fa-boxes" style="margin-right:6px;color:var(--primary)"></i>Materiales Ingresados</h3>' +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="pdAddRow(\'materiales\')"><i class="fas fa-plus"></i> Agregar fila</button>' +
        '</div>' +
        '<div class="table-wrap" id="pd-table-materiales">' +
          _pdBuildRowTable('materiales') +
        '</div>' +
      '</div>' +

      /* Incidentes + Observaciones */
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">' +
        '<div class="form-group">' +
          '<label class="form-label">Incidentes / Novedades</label>' +
          '<textarea id="pd-incidentes" class="form-control" rows="4" placeholder="Registrar incidentes, accidentes, novedades importantes...">' + escapeHtml(pd ? (pd.incidentes || '') : '') + '</textarea>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Observaciones Generales</label>' +
          '<textarea id="pd-observaciones" class="form-control" rows="4" placeholder="Observaciones adicionales sobre el avance, clima, logística...">' + escapeHtml(pd ? (pd.observaciones || '') : '') + '</textarea>' +
        '</div>' +
      '</div>' +

      /* Status toggle */
      '<div style="display:flex;align-items:center;gap:16px;padding-top:16px;border-top:1px solid var(--border)">' +
        '<span class="form-label" style="margin:0">Estado del parte:</span>' +
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer">' +
          '<input type="radio" name="pd-status" id="pd-status-borrador" value="borrador"' + ((!pd || pd.status !== 'enviado') ? ' checked' : '') + '> Borrador' +
        '</label>' +
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer">' +
          '<input type="radio" name="pd-status" id="pd-status-enviado" value="enviado"' + (pd && pd.status === 'enviado' ? ' checked' : '') + '> Enviado' +
        '</label>' +
      '</div>' +

    '</div></div>' +

    '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px">' +
      '<button class="btn btn-secondary" onclick="pdGoList()"><i class="fas fa-times"></i> Cancelar</button>' +
      '<button class="btn btn-primary" onclick="pdGuardar()"><i class="fas fa-save"></i> Guardar Parte</button>' +
    '</div>';
}

/* ================================================================
   ROW TABLE BUILDER (returns HTML string for a section's table)
   ================================================================ */
function _pdBuildRowTable(type) {
  var rows = _pdFormRows[type];

  if (type === 'personal') {
    var header = '<table><thead><tr><th>Gremio / Oficio</th><th style="width:100px;text-align:center">Cantidad</th><th style="width:100px;text-align:center">Horas</th><th style="width:48px"></th></tr></thead><tbody>';
    if (!rows.length) {
      return header + '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:12px">Sin filas. Usá "Agregar fila".</td></tr></tbody></table>';
    }
    var bodyRows = rows.map(function(r, i) {
      return '<tr>' +
        '<td><input type="text" class="form-control" placeholder="Ej: Albañil, Oficial..." value="' + escapeHtml(r.gremio) + '" oninput="pdUpdateRow(\'personal\',' + i + ',\'gremio\',this.value)"></td>' +
        '<td><input type="number" class="form-control" style="text-align:center" min="0" value="' + r.cantidad + '" oninput="pdUpdateRow(\'personal\',' + i + ',\'cantidad\',this.value)"></td>' +
        '<td><input type="number" class="form-control" style="text-align:center" min="0" step="0.5" value="' + r.horas + '" oninput="pdUpdateRow(\'personal\',' + i + ',\'horas\',this.value)"></td>' +
        '<td><button type="button" class="btn btn-ghost btn-sm danger" onclick="pdRemoveRow(\'personal\',' + i + ')"><i class="fas fa-times"></i></button></td>' +
        '</tr>';
    }).join('');
    return header + bodyRows + '</tbody></table>';
  }

  if (type === 'maquinaria') {
    var header = '<table><thead><tr><th>Descripción</th><th style="width:100px;text-align:center">Cantidad</th><th style="width:100px;text-align:center">Horas</th><th style="width:48px"></th></tr></thead><tbody>';
    if (!rows.length) {
      return header + '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:12px">Sin filas. Usá "Agregar fila".</td></tr></tbody></table>';
    }
    var bodyRows = rows.map(function(r, i) {
      return '<tr>' +
        '<td><input type="text" class="form-control" placeholder="Ej: Retroexcavadora, Mixer..." value="' + escapeHtml(r.descripcion) + '" oninput="pdUpdateRow(\'maquinaria\',' + i + ',\'descripcion\',this.value)"></td>' +
        '<td><input type="number" class="form-control" style="text-align:center" min="0" value="' + r.cantidad + '" oninput="pdUpdateRow(\'maquinaria\',' + i + ',\'cantidad\',this.value)"></td>' +
        '<td><input type="number" class="form-control" style="text-align:center" min="0" step="0.5" value="' + r.horas + '" oninput="pdUpdateRow(\'maquinaria\',' + i + ',\'horas\',this.value)"></td>' +
        '<td><button type="button" class="btn btn-ghost btn-sm danger" onclick="pdRemoveRow(\'maquinaria\',' + i + ')"><i class="fas fa-times"></i></button></td>' +
        '</tr>';
    }).join('');
    return header + bodyRows + '</tbody></table>';
  }

  if (type === 'tareas') {
    var header = '<table><thead><tr><th style="width:160px">Sector / Área</th><th>Descripción</th><th style="width:100px;text-align:center">% Avance</th><th style="width:48px"></th></tr></thead><tbody>';
    if (!rows.length) {
      return header + '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:12px">Sin filas. Usá "Agregar fila".</td></tr></tbody></table>';
    }
    var bodyRows = rows.map(function(r, i) {
      return '<tr>' +
        '<td><input type="text" class="form-control" placeholder="Ej: Planta baja..." value="' + escapeHtml(r.sector) + '" oninput="pdUpdateRow(\'tareas\',' + i + ',\'sector\',this.value)"></td>' +
        '<td><input type="text" class="form-control" placeholder="Describa el trabajo realizado..." value="' + escapeHtml(r.descripcion) + '" oninput="pdUpdateRow(\'tareas\',' + i + ',\'descripcion\',this.value)"></td>' +
        '<td><input type="number" class="form-control" style="text-align:center" min="0" max="100" placeholder="0-100" value="' + escapeHtml(String(r.avance !== undefined ? r.avance : '')) + '" oninput="pdUpdateRow(\'tareas\',' + i + ',\'avance\',this.value)"></td>' +
        '<td><button type="button" class="btn btn-ghost btn-sm danger" onclick="pdRemoveRow(\'tareas\',' + i + ')"><i class="fas fa-times"></i></button></td>' +
        '</tr>';
    }).join('');
    return header + bodyRows + '</tbody></table>';
  }

  if (type === 'materiales') {
    var header = '<table><thead><tr><th>Descripción</th><th style="width:110px;text-align:center">Cantidad</th><th style="width:110px">Unidad</th><th style="width:48px"></th></tr></thead><tbody>';
    if (!rows.length) {
      return header + '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:12px">Sin filas. Usá "Agregar fila".</td></tr></tbody></table>';
    }
    var unidades = ['u', 'kg', 'tn', 'm', 'm2', 'm3', 'l', 'bolsa', 'rollo', 'caja'];
    var bodyRows = rows.map(function(r, i) {
      var uOpts = unidades.map(function(u) {
        return '<option value="' + u + '"' + (r.unidad === u ? ' selected' : '') + '>' + u + '</option>';
      }).join('');
      return '<tr>' +
        '<td><input type="text" class="form-control" placeholder="Descripción del material..." value="' + escapeHtml(r.descripcion) + '" oninput="pdUpdateRow(\'materiales\',' + i + ',\'descripcion\',this.value)"></td>' +
        '<td><input type="number" class="form-control" style="text-align:center" min="0" value="' + r.cantidad + '" oninput="pdUpdateRow(\'materiales\',' + i + ',\'cantidad\',this.value)"></td>' +
        '<td><select class="form-control" onchange="pdUpdateRow(\'materiales\',' + i + ',\'unidad\',this.value)">' + uOpts + '</select></td>' +
        '<td><button type="button" class="btn btn-ghost btn-sm danger" onclick="pdRemoveRow(\'materiales\',' + i + ')"><i class="fas fa-times"></i></button></td>' +
        '</tr>';
    }).join('');
    return header + bodyRows + '</tbody></table>';
  }

  return '<p style="color:var(--text-muted)">Tipo desconocido.</p>';
}

/* ================================================================
   DYNAMIC ROW MANAGEMENT
   ================================================================ */
function pdAddRow(type) {
  var defaults = {
    personal:   { gremio: '', cantidad: 1, horas: 8 },
    maquinaria: { descripcion: '', cantidad: 1, horas: 8 },
    tareas:     { sector: '', descripcion: '', avance: '' },
    materiales: { descripcion: '', cantidad: 0, unidad: 'u' }
  };
  if (!defaults[type]) return;
  _pdFormRows[type].push(Object.assign({}, defaults[type]));
  _pdRenderRowTable(type);
}

function pdRemoveRow(type, idx) {
  _pdFormRows[type].splice(idx, 1);
  _pdRenderRowTable(type);
}

function pdUpdateRow(type, idx, field, value) {
  if (_pdFormRows[type] && _pdFormRows[type][idx] !== undefined) {
    _pdFormRows[type][idx][field] = value;
  }
}

function _pdRenderRowTable(type) {
  var container = document.getElementById('pd-table-' + type);
  if (container) {
    container.innerHTML = _pdBuildRowTable(type);
  }
}

/* ================================================================
   SAVE
   ================================================================ */
function pdGuardar() {
  var fecha      = (document.getElementById('pd-fecha') || {}).value || '';
  var projectId  = (document.getElementById('pd-project') || {}).value || '';
  var supervisor = (document.getElementById('pd-supervisor') || {}).value || '';
  var climaCond  = (document.getElementById('pd-clima-condicion') || {}).value || '';
  var temp       = (document.getElementById('pd-temperatura') || {}).value;
  var incidentes = (document.getElementById('pd-incidentes') || {}).value || '';
  var observaciones = (document.getElementById('pd-observaciones') || {}).value || '';
  var statusEl   = document.querySelector('input[name="pd-status"]:checked');
  var status     = statusEl ? statusEl.value : 'borrador';

  /* Validation */
  if (!fecha) {
    toast('La fecha es obligatoria.', 'error');
    return;
  }
  if (!projectId) {
    toast('Debe seleccionar un proyecto.', 'error');
    return;
  }

  /* Read rows (snapshot current state) */
  var personal   = _pdFormRows.personal.map(function(r) { return { gremio: r.gremio, cantidad: Number(r.cantidad) || 0, horas: Number(r.horas) || 0 }; });
  var maquinaria = _pdFormRows.maquinaria.map(function(r) { return { descripcion: r.descripcion, cantidad: Number(r.cantidad) || 0, horas: Number(r.horas) || 0 }; });
  var tareas     = _pdFormRows.tareas.map(function(r) { return { sector: r.sector, descripcion: r.descripcion, avance: r.avance !== '' ? Number(r.avance) : '' }; });
  var materiales = _pdFormRows.materiales.map(function(r) { return { descripcion: r.descripcion, cantidad: Number(r.cantidad) || 0, unidad: r.unidad || 'u' }; });

  var data = {
    fecha: fecha,
    project_id: projectId,
    supervisor: supervisor,
    clima_condicion: climaCond,
    temperatura: temp !== '' && temp !== undefined ? Number(temp) : '',
    personal: personal,
    maquinaria: maquinaria,
    tareas: tareas,
    materiales: materiales,
    incidentes: incidentes,
    observaciones: observaciones,
    status: status
  };

  if (_pdState.id) {
    DB.update('partesDiarios', _pdState.id, data);
    toast('Parte diario actualizado.', 'success');
  } else {
    DB.insert('partesDiarios', data);
    toast('Parte diario creado.', 'success');
  }

  _pdState.view = 'list';
  _pdState.id   = null;
  _pdFormRows   = { personal: [], maquinaria: [], tareas: [], materiales: [] };
  _pdListView();
}

/* ================================================================
   DELETE
   ================================================================ */
function pdDelete(id) {
  confirmDialog('¿Eliminar este parte diario? Esta acción no se puede deshacer.', function() {
    DB.remove('partesDiarios', id);
    toast('Parte diario eliminado.', 'success');
    _pdState.view = 'list';
    _pdState.id   = null;
    renderParteDiario();
  });
}

/* ================================================================
   NAVIGATION HELPERS
   ================================================================ */
function pdGoList() {
  _pdState.view = 'list';
  _pdState.id   = null;
  _pdFormRows   = { personal: [], maquinaria: [], tareas: [], materiales: [] };
  _pdListView();
}

function pdViewDetail(id) {
  _pdState.view = 'detail';
  _pdState.id   = id;
  _pdDetailView(id);
}

function pdOpenForm(id) {
  _pdState.view = 'form';
  _pdState.id   = id || null;
  _pdFormView(_pdState.id);
}

/* ================================================================
   FILTER HELPERS
   ================================================================ */
function pdSetFilter(key, value) {
  _pdState[key] = value;
  _pdListView();
}

function pdClearFilters() {
  _pdState.filter_project   = '';
  _pdState.filter_date_from = '';
  _pdState.filter_date_to   = '';
  _pdListView();
}
