/* ===== CONTABILIDAD ===== */
function renderContabilidad() {
  const entries = DB.getAll('journalEntries');
  const accounts = DB.getAll('accounts');

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Contabilidad</div>
    <div class="page-subtitle">Libro diario, plan de cuentas, balance y estado de resultados</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="exportJournal()"><i class="fas fa-download"></i> Exportar</button>
    <button class="btn btn-primary" onclick="openJEForm()"><i class="fas fa-plus"></i> Nuevo Asiento</button>
  </div>
</div>

<div id="conta-tabs">
  <div class="tabs">
    <button class="tab-btn" data-tab="tab-diario">Libro Diario</button>
    <button class="tab-btn" data-tab="tab-balance">Balance General</button>
    <button class="tab-btn" data-tab="tab-resultados">Resultados</button>
    <button class="tab-btn" data-tab="tab-cuentas">Plan de Cuentas</button>
  </div>
  <div id="tab-diario" class="tab-content">
    ${renderJournal(entries)}
  </div>
  <div id="tab-balance" class="tab-content">
    ${renderBalance(accounts, entries)}
  </div>
  <div id="tab-resultados" class="tab-content">
    ${renderResults(accounts, entries)}
  </div>
  <div id="tab-cuentas" class="tab-content">
    ${renderAccountPlan(accounts)}
  </div>
</div>
  `;

  initTabs('conta-tabs');
  setTimeout(() => renderResultsChart(accounts, entries), 100);
}

// ---- JOURNAL ----
function renderJournal(entries) {
  return `
<div class="filter-bar">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar asiento..." oninput="filterJE(this.value)">
  </div>
  <input type="date" class="form-control" style="width:140px" placeholder="Desde" oninput="filterJE(undefined, this.value)">
  <input type="date" class="form-control" style="width:140px" placeholder="Hasta" oninput="filterJE(undefined, undefined, this.value)">
</div>
<div id="je-list">
  ${buildJEList(entries)}
</div>`;
}

function buildJEList(entries) {
  if (!entries.length) return `<div class="empty-state"><i class="fas fa-book"></i><p>No hay asientos contables</p></div>`;

  return entries.slice().sort((a,b) => b.date.localeCompare(a.date)).map(e => {
    const totalDebit = e.lines.reduce((s,l) => s + (l.debit||0), 0);
    const totalCredit = e.lines.reduce((s,l) => s + (l.credit||0), 0);
    return `
<div class="card mb-2" id="je-${e.id}">
  <div class="card-header" style="cursor:pointer" onclick="toggleJE('${e.id}')">
    <div style="display:flex;align-items:center;gap:12px">
      <span style="font-size:13px;font-weight:700">${e.number}</span>
      <span style="font-size:12px;color:var(--text-muted)">${fmtDate(e.date)}</span>
      <span style="flex:1;font-size:13px">${e.description}</span>
      ${statusBadge(e.status)}
      <span class="badge badge-blue">${fmtMoney(totalDebit)}</span>
    </div>
    <div style="display:flex;gap:6px">
      <button class="btn-ghost btn btn-sm" onclick="event.stopPropagation(); openJEForm('${e.id}')"><i class="fas fa-edit"></i></button>
      <button class="btn-ghost btn btn-sm danger" onclick="event.stopPropagation(); deleteJE('${e.id}')"><i class="fas fa-trash"></i></button>
    </div>
  </div>
  <div class="je-detail" id="je-detail-${e.id}" style="display:none">
    <div class="card-body" style="padding:0">
      <div class="table-wrap">
        <table><thead><tr>
          <th>Cuenta</th><th>Descripción</th><th class="text-right">Débito</th><th class="text-right">Crédito</th>
        </tr></thead>
        <tbody>
          ${e.lines.map(l => `<tr>
            <td><strong>${l.account_code}</strong> — ${l.account_name}</td>
            <td style="color:var(--text-muted)">${l.description || ''}</td>
            <td class="number-cell text-right">${l.debit > 0 ? fmtMoney(l.debit) : '-'}</td>
            <td class="number-cell text-right">${l.credit > 0 ? fmtMoney(l.credit) : '-'}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr class="total-row">
          <td colspan="2" class="text-right"><strong>Totales</strong></td>
          <td class="number-cell text-right"><strong>${fmtMoney(totalDebit)}</strong></td>
          <td class="number-cell text-right"><strong>${fmtMoney(totalCredit)}</strong></td>
        </tr>
        ${totalDebit !== totalCredit ? `<tr><td colspan="4" class="text-danger text-right">⚠ Asiento desbalanceado</td></tr>` : ''}
        </tfoot>
      </table>
    </div>
  </div>
</div>`;
  }).join('');
}

