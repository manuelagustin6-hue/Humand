/* ===== RRHH — RECURSOS HUMANOS BÁSICO ===== */

const RRHH_CATEGORIES = ['Oficial','Medio Oficial','Ayudante','Capataz','Jefe de Obra','Especialista','Operador de Equipos','Administrativo','Otro'];

const RRHH_SUSS_DEF = {
  emp_jubilacion: 11, emp_obra_social: 3, emp_ley19032: 3,
  pat_jubilacion: 12.71, pat_obra_social: 6, pat_ley19032: 1.62,
  pat_art: 2.5, pat_fondo_empleo: 1.5,
};

function rrhhSussRates() {
  try {
    const cfg = DB.getAll('rrhhConfig');
    if (cfg.length) return Object.assign({}, RRHH_SUSS_DEF, cfg[0]);
  } catch(e) {}
  return Object.assign({}, RRHH_SUSS_DEF);
}

function rrhhCalcDeductions(gross) {
  const r = rrhhSussRates();
  const empPct = r.emp_jubilacion + r.emp_obra_social + r.emp_ley19032;
  const patPct = r.pat_jubilacion + r.pat_obra_social + r.pat_ley19032 + r.pat_art + r.pat_fondo_empleo;
  return {
    emp_total_pct: empPct,
    pat_total_pct: patPct,
    emp_deduction: gross * empPct / 100,
    pat_contribution: gross * patPct / 100,
    net: gross * (1 - empPct / 100),
  };
}

function renderRRHH() {
  const employees = DB.getAll('rrhhEmployees');
  const active = employees.filter(e => e.active !== false);
  const records = DB.getAll('rrhhTimeRecords');
  const payrolls = DB.getAll('rrhhPayroll');
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);

  const presentToday = [...new Set(records.filter(r => r.date === today).map(r => r.employee_id))].length;
  const totalNeto = payrolls.filter(p => p.period === thisMonth).reduce((s, p) => s + (p.net_pay || 0), 0);

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Recursos Humanos</div>
    <div class="page-subtitle">Empleados, asistencia y liquidación de haberes</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="rrhhExportPayroll()"><i class="fas fa-download"></i> Exportar</button>
    <button class="btn btn-primary" onclick="openEmployeeForm()"><i class="fas fa-plus"></i> Nuevo Empleado</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-users"></i></div><div>
    <div class="stat-value">${employees.length}</div><div class="stat-label">Total Empleados</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-user-check"></i></div><div>
    <div class="stat-value">${active.length}</div><div class="stat-label">Activos</div></div></div>
  <div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-fingerprint"></i></div><div>
    <div class="stat-value">${presentToday}</div><div class="stat-label">Presentes Hoy</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-money-bill-wave"></i></div><div>
    <div class="stat-value">${fmtMoney(totalNeto)}</div><div class="stat-label">Neto ${thisMonth}</div></div></div>
</div>

