/* ===== CONTRATOS DE OBRA ===== */

const CONTRACT_TYPES = {
  lump_sum:   'Suma Alzada',
  unit_price: 'Por Unidad de Medida',
  cost_plus:  'Coste Más Honorarios',
  mixed:      'Mixto',
};

const FORMA_PAGO_OPTIONS = ['Contado', 'Transferencia', 'Cheque', '30 días', '60 días', '90 días', 'A convenir'];

function formaPagoSelect(id, current) {
  return '<select class="form-control" id="' + id + '">' +
    FORMA_PAGO_OPTIONS.map(function(f) {
      return '<option value="' + f + '" ' + (current === f ? 'selected' : '') + '>' + f + '</option>';
    }).join('') +
    '</select>';
}

function renderContratos() {
  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Contratos de Obra</div>
    <div class="page-subtitle">Contratos con contratistas, partidas de obra, certificaciones y previsión financiera</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="exportContracts()"><i class="fas fa-download"></i> Exportar Contratos</button>
    <button class="btn btn-primary" onclick="openContractForm()"><i class="fas fa-plus"></i> Nuevo Contrato</button>
  </div>
</div>

<div id="contratos-tabs">
  <div class="tabs">
    <button class="tab-btn" data-tab="tab-contracts">Contratos</button>
    <button class="tab-btn" data-tab="tab-cert-schedule">Planilla de Certificaciones</button>
  </div>
  <div id="tab-contracts" class="tab-content">
    ${renderContractsListTab()}
  </div>
  <div id="tab-cert-schedule" class="tab-content">
    ${renderCertScheduleTab()}
  </div>
</div>
  `;
  initTabs('contratos-tabs');
  window._contractFilters = { q: '', project: '', status: '' };
}

function renderContractsListTab() {
  const contracts = DB.getAll('contracts');
  const projects  = DB.getAll('projects');
  const suppliers = DB.getAll('suppliers');
  const certs     = DB.getAll('certificates');

  const active     = contracts.filter(c => c.status === 'active').length;
  const totalAmt   = contracts.reduce((s, c) => s + (c.total_amount || 0), 0);
  const totalCert  = certs.filter(c => c.contract_id).reduce((s, c) => s + (c.subtotal || 0), 0);
  const avancePct  = totalAmt > 0 ? totalCert / totalAmt * 100 : 0;

  return `
<div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-file-contract"></i></div><div>
    <div class="stat-value">${contracts.length}</div><div class="stat-label">Total Contratos</div>
    <div class="stat-delta up">${active} activos</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-dollar-sign"></i></div><div>
    <div class="stat-value">${fmtMoney(totalAmt)}</div><div class="stat-label">Monto Contratado</div></div></div>
  <div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-certificate"></i></div><div>
    <div class="stat-value">${fmtMoney(totalCert)}</div><div class="stat-label">Total Certificado</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-percentage"></i></div><div>
    <div class="stat-value">${fmtPct(avancePct)}</div><div class="stat-label">Avance General</div></div></div>
</div>

<div class="filter-bar">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar contrato, proyecto, contratista..." oninput="filterContracts(this.value)">
  </div>
  <select class="form-control" style="width:220px" onchange="filterContracts(undefined, this.value)">
    <option value="">Todos los proyectos</option>
    ${projects.map(p => '<option value="' + p.id + '">' + p.name + '</option>').join('')}
  </select>
  <select class="form-control" style="width:150px" onchange="filterContracts(undefined, undefined, this.value)">
    <option value="">Todos los estados</option>
    <option value="draft">Borrador</option>
    <option value="active">Activo</option>
    <option value="completed">Completado</option>
    <option value="cancelled">Cancelado</option>
  </select>
</div>

<div class="card">
  <div class="card-body" style="padding:0">
    <div class="table-wrap" id="contracts-table-wrap">
      ${buildContractsTable(contracts, projects, suppliers, certs)}
    </div>
  </div>
</div>`;
}

function buildContractsTable(contracts, projects, suppliers, allCerts) {
  if (!contracts.length) return '<div class="empty-state"><i class="fas fa-file-contract"></i><p>No hay contratos registrados. Crea el primero.</p></div>';

  const statusColor = { draft: 'badge-gray', active: 'badge-green', completed: 'badge-blue', cancelled: 'badge-red' };
  const statusLabel = { draft: 'Borrador', active: 'Activo', completed: 'Completado', cancelled: 'Cancelado' };

  return '<table><thead><tr>' +
    '<th>N° Contrato</th><th>Proyecto</th><th>Contratista</th><th>Tipo</th><th>Inicio</th><th>Fin</th>' +
    '<th class="text-right">Monto</th><th class="text-right">Certificado</th><th>Avance</th>' +
    '<th>Estado</th><th>Acciones</th>' +
  '</tr></thead><tbody>' +
  contracts.sort((a, b) => (b.start_date || '').localeCompare(a.start_date || '')).map(c => {
    const proj  = projects.find(p => p.id === c.project_id);
    const sup   = suppliers.find(s => s.id === c.contractor_id);
    const certified = allCerts.filter(cert => cert.contract_id === c.id).reduce((s, cert) => s + (cert.subtotal || 0), 0);
    const avance = c.total_amount > 0 ? certified / c.total_amount * 100 : 0;
    return '<tr>' +
      '<td><strong>' + c.number + '</strong></td>' +
      '<td>' + (proj ? proj.name : '-') + '</td>' +
      '<td>' + (sup ? sup.name : '-') + '</td>' +
      '<td style="font-size:11px">' + (CONTRACT_TYPES[c.type] || c.type || '-') + '</td>' +
      '<td>' + fmtDate(c.start_date) + '</td>' +
      '<td>' + fmtDate(c.end_date) + '</td>' +
      '<td class="number-cell text-right"><strong>' + fmtMoney(c.total_amount || 0) + '</strong></td>' +
      '<td class="number-cell text-right">' + fmtMoney(certified) + '</td>' +
      '<td style="min-width:120px">' + progressBar(avance) + '</td>' +
      '<td><span class="badge ' + (statusColor[c.status] || 'badge-gray') + '">' + (statusLabel[c.status] || c.status) + '</span></td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-ghost btn btn-sm" title="Ver detalle" onclick="viewContract(\'' + c.id + '\')"><i class="fas fa-eye"></i></button>' +
        '<button class="btn-ghost btn btn-sm" title="Editar" onclick="openContractForm(\'' + c.id + '\')"><i class="fas fa-edit"></i></button>' +
        (c.status === 'draft'
          ? '<button class="btn btn-sm btn-success" title="Dar inicio al contrato" onclick="startContract(\'' + c.id + '\')"><i class="fas fa-play"></i> Iniciar</button>'
          : '') +
        (c.status === 'active'
          ? '<button class="btn btn-sm btn-primary" title="Nueva Certificación" onclick="openContractCertForm(\'' + c.id + '\')"><i class="fas fa-certificate"></i> Certif.</button>'
          : '') +
        '<button class="btn-ghost btn btn-sm danger" onclick="deleteContract(\'' + c.id + '\')"><i class="fas fa-trash"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join('') +
  '</tbody></table>';
}

window._contractFilters = { q: '', project: '', status: '' };
function filterContracts(q, project, status) {
  if (q !== undefined) window._contractFilters.q = q.toLowerCase();
  if (project !== undefined) window._contractFilters.project = project;
  if (status !== undefined) window._contractFilters.status = status;
  let contracts = DB.getAll('contracts');
  const projects  = DB.getAll('projects');
  const suppliers = DB.getAll('suppliers');
  const f = window._contractFilters;
  if (f.q) contracts = contracts.filter(c => {
    const proj = projects.find(p => p.id === c.project_id);
    const sup  = suppliers.find(s => s.id === c.contractor_id);
    return c.number.toLowerCase().includes(f.q)
      || (proj && proj.name.toLowerCase().includes(f.q))
      || (sup  && sup.name.toLowerCase().includes(f.q));
  });
  if (f.project) contracts = contracts.filter(c => c.project_id === f.project);
  if (f.status)  contracts = contracts.filter(c => c.status === f.status);
  const wrap = document.getElementById('contracts-table-wrap');
  if (wrap) wrap.innerHTML = buildContractsTable(contracts, projects, suppliers, DB.getAll('certificates'));
}

// ==== PLANILLA DE CERTIFICACIONES (previsión financiera) ====
function renderCertScheduleTab() {
  const certs     = DB.getAll('certificates').filter(c => c.contract_id);
  const contracts = DB.getAll('contracts');
  const projects  = DB.getAll('projects');
  const suppliers = DB.getAll('suppliers');

  const totalNet = certs.reduce((s, c) => s + (c.net_amount || 0), 0);
  const totalA   = certs.reduce((s, c) => s + (c.amount_a || 0), 0);
  const totalB   = certs.reduce((s, c) => s + (c.amount_b || 0), 0);

  const rows = certs.length
    ? certs.sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(c => {
        const contract = contracts.find(ct => ct.id === c.contract_id);
        const proj     = projects.find(p => p.id === c.project_id);
        const sup      = contract ? suppliers.find(s => s.id === contract.contractor_id) : null;
        const statusColor = { draft: 'badge-gray', pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red' };
        const statusLabel = { draft: 'Borrador', pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' };
        return '<tr>' +
          '<td>' + fmtDate(c.date) + '</td>' +
          '<td><strong>' + c.number + '</strong></td>' +
          '<td style="font-size:11px">' + (contract ? contract.number : '-') + '</td>' +
          '<td style="font-size:11px">' + (proj ? proj.name : '-') + '</td>' +
          '<td style="font-size:11px">' + (sup ? sup.name : '-') + '</td>' +
          '<td class="number-cell text-right">' + fmtMoney(c.subtotal || 0) + '</td>' +
          '<td class="number-cell text-right text-warning">' + fmtMoney(c.retention_amount || 0) + '</td>' +
          '<td class="number-cell text-right"><strong>' + fmtMoney(c.net_amount || 0) + '</strong></td>' +
          '<td class="number-cell text-right" style="font-size:11px">' + fmtMoney(c.amount_a || 0) + '</td>' +
          '<td class="number-cell text-right" style="font-size:11px">' + fmtMoney(c.amount_b || 0) + '</td>' +
          '<td style="font-size:11px">' + (c.forma_pago || '-') + '</td>' +
          '<td><span class="badge ' + (statusColor[c.status] || 'badge-gray') + '">' + (statusLabel[c.status] || c.status) + '</span></td>' +
          '</tr>';
      }).join('')
    : '';

  return `
<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-money-bill-wave"></i></div><div>
    <div class="stat-value">${fmtMoney(totalNet)}</div><div class="stat-label">Neto a Pagar (todos)</div></div></div>
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-file-invoice-dollar"></i></div><div>
    <div class="stat-value">${fmtMoney(totalA)}</div><div class="stat-label">Contabilidad A (formal)</div></div></div>
  <div class="stat-card"><div class="stat-icon gray"><i class="fas fa-hand-holding-usd"></i></div><div>
    <div class="stat-value">${fmtMoney(totalB)}</div><div class="stat-label">Contabilidad B</div></div></div>
</div>
<div class="filter-bar">
  <span style="font-size:12px;color:var(--text-muted)">Planilla cronológica de certificaciones para la previsión financiera</span>
  <button class="btn btn-secondary" onclick="exportCertSchedule()"><i class="fas fa-download"></i> Exportar Planilla</button>
</div>
<div class="card">
  <div class="card-body" style="padding:0">
    <div class="table-wrap">
      ${certs.length ? `<table><thead><tr>
        <th>Fecha</th><th>Certificado</th><th>Contrato</th><th>Proyecto</th><th>Contratista</th>
        <th class="text-right">Monto</th><th class="text-right">Fondo Reparo</th><th class="text-right">Neto</th>
        <th class="text-right">Contab. A</th><th class="text-right">Contab. B</th><th>Forma Pago</th><th>Estado</th>
      </tr></thead><tbody>${rows}</tbody></table>`
      : '<div class="empty-state"><i class="fas fa-calendar-alt"></i><p>Aún no hay certificaciones cargadas en contratos.</p></div>'}
    </div>
  </div>
</div>`;
}

function exportCertSchedule() {
  const certs     = DB.getAll('certificates').filter(c => c.contract_id);
  const contracts = DB.getAll('contracts');
  const projects  = DB.getAll('projects');
  const suppliers = DB.getAll('suppliers');
  exportXLSX('planilla_certificaciones.xlsx',
    ['Fecha', 'Certificado', 'Contrato', 'Proyecto', 'Contratista', 'Período Desde', 'Período Hasta',
     'Monto', 'Fondo Reparo', 'Neto', 'Contab. A', 'Contab. B', 'Forma Pago', 'Estado'],
    certs.sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(function(c) {
      const contract = contracts.find(function(ct) { return ct.id === c.contract_id; });
      const proj     = projects.find(function(p) { return p.id === c.project_id; });
      const sup      = contract ? suppliers.find(function(s) { return s.id === contract.contractor_id; }) : null;
      return [
        c.date, c.number, contract ? contract.number : '', proj ? proj.name : '', sup ? sup.name : '',
        c.period_from || '', c.period_to || '',
        c.subtotal || 0, c.retention_amount || 0, c.net_amount || 0,
        c.amount_a || 0, c.amount_b || 0, c.forma_pago || '', c.status,
      ];
    })
  );
}

// ---- CONTRACT DETAIL VIEW ----
function viewContract(id) {
  const contract = DB.getById('contracts', id);
  if (!contract) return;
  const proj  = DB.getById('projects',  contract.project_id);
  const sup   = DB.getById('suppliers', contract.contractor_id);
  const idx   = contract.indice_id ? DB.getById('priceIndices', contract.indice_id) : null;
  const certs = DB.getAll('certificates').filter(c => c.contract_id === id);
  const totalCertified = certs.reduce((s, c) => s + (c.subtotal || 0), 0);
  const avance = contract.total_amount > 0 ? totalCertified / contract.total_amount * 100 : 0;

  // accumulated certified qty per partida (by description, excluding rejected)
  const accumByDesc = {};
  certs.filter(c => c.status !== 'rejected').forEach(c => {
    (c.items || []).forEach(it => {
      const k = (it.description || '').trim();
      accumByDesc[k] = (accumByDesc[k] || 0) + (it.quantity_period || 0);
    });
  });

  const itemsHtml = (contract.items || []).length
    ? '<div class="table-wrap" style="margin-bottom:16px"><table><thead><tr>' +
        '<th>Partida</th><th>Unidad</th><th class="text-right">Cant.Contrato</th><th class="text-right">Cant.Certif.</th>' +
        '<th class="text-right">P.Unit.</th><th class="text-right">Total</th><th>Avance</th><th>Vínculo Presupuesto</th>' +
      '</tr></thead><tbody>' +
      (contract.items || []).map(it => {
        const boqItem = it.boq_item_id ? DB.getById('boqItems', it.boq_item_id) : null;
        const accum = accumByDesc[(it.description || '').trim()] || 0;
        const pct = it.quantity > 0 ? accum / it.quantity * 100 : 0;
        return '<tr>' +
          '<td>' + it.description + '</td>' +
          '<td>' + it.unit + '</td>' +
          '<td class="number-cell text-right">' + fmtNum(it.quantity) + '</td>' +
          '<td class="number-cell text-right">' + fmtNum(accum) + '</td>' +
          '<td class="number-cell text-right">' + fmtMoney(it.unit_price) + '</td>' +
          '<td class="number-cell text-right"><strong>' + fmtMoney(it.total) + '</strong></td>' +
          '<td style="min-width:110px">' + progressBar(pct) + '</td>' +
          '<td style="font-size:11px;color:var(--text-muted)">' + (boqItem ? boqItem.description : '<span style="color:var(--danger)">sin vincular</span>') + '</td>' +
          '</tr>';
      }).join('') +
      '<tr class="total-row"><td colspan="5" class="text-right"><strong>TOTAL</strong></td>' +
        '<td class="number-cell text-right"><strong>' + fmtMoney(contract.total_amount || 0) + '</strong></td><td colspan="2"></td></tr>' +
      '</tbody></table></div>'
    : '<div class="empty-state" style="padding:20px"><p>Sin partidas de obra cargadas</p></div>';

  const statusColor = { draft: 'badge-gray', pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red' };
  const statusLabel = { draft: 'Borrador', pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' };
  const supInvoices = DB.getAll('supplierInvoices');

  const certsHtml = certs.length
    ? '<div class="table-wrap"><table><thead><tr>' +
        '<th>N° Cert.</th><th>Fecha</th><th>Período</th><th class="text-right">Monto</th>' +
        '<th class="text-right">Fondo Rep.</th><th class="text-right">Neto</th><th>Contab.</th><th>F.Pago</th><th>Factura</th><th>Estado</th><th>Acciones</th>' +
      '</tr></thead><tbody>' +
      certs.sort((a, b) => b.date.localeCompare(a.date)).map(c => {
        const contabTxt = c.contab_tipo === 'AB'
          ? 'A ' + (c.contab_pct_a || 0) + '% / B'
          : (c.contab_tipo || 'A');
        const si = c.supplier_invoice_id ? supInvoices.find(x => x.id === c.supplier_invoice_id) : null;
        const facturaCell = si
          ? '<span class="badge badge-green" title="Factura vinculada">' + si.number + '</span>'
          : (c.status === 'approved'
              ? '<button class="btn btn-sm btn-secondary" onclick="generateInvoiceFromCert(\'' + c.id + '\')"><i class="fas fa-file-invoice"></i> Vincular</button>'
              : '<span style="color:var(--text-muted);font-size:11px">—</span>');
        return '<tr>' +
          '<td><strong>' + c.number + '</strong></td>' +
          '<td style="font-size:11px">' + fmtDate(c.date) + '</td>' +
          '<td style="font-size:11px">' + fmtDate(c.period_from) + ' — ' + fmtDate(c.period_to) + '</td>' +
          '<td class="number-cell text-right">' + fmtMoney(c.subtotal) + '</td>' +
          '<td class="number-cell text-right text-warning">' + fmtMoney(c.retention_amount || 0) + '</td>' +
          '<td class="number-cell text-right"><strong>' + fmtMoney(c.net_amount) + '</strong></td>' +
          '<td style="font-size:11px">' + contabTxt + '</td>' +
          '<td style="font-size:11px">' + (c.forma_pago || '-') + '</td>' +
          '<td>' + facturaCell + '</td>' +
          '<td><span class="badge ' + (statusColor[c.status] || 'badge-gray') + '">' + (statusLabel[c.status] || c.status) + '</span></td>' +
          '<td><div class="table-actions">' +
            '<button class="btn-ghost btn btn-sm" onclick="viewCert(\'' + c.id + '\')"><i class="fas fa-eye"></i></button>' +
            (c.status === 'pending' ? '<button class="btn btn-sm btn-success" onclick="approveCert(\'' + c.id + '\');closeModal();viewContract(\'' + id + '\')"><i class="fas fa-check"></i></button>' : '') +
          '</div></td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>' +
      '<div style="padding:12px;text-align:right;font-size:13px;border-top:2px solid var(--border)">' +
        'Total Certificado: <strong style="color:var(--primary)">' + fmtMoney(totalCertified) + '</strong> &nbsp;|&nbsp; ' +
        'Avance: <strong>' + fmtPct(avance) + '</strong>' +
      '</div></div>'
    : '<div class="empty-state" style="padding:20px"><i class="fas fa-certificate"></i><p>Sin certificaciones para este contrato</p></div>';

  // cash flow
  const cashflow = contract.cash_flow || [];
  const cfTotal = cashflow.reduce((s, r) => s + (r.amount || 0), 0);
  const cashflowHtml = cashflow.length
    ? '<div class="table-wrap"><table><thead><tr><th>Mes</th><th class="text-right">Monto Previsto</th></tr></thead><tbody>' +
      cashflow.slice().sort((a, b) => (a.month || '').localeCompare(b.month || '')).map(r =>
        '<tr><td>' + (r.month || '-') + '</td><td class="number-cell text-right">' + fmtMoney(r.amount || 0) + '</td></tr>'
      ).join('') +
      '<tr class="total-row"><td class="text-right"><strong>TOTAL CASH FLOW</strong></td>' +
        '<td class="number-cell text-right"><strong>' + fmtMoney(cfTotal) + '</strong></td></tr>' +
      '</tbody></table></div>'
    : '<div class="empty-state" style="padding:20px"><p>Sin cash flow cargado</p></div>';

  // adicionales
  const adicionales = contract.adicionales || [];
  const adicNet = adicionalesNet(adicionales);
  const baseTotal = contract.base_total != null ? contract.base_total : ((contract.total_amount || 0) - adicNet);
  const adicionalesHtml = adicionales.length
    ? '<div class="table-wrap"><table><thead><tr><th>Tipo</th><th>Descripción</th><th>Fecha</th><th class="text-right">Monto</th></tr></thead><tbody>' +
      adicionales.map(function(a) {
        const isEco = a.type === 'economia';
        return '<tr>' +
          '<td><span class="badge ' + (isEco ? 'badge-red' : 'badge-green') + '">' + (isEco ? 'Economía' : 'Demasía') + '</span></td>' +
          '<td>' + (a.description || '-') + '</td>' +
          '<td>' + fmtDate(a.date) + '</td>' +
          '<td class="number-cell text-right ' + (isEco ? 'text-danger' : 'text-success') + '">' + (isEco ? '−' : '+') + fmtMoney(a.amount || 0) + '</td>' +
          '</tr>';
      }).join('') +
      '<tr class="total-row"><td colspan="3" class="text-right"><strong>Monto base ' + fmtMoney(baseTotal) + ' + adicionales netos</strong></td>' +
        '<td class="number-cell text-right"><strong>' + fmtMoney(adicNet) + '</strong></td></tr>' +
      '<tr class="total-row"><td colspan="3" class="text-right"><strong>MONTO VIGENTE</strong></td>' +
        '<td class="number-cell text-right"><strong style="color:var(--primary)">' + fmtMoney(contract.total_amount || 0) + '</strong></td></tr>' +
      '</tbody></table></div>'
    : '<div class="empty-state" style="padding:20px"><p>Sin adicionales cargados (economías ni demasías)</p></div>';

  // cronograma (Gantt) — bars filled by renderCronograma after init
  const cronoHtml =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">' +
      '<span style="font-size:11px;color:var(--text-muted)"><i class="fas fa-info-circle"></i> Barra = período de la partida · relleno = avance certificado · línea roja = hoy · marcador negro (Desvío) = avance esperado</span>' +
      '<div style="display:flex;gap:6px">' +
        '<button id="crono-btn-proyectado" class="btn btn-sm btn-secondary" onclick="renderCronograma(\'' + id + '\',\'proyectado\')">Proyectado</button>' +
        '<button id="crono-btn-real" class="btn btn-sm btn-primary" onclick="renderCronograma(\'' + id + '\',\'real\')">Real</button>' +
        '<button id="crono-btn-desvio" class="btn btn-sm btn-secondary" onclick="renderCronograma(\'' + id + '\',\'desvio\')">Desvío</button>' +
      '</div>' +
    '</div>' +
    '<div id="crono-bars"></div>';

  const condHtml =
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:12px">' +
      '<div style="background:var(--bg);padding:10px;border-radius:6px"><div class="form-label">Anticipo</div><strong>' + fmtPct(contract.anticipo_pct || 0) + '</strong></div>' +
      '<div style="background:var(--bg);padding:10px;border-radius:6px"><div class="form-label">Fondo de Reparo</div><strong>' + fmtPct(contract.fondo_reparo_pct || 0) + '</strong></div>' +
      '<div style="background:var(--bg);padding:10px;border-radius:6px"><div class="form-label">Depósito en Garantía</div><strong>' + fmtPct(contract.deposito_garantia_pct || 0) + '</strong></div>' +
      '<div style="background:var(--bg);padding:10px;border-radius:6px"><div class="form-label">Índice de Actualización</div><strong>' + (idx ? (idx.code + ' — ' + idx.name) : 'Ninguno') + '</strong></div>' +
      '<div style="background:var(--bg);padding:10px;border-radius:6px"><div class="form-label">Forma de Pago</div><strong>' + (contract.forma_pago || '-') + '</strong></div>' +
      '<div style="background:var(--bg);padding:10px;border-radius:6px"><div class="form-label">Anticipo $</div><strong>' + fmtMoney((contract.total_amount || 0) * (contract.anticipo_pct || 0) / 100) + '</strong></div>' +
    '</div>';

  openModal('Contrato ' + contract.number,
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;font-size:12px">' +
      '<div style="background:var(--bg);padding:12px;border-radius:8px">' +
        '<div style="font-weight:700;margin-bottom:8px;font-size:13px">DATOS DEL CONTRATO</div>' +
        '<div><strong>Proyecto:</strong> ' + (proj ? proj.name : '-') + '</div>' +
        '<div><strong>Contratista:</strong> ' + (sup ? sup.name : '-') + '</div>' +
        '<div><strong>Tipo:</strong> ' + (CONTRACT_TYPES[contract.type] || '-') + '</div>' +
        '<div><strong>Estado:</strong> ' + (statusLabel[contract.status] || contract.status || '-') + '</div>' +
        (contract.notes ? '<div style="margin-top:6px;color:var(--text-muted)"><strong>Notas:</strong> ' + contract.notes + '</div>' : '') +
      '</div>' +
      '<div style="background:var(--bg);padding:12px;border-radius:8px">' +
        '<div style="font-weight:700;margin-bottom:8px;font-size:13px">PLAZOS Y MONTOS</div>' +
        '<div><strong>Inicio:</strong> ' + fmtDate(contract.start_date) + '</div>' +
        '<div><strong>Fin:</strong> ' + fmtDate(contract.end_date) + '</div>' +
        '<div><strong>Monto Total:</strong> ' + fmtMoney(contract.total_amount || 0) + '</div>' +
        '<div><strong>Certificado:</strong> ' + fmtMoney(totalCertified) + ' (' + fmtPct(avance) + ')</div>' +
        '<div><strong>Saldo:</strong> ' + fmtMoney((contract.total_amount || 0) - totalCertified) + '</div>' +
        '<div style="margin-top:8px">' + progressBar(avance) + '</div>' +
      '</div>' +
    '</div>' +
    '<div id="contract-detail-tabs">' +
      '<div class="tabs">' +
        '<button class="tab-btn" data-tab="ctab-cond">Condiciones</button>' +
        '<button class="tab-btn" data-tab="ctab-items">Partidas (' + (contract.items || []).length + ')</button>' +
        '<button class="tab-btn" data-tab="ctab-crono">Cronograma</button>' +
        '<button class="tab-btn" data-tab="ctab-certs">Certificaciones (' + certs.length + ')</button>' +
        '<button class="tab-btn" data-tab="ctab-adic">Adicionales (' + (contract.adicionales || []).length + ')</button>' +
        '<button class="tab-btn" data-tab="ctab-cf">Cash Flow</button>' +
      '</div>' +
      '<div id="ctab-cond" class="tab-content">' + condHtml + '</div>' +
      '<div id="ctab-items" class="tab-content">' + itemsHtml + '</div>' +
      '<div id="ctab-crono" class="tab-content">' + cronoHtml + '</div>' +
      '<div id="ctab-certs" class="tab-content">' + certsHtml + '</div>' +
      '<div id="ctab-adic" class="tab-content">' + adicionalesHtml + '</div>' +
      '<div id="ctab-cf" class="tab-content">' + cashflowHtml + '</div>' +
    '</div>',
  'modal-xl',
    '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>' +
    '<button class="btn btn-secondary" onclick="closeModal();openContractForm(\'' + id + '\')"><i class="fas fa-edit"></i> Editar</button>' +
    (contract.status === 'draft'
      ? '<button class="btn btn-success" onclick="closeModal();startContract(\'' + id + '\')"><i class="fas fa-play"></i> Dar Inicio</button>'
      : '') +
    (contract.status === 'active'
      ? '<button class="btn btn-primary" onclick="closeModal();openContractCertForm(\'' + id + '\')"><i class="fas fa-certificate"></i> Nueva Certificación</button>' +
        '<button class="btn btn-success" onclick="closeModal();finishContract(\'' + id + '\')"><i class="fas fa-flag-checkered"></i> Finalizar Contrato</button>'
      : '')
  );
  setTimeout(function() {
    initTabs('contract-detail-tabs');
    renderCronograma(id, 'real');
  }, 50);
}

// ---- FINALIZAR CONTRATO ----
function finishContract(id) {
  const contract = DB.getById('contracts', id);
  if (!contract) return;
  confirmDialog('¿Finalizar el contrato ' + contract.number + '? Pasará a estado Completado.', function() {
    DB.update('contracts', id, { status: 'completed', completed_date: todayStr() });
    toast('Contrato finalizado', 'success');
    renderContratos();
  });
}

// ---- CERTIFICADO → FACTURA DE PROVEEDOR ----
function generateInvoiceFromCert(certId) {
  const cert = DB.getById('certificates', certId);
  if (!cert) return;
  const contract = cert.contract_id ? DB.getById('contracts', cert.contract_id) : null;
  const supplierId = contract ? contract.contractor_id : '';
  const sup = supplierId ? DB.getById('suppliers', supplierId) : null;

  // existing unlinked supplier invoices for this contractor
  const existing = DB.getAll('supplierInvoices').filter(function(si) {
    return !si.cert_id && si.status !== 'cancelled' && (!supplierId || si.supplier_id === supplierId);
  });
  const statusLabel = { pending: 'Pendiente', paid: 'Pagada' };

  openModal('Relacionar Certificado ' + cert.number + ' con Factura',
    '<div style="background:var(--bg);padding:10px;border-radius:8px;margin-bottom:14px;font-size:12px">' +
      '<strong>' + cert.number + '</strong>' + (contract ? ' — Contrato ' + contract.number : '') +
      ' &nbsp;|&nbsp; Proveedor: ' + (sup ? sup.name : '-') +
      ' &nbsp;|&nbsp; Monto certificado: <strong>' + fmtMoney(cert.subtotal || 0) + '</strong>' +
      ' &nbsp;|&nbsp; Neto: <strong>' + fmtMoney(cert.net_amount || 0) + '</strong>' +
    '</div>' +
    '<div style="display:flex;flex-direction:column;gap:14px">' +
      '<div style="border:1px solid var(--border);border-radius:8px;padding:12px">' +
        '<div style="font-weight:600;font-size:13px;margin-bottom:6px"><i class="fas fa-plus-circle text-primary"></i> Generar nueva factura</div>' +
        '<p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">Crea una factura de proveedor con el monto del certificado (más IVA 21%), vinculada a este certificado.</p>' +
        '<button class="btn btn-primary" onclick="doGenerateInvoiceFromCert(\'' + certId + '\')"><i class="fas fa-file-invoice"></i> Generar y Vincular Factura</button>' +
      '</div>' +
      '<div style="border:1px solid var(--border);border-radius:8px;padding:12px">' +
        '<div style="font-weight:600;font-size:13px;margin-bottom:6px"><i class="fas fa-link text-primary"></i> Vincular a factura existente</div>' +
        (existing.length
          ? '<div style="display:flex;gap:8px;align-items:center">' +
            '<select class="form-control" id="cert-link-si">' +
              existing.map(function(si) { return '<option value="' + si.id + '">' + si.number + ' — ' + fmtMoney(si.total) + ' [' + (statusLabel[si.status] || si.status) + ']</option>'; }).join('') +
            '</select>' +
            '<button class="btn btn-secondary" onclick="linkCertToExistingInvoice(\'' + certId + '\')"><i class="fas fa-link"></i> Vincular</button>' +
          '</div>'
          : '<p style="font-size:12px;color:var(--text-muted)">No hay facturas de proveedor sin vincular para este proveedor.</p>') +
      '</div>' +
    '</div>',
  'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>'
  );
}

function doGenerateInvoiceFromCert(certId) {
  const cert = DB.getById('certificates', certId);
  if (!cert) return;
  const contract = cert.contract_id ? DB.getById('contracts', cert.contract_id) : null;
  const supplierId = contract ? contract.contractor_id : '';
  const sub = cert.subtotal || 0;
  const tax = sub * 0.21;
  const nextNum = 'FPROV-' + new Date().getFullYear() + '-' + String(DB.getAll('supplierInvoices').length + 1).padStart(3, '0');

  const si = DB.insert('supplierInvoices', {
    number:      nextNum,
    po_id:       '',
    cert_id:     certId,
    supplier_id: supplierId,
    project_id:  cert.project_id,
    date:        todayStr(),
    due_date:    addDays(todayStr(), 30),
    subtotal:    sub,
    tax:         tax,
    total:       sub + tax,
    status:      'pending',
    notes:       'Generada desde certificado ' + cert.number + (contract ? ' (contrato ' + contract.number + ')' : ''),
  });

  DB.update('certificates', certId, { supplier_invoice_id: si.id });
  toast('Factura ' + nextNum + ' generada y vinculada al certificado', 'success');
  closeModal();
  if (cert.contract_id) viewContract(cert.contract_id);
  else renderContratos();
}

function linkCertToExistingInvoice(certId) {
  const cert = DB.getById('certificates', certId);
  const siId = document.getElementById('cert-link-si').value;
  if (!siId) { toast('Seleccioná una factura', 'error'); return; }
  DB.update('certificates', certId, { supplier_invoice_id: siId });
  DB.update('supplierInvoices', siId, { cert_id: certId });
  toast('Certificado vinculado a la factura', 'success');
  closeModal();
  if (cert.contract_id) viewContract(cert.contract_id);
  else renderContratos();
}

// ---- DAR INICIO ----
function startContract(id) {
  const contract = DB.getById('contracts', id);
  if (!contract) return;
  if (!(contract.items || []).length) { toast('Cargá al menos una partida antes de iniciar el contrato', 'error'); return; }
  confirmDialog('¿Dar inicio al contrato ' + contract.number + '? Una vez iniciado podrás cargar certificaciones.', function() {
    DB.update('contracts', id, { status: 'active', started_date: todayStr() });
    toast('Contrato iniciado — ya podés certificar', 'success');
    renderContratos();
  });
}

// ---- CRONOGRAMA (GANTT) ----
function clampVal(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function monthsBetween(startStr, endStr) {
  const months = [];
  if (!startStr || !endStr) return months;
  let d = new Date(startStr.slice(0, 7) + '-01T00:00:00');
  const end = new Date(endStr.slice(0, 7) + '-01T00:00:00');
  let guard = 0;
  while (d <= end && guard < 240) {
    months.push(d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }));
    d.setMonth(d.getMonth() + 1);
    guard++;
  }
  return months;
}

function buildCronogramaHtml(contract, mode) {
  const start = contract.start_date;
  const end   = contract.end_date;
  if (!start || !end) return '<div class="empty-state" style="padding:20px"><p>El contrato no tiene fechas de inicio y fin definidas.</p></div>';

  const t0   = new Date(start + 'T00:00:00').getTime();
  const t1   = new Date(end   + 'T00:00:00').getTime();
  const span = t1 - t0;
  if (span <= 0) return '<div class="empty-state" style="padding:20px"><p>Fechas de contrato inválidas.</p></div>';

  const months    = monthsBetween(start, end);
  const today     = new Date().getTime();
  const todayPct  = clampVal((today - t0) / span * 100, 0, 100);

  const certs = DB.getAll('certificates').filter(function(c) {
    return c.contract_id === contract.id && c.status !== 'rejected';
  });
  const accumByDesc = {};
  certs.forEach(function(c) {
    (c.items || []).forEach(function(it) {
      const k = (it.description || '').trim();
      accumByDesc[k] = (accumByDesc[k] || 0) + (it.quantity_period || 0);
    });
  });

  const items = contract.items || [];
  if (!items.length) return '<div class="empty-state" style="padding:20px"><p>No hay partidas cargadas en el contrato.</p></div>';

  const pctPerMonth = months.length > 0 ? (100 / months.length) : 100;
  const headerHtml =
    '<div style="display:flex;margin-left:200px;margin-bottom:4px">' +
    months.map(function(m) {
      return '<div style="width:' + pctPerMonth + '%;font-size:9px;color:var(--text-muted);text-align:center;border-left:1px solid var(--border);padding:2px 0;overflow:hidden;white-space:nowrap">' + m + '</div>';
    }).join('') +
    '</div>';

  const rowsHtml = items.map(function(it) {
    const iStart   = it.start_date ? new Date(it.start_date + 'T00:00:00').getTime() : t0;
    const iEnd     = it.end_date   ? new Date(it.end_date   + 'T00:00:00').getTime() : t1;
    const leftPct  = clampVal((iStart - t0) / span * 100, 0, 100);
    const widthPct = clampVal((iEnd - iStart) / span * 100, 0, 100 - leftPct);

    const accum   = accumByDesc[(it.description || '').trim()] || 0;
    const certPct = it.quantity > 0 ? clampVal(accum / it.quantity * 100, 0, 100) : 0;

    const iSpan    = (iEnd - iStart) || 1;
    const elapsed  = clampVal(today - iStart, 0, iSpan);
    const expPct   = clampVal(elapsed / iSpan * 100, 0, 100);

    var fillStyle, markerHtml;
    markerHtml = '';

    if (mode === 'proyectado') {
      fillStyle = 'position:absolute;left:0;top:0;right:0;bottom:0;background:repeating-linear-gradient(45deg,var(--primary),var(--primary) 3px,transparent 3px,transparent 10px);opacity:0.65';
    } else if (mode === 'real') {
      fillStyle = 'position:absolute;left:0;top:0;bottom:0;width:' + certPct + '%;background:var(--primary);opacity:0.85';
    } else {
      var fillColor = certPct >= expPct ? 'var(--success)' : 'var(--danger)';
      fillStyle = 'position:absolute;left:0;top:0;bottom:0;width:' + certPct + '%;background:' + fillColor + ';opacity:0.8';
      markerHtml = '<div style="position:absolute;left:' + expPct + '%;top:0;bottom:0;width:2px;background:rgba(0,0,0,0.5);z-index:2"></div>';
    }

    return '<div style="display:flex;align-items:center;margin-bottom:5px;height:26px">' +
      '<div style="width:200px;min-width:200px;font-size:11px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;padding-right:6px" title="' + (it.description || '') + '">' + (it.description || 'Partida') + '</div>' +
      '<div style="flex:1;position:relative;height:100%;background:var(--bg);border:1px solid var(--border);border-radius:3px">' +
        '<div style="position:absolute;left:' + todayPct + '%;top:0;bottom:0;width:1px;background:var(--danger);z-index:3;opacity:0.75"></div>' +
        '<div style="position:absolute;left:' + leftPct + '%;width:' + widthPct + '%;top:2px;bottom:2px;background:rgba(99,115,232,0.12);border-radius:2px;overflow:hidden">' +
          '<div style="' + fillStyle + '"></div>' +
          markerHtml +
        '</div>' +
        '<div style="position:absolute;right:4px;top:50%;transform:translateY(-50%);font-size:9px;color:var(--text-muted);z-index:4">' + Math.round(certPct) + '%</div>' +
      '</div>' +
    '</div>';
  }).join('');

  const legendHtml =
    '<div style="display:flex;gap:16px;margin-top:10px;font-size:10px;color:var(--text-muted);flex-wrap:wrap">' +
    '<span><span style="display:inline-block;width:12px;height:12px;background:var(--primary);border-radius:2px;vertical-align:middle;margin-right:3px"></span>Avance certificado</span>' +
    '<span><span style="display:inline-block;width:12px;height:12px;background:var(--danger);border-radius:2px;vertical-align:middle;margin-right:3px"></span>Hoy</span>' +
    (mode === 'desvio'
      ? '<span><span style="display:inline-block;width:2px;height:12px;background:rgba(0,0,0,0.5);vertical-align:middle;margin-right:3px"></span>Avance esperado</span>' +
        '<span><span style="display:inline-block;width:12px;height:12px;background:var(--success);border-radius:2px;vertical-align:middle;margin-right:3px"></span>Adelantado</span>' +
        '<span><span style="display:inline-block;width:12px;height:12px;background:var(--danger);border-radius:2px;vertical-align:middle;margin-right:3px"></span>Demorado</span>'
      : '') +
    '</div>';

  return '<div style="overflow-x:auto">' + headerHtml + '<div style="min-width:600px">' + rowsHtml + '</div>' + legendHtml + '</div>';
}

function renderCronograma(contractId, mode) {
  window._cronoMode = mode;
  const contract = DB.getById('contracts', contractId);
  if (!contract) return;
  const bars = document.getElementById('crono-bars');
  if (bars) bars.innerHTML = buildCronogramaHtml(contract, mode);
  ['proyectado', 'real', 'desvio'].forEach(function(m) {
    const b = document.getElementById('crono-btn-' + m);
    if (b) b.className = 'btn btn-sm ' + (m === mode ? 'btn-primary' : 'btn-secondary');
  });
}

// ---- CONTRACT FORM ----
function openContractForm(id = null) {
  const contract  = id ? DB.getById('contracts', id) : null;
  const projects  = DB.getAll('projects');
  const suppliers = DB.getAll('suppliers');
  const boqItems  = DB.getAll('boqItems');
  const indices   = DB.getAll('priceIndices');
  const nextNum   = 'CONT-' + new Date().getFullYear() + '-' + String(DB.getAll('contracts').length + 1).padStart(3, '0');
  const items     = (contract && contract.items && contract.items.length) ? contract.items : [{ description: '', unit: 'm²', quantity: 0, unit_price: 0, total: 0, boq_item_id: '' }];
  const cashflow  = (contract && contract.cash_flow && contract.cash_flow.length) ? contract.cash_flow : [];
  const adicionales = (contract && contract.adicionales && contract.adicionales.length) ? contract.adicionales : [];

  const boqOpts = boqItems.map(b => '<option value="' + b.id + '">' + b.description + ' (' + b.unit + ')</option>').join('');
  const idxOpts = indices.map(ix => '<option value="' + ix.id + '" ' + ((contract && contract.indice_id === ix.id) ? 'selected' : '') + '>' + ix.code + ' — ' + ix.name + '</option>').join('');

  openModal(contract ? 'Editar Contrato' : 'Nuevo Contrato de Obra',
    '<div id="contract-form-tabs">' +
    '<div class="tabs">' +
      '<button class="tab-btn" data-tab="cf-general">General</button>' +
      '<button class="tab-btn" data-tab="cf-cond">Condiciones</button>' +
      '<button class="tab-btn" data-tab="cf-partidas">Partidas de Obra</button>' +
      '<button class="tab-btn" data-tab="cf-crono">Cronograma</button>' +
      '<button class="tab-btn" data-tab="cf-adicionales">Adicionales</button>' +
      '<button class="tab-btn" data-tab="cf-cashflow">Cash Flow</button>' +
    '</div>' +

    // GENERAL
    '<div id="cf-general" class="tab-content"><div class="form-grid form-grid-2">' +
      '<div class="form-group"><label class="form-label">Número de Contrato</label>' +
        '<input class="form-control" id="cont-num" value="' + ((contract && contract.number) || nextNum) + '"></div>' +
      '<div class="form-group"><label class="form-label">Estado</label>' +
        '<select class="form-control" id="cont-status">' +
          '<option value="draft" ' + ((!contract || contract.status === 'draft') ? 'selected' : '') + '>Borrador</option>' +
          '<option value="active" ' + ((contract && contract.status === 'active') ? 'selected' : '') + '>Activo</option>' +
          '<option value="completed" ' + ((contract && contract.status === 'completed') ? 'selected' : '') + '>Completado</option>' +
          '<option value="cancelled" ' + ((contract && contract.status === 'cancelled') ? 'selected' : '') + '>Cancelado</option>' +
        '</select></div>' +
      '<div class="form-group"><label class="form-label">Proyecto *</label>' +
        '<select class="form-control" id="cont-project">' +
          '<option value="">Seleccionar...</option>' +
          projects.map(p => '<option value="' + p.id + '" ' + ((contract && contract.project_id === p.id) ? 'selected' : '') + '>' + p.name + '</option>').join('') +
        '</select></div>' +
      '<div class="form-group"><label class="form-label">Contratista *</label>' +
        '<select class="form-control" id="cont-contractor">' +
          '<option value="">Seleccionar...</option>' +
          suppliers.map(s => '<option value="' + s.id + '" ' + ((contract && contract.contractor_id === s.id) ? 'selected' : '') + '>' + s.name + '</option>').join('') +
        '</select></div>' +
      '<div class="form-group"><label class="form-label">Tipo de Contrato</label>' +
        '<select class="form-control" id="cont-type">' +
          '<option value="lump_sum" ' + ((!contract || contract.type === 'lump_sum') ? 'selected' : '') + '>Suma Alzada</option>' +
          '<option value="unit_price" ' + ((contract && contract.type === 'unit_price') ? 'selected' : '') + '>Por Unidad de Medida</option>' +
          '<option value="cost_plus" ' + ((contract && contract.type === 'cost_plus') ? 'selected' : '') + '>Coste Más Honorarios</option>' +
          '<option value="mixed" ' + ((contract && contract.type === 'mixed') ? 'selected' : '') + '>Mixto</option>' +
        '</select></div>' +
      '<div class="form-group"><label class="form-label">Fecha de Inicio</label>' +
        '<input class="form-control" id="cont-start" type="date" value="' + ((contract && contract.start_date) || todayStr()) + '"></div>' +
      '<div class="form-group"><label class="form-label">Fecha de Fin</label>' +
        '<input class="form-control" id="cont-end" type="date" value="' + ((contract && contract.end_date) || addDays(todayStr(), 180)) + '"></div>' +
      '<div class="form-group full"><label class="form-label">Notas</label>' +
        '<textarea class="form-control" id="cont-notes" rows="2">' + ((contract && contract.notes) || '') + '</textarea></div>' +
    '</div></div>' +

    // CONDICIONES
    '<div id="cf-cond" class="tab-content"><div class="form-grid form-grid-2">' +
      '<div class="form-group"><label class="form-label">Anticipo (%)</label>' +
        '<input class="form-control" id="cont-anticipo" type="number" min="0" max="100" value="' + ((contract && contract.anticipo_pct) || 0) + '"></div>' +
      '<div class="form-group"><label class="form-label">Fondo de Reparo (%)</label>' +
        '<input class="form-control" id="cont-fondo" type="number" min="0" max="20" value="' + ((contract && contract.fondo_reparo_pct != null) ? contract.fondo_reparo_pct : 5) + '"></div>' +
      '<div class="form-group"><label class="form-label">Depósito en Garantía (%)</label>' +
        '<input class="form-control" id="cont-deposito" type="number" min="0" max="20" value="' + ((contract && contract.deposito_garantia_pct) || 0) + '"></div>' +
      '<div class="form-group"><label class="form-label">Índice de Actualización</label>' +
        '<select class="form-control" id="cont-indice"><option value="">Sin índice</option>' + idxOpts + '</select></div>' +
      '<div class="form-group full"><label class="form-label">Forma de Pago</label>' +
        formaPagoSelect('cont-forma-pago', (contract && contract.forma_pago) || 'Transferencia') + '</div>' +
    '</div>' +
    '<div style="margin-top:10px;padding:10px;background:var(--bg);border-radius:6px;font-size:12px;color:var(--text-muted)">' +
      '<i class="fas fa-info-circle"></i> El anticipo y el fondo de reparo se aplican sobre el monto total del contrato. El fondo de reparo se descuenta de cada certificación.' +
    '</div></div>' +

    // PARTIDAS
    '<div id="cf-partidas" class="tab-content">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
      '<strong style="font-size:13px">Partidas de Obra (vinculadas al presupuesto)</strong>' +
      '<button class="btn btn-sm btn-secondary" onclick="addContractItem()"><i class="fas fa-plus"></i> Agregar partida</button>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:2.5fr 70px 90px 110px 110px 1.5fr 34px;gap:4px;margin-bottom:4px;font-size:10px;font-weight:600;color:var(--text-muted)">' +
      '<span>Descripción</span><span>Unidad</span><span>Cantidad</span><span>P.Unit.</span><span>Total</span><span>Partida BOQ</span><span></span>' +
    '</div>' +
    '<div id="cont-items">' +
      items.map(function(it, i) { return contractItemRow(it, i, boqOpts); }).join('') +
    '</div>' +
    '<div id="cont-totals" style="text-align:right;margin-top:10px;font-size:13px">' +
      calcContractTotalsHtml(items) +
    '</div></div>' +

    // CRONOGRAMA (fechas por partida)
    '<div id="cf-crono" class="tab-content">' +
    '<div style="margin-bottom:10px;font-size:12px;color:var(--text-muted)">' +
      '<i class="fas fa-info-circle"></i> Definí el inicio y fin de cada partida. Por defecto toman el período del contrato. El avance se mostrará según las certificaciones.' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:2.5fr 160px 160px;gap:6px;margin-bottom:4px;font-size:10px;font-weight:600;color:var(--text-muted)">' +
      '<span>Partida</span><span>Inicio</span><span>Fin</span>' +
    '</div>' +
    '<div id="cont-crono-rows">' +
      items.map(function(it, i) { return cronoFormRow(it, i, (contract && contract.start_date) || todayStr(), (contract && contract.end_date) || addDays(todayStr(), 180)); }).join('') +
    '</div></div>' +

    // ADICIONALES (economías y demasías)
    '<div id="cf-adicionales" class="tab-content">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
      '<strong style="font-size:13px">Adicionales — Demasías (+) y Economías (−)</strong>' +
      '<button class="btn btn-sm btn-secondary" onclick="addAdicionalRow()"><i class="fas fa-plus"></i> Agregar adicional</button>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:130px 2.5fr 130px 130px 34px;gap:5px;margin-bottom:4px;font-size:10px;font-weight:600;color:var(--text-muted)">' +
      '<span>Tipo</span><span>Descripción</span><span>Fecha</span><span>Monto</span><span></span>' +
    '</div>' +
    '<div id="cont-adicionales">' +
      adicionales.map(function(a, i) { return adicionalRow(a, i); }).join('') +
    '</div>' +
    '<div id="adic-totals" style="text-align:right;margin-top:10px;font-size:13px">' +
      calcAdicionalesTotalsHtml(adicionales, items) +
    '</div>' +
    '<div style="margin-top:10px;padding:10px;background:var(--bg);border-radius:6px;font-size:12px;color:var(--text-muted)">' +
      '<i class="fas fa-info-circle"></i> Las <strong>demasías</strong> suman al monto del contrato y las <strong>economías</strong> lo reducen. El monto vigente del contrato es la base más los adicionales netos.' +
    '</div></div>' +

    // CASH FLOW
    '<div id="cf-cashflow" class="tab-content">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
      '<strong style="font-size:13px">Cash Flow Previsto (distribución mensual)</strong>' +
      '<button class="btn btn-sm btn-secondary" onclick="addCashflowRow()"><i class="fas fa-plus"></i> Agregar mes</button>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:200px 200px 34px;gap:6px;margin-bottom:4px;font-size:10px;font-weight:600;color:var(--text-muted)">' +
      '<span>Mes</span><span>Monto previsto</span><span></span>' +
    '</div>' +
    '<div id="cont-cashflow">' +
      cashflow.map(function(r, i) { return cashflowRow(r, i); }).join('') +
    '</div>' +
    '<div id="cf-totals" style="text-align:right;margin-top:10px;font-size:13px">' +
      calcCashflowTotalsHtml(cashflow, items) +
    '</div></div>' +

    '</div>',
  'modal-xl',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="saveContract(\'' + (id || '') + '\')"><i class="fas fa-save"></i> Guardar</button>'
  );
  window._contractItems = items.map(function(it) { return Object.assign({}, it); });
  window._contractCashflow = cashflow.map(function(r) { return Object.assign({}, r); });
  window._contractAdicionales = adicionales.map(function(a) { return Object.assign({}, a); });
  window._cronoDefaults = { start: (contract && contract.start_date) || todayStr(), end: (contract && contract.end_date) || addDays(todayStr(), 180) };
  setTimeout(function() { initTabs('contract-form-tabs'); }, 30);
}

function contractItemRow(it, i, boqOpts) {
  const opts = boqOpts || DB.getAll('boqItems').map(b => '<option value="' + b.id + '">' + b.description + '</option>').join('');
  // mark selected boq option
  const optsWithSel = '<option value="">Sin partida BOQ</option>' +
    DB.getAll('boqItems').map(b => '<option value="' + b.id + '" ' + (it.boq_item_id === b.id ? 'selected' : '') + '>' + b.description + ' (' + b.unit + ')</option>').join('');
  return '<div id="coni-row-' + i + '" style="display:grid;grid-template-columns:2.5fr 70px 90px 110px 110px 1.5fr 34px;gap:4px;margin-bottom:6px;align-items:center">' +
    '<input class="form-control" style="font-size:12px" placeholder="Descripción de la partida" value="' + (it.description || '') + '" oninput="updateContractItem(' + i + ',\'description\',this.value)">' +
    '<input class="form-control" style="font-size:12px" value="' + (it.unit || 'm²') + '" oninput="updateContractItem(' + i + ',\'unit\',this.value)">' +
    '<input class="form-control" style="font-size:12px" type="number" min="0" value="' + (it.quantity || 0) + '" oninput="updateContractItem(' + i + ',\'quantity\',+this.value)">' +
    '<input class="form-control" style="font-size:12px" type="number" min="0" value="' + (it.unit_price || 0) + '" oninput="updateContractItem(' + i + ',\'unit_price\',+this.value)">' +
    '<input class="form-control" style="font-size:12px;background:#f8fafc" readonly id="coni-total-' + i + '" value="' + (it.total || 0) + '">' +
    '<select class="form-control" style="font-size:11px" onchange="updateContractItem(' + i + ',\'boq_item_id\',this.value)">' +
      optsWithSel +
    '</select>' +
    '<button class="btn-ghost btn danger" onclick="removeContractItem(' + i + ')"><i class="fas fa-times"></i></button>' +
    '</div>';
}

window._contractItems = [];
function addContractItem() {
  const it = { description: '', unit: 'm²', quantity: 0, unit_price: 0, total: 0, boq_item_id: '' };
  window._contractItems.push(it);
  const i = window._contractItems.length - 1;
  const cont = document.getElementById('cont-items');
  const div = document.createElement('div');
  div.innerHTML = contractItemRow(it, i);
  cont.appendChild(div.firstElementChild);
  // keep cronograma rows in sync
  const cr = document.getElementById('cont-crono-rows');
  if (cr) {
    const def = window._cronoDefaults || { start: todayStr(), end: addDays(todayStr(), 180) };
    const d2 = document.createElement('div');
    d2.innerHTML = cronoFormRow(Object.assign({}, it), i, def.start, def.end);
    cr.appendChild(d2.firstElementChild);
  }
}

function cronoFormRow(it, i, defStart, defEnd) {
  return '<div id="crono-form-row-' + i + '" style="display:grid;grid-template-columns:2.5fr 160px 160px;gap:6px;margin-bottom:6px;align-items:center">' +
    '<input class="form-control" style="font-size:12px;background:#f8fafc" readonly value="' + (it.description || ('Partida ' + (i + 1))) + '">' +
    '<input class="form-control" style="font-size:12px" type="date" value="' + (it.start_date || defStart) + '" oninput="updateContractItem(' + i + ',\'start_date\',this.value)">' +
    '<input class="form-control" style="font-size:12px" type="date" value="' + (it.end_date || defEnd) + '" oninput="updateContractItem(' + i + ',\'end_date\',this.value)">' +
    '</div>';
}

function updateContractItem(i, field, val) {
  if (!window._contractItems[i]) window._contractItems[i] = { description: '', unit: 'm²', quantity: 0, unit_price: 0, total: 0, boq_item_id: '' };
  window._contractItems[i][field] = val;
  window._contractItems[i].total = (window._contractItems[i].quantity || 0) * (window._contractItems[i].unit_price || 0);
  const totEl = document.getElementById('coni-total-' + i);
  if (totEl) totEl.value = window._contractItems[i].total;
  const totalsEl = document.getElementById('cont-totals');
  if (totalsEl) totalsEl.innerHTML = calcContractTotalsHtml(window._contractItems.filter(Boolean));
  const cfTotalsEl = document.getElementById('cf-totals');
  if (cfTotalsEl) cfTotalsEl.innerHTML = calcCashflowTotalsHtml((window._contractCashflow || []).filter(Boolean), window._contractItems.filter(Boolean));
}

function removeContractItem(i) {
  const row = document.getElementById('coni-row-' + i);
  if (row) row.remove();
  const cronoRow = document.getElementById('crono-form-row-' + i);
  if (cronoRow) cronoRow.remove();
  window._contractItems[i] = null;
  const totalsEl = document.getElementById('cont-totals');
  if (totalsEl) totalsEl.innerHTML = calcContractTotalsHtml(window._contractItems.filter(Boolean));
}

function calcContractTotalsHtml(items) {
  const total = items.filter(Boolean).reduce(function(s, it) { return s + (it.total || 0); }, 0);
  return 'Partidas: <strong>' + items.filter(Boolean).length + '</strong> &nbsp;|&nbsp; TOTAL CONTRATO: <strong style="font-size:15px;color:var(--primary)">' + fmtMoney(total) + '</strong>';
}

// ---- CASH FLOW ROWS ----
function cashflowRow(r, i) {
  return '<div id="cf-row-' + i + '" style="display:grid;grid-template-columns:200px 200px 34px;gap:6px;margin-bottom:6px;align-items:center">' +
    '<input class="form-control" style="font-size:12px" type="month" value="' + (r.month || '') + '" oninput="updateCashflowRow(' + i + ',\'month\',this.value)">' +
    '<input class="form-control" style="font-size:12px" type="number" min="0" value="' + (r.amount || 0) + '" oninput="updateCashflowRow(' + i + ',\'amount\',+this.value)">' +
    '<button class="btn-ghost btn danger" onclick="removeCashflowRow(' + i + ')"><i class="fas fa-times"></i></button>' +
    '</div>';
}

window._contractCashflow = [];
function addCashflowRow() {
  const r = { month: '', amount: 0 };
  window._contractCashflow.push(r);
  const i = window._contractCashflow.length - 1;
  const cont = document.getElementById('cont-cashflow');
  const div = document.createElement('div');
  div.innerHTML = cashflowRow(r, i);
  cont.appendChild(div.firstElementChild);
}

function updateCashflowRow(i, field, val) {
  if (!window._contractCashflow[i]) window._contractCashflow[i] = { month: '', amount: 0 };
  window._contractCashflow[i][field] = val;
  const el = document.getElementById('cf-totals');
  if (el) el.innerHTML = calcCashflowTotalsHtml(window._contractCashflow.filter(Boolean), (window._contractItems || []).filter(Boolean));
}

function removeCashflowRow(i) {
  const row = document.getElementById('cf-row-' + i);
  if (row) row.remove();
  window._contractCashflow[i] = null;
  const el = document.getElementById('cf-totals');
  if (el) el.innerHTML = calcCashflowTotalsHtml(window._contractCashflow.filter(Boolean), (window._contractItems || []).filter(Boolean));
}

function calcCashflowTotalsHtml(cashflow, items) {
  const cf = cashflow.filter(Boolean).reduce(function(s, r) { return s + (r.amount || 0); }, 0);
  const contractTotal = (items || []).filter(Boolean).reduce(function(s, it) { return s + (it.total || 0); }, 0);
  const diff = contractTotal - cf;
  const diffColor = Math.abs(diff) < 1 ? 'var(--success)' : 'var(--danger)';
  return 'Cash Flow: <strong>' + fmtMoney(cf) + '</strong> &nbsp;|&nbsp; Contrato: <strong>' + fmtMoney(contractTotal) + '</strong> &nbsp;|&nbsp; ' +
    'Diferencia: <strong style="color:' + diffColor + '">' + fmtMoney(diff) + '</strong>';
}

// ---- ADICIONALES (demasías / economías) ----
function adicionalRow(a, i) {
  return '<div id="adic-row-' + i + '" style="display:grid;grid-template-columns:130px 2.5fr 130px 130px 34px;gap:5px;margin-bottom:6px;align-items:center">' +
    '<select class="form-control" style="font-size:11px" onchange="updateAdicional(' + i + ',\'type\',this.value)">' +
      '<option value="demasia" ' + (a.type === 'demasia' || !a.type ? 'selected' : '') + '>Demasía (+)</option>' +
      '<option value="economia" ' + (a.type === 'economia' ? 'selected' : '') + '>Economía (−)</option>' +
    '</select>' +
    '<input class="form-control" style="font-size:12px" placeholder="Descripción del adicional" value="' + (a.description || '') + '" oninput="updateAdicional(' + i + ',\'description\',this.value)">' +
    '<input class="form-control" style="font-size:11px" type="date" value="' + (a.date || todayStr()) + '" oninput="updateAdicional(' + i + ',\'date\',this.value)">' +
    '<input class="form-control" style="font-size:12px" type="number" min="0" value="' + (a.amount || 0) + '" oninput="updateAdicional(' + i + ',\'amount\',+this.value)">' +
    '<button class="btn-ghost btn danger" onclick="removeAdicionalRow(' + i + ')"><i class="fas fa-times"></i></button>' +
    '</div>';
}

window._contractAdicionales = [];
function addAdicionalRow() {
  const a = { type: 'demasia', description: '', date: todayStr(), amount: 0 };
  window._contractAdicionales.push(a);
  const i = window._contractAdicionales.length - 1;
  const cont = document.getElementById('cont-adicionales');
  const div = document.createElement('div');
  div.innerHTML = adicionalRow(a, i);
  cont.appendChild(div.firstElementChild);
}

function updateAdicional(i, field, val) {
  if (!window._contractAdicionales[i]) window._contractAdicionales[i] = { type: 'demasia', description: '', date: todayStr(), amount: 0 };
  window._contractAdicionales[i][field] = val;
  const el = document.getElementById('adic-totals');
  if (el) el.innerHTML = calcAdicionalesTotalsHtml(window._contractAdicionales.filter(Boolean), (window._contractItems || []).filter(Boolean));
}

function removeAdicionalRow(i) {
  const row = document.getElementById('adic-row-' + i);
  if (row) row.remove();
  window._contractAdicionales[i] = null;
  const el = document.getElementById('adic-totals');
  if (el) el.innerHTML = calcAdicionalesTotalsHtml(window._contractAdicionales.filter(Boolean), (window._contractItems || []).filter(Boolean));
}

function adicionalesNet(adicionales) {
  return (adicionales || []).filter(Boolean).reduce(function(s, a) {
    return s + (a.type === 'economia' ? -(a.amount || 0) : (a.amount || 0));
  }, 0);
}

function calcAdicionalesTotalsHtml(adicionales, items) {
  const valid = (adicionales || []).filter(Boolean);
  const demasias = valid.filter(function(a) { return a.type !== 'economia'; }).reduce(function(s, a) { return s + (a.amount || 0); }, 0);
  const economias = valid.filter(function(a) { return a.type === 'economia'; }).reduce(function(s, a) { return s + (a.amount || 0); }, 0);
  const net = demasias - economias;
  const base = (items || []).filter(Boolean).reduce(function(s, it) { return s + (it.total || 0); }, 0);
  return 'Demasías: <strong class="text-success">+' + fmtMoney(demasias) + '</strong> &nbsp;|&nbsp; ' +
    'Economías: <strong class="text-danger">−' + fmtMoney(economias) + '</strong> &nbsp;|&nbsp; ' +
    'Neto: <strong>' + fmtMoney(net) + '</strong> &nbsp;|&nbsp; ' +
    'MONTO VIGENTE: <strong style="font-size:15px;color:var(--primary)">' + fmtMoney(base + net) + '</strong>';
}

function saveContract(id) {
  const projectId    = document.getElementById('cont-project').value;
  const contractorId = document.getElementById('cont-contractor').value;
  if (!projectId || !contractorId) { toast('Proyecto y contratista son obligatorios', 'error'); return; }

  const items = window._contractItems.filter(Boolean).filter(function(it) { return it.description; });
  const baseTotal = items.reduce(function(s, it) { return s + (it.total || 0); }, 0);
  const adicionales = (window._contractAdicionales || []).filter(Boolean).filter(function(a) { return (a.amount || 0) > 0; });
  const total = baseTotal + adicionalesNet(adicionales);
  const cashflow = (window._contractCashflow || []).filter(Boolean).filter(function(r) { return r.month; });

  const data = {
    number:                document.getElementById('cont-num').value,
    project_id:            projectId,
    contractor_id:         contractorId,
    type:                  document.getElementById('cont-type').value,
    status:                document.getElementById('cont-status').value,
    start_date:            document.getElementById('cont-start').value,
    end_date:              document.getElementById('cont-end').value,
    notes:                 document.getElementById('cont-notes').value.trim(),
    anticipo_pct:          parseFloat(document.getElementById('cont-anticipo').value) || 0,
    fondo_reparo_pct:      parseFloat(document.getElementById('cont-fondo').value) || 0,
    deposito_garantia_pct: parseFloat(document.getElementById('cont-deposito').value) || 0,
    indice_id:             document.getElementById('cont-indice').value || '',
    forma_pago:            document.getElementById('cont-forma-pago').value,
    items,
    adicionales,
    cash_flow:             cashflow,
    base_total:            baseTotal,
    total_amount:          total,
  };

  if (id) { DB.update('contracts', id, data); toast('Contrato actualizado', 'success'); }
  else    { DB.insert('contracts', data);      toast('Contrato creado', 'success'); }

  window._contractItems = [];
  window._contractCashflow = [];
  window._contractAdicionales = [];
  closeModal();
  renderContratos();
}

function deleteContract(id) {
  confirmDialog('¿Eliminar este contrato? Las certificaciones asociadas quedarán sin contrato.', function() {
    DB.remove('contracts', id);
    toast('Contrato eliminado', 'warning');
    renderContratos();
  });
}

// ==== CERTIFICATE FORM FROM CONTRACT (con acumulado + Contabilidad A/B) ====
function openContractCertForm(contractId) {
  const contract = DB.getById('contracts', contractId);
  if (!contract) return;
  const proj     = DB.getById('projects', contract.project_id);
  const nextNum  = 'CERT-' + new Date().getFullYear() + '-' + String(DB.getAll('certificates').length + 1).padStart(3, '0');

  // accumulated certified qty per partida from prior certs (exclude rejected)
  const priorCerts = DB.getAll('certificates').filter(c => c.contract_id === contractId && c.status !== 'rejected');
  const accumByDesc = {};
  priorCerts.forEach(c => (c.items || []).forEach(it => {
    const k = (it.description || '').trim();
    accumByDesc[k] = (accumByDesc[k] || 0) + (it.quantity_period || 0);
  }));

  const certItems = (contract.items || []).map(function(it) {
    const prev = accumByDesc[(it.description || '').trim()] || 0;
    return {
      description:       it.description,
      unit:              it.unit,
      quantity_contract: it.quantity,
      quantity_prev:     prev,
      quantity_period:   0,
      unit_price:        it.unit_price,
      amount_period:     0,
      pct_complete:      it.quantity > 0 ? Math.round(prev / it.quantity * 1000) / 10 : 0,
    };
  });
  if (!certItems.length) certItems.push({ description: '', unit: 'm²', quantity_contract: 0, quantity_prev: 0, quantity_period: 0, unit_price: 0, amount_period: 0, pct_complete: 0 });

  const retDefault = contract.fondo_reparo_pct != null ? contract.fondo_reparo_pct : 5;

  openModal('Nueva Certificación — ' + contract.number,
    '<div style="background:var(--bg);padding:10px;border-radius:8px;margin-bottom:14px;font-size:12px">' +
      '<strong>' + contract.number + '</strong> &nbsp;|&nbsp; Proyecto: ' + (proj ? proj.name : '-') +
      ' &nbsp;|&nbsp; Tipo: ' + (CONTRACT_TYPES[contract.type] || '-') +
      ' &nbsp;|&nbsp; Total: ' + fmtMoney(contract.total_amount || 0) +
    '</div>' +
    '<div class="form-grid form-grid-2">' +
      '<div class="form-group"><label class="form-label">Número</label><input class="form-control" id="ccf-num" value="' + nextNum + '"></div>' +
      '<div class="form-group"><label class="form-label">Estado</label>' +
        '<select class="form-control" id="ccf-status">' +
          '<option value="pending">Pendiente de Aprobación</option>' +
          '<option value="draft">Borrador</option>' +
        '</select></div>' +
      '<div class="form-group"><label class="form-label">Fecha</label>' +
        '<input class="form-control" id="ccf-date" type="date" value="' + todayStr() + '"></div>' +
      '<div class="form-group"><label class="form-label">Aprobado por</label>' +
        '<input class="form-control" id="ccf-approver" placeholder="Director de Obra"></div>' +
      '<div class="form-group"><label class="form-label">Período Desde</label>' +
        '<input class="form-control" id="ccf-from" type="date"></div>' +
      '<div class="form-group"><label class="form-label">Período Hasta</label>' +
        '<input class="form-control" id="ccf-to" type="date" value="' + todayStr() + '"></div>' +
      '<div class="form-group"><label class="form-label">% Fondo de Reparo</label>' +
        '<input class="form-control" id="ccf-ret-pct" type="number" min="0" max="20" value="' + retDefault + '" oninput="updateContractCertTotals()"></div>' +
      '<div class="form-group"><label class="form-label">Forma de Pago</label>' +
        formaPagoSelect('ccf-forma-pago', contract.forma_pago || 'Transferencia') + '</div>' +
    '</div>' +

    // CONTABILIDAD A/B
    '<div class="divider"></div>' +
    '<div style="font-size:13px;font-weight:600;margin-bottom:8px">Contabilidad (blanco / negro)</div>' +
    '<div class="form-grid form-grid-2">' +
      '<div class="form-group"><label class="form-label">Tipo de Contabilidad</label>' +
        '<select class="form-control" id="ccf-contab-tipo" onchange="onContabTipoChange()">' +
          '<option value="A">Solo A (formal)</option>' +
          '<option value="B">Solo B</option>' +
          '<option value="AB">A y B (split)</option>' +
        '</select></div>' +
      '<div class="form-group" id="ccf-pct-a-wrap" style="display:none"><label class="form-label">% en A (formal)</label>' +
        '<input class="form-control" id="ccf-pct-a" type="number" min="0" max="100" value="50" oninput="updateContractCertTotals()"></div>' +
    '</div>' +

    '<div class="divider"></div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
      '<strong style="font-size:13px">Ítems a Certificar (con acumulado)</strong>' +
      '<button class="btn btn-sm btn-secondary" onclick="addCCertItem()"><i class="fas fa-plus"></i> Ítem</button>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:2.6fr 55px 80px 80px 80px 95px 100px 70px 26px;gap:3px;margin-bottom:4px;font-size:9px;font-weight:600;color:var(--text-muted)">' +
      '<span>Descripción</span><span>Unid.</span><span>Cant.Contr.</span><span>Cert.Ant.</span><span>Período</span><span>P.Unit.</span><span>Monto</span><span>%Acum.</span><span></span>' +
    '</div>' +
    '<div id="ccert-items">' +
      certItems.map(function(it, i) { return ccertItemRow(it, i); }).join('') +
    '</div>' +
    '<div id="ccert-totals" style="text-align:right;margin-top:10px;font-size:13px">' +
      calcCCertTotalsHtml(certItems, retDefault, 'A', 100) +
    '</div>' +
    '<div class="form-group full mt-2"><label class="form-label">Notas</label>' +
      '<textarea class="form-control" id="ccf-notes" rows="2"></textarea></div>',
  'modal-xl',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="saveContractCert(\'' + contractId + '\')"><i class="fas fa-save"></i> Guardar Certificación</button>'
  );
  window._ccertItems = certItems.map(function(it) { return Object.assign({}, it); });
}

function onContabTipoChange() {
  const tipo = document.getElementById('ccf-contab-tipo').value;
  const wrap = document.getElementById('ccf-pct-a-wrap');
  if (wrap) wrap.style.display = (tipo === 'AB') ? '' : 'none';
  updateContractCertTotals();
}

function ccertItemRow(it, i) {
  return '<div id="cci-row-' + i + '" style="display:grid;grid-template-columns:2.6fr 55px 80px 80px 80px 95px 100px 70px 26px;gap:3px;margin-bottom:4px;align-items:center">' +
    '<input class="form-control" style="font-size:11px" placeholder="Descripción" value="' + (it.description || '') + '" oninput="updateCCI(' + i + ',\'description\',this.value)">' +
    '<input class="form-control" style="font-size:11px" value="' + (it.unit || 'm²') + '" oninput="updateCCI(' + i + ',\'unit\',this.value)">' +
    '<input class="form-control" style="font-size:11px" type="number" min="0" value="' + (it.quantity_contract || 0) + '" oninput="updateCCI(' + i + ',\'quantity_contract\',+this.value)">' +
    '<input class="form-control" style="font-size:11px;background:#f1f5f9" readonly value="' + (it.quantity_prev || 0) + '" title="Certificado en períodos anteriores">' +
    '<input class="form-control" style="font-size:11px" type="number" min="0" value="' + (it.quantity_period || 0) + '" oninput="updateCCI(' + i + ',\'quantity_period\',+this.value)">' +
    '<input class="form-control" style="font-size:11px" type="number" min="0" value="' + (it.unit_price || 0) + '" oninput="updateCCI(' + i + ',\'unit_price\',+this.value)">' +
    '<input class="form-control" style="font-size:11px;background:#f8fafc" readonly id="cci-amount-' + i + '" value="' + (it.amount_period || 0) + '">' +
    '<input class="form-control" style="font-size:11px;background:#f8fafc" readonly id="cci-pct-' + i + '" value="' + (it.pct_complete || 0) + '">' +
    '<button class="btn-ghost btn danger" onclick="removeCCI(' + i + ')"><i class="fas fa-times" style="font-size:10px"></i></button>' +
    '</div>';
}

window._ccertItems = [];
function addCCertItem() {
  const it = { description: '', unit: 'm²', quantity_contract: 0, quantity_prev: 0, quantity_period: 0, unit_price: 0, amount_period: 0, pct_complete: 0 };
  window._ccertItems.push(it);
  const i = window._ccertItems.length - 1;
  const cont = document.getElementById('ccert-items');
  const div = document.createElement('div');
  div.innerHTML = ccertItemRow(it, i);
  cont.appendChild(div.firstElementChild);
}

function updateCCI(i, field, val) {
  if (!window._ccertItems[i]) window._ccertItems[i] = { description: '', unit: 'm²', quantity_contract: 0, quantity_prev: 0, quantity_period: 0, unit_price: 0, amount_period: 0, pct_complete: 0 };
  window._ccertItems[i][field] = val;
  const it = window._ccertItems[i];
  it.amount_period = (it.quantity_period || 0) * (it.unit_price || 0);
  const accum = (it.quantity_prev || 0) + (it.quantity_period || 0);
  it.pct_complete = it.quantity_contract > 0 ? Math.round((accum / it.quantity_contract) * 1000) / 10 : 0;
  const amtEl = document.getElementById('cci-amount-' + i);
  const pctEl = document.getElementById('cci-pct-' + i);
  if (amtEl) amtEl.value = it.amount_period;
  if (pctEl) pctEl.value = it.pct_complete;
  updateContractCertTotals();
}

function removeCCI(i) {
  const row = document.getElementById('cci-row-' + i);
  if (row) row.remove();
  window._ccertItems[i] = null;
  updateContractCertTotals();
}

function updateContractCertTotals() {
  const retPct = parseFloat(document.getElementById('ccf-ret-pct') ? document.getElementById('ccf-ret-pct').value : 5) || 0;
  const tipo = document.getElementById('ccf-contab-tipo') ? document.getElementById('ccf-contab-tipo').value : 'A';
  let pctA = 100;
  if (tipo === 'B') pctA = 0;
  else if (tipo === 'AB') pctA = parseFloat(document.getElementById('ccf-pct-a') ? document.getElementById('ccf-pct-a').value : 50) || 0;
  const el = document.getElementById('ccert-totals');
  if (el) el.innerHTML = calcCCertTotalsHtml(window._ccertItems.filter(Boolean), retPct, tipo, pctA);
}

function calcCCertTotalsHtml(items, retPct, tipo, pctA) {
  retPct = retPct || 0;
  const subtotal  = items.filter(Boolean).reduce(function(s, it) { return s + (it.amount_period || 0); }, 0);
  const retention = subtotal * retPct / 100;
  const net       = subtotal - retention;
  const amountA   = subtotal * (pctA != null ? pctA : 100) / 100;
  const amountB   = subtotal - amountA;
  const contabLabel = tipo === 'AB'
    ? 'A: <strong>' + fmtMoney(amountA) + '</strong> (' + pctA + '%) / B: <strong>' + fmtMoney(amountB) + '</strong>'
    : (tipo === 'B' ? 'Todo B: <strong>' + fmtMoney(subtotal) + '</strong>' : 'Todo A: <strong>' + fmtMoney(subtotal) + '</strong>');
  return 'Subtotal: <strong>' + fmtMoney(subtotal) + '</strong> &nbsp;|&nbsp; ' +
    'Fondo Reparo (' + retPct + '%): <strong class="text-warning">' + fmtMoney(retention) + '</strong> &nbsp;|&nbsp; ' +
    '<strong style="font-size:15px;color:var(--primary)">Neto: ' + fmtMoney(net) + '</strong>' +
    '<div style="margin-top:6px;font-size:12px;color:var(--text-muted)">Contabilidad → ' + contabLabel + '</div>';
}

function saveContractCert(contractId) {
  const contract = DB.getById('contracts', contractId);
  if (!contract) return;
  const items    = window._ccertItems.filter(Boolean).filter(function(it) { return it.description; });
  if (!items.length) { toast('Cargá al menos un ítem a certificar', 'error'); return; }
  const hasPeriod = items.some(function(it) { return (it.quantity_period || 0) > 0; });
  if (!hasPeriod) { toast('Indicá la cantidad del período en al menos un ítem', 'error'); return; }

  const retPct   = parseFloat(document.getElementById('ccf-ret-pct').value) || 0;
  const subtotal = items.reduce(function(s, it) { return s + (it.amount_period || 0); }, 0);
  const retention = subtotal * retPct / 100;

  const tipo = document.getElementById('ccf-contab-tipo').value;
  let pctA = 100;
  if (tipo === 'B') pctA = 0;
  else if (tipo === 'AB') pctA = parseFloat(document.getElementById('ccf-pct-a').value) || 0;
  const amountA = subtotal * pctA / 100;
  const amountB = subtotal - amountA;

  // store accumulated qty on each item
  items.forEach(function(it) {
    it.quantity_accum = (it.quantity_prev || 0) + (it.quantity_period || 0);
  });

  const data = {
    number:           document.getElementById('ccf-num').value,
    project_id:       contract.project_id,
    contract_id:      contractId,
    status:           document.getElementById('ccf-status').value,
    date:             document.getElementById('ccf-date').value,
    period_from:      document.getElementById('ccf-from').value,
    period_to:        document.getElementById('ccf-to').value,
    approved_by:      document.getElementById('ccf-approver').value.trim(),
    forma_pago:       document.getElementById('ccf-forma-pago').value,
    contab_tipo:      tipo,
    contab_pct_a:     pctA,
    amount_a:         amountA,
    amount_b:         amountB,
    items,
    subtotal,
    retention_pct:    retPct,
    retention_amount: retention,
    net_amount:       subtotal - retention,
    notes:            document.getElementById('ccf-notes').value.trim(),
  };

  DB.insert('certificates', data);
  toast('Certificación creada correctamente', 'success');
  window._ccertItems = [];
  closeModal();
  renderContratos();
}

// ---- EXPORT CONTRACTS ----
function exportContracts() {
  const contracts = DB.getAll('contracts');
  const projects  = DB.getAll('projects');
  const suppliers = DB.getAll('suppliers');
  const certs     = DB.getAll('certificates');
  exportXLSX('contratos.xlsx',
    ['Número', 'Proyecto', 'Contratista', 'Tipo', 'Inicio', 'Fin', 'Anticipo %', 'Fondo Reparo %', 'Forma Pago', 'Monto Contrato', 'Certificado', 'Estado'],
    contracts.map(function(c) {
      const certified = certs.filter(function(cert) { return cert.contract_id === c.id; })
                             .reduce(function(s, cert) { return s + (cert.subtotal || 0); }, 0);
      return [
        c.number,
        (projects.find(function(p) { return p.id === c.project_id; }) || {}).name || '',
        (suppliers.find(function(s) { return s.id === c.contractor_id; }) || {}).name || '',
        CONTRACT_TYPES[c.type] || c.type,
        c.start_date,
        c.end_date,
        c.anticipo_pct || 0,
        c.fondo_reparo_pct || 0,
        c.forma_pago || '',
        c.total_amount || 0,
        certified,
        c.status,
      ];
    })
  );
}