function toggleJE(id) {
  const detail = document.getElementById(`je-detail-${id}`);
  if (detail) detail.style.display = detail.style.display === 'none' ? '' : 'none';
}

function filterJE(q, from, to) {
  let entries = DB.getAll('journalEntries');
  if (q) entries = entries.filter(e => e.number.toLowerCase().includes(q.toLowerCase()) || e.description.toLowerCase().includes(q.toLowerCase()));
  if (from) entries = entries.filter(e => e.date >= from);
  if (to) entries = entries.filter(e => e.date <= to);
  const list = document.getElementById('je-list');
  if (list) list.innerHTML = buildJEList(entries);
}

// ---- BALANCE SHEET ----
function renderBalance(accounts, entries) {
  const balances = calcAccountBalances(accounts, entries);

  const assets = accounts.filter(a => a.type === 'asset' && !a.parent_id);
  const liabilities = accounts.filter(a => a.type === 'liability' && !a.parent_id);
  const equity = accounts.filter(a => a.type === 'equity' && !a.parent_id);

  const totalAssets = sumBalances(accounts.filter(a => a.type === 'asset'), balances);
  const totalLiabilities = sumBalances(accounts.filter(a => a.type === 'liability'), balances);
  const totalEquity = sumBalances(accounts.filter(a => a.type === 'equity'), balances);

  function renderAccountTree(parentId, level = 0) {
    const children = accounts.filter(a => a.parent_id === parentId);
    return children.map(a => {
      const bal = balances[a.code] || 0;
      const subChildren = accounts.filter(c => c.parent_id === a.id);
      return `<div class="account-node level-${level+1}" style="padding-left:${level*20+12}px">
        <span style="flex:1;font-size:${level===0?'13px':'12px'}">${a.code} — ${a.name}</span>
        <span class="number-cell">${bal !== 0 ? fmtMoney(bal) : '-'}</span>
      </div>
      ${subChildren.length ? renderAccountTree(a.id, level+1) : ''}`;
    }).join('');
  }

  return `
<div class="grid-2">
  <div class="card">
    <div class="card-header" style="background:#eff6ff"><span class="card-title text-primary"><i class="fas fa-plus-circle"></i> ACTIVO</span><strong>${fmtMoney(totalAssets)}</strong></div>
    <div class="card-body" style="padding:8px 0">
      <div class="account-tree">
        ${accounts.filter(a => a.type==='asset' && !a.parent_id).map(a => `
          <div class="account-node level-1" style="padding:8px 16px;background:#f8fafc;font-weight:700">
            <span>${a.code} — ${a.name}</span>
            <span class="number-cell">${fmtMoney(balances[a.code]||0)}</span>
          </div>
          ${renderAccountTree(a.id, 1)}
        `).join('')}
      </div>
      <div style="padding:10px 16px;border-top:2px solid var(--primary);display:flex;justify-content:space-between;font-weight:700;font-size:14px">
        <span>TOTAL ACTIVO</span><span class="number-cell text-primary">${fmtMoney(totalAssets)}</span>
      </div>
    </div>
  </div>

  <div>
    <div class="card mb-2">
      <div class="card-header" style="background:#fef2f2"><span class="card-title text-danger"><i class="fas fa-minus-circle"></i> PASIVO</span><strong>${fmtMoney(totalLiabilities)}</strong></div>
      <div class="card-body" style="padding:8px 0">
        <div class="account-tree">
          ${accounts.filter(a => a.type==='liability' && !a.parent_id).map(a => `
            <div class="account-node level-1" style="padding:8px 16px;background:#f8fafc;font-weight:700">
              <span>${a.code} — ${a.name}</span>
              <span class="number-cell">${fmtMoney(balances[a.code]||0)}</span>
            </div>
            ${renderAccountTree(a.id, 1)}
          `).join('')}
        </div>
        <div style="padding:10px 16px;border-top:2px solid var(--danger);display:flex;justify-content:space-between;font-weight:700;font-size:14px">
          <span>TOTAL PASIVO</span><span class="number-cell text-danger">${fmtMoney(totalLiabilities)}</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header" style="background:#ecfdf5"><span class="card-title text-success"><i class="fas fa-landmark"></i> PATRIMONIO NETO</span><strong>${fmtMoney(totalEquity)}</strong></div>
      <div class="card-body" style="padding:8px 0">
        <div class="account-tree">
          ${accounts.filter(a => a.type==='equity' && !a.parent_id).map(a => `
            <div class="account-node level-1" style="padding:8px 16px;background:#f8fafc;font-weight:700">
              <span>${a.code} — ${a.name}</span>
              <span class="number-cell">${fmtMoney(balances[a.code]||0)}</span>
            </div>
            ${renderAccountTree(a.id, 1)}
          `).join('')}
        </div>
        <div style="padding:10px 16px;border-top:2px solid var(--success);display:flex;justify-content:space-between;font-weight:700;font-size:14px">
          <span>TOTAL P.N.</span><span class="number-cell text-success">${fmtMoney(totalEquity)}</span>
        </div>
      </div>
    </div>

    <div class="card mt-2" style="background:var(--primary);color:#fff;padding:16px">
      <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700">
        <span>TOTAL PASIVO + PATRIMONIO NETO</span>
        <span>${fmtMoney(totalLiabilities + totalEquity)}</span>
      </div>
      <div style="font-size:11px;opacity:.8;margin-top:4px">
        ${Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1 ? '✓ Balance cuadrado' : `⚠ Diferencia: ${fmtMoney(totalAssets - (totalLiabilities + totalEquity))}`}
      </div>
    </div>
  </div>
</div>`;
}

