/* ===== USUARIOS Y ROLES ===== */

// Built-in roles — always available, cannot be deleted
const BUILTIN_ROLES = [
  { id: 'admin',           label: 'Administrador',  color: 'badge-red',  builtin: true, perms: ['Acceso total', 'Gestión usuarios', 'Configuración', 'Eliminar registros'] },
  { id: 'project_manager', label: 'Gerente de Obra', color: 'badge-blue', builtin: true, perms: ['Proyectos', 'Gantt', 'Certificaciones', 'Presupuesto', 'Compras'] },
  { id: 'accountant',      label: 'Contador',        color: 'badge-cyan', builtin: true, perms: ['Facturación', 'Cobranzas', 'Tesorería', 'Contabilidad', 'Reportes'] },
  { id: 'inspector',       label: 'Inspector',       color: 'badge-green', builtin: true, perms: ['Ver proyectos', 'Ver Gantt', 'Certificaciones (solo lectura)'] },
  { id: 'viewer',          label: 'Lector',          color: 'badge-gray', builtin: true, perms: ['Solo lectura', 'Sin modificar datos'] },
];

// Granular permission map — grouped by area, each item is an accessible module.
// A role grants, per item, one of: 'none' | 'view' | 'edit'.
const PERM_MODULES = [
  { group: 'Compras', items: [
    { id: 'pedidos',         label: 'Órdenes de Pedido' },
    { id: 'ordenes_compra',  label: 'Órdenes de Compra' },
  ]},
  { group: 'Proveedores', items: [
    { id: 'cuentas_prov',    label: 'Cuentas Corrientes' },
    { id: 'documentos_prov', label: 'Documentos / Facturas' },
    { id: 'ordenes_pago',    label: 'Órdenes de Pago' },
    { id: 'retenciones',     label: 'Retenciones' },
  ]},
  { group: 'Gestión de Obra', items: [
    { id: 'projects',        label: 'Proyectos' },
    { id: 'contratos',       label: 'Contratos' },
    { id: 'certificaciones', label: 'Certificaciones' },
    { id: 'presupuesto',     label: 'Cómputo y Presupuesto' },
    { id: 'seguimiento',     label: 'Control Presupuestal' },
    { id: 'gantt',           label: 'Diagrama de Gantt' },
    { id: 'rubros',          label: 'Rubros de Obra' },
    { id: 'apu',             label: 'APU' },
    { id: 'indices',         label: 'Índices de Ajuste' },
  ]},
  { group: 'Clientes', items: [
    { id: 'clientes',        label: 'Clientes' },
    { id: 'facturacion',     label: 'Facturación' },
    { id: 'cobranzas',       label: 'Cobranzas / Ingresos' },
    { id: 'cuentas_cli',     label: 'Cuentas Corrientes' },
    { id: 'cashflow_cli',    label: 'Cash Flow' },
  ]},
  { group: 'Comercial', items: [
    { id: 'leads',           label: 'Leads' },
    { id: 'unidades',        label: 'Detalle de Unidades' },
  ]},
  { group: 'Tesorería', items: [
    { id: 'cuentas_banco',   label: 'Cuentas Bancarias y Cajas' },
    { id: 'tesoreria',       label: 'Operaciones' },
    { id: 'cheques',         label: 'Cheques' },
  ]},
  { group: 'Contabilidad', items: [
    { id: 'contabilidad',    label: 'Contabilidad' },
    { id: 'conta_diario',    label: 'Libro Diario' },
    { id: 'conta_balance',   label: 'Balance General' },
    { id: 'conta_resultados',label: 'Estado de Resultados' },
    { id: 'conta_plan',      label: 'Plan de Cuentas' },
    { id: 'libro_iva',       label: 'Libro IVA' },
  ]},
  { group: 'RRHH / Stock', items: [
    { id: 'rrhh',            label: 'RRHH — Personal' },
    { id: 'stock',           label: 'Stock / Almacén' },
    { id: 'notas',           label: 'Notas Cr./Déb.' },
  ]},
  { group: 'Administración', items: [
    { id: 'empresas',        label: 'Empresas' },
    { id: 'asientos',        label: 'Asientos Automáticos' },
    { id: 'aprobaciones',    label: 'Aprobaciones' },
    { id: 'reportes',        label: 'Reportes' },
    { id: 'usuarios',        label: 'Usuarios y Roles' },
    { id: 'ajustes',         label: 'Ajustes del Sistema' },
  ]},
];

const PERM_LEVELS = [
  { id: 'none', label: 'Sin acceso' },
  { id: 'view', label: 'Ver' },
  { id: 'edit', label: 'Ver y Editar' },
];