<div id="rrhh-tabs">
  <div class="tabs">
    <button class="tab-btn" data-tab="tab-rrhh-emp">Empleados</button>
    <button class="tab-btn" data-tab="tab-rrhh-asist">Asistencia</button>
    <button class="tab-btn" data-tab="tab-rrhh-liq">Liquidaciones</button>
    <button class="tab-btn" data-tab="tab-rrhh-suss">SUSS / Cargas Sociales</button>
  </div>

  <div id="tab-rrhh-emp" class="tab-content">
    <div class="filter-bar mt-2">
      <div class="search-input-wrap"><i class="fas fa-search"></i>
        <input type="text" placeholder="Buscar empleado, CUIL, legajo..." oninput="rrhhFilterEmp(this.value)">
      </div>
      <select class="form-control" style="width:180px" onchange="rrhhFilterEmp(undefined,this.value)">
        <option value="">Todas las categorías</option>
        ${RRHH_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
      <select class="form-control" style="width:130px" onchange="rrhhFilterEmp(undefined,undefined,this.value)">
        <option value="">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
      </select>
    </div>
    <div class="card mt-1"><div class="card-body" style="padding:0">
      <div class="table-wrap" id="rrhh-emp-table">${rrhhBuildEmpTable(employees)}</div>
    </div></div>
  </div>

  <div id="tab-rrhh-asist" class="tab-content">
    <div class="filter-bar mt-2" style="justify-content:space-between">
      <div style="display:flex;gap:8px;align-items:center">
        <input type="month" class="form-control" style="width:170px" id="rrhh-asist-month" value="${thisMonth}" onchange="rrhhRenderAttendance()">
        <select class="form-control" style="width:190px" id="rrhh-asist-emp" onchange="rrhhRenderAttendance()">
          <option value="">Todos los empleados</option>
          ${employees.filter(e=>e.active!==false).map(e=>`<option value="${e.id}">${e.name}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openAttendanceForm()"><i class="fas fa-plus"></i> Registrar Asistencia</button>
    </div>
    <div id="rrhh-asist-content">${rrhhBuildAttendanceContent(records, employees, thisMonth, '')}</div>
  </div>

  <div id="tab-rrhh-liq" class="tab-content">
    <div class="filter-bar mt-2" style="justify-content:space-between">
      <input type="month" class="form-control" style="width:170px" id="rrhh-liq-period" value="${thisMonth}" onchange="rrhhRenderPayroll()">
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="rrhhAutoPayroll()"><i class="fas fa-magic"></i> Liquidar Período</button>
        <button class="btn btn-primary btn-sm" onclick="openPayrollForm()"><i class="fas fa-plus"></i> Nueva Liquidación</button>
      </div>
    </div>
    <div id="rrhh-liq-content">${rrhhBuildPayrollContent(payrolls, employees, thisMonth)}</div>
  </div>

  <div id="tab-rrhh-suss" class="tab-content">
    <div class="filter-bar mt-2">
      <input type="month" class="form-control" style="width:170px" id="rrhh-suss-period" value="${thisMonth}" onchange="rrhhRenderSuss()">
      <button class="btn btn-secondary btn-sm" onclick="rrhhExportSuss()"><i class="fas fa-download"></i> Exportar SUSS</button>
    </div>
    <div id="rrhh-suss-content">${rrhhBuildSussContent(payrolls, employees, thisMonth)}</div>
  </div>
</div>
`;

  initTabs('rrhh-tabs');
  window._rrhhEmpFilters = { q: '', category: '', status: '' };
}

// ---- EMPLOYEES ----

function rrhhBuildEmpTable(employees) {
  if (!employees.length) return `<div class="empty-state"><i class="fas fa-users"></i><p>No hay empleados. Agregá el primero.</p></div>`;
  return `<table><thead><tr>
    <th>Legajo</th><th>Nombre</th><th>CUIL</th><th>Categoría</th><th>Cargo</th>
    <th>Jornal / Sueldo</th><th>Tipo</th><th>Ingreso</th><th>Estado</th><th>Acciones</th>
  </tr></thead><tbody>
  ${employees.sort((a,b)=>a.name.localeCompare(b.name)).map(e => `<tr>
    <td><strong>${e.legajo||'-'}</strong></td>
    <td>${e.name}</td>
    <td style="font-size:12px">${e.cuil||'-'}</td>
    <td><span class="badge badge-blue">${e.category||'-'}</span></td>
    <td>${e.position||'-'}</td>
    <td><strong>${fmtMoney(e.base_salary||0)}</strong></td>
    <td><span class="badge badge-gray">${e.salary_type==='mensual'?'Mensual':'Jornal'}</span></td>
    <td>${e.date_hired?fmtDate(e.date_hired):'-'}</td>
    <td>${e.active!==false?'<span class="badge badge-green">Activo</span>':'<span class="badge badge-gray">Inactivo</span>'}</td>
    <td><div class="table-actions">
      <button class="btn btn-ghost btn-sm" onclick="openEmployeeForm('${e.id}')"><i class="fas fa-edit"></i></button>
      <button class="btn btn-ghost btn-sm" title="Registrar asistencia" onclick="openAttendanceForm('${e.id}')"><i class="fas fa-clock"></i></button>
      <button class="btn btn-ghost btn-sm danger" onclick="deleteEmployee('${e.id}')"><i class="fas fa-trash"></i></button>
    </div></td>
  </tr>`).join('')}
  </tbody></table>`;
}

window._rrhhEmpFilters = { q: '', category: '', status: '' };
function rrhhFilterEmp(q, category, status) {
  if (q !== undefined) window._rrhhEmpFilters.q = q.toLowerCase();
  if (category !== undefined) window._rrhhEmpFilters.category = category;
  if (status !== undefined) window._rrhhEmpFilters.status = status;
  const f = window._rrhhEmpFilters;
  let employees = DB.getAll('rrhhEmployees');
  if (f.q) employees = employees.filter(e =>
    e.name.toLowerCase().includes(f.q) || (e.cuil||'').includes(f.q) || (e.legajo||'').toLowerCase().includes(f.q));
  if (f.category) employees = employees.filter(e => e.category === f.category);
  if (f.status === 'active') employees = employees.filter(e => e.active !== false);
  if (f.status === 'inactive') employees = employees.filter(e => e.active === false);
  const t = document.getElementById('rrhh-emp-table');
  if (t) t.innerHTML = rrhhBuildEmpTable(employees);
}

function openEmployeeForm(id = null) {
  const e = id ? DB.getById('rrhhEmployees', id) : null;
  const projects = DB.getAll('projects').filter(p => p.status === 'active' || p.status === 'planning');

  openModal(e ? 'Editar Empleado' : 'Nuevo Empleado', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Nombre y Apellido *</label>
    <input class="form-control" id="emp-name" value="${e?.name||''}" placeholder="Apellido, Nombre">
  </div>
  <div class="form-group">
    <label class="form-label">Legajo</label>
    <input class="form-control" id="emp-legajo" value="${e?.legajo||''}" placeholder="001">
  </div>
  <div class="form-group">
    <label class="form-label">CUIL</label>
    <input class="form-control" id="emp-cuil" value="${e?.cuil||''}" placeholder="20-12345678-9">
  </div>
  <div class="form-group">
    <label class="form-label">DNI</label>
    <input class="form-control" id="emp-dni" value="${e?.dni||''}" placeholder="12345678">
  </div>
  <div class="form-group">
    <label class="form-label">Categoría *</label>
    <select class="form-control" id="emp-cat">
      ${RRHH_CATEGORIES.map(c => `<option value="${c}" ${e?.category===c?'selected':''}>${c}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Cargo / Función</label>
    <input class="form-control" id="emp-position" value="${e?.position||''}" placeholder="Ej: Encargado de obra">
  </div>
  <div class="form-group">
    <label class="form-label">Tipo de Remuneración</label>
    <select class="form-control" id="emp-sal-type" onchange="empToggleSalLabel(this.value)">
      <option value="jornal" ${e?.salary_type!=='mensual'?'selected':''}>Jornal diario</option>
      <option value="mensual" ${e?.salary_type==='mensual'?'selected':''}>Sueldo mensual</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label" id="emp-sal-label">${e?.salary_type==='mensual'?'Sueldo Mensual Bruto *':'Jornal Diario Bruto *'}</label>
    <input class="form-control" type="number" id="emp-salary" value="${e?.base_salary||''}" step="0.01" min="0" placeholder="0.00">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha de Ingreso</label>
    <input class="form-control" type="date" id="emp-hired" value="${e?.date_hired||''}">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha de Egreso</label>
    <input class="form-control" type="date" id="emp-left" value="${e?.date_terminated||''}">
  </div>
  <div class="form-group">
    <label class="form-label">Proyecto Principal</label>
    <select class="form-control" id="emp-project">
      <option value="">Sin asignar</option>
      ${projects.map(p => `<option value="${p.id}" ${e?.project_id===p.id?'selected':''}>${p.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Estado</label>
    <select class="form-control" id="emp-active">
      <option value="true" ${e?.active!==false?'selected':''}>Activo</option>
      <option value="false" ${e?.active===false?'selected':''}>Inactivo</option>
    </select>
  </div>
  <div class="form-group full">
    <label class="form-label">Domicilio</label>
    <input class="form-control" id="emp-address" value="${e?.address||''}" placeholder="Calle, número, ciudad">
  </div>
  <div class="form-group">
    <label class="form-label">Teléfono</label>
    <input class="form-control" id="emp-phone" value="${e?.phone||''}" placeholder="+54 9 ...">
  </div>
  <div class="form-group">
    <label class="form-label">Email</label>
    <input class="form-control" type="email" id="emp-email" value="${e?.email||''}" placeholder="empleado@empresa.com">
  </div>
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveEmployee('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
}

function empToggleSalLabel(v) {
  const lbl = document.getElementById('emp-sal-label');
  if (lbl) lbl.textContent = v === 'mensual' ? 'Sueldo Mensual Bruto *' : 'Jornal Diario Bruto *';
}

function saveEmployee(id) {
  const name = document.getElementById('emp-name').value.trim();
  const category = document.getElementById('emp-cat').value;
  if (!name || !category) { toast('Nombre y categoría son obligatorios', 'error'); return; }
  const data = {
    name, category,
    legajo: document.getElementById('emp-legajo').value.trim(),
    cuil: document.getElementById('emp-cuil').value.trim(),
    dni: document.getElementById('emp-dni').value.trim(),
    position: document.getElementById('emp-position').value.trim(),
    salary_type: document.getElementById('emp-sal-type').value,
    base_salary: parseFloat(document.getElementById('emp-salary').value) || 0,
    date_hired: document.getElementById('emp-hired').value || null,
    date_terminated: document.getElementById('emp-left').value || null,
    project_id: document.getElementById('emp-project').value || null,
    active: document.getElementById('emp-active').value === 'true',
    address: document.getElementById('emp-address').value.trim(),
    phone: document.getElementById('emp-phone').value.trim(),
    email: document.getElementById('emp-email').value.trim(),
  };
  if (id) { DB.update('rrhhEmployees', id, data); toast('Empleado actualizado', 'success'); }
  else { DB.insert('rrhhEmployees', data); toast('Empleado creado', 'success'); }
  closeModal(); renderRRHH();
}

function deleteEmployee(id) {
  confirmDialog('¿Eliminar este empleado? Se borrarán sus registros de asistencia y liquidaciones.', () => {
    DB.remove('rrhhEmployees', id);
    DB.getAll('rrhhTimeRecords').filter(r => r.employee_id === id).forEach(r => DB.remove('rrhhTimeRecords', r.id));
    DB.getAll('rrhhPayroll').filter(p => p.employee_id === id).forEach(p => DB.remove('rrhhPayroll', p.id));
    toast('Empleado eliminado', 'warning'); renderRRHH();
  });
}

// ---- ATTENDANCE ----

function rrhhBuildAttendanceContent(records, employees, month, empId) {
  const empMap = {};
  employees.forEach(e => empMap[e.id] = e);
  let filtered = records.filter(r => r.date && r.date.startsWith(month));
  if (empId) filtered = filtered.filter(r => r.employee_id === empId);
  filtered.sort((a, b) => b.date.localeCompare(a.date));

  if (!filtered.length) return `<div class="empty-state mt-2"><i class="fas fa-clock"></i><p>Sin registros para el período seleccionado.</p></div>`;

  const summary = {};
  filtered.forEach(r => {
    if (!summary[r.employee_id]) summary[r.employee_id] = { days: 0, h_reg: 0, h_50: 0, h_100: 0 };
    summary[r.employee_id].days++;
    summary[r.employee_id].h_reg += r.hours_regular || 0;
    summary[r.employee_id].h_50 += r.hours_extra_50 || 0;
    summary[r.employee_id].h_100 += r.hours_extra_100 || 0;
  });

  const summaryHtml = !empId ? `
  <div class="card mb-2"><div class="card-header">
    <span class="card-title"><i class="fas fa-calendar-check text-primary"></i> Resumen ${month}</span>
  </div><div class="card-body" style="padding:0"><div class="table-wrap">
    <table><thead><tr><th>Empleado</th><th>Categoría</th><th>Días</th><th>Hs. Normales</th><th>Hs. Extra 50%</th><th>Hs. Extra 100%</th></tr></thead><tbody>
    ${Object.entries(summary).map(([eid, s]) => {
      const emp = empMap[eid];
      return `<tr>
        <td>${emp?emp.name:eid}</td>
        <td>${emp?`<span class="badge badge-blue">${emp.category}</span>`:'-'}</td>
        <td><strong>${s.days}</strong></td>
        <td>${fmtNum(s.h_reg)}h</td>
        <td>${s.h_50?fmtNum(s.h_50)+'h':'-'}</td>
        <td>${s.h_100?fmtNum(s.h_100)+'h':'-'}</td>
      </tr>`;
    }).join('')}
    </tbody></table>
  </div></div></div>` : '';

  return summaryHtml + `
  <div class="card"><div class="card-header">
    <span class="card-title"><i class="fas fa-list text-primary"></i> Registros</span>
    <span class="badge badge-blue">${filtered.length}</span>
  </div><div class="card-body" style="padding:0"><div class="table-wrap">
    <table><thead><tr>
      <th>Fecha</th><th>Empleado</th><th>Proyecto</th>
      <th>Hs. Norm.</th><th>Hs. 50%</th><th>Hs. 100%</th><th>Notas</th><th>Acciones</th>
    </tr></thead><tbody>
    ${filtered.map(r => {
      const emp = empMap[r.employee_id];
      const proj = r.project_id ? DB.getById('projects', r.project_id) : null;
      return `<tr>
        <td>${fmtDate(r.date)}</td>
        <td>${emp?emp.name:'-'}</td>
        <td>${proj?`<span class="badge badge-blue">${proj.name}</span>`:'<span style="color:var(--border)">—</span>'}</td>
        <td>${fmtNum(r.hours_regular||0)}h</td>
        <td>${r.hours_extra_50?fmtNum(r.hours_extra_50)+'h':'-'}</td>
        <td>${r.hours_extra_100?fmtNum(r.hours_extra_100)+'h':'-'}</td>
        <td style="font-size:12px">${r.notes||'-'}</td>
        <td><div class="table-actions">
          <button class="btn btn-ghost btn-sm" onclick="openAttendanceForm(null,null,'${r.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-ghost btn-sm danger" onclick="deleteAttendance('${r.id}')"><i class="fas fa-trash"></i></button>
        </div></td>
      </tr>`;
    }).join('')}
    </tbody></table>
  </div></div></div>`;
}

function rrhhRenderAttendance() {
  const month = document.getElementById('rrhh-asist-month')?.value || new Date().toISOString().slice(0,7);
  const empId = document.getElementById('rrhh-asist-emp')?.value || '';
  const el = document.getElementById('rrhh-asist-content');
  if (el) el.innerHTML = rrhhBuildAttendanceContent(DB.getAll('rrhhTimeRecords'), DB.getAll('rrhhEmployees'), month, empId);
}

function openAttendanceForm(presetEmpId = null, presetDate = null, editId = null) {
  const r = editId ? DB.getById('rrhhTimeRecords', editId) : null;
  const employees = DB.getAll('rrhhEmployees').filter(e => e.active !== false);
  const projects = DB.getAll('projects').filter(p => p.status === 'active' || p.status === 'planning');
  const today = new Date().toISOString().split('T')[0];

  openModal(r ? 'Editar Registro' : 'Registrar Asistencia', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Fecha *</label>
    <input class="form-control" type="date" id="att-date" value="${r?.date||presetDate||today}">
  </div>
  <div class="form-group">
    <label class="form-label">Empleado *</label>
    <select class="form-control" id="att-emp">
      <option value="">— Seleccionar —</option>
      ${employees.map(e => `<option value="${e.id}" ${(r?.employee_id||presetEmpId)===e.id?'selected':''}>${e.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Proyecto</label>
    <select class="form-control" id="att-project">
      <option value="">Sin proyecto</option>
      ${projects.map(p => `<option value="${p.id}" ${r?.project_id===p.id?'selected':''}>${p.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Horas Normales</label>
    <input class="form-control" type="number" id="att-h-reg" value="${r?.hours_regular??8}" step="0.5" min="0">
  </div>
  <div class="form-group">
    <label class="form-label">Hs. Extra al 50%</label>
    <input class="form-control" type="number" id="att-h-50" value="${r?.hours_extra_50||''}" step="0.5" min="0" placeholder="0">
  </div>
  <div class="form-group">
    <label class="form-label">Hs. Extra al 100%</label>
    <input class="form-control" type="number" id="att-h-100" value="${r?.hours_extra_100||''}" step="0.5" min="0" placeholder="0">
  </div>
  <div class="form-group full">
    <label class="form-label">Notas</label>
    <input class="form-control" id="att-notes" value="${r?.notes||''}" placeholder="Ej: feriado trabajado, ausencia justificada...">
  </div>
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveAttendance('${editId||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
}

function saveAttendance(id) {
  const date = document.getElementById('att-date').value;
  const employee_id = document.getElementById('att-emp').value;
  if (!date || !employee_id) { toast('Fecha y empleado son obligatorios', 'error'); return; }
  const data = {
    date, employee_id,
    project_id: document.getElementById('att-project').value || null,
    hours_regular: parseFloat(document.getElementById('att-h-reg').value) || 8,
    hours_extra_50: parseFloat(document.getElementById('att-h-50').value) || 0,
    hours_extra_100: parseFloat(document.getElementById('att-h-100').value) || 0,
    notes: document.getElementById('att-notes').value.trim(),
  };
  if (id) { DB.update('rrhhTimeRecords', id, data); toast('Registro actualizado', 'success'); }
  else { DB.insert('rrhhTimeRecords', data); toast('Asistencia registrada', 'success'); }
  closeModal(); rrhhRenderAttendance();
}

function deleteAttendance(id) {
  confirmDialog('¿Eliminar este registro de asistencia?', () => {
    DB.remove('rrhhTimeRecords', id);
    toast('Registro eliminado', 'warning'); rrhhRenderAttendance();
  });
}

// ---- PAYROLL ----

function rrhhCalcPayrollForEmployee(emp, period) {
  const records = DB.getAll('rrhhTimeRecords').filter(r => r.employee_id === emp.id && r.date && r.date.startsWith(period));
  const days = records.length;
  const h_reg = records.reduce((s,r) => s+(r.hours_regular||0), 0);
  const h_50 = records.reduce((s,r) => s+(r.hours_extra_50||0), 0);
  const h_100 = records.reduce((s,r) => s+(r.hours_extra_100||0), 0);

  const baseSal = emp.base_salary || 0;
  let gross = 0;
  if (emp.salary_type === 'mensual') {
    gross = days > 0 ? baseSal * days / 22 : baseSal;
    const hourly = baseSal / 192;
    gross += h_50 * hourly * 1.5 + h_100 * hourly * 2;
  } else {
    gross = baseSal * days;
    const hourly = baseSal / 8;
    gross += h_50 * hourly * 0.5 + h_100 * hourly;
  }

  const calc = rrhhCalcDeductions(gross);
  return {
    employee_id: emp.id, period,
    days_worked: days, hours_regular: h_reg, hours_extra_50: h_50, hours_extra_100: h_100,
    gross_pay: Math.round(gross*100)/100,
    emp_deduction: Math.round(calc.emp_deduction*100)/100,
    pat_contribution: Math.round(calc.pat_contribution*100)/100,
    net_pay: Math.round(calc.net*100)/100,
    status: 'draft',
  };
}

function rrhhBuildPayrollContent(payrolls, employees, period) {
  const filtered = payrolls.filter(p => p.period === period);
  const empMap = {};
  employees.forEach(e => empMap[e.id] = e);

  if (!filtered.length) return `<div class="empty-state mt-2"><i class="fas fa-money-bill-wave"></i>
    <p>Sin liquidaciones para ${period}.</p>
    <button class="btn btn-primary mt-1" onclick="rrhhAutoPayroll()"><i class="fas fa-magic"></i> Liquidar desde asistencia</button>
  </div>`;

  const totGross = filtered.reduce((s,p)=>s+(p.gross_pay||0),0);
  const totDed = filtered.reduce((s,p)=>s+(p.emp_deduction||0),0);
  const totPat = filtered.reduce((s,p)=>s+(p.pat_contribution||0),0);
  const totNet = filtered.reduce((s,p)=>s+(p.net_pay||0),0);

  return `
  <div class="stats-grid mt-1 mb-2" style="grid-template-columns:repeat(4,1fr)">
    <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-users"></i></div><div>
      <div class="stat-value">${filtered.length}</div><div class="stat-label">Empleados</div></div></div>
    <div class="stat-card"><div class="stat-icon green"><i class="fas fa-money-bill"></i></div><div>
      <div class="stat-value">${fmtMoney(totGross)}</div><div class="stat-label">Bruto Total</div></div></div>
    <div class="stat-card"><div class="stat-icon red"><i class="fas fa-minus-circle"></i></div><div>
      <div class="stat-value">${fmtMoney(totDed+totPat)}</div><div class="stat-label">Cargas Totales</div></div></div>
    <div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-hand-holding-dollar"></i></div><div>
      <div class="stat-value">${fmtMoney(totNet)}</div><div class="stat-label">Neto a Pagar</div></div></div>
  </div>
  <div class="card"><div class="card-body" style="padding:0"><div class="table-wrap">
    <table><thead><tr>
      <th>Empleado</th><th>Categoría</th><th>Días</th><th>Bruto</th>
      <th>Ret. Empleado</th><th>Carg. Patronal</th><th>Neto</th><th>Estado</th><th>Acciones</th>
    </tr></thead><tbody>
    ${filtered.sort((a,b)=>(empMap[a.employee_id]?.name||'').localeCompare(empMap[b.employee_id]?.name||'')).map(p => {
      const emp = empMap[p.employee_id];
      const confirmed = p.status === 'confirmed';
      return `<tr>
        <td><strong>${emp?.name||'-'}</strong></td>
        <td>${emp?`<span class="badge badge-blue">${emp.category}</span>`:'-'}</td>
        <td>${p.days_worked||0}</td>
        <td>${fmtMoney(p.gross_pay||0)}</td>
        <td style="color:var(--danger-text,#dc3545)">${fmtMoney(p.emp_deduction||0)}</td>
        <td style="color:var(--warning-text,#e59700)">${fmtMoney(p.pat_contribution||0)}</td>
        <td><strong>${fmtMoney(p.net_pay||0)}</strong></td>
        <td>${confirmed?'<span class="badge badge-green">Confirmada</span>':'<span class="badge badge-gray">Borrador</span>'}</td>
        <td><div class="table-actions">
          <button class="btn btn-ghost btn-sm" onclick="viewPayroll('${p.id}')"><i class="fas fa-eye"></i></button>
          ${!confirmed?`<button class="btn btn-ghost btn-sm" title="Confirmar" onclick="confirmPayroll('${p.id}')"><i class="fas fa-check"></i></button>`:''}
          <button class="btn btn-ghost btn-sm" onclick="openPayrollForm('${p.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-ghost btn-sm danger" onclick="deletePayroll('${p.id}')"><i class="fas fa-trash"></i></button>
        </div></td>
      </tr>`;
    }).join('')}
    </tbody></table>
  </div></div></div>`;
}

function rrhhRenderPayroll() {
  const period = document.getElementById('rrhh-liq-period')?.value || new Date().toISOString().slice(0,7);
  const el = document.getElementById('rrhh-liq-content');
  if (el) el.innerHTML = rrhhBuildPayrollContent(DB.getAll('rrhhPayroll'), DB.getAll('rrhhEmployees'), period);
}

function rrhhAutoPayroll() {
  const period = document.getElementById('rrhh-liq-period')?.value || new Date().toISOString().slice(0,7);
  const employees = DB.getAll('rrhhEmployees').filter(e => e.active !== false);
  const existingEmpIds = new Set(DB.getAll('rrhhPayroll').filter(p => p.period === period).map(p => p.employee_id));
  let created = 0;
  employees.forEach(emp => {
    if (existingEmpIds.has(emp.id)) return;
    const calc = rrhhCalcPayrollForEmployee(emp, period);
    if (calc && calc.days_worked > 0) { DB.insert('rrhhPayroll', calc); created++; }
  });
  if (!created) { toast('Sin asistencias nuevas para liquidar en este período', 'warning'); }
  else { toast(`${created} liquidación(es) generada(s)`, 'success'); }
  rrhhRenderPayroll();
}

function openPayrollForm(id = null) {
  const p = id ? DB.getById('rrhhPayroll', id) : null;
  const employees = DB.getAll('rrhhEmployees').filter(e => e.active !== false);
  const period = document.getElementById('rrhh-liq-period')?.value || new Date().toISOString().slice(0,7);

  openModal(p ? 'Editar Liquidación' : 'Nueva Liquidación Manual', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Período *</label>
    <input class="form-control" type="month" id="pay-period" value="${p?.period||period}">
  </div>
  <div class="form-group">
    <label class="form-label">Empleado *</label>
    <select class="form-control" id="pay-emp" onchange="payAutoCalc()">
      <option value="">— Seleccionar —</option>
      ${employees.map(e=>`<option value="${e.id}" ${p?.employee_id===e.id?'selected':''}>${e.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Días Trabajados</label>
    <input class="form-control" type="number" id="pay-days" value="${p?.days_worked||0}" min="0" oninput="payAutoCalc()">
  </div>
  <div class="form-group">
    <label class="form-label">Sueldo Bruto *</label>
    <input class="form-control" type="number" id="pay-gross" value="${p?.gross_pay||''}" step="0.01" min="0" oninput="payCalcFromGross()">
  </div>
  <div class="form-group">
    <label class="form-label">Retenciones Empleado</label>
    <input class="form-control" type="number" id="pay-ded" value="${p?.emp_deduction||''}" step="0.01" min="0" oninput="payCalcNet()">
  </div>
  <div class="form-group">
    <label class="form-label">Cargas Patronales</label>
    <input class="form-control" type="number" id="pay-pat" value="${p?.pat_contribution||''}" step="0.01" min="0">
  </div>
  <div class="form-group">
    <label class="form-label">Neto a Cobrar</label>
    <input class="form-control" type="number" id="pay-net" value="${p?.net_pay||''}" step="0.01" min="0">
  </div>
  <div class="form-group">
    <label class="form-label">Estado</label>
    <select class="form-control" id="pay-status">
      <option value="draft" ${p?.status!=='confirmed'?'selected':''}>Borrador</option>
      <option value="confirmed" ${p?.status==='confirmed'?'selected':''}>Confirmada</option>
    </select>
  </div>
</div>
<small style="color:var(--text-muted)">Tasas SUSS por defecto: 17% retenciones empleado / ~25.83% cargas patronales.</small>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="savePayroll('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
}

function payAutoCalc() {
  const empId = document.getElementById('pay-emp')?.value;
  if (!empId) return;
  const emp = DB.getById('rrhhEmployees', empId);
  if (!emp) return;
  const days = parseInt(document.getElementById('pay-days')?.value) || 0;
  let gross = emp.salary_type === 'mensual' ? (days > 0 ? emp.base_salary*days/22 : emp.base_salary) : emp.base_salary*days;
  const calc = rrhhCalcDeductions(gross);
  const g = document.getElementById('pay-gross'); if(g) g.value = gross.toFixed(2);
  const d = document.getElementById('pay-ded'); if(d) d.value = calc.emp_deduction.toFixed(2);
  const pt = document.getElementById('pay-pat'); if(pt) pt.value = calc.pat_contribution.toFixed(2);
  const n = document.getElementById('pay-net'); if(n) n.value = calc.net.toFixed(2);
}

function payCalcFromGross() {
  const gross = parseFloat(document.getElementById('pay-gross')?.value) || 0;
  const calc = rrhhCalcDeductions(gross);
  const d = document.getElementById('pay-ded'); if(d) d.value = calc.emp_deduction.toFixed(2);
  const pt = document.getElementById('pay-pat'); if(pt) pt.value = calc.pat_contribution.toFixed(2);
  const n = document.getElementById('pay-net'); if(n) n.value = calc.net.toFixed(2);
}

function payCalcNet() {
  const gross = parseFloat(document.getElementById('pay-gross')?.value) || 0;
  const ded = parseFloat(document.getElementById('pay-ded')?.value) || 0;
  const n = document.getElementById('pay-net'); if(n) n.value = (gross - ded).toFixed(2);
}

function savePayroll(id) {
  const employee_id = document.getElementById('pay-emp').value;
  const period = document.getElementById('pay-period').value;
  if (!employee_id || !period) { toast('Empleado y período son obligatorios', 'error'); return; }
  const data = {
    employee_id, period,
    days_worked: parseInt(document.getElementById('pay-days').value) || 0,
    gross_pay: parseFloat(document.getElementById('pay-gross').value) || 0,
    emp_deduction: parseFloat(document.getElementById('pay-ded').value) || 0,
    pat_contribution: parseFloat(document.getElementById('pay-pat').value) || 0,
    net_pay: parseFloat(document.getElementById('pay-net').value) || 0,
    status: document.getElementById('pay-status').value,
  };
  if (id) { DB.update('rrhhPayroll', id, data); toast('Liquidación actualizada', 'success'); }
  else { DB.insert('rrhhPayroll', data); toast('Liquidación creada', 'success'); }
  closeModal(); rrhhRenderPayroll();
}

function viewPayroll(id) {
  const p = DB.getById('rrhhPayroll', id);
  if (!p) return;
  const emp = DB.getById('rrhhEmployees', p.employee_id);
  const r = rrhhSussRates();
  const gr = p.gross_pay || 0;

  openModal(`Recibo — ${emp?.name||'?'} — ${p.period}`, `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:13px">
  <div>
    <h4 style="margin-bottom:8px;font-size:14px">Haberes</h4>
    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)">
      <span>Sueldo / Jornal bruto</span><strong>${fmtMoney(gr)}</strong></div>
    <h4 style="margin:12px 0 8px;font-size:14px">Descuentos Empleado</h4>
    <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Jubilación (${r.emp_jubilacion}%)</span><span>${fmtMoney(gr*r.emp_jubilacion/100)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Obra Social (${r.emp_obra_social}%)</span><span>${fmtMoney(gr*r.emp_obra_social/100)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Ley 19032/PAMI (${r.emp_ley19032}%)</span><span>${fmtMoney(gr*r.emp_ley19032/100)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-top:2px solid var(--border);font-weight:bold">
      <span>Total descuentos</span><span style="color:var(--danger-text,#dc3545)">${fmtMoney(p.emp_deduction||0)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:16px;font-weight:bold">
      <span>NETO A COBRAR</span><span style="color:var(--success-text,#28a745)">${fmtMoney(p.net_pay||0)}</span></div>
  </div>
  <div>
    <h4 style="margin-bottom:8px;font-size:14px">Cargas Patronales</h4>
    <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Jubilación (${r.pat_jubilacion}%)</span><span>${fmtMoney(gr*r.pat_jubilacion/100)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Obra Social (${r.pat_obra_social}%)</span><span>${fmtMoney(gr*r.pat_obra_social/100)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Ley 19032/PAMI (${r.pat_ley19032}%)</span><span>${fmtMoney(gr*r.pat_ley19032/100)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:3px 0"><span>ART (${r.pat_art}%)</span><span>${fmtMoney(gr*r.pat_art/100)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Fondo Empleo (${r.pat_fondo_empleo}%)</span><span>${fmtMoney(gr*r.pat_fondo_empleo/100)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-top:2px solid var(--border);font-weight:bold">
      <span>Total patronal</span><span style="color:var(--warning-text,#e59700)">${fmtMoney(p.pat_contribution||0)}</span></div>
    <div style="margin-top:12px;padding:10px;background:var(--bg-subtle,#f8f9fa);border-radius:6px">
      <div style="display:flex;justify-content:space-between"><span>Costo total empleador</span><strong>${fmtMoney(gr+(p.pat_contribution||0))}</strong></div>
    </div>
  </div>
</div>
<p style="font-size:11px;color:var(--text-muted);margin-top:10px">
  Período: ${p.period} | Días: ${p.days_worked||0} | Estado: ${p.status==='confirmed'?'Confirmada':'Borrador'}
</p>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
${p.status!=='confirmed'?`<button class="btn btn-success" onclick="confirmPayroll('${id}')"><i class="fas fa-check"></i> Confirmar</button>`:''}
`);
}

function confirmPayroll(id) {
  DB.update('rrhhPayroll', id, { status: 'confirmed' });
  toast('Liquidación confirmada', 'success');
  closeModal(); rrhhRenderPayroll();
}

function deletePayroll(id) {
  confirmDialog('¿Eliminar esta liquidación?', () => {
    DB.remove('rrhhPayroll', id);
    toast('Liquidación eliminada', 'warning'); rrhhRenderPayroll();
  });
}

// ---- SUSS ----

function rrhhBuildSussContent(payrolls, employees, period) {
  const filtered = payrolls.filter(p => p.period === period);
  if (!filtered.length) return `<div class="empty-state mt-2"><i class="fas fa-file-invoice-dollar"></i>
    <p>Sin liquidaciones para ${period}. Generá las liquidaciones del período primero.</p></div>`;

  const empMap = {};
  employees.forEach(e => empMap[e.id] = e);
  const r = rrhhSussRates();

  const totGross = filtered.reduce((s,p)=>s+(p.gross_pay||0),0);
  const totEmp = filtered.reduce((s,p)=>s+(p.emp_deduction||0),0);
  const totPat = filtered.reduce((s,p)=>s+(p.pat_contribution||0),0);

  return `
  <div class="stats-grid mt-1 mb-2" style="grid-template-columns:repeat(3,1fr)">
    <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-money-bill"></i></div><div>
      <div class="stat-value">${fmtMoney(totGross)}</div><div class="stat-label">Masa Salarial Bruta</div></div></div>
    <div class="stat-card"><div class="stat-icon red"><i class="fas fa-minus-circle"></i></div><div>
      <div class="stat-value">${fmtMoney(totEmp)}</div><div class="stat-label">Aportes Empleados</div></div></div>
    <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-building"></i></div><div>
      <div class="stat-value">${fmtMoney(totPat)}</div><div class="stat-label">Contribuciones Patronales</div></div></div>
  </div>

  <div class="card mb-2"><div class="card-header">
    <span class="card-title"><i class="fas fa-percent text-primary"></i> Alícuotas SUSS Aplicadas</span>
  </div><div class="card-body">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;font-size:13px">
      <div>
        <h5 style="margin-bottom:8px">Aportes del Empleado</h5>
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Jubilación</span><strong>${r.emp_jubilacion}%</strong></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Obra Social</span><strong>${r.emp_obra_social}%</strong></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Ley 19032 (PAMI)</span><strong>${r.emp_ley19032}%</strong></div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-top:1px solid var(--border);font-weight:bold">
          <span>Total</span><span>${r.emp_jubilacion+r.emp_obra_social+r.emp_ley19032}%</span></div>
      </div>
      <div>
        <h5 style="margin-bottom:8px">Contribuciones Patronales</h5>
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Jubilación</span><strong>${r.pat_jubilacion}%</strong></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Obra Social</span><strong>${r.pat_obra_social}%</strong></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Ley 19032 (PAMI)</span><strong>${r.pat_ley19032}%</strong></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span>ART</span><strong>${r.pat_art}%</strong></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Fondo de Empleo</span><strong>${r.pat_fondo_empleo}%</strong></div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-top:1px solid var(--border);font-weight:bold">
          <span>Total</span><span>${(r.pat_jubilacion+r.pat_obra_social+r.pat_ley19032+r.pat_art+r.pat_fondo_empleo).toFixed(2)}%</span></div>
      </div>
    </div>
  </div></div>

  <div class="card"><div class="card-header">
    <span class="card-title"><i class="fas fa-table text-primary"></i> Detalle SUSS por Empleado — ${period}</span>
  </div><div class="card-body" style="padding:0"><div class="table-wrap">
    <table><thead><tr>
      <th>Empleado</th><th>CUIL</th><th>Categoría</th><th>Bruto</th>
      <th>Ap. Jubilación</th><th>Ap. Obra Social</th><th>Ap. PAMI</th>
      <th>Tot. Aportes</th><th>Tot. Contribuciones</th><th>Costo Empleador</th>
    </tr></thead><tbody>
    ${filtered.map(p => {
      const emp = empMap[p.employee_id];
      const gr = p.gross_pay||0;
      return `<tr>
        <td><strong>${emp?.name||'-'}</strong></td>
        <td style="font-size:12px">${emp?.cuil||'-'}</td>
        <td>${emp?`<span class="badge badge-blue">${emp.category}</span>`:'-'}</td>
        <td>${fmtMoney(gr)}</td>
        <td>${fmtMoney(gr*r.emp_jubilacion/100)}</td>
        <td>${fmtMoney(gr*r.emp_obra_social/100)}</td>
        <td>${fmtMoney(gr*r.emp_ley19032/100)}</td>
        <td style="color:var(--danger-text,#dc3545)">${fmtMoney(p.emp_deduction||0)}</td>
        <td style="color:var(--warning-text,#e59700)">${fmtMoney(p.pat_contribution||0)}</td>
        <td><strong>${fmtMoney(gr+(p.pat_contribution||0))}</strong></td>
      </tr>`;
    }).join('')}
    <tr style="font-weight:bold;border-top:2px solid var(--border);background:var(--bg-subtle,#f8f9fa)">
      <td colspan="3">TOTALES</td>
      <td>${fmtMoney(totGross)}</td>
      <td>${fmtMoney(totGross*r.emp_jubilacion/100)}</td>
      <td>${fmtMoney(totGross*r.emp_obra_social/100)}</td>
      <td>${fmtMoney(totGross*r.emp_ley19032/100)}</td>
      <td>${fmtMoney(totEmp)}</td>
      <td>${fmtMoney(totPat)}</td>
      <td>${fmtMoney(totGross+totPat)}</td>
    </tr>
    </tbody></table>
  </div></div></div>`;
}

function rrhhRenderSuss() {
  const period = document.getElementById('rrhh-suss-period')?.value || new Date().toISOString().slice(0,7);
  const el = document.getElementById('rrhh-suss-content');
  if (el) el.innerHTML = rrhhBuildSussContent(DB.getAll('rrhhPayroll'), DB.getAll('rrhhEmployees'), period);
}

// ---- EXPORT ----

function rrhhExportPayroll() {
  const period = document.getElementById('rrhh-liq-period')?.value || new Date().toISOString().slice(0,7);
  const payrolls = DB.getAll('rrhhPayroll').filter(p => p.period === period);
  const empMap = {};
  DB.getAll('rrhhEmployees').forEach(e => empMap[e.id] = e);
  exportXLSX(`liquidaciones_${period}.xlsx`,
    ['Empleado','CUIL','Categoría','Período','Días','Bruto','Ret.Empleado','Carg.Patronal','Neto','Estado'],
    payrolls.map(p => {
      const e = empMap[p.employee_id];
      return [e?.name||'-',e?.cuil||'-',e?.category||'-',p.period,p.days_worked||0,
        p.gross_pay||0,p.emp_deduction||0,p.pat_contribution||0,p.net_pay||0,
        p.status==='confirmed'?'Confirmada':'Borrador'];
    })
  );
}

function rrhhExportSuss() {
  const period = document.getElementById('rrhh-suss-period')?.value || new Date().toISOString().slice(0,7);
  const payrolls = DB.getAll('rrhhPayroll').filter(p => p.period === period);
  const empMap = {};
  DB.getAll('rrhhEmployees').forEach(e => empMap[e.id] = e);
  const r = rrhhSussRates();
  exportXLSX(`suss_${period}.xlsx`,
    ['Empleado','CUIL','Categoría','Bruto','Ap.Jubilacion','Ap.ObraSocial','Ap.PAMI','Tot.Aportes','Jub.Patronal','OS.Patronal','PAMI.Patronal','ART','FondoEmpleo','Tot.Patronal','CostoEmpleador'],
    payrolls.map(p => {
      const e = empMap[p.employee_id];
      const gr = p.gross_pay||0;
      return [e?.name||'-',e?.cuil||'-',e?.category||'-',gr,
        gr*r.emp_jubilacion/100,gr*r.emp_obra_social/100,gr*r.emp_ley19032/100,p.emp_deduction||0,
        gr*r.pat_jubilacion/100,gr*r.pat_obra_social/100,gr*r.pat_ley19032/100,gr*r.pat_art/100,gr*r.pat_fondo_empleo/100,
        p.pat_contribution||0,gr+(p.pat_contribution||0)];
    })
  );
}