// ---- RESULTS ----
function renderResults(accounts, entries) {
  const balances = calcAccountBalances(accounts, entries);
  const revenues = accounts.filter(a => a.type === 'revenue');
  const expenses = accounts.filter(a => a.type === 'expense');
  const totalRevenue = sumBalances(revenues, balances);
  const totalExpense = sumBalances(expenses, balances);
  const result = totalRevenue - totalExpense;

  return `
<div class="grid-2 mb-2">
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-arrow-down"></i></div><div>
    <div class="stat-value text-success">${fmtMoney(totalRevenue)}</div><div class="stat-label">Ingresos Totales</div></div></div>
  <div class="stat-card"><div class="stat-icon red"><i class="fas fa-arrow-up"></i></div><div>
    <div class="stat-value text-danger">${fmtMoney(totalExpense)}</div><div class="stat-label">Egresos Totales</div></div></div>
</div>

<div class="grid-2">
  <div class="card">
    <div class="card-header" style="background:#ecfdf5"><span class="card-title text-success"><i class="fas fa-arrow-circle-down"></i> INGRESOS</span><strong>${fmtMoney(totalRevenue)}</strong></div>
    <div class="card-body" style="padding:8px 0">
      ${accounts.filter(a => a.type==='revenue').map(a => `
        <div style="display:flex;justify-content:space-between;padding:8px 16px;border-bottom:1px solid var(--border);font-size:12px">
          <span>${a.code} — ${a.name}</span>
          <span class="number-cell text-success">${fmtMoney(balances[a.code]||0)}</span>
        </div>`).join('')}
      <div style="padding:10px 16px;font-weight:700;display:flex;justify-content:space-between">
        <span>TOTAL INGRESOS</span><span class="number-cell text-success">${fmtMoney(totalRevenue)}</span>
      </div>
    </div>
  </div>

  <div>
    <div class="card mb-2">
      <div class="card-header" style="background:#fef2f2"><span class="card-title text-danger"><i class="fas fa-arrow-circle-up"></i> EGRESOS</span><strong>${fmtMoney(totalExpense)}</strong></div>
      <div class="card-body" style="padding:8px 0">
        ${accounts.filter(a => a.type==='expense').map(a => `
          <div style="display:flex;justify-content:space-between;padding:8px 16px;border-bottom:1px solid var(--border);font-size:12px">
            <span>${a.code} — ${a.name}</span>
            <span class="number-cell text-danger">${fmtMoney(balances[a.code]||0)}</span>
          </div>`).join('')}
        <div style="padding:10px 16px;font-weight:700;display:flex;justify-content:space-between">
          <span>TOTAL EGRESOS</span><span class="number-cell text-danger">${fmtMoney(totalExpense)}</span>
        </div>
      </div>
    </div>

    <div class="card" style="background:${result >= 0 ? 'var(--success)' : 'var(--danger)'};color:#fff;padding:20px">
      <div style="font-size:12px;opacity:.85;font-weight:600;margin-bottom:4px">RESULTADO DEL EJERCICIO</div>
      <div style="font-size:28px;font-weight:800">${fmtMoney(result)}</div>
      <div style="font-size:12px;opacity:.8;margin-top:4px">${result >= 0 ? '↑ GANANCIA' : '↓ PÉRDIDA'}</div>
    </div>
  </div>
</div>

<div class="card mt-2">
  <div class="card-header"><span class="card-title text-primary"><i class="fas fa-chart-bar"></i> Ingresos vs Egresos</span></div>
  <div class="card-body"><div style="height:200px"><canvas id="results-chart"></canvas></div></div>
</div>`;
}

