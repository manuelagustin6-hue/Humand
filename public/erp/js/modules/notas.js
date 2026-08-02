/* ===== NOTAS DE CRÉDITO / DÉBITO ===== */

const NOTA_TYPES = {
  nc_rec: { label: 'NC Recibida',  short: 'NC',  dir: 'rec', color: 'green',  icon: 'fa-arrow-down',    desc: 'Nota de Crédito del Proveedor' },
  nd_rec: { label: 'ND Recibida',  short: 'ND',  dir: 'rec', color: 'red',    icon: 'fa-arrow-up',      desc: 'Nota de Débito del Proveedor'  },
  nc_emi: { label: 'NC Emitida',   short: 'NC',  dir: 'emi', color: 'blue',   icon: 'fa-paper-plane',   desc: 'Nota de Crédito al Cliente'    },
  nd_emi: { label: 'ND Emitida',   short: 'ND',  dir: 'emi', color: 'yellow', icon: 'fa-file-invoice',  desc: 'Nota de Débito al Cliente'     }
};

const NOTA_REASONS = [
  'Devolución de mercadería', 'Error en precio', 'Error en cantidad',
  'Descuento acordado', 'Ajuste posterior', 'Diferencia de cambio', 'Otro'
];

const SI_IVA_RATES_NOTA = [
  { id: '21',   label: '21%',    rate: 0.21  },
  { id: '10.5', label: '10.5%', rate: 0.105 },
  { id: '27',   label: '27%',   rate: 0.27  },
  { id: '0',    label: '0%',    rate: 0     },
  { id: 'exc',  label: 'Exento',rate: 0     }
];

