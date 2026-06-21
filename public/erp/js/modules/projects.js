/* ===== PROYECTOS ===== */
function renderProjects() {
  const projects = DB.getAll('projects');
  const q = '';

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Proyectos</div>
    <div class="page-subtitle">Gestión del portafolio de obras e inmuebles</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-primary" onclick="openProjectForm()"><i class="fas fa-plus"></i> Nuevo Proyecto</button>
  </div>
</div>

<div class="filter-bar">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar proyecto..." oninput="filterProjects(this.value)">
  </div>
  <select class="form-control" style="width:160px" onchange="filterProjects(undefined, this.value)">
    <option value="">Todos los estados</option>
    <option value="active">Activo</option>
    <option value="planning">Planificación</option>
    <option value="paused">Pausado</option>
    <option value="completed">Completado</option>
  </select>
  <select class="form-control" style="width:160px" onchange="filterProjects(undefined, undefined, this.value)">
    <option value="">Todos los tipos</option>
    <option value="residential">Residencial</option>
    <option value="commercial">Comercial</option>
    <option value="industrial">Industrial</option>
    <option value="infrastructure">Infraestructura</option>
  </select>
  <button class="btn btn-secondary" onclick="toggleProjectView()"><i class="fas fa-th-large"></i> Vista</button>
</div>

<div id="projects-grid" class="grid-auto">
  ${renderProjectCards(projects)}
</div>
  `;

  window._projectFilters = { q: '', status: '', type: '' };
}

function renderProjectCards(projects) {
  if (!projects.length) return `<div class="empty-state"><i class="fas fa-building"></i><p>No hay proyectos. Creá el primero.</p></div>`;

  return projects.map(p => {
    const tasks = DB.getAll('ganttTasks').filter(t => t.project_id === p.id);
    const progress = tasks.length ? Math.round(tasks.reduce((s, t) => s + (t.progress || 0), 0) / tasks.length) : 0;
    const invoiced = DB.getAll('invoices').filter(i => i.project_id === p.id).reduce((s, i) => s + (i.total || 0), 0);
    const daysLeft = daysBetween(todayStr(), p.end_date);
    const daysLeftLabel = daysLeft > 0 ? `${daysLeft} días restantes` : daysLeft === 0 ? 'Vence hoy' : `${Math.abs(daysLeft)} días de atraso`;

    return `
<div class="project-card" onclick="openProjectDetail('${p.id}')">
  <div class="project-card-header">
    <div>
      <div class="project-card-title">${p.name}</div>
      <div class="project-card-meta"><i class="fas fa-user"></i> ${p.client}</div>
      <div class="project-card-meta"><i class="fas fa-map-marker-alt"></i> ${p.address}</div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
      ${statusBadge(p.status)}
      ${projectTypeBadge(p.type)}
    </div>
  </div>

  <div style="margin:12px 0">
    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
      <span style="font-size:12px;color:var(--text-muted)">Avance físico</span>
      <span style="font-size:12px;font-weight:600">${progress}%</span>
    </div>
    <div class="progress-bar"><div class="progress-fill ${progress >= 100 ? 'green' : progress > 60 ? '' : progress > 30 ? 'yellow' : 'red'}" style="width:${progress}%"></div></div>
  </div>

  <div class="project-card-stats">
    <div class="project-stat-item">
      <div class="project-stat-val">${fmtMoney(p.budget)}</div>
      <div class="project-stat-lbl">Presupuesto</div>
    </div>
    <div class="project-stat-item">
      <div class="project-stat-val">${fmtMoney(invoiced)}</div>
      <div class="project-stat-lbl">Facturado</div>
    </div>
    <div class="project-stat-item">
      <div class="project-stat-val">${fmtDate(p.start_date)}</div>
      <div class="project-stat-lbl">Inicio</div>
    </div>
    <div class="project-stat-item">
      <div class="project-stat-val ${daysLeft < 0 ? 'text-danger' : ''}" style="font-size:11px">${daysLeftLabel}</div>
      <div class="project-stat-lbl">Fin: ${fmtDate(p.end_date)}</div>
    </div>
  </div>

  <div style="display:flex;gap:6px;margin-top:12px" onclick="event.stopPropagation()">
    <button class="btn btn-sm btn-secondary flex-1" onclick="openProjectDetail('${p.id}')"><i class="fas fa-eye"></i> Ver</button>
    <button class="btn btn-sm btn-secondary flex-1" onclick="openProjectForm('${p.id}')"><i class="fas fa-edit"></i> Editar</button>
    <button class="btn btn-ghost btn-sm danger" onclick="deleteProject('${p.id}')"><i class="fas fa-trash"></i></button>
  </div>
</div>`;
  }).join('');
}

function filterProjects(q, status, type) {
  if (q !== undefined) window._projectFilters.q = q.toLowerCase();
  if (status !== undefined) window._projectFilters.status = status;
  if (type !== undefined) window._projectFilters.type = type;

  let projects = DB.getAll('projects');
  const f = window._projectFilters;
  if (f.q) projects = projects.filter(p => (p.name||'').toLowerCase().includes(f.q) || (p.client||'').toLowerCase().includes(f.q));
  if (f.status) projects = projects.filter(p => p.status === f.status);
  if (f.type) projects = projects.filter(p => p.type === f.type);

  const grid = document.getElementById('projects-grid');
  if (grid) grid.innerHTML = renderProjectCards(projects);
}

function openProjectDetail(id) {
  var _c = document.getElementById('content'); if (_c) _c.scrollTop = 0;
  const p = DB.getById('projects', id);
  if (!p) return;
  const tasks = DB.getAll('ganttTasks').filter(t => t.project_id === id);
  const progress = tasks.length ? Math.round(tasks.reduce((s,t) => s+(t.progress||0),0) / tasks.length) : 0;
  const invoices = DB.getAll('invoices').filter(i => i.project_id === id);
  const totalInvoiced = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalCollected = DB.getAll('collections').filter(c => c.project_id === id).reduce((s,c) => s+(c.amount || 0), 0);
  const boqTotal = DB.getAll('boqItems').filter(b => b.project_id === id).reduce((s,b) => s+b.total, 0);
  const actualTotal = DB.getAll('actualCosts').filter(a => a.project_id === id).reduce((s,a) => s+a.amount, 0);

  openModal(`Proyecto: ${p.name}`, `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
  <div>
    <div class="form-label">Cliente</div><p>${p.client}</p>
    <div class="form-label mt-2">Tipo</div><p>${projectTypeBadge(p.type)}</p>
    <div class="form-label mt-2">Dirección</div><p>${p.address}</p>
    <div class="form-label mt-2">Descripción</div><p>${p.description || '-'}</p>
  </div>
  <div>
    <div class="form-label">Estado</div><p>${statusBadge(p.status)}</p>
    <div class="form-label mt-2">Fechas</div><p>${fmtDate(p.start_date)} → ${fmtDate(p.end_date)}</p>
    <div class="form-label mt-2">Avance físico</div>
    <div class="progress-bar mt-1"><div class="progress-fill" style="width:${progress}%"></div></div>
    <span style="font-size:11px">${progress}%</span>
  </div>
</div>
<div class="divider"></div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
  ${[
    ['Presupuesto', fmtMoney(p.budget), 'blue'],
    ['BOQ Total', fmtMoney(boqTotal), 'cyan'],
    ['Facturado', fmtMoney(totalInvoiced), 'yellow'],
    ['Cobrado', fmtMoney(totalCollected), 'green'],
  ].map(([lbl,val,c]) => `<div class="stat-card" style="padding:12px">
    <div style="font-size:14px;font-weight:700;color:var(--text)">${val}</div>
    <div style="font-size:11px;color:var(--text-muted)">${lbl}</div>
  </div>`).join('')}
</div>
<div class="divider"></div>
<div class="form-label">Tareas Gantt</div>
<div class="table-wrap mt-1">
<table><thead><tr><th>Tarea</th><th>Inicio</th><th>Fin</th><th>Avance</th><th>Estado</th></tr></thead>
<tbody>
${tasks.map(t => `<tr>
  <td>${t.name}</td>
  <td>${fmtDate(t.start_date)}</td>
  <td>${fmtDate(t.end_date)}</td>
  <td><div class="progress-bar" style="width:100px;display:inline-block"><div class="progress-fill" style="width:${t.progress}%"></div></div> ${t.progress}%</td>
  <td>${statusBadge(t.status)}</td>
</tr>`).join('')}
</tbody></table>
</div>
`, 'modal-lg',
  `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
   <button class="btn btn-primary" onclick="closeModal(); navigate('gantt')"><i class="fas fa-stream"></i> Ver Gantt</button>
   <button class="btn btn-secondary" onclick="closeModal(); navigate('facturacion')"><i class="fas fa-file-invoice"></i> Facturas</button>`);
}

function openProjectForm(id = null) {
  const p = id ? DB.getById('projects', id) : null;
  const title = p ? 'Editar Proyecto' : 'Nuevo Proyecto';

  openModal(title, `
<div class="form-grid form-grid-2">
  <div class="form-group full">
    <label class="form-label">Nombre del Proyecto *</label>
    <input class="form-control" id="pf-name" value="${p?.name || ''}" placeholder="Ej: Torre Residencial Palermo">
  </div>
  <div class="form-group">
    <label class="form-label">Cliente *</label>
    <input class="form-control" id="pf-client" value="${p?.client || ''}" placeholder="Razón social del cliente">
  </div>
  <div class="form-group">
    <label class="form-label">Tipo</label>
    <select class="form-control" id="pf-type">
      <option value="residential" ${p?.type==='residential'?'selected':''}>Residencial</option>
      <option value="commercial" ${p?.type==='commercial'?'selected':''}>Comercial</option>
      <option value="industrial" ${p?.type==='industrial'?'selected':''}>Industrial</option>
      <option value="infrastructure" ${p?.type==='infrastructure'?'selected':''}>Infraestructura</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Estado</label>
    <select class="form-control" id="pf-status">
      <option value="planning" ${p?.status==='planning'?'selected':''}>Planificación</option>
      <option value="active" ${p?.status==='active'?'selected':''}>Activo</option>
      <option value="paused" ${p?.status==='paused'?'selected':''}>Pausado</option>
      <option value="completed" ${p?.status==='completed'?'selected':''}>Completado</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Presupuesto (ARS) *</label>
    <input class="form-control" id="pf-budget" type="number" value="${p?.budget || ''}" placeholder="45000000">
  </div>
  <div class="form-group">
    <label class="form-label">Dirección</label>
    <input class="form-control" id="pf-address" value="${p?.address || ''}" placeholder="Calle Nro, Ciudad">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha Inicio</label>
    <input class="form-control" id="pf-start" type="date" value="${p?.start_date || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha Fin Estimada</label>
    <input class="form-control" id="pf-end" type="date" value="${p?.end_date || ''}">
  </div>
  <div class="form-group full">
    <label class="form-label">Descripción</label>
    <textarea class="form-control" id="pf-desc">${p?.description || ''}</textarea>
  </div>
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveProject('${id || ''}')"><i class="fas fa-save"></i> Guardar</button>
`);
}

function saveProject(id) {
  const data = {
    name: document.getElementById('pf-name').value.trim(),
    client: document.getElementById('pf-client').value.trim(),
    type: document.getElementById('pf-type').value,
    status: document.getElementById('pf-status').value,
    budget: parseFloat(document.getElementById('pf-budget').value) || 0,
    address: document.getElementById('pf-address').value.trim(),
    start_date: document.getElementById('pf-start').value,
    end_date: document.getElementById('pf-end').value,
    description: document.getElementById('pf-desc').value.trim(),
  };

  if (!data.name || !data.client) { toast('Nombre y cliente son obligatorios', 'error'); return; }

  if (id) {
    DB.update('projects', id, data);
    toast('Proyecto actualizado', 'success');
  } else {
    DB.insert('projects', data);
    toast('Proyecto creado', 'success');
  }

  closeModal();
  populateProjectSelector();
  renderProjects();
}

function deleteProject(id) {
  const p = DB.getById('projects', id);
  confirmDialog(`¿Eliminar el proyecto "<strong>${p?.name}</strong>"? Esta acción es irreversible.`, () => {
    DB.remove('projects', id);
    populateProjectSelector();
    toast('Proyecto eliminado', 'warning');
    renderProjects();
  });
}

function toggleProjectView() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;
  if (grid.classList.contains('grid-auto')) {
    grid.className = '';
    grid.style.cssText = '';
    grid.innerHTML = `<div class="card"><div class="card-body" style="padding:0"><div class="table-wrap"><table>
      <thead><tr><th>Nombre</th><th>Cliente</th><th>Tipo</th><th>Estado</th><th>Presupuesto</th><th>Inicio</th><th>Fin</th><th>Acciones</th></tr></thead>
      <tbody>${DB.getAll('projects').map(p => `<tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.client}</td>
        <td>${projectTypeBadge(p.type)}</td>
        <td>${statusBadge(p.status)}</td>
        <td class="number-cell">${fmtMoney(p.budget)}</td>
        <td>${fmtDate(p.start_date)}</td>
        <td>${fmtDate(p.end_date)}</td>
        <td><div class="table-actions">
          <button class="btn-ghost btn btn-sm" onclick="openProjectDetail('${p.id}')"><i class="fas fa-eye"></i></button>
          <button class="btn-ghost btn btn-sm" onclick="openProjectForm('${p.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn-ghost btn btn-sm danger" onclick="deleteProject('${p.id}')"><i class="fas fa-trash"></i></button>
        </div></td>
      </tr>`).join('')}</tbody>
    </table></div></div></div>`;
  } else {
    grid.className = 'grid-auto';
    grid.innerHTML = renderProjectCards(DB.getAll('projects'));
  }
}
