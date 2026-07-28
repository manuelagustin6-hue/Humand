/* ===== REPORTE TESORERÍA ===== */

window._rptTesFilters = window._rptTesFilters || { period: 'month', from: '', to: '', account: '', currency: '' };

// expense categories attributed to "Proveedores"
var RTES_PROV_CATS = ['Pago proveedor', 'Materiales menores', 'Servicios', 'Otros egresos'];

// ── MAIN RENDER ───────────────────────────────────────────────────────────────
function renderReporteTesoria() {
  if (typeof DB.ensureAllCompaniesLoaded === 'function' && !window._tesLoadedAll) {
    window._tesLoadedAll = true;
    DB.ensureAllCompaniesLoaded().then(function(ok){ if (ok) { try { renderReporteTesoria(); } catch(e) {} } });
  }
  const accounts = _tesScopedAccounts();

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Reporte de Tesorería</div>
    <div class="page-subtitle">Saldo inicial, movimientos por origen y saldo final por cuenta</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="exportRptTesoreria()"><i class="fas fa-download"></i> Exportar</button>
  </div>
</div>

${(typeof _tesCompanyOptions === 'function') ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
  <i class="fas fa-city" style="color:var(--primary)"></i><span style="font-size:12px;font-weight:600;color:var(--text-muted)">Razón Social</span>
  <select class="form-control" style="width:230px" onchange="tesSetCompany(this.value)">${_tesCompanyOptions()}</select>
</div>` : ''}

<div id="rpt-tes-kpis"></div>

<div class="filter-bar mt-2">
  <select class="form-control" style="width:170px" id="rpt-tes-period"
    onchange="window._rptTesFilters.period=this.value;document.getElementById('rpt-tes-dates').style.display=this.value==='custom'?'flex':'none';if(this.value!=='custom')_rptTesRefresh()">
    <option value="month"      ${window._rptTesFilters.period==='month'     ?'selected':''}>Este mes</option>
    <option value="prev_month" ${window._rptTesFilters.period==='prev_month'?'selected':''}>Mes anterior</option>
    <option value="quarter"    ${window._rptTesFilters.period==='quarter'   ?'selected':''}>Trimestre</option>
    <option value="year"       ${window._rptTesFilters.period==='year'      ?'selected':''}>Este año</option>
    <option value="custom"     ${window._rptTesFilters.period==='custom'    ?'selected':''}>Personalizado</option>
  </select>
  <div id="rpt-tes-dates" style="display:${window._rptTesFilters.period==='custom'?'flex':'none'};gap:8px;align-items:center">
    <input type="date" class="form-control" style="width:150px" id="rpt-tes-from"
      value="${window._rptTesFilters.from}" onchange="window._rptTesFilters.from=this.value;_rptTesRefresh()">
    <span style="color:var(--text-muted);font-size:13px">→</span>
    <input type="date" class="form-control" style="width:150px" id="rpt-tes-to"
      value="${window._rptTesFilters.to}" onchange="window._rptTesFilters.to=this.value;_rptTesRefresh()">
  </div>
  <select class="form-control" style="width:190px"
    onchange="window._rptTesFilters.account=this.value;_rptTesRefresh()">
    <option value="">Todas las cuentas</option>
    ${accounts.map(a => `<option value="${a.id}" ${window._rptTesFilters.account===a.id?'selected':''}>${escapeHtml(a.name||a.bank)}</option>`).join('')}
  </select>
  <select class="form-control" style="width:110px"
    onchange="window._rptTesFilters.currency=this.value;_rptTesRefresh()">
    <option value="">Monedas</option>
    <option value="ARS" ${window._rptTesFilters.currency==='ARS'?'selected':''}>ARS</option>
    <option value="USD" ${window._rptTesFilters.currency==='USD'?'selected':''}>USD</option>
  </select>
</div>

<div id="rpt-tes-table" class="mt-2"></div>
`;
  _rptTesRefresh();
}

// ── COMPUTE + RENDER ─────────────────────────────────────────────────────────
function _rptTesRefresh() {
  const f    = window._rptTesFilters;
  const rng  = _rptTesPeriodRange();
  if (!rng) return;
  const { from, to } = rng;

  let accounts = _tesScopedAccounts();
  if (f.account)  accounts = accounts.filter(a => a.id === f.account);
  if (f.currency) accounts = accounts.filter(a => (a.currency || 'ARS') === f.currency);

  const allTxs = _tesScopedTx();
  const rows   = accounts.map(acc => _rptTesCalcRow(acc, allTxs, from, to));

  _rptTesBuildKPIs(rows);

  const tableEl = document.getElementById('rpt-tes-table');
  if (tableEl) tableEl.innerHTML = _rptTesBuildTable(rows, from, to);
}

function _rptTesPeriodRange() {
  const f = window._rptTesFilters;
  if (f.period === 'custom') {
    if (!f.from || !f.to) return null;
    return { from: f.from, to: f.to };
  }
  return _periodRange(f.period);
}

function _rptTesCalcRow(account, allTxs, from, to) {
  const acctTxs = allTxs.filter(t => t.account_id === account.id);

  // Saldo inicial: opening balance + all movements BEFORE the period
  const preNet = acctTxs
    .filter(t => t.date < from)
    .reduce((s, t) => s + (t.type === 'income' ? (t.amount || 0) : -(t.amount || 0)), 0);
  const saldoInicial = parseFloat(account.initial_balance || 0) + preNet;

  // Movements inside the period
  const periodTxs = acctTxs.filter(t => t.date >= from && t.date <= to);

  const movClientes    = periodTxs
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + (t.amount || 0), 0);

  const movProveedores = periodTxs
    .filter(t => t.type === 'expense' && RTES_PROV_CATS.includes(t.category))
    .reduce((s, t) => s + (t.amount || 0), 0);

  // Everything else (salaries, taxes, general expenses, uncategorised)
  const movTesoreria   = periodTxs
    .filter(t => t.type === 'expense' && !RTES_PROV_CATS.includes(t.category))
    .reduce((s, t) => s + (t.amount || 0), 0);

  const variacionNeta  = movClientes - movProveedores - movTesoreria;
  const saldoFinal     = saldoInicial + variacionNeta;

  return { account, saldoInicial, movClientes, movProveedores, movTesoreria, variacionNeta, saldoFinal, periodTxs };
}

