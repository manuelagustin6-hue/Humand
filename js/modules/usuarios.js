/* ===== USUARIOS ===== */
function renderUsuarios() {
  const users = DB.getAll('users');
  const roleLabel = { admin: 'Administrador', project_manager: 'Gerente de Obra', accountant: 'Contador', inspector: 'Inspector', viewer: 'Lector' };
  const roleColor = { admin: 'badge-red', project_manager: 'badge-blue', accountant: 'badge-cyan', inspector: 'badge-green', viewer: 'badge-gray' };

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Usuarios</div>
    <div class="page-subtitle">Gestión de usuarios y roles del sistema</div>
  </div>
  <div class="page-actions">
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
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-user-clock"></i></div><div>
    <div class="stat-value">${users.filter(u=>!u.active).length}</div><div class="stat-label">Inactivos</div></div></div>
</div>

<div class="grid-2 mt-2" style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
  <div class="card">
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
                ${u.name.charAt(0).toUpperCase()}
              </div>
              <div><div style="font-weight:600">${u.name}</div></div>
            </div>
          </td>
          <td style="font-size:12px">${u.email}</td>
          <td><span class="badge ${roleColor[u.role]||'badge-gray'}">${roleLabel[u.role]||u.role}</span></td>
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
  </div>

  <div>
    <div class="card mb-2">
      <div class="card-header"><span class="card-title"><i class="fas fa-shield-alt text-primary"></i> Roles y Permisos</span></div>
      <div class="card-body" style="padding:8px 0">
        ${[
          { role: 'admin', label: 'Administrador', perms: ['Acceso total', 'Gestión usuarios', 'Configuración', 'Eliminar registros'] },
          { role: 'project_manager', label: 'Gerente de Obra', perms: ['Proyectos', 'Gantt', 'Certificaciones', 'Presupuesto', 'Compras'] },
          { role: 'accountant', label: 'Contador', perms: ['Facturación', 'Cobranzas', 'Tesorería', 'Contabilidad', 'Reportes'] },
          { role: 'inspector', label: 'Inspector', perms: ['Ver proyectos', 'Ver Gantt', 'Certificaciones (solo lectura)'] },
          { role: 'viewer', label: 'Lector', perms: ['Solo lectura', 'Sin modificar datos'] },
        ].map(r => {
          const count = users.filter(u=>u.role===r.role).length;
          return `<div style="padding:10px 16px;border-bottom:1px solid var(--border)">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span class="badge ${roleColor[r.role]||'badge-gray'}">${r.label}</span>
              <span style="font-size:12px;color:var(--text-muted)">${count} usuario${count!==1?'s':''}</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted)">${r.perms.join(' · ')}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Usuario Activo</span></div>
      <div class="card-body">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div style="width:48px;height:48px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700">A</div>
          <div>
            <div style="font-weight:700">Administrador</div>
            <div style="font-size:12px;color:var(--text-muted)">admin@constructerp.com</div>
            <span class="badge badge-red">Administrador</span>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-muted)">Sesión iniciada — acceso completo al sistema</div>
      </div>
    </div>
  </div>
</div>
  `;
}

function openUserForm(id = null) {
  const u = id ? DB.getById('users', id) : null;
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
      <option value="admin" ${u?.role==='admin'?'selected':''}>Administrador</option>
      <option value="project_manager" ${u?.role==='project_manager'?'selected':''}>Gerente de Obra</option>
      <option value="accountant" ${u?.role==='accountant'?'selected':''}>Contador</option>
      <option value="inspector" ${u?.role==='inspector'?'selected':''}>Inspector</option>
      <option value="viewer" ${u?.role==='viewer'||!u?'selected':''}>Lector</option>
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
