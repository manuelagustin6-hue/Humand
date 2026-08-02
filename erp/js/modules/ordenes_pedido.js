/* ===== ÓRDENES DE PEDIDO ===== */

const ODP_STATUS = {
  draft:    { label: 'Borrador',  color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
  pending:  { label: 'Pendiente', color: '#d97706', bg: '#fef9c3', border: '#fde68a' },
  approved: { label: 'Aprobada',  color: '#059669', bg: '#dcfce7', border: '#86efac' },
  rejected: { label: 'Rechazada', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
};
const ODP_CRITICIDAD = { normal: 'Normal', alta: '▲ Alta', urgente: '‼ Urgente' };
const ODP_CRIT_COLOR  = { normal: '#64748b', alta: '#d97706', urgente: '#dc2626' };
const ODP_TIPOS = ['Material', 'Servicio', 'Alquiler', 'Herramienta', 'Equipamiento', 'Otro'];

function _genODPNumber() {
  const all = DB.getAll('purchaseRequests');
  const yr = new Date().getFullYear();
  const seq = all.filter(r => (r.number||'').startsWith('ODP-' + yr)).length + 1;
  return 'ODP-' + yr + '-' + String(seq).padStart(3, '0');
}
function _blankODPItem() {
  return { rubro_id: '', tipo: '', item_desc: '', unit: '', quantity: 0, delivery_date: '' };
}

/* ────────────────────────────────────────── LIST VIEW (estilo Material — piloto) */
function renderOrdenesPedido() {
  const requests = DB.getAll('purchaseRequests');
  const projects = DB.getAll('projects');

  const nTotal    = requests.length;
  const nDraft    = requests.filter(r => r.status === 'draft').length;
  const nPending  = requests.filter(r => r.status === 'pending').length;
  const nApproved = requests.filter(r => r.status === 'approved').length;

  const kpi = (ico, icoClass, num, lbl, tag) => `
    <div class="odp-kpi">
      <div class="odp-kpi-top">
        <div class="odp-kpi-ico ${icoClass}"><i class="fas ${ico}"></i></div>
        ${tag || ''}
      </div>
      <div class="odp-kpi-num" data-odp-target="${num}">0</div>
      <div class="odp-kpi-lbl">${lbl}</div>
    </div>`;

  document.getElementById('content').innerHTML = `
<div class="odp-v2">
  <!-- Encabezado -->
  <div class="odp-head">
    <div>
      <div class="odp-eyebrow"><i class="fas fa-receipt" style="font-size:16px"></i> Procurement</div>
      <h1 class="odp-title">Órdenes de Pedido</h1>
      <p class="odp-sub">Solicitudes de materiales y servicios para las obras activas. Seguí aprobaciones y fechas de entrega en un solo lugar.</p>
    </div>
    <button class="odp-cta" onclick="renderODPForm()"><i class="fas fa-plus-circle"></i> Nueva ODP</button>
  </div>

  <!-- KPIs -->
  <div class="odp-bento">
    ${kpi('fa-list-check','navy', nTotal, 'Total ODPs registradas', '<span class="odp-kpi-tag">Volumen</span>')}
    ${kpi('fa-pen-to-square','gray', nDraft, 'Órdenes en borrador', '<span class="odp-kpi-tag">Borradores</span>')}
    ${kpi('fa-clock','amber', nPending, 'Pendientes de aprobación',
        nPending > 0 ? '<span class="odp-kpi-tag crit"><i class="fas fa-circle-exclamation"></i> Crítico</span>' : '<span class="odp-kpi-tag">En cola</span>')}
    ${kpi('fa-circle-check','green', nApproved, 'Órdenes aprobadas', '<span class="odp-kpi-tag">Al día</span>')}
  </div>

  <!-- Filtros -->
  <div class="odp-filters">
    <div class="odp-search">
      <i class="fas fa-magnifying-glass"></i>
      <input class="odp-field" type="text" placeholder="Buscar por NRO, responsable o comentario..." oninput="filterODP(this.value)">
    </div>
    <div class="odp-filter-group">
      <select class="odp-field" onchange="filterODP(undefined,this.value)">
        <option value="">Todos los estados</option>
        ${Object.entries(ODP_STATUS).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}
      </select>
      <select class="odp-field" onchange="filterODP(undefined,undefined,this.value)">
        <option value="">Todos los proyectos</option>
        ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
      </select>
    </div>
  </div>

  <!-- Tabla -->
  <div class="odp-tablecard">
    <div id="odp-table-wrap">${buildODPTable(requests, projects)}</div>
  </div>
</div>`;

  document.getElementById('breadcrumb').innerHTML = '<i class="fas fa-list-check"></i><span>Órdenes de Pedido</span>';
  window._odpFilters = { q: '', status: '', project: '' };
  _odpAnimateCounters();
}

// Cuenta ascendente para los números de los KPIs (efecto del mockup).
function _odpAnimateCounters() {
  document.querySelectorAll('.odp-v2 .odp-kpi-num').forEach(function(el) {
    var target = +el.getAttribute('data-odp-target') || 0;
    if (target <= 0) { el.textContent = '0'; return; }
    var steps = Math.min(target, 24), i = 0;
    var tick = function() {
      i++;
      el.textContent = String(Math.min(target, Math.ceil(target * i / steps)));
      if (i < steps) requestAnimationFrame(tick);
      else el.textContent = String(target);
    };
    requestAnimationFrame(tick);
  });
}

function _odpProjSub(proj) {
  if (!proj) return '';
  return proj.location || proj.address || proj.ubicacion || proj.client_name || '';
}

function buildODPTable(requests, projects) {
  if (!requests.length) return '<div class="odp-empty"><i class="fas fa-list-check"></i><p>No hay órdenes de pedido. Creá la primera.</p></div>';
  const sorted = requests.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const critClass = { urgente: 'urgente', alta: 'alta', normal: 'normal' };
  const critIcon  = { urgente: 'fa-circle-exclamation', alta: 'fa-bolt', normal: 'fa-clock' };
  const statusClass = { approved: 'approved', draft: 'draft', pending: 'pending', rejected: 'rejected' };

  const rows = sorted.map(r => {
    const proj = projects.find(p => p.id === r.project_id);
    const st = ODP_STATUS[r.status] || ODP_STATUS.draft;
    const stCls = statusClass[r.status] || 'draft';
    const crit = r.criticidad || 'normal';
    const critLabel = (ODP_CRITICIDAD[crit] || 'Normal').replace(/[▲‼]\s*/g, '');
    const nItems = (r.items || []).filter(it => it.item_desc || it.rubro_id).length;
    const sub = _odpProjSub(proj);
    const actions = r.status === 'pending'
      ? '<button class="odp-icobtn" title="Aprobaciones" onclick="event.stopPropagation();navigate(\'aprobaciones\')"><i class="fas fa-clipboard-check"></i></button>' +
        '<button class="odp-icobtn" title="Ver" onclick="event.stopPropagation();renderODPForm(\'' + r.id + '\')"><i class="fas fa-eye"></i></button>'
      : '<button class="odp-icobtn" title="Ver / editar" onclick="event.stopPropagation();renderODPForm(\'' + r.id + '\')"><i class="fas fa-eye"></i></button>' +
        (r.status === 'approved' ? '<button class="odp-icobtn" title="PDF" onclick="event.stopPropagation();printODP(\'' + r.id + '\')"><i class="fas fa-file-pdf"></i></button>' : '') +
        '<button class="odp-icobtn danger" title="Eliminar" onclick="event.stopPropagation();deleteODP(\'' + r.id + '\')"><i class="fas fa-trash"></i></button>';

    return `<tr onclick="renderODPForm('${r.id}')">
      <td><span class="odp-nro">${escapeHtml(r.number || '—')}</span></td>
      <td>
        <span class="odp-proj-name">${escapeHtml(proj ? proj.name : '—')}</span>
        ${sub ? `<span class="odp-proj-sub">${escapeHtml(sub)}</span>` : ''}
      </td>
      <td style="white-space:nowrap">${fmtDate(r.date)}</td>
      <td><span class="crit ${critClass[crit] || 'normal'}"><i class="fas ${critIcon[crit] || 'fa-clock'}"></i> ${critLabel.toUpperCase()}</span></td>
      <td class="tc"><span class="odp-count-chip">${nItems}</span></td>
      <td><span class="pill ${stCls}">${st.label}</span></td>
      <td class="tr"><div class="odp-actions">${actions}</div></td>
    </tr>`;
  }).join('');

  return `
    <div class="odp-scroll">
      <table>
        <thead><tr>
          <th>Nro.</th><th>Proyecto</th><th>Fecha Emisión</th><th>Criticidad</th>
          <th class="tc">Ítems</th><th>Estado</th><th class="tr">Acciones</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="odp-pager">
      <span class="odp-pager-info">Mostrando ${sorted.length} ${sorted.length === 1 ? 'orden' : 'órdenes'}</span>
      <div class="odp-pager-btns">
        <button class="odp-pager-btn" disabled><i class="fas fa-chevron-left"></i></button>
        <button class="odp-pager-btn active">1</button>
        <button class="odp-pager-btn" disabled><i class="fas fa-chevron-right"></i></button>
      </div>
    </div>`;
}

window._odpFilters = { q: '', status: '', project: '' };
function filterODP(q, status, project) {
  if (q !== undefined) window._odpFilters.q = q.toLowerCase();
  if (status !== undefined) window._odpFilters.status = status;
  if (project !== undefined) window._odpFilters.project = project;
  let list = DB.getAll('purchaseRequests');
  const f = window._odpFilters;
  if (f.q) list = list.filter(r => (r.number||'').toLowerCase().includes(f.q) || (r.comentarios||'').toLowerCase().includes(f.q) || (r.responsable||'').toLowerCase().includes(f.q));
  if (f.status) list = list.filter(r => r.status === f.status);
  if (f.project) list = list.filter(r => r.project_id === f.project);
  const wrap = document.getElementById('odp-table-wrap');
  if (wrap) wrap.innerHTML = buildODPTable(list, DB.getAll('projects'));
}

/* ────────────────────────────────────────── FORM VIEW (full page) */
window._odpItems = [];
window._currentODPId = null;

function renderODPForm(id) {
  id = id || null;
  window._currentODPId = id;
  var _c = document.getElementById('content'); if (_c) _c.scrollTop = 0;
  const odp = id ? DB.getById('purchaseRequests', id) : null;
  const projects = DB.getAll('projects');
  const activeProjectId = window.APP_STATE && window.APP_STATE.activeProject;
  const number = odp ? odp.number : _genODPNumber();
  const status = (odp && odp.status) || 'draft';
  const st = ODP_STATUS[status] || ODP_STATUS.draft;

  window._odpItems = ((odp && odp.items) ? odp.items : [_blankODPItem()]).map(it => Object.assign({}, it));

  const LBL = 'font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.6px;text-transform:uppercase;display:block;margin-bottom:5px';
  const FIELD = 'font-size:13px;border:1px solid #e2e8f0;border-radius:8px;background:#fff';

  const projOpts = projects.map(p =>
    `<option value="${p.id}" ${(odp ? odp.project_id : activeProjectId) === p.id ? 'selected' : ''}>${p.name}</option>`).join('');
  const critOpts = Object.entries(ODP_CRITICIDAD).map(([k, v]) =>
    `<option value="${k}" ${(odp ? odp.criticidad : 'normal') === k ? 'selected' : ''}>${v}</option>`).join('');

  const pdfBtn = id ? `<button class="btn btn-secondary" style="font-size:13px" onclick="printODP('${id}')"><i class="fas fa-file-pdf"></i> PDF</button>` : '';

  const actionBtns = status === 'draft'
    ? `${pdfBtn}<button class="btn btn-secondary" style="font-size:13px" onclick="saveODP('${id||''}',true)">Guardar borrador</button>
       <button class="btn btn-primary" style="font-size:13px" onclick="saveODP('${id||''}',false)"><i class="fas fa-paper-plane"></i> Enviar para aprobar</button>`
    : status === 'pending'
    ? `${pdfBtn}<button class="btn btn-danger" style="font-size:13px" onclick="rejectODP('${id}')"><i class="fas fa-times"></i> Rechazar</button>
       <button class="btn btn-success" style="font-size:13px" onclick="approveODP('${id}')"><i class="fas fa-check"></i> Aprobar</button>
       <button class="btn btn-secondary" style="font-size:13px" onclick="saveODP('${id}',false)"><i class="fas fa-save"></i> Guardar</button>`
    : status === 'approved'
    ? `${pdfBtn}<button class="btn btn-secondary" style="font-size:13px" onclick="saveODP('${id}',false)"><i class="fas fa-save"></i> Guardar</button>
       <button class="btn btn-primary" style="font-size:13px" onclick="licNueva('${id}')"><i class="fas fa-gavel"></i> Licitar</button>`
    : `${pdfBtn}<button class="btn btn-secondary" style="font-size:13px" onclick="saveODP('${id}',false)"><i class="fas fa-save"></i> Guardar</button>`;

  // Panel lateral (data real): estado del flujo + presupuesto del proyecto.
  const _prj = DB.getById('projects', (odp ? odp.project_id : activeProjectId) || '') || null;
  const _budget = _prj ? (_prj.budget || 0) : 0;
  const _usedCost = _prj ? DB.getAll('actualCosts').filter(a => a.project_id === _prj.id).reduce((s, a) => s + (a.amount || 0), 0) : 0;
  const _usedPct = _budget > 0 ? Math.min(100, Math.round(_usedCost / _budget * 100)) : 0;
  const _avail = _budget - _usedCost;
  const _s2 = (status === 'pending') ? 'active' : (status === 'approved' || status === 'rejected') ? 'done' : 'wait';
  const _s3 = status === 'approved' ? 'done' : status === 'rejected' ? 'reject' : 'wait';
  const _asideHtml = `
<aside class="odpf-aside">
  <div class="odpf-panel">
    <div class="odpf-panel-title">Estado del flujo</div>
    <div class="odpf-step done"><div class="odpf-step-num"><i class="fas fa-check"></i></div><div>
      <div class="odpf-step-lbl">Creación</div><div class="odpf-step-sub">${odp && odp.responsable ? 'Por ' + escapeHtml(odp.responsable) : 'Borrador iniciado'}</div></div></div>
    <div class="odpf-conn"></div>
    <div class="odpf-step ${_s2}"><div class="odpf-step-num">${_s2 === 'done' ? '<i class="fas fa-check"></i>' : '2'}</div><div>
      <div class="odpf-step-lbl">Enviado a aprobación</div><div class="odpf-step-sub">${_s2 === 'wait' ? 'Pendiente' : 'Enviado'}</div></div></div>
    <div class="odpf-conn"></div>
    <div class="odpf-step ${_s3}"><div class="odpf-step-num">${_s3 === 'done' ? '<i class="fas fa-check"></i>' : _s3 === 'reject' ? '<i class="fas fa-xmark"></i>' : '3'}</div><div>
      <div class="odpf-step-lbl">${status === 'rejected' ? 'Rechazada' : 'Aprobada'}</div>
      <div class="odpf-step-sub">${status === 'approved' ? 'Aprobada' : status === 'rejected' ? 'Rechazada' : 'Pendiente'}</div></div></div>
  </div>
  ${_prj ? `
  <div class="odpf-budget">
    <div class="lbl">Presupuesto del proyecto</div>
    <div class="amt">${fmtMoney(_budget)}</div>
    <div class="bar"><div style="width:${_usedPct}%"></div></div>
    <div class="row"><span>Gastado: ${_usedPct}%</span><span>Disp.: ${fmtMoney(_avail)}</span></div>
    <div style="font-size:11px;opacity:.72;margin-top:12px"><i class="fas fa-diagram-project"></i> ${escapeHtml(_prj.name)}</div>
  </div>` : `
  <div class="odpf-panel" style="text-align:center;color:var(--text-muted);font-size:12px;padding:22px 18px">
    <i class="fas fa-diagram-project" style="font-size:22px;opacity:.4;display:block;margin-bottom:8px"></i>
    Seleccioná un proyecto para ver su presupuesto.
  </div>`}
</aside>`;

  document.getElementById('content').innerHTML = `
<!-- Top bar -->
<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0 16px;flex-wrap:wrap;gap:10px">
  <div style="display:flex;align-items:center;gap:8px;font-size:14px">
    <a href="#" onclick="renderOrdenesPedido();return false" style="color:#2563eb;font-weight:600;text-decoration:none;display:flex;align-items:center;gap:4px"><i class="fas fa-arrow-left" style="font-size:11px"></i> Órdenes de pedido</a>
    <span style="color:#cbd5e1">/</span>
    <strong style="color:#1e293b">${number}</strong>
    <span style="background:${st.bg};color:${st.color};border:1px solid ${st.border};font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:.5px">${st.label}</span>
  </div>
  <div style="display:flex;gap:8px">${actionBtns}</div>
</div>

<div class="odpf-grid">
  <div>
<!-- Header info card -->
<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;box-shadow:0 1px 4px rgba(0,0,0,.04);margin-bottom:14px">
  <div class="form-grid form-grid-2" style="gap:18px 24px">
    <div class="form-group">
      <label style="${LBL}">Proyecto</label>
      <select class="form-control" id="odp-project" style="${FIELD}">
        <option value="">Seleccionar proyecto...</option>${projOpts}
      </select>
    </div>
    <div class="form-group">
      <label style="${LBL}">Fecha *</label>
      <input class="form-control" id="odp-date" type="date" value="${(odp && odp.date) || todayStr()}" style="${FIELD}">
    </div>
    <div class="form-group">
      <label style="${LBL}">Criticidad</label>
      <select class="form-control" id="odp-criticidad" style="${FIELD}">${critOpts}</select>
    </div>
    <div class="form-group">
      <label style="${LBL}">Responsable</label>
      <input class="form-control" id="odp-responsable" value="${(odp && odp.responsable) || ''}" placeholder="Nombre del responsable" style="${FIELD}">
    </div>
    <div class="form-group">
      <label style="${LBL}">Aprobador</label>
      <input class="form-control" id="odp-aprobador" value="${(odp && odp.aprobador) || ''}" placeholder="Nombre del aprobador" style="${FIELD}">
    </div>
    <div class="form-group">
      <label style="${LBL}">Correos extra</label>
      <input class="form-control" id="odp-correos" value="${(odp && odp.correos_extra) || ''}" placeholder="email@ejemplo.com" style="${FIELD}">
    </div>
    <div class="form-group full">
      <label style="${LBL}">Comentarios</label>
      <textarea class="form-control" id="odp-comentarios" rows="2" style="${FIELD}">${(odp && odp.comentarios) || ''}</textarea>
    </div>
  </div>
</div>

<!-- Items table -->
<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.04)">
  <div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center">
    <span style="font-weight:600;font-size:13px;color:#1e293b"><i class="fas fa-table" style="color:#2563eb;margin-right:6px"></i> Ítems solicitados</span>
    <div style="display:flex;gap:8px">
      <button class="btn btn-sm btn-secondary" onclick="openODPImportModal()"><i class="fas fa-file-excel"></i> Importar Excel</button>
      <button class="btn btn-sm btn-secondary" onclick="addODPItem()"><i class="fas fa-plus"></i> Agregar fila</button>
    </div>
  </div>
  <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;min-width:760px">
      <thead>
        <tr style="background:#f8f9fb">
          <th style="width:36px;padding:9px 8px;border-bottom:1px solid #e2e8f0"></th>
          <th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;text-transform:uppercase;min-width:130px">Rubro <i class="fas fa-pencil-alt" style="font-size:9px"></i></th>
          <th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;text-transform:uppercase;min-width:110px">Tipo <i class="fas fa-pencil-alt" style="font-size:9px"></i></th>
          <th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;text-transform:uppercase;min-width:200px">Ítem <i class="fas fa-pencil-alt" style="font-size:9px"></i></th>
          <th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;text-transform:uppercase;min-width:80px">Unidad <i class="fas fa-pencil-alt" style="font-size:9px"></i></th>
          <th style="padding:9px 12px;text-align:right;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;text-transform:uppercase;min-width:90px">Cantidad <i class="fas fa-pencil-alt" style="font-size:9px"></i></th>
          <th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;text-transform:uppercase;white-space:nowrap;min-width:130px">Fecha entrega <i class="fas fa-pencil-alt" style="font-size:9px"></i></th>
        </tr>
      </thead>
      <tbody id="odp-items-body">
        ${window._odpItems.map((it, i) => odpItemRow(it, i)).join('')}
      </tbody>
    </table>
  </div>
  <div style="padding:8px 14px;background:#f8fafc;border-top:1px solid #f1f5f9;font-size:10px;color:#94a3b8">
    <i class="fas fa-info-circle"></i> Hacé clic en cualquier celda para editar. Los cambios se guardan al presionar <strong>Guardar</strong>.
  </div>
</div>
  </div>
  ${_asideHtml}
</div>
  `;

  document.getElementById('breadcrumb').innerHTML =
    '<i class="fas fa-list-check"></i><span><a href="#" onclick="renderOrdenesPedido();return false" style="color:var(--primary)">Órdenes de Pedido</a></span>' +
    '<i class="fas fa-chevron-right" style="font-size:10px;margin:0 5px;color:var(--text-muted)"></i>' +
    '<span>' + number + '</span>';
}

function odpItemRow(it, i) {
  const rubros = DB.getAll('rubros').filter(r => r.active !== false).sort((a,b) => (a.code||'').localeCompare(b.code||''));
  const rubroOpts = '<option value="" style="color:#94a3b8">+ Seleccionar</option>' +
    rubros.map(r => '<option value="' + r.id + '"' + (it.rubro_id === r.id ? ' selected' : '') + '>' + r.code + ' — ' + r.name + '</option>').join('');
  const tipoOpts = '<option value="" style="color:#94a3b8">+ Seleccionar</option>' +
    ODP_TIPOS.map(t => '<option value="' + t + '"' + (it.tipo === t ? ' selected' : '') + '>' + t + '</option>').join('');
  const rowBg = i % 2 === 0 ? '#fff' : '#f8f9fb';
  const C = 'padding:9px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle';
  const INP = 'border:none;background:transparent;font-size:13px;width:100%;outline:none;color:#1e293b';
  const SEL = 'border:none;background:transparent;font-size:12px;width:100%;outline:none;cursor:pointer';
  return '<tr id="odp-item-row-' + i + '" style="background:' + rowBg + '" onmouseenter="this.style.background=\'#eef4ff\'" onmouseleave="this.style.background=\'' + rowBg + '\'">' +
    '<td style="' + C + ';text-align:center;width:36px">' +
      '<button onclick="removeODPItem(' + i + ')" style="background:none;border:none;color:#cbd5e1;cursor:pointer;padding:2px 4px;font-size:13px;line-height:1" title="Eliminar fila"><i class="fas fa-times"></i></button>' +
    '</td>' +
    '<td style="' + C + '">' +
      '<select style="' + SEL + ';color:' + (it.rubro_id ? '#1e293b' : '#94a3b8') + '" onchange="updateODPItem(' + i + ',\'rubro_id\',this.value)">' + rubroOpts + '</select>' +
    '</td>' +
    '<td style="' + C + '">' +
      '<select style="' + SEL + ';color:' + (it.tipo ? '#1e293b' : '#94a3b8') + '" onchange="updateODPItem(' + i + ',\'tipo\',this.value)">' + tipoOpts + '</select>' +
    '</td>' +
    '<td style="' + C + '">' +
      '<input style="' + INP + '" placeholder="Descripción del ítem..." value="' + (it.item_desc || '') + '" oninput="updateODPItem(' + i + ',\'item_desc\',this.value)">' +
    '</td>' +
    '<td style="' + C + '">' +
      '<input list="odp-units-' + i + '" style="' + INP + ';width:70px" value="' + (it.unit || '') + '" placeholder="un" oninput="updateODPItem(' + i + ',\'unit\',this.value)">' +
      '<datalist id="odp-units-' + i + '">' +
        ['m²','m³','ml','un','gl','tn','kg','lt','Bolsa'].map(u => '<option value="' + u + '">').join('') +
      '</datalist>' +
    '</td>' +
    '<td style="' + C + ';text-align:right">' +
      '<input type="number" min="0" style="' + INP + ';width:80px;text-align:right" value="' + (it.quantity || '') + '" placeholder="0" oninput="updateODPItem(' + i + ',\'quantity\',+this.value)">' +
    '</td>' +
    '<td style="' + C + '">' +
      '<input type="date" style="' + INP + ';width:130px" value="' + (it.delivery_date || '') + '" onchange="updateODPItem(' + i + ',\'delivery_date\',this.value)">' +
    '</td>' +
  '</tr>';
}

function addODPItem() {
  const it = _blankODPItem();
  window._odpItems.push(it);
  const i = window._odpItems.length - 1;
  const tbody = document.getElementById('odp-items-body');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.outerHTML = odpItemRow(it, i);
  tbody.insertAdjacentHTML('beforeend', odpItemRow(it, i));
}

function removeODPItem(i) {
  const row = document.getElementById('odp-item-row-' + i);
  if (row) row.remove();
  window._odpItems[i] = null;
}

function updateODPItem(i, field, val) {
  if (!window._odpItems[i]) window._odpItems[i] = _blankODPItem();
  window._odpItems[i][field] = val;
}

/* ────────────────────────────────────────── SAVE / STATUS */
function saveODP(id, isDraft) {
  const projectId = (document.getElementById('odp-project') || {}).value;
  const date = (document.getElementById('odp-date') || {}).value;
  if (!date) { toast('La fecha es obligatoria', 'error'); return; }

  const items = (window._odpItems || []).filter(Boolean).filter(it => it.item_desc || it.rubro_id);
  const existing = id ? DB.getById('purchaseRequests', id) : null;
  const currentStatus = (existing && existing.status) || 'draft';
  const newStatus = isDraft ? 'draft' : (currentStatus === 'draft' ? 'pending' : currentStatus);

  const data = {
    number:       existing ? existing.number : _genODPNumber(),
    project_id:   projectId,
    date,
    status:       newStatus,
    criticidad:   (document.getElementById('odp-criticidad') || {}).value || 'normal',
    responsable:  (document.getElementById('odp-responsable') || {}).value || '',
    aprobador:    (document.getElementById('odp-aprobador') || {}).value || '',
    correos_extra:(document.getElementById('odp-correos') || {}).value || '',
    comentarios:  (document.getElementById('odp-comentarios') || {}).value || '',
    items,
    updated_at: new Date().toISOString(),
  };

  let savedId = id;
  if (id) {
    DB.update('purchaseRequests', id, data);
    toast('ODP actualizada', 'success');
  } else {
    data.created_at = new Date().toISOString();
    const rec = DB.insert('purchaseRequests', data);
    savedId = rec.id;
    toast(isDraft ? 'Borrador guardado' : 'ODP enviada para aprobación', 'success');
  }
  renderODPForm(savedId);
}

function approveODP(id) {
  DB.update('purchaseRequests', id, { status: 'approved' });
  toast('ODP aprobada', 'success');
  renderODPForm(id);
}

function rejectODP(id) {
  confirmDialog('¿Rechazar esta orden de pedido?', function() {
    DB.update('purchaseRequests', id, { status: 'rejected' });
    toast('ODP rechazada', 'warning');
    renderODPForm(id);
  });
}

function deleteODP(id) {
  confirmDialog('¿Eliminar esta orden de pedido?', function() {
    DB.remove('purchaseRequests', id);
    toast('ODP eliminada', 'warning');
    renderOrdenesPedido();
  });
}

function printODP(id) {
  var odp = DB.getById('purchaseRequests', id);
  if (!odp) return;
  var proj = DB.getById('projects', odp.project_id);
  var company = {};
  try { company = DB.getAllCompanies()[0] || {}; } catch(e) {}

  var st = ODP_STATUS[odp.status] || ODP_STATUS.draft;
  var critLabel = ODP_CRITICIDAD[odp.criticidad] || 'Normal';
  var critColor = ODP_CRIT_COLOR[odp.criticidad] || '#64748b';

  var itemRows = (odp.items || []).filter(function(it) { return it.item_desc || it.rubro_id; }).map(function(it) {
    var rubro = it.rubro_id ? DB.getById('rubros', it.rubro_id) : null;
    return '<tr>' +
      '<td>' + (rubro ? escapeHtml(rubro.code + ' — ' + rubro.name) : '—') + '</td>' +
      '<td>' + escapeHtml(it.tipo || '—') + '</td>' +
      '<td>' + escapeHtml(it.item_desc || '—') + '</td>' +
      '<td class="tc">' + escapeHtml(it.unit || '—') + '</td>' +
      '<td class="tr num"><strong>' + fmtNum(it.quantity || 0) + '</strong></td>' +
      '<td>' + fmtDate(it.delivery_date) + '</td>' +
    '</tr>';
  }).join('');

  var html =
    '<div class="doc-header">' +
      '<div><h1>' + escapeHtml(company.name || brandName()) + '</h1><div class="subtitle">Orden de Pedido</div></div>' +
      '<div>' +
        '<div class="doc-num">' + escapeHtml(odp.number) + '</div>' +
        '<div class="doc-date">Fecha: ' + fmtDate(odp.date) + '</div>' +
        '<div style="margin-top:6px"><span style="background:' + st.bg + ';color:' + st.color + ';border:1px solid ' + st.border + ';padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">' + st.label + '</span></div>' +
      '</div>' +
    '</div>' +
    _printInfoGrid([
      { title: 'Proyecto', content: '<strong>' + escapeHtml(proj ? proj.name : '-') + '</strong>' },
      { title: 'Datos de la Solicitud', content:
          'Responsable: <strong>' + escapeHtml(odp.responsable || '-') + '</strong><br>' +
          'Aprobador: ' + escapeHtml(odp.aprobador || '-') + '<br>' +
          'Criticidad: <strong style="color:' + critColor + '">' + critLabel + '</strong>' }
    ]) +
    (odp.comentarios ? '<div class="concept-box"><strong>Comentarios:</strong> ' + escapeHtml(odp.comentarios) + '</div>' : '') +
    '<table>' +
      '<thead><tr>' +
        '<th>Rubro</th><th>Tipo</th><th>Ítem / Descripción</th><th class="tc">Unidad</th><th class="tr">Cantidad</th><th>Fecha Entrega</th>' +
      '</tr></thead>' +
      '<tbody>' + (itemRows || '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px">Sin ítems</td></tr>') + '</tbody>' +
    '</table>' +
    '<div class="sign-row">' +
      '<div><div class="sign-line">Firma del Responsable</div></div>' +
      '<div><div class="sign-line">Firma del Aprobador</div></div>' +
    '</div>';

  _printDoc('ODP ' + odp.number, html);
}

/* ────────────────────────────────────────── IMPORT EXCEL DE ÍTEMS */
// Estado del import: encabezados, filas crudas y mapeo columna→campo.
window._odpImport = null;

var ODP_IMP_FIELDS = [
  { key: 'rubro',         label: 'Rubro',         hints: ['rubro'] },
  { key: 'tipo',          label: 'Tipo',          hints: ['tipo'] },
  { key: 'item_desc',     label: 'Ítem / Descripción', hints: ['item', 'ítem', 'descrip', 'detalle', 'articulo', 'artículo'] },
  { key: 'unit',          label: 'Unidad',        hints: ['unidad', 'u.m', 'um', 'unid', 'medida'] },
  { key: 'quantity',      label: 'Cantidad',      hints: ['cant', 'cantidad', 'qty'] },
  { key: 'delivery_date', label: 'Fecha entrega', hints: ['fecha', 'entrega', 'vencimiento'] },
];

function openODPImportModal() {
  if (typeof XLSX === 'undefined') { toast('La librería de Excel no está cargada', 'error'); return; }
  window._odpImport = null;
  var body = ''
    + '<div style="margin-bottom:8px">'
    + '  <label class="form-label">Archivo Excel / CSV</label>'
    + '  <input type="file" class="form-control" accept=".xlsx,.xls,.csv" onchange="_odpImportParseFile(this)">'
    + '  <div style="font-size:11px;color:var(--text-muted);margin-top:6px"><i class="fas fa-info-circle"></i> La <strong>primera fila</strong> tiene que ser el encabezado (Rubro, Tipo, Ítem, Unidad, Cantidad, Fecha…). Detectamos las columnas solas y podés ajustarlas.</div>'
    + '</div>'
    + '<div id="odp-imp-result" style="margin-top:8px"></div>';
  openModal('<i class="fas fa-file-excel" style="margin-right:8px;color:#059669"></i>Importar ítems desde Excel', body, 'lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
}

function _odpImportParseFile(input) {
  var file = input && input.files && input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: false });
      var ws = wb.Sheets[wb.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, raw: false, defval: '' });
      if (!rows.length) { toast('El archivo está vacío', 'error'); return; }
      var headers = (rows[0] || []).map(function(h) { return (h == null ? '' : String(h)).trim(); });
      var data = rows.slice(1).filter(function(r) { return (r || []).some(function(c) { return c != null && String(c).trim() !== ''; }); });
      // Auto-detección de columnas por nombre de encabezado
      var map = {};
      ODP_IMP_FIELDS.forEach(function(f) {
        var idx = -1;
        for (var i = 0; i < headers.length && idx < 0; i++) {
          var h = headers[i].toLowerCase();
          if (f.hints.some(function(k) { return h.indexOf(k) !== -1; })) idx = i;
        }
        map[f.key] = idx;
      });
      window._odpImport = { headers: headers, rows: data, map: map };
      _odpImportRenderResult();
    } catch (err) {
      toast('No se pudo leer el archivo: ' + (err.message || err), 'error');
    }
  };
  reader.onerror = function() { toast('Error al leer el archivo', 'error'); };
  reader.readAsArrayBuffer(file);
}