// =====================================================================
// MAIN RENDER
// =====================================================================
function renderNotas() {
  if (typeof DB.ensureAllCompaniesLoaded === 'function' && !window._notasLoadedAll) {
    window._notasLoadedAll = true;
    DB.ensureAllCompaniesLoaded().then(function(ok){ if (ok) { try { renderNotas(); } catch(e) {} } });
  }
  const notas = rsScoped('notasCreditoDebito', 'notas');
  const _multiCur = [...new Set(notas.map(n => rsCur(n)))].length > 1;
  const ncRec = notas.filter(n => n.type === 'nc_rec');
  const ndRec = notas.filter(n => n.type === 'nd_rec');
  const ncEmi = notas.filter(n => n.type === 'nc_emi');
  const ndEmi = notas.filter(n => n.type === 'nd_emi');
  const totalRec = [...ncRec, ...ndRec].reduce((s, n) => s + (n.total||0), 0);
  const totalEmi = [...ncEmi, ...ndEmi].reduce((s, n) => s + (n.total||0), 0);

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-eyebrow"><i class="fas fa-file-invoice" style="font-size:14px"></i> Comprobantes</div>
    <div class="page-title">Notas de Crédito / Débito</div>
    <div class="page-subtitle">Gestión de ajustes y correcciones de comprobantes</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="exportNotas()"><i class="fas fa-download"></i> Exportar</button>
    <button class="btn btn-secondary" onclick="openNotaForm('nc_emi')"><i class="fas fa-plus"></i> NC Emitida</button>
    <button class="btn btn-secondary" onclick="openNotaForm('nd_emi')"><i class="fas fa-plus"></i> ND Emitida</button>
    <button class="btn btn-secondary" onclick="openNotaForm('nc_rec')"><i class="fas fa-plus"></i> NC Recibida</button>
    <button class="btn btn-primary"   onclick="openNotaForm('nd_rec')"><i class="fas fa-plus"></i> ND Recibida</button>
  </div>
</div>

${rsSelectorHtml('notas', _multiCur ? '<span style="font-size:11px;color:var(--warning)"><i class="fas fa-triangle-exclamation"></i> Montos en varias monedas — filtrá por razón social para totales exactos</span>' : '')}

<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-arrow-down"></i></div><div>
    <div class="stat-value">${ncRec.length}</div><div class="stat-label">NC Recibidas</div></div></div>
  <div class="stat-card"><div class="stat-icon red"><i class="fas fa-arrow-up"></i></div><div>
    <div class="stat-value">${ndRec.length}</div><div class="stat-label">ND Recibidas</div></div></div>
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-paper-plane"></i></div><div>
    <div class="stat-value">${ncEmi.length}</div><div class="stat-label">NC Emitidas</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-file-invoice"></i></div><div>
    <div class="stat-value">${ndEmi.length}</div><div class="stat-label">ND Emitidas</div></div></div>
</div>

<div id="notas-tabs">
  <div class="tabs">
    <button class="tab-btn" data-tab="tab-notas-rec">Recibidas (Proveedores)</button>
    <button class="tab-btn" data-tab="tab-notas-emi">Emitidas (Clientes)</button>
  </div>
  <div id="tab-notas-rec" class="tab-content">${renderNotasTable([...ncRec,...ndRec], 'rec')}</div>
  <div id="tab-notas-emi" class="tab-content">${renderNotasTable([...ncEmi,...ndEmi], 'emi')}</div>
</div>
`;
  initTabs('notas-tabs');
}

// =====================================================================
// TABLE
// =====================================================================
function renderNotasTable(notas, dir) {
  const projects  = (typeof DB.getAllConsolidated === 'function') ? DB.getAllConsolidated('projects') : DB.getAll('projects');
  const isRec     = dir === 'rec';
  const showCompany = !rsGet('notas') && [...new Set(notas.map(n => n._company_name || ''))].filter(Boolean).length > 1;

  const addBtns = isRec
    ? `<button class="btn btn-secondary btn-sm" onclick="openNotaForm('nc_rec')"><i class="fas fa-plus"></i> NC</button>
       <button class="btn btn-primary btn-sm"   onclick="openNotaForm('nd_rec')"><i class="fas fa-plus"></i> ND</button>`
    : `<button class="btn btn-secondary btn-sm" onclick="openNotaForm('nc_emi')"><i class="fas fa-plus"></i> NC</button>
       <button class="btn btn-primary btn-sm"   onclick="openNotaForm('nd_emi')"><i class="fas fa-plus"></i> ND</button>`;

  const filterBar = `<div class="filter-bar" style="margin-bottom:12px">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar nota, ${isRec?'proveedor':'cliente'}..." oninput="filterNotasTable('${dir}',this.value)">
  </div>
  <select class="form-control" style="width:140px" onchange="filterNotasTable('${dir}',undefined,this.value)">
    <option value="">Tipo: Todos</option>
    <option value="nc">Solo NC</option>
    <option value="nd">Solo ND</option>
  </select>
  <select class="form-control" style="width:140px" onchange="filterNotasTable('${dir}',undefined,undefined,this.value)">
    <option value="">Estado: Todos</option>
    <option value="draft">Borrador</option>
    <option value="confirmed">Confirmada</option>
  </select>
  <div style="margin-left:auto;display:flex;gap:8px">${addBtns}</div>
</div>`;

  if (!notas.length) return filterBar + `<div class="empty-state"><i class="fas fa-file-invoice"></i><p>Sin notas registradas.</p></div>`;

  const rows = [...notas].sort((a,b)=>b.date.localeCompare(a.date)).map(n => {
    const nt    = NOTA_TYPES[n.type] || {};
    const proj  = projects.find(p=>p.id===n.project_id);
    const refLink = n.ref_doc_number
      ? `<span class="badge badge-gray" style="font-size:10px">${n.ref_doc_number}</span>`
      : '<span style="color:var(--text-muted)">-</span>';
    const _cur = rsCur(n);
    return `<tr class="nota-row" data-dir="${dir}" data-type="${n.type.startsWith('nc')?'nc':'nd'}" data-status="${n.status||'draft'}"
               data-q="${(n.number||'').toLowerCase()} ${(n.entity_name||'').toLowerCase()}">
      <td><strong>${n.number||'-'}</strong></td>
      <td><span class="badge badge-${nt.color}"><i class="fas ${nt.icon}"></i> ${nt.label}</span></td>
      ${showCompany ? `<td style="font-size:11px;color:#64748b">${escapeHtml(n._company_name||'')}</td>` : ''}
      <td>${n.entity_name||'-'}</td>
      <td style="font-size:11px">${proj?.name||'-'}</td>
      <td>${fmtDate(n.date)}</td>
      <td style="font-size:11px">${n.reason||'-'}</td>
      <td>${refLink}</td>
      <td class="text-right">${fmtMoney(n.subtotal||0, _cur)}</td>
      <td class="text-right">${fmtMoney(n.iva||0, _cur)}</td>
      <td class="text-right"><strong>${fmtMoney(n.total||0, _cur)}</strong></td>
      <td>${n.status==='confirmed'
        ? '<span class="badge badge-green">Confirmada</span>'
        : '<span class="badge badge-gray">Borrador</span>'}</td>
      <td>
        <button class="btn btn-xs btn-secondary" onclick="viewNota('${n.id}')"><i class="fas fa-eye"></i></button>
        ${n.status!=='confirmed' ? `<button class="btn btn-xs btn-secondary" onclick="openNotaForm('${n.type}','${n.id}')"><i class="fas fa-edit"></i></button>` : ''}
        ${n.status!=='confirmed' ? `<button class="btn btn-xs btn-primary"   onclick="confirmNota('${n.id}')"><i class="fas fa-check"></i> Confirmar</button>` : ''}
        ${n.status!=='confirmed' ? `<button class="btn btn-xs btn-danger"    onclick="deleteNota('${n.id}')"><i class="fas fa-trash"></i></button>` : ''}
      </td>
    </tr>`;
  }).join('');

  return filterBar + `<div class="card"><div class="card-body" style="padding:0">
<table id="notas-table-${dir}"><thead><tr>
  <th>Número</th><th>Tipo</th>${showCompany?'<th>Razón Social</th>':''}<th>${isRec?'Proveedor':'Cliente'}</th><th>Proyecto</th>
  <th>Fecha</th><th>Motivo</th><th>Ref.</th>
  <th class="text-right">Subtotal</th><th class="text-right">IVA</th><th class="text-right">Total</th>
  <th>Estado</th><th>Acciones</th>
</tr></thead><tbody id="notas-body-${dir}">${rows}</tbody></table>
</div></div>`;
}

window._notaFilters = { rec: { q:'', type:'', status:'' }, emi: { q:'', type:'', status:'' } };
function filterNotasTable(dir, q, type, status) {
  const f = window._notaFilters[dir];
  if (q      !== undefined) f.q      = (q||'').toLowerCase();
  if (type   !== undefined) f.type   = type||'';
  if (status !== undefined) f.status = status||'';
  document.querySelectorAll(`#notas-body-${dir} tr.nota-row`).forEach(tr => {
    const mQ = !f.q      || tr.dataset.q.includes(f.q);
    const mT = !f.type   || tr.dataset.type === f.type;
    const mS = !f.status || tr.dataset.status === f.status;
    tr.style.display = (mQ && mT && mS) ? '' : 'none';
  });
}

