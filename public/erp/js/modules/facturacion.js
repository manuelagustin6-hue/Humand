/* ===== FACTURACIÓN ===== */
function renderFacturacion() {
  const invoices = DB.getAll('invoices');
  const projects = DB.getAll('projects');
  const collections = DB.getAll('collections');

  const totalBilled = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
  const totalPending = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + (i.total || 0), 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total || 0), 0);

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Facturacion</div>
    <div class="page-subtitle">Gestion de facturas, certificaciones y comprobantes</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="exportInvoices()"><i class="fas fa-download"></i> Exportar</button>
    <button class="btn btn-secondary" onclick="openAfipSettings()" title="Configurar TusFacturas.app / ARCA"><i class="fas fa-stamp"></i> Config. AFIP</button>
    <button class="btn btn-primary" onclick="openInvoiceForm()"><i class="fas fa-plus"></i> Nueva Factura</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-file-invoice-dollar"></i></div><div>
    <div class="stat-value">${fmtMoney(totalBilled)}</div><div class="stat-label">Facturado Total</div>
    <div class="stat-delta up">${invoices.length} facturas</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div><div>
    <div class="stat-value">${fmtMoney(totalPaid)}</div><div class="stat-label">Cobradas</div>
    <div class="stat-delta up">${invoices.filter(i=>i.status==='paid').length} facturas</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-clock"></i></div><div>
    <div class="stat-value">${fmtMoney(totalPending)}</div><div class="stat-label">Pendientes de Cobro</div>
    <div class="stat-delta">${invoices.filter(i=>i.status==='sent').length} facturas</div></div></div>
  <div class="stat-card"><div class="stat-icon red"><i class="fas fa-exclamation-circle"></i></div><div>
    <div class="stat-value">${fmtMoney(totalOverdue)}</div><div class="stat-label">Vencidas</div>
    <div class="stat-delta down">${invoices.filter(i=>i.status==='overdue').length} facturas</div></div></div>
</div>

<div class="filter-bar mt-2">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar factura, cliente..." oninput="filterInvoices(this.value)">
  </div>
  <select class="form-control" style="width:140px" onchange="filterInvoices(undefined, this.value)">
    <option value="">Todos los estados</option>
    <option value="draft">Borrador</option>
    <option value="sent">Enviada</option>
    <option value="paid">Cobrada</option>
    <option value="overdue">Vencida</option>
    <option value="cancelled">Cancelada</option>
  </select>
  <select class="form-control" style="width:180px" onchange="filterInvoices(undefined, undefined, this.value)">
    <option value="">Todos los proyectos</option>
    ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
  </select>
  <select class="form-control" style="width:160px" onchange="filterInvoices(undefined, undefined, undefined, this.value)">
    <option value="">Todo el período</option>
    <option value="month">Este mes</option>
    <option value="prev_month">Mes anterior</option>
    <option value="quarter">Este trimestre</option>
    <option value="year">Este año</option>
  </select>
</div>

<div class="card">
  <div class="card-body" style="padding:0">
    <div class="table-wrap" id="inv-table-wrap">
      ${buildInvoiceRows(invoices, projects, collections)}
    </div>
  </div>