// ── KPI CARDS ─────────────────────────────────────────────────────────────────
function _rptTesBuildKPIs(rows) {
  const totalSaldo    = rows.reduce((s, r) => s + r.saldoFinal,     0);
  const totalIngresos = rows.reduce((s, r) => s + r.movClientes,    0);
  const totalEgresos  = rows.reduce((s, r) => s + r.movProveedores + r.movTesoreria, 0);
  const variacion     = totalIngresos - totalEgresos;

  const el = document.getElementById('rpt-tes-kpis');
  if (!el) return;
  el.innerHTML = `
<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card">
    <div class="stat-icon blue"><i class="fas fa-landmark"></i></div>
    <div style="min-width:0">
      <div class="stat-value">${fmtMoneyK(totalSaldo)}</div>
      <div class="stat-label">Saldo Total Actual</div>
      <div class="stat-delta up"><i class="fas fa-info-circle"></i> ${fmtMoney(totalSaldo)}</div>
    </div>
  </div>
  <div class="stat-card">
    <div class="stat-icon green"><i class="fas fa-arrow-circle-down"></i></div>
    <div style="min-width:0">
      <div class="stat-value">${fmtMoneyK(totalIngresos)}</div>
      <div class="stat-label">Ingresos del Período</div>
      <div class="stat-delta up"><i class="fas fa-users"></i> mov. clientes</div>
    </div>
  </div>
  <div class="stat-card">
    <div class="stat-icon red"><i class="fas fa-arrow-circle-up"></i></div>
    <div style="min-width:0">
      <div class="stat-value">${fmtMoneyK(totalEgresos)}</div>
      <div class="stat-label">Egresos del Período</div>
      <div class="stat-delta down"><i class="fas fa-truck"></i> proveedores + tesorería</div>
    </div>
  </div>
  <div class="stat-card">
    <div class="stat-icon ${variacion >= 0 ? 'green' : 'red'}"><i class="fas fa-chart-line"></i></div>
    <div style="min-width:0">
      <div class="stat-value" style="color:${variacion >= 0 ? 'var(--success)' : 'var(--danger)'}">
        ${variacion >= 0 ? '+' : ''}${fmtMoneyK(variacion)}
      </div>
      <div class="stat-label">Variación Neta</div>
      <div class="stat-delta ${variacion >= 0 ? 'up' : 'down'}">
        <i class="fas fa-${variacion >= 0 ? 'plus' : 'minus'}-circle"></i> del período
      </div>
    </div>
  </div>
</div>`;
}

