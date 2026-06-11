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
    <button class="btn btn-secondary" onclick="importLebaneRubros()"><i class="fas fa-file-import"></i> Importar Rubros Lebane</button>
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
    <th>Código</th><th>Nombre del Rubro</th><th>Categoría</th><th>Unidad</th><th>Cuenta Contable</th><th>Estado</th><th>Acciones</th>
  </tr></thead>
  <tbody>
  ${rubros.sort((a,b)=>a.code.localeCompare(b.code)).map(r => `<tr>
    <td><strong>${r.code}</strong></td>
    <td>${r.name}</td>
    <td><span class="badge badge-blue">${r.category}</span></td>
    <td><span class="badge badge-gray">${r.unit}</span></td>
    <td style="font-size:12px">${r.account_code ? `<b>${r.account_code}</b> <span style="color:var(--text-muted)">${r.account_name||''}</span>` : '<span style="color:var(--border)">—</span>'}</td>
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
  const accounts = DB.getAll('accounts').sort((a, b) => a.code.localeCompare(b.code));
  const acctOpts = '<option value="">Sin cuenta asignada</option>' +
    accounts.map(a => `<option value="${a.code}" data-name="${a.name||''}" ${r?.account_code===a.code?'selected':''}>${a.code} — ${a.name}</option>`).join('');

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
    <label class="form-label">Cuenta Contable para Imputación</label>
    <select class="form-control" id="rb-account" onchange="rbOnAccountChange()">${acctOpts}</select>
    <input type="hidden" id="rb-account-name" value="${r?.account_name||''}">
    <small style="color:var(--text-muted);font-size:11px">La cuenta que se usará al imputar este rubro en facturas</small>
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

function rbOnAccountChange() {
  const sel = document.getElementById('rb-account');
  const nf = document.getElementById('rb-account-name');
  if (!sel || !nf) return;
  const opt = sel.options[sel.selectedIndex];
  nf.value = opt ? (opt.getAttribute('data-name') || '') : '';
}

function saveRubro(id) {
  const code = document.getElementById('rb-code').value.trim();
  const name = document.getElementById('rb-name').value.trim();
  const category = document.getElementById('rb-cat').value.trim();
  const unit = document.getElementById('rb-unit').value.trim();
  if (!code || !name || !category || !unit) { toast('Código, nombre, categoría y unidad son obligatorios', 'error'); return; }

  const accountSel = document.getElementById('rb-account');
  const accountCode = accountSel ? accountSel.value : '';
  const accountName = (document.getElementById('rb-account-name') || {}).value || '';
  const data = {
    code, name, category, unit,
    description: document.getElementById('rb-desc').value.trim(),
    active: document.getElementById('rb-active').value === 'true',
    account_code: accountCode,
    account_name: accountName,
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
  exportXLSX('rubros_de_obra.xlsx',
    ['Código', 'Nombre', 'Categoría', 'Unidad', 'Descripción', 'Estado'],
    rubros.map(r => [r.code, r.name, r.category, r.unit, r.description || '', r.active !== false ? 'Activo' : 'Inactivo'])
  );
}

// ---- IMPORT RUBROS LEBANE ----
function importLebaneRubros() {
  confirmDialog(
    'Esto reemplazará los rubros actuales con los 330 rubros del listado Lebane (con cuentas contables asociadas). ¿Continuar?',
    function() {
      var now_ts = new Date().toISOString();
      var rubros = [
  {id:'rub-1-101-1',code:'1.101.1',name:'MO - Gestión de obra, sueldos y cargas sociales',category:'DIVISIONS- REQUISITOS GENERALES',unit:'hs',account_code:'1.2.1.2.1.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-101-2',code:'1.101.2',name:'MAT - Gestión de obra, sueldos y cargas sociales',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.2.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-101-3',code:'1.101.3',name:'SUB - Gestión de obra, sueldos y cargas sociales',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.4.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-102-1',code:'1.102.1',name:'MO - Instalaciones e infraestructura provisorios',category:'DIVISIONS- REQUISITOS GENERALES',unit:'hs',account_code:'1.2.1.2.1.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-102-2',code:'1.102.2',name:'MAT - Instalaciones e infraestructura provisorios',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.2.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-102-3',code:'1.102.3',name:'SUB - Instalaciones e infraestructura provisorios',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.4.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-103-1',code:'1.103.1',name:'MO - Obradores, oficinas, sanitarios y galpones',category:'DIVISIONS- REQUISITOS GENERALES',unit:'hs',account_code:'1.2.1.2.1.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-103-2',code:'1.103.2',name:'MAT - Obradores, oficinas, sanitarios y galpones',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.2.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-103-3',code:'1.103.3',name:'SUB - Obradores, oficinas, sanitarios y galpones',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.4.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-104-1',code:'1.104.1',name:'MO - Equipos y andamios',category:'DIVISIONS- REQUISITOS GENERALES',unit:'hs',account_code:'1.2.1.2.1.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-104-2',code:'1.104.2',name:'MAT - Equipos y andamios',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.2.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-104-3',code:'1.104.3',name:'SUB - Equipos y andamios',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.4.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-105-1',code:'1.105.1',name:'MO - Transporte y fletes',category:'DIVISIONS- REQUISITOS GENERALES',unit:'hs',account_code:'1.2.1.2.1.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-105-2',code:'1.105.2',name:'MAT - Transporte y fletes',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.2.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-105-3',code:'1.105.3',name:'SUB - Transporte y fletes',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.4.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-106-1',code:'1.106.1',name:'MO - Herrería y cercos de obra',category:'DIVISIONS- REQUISITOS GENERALES',unit:'hs',account_code:'1.2.1.2.1.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-106-2',code:'1.106.2',name:'MAT - Herrería y cercos de obra',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.2.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-106-3',code:'1.106.3',name:'SUB - Herrería y cercos de obra',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.4.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-107-1',code:'1.107.1',name:'MO - Seguridad de obra',category:'DIVISIONS- REQUISITOS GENERALES',unit:'hs',account_code:'1.2.1.2.1.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-107-2',code:'1.107.2',name:'MAT - Seguridad de obra',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.2.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-107-3',code:'1.107.3',name:'SUB - Seguridad de obra',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.4.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-108-1',code:'1.108.1',name:'MO - Cartelería y publicidad',category:'DIVISIONS- REQUISITOS GENERALES',unit:'hs',account_code:'1.2.1.2.1.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-108-2',code:'1.108.2',name:'MAT - Cartelería y publicidad',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.2.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-108-3',code:'1.108.3',name:'SUB - Cartelería y publicidad',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.4.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-109-1',code:'1.109.1',name:'MO - Replanteo',category:'DIVISIONS- REQUISITOS GENERALES',unit:'hs',account_code:'1.2.1.2.1.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-109-2',code:'1.109.2',name:'MAT - Replanteo',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.2.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-109-3',code:'1.109.3',name:'SUB - Replanteo',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.4.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-110-1',code:'1.110.1',name:'MO - Ayuda de gremios',category:'DIVISIONS- REQUISITOS GENERALES',unit:'hs',account_code:'1.2.1.2.1.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-110-2',code:'1.110.2',name:'MAT - Ayuda de gremios',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.2.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-110-3',code:'1.110.3',name:'SUB - Ayuda de gremios',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.4.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-111-1',code:'1.111.1',name:'MO - Limpieza de obra',category:'DIVISIONS- REQUISITOS GENERALES',unit:'hs',account_code:'1.2.1.2.1.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-111-2',code:'1.111.2',name:'MAT - Limpieza de obra',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.2.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-111-3',code:'1.111.3',name:'SUB - Limpieza de obra',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.4.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-112-1',code:'1.112.1',name:'MO - Seguros de responsabilidad civil',category:'DIVISIONS- REQUISITOS GENERALES',unit:'hs',account_code:'1.2.1.2.1.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-112-2',code:'1.112.2',name:'MAT - Seguros de responsabilidad civil',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.2.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-1-112-3',code:'1.112.3',name:'SUB - Seguros de responsabilidad civil',category:'DIVISIONS- REQUISITOS GENERALES',unit:'gl',account_code:'1.2.1.2.4.57',account_name:'DIVISIONS- REQUISITOS GENERALES',description:'',active:true},
  {id:'rub-2-201-1',code:'2.201.1',name:'MO - Conservación de estructuras pre existentes',category:'DIVISIONS- CONDICIONES EXISTENTES',unit:'hs',account_code:'1.2.1.2.1.58',account_name:'DIVISIONS- CONDICIONES EXISTENTES',description:'',active:true},
  {id:'rub-2-201-2',code:'2.201.2',name:'MAT - Conservación de estructuras pre existentes',category:'DIVISIONS- CONDICIONES EXISTENTES',unit:'gl',account_code:'1.2.1.2.2.58',account_name:'DIVISIONS- CONDICIONES EXISTENTES',description:'',active:true},
  {id:'rub-2-201-3',code:'2.201.3',name:'SUB - Conservación de estructuras pre existentes',category:'DIVISIONS- CONDICIONES EXISTENTES',unit:'gl',account_code:'1.2.1.2.4.58',account_name:'DIVISIONS- CONDICIONES EXISTENTES',description:'',active:true},
  {id:'rub-2-202-1',code:'2.202.1',name:'MO - Estudio ambiental',category:'DIVISIONS- CONDICIONES EXISTENTES',unit:'hs',account_code:'1.2.1.2.1.58',account_name:'DIVISIONS- CONDICIONES EXISTENTES',description:'',active:true},
  {id:'rub-2-202-2',code:'2.202.2',name:'MAT - Estudio ambiental',category:'DIVISIONS- CONDICIONES EXISTENTES',unit:'gl',account_code:'1.2.1.2.2.58',account_name:'DIVISIONS- CONDICIONES EXISTENTES',description:'',active:true},
  {id:'rub-2-202-3',code:'2.202.3',name:'SUB - Estudio ambiental',category:'DIVISIONS- CONDICIONES EXISTENTES',unit:'gl',account_code:'1.2.1.2.4.58',account_name:'DIVISIONS- CONDICIONES EXISTENTES',description:'',active:true},
  {id:'rub-2-203-1',code:'2.203.1',name:'MO - Estudio de suelos',category:'DIVISIONS- CONDICIONES EXISTENTES',unit:'hs',account_code:'1.2.1.2.1.58',account_name:'DIVISIONS- CONDICIONES EXISTENTES',description:'',active:true},
  {id:'rub-2-203-2',code:'2.203.2',name:'MAT - Estudio de suelos',category:'DIVISIONS- CONDICIONES EXISTENTES',unit:'gl',account_code:'1.2.1.2.2.58',account_name:'DIVISIONS- CONDICIONES EXISTENTES',description:'',active:true},
  {id:'rub-2-203-3',code:'2.203.3',name:'SUB - Estudio de suelos',category:'DIVISIONS- CONDICIONES EXISTENTES',unit:'gl',account_code:'1.2.1.2.4.58',account_name:'DIVISIONS- CONDICIONES EXISTENTES',description:'',active:true},
  {id:'rub-2-204-1',code:'2.204.1',name:'MO - Demolición general',category:'DIVISIONS- CONDICIONES EXISTENTES',unit:'hs',account_code:'1.2.1.2.1.58',account_name:'DIVISIONS- CONDICIONES EXISTENTES',description:'',active:true},
  {id:'rub-2-204-2',code:'2.204.2',name:'MAT - Demolición general',category:'DIVISIONS- CONDICIONES EXISTENTES',unit:'gl',account_code:'1.2.1.2.2.58',account_name:'DIVISIONS- CONDICIONES EXISTENTES',description:'',active:true},
  {id:'rub-2-204-3',code:'2.204.3',name:'SUB - Demolición general',category:'DIVISIONS- CONDICIONES EXISTENTES',unit:'gl',account_code:'1.2.1.2.4.58',account_name:'DIVISIONS- CONDICIONES EXISTENTES',description:'',active:true},
  {id:'rub-3-301-1',code:'3.301.1',name:'MO - Estructura de hormigón',category:'DIVISIONS- HORMIGÓN',unit:'hs',account_code:'1.2.1.2.1.59',account_name:'DIVISIONS- HORMIGÓN',description:'',active:true},
  {id:'rub-3-301-2',code:'3.301.2',name:'MAT - Estructura de hormigón',category:'DIVISIONS- HORMIGÓN',unit:'gl',account_code:'1.2.1.2.2.59',account_name:'DIVISIONS- HORMIGÓN',description:'',active:true},
  {id:'rub-3-301-3',code:'3.301.3',name:'SUB - Estructura de hormigón',category:'DIVISIONS- HORMIGÓN',unit:'gl',account_code:'1.2.1.2.4.59',account_name:'DIVISIONS- HORMIGÓN',description:'',active:true},
  {id:'rub-3-302-1',code:'3.302.1',name:'MO - Pilotaje y fundaciones especiales',category:'DIVISIONS- HORMIGÓN',unit:'hs',account_code:'1.2.1.2.1.59',account_name:'DIVISIONS- HORMIGÓN',description:'',active:true},
  {id:'rub-3-302-2',code:'3.302.2',name:'MAT - Pilotaje y fundaciones especiales',category:'DIVISIONS- HORMIGÓN',unit:'gl',account_code:'1.2.1.2.2.59',account_name:'DIVISIONS- HORMIGÓN',description:'',active:true},
  {id:'rub-3-302-3',code:'3.302.3',name:'SUB - Pilotaje y fundaciones especiales',category:'DIVISIONS- HORMIGÓN',unit:'gl',account_code:'1.2.1.2.4.59',account_name:'DIVISIONS- HORMIGÓN',description:'',active:true},
  {id:'rub-4-401-1',code:'4.401.1',name:'MO - Muros',category:'DIVISIONS- MAMPOSTERÍA',unit:'hs',account_code:'1.2.1.2.1.60',account_name:'DIVISIONS- MAMPOSTERÍA',description:'',active:true},
  {id:'rub-4-401-2',code:'4.401.2',name:'MAT - Muros',category:'DIVISIONS- MAMPOSTERÍA',unit:'gl',account_code:'1.2.1.2.2.60',account_name:'DIVISIONS- MAMPOSTERÍA',description:'',active:true},
  {id:'rub-4-401-3',code:'4.401.3',name:'SUB - Muros',category:'DIVISIONS- MAMPOSTERÍA',unit:'gl',account_code:'1.2.1.2.4.60',account_name:'DIVISIONS- MAMPOSTERÍA',description:'',active:true},
  {id:'rub-4-402-1',code:'4.402.1',name:'MO - Contrapisos y carpetas',category:'DIVISIONS- MAMPOSTERÍA',unit:'hs',account_code:'1.2.1.2.1.60',account_name:'DIVISIONS- MAMPOSTERÍA',description:'',active:true},
  {id:'rub-4-402-2',code:'4.402.2',name:'MAT - Contrapisos y carpetas',category:'DIVISIONS- MAMPOSTERÍA',unit:'gl',account_code:'1.2.1.2.2.60',account_name:'DIVISIONS- MAMPOSTERÍA',description:'',active:true},
  {id:'rub-4-402-3',code:'4.402.3',name:'SUB - Contrapisos y carpetas',category:'DIVISIONS- MAMPOSTERÍA',unit:'gl',account_code:'1.2.1.2.4.60',account_name:'DIVISIONS- MAMPOSTERÍA',description:'',active:true},
  {id:'rub-5-501-1',code:'5.501.1',name:'MO - Estructura metálica',category:'DIVISIONS- METALES',unit:'hs',account_code:'1.2.1.2.1.61',account_name:'DIVISIONS- METALES',description:'',active:true},
  {id:'rub-5-501-2',code:'5.501.2',name:'MAT - Estructura metálica',category:'DIVISIONS- METALES',unit:'gl',account_code:'1.2.1.2.2.61',account_name:'DIVISIONS- METALES',description:'',active:true},
  {id:'rub-5-501-3',code:'5.501.3',name:'SUB - Estructura metálica',category:'DIVISIONS- METALES',unit:'gl',account_code:'1.2.1.2.4.61',account_name:'DIVISIONS- METALES',description:'',active:true},
  {id:'rub-5-502-1',code:'5.502.1',name:'MO - Herrerías',category:'DIVISIONS- METALES',unit:'hs',account_code:'1.2.1.2.1.61',account_name:'DIVISIONS- METALES',description:'',active:true},
  {id:'rub-5-502-2',code:'5.502.2',name:'MAT - Herrerías',category:'DIVISIONS- METALES',unit:'gl',account_code:'1.2.1.2.2.61',account_name:'DIVISIONS- METALES',description:'',active:true},
  {id:'rub-5-502-3',code:'5.502.3',name:'SUB - Herrerías',category:'DIVISIONS- METALES',unit:'gl',account_code:'1.2.1.2.4.61',account_name:'DIVISIONS- METALES',description:'',active:true},
  {id:'rub-6-601-1',code:'6.601.1',name:'MO - Alacenas y bajomesadas',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'hs',account_code:'1.2.1.2.1.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-601-2',code:'6.601.2',name:'MAT - Alacenas y bajomesadas',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'gl',account_code:'1.2.1.2.2.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-601-3',code:'6.601.3',name:'SUB - Alacenas y bajomesadas',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'gl',account_code:'1.2.1.2.4.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-602-1',code:'6.602.1',name:'MO - Vanitories',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'hs',account_code:'1.2.1.2.1.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-602-2',code:'6.602.2',name:'MAT - Vanitories',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'gl',account_code:'1.2.1.2.2.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-602-3',code:'6.602.3',name:'SUB - Vanitories',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'gl',account_code:'1.2.1.2.4.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-603-1',code:'6.603.1',name:'MO - Marmolería',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'hs',account_code:'1.2.1.2.1.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-603-2',code:'6.603.2',name:'MAT - Marmolería',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'gl',account_code:'1.2.1.2.2.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-603-3',code:'6.603.3',name:'SUB - Marmolería',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'gl',account_code:'1.2.1.2.4.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-604-1',code:'6.604.1',name:'MO - Paneles de madera',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'hs',account_code:'1.2.1.2.1.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-604-2',code:'6.604.2',name:'MAT - Paneles de madera',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'gl',account_code:'1.2.1.2.2.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-604-3',code:'6.604.3',name:'SUB - Paneles de madera',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'gl',account_code:'1.2.1.2.4.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-605-1',code:'6.605.1',name:'MO - Deck de madera',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'hs',account_code:'1.2.1.2.1.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-605-2',code:'6.605.2',name:'MAT - Deck de madera',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'gl',account_code:'1.2.1.2.2.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-605-3',code:'6.605.3',name:'SUB - Deck de madera',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'gl',account_code:'1.2.1.2.4.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-606-1',code:'6.606.1',name:'MO - Estructuras de WPC',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'hs',account_code:'1.2.1.2.1.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-606-2',code:'6.606.2',name:'MAT - Estructuras de WPC',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'gl',account_code:'1.2.1.2.2.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-606-3',code:'6.606.3',name:'SUB - Estructuras de WPC',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'gl',account_code:'1.2.1.2.4.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-607-1',code:'6.607.1',name:'MO - Placares y almacenamiento',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'hs',account_code:'1.2.1.2.1.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-607-2',code:'6.607.2',name:'MAT - Placares y almacenamiento',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'gl',account_code:'1.2.1.2.2.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-6-607-3',code:'6.607.3',name:'SUB - Placares y almacenamiento',category:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',unit:'gl',account_code:'1.2.1.2.4.62',account_name:'DIVISIONS- MADERAS, PLÁSTICOS Y COMPUESTOS',description:'',active:true},
  {id:'rub-7-701-1',code:'7.701.1',name:'MO - Aislaciones hidrófugas',category:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',unit:'hs',account_code:'1.2.1.2.1.63',account_name:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',description:'',active:true},
  {id:'rub-7-701-2',code:'7.701.2',name:'MAT - Aislaciones hidrófugas',category:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',unit:'gl',account_code:'1.2.1.2.2.63',account_name:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',description:'',active:true},
  {id:'rub-7-701-3',code:'7.701.3',name:'SUB - Aislaciones hidrófugas',category:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',unit:'gl',account_code:'1.2.1.2.4.63',account_name:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',description:'',active:true},
  {id:'rub-7-702-1',code:'7.702.1',name:'MO - Aislaciones térmicas',category:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',unit:'hs',account_code:'1.2.1.2.1.63',account_name:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',description:'',active:true},
  {id:'rub-7-702-2',code:'7.702.2',name:'MAT - Aislaciones térmicas',category:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',unit:'gl',account_code:'1.2.1.2.2.63',account_name:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',description:'',active:true},
  {id:'rub-7-702-3',code:'7.702.3',name:'SUB - Aislaciones térmicas',category:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',unit:'gl',account_code:'1.2.1.2.4.63',account_name:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',description:'',active:true},
  {id:'rub-7-703-1',code:'7.703.1',name:'MO - Aislaciones en techos (membranas)',category:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',unit:'hs',account_code:'1.2.1.2.1.63',account_name:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',description:'',active:true},
  {id:'rub-7-703-2',code:'7.703.2',name:'MAT - Aislaciones en techos (membranas)',category:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',unit:'gl',account_code:'1.2.1.2.2.63',account_name:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',description:'',active:true},
  {id:'rub-7-703-3',code:'7.703.3',name:'SUB - Aislaciones en techos (membranas)',category:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',unit:'gl',account_code:'1.2.1.2.4.63',account_name:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',description:'',active:true},
  {id:'rub-7-704-1',code:'7.704.1',name:'MO - Protecciones contra fuego',category:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',unit:'hs',account_code:'1.2.1.2.1.63',account_name:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',description:'',active:true},
  {id:'rub-7-704-2',code:'7.704.2',name:'MAT - Protecciones contra fuego',category:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',unit:'gl',account_code:'1.2.1.2.2.63',account_name:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',description:'',active:true},
  {id:'rub-7-704-3',code:'7.704.3',name:'SUB - Protecciones contra fuego',category:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',unit:'gl',account_code:'1.2.1.2.4.63',account_name:'DIVISIONS- AISLACIONES TÉRMICAS E HIDRÓFUGAS',description:'',active:true},
  {id:'rub-8-801-1',code:'8.801.1',name:'MO - Puertas y marcos',category:'DIVISIONS- ABERTURAS',unit:'hs',account_code:'1.2.1.2.1.64',account_name:'DIVISIONS- ABERTURAS',description:'',active:true},
  {id:'rub-8-801-2',code:'8.801.2',name:'MAT - Puertas y marcos',category:'DIVISIONS- ABERTURAS',unit:'gl',account_code:'1.2.1.2.2.64',account_name:'DIVISIONS- ABERTURAS',description:'',active:true},
  {id:'rub-8-801-3',code:'8.801.3',name:'SUB - Puertas y marcos',category:'DIVISIONS- ABERTURAS',unit:'gl',account_code:'1.2.1.2.4.64',account_name:'DIVISIONS- ABERTURAS',description:'',active:true},
  {id:'rub-8-802-1',code:'8.802.1',name:'MO - Paneles de vidrio, curtain walls',category:'DIVISIONS- ABERTURAS',unit:'hs',account_code:'1.2.1.2.1.64',account_name:'DIVISIONS- ABERTURAS',description:'',active:true},
  {id:'rub-8-802-2',code:'8.802.2',name:'MAT - Paneles de vidrio, curtain walls',category:'DIVISIONS- ABERTURAS',unit:'gl',account_code:'1.2.1.2.2.64',account_name:'DIVISIONS- ABERTURAS',description:'',active:true},
  {id:'rub-8-802-3',code:'8.802.3',name:'SUB - Paneles de vidrio, curtain walls',category:'DIVISIONS- ABERTURAS',unit:'gl',account_code:'1.2.1.2.4.64',account_name:'DIVISIONS- ABERTURAS',description:'',active:true},
  {id:'rub-8-803-1',code:'8.803.1',name:'MO - Divisiones de vidrio',category:'DIVISIONS- ABERTURAS',unit:'hs',account_code:'1.2.1.2.1.64',account_name:'DIVISIONS- ABERTURAS',description:'',active:true},
  {id:'rub-8-803-2',code:'8.803.2',name:'MAT - Divisiones de vidrio',category:'DIVISIONS- ABERTURAS',unit:'gl',account_code:'1.2.1.2.2.64',account_name:'DIVISIONS- ABERTURAS',description:'',active:true},
  {id:'rub-8-803-3',code:'8.803.3',name:'SUB - Divisiones de vidrio',category:'DIVISIONS- ABERTURAS',unit:'gl',account_code:'1.2.1.2.4.64',account_name:'DIVISIONS- ABERTURAS',description:'',active:true},
  {id:'rub-8-804-1',code:'8.804.1',name:'MO - Ventanas y puertas balcón',category:'DIVISIONS- ABERTURAS',unit:'hs',account_code:'1.2.1.2.1.64',account_name:'DIVISIONS- ABERTURAS',description:'',active:true},
  {id:'rub-8-804-2',code:'8.804.2',name:'MAT - Ventanas y puertas balcón',category:'DIVISIONS- ABERTURAS',unit:'gl',account_code:'1.2.1.2.2.64',account_name:'DIVISIONS- ABERTURAS',description:'',active:true},
  {id:'rub-8-804-3',code:'8.804.3',name:'SUB - Ventanas y puertas balcón',category:'DIVISIONS- ABERTURAS',unit:'gl',account_code:'1.2.1.2.4.64',account_name:'DIVISIONS- ABERTURAS',description:'',active:true},
  {id:'rub-9-901-1',code:'9.901.1',name:'MO - Enlucido de yeso',category:'DIVISIONS- TERMINACIONES',unit:'hs',account_code:'1.2.1.2.1.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-901-2',code:'9.901.2',name:'MAT - Enlucido de yeso',category:'DIVISIONS- TERMINACIONES',unit:'gl',account_code:'1.2.1.2.2.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-901-3',code:'9.901.3',name:'SUB - Enlucido de yeso',category:'DIVISIONS- TERMINACIONES',unit:'gl',account_code:'1.2.1.2.4.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-902-1',code:'9.902.1',name:'MO - Revoques cementicios',category:'DIVISIONS- TERMINACIONES',unit:'hs',account_code:'1.2.1.2.1.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-902-2',code:'9.902.2',name:'MAT - Revoques cementicios',category:'DIVISIONS- TERMINACIONES',unit:'gl',account_code:'1.2.1.2.2.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-902-3',code:'9.902.3',name:'SUB - Revoques cementicios',category:'DIVISIONS- TERMINACIONES',unit:'gl',account_code:'1.2.1.2.4.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-903-1',code:'9.903.1',name:'MO - Tabiques de yeso',category:'DIVISIONS- TERMINACIONES',unit:'hs',account_code:'1.2.1.2.1.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-903-2',code:'9.903.2',name:'MAT - Tabiques de yeso',category:'DIVISIONS- TERMINACIONES',unit:'gl',account_code:'1.2.1.2.2.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-903-3',code:'9.903.3',name:'SUB - Tabiques de yeso',category:'DIVISIONS- TERMINACIONES',unit:'gl',account_code:'1.2.1.2.4.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-904-1',code:'9.904.1',name:'MO - Cielorrasos',category:'DIVISIONS- TERMINACIONES',unit:'hs',account_code:'1.2.1.2.1.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-904-2',code:'9.904.2',name:'MAT - Cielorrasos',category:'DIVISIONS- TERMINACIONES',unit:'gl',account_code:'1.2.1.2.2.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-904-3',code:'9.904.3',name:'SUB - Cielorrasos',category:'DIVISIONS- TERMINACIONES',unit:'gl',account_code:'1.2.1.2.4.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-905-1',code:'9.905.1',name:'MO - Solados',category:'DIVISIONS- TERMINACIONES',unit:'hs',account_code:'1.2.1.2.1.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-905-2',code:'9.905.2',name:'MAT - Solados',category:'DIVISIONS- TERMINACIONES',unit:'gl',account_code:'1.2.1.2.2.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-905-3',code:'9.905.3',name:'SUB - Solados',category:'DIVISIONS- TERMINACIONES',unit:'gl',account_code:'1.2.1.2.4.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-906-1',code:'9.906.1',name:'MO - Revestimientos',category:'DIVISIONS- TERMINACIONES',unit:'hs',account_code:'1.2.1.2.1.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-906-2',code:'9.906.2',name:'MAT - Revestimientos',category:'DIVISIONS- TERMINACIONES',unit:'gl',account_code:'1.2.1.2.2.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-906-3',code:'9.906.3',name:'SUB - Revestimientos',category:'DIVISIONS- TERMINACIONES',unit:'gl',account_code:'1.2.1.2.4.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-907-1',code:'9.907.1',name:'MO - Aislación acústica',category:'DIVISIONS- TERMINACIONES',unit:'hs',account_code:'1.2.1.2.1.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-907-2',code:'9.907.2',name:'MAT - Aislación acústica',category:'DIVISIONS- TERMINACIONES',unit:'gl',account_code:'1.2.1.2.2.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-907-3',code:'9.907.3',name:'SUB - Aislación acústica',category:'DIVISIONS- TERMINACIONES',unit:'gl',account_code:'1.2.1.2.4.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-908-1',code:'9.908.1',name:'MO - Pintura y recubrimientos',category:'DIVISIONS- TERMINACIONES',unit:'hs',account_code:'1.2.1.2.1.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-908-2',code:'9.908.2',name:'MAT - Pintura y recubrimientos',category:'DIVISIONS- TERMINACIONES',unit:'gl',account_code:'1.2.1.2.2.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-9-908-3',code:'9.908.3',name:'SUB - Pintura y recubrimientos',category:'DIVISIONS- TERMINACIONES',unit:'gl',account_code:'1.2.1.2.4.65',account_name:'DIVISIONS- TERMINACIONES',description:'',active:true},
  {id:'rub-10-1001-1',code:'10.1001.1',name:'MO - Señalizaciones',category:'DIVISIONS- ESPECIALIDADES',unit:'hs',account_code:'1.2.1.2.1.66',account_name:'DIVISIONS- ESPECIALIDADES',description:'',active:true},
  {id:'rub-10-1001-2',code:'10.1001.2',name:'MAT - Señalizaciones',category:'DIVISIONS- ESPECIALIDADES',unit:'gl',account_code:'1.2.1.2.2.66',account_name:'DIVISIONS- ESPECIALIDADES',description:'',active:true},
  {id:'rub-10-1001-3',code:'10.1001.3',name:'SUB - Señalizaciones',category:'DIVISIONS- ESPECIALIDADES',unit:'gl',account_code:'1.2.1.2.4.66',account_name:'DIVISIONS- ESPECIALIDADES',description:'',active:true},
  {id:'rub-10-1002-1',code:'10.1002.1',name:'MO - Cubículos, compartimentos y particiones',category:'DIVISIONS- ESPECIALIDADES',unit:'hs',account_code:'1.2.1.2.1.66',account_name:'DIVISIONS- ESPECIALIDADES',description:'',active:true},
  {id:'rub-10-1002-2',code:'10.1002.2',name:'MAT - Cubículos, compartimentos y particiones',category:'DIVISIONS- ESPECIALIDADES',unit:'gl',account_code:'1.2.1.2.2.66',account_name:'DIVISIONS- ESPECIALIDADES',description:'',active:true},
  {id:'rub-10-1002-3',code:'10.1002.3',name:'SUB - Cubículos, compartimentos y particiones',category:'DIVISIONS- ESPECIALIDADES',unit:'gl',account_code:'1.2.1.2.4.66',account_name:'DIVISIONS- ESPECIALIDADES',description:'',active:true},
  {id:'rub-10-1003-1',code:'10.1003.1',name:'MO - Espejos',category:'DIVISIONS- ESPECIALIDADES',unit:'hs',account_code:'1.2.1.2.1.66',account_name:'DIVISIONS- ESPECIALIDADES',description:'',active:true},
  {id:'rub-10-1003-2',code:'10.1003.2',name:'MAT - Espejos',category:'DIVISIONS- ESPECIALIDADES',unit:'gl',account_code:'1.2.1.2.2.66',account_name:'DIVISIONS- ESPECIALIDADES',description:'',active:true},
  {id:'rub-10-1003-3',code:'10.1003.3',name:'SUB - Espejos',category:'DIVISIONS- ESPECIALIDADES',unit:'gl',account_code:'1.2.1.2.4.66',account_name:'DIVISIONS- ESPECIALIDADES',description:'',active:true},
  {id:'rub-10-1004-1',code:'10.1004.1',name:'MO - Accesorios para baños, toilettes y lavaderos',category:'DIVISIONS- ESPECIALIDADES',unit:'hs',account_code:'1.2.1.2.1.66',account_name:'DIVISIONS- ESPECIALIDADES',description:'',active:true},
  {id:'rub-10-1004-2',code:'10.1004.2',name:'MAT - Accesorios para baños, toilettes y lavaderos',category:'DIVISIONS- ESPECIALIDADES',unit:'gl',account_code:'1.2.1.2.2.66',account_name:'DIVISIONS- ESPECIALIDADES',description:'',active:true},
  {id:'rub-10-1004-3',code:'10.1004.3',name:'SUB - Accesorios para baños, toilettes y lavaderos',category:'DIVISIONS- ESPECIALIDADES',unit:'gl',account_code:'1.2.1.2.4.66',account_name:'DIVISIONS- ESPECIALIDADES',description:'',active:true},
  {id:'rub-10-1005-1',code:'10.1005.1',name:'MO - Parrillas prefabricadas',category:'DIVISIONS- ESPECIALIDADES',unit:'hs',account_code:'1.2.1.2.1.66',account_name:'DIVISIONS- ESPECIALIDADES',description:'',active:true},
  {id:'rub-10-1005-2',code:'10.1005.2',name:'MAT - Parrillas prefabricadas',category:'DIVISIONS- ESPECIALIDADES',unit:'gl',account_code:'1.2.1.2.2.66',account_name:'DIVISIONS- ESPECIALIDADES',description:'',active:true},
  {id:'rub-10-1005-3',code:'10.1005.3',name:'SUB - Parrillas prefabricadas',category:'DIVISIONS- ESPECIALIDADES',unit:'gl',account_code:'1.2.1.2.4.66',account_name:'DIVISIONS- ESPECIALIDADES',description:'',active:true},
  {id:'rub-10-1006-1',code:'10.1006.1',name:'MO - Almacenamiento (lockers, gabinetes, armarios)',category:'DIVISIONS- ESPECIALIDADES',unit:'hs',account_code:'1.2.1.2.1.66',account_name:'DIVISIONS- ESPECIALIDADES',description:'',active:true},
  {id:'rub-10-1006-2',code:'10.1006.2',name:'MAT - Almacenamiento (lockers, gabinetes, armarios)',category:'DIVISIONS- ESPECIALIDADES',unit:'gl',account_code:'1.2.1.2.2.66',account_name:'DIVISIONS- ESPECIALIDADES',description:'',active:true},
  {id:'rub-10-1006-3',code:'10.1006.3',name:'SUB - Almacenamiento (lockers, gabinetes, armarios)',category:'DIVISIONS- ESPECIALIDADES',unit:'gl',account_code:'1.2.1.2.4.66',account_name:'DIVISIONS- ESPECIALIDADES',description:'',active:true},
  {id:'rub-11-1101-1',code:'11.1101.1',name:'MO - Equipamiento deportivo',category:'DIVISIONS- EQUIPAMIENTO',unit:'hs',account_code:'1.2.1.2.1.67',account_name:'DIVISIONS- EQUIPAMIENTO',description:'',active:true},
  {id:'rub-11-1101-2',code:'11.1101.2',name:'MAT - Equipamiento deportivo',category:'DIVISIONS- EQUIPAMIENTO',unit:'gl',account_code:'1.2.1.2.2.67',account_name:'DIVISIONS- EQUIPAMIENTO',description:'',active:true},
  {id:'rub-11-1101-3',code:'11.1101.3',name:'SUB - Equipamiento deportivo',category:'DIVISIONS- EQUIPAMIENTO',unit:'gl',account_code:'1.2.1.2.4.67',account_name:'DIVISIONS- EQUIPAMIENTO',description:'',active:true},
  {id:'rub-11-1102-1',code:'11.1102.1',name:'MO - Equipos recreativos',category:'DIVISIONS- EQUIPAMIENTO',unit:'hs',account_code:'1.2.1.2.1.67',account_name:'DIVISIONS- EQUIPAMIENTO',description:'',active:true},
  {id:'rub-11-1102-2',code:'11.1102.2',name:'MAT - Equipos recreativos',category:'DIVISIONS- EQUIPAMIENTO',unit:'gl',account_code:'1.2.1.2.2.67',account_name:'DIVISIONS- EQUIPAMIENTO',description:'',active:true},
  {id:'rub-11-1102-3',code:'11.1102.3',name:'SUB - Equipos recreativos',category:'DIVISIONS- EQUIPAMIENTO',unit:'gl',account_code:'1.2.1.2.4.67',account_name:'DIVISIONS- EQUIPAMIENTO',description:'',active:true},
  {id:'rub-12-1201-1',code:'12.1201.1',name:'MO - Arte y decoración',category:'DIVISIONS- MOBILIARIO',unit:'hs',account_code:'1.2.1.2.1.68',account_name:'DIVISIONS- MOBILIARIO',description:'',active:true},
  {id:'rub-12-1201-2',code:'12.1201.2',name:'MAT - Arte y decoración',category:'DIVISIONS- MOBILIARIO',unit:'gl',account_code:'1.2.1.2.2.68',account_name:'DIVISIONS- MOBILIARIO',description:'',active:true},
  {id:'rub-12-1201-3',code:'12.1201.3',name:'SUB - Arte y decoración',category:'DIVISIONS- MOBILIARIO',unit:'gl',account_code:'1.2.1.2.4.68',account_name:'DIVISIONS- MOBILIARIO',description:'',active:true},
  {id:'rub-12-1202-1',code:'12.1202.1',name:'MO - Cortinas',category:'DIVISIONS- MOBILIARIO',unit:'hs',account_code:'1.2.1.2.1.68',account_name:'DIVISIONS- MOBILIARIO',description:'',active:true},
  {id:'rub-12-1202-2',code:'12.1202.2',name:'MAT - Cortinas',category:'DIVISIONS- MOBILIARIO',unit:'gl',account_code:'1.2.1.2.2.68',account_name:'DIVISIONS- MOBILIARIO',description:'',active:true},
  {id:'rub-12-1202-3',code:'12.1202.3',name:'SUB - Cortinas',category:'DIVISIONS- MOBILIARIO',unit:'gl',account_code:'1.2.1.2.4.68',account_name:'DIVISIONS- MOBILIARIO',description:'',active:true},
  {id:'rub-12-1203-1',code:'12.1203.1',name:'MO - Mobiliario de unidades',category:'DIVISIONS- MOBILIARIO',unit:'hs',account_code:'1.2.1.2.1.68',account_name:'DIVISIONS- MOBILIARIO',description:'',active:true},
  {id:'rub-12-1203-2',code:'12.1203.2',name:'MAT - Mobiliario de unidades',category:'DIVISIONS- MOBILIARIO',unit:'gl',account_code:'1.2.1.2.2.68',account_name:'DIVISIONS- MOBILIARIO',description:'',active:true},
  {id:'rub-12-1203-3',code:'12.1203.3',name:'SUB - Mobiliario de unidades',category:'DIVISIONS- MOBILIARIO',unit:'gl',account_code:'1.2.1.2.4.68',account_name:'DIVISIONS- MOBILIARIO',description:'',active:true},
  {id:'rub-12-1204-1',code:'12.1204.1',name:'MO - Mobiliario de espacios comunes',category:'DIVISIONS- MOBILIARIO',unit:'hs',account_code:'1.2.1.2.1.68',account_name:'DIVISIONS- MOBILIARIO',description:'',active:true},
  {id:'rub-12-1204-2',code:'12.1204.2',name:'MAT - Mobiliario de espacios comunes',category:'DIVISIONS- MOBILIARIO',unit:'gl',account_code:'1.2.1.2.2.68',account_name:'DIVISIONS- MOBILIARIO',description:'',active:true},
  {id:'rub-12-1204-3',code:'12.1204.3',name:'SUB - Mobiliario de espacios comunes',category:'DIVISIONS- MOBILIARIO',unit:'gl',account_code:'1.2.1.2.4.68',account_name:'DIVISIONS- MOBILIARIO',description:'',active:true},
  {id:'rub-13-1301-1',code:'13.1301.1',name:'MO - Piscinas',category:'OBRA EXTERIOR',unit:'hs',account_code:'1.2.1.2.1.69',account_name:'OBRA EXTERIOR',description:'',active:true},
  {id:'rub-13-1301-2',code:'13.1301.2',name:'MAT - Piscinas',category:'OBRA EXTERIOR',unit:'gl',account_code:'1.2.1.2.2.69',account_name:'OBRA EXTERIOR',description:'',active:true},
  {id:'rub-13-1301-3',code:'13.1301.3',name:'SUB - Piscinas',category:'OBRA EXTERIOR',unit:'gl',account_code:'1.2.1.2.4.69',account_name:'OBRA EXTERIOR',description:'',active:true},
  {id:'rub-13-1302-1',code:'13.1302.1',name:'MO - Fuentes',category:'OBRA EXTERIOR',unit:'hs',account_code:'1.2.1.2.1.69',account_name:'OBRA EXTERIOR',description:'',active:true},
  {id:'rub-13-1302-2',code:'13.1302.2',name:'MAT - Fuentes',category:'OBRA EXTERIOR',unit:'gl',account_code:'1.2.1.2.2.69',account_name:'OBRA EXTERIOR',description:'',active:true},
  {id:'rub-13-1302-3',code:'13.1302.3',name:'SUB - Fuentes',category:'OBRA EXTERIOR',unit:'gl',account_code:'1.2.1.2.4.69',account_name:'OBRA EXTERIOR',description:'',active:true},
  {id:'rub-13-1303-1',code:'13.1303.1',name:'MO - Construcciones especiales para deportes y recreación',category:'OBRA EXTERIOR',unit:'hs',account_code:'1.2.1.2.1.69',account_name:'OBRA EXTERIOR',description:'',active:true},
  {id:'rub-13-1303-2',code:'13.1303.2',name:'MAT - Construcciones especiales para deportes y recreación',category:'OBRA EXTERIOR',unit:'gl',account_code:'1.2.1.2.2.69',account_name:'OBRA EXTERIOR',description:'',active:true},
  {id:'rub-13-1303-3',code:'13.1303.3',name:'SUB - Construcciones especiales para deportes y recreación',category:'OBRA EXTERIOR',unit:'gl',account_code:'1.2.1.2.4.69',account_name:'OBRA EXTERIOR',description:'',active:true},
  {id:'rub-14-1401-1',code:'14.1401.1',name:'MO - Montacargas',category:'DIVISIONS- SISTEMAS DE TRANSPORTE',unit:'hs',account_code:'1.2.1.2.1.70',account_name:'DIVISIONS- SISTEMAS DE TRANSPORTE',description:'',active:true},
  {id:'rub-14-1401-2',code:'14.1401.2',name:'MAT - Montacargas',category:'DIVISIONS- SISTEMAS DE TRANSPORTE',unit:'gl',account_code:'1.2.1.2.2.70',account_name:'DIVISIONS- SISTEMAS DE TRANSPORTE',description:'',active:true},
  {id:'rub-14-1401-3',code:'14.1401.3',name:'SUB - Montacargas',category:'DIVISIONS- SISTEMAS DE TRANSPORTE',unit:'gl',account_code:'1.2.1.2.4.70',account_name:'DIVISIONS- SISTEMAS DE TRANSPORTE',description:'',active:true},
  {id:'rub-14-1402-1',code:'14.1402.1',name:'MO - Ascensores y elevadores',category:'DIVISIONS- SISTEMAS DE TRANSPORTE',unit:'hs',account_code:'1.2.1.2.1.70',account_name:'DIVISIONS- SISTEMAS DE TRANSPORTE',description:'',active:true},
  {id:'rub-14-1402-2',code:'14.1402.2',name:'MAT - Ascensores y elevadores',category:'DIVISIONS- SISTEMAS DE TRANSPORTE',unit:'gl',account_code:'1.2.1.2.2.70',account_name:'DIVISIONS- SISTEMAS DE TRANSPORTE',description:'',active:true},
  {id:'rub-14-1402-3',code:'14.1402.3',name:'SUB - Ascensores y elevadores',category:'DIVISIONS- SISTEMAS DE TRANSPORTE',unit:'gl',account_code:'1.2.1.2.4.70',account_name:'DIVISIONS- SISTEMAS DE TRANSPORTE',description:'',active:true},
  {id:'rub-21-2101-1',code:'21.2101.1',name:'MO - Instalaciones contra incendios',category:'DIVISIONS- EXTINCIÓN DE INCENDIOS',unit:'hs',account_code:'1.2.1.2.1.71',account_name:'DIVISIONS- EXTINCIÓN DE INCENDIOS',description:'',active:true},
  {id:'rub-21-2101-2',code:'21.2101.2',name:'MAT - Instalaciones contra incendios',category:'DIVISIONS- EXTINCIÓN DE INCENDIOS',unit:'gl',account_code:'1.2.1.2.2.71',account_name:'DIVISIONS- EXTINCIÓN DE INCENDIOS',description:'',active:true},
  {id:'rub-21-2101-3',code:'21.2101.3',name:'SUB - Instalaciones contra incendios',category:'DIVISIONS- EXTINCIÓN DE INCENDIOS',unit:'gl',account_code:'1.2.1.2.4.71',account_name:'DIVISIONS- EXTINCIÓN DE INCENDIOS',description:'',active:true},
  {id:'rub-22-2201-1',code:'22.2201.1',name:'MO - Instalaciones sanitarias',category:'DIVISIONS- PLOMERÍA',unit:'hs',account_code:'1.2.1.2.1.72',account_name:'DIVISIONS- PLOMERÍA',description:'',active:true},
  {id:'rub-22-2201-2',code:'22.2201.2',name:'MAT - Instalaciones sanitarias',category:'DIVISIONS- PLOMERÍA',unit:'gl',account_code:'1.2.1.2.2.72',account_name:'DIVISIONS- PLOMERÍA',description:'',active:true},
  {id:'rub-22-2201-3',code:'22.2201.3',name:'SUB - Instalaciones sanitarias',category:'DIVISIONS- PLOMERÍA',unit:'gl',account_code:'1.2.1.2.4.72',account_name:'DIVISIONS- PLOMERÍA',description:'',active:true},
  {id:'rub-22-2202-1',code:'22.2202.1',name:'MO - Artefactos sanitarios y griferías',category:'DIVISIONS- PLOMERÍA',unit:'hs',account_code:'1.2.1.2.1.72',account_name:'DIVISIONS- PLOMERÍA',description:'',active:true},
  {id:'rub-22-2202-2',code:'22.2202.2',name:'MAT - Artefactos sanitarios y griferías',category:'DIVISIONS- PLOMERÍA',unit:'gl',account_code:'1.2.1.2.2.72',account_name:'DIVISIONS- PLOMERÍA',description:'',active:true},
  {id:'rub-22-2202-3',code:'22.2202.3',name:'SUB - Artefactos sanitarios y griferías',category:'DIVISIONS- PLOMERÍA',unit:'gl',account_code:'1.2.1.2.4.72',account_name:'DIVISIONS- PLOMERÍA',description:'',active:true},
  {id:'rub-22-2203-1',code:'22.2203.1',name:'MO - Instalaciones de gas',category:'DIVISIONS- PLOMERÍA',unit:'hs',account_code:'1.2.1.2.1.72',account_name:'DIVISIONS- PLOMERÍA',description:'',active:true},
  {id:'rub-22-2203-2',code:'22.2203.2',name:'MAT - Instalaciones de gas',category:'DIVISIONS- PLOMERÍA',unit:'gl',account_code:'1.2.1.2.2.72',account_name:'DIVISIONS- PLOMERÍA',description:'',active:true},
  {id:'rub-22-2203-3',code:'22.2203.3',name:'SUB - Instalaciones de gas',category:'DIVISIONS- PLOMERÍA',unit:'gl',account_code:'1.2.1.2.4.72',account_name:'DIVISIONS- PLOMERÍA',description:'',active:true},
  {id:'rub-23-2301-1',code:'23.2301.1',name:'MO - Ventilaciones',category:'DIVISIONS- TERMOMECÁNICA',unit:'hs',account_code:'1.2.1.2.1.73',account_name:'DIVISIONS- TERMOMECÁNICA',description:'',active:true},
  {id:'rub-23-2301-2',code:'23.2301.2',name:'MAT - Ventilaciones',category:'DIVISIONS- TERMOMECÁNICA',unit:'gl',account_code:'1.2.1.2.2.73',account_name:'DIVISIONS- TERMOMECÁNICA',description:'',active:true},
  {id:'rub-23-2301-3',code:'23.2301.3',name:'SUB - Ventilaciones',category:'DIVISIONS- TERMOMECÁNICA',unit:'gl',account_code:'1.2.1.2.4.73',account_name:'DIVISIONS- TERMOMECÁNICA',description:'',active:true},
  {id:'rub-23-2302-1',code:'23.2302.1',name:'MO - Aire acondicionado',category:'DIVISIONS- TERMOMECÁNICA',unit:'hs',account_code:'1.2.1.2.1.73',account_name:'DIVISIONS- TERMOMECÁNICA',description:'',active:true},
  {id:'rub-23-2302-2',code:'23.2302.2',name:'MAT - Aire acondicionado',category:'DIVISIONS- TERMOMECÁNICA',unit:'gl',account_code:'1.2.1.2.2.73',account_name:'DIVISIONS- TERMOMECÁNICA',description:'',active:true},
  {id:'rub-23-2302-3',code:'23.2302.3',name:'SUB - Aire acondicionado',category:'DIVISIONS- TERMOMECÁNICA',unit:'gl',account_code:'1.2.1.2.4.73',account_name:'DIVISIONS- TERMOMECÁNICA',description:'',active:true},
  {id:'rub-23-2303-1',code:'23.2303.1',name:'MO - Piso radiante',category:'DIVISIONS- TERMOMECÁNICA',unit:'hs',account_code:'1.2.1.2.1.73',account_name:'DIVISIONS- TERMOMECÁNICA',description:'',active:true},
  {id:'rub-23-2303-2',code:'23.2303.2',name:'MAT - Piso radiante',category:'DIVISIONS- TERMOMECÁNICA',unit:'gl',account_code:'1.2.1.2.2.73',account_name:'DIVISIONS- TERMOMECÁNICA',description:'',active:true},
  {id:'rub-23-2303-3',code:'23.2303.3',name:'SUB - Piso radiante',category:'DIVISIONS- TERMOMECÁNICA',unit:'gl',account_code:'1.2.1.2.4.73',account_name:'DIVISIONS- TERMOMECÁNICA',description:'',active:true},
  {id:'rub-25-2501-1',code:'25.2501.1',name:'MO - Red de automatización integrada',category:'DIVISIONS- AUTOMATIZACIÓN INTEGRADA',unit:'hs',account_code:'1.2.1.2.1.74',account_name:'DIVISIONS- AUTOMATIZACIÓN INTEGRADA',description:'',active:true},
  {id:'rub-25-2501-2',code:'25.2501.2',name:'MAT - Red de automatización integrada',category:'DIVISIONS- AUTOMATIZACIÓN INTEGRADA',unit:'gl',account_code:'1.2.1.2.2.74',account_name:'DIVISIONS- AUTOMATIZACIÓN INTEGRADA',description:'',active:true},
  {id:'rub-25-2501-3',code:'25.2501.3',name:'SUB - Red de automatización integrada',category:'DIVISIONS- AUTOMATIZACIÓN INTEGRADA',unit:'gl',account_code:'1.2.1.2.4.74',account_name:'DIVISIONS- AUTOMATIZACIÓN INTEGRADA',description:'',active:true},
  {id:'rub-26-2601-1',code:'26.2601.1',name:'MO - Instalaciones eléctricas',category:'DIVISIONS- ELECTRICIDAD',unit:'hs',account_code:'1.2.1.2.1.75',account_name:'DIVISIONS- ELECTRICIDAD',description:'',active:true},
  {id:'rub-26-2601-2',code:'26.2601.2',name:'MAT - Instalaciones eléctricas',category:'DIVISIONS- ELECTRICIDAD',unit:'gl',account_code:'1.2.1.2.2.75',account_name:'DIVISIONS- ELECTRICIDAD',description:'',active:true},
  {id:'rub-26-2601-3',code:'26.2601.3',name:'SUB - Instalaciones eléctricas',category:'DIVISIONS- ELECTRICIDAD',unit:'gl',account_code:'1.2.1.2.4.75',account_name:'DIVISIONS- ELECTRICIDAD',description:'',active:true},
  {id:'rub-26-2602-1',code:'26.2602.1',name:'MO - Cargadores eléctricos',category:'DIVISIONS- ELECTRICIDAD',unit:'hs',account_code:'1.2.1.2.1.75',account_name:'DIVISIONS- ELECTRICIDAD',description:'',active:true},
  {id:'rub-26-2602-2',code:'26.2602.2',name:'MAT - Cargadores eléctricos',category:'DIVISIONS- ELECTRICIDAD',unit:'gl',account_code:'1.2.1.2.2.75',account_name:'DIVISIONS- ELECTRICIDAD',description:'',active:true},
  {id:'rub-26-2602-3',code:'26.2602.3',name:'SUB - Cargadores eléctricos',category:'DIVISIONS- ELECTRICIDAD',unit:'gl',account_code:'1.2.1.2.4.75',account_name:'DIVISIONS- ELECTRICIDAD',description:'',active:true},
  {id:'rub-26-2603-1',code:'26.2603.1',name:'MO - Iluminación',category:'DIVISIONS- ELECTRICIDAD',unit:'hs',account_code:'1.2.1.2.1.75',account_name:'DIVISIONS- ELECTRICIDAD',description:'',active:true},
  {id:'rub-26-2603-2',code:'26.2603.2',name:'MAT - Iluminación',category:'DIVISIONS- ELECTRICIDAD',unit:'gl',account_code:'1.2.1.2.2.75',account_name:'DIVISIONS- ELECTRICIDAD',description:'',active:true},
  {id:'rub-26-2603-3',code:'26.2603.3',name:'SUB - Iluminación',category:'DIVISIONS- ELECTRICIDAD',unit:'gl',account_code:'1.2.1.2.4.75',account_name:'DIVISIONS- ELECTRICIDAD',description:'',active:true},
  {id:'rub-27-2701-1',code:'27.2701.1',name:'MO - Cableado estructurado',category:'DIVISIONS- COMUNICACIONES',unit:'hs',account_code:'1.2.1.2.1.76',account_name:'DIVISIONS- COMUNICACIONES',description:'',active:true},
  {id:'rub-27-2701-2',code:'27.2701.2',name:'MAT - Cableado estructurado',category:'DIVISIONS- COMUNICACIONES',unit:'gl',account_code:'1.2.1.2.2.76',account_name:'DIVISIONS- COMUNICACIONES',description:'',active:true},
  {id:'rub-27-2701-3',code:'27.2701.3',name:'SUB - Cableado estructurado',category:'DIVISIONS- COMUNICACIONES',unit:'gl',account_code:'1.2.1.2.4.76',account_name:'DIVISIONS- COMUNICACIONES',description:'',active:true},
  {id:'rub-27-2702-1',code:'27.2702.1',name:'MO - Datos',category:'DIVISIONS- COMUNICACIONES',unit:'hs',account_code:'1.2.1.2.1.76',account_name:'DIVISIONS- COMUNICACIONES',description:'',active:true},
  {id:'rub-27-2702-2',code:'27.2702.2',name:'MAT - Datos',category:'DIVISIONS- COMUNICACIONES',unit:'gl',account_code:'1.2.1.2.2.76',account_name:'DIVISIONS- COMUNICACIONES',description:'',active:true},
  {id:'rub-27-2702-3',code:'27.2702.3',name:'SUB - Datos',category:'DIVISIONS- COMUNICACIONES',unit:'gl',account_code:'1.2.1.2.4.76',account_name:'DIVISIONS- COMUNICACIONES',description:'',active:true},
  {id:'rub-27-2703-1',code:'27.2703.1',name:'MO - Telefonía interna y porteros eléctricos',category:'DIVISIONS- COMUNICACIONES',unit:'hs',account_code:'1.2.1.2.1.76',account_name:'DIVISIONS- COMUNICACIONES',description:'',active:true},
  {id:'rub-27-2703-2',code:'27.2703.2',name:'MAT - Telefonía interna y porteros eléctricos',category:'DIVISIONS- COMUNICACIONES',unit:'gl',account_code:'1.2.1.2.2.76',account_name:'DIVISIONS- COMUNICACIONES',description:'',active:true},
  {id:'rub-27-2703-3',code:'27.2703.3',name:'SUB - Telefonía interna y porteros eléctricos',category:'DIVISIONS- COMUNICACIONES',unit:'gl',account_code:'1.2.1.2.4.76',account_name:'DIVISIONS- COMUNICACIONES',description:'',active:true},
  {id:'rub-27-2704-1',code:'27.2704.1',name:'MO - Sistemas de audio y video',category:'DIVISIONS- COMUNICACIONES',unit:'hs',account_code:'1.2.1.2.1.76',account_name:'DIVISIONS- COMUNICACIONES',description:'',active:true},
  {id:'rub-27-2704-2',code:'27.2704.2',name:'MAT - Sistemas de audio y video',category:'DIVISIONS- COMUNICACIONES',unit:'gl',account_code:'1.2.1.2.2.76',account_name:'DIVISIONS- COMUNICACIONES',description:'',active:true},
  {id:'rub-27-2704-3',code:'27.2704.3',name:'SUB - Sistemas de audio y video',category:'DIVISIONS- COMUNICACIONES',unit:'gl',account_code:'1.2.1.2.4.76',account_name:'DIVISIONS- COMUNICACIONES',description:'',active:true},
  {id:'rub-28-2801-1',code:'28.2801.1',name:'MO - Control de accesos',category:'DIVISIONS- SEGURIDAD',unit:'hs',account_code:'1.2.1.2.1.77',account_name:'DIVISIONS- SEGURIDAD',description:'',active:true},
  {id:'rub-28-2801-2',code:'28.2801.2',name:'MAT - Control de accesos',category:'DIVISIONS- SEGURIDAD',unit:'gl',account_code:'1.2.1.2.2.77',account_name:'DIVISIONS- SEGURIDAD',description:'',active:true},
  {id:'rub-28-2801-3',code:'28.2801.3',name:'SUB - Control de accesos',category:'DIVISIONS- SEGURIDAD',unit:'gl',account_code:'1.2.1.2.4.77',account_name:'DIVISIONS- SEGURIDAD',description:'',active:true},
  {id:'rub-28-2802-1',code:'28.2802.1',name:'MO - CCTV',category:'DIVISIONS- SEGURIDAD',unit:'hs',account_code:'1.2.1.2.1.77',account_name:'DIVISIONS- SEGURIDAD',description:'',active:true},
  {id:'rub-28-2802-2',code:'28.2802.2',name:'MAT - CCTV',category:'DIVISIONS- SEGURIDAD',unit:'gl',account_code:'1.2.1.2.2.77',account_name:'DIVISIONS- SEGURIDAD',description:'',active:true},
  {id:'rub-28-2802-3',code:'28.2802.3',name:'SUB - CCTV',category:'DIVISIONS- SEGURIDAD',unit:'gl',account_code:'1.2.1.2.4.77',account_name:'DIVISIONS- SEGURIDAD',description:'',active:true},
  {id:'rub-28-2803-1',code:'28.2803.1',name:'MO - Detección y alarma de incendios',category:'DIVISIONS- SEGURIDAD',unit:'hs',account_code:'1.2.1.2.1.77',account_name:'DIVISIONS- SEGURIDAD',description:'',active:true},
  {id:'rub-28-2803-2',code:'28.2803.2',name:'MAT - Detección y alarma de incendios',category:'DIVISIONS- SEGURIDAD',unit:'gl',account_code:'1.2.1.2.2.77',account_name:'DIVISIONS- SEGURIDAD',description:'',active:true},
  {id:'rub-28-2803-3',code:'28.2803.3',name:'SUB - Detección y alarma de incendios',category:'DIVISIONS- SEGURIDAD',unit:'gl',account_code:'1.2.1.2.4.77',account_name:'DIVISIONS- SEGURIDAD',description:'',active:true},
  {id:'rub-31-3101-1',code:'31.3101.1',name:'MO - Limpieza de terreno',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'hs',account_code:'1.2.1.2.1.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3101-2',code:'31.3101.2',name:'MAT - Limpieza de terreno',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'gl',account_code:'1.2.1.2.2.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3101-3',code:'31.3101.3',name:'SUB - Limpieza de terreno',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'gl',account_code:'1.2.1.2.4.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3102-1',code:'31.3102.1',name:'MO - Depresión de napas',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'hs',account_code:'1.2.1.2.1.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3102-2',code:'31.3102.2',name:'MAT - Depresión de napas',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'gl',account_code:'1.2.1.2.2.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3102-3',code:'31.3102.3',name:'SUB - Depresión de napas',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'gl',account_code:'1.2.1.2.4.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3103-1',code:'31.3103.1',name:'MO - Excavación general',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'hs',account_code:'1.2.1.2.1.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3103-2',code:'31.3103.2',name:'MAT - Excavación general',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'gl',account_code:'1.2.1.2.2.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3103-3',code:'31.3103.3',name:'SUB - Excavación general',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'gl',account_code:'1.2.1.2.4.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3104-1',code:'31.3104.1',name:'MO - Relleno y compactación',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'hs',account_code:'1.2.1.2.1.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3104-2',code:'31.3104.2',name:'MAT - Relleno y compactación',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'gl',account_code:'1.2.1.2.2.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3104-3',code:'31.3104.3',name:'SUB - Relleno y compactación',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'gl',account_code:'1.2.1.2.4.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3105-1',code:'31.3105.1',name:'MO - Apuntalamiento de excavaciones',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'hs',account_code:'1.2.1.2.1.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3105-2',code:'31.3105.2',name:'MAT - Apuntalamiento de excavaciones',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'gl',account_code:'1.2.1.2.2.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3105-3',code:'31.3105.3',name:'SUB - Apuntalamiento de excavaciones',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'gl',account_code:'1.2.1.2.4.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3106-1',code:'31.3106.1',name:'MO - Excavación de túneles y pozos',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'hs',account_code:'1.2.1.2.1.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3106-2',code:'31.3106.2',name:'MAT - Excavación de túneles y pozos',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'gl',account_code:'1.2.1.2.2.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3106-3',code:'31.3106.3',name:'SUB - Excavación de túneles y pozos',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'gl',account_code:'1.2.1.2.4.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3107-1',code:'31.3107.1',name:'MO - Circulaciones vehiculares',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'hs',account_code:'1.2.1.2.1.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3107-2',code:'31.3107.2',name:'MAT - Circulaciones vehiculares',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'gl',account_code:'1.2.1.2.2.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3107-3',code:'31.3107.3',name:'SUB - Circulaciones vehiculares',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'gl',account_code:'1.2.1.2.4.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3108-1',code:'31.3108.1',name:'MO - Circulaciones peatonales',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'hs',account_code:'1.2.1.2.1.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3108-2',code:'31.3108.2',name:'MAT - Circulaciones peatonales',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'gl',account_code:'1.2.1.2.2.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-31-3108-3',code:'31.3108.3',name:'SUB - Circulaciones peatonales',category:'DIVISIONS- MOVIMIENTO DE SUELOS',unit:'gl',account_code:'1.2.1.2.4.78',account_name:'DIVISIONS- MOVIMIENTO DE SUELOS',description:'',active:true},
  {id:'rub-32-3201-1',code:'32.3201.1',name:'MO - Pavimentos',category:'DIVISIONS- OBRAS EXTERIORES',unit:'hs',account_code:'1.2.1.2.1.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3201-2',code:'32.3201.2',name:'MAT - Pavimentos',category:'DIVISIONS- OBRAS EXTERIORES',unit:'gl',account_code:'1.2.1.2.2.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3201-3',code:'32.3201.3',name:'SUB - Pavimentos',category:'DIVISIONS- OBRAS EXTERIORES',unit:'gl',account_code:'1.2.1.2.4.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3202-1',code:'32.3202.1',name:'MO - Accesos y cercos',category:'DIVISIONS- OBRAS EXTERIORES',unit:'hs',account_code:'1.2.1.2.1.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3202-2',code:'32.3202.2',name:'MAT - Accesos y cercos',category:'DIVISIONS- OBRAS EXTERIORES',unit:'gl',account_code:'1.2.1.2.2.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3202-3',code:'32.3202.3',name:'SUB - Accesos y cercos',category:'DIVISIONS- OBRAS EXTERIORES',unit:'gl',account_code:'1.2.1.2.4.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3203-1',code:'32.3203.1',name:'MO - Equipamiento exterior',category:'DIVISIONS- OBRAS EXTERIORES',unit:'hs',account_code:'1.2.1.2.1.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3203-2',code:'32.3203.2',name:'MAT - Equipamiento exterior',category:'DIVISIONS- OBRAS EXTERIORES',unit:'gl',account_code:'1.2.1.2.2.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3203-3',code:'32.3203.3',name:'SUB - Equipamiento exterior',category:'DIVISIONS- OBRAS EXTERIORES',unit:'gl',account_code:'1.2.1.2.4.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3204-1',code:'32.3204.1',name:'MO - Espejos de agua artificiales',category:'DIVISIONS- OBRAS EXTERIORES',unit:'hs',account_code:'1.2.1.2.1.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3204-2',code:'32.3204.2',name:'MAT - Espejos de agua artificiales',category:'DIVISIONS- OBRAS EXTERIORES',unit:'gl',account_code:'1.2.1.2.2.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3204-3',code:'32.3204.3',name:'SUB - Espejos de agua artificiales',category:'DIVISIONS- OBRAS EXTERIORES',unit:'gl',account_code:'1.2.1.2.4.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3205-1',code:'32.3205.1',name:'MO - Sistema de riego',category:'DIVISIONS- OBRAS EXTERIORES',unit:'hs',account_code:'1.2.1.2.1.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3205-2',code:'32.3205.2',name:'MAT - Sistema de riego',category:'DIVISIONS- OBRAS EXTERIORES',unit:'gl',account_code:'1.2.1.2.2.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3205-3',code:'32.3205.3',name:'SUB - Sistema de riego',category:'DIVISIONS- OBRAS EXTERIORES',unit:'gl',account_code:'1.2.1.2.4.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3206-1',code:'32.3206.1',name:'MO - Jardinería y parquización',category:'DIVISIONS- OBRAS EXTERIORES',unit:'hs',account_code:'1.2.1.2.1.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3206-2',code:'32.3206.2',name:'MAT - Jardinería y parquización',category:'DIVISIONS- OBRAS EXTERIORES',unit:'gl',account_code:'1.2.1.2.2.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3206-3',code:'32.3206.3',name:'SUB - Jardinería y parquización',category:'DIVISIONS- OBRAS EXTERIORES',unit:'gl',account_code:'1.2.1.2.4.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3207-1',code:'32.3207.1',name:'MO - Terrazas verdes',category:'DIVISIONS- OBRAS EXTERIORES',unit:'hs',account_code:'1.2.1.2.1.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3207-2',code:'32.3207.2',name:'MAT - Terrazas verdes',category:'DIVISIONS- OBRAS EXTERIORES',unit:'gl',account_code:'1.2.1.2.2.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-32-3207-3',code:'32.3207.3',name:'SUB - Terrazas verdes',category:'DIVISIONS- OBRAS EXTERIORES',unit:'gl',account_code:'1.2.1.2.4.79',account_name:'DIVISIONS- OBRAS EXTERIORES',description:'',active:true},
  {id:'rub-33-3301-1',code:'33.3301.1',name:'MO - Red de agua potable',category:'DIVISIONS- SERVICIOS PÚBLICOS',unit:'hs',account_code:'1.2.1.2.1.80',account_name:'DIVISIONS- SERVICIOS PÚBLICOS',description:'',active:true},
  {id:'rub-33-3301-2',code:'33.3301.2',name:'MAT - Red de agua potable',category:'DIVISIONS- SERVICIOS PÚBLICOS',unit:'gl',account_code:'1.2.1.2.2.80',account_name:'DIVISIONS- SERVICIOS PÚBLICOS',description:'',active:true},
  {id:'rub-33-3301-3',code:'33.3301.3',name:'SUB - Red de agua potable',category:'DIVISIONS- SERVICIOS PÚBLICOS',unit:'gl',account_code:'1.2.1.2.4.80',account_name:'DIVISIONS- SERVICIOS PÚBLICOS',description:'',active:true},
  {id:'rub-33-3302-1',code:'33.3302.1',name:'MO - Red cloacal',category:'DIVISIONS- SERVICIOS PÚBLICOS',unit:'hs',account_code:'1.2.1.2.1.80',account_name:'DIVISIONS- SERVICIOS PÚBLICOS',description:'',active:true},
  {id:'rub-33-3302-2',code:'33.3302.2',name:'MAT - Red cloacal',category:'DIVISIONS- SERVICIOS PÚBLICOS',unit:'gl',account_code:'1.2.1.2.2.80',account_name:'DIVISIONS- SERVICIOS PÚBLICOS',description:'',active:true},
  {id:'rub-33-3302-3',code:'33.3302.3',name:'SUB - Red cloacal',category:'DIVISIONS- SERVICIOS PÚBLICOS',unit:'gl',account_code:'1.2.1.2.4.80',account_name:'DIVISIONS- SERVICIOS PÚBLICOS',description:'',active:true},
  {id:'rub-33-3303-1',code:'33.3303.1',name:'MO - Red pluvial',category:'DIVISIONS- SERVICIOS PÚBLICOS',unit:'hs',account_code:'1.2.1.2.1.80',account_name:'DIVISIONS- SERVICIOS PÚBLICOS',description:'',active:true},
  {id:'rub-33-3303-2',code:'33.3303.2',name:'MAT - Red pluvial',category:'DIVISIONS- SERVICIOS PÚBLICOS',unit:'gl',account_code:'1.2.1.2.2.80',account_name:'DIVISIONS- SERVICIOS PÚBLICOS',description:'',active:true},
  {id:'rub-33-3303-3',code:'33.3303.3',name:'SUB - Red pluvial',category:'DIVISIONS- SERVICIOS PÚBLICOS',unit:'gl',account_code:'1.2.1.2.4.80',account_name:'DIVISIONS- SERVICIOS PÚBLICOS',description:'',active:true},
  {id:'rub-33-3304-1',code:'33.3304.1',name:'MO - Red de gas',category:'DIVISIONS- SERVICIOS PÚBLICOS',unit:'hs',account_code:'1.2.1.2.1.80',account_name:'DIVISIONS- SERVICIOS PÚBLICOS',description:'',active:true},
  {id:'rub-33-3304-2',code:'33.3304.2',name:'MAT - Red de gas',category:'DIVISIONS- SERVICIOS PÚBLICOS',unit:'gl',account_code:'1.2.1.2.2.80',account_name:'DIVISIONS- SERVICIOS PÚBLICOS',description:'',active:true},
  {id:'rub-33-3304-3',code:'33.3304.3',name:'SUB - Red de gas',category:'DIVISIONS- SERVICIOS PÚBLICOS',unit:'gl',account_code:'1.2.1.2.4.80',account_name:'DIVISIONS- SERVICIOS PÚBLICOS',description:'',active:true},
  {id:'rub-33-3305-1',code:'33.3305.1',name:'MO - Red eléctrica',category:'DIVISIONS- SERVICIOS PÚBLICOS',unit:'hs',account_code:'1.2.1.2.1.80',account_name:'DIVISIONS- SERVICIOS PÚBLICOS',description:'',active:true},
  {id:'rub-33-3305-2',code:'33.3305.2',name:'MAT - Red eléctrica',category:'DIVISIONS- SERVICIOS PÚBLICOS',unit:'gl',account_code:'1.2.1.2.2.80',account_name:'DIVISIONS- SERVICIOS PÚBLICOS',description:'',active:true},
  {id:'rub-33-3305-3',code:'33.3305.3',name:'SUB - Red eléctrica',category:'DIVISIONS- SERVICIOS PÚBLICOS',unit:'gl',account_code:'1.2.1.2.4.80',account_name:'DIVISIONS- SERVICIOS PÚBLICOS',description:'',active:true},
  {id:'rub-33-3306-1',code:'33.3306.1',name:'MO - Red de corrientes débiles y comunicaciones',category:'DIVISIONS- SERVICIOS PÚBLICOS',unit:'hs',account_code:'1.2.1.2.1.80',account_name:'DIVISIONS- SERVICIOS PÚBLICOS',description:'',active:true},
  {id:'rub-33-3306-2',code:'33.3306.2',name:'MAT - Red de corrientes débiles y comunicaciones',category:'DIVISIONS- SERVICIOS PÚBLICOS',unit:'gl',account_code:'1.2.1.2.2.80',account_name:'DIVISIONS- SERVICIOS PÚBLICOS',description:'',active:true},
  {id:'rub-33-3306-3',code:'33.3306.3',name:'SUB - Red de corrientes débiles y comunicaciones',category:'DIVISIONS- SERVICIOS PÚBLICOS',unit:'gl',account_code:'1.2.1.2.4.80',account_name:'DIVISIONS- SERVICIOS PÚBLICOS',description:'',active:true},
  {id:'rub-100-100001-1',code:'100.100001.1',name:'MO - SEGUROS VARIOS',category:'DIVISIONS- SEGUROS',unit:'hs',account_code:'1.2.1.2.1.81',account_name:'SEGUROS',description:'',active:true},
  {id:'rub-100-100001-2',code:'100.100001.2',name:'MAT - SEGUROS VARIOS',category:'DIVISIONS- SEGUROS',unit:'gl',account_code:'1.2.1.2.2.81',account_name:'SEGUROS',description:'',active:true},
  {id:'rub-100-100001-3',code:'100.100001.3',name:'SUB - SEGUROS VARIOS',category:'DIVISIONS- SEGUROS',unit:'gl',account_code:'1.2.1.2.4.81',account_name:'SEGUROS',description:'',active:true},
  {id:'rub-200-200001-1',code:'200.200001.1',name:'MO - ASESORÍAS / DOCUMENTACIÓN',category:'DIVISIONS- ASESORES',unit:'hs',account_code:'1.2.1.2.1.82',account_name:'ASESORES',description:'',active:true},
  {id:'rub-200-200001-2',code:'200.200001.2',name:'MAT - ASESORÍAS / DOCUMENTACIÓN',category:'DIVISIONS- ASESORES',unit:'gl',account_code:'1.2.1.2.2.82',account_name:'ASESORES',description:'',active:true},
  {id:'rub-200-200001-3',code:'200.200001.3',name:'SUB - ASESORÍAS / DOCUMENTACIÓN',category:'DIVISIONS- ASESORES',unit:'gl',account_code:'1.2.1.2.4.82',account_name:'ASESORES',description:'',active:true},
  {id:'rub-300-300001-1',code:'300.300001.1',name:'MO - PRECONSTRUCCIÓN/FEES',category:'DIVISIONS- PRECONSTRUCCIÓN/FEES',unit:'hs',account_code:'1.2.1.2.1.83',account_name:'PRECONSTRUCCIÓN/FEES',description:'',active:true},
  {id:'rub-300-300001-2',code:'300.300001.2',name:'MAT - PRECONSTRUCCIÓN/FEES',category:'DIVISIONS- PRECONSTRUCCIÓN/FEES',unit:'gl',account_code:'1.2.1.2.2.83',account_name:'PRECONSTRUCCIÓN/FEES',description:'',active:true},
  {id:'rub-300-300001-3',code:'300.300001.3',name:'SUB - PRECONSTRUCCIÓN/FEES',category:'DIVISIONS- PRECONSTRUCCIÓN/FEES',unit:'gl',account_code:'1.2.1.2.4.83',account_name:'PRECONSTRUCCIÓN/FEES',description:'',active:true},
  {id:'rub-400-400001-1',code:'400.400001.1',name:'MO - PERMISOS / COMISIONES / IMPUESTOS',category:'DIVISIONS- PERMISOS / COMISIONES',unit:'hs',account_code:'1.2.1.2.1.84',account_name:'PERMISOS / COMISIONES',description:'',active:true},
  {id:'rub-400-400001-2',code:'400.400001.2',name:'MAT - PERMISOS / COMISIONES / IMPUESTOS',category:'DIVISIONS- PERMISOS / COMISIONES',unit:'gl',account_code:'1.2.1.2.2.84',account_name:'PERMISOS / COMISIONES',description:'',active:true},
  {id:'rub-400-400001-3',code:'400.400001.3',name:'SUB - PERMISOS / COMISIONES / IMPUESTOS',category:'DIVISIONS- PERMISOS / COMISIONES',unit:'gl',account_code:'1.2.1.2.4.84',account_name:'PERMISOS / COMISIONES',description:'',active:true},
  {id:'rub-500-500001-1',code:'500.500001.1',name:'MO - Trabajos adicionales por omisiones de alcance',category:'DIVISIONS- TRABAJOS COMPLEMENTARIOS',unit:'hs',account_code:'1.2.1.2.1.85',account_name:'TRABAJOS COMPLEMENTARIOS',description:'',active:true},
  {id:'rub-500-500001-2',code:'500.500001.2',name:'MAT - Trabajos adicionales por omisiones de alcance',category:'DIVISIONS- TRABAJOS COMPLEMENTARIOS',unit:'gl',account_code:'1.2.1.2.2.85',account_name:'TRABAJOS COMPLEMENTARIOS',description:'',active:true},
  {id:'rub-500-500001-3',code:'500.500001.3',name:'SUB - Trabajos adicionales por omisiones de alcance',category:'DIVISIONS- TRABAJOS COMPLEMENTARIOS',unit:'gl',account_code:'1.2.1.2.4.85',account_name:'TRABAJOS COMPLEMENTARIOS',description:'',active:true},
  {id:'rub-500-500002-1',code:'500.500002.1',name:'MO - Requerimientos externos y solicitudes de terceros',category:'DIVISIONS- TRABAJOS COMPLEMENTARIOS',unit:'hs',account_code:'1.2.1.2.1.85',account_name:'TRABAJOS COMPLEMENTARIOS',description:'',active:true},
  {id:'rub-500-500002-2',code:'500.500002.2',name:'MAT - Requerimientos externos y solicitudes de terceros',category:'DIVISIONS- TRABAJOS COMPLEMENTARIOS',unit:'gl',account_code:'1.2.1.2.2.85',account_name:'TRABAJOS COMPLEMENTARIOS',description:'',active:true},
  {id:'rub-500-500002-3',code:'500.500002.3',name:'SUB - Requerimientos externos y solicitudes de terceros',category:'DIVISIONS- TRABAJOS COMPLEMENTARIOS',unit:'gl',account_code:'1.2.1.2.4.85',account_name:'TRABAJOS COMPLEMENTARIOS',description:'',active:true},
  {id:'rub-500-500003-1',code:'500.500003.1',name:'MO - Revisiones de proyecto e ingeniería',category:'DIVISIONS- TRABAJOS COMPLEMENTARIOS',unit:'hs',account_code:'1.2.1.2.1.85',account_name:'TRABAJOS COMPLEMENTARIOS',description:'',active:true},
  {id:'rub-500-500003-2',code:'500.500003.2',name:'MAT - Revisiones de proyecto e ingeniería',category:'DIVISIONS- TRABAJOS COMPLEMENTARIOS',unit:'gl',account_code:'1.2.1.2.2.85',account_name:'TRABAJOS COMPLEMENTARIOS',description:'',active:true},
  {id:'rub-500-500003-3',code:'500.500003.3',name:'SUB - Revisiones de proyecto e ingeniería',category:'DIVISIONS- TRABAJOS COMPLEMENTARIOS',unit:'gl',account_code:'1.2.1.2.4.85',account_name:'TRABAJOS COMPLEMENTARIOS',description:'',active:true},
  {id:'rub-500-500004-1',code:'500.500004.1',name:'MO - Desvíos por contingencias externas no previsisibles',category:'DIVISIONS- TRABAJOS COMPLEMENTARIOS',unit:'hs',account_code:'1.2.1.2.1.85',account_name:'TRABAJOS COMPLEMENTARIOS',description:'',active:true},
  {id:'rub-500-500004-2',code:'500.500004.2',name:'MAT - Desvíos por contingencias externas no previsisibles',category:'DIVISIONS- TRABAJOS COMPLEMENTARIOS',unit:'gl',account_code:'1.2.1.2.2.85',account_name:'TRABAJOS COMPLEMENTARIOS',description:'',active:true},
  {id:'rub-500-500004-3',code:'500.500004.3',name:'SUB - Desvíos por contingencias externas no previsisibles',category:'DIVISIONS- TRABAJOS COMPLEMENTARIOS',unit:'gl',account_code:'1.2.1.2.4.85',account_name:'TRABAJOS COMPLEMENTARIOS',description:'',active:true},
  {id:'rub-500-500005-1',code:'500.500005.1',name:'MO - Servicio de post venta',category:'DIVISIONS- TRABAJOS COMPLEMENTARIOS',unit:'hs',account_code:'1.2.1.2.1.85',account_name:'TRABAJOS COMPLEMENTARIOS',description:'',active:true},
  {id:'rub-500-500005-2',code:'500.500005.2',name:'MAT - Servicio de post venta',category:'DIVISIONS- TRABAJOS COMPLEMENTARIOS',unit:'gl',account_code:'1.2.1.2.2.85',account_name:'TRABAJOS COMPLEMENTARIOS',description:'',active:true},
  {id:'rub-500-500005-3',code:'500.500005.3',name:'SUB - Servicio de post venta',category:'DIVISIONS- TRABAJOS COMPLEMENTARIOS',unit:'gl',account_code:'1.2.1.2.4.85',account_name:'TRABAJOS COMPLEMENTARIOS',description:'',active:true}
];
      rubros = rubros.map(function(r) {
        return Object.assign({}, r, { created_at: now_ts });
      });
      var db = DB.get();
      db.rubros = rubros;
      DB.save(db);
      toast('Rubros importados: ' + rubros.length + ' partidas', 'success');
      renderRubros();
    }
  );
}
