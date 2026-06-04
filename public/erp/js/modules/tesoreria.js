/* ===== TESORERÍA ===== */
function renderTesoreria() {
  const accounts = DB.getAll('bankAccounts');
  const txs = DB.getAll('treasuryTx');
  const projects = DB.getAll('projects');

  // Calc balances
  const accountsWithBalance = accounts.map(acc => {
    const income = txs.filter(t => t.account_id === acc.id && t.type === 'income').reduce((s,t) => s+t.amount, 0);
    const expense = txs.filter(t => t.account_id === acc.id && t.type === 'expense').reduce((s,t) => s+t.amount, 0);
    return { ...acc, balance: (acc.initial_balance || 0) + income - expense, income, expense };
  });

  const totalBalance = accountsWithBalance.reduce((s, a) => a.currency === 'ARS' ? s + a.balance : s, 0);
  const totalIncome = txs.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0);
  const totalExpense = txs.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0);

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
  </div>
</div>

<!-- ACCOUNT CARDS -->
<div class="grid-auto mb-2">
  ${accountsWithBalance.map(acc => `
  <div class="card" style="cursor:pointer" onclick="showAccountTx('${acc.id}')">
    <div class="card-header" style="padding:14px 16px">
      <div>
        <div style="font-size:13px;font-weight:600">${acc.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${acc.bank}</div>
        <div style="font-size:11px;color:var(--text-muted)">${acc.account_number}</div>
      </div>
      <div style="text-align:right">
        <span class="badge ${acc.currency === 'USD' ? 'badge-green' : 'badge-blue'}">${acc.currency}</span>
        <div style="font-size:18px;font-weight:700;color:var(--primary);margin-top:4px">${acc.currency === 'USD' ? 'US$ ' : '$ '}${fmtNum(Math.round(acc.balance))}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;padding:10px 16px;gap:8px;border-top:1px solid var(--border)">
      <div style="font-size:11px"><span class="text-success">▲ Ingresos: ${fmtMoney(acc.income)}</span></div>
      <div style="font-size:11px;text-align:right"><span class="text-danger">▼ Egresos: ${fmtMoney(acc.expense)}</span></div>
    </div>
  </div>`).join('')}
  <div class="stat-card" style="flex-direction:column;justify-content:center;min-height:110px">
    <div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:6px">SALDO TOTAL ARS</div>
    <div style="font-size:24px;font-weight:700;color:var(--primary)">${fmtMoney(totalBalance)}</div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${accounts.length} cuentas</div>
  </div>
</div>

<!-- SUMMARY -->
<div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-arrow-down"></i></div><div>
    <div class="stat-value text-success">${fmtMoney(totalIncome)}</div><div class="stat-label">Ingresos Totales</div></div></div>
  <div class="stat-card"><div class="stat-icon red"><i class="fas fa-arrow-up"></i></div><div>
    <div class="stat-value text-danger">${fmtMoney(totalExpense)}</div><div class="stat-label">Egresos Totales</div></div></div>
  <div class="stat-card"><div class="stat-icon ${totalIncome-totalExpense >= 0 ? 'cyan' : 'red'}"><i class="fas fa-balance-scale"></i></div><div>
    <div class="stat-value ${totalIncome-totalExpense >= 0 ? 'text-success' : 'text-danger'}">${fmtMoney(totalIncome-totalExpense)}</div>
    <div class="stat-label">Resultado Neto</div></div></div>
</div>

<div id="tesoreria-tabs" class="mt-2">
  <div class="tabs">
    <button class="tab-btn" data-tab="tab-movimientos">Movimientos</button>
    <button class="tab-btn" data-tab="tab-cashflow">Flujo de Caja</button>
    <button class="tab-btn" data-tab="tab-cuentas">Cuentas</button>
  </div>
  <div id="tab-movimientos" class="tab-content">
    ${renderTxTable(txs, accounts, projects)}
  </div>
  <div id="tab-cashflow" class="tab-content">
    ${renderCashflowView(txs)}
  </div>
  <div id="tab-cuentas" class="tab-content">
    ${renderAccountsTable(accountsWithBalance)}
  </div>
</div>
  `;

  initTabs('tesoreria-tabs');
  setTimeout(() => renderCashflowChartTesoreria(txs), 100);
}

function renderTxTable(txs, accounts, projects) {
  const sorted = txs.slice().sort((a,b) => b.date.localeCompare(a.date));
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
  <button class="btn btn-secondary" onclick="exportTx()"><i class="fas fa-download"></i> Exportar</button>
</div>
<div class="card"><div class="card-body" style="padding:0"><div class="table-wrap" id="tx-table-wrap">
  ${buildTxRows(sorted, accounts, projects)}
</div></div></div>`;
}

function buildTxRows(txs, accounts, projects) {
  if (!txs.length) return `<div class="empty-state"><i class="fas fa-landmark"></i><p>Sin movimientos registrados</p></div>`;
  return `<table><thead><tr>
    <th>Fecha</th><th>Cuenta</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th>Proyecto</th><th>Ref.</th><th class="text-right">Importe</th><th>Acciones</th>
  </tr></thead>
  <tbody>
  ${txs.map(tx => {
    const acc = accounts.find(a => a.id === tx.account_id);
    const proj = projects.find(p => p.id === tx.project_id);
    return `<tr>
      <td>${fmtDate(tx.date)}</td>
      <td style="font-size:12px">${acc?.name || '-'}</td>
      <td>${statusBadge(tx.type)}</td>
      <td><span class="badge badge-gray">${tx.category || '-'}</span></td>
      <td>${tx.description}</td>
      <td style="font-size:11px;color:var(--text-muted)">${proj?.name || '-'}</td>
      <td style="font-size:11px;color:var(--text-muted)">${tx.reference || '-'}</td>
      <td class="number-cell text-right ${tx.type==='income'?'text-success':'text-danger'}">
        ${tx.type==='income'?'+':'-'}${fmtMoney(tx.amount)}
      </td>
      <td><button class="btn-ghost btn btn-sm danger" onclick="deleteTx('${tx.id}')"><i class="fas fa-trash"></i></button></td>
    </tr>`;
  }).join('')}
  </tbody></table>`;
}