// =====================================================================
// ITEM MANAGEMENT (in-memory during form editing)
// =====================================================================
window._notaItems = [];

function notaAddItem() {
  window._notaItems.push({ description:'', qty:1, unit_price:0, total:0 });
  notaRebuildItemsTable();
}

function notaRemoveItem(i) {
  window._notaItems.splice(i, 1);
  notaRebuildItemsTable();
  notaRecalc();
}

function notaUpdateItem(i, field, val) {
  window._notaItems[i][field] = field === 'description' ? val : (parseFloat(val)||0);
  if (field === 'qty' || field === 'unit_price') {
    window._notaItems[i].total = (window._notaItems[i].qty||0) * (window._notaItems[i].unit_price||0);
  }
  notaRebuildItemsTable();
  notaRecalc();
}

function notaRebuildItemsTable() {
  const tbody = document.getElementById('nota-items-body');
  if (!tbody) return;
  tbody.innerHTML = window._notaItems.map((it, i) => `
<tr>
  <td><input class="form-control form-control-sm" value="${it.description||''}"
    oninput="notaUpdateItem(${i},'description',this.value)" placeholder="Descripción..."></td>
  <td style="width:90px"><input class="form-control form-control-sm text-right" type="number" min="0" step="0.001"
    value="${it.qty}" onchange="notaUpdateItem(${i},'qty',this.value)"></td>
  <td style="width:130px"><input class="form-control form-control-sm text-right" type="number" min="0" step="0.01"
    value="${it.unit_price}" onchange="notaUpdateItem(${i},'unit_price',this.value)"></td>
  <td class="text-right" style="width:120px;font-weight:600">${fmtMoney(it.total||0)}</td>
  <td style="width:36px"><button class="btn btn-xs btn-danger" onclick="notaRemoveItem(${i})"><i class="fas fa-times"></i></button></td>
</tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:12px">Sin ítems. Use + Agregar.</td></tr>';
}

function notaRecalc() {
  const subtotal = window._notaItems.reduce((s, it) => s + (it.total||0), 0);
  const ivaRateEl = document.getElementById('nota-iva-rate');
  const ivaRate   = ivaRateEl ? (parseFloat(ivaRateEl.value)||0) : 0;
  const iva       = subtotal * ivaRate;
  const total     = subtotal + iva;

  const elSub = document.getElementById('nota-sub-display');
  const elIva = document.getElementById('nota-iva-display');
  const elTot = document.getElementById('nota-tot-display');
  if (elSub) elSub.textContent = fmtMoney(subtotal);
  if (elIva) elIva.textContent = fmtMoney(iva);
  if (elTot) elTot.textContent = fmtMoney(total);
}

// =====================================================================
// FORM: NOTA
// =====================================================================
function openNotaForm(type, id) {
  const nt   = NOTA_TYPES[type];
  if (!nt) { toast('Tipo de nota inválido', 'error'); return; }

  if (id && typeof rsEnsureCompany === 'function') rsEnsureCompany('notasCreditoDebito', id);
  const nota = id ? DB.getById('notasCreditoDebito', id) : null;
  const isRec = nt.dir === 'rec';
  const suppliers = DB.getAll('suppliers');
  const clients   = DB.getAll('clients');
  const projects  = DB.getAll('projects');

  // Reference docs (invoices or SI)
  const refDocs = isRec
    ? (DB.getAll('supplierInvoices') || []).map(si => ({ id: si.id, label: `SI ${si.number||si.id} — ${si.supplier_name||''}` }))
    : (DB.getAll('invoices') || []).map(inv => ({ id: inv.id, label: `Fact. ${inv.number} — ${inv.client_name||''}` }));

  // Populate items
  window._notaItems = nota?.items ? nota.items.map(it=>({...it})) : [{ description:'', qty:1, unit_price:0, total:0 }];

  const entityOpts = isRec
    ? suppliers.map(s=>`<option value="${s.id}" data-name="${s.name}" ${nota?.entity_id===s.id?'selected':''}>${s.name}</option>`).join('')
    : clients.map(c=>`<option value="${c.id}" data-name="${c.name||c.business_name}" ${nota?.entity_id===c.id?'selected':''}>${c.name||c.business_name}</option>`).join('');

  const projOpts = projects.map(p=>`<option value="${p.id}" ${nota?.project_id===p.id?'selected':''}>${p.name}</option>`).join('');

  const refOpts = `<option value="">Sin comprobante de referencia</option>`
    + refDocs.map(r=>`<option value="${r.id}" ${nota?.ref_doc_id===r.id?'selected':''}>${r.label}</option>`).join('');

  const ivaRateOpts = SI_IVA_RATES_NOTA.map(r =>
    `<option value="${r.rate}" ${nota?.iva_rate===r.rate?'selected':r.rate===0.21?'selected':''}>${r.label}</option>`
  ).join('');

  const reasonOpts = NOTA_REASONS.map(r=>
    `<option ${nota?.reason===r?'selected':''}>${r}</option>`
  ).join('');

  const sub = nota?.subtotal || 0;
  const iva = nota?.iva      || 0;
  const tot = nota?.total    || 0;

  const body = `
<div class="form-grid" style="grid-template-columns:1fr 1fr">
  <div class="form-group">
    <label class="form-label">Número *</label>
    <input class="form-control" id="nota-number" value="${nota?.number||''}" placeholder="NC-0001 / ND-0001">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha *</label>
    <input class="form-control" id="nota-date" type="date" value="${nota?.date||todayStr()}">
  </div>
  <div class="form-group">
    <label class="form-label">${isRec?'Proveedor':'Cliente'} *</label>
    <select class="form-control" id="nota-entity">
      <option value="">Seleccionar...</option>${entityOpts}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Proyecto</label>
    <select class="form-control" id="nota-project">
      <option value="">Sin proyecto</option>${projOpts}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Motivo</label>
    <select class="form-control" id="nota-reason">${reasonOpts}</select>
  </div>
  <div class="form-group">
    <label class="form-label">Comprobante de Referencia</label>
    <select class="form-control" id="nota-ref">${refOpts}</select>
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">Notas / Observaciones</label>
    <textarea class="form-control" id="nota-notes" rows="2">${nota?.notes||''}</textarea>
  </div>
</div>

<div style="margin:16px 0 8px">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <strong>Ítems de la Nota</strong>
    <button class="btn btn-secondary btn-sm" onclick="notaAddItem()"><i class="fas fa-plus"></i> Agregar ítem</button>
  </div>
  <div class="table-wrap" style="max-height:220px;overflow-y:auto">
    <table style="table-layout:fixed;width:100%">
      <thead><tr>
        <th>Descripción</th><th style="width:90px" class="text-right">Cantidad</th>
        <th style="width:130px" class="text-right">Precio Unit.</th>
        <th style="width:120px" class="text-right">Total</th>
        <th style="width:36px"></th>
      </tr></thead>
      <tbody id="nota-items-body"></tbody>
    </table>
  </div>
</div>

<div style="display:flex;justify-content:flex-end">
  <div style="min-width:260px;background:var(--bg-subtle);border-radius:8px;padding:12px;border:1px solid var(--border)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:13px">Tasa IVA:</span>
      <select class="form-control" id="nota-iva-rate" style="width:100px" onchange="notaRecalc()">${ivaRateOpts}</select>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-top:1px solid var(--border)">
      <span>Subtotal</span><strong id="nota-sub-display">${fmtMoney(sub)}</strong>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0">
      <span>IVA</span><strong id="nota-iva-display">${fmtMoney(iva)}</strong>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;padding:6px 0;border-top:2px solid var(--primary);color:var(--primary)">
      <span>TOTAL ${nt.short}</span><span id="nota-tot-display">${fmtMoney(tot)}</span>
    </div>
  </div>
</div>`;

  openModal(`${nt.desc}${nota?' — Editar':''}`, body, 'xl',
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-secondary" onclick="saveNota('${type}','${id||''}','draft')"><i class="fas fa-save"></i> Guardar Borrador</button>
     <button class="btn btn-primary"   onclick="saveNota('${type}','${id||''}','confirmed')"><i class="fas fa-check"></i> Confirmar</button>`);

  // Populate table after modal is rendered
  setTimeout(() => { notaRebuildItemsTable(); notaRecalc(); }, 30);
}

