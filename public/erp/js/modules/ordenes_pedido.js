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

/* ────────────────────────────────────────── LIST VIEW */
function renderOrdenesPedido() {
  const requests = DB.getAll('purchaseRequests');
  const projects = DB.getAll('projects');

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Órdenes de Pedido</div>
    <div class="page-subtitle">Solicitudes de materiales y servicios para obra</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-primary" onclick="renderODPForm()"><i class="fas fa-plus"></i> Nueva ODP</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
  ${[
    ['blue','fa-list-check', requests.length, 'Total ODPs'],
    ['gray','fa-pencil', requests.filter(r=>r.status==='draft').length, 'Borrador'],
    ['yellow','fa-clock', requests.filter(r=>r.status==='pending').length, 'Pendientes'],
    ['green','fa-check-circle', requests.filter(r=>r.status==='approved').length, 'Aprobadas'],
  ].map(([ic,fa,v,lbl]) =>
    `<div class="stat-card"><div class="stat-icon ${ic}"><i class="fas ${fa}"></i></div><div>
      <div class="stat-value">${v}</div><div class="stat-label">${lbl}</div></div></div>`
  ).join('')}
</div>

<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.04)">
  <div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;display:flex;gap:10px;flex-wrap:wrap">
    <div class="search-input-wrap" style="flex:1;min-width:200px">
      <i class="fas fa-search"></i>
      <input type="text" placeholder="Buscar ODP..." oninput="filterODP(this.value)" style="font-size:13px">
    </div>
    <select class="form-control" style="width:150px;font-size:12px" onchange="filterODP(undefined,this.value)">
      <option value="">Todos los estados</option>
      ${Object.entries(ODP_STATUS).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}
    </select>
    <select class="form-control" style="width:200px;font-size:12px" onchange="filterODP(undefined,undefined,this.value)">
      <option value="">Todos los proyectos</option>
      ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
    </select>
  </div>
  <div id="odp-table-wrap">${buildODPTable(requests, projects)}</div>
</div>`;

  document.getElementById('breadcrumb').innerHTML = '<i class="fas fa-list-check"></i><span>Órdenes de Pedido</span>';
  window._odpFilters = { q: '', status: '', project: '' };
}

function buildODPTable(requests, projects) {
  if (!requests.length) return '<div class="empty-state"><i class="fas fa-list-check"></i><p>No hay órdenes de pedido. Creá la primera.</p></div>';
  const sorted = requests.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return `<table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr style="background:#f8f9fb;border-bottom:2px solid #e2e8f0">
      <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Nro.</th>
      <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Proyecto</th>
      <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Fecha</th>
      <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Criticidad</th>
      <th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;font-weight:600">Ítems</th>
      <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Aprobador</th>
      <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Estado</th>
      <th style="padding:10px 12px;font-size:11px;color:#64748b;font-weight:600">Acciones</th>
    </tr></thead>
    <tbody>
      ${sorted.map((r, idx) => {
        const proj = projects.find(p => p.id === r.project_id);
        const st = ODP_STATUS[r.status] || ODP_STATUS.draft;
        const critColor = ODP_CRIT_COLOR[r.criticidad] || '#64748b';
        const critLabel = ODP_CRITICIDAD[r.criticidad] || 'Normal';
        const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8f9fb';
        return `<tr style="background:${rowBg};border-bottom:1px solid #f1f5f9;cursor:pointer" onclick="renderODPForm('${r.id}')">
          <td style="padding:10px 12px"><strong style="color:#2563eb">${r.number}</strong></td>
          <td style="padding:10px 12px;color:#64748b;font-size:12px">${proj ? proj.name : '—'}</td>
          <td style="padding:10px 12px;color:#64748b;font-size:12px;white-space:nowrap">${fmtDate(r.date)}</td>
          <td style="padding:10px 12px"><span style="font-size:11px;font-weight:600;color:${critColor}">${critLabel}</span></td>
          <td style="padding:10px 12px;text-align:center">
            <span style="background:#e0e7ff;color:#3730a3;font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px">${(r.items||[]).filter(it=>it.item_desc||it.rubro_id).length}</span>
          </td>
          <td style="padding:10px 12px;color:#64748b;font-size:12px">${r.aprobador || '—'}</td>
          <td style="padding:10px 12px">
            <span style="background:${st.bg};color:${st.color};border:1px solid ${st.border};font-size:11px;font-weight:600;padding:3px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:.4px">${st.label}</span>
          </td>
          <td style="padding:10px 12px;white-space:nowrap" onclick="event.stopPropagation()">
            <div class="table-actions">
              <button class="btn btn-sm btn-primary" onclick="renderODPForm('${r.id}')"><i class="fas fa-eye"></i> Ver</button>
              <button class="btn-ghost btn btn-sm danger" onclick="deleteODP('${r.id}')"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
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

  const actionBtns = status === 'draft'
    ? `<button class="btn btn-secondary" style="font-size:13px" onclick="saveODP('${id||''}',true)">Guardar borrador</button>
       <button class="btn btn-primary" style="font-size:13px" onclick="saveODP('${id||''}',false)"><i class="fas fa-paper-plane"></i> Enviar para aprobar</button>`
    : status === 'pending'
    ? `<button class="btn btn-danger" style="font-size:13px" onclick="rejectODP('${id}')"><i class="fas fa-times"></i> Rechazar</button>
       <button class="btn btn-success" style="font-size:13px" onclick="approveODP('${id}')"><i class="fas fa-check"></i> Aprobar</button>
       <button class="btn btn-secondary" style="font-size:13px" onclick="saveODP('${id}',false)"><i class="fas fa-save"></i> Guardar</button>`
    : status === 'approved'
    ? `<button class="btn btn-secondary" style="font-size:13px" onclick="saveODP('${id}',false)"><i class="fas fa-save"></i> Guardar</button>
       <button class="btn btn-primary" style="font-size:13px" onclick="licNueva('${id}')"><i class="fas fa-gavel"></i> Licitar</button>`
    : `<button class="btn btn-secondary" style="font-size:13px" onclick="saveODP('${id}',false)"><i class="fas fa-save"></i> Guardar</button>`;

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
    <button class="btn btn-sm btn-secondary" onclick="addODPItem()"><i class="fas fa-plus"></i> Agregar fila</button>
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
