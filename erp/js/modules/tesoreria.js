/* ===== TESORERÍA ===== */
window._tesCompany = window._tesCompany || '';   // filtro razón social ('' = todas)
function _tesScopedAccounts() {
  var a = (typeof DB.getAllConsolidated === 'function') ? DB.getAllConsolidated('bankAccounts') : DB.getAll('bankAccounts');
  if (window._tesCompany) a = a.filter(function(x){ return x._company_id === window._tesCompany; });
  return a;
}
function _tesScopedTx() {
  var t = (typeof DB.getAllConsolidated === 'function') ? DB.getAllConsolidated('treasuryTx') : DB.getAll('treasuryTx');
  if (window._tesCompany) t = t.filter(function(x){ return x._company_id === window._tesCompany; });
  return t;
}
function _tesCompanyOptions() {
  return '<option value="">Todas las razones sociales</option>' +
    (DB.getAllCompanies() || []).map(function(c){ return '<option value="'+c.id+'"'+(window._tesCompany===c.id?' selected':'')+'>'+escapeHtml(c.legalName||c.name)+'</option>'; }).join('');
}
// Consolidación por moneda: convertir todo a una moneda para poder sumar disponibilidades.
window._tesConsol = window._tesConsol || '';   // '' = por moneda | 'USD'/'ARS'/... = convertir todo
function _tesConsolOptions() {
  return '<option value="">Por moneda</option>' +
    ((typeof DB.getAllCurrencies === 'function' ? DB.getAllCurrencies() : []).map(function(c){ return '<option value="'+c.id+'"'+(window._tesConsol===c.id?' selected':'')+'>'+escapeHtml(c.id)+'</option>'; }).join(''));
}
function _tesConv(amount, fromCur) {
  if (!window._tesConsol) return amount;
  return DB.convertCurrency(amount || 0, fromCur || 'ARS', window._tesConsol);
}
function tesSetConsol(v) {
  window._tesConsol = v || '';
  var mod = window.APP_STATE && window.APP_STATE.currentModule;
  if (typeof navigate === 'function' && mod) { navigate(mod); return; }
  renderReporteTesoria();
}
function tesSetCompany(id) {
  window._tesCompany = id || '';
  if (id) { DB.setCompany(id); if (window.APP_STATE) window.APP_STATE.activeCompany = id; }
  // Re-renderiza SIEMPRE la pantalla actual (Operaciones / Cuentas / Reporte) por la
  // vía canónica — nunca saltar a otra pantalla.
  var mod = window.APP_STATE && window.APP_STATE.currentModule;
  if (typeof navigate === 'function' && mod) { navigate(mod); return; }
  if (window.MODULES && window.MODULES[mod] && typeof window.MODULES[mod].render === 'function') { window.MODULES[mod].render(); return; }
  renderTesoreria();
}
// Antes de actuar sobre una cuenta/movimiento de otra razón social, la activamos.
function _tesEnsureCompany(id, coll) {
  coll = coll || 'treasuryTx';
  if (DB.getById(coll, id)) return true;
  var found = (typeof DB.getAllConsolidated === 'function' ? DB.getAllConsolidated(coll) : []).find(function(x){ return x.id === id; });
  if (found && found._company_id && found._company_id !== DB._companyId) {
    DB.setCompany(found._company_id); if (window.APP_STATE) window.APP_STATE.activeCompany = found._company_id; return true;
  }
  return !!found;
}