// =====================================================================
// SAVE & CONFIRM
// =====================================================================
function saveNota(type, id, status) {
  const number = document.getElementById('nota-number').value.trim();
  const date   = document.getElementById('nota-date').value;
  const entEl  = document.getElementById('nota-entity');
  const entityId   = entEl.value;
  const entityName = entEl.options[entEl.selectedIndex]?.dataset?.name || entEl.options[entEl.selectedIndex]?.text || '';
  const projectId  = document.getElementById('nota-project').value;
  const reason     = document.getElementById('nota-reason').value;
  const refDocEl   = document.getElementById('nota-ref');
  const refDocId   = refDocEl.value;
  const refDocNumber = refDocEl.options[refDocEl.selectedIndex]?.text||'';
  const ivaRate    = parseFloat(document.getElementById('nota-iva-rate').value)||0;
  const notes      = document.getElementById('nota-notes').value.trim();

  if (!number)   { toast('El número es obligatorio', 'error'); return; }
  if (!date)     { toast('La fecha es obligatoria', 'error'); return; }
  if (!entityId) { toast(NOTA_TYPES[type].dir==='rec'?'Seleccione un proveedor':'Seleccione un cliente', 'error'); return; }

  const items    = window._notaItems.filter(it => it.description || it.total > 0);
  const subtotal = items.reduce((s, it) => s + (it.total||0), 0);
  const iva      = subtotal * ivaRate;
  const total    = subtotal + iva;

  if (items.length === 0) { toast('Agregue al menos un ítem', 'error'); return; }

  const data = {
    type, number, date, status,
    entity_id: entityId,
    entity_name: entityName,
    project_id: projectId,
    reason,
    ref_doc_id: refDocId,
    ref_doc_number: refDocId ? refDocNumber.split('—')[0].trim() : '',
    ref_doc_type: NOTA_TYPES[type].dir === 'rec' ? 'si' : 'invoice',
    items: items.map(it => ({ ...it })),
    subtotal, iva_rate: ivaRate, iva, total,
    notes
  };

  let nota;
  if (id) {
    nota = DB.update('notasCreditoDebito', id, data);
  } else {
    nota = DB.insert('notasCreditoDebito', data);
  }

  if (status === 'confirmed') {
    _notaGenerateJournalEntry(nota || DB.getById('notasCreditoDebito', id));
  }

  toast(status === 'confirmed' ? 'Nota confirmada y asiento generado' : 'Nota guardada como borrador', 'success');
  closeModal();
  renderNotas();
}