function permItemLabel(id) {
  let label = id;
  PERM_MODULES.forEach(function(g) { g.items.forEach(function(it) { if (it.id === id) label = it.label; }); });
  return label;
}

// Summarise a role's permission map → { edit, view }
function permCountSummary(perms) {
  perms = perms || {};
  let edit = 0, view = 0;
  Object.keys(perms).forEach(function(k) {
    if (perms[k] === 'edit') edit++;
    else if (perms[k] === 'view') view++;
  });
  return { edit: edit, view: view };
}

const ROLE_COLORS = [
  { id: 'badge-red',    label: 'Rojo' },
  { id: 'badge-blue',   label: 'Azul' },
  { id: 'badge-cyan',   label: 'Cyan' },
  { id: 'badge-green',  label: 'Verde' },
  { id: 'badge-yellow', label: 'Amarillo' },
  { id: 'badge-gray',   label: 'Gris' },
];

// Returns built-in + custom roles merged
function usrGetAllRoles() {
  const custom = DB.getAll('roles').map(r => Object.assign({ builtin: false }, r));
  return BUILTIN_ROLES.concat(custom);
}

function usrRoleById(id) {
  return usrGetAllRoles().find(r => r.id === id) || null;
}

function usrRoleLabel(id) {
  const r = usrRoleById(id);
  return r ? r.label : id;
}

function usrRoleColor(id) {
  const r = usrRoleById(id);
  return r ? (r.color || 'badge-gray') : 'badge-gray';
}