function _odpImportRenderResult() {
  var imp = window._odpImport; if (!imp) return;
  var wrap = document.getElementById('odp-imp-result'); if (!wrap) return;
  var colOpts = function(sel) {
    var o = '<option value="-1">— (ninguna) —</option>';
    imp.headers.forEach(function(h, i) {
      o += '<option value="' + i + '"' + (sel === i ? ' selected' : '') + '>' + escapeHtml(h || ('Columna ' + (i + 1))) + '</option>';
    });
    return o;
  };
  var maps = '<div class="form-grid form-grid-3" style="margin:4px 0 14px">' +
    ODP_IMP_FIELDS.map(function(f) {
      return '<div class="form-group"><label class="form-label">' + f.label + '</label>' +
        '<select class="form-control" onchange="_odpImportSetMap(\'' + f.key + '\',this.value)">' + colOpts(imp.map[f.key]) + '</select></div>';
    }).join('') + '</div>';
  wrap.innerHTML =
    '<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Detectamos <strong>' + imp.rows.length + '</strong> fila(s). Revisá el mapeo de columnas:</div>' +
    maps +
    '<div style="font-size:12px;font-weight:600;margin-bottom:6px">Vista previa</div>' +
    '<div id="odp-imp-preview" style="overflow-x:auto">' + _odpImportPreviewTable() + '</div>' +
    '<div style="margin-top:16px;text-align:right">' +
      '<button class="btn btn-primary" onclick="_odpImportApply()"><i class="fas fa-check"></i> Importar ' + imp.rows.length + ' ítem(s)</button>' +
    '</div>';
}