function renderResultsChart(accounts, entries) {
  const ctx = document.getElementById('results-chart');
  if (!ctx) return;
  const balances = calcAccountBalances(accounts, entries);
  const revAccounts = accounts.filter(a => a.type==='revenue' && a.parent_id);
  const expAccounts = accounts.filter(a => a.type==='expense' && a.parent_id);

  safeChart(ctx, {
    type: 'bar',
    data: {
      labels: [...revAccounts.map(a => a.name), ...expAccounts.map(a => a.name)],
      datasets: [{
        data: [...revAccounts.map(a => balances[a.code]||0), ...expAccounts.map(a => -(balances[a.code]||0))],
        backgroundColor: [...revAccounts.map(()=>'rgba(16,185,129,.7)'), ...expAccounts.map(()=>'rgba(239,68,68,.7)')],
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: v => fmtMoney(v), font: { size: 10 } }, grid: { color: '#f1f5f9' } },
        x: { ticks: { font: { size: 10 } }, grid: { display: false } }
      }
    }
  });
}

// ---- CHART OF ACCOUNTS ----
function renderAccountPlan(accounts) {
  const types = [
    { type: 'asset', label: 'ACTIVO', color: 'badge-blue' },
    { type: 'liability', label: 'PASIVO', color: 'badge-red' },
    { type: 'equity', label: 'PATRIMONIO', color: 'badge-green' },
    { type: 'revenue', label: 'INGRESOS', color: 'badge-cyan' },
    { type: 'expense', label: 'EGRESOS', color: 'badge-yellow' },
  ];

  return `
<div class="filter-bar">
  <button class="btn btn-primary" onclick="openAccountForm()"><i class="fas fa-plus"></i> Nueva Cuenta</button>
</div>
<div class="card"><div class="card-body" style="padding:0">
  <div class="table-wrap">
    <table><thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Padre</th><th>Estado</th><th>Acciones</th></tr></thead>
    <tbody>
      ${accounts.sort((a,b)=>a.code.localeCompare(b.code)).map(a => {
        const parent = accounts.find(p => p.id === a.parent_id);
        const typeInfo = types.find(t => t.type === a.type);
        return `<tr style="padding-left:${(a.code.split('.').length-1)*12}px">
          <td><strong>${a.code}</strong></td>
          <td style="padding-left:${(a.code.split('.').length-1)*16}px">${a.code.split('.').length > 1 ? '└ ' : ''}${a.name}</td>
          <td><span class="badge ${typeInfo?.color||'badge-gray'}">${typeInfo?.label||a.type}</span></td>
          <td style="font-size:11px;color:var(--text-muted)">${parent ? `${parent.code} ${parent.name}` : '-'}</td>
          <td>${a.active ? `<span class="badge badge-green">Activa</span>` : `<span class="badge badge-gray">Inactiva</span>`}</td>
          <td><div class="table-actions">
            <button class="btn-ghost btn btn-sm" onclick="openAccountForm('${a.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn-ghost btn btn-sm danger" onclick="deleteAccount('${a.id}')"><i class="fas fa-trash"></i></button>
          </div></td>
        </tr>`;
      }).join('')}
    </tbody>
    </table>
  </div>
</div></div>`;
}

