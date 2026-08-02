/* ===== CONTABILIDAD ===== */

// Scope de Contabilidad (modelo consolidado):
//   _contaProject   '' = General (todos los proyectos) | <projectId>
//   _contaCompanyId '' = Todas las razones sociales     | <companyId>
window._contaProject   = '';
window._contaCompanyId = '';
window._contaBook      = '';   // '' = A y B | 'A' = Contabilidad A (formal) | 'B'
window._contaConsol    = '';   // '' = por moneda | 'ARS'/'USD'/... = todo convertido a esa moneda

// Barra de scope: Proyecto (eje primario, con "General") + Razón social (filtro).
function _contaScopeBar() {
  var companies = DB.getAllCompanies() || [];
  var projects  = (typeof DB.getAllProjectsConsolidated === 'function') ? DB.getAllProjectsConsolidated() : DB.getAll('projects');
  var seenP = {}, projList = [];
  projects.forEach(function(p) { if (p && p.id && !seenP[p.id]) { seenP[p.id] = true; projList.push(p); } });
  projList.sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); });

  var projOpts = '<option value="">🌐 General (todos los proyectos)</option>' +
    projList.map(function(p) { return '<option value="' + p.id + '"' + (p.id === window._contaProject ? ' selected' : '') + '>' + escapeHtml(p.name || '(sin nombre)') + '</option>'; }).join('');
  var coOpts = '<option value="">Todas las razones sociales</option>' +
    companies.map(function(c) { return '<option value="' + c.id + '"' + (c.id === window._contaCompanyId ? ' selected' : '') + '>' + escapeHtml(c.legalName || c.name) + '</option>'; }).join('');
  var bk = window._contaBook || '';
  var bookOpts =
    '<option value="">Contabilidad A y B</option>' +
    '<option value="A"' + (bk === 'A' ? ' selected' : '') + '>Solo Contabilidad A</option>' +
    '<option value="B"' + (bk === 'B' ? ' selected' : '') + '>Solo Contabilidad B</option>';
  var cs = window._contaConsol || '';
  var consolOpts = '<option value="">Por moneda (sin convertir)</option>' +
    ((typeof DB.getAllCurrencies === 'function' ? DB.getAllCurrencies() : []).map(function(c){ return '<option value="' + c.id + '"' + (cs === c.id ? ' selected' : '') + '>Consolidar en ' + escapeHtml(c.id) + '</option>'; }).join(''));

  return '<div class="conta-company-bar" style="display:flex;gap:18px;flex-wrap:wrap;align-items:center">' +
    '<div style="display:flex;align-items:center;gap:8px"><i class="fas fa-diagram-project" style="color:var(--primary)"></i>' +
      '<span class="conta-company-label">Proyecto</span>' +
      '<select class="form-control conta-company-sel" onchange="contaSetProject(this.value)">' + projOpts + '</select></div>' +
    '<div style="display:flex;align-items:center;gap:8px"><i class="fas fa-city" style="color:var(--primary)"></i>' +
      '<span class="conta-company-label">Razón Social</span>' +
      '<select class="form-control conta-company-sel" onchange="contaSetCompany(this.value)">' + coOpts + '</select></div>' +
    '<div style="display:flex;align-items:center;gap:8px"><i class="fas fa-book-open" style="color:var(--primary)"></i>' +
      '<span class="conta-company-label">Libro</span>' +
      '<select class="form-control conta-company-sel" onchange="contaSetBook(this.value)">' + bookOpts + '</select></div>' +
    '<div style="display:flex;align-items:center;gap:8px"><i class="fas fa-right-left" style="color:var(--primary)"></i>' +
      '<span class="conta-company-label">Moneda</span>' +
      '<select class="form-control conta-company-sel" onchange="contaSetConsol(this.value)">' + consolOpts + '</select></div>' +
    '</div>' +
    (cs ? '<div style="font-size:11px;color:var(--text-muted);margin:-4px 0 10px"><i class="fas fa-circle-info"></i> Montos convertidos a ' + escapeHtml(cs) + ' al tipo de cambio de la fecha de cada asiento (Empresas → Tipos de cambio).</div>' : '');
}

// Re-renderiza el módulo de contabilidad ACTUAL (Diario, Sumas, Balance, etc.).
function _contaRerender() {
  var mod = window.APP_STATE && window.APP_STATE.currentModule;
  if (window.MODULES && window.MODULES[mod] && typeof window.MODULES[mod].render === 'function') {
    try { window.MODULES[mod].render(); return; } catch(e) {}
  }
  renderContabilidad();
}

function contaSetProject(id) {
  window._contaProject = id || '';
  _contaRerender();
}

function contaSetBook(v) {
  window._contaBook = v || '';
  _contaRerender();
}

function contaSetConsol(v) {
  window._contaConsol = v || '';
  _contaRerender();
}

function contaSetCompany(id) {
  window._contaCompanyId = id || '';
  // Al elegir una razón social puntual la ponemos como empresa activa (para que
  // "Nuevo Asiento" opere sobre ella). En "Todas" se conserva la activa.
  if (id) { DB.setCompany(id); if (window.APP_STATE) window.APP_STATE.activeCompany = id; }
  _contaRerender();
}

// Asientos consolidados (todas las razones sociales) filtrados por el scope activo.
function _contaScopedEntries() {
  var entries = DB.getAllConsolidated('journalEntries');
  if (window._contaCompanyId) entries = entries.filter(function(e) { return e._company_id === window._contaCompanyId; });
  if (window._contaProject)   entries = entries.filter(function(e) { return (e.project_id || '') === window._contaProject; });
  if (window._contaBook)      entries = entries.filter(function(e) { return (e.book || 'A') === window._contaBook; });
  // Consolidado por moneda: convertir cada asiento a la moneda objetivo al TC de su fecha.
  if (window._contaConsol) {
    var tgt = window._contaConsol;
    entries = entries.map(function(e) {
      var from = _jeCur(e);
      if (from === tgt) return e;
      var conv = Object.assign({}, e, { currency: tgt, _converted: true });
      conv.lines = (e.lines || []).map(function(l) {
        return Object.assign({}, l, {
          debit:  DB.convertCurrency(l.debit  || 0, from, tgt, e.date),
          credit: DB.convertCurrency(l.credit || 0, from, tgt, e.date),
        });
      });
      return conv;
    });
  }
  return entries;
}
// Plan de cuentas del scope: de la razón social elegida, o consolidado (dedupe por código).
function _contaScopedAccounts() {
  var accounts = DB.getAllConsolidated('accounts');
  if (window._contaCompanyId) return accounts.filter(function(a) { return a._company_id === window._contaCompanyId; });
  var seen = {}, out = [];
  accounts.forEach(function(a) { var k = a.code || a.id; if (!seen[k]) { seen[k] = true; out.push(a); } });
  return out;
}

