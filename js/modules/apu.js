/* ===== APU — ANÁLISIS DE PRECIOS UNITARIOS ===== */

// ---- currency helpers ----
function _apuLatestRate(from, to) {
  const rates = (DB.getGlobal().exchangeRates || []);
  const direct = rates.filter(r => r.from === from && r.to === to).sort((a,b) => b.date.localeCompare(a.date))[0];
  if (direct) return direct.rate;
  const inv = rates.filter(r => r.from === to && r.to === from).sort((a,b) => b.date.localeCompare(a.date))[0];
  if (inv) return 1 / inv.rate;
  return null;
}
function apuConvertCurrency(amount, from, to) {
  if (!amount || from === to) return amount;
  const direct = _apuLatestRate(from, to);
  if (direct != null) return amount * direct;
  // via ARS pivot
  const toArs = _apuLatestRate(from, 'ARS');
  const arsTo = _apuLatestRate('ARS', to);
  if (toArs != null && arsTo != null) return amount * toArs * arsTo;
  return null;
}
function _apuCurrencies() {
  try { return (DB.getGlobal().currencies || []).filter(c => c.id); } catch(e) { return []; }
}
function apuFmtPrice(amount, currency) {
  return fmtMoney(amount, currency || _activeCurrency());
}
function apuConversionsHtml(amount, fromCur) {
  if (!amount) return '';
  const cur = fromCur || _activeCurrency();
  const others = _apuCurrencies().filter(c => c.id !== cur);
  if (!others.length) return '';
  const lines = others.map(c => {
    const v = apuConvertCurrency(amount, cur, c.id);
    if (v == null) return '';
    try {
      const fmt = new Intl.NumberFormat('es-AR', { style:'currency', currency:c.id, minimumFractionDigits:2, maximumFractionDigits:2 }).format(v);
      return `<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">${c.id}</span><span>${fmt}</span></div>`;
    } catch(e) { return `<div><span style="color:var(--text-muted)">${c.id}</span> ${v.toFixed(2)}</div>`; }
  }).filter(Boolean).join('');
  return lines ? `<div style="font-size:11px;margin-top:4px;padding-top:4px;border-top:1px dashed var(--border)">${lines}</div>` : '';
}

const APU_SECTIONS = [
  { id: 'materiales',   label: 'Materiales',        icon: 'fa-boxes-stacking', color: 'blue',   haswaste: true  },
  { id: 'mano_obra',    label: 'Mano de Obra',       icon: 'fa-hard-hat',       color: 'green',  haswaste: false },
  { id: 'equipos',      label: 'Equipos',            icon: 'fa-truck',          color: 'yellow', haswaste: false },
  { id: 'subcontratos', label: 'Subcontratos',       icon: 'fa-handshake',      color: 'purple', haswaste: false }
];

const APU_CATEGORIES_MO = ['Oficial','Medio oficial','Ayudante','Capataz','Especialista','Peón'];

