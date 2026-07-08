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

const CONTRACT_STATUS = {
  draft:            { label: 'Borrador',          cls: 'badge-gray'   },
  pending_approval: { label: 'Pend. Aprobación',  cls: 'badge-yellow' },
  approved:         { label: 'Aprobado',          cls: 'badge-cyan'   },
  active:           { label: 'Activo',            cls: 'badge-green'  },
  completed:        { label: 'Completado',        cls: 'badge-blue'   },
  cancelled:        { label: 'Cancelado',         cls: 'badge-red'    },
  rejected:         { label: 'Rechazado',         cls: 'badge-red'    },
};
const CERT_STATUS_CFG = {
  draft:    { label: 'Borrador',   cls: 'badge-gray'   },
  pending:  { label: 'Pendiente',  cls: 'badge-yellow' },
  approved: { label: 'Aprobado',   cls: 'badge-green'  },
  rejected: { label: 'Rechazado',  cls: 'badge-red'    },
};

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
  document.getElementById('breadcrumb').innerHTML = '<i class="fas fa-file-contract"></i><span>Contratos</span>';
}

function renderContractsListTab() {
  const contracts = DB.getAll('contracts');
  const projects  = DB.getAll('projects');
  const suppliers = DB.getAll('suppliers');
  const certs     = DB.getAll('certificates');

  const active     = contracts.filter(c => c.status === 'active').length;
  const totalAmt   = contracts.reduce((s, c) => s + (c.total_amount || 0), 0);
  const totalCert  = certs.filter(c => c.contract_id && c.status !== 'rejected').reduce((s, c) => s + (c.subtotal || 0), 0);
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
  <select class="form-control" style="width:190px" onchange="filterContracts(undefined, undefined, this.value)">
    <option value="">Todos los estados</option>
    ${Object.keys(CONTRACT_STATUS).map(k => '<option value="' + k + '">' + CONTRACT_STATUS[k].label + '</option>').join('')}
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

  return '<table><thead><tr>' +
    '<th>N° Contrato</th><th>Proyecto</th><th>Contratista</th><th>Tipo</th><th>Inicio</th><th>Fin</th>' +
    '<th class="text-right">Monto</th><th class="text-right">Certificado</th><th>Avance</th>' +
    '<th>Estado</th><th>Acciones</th>' +
  '</tr></thead><tbody>' +
  contracts.sort((a, b) => (b.start_date || '').localeCompare(a.start_date || '')).map(c => {
    const proj  = projects.find(p => p.id === c.project_id);
    const sup   = suppliers.find(s => s.id === c.contractor_id);
    const certified = allCerts.filter(cert => cert.contract_id === c.id && cert.status !== 'rejected').reduce((s, cert) => s + (cert.subtotal || 0), 0);
    const avance = c.total_amount > 0 ? certified / c.total_amount * 100 : 0;
    const sCfg = CONTRACT_STATUS[c.status] || { label: c.status || '-', cls: 'badge-gray' };
    return '<tr>' +
      '<td><a href="#" onclick="renderContractDetail(\'' + c.id + '\');return false" style="color:var(--primary);font-weight:700">' + c.number + '</a></td>' +
      '<td>' + (proj ? proj.name : '-') + '</td>' +
      '<td>' + (sup ? sup.name : '-') + '</td>' +
      '<td style="font-size:11px">' + (CONTRACT_TYPES[c.type] || c.type || '-') + '</td>' +
      '<td>' + fmtDate(c.start_date) + '</td>' +
      '<td>' + fmtDate(c.end_date) + '</td>' +
      '<td class="number-cell text-right"><strong>' + fmtMoney(c.total_amount || 0) + '</strong></td>' +
      '<td class="number-cell text-right">' + fmtMoney(certified) + '</td>' +
      '<td style="min-width:120px">' + progressBar(avance) + '</td>' +
      '<td><span class="badge ' + sCfg.cls + '">' + sCfg.label + '</span></td>' +
      '<td><div class="table-actions">' +
        '<button class="btn btn-sm btn-primary" onclick="renderContractDetail(\'' + c.id + '\')"><i class="fas fa-eye"></i> Ver</button>' +
        '<button class="btn-ghost btn btn-sm" onclick="openContractForm(\'' + c.id + '\')"><i class="fas fa-edit"></i></button>' +
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
  const certs     = DB.getAll('certificates').filter(c => c.contract_id && c.status !== 'rejected');
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

// ---- CONTRACT DETAIL PAGE (full page, not modal) ----
function renderContractDetail(id) {
  var _c = document.getElementById('content'); if (_c) _c.scrollTop = 0;
  const contract = DB.getById('contracts', id);
  if (!contract) { renderContratos(); return; }
  const proj  = DB.getById('projects',  contract.project_id);
  const sup   = DB.getById('suppliers', contract.contractor_id);
  const certs = DB.getAll('certificates').filter(function(c) { return c.contract_id === id; });
  const certified = certs.filter(function(c) { return c.status !== 'rejected'; }).reduce(function(s, c) { return s + (c.subtotal || 0); }, 0);
  const avance = contract.total_amount > 0 ? certified / contract.total_amount * 100 : 0;
  const sCfg  = CONTRACT_STATUS[contract.status] || { label: contract.status || '-', cls: 'badge-gray' };

  var btns = '<button class="btn btn-secondary" onclick="openContractForm(\'' + id + '\')"><i class="fas fa-edit"></i> Editar</button>';
  if (contract.status === 'draft' || contract.status === 'rejected') {
    btns += '<button class="btn btn-warning" onclick="submitContractForApproval(\'' + id + '\')"><i class="fas fa-paper-plane"></i> Enviar a Aprobación</button>';
    if ((contract.items || []).length > 0)
      btns += '<button class="btn btn-success" onclick="startContract(\'' + id + '\')"><i class="fas fa-play"></i> Dar Inicio</button>';
  }
  if (contract.status === 'pending_approval') {
    btns += '<button class="btn btn-success" onclick="openApproveContractModal(\'' + id + '\')"><i class="fas fa-check"></i> Aprobar</button>';
    btns += '<button class="btn btn-danger"  onclick="openRejectContractModal(\'' + id + '\')"><i class="fas fa-times"></i> Rechazar</button>';
  }
  if (contract.status === 'approved')
    btns += '<button class="btn btn-success" onclick="startContract(\'' + id + '\')"><i class="fas fa-play"></i> Dar Inicio</button>';
  if (contract.status === 'active') {
    btns += '<button class="btn btn-primary" onclick="openContractCertForm(\'' + id + '\')"><i class="fas fa-certificate"></i> Nueva Certificación</button>';
    btns += '<button class="btn btn-secondary" onclick="finishContract(\'' + id + '\')"><i class="fas fa-flag-checkered"></i> Finalizar</button>';
  }

  var alogHtml = '';
  var alog = contract.approval_log || [];
  if (alog.length) {
    var alLabels = { submitted: 'Enviado', approved: 'Aprobado', rejected: 'Rechazado', started: 'Iniciado', completed: 'Completado' };
    var alCls    = { submitted: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red', started: 'badge-blue', completed: 'badge-blue' };
    alogHtml = '<div style="margin-bottom:14px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px">' +
      '<div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:6px"><i class="fas fa-history"></i> Historial de aprobaciones</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
      alog.map(function(e) {
        return '<div style="display:flex;align-items:center;gap:5px;font-size:11px;background:var(--surface);padding:4px 8px;border-radius:6px;border:1px solid var(--border)">' +
          '<span class="badge ' + (alCls[e.action] || 'badge-gray') + '" style="font-size:9px">' + (alLabels[e.action] || e.action) + '</span>' +
          '<span style="color:var(--text-muted)">' + fmtDate(e.date) + '</span>' +
          '<span style="font-weight:600">' + (e.user || 'Sistema') + '</span>' +
          (e.comment ? '<span style="color:var(--text-muted);font-style:italic">"' + e.comment + '"</span>' : '') +
          '</div>';
      }).join('') + '</div></div>';
  }

  document.getElementById('content').innerHTML =
    '<div class="page-header">' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
        '<button class="btn btn-secondary btn-sm" onclick="renderContratos()"><i class="fas fa-arrow-left"></i> Contratos</button>' +
        '<div>' +
          '<div class="page-title" style="display:flex;align-items:center;gap:8px">' + contract.number +
            ' <span class="badge ' + sCfg.cls + '">' + sCfg.label + '</span></div>' +
          '<div class="page-subtitle">' + (proj ? proj.name : '-') + ' · ' + (sup ? sup.name : '-') +
            ' · ' + (CONTRACT_TYPES[contract.type] || '-') +
            ' · ' + fmtDate(contract.start_date) + ' → ' + fmtDate(contract.end_date) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="page-actions">' + btns + '</div>' +
    '</div>' +

    '<div class="stats-grid" style="grid-template-columns:repeat(6,1fr);margin-bottom:16px">' +
      '<div class="stat-card"><div class="stat-icon blue"><i class="fas fa-dollar-sign"></i></div><div>' +
        '<div class="stat-value" style="font-size:15px">' + fmtMoney(contract.total_amount || 0) + '</div><div class="stat-label">Monto Contrato</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon green"><i class="fas fa-certificate"></i></div><div>' +
        '<div class="stat-value" style="font-size:15px">' + fmtMoney(certified) + '</div><div class="stat-label">Certificado</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-balance-scale"></i></div><div>' +
        '<div class="stat-value" style="font-size:15px">' + fmtMoney((contract.total_amount || 0) - certified) + '</div><div class="stat-label">Saldo</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-percentage"></i></div><div>' +
        '<div class="stat-value" style="font-size:15px">' + fmtPct(avance) + '</div><div class="stat-label">Avance</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon purple"><i class="fas fa-handshake"></i></div><div>' +
        '<div class="stat-value" style="font-size:15px">' + fmtPct(contract.anticipo_pct || 0) + '</div><div class="stat-label">Anticipo</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon gray"><i class="fas fa-shield-alt"></i></div><div>' +
        '<div class="stat-value" style="font-size:15px">' + fmtPct(contract.fondo_reparo_pct || 0) + '</div><div class="stat-label">Fondo Reparo</div></div></div>' +
    '</div>' +

    alogHtml +

    '<div id="contract-detail-page-tabs">' +
      '<div class="tabs">' +
        '<button class="tab-btn" data-tab="cdp-dashboard">Dashboard</button>' +
        '<button class="tab-btn" data-tab="cdp-partidas">Partidas (' + (contract.items || []).length + ')</button>' +
        '<button class="tab-btn" data-tab="cdp-crono">Cronograma</button>' +
        '<button class="tab-btn" data-tab="cdp-certs">Certificaciones (' + certs.length + ')</button>' +
        '<button class="tab-btn" data-tab="cdp-adic">Adicionales (' + (contract.adicionales || []).length + ')</button>' +
        '<button class="tab-btn" data-tab="cdp-cf">Cash Flow</button>' +
      '</div>' +
      '<div id="cdp-dashboard" class="tab-content">' + _cdpDashboard(contract, certs) + '</div>' +
      '<div id="cdp-partidas" class="tab-content">' + _cdpPartidas(contract, certs) + '</div>' +
      '<div id="cdp-crono" class="tab-content">' + _cdpCronoHtml(id) + '</div>' +
      '<div id="cdp-certs" class="tab-content">' + _cdpCerts(contract, certs) + '</div>' +
      '<div id="cdp-adic" class="tab-content">' + _cdpAdic(contract) + '</div>' +
      '<div id="cdp-cf" class="tab-content">' + _cdpCashFlow(contract) + '</div>' +
    '</div>';

  document.getElementById('breadcrumb').innerHTML =
    '<i class="fas fa-file-contract"></i>' +
    '<span onclick="renderContratos()" style="cursor:pointer;color:var(--primary)">Contratos</span>' +
    '<i class="fas fa-chevron-right" style="margin:0 6px;font-size:10px;color:var(--text-muted)"></i>' +
    '<span>' + contract.number + '</span>';

  setTimeout(function() {
    initTabs('contract-detail-page-tabs');
    renderCronograma(id, 'real');
  }, 50);
}

function _cdpDashboard(contract, certs) {
  const idx = contract.indice_id ? DB.getById('priceIndices', contract.indice_id) : null;
  const approved = certs.filter(function(c) { return c.status !== 'rejected'; });
  const totalCert = approved.reduce(function(s, c) { return s + (c.subtotal || 0); }, 0);
  const avance = contract.total_amount > 0 ? totalCert / contract.total_amount * 100 : 0;
  const recent = certs.slice().sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); }).slice(0, 4);
  const accumByItem = _certAccumByItem(approved);
  var partidasHtml = (contract.items || []).map(function(it) {
    var accum = accumByItem[_certItemKey(it)] || 0;
    var pct = it.quantity > 0 ? accum / it.quantity * 100 : 0;
    return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
      '<div style="min-width:180px;max-width:180px;font-size:11px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis" title="' + (it.description || '') + '">' + (it.description || '-') + '</div>' +
      '<div style="flex:1">' + progressBar(pct) + '</div>' +
      '<div style="min-width:55px;text-align:right;font-size:11px;color:var(--text-muted)">' + fmtMoney(it.total) + '</div>' +
      '</div>';
  }).join('');

  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">' +
    '<div class="card"><div class="card-header"><h3 class="card-title">Avance General</h3></div><div class="card-body">' +
      '<div style="margin-bottom:14px">' + progressBar(avance) + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px">' +
        '<div style="text-align:center;padding:8px;background:var(--bg);border-radius:6px">' +
          '<div style="font-size:10px;color:var(--text-muted)">Anticipo</div>' +
          '<div style="font-weight:700">' + fmtPct(contract.anticipo_pct || 0) + '</div>' +
          '<div style="font-size:10px;color:var(--text-muted)">' + fmtMoney((contract.total_amount || 0) * (contract.anticipo_pct || 0) / 100) + '</div>' +
        '</div>' +
        '<div style="text-align:center;padding:8px;background:var(--bg);border-radius:6px">' +
          '<div style="font-size:10px;color:var(--text-muted)">Fondo Reparo</div>' +
          '<div style="font-weight:700">' + fmtPct(contract.fondo_reparo_pct || 0) + '</div>' +
        '</div>' +
        '<div style="text-align:center;padding:8px;background:var(--bg);border-radius:6px">' +
          '<div style="font-size:10px;color:var(--text-muted)">Dep. Garantía</div>' +
          '<div style="font-weight:700">' + fmtPct(contract.deposito_garantia_pct || 0) + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:12px;display:flex;flex-direction:column;gap:4px">' +
        '<div><strong>Forma de Pago:</strong> ' + (contract.forma_pago || '-') + '</div>' +
        '<div><strong>Índice:</strong> ' + (idx ? idx.code + ' — ' + idx.name : 'Sin índice') + '</div>' +
        (contract.notes ? '<div style="color:var(--text-muted)"><strong>Notas:</strong> ' + contract.notes + '</div>' : '') +
      '</div>' +
    '</div></div>' +
    '<div class="card"><div class="card-header"><h3 class="card-title">Últimas Certificaciones</h3></div><div class="card-body">' +
      (recent.length
        ? '<div class="table-wrap"><table style="font-size:12px"><thead><tr><th>N°</th><th>Fecha</th><th class="text-right">Monto</th><th class="text-right">Neto</th><th>Estado</th></tr></thead><tbody>' +
          recent.map(function(c) {
            var sc = CERT_STATUS_CFG[c.status] || { label: c.status, cls: 'badge-gray' };
            return '<tr><td><strong>' + c.number + '</strong></td><td>' + fmtDate(c.date) + '</td>' +
              '<td class="text-right">' + fmtMoney(c.subtotal || 0) + '</td>' +
              '<td class="text-right">' + fmtMoney(c.net_amount || 0) + '</td>' +
              '<td><span class="badge ' + sc.cls + '">' + sc.label + '</span></td></tr>';
          }).join('') + '</tbody></table></div>'
        : '<div class="empty-state" style="padding:20px"><p>Sin certificaciones aún</p></div>') +
    '</div></div>' +
  '</div>' +
  (partidasHtml
    ? '<div class="card"><div class="card-header"><h3 class="card-title">Avance por Partida</h3></div><div class="card-body">' + partidasHtml + '</div></div>'
    : '');
}

function _cdpPartidas(contract, certs) {
  const approved = certs.filter(function(c) { return c.status !== 'rejected'; });
  const accumByItem = _certAccumByItem(approved);
  if (!(contract.items || []).length) return '<div class="empty-state"><p>Sin partidas cargadas</p></div>';
  return '<div class="table-wrap"><table><thead><tr>' +
    '<th>Partida</th><th>Unidad</th><th class="text-right">Cant.Contrato</th><th class="text-right">Cant.Certif.</th>' +
    '<th class="text-right">P.Unit.</th><th class="text-right">Total</th><th>Avance</th><th>Vínculo BOQ</th>' +
  '</tr></thead><tbody>' +
  (contract.items || []).map(function(it) {
    var boqItem = it.boq_item_id ? DB.getById('boqItems', it.boq_item_id) : null;
    var accum = accumByItem[_certItemKey(it)] || 0;
    var pct = it.quantity > 0 ? accum / it.quantity * 100 : 0;
    return '<tr><td>' + it.description + '</td><td>' + it.unit + '</td>' +
      '<td class="number-cell text-right">' + fmtNum(it.quantity) + '</td>' +
      '<td class="number-cell text-right">' + fmtNum(accum) + '</td>' +
      '<td class="number-cell text-right">' + fmtMoney(it.unit_price) + '</td>' +
      '<td class="number-cell text-right"><strong>' + fmtMoney(it.total) + '</strong></td>' +
      '<td style="min-width:110px">' + progressBar(pct) + '</td>' +
      '<td style="font-size:11px;color:var(--text-muted)">' +
        (boqItem ? boqItem.description : '<span style="color:var(--danger)">sin vincular</span>') + '</td></tr>';
  }).join('') +
  '<tr class="total-row"><td colspan="5" class="text-right"><strong>TOTAL</strong></td>' +
    '<td class="number-cell text-right"><strong>' + fmtMoney(contract.total_amount || 0) + '</strong></td><td colspan="2"></td></tr>' +
  '</tbody></table></div>';
}

function _cdpCronoHtml(contractId) {
  return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">' +
    '<span style="font-size:11px;color:var(--text-muted)"><i class="fas fa-info-circle"></i> Barra = período · relleno = avance certificado · línea roja = hoy</span>' +
    '<div style="display:flex;gap:6px">' +
      '<button id="crono-btn-proyectado" class="btn btn-sm btn-secondary" onclick="renderCronograma(\'' + contractId + '\',\'proyectado\')">Proyectado</button>' +
      '<button id="crono-btn-real" class="btn btn-sm btn-primary" onclick="renderCronograma(\'' + contractId + '\',\'real\')">Real</button>' +
      '<button id="crono-btn-desvio" class="btn btn-sm btn-secondary" onclick="renderCronograma(\'' + contractId + '\',\'desvio\')">Desvío</button>' +
    '</div></div>' +
    '<div id="crono-bars"></div>';
}

function _cdpCerts(contract, certs) {
  const supInvoices = DB.getAll('supplierInvoices');
  const pending  = certs.filter(function(c) { return c.status === 'pending'; }).length;
  const approved = certs.filter(function(c) { return c.status === 'approved'; }).length;
  const totalAmt = certs.filter(function(c) { return c.status !== 'rejected'; }).reduce(function(s, c) { return s + (c.subtotal || 0); }, 0);

  var tableHtml = certs.length
    ? '<div class="table-wrap"><table><thead><tr>' +
        '<th>N° Cert.</th><th>Fecha</th><th>Período</th><th class="text-right">Monto</th>' +
        '<th class="text-right">F.Reparo</th><th class="text-right">Neto</th><th>Contab.</th><th>F.Pago</th><th>Factura</th><th>Estado</th><th>Acciones</th>' +
      '</tr></thead><tbody>' +
      certs.slice().sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); }).map(function(c) {
        var sc = CERT_STATUS_CFG[c.status] || { label: c.status, cls: 'badge-gray' };
        var contabTxt = c.contab_tipo === 'AB' ? 'A ' + (c.contab_pct_a || 0) + '% / B' : (c.contab_tipo || 'A');
        var si = c.supplier_invoice_id ? supInvoices.find(function(x) { return x.id === c.supplier_invoice_id; }) : null;
        var facturaCell = si
          ? '<span class="badge badge-green">' + si.number + '</span>'
          : (c.status === 'approved'
              ? '<button class="btn btn-sm btn-secondary" onclick="generateInvoiceFromCert(\'' + c.id + '\')"><i class="fas fa-file-invoice"></i> Vincular</button>'
              : '<span style="color:var(--text-muted);font-size:11px">—</span>');
        var clog = (c.approval_log || []);
        var logHtml = clog.length
          ? '<div style="font-size:10px;color:var(--text-muted);font-style:italic;margin-top:2px">' +
            (function(e) { return (e.action === 'approved' ? '✓' : e.action === 'rejected' ? '✗' : '→') + ' ' + (e.comment || e.action) + ' · ' + fmtDate(e.date); })(clog[clog.length - 1]) +
            '</div>'
          : '';
        return '<tr>' +
          '<td><div><strong>' + c.number + '</strong>' + logHtml + '</div></td>' +
          '<td style="font-size:11px">' + fmtDate(c.date) + '</td>' +
          '<td style="font-size:11px">' + fmtDate(c.period_from) + ' — ' + fmtDate(c.period_to) + '</td>' +
          '<td class="number-cell text-right">' + fmtMoney(c.subtotal || 0) + '</td>' +
          '<td class="number-cell text-right text-warning">' + fmtMoney(c.retention_amount || 0) + '</td>' +
          '<td class="number-cell text-right"><strong>' + fmtMoney(c.net_amount || 0) + '</strong></td>' +
          '<td style="font-size:11px">' + contabTxt + '</td>' +
          '<td style="font-size:11px">' + (c.forma_pago || '-') + '</td>' +
          '<td>' + facturaCell + '</td>' +
          '<td><span class="badge ' + sc.cls + '">' + sc.label + '</span></td>' +
          '<td><div class="table-actions">' +
            '<button class="btn-ghost btn btn-sm" onclick="viewCert(\'' + c.id + '\')"><i class="fas fa-eye"></i></button>' +
            (c.status === 'pending'
              ? '<button class="btn btn-sm btn-success" title="Aprobar" onclick="openApproveCertModal(\'' + c.id + '\',\'' + contract.id + '\')"><i class="fas fa-check"></i></button>' +
                '<button class="btn btn-sm btn-danger"  title="Rechazar" onclick="openRejectCertModal(\'' + c.id + '\',\'' + contract.id + '\')"><i class="fas fa-times"></i></button>'
              : '') +
          '</div></td></tr>';
      }).join('') +
      '</tbody></table>' +
      '<div style="padding:10px;text-align:right;font-size:13px;border-top:2px solid var(--border)">Total: <strong style="color:var(--primary)">' + fmtMoney(totalAmt) + '</strong></div>' +
      '</div>'
    : '<div class="empty-state" style="padding:30px"><i class="fas fa-certificate"></i><p>Sin certificaciones para este contrato</p></div>';

  return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
    '<div style="display:flex;gap:12px;font-size:12px">' +
      '<span><strong>' + certs.length + '</strong> total</span>' +
      '<span style="color:var(--warning)"><strong>' + pending + '</strong> pendientes</span>' +
      '<span style="color:var(--success)"><strong>' + approved + '</strong> aprobadas</span>' +
    '</div>' +
    (contract.status === 'active'
      ? '<button class="btn btn-primary btn-sm" onclick="openContractCertForm(\'' + contract.id + '\')"><i class="fas fa-plus"></i> Nueva Certificación</button>'
      : '') +
  '</div>' + tableHtml;
}

