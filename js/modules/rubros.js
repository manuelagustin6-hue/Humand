/* ===== RUBROS DE OBRA ===== */
function renderRubros() {
  const rubros = DB.getAll('rubros');
  const categories = [...new Set(rubros.map(r => r.category))].sort();

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Rubros de Obra</div>
    <div class="page-subtitle">Codificación y clasificación de partidas de obra</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="exportRubros()"><i class="fas fa-download"></i> Exportar</button>
    <button class="btn btn-primary" onclick="openRubroForm()"><i class="fas fa-plus"></i> Nuevo Rubro</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-list-ol"></i></div><div>
    <div class="stat-value">${rubros.length}</div><div class="stat-label">Rubros Totales</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-tags"></i></div><div>
    <div class="stat-value">${categories.length}</div><div class="stat-label">Categorías</div></div></div>
  <div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-check-circle"></i></div><div>
    <div class="stat-value">${rubros.filter(r=>r.active!==false).length}</div><div class="stat-label">Activos</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-pause-circle"></i></div><div>
    <div class="stat-value">${rubros.filter(r=>r.active===false).length}</div><div class="stat-label">Inactivos</div></div></div>
</div>

<div class="filter-bar mt-2">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar rubro, código, descripción..." oninput="filterRubros(this.value)">
  </div>
  <select class="form-control" style="width:180px" onchange="filterRubros(undefined, this.value)">
    <option value="">Todas las categorías</option>
    ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
  </select>
</div>

<div id="rubros-tabs">
  <div class="tabs">
    <button class="tab-btn" data-tab="tab-rubros-list">Rubros</button>
    <button class="tab-btn" data-tab="tab-rubros-cats">Por Categoría</button>
  </div>
  <div id="tab-rubros-list" class="tab-content">
    <div class="card"><div class="card-body" style="padding:0">
      <div class="table-wrap" id="rubros-table-wrap">
        ${buildRubrosTable(rubros)}
      </div>
    </div></div>
  </div>
  <div id="tab-rubros-cats" class="tab-content">
    ${buildRubrosByCategory(rubros, categories)}
  </div>
</div>
  `;
  window._rubrosFilters = { q: '', category: '' };
  initTabs('rubros-tabs');
}

function buildRubrosTable(rubros) {
  if (!rubros.length) return `<div class="empty-state"><i class="fas fa-list-ol"></i><p>No hay rubros. Creá el primero.</p></div>`;
  return `<table><thead><tr>
    <th>Código</th><th>Nombre del Rubro</th><th>Categoría</th><th>Unidad</th><th>Descripción</th><th>Estado</th><th>Acciones</th>
  </tr></thead>
  <tbody>
  ${rubros.sort((a,b)=>a.code.localeCompare(b.code)).map(r => `<tr>
    <td><strong>${r.code}</strong></td>
    <td>${r.name}</td>
    <td><span class="badge badge-blue">${r.category}</span></td>
    <td><span class="badge badge-gray">${r.unit}</span></td>
    <td style="font-size:12px;color:var(--text-muted)">${r.description || '-'}</td>
    <td>${r.active !== false ? '<span class="badge badge-green">Activo</span>' : '<span class="badge badge-gray">Inactivo</span>'}</td>
    <td><div class="table-actions">
      <button class="btn-ghost btn btn-sm" onclick="openRubroForm('${r.id}')"><i class="fas fa-edit"></i></button>
      <button class="btn-ghost btn btn-sm danger" onclick="deleteRubro('${r.id}')"><i class="fas fa-trash"></i></button>
    </div></td>
  </tr>`).join('')}
  </tbody></table>`;
}

function buildRubrosByCategory(rubros, categories) {
  return categories.map(cat => {
    const items = rubros.filter(r => r.category === cat);
    return `<div class="card mb-2">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-folder text-primary"></i> ${cat}</span>
        <span class="badge badge-blue">${items.length} rubros</span>
      </div>
      <div class="card-body" style="padding:0"><div class="table-wrap">
        <table><thead><tr><th>Código</th><th>Nombre</th><th>Unidad</th><th>Descripción</th><th>Acciones</th></tr></thead>
        <tbody>
          ${items.map(r => `<tr>
            <td><strong>${r.code}</strong></td>
            <td>${r.name}</td>
            <td><span class="badge badge-gray">${r.unit}</span></td>
            <td style="font-size:12px">${r.description || '-'}</td>
            <td><div class="table-actions">
              <button class="btn-ghost btn btn-sm" onclick="openRubroForm('${r.id}')"><i class="fas fa-edit"></i></button>
              <button class="btn-ghost btn btn-sm danger" onclick="deleteRubro('${r.id}')"><i class="fas fa-trash"></i></button>
            </div></td>
          </tr>`).join('')}
        </tbody></table>
      </div></div>
    </div>`;
  }).join('') || `<div class="empty-state"><i class="fas fa-folder-open"></i><p>Sin categorías</p></div>`;
}

window._rubrosFilters = { q: '', category: '' };
function filterRubros(q, category) {
  if (q !== undefined) window._rubrosFilters.q = q.toLowerCase();
  if (category !== undefined) window._rubrosFilters.category = category;
  let rubros = DB.getAll('rubros');
  const f = window._rubrosFilters;
  if (f.q) rubros = rubros.filter(r => r.name.toLowerCase().includes(f.q) || r.code.toLowerCase().includes(f.q) || (r.description||'').toLowerCase().includes(f.q));
  if (f.category) rubros = rubros.filter(r => r.category === f.category);
  const wrap = document.getElementById('rubros-table-wrap');
  if (wrap) wrap.innerHTML = buildRubrosTable(rubros);
}

function openRubroForm(id = null) {
  const r = id ? DB.getById('rubros', id) : null;
  const categories = [...new Set(DB.getAll('rubros').map(x => x.category))].sort();

  openModal(r ? 'Editar Rubro' : 'Nuevo Rubro de Obra', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Código *</label>
    <input class="form-control" id="rb-code" value="${r?.code || ''}" placeholder="Ej: 01, 01.01, R001">
  </div>
  <div class="form-group">
    <label class="form-label">Nombre *</label>
    <input class="form-control" id="rb-name" value="${r?.name || ''}" placeholder="Ej: Hormigón Armado">
  </div>
  <div class="form-group">
    <label class="form-label">Categoría *</label>
    <input class="form-control" id="rb-cat" list="rb-cat-list" value="${r?.category || ''}" placeholder="Estructuras, Albañilería...">
    <datalist id="rb-cat-list">
      ${categories.map(c => `<option value="${c}">`).join('')}
      <option value="Trabajos Preliminares">
      <option value="Estructuras">
      <option value="Albañilería">
      <option value="Terminaciones">
      <option value="Instalaciones">
      <option value="Cubiertas">
      <option value="Carpintería">
      <option value="Pintura">
      <option value="Varios">
    </datalist>
  </div>
  <div class="form-group">
    <label class="form-label">Unidad de Medida *</label>
    <input class="form-control" id="rb-unit" list="rb-unit-list" value="${r?.unit || ''}" placeholder="m², m³, ml, un, gl">
    <datalist id="rb-unit-list">
      <option value="m²"><option value="m³"><option value="ml"><option value="un"><option value="gl">
      <option value="tn"><option value="kg"><option value="lt"><option value="Bolsa">
    </datalist>
  </div>
  <div class="form-group full">
    <label class="form-label">Descripción</label>
    <textarea class="form-control" id="rb-desc" rows="2">${r?.description || ''}</textarea>
  </div>
  <div class="form-group">
    <label class="form-label">Estado</label>
    <select class="form-control" id="rb-active">
      <option value="true" ${r?.active !== false ? 'selected' : ''}>Activo</option>
      <option value="false" ${r?.active === false ? 'selected' : ''}>Inactivo</option>
    </select>
  </div>
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveRubro('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
}

function saveRubro(id) {
  const code = document.getElementById('rb-code').value.trim();
  const name = document.getElementById('rb-name').value.trim();
  const category = document.getElementById('rb-cat').value.trim();
  const unit = document.getElementById('rb-unit').value.trim();
  if (!code || !name || !category || !unit) { toast('Código, nombre, categoría y unidad son obligatorios', 'error'); return; }

  const data = {
    code, name, category, unit,
    description: document.getElementById('rb-desc').value.trim(),
    active: document.getElementById('rb-active').value === 'true',
  };

  if (id) { DB.update('rubros', id, data); toast('Rubro actualizado', 'success'); }
  else { DB.insert('rubros', data); toast('Rubro creado', 'success'); }
  closeModal();
  renderRubros();
}

function deleteRubro(id) {
  confirmDialog('¿Eliminar este rubro?', () => {
    DB.remove('rubros', id);
    toast('Rubro eliminado', 'warning');
    renderRubros();
  });
}

function exportRubros() {
  const rubros = DB.getAll('rubros');
  exportCSV('rubros_de_obra.csv',
    ['Código', 'Nombre', 'Categoría', 'Unidad', 'Descripción', 'Estado'],
    rubros.map(r => [r.code, r.name, r.category, r.unit, r.description || '', r.active !== false ? 'Activo' : 'Inactivo'])
  );
}