// =====================================================================
// MAIN RENDER
// =====================================================================
function renderAPU() {
  const apus    = DB.getAll('apuAnalysis');
  const rubros  = DB.getAll('rubros');
  const projects= DB.getAll('projects');

  const rubrosCovered = new Set(apus.filter(a => a.status === 'active').map(a => a.rubro_id)).size;
  const avgPrice      = apus.length ? apus.reduce((s,a) => s+(a.unit_price||0), 0) / apus.length : 0;
  const activos       = apus.filter(a => a.status === 'active').length;

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">APU — Análisis de Precios Unitarios</div>
    <div class="page-subtitle">Composición de costos por rubro: materiales, mano de obra, equipos y subcontratos</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="exportAPUs()"><i class="fas fa-download"></i> Exportar</button>
    <button class="btn btn-primary"   onclick="openAPUForm()"><i class="fas fa-plus"></i> Nuevo APU</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-calculator"></i></div><div>
    <div class="stat-value">${apus.length}</div><div class="stat-label">APUs Registrados</div>
    <div class="stat-delta up">${activos} activos</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-list-ol"></i></div><div>
    <div class="stat-value">${rubrosCovered}</div><div class="stat-label">Rubros con APU Activo</div>
    <div class="stat-delta">${rubros.length} rubros totales</div></div></div>
  <div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-dollar-sign"></i></div><div>
    <div class="stat-value">${fmtMoney(avgPrice)}</div><div class="stat-label">Precio Unitario Prom.</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-percent"></i></div><div>
    <div class="stat-value">${apus.length - activos}</div><div class="stat-label">Borradores / Archivados</div></div></div>
</div>

<div class="filter-bar" style="margin-bottom:12px">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar rubro, descripción..." oninput="filterAPUs(this.value)">
  </div>
  <select class="form-control" style="width:180px" onchange="filterAPUs(undefined,this.value)">
    <option value="">Todos los proyectos</option>
    <option value="__template__">Solo plantillas</option>
    ${projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}
  </select>
  <select class="form-control" style="width:140px" onchange="filterAPUs(undefined,undefined,this.value)">
    <option value="">Todos los estados</option>
    <option value="active">Activo</option>
    <option value="draft">Borrador</option>
    <option value="archived">Archivado</option>
  </select>
</div>

<div class="card"><div class="card-body" style="padding:0">
  <div id="apu-table-wrap">${apuBuildTable(apus, rubros, projects)}</div>
</div></div>
`;
  window._apuFilters = { q:'', project:'', status:'' };
}

function apuBuildTable(apus, rubros, projects) {
  if (!apus.length) return `<div class="empty-state"><i class="fas fa-calculator"></i>
    <p>Sin APUs. Cree el primer análisis de precios unitarios.</p></div>`;

  const rows = [...apus].sort((a,b) => (a.rubro_code||'').localeCompare(b.rubro_code||'')).map(a => {
    const proj   = projects.find(p => p.id === a.project_id);
    const pctMat = a.total_directo > 0 ? Math.round((a.total_materiales||0)/a.total_directo*100) : 0;
    const pctMdo = a.total_directo > 0 ? Math.round((a.total_mano_obra||0)/a.total_directo*100)  : 0;
    const pctEq  = a.total_directo > 0 ? Math.round((a.total_equipos||0)/a.total_directo*100)    : 0;
    const statusColor = { active:'green', draft:'gray', archived:'yellow' };
    const statusLabel = { active:'Activo',  draft:'Borrador', archived:'Archivado' };

    return `<tr class="apu-row"
      data-q="${(a.rubro_code||'').toLowerCase()} ${(a.rubro_name||'').toLowerCase()} ${(a.description||'').toLowerCase()}"
      data-project="${a.project_id||'__template__'}" data-status="${a.status||'draft'}">
      <td>
        <strong style="font-family:monospace">${a.rubro_code||'-'}</strong>
        <div style="font-size:11px;color:var(--text-muted)">${a.rubro_unit||''}</div>
      </td>
      <td>
        <strong>${a.rubro_name||a.description||'-'}</strong>
        ${a.description&&a.description!==a.rubro_name?`<div style="font-size:11px;color:var(--text-muted)">${a.description}</div>`:''}
      </td>
      <td style="font-size:12px">${proj?proj.name:'<span style="color:var(--text-muted)">Plantilla</span>'}</td>
      <td style="font-size:11px;color:var(--text-muted)">v${a.version||1} — ${fmtDate(a.date)}</td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${pctMat?`<span class="badge badge-blue" style="font-size:10px">Mat ${pctMat}%</span>`:''}
          ${pctMdo?`<span class="badge badge-green" style="font-size:10px">MdO ${pctMdo}%</span>`:''}
          ${pctEq ?`<span class="badge badge-yellow" style="font-size:10px">Eq ${pctEq}%</span>`:''}
        </div>
      </td>
      <td class="text-right" style="font-size:12px">${apuFmtPrice(a.total_directo||0, a.currency)}</td>
      <td class="text-right"><strong style="font-size:14px;color:var(--primary)">${apuFmtPrice(a.unit_price||0, a.currency)}</strong><div style="font-size:10px;color:var(--text-muted)">/${a.rubro_unit||'u'}${a.currency?' · '+a.currency:''}</div></td>
      <td><span class="badge badge-${statusColor[a.status]||'gray'}">${statusLabel[a.status]||a.status}</span></td>
      <td>
        <button class="btn btn-xs btn-secondary" onclick="viewAPU('${a.id}')"><i class="fas fa-eye"></i></button>
        <button class="btn btn-xs btn-secondary" onclick="openAPUForm('${a.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-xs btn-secondary" onclick="duplicateAPU('${a.id}')"><i class="fas fa-copy"></i></button>
        <button class="btn btn-xs btn-danger"    onclick="deleteAPU('${a.id}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');

  return `<table><thead><tr>
    <th>Código</th><th>Rubro</th><th>Proyecto</th><th>Versión</th>
    <th>Composición</th><th class="text-right">Costo Directo</th>
    <th class="text-right">Precio Unit.</th><th>Estado</th><th>Acciones</th>
  </tr></thead><tbody id="apu-tbody">${rows}</tbody></table>`;
}