function _cdpAdic(contract) {
  var adicionales = contract.adicionales || [];
  var net = adicionalesNet(adicionales);
  var baseTotal = contract.base_total != null ? contract.base_total : ((contract.total_amount || 0) - net);
  var tableHtml = adicionales.length
    ? '<div class="table-wrap"><table><thead><tr><th>Tipo</th><th>Descripción</th><th>Fecha</th><th class="text-right">Monto</th><th></th></tr></thead><tbody>' +
      adicionales.map(function(a, i) {
        var isEco = a.type === 'economia';
        return '<tr>' +
          '<td><span class="badge ' + (isEco ? 'badge-red' : 'badge-green') + '">' + (isEco ? 'Economía' : 'Demasía') + '</span></td>' +
          '<td>' + (a.description || '-') + '</td>' +
          '<td>' + fmtDate(a.date) + '</td>' +
          '<td class="number-cell text-right ' + (isEco ? 'text-danger' : 'text-success') + '">' + (isEco ? '−' : '+') + fmtMoney(a.amount || 0) + '</td>' +
          '<td><button class="btn-ghost btn btn-sm danger" onclick="deleteAdicionalFromContract(\'' + contract.id + '\',' + i + ')"><i class="fas fa-trash"></i></button></td></tr>';
      }).join('') +
      '<tr class="total-row"><td colspan="3" class="text-right"><strong>Base ' + fmtMoney(baseTotal) + ' + adicionales</strong></td>' +
        '<td class="number-cell text-right"><strong>' + fmtMoney(net) + '</strong></td><td></td></tr>' +
      '<tr class="total-row"><td colspan="3" class="text-right"><strong>MONTO VIGENTE</strong></td>' +
        '<td class="number-cell text-right"><strong style="color:var(--primary)">' + fmtMoney(contract.total_amount || 0) + '</strong></td><td></td></tr>' +
      '</tbody></table></div>'
    : '<div class="empty-state"><i class="fas fa-exchange-alt"></i><p>Sin adicionales. Las demasías suman al contrato y las economías lo reducen.</p></div>';

  return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
    '<strong style="font-size:13px">Demasías (+) y Economías (−)</strong>' +
    '<button class="btn btn-primary btn-sm" onclick="openAddAdicionalModal(\'' + contract.id + '\')"><i class="fas fa-plus"></i> Agregar Adicional</button>' +
  '</div>' + tableHtml;
}

