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
    { id: 'licitaciones',    label: 'Licitaciones' },
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
    { id: 'conciliaciones',  label: 'Conciliaciones Bancarias' },
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
// Reúne los proyectos de TODAS las empresas (usuarios globales → acceso por obra
// entre razones sociales). Lee cada blob de empresa de localStorage + la activa.
function _allProjectsAcrossCompanies() {
  var companies = {};
  try { (DB.getAllCompanies() || []).forEach(function(c) { companies[c.id] = c.name || c.id; }); } catch (e) {}
  var out = [], seen = {};
  function collect(cid, projects) {
    (projects || []).forEach(function(p) {
      if (!p || !p.id || seen[p.id]) return;
      seen[p.id] = true;
      out.push({ id: p.id, name: p.name, client: p.client, companyName: companies[cid] || cid });
    });
  }
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && /^erp_company_.+_v1$/.test(key)) {
        var cid = key.replace('erp_company_', '').replace(/_v1$/, '');
        try { collect(cid, JSON.parse(localStorage.getItem(key)).projects); } catch (e) {}
      }
    }
  } catch (e) {}
  collect(DB._companyId, DB.getAll('projects'));   // la activa, con datos frescos del cache
  return out;
}

function openUserForm(id = null) {
  const u = id ? DB.getById('users', id) : null;
  const roles = usrGetAllRoles();
  const projects = _allProjectsAcrossCompanies();
  const userProjIds = (u && u.project_ids && u.project_ids.length) ? u.project_ids : null;
  const accessMode = userProjIds ? 'specific' : 'all';

  // Checkboxes agrupados por razón social (empresa)
  const _byCompany = {};
  projects.forEach(function(p) { (_byCompany[p.companyName] = _byCompany[p.companyName] || []).push(p); });
  const projCheckboxes = Object.keys(_byCompany).sort().map(function(cn) {
    return '<div style="grid-column:1/-1;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-top:8px">' + escapeHtml(cn) + '</div>' +
      _byCompany[cn].map(function(p) {
        var checked = !userProjIds || userProjIds.indexOf(p.id) !== -1 ? 'checked' : '';
        return '<label style="display:flex;align-items:center;gap:8px;font-size:12px;padding:6px 10px;background:var(--bg);border-radius:6px;cursor:pointer">' +
          '<input type="checkbox" class="usr-proj-cb" value="' + p.id + '" ' + checked + '>' +
          '<span><strong>' + escapeHtml(p.name) + '</strong>' + (p.client ? ' <span style="color:var(--text-muted)">— ' + escapeHtml(p.client) + '</span>' : '') + '</span>' +
          '</label>';
      }).join('');
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
    '<div style="font-size:13px;font-weight:600;margin-bottom:4px"><i class="fas fa-diagram-project" style="color:var(--primary);margin-right:6px"></i>Acceso a Proyectos</div>' +
    '<div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">El usuario accede a <strong>todas las empresas</strong> (razones sociales). Acá restringís a qué <strong>obras</strong> puede entrar.</div>' +
    '<div style="display:flex;flex-direction:column;gap:6px">' +
      '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">' +
        '<input type="radio" name="usr-proj-mode" value="all" id="usr-proj-all"' + (accessMode==='all' ? ' checked' : '') + ' onchange="usrToggleProjMode(this.value)">' +
        '<span>Todas las obras <span style="color:var(--text-muted);font-size:11px">(sin restricción)</span></span>' +
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
  if (!requireEdit('usuarios')) return;
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

  if (id) {
    DB.update('users', id, data);
    toast('Usuario actualizado', 'success');
    // Sincronizar acceso server-side (RLS) en TODAS las razones sociales.
    _SUPA.setAccess(email, data.role, data.active !== false);
  } else {
    DB.insert('users', { ...data, last_login: null });
    // Register in Supabase Auth for cross-device login
    if (pin && _SUPA.online) {
      var co = DB._companyId;
      _SUPA.signUp(email, pin, { company_id: co, role: data.role, name: data.name })
        .then(function(res) {
          // Otorgar membresía server-side (RLS) en TODAS las razones sociales.
          _SUPA.setAccess(email, data.role, true);
          if (res.error) {
            var msg = (res.error.message || '').toLowerCase();
            if (msg.indexOf('already registered') !== -1 || msg.indexOf('user_already_exists') !== -1) {
              toast('Usuario creado. Ya existe en Supabase Auth — puede ingresar desde cualquier dispositivo.', 'success');
            } else {
              toast('Usuario creado. Supabase Auth: ' + res.error.message, 'warning');
            }
          } else if (res.data && res.data.session) {
            // Email confirmation disabled — user can sign in immediately
            toast('Usuario creado y activado. Puede ingresar desde cualquier dispositivo.', 'success');
          } else {
            // Email confirmation required — session is null
            toast('Usuario creado. Se envió un email de confirmación a ' + email + ' — debe hacer clic en el enlace antes de poder ingresar desde otro dispositivo.', 'info');
          }
        }).catch(function() {
          toast('Usuario creado (sin conexión a Supabase — solo disponible en este dispositivo por ahora).', 'warning');
        });
    } else {
      toast('Usuario creado. Para acceso multi-dispositivo, activá Supabase en Ajustes.', 'info');
    }
  }
  closeModal();
  renderUsuarios();
}

function toggleUser(id, active) {
  if (!requireEdit('usuarios')) return;
  var u = DB.getById('users', id);
  DB.update('users', id, { active });
  // Sincronizar acceso server-side (RLS) en TODAS las razones sociales.
  if (u && u.email) _SUPA.setAccess(u.email, u.role, active);
  toast(`Usuario ${active ? 'activado' : 'desactivado'}`, active ? 'success' : 'warning');
  renderUsuarios();
}

function deleteUser(id) {
  if (!requireEdit('usuarios')) return;
  confirmDialog('¿Eliminar este usuario?', () => {
    var u = DB.getById('users', id);
    if (u && u.email) _SUPA.setAccess(u.email, (u.role || 'viewer'), false);   // revocar acceso (RLS) en todas
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
  if (!requireEdit('usuarios')) return;
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
  if (!requireEdit('usuarios')) return;
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
      pedidos:'edit', ordenes_compra:'edit', licitaciones:'edit',
      projects:'edit', contratos:'edit', certificaciones:'edit',
      presupuesto:'edit', seguimiento:'edit', gantt:'edit',
      panel_obra:'view', rfis:'edit', submittals:'edit', minutas:'edit',
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
      tesoreria:'edit', cuentas_banco:'edit', cheques:'edit', conciliaciones:'edit',
      notas:'edit', reportes:'view', aprobaciones:'view',
    },
    inspector: {
      projects:'view', contratos:'view', certificaciones:'view',
      presupuesto:'view', seguimiento:'view', gantt:'view', rubros:'view',
      panel_obra:'view', rfis:'edit', submittals:'view',
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
  if (user.role === 'admin') return true; // admin sees everything
  var perms = getEffectivePermissions(user.role);
  return !!(perms[moduleId] === 'view' || perms[moduleId] === 'edit');
}

// Returns true if the logged-in user can edit the given module.
function canEdit(moduleId) {
  var user = window.APP_STATE && window.APP_STATE.currentUser;
  if (!user) return true;
  if (user.role === 'admin') return true; // admin can edit everything
  var perms = getEffectivePermissions(user.role);
  return perms[moduleId] === 'edit';
}

// Guarda de escritura: llamar al inicio de cada handler save*/delete*. Si el
// usuario no tiene permiso de edición en el módulo, avisa y devuelve false para
// abortar. (Refuerzo client-side; el control real vendrá con Supabase RLS.)
function requireEdit(moduleId) {
  if (canEdit(moduleId)) return true;
  if (typeof toast === 'function') toast('No tenés permiso para modificar este módulo', 'error');
  return false;
}
window.requireEdit = requireEdit;

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

  var btn = document.querySelector('#login-screen button[onclick="doLogin()"]');
  function _btnBusy(busy) {
    if (!btn) return;
    btn.disabled = busy;
    btn.innerHTML = busy
      ? '<i class="fas fa-spinner fa-spin"></i> Verificando…'
      : '<i class="fas fa-sign-in-alt"></i> Ingresar';
  }
  _btnBusy(true);

  // Try Supabase Auth first
  _SUPA.signIn(email, password).then(function(result) {
    if (!result.error && result.data && result.data.session) {
      // Full Supabase Auth session — reload data with JWT
      _afterSupaLogin(result.data.session, email);

    } else {
      // signIn no devolvió sesión: error de credenciales, o cuenta pendiente de
      // confirmar por email (con "Confirm email" encendido, la migración crea la
      // cuenta pero Auth no deja entrar hasta confirmar). No error + sin sesión
      // también = pendiente de confirmación.
      var errMsg = ((result.error && result.error.message) || '').toLowerCase();
      var notConfirmed = !result.error
        || errMsg.indexOf('not confirmed') !== -1
        || errMsg.indexOf('email_not_confirmed') !== -1;
      // Nunca dejar al usuario afuera: si existe local con contraseña válida, entra
      // por login local (la cuenta Auth puede estar pendiente de confirmar).
      var localExists = _loginScanCompanyIds().some(function(cid) {
        DB.setCompany(cid);
        return (DB.getAll('users') || []).some(function(u) { return (u.email||'').toLowerCase() === email && u.active; });
      });
      _btnBusy(false);
      if (localExists) {
        _doLoginLocal(email, password, false);
      } else if (notConfirmed) {
        _loginError('Confirmá tu email: revisá tu casilla de correo y hacé clic en el enlace de activación que te enviamos. (O pedile al admin que desactive la confirmación por email.)');
      } else {
        _loginError(errMsg.indexOf('invalid login credentials') !== -1
          ? 'Email o contraseña incorrectos'
          : ((result.error && result.error.message) || 'Error de autenticación'));
      }
    }
  }).catch(function() {
    // Network error: Supabase unreachable
    _btnBusy(false);
    _doLoginLocal(email, password, true /* supaUnavailable */);
  });
}

// Elige una empresa activa VÁLIDA. Como los usuarios son globales (acceso a todas
// las empresas), no hace falta buscar al usuario por empresa: alcanza con abrir una
// empresa real (la preferida, la última usada, o la primera disponible).
function _pickActiveCompany(preferred) {
  var companies = [];
  try { companies = DB.getAllCompanies() || []; } catch (e) {}
  function valid(cid) { return !!cid && companies.some(function(c) { return c.id === cid; }); }
  if (valid(preferred)) return preferred;
  var last = ''; try { last = localStorage.getItem('erp_active_company') || ''; } catch (e) {}
  if (valid(last)) return last;
  if (companies.length) return companies[0].id;
  return preferred || 'comp-001';
}

// Called after a successful Supabase signIn
function _afterSupaLogin(session, email) {
  // CRITICAL: set _SUPA.session so all subsequent DB operations use the JWT
  // Without this, upserts fire with the anon key → RLS rejects them → data lost on refresh
  _SUPA.session = session;
  _SUPA.selfMembership();   // completa la membresía (RLS) según los usuarios de la app

  var meta = (session.user && session.user.user_metadata) || {};
  // Usuarios globales: el usuario existe una sola vez y accede a todas las empresas.
  // Solo elegimos una empresa activa válida para abrir.
  var candidate = meta.company_id || window.APP_STATE.activeCompany || 'comp-001';
  var companyId = _pickActiveCompany(candidate);
  DB.setCompany(companyId);
  window.APP_STATE.activeCompany = companyId;
  try { localStorage.setItem('erp_active_company', companyId); } catch(e) {}

  // Reload data with JWT so RLS filters correctly
  DB.load().then(function() {
    if (typeof _updateSyncBadge === 'function') _updateSyncBadge();
    var dbUser = DB.getAll('users').find(function(u) { return (u.email||'').toLowerCase() === email && u.active; });
    if (!dbUser) {
      dbUser = {
        id: session.user.id,
        name: meta.name || email.split('@')[0],
        email: email,
        role: meta.role || 'viewer',
        active: true,
        created_at: session.user.created_at || new Date().toISOString(),
      };
    }
    window.APP_STATE.currentUser = dbUser;
    var remEl = document.getElementById('login-remember');
    completeLogin(dbUser.id, !!(remEl && remEl.checked));
  });
}

// Local auth fallback (used when user is not yet in Supabase Auth)
function _doLoginLocal(email, password, supaUnavailable) {
  // Usuarios GLOBALES: se busca en el store global (acceso a todas las empresas),
  // no por empresa. La empresa activa se elige aparte (última usada / primera).
  var users = DB.getAll('users');
  var foundUser = users.find(function(u) { return (u.email || '').trim().toLowerCase() === email && u.active; }) || null;
  var foundCompanyId = _pickActiveCompany(window.APP_STATE && window.APP_STATE.activeCompany);
  var allEmails = users.filter(function(u) { return u.active && u.email; }).map(function(u) { return u.email; });

  if (!foundUser) {
    DB.setCompany(window.APP_STATE.activeCompany || 'comp-001');
    if (supaUnavailable) {
      _loginError('No se pudo conectar al servidor. En una computadora nueva necesitás internet para la primera sesión — revisá tu conexión e intentá nuevamente.');
    } else {
      _loginError('Email no encontrado. Probá con: ' + (allEmails.length ? allEmails.slice(0,3).join(', ') : 'ningún usuario activo aún'));
    }
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
  } else {
    // Cuenta sin contraseña (semilla/bootstrap). ANTES: cualquier clave entraba
    // como admin — escalada crítica. AHORA: el primer ingreso DEFINE la
    // contraseña de la cuenta; los siguientes la exigen. Nunca se acepta login
    // sin que se haya fijado una contraseña.
    if (!password || password.length < 4) {
      DB.setCompany(window.APP_STATE.activeCompany || 'comp-001');
      _loginError('Esta cuenta aún no tiene contraseña. Definí una (mínimo 4 caracteres) en este primer ingreso.');
      var pwEl0 = document.getElementById('login-password');
      if (pwEl0) pwEl0.focus();
      return;
    }
    var enc0;
    try { enc0 = btoa(password); } catch(e) { enc0 = password; }
    try {
      DB.setCompany(foundCompanyId);
      DB.update('users', foundUser.id, { password: enc0 });
      foundUser.password = enc0;
    } catch(e) {}
    if (typeof toast === 'function') toast('Contraseña establecida para esta cuenta', 'success');
  }

  window.APP_STATE.activeCompany = foundCompanyId;
  try { localStorage.setItem('erp_active_company', foundCompanyId); } catch(e) {}
  var remEl = document.getElementById('login-remember');
  completeLogin(foundUser.id, !!(remEl && remEl.checked));

  // Migración gradual a Supabase Auth: si esta cuenta todavía entra por login
  // local, la provisionamos en Auth con la misma contraseña. Es el requisito para
  // la seguridad server-side (RLS): a futuro autentica de verdad y sus escrituras
  // salen con JWT (hoy, sin sesión, la nube las rechaza y quedan solo locales).
  if (!supaUnavailable && _SUPA.online && password) {
    _provisionSupaAuth(email, password, foundUser, foundCompanyId);
  }
}

// Crea (o reconcilia) la cuenta de Supabase Auth de un usuario que venía entrando
// por login local, en segundo plano y sin bloquear. Al obtener sesión: siembra su
// membresía y recarga con JWT para que las escrituras salgan autenticadas.
function _provisionSupaAuth(email, password, dbUser, companyId) {
  try {
    var meta = { company_id: companyId, role: (dbUser && dbUser.role) || 'viewer', name: (dbUser && dbUser.name) || '' };
    function _adopt(session) {
      if (!session) return;
      _SUPA.session = session;
      _SUPA.selfMembership();
      try { DB.load(); } catch(e) {}   // repull con JWT (escrituras autenticadas)
    }
    function _trySignIn() {
      _SUPA.signIn(email, password).then(function(r2) {
        if (r2 && r2.data && r2.data.session) _adopt(r2.data.session);
      }).catch(function() {});
    }
    _SUPA.signUp(email, password, meta).then(function(res) {
      if (res && res.data && res.data.session) _adopt(res.data.session);  // confirmación off
      else _trySignIn();   // ya existía, o quedó pendiente de confirmar por email
    }).catch(function() { _trySignIn(); });
  } catch(e) {}
}

function completeLogin(uid, remember) {
  sessionSet(uid, remember);
  // Prefer user already set in APP_STATE (e.g. from Supabase metadata) over DB lookup
  var dbUser = DB.getById('users', uid);
  if (dbUser) {
    window.APP_STATE.currentUser = dbUser;
    try { DB.update('users', uid, { last_login: new Date().toISOString() }); } catch(e) {}
  }
  var user = window.APP_STATE.currentUser;
  if (!user) { showLoginScreen(); return; }

  // Reset login button (in case it was busy)
  var btn = document.querySelector('#login-screen button[onclick="doLogin()"]');
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar'; }

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
  _SUPA.signOut().catch(function() {});
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
    // Also update in Supabase Auth (if authenticated via JWT)
    if (_SUPA.session) {
      _SUPA.updatePassword(pwNew).then(function(res) {
        if (res && res.error) console.warn('[Auth] updatePassword:', res.error.message);
      }).catch(function() {});
    }
  }
  DB.update('users', user.id, update);
  var updated = DB.getById('users', user.id) || window.APP_STATE.currentUser;
  window.APP_STATE.currentUser = updated;
  updateSidebarUserInfo();
  toast('Perfil actualizado correctamente', 'success');
  closeModal();
}