function renderUsuarios() {
  const users = DB.getAll('users');

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Usuarios y Roles</div>
    <div class="page-subtitle">Gestión de usuarios, roles personalizados y permisos</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="openRoleForm()"><i class="fas fa-shield-alt"></i> Nuevo Rol</button>
    <button class="btn btn-primary" onclick="openUserForm()"><i class="fas fa-user-plus"></i> Nuevo Usuario</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-users"></i></div><div>
    <div class="stat-value">${users.length}</div><div class="stat-label">Total Usuarios</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-user-check"></i></div><div>
    <div class="stat-value">${users.filter(u=>u.active).length}</div><div class="stat-label">Activos</div></div></div>
  <div class="stat-card"><div class="stat-icon red"><i class="fas fa-user-shield"></i></div><div>
    <div class="stat-value">${users.filter(u=>u.role==='admin').length}</div><div class="stat-label">Administradores</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-shield-alt"></i></div><div>
    <div class="stat-value">${usrGetAllRoles().length}</div><div class="stat-label">Roles Definidos</div></div></div>
</div>

<div id="usuarios-tabs" class="mt-2">
  <div class="tabs">
    <button class="tab-btn" data-tab="tab-usr-list">Usuarios</button>
    <button class="tab-btn" data-tab="tab-usr-roles">Roles y Permisos</button>
  </div>
  <div id="tab-usr-list" class="tab-content">${usrBuildUserList(users)}</div>
  <div id="tab-usr-roles" class="tab-content">${usrBuildRolesList()}</div>
</div>
  `;
  initTabs('usuarios-tabs');
}

function usrBuildUserList(users) {
  return `
<div class="card mt-1">
  <div class="card-header"><span class="card-title"><i class="fas fa-users text-primary"></i> Lista de Usuarios</span></div>
  <div class="card-body" style="padding:0"><div class="table-wrap">
    <table><thead><tr>
      <th>Usuario</th><th>Email</th><th>Rol</th><th>Proyectos</th><th>Último Acceso</th><th>Estado</th><th>Acciones</th>
    </tr></thead>
    <tbody>
      ${users.map(function(u) {
        var projIds = u.project_ids && u.project_ids.length ? u.project_ids : null;
        var allProjects = DB.getAll('projects');
        var projCell;
        if (!projIds) {
          projCell = '<span style="font-size:11px;color:var(--text-muted)">Todos</span>';
        } else {
          var names = projIds.map(function(pid) { var p = allProjects.find(function(x){return x.id===pid;}); return p ? escapeHtml(p.name) : pid; });
          projCell = '<span style="font-size:11px" title="' + names.join(', ') + '">' + names.length + ' proyecto' + (names.length!==1?'s':'') + '</span>';
        }
        return '<tr>' +
          '<td><div style="display:flex;align-items:center;gap:10px">' +
            '<div style="width:36px;height:36px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">' + (u.name||'?').charAt(0).toUpperCase() + '</div>' +
            '<div><div style="font-weight:600">' + escapeHtml(u.name||'') + '</div></div>' +
          '</div></td>' +
          '<td style="font-size:12px">' + escapeHtml(u.email||'') + '</td>' +
          '<td><span class="badge ' + usrRoleColor(u.role) + '">' + usrRoleLabel(u.role) + '</span></td>' +
          '<td>' + projCell + '</td>' +
          '<td style="font-size:12px;color:var(--text-muted)">' + (u.last_login ? fmtDatetime(u.last_login) : 'Nunca') + '</td>' +
          '<td>' + (u.active ? '<span class="badge badge-green">Activo</span>' : '<span class="badge badge-gray">Inactivo</span>') + '</td>' +
          '<td><div class="table-actions">' +
            '<button class="btn-ghost btn btn-sm" onclick="openUserForm(\'' + u.id + '\')"><i class="fas fa-edit"></i></button>' +
            '<button class="btn-ghost btn btn-sm" onclick="toggleUser(\'' + u.id + '\',' + (!u.active) + ')"><i class="fas fa-' + (u.active?'ban':'check') + '"></i></button>' +
            '<button class="btn-ghost btn btn-sm danger" onclick="deleteUser(\'' + u.id + '\')"><i class="fas fa-trash"></i></button>' +
          '</div></td>' +
        '</tr>';
      }).join('')}
    </tbody></table>
  </div></div>
</div>`;
}

function usrBuildRolesList() {
  const roles = usrGetAllRoles();
  const users = DB.getAll('users');
  return `
<div class="card mt-1">
  <div class="card-header">
    <span class="card-title"><i class="fas fa-shield-alt text-primary"></i> Roles del Sistema</span>
    <button class="btn btn-sm btn-primary" onclick="openRoleForm()"><i class="fas fa-plus"></i> Nuevo Rol</button>
  </div>
  <div class="card-body" style="padding:0"><div class="table-wrap">
    <table><thead><tr>
      <th>Rol</th><th>Permisos</th><th>Tipo</th><th>Usuarios</th><th>Acciones</th>
    </tr></thead>
    <tbody>
      ${roles.map(r => {
        const count = users.filter(u => u.role === r.id).length;
        let permsHtml;
        if (r.builtin && (!r.permissions)) {
          permsHtml = `<span style="font-size:11px;color:var(--text-muted)">${(r.perms||[]).join(' · ') || '—'}</span>`;
        } else {
          const s = permCountSummary(r.permissions);
          if (!s.edit && !s.view) {
            permsHtml = '<span style="font-size:11px;color:var(--text-muted)">Sin permisos asignados</span>';
          } else {
            permsHtml = `${s.edit?`<span class="badge badge-green" style="font-size:10px">${s.edit} editar</span> `:''}${s.view?`<span class="badge badge-blue" style="font-size:10px">${s.view} ver</span>`:''}`;
          }
        }
        return `<tr>
          <td><span class="badge ${r.color||'badge-gray'}">${r.label}</span></td>
          <td>${permsHtml}</td>
          <td>${r.builtin ? '<span class="badge badge-gray">Sistema</span>' : '<span class="badge badge-blue">Personalizado</span>'}</td>
          <td style="font-size:12px">${count} usuario${count!==1?'s':''}</td>
          <td><div class="table-actions">
            ${r.builtin
              ? '<span style="font-size:11px;color:var(--text-muted)">No editable</span>'
              : `<button class="btn-ghost btn btn-sm" onclick="openRoleForm('${r.id}')"><i class="fas fa-edit"></i></button>
                 <button class="btn-ghost btn btn-sm danger" onclick="deleteRole('${r.id}')"><i class="fas fa-trash"></i></button>`}
          </div></td>
        </tr>`;
      }).join('')}
    </tbody></table>
  </div></div>
</div>`;
}

// ---- USER FORM ----
function openUserForm(id = null) {
  const u = id ? DB.getById('users', id) : null;
  const roles = usrGetAllRoles();
  const projects = DB.getAll('projects');
  const userProjIds = (u && u.project_ids && u.project_ids.length) ? u.project_ids : null;
  const accessMode = userProjIds ? 'specific' : 'all';

  const projCheckboxes = projects.map(function(p) {
    var checked = !userProjIds || userProjIds.indexOf(p.id) !== -1 ? 'checked' : '';
    return '<label style="display:flex;align-items:center;gap:8px;font-size:12px;padding:6px 10px;background:var(--bg);border-radius:6px;cursor:pointer">' +
      '<input type="checkbox" class="usr-proj-cb" value="' + p.id + '" ' + checked + '>' +
      '<span><strong>' + escapeHtml(p.name) + '</strong>' + (p.client ? ' <span style="color:var(--text-muted)">— ' + escapeHtml(p.client) + '</span>' : '') + '</span>' +
      '</label>';
  }).join('');

  openModal(u ? 'Editar Usuario' : 'Nuevo Usuario',
    '<div class="form-grid form-grid-2">' +
      '<div class="form-group full">' +
        '<label class="form-label">Nombre Completo *</label>' +
        '<input class="form-control" id="usr-name" value="' + (u ? escapeHtml(u.name) : '') + '" placeholder="Juan Pérez">' +
      '</div>' +
      '<div class="form-group full">' +
        '<label class="form-label">Email *</label>' +
        '<input class="form-control" id="usr-email" type="email" value="' + (u ? escapeHtml(u.email) : '') + '" placeholder="usuario@empresa.com">' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Rol *</label>' +
        '<select class="form-control" id="usr-role">' +
          roles.map(function(r) { return '<option value="' + r.id + '"' + ((u ? u.role===r.id : r.id==='viewer') ? ' selected' : '') + '>' + escapeHtml(r.label) + '</option>'; }).join('') +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Estado</label>' +
        '<select class="form-control" id="usr-active">' +
          '<option value="true"' + (u && u.active===false ? '' : ' selected') + '>Activo</option>' +
          '<option value="false"' + (u && u.active===false ? ' selected' : '') + '>Inactivo</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-group full">' +
        '<label class="form-label">Contraseña <span style="font-weight:400;color:var(--text-muted)">' + (u ? '(dejá vacío para no cambiar)' : '(opcional — si no se asigna, cualquier contraseña permite el ingreso)') + '</span></label>' +
        '<input class="form-control" id="usr-pin" type="password" placeholder="Nueva contraseña" autocomplete="new-password">' +
      '</div>' +
    '</div>' +
    '<div class="divider" style="margin:14px 0"></div>' +
    '<div style="font-size:13px;font-weight:600;margin-bottom:10px"><i class="fas fa-building" style="color:var(--primary);margin-right:6px"></i>Acceso a Proyectos</div>' +
    '<div style="display:flex;flex-direction:column;gap:6px">' +
      '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">' +
        '<input type="radio" name="usr-proj-mode" value="all" id="usr-proj-all"' + (accessMode==='all' ? ' checked' : '') + ' onchange="usrToggleProjMode(this.value)">' +
        '<span>Todos los proyectos <span style="color:var(--text-muted);font-size:11px">(sin restricción)</span></span>' +
      '</label>' +
      '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">' +
        '<input type="radio" name="usr-proj-mode" value="specific" id="usr-proj-specific"' + (accessMode==='specific' ? ' checked' : '') + ' onchange="usrToggleProjMode(this.value)">' +
        '<span>Proyectos específicos</span>' +
      '</label>' +
    '</div>' +
    '<div id="usr-proj-list" style="margin-top:10px;display:' + (accessMode==='specific' ? 'grid' : 'none') + ';grid-template-columns:1fr 1fr;gap:6px">' +
      (projects.length ? projCheckboxes : '<div style="font-size:12px;color:var(--text-muted);padding:8px">No hay proyectos creados aún.</div>') +
    '</div>',
  '', '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
      '<button class="btn btn-primary" onclick="saveUser(\'' + (id||'') + '\')"><i class="fas fa-save"></i> Guardar</button>');
}

function usrToggleProjMode(mode) {
  var list = document.getElementById('usr-proj-list');
  if (list) list.style.display = mode === 'specific' ? 'grid' : 'none';
}

function saveUser(id) {
  const name = document.getElementById('usr-name').value.trim();
  const email = document.getElementById('usr-email').value.trim();
  if (!name || !email) { toast('Nombre y email son obligatorios', 'error'); return; }

  const pin = document.getElementById('usr-pin').value;

  // Project access
  var projMode = document.querySelector('input[name="usr-proj-mode"]:checked');
  var projectIds = null;
  if (projMode && projMode.value === 'specific') {
    var checked = Array.from(document.querySelectorAll('.usr-proj-cb:checked'));
    projectIds = checked.map(function(cb) { return cb.value; });
    if (!projectIds.length) { toast('Seleccioná al menos un proyecto', 'error'); return; }
  }

  const data = {
    name, email,
    role: document.getElementById('usr-role').value,
    active: document.getElementById('usr-active').value === 'true',
    project_ids: projectIds,
  };

  if (pin) {
    try { data.password = btoa(pin); } catch(e) { data.password = pin; }
  } else if (!id) {
    data.password = null;
  }

  if (id) { DB.update('users', id, data); toast('Usuario actualizado', 'success'); }
  else { DB.insert('users', { ...data, last_login: null }); toast('Usuario creado', 'success'); }
  closeModal();
  renderUsuarios();
}

function toggleUser(id, active) {
  DB.update('users', id, { active });
  toast(`Usuario ${active ? 'activado' : 'desactivado'}`, active ? 'success' : 'warning');
  renderUsuarios();
}

function deleteUser(id) {
  confirmDialog('¿Eliminar este usuario?', () => {
    DB.remove('users', id);
    toast('Usuario eliminado', 'warning');
    renderUsuarios();
  });
}

// ---- ROLE FORM ----
function roleLevelSelect(itemId, current) {
  return `<select class="form-control role-perm" data-item="${itemId}" style="font-size:12px;padding:4px 8px;height:auto">
    ${PERM_LEVELS.map(l => `<option value="${l.id}" ${current===l.id?'selected':''}>${l.label}</option>`).join('')}
  </select>`;
}

function openRoleForm(id = null) {
  const role = id ? (DB.getById('roles', id) || null) : null;
  const perms = (role && role.permissions) ? role.permissions : {};

  const matrixHtml = PERM_MODULES.map(g => `
    <div class="role-perm-group" style="border:1px solid var(--border);border-radius:8px;margin-bottom:10px;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg);padding:8px 12px">
        <strong style="font-size:12px">${g.group}</strong>
        <div style="display:flex;gap:4px">
          <button type="button" class="btn btn-ghost btn-sm" style="font-size:10px;padding:2px 8px" onclick="roleSetGroup(this,'none')">Sin acceso</button>
          <button type="button" class="btn btn-ghost btn-sm" style="font-size:10px;padding:2px 8px" onclick="roleSetGroup(this,'view')">Todo Ver</button>
          <button type="button" class="btn btn-ghost btn-sm" style="font-size:10px;padding:2px 8px" onclick="roleSetGroup(this,'edit')">Todo Editar</button>
        </div>
      </div>
      <div style="padding:6px 12px">
        ${g.items.map(it => `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid var(--border-soft,#f0f0f0)">
          <span style="font-size:12px">${it.label}</span>
          <div style="width:150px;flex-shrink:0">${roleLevelSelect(it.id, perms[it.id] || 'none')}</div>
        </div>`).join('')}
      </div>
    </div>
  `).join('');

  openModal(role ? 'Editar Rol' : 'Nuevo Rol Personalizado', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Nombre del Rol *</label>
    <input class="form-control" id="role-name" value="${role?.label || ''}" placeholder="Ej: Jefe de Compras">
  </div>
  <div class="form-group">
    <label class="form-label">Color de Etiqueta</label>
    <select class="form-control" id="role-color">
      ${ROLE_COLORS.map(c => `<option value="${c.id}" ${role?.color===c.id?'selected':''}>${c.label}</option>`).join('')}
    </select>
  </div>
</div>
<div class="divider"></div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
  <div>
    <div style="font-size:13px;font-weight:600">Permisos por Módulo</div>
    <div style="font-size:11px;color:var(--text-muted)">Definí, para cada módulo, si el rol puede <strong>Ver</strong>, <strong>Ver y Editar</strong> o no tiene acceso</div>
  </div>
  <div style="display:flex;gap:4px">
    <button type="button" class="btn btn-ghost btn-sm" style="font-size:10px;padding:3px 8px" onclick="roleSetAll('none')">Limpiar todo</button>
    <button type="button" class="btn btn-ghost btn-sm" style="font-size:10px;padding:3px 8px" onclick="roleSetAll('view')">Todo Ver</button>
    <button type="button" class="btn btn-ghost btn-sm" style="font-size:10px;padding:3px 8px" onclick="roleSetAll('edit')">Todo Editar</button>
  </div>
</div>
<div style="max-height:42vh;overflow-y:auto;padding-right:4px">${matrixHtml}</div>
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveRole('${id||''}')"><i class="fas fa-save"></i> Guardar Rol</button>
`);
}