function confirmNota(id) {
  if (typeof rsEnsureCompany === 'function') rsEnsureCompany('notasCreditoDebito', id);
  const nota = DB.getById('notasCreditoDebito', id);
  if (!nota) return;
  confirmDialog(`¿Confirmar ${NOTA_TYPES[nota.type]?.label||'nota'} N° ${nota.number}? Se generará el asiento contable.`, function() {
    DB.update('notasCreditoDebito', id, { status: 'confirmed' });
    _notaGenerateJournalEntry(DB.getById('notasCreditoDebito', id));
    toast('Nota confirmada y asiento generado', 'success');
    renderNotas();
  });
}

function deleteNota(id) {
  if (typeof rsEnsureCompany === 'function') rsEnsureCompany('notasCreditoDebito', id);
  confirmDialog('¿Eliminar esta nota? Esta acción no se puede deshacer.', function() {
    DB.remove('notasCreditoDebito', id);
    toast('Nota eliminada', 'success');
    renderNotas();
  });
}

// =====================================================================
// JOURNAL ENTRY
// =====================================================================
function _notaGenerateJournalEntry(nota) {
  if (!nota) return;
  const nt    = NOTA_TYPES[nota.type];
  const isRec = nt.dir === 'rec';
  // NC reverses a purchase/sale; ND is same direction as purchase/sale
  const isNC  = nota.type.startsWith('nc');

  // For recibidas: purchase direction base (AP credit, expense debit)
  // NC Rec reverses → AP debit, expense credit (reduces what we owe)
  // ND Rec same dir  → AP credit, expense debit (increases what we owe)
  // For emitidas: sale direction base (AR debit, revenue credit)
  // NC Emi reverses → AR credit, revenue debit (reduces what client owes)
  // ND Emi same dir  → AR debit, revenue credit

  // Map to existing AJ operation types
  let opType;
  if (nota.type === 'nc_rec') opType = 'nc_proveedor';
  else if (nota.type === 'nd_rec') opType = 'nd_proveedor';
  else if (nota.type === 'nc_emi') opType = 'nc_emitida';
  else opType = 'nd_emitida';

  try {
    autoJournalEntry(opType, nota.total, nota.date,
      `${nt.label} N° ${nota.number} — ${nota.entity_name}`,
      `${nota.reason||''}${nota.ref_doc_number?' (ref: '+nota.ref_doc_number+')':''}`,
      { skipIfNoConfig: true }
    );
  } catch(e) {
    // No journal config for this type — silently skip
  }
}

