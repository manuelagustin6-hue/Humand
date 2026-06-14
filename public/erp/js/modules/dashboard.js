/* ===== DASHBOARD ===== */
function renderDashboard() {
  const projects      = DB.getAll('projects');
  const invoices      = DB.getAll('invoices');
  const pos           = DB.getAll('purchaseOrders');
  const collections   = DB.getAll('collections');
  const tasks         = DB.getAll('ganttTasks');
  const supplierInvs  = DB.getAll('supplierInvoices');
  const approvalInsts = DB.getAll('approvalInstances');
  const actualCosts   = DB.getAll('actualCosts');
  const lics          = DB.getAll('licitaciones');
  const partes        = DB.getAll('partesDiarios');

  const today = todayStr();
  const currentUser = window.APP_STATE && window.APP_STATE.currentUser;

  // ── Obra KPIs ──
  const totalBudget      = projects.reduce((s, p) => s + (p.budget || 0), 0);
  const activeProjects   = projects.filter(p => p.status === 'active').length;
  const totalBilled      = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalCollected   = collections.reduce((s, c) => s + (c.amount || 0), 0);
  const pendingCollection = totalBilled - totalCollected;
  const totalPOs         = pos.reduce((s, p) => s + (p.total || 0), 0);
  const overdueInvoices  = invoices.filter(i => i.status === 'overdue').length;
  const tasksInProgress  = tasks.filter(t => t.status === 'in_progress').length;
  const totalActual      = actualCosts.reduce((s, a) => s + (a.amount || 0), 0);
  const grossMargin      = totalBilled - totalActual;
  const marginPct        = totalBilled > 0 ? (grossMargin / totalBilled * 100) : 0;

  // ── Aprobaciones genéricas pendientes ──
  const pendingApprovals = approvalInsts.filter(function(ai) {
    if (ai.status !== 'pending') return false;
    const step = ai.steps && ai.steps[ai.current_step_index];
    if (!step || step.status !== 'pending') return false;
    if (!currentUser) return true;
    return step.eligible_user_ids && step.eligible_user_ids.indexOf(currentUser.id) !== -1;
  }).length;

  // ── Licitaciones KPIs ──
  const licActivas      = lics.filter(l => l.status === 'active').length;
  const licCerradas     = lics.filter(l => l.status === 'closed').length;  // winner pending
  const licEnRevision   = lics.filter(l => l.status === 'en_revision').length;
  const licAdjudicadas  = lics.filter(l => l.status === 'awarded').length;

  // Licitaciones pending MY approval
  const licPendingMine = lics.filter(function(lic) {
    if (lic.status !== 'closed') return false;
    if (!lic.winner_cot_id) return false;
    const steps = ['jefe_compras', 'gerencia', 'direccion'];
    const approvals = lic.approvals || [];
    for (var i = 0; i < steps.length; i++) {
      const key = steps[i];
      const done = approvals.find(function(a) { return a.key === key; });
      if (!done) {
        // This step is pending — check if current user can approve
        if (!currentUser) return false;
        const assigned = lic.approvers && lic.approvers[key];
        if (assigned) {
          const ids = assigned.userIds || (assigned.userId ? [assigned.userId] : []);
          return ids.length === 0 || ids.indexOf(currentUser.id) !== -1;
        }
        // Check global config
        const cfg = (typeof _licGetAprobConfig === 'function') ? _licGetAprobConfig() : {};
        const cfgIds = (cfg[key] && cfg[key].user_ids) ? cfg[key].user_ids : [];
        return cfgIds.length === 0 || cfgIds.indexOf(currentUser.id) !== -1;
      }
      if (!done.approved) break; // rejected — stop chain
    }
    return false;
  }).length;

  // ── Partes Diarios ──
  const partesHoy = partes.filter(p => p.date === today);
  const workersHoy = partesHoy.reduce((s, p) => s + (p.personal || []).reduce((ss, per) => ss + (per.cantidad || 0), 0), 0);

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Dashboard</div>
    <div class="page-subtitle">Resumen ejecutivo del portafolio de obras</div>
  </div>
  <div class="page-actions">
    <span style="font-size:12px;color:var(--text-muted)"><i class="fas fa-clock"></i> ${fmtDatetime(new Date().toISOString())}</span>
    <button class="btn btn-secondary btn-sm" onclick="renderDashboard()"><i class="fas fa-sync-alt"></i> Actualizar</button>
  </div>
</div>

<!-- OBRA KPIs -->
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:8px">
  <i class="fas fa-building"></i> Obras y Financiero
</div>
<div class="stats-grid">
  <div class="stat-card" onclick="navigate('projects')" style="cursor:pointer">
    <div class="stat-icon blue"><i class="fas fa-building"></i></div>
    <div>
      <div class="stat-value">${projects.length}</div>
      <div class="stat-label">Proyectos Totales</div>
      <div class="stat-delta up"><i class="fas fa-circle"></i> ${activeProjects} activos</div>
    </div>
  </div>
  <div class="stat-card">
    <div class="stat-icon green"><i class="fas fa-dollar-sign"></i></div>
    <div>
      <div class="stat-value">${fmtMoney(totalBudget)}</div>
      <div class="stat-label">Presupuesto Total</div>
      <div class="stat-delta up"><i class="fas fa-arrow-up"></i> Portafolio activo</div>
    </div>
  </div>
  <div class="stat-card" onclick="navigate('facturacion')" style="cursor:pointer">
    <div class="stat-icon cyan"><i class="fas fa-file-invoice-dollar"></i></div>
    <div>
      <div class="stat-value">${fmtMoney(totalBilled)}</div>
      <div class="stat-label">Facturado Total</div>
      <div class="stat-delta ${overdueInvoices > 0 ? 'down' : 'up'}">
        ${overdueInvoices > 0 ? `<i class="fas fa-exclamation-circle"></i> ${overdueInvoices} vencidas` : '<i class="fas fa-check-circle"></i> Al día'}
      </div>
    </div>
  </div>
  <div class="stat-card" onclick="navigate('cobranzas')" style="cursor:pointer">
    <div class="stat-icon green"><i class="fas fa-hand-holding-dollar"></i></div>
    <div>
      <div class="stat-value">${fmtMoney(totalCollected)}</div>
      <div class="stat-label">Cobrado</div>
      <div class="stat-delta ${pendingCollection > 0 ? 'down' : 'up'}">
        ${pendingCollection > 0 ? `<i class="fas fa-clock"></i> ${fmtMoney(pendingCollection)} pendiente` : '<i class="fas fa-check-circle"></i> Sin pendientes'}
      </div>
    </div>
  </div>
  <div class="stat-card" onclick="navigate('compras')" style="cursor:pointer">
    <div class="stat-icon yellow"><i class="fas fa-shopping-cart"></i></div>
    <div>
      <div class="stat-value">${fmtMoney(totalPOs)}</div>
      <div class="stat-label">Órdenes de Compra</div>
      <div class="stat-delta up"><i class="fas fa-file"></i> ${pos.length} OC emitidas</div>
    </div>
  </div>
  <div class="stat-card">
    <div class="stat-icon blue"><i class="fas fa-tasks"></i></div>
    <div>
      <div class="stat-value">${tasksInProgress}</div>
      <div class="stat-label">Tareas en Ejecución</div>
      <div class="stat-delta up"><i class="fas fa-stream"></i> ${tasks.filter(t=>t.status==='completed').length} completadas</div>
    </div>
  </div>
  <div class="stat-card">
    <div class="stat-icon ${marginPct >= 15 ? 'green' : marginPct >= 0 ? 'yellow' : 'red'}"><i class="fas fa-percentage"></i></div>
    <div>
      <div class="stat-value ${marginPct >= 0 ? 'text-success' : 'text-danger'}">${fmtPct(marginPct)}</div>
      <div class="stat-label">Margen Bruto</div>
      <div class="stat-delta ${marginPct >= 0 ? 'up' : 'down'}">${fmtMoney(grossMargin)}</div>
    </div>
  </div>
  <div class="stat-card" onclick="navigate('aprobaciones')" style="cursor:pointer">
    <div class="stat-icon ${pendingApprovals > 0 ? 'red' : 'green'}"><i class="fas fa-check-double"></i></div>
    <div>
      <div class="stat-value">${pendingApprovals}</div>
      <div class="stat-label">Aprobaciones Pendientes</div>
      <div class="stat-delta ${pendingApprovals > 0 ? 'down' : 'up'}">
        ${pendingApprovals > 0 ? '<i class="fas fa-clock"></i> Requieren atención' : '<i class="fas fa-check-circle"></i> Al día'}
      </div>
    </div>
  </div>
</div>

<!-- LICITACIONES KPIs -->
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin:16px 0 8px">
  <i class="fas fa-gavel"></i> Licitaciones
</div>
<div class="stats-grid">
  <div class="stat-card" onclick="navigate('licitaciones')" style="cursor:pointer">
    <div class="stat-icon blue"><i class="fas fa-broadcast-tower"></i></div>
    <div>
      <div class="stat-value">${licActivas}</div>
      <div class="stat-label">Activas</div>
      <div class="stat-delta up"><i class="fas fa-circle"></i> Recibiendo cotizaciones</div>
    </div>
  </div>
  <div class="stat-card" onclick="navigate('licitaciones')" style="cursor:pointer">
    <div class="stat-icon yellow"><i class="fas fa-balance-scale"></i></div>
    <div>
      <div class="stat-value">${licCerradas}</div>
      <div class="stat-label">En Aprobación</div>
      <div class="stat-delta ${licCerradas > 0 ? 'down' : 'up'}">
        ${licCerradas > 0 ? '<i class="fas fa-hourglass-half"></i> Esperando aprobación' : '<i class="fas fa-check-circle"></i> Al día'}
      </div>
    </div>
  </div>
  <div class="stat-card" onclick="navigate('licitaciones')" style="cursor:pointer" ${licPendingMine > 0 ? 'style="cursor:pointer;border:2px solid #f59e0b"' : ''}>
    <div class="stat-icon ${licPendingMine > 0 ? 'red' : 'green'}"><i class="fas fa-user-check"></i></div>
    <div>
      <div class="stat-value">${licPendingMine}</div>
      <div class="stat-label">Esperan Tu Aprobación</div>
      <div class="stat-delta ${licPendingMine > 0 ? 'down' : 'up'}">
        ${licPendingMine > 0 ? '<i class="fas fa-bell"></i> Acción requerida' : '<i class="fas fa-check-circle"></i> Sin pendientes'}
      </div>
    </div>
  </div>
  <div class="stat-card" onclick="navigate('licitaciones')" style="cursor:pointer">
    <div class="stat-icon ${licEnRevision > 0 ? 'red' : 'green'}"><i class="fas fa-redo"></i></div>
    <div>
      <div class="stat-value">${licEnRevision}</div>
      <div class="stat-label">En Revisión</div>
      <div class="stat-delta ${licEnRevision > 0 ? 'down' : 'up'}">
        ${licEnRevision > 0 ? '<i class="fas fa-exclamation-circle"></i> Rechazadas, revisar' : '<i class="fas fa-check-circle"></i> Sin revisiones'}
      </div>
    </div>
  </div>
</div>

<!-- PARTES DIARIOS KPIs -->
<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin:16px 0 8px">
  <i class="fas fa-hard-hat"></i> Partes Diarios — Hoy (${fmtDate(today)})
</div>
<div class="stats-grid">
  <div class="stat-card" onclick="navigate('parte_diario')" style="cursor:pointer">
    <div class="stat-icon blue"><i class="fas fa-clipboard-list"></i></div>
    <div>
      <div class="stat-value">${partesHoy.length}</div>
      <div class="stat-label">Partes Cargados</div>
      <div class="stat-delta ${partesHoy.length > 0 ? 'up' : 'down'}">
        ${partesHoy.length > 0 ? '<i class="fas fa-check-circle"></i> Reportando' : '<i class="fas fa-exclamation-circle"></i> Sin partes hoy'}
      </div>
    </div>
  </div>
  <div class="stat-card" onclick="navigate('parte_diario')" style="cursor:pointer">
    <div class="stat-icon yellow"><i class="fas fa-users"></i></div>
    <div>
      <div class="stat-value">${workersHoy}</div>
      <div class="stat-label">Trabajadores en Obra</div>
      <div class="stat-delta up"><i class="fas fa-hard-hat"></i> personas hoy</div>
    </div>
  </div>
  <div class="stat-card" onclick="navigate('parte_diario')" style="cursor:pointer">
    <div class="stat-icon green"><i class="fas fa-building"></i></div>
    <div>
      <div class="stat-value">${[...new Set(partesHoy.map(p => p.project_id))].filter(Boolean).length}</div>
      <div class="stat-label">Obras con Parte</div>
      <div class="stat-delta up"><i class="fas fa-map-marker-alt"></i> activas hoy</div>
    </div>
  </div>
  <div class="stat-card" onclick="navigate('parte_diario')" style="cursor:pointer">
    <div class="stat-icon blue"><i class="fas fa-calendar-alt"></i></div>
    <div>
      <div class="stat-value">${partes.length}</div>
      <div class="stat-label">Total Histórico</div>
      <div class="stat-delta up"><i class="fas fa-history"></i> partes registrados</div>
    </div>
  </div>
</div>

<!-- CHARTS -->
<div class="grid-3 mb-2" style="margin-top:16px">
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-chart-bar text-primary"></i> Estado de Proyectos</span>
    </div>
    <div class="card-body">
      <div class="chart-wrap"><canvas id="chart-projects"></canvas></div>
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-chart-line text-primary"></i> Facturación vs Cobros</span>
    </div>
    <div class="card-body">
      <div class="chart-wrap"><canvas id="chart-cashflow"></canvas></div>
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-balance-scale text-primary"></i> Presupuesto vs Costo Real</span>
    </div>
    <div class="card-body">
      <div class="chart-wrap"><canvas id="chart-budget"></canvas></div>
    </div>
  </div>
</div>

<!-- PROJECTS + ALERTS -->
<div class="grid-2">
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-building text-primary"></i> Estado de Obras</span>
      <button class="btn btn-sm btn-secondary" onclick="navigate('projects')"><i class="fas fa-arrow-right"></i> Ver todos</button>
    </div>
    <div class="card-body" style="padding:0">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Proyecto</th><th>Avance</th><th>Estado</th><th>Presupuesto</th></tr></thead>
          <tbody>
            ${projects.length ? projects.map(p => {
              const ptasks = DB.getAll('ganttTasks').filter(t => t.project_id === p.id);
              const avg = ptasks.length ? Math.round(ptasks.reduce((s,t) => s + (t.progress||0), 0) / ptasks.length) : 0;
              return `<tr>
                <td><strong>${escapeHtml(p.name)}</strong><br><span class="text-muted" style="font-size:11px">${escapeHtml(p.client || '')}</span></td>
                <td style="min-width:100px">
                  <div class="progress-bar"><div class="progress-fill" style="width:${avg}%"></div></div>
                  <span style="font-size:11px;color:var(--text-muted)">${avg}%</span>
                </td>
                <td>${statusBadge(p.status)}</td>
                <td class="number-cell">${fmtMoney(p.budget)}</td>
              </tr>`;
            }).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px">Sin proyectos</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-bell text-warning"></i> Alertas y Pendientes</span>
    </div>
    <div class="card-body" style="padding:0">
      ${buildAlerts(invoices, pos, tasks, lics)}
    </div>
  </div>
</div>

<!-- LICITACIONES ACTIVAS + PARTES HOY -->
<div class="grid-2" style="margin-top:16px">
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-gavel text-primary"></i> Licitaciones Activas</span>
      <button class="btn btn-sm btn-secondary" onclick="navigate('licitaciones')"><i class="fas fa-arrow-right"></i> Ver todas</button>
    </div>
    <div class="card-body" style="padding:0">
      ${_dashLicitacionesTable(lics)}
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-hard-hat text-primary"></i> Partes Diarios Recientes</span>
      <button class="btn btn-sm btn-secondary" onclick="navigate('parte_diario')"><i class="fas fa-arrow-right"></i> Ver todos</button>
    </div>
    <div class="card-body" style="padding:0">
      ${_dashPartesTable(partes)}
    </div>
  </div>
</div>

<!-- FACTURAS RECIENTES -->
<div class="card mt-3">
  <div class="card-header">
    <span class="card-title"><i class="fas fa-history text-primary"></i> Facturas Recientes</span>
    <button class="btn btn-sm btn-secondary" onclick="navigate('facturacion')"><i class="fas fa-arrow-right"></i> Ver todas</button>
  </div>
  <div class="card-body" style="padding:0">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Número</th><th>Proyecto</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Vencimiento</th></tr></thead>
        <tbody>
          ${invoices.slice(0,5).map(inv => {
            const proj = DB.getById('projects', inv.project_id);
            return `<tr>
              <td class="nowrap"><strong>${escapeHtml(inv.number)}</strong></td>
              <td>${proj ? escapeHtml(proj.name) : '-'}</td>
              <td>${escapeHtml(inv.client_name || '')}</td>
              <td class="number-cell">${fmtMoney(inv.total)}</td>
              <td>${statusBadge(inv.status)}</td>
              <td class="${isOverdue(inv.due_date) && inv.status !== 'paid' ? 'text-danger fw-bold' : ''}">${fmtDate(inv.due_date)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>
</div>
  `;

  renderProjectsChart(projects);
  renderCashflowChart(invoices, collections);
  renderBudgetChart(projects, actualCosts);
}

function _dashLicitacionesTable(lics) {
  const shown = lics.filter(l => ['active','closed','en_revision'].indexOf(l.status) !== -1).slice(0, 6);
  if (!shown.length) return '<div class="empty-state" style="padding:30px"><i class="fas fa-gavel"></i><p>Sin licitaciones activas</p></div>';
  const statusColors = { active: '#2563eb', closed: '#f59e0b', en_revision: '#f97316', awarded: '#22c55e', draft: '#94a3b8', cancelled: '#ef4444' };
  const statusLabels = { active: 'Activa', closed: 'En aprobación', en_revision: 'En revisión', awarded: 'Adjudicada', draft: 'Borrador', cancelled: 'Cancelada' };
  return `<div class="table-wrap"><table>
    <thead><tr><th>Licitación</th><th>ODP</th><th>Estado</th></tr></thead>
    <tbody>
      ${shown.map(l => `<tr onclick="navigate('licitaciones');setTimeout(()=>{_licState.view='detail';_licState.licId='${l.id}';renderLicitaciones()},100)" style="cursor:pointer">
        <td><strong>${escapeHtml(l.title || l.numero || l.id)}</strong></td>
        <td style="font-size:11px;color:var(--text-muted)">${escapeHtml(l.odp_numero || '—')}</td>
        <td><span style="background:${statusColors[l.status] || '#94a3b8'}22;color:${statusColors[l.status] || '#94a3b8'};font-size:11px;padding:2px 8px;border-radius:20px;font-weight:600;white-space:nowrap">${statusLabels[l.status] || l.status}</span></td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

function _dashPartesTable(partes) {
  const recent = partes.sort((a,b) => (b.date||'').localeCompare(a.date||'')).slice(0, 6);
  if (!recent.length) return '<div class="empty-state" style="padding:30px"><i class="fas fa-hard-hat"></i><p>Sin partes registrados</p></div>';
  const wIcons = { soleado: 'fa-sun', nublado: 'fa-cloud', lluvioso: 'fa-cloud-rain', tormenta: 'fa-bolt', helada: 'fa-snowflake' };
  return `<div class="table-wrap"><table>
    <thead><tr><th>Fecha</th><th>Obra</th><th>Personal</th><th>Clima</th></tr></thead>
    <tbody>
      ${recent.map(p => {
        const proj = DB.getById('projects', p.project_id);
        const workers = (p.personal || []).reduce((s, per) => s + (per.cantidad || 0), 0);
        const wIcon = wIcons[p.weather_condition] || 'fa-cloud';
        return `<tr onclick="navigate('parte_diario');setTimeout(()=>{_pdState.view='detail';_pdState.id='${p.id}';renderParteDiario()},100)" style="cursor:pointer">
          <td><strong>${fmtDate(p.date)}</strong></td>
          <td style="font-size:12px">${proj ? escapeHtml(proj.name) : '—'}</td>
          <td>${workers} pers.</td>
          <td><i class="fas ${wIcon}" title="${p.weather_condition||''}"></i>${p.weather_temp ? ' ' + p.weather_temp + '°' : ''}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table></div>`;
}

function buildAlerts(invoices, pos, tasks, lics) {
  const alerts = [];
  const today = todayStr();
  lics = lics || [];

  // Facturas vencidas
  invoices.filter(i => i.status === 'overdue').forEach(i => {
    const p = DB.getById('projects', i.project_id);
    alerts.push({ type: 'danger', icon: 'fa-exclamation-circle', msg: `Factura vencida ${escapeHtml(i.number)} — ${p ? escapeHtml(p.name) : ''} — ${fmtMoney(i.total)}`, action: "navigate('facturacion')" });
  });

  // Facturas proveedor vencidas
  DB.getAll('supplierInvoices').filter(si => si.status === 'pending' && si.due_date && si.due_date < today).forEach(si => {
    const sup = DB.getById('suppliers', si.supplier_id);
    alerts.push({ type: 'danger', icon: 'fa-file-invoice-dollar', msg: `Fact. prov. vencida: ${escapeHtml(si.number)} — ${sup ? escapeHtml(sup.name) : ''} — ${fmtMoney(si.total)}`, action: "navigate('compras')" });
  });

  // Licitaciones en revisión
  lics.filter(l => l.status === 'en_revision').forEach(l => {
    alerts.push({ type: 'danger', icon: 'fa-redo', msg: `Licitación rechazada: "${escapeHtml(l.title || l.numero || l.id)}" — requiere correcciones`, action: "navigate('licitaciones')" });
  });

  // Licitaciones cerradas sin ganador
  lics.filter(l => l.status === 'closed' && !l.winner_cot_id).forEach(l => {
    alerts.push({ type: 'warning', icon: 'fa-gavel', msg: `Licitación cerrada sin ganador: "${escapeHtml(l.title || l.numero || l.id)}"`, action: "navigate('licitaciones')" });
  });

  // OC pendientes de recepción
  pos.filter(p => p.status === 'sent').forEach(po => {
    alerts.push({ type: 'warning', icon: 'fa-clock', msg: `OC ${escapeHtml(po.number)} pendiente de recepción — ${fmtMoney(po.total)}`, action: "navigate('compras')" });
  });

  // Tareas demoradas
  tasks.filter(t => t.status === 'delayed').forEach(t => {
    alerts.push({ type: 'danger', icon: 'fa-stream', msg: `Tarea demorada: ${escapeHtml(t.name)}`, action: "navigate('gantt')" });
  });

  if (!alerts.length) {
    return `<div class="empty-state" style="padding:30px"><i class="fas fa-check-circle" style="color:var(--success);opacity:1"></i><p>Sin alertas pendientes</p></div>`;
  }

  return `<div style="padding:4px 0">
    ${alerts.map(a => `
      <div style="display:flex;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border);align-items:flex-start;cursor:pointer" onclick="${a.action}">
        <i class="fas ${a.icon} ${a.type === 'danger' ? 'text-danger' : 'text-warning'}" style="margin-top:2px;flex-shrink:0"></i>
        <span style="font-size:13px">${a.msg}</span>
      </div>`).join('')}
  </div>`;
}

function renderProjectsChart(projects) {
  const ctx = document.getElementById('chart-projects');
  if (!ctx) return;
  const sc = { active: 0, planning: 0, completed: 0, paused: 0 };
  projects.forEach(p => { if (sc[p.status] !== undefined) sc[p.status]++; });
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Activos', 'Planificación', 'Completados', 'Pausados'],
      datasets: [{ data: Object.values(sc), backgroundColor: ['#2563eb','#f59e0b','#10b981','#64748b'], borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'right', labels: { font: { size: 12 } } } } }
  });
}

function renderBudgetChart(projects, actualCosts) {
  const ctx = document.getElementById('chart-budget');
  if (!ctx || !projects.length) return;
  const shown = projects.slice(0, 6);
  const labels  = shown.map(p => p.name.length > 18 ? p.name.slice(0,18) + '…' : p.name);
  const budgets = shown.map(p => p.budget || 0);
  const actuals = shown.map(p => actualCosts.filter(a => a.project_id === p.id).reduce((s,a) => s + (a.amount||0), 0));
  new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'Presupuesto', data: budgets, backgroundColor: 'rgba(37,99,235,.55)', borderRadius: 4 },
      { label: 'Costo Real',  data: actuals, backgroundColor: 'rgba(239,68,68,.75)',  borderRadius: 4 },
    ]},
    options: {
      responsive: true, maintainAspectRatio: true, indexAxis: 'y',
      plugins: { legend: { labels: { font: { size: 10 } } } },
      scales: {
        x: { ticks: { callback: v => fmtMoney(v), font: { size: 9 } }, grid: { color: '#f1f5f9' } },
        y: { ticks: { font: { size: 10 } }, grid: { display: false } }
      }
    }
  });
}

function renderCashflowChart(invoices, collections) {
  const ctx = document.getElementById('chart-cashflow');
  if (!ctx) return;
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push({ key: d.toISOString().slice(0,7), label: d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }) });
  }
  const billed    = months.map(m => invoices.filter(i => i.date && i.date.startsWith(m.key)).reduce((s,i) => s+i.total, 0));
  const collected = months.map(m => collections.filter(c => c.date && c.date.startsWith(m.key)).reduce((s,c) => s+c.amount, 0));
  new Chart(ctx, {
    type: 'bar',
    data: { labels: months.map(m => m.label), datasets: [
      { label: 'Facturado', data: billed,    backgroundColor: 'rgba(37,99,235,.7)', borderRadius: 4 },
      { label: 'Cobrado',   data: collected, backgroundColor: 'rgba(16,185,129,.7)', borderRadius: 4 },
    ]},
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { labels: { font: { size: 11 } } } },
      scales: {
        y: { ticks: { callback: v => fmtMoney(v), font: { size: 10 } }, grid: { color: '#f1f5f9' } },
        x: { ticks: { font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}