function roleSetGroup(btn, level) {
  const groupBox = btn.closest('.role-perm-group');
  if (groupBox) groupBox.querySelectorAll('.role-perm').forEach(sel => { sel.value = level; });
}

function roleSetAll(level) {
  document.querySelectorAll('.role-perm').forEach(sel => { sel.value = level; });
}

function saveRole(id) {
  const label = document.getElementById('role-name').value.trim();
  if (!label) { toast('El nombre del rol es obligatorio', 'error'); return; }
  const color = document.getElementById('role-color').value;
  const permissions = {};
  document.querySelectorAll('.role-perm').forEach(sel => {
    const lvl = sel.value;
    if (lvl && lvl !== 'none') permissions[sel.getAttribute('data-item')] = lvl;
  });

  if (id) {
    DB.update('roles', id, { label, color, permissions });
    toast('Rol actualizado', 'success');
  } else {
    DB.insert('roles', { label, color, permissions, builtin: false });
    toast('Rol creado', 'success');
  }
  closeModal();
  renderUsuarios();
}

function deleteRole(id) {
  const usersWithRole = DB.getAll('users').filter(u => u.role === id);
  const msg = usersWithRole.length
    ? `Este rol está asignado a ${usersWithRole.length} usuario(s). Si lo eliminás, esos usuarios quedarán sin rol válido. ¿Continuar?`
    : '¿Eliminar este rol personalizado?';
  confirmDialog(msg, () => {
    DB.remove('roles', id);
    toast('Rol eliminado', 'warning');
    renderUsuarios();
  });
}