function _odpImportSetMap(key, val) {
  if (!window._odpImport) return;
  window._odpImport.map[key] = parseInt(val, 10);
  var pv = document.getElementById('odp-imp-preview');
  if (pv) pv.innerHTML = _odpImportPreviewTable();
}

// Convierte una fila cruda al ítem de ODP según el mapeo actual.
function _odpImportRowToItem(row) {
  var imp = window._odpImport, m = imp.map;
  var g = function(k) { var i = m[k]; return (i != null && i >= 0 && i < row.length) ? row[i] : ''; };
  return {
    rubro_id: _odpMatchRubro(g('rubro')),
    tipo: _odpMatchTipo(g('tipo')),
    item_desc: String(g('item_desc') || '').trim(),
    unit: String(g('unit') || '').trim(),
    quantity: (typeof numParse === 'function' ? numParse(g('quantity')) : parseFloat(g('quantity'))) || 0,
    delivery_date: _odpParseImpDate(g('delivery_date')),
    _rubroText: String(g('rubro') || '').trim(),   // solo para la vista previa
  };
}

function _odpImportPreviewTable() {
  var imp = window._odpImport; if (!imp) return '';
  var rubros = DB.getAll('rubros');
  var rubroName = function(id) { var r = rubros.find(function(x){ return x.id === id; }); return r ? (r.code + ' — ' + r.name) : ''; };
  var head = '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#f8f9fb">' +
    ['Rubro', 'Tipo', 'Ítem', 'Unidad', 'Cantidad', 'Fecha'].map(function(h){ return '<th style="padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#94a3b8;border-bottom:1px solid #e2e8f0">' + h + '</th>'; }).join('') +
    '</tr></thead><tbody>';
  var rowsHtml = imp.rows.slice(0, 8).map(function(r) {
    var it = _odpImportRowToItem(r);
    var rubroCell = it.rubro_id
      ? escapeHtml(rubroName(it.rubro_id))
      : (it._rubroText ? '<span style="color:#d97706" title="No coincide con ningún rubro cargado — se importa sin rubro">' + escapeHtml(it._rubroText) + ' ⚠</span>' : '<span style="color:#cbd5e1">—</span>');
    var C = 'padding:6px 8px;border-bottom:1px solid #f1f5f9';
    return '<tr>' +
      '<td style="' + C + '">' + rubroCell + '</td>' +
      '<td style="' + C + '">' + (it.tipo ? escapeHtml(it.tipo) : '<span style="color:#cbd5e1">—</span>') + '</td>' +
      '<td style="' + C + '">' + (escapeHtml(it.item_desc) || '<span style="color:#cbd5e1">—</span>') + '</td>' +
      '<td style="' + C + '">' + (escapeHtml(it.unit) || '<span style="color:#cbd5e1">—</span>') + '</td>' +
      '<td style="' + C + ';text-align:right">' + (it.quantity || '<span style="color:#cbd5e1">0</span>') + '</td>' +
      '<td style="' + C + '">' + (it.delivery_date ? fmtDate(it.delivery_date) : '<span style="color:#cbd5e1">—</span>') + '</td>' +
    '</tr>';
  }).join('');
  var more = imp.rows.length > 8 ? '<tr><td colspan="6" style="padding:6px 8px;color:#94a3b8;font-size:11px">… y ' + (imp.rows.length - 8) + ' fila(s) más</td></tr>' : '';
  return head + rowsHtml + more + '</tbody></table>';
}