window._apuFilters = { q:'', project:'', status:'' };
function filterAPUs(q, project, status) {
  const f = window._apuFilters;
  if (q       !== undefined) f.q       = (q||'').toLowerCase();
  if (project !== undefined) f.project = project||'';
  if (status  !== undefined) f.status  = status||'';
  document.querySelectorAll('#apu-tbody tr.apu-row').forEach(tr => {
    const mQ = !f.q       || tr.dataset.q.includes(f.q);
    const mP = !f.project || tr.dataset.project === f.project;
    const mS = !f.status  || tr.dataset.status  === f.status;
    tr.style.display = (mQ && mP && mS) ? '' : 'none';
  });
}

// =====================================================================
// APU ITEM STATE
// =====================================================================
function _apuEmptyItem(section) {
  const base = { description:'', unit:'', quantity:0, unit_price:0, subtotal:0 };
  if (section === 'mano_obra') base.category = 'Oficial';
  if (section === 'materiales') base.waste_pct = 0;
  return base;
}

function apuAddItem(section) {
  window._apuItems[section].push(_apuEmptyItem(section));
  apuRebuildSection(section);
  apuRecalcSummary();
}

function apuRemoveItem(section, idx) {
  window._apuItems[section].splice(idx, 1);
  apuRebuildSection(section);
  apuRecalcSummary();
}

function apuUpdateItem(section, idx, field, val) {
  const it = window._apuItems[section][idx];
  if (!it) return;
  it[field] = (field === 'description' || field === 'unit' || field === 'category') ? val : (parseFloat(val)||0);
  if (field === 'quantity' || field === 'unit_price' || field === 'waste_pct') {
    const factor = 1 + ((it.waste_pct||0) / 100);
    it.subtotal = (it.quantity||0) * (it.unit_price||0) * factor;
  }
  apuRebuildSection(section);
  apuRecalcSummary();
}

function apuRebuildSection(section) {
  const sec  = APU_SECTIONS.find(s => s.id === section);
  const tbody= document.getElementById('apu-tbody-' + section);
  if (!tbody) return;

  const items = window._apuItems[section];
  const total = items.reduce((s, it) => s + (it.subtotal||0), 0);
  const cur   = document.getElementById('apu-currency')?.value || _activeCurrency();

  const titleEl = document.getElementById('apu-sec-total-' + section);
  if (titleEl) titleEl.textContent = fmtMoney(total, cur);

  tbody.innerHTML = items.map((it, i) => {
    const cols = [];

    if (section === 'mano_obra') {
      cols.push(`<td style="width:120px"><select class="form-control form-control-sm" onchange="apuUpdateItem('${section}',${i},'category',this.value)">
        ${APU_CATEGORIES_MO.map(c=>`<option ${it.category===c?'selected':''}>${c}</option>`).join('')}
      </select></td>`);
    }

    cols.push(`<td><input class="form-control form-control-sm" value="${it.description||''}" placeholder="Descripción..." oninput="apuUpdateItem('${section}',${i},'description',this.value)"></td>`);
    cols.push(`<td style="width:70px"><input class="form-control form-control-sm" value="${it.unit||''}" placeholder="u/m" oninput="apuUpdateItem('${section}',${i},'unit',this.value)"></td>`);
    cols.push(`<td style="width:80px"><input class="form-control form-control-sm text-right" type="number" min="0" step="0.001" value="${it.quantity||0}" onchange="apuUpdateItem('${section}',${i},'quantity',this.value)"></td>`);
    cols.push(`<td style="width:110px"><input class="form-control form-control-sm text-right" type="number" min="0" step="0.01" value="${it.unit_price||0}" onchange="apuUpdateItem('${section}',${i},'unit_price',this.value)"></td>`);

    if (section === 'materiales') {
      cols.push(`<td style="width:70px"><div style="display:flex;align-items:center;gap:2px"><input class="form-control form-control-sm text-right" type="number" min="0" max="100" step="1" value="${it.waste_pct||0}" onchange="apuUpdateItem('${section}',${i},'waste_pct',this.value)" style="padding-right:2px"><span style="font-size:11px">%</span></div></td>`);
    }

    cols.push(`<td class="text-right" style="width:100px;font-weight:600;font-size:13px">${fmtMoney(it.subtotal||0, cur)}</td>`);
    cols.push(`<td style="width:36px"><button class="btn btn-xs btn-danger" onclick="apuRemoveItem('${section}',${i})"><i class="fas fa-times"></i></button></td>`);

    return `<tr>${cols.join('')}</tr>`;
  }).join('') || `<tr><td colspan="99" style="text-align:center;color:var(--text-muted);padding:10px;font-size:12px">Sin ítems — use + Agregar</td></tr>`;
}

