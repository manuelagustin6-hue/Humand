/* ===== GANTT ===== */
function renderGantt() {
  const projects = DB.getAll('projects');
  const activeProjectId = window.APP_STATE.activeProject;

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Cronograma Gantt</div>
    <div class="page-subtitle">Planificación y seguimiento de tareas por proyecto</div>
  </div>
  <div class="page-actions">
    <select class="form-control" id="gantt-project-sel" onchange="loadGantt(this.value)" style="min-width:220px">
      <option value="">Seleccionar proyecto...</option>
      ${projects.map(p => `<option value="${p.id}" ${p.id===activeProjectId?'selected':''}>${p.name}</option>`).join('')}
    </select>
    <button class="btn btn-secondary" onclick="openTaskForm()"><i class="fas fa-plus"></i> Nueva Tarea</button>
  </div>
</div>
<div id="gantt-container">
  ${activeProjectId ? buildGanttView(activeProjectId) : `<div class="empty-state"><i class="fas fa-stream"></i><p>Selecioná un proyecto para ver su cronograma</p></div>`}
</div>
  `;
  if (activeProjectId) document.getElementById('gantt-project-sel').value = activeProjectId;
}

function loadGantt(projectId) {
  window.APP_STATE.activeProject = projectId;
  document.getElementById('gantt-container').innerHTML = projectId
    ? buildGanttView(projectId)
    : `<div class="empty-state"><i class="fas fa-stream"></i><p>Selecioná un proyecto</p></div>`;
}

function buildGanttView(projectId) {
  const tasks = DB.getAll('ganttTasks').filter(t => t.project_id === projectId);
  if (!tasks.length) {
    return `<div class="card"><div class="card-body">
      <div class="empty-state"><i class="fas fa-stream"></i><p>No hay tareas. Agregá la primera.</p>
      <button class="btn btn-primary mt-2" onclick="openTaskForm('${projectId}')"><i class="fas fa-plus"></i> Primera Tarea</button></div>
    </div></div>`;
  }

  const completed = tasks.filter(t => t.status === 'completed').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const avgProgress = Math.round(tasks.reduce((s,t) => s+(t.progress||0), 0) / tasks.length);

  const minDate = tasks.reduce((m, t) => t.start_date < m ? t.start_date : m, tasks[0].start_date);
  const maxDate = tasks.reduce((m, t) => t.end_date > m ? t.end_date : m, tasks[0].end_date);

  const startD = new Date(minDate + 'T00:00:00');
  const endD = new Date(maxDate + 'T00:00:00');
  const totalDays = Math.max(daysBetween(minDate, maxDate), 1);

  const months = [];
  const cur = new Date(startD);
  cur.setDate(1);
  while (cur <= endD) {
    months.push({ key: cur.toISOString().slice(0,7), label: cur.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }), date: new Date(cur) });
    cur.setMonth(cur.getMonth() + 1);
  }

  const todayPos = Math.max(0, Math.min(100, daysBetween(minDate, todayStr()) / totalDays * 100));

  return `
<!-- STATS -->
<div class="stats-grid" style="grid-template-columns:repeat(5,1fr);margin-bottom:16px">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-tasks"></i></div><div>
    <div class="stat-value">${tasks.length}</div><div class="stat-label">Total Tareas</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div><div>
    <div class="stat-value">${completed}</div><div class="stat-label">Completadas</div></div></div>
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-play-circle"></i></div><div>
    <div class="stat-value">${inProgress}</div><div class="stat-label">En Curso</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-clock"></i></div><div>
    <div class="stat-value">${pending}</div><div class="stat-label">Pendientes</div></div></div>
  <div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-percent"></i></div><div>
    <div class="stat-value">${avgProgress}%</div><div class="stat-label">Avance Promedio</div></div></div>
</div>

<!-- GANTT CHART -->
<div class="card">
  <div class="card-header">
    <span class="card-title"><i class="fas fa-stream text-primary"></i> Diagrama de Gantt</span>
    <div style="display:flex;gap:8px;align-items:center">
      <span style="font-size:11px;color:var(--text-muted)">
        ${fmtDate(minDate)} — ${fmtDate(maxDate)}
      </span>
      <button class="btn btn-sm btn-secondary" onclick="openTaskForm('${projectId}')"><i class="fas fa-plus"></i> Tarea</button>
    </div>
  </div>
  <div class="card-body" style="padding:0;overflow:auto">
    <div style="min-width:900px">
      <!-- HEADER -->
      <div class="gantt-header">
        <div class="gantt-task-col">Tarea / Responsable</div>
        <div class="gantt-timeline-header" style="position:relative">
          ${months.map(m => {
            const daysInMonth = new Date(m.date.getFullYear(), m.date.getMonth()+1, 0).getDate();
            const startOfMonth = new Date(Math.max(m.date.getTime(), startD.getTime()));
            const endOfMonth = new Date(Math.min(new Date(m.date.getFullYear(), m.date.getMonth()+1, 0).getTime(), endD.getTime()));
            const visibleDays = Math.max(0, daysBetween(
              startOfMonth.toISOString().split('T')[0],
              endOfMonth.toISOString().split('T')[0]
            ) + 1);
            const width = (visibleDays / totalDays * 100).toFixed(2);
            return `<div class="gantt-month" style="width:${width}%;min-width:40px">${m.label}</div>`;
          }).join('')}
        </div>
      </div>

      <!-- ROWS -->
      ${tasks.map(task => {
        const taskStart = task.start_date < minDate ? minDate : task.start_date;
        const taskEnd = task.end_date > maxDate ? maxDate : task.end_date;
        const leftPct = (daysBetween(minDate, taskStart) / totalDays * 100).toFixed(2);
        const widthPct = Math.max(0.5, (daysBetween(taskStart, taskEnd) / totalDays * 100)).toFixed(2);
        const barColor = task.status === 'completed' ? 'green' : task.status === 'in_progress' ? 'blue' : task.status === 'delayed' ? 'red' : 'gray';

        const approvalBadge = task.approval_status === 'approved'
          ? '<span class="badge badge-green" style="font-size:9px">✓ Aprobada</span>'
          : task.approval_status === 'rejected'
          ? '<span class="badge badge-red" style="font-size:9px">✗ Rechazada</span>'
          : '<span class="badge badge-yellow" style="font-size:9px">Pendiente aprobación</span>';

        return `<div class="gantt-row">
          <div class="gantt-task-info">
            <div class="gantt-task-name">${task.name}</div>
            <div class="gantt-task-assign"><i class="fas fa-user" style="font-size:10px"></i> ${task.assignee || '-'} &nbsp; ${statusBadge(task.status)} ${approvalBadge}</div>
          </div>
          <div class="gantt-timeline-row">
            <div class="gantt-today-line" style="left:${todayPos}%"></div>
            <div class="gantt-bar ${barColor}" style="left:${leftPct}%;width:${widthPct}%;cursor:pointer" onclick="openTaskForm('${projectId}', '${task.id}')">
              <div class="gantt-bar-fill" style="width:${task.progress}%"></div>
              <span style="position:relative;z-index:1">${task.progress}% — ${task.name.substring(0,20)}${task.name.length>20?'…':''}</span>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>
  <div class="card-footer">
    <div style="display:flex;gap:16px;align-items:center;font-size:11px">
      <span>Leyenda:</span>
      <span><span style="display:inline-block;width:12px;height:12px;background:#10b981;border-radius:2px;margin-right:4px"></span>Completada</span>
      <span><span style="display:inline-block;width:12px;height:12px;background:#2563eb;border-radius:2px;margin-right:4px"></span>En curso</span>
      <span><span style="display:inline-block;width:12px;height:12px;background:#64748b;border-radius:2px;margin-right:4px"></span>Pendiente</span>
      <span><span style="display:inline-block;width:12px;height:12px;background:#ef4444;border-radius:2px;margin-right:4px"></span>Demorada</span>
      <span style="margin-left:auto"><span style="display:inline-block;width:2px;height:12px;background:#ef4444;margin-right:4px;vertical-align:middle"></span>Hoy: ${fmtDate(todayStr())}</span>
    </div>
  </div>
</div>

<!-- TASKS TABLE -->
<div class="card mt-2">
  <div class="card-header">
    <span class="card-title"><i class="fas fa-list text-primary"></i> Lista de Tareas</span>
  </div>
  <div class="card-body" style="padding:0">
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Tarea</th><th>Responsable</th><th>Inicio</th><th>Fin</th><th>Duración</th>
          <th>Avance</th><th>Estado</th><th>Acciones</th>
        </tr></thead>
        <tbody>
          ${tasks.map(t => `<tr>
            <td><strong>${t.name}</strong>${t.dependencies?.length ? `<br><span style="font-size:10px;color:var(--text-muted)">Dep: ${t.dependencies.length} tarea(s)</span>` : ''}</td>
            <td>${t.assignee || '-'}</td>
            <td>${fmtDate(t.start_date)}</td>
            <td>${fmtDate(t.end_date)}</td>
            <td>${daysBetween(t.start_date, t.end_date)} días</td>
            <td style="min-width:120px">
              <div class="progress-bar" style="width:100px;display:inline-block">
                <div class="progress-fill ${t.status==='completed'?'green':''}" style="width:${t.progress}%"></div>
              </div>
              <span style="font-size:11px;margin-left:4px">${t.progress}%</span>
            </td>
            <td>${statusBadge(t.status)}</td>
            <td><div class="table-actions">
              <button class="btn-ghost btn btn-sm" onclick="openTaskForm('${projectId}', '${t.id}')"><i class="fas fa-edit"></i></button>
              ${t.approval_status !== 'approved' ? `<button class="btn btn-sm btn-success" title="Aprobar" onclick="approveTask('${t.id}', '${projectId}')"><i class="fas fa-check"></i></button>` : ''}
              ${t.approval_status === 'approved' ? `<button class="btn btn-sm btn-warning" title="Revocar aprobación" onclick="revokeTaskApproval('${t.id}', '${projectId}')"><i class="fas fa-undo"></i></button>` : ''}
              <button class="btn-ghost btn btn-sm danger" onclick="deleteTask('${t.id}', '${projectId}')"><i class="fas fa-trash"></i></button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>
</div>
  `;
}

function openTaskForm(projectId, id = null) {
  const task = id ? DB.getById('ganttTasks', id) : null;
  const pid = projectId || window.APP_STATE.activeProject;
  const projects = DB.getAll('projects');
  const allTasks = pid ? DB.getAll('ganttTasks').filter(t => t.project_id === pid && t.id !== id) : [];

  openModal(task ? 'Editar Tarea' : 'Nueva Tarea Gantt', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Proyecto *</label>
    <select class="form-control" id="tf-project">
      <option value="">Seleccionar...</option>
      ${projects.map(p => `<option value="${p.id}" ${(task?.project_id||pid)===p.id?'selected':''}>${p.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Estado</label>
    <select class="form-control" id="tf-status">
      <option value="pending" ${task?.status==='pending'?'selected':''}>Pendiente</option>
      <option value="in_progress" ${task?.status==='in_progress'?'selected':''}>En curso</option>
      <option value="completed" ${task?.status==='completed'?'selected':''}>Completada</option>
      <option value="delayed" ${task?.status==='delayed'?'selected':''}>Demorada</option>
    </select>
  </div>
  <div class="form-group full">
    <label class="form-label">Nombre de la Tarea *</label>
    <input class="form-control" id="tf-name" value="${task?.name || ''}" placeholder="Ej: Fundaciones y pilotes">
  </div>
  <div class="form-group">
    <label class="form-label">Responsable</label>
    <input class="form-control" id="tf-assignee" value="${task?.assignee || ''}" placeholder="Equipo o persona">
  </div>
  <div class="form-group">
    <label class="form-label">% Avance</label>
    <input class="form-control" id="tf-progress" type="number" min="0" max="100" value="${task?.progress || 0}">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha Inicio *</label>
    <input class="form-control" id="tf-start" type="date" value="${task?.start_date || todayStr()}">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha Fin *</label>
    <input class="form-control" id="tf-end" type="date" value="${task?.end_date || addDays(todayStr(), 30)}">
  </div>
  <div class="form-group full">
    <label class="form-label">Dependencias (tareas predecesoras)</label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:120px;overflow-y:auto">
      ${allTasks.map(t => `<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
        <input type="checkbox" value="${t.id}" ${(task?.dependencies||[]).includes(t.id)?'checked':''}>
        ${t.name}
      </label>`).join('') || '<span style="font-size:12px;color:var(--text-muted)">No hay otras tareas</span>'}
    </div>
  </div>
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveTask('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
}

function saveTask(id) {
  const projectId = document.getElementById('tf-project').value;
  const name = document.getElementById('tf-name').value.trim();
  if (!projectId || !name) { toast('Proyecto y nombre son obligatorios', 'error'); return; }

  const deps = Array.from(document.querySelectorAll('#modal-body input[type="checkbox"]:checked')).map(c => c.value);

  const data = {
    project_id: projectId,
    name,
    assignee: document.getElementById('tf-assignee').value.trim(),
    status: document.getElementById('tf-status').value,
    progress: parseInt(document.getElementById('tf-progress').value) || 0,
    start_date: document.getElementById('tf-start').value,
    end_date: document.getElementById('tf-end').value,
    dependencies: deps,
  };

  if (id) { DB.update('ganttTasks', id, data); toast('Tarea actualizada', 'success'); }
  else { DB.insert('ganttTasks', data); toast('Tarea creada', 'success'); }

  closeModal();
  loadGantt(projectId);
}

function approveTask(id, projectId) {
  DB.update('ganttTasks', id, { approval_status: 'approved' });
  toast('Tarea aprobada', 'success');
  loadGantt(projectId);
}

function revokeTaskApproval(id, projectId) {
  DB.update('ganttTasks', id, { approval_status: 'pending' });
  toast('Aprobación revocada', 'warning');
  loadGantt(projectId);
}

function deleteTask(id, projectId) {
  confirmDialog('¿Eliminar esta tarea del cronograma?', () => {
    DB.remove('ganttTasks', id);
    toast('Tarea eliminada', 'warning');
    loadGantt(projectId);
  });
}