function _cdpCashFlow(contract) {
  var cashflow = contract.cash_flow || [];
  var cfTotal  = cashflow.reduce(function(s, r) { return s + (r.amount || 0); }, 0);
  if (!cashflow.length) return '<div class="empty-state"><p>Sin cash flow cargado. Podés cargarlo editando el contrato.</p></div>';
  var diff = (contract.total_amount || 0) - cfTotal;
  var diffColor = Math.abs(diff) < 1 ? 'var(--success)' : 'var(--danger)';
  return '<div class="table-wrap"><table><thead><tr><th>Mes</th><th class="text-right">Monto Previsto</th></tr></thead><tbody>' +
    cashflow.slice().sort(function(a, b) { return (a.month || '').localeCompare(b.month || ''); }).map(function(r) {
      return '<tr><td>' + (r.month || '-') + '</td><td class="number-cell text-right">' + fmtMoney(r.amount || 0) + '</td></tr>';
    }).join('') +
    '<tr class="total-row"><td class="text-right"><strong>TOTAL</strong></td><td class="number-cell text-right"><strong>' + fmtMoney(cfTotal) + '</strong></td></tr>' +
    '</tbody></table></div>' +
    '<div style="margin-top:10px;text-align:right;font-size:13px">' +
      'Contrato: <strong>' + fmtMoney(contract.total_amount || 0) + '</strong> &nbsp;|&nbsp; Diferencia: <strong style="color:' + diffColor + '">' + fmtMoney(diff) + '</strong>' +
    '</div>';
}

