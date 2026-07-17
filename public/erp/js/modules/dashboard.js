/* ===== DASHBOARD ===== */
function renderDashboard() {
  const projects = DB.getAll('projects');
  const invoices = DB.getAll('invoices');
  const pos = DB.getAll('purchaseOrders');
  const collections = DB.getAll('collections');
  const tasks = DB.getAll('ganttTasks');

  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const totalBilled = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalCollected = collections.reduce((s, c) => s + (c.amount || 0), 0);
  const pendingCollection = totalBilled - totalCollected;
  const totalPOs = pos.reduce((s, p) => s + (p.total || 0), 0);
  const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;
  const tasksInProgress = tasks.filter(t => t.status === 'in_progress').length;

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Dashboard</div>
    <div class="page-subtitle">Resumen ejecutivo del portafolio de obras</div>
  </div>
  <div class="page-actions">
    <span style="font-size:12px;color:var(--text-muted)"><i class="fas fa-clock"></i> Actualizado: ${fmtDatetime(now())}</span>
  </div>
</div>

<!-- KPI CARDS -->
<div class="stats-grid">
  <div class="stat-card">
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
  <div class="stat-card">
    <div class="stat-icon cyan"><i class="fas fa-file-invoice-dollar"></i></div>
    <div>
      <div class="stat-value">${fmtMoney(totalBilled)}</div>
      <div class="stat-label">Facturado Total</div>
      <div class="stat-delta ${overdueInvoices > 0 ? 'down' : 'up'}">
        ${overdueInvoices > 0 ? `<i class="fas fa-exclamation-circle"></i> ${overdueInvoices} fact. vencidas` : '<i class="fas fa-check-circle"></i> Al día'}
      </div>
    </div>
  </div>
  <div class="stat-card">
    <div class="stat-icon green"><i class="fas fa-hand-holding-dollar"></i></div>
    <div>
      <div class="stat-value">${fmtMoney(totalCollected)}</div>
      <div class="stat-label">Cobrado</div>
      <div class="stat-delta ${pendingCollection > 0 ? 'down' : 'up'}">
        ${pendingCollection > 0 ? `<i class="fas fa-clock"></i> ${fmtMoney(pendingCollection)} pendiente` : '<i class="fas fa-check-circle"></i> Sin pendientes'}
      </div>
    </div>
  </div>
  <div class="stat-card">
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
</div>

<!-- CHARTS ROW -->
<div class="grid-2 mb-2">
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
      <span class="card-title"><i class="fas fa-chart-line text-primary"></i> Facturación vs Cobros (últimos 6 meses)</span>
    </div>
    <div class="card-body">
      <div class="chart-wrap"><canvas id="chart-cashflow"></canvas></div>
    </div>
  </div>
</div>

<!-- PROJECTS TABLE + ALERTS -->
<div class="grid-2">
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-building text-primary"></i> Estado de Obras</span>
      <button class="btn btn-sm btn-secondary" onclick="navigate('projects')"><i class="fas fa-arrow-right"></i> Ver todos</button>
    </div>
    <div class="card-body" style="padding:0">
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Proyecto</th><th>Avance</th><th>Estado</th><th>Presupuesto</th>
          </tr></thead>
          <tbody>
            ${projects.map(p => {
              const ptasks = DB.getAll('ganttTasks').filter(t => t.project_id === p.id);
              const avgProgress = ptasks.length ? Math.round(ptasks.reduce((s,t) => s + (t.progress||0), 0) / ptasks.length) : 0;
              return `<tr>
                <td><strong>${p.name}</strong><br><span class="text-muted" style="font-size:11px">${p.client}</span></td>
                <td style="min-width:120px">
                  <div class="progress-bar"><div class="progress-fill" style="width:${avgProgress}%"></div></div>
                  <span style="font-size:11px;color:var(--text-muted)">${avgProgress}%</span>
                </td>
                <td>${statusBadge(p.status)}</td>
                <td class="number-cell">${fmtMoney(p.budget)}</td>
              </tr>`;
            }).join('')}
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
      ${buildAlerts(invoices, pos, tasks)}
    </div>
  </div>
</div>

<!-- RECENT ACTIVITY -->
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
              <td class="nowrap"><strong>${inv.number}</strong></td>
              <td>${proj ? proj.name : '-'}</td>
              <td>${inv.client_name}</td>
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

  // Charts
  renderProjectsChart(projects);
  renderCashflowChart(invoices, collections);
}

function buildAlerts(invoices, pos, tasks) {
  const alerts = [];

  invoices.filter(i => i.status === 'overdue').forEach(i => {
    const p = DB.getById('projects', i.project_id);
    alerts.push({ type: 'danger', icon: 'fa-exclamation-circle', msg: `Factura vencida ${i.number} — ${p ? p.name : ''} — ${fmtMoney(i.total)}` });
  });

  pos.filter(p => p.status === 'sent').forEach(po => {
    const proj = DB.getById('projects', po.project_id);
    alerts.push({ type: 'warning', icon: 'fa-clock', msg: `OC ${po.number} pendiente de recepción — ${fmtMoney(po.total)}` });
  });

  tasks.filter(t => t.status === 'delayed').forEach(t => {
    alerts.push({ type: 'danger', icon: 'fa-stream', msg: `Tarea demorada: ${t.name}` });
  });

  if (alerts.length === 0) {
    return `<div class="empty-state" style="padding:30px"><i class="fas fa-check-circle" style="color:var(--success);opacity:1"></i><p>Sin alertas pendientes</p></div>`;
  }

  return `<div style="padding:4px 0">
    ${alerts.map(a => `
      <div style="display:flex;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border);align-items:flex-start">
        <i class="fas ${a.icon} ${a.type === 'danger' ? 'text-danger' : 'text-warning'}" style="margin-top:2px"></i>
        <span style="font-size:13px">${a.msg}</span>
      </div>`).join('')}
  </div>`;
}

function renderProjectsChart(projects) {
  const ctx = document.getElementById('chart-projects');
  if (!ctx) return;
  const statusCount = { active: 0, planning: 0, completed: 0, paused: 0 };
  projects.forEach(p => { if (statusCount[p.status] !== undefined) statusCount[p.status]++; });

  safeChart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Activos', 'Planificación', 'Completados', 'Pausados'],
      datasets: [{ data: Object.values(statusCount), backgroundColor: ['#2563eb','#f59e0b','#10b981','#64748b'], borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'right', labels: { font: { size: 12 } } } }
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

  const billed = months.map(m => invoices.filter(i => i.date && i.date.startsWith(m.key)).reduce((s,i) => s + i.total, 0));
  const collected = months.map(m => collections.filter(c => c.date && c.date.startsWith(m.key)).reduce((s,c) => s + c.amount, 0));

  safeChart(ctx, {
    type: 'bar',
    data: {
      labels: months.map(m => m.label),
      datasets: [
        { label: 'Facturado', data: billed, backgroundColor: 'rgba(37,99,235,.7)', borderRadius: 4 },
        { label: 'Cobrado', data: collected, backgroundColor: 'rgba(16,185,129,.7)', borderRadius: 4 },
      ]
    },
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