// ---- JOURNAL ENTRY FORM ----
function openJEForm(id = null) {
  const e = id ? DB.getById('journalEntries', id) : null;
  const nextNum = `AS-${new Date().getFullYear()}-${String(DB.getAll('journalEntries').length + 1).padStart(3,'0')}`;
  const accounts = DB.getAll('accounts').filter(a => !accounts?.find || a.parent_id);
  const accountOptions = DB.getAll('accounts').map(a => `<option value="${a.code}" data-name="${a.name}">${a.code} — ${a.name}</option>`).join('');

  const lines = e?.lines || [
    { account_code: '', account_name: '', debit: 0, credit: 0, description: '' },
    { account_code: '', account_name: '', debit: 0, credit: 0, description: '' },
  ];

  openModal(e ? 'Editar Asiento' : 'Nuevo Asiento Contable', `
<div class="form-grid form-grid-2" style="margin-bottom:16px">
  <div class="form-group">
    <label class="form-label">Número</label>
    <input class="form-control" id="je-num" value="${e?.number || nextNum}">
  </div>
  <div class="form-group">
    <label class="form-label">Estado</label>
    <select class="form-control" id="je-status">
      <option value="draft" ${e?.status==='draft'?'selected':''}>Borrador</option>
      <option value="posted" ${e?.status==='posted'?'selected':''}>Contabilizado</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Fecha</label>
    <input class="form-control" id="je-date" type="date" value="${e?.date || todayStr()}">
  </div>
  <div class="form-group">
    <label class="form-label">Descripción *</label>
    <input class="form-control" id="je-desc" value="${e?.description || ''}">
  </div>
</div>
<div class="divider"></div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
  <strong style="font-size:13px">Líneas del Asiento</strong>
  <button class="btn btn-sm btn-secondary" onclick="addJELine()"><i class="fas fa-plus"></i> Línea</button>
</div>
<div style="display:grid;grid-template-columns:1.5fr 1.5fr 2fr 120px 120px 30px;gap:4px;margin-bottom:4px;font-size:10px;font-weight:600;color:var(--text-muted)">
  <span>Cuenta</span><span>Nombre</span><span>Descripción</span><span>Débito</span><span>Crédito</span><span></span>
</div>
<div id="je-lines">
  ${lines.map((l, i) => jeLine(l, i, accountOptions)).join('')}
</div>
<div id="je-balance-info" style="text-align:right;font-size:12px;margin-top:8px"></div>
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveJE('${id||''}')"><i class="fas fa-save"></i> Guardar Asiento</button>
`);
  window._jeLines = [...lines];
  updateJEBalance();
}

function jeLine(l, i, accountOptions) {
  const ao = accountOptions || DB.getAll('accounts').map(a => `<option value="${a.code}" data-name="${a.name}">${a.code} — ${a.name}</option>`).join('');
  return `<div id="jel-row-${i}" style="display:grid;grid-template-columns:1.5fr 1.5fr 2fr 120px 120px 30px;gap:4px;margin-bottom:4px;align-items:center">
    <select class="form-control" style="font-size:11px" onchange="setJEAccount(${i}, this)">
      <option value="">Cuenta...</option>${ao}
    </select>
    <input class="form-control" style="font-size:11px;background:#f8fafc" readonly id="jel-name-${i}" value="${l.account_name||''}">
    <input class="form-control" style="font-size:11px" placeholder="Descripción" id="jel-desc-${i}" value="${l.description||''}" oninput="updateJELine(${i},'description',this.value)">
    <input class="form-control" style="font-size:11px" type="number" min="0" id="jel-debit-${i}" value="${l.debit||''}" placeholder="0" oninput="updateJELine(${i},'debit',+this.value)">
    <input class="form-control" style="font-size:11px" type="number" min="0" id="jel-credit-${i}" value="${l.credit||''}" placeholder="0" oninput="updateJELine(${i},'credit',+this.value)">
    <button class="btn-ghost btn danger" onclick="removeJELine(${i})"><i class="fas fa-times" style="font-size:10px"></i></button>
  </div>`;
}