// ---- FINALIZAR CONTRATO ----
function finishContract(id) {
  const contract = DB.getById('contracts', id);
  if (!contract) return;
  confirmDialog('¿Finalizar el contrato ' + contract.number + '? Pasará a estado Completado.', function() {
    var log = (contract.approval_log || []).concat([{ date: todayStr(), action: 'completed', comment: '', user: 'Administrador' }]);
    DB.update('contracts', id, { status: 'completed', completed_date: todayStr(), approval_log: log });
    toast('Contrato finalizado', 'success');
    renderContractDetail(id);
  });
}

// ---- APPROVAL: CONTRACTS ----
function submitContractForApproval(id) {
  var contract = DB.getById('contracts', id);
  if (!contract) return;
  if (!(contract.items || []).length) { toast('Cargá al menos una partida antes de enviar a aprobación', 'error'); return; }
  confirmDialog('¿Enviar el contrato ' + contract.number + ' a aprobación?', function() {
    submitForApproval('contract', id);  // engine handles status + log + instance creation
    renderContractDetail(id);
  });
}

function openApproveContractModal(id) {
  var contract = DB.getById('contracts', id);
  if (!contract) return;
  openModal('Aprobar Contrato — ' + contract.number,
    '<div class="form-group"><label class="form-label">Comentario (opcional)</label>' +
      '<textarea class="form-control" id="cont-approve-comment" rows="3" placeholder="Ej: Revisado y aprobado por Dirección..."></textarea></div>',
    'modal-sm',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-success" onclick="doApproveContract(\'' + id + '\')"><i class="fas fa-check"></i> Confirmar Aprobación</button>'
  );
}
function doApproveContract(id) {
  var comment = (document.getElementById('cont-approve-comment').value || '').trim();
  var inst = getApprovalInstance('contract', id);
  if (inst && inst.status === 'pending') {
    apprDoApprove(inst.id, comment);  // route through workflow engine
  } else {
    // No instance (no workflow configured) — direct approve
    var contract = DB.getById('contracts', id);
    if (!contract) return;
    var log = (contract.approval_log || []).concat([{ date: todayStr(), action: 'approved', comment: comment, user: 'Administrador' }]);
    DB.update('contracts', id, { status: 'approved', approval_log: log });
    toast('Contrato aprobado', 'success');
  }
  closeModal();
  renderContractDetail(id);
}

function openRejectContractModal(id) {
  var contract = DB.getById('contracts', id);
  if (!contract) return;
  openModal('Rechazar Contrato — ' + contract.number,
    '<div class="form-group"><label class="form-label">Motivo del rechazo <span style="color:var(--danger)">*</span></label>' +
      '<textarea class="form-control" id="cont-reject-comment" rows="3" placeholder="Indicá los motivos del rechazo..."></textarea></div>',
    'modal-sm',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-danger" onclick="doRejectContract(\'' + id + '\')"><i class="fas fa-times"></i> Rechazar</button>'
  );
}
function doRejectContract(id) {
  var comment = (document.getElementById('cont-reject-comment').value || '').trim();
  if (!comment) { toast('Ingresá el motivo del rechazo', 'error'); return; }
  var inst = getApprovalInstance('contract', id);
  if (inst && inst.status === 'pending') {
    apprDoReject(inst.id, comment);
  } else {
    var contract = DB.getById('contracts', id);
    if (!contract) return;
    var log = (contract.approval_log || []).concat([{ date: todayStr(), action: 'rejected', comment: comment, user: 'Administrador' }]);
    DB.update('contracts', id, { status: 'rejected', approval_log: log });
    toast('Contrato rechazado', 'warning');
  }
  closeModal();
  renderContractDetail(id);
}

// ---- APPROVAL: CERTIFICATES ----
function openApproveCertModal(certId, contractId) {
  var cert = DB.getById('certificates', certId);
  if (!cert) return;
  // If workflow is configured and no instance exists yet, create one now
  var inst = getApprovalInstance('certificate', certId);
  if (!inst) {
    var doc = DB.getById('certificates', certId);
    var wf = doc ? apprGetWorkflow('certificate', doc) : null;
    if (wf) { submitForApproval('certificate', certId); inst = getApprovalInstance('certificate', certId); }
  }
  openModal('Aprobar Certificación — ' + cert.number,
    '<div style="background:var(--bg);padding:8px;border-radius:6px;margin-bottom:12px;font-size:12px">' +
      'Monto: <strong>' + fmtMoney(cert.subtotal || 0) + '</strong> &nbsp;|&nbsp; Neto: <strong>' + fmtMoney(cert.net_amount || 0) + '</strong>' +
      (inst && inst.status === 'pending' ? '<br><span style="color:var(--warning)">Flujo: ' + (inst.workflow_name || '') + ' — Paso ' + (inst.current_step_index + 1) + '/' + inst.steps.length + '</span>' : '') +
    '</div>' +
    '<div class="form-group"><label class="form-label">Comentario (opcional)</label>' +
      '<textarea class="form-control" id="cert-approve-comment" rows="3" placeholder="Ej: Aprobado por Director de Obra..."></textarea></div>',
    'modal-sm',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-success" onclick="doApproveCert(\'' + certId + '\',\'' + contractId + '\')"><i class="fas fa-check"></i> Aprobar</button>'
  );
}
function doApproveCert(certId, contractId) {
  var comment = (document.getElementById('cert-approve-comment').value || '').trim();
  var inst = getApprovalInstance('certificate', certId);
  if (inst && inst.status === 'pending') {
    apprDoApprove(inst.id, comment);
  } else {
    var cert = DB.getById('certificates', certId);
    if (!cert) return;
    var log = (cert.approval_log || []).concat([{ date: todayStr(), action: 'approved', comment: comment, user: 'Administrador' }]);
    DB.update('certificates', certId, { status: 'approved', approval_log: log });
    toast('Certificación aprobada', 'success');
  }
  closeModal();
  renderContractDetail(contractId);
}

function openRejectCertModal(certId, contractId) {
  var cert = DB.getById('certificates', certId);
  if (!cert) return;
  openModal('Rechazar Certificación — ' + cert.number,
    '<div class="form-group"><label class="form-label">Motivo del rechazo <span style="color:var(--danger)">*</span></label>' +
      '<textarea class="form-control" id="cert-reject-comment" rows="3" placeholder="Indicá los motivos del rechazo..."></textarea></div>',
    'modal-sm',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-danger" onclick="doRejectCert(\'' + certId + '\',\'' + contractId + '\')"><i class="fas fa-times"></i> Rechazar</button>'
  );
}
function doRejectCert(certId, contractId) {
  var comment = (document.getElementById('cert-reject-comment').value || '').trim();
  if (!comment) { toast('Ingresá el motivo del rechazo', 'error'); return; }
  var inst = getApprovalInstance('certificate', certId);
  if (inst && inst.status === 'pending') {
    apprDoReject(inst.id, comment);
  } else {
    var cert = DB.getById('certificates', certId);
    if (!cert) return;
    var log = (cert.approval_log || []).concat([{ date: todayStr(), action: 'rejected', comment: comment, user: 'Administrador' }]);
    DB.update('certificates', certId, { status: 'rejected', approval_log: log });
    toast('Certificación rechazada', 'warning');
  }
  closeModal();
  renderContractDetail(contractId);
}

// ---- ADICIONALES INTERACTIVOS ----
function openAddAdicionalModal(contractId) {
  openModal('Agregar Adicional al Contrato',
    '<div class="form-grid form-grid-2">' +
      '<div class="form-group"><label class="form-label">Tipo</label>' +
        '<select class="form-control" id="adic-new-type">' +
          '<option value="demasia">Demasía (+) — aumenta el contrato</option>' +
          '<option value="economia">Economía (−) — reduce el contrato</option>' +
        '</select></div>' +
      '<div class="form-group"><label class="form-label">Fecha</label>' +
        '<input class="form-control" id="adic-new-date" type="date" value="' + todayStr() + '"></div>' +
      '<div class="form-group full"><label class="form-label">Descripción *</label>' +
        '<input class="form-control" id="adic-new-desc" placeholder="Descripción del adicional"></div>' +
      '<div class="form-group"><label class="form-label">Monto *</label>' +
        '<input class="form-control" id="adic-new-amount" type="number" min="0" step="0.01" placeholder="0"></div>' +
    '</div>',
    'modal-md',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="doAddAdicionalToContract(\'' + contractId + '\')"><i class="fas fa-save"></i> Guardar</button>'
  );
}
function doAddAdicionalToContract(contractId) {
  var desc   = (document.getElementById('adic-new-desc').value || '').trim();
  var amount = parseFloat(document.getElementById('adic-new-amount').value) || 0;
  if (!desc)      { toast('La descripción es obligatoria', 'error'); return; }
  if (amount <= 0) { toast('El monto debe ser mayor a 0', 'error'); return; }
  var contract = DB.getById('contracts', contractId);
  if (!contract) return;
  var newAdic = {
    type:        document.getElementById('adic-new-type').value,
    description: desc,
    date:        document.getElementById('adic-new-date').value,
    amount:      amount,
  };
  var adicionales = (contract.adicionales || []).concat([newAdic]);
  var baseTotal = contract.base_total != null ? contract.base_total : ((contract.total_amount || 0) - adicionalesNet(contract.adicionales || []));
  DB.update('contracts', contractId, { adicionales: adicionales, base_total: baseTotal, total_amount: baseTotal + adicionalesNet(adicionales) });
  toast('Adicional guardado', 'success');
  closeModal();
  renderContractDetail(contractId);
}
function deleteAdicionalFromContract(contractId, idx) {
  confirmDialog('¿Eliminar este adicional? El monto vigente se actualizará.', function() {
    var contract = DB.getById('contracts', contractId);
    if (!contract) return;
    var adicionales = (contract.adicionales || []).filter(function(_, i) { return i !== idx; });
    var baseTotal = contract.base_total != null ? contract.base_total : ((contract.total_amount || 0) - adicionalesNet(contract.adicionales || []));
    DB.update('contracts', contractId, { adicionales: adicionales, base_total: baseTotal, total_amount: baseTotal + adicionalesNet(adicionales) });
    toast('Adicional eliminado', 'warning');
    renderContractDetail(contractId);
  });
}

// ---- CERTIFICADO → FACTURA DE PROVEEDOR ----
// Opens the unified supplier-invoice form pre-filled with this cert
function generateInvoiceFromCert(certId) {
  if (!isApproved('certificate', certId)) {
    toast('La certificación debe estar aprobada antes de generar una factura', 'error');
    return;
  }
  openSIForm(null, null, certId);
}

function linkCertToExistingInvoice(certId) {
  const cert = DB.getById('certificates', certId);
  const siId = document.getElementById('cert-link-si').value;
  if (!siId) { toast('Seleccioná una factura', 'error'); return; }
  DB.update('certificates', certId, { supplier_invoice_id: siId });
  DB.update('supplierInvoices', siId, { cert_id: certId });
  toast('Certificado vinculado a la factura', 'success');
  closeModal();
  if (cert.contract_id) renderContractDetail(cert.contract_id);
  else renderContratos();
}

// ---- DAR INICIO ----
function startContract(id) {
  const contract = DB.getById('contracts', id);
  if (!contract) return;
  if (!(contract.items || []).length) { toast('Cargá al menos una partida antes de iniciar el contrato', 'error'); return; }
  confirmDialog('¿Dar inicio al contrato ' + contract.number + '? Una vez iniciado podrás cargar certificaciones.', function() {
    var log = (contract.approval_log || []).concat([{ date: todayStr(), action: 'started', comment: '', user: 'Administrador' }]);
    DB.update('contracts', id, { status: 'active', started_date: todayStr(), approval_log: log });
    toast('Contrato iniciado — ya podés certificar', 'success');
    renderContractDetail(id);
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
  const accumByItem = _certAccumByItem(certs);

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

    const accum   = accumByItem[_certItemKey(it)] || 0;
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
  const rubros    = DB.getAll('rubros').filter(r => r.active !== false).sort((a,b) => (a.code||'').localeCompare(b.code||''));
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
      '<div style="display:flex;gap:6px">' +
        '<button class="btn btn-sm btn-ghost" onclick="reloadContractRubros()" title="Si acabás de crear un rubro, refrescá la lista"><i class="fas fa-sync-alt"></i> Actualizar rubros</button>' +
        '<button class="btn btn-sm btn-secondary" onclick="addContractItem()"><i class="fas fa-plus"></i> Agregar partida</button>' +
      '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:2fr 1.5fr 60px 85px 105px 105px 34px;gap:4px;margin-bottom:4px;font-size:10px;font-weight:600;color:var(--text-muted)">' +
      '<span>Descripción</span><span>Rubro / Partida</span><span>Unidad</span><span>Cantidad</span><span>P.Unit.</span><span>Total</span><span></span>' +
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
  // Backfill item_id estable en partidas legacy (para ligar certificaciones por id)
  window._contractItems = items.map(function(it) { return Object.assign({ item_id: it.item_id || uuid() }, it); });
  window._contractCashflow = cashflow.map(function(r) { return Object.assign({}, r); });
  window._contractAdicionales = adicionales.map(function(a) { return Object.assign({}, a); });
  window._cronoDefaults = { start: (contract && contract.start_date) || todayStr(), end: (contract && contract.end_date) || addDays(todayStr(), 180) };
  setTimeout(function() { initTabs('contract-form-tabs'); }, 30);
}

function contractItemRow(it, i, boqOpts) {
  const rubros = DB.getAll('rubros').filter(r => r.active !== false).sort((a,b) => (a.code||'').localeCompare(b.code||''));
  const rubroOpts = '<option value="">— Sin rubro —</option>' +
    rubros.map(r => '<option value="' + r.id + '" ' + (it.rubro_id === r.id ? 'selected' : '') + '>' + r.code + ' — ' + r.name + '</option>').join('');
  return '<div id="coni-row-' + i + '" style="display:grid;grid-template-columns:2fr 1.5fr 60px 85px 105px 105px 34px;gap:4px;margin-bottom:6px;align-items:center">' +
    '<input class="form-control" style="font-size:12px" placeholder="Descripción de la tarea" value="' + (it.description || '') + '" oninput="updateContractItem(' + i + ',\'description\',this.value)">' +
    '<select class="form-control" style="font-size:11px" onchange="updateContractItem(' + i + ',\'rubro_id\',this.value)">' +
      rubroOpts +
    '</select>' +
    '<input class="form-control" style="font-size:12px" value="' + (it.unit || 'm²') + '" oninput="updateContractItem(' + i + ',\'unit\',this.value)">' +
    '<input class="form-control" style="font-size:12px" type="number" min="0" value="' + (it.quantity || 0) + '" oninput="updateContractItem(' + i + ',\'quantity\',+this.value)">' +
    '<input class="form-control" style="font-size:12px" type="number" min="0" value="' + (it.unit_price || 0) + '" oninput="updateContractItem(' + i + ',\'unit_price\',+this.value)">' +
    '<input class="form-control" style="font-size:12px;background:#f8fafc" readonly id="coni-total-' + i + '" value="' + (it.total || 0) + '">' +
    '<button class="btn-ghost btn danger" onclick="removeContractItem(' + i + ')"><i class="fas fa-times"></i></button>' +
    '</div>';
}

window._contractItems = [];
function addContractItem() {
  const it = { item_id: uuid(), description: '', unit: 'm²', quantity: 0, unit_price: 0, total: 0, rubro_id: '', boq_item_id: '' };
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

function reloadContractRubros() {
  const rubros = DB.getAll('rubros').filter(r => r.active !== false).sort((a,b) => (a.code||'').localeCompare(b.code||''));
  (window._contractItems || []).forEach(function(it, i) {
    const row = document.getElementById('coni-row-' + i);
    if (!row) return;
    const sel = row.querySelector('select');
    if (!sel) return;
    const current = it.rubro_id || '';
    sel.innerHTML = '<option value="">— Sin rubro —</option>' +
      rubros.map(r => '<option value="' + r.id + '"' + (current === r.id ? ' selected' : '') + '>' + r.code + ' — ' + r.name + '</option>').join('');
  });
  toast('Lista de rubros actualizada', 'success');
}

function cronoFormRow(it, i, defStart, defEnd) {
  return '<div id="crono-form-row-' + i + '" style="display:grid;grid-template-columns:2.5fr 160px 160px;gap:6px;margin-bottom:6px;align-items:center">' +
    '<input class="form-control" style="font-size:12px;background:#f8fafc" readonly value="' + (it.description || ('Partida ' + (i + 1))) + '">' +
    '<input class="form-control" style="font-size:12px" type="date" value="' + (it.start_date || defStart) + '" oninput="updateContractItem(' + i + ',\'start_date\',this.value)">' +
    '<input class="form-control" style="font-size:12px" type="date" value="' + (it.end_date || defEnd) + '" oninput="updateContractItem(' + i + ',\'end_date\',this.value)">' +
    '</div>';
}

function updateContractItem(i, field, val) {
  if (!window._contractItems[i]) window._contractItems[i] = { item_id: uuid(), description: '', unit: 'm²', quantity: 0, unit_price: 0, total: 0, rubro_id: '', boq_item_id: '' };
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

  var savedId;
  if (id) { DB.update('contracts', id, data); toast('Contrato actualizado', 'success'); savedId = id; }
  else    { var nc = DB.insert('contracts', data); toast('Contrato creado', 'success'); savedId = nc.id; }

  window._contractItems = [];
  window._contractCashflow = [];
  window._contractAdicionales = [];
  closeModal();
  renderContractDetail(savedId);
}

function deleteContract(id) {
  confirmDialog('¿Eliminar este contrato? Las certificaciones asociadas quedarán sin contrato.', function() {
    DB.remove('contracts', id);
    toast('Contrato eliminado', 'warning');
    renderContratos();
  });
}

// Clave estable de una partida: por id si existe, si no por descripción (compat. legacy).
function _certItemKey(it) {
  return (it && it.item_id) ? ('id:' + it.item_id) : ('d:' + (((it && it.description) || '').trim().toLowerCase()));
}
// Acumulado certificado por partida (excluye rechazadas), sumando quantity_period.
function _certAccumByItem(certs) {
  var acc = {};
  (certs || []).forEach(function(c) {
    (c.items || []).forEach(function(it) {
      var k = _certItemKey(it);
      acc[k] = (acc[k] || 0) + (it.quantity_period || 0);
    });
  });
  return acc;
}

// ==== CERTIFICATE FORM FROM CONTRACT (con acumulado + Contabilidad A/B) ====
function openContractCertForm(contractId) {
  const contract = DB.getById('contracts', contractId);
  if (!contract) return;
  const proj     = DB.getById('projects', contract.project_id);
  const nextNum  = 'CERT-' + new Date().getFullYear() + '-' + String(DB.getAll('certificates').length + 1).padStart(3, '0');

  // accumulated certified qty per partida from prior certs (exclude rejected), by stable item_id
  const priorCerts = DB.getAll('certificates').filter(c => c.contract_id === contractId && c.status !== 'rejected');
  const accum = _certAccumByItem(priorCerts);

  const certItems = (contract.items || []).map(function(it) {
    const prev = accum[_certItemKey(it)] || 0;
    return {
      item_id:           it.item_id,
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

  // Tope: el acumulado (anterior + período) no debe superar la cantidad contratada.
  const over = items.filter(function(it) {
    const qc = it.quantity_contract || 0;
    const accum = (it.quantity_prev || 0) + (it.quantity_period || 0);
    return qc > 0 && accum > qc + 0.001;
  });
  if (over.length) {
    const detail = over.slice(0, 6).map(function(it) {
      const accum = (it.quantity_prev || 0) + (it.quantity_period || 0);
      return '• <b>' + escapeHtml(it.description || '(sin descripción)') + '</b>: ' +
             fmtNum(accum) + ' acum. sobre ' + fmtNum(it.quantity_contract || 0) + ' contratado';
    }).join('<br>') + (over.length > 6 ? '<br>…y ' + (over.length - 6) + ' más' : '');
    confirmDialog(
      '<b>' + over.length + ' ítem(es) superan la cantidad contratada</b> (avance &gt;100%):<br><br>' +
      detail + '<br><br>Revisá el contrato o la certificación anterior. ¿Certificar igual de todos modos?',
      function() { _doSaveContractCert(contractId); }
    );
    return;
  }
  _doSaveContractCert(contractId);
}

function _doSaveContractCert(contractId) {
  const contract = DB.getById('contracts', contractId);
  if (!contract) return;
  const items = window._ccertItems.filter(Boolean).filter(function(it) { return it.description; });
  if (!items.length) return;

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
  renderContractDetail(contractId);
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
      const certified = certs.filter(function(cert) { return cert.contract_id === c.id && cert.status !== 'rejected'; })
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