function apuRecalcSummary() {
  const items   = window._apuItems;
  const totMat  = items.materiales.reduce((s, it)  => s + (it.subtotal||0), 0);
  const totMdo  = items.mano_obra.reduce((s, it)   => s + (it.subtotal||0), 0);
  const totEq   = items.equipos.reduce((s, it)     => s + (it.subtotal||0), 0);
  const totSub  = items.subcontratos.reduce((s, it) => s + (it.subtotal||0), 0);
  const totDir  = totMat + totMdo + totEq + totSub;

  const ggPct   = parseFloat(document.getElementById('apu-gg-pct')?.value)  || 0;
  const utPct   = parseFloat(document.getElementById('apu-ut-pct')?.value)  || 0;
  const impPct  = parseFloat(document.getElementById('apu-imp-pct')?.value) || 0;

  const gg      = totDir * ggPct / 100;
  const ut      = (totDir + gg) * utPct / 100;
  const imp     = (totDir + gg + ut) * impPct / 100;
  const total   = totDir + gg + ut + imp;

  const cur = document.getElementById('apu-currency')?.value || _activeCurrency();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = fmtMoney(val, cur); };
  set('apu-sum-mat',  totMat);
  set('apu-sum-mdo',  totMdo);
  set('apu-sum-eq',   totEq);
  set('apu-sum-sub',  totSub);
  set('apu-sum-dir',  totDir);
  set('apu-sum-gg',   gg);
  set('apu-sum-ut',   ut);
  set('apu-sum-imp',  imp);
  set('apu-sum-tot',  total);

  // Composition bars
  if (totDir > 0) {
    const bar = (id, val) => { const el = document.getElementById(id); if (el) el.style.width = Math.round(val/totDir*100)+'%'; };
    bar('apu-bar-mat', totMat);
    bar('apu-bar-mdo', totMdo);
    bar('apu-bar-eq',  totEq);
    bar('apu-bar-sub', totSub);
  }

  window._apuCurrentTotals = { totMat, totMdo, totEq, totSub, totDir, gg, ut, imp, total };

  // Currency conversions
  const fromCur = document.getElementById('apu-currency')?.value || _activeCurrency();
  const convEl = document.getElementById('apu-conversions');
  if (convEl && total > 0) {
    const others = _apuCurrencies().filter(c => c.id !== fromCur);
    const lines = others.map(c => {
      const converted = apuConvertCurrency(total, fromCur, c.id);
      if (converted == null) return '';
      try {
        const fmt = new Intl.NumberFormat('es-AR', { style:'currency', currency:c.id, minimumFractionDigits:2, maximumFractionDigits:2 }).format(converted);
        return `<div style="display:flex;justify-content:space-between"><span>${c.id}</span><span>${fmt}</span></div>`;
      } catch(e) { return `<div style="display:flex;justify-content:space-between"><span>${c.id}</span><span>${converted.toFixed(2)}</span></div>`; }
    }).filter(Boolean).join('');
    convEl.innerHTML = lines
      ? `<div style="border-top:1px dashed var(--border);padding-top:6px;margin-top:2px">${lines}</div>`
      : '';
  } else if (convEl) {
    convEl.innerHTML = '';
  }
}