// =====================================================
// SESSION MANAGEMENT
// =====================================================
var SESS_KEY = 'erp_session_v1';
var SESS_REMEMBER_KEY = 'erp_session_remember_v1';

function sessionGet() {
  try {
    var raw = sessionStorage.getItem(SESS_KEY);
    if (raw) return JSON.parse(raw);
    raw = localStorage.getItem(SESS_REMEMBER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function sessionSet(uid, remember) {
  var sess = JSON.stringify({ uid: uid, ts: Date.now() });
  try {
    sessionStorage.setItem(SESS_KEY, sess);
    if (remember) localStorage.setItem(SESS_REMEMBER_KEY, sess);
    else localStorage.removeItem(SESS_REMEMBER_KEY);
  } catch(e) {}
}

function sessionClear() {
  try { sessionStorage.removeItem(SESS_KEY); } catch(e) {}
  try { localStorage.removeItem(SESS_REMEMBER_KEY); } catch(e) {}
  if (window.APP_STATE) window.APP_STATE.currentUser = null;
}

function sessionCurrentUser() {
  var s = sessionGet();
  if (!s || !s.uid) return null;
  var user = DB.getById('users', s.uid);
  return (user && user.active) ? user : null;
}

// =====================================================
// PERMISSION HELPERS
// =====================================================

// Returns a { moduleId: 'view'|'edit' } map for a given role.
// Admin → edit all; viewer → view all; built-ins use hardcoded defaults;
// custom roles use their stored permissions object.
function getEffectivePermissions(roleId) {
  if (roleId === 'admin') {
    var all = {};
    PERM_MODULES.forEach(function(g) { g.items.forEach(function(it) { all[it.id] = 'edit'; }); });
    return all;
  }
  if (roleId === 'viewer') {
    var allView = {};
    PERM_MODULES.forEach(function(g) { g.items.forEach(function(it) { allView[it.id] = 'view'; }); });
    return allView;
  }

  var role = usrRoleById(roleId);
  if (role && role.permissions) return role.permissions;

  // Hardcoded defaults for built-in roles without explicit permissions
  var defaults = {
    project_manager: {
      pedidos:'edit', ordenes_compra:'edit',
      projects:'edit', contratos:'edit', certificaciones:'edit',
      presupuesto:'edit', seguimiento:'edit', gantt:'edit',
      rubros:'edit', apu:'edit', indices:'edit',
      cuentas_prov:'view', documentos_prov:'view',
      ordenes_pago:'view', retenciones:'view',
      rrhh:'view', stock:'edit', notas:'view',
      reportes:'view', aprobaciones:'edit',
    },
    accountant: {
      facturacion:'edit', cobranzas:'edit', cuentas_cli:'edit',
      cashflow_cli:'edit', ordenes_pago:'edit', cuentas_prov:'edit',
      documentos_prov:'edit', retenciones:'edit',
      contabilidad:'edit', conta_diario:'edit', conta_balance:'edit',
      conta_resultados:'edit', conta_plan:'edit', conta_mayores:'edit',
      conta_sumas:'edit', libro_iva:'edit',
      tesoreria:'edit', cuentas_banco:'edit', cheques:'edit',
      notas:'edit', reportes:'view', aprobaciones:'view',
    },
    inspector: {
      projects:'view', contratos:'view', certificaciones:'view',
      presupuesto:'view', seguimiento:'view', gantt:'view', rubros:'view',
    },
  };
  return defaults[roleId] || {};
}

// Returns array of project IDs the current user can access, or null meaning all projects.
// Admin always gets null (unrestricted). Any user without project_ids gets null too.
function getAccessibleProjectIds() {
  var user = window.APP_STATE && window.APP_STATE.currentUser;
  if (!user || user.role === 'admin') return null;
  if (!user.project_ids || !user.project_ids.length) return null;
  return user.project_ids;
}

function canAccessProject(projectId) {
  var ids = getAccessibleProjectIds();
  if (!ids) return true;
  return ids.indexOf(projectId) !== -1;
}

// Returns true if the logged-in user can at least view the given module.
function canView(moduleId) {
  var user = window.APP_STATE && window.APP_STATE.currentUser;
  if (!user) return true; // no session → admin-mode (dev)
  var perms = getEffectivePermissions(user.role);
  return !!(perms[moduleId] === 'view' || perms[moduleId] === 'edit');
}

// Returns true if the logged-in user can edit the given module.
function canEdit(moduleId) {
  var user = window.APP_STATE && window.APP_STATE.currentUser;
  if (!user) return true;
  var perms = getEffectivePermissions(user.role);
  return perms[moduleId] === 'edit';
}

// =====================================================
// LOGIN UI
// =====================================================

function showLoginScreen() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  var emailEl = document.getElementById('login-email');
  var pwEl    = document.getElementById('login-password');
  var errEl   = document.getElementById('login-error-txt');
  if (emailEl) { emailEl.value = ''; setTimeout(function() { emailEl.focus(); }, 60); }
  if (pwEl)    pwEl.value = '';
  if (errEl)   errEl.innerHTML = '';
  // Reset password field to type=password (in case toggle was used)
  if (pwEl) pwEl.type = 'password';
  var icon = document.getElementById('login-pw-icon');
  if (icon) icon.className = 'fas fa-eye';
}

function toggleLoginPw() {
  var el   = document.getElementById('login-password');
  var icon = document.getElementById('login-pw-icon');
  if (!el) return;
  el.type = (el.type === 'password') ? 'text' : 'password';
  if (icon) icon.className = (el.type === 'password') ? 'fas fa-eye' : 'fas fa-eye-slash';
}

function _loginError(msg) {
  var el = document.getElementById('login-error-txt');
  if (el) el.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + escapeHtml(msg);
}

function _loginScanCompanyIds() {
  // Collect company IDs: from global store + scan localStorage keys directly
  var ids = [];
  try {
    DB.getAllCompanies().forEach(function(c) { if (ids.indexOf(c.id) === -1) ids.push(c.id); });
  } catch(e) {}
  try {
    for (var k = 0; k < localStorage.length; k++) {
      var key = localStorage.key(k);
      if (key && /^erp_company_.+_v1$/.test(key)) {
        var cid = key.replace('erp_company_', '').replace(/_v1$/, '');
        if (ids.indexOf(cid) === -1) ids.push(cid);
      }
    }
  } catch(e) {}
  // Always include standard IDs as fallback
  ['comp-001', 'comp-002'].forEach(function(cid) { if (ids.indexOf(cid) === -1) ids.push(cid); });
  return ids;
}

function _loginEnsureUsers(companyId) {
  DB.setCompany(companyId);
  var db = DB.get();
  var users = Array.isArray(db.users) ? db.users : [];
  // Merge default users in (add missing ones, never delete existing)
  var defaults = DB._defaultUsers ? DB._defaultUsers() : [];
  defaults.forEach(function(def) {
    if (!users.find(function(u) { return u.id === def.id; })) users.push(def);
  });
  if (users.length !== (db.users || []).length) {
    db.users = users;
    DB.save(db);
  }
  return users;
}

function doLogin() {
  var email    = ((document.getElementById('login-email')    || {}).value || '').trim().toLowerCase();
  var password = ((document.getElementById('login-password') || {}).value || '');

  if (!email) { _loginError('Ingresá tu email'); return; }

  var companyIds = _loginScanCompanyIds();
  var foundUser = null;
  var foundCompanyId = null;
  var allEmails = []; // collect for debug

  for (var i = 0; i < companyIds.length; i++) {
    var users = _loginEnsureUsers(companyIds[i]);
    users.forEach(function(u) { if (u.email) allEmails.push(u.email); });
    var match = users.find(function(u) { return (u.email || '').trim().toLowerCase() === email && u.active; });
    if (match) { foundUser = match; foundCompanyId = companyIds[i]; break; }
  }

  if (!foundUser) {
    DB.setCompany(window.APP_STATE.activeCompany || 'comp-001');
    _loginError('Email no encontrado. Probá con: ' + (allEmails.length ? allEmails.slice(0,3).join(', ') : 'ningún usuario activo aún'));
    return;
  }

  if (foundUser.password) {
    var encoded;
    try { encoded = btoa(password); } catch(e) { encoded = password; }
    if (foundUser.password !== encoded) {
      DB.setCompany(window.APP_STATE.activeCompany || 'comp-001');
      _loginError('Contraseña incorrecta');
      var pwEl = document.getElementById('login-password');
      if (pwEl) pwEl.select();
      return;
    }
  }

  window.APP_STATE.activeCompany = foundCompanyId;
  try { localStorage.setItem('erp_active_company', foundCompanyId); } catch(e) {}

  var remEl = document.getElementById('login-remember');
  completeLogin(foundUser.id, !!(remEl && remEl.checked));
}

function completeLogin(uid, remember) {
  sessionSet(uid, remember);
  var user = DB.getById('users', uid);
  window.APP_STATE.currentUser = user;
  DB.update('users', uid, { last_login: new Date().toISOString() });

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  updateSidebarUserInfo();
  applyPermissionsToSidebar();
  if (typeof populateProjectSelector === 'function') populateProjectSelector();

  var savedModule = null;
  try { savedModule = localStorage.getItem('erp_active_module'); } catch(e) {}
  var targetModule = (savedModule && window.MODULES && window.MODULES[savedModule] && canView(savedModule))
    ? savedModule : 'dashboard';
  navigate(targetModule);
  setTimeout(syncExchangeRates, 1500);
  setTimeout(function() { if (typeof updateNotifBadge === 'function') updateNotifBadge(); }, 500);
  toast('Bienvenido, ' + escapeHtml(user.name || user.email) + '!', 'success');
}

function doLogout() {
  sessionClear();
  showLoginScreen();
}

// =====================================================
// PROFILE MODAL
// =====================================================
function openProfileModal() {
  var user = window.APP_STATE && window.APP_STATE.currentUser;
  if (!user) return;
  openModal('Mi Perfil', '<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding:14px;background:var(--bg);border-radius:10px">' +
    '<div style="width:54px;height:54px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;flex-shrink:0">' +
      escapeHtml((user.name || '?').charAt(0).toUpperCase()) +
    '</div>' +
    '<div>' +
      '<div style="font-weight:700;font-size:15px">' + escapeHtml(user.name || '') + '</div>' +
      '<div style="font-size:12px;color:var(--text-muted)">' + escapeHtml(user.email || '') + '</div>' +
      '<span class="badge ' + usrRoleColor(user.role) + '" style="margin-top:4px">' + escapeHtml(usrRoleLabel(user.role)) + '</span>' +
    '</div>' +
  '</div>' +
  '<div class="form-grid form-grid-2">' +
    '<div class="form-group"><label class="form-label">Nombre *</label>' +
    '<input class="form-control" id="prof-name" value="' + escapeHtml(user.name || '') + '"></div>' +
    '<div class="form-group"><label class="form-label">Email *</label>' +
    '<input class="form-control" id="prof-email" type="email" value="' + escapeHtml(user.email || '') + '"></div>' +
  '</div>' +
  '<div class="divider" style="margin:16px 0"></div>' +
  '<div style="font-size:13px;font-weight:600;margin-bottom:10px"><i class="fas fa-lock" style="color:var(--primary);margin-right:6px"></i>Cambiar contraseña</div>' +
  '<div class="form-grid form-grid-2">' +
    '<div class="form-group full"><label class="form-label">Contraseña actual</label>' +
    '<input class="form-control" id="prof-pw-current" type="password" placeholder="Dejá vacío si no tenés contraseña"></div>' +
    '<div class="form-group"><label class="form-label">Nueva contraseña</label>' +
    '<input class="form-control" id="prof-pw-new" type="password" placeholder="Mínimo 6 caracteres"></div>' +
    '<div class="form-group"><label class="form-label">Confirmar contraseña</label>' +
    '<input class="form-control" id="prof-pw-confirm" type="password" placeholder="Repetir contraseña"></div>' +
  '</div>', '', '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
  '<button class="btn btn-primary" onclick="saveProfile()"><i class="fas fa-save"></i> Guardar Cambios</button>');
}

function saveProfile() {
  var user = window.APP_STATE && window.APP_STATE.currentUser;
  if (!user) return;
  var name  = (document.getElementById('prof-name').value || '').trim();
  var email = (document.getElementById('prof-email').value || '').trim().toLowerCase();
  if (!name)  { toast('El nombre es obligatorio', 'error'); return; }
  if (!email) { toast('El email es obligatorio', 'error'); return; }
  var update = { name: name, email: email };
  var pwNew     = document.getElementById('prof-pw-new').value;
  var pwConfirm = document.getElementById('prof-pw-confirm').value;
  var pwCurrent = document.getElementById('prof-pw-current').value;
  if (pwNew) {
    if (user.password) {
      var enc; try { enc = btoa(pwCurrent); } catch(e) { enc = pwCurrent; }
      if (user.password !== enc) { toast('La contraseña actual es incorrecta', 'error'); return; }
    }
    if (pwNew !== pwConfirm) { toast('Las contraseñas nuevas no coinciden', 'error'); return; }
    if (pwNew.length < 6) { toast('La contraseña debe tener al menos 6 caracteres', 'error'); return; }
    try { update.password = btoa(pwNew); } catch(e) { update.password = pwNew; }
  }
  DB.update('users', user.id, update);
  var updated = DB.getById('users', user.id);
  window.APP_STATE.currentUser = updated;
  updateSidebarUserInfo();
  toast('Perfil actualizado correctamente', 'success');
  closeModal();
}