window._jeLines = [];
function addJELine() {
  window._jeLines.push({ account_code: '', account_name: '', debit: 0, credit: 0, description: '' });
  const i = window._jeLines.length - 1;
  const cont = document.getElementById('je-lines');
  const ao = DB.getAll('accounts').map(a => `<option value="${a.code}" data-name="${a.name}">${a.code} — ${a.name}</option>`).join('');
  const div = document.createElement('div');
  div.innerHTML = jeLine({ account_code:'', account_name:'', debit:0, credit:0, description:'' }, i, ao);
  cont.appendChild(div.firstElementChild);
}

function setJEAccount(i, sel) {
  const opt = sel.options[sel.selectedIndex];
  const code = sel.value;
  const name = opt.dataset.name || '';
  if (!window._jeLines[i]) window._jeLines[i] = { account_code:'', account_name:'', debit:0, credit:0, description:'' };
  window._jeLines[i].account_code = code;
  window._jeLines[i].account_name = name;
  const nameEl = document.getElementById(`jel-name-${i}`);
  if (nameEl) nameEl.value = name;
}

function updateJELine(i, field, val) {
  if (!window._jeLines[i]) window._jeLines[i] = { account_code:'', account_name:'', debit:0, credit:0, description:'' };
  window._jeLines[i][field] = val;
  updateJEBalance();
}

function removeJELine(i) {
  const row = document.getElementById(`jel-row-${i}`);
  if (row) row.remove();
  window._jeLines[i] = null;
  updateJEBalance();
}