// =====================================================================
// FORM: OPEN
// =====================================================================
function openAPUForm(id) {
  const apu     = id ? DB.getById('apuAnalysis', id) : null;
  const rubros  = DB.getAll('rubros').filter(r => r.active !== false).sort((a,b) => a.code.localeCompare(b.code));
  const projects= DB.getAll('projects');

  // Initialize item state
  window._apuItems = {
    materiales:   (apu?.materiales   || []).map(it => ({...it})),
    mano_obra:    (apu?.mano_obra    || []).map(it => ({...it})),
    equipos:      (apu?.equipos      || []).map(it => ({...it})),
    subcontratos: (apu?.subcontratos || []).map(it => ({...it}))
  };

  const rubroOpts = rubros.map(r =>
    `<option value="${r.id}" data-code="${r.code}" data-name="${r.name}" data-unit="${r.unit||''}"
      ${apu?.rubro_id===r.id?'selected':''}>${r.code} — ${r.name} (${r.unit||'-'})</option>`
  ).join('');

  const projOpts = `<option value="">Plantilla (sin proyecto)</option>`
    + projects.map(p => `<option value="${p.id}" ${apu?.project_id===p.id?'selected':''}>${p.name}</option>`).join('');

  const activeCur = _activeCurrency();
  const apuCurrency = apu?.currency || activeCur;
  const allCurrencies = _apuCurrencies();
  const currencyOpts = allCurrencies.length
    ? allCurrencies.map(c => `<option value="${c.id}" ${apuCurrency===c.id?'selected':''}>${c.id}${c.name?' — '+c.name:''}</option>`).join('')
    : `<option value="${activeCur}" selected>${activeCur}</option>`;

  const sectionHTML = APU_SECTIONS.map(sec => {
    const hasWaste  = sec.haswaste;
    const headerCols = sec.id === 'mano_obra'
      ? '<th style="width:120px">Categoría</th><th>Descripción</th>'
      : '<th>Descripción</th>';
    const wasteTh = hasWaste ? '<th style="width:70px">Desperd.</th>' : '';

    return `
<div style="margin-bottom:20px">
  <div style="display:flex;justify-content:space-between;align-items:center;
              background:var(--bg-subtle);border-radius:8px 8px 0 0;
              padding:8px 12px;border:1px solid var(--border);border-bottom:none">
    <div style="display:flex;align-items:center;gap:8px">
      <span class="badge badge-${sec.color}"><i class="fas ${sec.icon}"></i> ${sec.label}</span>
      <strong id="apu-sec-total-${sec.id}" style="font-size:13px">${fmtMoney(0)}</strong>
    </div>
    <button class="btn btn-xs btn-secondary" onclick="apuAddItem('${sec.id}')">
      <i class="fas fa-plus"></i> Agregar
    </button>
  </div>
  <div style="overflow-x:auto;border:1px solid var(--border);border-radius:0 0 8px 8px">
    <table style="min-width:500px;table-layout:auto;width:100%">
      <thead style="background:var(--bg-subtle)"><tr>
        ${headerCols}
        <th style="width:70px">Unidad</th>
        <th style="width:80px" class="text-right">Cantidad</th>
        <th style="width:110px" class="text-right">P. Unit.</th>
        ${wasteTh}
        <th style="width:100px" class="text-right">Subtotal</th>
        <th style="width:36px"></th>
      </tr></thead>
      <tbody id="apu-tbody-${sec.id}"></tbody>
    </table>
  </div>
</div>`;
  }).join('');

  const summaryHTML = `
<div style="background:var(--bg-subtle);border-radius:8px;padding:14px 16px;border:1px solid var(--border)">
  <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">
    Composición del Costo
  </div>
  <div style="height:12px;border-radius:6px;overflow:hidden;background:var(--border);display:flex;margin-bottom:12px">
    <div id="apu-bar-mat" style="width:0;background:var(--primary);transition:width .3s"></div>
    <div id="apu-bar-mdo" style="width:0;background:var(--success);transition:width .3s"></div>
    <div id="apu-bar-eq"  style="width:0;background:var(--warning);transition:width .3s"></div>
    <div id="apu-bar-sub" style="width:0;background:var(--purple);transition:width .3s"></div>
  </div>

  <div style="display:grid;grid-template-columns:1fr auto;row-gap:4px;font-size:13px">
    <span style="color:var(--primary)">Materiales</span>      <strong id="apu-sum-mat">$0</strong>
    <span style="color:var(--success)">Mano de Obra</span>    <strong id="apu-sum-mdo">$0</strong>
    <span style="color:var(--warning)">Equipos</span>         <strong id="apu-sum-eq">$0</strong>
    <span style="color:var(--purple)">Subcontratos</span>     <strong id="apu-sum-sub">$0</strong>
    <span style="border-top:1px solid var(--border);padding-top:6px;margin-top:4px;font-weight:700">Costo Directo</span>
    <strong id="apu-sum-dir" style="border-top:1px solid var(--border);padding-top:6px;margin-top:4px">$0</strong>
  </div>

  <div style="margin-top:12px;display:grid;grid-template-columns:auto 60px auto;gap:6px;align-items:center;font-size:12px">
    <label>Gastos Grales.</label>
    <input class="form-control form-control-sm text-right" id="apu-gg-pct" type="number" min="0" max="100" step="0.5"
      value="${apu?.gastos_generales_pct ?? 10}" onchange="apuRecalcSummary()">
    <strong id="apu-sum-gg">$0</strong>

    <label>Utilidad</label>
    <input class="form-control form-control-sm text-right" id="apu-ut-pct" type="number" min="0" max="100" step="0.5"
      value="${apu?.utilidad_pct ?? 10}" onchange="apuRecalcSummary()">
    <strong id="apu-sum-ut">$0</strong>

    <label>Impuestos</label>
    <input class="form-control form-control-sm text-right" id="apu-imp-pct" type="number" min="0" max="100" step="0.5"
      value="${apu?.impuestos_pct ?? 3}" onchange="apuRecalcSummary()">
    <strong id="apu-sum-imp">$0</strong>
  </div>

  <div style="margin-top:12px;padding-top:10px;border-top:2px solid var(--primary);
              display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:14px;font-weight:700">PRECIO UNITARIO</span>
    <span id="apu-sum-tot" style="font-size:18px;font-weight:800;color:var(--primary)">$0</span>
  </div>
  <div id="apu-conversions" style="margin-top:8px;font-size:11px;color:var(--text-muted)"></div>
</div>`;

  const body = `
<div class="form-grid" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:16px">
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">Rubro *</label>
    <select class="form-control" id="apu-rubro" onchange="apuOnRubroChange()">
      <option value="">Seleccionar rubro...</option>${rubroOpts}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Proyecto / Plantilla</label>
    <select class="form-control" id="apu-project">${projOpts}</select>
  </div>
  <div class="form-group">
    <label class="form-label">Versión</label>
    <input class="form-control" id="apu-version" type="number" min="1" step="1" value="${apu?.version||1}">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha</label>
    <input class="form-control" id="apu-date" type="date" value="${apu?.date||todayStr()}">
  </div>
  <div class="form-group">
    <label class="form-label">Estado</label>
    <select class="form-control" id="apu-status">
      <option value="draft"    ${(apu?.status||'draft')==='draft'   ?'selected':''}>Borrador</option>
      <option value="active"   ${apu?.status==='active'             ?'selected':''}>Activo</option>
      <option value="archived" ${apu?.status==='archived'           ?'selected':''}>Archivado</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Moneda de Cálculo</label>
    <select class="form-control" id="apu-currency" onchange="apuRecalcSummary()">${currencyOpts}</select>
    <small style="color:var(--text-muted)">Los precios unitarios se ingresan en esta moneda.</small>
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">Descripción / Notas</label>
    <textarea class="form-control" id="apu-desc" rows="2">${apu?.description||''}</textarea>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 280px;gap:20px;align-items:start">
  <div>${sectionHTML}</div>
  <div style="position:sticky;top:16px">${summaryHTML}</div>
</div>`;

  openModal(apu ? `Editar APU — ${apu.rubro_code}` : 'Nuevo APU', body, 'xl',
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-secondary" onclick="saveAPU('${id||''}','draft')"><i class="fas fa-save"></i> Guardar Borrador</button>
     <button class="btn btn-primary"   onclick="saveAPU('${id||''}','active')"><i class="fas fa-check"></i> Activar</button>`);

  setTimeout(() => {
    APU_SECTIONS.forEach(s => apuRebuildSection(s.id));
    apuRecalcSummary();
  }, 40);
}

function apuOnRubroChange() {
  const sel = document.getElementById('apu-rubro');
  if (!sel || !sel.value) return;
  const opt = sel.options[sel.selectedIndex];
  // could pre-fill unit display if needed
}

// =====================================================================
// SAVE
// =====================================================================
function saveAPU(id, statusOverride) {
  const rubroSel = document.getElementById('apu-rubro');
  const rubroId  = rubroSel?.value;
  if (!rubroId) { toast('Seleccione un rubro', 'error'); return; }

  const rubroOpt = rubroSel.options[rubroSel.selectedIndex];
  const t = window._apuCurrentTotals || {};

  const data = {
    rubro_id:   rubroId,
    rubro_code: rubroOpt?.dataset?.code || '',
    rubro_name: rubroOpt?.dataset?.name || '',
    rubro_unit: rubroOpt?.dataset?.unit || '',
    project_id: document.getElementById('apu-project')?.value || '',
    version:    parseInt(document.getElementById('apu-version')?.value)||1,
    date:       document.getElementById('apu-date')?.value || todayStr(),
    status:     statusOverride || document.getElementById('apu-status')?.value || 'draft',
    description:document.getElementById('apu-desc')?.value?.trim() || '',

    materiales:   window._apuItems.materiales.filter(it => it.description||it.subtotal>0),
    mano_obra:    window._apuItems.mano_obra.filter(it => it.description||it.subtotal>0),
    equipos:      window._apuItems.equipos.filter(it => it.description||it.subtotal>0),
    subcontratos: window._apuItems.subcontratos.filter(it => it.description||it.subtotal>0),

    currency:             document.getElementById('apu-currency')?.value || _activeCurrency(),
    gastos_generales_pct: parseFloat(document.getElementById('apu-gg-pct')?.value)||0,
    utilidad_pct:         parseFloat(document.getElementById('apu-ut-pct')?.value)||0,
    impuestos_pct:        parseFloat(document.getElementById('apu-imp-pct')?.value)||0,

    total_materiales: t.totMat||0,
    total_mano_obra:  t.totMdo||0,
    total_equipos:    t.totEq||0,
    total_subcontratos:t.totSub||0,
    total_directo:    t.totDir||0,
    total_gg:         t.gg||0,
    total_utilidad:   t.ut||0,
    total_impuestos:  t.imp||0,
    unit_price:       t.total||0
  };

  if (id) {
    DB.update('apuAnalysis', id, data);
    toast('APU actualizado', 'success');
  } else {
    DB.insert('apuAnalysis', data);
    toast('APU creado', 'success');
  }
  closeModal();
  renderAPU();
}

// =====================================================================
// VIEW (print-style detail)
// =====================================================================
function viewAPU(id) {
  const apu = DB.getById('apuAnalysis', id);
  if (!apu) return;

  const sectionTable = (items, section) => {
    if (!items?.length) return `<em style="color:var(--text-muted);font-size:12px">Sin ítems</em>`;
    const sec = APU_SECTIONS.find(s => s.id === section);
    const hasWaste = sec?.haswaste;
    const hasCat   = section === 'mano_obra';
    const rows = items.map(it => `<tr>
      ${hasCat  ? `<td style="font-size:12px">${it.category||'-'}</td>`:''}
      <td style="font-size:12px">${it.description||'-'}</td>
      <td class="text-right" style="font-size:12px">${it.unit||'-'}</td>
      <td class="text-right" style="font-size:12px">${fmtNum(it.quantity||0)}</td>
      <td class="text-right" style="font-size:12px">${fmtMoney(it.unit_price||0)}</td>
      ${hasWaste ? `<td class="text-right" style="font-size:12px">${it.waste_pct||0}%</td>`:''}
      <td class="text-right" style="font-size:12px"><strong>${fmtMoney(it.subtotal||0)}</strong></td>
    </tr>`).join('');
    const total = items.reduce((s, it) => s+(it.subtotal||0), 0);
    return `<table style="width:100%"><thead><tr style="background:var(--bg-subtle)">
      ${hasCat ?'<th style="font-size:11px">Categoría</th>':''}
      <th style="font-size:11px">Descripción</th>
      <th class="text-right" style="font-size:11px">Unidad</th>
      <th class="text-right" style="font-size:11px">Cant.</th>
      <th class="text-right" style="font-size:11px">P.Unit.</th>
      ${hasWaste?'<th class="text-right" style="font-size:11px">Desp.</th>':''}
      <th class="text-right" style="font-size:11px">Subtotal</th>
    </tr></thead><tbody>${rows}</tbody>
    <tfoot><tr style="font-weight:700;border-top:2px solid var(--border)">
      <td colspan="${hasCat?5:4}${hasWaste?'+1':''}" style="font-size:12px">Subtotal ${sec?.label||section}</td>
      <td class="text-right">${fmtMoney(total)}</td>
    </tr></tfoot></table>`;
  };

  const pct = v => v ? ` (${v}%)` : '';
  const proj = apu.project_id ? DB.getById('projects', apu.project_id) : null;

  const body = `
<div style="font-size:12px">
  <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px">
    <div>
      <div style="font-size:18px;font-weight:800">${apu.rubro_code} — ${apu.rubro_name}</div>
      <div style="color:var(--text-muted)">${proj?proj.name:'Plantilla'} | Unidad: ${apu.rubro_unit||'-'} | v${apu.version} | ${fmtDate(apu.date)}</div>
      ${apu.description?`<div style="margin-top:4px;color:var(--text-muted)">${apu.description}</div>`:''}
    </div>
    <div style="text-align:right">
      <div style="font-size:24px;font-weight:900;color:var(--primary)">${apuFmtPrice(apu.unit_price||0, apu.currency)}</div>
      <div style="color:var(--text-muted)">por ${apu.rubro_unit||'unidad'}${apu.currency?' · '+apu.currency:''}</div>
      ${apuConversionsHtml(apu.unit_price||0, apu.currency)}
    </div>
  </div>

  ${APU_SECTIONS.map(sec => {
    const items = apu[sec.id] || [];
    if (!items.length) return '';
    return `<div style="margin-bottom:14px">
      <div style="font-weight:700;font-size:13px;margin-bottom:6px">
        <span class="badge badge-${sec.color}"><i class="fas ${sec.icon}"></i> ${sec.label}</span>
        <span style="margin-left:8px;color:var(--text-muted)">${fmtMoney(items.reduce((s,it)=>s+(it.subtotal||0),0))}</span>
      </div>
      ${sectionTable(items, sec.id)}
    </div>`;
  }).join('')}

  <div style="display:flex;justify-content:flex-end;margin-top:8px">
    <div style="min-width:280px;background:var(--bg-subtle);border-radius:8px;padding:12px;border:1px solid var(--border)">
      <div style="display:grid;grid-template-columns:1fr auto;gap:4px">
        <span>Materiales</span>             <strong>${fmtMoney(apu.total_materiales||0)}</strong>
        <span>Mano de Obra</span>           <strong>${fmtMoney(apu.total_mano_obra||0)}</strong>
        <span>Equipos</span>                <strong>${fmtMoney(apu.total_equipos||0)}</strong>
        <span>Subcontratos</span>           <strong>${fmtMoney(apu.total_subcontratos||0)}</strong>
        <span style="border-top:1px solid var(--border);padding-top:6px;font-weight:700">Costo Directo</span>
        <strong style="border-top:1px solid var(--border);padding-top:6px">${fmtMoney(apu.total_directo||0)}</strong>
        <span>Gastos Generales${pct(apu.gastos_generales_pct)}</span><strong>${fmtMoney(apu.total_gg||0)}</strong>
        <span>Utilidad${pct(apu.utilidad_pct)}</span>               <strong>${fmtMoney(apu.total_utilidad||0)}</strong>
        <span>Impuestos${pct(apu.impuestos_pct)}</span>             <strong>${fmtMoney(apu.total_impuestos||0)}</strong>
      </div>
      <div style="margin-top:8px;padding-top:8px;border-top:2px solid var(--primary);
                  display:flex;justify-content:space-between;font-weight:900">
        <span style="font-size:14px">PRECIO UNITARIO</span>
        <span style="font-size:18px;color:var(--primary)">${apuFmtPrice(apu.unit_price||0, apu.currency)}</span>
      </div>
      ${apuConversionsHtml(apu.unit_price||0, apu.currency)}
    </div>
  </div>
</div>`;

  openModal(`APU — ${apu.rubro_code} ${apu.rubro_name}`, body, 'xl',
    `<button class="btn btn-secondary" onclick="openAPUForm('${apu.id}');closeModal()"><i class="fas fa-edit"></i> Editar</button>
     <button class="btn btn-secondary" onclick="window.print()"><i class="fas fa-print"></i> Imprimir</button>
     <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`);
}

// =====================================================================
// DUPLICATE
// =====================================================================
function duplicateAPU(id) {
  const apu = DB.getById('apuAnalysis', id);
  if (!apu) return;
  const copy = Object.assign({}, apu, {
    version: (apu.version||1) + 1,
    status:  'draft',
    date:    todayStr()
  });
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  DB.insert('apuAnalysis', copy);
  toast('APU duplicado como borrador v' + copy.version, 'success');
  renderAPU();
}

function deleteAPU(id) {
  confirmDialog('¿Eliminar este APU?', function() {
    DB.remove('apuAnalysis', id);
    toast('APU eliminado', 'success');
    renderAPU();
  });
}

// =====================================================================
// UTILITY: get active unit price for a rubro (used by presupuesto)
// =====================================================================
function apuGetUnitPrice(rubroId, projectId) {
  const apus = DB.getAll('apuAnalysis').filter(a => a.rubro_id === rubroId && a.status === 'active');
  if (!apus.length) return null;
  // Prefer project-specific APU over template
  const specific = apus.find(a => a.project_id === projectId);
  return specific ? specific.unit_price : apus[0].unit_price;
}

// =====================================================================
// EXPORT
// =====================================================================
function exportAPUs() {
  const apus = DB.getAll('apuAnalysis');
  exportXLSX('apu_analisis_precios',
    ['Código Rubro','Rubro','Proyecto','Versión','Fecha','Estado',
     'Total Mat.','Total MdO','Total Equipos','Total Subcont.',
     'Costo Directo','GG%','Utilidad%','Impuestos%','Precio Unitario','Unidad'],
    apus.map(a => [
      a.rubro_code||'', a.rubro_name||'',
      a.project_id ? (DB.getById('projects',a.project_id)?.name||a.project_id) : 'Plantilla',
      a.version||1, a.date||'', a.status||'',
      a.total_materiales||0, a.total_mano_obra||0, a.total_equipos||0, a.total_subcontratos||0,
      a.total_directo||0, a.gastos_generales_pct||0, a.utilidad_pct||0, a.impuestos_pct||0,
      a.unit_price||0, a.rubro_unit||''
    ])
  );
}