</div>
  `;

  window._invFilters = { q: '', status: '', project: '' };
}

function buildInvoiceRows(invoices, projects, collections) {
  if (!invoices.length) return `<div class="empty-state"><i class="fas fa-file-invoice"></i><p>No hay facturas</p></div>`;
  const sourceLabels = { manual: 'Manual', certificacion: 'Certificacion', oc: 'Desde OC' };
  return `<table class="rcard"><thead><tr>
    <th>Numero</th><th>Tipo</th><th>Origen</th><th>Proyecto</th><th>Cliente</th><th>Fecha</th><th>Vencimiento</th>
    <th class="text-right">Subtotal</th><th class="text-right">IVA</th><th class="text-right">Total</th>
    <th>Estado</th><th style="text-align:center">CAE / ARCA</th><th>Acciones</th>
  </tr></thead>
  <tbody>
  ${invoices.map(inv => {
    const proj = projects.find(p => p.id === inv.project_id);
    const overdue = isOverdue(inv.due_date) && inv.status !== 'paid';
    const src = inv.source || 'manual';
    const srcBadge = src === 'certificacion'
      ? '<span class="badge badge-green" style="font-size:10px">Certif.</span>'
      : src === 'oc'
      ? '<span class="badge badge-blue" style="font-size:10px">OC</span>'
      : '<span class="badge badge-gray" style="font-size:10px">Manual</span>';
    return `<tr>
      <td><strong>${inv.number}</strong></td>
      <td><span class="badge badge-cyan">Fact. ${inv.type}</span></td>
      <td>${srcBadge}</td>
      <td>${proj ? proj.name : '-'}</td>
      <td>${inv.client_name}</td>
      <td>${fmtDate(inv.date)}</td>
      <td class="${overdue ? 'text-danger fw-bold' : ''}">${fmtDate(inv.due_date)}</td>
      <td class="number-cell text-right">${fmtMoney(inv.subtotal)}</td>
      <td class="number-cell text-right">${fmtMoney(inv.tax)}</td>
      <td class="number-cell text-right"><strong>${fmtMoney(inv.total)}</strong></td>
      <td>${statusBadge(inv.status)}</td>
      <td style="text-align:center">${(typeof afipCaeBadge === 'function') ? afipCaeBadge(inv) : '—'}</td>
      <td><div class="table-actions">
        <button class="btn-ghost btn btn-sm" onclick="viewInvoice('${inv.id}')"><i class="fas fa-eye"></i></button>
        <button class="btn-ghost btn btn-sm" onclick="openInvoiceForm('${inv.id}')"><i class="fas fa-edit"></i></button>
        ${inv.status !== 'paid' ? `<button class="btn btn-sm btn-success" onclick="markInvoicePaid('${inv.id}')"><i class="fas fa-check"></i></button>` : ''}
        <button class="btn-ghost btn btn-sm danger" onclick="deleteInvoice('${inv.id}')"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('')}
  </tbody></table>`;
}

window._invFilters = { q: '', status: '', project: '', period: '' };
function filterInvoices(q, status, project, period) {
  if (q !== undefined) window._invFilters.q = q.toLowerCase();
  if (status !== undefined) window._invFilters.status = status;
  if (project !== undefined) window._invFilters.project = project;
  if (period !== undefined) window._invFilters.period = period;
  let invs = DB.getAll('invoices');
  const f = window._invFilters;
  if (f.q) invs = invs.filter(i => (i.number||'').toLowerCase().includes(f.q) || (i.client_name||'').toLowerCase().includes(f.q));
  if (f.status) invs = invs.filter(i => i.status === f.status);
  if (f.project) invs = invs.filter(i => i.project_id === f.project);
  if (f.period) { const r = _periodRange(f.period); invs = invs.filter(i => i.date && i.date >= r.from && i.date <= r.to); }
  const wrap = document.getElementById('inv-table-wrap');
  if (wrap) wrap.innerHTML = buildInvoiceRows(invs, DB.getAll('projects'), DB.getAll('collections'));
}

function viewInvoice(id) {
  const inv = DB.getById('invoices', id);
  if (!inv) { toast('Factura no encontrada', 'error'); return; }
  const proj = DB.getById('projects', inv.project_id);
  const collections = DB.getAll('collections').filter(c => c.invoice_id === id);
  const totalCollected = collections.reduce((s,c) => s+c.amount, 0);
  const imputacion = inv.imputacion || [];

  const cp = (typeof getCompanyProfile === 'function') ? getCompanyProfile() : {};
  const cpName = cp.name || 'Mi Empresa';
  const cpCuit = cp.cuit ? 'CUIT: ' + cp.cuit : '';
  const cpAddr = [cp.address, cp.city].filter(Boolean).join(' — ');
  const cpIva  = cp.iva_cond ? 'IVA: ' + ({RI:'Resp. Inscripto',MO:'Monotributista',EX:'Exento',NR:'No Resp.'}[cp.iva_cond] || cp.iva_cond) : '';
  const cpIibb = cp.iibb ? 'IIBB: ' + cp.iibb : '';

  openModal(`Factura ${inv.number}`, `
<div class="invoice-preview">
  <div class="invoice-logo-row">
    <div>
      <div style="font-size:22px;font-weight:800;color:var(--primary)">${escapeHtml(cpName)}</div>
      <div style="font-size:12px;color:var(--text-muted)">${escapeHtml(cpCuit)}</div>
    </div>
    <div class="invoice-number-box">
      <div style="font-size:11px;color:var(--text-muted);font-weight:600">FACTURA ${inv.type}</div>
      <div class="num">${inv.number}</div>
      <div style="font-size:12px">Fecha: ${fmtDate(inv.date)}</div>
      <div style="font-size:12px">Vence: ${fmtDate(inv.due_date)}</div>
      <div style="margin-top:6px">${statusBadge(inv.status)}</div>
    </div>
  </div>

  <div class="invoice-parties">
    <div class="invoice-party-box">
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px">EMISOR</div>
      <p><strong>${escapeHtml(cpName)}</strong>${cpCuit ? '<br>'+escapeHtml(cpCuit) : ''}${cpAddr ? '<br>'+escapeHtml(cpAddr) : ''}${cpIva ? '<br>'+escapeHtml(cpIva) : ''}${cpIibb ? '<br>'+escapeHtml(cpIibb) : ''}${proj ? '<br>Proyecto: '+escapeHtml(proj.name) : ''}</p>
    </div>
    <div class="invoice-party-box">
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px">RECEPTOR</div>
      <p><strong>${escapeHtml(inv.client_name || '')}</strong><br>CUIT: ${escapeHtml(inv.client_cuit || '')}<br>${escapeHtml(inv.client_address || '')}</p>
    </div>
  </div>

  <div class="table-wrap" style="margin-bottom:16px">
  <table><thead><tr><th>Descripcion</th><th class="text-center">Unidad</th><th class="text-right">Cantidad</th><th class="text-right">P.Unit.</th><th class="text-right">Total</th></tr></thead>
  <tbody>
  ${(inv.items || []).map(it => `<tr><td>${it.description}</td><td class="text-center">${it.unit}</td>
    <td class="number-cell text-right">${fmtNum(it.quantity)}</td>
    <td class="number-cell text-right">${fmtMoney(it.unit_price)}</td>
    <td class="number-cell text-right"><strong>${fmtMoney(it.total)}</strong></td></tr>`).join('')}
  </tbody></table>
  </div>

  <div style="display:flex;justify-content:flex-end">
    <div class="invoice-totals">
      <div class="invoice-total-row"><span>Subtotal</span><span>${fmtMoney(inv.subtotal)}</span></div>
      <div class="invoice-total-row"><span>IVA (${((inv.iva_rate != null ? inv.iva_rate : (inv.subtotal ? Math.round(inv.tax/inv.subtotal*1000)/10 : 21)))}%)</span><span>${fmtMoney(inv.tax)}</span></div>
      <div class="invoice-total-row grand"><span>TOTAL</span><span>${fmtMoney(inv.total)}</span></div>
    </div>
  </div>

  ${inv.notes ? `<div style="margin-top:12px;font-size:12px;color:var(--text-muted)"><strong>Notas:</strong> ${inv.notes}</div>` : ''}
  ${(typeof afipCaeBlock === 'function') ? afipCaeBlock(inv) : ''}
</div>

${imputacion.length ? `
<div class="divider"></div>
<div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Imputacion Contable</div>
<table style="font-size:12px"><thead><tr><th>Rubro</th><th>Cuenta Contable</th><th class="text-right">Importe</th></tr></thead>
<tbody>
${imputacion.map(l => {
  const rb = l.rubro_id ? DB.getById('rubros', l.rubro_id) : null;
  return `<tr><td>${rb ? `<b>${rb.code}</b> ${rb.name}` : '—'}</td><td>${l.account_code ? `<b>${l.account_code}</b> ${l.account_name||''}` : '—'}</td><td class="text-right">${fmtMoney(l.amount||0)}</td></tr>`;
}).join('')}
<tr style="border-top:2px solid var(--border)"><td colspan="2"><strong>Total imputado</strong></td><td class="text-right"><strong>${fmtMoney(imputacion.reduce((s,l)=>s+(l.amount||0),0))}</strong></td></tr>
</tbody></table>
` : ''}

${collections.length ? `
<div class="divider"></div>
<div class="form-label">Pagos registrados</div>
<table style="font-size:12px"><thead><tr><th>Fecha</th><th>Metodo</th><th>Ref.</th><th>Importe</th></tr></thead>
<tbody>${collections.map(c => `<tr><td>${fmtDate(c.date)}</td><td>${c.method}</td><td>${c.reference}</td><td>${fmtMoney(c.amount)}</td></tr>`).join('')}
<tr class="total-row"><td colspan="3">Total cobrado</td><td>${fmtMoney(totalCollected)}</td></tr>
<tr><td colspan="3">Saldo pendiente</td><td class="${inv.total - totalCollected > 0 ? 'text-danger' : 'text-success'}">${fmtMoney(inv.total - totalCollected)}</td></tr>
</tbody></table>` : ''}
`, 'modal-lg',
  `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
   <button class="btn btn-secondary" onclick="window.print()"><i class="fas fa-print"></i> Imprimir</button>
   ${inv.status !== 'paid' ? `<button class="btn btn-success" onclick="markInvoicePaid('${inv.id}'); closeModal()"><i class="fas fa-check"></i> Marcar Cobrada</button>` : ''}`);
}

function openInvoiceForm(id = null) {
  const inv = id ? DB.getById('invoices', id) : null;
  const projects = DB.getAll('projects');
  const items = inv?.items || [{ description: '', unit: 'Global', quantity: 1, unit_price: 0, total: 0, tax_rate: 21 }];
  const _fcountry = (typeof fiscalCountry === 'function') ? fiscalCountry() : 'AR';
  const _fseq = DB.getAll('invoices').length + 1;
  const nextNum = (typeof fiscalNextIssued === 'function') ? fiscalNextIssued(_fcountry, _fseq) : `0001-${String(_fseq).padStart(8,'0')}`;
  const _finfo = (typeof fiscalFormatInfo === 'function') ? fiscalFormatInfo(_fcountry) : { hint: '' };
  const source = inv?.source || 'manual';
  const imputacion = inv?.imputacion || [];
  window._invIvaRate = (inv && inv.iva_rate != null) ? inv.iva_rate : _invDefaultIvaRate(inv?.type || 'A', _fcountry);

  openModal(inv ? 'Editar Factura' : 'Nueva Factura', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Numero</label>
    <input class="form-control" id="if-num" value="${inv?.number || nextNum}" placeholder="${_finfo.example || ''}">
    <small style="color:var(--text-muted)" id="if-num-hint">${_finfo.hint || ''}</small>
  </div>
  <div class="form-group">
    <label class="form-label">Tipo</label>
    <select class="form-control" id="if-type" onchange="_invOnTypeChange()">
      <option value="A" ${inv?.type==='A'?'selected':''}>Factura A (IVA discriminado)</option>
      <option value="B" ${inv?.type==='B'?'selected':''}>Factura B</option>
      <option value="C" ${inv?.type==='C'?'selected':''}>Factura C (Monotributo)</option>
      <option value="M" ${inv?.type==='M'?'selected':''}>Factura M</option>
      <option value="X" ${inv?.type==='X'?'selected':''}>Sin IVA / No AFIP</option>
      <option value="I" ${inv?.type==='I'?'selected':''}>Interna / Informal</option>
    </select>
    <small style="color:var(--text-muted)">A/B/C/M van al Libro IVA. X e Interna se excluyen.</small>
  </div>
  <div class="form-group">
    <label class="form-label">Alícuota IVA %</label>
    <input class="form-control" id="if-iva-rate" type="number" min="0" step="0.5"
           value="${inv?.iva_rate != null ? inv.iva_rate : _invDefaultIvaRate(inv?.type || 'A')}"
           oninput="_invSetIvaRate(this.value)">
    <small style="color:var(--text-muted)">Se autocompleta por tipo/país. Editable (ej. 10,5% vivienda).</small>
  </div>
  <div class="form-group">
    <label class="form-label">Empresa del Grupo</label>
    <select class="form-control" id="if-company" onchange="invOnCompanyChange(this)">
      ${(function(){ try {
        var actId = inv ? (inv.company_id || DB._companyId) : DB._companyId;
        return DB.getAllCompanies().map(c => '<option value="'+c.id+'"'+(actId===c.id?' selected':'')+'>'+escapeHtml(c.name)+'</option>').join('');
      } catch(e){ return ''; } })()}
    </select>
    <small style="color:var(--text-muted)">La factura y su asiento se guardan en el libro de esta sociedad.</small>
  </div>
  <div class="form-group">
    <label class="form-label">Origen</label>
    <select class="form-control" id="if-source" onchange="invToggleImputacion(this.value)">
      <option value="manual" ${source==='manual'?'selected':''}>Manual (sin OC ni certificado)</option>
      <option value="certificacion" ${source==='certificacion'?'selected':''}>Desde Certificacion de Obra</option>
      <option value="oc" ${source==='oc'?'selected':''}>Desde Orden de Compra</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Referencia Origen</label>
    <input class="form-control" id="if-ref" placeholder="N° de OC / N° de certificado" value="${inv?.source_ref||''}">
  </div>
  <div class="form-group">
    <label class="form-label">Proyecto *</label>
    <select class="form-control" id="if-project">
      <option value="">Seleccionar...</option>
      ${projects.map(p => `<option value="${p.id}" ${inv?.project_id===p.id?'selected':''}>${p.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Estado</label>
    <select class="form-control" id="if-status">
      ${['draft','sent','paid','overdue','cancelled'].map(s => `<option value="${s}" ${inv?.status===s?'selected':''}>${s}</option>`).join('')}
    </select>
  </div>
  <div class="form-group full">
    <label class="form-label">Razon Social Cliente *</label>
    <input class="form-control" id="if-client" value="${inv?.client_name || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">CUIT Cliente</label>
    <input class="form-control" id="if-cuit" value="${inv?.client_cuit || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">Condición IVA Cliente</label>
    <select class="form-control" id="if-iva-cond">
      <option value="CF" ${(!inv?.client_iva_condition||inv?.client_iva_condition==='CF')?'selected':''}>Consumidor Final</option>
      <option value="RI" ${inv?.client_iva_condition==='RI'?'selected':''}>Responsable Inscripto</option>
      <option value="MO" ${inv?.client_iva_condition==='MO'?'selected':''}>Monotributista</option>
      <option value="EX" ${inv?.client_iva_condition==='EX'?'selected':''}>Exento</option>
      <option value="NR" ${inv?.client_iva_condition==='NR'?'selected':''}>No Responsable</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Domicilio Cliente</label>
    <input class="form-control" id="if-addr" value="${inv?.client_address || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">Email Cliente</label>
    <input class="form-control" id="if-email" type="email" value="${inv?.client_email || ''}" placeholder="Para envío automático de factura">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha Emision</label>
    <input class="form-control" id="if-date" type="date" value="${inv?.date || todayStr()}">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha Vencimiento</label>
    <input class="form-control" id="if-due" type="date" value="${inv?.due_date || addDays(todayStr(), 30)}">
  </div>
  <div class="form-group full">
    <label class="form-label">Notas</label>
    <textarea class="form-control" id="if-notes" rows="2">${inv?.notes || ''}</textarea>
  </div>
</div>

<div class="divider"></div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
  <strong style="font-size:13px">Items de Factura</strong>
  <button class="btn btn-sm btn-secondary" onclick="addInvItem()"><i class="fas fa-plus"></i> Item</button>
</div>
<div id="inv-items">
  <div style="display:grid;grid-template-columns:3fr 80px 80px 120px 120px 36px;gap:6px;margin-bottom:4px;font-size:11px;font-weight:600;color:var(--text-muted)">
    <span>Descripcion</span><span>Unidad</span><span>Cantidad</span><span>P.Unit.</span><span>Total</span><span></span>
  </div>
  ${items.map((it, i) => invItemRow(it, i)).join('')}
</div>
<div id="inv-totals" style="text-align:right;font-size:13px;margin-top:12px">
  ${calcInvTotalsHtml(items)}
</div>

<div class="divider"></div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
  <div>
    <strong style="font-size:13px">Imputacion Contable</strong>
    <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Rubros imputados en esta factura (la cuenta surge del rubro)</div>
  </div>
  <button class="btn btn-sm btn-secondary" onclick="addImpLine()"><i class="fas fa-plus"></i> Linea</button>
</div>
<div id="imp-lines">
  <div style="display:grid;grid-template-columns:3fr 2fr 130px 36px;gap:6px;margin-bottom:4px;font-size:11px;font-weight:600;color:var(--text-muted)">
    <span>Rubro</span><span>Cuenta contable</span><span>Importe</span><span></span>
  </div>
  ${imputacion.map((l, i) => invImpRow(l, i)).join('')}
</div>
<div id="imp-totals" style="text-align:right;font-size:12px;color:var(--text-muted);margin-top:8px">
  ${calcImpTotalsHtml(imputacion, items.reduce((s, it) => s + (it.total || 0), 0))}
</div>
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveInvoice('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
  window._invItems = [...items];
  window._impLines = imputacion.map(l => Object.assign({}, l));
  window._invEditId = id || null;
}

// Al cambiar la sociedad emisora: la factura pertenece a esa empresa, y sus
// proyectos/rubros/cuentas viven en el libro de ESA empresa. Por eso, para una
// factura nueva, trabajamos en el contexto de la sociedad elegida (se recarga
// el formulario con sus datos). Una factura existente no se puede mover de libro.
function invOnCompanyChange(sel) {
  var cid = sel ? sel.value : '';
  if (!cid) return;
  if (window._invEditId) {
    toast('No se puede cambiar la sociedad de una factura ya creada', 'error');
    sel.value = (DB.getById('invoices', window._invEditId) || {}).company_id || DB._companyId;
    return;
  }
  if (cid === DB._companyId) return;
  var co = DB.getAllCompanies().find(function(c){ return c.id === cid; });
  confirmDialog(
    'Vas a facturar como <b>' + escapeHtml(co ? co.name : cid) + '</b>. El formulario se recargará con los proyectos y rubros de esa sociedad. ¿Continuar?',
    function() {
      DB.setCompany(cid);
      window.APP_STATE.activeCompany = cid;
      try { localStorage.setItem('erp_active_company', cid); } catch(e) {}
      if (typeof populateCompanySelector === 'function') populateCompanySelector();
      if (typeof populateProjectSelector === 'function') populateProjectSelector();
      closeModal();
      openInvoiceForm();
    }
  );
}

// ---- ITEMS ----
function invItemRow(it, i) {
  return `<div id="ivi-row-${i}" style="display:grid;grid-template-columns:3fr 80px 80px 120px 120px 36px;gap:6px;margin-bottom:6px;align-items:center">
    <input class="form-control" style="font-size:12px" placeholder="Descripcion" value="${it.description||''}" oninput="updateInvItem(${i},'description',this.value)">
    <input class="form-control" style="font-size:12px" value="${it.unit||'Global'}" oninput="updateInvItem(${i},'unit',this.value)">
    <input class="form-control" style="font-size:12px" type="number" min="0" step="0.01" value="${it.quantity||1}" oninput="updateInvItem(${i},'quantity',+this.value)">
    <input class="form-control" style="font-size:12px" type="text" inputmode="decimal" value="${numFmt(it.unit_price||0)}" onfocus="var n=numParse(this.value);this.value=n?n:''" onblur="this.value=numFmt(numParse(this.value))" oninput="updateInvItem(${i},'unit_price',numParse(this.value))">
    <input class="form-control" style="font-size:12px;background:#f8fafc" readonly id="ivi-total-${i}" value="${numFmt(it.total||0)}">
    <button class="btn-ghost btn danger" onclick="removeInvItem(${i})"><i class="fas fa-times"></i></button>
  </div>`;
}

window._invItems = [];
function addInvItem() {
  const newItem = { description: '', unit: 'Global', quantity: 1, unit_price: 0, total: 0, tax_rate: 21 };
  window._invItems.push(newItem);
  const i = window._invItems.length - 1;
  const cont = document.getElementById('inv-items');
  const div = document.createElement('div');
  div.innerHTML = invItemRow(newItem, i);
  cont.appendChild(div.firstElementChild);
}

function updateInvItem(i, field, val) {
  if (!window._invItems[i]) window._invItems[i] = { description:'', unit:'Global', quantity:1, unit_price:0, total:0, tax_rate:21 };
  window._invItems[i][field] = val;
  window._invItems[i].total = (window._invItems[i].quantity||0) * (window._invItems[i].unit_price||0);
  const el = document.getElementById(`ivi-total-${i}`);
  if (el) el.value = numFmt(window._invItems[i].total);
  document.getElementById('inv-totals').innerHTML = calcInvTotalsHtml(window._invItems.filter(Boolean));
  const impEl = document.getElementById('imp-totals');
  if (impEl) impEl.innerHTML = calcImpTotalsHtml(window._impLines.filter(Boolean));
}

function removeInvItem(i) {
  const row = document.getElementById(`ivi-row-${i}`);
  if (row) row.remove();
  window._invItems[i] = null;
  document.getElementById('inv-totals').innerHTML = calcInvTotalsHtml(window._invItems.filter(Boolean));
  const impEl = document.getElementById('imp-totals');
  if (impEl) impEl.innerHTML = calcImpTotalsHtml(window._impLines.filter(Boolean));
}

// Alícuota de IVA por defecto según tipo de comprobante y país (editable).
function _invDefaultIvaRate(type, country) {
  country = country || (typeof fiscalCountry === 'function' ? fiscalCountry() : 'AR');
  var t = String(type || '').toUpperCase();
  if (t === 'X' || t === 'I' || t === 'INFORMAL' || t === 'INTERNA') return 0; // no gravado
  if (country === 'US') return 0;   // sin IVA federal (sales tax se maneja aparte)
  if (country === 'UY') return 22;  // básica DGI (10% mínima existe — editable)
  return 21;                        // AR general (10,5% vivienda — editable)
}

// Lee la alícuota vigente del form (variable de módulo, sincronizada con el input).
function _invCurrentIvaRate() {
  var r = (window._invIvaRate != null) ? parseFloat(window._invIvaRate) : 21;
  return isNaN(r) ? 0 : r;
}

function _invSetIvaRate(v) {
  window._invIvaRate = parseFloat(v);
  if (isNaN(window._invIvaRate)) window._invIvaRate = 0;
  var el = document.getElementById('inv-totals');
  if (el) el.innerHTML = calcInvTotalsHtml((window._invItems || []).filter(Boolean));
}

// Al cambiar el tipo: recalcula la alícuota por defecto (0 si no gravado) y actualiza el hint fiscal.
function _invOnTypeChange() {
  var typeEl = document.getElementById('if-type');
  var rateEl = document.getElementById('if-iva-rate');
  if (typeEl && rateEl) {
    var def = _invDefaultIvaRate(typeEl.value);
    rateEl.value = def;
    _invSetIvaRate(def);
  }
  if (typeof _invUpdateNumHint === 'function') _invUpdateNumHint();
}

function calcInvTotalsHtml(items) {
  const validItems = items.filter(Boolean);
  const subtotal = validItems.reduce((s, it) => s + (it.total||0), 0);
  const rate = _invCurrentIvaRate();
  const tax = subtotal * rate / 100;
  const total = subtotal + tax;
  const rateLabel = (Math.round(rate * 100) / 100).toString().replace('.', ',');
  return `Subtotal: <strong>${fmtMoney(subtotal)}</strong> &nbsp;|&nbsp; IVA ${rateLabel}%: <strong>${fmtMoney(tax)}</strong> &nbsp;|&nbsp; <strong style="font-size:15px;color:var(--primary)">TOTAL: ${fmtMoney(total)}</strong>`;
}

// ---- IMPUTACION ----
window._impLines = [];

function invImpRow(line, i) {
  const rubros = DB.getAll('rubros').filter(r => r.active !== false).sort((a, b) => a.code.localeCompare(b.code));
  const rHtml = '<option value="">— Rubro —</option>' +
    rubros.map(r => `<option value="${r.id}" data-account="${r.account_code||''}" data-aname="${r.account_name||''}" ${line.rubro_id===r.id?'selected':''}>${r.code} — ${r.name}</option>`).join('');
  const acctText = line.account_code ? (line.account_code + (line.account_name ? ' — ' + line.account_name : '')) : '—';
  return `<div id="imp-row-${i}" style="display:grid;grid-template-columns:3fr 2fr 130px 36px;gap:6px;margin-bottom:6px;align-items:center">
    <select class="form-control" style="font-size:12px" onchange="impOnRubroChange(${i},this)">${rHtml}</select>
    <div id="imp-acct-${i}" style="font-size:11px;color:var(--text-muted);padding:2px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:var(--bg);border-radius:var(--radius-sm);min-height:32px;display:flex;align-items:center">${acctText}</div>
    <input class="form-control" style="font-size:12px" type="text" inputmode="decimal" value="${numFmt(line.amount||0)}" onfocus="var n=numParse(this.value);this.value=n?n:''" onblur="this.value=numFmt(numParse(this.value))" oninput="impUpdateField(${i},'amount',numParse(this.value))">
    <button class="btn-ghost btn danger" onclick="removeImpLine(${i})"><i class="fas fa-times"></i></button>
  </div>`;
}

function impOnRubroChange(i, sel) {
  if (!window._impLines[i]) window._impLines[i] = {};
  const opt = sel.options[sel.selectedIndex];
  window._impLines[i].rubro_id = opt.value;
  window._impLines[i].account_code = opt.getAttribute('data-account') || '';
  window._impLines[i].account_name = opt.getAttribute('data-aname') || '';
  const el = document.getElementById('imp-acct-' + i);
  if (el) {
    const code = window._impLines[i].account_code;
    const name = window._impLines[i].account_name;
    el.textContent = code ? (code + (name ? ' — ' + name : '')) : '—';
    el.style.color = code ? 'var(--text)' : 'var(--text-muted)';
  }
}

function impUpdateField(i, field, val) {
  if (!window._impLines[i]) window._impLines[i] = {};
  window._impLines[i][field] = val;
  const el = document.getElementById('imp-totals');
  if (el) el.innerHTML = calcImpTotalsHtml(window._impLines.filter(Boolean));
}

function addImpLine() {
  const newLine = { rubro_id: '', account_code: '', account_name: '', amount: 0 };
  window._impLines.push(newLine);
  const i = window._impLines.length - 1;
  const cont = document.getElementById('imp-lines');
  const div = document.createElement('div');
  div.innerHTML = invImpRow(newLine, i);
  cont.appendChild(div.firstElementChild);
}

function removeImpLine(i) {
  const row = document.getElementById('imp-row-' + i);
  if (row) row.remove();
  window._impLines[i] = null;
  const el = document.getElementById('imp-totals');
  if (el) el.innerHTML = calcImpTotalsHtml(window._impLines.filter(Boolean));
}

function calcImpTotalsHtml(lines, netoOverride) {
  const valid = lines.filter(Boolean);
  const imputado = valid.reduce((s, l) => s + (l.amount || 0), 0);
  const neto = (netoOverride !== undefined && netoOverride !== null)
    ? netoOverride
    : (window._invItems || []).filter(Boolean).reduce((s, it) => s + (it.total || 0), 0);
  if (!valid.length) {
    if (neto > 0) return `<span style="color:var(--warning,#f59e0b)"><i class="fas fa-exclamation-triangle"></i> Sin imputar — Neto a imputar: <strong>${fmtMoney(neto)}</strong></span>`;
    return '<span style="color:var(--text-muted)">Sin lineas de imputacion</span>';
  }
  const diff = neto - imputado;
  const ok = Math.abs(diff) < 0.01;
  const color = ok ? 'var(--success,#22c55e)' : (diff > 0 ? 'var(--warning,#f59e0b)' : 'var(--danger,#ef4444)');
  return `Neto: <strong>${fmtMoney(neto)}</strong> &nbsp;|&nbsp; Imputado: <strong style="color:${color}">${fmtMoney(imputado)}</strong>` +
    (ok ? ` <i class="fas fa-check-circle" style="color:${color}"></i>`
        : ` &nbsp;|&nbsp; <span style="color:${color};font-weight:600">${diff > 0 ? `Faltan ${fmtMoney(diff)} por imputar` : `Excede por ${fmtMoney(-diff)}`}</span>`);
}

// Actualiza el hint del número según el tipo elegido (formato fiscal vs libre)
function _invUpdateNumHint() {
  var hintEl = document.getElementById('if-num-hint');
  var typeEl = document.getElementById('if-type');
  if (!hintEl || !typeEl || typeof fiscalFormatInfo !== 'function') return;
  if (typeof fiscalIsLegalType === 'function' && !fiscalIsLegalType(typeEl.value)) {
    hintEl.textContent = 'Comprobante no fiscal — formato libre';
  } else {
    hintEl.textContent = fiscalFormatInfo(fiscalCountry()).hint;
  }
}

// ---- SAVE ----
function saveInvoice(id) {
  const projectId = document.getElementById('if-project').value;
  const clientName = document.getElementById('if-client').value.trim();
  if (!projectId || !clientName) { toast('Proyecto y cliente son obligatorios', 'error'); return; }

  const items = window._invItems.filter(Boolean).filter(it => it.description);
  if (!items.length) { toast('Agrega al menos un item', 'error'); return; }

  const subtotal = items.reduce((s, it) => s+it.total, 0);
  const ivaRate = _invCurrentIvaRate();
  const tax = subtotal * ivaRate / 100;
  const source = document.getElementById('if-source').value;
  const imputacion = (window._impLines || []).filter(Boolean).filter(l => l.rubro_id || l.amount);

  if (imputacion.length) {
    const imputado = imputacion.reduce((s, l) => s + (l.amount || 0), 0);
    if (Math.abs(imputado - subtotal) > 0.01) {
      toast(`Imputacion incorrecta: se imputaron ${fmtMoney(imputado)} pero el neto es ${fmtMoney(subtotal)}`, 'error');
      return;
    }
  }

  const invType = document.getElementById('if-type').value;

  // Validar formato del número de comprobante para comprobantes fiscales (Contabilidad A)
  let invNumber = document.getElementById('if-num').value.trim();
  if (typeof fiscalIsLegalType === 'function' && fiscalIsLegalType(invType)) {
    const norm = fiscalNormalizeNumber(invNumber, fiscalCountry());
    if (!norm.ok) { toast(norm.message, 'error'); return; }
    invNumber = norm.value;
  }

  const data = {
    number: invNumber,
    type: invType,
    tipo_comprobante: invType,
    company_id: document.getElementById('if-company')?.value || '',
    project_id: projectId,
    status: document.getElementById('if-status').value,
    client_name: clientName,
    client_cuit: document.getElementById('if-cuit').value.trim(),
    client_iva_condition: document.getElementById('if-iva-cond').value,
    client_address: document.getElementById('if-addr').value.trim(),
    client_email: document.getElementById('if-email').value.trim(),
    date: document.getElementById('if-date').value,
    due_date: document.getElementById('if-due').value,
    notes: document.getElementById('if-notes').value.trim(),
    source: source,
    source_ref: document.getElementById('if-ref').value.trim(),
    items,
    imputacion,
    subtotal,
    iva_rate: ivaRate,
    tax,
    total: subtotal + tax,
  };

  if (id) { DB.update('invoices', id, data); toast('Factura actualizada', 'success'); }
  else { DB.insert('invoices', data); toast('Factura creada', 'success'); }

  // Generate journal entry from imputacion lines
  if (typeof autoJournalEntryFromImputacion === 'function') {
    autoJournalEntryFromImputacion('fact_emitida', imputacion, subtotal, data.total, { iva: tax }, data.date, data.number);
  }

  window._invItems = [];
  window._impLines = [];
  closeModal();
  renderFacturacion();
}

function markInvoicePaid(id) {
  // "Marcar cobrada" ahora registra el cobro real (cuenta/método/importe), que a su
  // vez marca la factura pagada al completarse e impacta Tesorería. Así Facturación y
  // Cobranzas dejan de contradecirse.
  if (typeof closeModal === 'function') closeModal();
  setTimeout(function() {
    if (typeof openCollectionForm === 'function') {
      openCollectionForm(id);
    } else {
      DB.update('invoices', id, { status: 'paid' });
      toast('Factura marcada como cobrada', 'success');
      renderFacturacion();
    }
  }, 60);
}

function deleteInvoice(id) {
  confirmDialog('Eliminar esta factura?', () => {
    DB.remove('invoices', id);
    toast('Factura eliminada', 'warning');
    renderFacturacion();
  });
}

function exportInvoices() {
  let invs = DB.getAll('invoices');
  const f = window._invFilters || {};
  if (f.q) invs = invs.filter(i => (i.number||'').toLowerCase().includes(f.q) || (i.client_name||'').toLowerCase().includes(f.q));
  if (f.status) invs = invs.filter(i => i.status === f.status);
  if (f.project) invs = invs.filter(i => i.project_id === f.project);
  if (f.period) { const r = _periodRange(f.period); invs = invs.filter(i => i.date && i.date >= r.from && i.date <= r.to); }
  const projects = DB.getAll('projects');
  const ST = { draft:'Borrador', sent:'Enviada', paid:'Cobrada', overdue:'Vencida', cancelled:'Anulada' };
  exportXLSX('facturas.xlsx',
    ['N° Factura','Tipo','Proyecto','Cliente','CUIT','Fecha','Vencimiento','Subtotal','IVA','Total','Estado'],
    invs.map(i => [
      i.number, i.type || '',
      projects.find(p=>p.id===i.project_id)?.name || '',
      i.client_name || '', i.client_cuit || '',
      i.date, i.due_date,
      i.subtotal || 0, i.tax || 0, i.total || 0,
      ST[i.status] || i.status
    ])
  );
  toast(invs.length + ' facturas exportadas', 'success');
}