function renderContabilidad() {
  // Completar en segundo plano los datos de todas las empresas (para el consolidado).
  if (typeof DB.ensureAllCompaniesLoaded === 'function' && !window._contaLoadedAll) {
    window._contaLoadedAll = true;
    DB.ensureAllCompaniesLoaded().then(function(ok) { if (ok) { try { renderContabilidad(); } catch(e) {} } });
  }
  const entries = _contaScopedEntries();
  const accounts = _contaScopedAccounts();

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-eyebrow"><i class="fas fa-scale-balanced" style="font-size:14px"></i> Contable</div>
    <div class="page-title">Contabilidad</div>
    <div class="page-subtitle">Libro diario, plan de cuentas, balance y estado de resultados</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="exportJournal()"><i class="fas fa-download"></i> Exportar</button>
    <button class="btn btn-primary" onclick="openJEForm()"><i class="fas fa-plus"></i> Nuevo Asiento</button>
  </div>
</div>

${_contaScopeBar()}

<div id="conta-tabs">
  <div class="tabs">
    <button class="tab-btn" data-tab="tab-diario">Libro Diario</button>
    <button class="tab-btn" data-tab="tab-sumas-conta">Sumas y Saldos</button>
    <button class="tab-btn" data-tab="tab-balance">Balance General</button>
    <button class="tab-btn" data-tab="tab-resultados">Resultados</button>
    <button class="tab-btn" data-tab="tab-cuentas">Plan de Cuentas</button>
  </div>
  <div id="tab-diario" class="tab-content">
    ${renderJournal(entries)}
  </div>
  <div id="tab-sumas-conta" class="tab-content">
    ${renderSumasYSaldosContabilidad(accounts, entries)}
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

function renderContaPlan() {
  var accounts = DB.getAll('accounts');
  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Plan de Cuentas</div>
    <div class="page-subtitle">${accounts.length} cuentas registradas</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-ghost" onclick="downloadPlanCuentasTemplate()"><i class="fas fa-download"></i> Descargar Plantilla</button>
    <label class="btn btn-secondary" style="cursor:pointer;margin:0;display:inline-flex;align-items:center;gap:6px">
      <i class="fas fa-file-import"></i> Importar Excel
      <input type="file" accept=".xlsx,.xls,.csv" style="display:none" onchange="importCuentasDesdeExcel(this)">
    </label>
    <button class="btn btn-primary" onclick="openAccountForm()"><i class="fas fa-plus"></i> Nueva Cuenta</button>
  </div>
</div>
${renderAccountPlan(accounts)}
  `;
}

function downloadPlanCuentasTemplate() {
  if (!window.XLSX) { toast('Librería Excel no disponible', 'error'); return; }
  var accounts = DB.getAll('accounts').sort(function(a,b){ return (a.code||'').localeCompare(b.code||'',undefined,{numeric:true}); });
  var header = ['Código','Nombre','Tipo','Código Padre','Activo'];
  var rows = accounts.map(function(a) {
    var parent = accounts.find(function(p){ return p.id === a.parent_id; });
    return [a.code, a.name, a.type, parent ? parent.code : '', a.active !== false ? 'si' : 'no'];
  });
  var ws = XLSX.utils.aoa_to_sheet([header].concat(rows));
  ws['!cols'] = [{wch:14},{wch:52},{wch:12},{wch:14},{wch:8}];
  var ws2 = XLSX.utils.aoa_to_sheet([
    ['Tipo','Descripción'],
    ['asset','Activo'],['liability','Pasivo'],['equity','Patrimonio Neto'],['revenue','Ingresos'],['expense','Egresos / Gastos']
  ]);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plan de Cuentas');
  XLSX.utils.book_append_sheet(wb, ws2, 'Referencia Tipos');
  XLSX.writeFile(wb, 'PlanDeCuentas.xlsx');
  toast('Plantilla descargada', 'success');
}

function importCuentasDesdeExcel(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  if (!window.XLSX) { toast('Librería Excel no disponible', 'error'); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      var ws = wb.Sheets[wb.SheetNames[0]];
      var data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (data.length < 2) { toast('El archivo no contiene datos', 'error'); return; }
      var norm = function(s){ return (s||'').toString().toLowerCase().replace(/[áéíóúü]/g,function(c){return{á:'a',é:'e',í:'i',ó:'o',ú:'u',ü:'u'}[c]||c;}).trim(); };
      var hdrs = data[0].map(norm);
      var cC = hdrs.findIndex(function(h){ return h.includes('codigo')||h.includes('code')||h==='cod'; });
      var nC = hdrs.findIndex(function(h){ return h.includes('nombre')||h.includes('name')||h.includes('descripcion'); });
      var tC = hdrs.findIndex(function(h){ return h.includes('tipo')||h.includes('type'); });
      var pC = hdrs.findIndex(function(h){ return h.includes('padre')||h.includes('parent'); });
      var aC = hdrs.findIndex(function(h){ return h.includes('activo')||h.includes('active')||h.includes('estado'); });
      if (cC < 0 || nC < 0) { toast('No se encontró columna "Código" o "Nombre"', 'error'); return; }
      var tMap = {asset:'asset',activo:'asset','1':'asset',liability:'liability',pasivo:'liability','2':'liability',equity:'equity',patrimonio:'equity','3':'equity',revenue:'revenue',ingreso:'revenue',ingresos:'revenue','4':'revenue',expense:'expense',egreso:'expense',egresos:'expense',gasto:'expense','5':'expense'};
      var rows = data.slice(1).filter(function(r){ return r[cC] && r[nC]; });
      if (!rows.length) { toast('No se encontraron filas con cuentas', 'error'); return; }
      var now = new Date().toISOString();
      var accounts = rows.map(function(r) {
        var code   = (r[cC]||'').toString().trim();
        var name   = (r[nC]||'').toString().trim();
        var tRaw   = tC >= 0 ? norm(r[tC]) : '';
        var type   = tMap[tRaw] || (code[0]==='1'?'asset':code[0]==='2'?'liability':code[0]==='3'?'equity':code[0]==='4'?'revenue':'expense');
        var pCode  = pC >= 0 ? (r[pC]||'').toString().trim() : '';
        var active = aC < 0 || !['no','false','0','inactiva','inactive'].includes(norm(r[aC]));
        return { id:'acc-'+code.replace(/\./g,'-'), code, name, type, parent_id: pCode ? 'acc-'+pCode.replace(/\./g,'-') : null, active, created_at: now };
      });
      confirmDialog('Se importarán ' + accounts.length + ' cuentas y reemplazarán el plan actual. ¿Continuar?', function() {
        var db = DB.get(); db.accounts = accounts; DB.save(db);
        toast('Plan importado: ' + accounts.length + ' cuentas', 'success');
        renderContaPlan();
      });
    } catch(ex) {
      toast('Error al procesar: ' + ex.message, 'error');
      console.error(ex);
    }
  };
  reader.readAsArrayBuffer(file);
  input.value = '';
}

// ---- JOURNAL ----
window._jeFilters = { q:'', from:'', to:'', currency:'', counterparty:'' };

// Moneda efectiva de un asiento: la propia, o la de su razón social (empresa).
function _jeCur(e) { return (e && (e.currency || e._company_currency)) || ''; }

// Valores distintos presentes en los asientos consolidados (para poblar selectores).
function _jeDistinct(field) {
  var seen = {};
  DB.getAllConsolidated('journalEntries').forEach(function(e){
    var v = (field === 'currency') ? _jeCur(e) : (((e && e[field]) || '') + '');
    v = (v || '').trim(); if (v) seen[v] = true;
  });
  return Object.keys(seen).sort();
}

// Asientos filtrados: base = scope de Contabilidad (consolidado + proyecto + razón
// social) y sobre eso los filtros propios del Libro Diario.
function _jeApplyFilters() {
  var f = window._jeFilters;
  var entries = _contaScopedEntries();
  if (f.q)  entries = entries.filter(e => (e.number||'').toLowerCase().includes(f.q) || (e.description||'').toLowerCase().includes(f.q));
  if (f.from) entries = entries.filter(e => (e.date||'') >= f.from);
  if (f.to)   entries = entries.filter(e => (e.date||'') <= f.to);
  if (f.currency)     entries = entries.filter(e => _jeCur(e) === f.currency);
  if (f.counterparty) entries = entries.filter(e => (e.counterparty||'') === f.counterparty);
  return entries;
}

// Totales de débito agrupados por moneda de origen (los asientos sin moneda van a "—").
function _jeSummaryHtml(entries) {
  var byCur = {};
  entries.forEach(function(e){
    var cur = _jeCur(e) || '—';
    var deb = (e.lines||[]).reduce(function(s,l){ return s + (l.debit||0); }, 0);
    byCur[cur] = (byCur[cur] || 0) + deb;
  });
  var keys = Object.keys(byCur).sort();
  if (!keys.length) return '';
  return '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px">' +
    keys.map(function(c){
      return '<div class="card" style="padding:8px 14px;min-width:120px">' +
        '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px">' + escapeHtml(c) + '</div>' +
        '<div style="font-size:15px;font-weight:700">' + fmtMoney(byCur[c], c === '—' ? undefined : c) + '</div></div>';
    }).join('') + '</div>';
}

function _jeRefresh() {
  var entries = _jeApplyFilters();
  var list = document.getElementById('je-list');
  if (list) list.innerHTML = buildJEList(entries);
  var sum = document.getElementById('je-summary');
  if (sum) sum.innerHTML = _jeSummaryHtml(entries);
}

// Opciones de moneda: monedas configuradas + las presentes en asientos.
function _jeCurrencyOptions() {
  var set = {};
  (typeof DB.getAllCurrencies==='function'?DB.getAllCurrencies():[]).forEach(function(c){ if(c && c.id) set[c.id]=true; });
  _jeDistinct('currency').forEach(function(c){ set[c]=true; });
  return Object.keys(set).sort();
}
// Opciones de razón social: contrapartes en asientos + proveedores + clientes de facturas.
function _jePartyOptions() {
  var set = {};
  _jeDistinct('counterparty').forEach(function(p){ set[p]=true; });
  DB.getAll('suppliers').forEach(function(s){ var n=((s.name||s.legal_name||'')+'').trim(); if(n) set[n]=true; });
  DB.getAll('invoices').forEach(function(i){ var n=((i.client_name||'')+'').trim(); if(n) set[n]=true; });
  return Object.keys(set).sort(function(a,b){ return a.localeCompare(b); });
}

function renderJournal(entries) {
  var currencies = _jeCurrencyOptions();
  var parties    = _jePartyOptions();
  var f          = window._jeFilters;
  var filtered   = _jeApplyFilters();
  return `
<div class="filter-bar">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar asiento..." value="${f.q?escapeHtml(f.q):''}" oninput="window._jeFilters.q=this.value.toLowerCase(); _jeRefresh()">
  </div>
  <input type="date" class="form-control" style="width:140px" title="Desde" value="${f.from||''}" oninput="window._jeFilters.from=this.value; _jeRefresh()">
  <input type="date" class="form-control" style="width:140px" title="Hasta" value="${f.to||''}" oninput="window._jeFilters.to=this.value; _jeRefresh()">
  <select class="form-control" style="width:150px" title="Moneda de origen" onchange="window._jeFilters.currency=this.value; _jeRefresh()">
    <option value="">Toda moneda</option>${currencies.map(c=>`<option value="${escapeHtml(c)}" ${f.currency===c?'selected':''}>${escapeHtml(c)}</option>`).join('')}
  </select>
  <select class="form-control" style="width:210px" title="Contraparte (cliente/proveedor)" onchange="window._jeFilters.counterparty=this.value; _jeRefresh()">
    <option value="">Toda contraparte</option>${parties.map(p=>`<option value="${escapeHtml(p)}" ${f.counterparty===p?'selected':''}>${escapeHtml(p)}</option>`).join('')}
  </select>
</div>
<div id="je-summary">${_jeSummaryHtml(filtered)}</div>
<div id="je-list">
  ${buildJEList(filtered)}
</div>`;
}

function buildJEList(entries) {
  if (!entries.length) return `<div class="empty-state"><i class="fas fa-book"></i><p>No hay asientos contables</p></div>`;

  return entries.slice().sort((a,b) => (b.date||'').localeCompare(a.date||'')).map(e => {
    const totalDebit = (e.lines||[]).reduce((s,l) => s + (l.debit||0), 0);
    const totalCredit = (e.lines||[]).reduce((s,l) => s + (l.credit||0), 0);
    const _cur = _jeCur(e);
    return `
<div class="card mb-2" id="je-${e.id}">
  <div class="card-header" style="cursor:pointer" onclick="toggleJE('${e.id}')">
    <div style="display:flex;align-items:center;gap:12px">
      <span style="font-size:13px;font-weight:700">${e.number}</span>
      <span style="font-size:12px;color:var(--text-muted)">${fmtDate(e.date)}</span>
      <span style="flex:1;font-size:13px">${e.description}</span>
      ${(!window._contaCompanyId && e._company_name) ? `<span class="badge badge-blue" style="font-weight:500" title="Razón social">${escapeHtml(e._company_name)}</span>` : ''}
      ${e.counterparty ? `<span class="badge badge-gray" style="font-weight:500" title="Contraparte">${escapeHtml(e.counterparty)}</span>` : ''}
      ${_cur ? `<span class="badge" style="background:var(--bg);color:var(--text-muted)" title="Moneda">${escapeHtml(_cur)}</span>` : ''}
      ${statusBadge(e.status)}
      <span class="badge badge-blue">${fmtMoney(totalDebit, _cur || undefined)}</span>
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

  new Chart(ctx, {
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
  <button class="btn btn-secondary" onclick="importHAPlanCuentas()"><i class="fas fa-file-import"></i> Importar Plan Grupo HA</button>
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
  DB.markEdit('journalEntries', id);   // control de concurrencia: revisión base al abrir
  const nextNum = nextJournalNumber();
  window._jeAutoNum = id ? null : nextNum;   // marca "número autogenerado" (no tocado a mano)
  const allAccounts = DB.getAll('accounts');
  const accounts = allAccounts.filter(a => !allAccounts.find(b => b.parent_id === a.id) || a.parent_id);
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
  <div class="form-group">
    <label class="form-label">Proyecto</label>
    <select class="form-control" id="je-project">
      <option value="">— Sin proyecto —</option>
      ${((typeof DB.getAllProjectsConsolidated==='function'?DB.getAllProjectsConsolidated():DB.getAll('projects')).filter((p,i,a)=>a.findIndex(x=>x.id===p.id)===i)).map(p=>`<option value="${p.id}" ${e?.project_id===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Moneda de origen</label>
    <select class="form-control" id="je-currency">
      <option value="">— Sin especificar —</option>
      ${(typeof DB.getAllCurrencies==='function'?DB.getAllCurrencies():[]).map(c=>`<option value="${c.id}" ${e?.currency===c.id?'selected':''}>${escapeHtml(c.id)}${c.name?' — '+escapeHtml(c.name):''}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Razón social (contraparte)</label>
    <input class="form-control" id="je-counterparty" value="${e?.counterparty?escapeHtml(e.counterparty):''}" placeholder="Cliente / proveedor (opcional)">
  </div>
  <div class="form-group">
    <label class="form-label">Libro (Contabilidad)</label>
    <select class="form-control" id="je-book">
      <option value="A" ${(!e || (e.book||'A')==='A')?'selected':''}>Contabilidad A (formal)</option>
      <option value="B" ${e && e.book==='B'?'selected':''}>Contabilidad B</option>
    </select>
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

async function saveJE(id) {
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

  // Fallback SOLO si el DOM no aportó líneas (el DOM es la fuente de verdad).
  // Antes se mergeaba deduplicando por account_code, lo que descartaba una segunda
  // línea legítima sobre la misma cuenta.
  if (!lines.length) {
    window._jeLines.filter(Boolean).forEach(l => { if (l.account_code) lines.push(l); });
  }

  if (!lines.length) { toast('Agregá al menos una línea', 'error'); return; }

  // Partida doble: el asiento DEBE balancear (Debe = Haber).
  var totalD = lines.reduce(function(s, l) { return s + (l.debit || 0); }, 0);
  var totalC = lines.reduce(function(s, l) { return s + (l.credit || 0); }, 0);
  if (Math.abs(totalD - totalC) > 0.01) {
    toast('El asiento no balancea: Debe ' + fmtMoney(totalD) + ' ≠ Haber ' + fmtMoney(totalC) +
          ' (diferencia ' + fmtMoney(Math.abs(totalD - totalC)) + ')', 'error');
    return;
  }

  // Número correlativo ATÓMICO server-side para asientos nuevos autogenerados
  // (evita que dos usuarios simultáneos saquen el mismo AS-AAAA-NNN).
  let jeNumber = document.getElementById('je-num').value;
  if (!id && window._jeAutoNum && jeNumber === window._jeAutoNum) {
    const _year = new Date().getFullYear();
    const _floor = parseInt(String(window._jeAutoNum).split('-').pop(), 10) || 1;
    const _seq = await DB.nextNumber('journal:' + _year, _floor);
    jeNumber = 'AS-' + _year + '-' + String(_seq).padStart(3, '0');
  }

  const data = {
    number: jeNumber,
    date: document.getElementById('je-date').value,
    description,
    status: document.getElementById('je-status').value,
    project_id:   (document.getElementById('je-project')  || {}).value || '',
    currency:     (document.getElementById('je-currency') || {}).value || '',
    counterparty: ((document.getElementById('je-counterparty') || {}).value || '').trim(),
    book:         (document.getElementById('je-book') || {}).value || 'A',
    lines,
  };

  if (id) {
    var _r = DB.update('journalEntries', id, data, { expectRev: DB.takeEditExpect('journalEntries', id) });
    if (_r && _r.__conflict) return;   // otro usuario lo cambió; DB avisó, reintento fuerza
    toast('Asiento actualizado', 'success');
  }
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
  const entries = _contaScopedEntries();   // exporta lo que se ve (consolidado + scope)
  const rows = [];
  entries.forEach(e => {
    e.lines.forEach(l => {
      rows.push([e.number, e.date, e.description, l.account_code, l.account_name, l.debit, l.credit, l.description]);
    });
  });
  exportXLSX('libro_diario.xlsx',
    ['Asiento','Fecha','Descripción','Cód.Cuenta','Cuenta','Débito','Crédito','Detalle'],
    rows
  );
}

// ---- SUMAS Y SALDOS ----
function renderSumasYSaldosContabilidad(accounts, entries) {
  const posted = entries.filter(e => e.status === 'posted');
  const debits = {}, credits = {};
  accounts.forEach(a => { debits[a.code] = 0; credits[a.code] = 0; });
  posted.forEach(e => e.lines.forEach(l => {
    if (!l.account_code) return;
    debits[l.account_code] = (debits[l.account_code]||0) + (l.debit||0);
    credits[l.account_code] = (credits[l.account_code]||0) + (l.credit||0);
  }));

  const totalD = Object.values(debits).reduce((s,v)=>s+v,0);
  const totalC = Object.values(credits).reduce((s,v)=>s+v,0);
  const balanced = Math.abs(totalD - totalC) < 1;
  const active = accounts.filter(a => debits[a.code] || credits[a.code]);

  return `
<div class="card">
  <div class="card-header">
    <span class="card-title"><i class="fas fa-balance-scale text-primary"></i> Balance de Comprobación — Sumas y Saldos</span>
    <div style="display:flex;gap:8px;align-items:center">
      <span class="badge ${balanced?'badge-green':'badge-red'}">${balanced?'✓ Cuadrado':'⚠ Desbalanceado'}</span>
      <button class="btn btn-sm btn-secondary" onclick="exportSumasContabilidad()"><i class="fas fa-download"></i></button>
    </div>
  </div>
  <div class="card-body" style="padding:0">
    <div class="table-wrap">
      <table><thead><tr>
        <th>Código</th><th>Cuenta</th><th>Tipo</th>
        <th class="text-right">Debe Acum.</th><th class="text-right">Haber Acum.</th>
        <th class="text-right">Saldo Deudor</th><th class="text-right">Saldo Acreedor</th>
      </tr></thead>
      <tbody>
        ${active.sort((a,b)=>a.code.localeCompare(b.code)).map(a => {
          const d = debits[a.code]||0, c = credits[a.code]||0;
          const sd = d>c?d-c:0, sc = c>d?c-d:0;
          const types = { asset:'ACTIVO', liability:'PASIVO', equity:'PATRIMONIO', revenue:'INGRESO', expense:'EGRESO' };
          const colors = { asset:'badge-blue', liability:'badge-red', equity:'badge-green', revenue:'badge-cyan', expense:'badge-yellow' };
          return `<tr>
            <td><strong>${a.code}</strong></td>
            <td style="padding-left:${(a.code.split('.').length-1)*12+4}px">${a.name}</td>
            <td><span class="badge ${colors[a.type]||'badge-gray'}">${types[a.type]||a.type}</span></td>
            <td class="number-cell text-right">${d?fmtMoney(d):'-'}</td>
            <td class="number-cell text-right">${c?fmtMoney(c):'-'}</td>
            <td class="number-cell text-right ${sd?'text-primary':''}">${sd?fmtMoney(sd):'-'}</td>
            <td class="number-cell text-right ${sc?'text-primary':''}">${sc?fmtMoney(sc):'-'}</td>
          </tr>`;
        }).join('')}
      </tbody>
      <tfoot><tr class="total-row">
        <td colspan="3"><strong>TOTALES</strong></td>
        <td class="number-cell text-right"><strong>${fmtMoney(totalD)}</strong></td>
        <td class="number-cell text-right"><strong>${fmtMoney(totalC)}</strong></td>
        <td class="number-cell text-right"><strong>${fmtMoney(active.reduce((s,a)=>{const d=debits[a.code]||0,c=credits[a.code]||0;return s+(d>c?d-c:0);},0))}</strong></td>
        <td class="number-cell text-right"><strong>${fmtMoney(active.reduce((s,a)=>{const d=debits[a.code]||0,c=credits[a.code]||0;return s+(c>d?c-d:0);},0))}</strong></td>
      </tr></tfoot>
    </table>
  </div>
</div>`;
}

function exportSumasContabilidad() {
  const accounts = _contaScopedAccounts();
  const entries = _contaScopedEntries().filter(e=>e.status==='posted');
  const debits = {}, credits = {};
  accounts.forEach(a => { debits[a.code]=0; credits[a.code]=0; });
  entries.forEach(e => e.lines.forEach(l => {
    if (!l.account_code) return;
    debits[l.account_code] = (debits[l.account_code]||0)+(l.debit||0);
    credits[l.account_code] = (credits[l.account_code]||0)+(l.credit||0);
  }));
  exportXLSX('sumas_y_saldos.xlsx',
    ['Código','Cuenta','Tipo','Debe Acum.','Haber Acum.','Saldo Deudor','Saldo Acreedor'],
    accounts.filter(a=>debits[a.code]||credits[a.code]).sort((a,b)=>a.code.localeCompare(b.code)).map(a=>{
      const d=debits[a.code]||0,c=credits[a.code]||0;
      return [a.code,a.name,a.type,d,c,d>c?d-c:0,c>d?c-d:0];
    })
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

  // Propagate leaf → root EXACTLY ONCE. Process deepest accounts first so each
  // subtotal (own postings + already-rolled-up children) is added to its parent
  // a single time. The previous 5-pass loop re-added every child on each pass,
  // multiplying parent balances ~5× and breaking the Balance General.
  var byId = {};
  accounts.forEach(function(a) { byId[a.id] = a; });
  function _acctDepth(a) {
    var d = 0, cur = a, guard = 0;
    while (cur && cur.parent_id && guard++ < 100) { cur = byId[cur.parent_id]; d++; }
    return d;
  }
  accounts.slice()
    .sort(function(a, b) { return _acctDepth(b) - _acctDepth(a); })
    .forEach(function(a) {
      if (!a.parent_id) return;
      var parent = byId[a.parent_id];
      if (parent) balances[parent.code] = (balances[parent.code] || 0) + (balances[a.code] || 0);
    });

  return balances;
}

function sumBalances(accs, balances) {
  return accs.filter(a => !a.parent_id).reduce((s,a) => s + (balances[a.code]||0), 0);
}

// ---- LIBRO MAYOR ----
function renderContaMayores() {
  if (typeof DB.ensureAllCompaniesLoaded === 'function' && !window._contaLoadedAll) {
    window._contaLoadedAll = true;
    DB.ensureAllCompaniesLoaded().then(function(ok) { if (ok) { try { renderContaMayores(); } catch(e) {} } });
  }
  const entries = _contaScopedEntries();          // consolidado + scope (proyecto/razón social)
  const accounts = _contaScopedAccounts();
  const projects = (typeof DB.getAllProjectsConsolidated === 'function') ? DB.getAllProjectsConsolidated() : DB.getAll('projects');

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Libro Mayor</div>
    <div class="page-subtitle">Movimientos agrupados por cuenta contable con saldo acumulado</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="exportMayores()"><i class="fas fa-download"></i> Exportar</button>
    <button class="btn btn-primary" onclick="openJEForm()"><i class="fas fa-plus"></i> Nuevo Asiento</button>
  </div>
</div>

${_contaScopeBar()}

<div class="filter-bar mb-2">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" id="mayor-search" placeholder="Buscar cuenta..." oninput="filterMayores()">
  </div>
  <input type="date" class="form-control" id="mayor-from" style="width:150px" placeholder="Desde" onchange="filterMayores()">
  <input type="date" class="form-control" id="mayor-to" style="width:150px" placeholder="Hasta" onchange="filterMayores()">
  <select class="form-control" id="mayor-type" style="width:170px" onchange="filterMayores()">
    <option value="">Todos los tipos</option>
    <option value="asset">Activo</option>
    <option value="liability">Pasivo</option>
    <option value="equity">Patrimonio</option>
    <option value="revenue">Ingresos</option>
    <option value="expense">Egresos</option>
  </select>
</div>

<div id="mayores-list">
  ${buildMayoresList(accounts, entries)}
</div>`;
}

function buildMayoresList(accounts, entries, filterQ, filterFrom, filterTo, filterType) {
  // Find all accounts that have movements in journal entries
  const accountsWithEntries = {};

  const postedEntries = entries.filter(e => e.status === 'posted');
  postedEntries.forEach(e => {
    e.lines.forEach(l => {
      if (!l.account_code) return;
      if (!accountsWithEntries[l.account_code]) {
        accountsWithEntries[l.account_code] = [];
      }
      accountsWithEntries[l.account_code].push({
        entry_id: e.id,
        entry_number: e.number,
        date: e.date,
        description: e.description,
        line_desc: l.description || '',
        debit: l.debit || 0,
        credit: l.credit || 0,
      });
    });
  });

  // Also include all draft entries
  entries.filter(e => e.status !== 'posted').forEach(e => {
    e.lines.forEach(l => {
      if (!l.account_code) return;
      if (!accountsWithEntries[l.account_code]) {
        accountsWithEntries[l.account_code] = [];
      }
      accountsWithEntries[l.account_code].push({
        entry_id: e.id,
        entry_number: e.number,
        date: e.date,
        description: e.description,
        line_desc: l.description || '',
        debit: l.debit || 0,
        credit: l.credit || 0,
        draft: true,
      });
    });
  });

  const typeLabels = { asset: 'ACTIVO', liability: 'PASIVO', equity: 'PATRIMONIO', revenue: 'INGRESO', expense: 'EGRESO' };
  const typeColors = { asset: 'badge-blue', liability: 'badge-red', equity: 'badge-green', revenue: 'badge-cyan', expense: 'badge-yellow' };

  // Sort account codes numerically
  const sortedCodes = Object.keys(accountsWithEntries).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (!sortedCodes.length) {
    return `<div class="empty-state"><i class="fas fa-book"></i><p>No hay asientos contables registrados</p></div>`;
  }

  let html = '';

  sortedCodes.forEach(code => {
    const acc = accounts.find(a => a.code === code);
    const accName = acc ? acc.name : code;
    const accType = acc ? acc.type : '';

    // Apply filters
    if (filterQ && !accName.toLowerCase().includes(filterQ.toLowerCase()) && !code.includes(filterQ)) return;
    if (filterType && accType !== filterType) return;

    let movements = accountsWithEntries[code].slice().sort((a, b) => a.date.localeCompare(b.date));

    if (filterFrom) movements = movements.filter(m => m.date >= filterFrom);
    if (filterTo) movements = movements.filter(m => m.date <= filterTo);

    if (!movements.length) return;

    const totalDebit = movements.reduce((s, m) => s + m.debit, 0);
    const totalCredit = movements.reduce((s, m) => s + m.credit, 0);
    const finalBalance = totalDebit - totalCredit;

    const typeLabel = typeLabels[accType] || accType;
    const typeColor = typeColors[accType] || 'badge-gray';

    let runningBalance = 0;
    const rows = movements.map(m => {
      runningBalance += m.debit - m.credit;
      const balColor = runningBalance >= 0 ? 'var(--success)' : 'var(--danger)';
      return `<tr ${m.draft ? 'style="opacity:.6"' : ''}>
        <td>${fmtDate(m.date)}</td>
        <td style="font-size:11px">${m.entry_number}${m.draft ? ' <span class="badge badge-gray" style="font-size:9px">Borrador</span>' : ''}</td>
        <td>${m.description}</td>
        <td style="color:var(--text-muted);font-size:11px">${m.line_desc}</td>
        <td class="number-cell text-right">${m.debit > 0 ? fmtMoney(m.debit) : '-'}</td>
        <td class="number-cell text-right">${m.credit > 0 ? fmtMoney(m.credit) : '-'}</td>
        <td class="number-cell text-right" style="color:${balColor};font-weight:600">${fmtMoney(runningBalance)}</td>
      </tr>`;
    }).join('');

    const finalColor = finalBalance >= 0 ? 'var(--success)' : 'var(--danger)';

    html += `
<div class="card mb-3">
  <div class="card-header" style="cursor:pointer" onclick="toggleMayorSection('mayor-${code.replace(/\./g,'_')}')">
    <div style="display:flex;align-items:center;gap:10px;flex:1">
      <span style="font-size:14px;font-weight:700;color:var(--primary)">${code}</span>
      <span style="font-size:14px;font-weight:600">${accName}</span>
      <span class="badge ${typeColor}">${typeLabel}</span>
      <span style="flex:1"></span>
      <span style="font-size:12px;color:var(--text-muted);margin-right:8px">${movements.length} movimientos</span>
      <span class="badge badge-blue" title="Total Debe">${fmtMoney(totalDebit)}</span>
      <span class="badge badge-yellow" title="Total Haber">${fmtMoney(totalCredit)}</span>
      <span class="badge" style="background:${finalBalance >= 0 ? 'var(--success)' : 'var(--danger)'};color:#fff" title="Saldo Final">${fmtMoney(Math.abs(finalBalance))} ${finalBalance >= 0 ? 'D' : 'H'}</span>
    </div>
    <i class="fas fa-chevron-down" id="mayor-icon-${code.replace(/\./g,'_')}" style="font-size:12px;color:var(--text-muted);transition:transform .2s"></i>
  </div>
  <div id="mayor-${code.replace(/\./g,'_')}" style="display:none">
    <div class="card-body" style="padding:0">
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Fecha</th><th>Asiento</th><th>Descripcion</th><th>Detalle</th>
            <th class="text-right">Debe</th><th class="text-right">Haber</th><th class="text-right">Saldo</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="4" class="text-right"><strong>Totales</strong></td>
              <td class="number-cell text-right"><strong>${fmtMoney(totalDebit)}</strong></td>
              <td class="number-cell text-right"><strong>${fmtMoney(totalCredit)}</strong></td>
              <td class="number-cell text-right" style="color:${finalColor};font-weight:700">${fmtMoney(finalBalance)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</div>`;
  });

  return html || `<div class="empty-state"><i class="fas fa-filter"></i><p>Sin resultados con los filtros aplicados</p></div>`;
}

function toggleMayorSection(id) {
  const panel = document.getElementById(id);
  const code = id.replace('mayor-', '').replace(/_/g, '.');
  const icon = document.getElementById('mayor-icon-' + id.replace('mayor-', ''));
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : '';
  if (icon) icon.style.transform = isOpen ? '' : 'rotate(180deg)';
}

function filterMayores() {
  const q = (document.getElementById('mayor-search') || {}).value || '';
  const from = (document.getElementById('mayor-from') || {}).value || '';
  const to = (document.getElementById('mayor-to') || {}).value || '';
  const type = (document.getElementById('mayor-type') || {}).value || '';
  const entries = _contaScopedEntries();
  const accounts = _contaScopedAccounts();
  const list = document.getElementById('mayores-list');
  if (list) list.innerHTML = buildMayoresList(accounts, entries, q, from, to, type);
}

function exportMayores() {
  const entries = _contaScopedEntries();
  const accounts = _contaScopedAccounts();
  const rows = [];

  entries.filter(e => e.status === 'posted').forEach(e => {
    e.lines.forEach(l => {
      if (!l.account_code) return;
      const acc = accounts.find(a => a.code === l.account_code);
      rows.push([
        l.account_code,
        acc ? acc.name : l.account_code,
        e.number,
        e.date,
        e.description,
        l.description || '',
        l.debit || 0,
        l.credit || 0,
      ]);
    });
  });

  rows.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }) || a[3].localeCompare(b[3]));

  exportXLSX('libro_mayor.xlsx',
    ['Codigo', 'Cuenta', 'Asiento', 'Fecha', 'Descripcion', 'Detalle', 'Debe', 'Haber'],
    rows
  );
}

// ---- IMPORT PLAN DE CUENTAS GRUPO HA ----
function importHAPlanCuentas() {
  confirmDialog(
    'Esto reemplazará el plan de cuentas actual con las 392 cuentas del Grupo HA. ¿Continuar?',
    function() {
      var now_ts = new Date().toISOString();
      var accounts = [
  {id:'acc-1',code:'1',name:'ACTIVO',type:'asset',parent_id:null,active:true},
  {id:'acc-1-1',code:'1.1',name:'ACTIVO CORRIENTE',type:'asset',parent_id:'acc-1',active:true},
  {id:'acc-1-1-1',code:'1.1.1',name:'Disponibilidades',type:'asset',parent_id:'acc-1-1',active:true},
  {id:'acc-1-1-1-1',code:'1.1.1.1',name:'Cajas',type:'asset',parent_id:'acc-1-1-1',active:true},
  {id:'acc-1-1-1-1-1',code:'1.1.1.1.1',name:'Caja - Libertador 2 ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-2',code:'1.1.1.1.2',name:'Caja - Riverside House SA USD',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-3',code:'1.1.1.1.3',name:'Caja - Nuevo Beccar Central ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-4',code:'1.1.1.1.4',name:'Caja - Libertador 2 USD',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-6',code:'1.1.1.1.6',name:'Caja - Sense Manantiales ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-7',code:'1.1.1.1.7',name:'Caja - Grand Atlantida ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-9',code:'1.1.1.1.9',name:'Caja - Grand Atlantida USD',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-10',code:'1.1.1.1.10',name:'Caja - HA Emprendimientos ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-11',code:'1.1.1.1.11',name:'Caja - HA Emprendimientos USD',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-12',code:'1.1.1.1.12',name:'Caja - Fondo compensador HA ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-13',code:'1.1.1.1.13',name:'Caja - HA Projects LLC ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-15',code:'1.1.1.1.15',name:'Caja - Fondo compensador HA USD',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-21',code:'1.1.1.1.21',name:'Caja - Riverside House SA ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-23',code:'1.1.1.1.23',name:'Caja - SENSE 22 ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-27',code:'1.1.1.1.27',name:'Caja importacion de datos ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-28',code:'1.1.1.1.28',name:'Caja importacion de datos USD',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-29',code:'1.1.1.1.29',name:'Caja - HA SAS ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-30',code:'1.1.1.1.30',name:'Caja - HA SAS USD',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-31',code:'1.1.1.1.31',name:'Caja - Concreto Moldeado ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-33',code:'1.1.1.1.33',name:'Caja - Radian Capital S.A. ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-34',code:'1.1.1.1.34',name:'Caja - Radian Capital S.A. USD',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-37',code:'1.1.1.1.37',name:'Caja - Sense Olivos ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-38',code:'1.1.1.1.38',name:'Caja - Sense Olivos USD',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-39',code:'1.1.1.1.39',name:'Caja - Barbarita ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-1-41',code:'1.1.1.1.41',name:'Caja - Sense La Barra ARS',type:'asset',parent_id:'acc-1-1-1-1',active:true},
  {id:'acc-1-1-1-2',code:'1.1.1.2',name:'Bancos Nacionales',type:'asset',parent_id:'acc-1-1-1',active:true},
  {id:'acc-1-1-1-2-2',code:'1.1.1.2.2',name:'Galicia $ - Fiduciaria Central SA',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-3',code:'1.1.1.2.3',name:'Cheque Galicia $ - Fiduciaria Central SA',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-4',code:'1.1.1.2.4',name:'Galicia $ - Fideicomiso Edificio Atlantida',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-5',code:'1.1.1.2.5',name:'Cheque Galicia $ - Fideicomiso Edificio Atlantida',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-6',code:'1.1.1.2.6',name:'Galicia U$S - Fideicomiso Edificio Atlantida',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-7',code:'1.1.1.2.7',name:'Galicia $ - Concreto Moldeado',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-9',code:'1.1.1.2.9',name:'Galicia $ - BBS Emprendimientos',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-10',code:'1.1.1.2.10',name:'Cheque Galicia $ - Concreto Moldeado',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-12',code:'1.1.1.2.12',name:'Galicia U$S - Concreto Moleado',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-13',code:'1.1.1.2.13',name:'Galicia U$S - BBS Emprendimientos SA',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-16',code:'1.1.1.2.16',name:'Galicia Golf $ - Riverside House SA',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-18',code:'1.1.1.2.18',name:'Galicia U$S - Fiduciaria Central SA',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-21',code:'1.1.1.2.21',name:'Galicia Laguna $ - Riverside House SA',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-22',code:'1.1.1.2.22',name:'Cheque Galicia Laguna $ - Riverside House SA',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-23',code:'1.1.1.2.23',name:'Galicia Laguna U$S - Riverside House SA',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-25',code:'1.1.1.2.25',name:'Galicia Mas $ - HA Emprendimientos S.R.L.',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-27',code:'1.1.1.2.27',name:'Galicia Mas $ - Fiduciaria Central SA',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-29',code:'1.1.1.2.29',name:'Galicia U$S - HA Emprendimientos S.R.L.',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-31',code:'1.1.1.2.31',name:'Galicia $ - HA Emprendimientos S.R.L.',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-32',code:'1.1.1.2.32',name:'Cheque Galicia $ - HA Emprendimientos S.R.L.',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-35',code:'1.1.1.2.35',name:'Galicia $ - Fideicomiso del Bajo',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-41',code:'1.1.1.2.41',name:'Credicoop $ - Concreto Moldeado SA',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-43',code:'1.1.1.2.43',name:'Mercadopago - Concreto Moldeado',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-45',code:'1.1.1.2.45',name:'VISA HA 4937-0200-0240-3101',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-46',code:'1.1.1.2.46',name:'VISA RS 4937-0200-0420-1644',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-47',code:'1.1.1.2.47',name:'Galicia $ - Riox SA',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-49',code:'1.1.1.2.49',name:'BBVA $ - Fiduciaria Central SA - Consorcio NBC',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-2-51',code:'1.1.1.2.51',name:'BBVA $ - Fiduciaria Central SA - Consorcio LIB',type:'asset',parent_id:'acc-1-1-1-2',active:true},
  {id:'acc-1-1-1-3',code:'1.1.1.3',name:'Bancos Extranjeros',type:'asset',parent_id:'acc-1-1-1',active:true},
  {id:'acc-1-1-1-3-7',code:'1.1.1.3.7',name:'CITI BANK - New Sense LLC',type:'asset',parent_id:'acc-1-1-1-3',active:true},
  {id:'acc-1-1-1-3-12',code:'1.1.1.3.12',name:'CITI BANK - HA Projects LLC',type:'asset',parent_id:'acc-1-1-1-3',active:true},
  {id:'acc-1-1-1-5',code:'1.1.1.5',name:'Otros valores',type:'asset',parent_id:'acc-1-1-1',active:true},
  {id:'acc-1-1-1-5-1',code:'1.1.1.5.1',name:'Valores a depositar',type:'asset',parent_id:'acc-1-1-1-5',active:true},
  {id:'acc-1-1-1-7',code:'1.1.1.7',name:'Deudores varios',type:'asset',parent_id:'acc-1-1-1',active:true},
  {id:'acc-1-1-1-7-1',code:'1.1.1.7.1',name:'Deudores por ventas',type:'asset',parent_id:'acc-1-1-1-7',active:true},
  {id:'acc-1-1-2',code:'1.1.2',name:'Inversiones Corrientes',type:'asset',parent_id:'acc-1-1',active:true},
  {id:'acc-1-1-2-4',code:'1.1.2.4',name:'Fondos de Inversion (FIMA)',type:'asset',parent_id:'acc-1-1-2',active:true},
  {id:'acc-1-1-2-4-1',code:'1.1.2.4.1',name:'FIMA - Galicia Fiduciaria Central',type:'asset',parent_id:'acc-1-1-2-4',active:true},
  {id:'acc-1-1-2-4-2',code:'1.1.2.4.2',name:'FIMA - Galicia Laguna Riverside $',type:'asset',parent_id:'acc-1-1-2-4',active:true},
  {id:'acc-1-1-2-4-3',code:'1.1.2.4.3',name:'FIMA - Galicia HA $',type:'asset',parent_id:'acc-1-1-2-4',active:true},
  {id:'acc-1-1-2-4-4',code:'1.1.2.4.4',name:'FIMA - Galicia FEA $',type:'asset',parent_id:'acc-1-1-2-4',active:true},
  {id:'acc-1-1-2-4-6',code:'1.1.2.4.6',name:'FIMA - Galicia CM $',type:'asset',parent_id:'acc-1-1-2-4',active:true},
  {id:'acc-1-1-2-5',code:'1.1.2.5',name:'Inversiones Financieras',type:'asset',parent_id:'acc-1-1-2',active:true},
  {id:'acc-1-1-2-5-1',code:'1.1.2.5.1',name:'Aldazabal & Cia',type:'asset',parent_id:'acc-1-1-2-5',active:true},
  {id:'acc-1-1-2-5-1-1',code:'1.1.2.5.1.1',name:'Aldazabal & Cia - Fiduciaria Central',type:'asset',parent_id:'acc-1-1-2-5-1',active:true},
  {id:'acc-1-1-2-5-1-2',code:'1.1.2.5.1.2',name:'Aldazabal & Cia - Fideicomiso Edificio Atlantida',type:'asset',parent_id:'acc-1-1-2-5-1',active:true},
  {id:'acc-1-1-2-5-1-3',code:'1.1.2.5.1.3',name:'Aldazabal & cia $ - Riverside House SA',type:'asset',parent_id:'acc-1-1-2-5-1',active:true},
  {id:'acc-1-1-2-5-1-4',code:'1.1.2.5.1.4',name:'Aldazabal & cia $ - HA Emprendimientos SRL',type:'asset',parent_id:'acc-1-1-2-5-1',active:true},
  {id:'acc-1-1-2-5-1-5',code:'1.1.2.5.1.5',name:'Aldazabal & cia $ - Concreto Moldeado SA',type:'asset',parent_id:'acc-1-1-2-5-1',active:true},
  {id:'acc-1-1-2-5-1-6',code:'1.1.2.5.1.6',name:'Aldazabal & cia $ - Fideicomiso del Bajo',type:'asset',parent_id:'acc-1-1-2-5-1',active:true},
  {id:'acc-1-1-2-8',code:'1.1.2.8',name:'Inversiones - Bonos',type:'asset',parent_id:'acc-1-1-2',active:true},
  {id:'acc-1-1-2-9',code:'1.1.2.9',name:'Aportes al fideicomiso Beccar Central II',type:'asset',parent_id:'acc-1-1-2',active:true},
  {id:'acc-1-1-2-10',code:'1.1.2.10',name:'Inversiones RIOX SA',type:'asset',parent_id:'acc-1-1-2',active:true},
  {id:'acc-1-1-3',code:'1.1.3',name:'Anticipos Entregados',type:'asset',parent_id:'acc-1-1',active:true},
  {id:'acc-1-1-3-1',code:'1.1.3.1',name:'Anticipo a proveedores',type:'asset',parent_id:'acc-1-1-3',active:true},
  {id:'acc-1-1-4',code:'1.1.4',name:'Creditos Fiscales',type:'asset',parent_id:'acc-1-1',active:true},
  {id:'acc-1-1-4-1',code:'1.1.4.1',name:'IVA',type:'asset',parent_id:'acc-1-1-4',active:true},
  {id:'acc-1-1-4-1-1',code:'1.1.4.1.1',name:'IVA Credito Fiscal',type:'asset',parent_id:'acc-1-1-4-1',active:true},
  {id:'acc-1-1-4-1-1-1',code:'1.1.4.1.1.1',name:'IVA Tasa General 21%',type:'asset',parent_id:'acc-1-1-4-1-1',active:true},
  {id:'acc-1-1-4-1-1-2',code:'1.1.4.1.1.2',name:'IVA Tasa 10,5%',type:'asset',parent_id:'acc-1-1-4-1-1',active:true},
  {id:'acc-1-1-4-1-1-3',code:'1.1.4.1.1.3',name:'IVA Servicios 27%',type:'asset',parent_id:'acc-1-1-4-1-1',active:true},
  {id:'acc-1-1-4-1-1-4',code:'1.1.4.1.1.4',name:'Percepcion IVA',type:'asset',parent_id:'acc-1-1-4-1-1',active:true},
  {id:'acc-1-1-4-1-1-5',code:'1.1.4.1.1.5',name:'IVA saldo tecnico a favor',type:'asset',parent_id:'acc-1-1-4-1-1',active:true},
  {id:'acc-1-1-4-1-1-6',code:'1.1.4.1.1.6',name:'IVA saldo de libre disponibilidad',type:'asset',parent_id:'acc-1-1-4-1-1',active:true},
  {id:'acc-1-1-4-2',code:'1.1.4.2',name:'Ingresos Brutos',type:'asset',parent_id:'acc-1-1-4',active:true},
  {id:'acc-1-1-4-2-1',code:'1.1.4.2.1',name:'IIBB CABA a favor',type:'asset',parent_id:'acc-1-1-4-2',active:true},
  {id:'acc-1-1-4-2-3',code:'1.1.4.2.3',name:'SIRCREB CABA',type:'asset',parent_id:'acc-1-1-4-2',active:true},
  {id:'acc-1-1-4-2-4',code:'1.1.4.2.4',name:'SIRCREB BS AS',type:'asset',parent_id:'acc-1-1-4-2',active:true},
  {id:'acc-1-1-4-2-5',code:'1.1.4.2.5',name:'Ret. y Perc. IIBB CABA',type:'asset',parent_id:'acc-1-1-4-2',active:true},
  {id:'acc-1-1-4-2-6',code:'1.1.4.2.6',name:'Ret. y Perc. IIBB BS AS',type:'asset',parent_id:'acc-1-1-4-2',active:true},
  {id:'acc-1-1-4-3',code:'1.1.4.3',name:'Otros Impuestos',type:'asset',parent_id:'acc-1-1-4',active:true},
  {id:'acc-1-1-4-3-1',code:'1.1.4.3.1',name:'Ley 25.413 Impuesto al credito bancario computable',type:'asset',parent_id:'acc-1-1-4-3',active:true},
  {id:'acc-1-1-4-3-3',code:'1.1.4.3.3',name:'No Gravado',type:'asset',parent_id:'acc-1-1-4-3',active:true},
  {id:'acc-1-1-4-3-4',code:'1.1.4.3.4',name:'Retenciones a cobrar',type:'asset',parent_id:'acc-1-1-4-3',active:true},
  {id:'acc-1-1-4-4',code:'1.1.4.4',name:'Impuesto a las Ganancias',type:'asset',parent_id:'acc-1-1-4',active:true},
  {id:'acc-1-1-4-4-1',code:'1.1.4.4.1',name:'Retenciones impuesto a las ganancias',type:'asset',parent_id:'acc-1-1-4-4',active:true},
  {id:'acc-1-1-4-4-2',code:'1.1.4.4.2',name:'Anticipos impuesto a las ganancias',type:'asset',parent_id:'acc-1-1-4-4',active:true},
  {id:'acc-1-1-5',code:'1.1.5',name:'Otras Cuentas del Activo Corriente',type:'asset',parent_id:'acc-1-1',active:true},
  {id:'acc-1-1-5-1',code:'1.1.5.1',name:'Fondos Fijos y Cuentas Particulares',type:'asset',parent_id:'acc-1-1-5',active:true},
  {id:'acc-1-1-5-1-1',code:'1.1.5.1.1',name:'Fondo fijo Agustin Cinalli $',type:'asset',parent_id:'acc-1-1-5-1',active:true},
  {id:'acc-1-1-5-1-2',code:'1.1.5.1.2',name:'Fondo fijo Gabriel Ruiz Diaz $',type:'asset',parent_id:'acc-1-1-5-1',active:true},
  {id:'acc-1-1-5-1-3',code:'1.1.5.1.3',name:'Fondo fijo Jorge Vilca $',type:'asset',parent_id:'acc-1-1-5-1',active:true},
  {id:'acc-1-1-5-1-5',code:'1.1.5.1.5',name:'Fondo fijo Marcelo Fontana $',type:'asset',parent_id:'acc-1-1-5-1',active:true},
  {id:'acc-1-1-5-1-8',code:'1.1.5.1.8',name:'Fondo fijo Omar Debloc $',type:'asset',parent_id:'acc-1-1-5-1',active:true},
  {id:'acc-1-1-5-1-9',code:'1.1.5.1.9',name:'Fondo fijo Bernardo Dopazo $',type:'asset',parent_id:'acc-1-1-5-1',active:true},
  {id:'acc-1-1-5-1-11',code:'1.1.5.1.11',name:'Fondo fijo Ronit Gorosstiaga $',type:'asset',parent_id:'acc-1-1-5-1',active:true},
  {id:'acc-1-1-5-1-12',code:'1.1.5.1.12',name:'Fondo fijo Arturo Yarati $',type:'asset',parent_id:'acc-1-1-5-1',active:true},
  {id:'acc-1-1-5-1-13',code:'1.1.5.1.13',name:'Fondo fijo Sergio Araoz $',type:'asset',parent_id:'acc-1-1-5-1',active:true},
  {id:'acc-1-1-5-1-17',code:'1.1.5.1.17',name:'Fondo fijo Eduardo Sampaolesi $',type:'asset',parent_id:'acc-1-1-5-1',active:true},
  {id:'acc-1-1-5-1-20',code:'1.1.5.1.20',name:'ACT - Cuentas particulares Palito',type:'asset',parent_id:'acc-1-1-5-1',active:true},
  {id:'acc-1-1-5-1-22',code:'1.1.5.1.22',name:'Fondo fijo Aldana Belen Rossi $',type:'asset',parent_id:'acc-1-1-5-1',active:true},
  {id:'acc-1-1-5-1-23',code:'1.1.5.1.23',name:'Fondo Fijo Dario Post Vta $',type:'asset',parent_id:'acc-1-1-5-1',active:true},
  {id:'acc-1-1-5-1-24',code:'1.1.5.1.24',name:'ACT - Cuentas particulares Sebastian Del Campo',type:'asset',parent_id:'acc-1-1-5-1',active:true},
  {id:'acc-1-1-5-1-25',code:'1.1.5.1.25',name:'Fondo Fijo Comercial',type:'asset',parent_id:'acc-1-1-5-1',active:true},
  {id:'acc-1-1-5-1-26',code:'1.1.5.1.26',name:'Cuenta Particular - Condal S.A.',type:'asset',parent_id:'acc-1-1-5-1',active:true},
  {id:'acc-1-1-5-2',code:'1.1.5.2',name:'Cuentas Particulares Intercompany',type:'asset',parent_id:'acc-1-1-5',active:true},
  {id:'acc-1-1-5-2-1',code:'1.1.5.2.1',name:'Cta Particular - Fiduciaria Central',type:'asset',parent_id:'acc-1-1-5-2',active:true},
  {id:'acc-1-1-5-2-3',code:'1.1.5.2.3',name:'Cta Particular - Flia Hardoy',type:'asset',parent_id:'acc-1-1-5-2',active:true},
  {id:'acc-1-1-5-2-4',code:'1.1.5.2.4',name:'Cta Particular - Fideicomiso Edificio Atlantida',type:'asset',parent_id:'acc-1-1-5-2',active:true},
  {id:'acc-1-1-5-2-7',code:'1.1.5.2.7',name:'Cta Particular - HA Emprendimientos SRL',type:'asset',parent_id:'acc-1-1-5-2',active:true},
  {id:'acc-1-1-5-2-8',code:'1.1.5.2.8',name:'Cta particular - New Sense LLC',type:'asset',parent_id:'acc-1-1-5-2',active:true},
  {id:'acc-1-1-5-2-9',code:'1.1.5.2.9',name:'Cta particular - Riverside House SA',type:'asset',parent_id:'acc-1-1-5-2',active:true},
  {id:'acc-1-1-5-2-10',code:'1.1.5.2.10',name:'Cta particular - HA Projects LLC',type:'asset',parent_id:'acc-1-1-5-2',active:true},
  {id:'acc-1-1-5-2-12',code:'1.1.5.2.12',name:'Cta particular - Concreto Moldeado SA',type:'asset',parent_id:'acc-1-1-5-2',active:true},
  {id:'acc-1-1-5-2-14',code:'1.1.5.2.14',name:'Cta particular - Radian Consulting LLC',type:'asset',parent_id:'acc-1-1-5-2',active:true},
  {id:'acc-1-1-5-2-16',code:'1.1.5.2.16',name:'Cta particular - Radian Capital SA',type:'asset',parent_id:'acc-1-1-5-2',active:true},
  {id:'acc-1-1-5-2-18',code:'1.1.5.2.18',name:'Cta particular - Fideicomiso Beccar Central II',type:'asset',parent_id:'acc-1-1-5-2',active:true},
  {id:'acc-1-1-5-2-19',code:'1.1.5.2.19',name:'Cta particular - Fideicomiso VM 58733/2017',type:'asset',parent_id:'acc-1-1-5-2',active:true},
  {id:'acc-1-1-5-2-20',code:'1.1.5.2.20',name:'Cta Particular - Ignacio Aldazabal',type:'asset',parent_id:'acc-1-1-5-2',active:true},
  {id:'acc-1-1-5-2-21',code:'1.1.5.2.21',name:'Cta particular - HA SAS',type:'asset',parent_id:'acc-1-1-5-2',active:true},
  {id:'acc-1-1-5-2-23',code:'1.1.5.2.23',name:'Cta particular - RIOX S.A.',type:'asset',parent_id:'acc-1-1-5-2',active:true},
  {id:'acc-1-1-5-3',code:'1.1.5.3',name:'Creditos Financieros Internos',type:'asset',parent_id:'acc-1-1-5',active:true},
  {id:'acc-1-1-5-3-3',code:'1.1.5.3.3',name:'Cred. Fin. Int. - Riox',type:'asset',parent_id:'acc-1-1-5-3',active:true},
  {id:'acc-1-1-5-3-4',code:'1.1.5.3.4',name:'Cred. Fin. Int. - Fiduciaria Central',type:'asset',parent_id:'acc-1-1-5-3',active:true},
  {id:'acc-1-1-5-3-7',code:'1.1.5.3.7',name:'Cred. Fin. Int. - Fideicomiso Edificio Atlantida',type:'asset',parent_id:'acc-1-1-5-3',active:true},
  {id:'acc-1-1-5-3-9',code:'1.1.5.3.9',name:'Cred. Fin. Int. - Edgewater 28 LLC',type:'asset',parent_id:'acc-1-1-5-3',active:true},
  {id:'acc-1-1-5-3-13',code:'1.1.5.3.13',name:'Cred. Fin. Int - CM',type:'asset',parent_id:'acc-1-1-5-3',active:true},
  {id:'acc-1-1-5-5',code:'1.1.5.5',name:'Cuentas Particulares IC',type:'asset',parent_id:'acc-1-1-5',active:true},
  {id:'acc-1-1-5-5-1',code:'1.1.5.5.1',name:'Cta Particular IC - BBS',type:'asset',parent_id:'acc-1-1-5-5',active:true},
  {id:'acc-1-1-5-5-2',code:'1.1.5.5.2',name:'Cta Particular IC - HA',type:'asset',parent_id:'acc-1-1-5-5',active:true},
  {id:'acc-1-1-5-5-3',code:'1.1.5.5.3',name:'Cta Particular IC - FC',type:'asset',parent_id:'acc-1-1-5-5',active:true},
  {id:'acc-1-1-5-5-4',code:'1.1.5.5.4',name:'Cta Particular IC - FEA',type:'asset',parent_id:'acc-1-1-5-5',active:true},
  {id:'acc-1-1-5-6',code:'1.1.5.6',name:'Vales a Rendir',type:'asset',parent_id:'acc-1-1-5',active:true},
  {id:'acc-1-1-5-6-8',code:'1.1.5.6.8',name:'Vales a rendir - Sebastian Del Campo',type:'asset',parent_id:'acc-1-1-5-6',active:true},
  {id:'acc-1-2',code:'1.2',name:'ACTIVO NO CORRIENTE',type:'asset',parent_id:'acc-1',active:true},
  {id:'acc-1-2-1',code:'1.2.1',name:'Bienes de Cambio y Uso',type:'asset',parent_id:'acc-1-2',active:true},
  {id:'acc-1-2-1-1',code:'1.2.1.1',name:'Terrenos',type:'asset',parent_id:'acc-1-2-1',active:true},
  {id:'acc-1-2-1-1-1',code:'1.2.1.1.1',name:'ACT - Terreno',type:'asset',parent_id:'acc-1-2-1-1',active:true},
  {id:'acc-1-2-1-2',code:'1.2.1.2',name:'Bienes en Construccion',type:'asset',parent_id:'acc-1-2-1',active:true},
  {id:'acc-1-2-1-2-1',code:'1.2.1.2.1',name:'Obra - Libertador 2',type:'asset',parent_id:'acc-1-2-1-2',active:true},
  {id:'acc-1-2-1-2-1-37',code:'1.2.1.2.1.37',name:'ESTRUCTURA RESISTENTE DE HORMIGON',type:'asset',parent_id:'acc-1-2-1-2-1',active:true},
  {id:'acc-1-2-1-2-1-41',code:'1.2.1.2.1.41',name:'CONTRAPISOS Y CARPETAS',type:'asset',parent_id:'acc-1-2-1-2-1',active:true},
  {id:'acc-1-2-1-2-1-50',code:'1.2.1.2.1.50',name:'Mano de obra directa',type:'asset',parent_id:'acc-1-2-1-2-1',active:true},
  {id:'acc-1-2-1-2-1-55',code:'1.2.1.2.1.55',name:'Mano de obra Bienes de cambio',type:'asset',parent_id:'acc-1-2-1-2-1',active:true},
  {id:'acc-1-2-1-2-1-60',code:'1.2.1.2.1.60',name:'DIVISIONS - MAMPOSTERIA',type:'asset',parent_id:'acc-1-2-1-2-1',active:true},
  {id:'acc-1-2-1-2-2',code:'1.2.1.2.2',name:'Obra - Beccar Central',type:'asset',parent_id:'acc-1-2-1-2',active:true},
  {id:'acc-1-2-1-2-2-14',code:'1.2.1.2.2.14',name:'INSTALACIONES SANITARIAS',type:'asset',parent_id:'acc-1-2-1-2-2',active:true},
  {id:'acc-1-2-1-2-2-16',code:'1.2.1.2.2.16',name:'ARTEFACTOS (solo material)',type:'asset',parent_id:'acc-1-2-1-2-2',active:true},
  {id:'acc-1-2-1-2-2-33',code:'1.2.1.2.2.33',name:'LIMP/SEG/VIG Obra - Ayuda de gremios',type:'asset',parent_id:'acc-1-2-1-2-2',active:true},
  {id:'acc-1-2-1-2-2-51',code:'1.2.1.2.2.51',name:'Materiales por canje',type:'asset',parent_id:'acc-1-2-1-2-2',active:true},
  {id:'acc-1-2-1-2-2-52',code:'1.2.1.2.2.52',name:'Materiales Bienes de cambio',type:'asset',parent_id:'acc-1-2-1-2-2',active:true},
  {id:'acc-1-2-1-2-2-53',code:'1.2.1.2.2.53',name:'EQUIPAMIENTO',type:'asset',parent_id:'acc-1-2-1-2-2',active:true},
  {id:'acc-1-2-1-2-2-54',code:'1.2.1.2.2.54',name:'DIVISIONS - REQUISITOS GENERALES',type:'asset',parent_id:'acc-1-2-1-2-2',active:true},
  {id:'acc-1-2-1-2-2-57',code:'1.2.1.2.2.57',name:'DIVISIONS - MAMPOSTERIA',type:'asset',parent_id:'acc-1-2-1-2-2',active:true},
  {id:'acc-1-2-1-2-2-58',code:'1.2.1.2.2.58',name:'DIVISIONS - METALES',type:'asset',parent_id:'acc-1-2-1-2-2',active:true},
  {id:'acc-1-2-1-2-2-61',code:'1.2.1.2.2.61',name:'DIVISIONS - ABERTURAS',type:'asset',parent_id:'acc-1-2-1-2-2',active:true},
  {id:'acc-1-2-1-2-2-62',code:'1.2.1.2.2.62',name:'DIVISIONS - TERMINACIONES',type:'asset',parent_id:'acc-1-2-1-2-2',active:true},
  {id:'acc-1-2-1-2-2-69',code:'1.2.1.2.2.69',name:'DIVISIONS - PLOMERIA',type:'asset',parent_id:'acc-1-2-1-2-2',active:true},
  {id:'acc-1-2-1-2-2-72',code:'1.2.1.2.2.72',name:'DIVISIONS - ELECTRICIDAD',type:'asset',parent_id:'acc-1-2-1-2-2',active:true},
  {id:'acc-1-2-1-2-4',code:'1.2.1.2.4',name:'Obra - Grand Atlantida',type:'asset',parent_id:'acc-1-2-1-2',active:true},
  {id:'acc-1-2-1-2-4-1',code:'1.2.1.2.4.1',name:'TRABAJOS PRELIMINARES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-2',code:'1.2.1.2.4.2',name:'JARDINERIA Y PARQUIZACION',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-3',code:'1.2.1.2.4.3',name:'PARRILLAS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-4',code:'1.2.1.2.4.4',name:'PILETA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-5',code:'1.2.1.2.4.5',name:'HERRERIA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-6',code:'1.2.1.2.4.6',name:'HERRERIA DE OBRA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-7',code:'1.2.1.2.4.7',name:'PUERTAS MADERA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-8',code:'1.2.1.2.4.8',name:'PUERTAS METALICAS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-9',code:'1.2.1.2.4.9',name:'CARPINTERIAS PVC/ALUMINIO',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-10',code:'1.2.1.2.4.10',name:'INSTALACIONES SANITARIAS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-11',code:'1.2.1.2.4.11',name:'DEMOLICION',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-12',code:'1.2.1.2.4.12',name:'FACHADA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-13',code:'1.2.1.2.4.13',name:'BOMBAS Y TANQUES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-14',code:'1.2.1.2.4.14',name:'INSTALACION DE GAS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-15',code:'1.2.1.2.4.15',name:'INSTALACION CONTRA INCENDIO',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-16',code:'1.2.1.2.4.16',name:'INSTALACION ELECTRICA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-18',code:'1.2.1.2.4.18',name:'CONDUCTOS Y VENTILACIONES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-20',code:'1.2.1.2.4.20',name:'MARMOL Y GRANITOS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-21',code:'1.2.1.2.4.21',name:'ELEMENTOS DE MADERA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-22',code:'1.2.1.2.4.22',name:'PINTURA INTERIOR',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-23',code:'1.2.1.2.4.23',name:'PAVIMENTOS EXTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-24',code:'1.2.1.2.4.24',name:'PINTURA EXTERIOR',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-25',code:'1.2.1.2.4.25',name:'MOVIMIENTO DE SUELO',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-26',code:'1.2.1.2.4.26',name:'ASCENSORES Y ELEVADORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-27',code:'1.2.1.2.4.27',name:'LIMP/SEG/VIG Obra - Ayuda de gremios',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-28',code:'1.2.1.2.4.28',name:'TRASLADOS Y FLETES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-29',code:'1.2.1.2.4.29',name:'ENCOFRADOS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-30',code:'1.2.1.2.4.30',name:'EQUIPOS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-31',code:'1.2.1.2.4.31',name:'ESTRUCTURA RESISTENTE DE HORMIGON',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-33',code:'1.2.1.2.4.33',name:'MUROS Y TABIQUES EXTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-34',code:'1.2.1.2.4.34',name:'PISOS EXTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-35',code:'1.2.1.2.4.35',name:'MUROS Y TABIQUES INTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-36',code:'1.2.1.2.4.36',name:'CONTRAPISOS Y CARPETAS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-37',code:'1.2.1.2.4.37',name:'AISLACIONES ACUSTICAS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-38',code:'1.2.1.2.4.38',name:'AISLACIONES HIDROFUGA EN EXTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-39',code:'1.2.1.2.4.39',name:'AISLACIONES HIDROFUGA EN INTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-40',code:'1.2.1.2.4.40',name:'AISLACIONES HIDROFUGA EN SUBSUELO',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-41',code:'1.2.1.2.4.41',name:'AISLACIONES TANQUES Y PILETA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-42',code:'1.2.1.2.4.42',name:'AISLACIONES TERMICAS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-43',code:'1.2.1.2.4.43',name:'REVOQUES EXTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-44',code:'1.2.1.2.4.44',name:'REVOQUES INTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-45',code:'1.2.1.2.4.45',name:'PISOS INTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-46',code:'1.2.1.2.4.46',name:'VIATICOS Y GESTION DE OBRA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-49',code:'1.2.1.2.4.49',name:'SUELDOS Y CS. SOCIALES DE OBRA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-50',code:'1.2.1.2.4.50',name:'REVESTIMIENTOS ESPECIALES EN PIEZAS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-51',code:'1.2.1.2.4.51',name:'REVESTIMIENTOS ESTANDAR PISO Y PARED DE CERAMICO O PORCELLANATO',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-53',code:'1.2.1.2.4.53',name:'CIELORRASO',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-55',code:'1.2.1.2.4.55',name:'DIVISIONS - REQUISITOS GENERALES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-58',code:'1.2.1.2.4.58',name:'DIVISIONS - MAMPOSTERIA',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-59',code:'1.2.1.2.4.59',name:'DIVISIONS - METALES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-62',code:'1.2.1.2.4.62',name:'DIVISIONS - ABERTURAS',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-63',code:'1.2.1.2.4.63',name:'DIVISIONS - TERMINACIONES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-73',code:'1.2.1.2.4.73',name:'DIVISIONS - ELECTRICIDAD',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-4-77',code:'1.2.1.2.4.77',name:'DIVISIONS - OBRAS EXTERIORES',type:'asset',parent_id:'acc-1-2-1-2-4',active:true},
  {id:'acc-1-2-1-2-13',code:'1.2.1.2.13',name:'Gastos y Comisiones Bancarias',type:'asset',parent_id:'acc-1-2-1-2',active:true},
  {id:'acc-1-2-1-4',code:'1.2.1.4',name:'Inmuebles',type:'asset',parent_id:'acc-1-2-1',active:true},
  {id:'acc-1-2-1-4-1',code:'1.2.1.4.1',name:'Inmueble',type:'asset',parent_id:'acc-1-2-1-4',active:true},
  {id:'acc-1-2-2',code:'1.2.2',name:'Bienes de Uso',type:'asset',parent_id:'acc-1-2',active:true},
  {id:'acc-1-2-2-1',code:'1.2.2.1',name:'Muebles y utiles',type:'asset',parent_id:'acc-1-2-2',active:true},
  {id:'acc-1-2-2-2',code:'1.2.2.2',name:'Maquinarias',type:'asset',parent_id:'acc-1-2-2',active:true},
  {id:'acc-1-2-2-3',code:'1.2.2.3',name:'Amortizacion Maquinarias',type:'asset',parent_id:'acc-1-2-2',active:true},
  {id:'acc-1-2-2-4',code:'1.2.2.4',name:'Amortizacion Muebles y utiles',type:'asset',parent_id:'acc-1-2-2',active:true},
  {id:'acc-1-2-2-7',code:'1.2.2.7',name:'Instalaciones',type:'asset',parent_id:'acc-1-2-2',active:true},
  {id:'acc-1-2-2-8',code:'1.2.2.8',name:'Amortizacion Instalaciones',type:'asset',parent_id:'acc-1-2-2',active:true},
  {id:'acc-1-2-2-10',code:'1.2.2.10',name:'Inmuebles',type:'asset',parent_id:'acc-1-2-2',active:true},
  {id:'acc-2',code:'2',name:'PASIVO',type:'liability',parent_id:null,active:true},
  {id:'acc-2-1',code:'2.1',name:'PASIVO CORRIENTE',type:'liability',parent_id:'acc-2',active:true},
  {id:'acc-2-1-1',code:'2.1.1',name:'Cuentas por Pagar',type:'liability',parent_id:'acc-2-1',active:true},
  {id:'acc-2-1-1-1',code:'2.1.1.1',name:'Proveedores',type:'liability',parent_id:'acc-2-1-1',active:true},
  {id:'acc-2-1-1-1-1',code:'2.1.1.1.1',name:'Proveedores Argentina',type:'liability',parent_id:'acc-2-1-1-1',active:true},
  {id:'acc-2-1-1-1-2',code:'2.1.1.1.2',name:'Proveedores Exterior',type:'liability',parent_id:'acc-2-1-1-1',active:true},
  {id:'acc-2-1-1-2',code:'2.1.1.2',name:'Anticipos de Clientes',type:'liability',parent_id:'acc-2-1-1',active:true},
  {id:'acc-2-1-1-2-1',code:'2.1.1.2.1',name:'Anticipos de clientes - Argentina',type:'liability',parent_id:'acc-2-1-1-2',active:true},
  {id:'acc-2-1-1-2-2',code:'2.1.1.2.2',name:'Anticipos de clientes - Exterior',type:'liability',parent_id:'acc-2-1-1-2',active:true},
  {id:'acc-2-1-3',code:'2.1.3',name:'Cargas Sociales a Pagar',type:'liability',parent_id:'acc-2-1',active:true},
  {id:'acc-2-1-3-1',code:'2.1.3.1',name:'Sueldos a pagar',type:'liability',parent_id:'acc-2-1-3',active:true},
  {id:'acc-2-1-3-2',code:'2.1.3.2',name:'Suss a pagar',type:'liability',parent_id:'acc-2-1-3',active:true},
  {id:'acc-2-1-3-5',code:'2.1.3.5',name:'IERIC a pagar',type:'liability',parent_id:'acc-2-1-3',active:true},
  {id:'acc-2-1-3-7',code:'2.1.3.7',name:'UOCRA a pagar',type:'liability',parent_id:'acc-2-1-3',active:true},
  {id:'acc-2-1-4',code:'2.1.4',name:'Impuestos y Tasas a Pagar',type:'liability',parent_id:'acc-2-1',active:true},
  {id:'acc-2-1-4-2',code:'2.1.4.2',name:'Impuestos Nacionales a Pagar',type:'liability',parent_id:'acc-2-1-4',active:true},
  {id:'acc-2-1-4-2-2',code:'2.1.4.2.2',name:'SICORE a pagar',type:'liability',parent_id:'acc-2-1-4-2',active:true},
  {id:'acc-2-1-4-2-6',code:'2.1.4.2.6',name:'Impuesto a las ganancias a pagar',type:'liability',parent_id:'acc-2-1-4-2',active:true},
  {id:'acc-2-1-4-2-8',code:'2.1.4.2.8',name:'SIRE a pagar',type:'liability',parent_id:'acc-2-1-4-2',active:true},
  {id:'acc-2-1-4-3',code:'2.1.4.3',name:'IIBB a Pagar',type:'liability',parent_id:'acc-2-1-4',active:true},
  {id:'acc-2-1-4-3-2',code:'2.1.4.3.2',name:'Ret. y Perc. IIBB BS AS',type:'liability',parent_id:'acc-2-1-4-3',active:true},
  {id:'acc-2-1-4-3-3',code:'2.1.4.3.3',name:'IIBB BS AS a pagar',type:'liability',parent_id:'acc-2-1-4-3',active:true},
  {id:'acc-2-1-4-3-4',code:'2.1.4.3.4',name:'Ret. y Perc. IIBB CABA',type:'liability',parent_id:'acc-2-1-4-3',active:true},
  {id:'acc-2-1-4-3-5',code:'2.1.4.3.5',name:'Ret. y Perc. IIBB CABA',type:'liability',parent_id:'acc-2-1-4-3',active:true},
  {id:'acc-2-1-4-3-6',code:'2.1.4.3.6',name:'Ret. y Perc. IIBB BS AS',type:'liability',parent_id:'acc-2-1-4-3',active:true},
  {id:'acc-2-1-4-3-7',code:'2.1.4.3.7',name:'Ret. y Perc. IIBB BS AS',type:'liability',parent_id:'acc-2-1-4-3',active:true},
  {id:'acc-2-1-4-3-8',code:'2.1.4.3.8',name:'Ret. y Perc. IIBB BS AS',type:'liability',parent_id:'acc-2-1-4-3',active:true},
  {id:'acc-2-1-4-3-9',code:'2.1.4.3.9',name:'Ret. y Perc. IIBB CABA',type:'liability',parent_id:'acc-2-1-4-3',active:true},
  {id:'acc-2-1-4-3-10',code:'2.1.4.3.10',name:'Ret. y Perc. IIBB CABA',type:'liability',parent_id:'acc-2-1-4-3',active:true},
  {id:'acc-2-1-4-6',code:'2.1.4.6',name:'IVA Debito Fiscal',type:'liability',parent_id:'acc-2-1-4',active:true},
  {id:'acc-2-1-4-6-1',code:'2.1.4.6.1',name:'IVA debito fiscal 21',type:'liability',parent_id:'acc-2-1-4-6',active:true},
  {id:'acc-2-1-4-6-2',code:'2.1.4.6.2',name:'IVA debito fiscal 10.5',type:'liability',parent_id:'acc-2-1-4-6',active:true},
  {id:'acc-2-1-4-7',code:'2.1.4.7',name:'ARCA A PAGAR - por ajuste de inspeccion',type:'liability',parent_id:'acc-2-1-4',active:true},
  {id:'acc-2-1-6',code:'2.1.6',name:'Deudas Financieras',type:'liability',parent_id:'acc-2-1',active:true},
  {id:'acc-2-1-6-1',code:'2.1.6.1',name:'Mutuos - Accionistas',type:'liability',parent_id:'acc-2-1-6',active:true},
  {id:'acc-2-1-6-1-1',code:'2.1.6.1.1',name:'Deuda por mutuos - Daniel Fantin',type:'liability',parent_id:'acc-2-1-6-1',active:true},
  {id:'acc-2-1-6-2',code:'2.1.6.2',name:'Mutuos - Terceros',type:'liability',parent_id:'acc-2-1-6',active:true},
  {id:'acc-2-1-6-2-28',code:'2.1.6.2.28',name:'Deuda por mutuos - Paola Tandredi',type:'liability',parent_id:'acc-2-1-6-2',active:true},
  {id:'acc-2-1-6-2-35',code:'2.1.6.2.35',name:'Deuda por mutuos - Roque Stefanelli',type:'liability',parent_id:'acc-2-1-6-2',active:true},
  {id:'acc-2-1-6-2-44',code:'2.1.6.2.44',name:'Deuda por mutuos - IA Temporal',type:'liability',parent_id:'acc-2-1-6-2',active:true},
  {id:'acc-2-1-6-3',code:'2.1.6.3',name:'Deudas Financieras Internas',type:'liability',parent_id:'acc-2-1-6',active:true},
  {id:'acc-2-1-6-3-3',code:'2.1.6.3.3',name:'Deud. Fin. Int. - Fiduciaria Central',type:'liability',parent_id:'acc-2-1-6-3',active:true},
  {id:'acc-2-1-6-3-4',code:'2.1.6.3.4',name:'Deud. Fin. Int. - Riverside',type:'liability',parent_id:'acc-2-1-6-3',active:true},
  {id:'acc-2-1-6-3-8',code:'2.1.6.3.8',name:'Deud. Fin. Int - Ha emprendimientos srl',type:'liability',parent_id:'acc-2-1-6-3',active:true},
  {id:'acc-2-1-6-5',code:'2.1.6.5',name:'Otras Deudas Financieras',type:'liability',parent_id:'acc-2-1-6',active:true},
  {id:'acc-2-1-6-5-1',code:'2.1.6.5.1',name:'GA 313',type:'liability',parent_id:'acc-2-1-6-5',active:true},
  {id:'acc-2-1-6-5-1-1',code:'2.1.6.5.1.1',name:'GA 313',type:'liability',parent_id:'acc-2-1-6-5-1',active:true},
  {id:'acc-2-2',code:'2.2',name:'PASIVO NO CORRIENTE',type:'liability',parent_id:'acc-2',active:true},
  {id:'acc-2-2-3',code:'2.2.3',name:'Depositos en Garantia',type:'liability',parent_id:'acc-2-2',active:true},
  {id:'acc-2-2-3-1',code:'2.2.3.1',name:'Depositos en garantia - Inquilinos',type:'liability',parent_id:'acc-2-2-3',active:true},
  {id:'acc-3',code:'3',name:'PATRIMONIO NETO',type:'equity',parent_id:null,active:true},
  {id:'acc-3-1',code:'3.1',name:'Capital y Reservas',type:'equity',parent_id:'acc-3',active:true},
  {id:'acc-3-1-1',code:'3.1.1',name:'Cuentas de Capital',type:'equity',parent_id:'acc-3-1',active:true},
  {id:'acc-3-1-1-1',code:'3.1.1.1',name:'Capital Social',type:'equity',parent_id:'acc-3-1-1',active:true},
  {id:'acc-3-1-1-2',code:'3.1.1.2',name:'Resultados No Asignados',type:'equity',parent_id:'acc-3-1-1',active:true},
  {id:'acc-3-1-1-3',code:'3.1.1.3',name:'Ajuste Capital',type:'equity',parent_id:'acc-3-1-1',active:true},
  {id:'acc-3-1-1-4',code:'3.1.1.4',name:'Aportes irrevocables',type:'equity',parent_id:'acc-3-1-1',active:true},
  {id:'acc-3-1-1-5',code:'3.1.1.5',name:'Reserva Legal',type:'equity',parent_id:'acc-3-1-1',active:true},
  {id:'acc-3-1-1-6',code:'3.1.1.6',name:'Otras reservas',type:'equity',parent_id:'acc-3-1-1',active:true},
  {id:'acc-4',code:'4',name:'INGRESOS',type:'revenue',parent_id:null,active:true},
  {id:'acc-4-1',code:'4.1',name:'Ingresos Ordinarios',type:'revenue',parent_id:'acc-4',active:true},
  {id:'acc-4-1-1',code:'4.1.1',name:'Ingresos Operativos',type:'revenue',parent_id:'acc-4-1',active:true},
  {id:'acc-4-1-1-1',code:'4.1.1.1',name:'Ingresos por servicios',type:'revenue',parent_id:'acc-4-1-1',active:true},
  {id:'acc-4-1-1-3',code:'4.1.1.3',name:'Fee de desarrollo/construccion',type:'revenue',parent_id:'acc-4-1-1',active:true},
  {id:'acc-4-1-1-4',code:'4.1.1.4',name:'Alquileres R+ $',type:'revenue',parent_id:'acc-4-1-1',active:true},
  {id:'acc-4-1-1-6',code:'4.1.1.6',name:'Venta de bienes de uso',type:'revenue',parent_id:'acc-4-1-1',active:true},
  {id:'acc-4-1-2',code:'4.1.2',name:'Resultados Financieros',type:'revenue',parent_id:'acc-4-1',active:true},
  {id:'acc-4-1-2-1',code:'4.1.2.1',name:'ARG - Resultados financieros',type:'revenue',parent_id:'acc-4-1-2',active:true},
  {id:'acc-4-1-2-2',code:'4.1.2.2',name:'USA - Resultados financieros',type:'revenue',parent_id:'acc-4-1-2',active:true},
  {id:'acc-4-1-4',code:'4.1.4',name:'Recuperos e Ingresos Varios',type:'revenue',parent_id:'acc-4-1',active:true},
  {id:'acc-4-1-4-1',code:'4.1.4.1',name:'Recupero de gastos expensables FBCII',type:'revenue',parent_id:'acc-4-1-4',active:true},
  {id:'acc-4-1-4-2',code:'4.1.4.2',name:'Recupero ART CM',type:'revenue',parent_id:'acc-4-1-4',active:true},
  {id:'acc-4-1-4-3',code:'4.1.4.3',name:'Ingresos varios',type:'revenue',parent_id:'acc-4-1-4',active:true},
  {id:'acc-4-1-4-4',code:'4.1.4.4',name:'Recupero de gastos expensables LIB',type:'revenue',parent_id:'acc-4-1-4',active:true},
  {id:'acc-4-1-4-5',code:'4.1.4.5',name:'Recupero de gastos expensables RV',type:'revenue',parent_id:'acc-4-1-4',active:true},
  {id:'acc-4-1-4-6',code:'4.1.4.6',name:'Recupero de gastos FEA',type:'revenue',parent_id:'acc-4-1-4',active:true},
  {id:'acc-4-1-4-7',code:'4.1.4.7',name:'Recupero de gastos expensables Terrero 910',type:'revenue',parent_id:'acc-4-1-4',active:true},
  {id:'acc-4-1-4-8',code:'4.1.4.8',name:'Recupero de gastos expensables Zarate al Rio',type:'revenue',parent_id:'acc-4-1-4',active:true},
  {id:'acc-4-1-4-9',code:'4.1.4.9',name:'Recupero Afip',type:'revenue',parent_id:'acc-4-1-4',active:true},
  {id:'acc-4-1-4-10',code:'4.1.4.10',name:'Recupero de gastos Mercado pago CM',type:'revenue',parent_id:'acc-4-1-4',active:true},
  {id:'acc-4-1-4-11',code:'4.1.4.11',name:'Recupero de gastos de Fondos de Reserva',type:'revenue',parent_id:'acc-4-1-4',active:true},
  {id:'acc-4-1-4-13',code:'4.1.4.13',name:'Recupero embargos ARBA Fiduciaria Central',type:'revenue',parent_id:'acc-4-1-4',active:true},
  {id:'acc-5',code:'5',name:'EGRESOS',type:'expense',parent_id:null,active:true},
  {id:'acc-5-1',code:'5.1',name:'Gastos Operativos',type:'expense',parent_id:'acc-5',active:true},
  {id:'acc-5-1-1',code:'5.1.1',name:'Gastos Comerciales',type:'expense',parent_id:'acc-5-1',active:true},
  {id:'acc-5-1-1-2',code:'5.1.1.2',name:'COM - Comisiones por ventas',type:'expense',parent_id:'acc-5-1-1',active:true},
  {id:'acc-5-1-1-5',code:'5.1.1.5',name:'COM - Publicidad',type:'expense',parent_id:'acc-5-1-1',active:true},
  {id:'acc-5-1-1-6',code:'5.1.1.6',name:'COM - Carteleria',type:'expense',parent_id:'acc-5-1-1',active:true},
  {id:'acc-5-1-1-8',code:'5.1.1.8',name:'COM - Merchandising',type:'expense',parent_id:'acc-5-1-1',active:true},
  {id:'acc-5-1-1-10',code:'5.1.1.10',name:'COM - Eventos internos',type:'expense',parent_id:'acc-5-1-1',active:true},
  {id:'acc-5-1-1-11',code:'5.1.1.11',name:'COM - Eventos externos',type:'expense',parent_id:'acc-5-1-1',active:true},
  {id:'acc-5-1-1-12',code:'5.1.1.12',name:'COM - Eventos',type:'expense',parent_id:'acc-5-1-1',active:true},
  {id:'acc-5-1-1-13',code:'5.1.1.13',name:'COM - Partnerships',type:'expense',parent_id:'acc-5-1-1',active:true},
  {id:'acc-5-1-1-14',code:'5.1.1.14',name:'COM - Marketing',type:'expense',parent_id:'acc-5-1-1',active:true},
  {id:'acc-5-1-1-15',code:'5.1.1.15',name:'COM - Regalos + carteleria',type:'expense',parent_id:'acc-5-1-1',active:true},
  {id:'acc-5-1-2',code:'5.1.2',name:'Mano de Obra de Obra',type:'expense',parent_id:'acc-5-1',active:true},
  {id:'acc-5-1-2-1',code:'5.1.2.1',name:'INTERNA',type:'expense',parent_id:'acc-5-1-2',active:true},
  {id:'acc-5-1-2-2',code:'5.1.2.2',name:'COOPERATIVA',type:'expense',parent_id:'acc-5-1-2',active:true},
  {id:'acc-5-1-2-3',code:'5.1.2.3',name:'SUBCONTRATISTAS',type:'expense',parent_id:'acc-5-1-2',active:true},
  {id:'acc-5-1-2-5',code:'5.1.2.5',name:'CS. SOCIALES',type:'expense',parent_id:'acc-5-1-2',active:true},
  {id:'acc-5-1-2-6',code:'5.1.2.6',name:'SERVICIOS COOP',type:'expense',parent_id:'acc-5-1-2',active:true},
  {id:'acc-5-1-2-9',code:'5.1.2.9',name:'AVANCE DE OBRA',type:'expense',parent_id:'acc-5-1-2',active:true},
  {id:'acc-5-1-3',code:'5.1.3',name:'Gastos de Obra',type:'expense',parent_id:'acc-5-1',active:true},
  {id:'acc-5-1-3-4',code:'5.1.3.4',name:'MANTENIMIENTO',type:'expense',parent_id:'acc-5-1-3',active:true},
  {id:'acc-5-1-3-5',code:'5.1.3.5',name:'MOVILIDAD Y VIATICOS',type:'expense',parent_id:'acc-5-1-3',active:true},
  {id:'acc-5-1-3-8',code:'5.1.3.8',name:'SERVICIOS',type:'expense',parent_id:'acc-5-1-3',active:true},
  {id:'acc-5-1-3-9',code:'5.1.3.9',name:'GASTOS VARIOS',type:'expense',parent_id:'acc-5-1-3',active:true},
  {id:'acc-5-1-3-11',code:'5.1.3.11',name:'RETIRO DE SOCIOS',type:'expense',parent_id:'acc-5-1-3',active:true},
  {id:'acc-5-1-4',code:'5.1.4',name:'Gastos de Administracion',type:'expense',parent_id:'acc-5-1',active:true},
  {id:'acc-5-1-4-1',code:'5.1.4.1',name:'9400 - ADM - SUELDOS',type:'expense',parent_id:'acc-5-1-4',active:true},
  {id:'acc-5-1-4-1-1',code:'5.1.4.1.1',name:'Sueldos GA',type:'expense',parent_id:'acc-5-1-4-1',active:true},
  {id:'acc-5-1-4-1-2',code:'5.1.4.1.2',name:'Sueldos HA',type:'expense',parent_id:'acc-5-1-4-1',active:true},
  {id:'acc-5-1-4-1-3',code:'5.1.4.1.3',name:'Sueldos Sense Olivos',type:'expense',parent_id:'acc-5-1-4-1',active:true},
  {id:'acc-5-1-4-1-5',code:'5.1.4.1.5',name:'Sueldos Numa - Barbarita',type:'expense',parent_id:'acc-5-1-4-1',active:true},
  {id:'acc-5-1-4-1-8',code:'5.1.4.1.8',name:'Sueldos HA Projects',type:'expense',parent_id:'acc-5-1-4-1',active:true},
  {id:'acc-5-1-4-1-9',code:'5.1.4.1.9',name:'Sueldos HA SAS',type:'expense',parent_id:'acc-5-1-4-1',active:true},
  {id:'acc-5-1-4-1-10',code:'5.1.4.1.10',name:'Sueldos La Barra',type:'expense',parent_id:'acc-5-1-4-1',active:true},
  {id:'acc-5-1-4-1-11',code:'5.1.4.1.11',name:'Sueldos Post Venta',type:'expense',parent_id:'acc-5-1-4-1',active:true},
  {id:'acc-5-1-4-2',code:'5.1.4.2',name:'IMP, TASAS Y CONT',type:'expense',parent_id:'acc-5-1-4',active:true},
  {id:'acc-5-1-4-3',code:'5.1.4.3',name:'GASTOS VARIOS',type:'expense',parent_id:'acc-5-1-4',active:true},
  {id:'acc-5-1-4-4',code:'5.1.4.4',name:'CS. SOCIALES',type:'expense',parent_id:'acc-5-1-4',active:true},
  {id:'acc-5-1-4-6',code:'5.1.4.6',name:'ALQUILERES',type:'expense',parent_id:'acc-5-1-4',active:true},
  {id:'acc-5-1-4-7',code:'5.1.4.7',name:'HONORARIOS',type:'expense',parent_id:'acc-5-1-4',active:true},
  {id:'acc-5-1-4-8',code:'5.1.4.8',name:'LIMPIEZA Y MERCADO',type:'expense',parent_id:'acc-5-1-4',active:true},
  {id:'acc-5-1-4-10',code:'5.1.4.10',name:'LIBRERIA',type:'expense',parent_id:'acc-5-1-4',active:true},
  {id:'acc-5-1-4-11',code:'5.1.4.11',name:'GESTION ADMINISTRATIVA',type:'expense',parent_id:'acc-5-1-4',active:true},
  {id:'acc-5-1-4-12',code:'5.1.4.12',name:'9404 - ADM - MOVILIDAD Y VIATICOS',type:'expense',parent_id:'acc-5-1-4',active:true},
  {id:'acc-5-1-4-13',code:'5.1.4.13',name:'Impuesto al debito bancario',type:'expense',parent_id:'acc-5-1-4',active:true},
  {id:'acc-5-1-4-15',code:'5.1.4.15',name:'SEGUROS',type:'expense',parent_id:'acc-5-1-4',active:true},
  {id:'acc-5-1-4-16',code:'5.1.4.16',name:'Deudas Afip - Planes de pagos',type:'expense',parent_id:'acc-5-1-4',active:true},
  {id:'acc-5-1-4-18',code:'5.1.4.18',name:'Diferencias temporales',type:'expense',parent_id:'acc-5-1-4',active:true},
  {id:'acc-5-1-4-19',code:'5.1.4.19',name:'GASTOS BANCARIOS',type:'expense',parent_id:'acc-5-1-4',active:true},
  {id:'acc-5-1-4-20',code:'5.1.4.20',name:'9408 - ADM - IMPUESTOS NACIONALES',type:'expense',parent_id:'acc-5-1-4',active:true},
  {id:'acc-5-1-4-21',code:'5.1.4.21',name:'Deuda ARBA - Planes de pago',type:'expense',parent_id:'acc-5-1-4',active:true},
  {id:'acc-5-1-4-22',code:'5.1.4.22',name:'ADM - Servicios',type:'expense',parent_id:'acc-5-1-4',active:true},
  {id:'acc-5-1-7',code:'5.1.7',name:'Resultados Extraordinarios',type:'expense',parent_id:'acc-5-1',active:true},
  {id:'acc-5-1-7-1',code:'5.1.7.1',name:'Resultado negativo por perdidas extraordinarias',type:'expense',parent_id:'acc-5-1-7',active:true},
  {id:'acc-5-1-7-2',code:'5.1.7.2',name:'Gastos no computables',type:'expense',parent_id:'acc-5-1-7',active:true},
  {id:'acc-5-1-9',code:'5.1.9',name:'Recursos Humanos',type:'expense',parent_id:'acc-5-1',active:true},
  {id:'acc-5-1-9-1',code:'5.1.9.1',name:'RRHH - Honorarios',type:'expense',parent_id:'acc-5-1-9',active:true},
  {id:'acc-5-1-9-3',code:'5.1.9.3',name:'RRHH - Gastos Varios',type:'expense',parent_id:'acc-5-1-9',active:true},
  {id:'acc-5-1-9-4',code:'5.1.9.4',name:'RRHH - Capacitaciones',type:'expense',parent_id:'acc-5-1-9',active:true},
  {id:'acc-5-1-9-5',code:'5.1.9.5',name:'RRHH - Busqueda de personal',type:'expense',parent_id:'acc-5-1-9',active:true},
  {id:'acc-5-2',code:'5.2',name:'Cuentas Regularizadoras',type:'expense',parent_id:'acc-5',active:true},
  {id:'acc-5-2-1',code:'5.2.1',name:'Regularizadoras',type:'expense',parent_id:'acc-5-2',active:true},
  {id:'acc-5-2-1-1',code:'5.2.1.1',name:'Regularizadora gastos bancarios',type:'expense',parent_id:'acc-5-2-1',active:true},
  {id:'acc-5-2-1-2',code:'5.2.1.2',name:'Regularizadora tarjeta visa',type:'expense',parent_id:'acc-5-2-1',active:true}
];
      // Stamp created_at
      accounts = accounts.map(function(a) {
        return Object.assign({}, a, { created_at: now_ts });
      });
      var db = DB.get();
      db.accounts = accounts;
      DB.save(db);
      toast('Plan de cuentas importado: ' + accounts.length + ' cuentas', 'success');
      renderContabilidad();
      // Navigate to plan tab
      setTimeout(function() {
        var btn = document.querySelector('#conta-tabs .tab-btn[data-tab="tab-cuentas"]');
        if (btn) btn.click();
      }, 150);
    }
  );
}