function updateJEBalance() {
  const validLines = window._jeLines.filter(Boolean);
  const totalDebit = validLines.reduce((s,l) => s+(l.debit||0), 0);
  const totalCredit = validLines.reduce((s,l) => s+(l.credit||0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const info = document.getElementById('je-balance-info');
  if (info) {
    info.innerHTML = `Débito: <strong>${fmtMoney(totalDebit)}</strong> &nbsp; Crédito: <strong>${fmtMoney(totalCredit)}</strong>
      &nbsp; <span class="${balanced ? 'text-success' : 'text-danger'}">${balanced ? '✓ Balanceado' : `⚠ Diferencia: ${fmtMoney(Math.abs(totalDebit-totalCredit))}`}</span>`;
  }
}

function saveJE(id) {
  const description = document.getElementById('je-desc').value.trim();
  if (!description) { toast('La descripción es obligatoria', 'error'); return; }

  // Read lines from DOM
  const lines = [];
  document.querySelectorAll('[id^="jel-row-"]').forEach((row, i) => {
    const selects = row.querySelectorAll('select');
    const inputs = row.querySelectorAll('input');
    const code = selects[0]?.value;
    if (code) {
      lines.push({
        account_code: code,
        account_name: inputs[0]?.value || '',
        description: inputs[1]?.value || '',
        debit: parseFloat(inputs[2]?.value) || 0,
        credit: parseFloat(inputs[3]?.value) || 0,
      });
    }
  });

  // Also use _jeLines
  window._jeLines.filter(Boolean).forEach(l => {
    if (l.account_code && !lines.find(ll => ll.account_code === l.account_code)) lines.push(l);
  });

  if (!lines.length) { toast('Agregá al menos una línea', 'error'); return; }

  const data = {
    number: document.getElementById('je-num').value,
    date: document.getElementById('je-date').value,
    description,
    status: document.getElementById('je-status').value,
    lines,
  };

  if (id) { DB.update('journalEntries', id, data); toast('Asiento actualizado', 'success'); }
  else { DB.insert('journalEntries', data); toast('Asiento creado', 'success'); }

  window._jeLines = [];
  closeModal();
  renderContabilidad();
}

function deleteJE(id) {
  confirmDialog('¿Eliminar este asiento contable?', () => {
    DB.remove('journalEntries', id);
    toast('Asiento eliminado', 'warning');
    renderContabilidad();
  });
}

// ---- ACCOUNT FORM ----
function openAccountForm(id = null) {
  const acc = id ? DB.getById('accounts', id) : null;
  const accounts = DB.getAll('accounts');

  openModal(acc ? 'Editar Cuenta' : 'Nueva Cuenta', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Código *</label>
    <input class="form-control" id="af-code" value="${acc?.code || ''}" placeholder="1.1.1">
  </div>
  <div class="form-group">
    <label class="form-label">Nombre *</label>
    <input class="form-control" id="af-name" value="${acc?.name || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">Tipo *</label>
    <select class="form-control" id="af-type">
      <option value="asset" ${acc?.type==='asset'?'selected':''}>Activo</option>
      <option value="liability" ${acc?.type==='liability'?'selected':''}>Pasivo</option>
      <option value="equity" ${acc?.type==='equity'?'selected':''}>Patrimonio</option>
      <option value="revenue" ${acc?.type==='revenue'?'selected':''}>Ingreso</option>
      <option value="expense" ${acc?.type==='expense'?'selected':''}>Egreso</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Cuenta Padre</label>
    <select class="form-control" id="af-parent">
      <option value="">Sin padre (raíz)</option>
      ${accounts.filter(a => a.id !== id).map(a => `<option value="${a.id}" ${acc?.parent_id===a.id?'selected':''}>${a.code} — ${a.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Estado</label>
    <select class="form-control" id="af-active">
      <option value="true" ${acc?.active!==false?'selected':''}>Activa</option>
      <option value="false" ${acc?.active===false?'selected':''}>Inactiva</option>
    </select>
  </div>
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveAccount('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
}

function saveAccount(id) {
  const code = document.getElementById('af-code').value.trim();
  const name = document.getElementById('af-name').value.trim();
  if (!code || !name) { toast('Código y nombre son obligatorios', 'error'); return; }
  const data = {
    code,
    name,
    type: document.getElementById('af-type').value,
    parent_id: document.getElementById('af-parent').value || null,
    active: document.getElementById('af-active').value === 'true',
  };
  if (id) { DB.update('accounts', id, data); toast('Cuenta actualizada', 'success'); }
  else { DB.insert('accounts', data); toast('Cuenta creada', 'success'); }
  closeModal();
  renderContabilidad();
}

function deleteAccount(id) {
  confirmDialog('¿Eliminar esta cuenta?', () => {
    DB.remove('accounts', id);
    toast('Cuenta eliminada', 'warning');
    renderContabilidad();
  });
}

function exportJournal() {
  const entries = DB.getAll('journalEntries');
  const rows = [];
  entries.forEach(e => {
    e.lines.forEach(l => {
      rows.push([e.number, e.date, e.description, l.account_code, l.account_name, l.debit, l.credit, l.description]);
    });
  });
  exportCSV('libro_diario.csv',
    ['Asiento','Fecha','Descripción','Cód.Cuenta','Cuenta','Débito','Crédito','Detalle'],
    rows
  );
}

// ---- HELPERS ----
function calcAccountBalances(accounts, entries) {
  const balances = {};
  accounts.forEach(a => { balances[a.code] = 0; });

  entries.filter(e => e.status === 'posted').forEach(e => {
    e.lines.forEach(l => {
      if (!l.account_code) return;
      const acc = accounts.find(a => a.code === l.account_code);
      if (!acc) return;
      const debit = l.debit || 0;
      const credit = l.credit || 0;
      if (['asset','expense'].includes(acc.type)) {
        balances[l.account_code] = (balances[l.account_code]||0) + debit - credit;
      } else {
        balances[l.account_code] = (balances[l.account_code]||0) + credit - debit;
      }
    });
  });

  // Propagate to parents
  accounts.filter(a => a.parent_id).forEach(a => {
    const parent = accounts.find(p => p.id === a.parent_id);
    if (parent) balances[parent.code] = (balances[parent.code]||0) + (balances[a.code]||0);
  });

  return balances;
}

function sumBalances(accs, balances) {
  return accs.filter(a => !a.parent_id).reduce((s,a) => s + (balances[a.code]||0), 0);
}
