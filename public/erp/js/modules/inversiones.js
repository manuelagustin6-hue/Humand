/* ===== INVERSIONES ===== */

var INVERSION_TYPES = [
  { id: 'plazo_fijo', label: 'Plazo Fijo',          icon: 'fa-clock', color: '#2563eb' },
  { id: 'fci',        label: 'Fondo Común (FCI)',    icon: 'fa-chart-line', color: '#7c3aed' },
  { id: 'caucion',    label: 'Caución Bursátil',     icon: 'fa-gavel', color: '#0891b2' },
  { id: 'bono',       label: 'Bono / Título',        icon: 'fa-file-invoice-dollar', color: '#d97706' },
  { id: 'accion',     label: 'Acción',               icon: 'fa-chart-bar', color: '#16a34a' },
  { id: 'otro',       label: 'Otro',                 icon: 'fa-circle-dollar-to-slot', color: '#64748b' },
];
var INVERSION_STATUS = {
  activo:    { label: 'Activa',    cls: 'badge-blue' },
  vencido:   { label: 'Vencida',   cls: 'badge-red' },
  renovado:  { label: 'Renovada',  cls: 'badge-gray' },
  cobrado:   { label: 'Cobrada',   cls: 'badge-green' },
  cancelado: { label: 'Cancelada', cls: 'badge-gray' },
};

window._invFiltersInv = window._invFiltersInv || { q: '', type: '', status: 'activo', currency: '' };