// Match de rubro por código o nombre (exacto o parcial). Sin match → '' (se importa igual).
function _odpMatchRubro(text) {
  var t = String(text == null ? '' : text).trim().toLowerCase();
  if (!t) return '';
  var rubros = DB.getAll('rubros');
  var m = rubros.find(function(r) {
    return (r.code || '').toLowerCase() === t || (r.name || '').toLowerCase() === t ||
           ((r.code || '') + ' — ' + (r.name || '')).toLowerCase() === t;
  });
  if (!m && t.length > 2) m = rubros.find(function(r) { return (r.name || '').toLowerCase().indexOf(t) !== -1; });
  return m ? m.id : '';
}

function _odpMatchTipo(text) {
  var t = String(text == null ? '' : text).trim().toLowerCase();
  if (!t) return '';
  var f = ODP_TIPOS.find(function(x) { return x.toLowerCase() === t; });
  if (!f) f = ODP_TIPOS.find(function(x) { return x.toLowerCase().indexOf(t) !== -1 || t.indexOf(x.toLowerCase()) !== -1; });
  return f || '';
}

// Fecha flexible → yyyy-mm-dd. Soporta yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy y serial de Excel.
function _odpParseImpDate(v) {
  if (v == null || v === '') return '';
  var s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    var d = m[1].padStart(2, '0'), mo = m[2].padStart(2, '0'), y = m[3];
    if (y.length === 2) y = '20' + y;
    return y + '-' + mo + '-' + d;
  }
  if (/^\d+(\.\d+)?$/.test(s)) {   // serial de Excel (días desde 1899-12-30)
    var n = parseFloat(s);
    if (n > 20000 && n < 80000) {
      var dt = new Date(Math.round((n - 25569) * 86400 * 1000));
      if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
    }
  }
  return '';
}

function _odpImportApply() {
  var imp = window._odpImport; if (!imp) return;
  var imported = imp.rows.map(_odpImportRowToItem)
    .filter(function(it) { return it.item_desc || it.rubro_id || it.quantity; })
    .map(function(it) { return { rubro_id: it.rubro_id, tipo: it.tipo, item_desc: it.item_desc, unit: it.unit, quantity: it.quantity, delivery_date: it.delivery_date }; });
  if (!imported.length) { toast('No se encontraron ítems para importar. Revisá el mapeo de columnas.', 'warning'); return; }
  var current = (window._odpItems || []).filter(Boolean).filter(function(it) { return it.item_desc || it.rubro_id || it.quantity; });
  window._odpItems = current.concat(imported);
  var tbody = document.getElementById('odp-items-body');
  if (tbody) tbody.innerHTML = window._odpItems.map(function(it, i) { return odpItemRow(it, i); }).join('');
  window._odpImport = null;
  closeModal();
  toast(imported.length + ' ítem(s) importado(s). Revisalos y presioná Guardar.', 'success');
}
