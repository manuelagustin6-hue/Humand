/* ===== DASHBOARD ===== */
function renderDashboard() {
  // El dashboard agrega todas las razones sociales (vista de grupo) y respeta el
  // proyecto activo del header: sin proyecto = General (todo el grupo), con proyecto
  // = solo esa obra. Así el tablero refleja el mismo modelo que el resto de la app.
  if (typeof DB.ensureAllCompaniesLoaded === 'function' && !window._dashLoadedAll) {
    window._dashLoadedAll = true;
    DB.ensureAllCompaniesLoaded().then(function(ok){ if (ok) { try { renderDashboard(); } catch(e) {} } });
  }
  function _consAll(col) { return (typeof DB.getAllConsolidated === 'function') ? DB.getAllConsolidated(col) : DB.getAll(col); }
  function _dashProj(col, getPid) { return filterByActiveProject(_consAll(col), getPid); }   // scoped por proyecto
  const _actProj = window.APP_STATE && window.APP_STATE.activeProject;

  const projects      = _actProj ? _consAll('projects').filter(function(p){ return p.id === _actProj; }) : _consAll('projects');
  const invoices      = _dashProj('invoices');
  const pos           = _dashProj('purchaseOrders');
  // Cobranzas: consolidadas; si hay proyecto activo, se acotan a las facturas de esa obra.
  let collections     = _consAll('collections');
  if (_actProj) {
    const _invIds = {}; invoices.forEach(function(i){ _invIds[i.id] = true; });
    collections = collections.filter(function(c){ return c.project_id ? c.project_id === _actProj : (c.invoice_id && _invIds[c.invoice_id]); });
  }
  const tasks         = _dashProj('ganttTasks');
  const supplierInvs  = _dashProj('supplierInvoices');
  const approvalInsts = _consAll('approvalInstances');
  const actualCosts   = _dashProj('actualCosts');
  const lics          = _dashProj('licitaciones');
  const partes        = _dashProj('partesDiarios');
  const bankAccounts  = _consAll('bankAccounts');      // nivel razón social, no proyecto
  const treasuryTx    = _consAll('treasuryTx');
  const paymentOrders = _dashProj('paymentOrders');
  const fiscalCal     = _consAll('fiscalCalendar');

  const today = todayStr();
  const thisMonth = today.slice(0, 7);
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

  // ── Tesorería KPIs ──
  function _accBalance(acc) {
    const txs = treasuryTx.filter(t => t.account_id === acc.id);
    const income  = txs.filter(t => t.type === 'income' || t.type === 'ingreso').reduce((s,t) => s+(t.amount||0),0);
    const expense = txs.filter(t => t.type === 'expense'|| t.type === 'egreso').reduce((s,t) => s+(t.amount||0),0);
    return (acc.initial_balance||0) + income - expense;
  }
  const accWithBal = bankAccounts.map(a => ({ ...a, bal: _accBalance(a) }));
  const totalARS = accWithBal.filter(a => (a.currency||'ARS')==='ARS').reduce((s,a)=>s+a.bal,0);
  const totalUSD = accWithBal.filter(a => a.currency==='USD').reduce((s,a)=>s+a.bal,0);
  const poThisMonth = paymentOrders.filter(po => po.date && po.date.startsWith(thisMonth));
  const paidThisMonth = poThisMonth.reduce((s,po) => s+(po.total||0),0);
  const pendingPO = paymentOrders.filter(po => po.status === 'pending').reduce((s,po)=>s+(po.total||0),0);

  // ── Vencimientos próximos (≤7 días) ──
  const in7 = new Date(); in7.setDate(in7.getDate()+7);
  const in7str = in7.toISOString().slice(0,10);
  const upcomingFiscal = fiscalCal.filter(f => !f.dismissed && !f.done && f.due_date >= today && f.due_date <= in7str)
    .sort((a,b)=>a.due_date.localeCompare(b.due_date));
  const overdueFiscal = fiscalCal.filter(f => !f.dismissed && !f.done && f.due_date < today)
    .sort((a,b)=>a.due_date.localeCompare(b.due_date));

  // ── Cuentas a cobrar por cliente ──
  const byClient = {};
  invoices.filter(i => i.status !== 'paid').forEach(i => {
    const k = i.client_name || 'Sin cliente';
    if (!byClient[k]) byClient[k] = { name: k, billed: 0, collected: 0 };
    byClient[k].billed += (i.total||0);
  });
  collections.forEach(c => {
    const inv = invoices.find(i => i.id === c.invoice_id);
    const k = (inv && inv.client_name) ? inv.client_name : null;
    if (k && byClient[k]) byClient[k].collected += (c.amount||0);
  });
  const clientBalances = Object.values(byClient)
    .map(c => ({ ...c, pending: c.billed - c.collected }))
    .filter(c => c.pending > 0)
    .sort((a,b) => b.pending - a.pending);

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
  const licCerradas     = lics.filter(l => l.status === 'closed').length;
  const licEnRevision   = lics.filter(l => l.status === 'en_revision').length;
  const licAdjudicadas  = lics.filter(l => l.status === 'awarded').length;

  const licPendingMine = lics.filter(function(lic) {
    if (lic.status !== 'closed') return false;
    if (!lic.winner_cot_id) return false;
    const steps = ['jefe_compras', 'gerencia', 'direccion'];
    const approvals = lic.approvals || [];
    for (var i = 0; i < steps.length; i++) {
      const key = steps[i];
      const done = approvals.find(function(a) { return a.key === key; });
      if (!done) {
        if (!currentUser) return false;
        const assigned = lic.approvers && lic.approvers[key];
        if (assigned) {
          const ids = assigned.userIds || (assigned.userId ? [assigned.userId] : []);
          return ids.length === 0 || ids.indexOf(currentUser.id) !== -1;
        }
        const cfg = (typeof _licGetAprobConfig === 'function') ? _licGetAprobConfig() : {};
        const cfgIds = (cfg[key] && cfg[key].user_ids) ? cfg[key].user_ids : [];
        return cfgIds.length === 0 || cfgIds.indexOf(currentUser.id) !== -1;
      }
      if (!done.approved) break;
    }
    return false;
  }).length;

  // ── Partes Diarios ──
  const partesHoy = partes.filter(p => p.date === today);
  const workersHoy = partesHoy.reduce((s, p) => s + (p.personal || []).reduce((ss, per) => ss + (per.cantidad || 0), 0), 0);

  // Helper de tarjeta KPI (bento) reutilizable — estilo mockup: ícono en cuadrado
  // arriba-izquierda, tendencia arriba-derecha, rótulo + número grande abajo.
  const _tagIco = (d) => d === 'up' ? '<i class="fas fa-arrow-trend-up"></i>' : d === 'down' ? '<i class="fas fa-arrow-trend-down"></i>' : '';
  const kpi = (o) => `
    <div class="kpi-card${o.dark ? ' dark' : ''}${o.nav ? ' clickable' : ''}"${o.nav ? ` onclick="navigate('${o.nav}')"` : ''}>
      <div class="kpi-top">
        <div class="kpi-ico ${o.ico}"><i class="fas ${o.fa}"></i></div>
        ${o.tag ? `<span class="kpi-tag ${o.tagDir || ''}">${_tagIco(o.tagDir)}${o.tag}</span>` : ''}
      </div>
      <div class="kpi-body">
        <div class="kpi-lbl">${o.lbl}</div>
        <div class="kpi-num ${o.numCls || ''}">${o.num}</div>
      </div>
    </div>`;

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-eyebrow"><i class="fas fa-gauge-high" style="font-size:14px"></i> Resumen ejecutivo</div>
    <div class="page-title">Dashboard</div>
    <div class="page-subtitle">Panorama del portafolio de obras y finanzas del grupo</div>
  </div>
  <div class="page-actions">
    <span style="font-size:12px;color:var(--text-muted)"><i class="fas fa-clock"></i> ${fmtDatetime(new Date().toISOString())}</span>
    <button class="btn btn-secondary btn-sm" onclick="renderDashboard()"><i class="fas fa-sync-alt"></i> Actualizar</button>
  </div>
</div>

<!-- OBRA KPIs -->
<div class="section-label"><i class="fas fa-building"></i> Obras y Financiero</div>
<div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
  ${kpi({ ico:'blue', fa:'fa-building', num: projects.length, lbl:'Proyectos', nav:'projects', tag: activeProjects + ' activos', tagDir:'up' })}
  ${kpi({ ico:'green', fa:'fa-dollar-sign', num: fmtMoneyK(totalBudget), lbl:'Presupuesto Total' })}
  ${kpi({ ico:'cyan', fa:'fa-file-invoice-dollar', num: fmtMoneyK(totalBilled), lbl:'Facturado Total', nav:'facturacion',
      tag: overdueInvoices > 0 ? (overdueInvoices + ' vencidas') : 'Al día', tagDir: overdueInvoices > 0 ? 'down' : 'up' })}
  ${kpi({ ico: pendingCollection > 0 ? 'yellow' : 'green', fa:'fa-hand-holding-dollar', num: fmtMoneyK(pendingCollection), lbl:'Pendiente de Cobro', nav:'cobranzas',
      tag: pendingCollection > 0 ? (fmtMoneyK(totalCollected) + ' cobrado') : 'Todo cobrado', tagDir: pendingCollection > 0 ? 'down' : 'up' })}
  ${kpi({ ico:'yellow', fa:'fa-shopping-cart', num: fmtMoneyK(totalPOs), lbl:'Órdenes de Compra', nav:'compras', tag: pos.length + ' emitidas' })}
  ${kpi({ ico: marginPct >= 15 ? 'green' : marginPct >= 0 ? 'yellow' : 'red', fa:'fa-percentage', num: fmtPct(marginPct), numCls: marginPct >= 0 ? 'pos' : 'neg', lbl:'Margen Bruto',
      tag: fmtMoneyK(grossMargin), tagDir: marginPct >= 0 ? 'up' : 'down' })}
  ${kpi({ ico: pendingApprovals > 0 ? 'red' : 'green', fa:'fa-check-double', num: pendingApprovals, lbl:'Aprobaciones', nav:'aprobaciones',
      tag: pendingApprovals > 0 ? 'Pendientes' : 'Al día', tagDir: pendingApprovals > 0 ? 'down' : 'up' })}
  ${kpi({ ico:'blue', fa:'fa-tasks', num: tasksInProgress, lbl:'Tareas en Ejecución', tag: tasks.filter(t=>t.status==='completed').length + ' completadas', tagDir:'up' })}
</div>

<!-- TESORERÍA KPIs -->
<div class="section-label"><i class="fas fa-landmark" style="color:var(--success)"></i> Tesorería</div>
<div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
  ${kpi({ ico:'green', fa:'fa-university', num: fmtMoneyK(totalARS), lbl:'Saldo Total ARS', nav:'cuentas_banco', tag: accWithBal.filter(a=>(a.currency||'ARS')==='ARS').length + ' cuenta(s)' })}
  ${kpi({ ico:'cyan', fa:'fa-dollar-sign', num: 'US$ ' + fmtNum(Math.round(totalUSD)), lbl:'Saldo Total USD', nav:'cuentas_banco', tag: accWithBal.filter(a=>a.currency==='USD').length + ' cuenta(s)' })}
  ${kpi({ ico:'red', fa:'fa-file-invoice', num: fmtMoneyK(paidThisMonth), lbl:'Pagado Este Mes', nav:'ordenes_pago', tag: poThisMonth.length + ' órdenes de pago', tagDir:'down' })}
  ${kpi({ ico: pendingPO > 0 ? 'yellow' : 'green', fa:'fa-hourglass-half', num: fmtMoneyK(pendingPO), lbl:'OP Pendientes', nav:'ordenes_pago',
      tag: pendingPO > 0 ? (paymentOrders.filter(po=>po.status==='pending').length + ' sin aprobar') : 'Al día', tagDir: pendingPO > 0 ? 'down' : 'up' })}
</div>

<!-- CHARTS + CUENTAS A COBRAR + VENCIMIENTOS -->
<div class="grid-3 mb-2" style="margin-top:16px">
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
      <span class="card-title"><i class="fas fa-users text-primary"></i> Cuentas a Cobrar</span>
      <button class="btn btn-sm btn-secondary" onclick="navigate('cuentas_cli')"><i class="fas fa-arrow-right"></i></button>
    </div>
    <div class="card-body" style="padding:0">
      ${clientBalances.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Cliente</th><th class="number-cell">Facturado</th><th class="number-cell">Pendiente</th></tr></thead>
        <tbody>${clientBalances.slice(0,6).map(c=>`<tr>
          <td style="font-size:12px;font-weight:600">${escapeHtml(c.name)}</td>
          <td class="number-cell" style="font-size:12px">${fmtMoney(c.billed)}</td>
          <td class="number-cell" style="font-size:12px;color:var(--danger);font-weight:700">${fmtMoney(c.pending)}</td>
        </tr>`).join('')}</tbody>
      </table></div>` : '<div class="empty-state" style="padding:24px"><i class="fas fa-check-circle" style="color:var(--success);opacity:1"></i><p>Sin saldos pendientes</p></div>'}
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-calendar-exclamation text-warning"></i> Vencimientos Fiscales</span>
      <button class="btn btn-sm btn-secondary" onclick="navigate('vencimientos')"><i class="fas fa-arrow-right"></i></button>
    </div>
    <div class="card-body" style="padding:0">
      ${(overdueFiscal.length + upcomingFiscal.length) === 0
        ? '<div class="empty-state" style="padding:24px"><i class="fas fa-check-circle" style="color:var(--success);opacity:1"></i><p>Sin vencimientos próximos</p></div>'
        : `<div style="padding:4px 0">
          ${overdueFiscal.map(f=>`<div style="display:flex;gap:10px;padding:8px 14px;border-bottom:1px solid var(--border);align-items:center;cursor:pointer" onclick="navigate('vencimientos')">
            <i class="fas fa-exclamation-circle text-danger" style="flex-shrink:0"></i>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(f.name)}</div>
              <div style="font-size:11px;color:var(--danger)">Vencido: ${fmtDate(f.due_date)}</div>
            </div>
          </div>`).join('')}
          ${upcomingFiscal.map(f=>{
            const days = Math.round((new Date(f.due_date)-new Date(today))/(86400000));
            const color = days<=1?'var(--danger)':days<=3?'var(--warning)':'var(--text-muted)';
            return `<div style="display:flex;gap:10px;padding:8px 14px;border-bottom:1px solid var(--border);align-items:center;cursor:pointer" onclick="navigate('vencimientos')">
              <i class="fas fa-clock" style="color:${color};flex-shrink:0"></i>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(f.name)}</div>
                <div style="font-size:11px;color:${color}">${days===0?'Hoy':days===1?'Mañana':'En '+days+' días'} — ${fmtDate(f.due_date)}</div>
              </div>
            </div>`;
          }).join('')}
        </div>`}
    </div>
  </div>
</div>

<!-- CUENTAS BANCARIAS + ALERTAS -->
<div class="grid-2" style="margin-top:0">
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-landmark text-primary"></i> Cuentas Bancarias y Cajas</span>
      <button class="btn btn-sm btn-secondary" onclick="navigate('cuentas_banco')"><i class="fas fa-arrow-right"></i> Ver todas</button>
    </div>
    <div class="card-body" style="padding:0">
      ${bankAccounts.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Cuenta</th><th>Banco</th><th>Moneda</th><th class="number-cell">Saldo</th></tr></thead>
        <tbody>${accWithBal.map(a=>`<tr>
          <td style="font-size:12px;font-weight:600">${escapeHtml(a.name||a.bank)}</td>
          <td style="font-size:12px;color:var(--text-muted)">${escapeHtml(a.bank||'')}</td>
          <td><span style="font-size:11px;font-weight:600">${a.currency||'ARS'}</span></td>
          <td class="number-cell" style="font-weight:700;color:${a.bal>=0?'var(--success)':'var(--danger)'}">${a.currency==='USD'?'US$ '+fmtNum(Math.round(a.bal)):fmtMoney(a.bal)}</td>
        </tr>`).join('')}</tbody>
      </table></div>`
      : '<div class="empty-state" style="padding:30px"><i class="fas fa-landmark"></i><p>Sin cuentas registradas</p><button class="btn btn-primary btn-sm" onclick="navigate(\'cuentas_banco\')">Agregar cuenta</button></div>'}
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-bell text-warning"></i> Alertas y Pendientes</span>
    </div>
    <div class="card-body" style="padding:0">
      ${buildAlerts(invoices, pos, tasks, lics, supplierInvs)}
    </div>
  </div>
</div>

<!-- ESTADO DE OBRAS + LICITACIONES -->
<div class="grid-2" style="margin-top:16px">
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
              const ptasks = tasks.filter(t => t.project_id === p.id);
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
      <span class="card-title"><i class="fas fa-gavel text-primary"></i> Licitaciones Activas</span>
      <button class="btn btn-sm btn-secondary" onclick="navigate('licitaciones')"><i class="fas fa-arrow-right"></i> Ver todas</button>
    </div>
    <div class="card-body" style="padding:0">
      ${_dashLicitacionesTable(lics)}
    </div>
  </div>
</div>

<!-- COSTOS POR OBRA -->
<div class="section-label"><i class="fas fa-hard-hat" style="color:var(--danger)"></i> Costos de Obra</div>
<div class="grid-2" style="margin-bottom:16px">
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-chart-bar text-primary"></i> Presupuesto vs Costo Real</span>
      <button class="btn btn-sm btn-secondary" onclick="navigate('reporte_costos')"><i class="fas fa-arrow-right"></i> Reporte</button>
    </div>
    <div class="card-body">
      <div class="chart-wrap"><canvas id="chart-budget"></canvas></div>
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-table text-primary"></i> Desvío Presupuestario</span>
    </div>
    <div class="card-body" style="padding:0">
      ${projects.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Proyecto</th><th class="number-cell">Presupuesto</th><th class="number-cell">Costo Real</th><th class="number-cell">Desvío</th></tr></thead>
        <tbody>${projects.map(function(p) {
          var pCosts = actualCosts.filter(function(a) { return a.project_id === p.id; });
          var cost = pCosts.reduce(function(s,a) { return s+(a.amount||0); }, 0);
          var dev = (p.budget||0) - cost;
          var devPct = (p.budget||0) > 0 ? (dev/(p.budget||0)*100) : 0;
          var color = dev >= 0 ? 'var(--success)' : 'var(--danger)';
          return '<tr onclick="navigate(\'reporte_costos\')" style="cursor:pointer"><td style="font-size:12px;font-weight:600">' + escapeHtml(p.name) + '</td>' +
            '<td class="number-cell" style="font-size:12px">' + fmtMoneyK(p.budget||0) + '</td>' +
            '<td class="number-cell" style="font-size:12px">' + fmtMoneyK(cost) + '</td>' +
            '<td class="number-cell" style="font-size:12px;font-weight:700;color:' + color + '">' + (dev<0?'-':'') + fmtMoneyK(Math.abs(dev)) + ' <span style="font-size:10px">(' + fmtPct(devPct) + ')</span></td></tr>';
        }).join('')}</tbody>
        <tfoot><tr class="total-row">
          <td><strong>Total</strong></td>
          <td class="number-cell"><strong>${fmtMoneyK(totalBudget)}</strong></td>
          <td class="number-cell"><strong>${fmtMoneyK(totalActual)}</strong></td>
          <td class="number-cell" style="font-weight:700;color:${(totalBudget-totalActual)>=0?'var(--success)':'var(--danger)'}">
            ${(totalBudget-totalActual)<0?'-':''}${fmtMoneyK(Math.abs(totalBudget-totalActual))}
          </td>
        </tr></tfoot>
      </table></div>` : '<div class="empty-state" style="padding:24px"><i class="fas fa-building"></i><p>Sin proyectos</p></div>'}
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
          ${invoices.slice(-5).reverse().map(inv => {
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

function buildAlerts(invoices, pos, tasks, lics, supplierInvs) {
  const alerts = [];
  const today = todayStr();
  lics = lics || [];
  // Mapas consolidados para nombres (los getById solo verían la empresa activa).
  const _projMap = {}; (typeof DB.getAllConsolidated === 'function' ? DB.getAllConsolidated('projects') : DB.getAll('projects')).forEach(function(p){ _projMap[p.id] = p; });
  const _supMap  = {}; (typeof DB.getAllConsolidated === 'function' ? DB.getAllConsolidated('suppliers') : DB.getAll('suppliers')).forEach(function(s){ _supMap[s.id] = s; });

  // Facturas vencidas
  invoices.filter(i => i.status === 'overdue').forEach(i => {
    const p = _projMap[i.project_id];
    alerts.push({ type: 'danger', icon: 'fa-exclamation-circle', msg: `Factura vencida ${escapeHtml(i.number)} — ${p ? escapeHtml(p.name) : ''} — ${fmtMoney(i.total, i.currency || i._company_currency)}`, action: "navigate('facturacion')" });
  });

  // Facturas proveedor vencidas
  (supplierInvs || []).filter(si => si.status === 'pending' && si.due_date && si.due_date < today).forEach(si => {
    const sup = _supMap[si.supplier_id];
    alerts.push({ type: 'danger', icon: 'fa-file-invoice-dollar', msg: `Fact. prov. vencida: ${escapeHtml(si.number)} — ${sup ? escapeHtml(sup.name) : ''} — ${fmtMoney(si.total, si.currency || si._company_currency)}`, action: "navigate('compras')" });
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