window._txFilters = { q: '', type: '' };
function filterTx(q, type) {
  if (q !== undefined) window._txFilters.q = q.toLowerCase();
  if (type !== undefined) window._txFilters.type = type;
  let txs = DB.getAll('treasuryTx');
  const f = window._txFilters;
  if (f.q) txs = txs.filter(t => t.description.toLowerCase().includes(f.q) || (t.category||'').toLowerCase().includes(f.q));
  if (f.type) txs = txs.filter(t => t.type === f.type);
  const wrap = document.getElementById('tx-table-wrap');
  if (wrap) wrap.innerHTML = buildTxRows(txs.sort((a,b)=>b.date.localeCompare(a.date)), DB.getAll('bankAccounts'), DB.getAll('projects'));
}

function renderCashflowView(txs) {
  return `<div class="card"><div class="card-body">
    <div class="chart-wrap" style="height:320px"><canvas id="teso-cashflow-chart"></canvas></div>
  </div></div>`;
}

function renderCashflowChartTesoreria(txs) {
  const ctx = document.getElementById('teso-cashflow-chart');
  if (!ctx) return;

  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push({ key: d.toISOString().slice(0,7), label: d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }) });
  }

  const income = months.map(m => txs.filter(t => t.type==='income' && t.date?.startsWith(m.key)).reduce((s,t) => s+t.amount, 0));
  const expense = months.map(m => txs.filter(t => t.type==='expense' && t.date?.startsWith(m.key)).reduce((s,t) => s+t.amount, 0));
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
        y: { ticks: { callback: v => fmtMoney(v), font: { size: 10 } }, grid: { color: '#f1f5f9' } },
        x: { ticks: { font: { size: 10 } }, grid: { display: false } }
      }
    }
  });
}

function renderAccountsTable(accounts) {
  return `<div class="card"><div class="card-body" style="padding:0"><div class="table-wrap">
    <table><thead><tr>
      <th>Nombre</th><th>Banco</th><th>N° Cuenta</th><th>Tipo</th><th>Moneda</th>
      <th class="text-right">Saldo Inicial</th><th class="text-right">Ingresos</th><th class="text-right">Egresos</th><th class="text-right fw-bold">Saldo Actual</th><th>Acciones</th>
    </tr></thead>
    <tbody>
      ${accounts.map(acc => `<tr>
        <td><strong>${acc.name}</strong></td>
        <td>${acc.bank}</td>
        <td style="font-size:11px">${acc.account_number}</td>
        <td><span class="badge badge-gray">${acc.type}</span></td>
        <td><span class="badge ${acc.currency==='USD'?'badge-green':'badge-blue'}">${acc.currency}</span></td>
        <td class="number-cell text-right">${fmtMoney(acc.initial_balance)}</td>
        <td class="number-cell text-right text-success">${fmtMoney(acc.income)}</td>
        <td class="number-cell text-right text-danger">${fmtMoney(acc.expense)}</td>
        <td class="number-cell text-right fw-bold">${fmtMoney(acc.balance)}</td>
        <td><div class="table-actions">
          <button class="btn-ghost btn btn-sm" onclick="openBankAccountForm('${acc.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn-ghost btn btn-sm danger" onclick="deleteBankAccount('${acc.id}')"><i class="fas fa-trash"></i></button>
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
    <label class="form-label">Cuenta *</label>
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
  confirmDialog('¿Eliminar este movimiento?', () => {
    DB.remove('treasuryTx', id);
    toast('Movimiento eliminado', 'warning');
    renderTesoreria();
  });
}

function showAccountTx(accountId) {
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
    ${txs.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(t => `<tr>
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
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveBankAccount('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
}

function saveBankAccount(id) {
  const name = document.getElementById('ba-name').value.trim();
  if (!name) { toast('El nombre es obligatorio', 'error'); return; }
  const data = {
    name,
    bank: document.getElementById('ba-bank').value.trim(),
    type: document.getElementById('ba-type').value,
    account_number: document.getElementById('ba-num').value.trim(),
    currency: document.getElementById('ba-currency').value,
    initial_balance: parseFloat(document.getElementById('ba-initial').value) || 0,
  };
  if (id) { DB.update('bankAccounts', id, data); toast('Cuenta actualizada', 'success'); }
  else { DB.insert('bankAccounts', data); toast('Cuenta creada', 'success'); }
  closeModal();
  renderTesoreria();
}

function deleteBankAccount(id) {
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
  exportCSV('movimientos_tesoreria.csv',
    ['Fecha','Cuenta','Tipo','Categoría','Descripción','Proyecto','Referencia','Importe'],
    txs.map(t => [
      t.date,
      accounts.find(a=>a.id===t.account_id)?.name||'',
      t.type,
      t.category||'',
      t.description,
      projects.find(p=>p.id===t.project_id)?.name||'',
      t.reference||'',
      t.type==='expense' ? -t.amount : t.amount
    ])
  );
}