// ── MAIN RENDER ──────────────────────────────────────────────────────────────
function renderInversiones() {
  const today = todayStr();
  const all   = DB.getAll('investments');

  const activas   = all.filter(i => i.status === 'activo');
  const vencidas  = all.filter(i => i.status === 'vencido');
  const totalARS  = activas.filter(i => (i.currency||'ARS') === 'ARS').reduce((s,i) => s + (i.principal||0), 0);
  const totalUSD  = activas.filter(i => i.currency === 'USD').reduce((s,i) => s + (i.principal||0), 0);
  const rendEsp   = activas.reduce((s,i) => s + _invExpReturn(i), 0);
  const in7       = new Date(); in7.setDate(in7.getDate() + 7);
  const in7str    = in7.toISOString().slice(0, 10);
  const proxVenc  = activas.filter(i => i.maturity_date && i.maturity_date <= in7str).length;

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Inversiones</div>
    <div class="page-subtitle">Plazos fijos, fondos, cauciones y otros instrumentos financieros</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="exportInversiones()"><i class="fas fa-download"></i> Exportar</button>
    <button class="btn btn-primary" onclick="openInvForm()"><i class="fas fa-plus"></i> Nueva Inversión</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card">
    <div class="stat-icon blue"><i class="fas fa-university"></i></div>
    <div style="min-width:0">
      <div class="stat-value">${fmtMoneyK(totalARS)}</div>
      <div class="stat-label">Total Invertido ARS</div>
      <div class="stat-delta up"><i class="fas fa-info-circle"></i> ${fmtMoney(totalARS)}</div>
    </div>
  </div>
  <div class="stat-card">
    <div class="stat-icon cyan"><i class="fas fa-dollar-sign"></i></div>
    <div style="min-width:0">
      <div class="stat-value">US$ ${fmtNum(Math.round(totalUSD))}</div>
      <div class="stat-label">Total Invertido USD</div>
      <div class="stat-delta up"><i class="fas fa-university"></i> capital en dólares</div>
    </div>
  </div>
  <div class="stat-card">
    <div class="stat-icon green"><i class="fas fa-percentage"></i></div>
    <div style="min-width:0">
      <div class="stat-value">${fmtMoneyK(rendEsp)}</div>
      <div class="stat-label">Rendimiento Esperado</div>
      <div class="stat-delta up"><i class="fas fa-chart-line"></i> inversiones activas</div>
    </div>
  </div>
  <div class="stat-card">
    <div class="stat-icon ${proxVenc > 0 || vencidas.length > 0 ? 'red' : 'green'}"><i class="fas fa-calendar-exclamation"></i></div>
    <div style="min-width:0">
      <div class="stat-value">${proxVenc + vencidas.length}</div>
      <div class="stat-label">Requieren Atención</div>
      <div class="stat-delta ${proxVenc + vencidas.length > 0 ? 'down' : 'up'}">
        ${vencidas.length > 0 ? `<i class="fas fa-exclamation-circle"></i> ${vencidas.length} vencidas` : proxVenc > 0 ? `<i class="fas fa-clock"></i> ${proxVenc} vencen pronto` : '<i class="fas fa-check-circle"></i> Al día'}
      </div>
    </div>
  </div>
</div>

<div class="filter-bar mt-2">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar entidad, descripción..." value="${window._invFiltersInv.q}" oninput="filterInversiones(this.value)">
  </div>
  <select class="form-control" style="width:170px" onchange="filterInversiones(undefined, this.value)">
    <option value="">Todos los tipos</option>
    ${INVERSION_TYPES.map(t => `<option value="${t.id}" ${window._invFiltersInv.type===t.id?'selected':''}>${t.label}</option>`).join('')}
  </select>
  <select class="form-control" style="width:140px" onchange="filterInversiones(undefined, undefined, this.value)">
    <option value="activo" ${window._invFiltersInv.status==='activo'?'selected':''}>Activas</option>
    <option value="" ${window._invFiltersInv.status===''?'selected':''}>Todos los estados</option>
    <option value="vencido" ${window._invFiltersInv.status==='vencido'?'selected':''}>Vencidas</option>
    <option value="cobrado" ${window._invFiltersInv.status==='cobrado'?'selected':''}>Cobradas</option>
    <option value="renovado" ${window._invFiltersInv.status==='renovado'?'selected':''}>Renovadas</option>
  </select>
  <select class="form-control" style="width:110px" onchange="filterInversiones(undefined, undefined, undefined, this.value)">
    <option value="">Monedas</option>
    <option value="ARS" ${window._invFiltersInv.currency==='ARS'?'selected':''}>ARS</option>
    <option value="USD" ${window._invFiltersInv.currency==='USD'?'selected':''}>USD</option>
  </select>
</div>

<div id="inv-table-wrap"></div>
`;
  filterInversiones();
}

// ── FILTER + TABLE ────────────────────────────────────────────────────────────
function filterInversiones(q, type, status, currency) {
  const f = window._invFiltersInv;
  if (q !== undefined) f.q = q.toLowerCase();
  if (type !== undefined) f.type = type;
  if (status !== undefined) f.status = status;
  if (currency !== undefined) f.currency = currency;

  let items = DB.getAll('investments');
  if (f.q) items = items.filter(i => (i.entity||'').toLowerCase().includes(f.q) || (i.description||'').toLowerCase().includes(f.q));
  if (f.type) items = items.filter(i => i.type === f.type);
  if (f.status) items = items.filter(i => i.status === f.status);
  if (f.currency) items = items.filter(i => (i.currency||'ARS') === f.currency);

  const wrap = document.getElementById('inv-table-wrap');
  if (wrap) wrap.innerHTML = _buildInvTable(items);
}

function _buildInvTable(items) {
  if (!items.length) return '<div class="empty-state"><i class="fas fa-chart-line"></i><p>Sin inversiones en este filtro</p><button class="btn btn-primary btn-sm" onclick="openInvForm()"><i class="fas fa-plus"></i> Nueva Inversión</button></div>';
  const today = todayStr();
  items = items.slice().sort((a,b) => (b.start_date||'').localeCompare(a.start_date||''));

  return `<div class="card"><div class="card-body" style="padding:0"><div class="table-wrap">
<table>
  <thead><tr>
    <th>Tipo</th><th>Entidad</th><th>Descripción</th><th>Moneda</th>
    <th class="number-cell">Capital</th><th>TNA %</th>
    <th class="number-cell">Rendim. Esp.</th>
    <th>Inicio</th><th>Vencimiento</th><th>Días rest.</th>
    <th>Estado</th><th></th>
  </tr></thead>
  <tbody>
    ${items.map(inv => {
      const t = INVERSION_TYPES.find(x => x.id === inv.type) || INVERSION_TYPES[INVERSION_TYPES.length-1];
      const st = INVERSION_STATUS[inv.status] || { label: inv.status, cls: 'badge-gray' };
      const expReturn = _invExpReturn(inv);
      const days = _invDaysLeft(inv, today);
      const daysCell = inv.status === 'activo'
        ? (days < 0
          ? `<span style="color:var(--danger);font-weight:700">${Math.abs(days)}d vencido</span>`
          : days <= 7
          ? `<span style="color:var(--warning);font-weight:700">${days}d</span>`
          : `<span style="color:var(--text-muted)">${days}d</span>`)
        : '—';
      return `<tr>
        <td><span style="display:inline-flex;align-items:center;gap:6px;font-size:12px">
          <i class="fas ${t.icon}" style="color:${t.color}"></i>${t.label}
        </span></td>
        <td style="font-weight:600;font-size:13px">${escapeHtml(inv.entity||'')}</td>
        <td style="font-size:12px;color:var(--text-muted)">${escapeHtml(inv.description||'')}</td>
        <td><span style="font-size:11px;font-weight:700;background:var(--bg);padding:2px 6px;border-radius:4px">${inv.currency||'ARS'}</span></td>
        <td class="number-cell"><strong>${fmtMoney(inv.principal||0)}</strong></td>
        <td class="number-cell" style="color:var(--success)">${inv.rate ? inv.rate + '%' : '—'}</td>
        <td class="number-cell" style="color:var(--success);font-weight:600">${expReturn > 0 ? fmtMoney(expReturn) : '—'}</td>
        <td style="font-size:12px">${fmtDate(inv.start_date)}</td>
        <td style="font-size:12px">${fmtDate(inv.maturity_date)}</td>
        <td style="font-size:12px;text-align:right">${daysCell}</td>
        <td><span class="badge ${st.cls}">${st.label}</span></td>
        <td>
          <div class="table-actions">
            ${inv.status === 'activo' || inv.status === 'vencido' ? `<button class="btn-ghost btn btn-sm" title="Renovar" onclick="invRenovar('${inv.id}')"><i class="fas fa-rotate"></i></button>` : ''}
            ${inv.status === 'activo' || inv.status === 'vencido' ? `<button class="btn-ghost btn btn-sm" title="Cobrar" onclick="invCobrar('${inv.id}')"><i class="fas fa-check-circle"></i></button>` : ''}
            <button class="btn-ghost btn btn-sm" title="Editar" onclick="openInvForm('${inv.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn-ghost btn btn-sm danger" title="Eliminar" onclick="deleteInv('${inv.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('')}
  </tbody>
</table>
</div></div></div>`;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function _invExpReturn(inv) {
  if (!inv.rate || !inv.principal) return 0;
  const days = inv.maturity_date && inv.start_date
    ? Math.max(0, Math.round((new Date(inv.maturity_date) - new Date(inv.start_date)) / 86400000))
    : 30;
  return Math.round(inv.principal * (inv.rate / 100) * (days / 365) * 100) / 100;
}

function _invDaysLeft(inv, today) {
  if (!inv.maturity_date) return null;
  return Math.round((new Date(inv.maturity_date) - new Date(today)) / 86400000);
}

// ── FORM ──────────────────────────────────────────────────────────────────────
function openInvForm(id) {
  const inv = id ? DB.getById('investments', id) : null;
  const accounts = DB.getAll('bankAccounts');
  const companies = DB.getAllCompanies();

  openModal(inv ? 'Editar Inversión' : 'Nueva Inversión', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Tipo *</label>
    <select class="form-control" id="inv-type">
      ${INVERSION_TYPES.map(t => `<option value="${t.id}" ${(inv?.type||'plazo_fijo')===t.id?'selected':''}>${t.label}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Entidad (banco / broker) *</label>
    <input class="form-control" id="inv-entity" placeholder="Ej: Banco Galicia" value="${escapeHtml(inv?.entity||'')}">
  </div>
  <div class="form-group full">
    <label class="form-label">Descripción</label>
    <input class="form-control" id="inv-desc" placeholder="Ej: PF 30 días a TNA 97%" value="${escapeHtml(inv?.description||'')}">
  </div>
  <div class="form-group">
    <label class="form-label">Moneda</label>
    <select class="form-control" id="inv-currency">
      <option value="ARS" ${(inv?.currency||'ARS')==='ARS'?'selected':''}>ARS</option>
      <option value="USD" ${inv?.currency==='USD'?'selected':''}>USD</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Empresa / Razón Social</label>
    <select class="form-control" id="inv-company">
      <option value="">Sin empresa asignada</option>
      ${companies.map(c => `<option value="${c.id}" ${inv?.company_id===c.id?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Capital Invertido *</label>
    <input class="form-control" id="inv-principal" type="text" inputmode="decimal"
      value="${numFmt(inv?.principal||0)}"
      onfocus="var n=numParse(this.value);this.value=n?n:''"
      onblur="this.value=numFmt(numParse(this.value));invCalcReturn()"
      oninput="invCalcReturn()"
      style="font-size:15px;font-weight:700">
  </div>
  <div class="form-group">
    <label class="form-label">TNA % <small style="color:var(--text-muted)">(tasa nominal anual)</small></label>
    <input class="form-control" id="inv-rate" type="number" min="0" step="0.01" placeholder="0.00"
      value="${inv?.rate||''}" oninput="invCalcReturn()">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha Inicio *</label>
    <input class="form-control" id="inv-start" type="date" value="${inv?.start_date||todayStr()}" onchange="invCalcReturn()">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha Vencimiento</label>
    <input class="form-control" id="inv-maturity" type="date" value="${inv?.maturity_date||''}" onchange="invCalcReturn()">
  </div>
  <div class="form-group">
    <label class="form-label">Cuenta Bancaria (origen)</label>
    <select class="form-control" id="inv-account">
      <option value="">Sin cuenta vinculada</option>
      ${accounts.map(a => `<option value="${a.id}" ${inv?.account_id===a.id?'selected':''}>${escapeHtml(a.name||a.bank)}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Estado</label>
    <select class="form-control" id="inv-status">
      ${Object.entries(INVERSION_STATUS).map(([k,v]) => `<option value="${k}" ${(inv?.status||'activo')===k?'selected':''}>${v.label}</option>`).join('')}
    </select>
  </div>
</div>
<div id="inv-return-preview" style="background:var(--bg);border-radius:var(--radius-sm);padding:12px 16px;margin-top:4px;font-size:13px;display:flex;gap:24px;flex-wrap:wrap">
  <span>Días: <strong id="inv-days">—</strong></span>
  <span>Rendimiento esperado: <strong id="inv-expected" style="color:var(--success)">—</strong></span>
  <span>Total a vencer: <strong id="inv-total-exp" style="color:var(--primary)">—</strong></span>
</div>
<div class="form-group full mt-2">
  <label class="form-label">Notas</label>
  <textarea class="form-control" id="inv-notes" rows="2">${escapeHtml(inv?.notes||'')}</textarea>
</div>
`, 'modal-md', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveInv('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
  invCalcReturn();
}

function invCalcReturn() {
  const principal = numParse(document.getElementById('inv-principal')?.value);
  const rate      = parseFloat(document.getElementById('inv-rate')?.value) || 0;
  const start     = document.getElementById('inv-start')?.value;
  const maturity  = document.getElementById('inv-maturity')?.value;

  if (!start || !maturity || !principal || !rate) {
    ['inv-days','inv-expected','inv-total-exp'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent='—'; });
    return;
  }
  const days = Math.max(0, Math.round((new Date(maturity) - new Date(start)) / 86400000));
  const ret  = Math.round(principal * (rate / 100) * (days / 365) * 100) / 100;
  const dEl = document.getElementById('inv-days');
  const eEl = document.getElementById('inv-expected');
  const tEl = document.getElementById('inv-total-exp');
  if (dEl) dEl.textContent = days + ' días';
  if (eEl) eEl.textContent = fmtMoney(ret);
  if (tEl) tEl.textContent = fmtMoney(principal + ret);
}

function saveInv(id) {
  const entity    = document.getElementById('inv-entity').value.trim();
  const principal = numParse(document.getElementById('inv-principal').value);
  const start     = document.getElementById('inv-start').value;
  if (!entity) { toast('La entidad es obligatoria', 'error'); return; }
  if (!principal) { toast('El capital es obligatorio', 'error'); return; }
  if (!start) { toast('La fecha de inicio es obligatoria', 'error'); return; }

  const rate     = parseFloat(document.getElementById('inv-rate').value) || 0;
  const maturity = document.getElementById('inv-maturity').value;
  const expReturn = rate && maturity ? _invExpReturn({ principal, rate, start_date: start, maturity_date: maturity }) : 0;

  const data = {
    type:          document.getElementById('inv-type').value,
    entity,
    description:   document.getElementById('inv-desc').value.trim(),
    currency:      document.getElementById('inv-currency').value,
    company_id:    document.getElementById('inv-company').value,
    principal,
    rate,
    start_date:    start,
    maturity_date: maturity,
    expected_return: expReturn,
    account_id:    document.getElementById('inv-account').value,
    status:        document.getElementById('inv-status').value,
    notes:         document.getElementById('inv-notes').value.trim(),
  };

  if (id) {
    DB.update('investments', id, data);
    toast('Inversión actualizada', 'success');
  } else {
    DB.insert('investments', data);
    toast('Inversión registrada', 'success');
  }
  closeModal();
  renderInversiones();
}

// ── ACCIONES RÁPIDAS ──────────────────────────────────────────────────────────
function invRenovar(id) {
  const inv = DB.getById('investments', id);
  if (!inv) return;
  DB.update('investments', id, { status: 'renovado' });
  const expReturn = _invExpReturn(inv);
  openInvForm(); // open blank, then prefill
  setTimeout(function() {
    const fields = {
      'inv-type': inv.type, 'inv-entity': inv.entity, 'inv-desc': inv.description || '',
      'inv-currency': inv.currency || 'ARS', 'inv-company': inv.company_id || '',
      'inv-rate': inv.rate || '', 'inv-account': inv.account_id || '',
    };
    Object.entries(fields).forEach(([id, val]) => { const el=document.getElementById(id); if(el) el.value=val; });
    const pEl = document.getElementById('inv-principal');
    if (pEl) { pEl.value = numFmt(Math.round((inv.principal + expReturn) * 100) / 100); }
    // Set start to today, clear maturity
    const sEl = document.getElementById('inv-start');
    if (sEl) sEl.value = todayStr();
    invCalcReturn();
    toast('Formulario pre-llenado con la renovación — ajustá fechas y guardá', 'info');
  }, 100);
}

function invCobrar(id) {
  const inv = DB.getById('investments', id);
  if (!inv) return;
  const expReturn = _invExpReturn(inv);
  confirmDialog(
    `¿Marcar como cobrada la inversión en <strong>${escapeHtml(inv.entity)}</strong>?<br>` +
    `<small>Capital: ${fmtMoney(inv.principal)} &nbsp;|&nbsp; Rendimiento esperado: ${fmtMoney(expReturn)}</small>`,
    function() {
      DB.update('investments', id, { status: 'cobrado', actual_return: expReturn, closed_date: todayStr() });
      toast('Inversión marcada como cobrada', 'success');
      renderInversiones();
    }
  );
}

function deleteInv(id) {
  confirmDialog('¿Eliminar esta inversión?', function() {
    DB.remove('investments', id);
    toast('Inversión eliminada', 'warning');
    renderInversiones();
  });
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
function exportInversiones() {
  const f = window._invFiltersInv;
  let items = DB.getAll('investments');
  if (f.q) items = items.filter(i => (i.entity||'').toLowerCase().includes(f.q) || (i.description||'').toLowerCase().includes(f.q));
  if (f.type) items = items.filter(i => i.type === f.type);
  if (f.status) items = items.filter(i => i.status === f.status);
  if (f.currency) items = items.filter(i => (i.currency||'ARS') === f.currency);
  const companies = DB.getAllCompanies();
  exportXLSX('inversiones.xlsx',
    ['Tipo','Entidad','Descripción','Moneda','Capital','TNA %','Rendim. Esperado','Inicio','Vencimiento','Estado','Empresa','Notas'],
    items.map(inv => [
      INVERSION_TYPES.find(t=>t.id===inv.type)?.label || inv.type,
      inv.entity || '',
      inv.description || '',
      inv.currency || 'ARS',
      inv.principal || 0,
      inv.rate || 0,
      _invExpReturn(inv),
      inv.start_date, inv.maturity_date,
      INVERSION_STATUS[inv.status]?.label || inv.status,
      companies.find(c=>c.id===inv.company_id)?.name || '',
      inv.notes || ''
    ])
  );
  toast(items.length + ' inversiones exportadas', 'success');
}