function renderTesoreria() {
  if (typeof DB.ensureAllCompaniesLoaded === 'function' && !window._tesLoadedAll) {
    window._tesLoadedAll = true;
    DB.ensureAllCompaniesLoaded().then(function(ok){ if (ok) { try { renderTesoreria(); } catch(e) {} } });
  }
  const accounts = _tesScopedAccounts();
  const txs = _tesScopedTx();
  const txsP = filterByActiveProject(txs);   // filtrado por proyecto para movimientos/flujo (saldos van completos)
  const projects = (typeof DB.getAllProjectsConsolidated === 'function') ? DB.getAllProjectsConsolidated() : DB.getAll('projects');

  // Calc balances
  const accountsWithBalance = accounts.map(acc => {
    const income = txs.filter(t => t.account_id === acc.id && t.type === 'income').reduce((s,t) => s+t.amount, 0);
    const expense = txs.filter(t => t.account_id === acc.id && t.type === 'expense').reduce((s,t) => s+t.amount, 0);
    return { ...acc, balance: (acc.initial_balance || 0) + income - expense, income, expense };
  });

  // Moneda de cada cuenta
  const accCur = {};
  accounts.forEach(a => { accCur[a.id] = a.currency || 'ARS'; });

  // Saldo por moneda (incluye TODOS los movimientos: FX/intercompany mueven plata real)
  const balByCur = {};
  accountsWithBalance.forEach(a => { const c = a.currency || 'ARS'; balByCur[c] = (balByCur[c] || 0) + a.balance; });

  // Ingresos/Egresos OPERATIVOS (excluir transferencias FX e intercompany), agrupados por moneda
  const operativeTx = txs.filter(t => t.tx_type !== 'fx' && t.tx_type !== 'intercompany');
  const _sumByCur = (list) => {
    const m = {};
    list.forEach(t => { const c = accCur[t.account_id] || 'ARS'; m[c] = (m[c] || 0) + (t.amount || 0); });
    return m;
  };
  const incomeByCur  = _sumByCur(operativeTx.filter(t => t.type === 'income'));
  const expenseByCur = _sumByCur(operativeTx.filter(t => t.type === 'expense'));
  const netByCur = {};
  Object.keys(incomeByCur).forEach(c => { netByCur[c] = (netByCur[c] || 0) + incomeByCur[c]; });
  Object.keys(expenseByCur).forEach(c => { netByCur[c] = (netByCur[c] || 0) - expenseByCur[c]; });

  // Renderiza un importe multi-moneda (una línea por moneda presente)
  const _curBlock = (map, cls) => {
    const keys = Object.keys(map).filter(c => Math.abs(map[c]) > 0.005);
    if (!keys.length) return `<div class="stat-value ${cls}">${fmtMoney(0)}</div>`;
    return keys.map(c => `<div class="stat-value ${cls}"${keys.length > 1 ? ' style="font-size:17px"' : ''}>${fmtMoney(map[c], c)}</div>`).join('');
  };
  const _netCls = (map) => (Object.keys(map).every(c => map[c] >= 0) ? 'text-success' : 'text-danger');

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Tesorería</div>
    <div class="page-subtitle">Gestión de cuentas bancarias, flujo de caja e ingresos/egresos</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="openBankAccountForm()"><i class="fas fa-university"></i> Nueva Cuenta</button>
    <button class="btn btn-success" onclick="openTxForm('income')"><i class="fas fa-plus"></i> Ingreso</button>
    <button class="btn btn-danger" onclick="openTxForm('expense')"><i class="fas fa-minus"></i> Egreso</button>
    <button class="btn btn-secondary" onclick="openFxForm()" title="Cambio de moneda entre cuentas"><i class="fas fa-right-left"></i> Cambio FX</button>
    <button class="btn btn-secondary" onclick="openIntercompanyForm()" title="Transferencia entre sociedades"><i class="fas fa-building-columns"></i> Entre Sociedades</button>
  </div>
</div>

<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
  <i class="fas fa-city" style="color:var(--primary)"></i><span style="font-size:12px;font-weight:600;color:var(--text-muted)">Razón Social</span>
  <select class="form-control" style="width:230px" onchange="tesSetCompany(this.value)">${_tesCompanyOptions()}</select>
</div>

<!-- ACCOUNT CARDS -->
<div class="grid-auto mb-2">
  ${accountsWithBalance.map(acc => `
  <div class="card" style="cursor:pointer" onclick="showAccountTx('${acc.id}')">
    <div class="card-header" style="padding:14px 16px">
      <div>
        <div style="font-size:13px;font-weight:600">${escapeHtml(acc.name)}</div>
        <div style="font-size:11px;color:var(--text-muted)">${escapeHtml(acc.bank||'')}</div>
        <div style="font-size:11px;color:var(--text-muted)">${escapeHtml(acc.account_number||'')}</div>
        ${(!window._tesCompany && acc._company_name) ? `<div style="font-size:10px;color:var(--primary);font-weight:600;margin-top:2px">${escapeHtml(acc._company_name)}</div>` : ''}
      </div>
      <div style="text-align:right">
        <span class="badge ${acc.currency === 'USD' ? 'badge-green' : 'badge-blue'}">${acc.currency}</span>
        <div style="font-size:18px;font-weight:700;color:var(--primary);margin-top:4px">${acc.currency === 'USD' ? 'US$ ' : '$ '}${fmtNum(Math.round(acc.balance))}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;padding:10px 16px;gap:8px;border-top:1px solid var(--border)">
      <div style="font-size:11px"><span class="text-success">▲ Ingresos: ${fmtMoney(acc.income, acc.currency)}</span></div>
      <div style="font-size:11px;text-align:right"><span class="text-danger">▼ Egresos: ${fmtMoney(acc.expense, acc.currency)}</span></div>
    </div>
  </div>`).join('')}
  <div class="stat-card" style="flex-direction:column;justify-content:center;min-height:110px">
    <div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:6px">SALDO TOTAL</div>
    <div style="color:var(--primary);font-weight:700">${(function(){
      const keys = Object.keys(balByCur).filter(c => Math.abs(balByCur[c]) > 0.005);
      if (!keys.length) return `<span style="font-size:24px">${fmtMoney(0)}</span>`;
      return keys.map(c => `<div style="font-size:${keys.length > 1 ? '18px' : '24px'}">${fmtMoney(balByCur[c], c)}</div>`).join('');
    })()}</div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${accounts.length} cuentas</div>
  </div>
</div>

<!-- SUMMARY (operativo, sin transferencias FX/intercompany) -->
<div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-arrow-down"></i></div><div>
    ${_curBlock(incomeByCur, 'text-success')}<div class="stat-label">Ingresos Operativos</div></div></div>
  <div class="stat-card"><div class="stat-icon red"><i class="fas fa-arrow-up"></i></div><div>
    ${_curBlock(expenseByCur, 'text-danger')}<div class="stat-label">Egresos Operativos</div></div></div>
  <div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-balance-scale"></i></div><div>
    ${_curBlock(netByCur, _netCls(netByCur))}<div class="stat-label">Resultado Neto</div></div></div>
</div>

<div id="tesoreria-tabs" class="mt-2">
  <div class="tabs">
    <button class="tab-btn" data-tab="tab-movimientos">Movimientos</button>
    <button class="tab-btn" data-tab="tab-cashflow">Flujo de Caja</button>
    <button class="tab-btn" data-tab="tab-cuentas">Cuentas</button>
  </div>
  <div id="tab-movimientos" class="tab-content">
    ${renderTxTable(txsP, accounts, projects)}
  </div>
  <div id="tab-cashflow" class="tab-content">
    ${renderCashflowView(txsP)}
  </div>
  <div id="tab-cuentas" class="tab-content">
    ${renderAccountsTable(accountsWithBalance)}
  </div>
</div>
  `;

  initTabs('tesoreria-tabs');
  setTimeout(() => renderCashflowChartTesoreria(txsP), 100);
}

function renderTxTable(txs, accounts, projects) {
  const sorted = txs.slice().sort((a,b) => (b.date||'').localeCompare(a.date||''));
  return `
<div class="filter-bar">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar movimiento..." oninput="filterTx(this.value)">
  </div>
  <select class="form-control" style="width:130px" onchange="filterTx(undefined, this.value)">
    <option value="">Todos</option>
    <option value="income">Solo ingresos</option>
    <option value="expense">Solo egresos</option>
  </select>
  <select class="form-control" style="width:150px" onchange="filterTx(undefined, undefined, this.value)">
    <option value="">Conta. A y B</option>
    <option value="A">Solo Contabilidad A</option>
    <option value="B">Solo Contabilidad B</option>
  </select>
  <button class="btn btn-secondary" onclick="exportTx()"><i class="fas fa-download"></i> Exportar</button>
</div>
<div class="card"><div class="card-body" style="padding:0"><div class="table-wrap" id="tx-table-wrap">
  ${buildTxRows(sorted, accounts, projects)}
</div></div></div>`;
}

function buildTxRows(txs, accounts, projects) {
  if (!txs.length) return `<div class="empty-state"><i class="fas fa-landmark"></i><p>Sin movimientos registrados</p></div>`;
  return `<table class="rcard"><thead><tr>
    <th>Fecha</th><th>Cuenta</th><th>Tipo</th><th>Conta.</th><th>Categoría</th><th>Descripción</th><th>Proyecto</th><th>Ref.</th><th class="text-right">Importe</th><th>Acciones</th>
  </tr></thead>
  <tbody>
  ${txs.map(tx => {
    const acc = accounts.find(a => a.id === tx.account_id);
    const proj = projects.find(p => p.id === tx.project_id);
    var typeBadge = statusBadge(tx.type);
    if (tx.tx_type === 'fx') {
      typeBadge = '<span class="badge" style="background:#f59e0b22;color:#d97706;font-weight:600"><i class="fas fa-right-left"></i> FX</span>';
    } else if (tx.tx_type === 'intercompany') {
      typeBadge = '<span class="badge" style="background:#8b5cf622;color:#7c3aed;font-weight:600"><i class="fas fa-building-columns"></i> IC</span>';
    }
    var book = tx.book || 'A';
    var bookBadge = '<span class="badge" style="background:' + (book === 'B' ? '#64748b22;color:#475569' : '#2563eb22;color:#1d4ed8') + ';font-weight:700">' + book + '</span>';
    var currency = acc ? (acc.currency === 'USD' ? 'US$ ' : '$ ') : '$ ';
    return `<tr>
      <td>${fmtDate(tx.date)}</td>
      <td style="font-size:12px">${escapeHtml(acc ? acc.name : '-')}</td>
      <td>${typeBadge}</td>
      <td>${bookBadge}</td>
      <td><span class="badge badge-gray">${escapeHtml(tx.category || '-')}</span></td>
      <td style="font-size:12px">${escapeHtml(tx.description || '')}</td>
      <td style="font-size:11px;color:var(--text-muted)">${proj ? escapeHtml(proj.name) : '-'}</td>
      <td style="font-size:11px;color:var(--text-muted)">${escapeHtml(tx.reference || '-')}</td>
      <td class="number-cell text-right ${tx.type==='income'?'text-success':'text-danger'}">
        ${tx.type==='income'?'+':'-'}${currency}${fmtNum(tx.amount)}
      </td>
      <td><button class="btn-ghost btn btn-sm danger" onclick="deleteTx('${tx.id}')"><i class="fas fa-trash"></i></button></td>
    </tr>`;
  }).join('')}
  </tbody></table>`;
}

window._txFilters = { q: '', type: '', book: '' };
function filterTx(q, type, book) {
  if (q !== undefined) window._txFilters.q = q.toLowerCase();
  if (type !== undefined) window._txFilters.type = type;
  if (book !== undefined) window._txFilters.book = book;
  let txs = filterByActiveProject(_tesScopedTx());
  const f = window._txFilters;
  if (f.q) txs = txs.filter(t => (t.description||'').toLowerCase().includes(f.q) || (t.category||'').toLowerCase().includes(f.q));
  if (f.type) txs = txs.filter(t => t.type === f.type);
  if (f.book) txs = txs.filter(t => (t.book || 'A') === f.book);
  const wrap = document.getElementById('tx-table-wrap');
  if (wrap) wrap.innerHTML = buildTxRows(txs.sort((a,b)=>(b.date||'').localeCompare(a.date||'')), DB.getAll('bankAccounts'), DB.getAll('projects'));
}

function renderCashflowView(txs) {
  return `<div class="card"><div class="card-body">
    <div class="chart-wrap" style="height:320px"><canvas id="teso-cashflow-chart"></canvas></div>
  </div></div>`;
}

function renderCashflowChartTesoreria(txs) {
  const ctx = document.getElementById('teso-cashflow-chart');
  if (!ctx) return;
  if (typeof Chart === 'undefined') return; // Chart.js no cargó

  // Un solo cuadro de moneda: base de la empresa. Excluir transferencias FX/intercompany
  // y movimientos de otras monedas para no mezclar (un gráfico no puede sumar ARS+USD).
  const baseCur = (typeof _activeCurrency === 'function') ? _activeCurrency() : 'ARS';
  const accCur = {};
  DB.getAll('bankAccounts').forEach(a => { accCur[a.id] = a.currency || 'ARS'; });
  const flowTx = txs.filter(t => t.tx_type !== 'fx' && t.tx_type !== 'intercompany' && (accCur[t.account_id] || 'ARS') === baseCur);

  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push({ key: d.toISOString().slice(0,7), label: d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }) });
  }

  const income = months.map(m => flowTx.filter(t => t.type==='income' && t.date?.startsWith(m.key)).reduce((s,t) => s+t.amount, 0));
  const expense = months.map(m => flowTx.filter(t => t.type==='expense' && t.date?.startsWith(m.key)).reduce((s,t) => s+t.amount, 0));
  const net = income.map((v,i) => v - expense[i]);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months.map(m => m.label),
      datasets: [
        { label: 'Ingresos', data: income, backgroundColor: 'rgba(16,185,129,.7)', borderRadius: 4 },
        { label: 'Egresos', data: expense, backgroundColor: 'rgba(239,68,68,.7)', borderRadius: 4 },
        { label: 'Neto', data: net, type: 'line', borderColor: '#2563eb', backgroundColor: 'transparent', tension: .4, pointRadius: 4 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { font: { size: 11 } } } },
      scales: {
        y: { ticks: { callback: v => fmtMoney(v, baseCur), font: { size: 10 } }, grid: { color: '#f1f5f9' } },
        x: { ticks: { font: { size: 10 } }, grid: { display: false } }
      }
    }
  });
}

function renderAccountsTable(accounts) {
  return `<div class="card"><div class="card-body" style="padding:0"><div class="table-wrap">
    <table><thead><tr>
      <th>Nombre</th><th>Banco</th><th>N° Cuenta</th><th>Tipo</th><th>Cta. Contable</th><th>Moneda</th>
      <th class="text-right">Saldo Inicial</th><th class="text-right">Ingresos</th><th class="text-right">Egresos</th><th class="text-right fw-bold">Saldo Actual</th><th>Acciones</th>
    </tr></thead>
    <tbody>
      ${accounts.map(acc => `<tr>
        <td><strong>${acc.name}</strong></td>
        <td>${acc.bank}</td>
        <td style="font-size:11px">${acc.account_number}</td>
        <td><span class="badge badge-gray">${acc.type}</span></td>
        <td style="font-size:11px">${acc.account_code ? '<span class="badge badge-blue">' + escapeHtml(acc.account_code) + '</span> ' + escapeHtml(acc.account_name || '') : '<span style="color:var(--text-muted)">Sin asignar</span>'}</td>
        <td><span class="badge ${acc.currency==='USD'?'badge-green':'badge-blue'}">${acc.currency}</span></td>
        <td class="number-cell text-right">${fmtMoney(acc.initial_balance, acc.currency)}</td>
        <td class="number-cell text-right text-success">${fmtMoney(acc.income, acc.currency)}</td>
        <td class="number-cell text-right text-danger">${fmtMoney(acc.expense, acc.currency)}</td>
        <td class="number-cell text-right fw-bold">${fmtMoney(acc.balance, acc.currency)}</td>
        <td><div class="table-actions">
          <button class="btn-ghost btn btn-sm" onclick="openBankAccountForm('${acc.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn-ghost btn btn-sm danger" onclick="deleteBankAccountFromTesoreria('${acc.id}')"><i class="fas fa-trash"></i></button>
        </div></td>
      </tr>`).join('')}
    </tbody>
    </table>
  </div></div></div>`;
}

function openTxForm(type = 'expense') {
  const accounts = DB.getAll('bankAccounts');
  const projects = DB.getAll('projects');
  const categories = type === 'income'
    ? ['Cobro factura', 'Anticipo cliente', 'Ingreso financiero', 'Otros ingresos']
    : ['Pago proveedor', 'Sueldos', 'Impuestos', 'Gastos generales', 'Materiales menores', 'Servicios', 'Otros egresos'];

  openModal(`Registrar ${type === 'income' ? 'Ingreso' : 'Egreso'}`, `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Cuenta de tesorería *</label>
    <select class="form-control" id="tx-account">
      <option value="">Seleccionar...</option>
      ${accounts.map(a => `<option value="${a.id}">${a.name} (${a.currency})</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Categoría</label>
    <select class="form-control" id="tx-category">
      ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Contabilidad</label>
    ${_bookSelect('tx-book')}
  </div>
  <div class="form-group full">
    <label class="form-label">Descripción *</label>
    <input class="form-control" id="tx-desc" placeholder="Descripción del movimiento">
  </div>
  <div class="form-group">
    <label class="form-label">Importe *</label>
    <input class="form-control" id="tx-amount" type="number" min="0" placeholder="0">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha</label>
    <input class="form-control" id="tx-date" type="date" value="${todayStr()}">
  </div>
  <div class="form-group">
    <label class="form-label">Proyecto (opcional)</label>
    <select class="form-control" id="tx-project">
      <option value="">Sin proyecto</option>
      ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Referencia</label>
    <input class="form-control" id="tx-ref" placeholder="Número de operación">
  </div>
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn ${type==='income'?'btn-success':'btn-danger'}" onclick="saveTx('${type}')">
  <i class="fas fa-save"></i> Guardar ${type === 'income' ? 'Ingreso' : 'Egreso'}
</button>
`);
}

function saveTx(type) {
  const accountId = document.getElementById('tx-account').value;
  const description = document.getElementById('tx-desc').value.trim();
  const amount = parseFloat(document.getElementById('tx-amount').value);
  if (!accountId || !description || !amount) { toast('Cuenta, descripción e importe son obligatorios', 'error'); return; }

  DB.insert('treasuryTx', {
    account_id: accountId,
    project_id: document.getElementById('tx-project').value || '',
    type,
    book: _readBook('tx-book'),
    category: document.getElementById('tx-category').value,
    description,
    amount,
    date: document.getElementById('tx-date').value,
    reference: document.getElementById('tx-ref').value.trim(),
  });

  toast(`${type === 'income' ? 'Ingreso' : 'Egreso'} registrado`, 'success');
  closeModal();
  renderTesoreria();
}

function deleteTx(id) {
  _tesEnsureCompany(id, 'treasuryTx');
  confirmDialog('¿Eliminar este movimiento?', () => {
    DB.remove('treasuryTx', id);
    toast('Movimiento eliminado', 'warning');
    renderTesoreria();
  });
}

function showAccountTx(accountId) {
  _tesEnsureCompany(accountId, 'bankAccounts');
  const acc = DB.getById('bankAccounts', accountId);
  const txs = DB.getAll('treasuryTx').filter(t => t.account_id === accountId);
  const income = txs.filter(t=>t.type==='income').reduce((s,t) => s+t.amount, 0);
  const expense = txs.filter(t=>t.type==='expense').reduce((s,t) => s+t.amount, 0);
  const balance = (acc.initial_balance||0) + income - expense;

  openModal(`Movimientos: ${acc.name}`, `
<div style="display:flex;gap:20px;margin-bottom:16px;font-size:13px">
  <span>Saldo inicial: <strong>${fmtMoney(acc.initial_balance)}</strong></span>
  <span class="text-success">+ Ingresos: <strong>${fmtMoney(income)}</strong></span>
  <span class="text-danger">- Egresos: <strong>${fmtMoney(expense)}</strong></span>
  <span>= Saldo actual: <strong style="color:var(--primary)">${fmtMoney(balance)}</strong></span>
</div>
<div class="table-wrap" style="max-height:400px">
  <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Referencia</th><th class="text-right">Importe</th></tr></thead>
  <tbody>
    ${txs.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(t => `<tr>
      <td>${fmtDate(t.date)}</td>
      <td>${statusBadge(t.type)}</td>
      <td>${t.description}</td>
      <td style="font-size:11px">${t.reference||'-'}</td>
      <td class="number-cell text-right ${t.type==='income'?'text-success':'text-danger'}">
        ${t.type==='income'?'+':'-'}${fmtMoney(t.amount)}
      </td>
    </tr>`).join('')}
  </tbody></table>
</div>
`, 'modal-lg', `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`);
}

function openBankAccountForm(id = null) {
  if (id) _tesEnsureCompany(id, 'bankAccounts');
  const acc = id ? DB.getById('bankAccounts', id) : null;
  openModal(acc ? 'Editar Cuenta' : 'Nueva Cuenta Bancaria', `
<div class="form-grid form-grid-2">
  <div class="form-group full">
    <label class="form-label">Nombre de la Cuenta *</label>
    <input class="form-control" id="ba-name" value="${acc?.name || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">Banco</label>
    <input class="form-control" id="ba-bank" value="${acc?.bank || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">Tipo de Cuenta</label>
    <select class="form-control" id="ba-type">
      <option value="checking" ${acc?.type==='checking'?'selected':''}>Cuenta Corriente</option>
      <option value="savings" ${acc?.type==='savings'?'selected':''}>Caja de Ahorro</option>
      <option value="cash" ${acc?.type==='cash'?'selected':''}>Efectivo/Caja</option>
      <option value="investment" ${acc?.type==='investment'?'selected':''}>Inversión</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">N° de Cuenta / CBU</label>
    <input class="form-control" id="ba-num" value="${acc?.account_number || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">Moneda</label>
    <select class="form-control" id="ba-currency">
      <option value="ARS" ${acc?.currency==='ARS'?'selected':''}>ARS — Pesos Argentinos</option>
      <option value="USD" ${acc?.currency==='USD'?'selected':''}>USD — Dólares</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Saldo Inicial</label>
    <input class="form-control" id="ba-initial" type="number" value="${acc?.initial_balance || 0}">
  </div>
  <div class="form-group full">
    <label class="form-label">Cuenta contable asignada
      <span style="color:var(--text-muted);font-weight:400">— se usa en los asientos automáticos (FX, entre sociedades, etc.)</span>
    </label>
    ${_baAccountField(acc)}
  </div>
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveBankAccount('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
}

// Campo de cuenta contable asignada a una cuenta de tesorería.
// Desplegable del plan de cuentas si existe; texto manual como respaldo.
function _baAccountField(acc) {
  var code = acc ? (acc.account_code || '') : '';
  var opts = _chartAccountOptions(code);
  if (opts !== '') {
    return '<select class="form-control" id="ba-acc-sel">' +
      '<option value="">Sin asignar</option>' + opts + '</select>';
  }
  return '<input class="form-control" id="ba-acc-code" placeholder="Código" style="width:120px;display:inline-block" value="' + escapeHtml(code) + '">' +
    '<input class="form-control" id="ba-acc-name" placeholder="Nombre de la cuenta" style="width:calc(100% - 130px);display:inline-block;margin-left:6px" value="' + escapeHtml(acc ? (acc.account_name || '') : '') + '">';
}

function saveBankAccount(id) {
  const name = document.getElementById('ba-name').value.trim();
  if (!name) { toast('El nombre es obligatorio', 'error'); return; }
  // Cuenta contable asignada (select del plan o campos manuales)
  var accSel = document.getElementById('ba-acc-sel');
  var accCode = '', accName = '';
  if (accSel) {
    var chart = _readChartAccount('ba-acc-sel');
    accCode = chart.code; accName = chart.name;
  } else {
    var ce = document.getElementById('ba-acc-code');
    var ne = document.getElementById('ba-acc-name');
    accCode = ce ? ce.value.trim() : '';
    accName = ne ? ne.value.trim() : '';
  }
  const data = {
    name,
    bank: document.getElementById('ba-bank').value.trim(),
    type: document.getElementById('ba-type').value,
    account_number: document.getElementById('ba-num').value.trim(),
    currency: document.getElementById('ba-currency').value,
    initial_balance: parseFloat(document.getElementById('ba-initial').value) || 0,
    account_code: accCode,
    account_name: accName,
  };
  if (id) { DB.update('bankAccounts', id, data); toast('Cuenta actualizada', 'success'); }
  else { DB.insert('bankAccounts', data); toast('Cuenta creada', 'success'); }
  closeModal();
  renderTesoreria();
}

function deleteBankAccountFromTesoreria(id) {
  _tesEnsureCompany(id, 'bankAccounts');
  confirmDialog('¿Eliminar esta cuenta? Los movimientos asociados se mantendrán.', () => {
    DB.remove('bankAccounts', id);
    toast('Cuenta eliminada', 'warning');
    renderTesoreria();
  });
}

function exportTx() {
  const txs = DB.getAll('treasuryTx');
  const accounts = DB.getAll('bankAccounts');
  const projects = DB.getAll('projects');
  exportXLSX('movimientos_tesoreria.xlsx',
    ['Fecha','Cuenta','Tipo','Contabilidad','Categoría','Descripción','Proyecto','Referencia','Importe'],
    txs.map(t => [
      t.date,
      accounts.find(a=>a.id===t.account_id)?.name||'',
      t.type,
      t.book||'A',
      t.category||'',
      t.description,
      projects.find(p=>p.id===t.project_id)?.name||'',
      t.reference||'',
      t.type==='expense' ? -t.amount : t.amount
    ])
  );
}

/* ── HELPERS COMPARTIDOS ─────────────────────────────────────────────────── */

// Selector de contabilidad (A / B). selected marca la opción activa.
function _bookSelect(id, selected) {
  selected = selected || 'A';
  return '<select class="form-control" id="' + id + '">' +
    '<option value="A"' + (selected === 'A' ? ' selected' : '') + '>Contabilidad A</option>' +
    '<option value="B"' + (selected === 'B' ? ' selected' : '') + '>Contabilidad B</option>' +
    '</select>';
}

function _readBook(id) {
  var el = document.getElementById(id);
  return (el && el.value) ? el.value : 'A';
}

// Devuelve la cuenta contable {code, name} de una cuenta de tesorería.
// Usa la cuenta asignada manualmente; si no hay, intenta matchear por nombre en el plan; si no, usa el nombre de la cuenta.
function _bankChartAccount(bankAcc) {
  if (!bankAcc) return { code: '', name: 'Banco' };
  if (bankAcc.account_code || bankAcc.account_name) {
    return { code: bankAcc.account_code || '', name: bankAcc.account_name || bankAcc.name };
  }
  var chart = DB.getAll('accounts');
  if (chart.length && bankAcc.name) {
    var firstWord = bankAcc.name.toLowerCase().split(' ')[0];
    var match = chart.find(function(a) { return a.name && a.name.toLowerCase().includes(firstWord); });
    if (match) return { code: match.code, name: match.name };
  }
  return { code: '', name: bankAcc.name };
}

// Opciones <option> del plan de cuentas (solo cuentas imputables = hojas sin hijos).
// selectedCode marca la opción activa. Devuelve '' si no hay plan de cuentas cargado.
function _chartAccountOptions(selectedCode) {
  var accs = DB.getAll('accounts');
  if (!accs.length) return '';
  var leaves = accs.filter(function(a) {
    return !accs.some(function(b) { return b.parent_id === a.id; });
  });
  leaves.sort(function(a, b) { return (a.code || '').localeCompare(b.code || ''); });
  return leaves.map(function(a) {
    var sel = (selectedCode && a.code === selectedCode) ? ' selected' : '';
    return '<option value="' + a.code + '" data-name="' + escapeHtml(a.name || '') + '"' + sel + '>' +
      escapeHtml(a.code + ' — ' + (a.name || '')) + '</option>';
  }).join('');
}

// Lee código y nombre de un <select> de cuentas contables por id
function _readChartAccount(selectId) {
  var sel = document.getElementById(selectId);
  if (!sel) return { code: '', name: '' };
  var opt = sel.selectedOptions && sel.selectedOptions[0];
  return { code: sel.value || '', name: opt ? (opt.dataset.name || '') : '' };
}

/* ── CAMBIO DE MONEDA (FX) ───────────────────────────────────────────────── */

function openFxForm() {
  var accounts = DB.getAll('bankAccounts');
  var today = todayStr();

  openModal('Cambio de Moneda', `
<div style="background:var(--bg);border-radius:var(--radius-sm);padding:12px 16px;margin-bottom:16px;font-size:12px;color:var(--text-muted)">
  <i class="fas fa-info-circle"></i> Registra la salida de una moneda de una cuenta y la entrada en otra. Genera dos movimientos enlazados.
</div>
<div class="tjoin-3">
  <div class="form-group">
    <label class="form-label">Fecha *</label>
    <input class="form-control" id="fx-date" type="date" value="${today}">
  </div>
  <div class="form-group">
    <label class="form-label">Referencia</label>
    <input class="form-control" id="fx-ref" placeholder="N° operación, ticket, etc.">
  </div>
  <div class="form-group">
    <label class="form-label">Contabilidad</label>
    ${_bookSelect('fx-book')}
  </div>
</div>

<div class="tjoin-transfer" style="margin-bottom:4px">
  <div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--danger);margin-bottom:8px"><i class="fas fa-arrow-up"></i> Cuenta de Tesorería de Origen (sale)</div>
    <div class="form-group">
      <label class="form-label">Cuenta de tesorería *</label>
      <select class="form-control" id="fx-from-acc" onchange="fxUpdateLabels()">
        <option value="">Seleccionar...</option>
        ${accounts.map(a => `<option value="${a.id}" data-currency="${a.currency}">${escapeHtml(a.name)} (${a.currency})</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label" id="fx-from-label">Importe que sale *</label>
      <input class="form-control" id="fx-from-amount" type="number" min="0" step="0.01" placeholder="0" oninput="fxRecalc('from')">
    </div>
  </div>
  <div class="tjoin-arrow" style="text-align:center;padding-bottom:12px;font-size:22px;color:var(--text-muted)">
    <i class="fas fa-right-left"></i>
  </div>
  <div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--success);margin-bottom:8px"><i class="fas fa-arrow-down"></i> Cuenta de Tesorería de Destino (entra)</div>
    <div class="form-group">
      <label class="form-label">Cuenta de tesorería *</label>
      <select class="form-control" id="fx-to-acc" onchange="fxUpdateLabels()">
        <option value="">Seleccionar...</option>
        ${accounts.map(a => `<option value="${a.id}" data-currency="${a.currency}">${escapeHtml(a.name)} (${a.currency})</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label" id="fx-to-label">Importe que entra *</label>
      <input class="form-control" id="fx-to-amount" type="number" min="0" step="0.01" placeholder="0" oninput="fxRecalc('to')">
    </div>
  </div>
</div>

<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Tipo de cambio <span id="fx-rate-label" style="color:var(--text-muted)">(se calcula solo)</span></label>
    <input class="form-control" id="fx-rate" type="number" min="0" step="0.0001" placeholder="Ej: 1050" oninput="fxRecalc('rate')">
  </div>
  <div class="form-group">
    <label class="form-label">Descripción</label>
    <input class="form-control" id="fx-desc" placeholder="Ej: Venta de dólares — Banco XYZ">
  </div>
</div>
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveFxTx()"><i class="fas fa-save"></i> Registrar Cambio</button>
`);
}

function fxUpdateLabels() {
  var fromSel = document.getElementById('fx-from-acc');
  var toSel = document.getElementById('fx-to-acc');
  var fromOpt = fromSel && fromSel.selectedOptions[0];
  var toOpt = toSel && toSel.selectedOptions[0];
  var fromCur = fromOpt ? (fromOpt.dataset.currency || '') : '';
  var toCur = toOpt ? (toOpt.dataset.currency || '') : '';
  var fl = document.getElementById('fx-from-label');
  var tl = document.getElementById('fx-to-label');
  var rl = document.getElementById('fx-rate-label');
  if (fl) fl.textContent = 'Importe que sale' + (fromCur ? ' (' + fromCur + ')' : '') + ' *';
  if (tl) tl.textContent = 'Importe que entra' + (toCur ? ' (' + toCur + ')' : '') + ' *';
  if (rl && fromCur && toCur && fromCur !== toCur) {
    rl.textContent = '(' + fromCur + ' por 1 ' + toCur + ')';
  }
  fxRecalc('account');
}

// Bidirectional FX calc: fill any two of (sale / entra / tipo de cambio) → computes the third.
// Rate is defined as: importe que SALE / importe que ENTRA  (unidades de origen por unidad de destino).
// Ej: 10000 ARS salen / 6,5789 USD entran → TC = 1520 (1 USD = 1520 ARS).
function fxRecalc(source) {
  var fromEl = document.getElementById('fx-from-amount');
  var toEl = document.getElementById('fx-to-amount');
  var rateEl = document.getElementById('fx-rate');
  if (!fromEl || !toEl || !rateEl) return;
  var from = parseFloat(fromEl.value) || 0;
  var to = parseFloat(toEl.value) || 0;
  var rate = parseFloat(rateEl.value) || 0;

  function fmtAmt(v) { return (Math.round(v * 100) / 100).toFixed(2); }
  function fmtRate(v) { return (Math.round(v * 10000) / 10000).toString(); }

  if (source === 'from') {
    // El usuario editó "sale": si hay TC → recalcular "entra"; si no hay TC pero hay "entra" → calcular TC
    if (rate > 0 && from > 0) { toEl.value = fmtAmt(from / rate); }
    else if (to > 0 && from > 0) { rateEl.value = fmtRate(from / to); }
  } else if (source === 'to') {
    // El usuario editó "entra": si hay TC → recalcular "sale"; si no hay TC pero hay "sale" → calcular TC
    if (rate > 0 && to > 0) { fromEl.value = fmtAmt(to * rate); }
    else if (from > 0 && to > 0) { rateEl.value = fmtRate(from / to); }
  } else if (source === 'rate') {
    // El usuario editó el TC: recalcular "entra" desde "sale", o "sale" desde "entra"
    if (rate > 0 && from > 0) { toEl.value = fmtAmt(from / rate); }
    else if (rate > 0 && to > 0) { fromEl.value = fmtAmt(to * rate); }
  } else {
    // Cambio de cuenta: recalcular TC si ambos importes están cargados
    if (from > 0 && to > 0) { rateEl.value = fmtRate(from / to); }
  }
}

function saveFxTx() {
  var fromAccId = document.getElementById('fx-from-acc').value;
  var toAccId = document.getElementById('fx-to-acc').value;
  var fromAmt = parseFloat(document.getElementById('fx-from-amount').value);
  var toAmt = parseFloat(document.getElementById('fx-to-amount').value);
  var date = document.getElementById('fx-date').value;
  var ref = document.getElementById('fx-ref').value.trim();
  var desc = document.getElementById('fx-desc').value.trim() || 'Cambio de moneda';
  var rate = parseFloat(document.getElementById('fx-rate').value) || 0;
  var book = _readBook('fx-book');

  if (!fromAccId || !toAccId) { toast('Seleccioná ambas cuentas', 'error'); return; }
  if (fromAccId === toAccId) { toast('Las cuentas origen y destino deben ser distintas', 'error'); return; }
  if (!fromAmt || fromAmt <= 0) { toast('Ingresá el importe que sale', 'error'); return; }
  if (!toAmt || toAmt <= 0) { toast('Ingresá el importe que entra', 'error'); return; }

  var accounts = DB.getAll('bankAccounts');
  var fromAcc = accounts.find(function(a) { return a.id === fromAccId; });
  var toAcc = accounts.find(function(a) { return a.id === toAccId; });
  var groupId = 'fx-' + Date.now();

  // Salida de cuenta origen
  DB.insert('treasuryTx', {
    account_id: fromAccId,
    type: 'expense',
    tx_type: 'fx',
    book: book,
    fx_group_id: groupId,
    category: 'Cambio de moneda',
    description: desc + (ref ? ' [' + ref + ']' : '') + (toAcc ? ' → ' + toAcc.name : ''),
    amount: fromAmt,
    date: date,
    reference: ref,
    fx_rate: rate,
    linked_account_id: toAccId,
  });

  // Entrada en cuenta destino
  DB.insert('treasuryTx', {
    account_id: toAccId,
    type: 'income',
    tx_type: 'fx',
    book: book,
    fx_group_id: groupId,
    category: 'Cambio de moneda',
    description: desc + (ref ? ' [' + ref + ']' : '') + (fromAcc ? ' ← ' + fromAcc.name : ''),
    amount: toAmt,
    date: date,
    reference: ref,
    fx_rate: rate,
    linked_account_id: fromAccId,
  });

  // Asiento contable (si hay cuentas contables cargadas)
  var accounts2 = DB.getAll('accounts');
  if (accounts2.length) {
    var fromCur = fromAcc ? fromAcc.currency : '';
    var toCur = toAcc ? toAcc.currency : '';
    var num = 'AS-' + new Date().getFullYear() + '-' + String(DB.getAll('journalEntries').length + 1).padStart(3, '0');
    var bankFrom = _bankChartAccount(fromAcc);
    var bankTo = _bankChartAccount(toAcc);
    DB.insert('journalEntries', {
      number: num,
      date: date,
      description: 'Cambio de moneda: ' + desc + (rate ? ' | TC: ' + rate : ''),
      status: 'posted',
      origin: 'fx',
      book: book,
      fx_group_id: groupId,
      lines: [
        { account_code: bankTo.code, account_name: bankTo.name, debit: toAmt, credit: 0, description: 'Ingreso ' + (toCur || '') + ' — ' + (toAcc ? toAcc.name : '') },
        { account_code: bankFrom.code, account_name: bankFrom.name, debit: 0, credit: fromAmt, description: 'Salida ' + (fromCur || '') + ' — ' + (fromAcc ? fromAcc.name : '') },
      ]
    });
  }

  toast('Cambio FX registrado: salida y entrada guardadas', 'success');
  closeModal();
  renderTesoreria();
}

/* ── MOVIMIENTO ENTRE SOCIEDADES (INTERCOMPANY) ──────────────────────────── */

function openIntercompanyForm() {
  var accounts = DB.getAll('bankAccounts');
  var companies = DB.getAllCompanies();
  var today = todayStr();

  var conceptos = ['Préstamo entre sociedades', 'Devolución de préstamo', 'Dividendos a cobrar', 'Aporte de capital', 'Transferencia de fondos', 'Otro'];

  var chartOpts = _chartAccountOptions('');
  var hasChart = chartOpts !== '';

  // Campo de cuenta contable: desplegable del plan de cuentas si existe, o texto manual si no
  function contraField(idBase, placeholder) {
    if (hasChart) {
      return '<select class="form-control" id="' + idBase + '-sel">' +
        '<option value="">Seleccionar cuenta...</option>' + chartOpts + '</select>';
    }
    return '<input class="form-control" id="' + idBase + '-code" placeholder="Código" style="width:110px;display:inline-block">' +
      '<input class="form-control" id="' + idBase + '-name" placeholder="' + placeholder + '" style="width:calc(100% - 120px);display:inline-block;margin-left:6px">';
  }

  openModal('Movimiento entre Sociedades', `
<div style="background:#8b5cf622;border:1px solid #8b5cf644;border-radius:var(--radius-sm);padding:12px 16px;margin-bottom:16px;font-size:12px;color:#6d28d9">
  <i class="fas fa-info-circle"></i> Genera dos movimientos de tesorería (salida y entrada) y dos asientos contables, uno por sociedad, con la contrapartida de deuda/crédito entre empresas.
</div>
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Concepto *</label>
    <select class="form-control" id="ic-concepto" onchange="icUpdateDesc()">
      ${conceptos.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Importe *</label>
    <input class="form-control" id="ic-amount" type="number" min="0" step="0.01" placeholder="0">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha *</label>
    <input class="form-control" id="ic-date" type="date" value="${today}">
  </div>
  <div class="form-group">
    <label class="form-label">Referencia / N° operación</label>
    <input class="form-control" id="ic-ref" placeholder="Ej: PREST-001">
  </div>
  <div class="form-group">
    <label class="form-label">Contabilidad</label>
    ${_bookSelect('ic-book')}
  </div>
</div>

<div class="tjoin-transfer" style="align-items:start;margin:8px 0 4px">
  <div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--danger);margin-bottom:10px"><i class="fas fa-arrow-up"></i> Sociedad Prestadora (sale)</div>
    <div class="form-group">
      <label class="form-label">Sociedad *</label>
      <select class="form-control" id="ic-from-company" onchange="icUpdateDesc()">
        <option value="">Seleccionar...</option>
        ${companies.map(function(c) { return '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>'; }).join('')}
        <option value="__manual__">— Ingresar nombre manualmente —</option>
      </select>
      <input class="form-control mt-1" id="ic-from-company-name" placeholder="Nombre de la sociedad" style="display:none">
    </div>
    <div class="form-group">
      <label class="form-label">Cuenta de tesorería de la que sale *</label>
      <select class="form-control" id="ic-from-acc">
        <option value="">Seleccionar...</option>
        ${accounts.map(function(a) { return '<option value="' + a.id + '">' + escapeHtml(a.name) + ' (' + a.currency + ')</option>'; }).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Cuenta contable contrapartida (Préstamo otorgado)</label>
      ${contraField('ic-from-contra', 'Créditos a vinculadas')}
    </div>
  </div>
  <div class="tjoin-arrow" style="text-align:center;padding-top:60px;font-size:20px;color:var(--text-muted)">
    <i class="fas fa-arrow-right-long"></i>
  </div>
  <div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--success);margin-bottom:10px"><i class="fas fa-arrow-down"></i> Sociedad Receptora (entra)</div>
    <div class="form-group">
      <label class="form-label">Sociedad *</label>
      <select class="form-control" id="ic-to-company" onchange="icUpdateDesc()">
        <option value="">Seleccionar...</option>
        ${companies.map(function(c) { return '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>'; }).join('')}
        <option value="__manual__">— Ingresar nombre manualmente —</option>
      </select>
      <input class="form-control mt-1" id="ic-to-company-name" placeholder="Nombre de la sociedad" style="display:none">
    </div>
    <div class="form-group">
      <label class="form-label">Cuenta de tesorería que recibe *</label>
      <select class="form-control" id="ic-to-acc">
        <option value="">Seleccionar...</option>
        ${accounts.map(function(a) { return '<option value="' + a.id + '">' + escapeHtml(a.name) + ' (' + a.currency + ')</option>'; }).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Cuenta contable contrapartida (Deuda asumida)</label>
      ${contraField('ic-to-contra', 'Deudas con vinculadas')}
    </div>
  </div>
</div>

<div class="form-group mt-2">
  <label class="form-label">Observaciones</label>
  <input class="form-control" id="ic-desc" placeholder="Descripción adicional (opcional)">
</div>
`, 'modal-xl', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveIntercompanyTx()"><i class="fas fa-save"></i> Registrar Movimiento</button>
`);

  // Show manual input when "Ingresar manualmente" selected
  ['ic-from-company', 'ic-to-company'].forEach(function(selId) {
    var sel = document.getElementById(selId);
    var nameField = document.getElementById(selId.replace('-company', '-company-name'));
    if (sel && nameField) {
      sel.addEventListener('change', function() {
        nameField.style.display = this.value === '__manual__' ? '' : 'none';
      });
    }
  });
}

function icUpdateDesc() {
  var concepto = (document.getElementById('ic-concepto') || {}).value || '';
  // pre-fill contra account names based on concepto
  var fromContraName = document.getElementById('ic-from-contra-name');
  var toContraName = document.getElementById('ic-to-contra-name');
  if (!fromContraName || !toContraName) return;
  var isLoan = concepto.toLowerCase().includes('préstamo') || concepto.toLowerCase().includes('prestamo');
  var isDev = concepto.toLowerCase().includes('devolución') || concepto.toLowerCase().includes('devolucion');
  if (isLoan && !isDev) {
    if (!fromContraName.value) fromContraName.value = 'Créditos entre sociedades';
    if (!toContraName.value) toContraName.value = 'Deudas entre sociedades';
  } else if (isDev) {
    if (!fromContraName.value) fromContraName.value = 'Deudas entre sociedades (cobro)';
    if (!toContraName.value) toContraName.value = 'Créditos entre sociedades (pago)';
  }
}

function _icGetCompanyName(selId, nameId) {
  var sel = document.getElementById(selId);
  var nameEl = document.getElementById(nameId);
  if (!sel) return '';
  if (sel.value === '__manual__') return (nameEl ? nameEl.value.trim() : '') || 'Sociedad';
  var opt = sel.selectedOptions && sel.selectedOptions[0];
  return opt ? opt.textContent.trim() : '';
}

// Lee una cuenta contrapartida que puede ser select del plan o campos de texto manuales
function _icReadContra(idBase, fallbackName) {
  var sel = document.getElementById(idBase + '-sel');
  if (sel) {
    var acc = _readChartAccount(idBase + '-sel');
    return { code: acc.code, name: acc.name || fallbackName };
  }
  var codeEl = document.getElementById(idBase + '-code');
  var nameEl = document.getElementById(idBase + '-name');
  return {
    code: codeEl ? (codeEl.value || '').trim() : '',
    name: (nameEl ? (nameEl.value || '').trim() : '') || fallbackName
  };
}

function saveIntercompanyTx() {
  var fromAccId = document.getElementById('ic-from-acc').value;
  var toAccId = document.getElementById('ic-to-acc').value;
  var amount = parseFloat(document.getElementById('ic-amount').value);
  var date = document.getElementById('ic-date').value;
  var ref = document.getElementById('ic-ref').value.trim();
  var concepto = document.getElementById('ic-concepto').value;
  var extraDesc = document.getElementById('ic-desc').value.trim();
  var fromName = _icGetCompanyName('ic-from-company', 'ic-from-company-name');
  var toName = _icGetCompanyName('ic-to-company', 'ic-to-company-name');
  var book = _readBook('ic-book');

  // Las contrapartidas pueden venir de un <select> del plan de cuentas o de campos de texto manuales
  var fromContra = _icReadContra('ic-from-contra', 'Créditos entre sociedades');
  var toContra = _icReadContra('ic-to-contra', 'Deudas entre sociedades');
  var fromContraCode = fromContra.code;
  var fromContraName = fromContra.name;
  var toContraCode = toContra.code;
  var toContraName = toContra.name;

  if (!fromAccId || !toAccId) { toast('Seleccioná las cuentas bancarias de origen y destino', 'error'); return; }
  if (!fromName) { toast('Ingresá la sociedad de origen', 'error'); return; }
  if (!toName) { toast('Ingresá la sociedad de destino', 'error'); return; }
  if (!amount || amount <= 0) { toast('Ingresá un importe válido', 'error'); return; }

  var accounts = DB.getAll('bankAccounts');
  var fromAcc = accounts.find(function(a) { return a.id === fromAccId; });
  var toAcc = accounts.find(function(a) { return a.id === toAccId; });
  var groupId = 'ic-' + Date.now();
  var baseDesc = concepto + ' — ' + fromName + ' → ' + toName + (ref ? ' [' + ref + ']' : '');

  // ── TreasuryTx salida (sociedad prestadora) ──
  DB.insert('treasuryTx', {
    account_id: fromAccId,
    type: 'expense',
    tx_type: 'intercompany',
    book: book,
    ic_group_id: groupId,
    ic_from_company: fromName,
    ic_to_company: toName,
    category: 'Intercompany — salida',
    description: baseDesc + (extraDesc ? ' — ' + extraDesc : ''),
    amount: amount,
    date: date,
    reference: ref,
  });

  // ── TreasuryTx entrada (sociedad receptora) ──
  DB.insert('treasuryTx', {
    account_id: toAccId,
    type: 'income',
    tx_type: 'intercompany',
    book: book,
    ic_group_id: groupId,
    ic_from_company: fromName,
    ic_to_company: toName,
    category: 'Intercompany — entrada',
    description: baseDesc + (extraDesc ? ' — ' + extraDesc : ''),
    amount: amount,
    date: date,
    reference: ref,
  });

  // ── Asientos contables ──
  var existingEntries = DB.getAll('journalEntries');
  var num1 = 'AS-' + new Date().getFullYear() + '-' + String(existingEntries.length + 1).padStart(3, '0');
  var num2 = 'AS-' + new Date().getFullYear() + '-' + String(existingEntries.length + 2).padStart(3, '0');

  // Cuenta contable asignada a cada cuenta de tesorería (con respaldo por nombre)
  var fromBankAcc = _bankChartAccount(fromAcc);
  var toBankAcc = _bankChartAccount(toAcc);

  // Asiento empresa prestadora:
  // Dr. "Créditos entre sociedades - [toName]"  →  amount
  // Cr. "Banco/Caja [fromAcc]"                  →  amount
  DB.insert('journalEntries', {
    number: num1,
    date: date,
    description: '[' + fromName + '] ' + baseDesc,
    status: 'posted',
    origin: 'intercompany',
    book: book,
    ic_group_id: groupId,
    ic_company: fromName,
    ic_role: 'prestadora',
    lines: [
      {
        account_code: fromContraCode,
        account_name: fromContraName + ' — ' + toName,
        debit: amount, credit: 0,
        description: concepto + ' otorgado a ' + toName
      },
      {
        account_code: fromBankAcc.code,
        account_name: fromBankAcc.name,
        debit: 0, credit: amount,
        description: 'Salida fondos — ' + (fromAcc ? fromAcc.name : '')
      }
    ]
  });

  // Asiento empresa receptora:
  // Dr. "Banco/Caja [toAcc]"                    →  amount
  // Cr. "Deudas entre sociedades - [fromName]"   →  amount
  DB.insert('journalEntries', {
    number: num2,
    date: date,
    description: '[' + toName + '] ' + baseDesc,
    status: 'posted',
    origin: 'intercompany',
    book: book,
    ic_group_id: groupId,
    ic_company: toName,
    ic_role: 'receptora',
    lines: [
      {
        account_code: toBankAcc.code,
        account_name: toBankAcc.name,
        debit: amount, credit: 0,
        description: 'Entrada fondos — ' + (toAcc ? toAcc.name : '')
      },
      {
        account_code: toContraCode,
        account_name: toContraName + ' — ' + fromName,
        debit: 0, credit: amount,
        description: concepto + ' recibido de ' + fromName
      }
    ]
  });

  toast('Movimiento intercompany registrado: 2 movimientos + 2 asientos contables generados', 'success');
  closeModal();
  renderTesoreria();
}
