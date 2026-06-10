/* ===== USUARIOS Y ROLES ===== */

// Built-in roles — always available, cannot be deleted
const BUILTIN_ROLES = [
  { id: 'admin',           label: 'Administrador',  color: 'badge-red',  builtin: true, perms: ['Acceso total', 'Gestión usuarios', 'Configuración', 'Eliminar registros'] },
  { id: 'project_manager', label: 'Gerente de Obra', color: 'badge-blue', builtin: true, perms: ['Proyectos', 'Gantt', 'Certificaciones', 'Presupuesto', 'Compras'] },
  { id: 'accountant',      label: 'Contador',        color: 'badge-cyan', builtin: true, perms: ['Facturación', 'Cobranzas', 'Tesorería', 'Contabilidad', 'Reportes'] },
  { id: 'inspector',       label: 'Inspector',       color: 'badge-green', builtin: true, perms: ['Ver proyectos', 'Ver Gantt', 'Certificaciones (solo lectura)'] },
  { id: 'viewer',          label: 'Lector',          color: 'badge-gray', builtin: true, perms: ['Solo lectura', 'Sin modificar datos'] },
];

// Permission areas a custom role can be granted (used as checklist)
const PERM_AREAS = [
  { id: 'compras',         label: 'Compras y Proveedores' },
  { id: 'obra',            label: 'Gestión de Obra' },
  { id: 'certificaciones', label: 'Certificaciones' },
  { id: 'clientes',        label: 'Clientes y Facturación' },
  { id: 'tesoreria',       label: 'Tesorería y Bancos' },
  { id: 'contabilidad',    label: 'Contabilidad' },
  { id: 'rrhh',            label: 'RRHH / Personal' },
  { id: 'aprobaciones',    label: 'Aprobaciones' },
  { id: 'reportes',        label: 'Reportes' },
  { id: 'config',          label: 'Configuración y Usuarios' },
];

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
      <th>Usuario</th><th>Email</th><th>Rol</th><th>Último Acceso</th><th>Estado</th><th>Acciones</th>
    </tr></thead>
    <tbody>
      ${users.map(u => `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">
              ${(u.name||'?').charAt(0).toUpperCase()}
            </div>
            <div><div style="font-weight:600">${u.name}</div></div>
          </div>
        </td>
        <td style="font-size:12px">${u.email}</td>
        <td><span class="badge ${usrRoleColor(u.role)}">${usrRoleLabel(u.role)}</span></td>
        <td style="font-size:12px;color:var(--text-muted)">${u.last_login ? fmtDatetime(u.last_login) : 'Nunca'}</td>
        <td>${u.active ? '<span class="badge badge-green">Activo</span>' : '<span class="badge badge-gray">Inactivo</span>'}</td>
        <td><div class="table-actions">
          <button class="btn-ghost btn btn-sm" onclick="openUserForm('${u.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn-ghost btn btn-sm" onclick="toggleUser('${u.id}', ${!u.active})">
            <i class="fas fa-${u.active?'ban':'check'}"></i>
          </button>
          <button class="btn-ghost btn btn-sm danger" onclick="deleteUser('${u.id}')"><i class="fas fa-trash"></i></button>
        </div></td>
      </tr>`).join('')}
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
      <th>Rol</th><th>Permisos / Áreas</th><th>Tipo</th><th>Usuarios</th><th>Acciones</th>
    </tr></thead>
    <tbody>
      ${roles.map(r => {
        const count = users.filter(u => u.role === r.id).length;
        const perms = (r.perms && r.perms.length) ? r.perms : (r.areas || []).map(a => {
          const pa = PERM_AREAS.find(x => x.id === a); return pa ? pa.label : a;
        });
        return `<tr>
          <td><span class="badge ${r.color||'badge-gray'}">${r.label}</span></td>
          <td style="font-size:11px;color:var(--text-muted)">${perms.length ? perms.join(' · ') : '—'}</td>
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
  openModal(u ? 'Editar Usuario' : 'Nuevo Usuario', `
<div class="form-grid form-grid-2">
  <div class="form-group full">
    <label class="form-label">Nombre Completo *</label>
    <input class="form-control" id="usr-name" value="${u?.name || ''}" placeholder="Juan Pérez">
  </div>
  <div class="form-group full">
    <label class="form-label">Email *</label>
    <input class="form-control" id="usr-email" type="email" value="${u?.email || ''}" placeholder="usuario@empresa.com">
  </div>
  <div class="form-group">
    <label class="form-label">Rol *</label>
    <select class="form-control" id="usr-role">
      ${roles.map(r => `<option value="${r.id}" ${ (u?.role===r.id) || (!u && r.id==='viewer') ? 'selected':''}>${r.label}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Estado</label>
    <select class="form-control" id="usr-active">
      <option value="true" ${u?.active!==false?'selected':''}>Activo</option>
      <option value="false" ${u?.active===false?'selected':''}>Inactivo</option>
    </select>
  </div>
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveUser('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
}

function saveUser(id) {
  const name = document.getElementById('usr-name').value.trim();
  const email = document.getElementById('usr-email').value.trim();
  if (!name || !email) { toast('Nombre y email son obligatorios', 'error'); return; }

  const data = {
    name, email,
    role: document.getElementById('usr-role').value,
    active: document.getElementById('usr-active').value === 'true',
  };

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
function openRoleForm(id = null) {
  const role = id ? (DB.getById('roles', id) || null) : null;
  const selectedAreas = role ? (role.areas || []) : [];
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
<div style="font-size:13px;font-weight:600;margin-bottom:10px">Áreas / Permisos de Acceso</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
  ${PERM_AREAS.map(a => `<label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;background:var(--bg);padding:8px 10px;border-radius:6px">
    <input type="checkbox" class="role-area-cb" value="${a.id}" ${selectedAreas.includes(a.id)?'checked':''}>
    <span>${a.label}</span>
  </label>`).join('')}
</div>
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveRole('${id||''}')"><i class="fas fa-save"></i> Guardar Rol</button>
`);
}

function saveRole(id) {
  const label = document.getElementById('role-name').value.trim();
  if (!label) { toast('El nombre del rol es obligatorio', 'error'); return; }
  const color = document.getElementById('role-color').value;
  const areas = Array.from(document.querySelectorAll('.role-area-cb:checked')).map(cb => cb.value);

  if (id) {
    DB.update('roles', id, { label, color, areas });
    toast('Rol actualizado', 'success');
  } else {
    DB.insert('roles', { label, color, areas, builtin: false });
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