// ── TABLE ─────────────────────────────────────────────────────────────────────
function _rptTesBuildTable(rows, from, to) {
  if (!rows.length) {
    return '<div class="empty-state"><i class="fas fa-university"></i><p>Sin cuentas para mostrar</p></div>';
  }

  const tot = {
    saldoInicial:    rows.reduce((s, r) => s + r.saldoInicial,    0),
    movClientes:     rows.reduce((s, r) => s + r.movClientes,     0),
    movProveedores:  rows.reduce((s, r) => s + r.movProveedores,  0),
    movTesoreria:    rows.reduce((s, r) => s + r.movTesoreria,    0),
    variacionNeta:   rows.reduce((s, r) => s + r.variacionNeta,   0),
    saldoFinal:      rows.reduce((s, r) => s + r.saldoFinal,      0),
  };

  const sign = (n, pos) => n === 0 ? fmtMoney(0) : (pos ? '+' : '-') + fmtMoney(Math.abs(n));

  return `
<div class="card">
  <div class="card-body" style="padding:0">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cuenta</th>
            <th>Moneda</th>
            <th class="number-cell">Saldo Inicial</th>
            <th class="number-cell" style="color:var(--success)">
              <i class="fas fa-arrow-circle-down" style="font-size:11px"></i> Mov. Clientes
            </th>
            <th class="number-cell" style="color:var(--danger)">
              <i class="fas fa-arrow-circle-up" style="font-size:11px"></i> Mov. Proveedores
            </th>
            <th class="number-cell" style="color:var(--warning)">
              <i class="fas fa-arrows-left-right" style="font-size:11px"></i> Mov. Tesorería
            </th>
            <th class="number-cell">Variación Neta</th>
            <th class="number-cell">Saldo Final</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => {
            const acc = r.account;
            const cur = acc.currency || 'ARS';
            const netColor = r.variacionNeta >= 0 ? 'var(--success)' : 'var(--danger)';
            return `<tr>
              <td>
                <div style="font-weight:600;font-size:13px">${escapeHtml(acc.name || acc.bank || 'Sin nombre')}</div>
                ${acc.bank && acc.name && acc.name !== acc.bank
                  ? `<div style="font-size:11px;color:var(--text-muted)">${escapeHtml(acc.bank)}</div>` : ''}
              </td>
              <td>
                <span style="font-size:11px;font-weight:700;background:var(--bg);padding:2px 7px;border-radius:4px">${cur}</span>
              </td>
              <td class="number-cell">${fmtMoney(r.saldoInicial)}</td>
              <td class="number-cell" style="color:var(--success);font-weight:600">
                ${r.movClientes > 0 ? '+' + fmtMoney(r.movClientes) : '<span style="color:var(--text-muted)">—</span>'}
              </td>
              <td class="number-cell" style="color:var(--danger)">
                ${r.movProveedores > 0 ? '-' + fmtMoney(r.movProveedores) : '<span style="color:var(--text-muted)">—</span>'}
              </td>
              <td class="number-cell" style="color:var(--warning)">
                ${r.movTesoreria > 0 ? '-' + fmtMoney(r.movTesoreria) : '<span style="color:var(--text-muted)">—</span>'}
              </td>
              <td class="number-cell" style="color:${netColor};font-weight:600">
                ${r.variacionNeta !== 0 ? (r.variacionNeta > 0 ? '+' : '') + fmtMoney(r.variacionNeta) : '<span style="color:var(--text-muted)">—</span>'}
              </td>
              <td class="number-cell" style="font-weight:700;font-size:14px">${fmtMoney(r.saldoFinal)}</td>
              <td>
                <button class="btn btn-ghost btn-sm" title="Ver movimientos del período"
                  onclick="_rptTesDetailModal('${acc.id}','${from}','${to}')">
                  <i class="fas fa-list-ul"></i>
                </button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr style="font-weight:700;background:var(--bg-secondary,var(--bg));border-top:2px solid var(--border)">
            <td colspan="2" style="padding:10px 12px;font-size:12px;letter-spacing:.04em;text-transform:uppercase">Totales</td>
            <td class="number-cell">${fmtMoney(tot.saldoInicial)}</td>
            <td class="number-cell" style="color:var(--success)">
              ${tot.movClientes > 0 ? '+' + fmtMoney(tot.movClientes) : '—'}
            </td>
            <td class="number-cell" style="color:var(--danger)">
              ${tot.movProveedores > 0 ? '-' + fmtMoney(tot.movProveedores) : '—'}
            </td>
            <td class="number-cell" style="color:var(--warning)">
              ${tot.movTesoreria > 0 ? '-' + fmtMoney(tot.movTesoreria) : '—'}
            </td>
            <td class="number-cell" style="color:${tot.variacionNeta >= 0 ? 'var(--success)' : 'var(--danger)'}">
              ${tot.variacionNeta !== 0 ? (tot.variacionNeta > 0 ? '+' : '') + fmtMoney(tot.variacionNeta) : '—'}
            </td>
            <td class="number-cell" style="font-size:15px">${fmtMoney(tot.saldoFinal)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</div>`;
}

// ── DETAIL MODAL ─────────────────────────────────────────────────────────────
function _rptTesDetailModal(accountId, from, to) {
  const account = DB.getById('bankAccounts', accountId);
  if (!account) return;

  const txs = _tesScopedTx()
    .filter(t => t.account_id === accountId && t.date >= from && t.date <= to)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const projects = DB.getAll('projects');
  const netTotal = txs.reduce((s, t) => s + (t.type === 'income' ? (t.amount || 0) : -(t.amount || 0)), 0);

  openModal(
    `Movimientos — ${escapeHtml(account.name || account.bank)}`,
    `<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
       Período: <strong>${from}</strong> → <strong>${to}</strong>
       &nbsp;·&nbsp; ${txs.length} movimiento${txs.length !== 1 ? 's' : ''}
     </div>
     <div class="table-wrap">
       <table>
         <thead><tr>
           <th>Fecha</th><th>Tipo</th><th>Categoría</th>
           <th>Descripción</th><th>Proyecto</th>
           <th class="number-cell">Importe</th>
         </tr></thead>
         <tbody>
           ${txs.length === 0
             ? '<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text-muted)">Sin movimientos en este período</td></tr>'
             : txs.map(t => {
                 const isInc = t.type === 'income';
                 const proj  = projects.find(p => p.id === t.project_id);
                 const catCls = isInc ? 'badge-green' : (RTES_PROV_CATS.includes(t.category) ? 'badge-red' : 'badge-yellow');
                 return `<tr>
                   <td style="font-size:12px;white-space:nowrap">${fmtDate(t.date)}</td>
                   <td><span class="badge ${isInc ? 'badge-green' : 'badge-red'}">${isInc ? 'Ingreso' : 'Egreso'}</span></td>
                   <td><span class="badge ${catCls}" style="font-size:11px">${escapeHtml(t.category || '—')}</span></td>
                   <td style="font-size:12px">${escapeHtml(t.description || '')}</td>
                   <td style="font-size:12px;color:var(--text-muted)">${escapeHtml(proj?.name || '')}</td>
                   <td class="number-cell" style="font-weight:600;color:${isInc ? 'var(--success)' : 'var(--danger)'}">
                     ${isInc ? '+' : '-'}${fmtMoney(t.amount || 0)}
                   </td>
                 </tr>`;
               }).join('')
           }
         </tbody>
         ${txs.length > 0 ? `
         <tfoot>
           <tr style="font-weight:700;border-top:2px solid var(--border)">
             <td colspan="5" style="text-align:right;padding:10px 12px">Variación neta del período:</td>
             <td class="number-cell" style="font-size:14px;color:${netTotal >= 0 ? 'var(--success)' : 'var(--danger)'}">
               ${netTotal >= 0 ? '+' : ''}${fmtMoney(netTotal)}
             </td>
           </tr>
         </tfoot>` : ''}
       </table>
     </div>`,
    'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>'
  );
}

// ── EXPORT ─────────────────────────────────────────────────────────────────────
function exportRptTesoreria() {
  const rng = _rptTesPeriodRange();
  if (!rng) { toast('Seleccioná un período válido', 'error'); return; }
  const { from, to } = rng;
  const f = window._rptTesFilters;

  let accounts = _tesScopedAccounts();
  if (f.account)  accounts = accounts.filter(a => a.id === f.account);
  if (f.currency) accounts = accounts.filter(a => (a.currency || 'ARS') === f.currency);

  const allTxs = _tesScopedTx();
  const rows   = accounts.map(acc => _rptTesCalcRow(acc, allTxs, from, to));

  exportXLSX('reporte_tesoreria.xlsx',
    ['Cuenta', 'Banco', 'Moneda', 'Saldo Inicial', 'Mov. Clientes', 'Mov. Proveedores', 'Mov. Tesorería', 'Variación Neta', 'Saldo Final'],
    rows.map(r => [
      r.account.name || '',
      r.account.bank || '',
      r.account.currency || 'ARS',
      r.saldoInicial,
      r.movClientes,
      r.movProveedores,
      r.movTesoreria,
      r.variacionNeta,
      r.saldoFinal,
    ])
  );
  toast(rows.length + ' cuenta' + (rows.length !== 1 ? 's' : '') + ' exportada' + (rows.length !== 1 ? 's' : ''), 'success');
}