// =====================================================================
// VIEW
// =====================================================================
function viewNota(id) {
  if (typeof rsEnsureCompany === 'function') rsEnsureCompany('notasCreditoDebito', id);
  const nota = DB.getById('notasCreditoDebito', id);
  if (!nota) return;
  const nt   = NOTA_TYPES[nota.type] || {};
  const proj = DB.getById('projects', nota.project_id);

  const itemRows = (nota.items||[]).map(it => `<tr>
    <td>${it.description||'-'}</td>
    <td class="text-right">${fmtNum(it.qty||it.quantity||1)}</td>
    <td class="text-right">${fmtMoney(it.unit_price||0)}</td>
    <td class="text-right"><strong>${fmtMoney(it.total||0)}</strong></td>
  </tr>`).join('');

  const body = `
<div class="invoice-preview">
  <div class="invoice-logo-row">
    <div>
      <div style="font-size:20px;font-weight:800;color:var(--primary)">${brandName()}</div>
      <div style="font-size:12px;color:var(--text-muted)">${nt.desc}</div>
    </div>
    <div class="invoice-number-box">
      <div style="font-size:11px;font-weight:600;color:var(--text-muted)">${nt.label?.toUpperCase()}</div>
      <div class="num">${nota.number}</div>
      <div style="font-size:12px">Fecha: ${fmtDate(nota.date)}</div>
      ${nota.ref_doc_number?`<div style="font-size:11px;color:var(--text-muted)">Ref.: ${nota.ref_doc_number}</div>`:''}
      <div style="margin-top:6px">
        <span class="badge badge-${nota.status==='confirmed'?'green':'gray'}">
          ${nota.status==='confirmed'?'Confirmada':'Borrador'}
        </span>
      </div>
    </div>
  </div>

  <div class="invoice-parties">
    <div class="invoice-party-box">
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px">
        ${nt.dir==='rec'?'PROVEEDOR':'CLIENTE'}
      </div>
      <p><strong>${nota.entity_name}</strong>${proj?`<br>Proyecto: ${proj.name}`:''}</p>
    </div>
    <div class="invoice-party-box">
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px">MOTIVO</div>
      <p>${nota.reason||'-'}${nota.notes?`<br><span style="color:var(--text-muted);font-size:12px">${nota.notes}</span>`:''}</p>
    </div>
  </div>

  <div class="table-wrap" style="margin-bottom:16px">
    <table><thead><tr>
      <th>Descripción</th><th class="text-right">Cant.</th>
      <th class="text-right">P.Unit.</th><th class="text-right">Total</th>
    </tr></thead><tbody>${itemRows}</tbody></table>
  </div>

  <div style="display:flex;justify-content:flex-end">
    <div class="invoice-totals">
      <div class="invoice-total-row"><span>Subtotal</span><span>${fmtMoney(nota.subtotal||0)}</span></div>
      <div class="invoice-total-row"><span>IVA (${Math.round((nota.iva_rate||0)*100)}%)</span><span>${fmtMoney(nota.iva||0)}</span></div>
      <div class="invoice-total-row grand"><span>TOTAL</span><span>${fmtMoney(nota.total||0)}</span></div>
    </div>
  </div>
</div>`;

  openModal(`${nt.label} — ${nota.number}`, body, 'lg',
    `${nota.status!=='confirmed'
      ? `<button class="btn btn-primary" onclick="closeModal();confirmNota('${nota.id}')"><i class="fas fa-check"></i> Confirmar</button>`
      : ''}
     <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`);
}

// =====================================================================
// EXPORT
// =====================================================================
function exportNotas() {
  const notas = DB.getAll('notasCreditoDebito');
  exportXLSX('notas_credito_debito',
    ['Número','Tipo','Entidad','Proyecto','Fecha','Motivo','Ref.','Subtotal','IVA','Total','Estado'],
    notas.map(n=>[
      n.number, NOTA_TYPES[n.type]?.label||n.type, n.entity_name||'',
      DB.getById('projects',n.project_id)?.name||'',
      n.date, n.reason||'', n.ref_doc_number||'',
      n.subtotal||0, n.iva||0, n.total||0, n.status||'draft'
    ])
  );
}
