/* ===== NUEVOS MÓDULOS / WRAPPERS ===== */

// ---- STUB HELPER ----
function _renderStub(icon, title, subtitle, features) {
  var featureItems = '';
  for (var i = 0; i < features.length; i++) {
    featureItems += '<li><i class="fas fa-check" style="color:var(--primary);margin-right:8px"></i>' + features[i] + '</li>';
  }
  document.getElementById('content').innerHTML =
    '<div class="page-header"><div>' +
    '<div class="page-title"><i class="fas ' + icon + '" style="margin-right:8px;color:var(--primary)"></i>' + title + '</div>' +
    '<div class="page-subtitle">' + subtitle + '</div>' +
    '</div></div>' +
    '<div class="card" style="max-width:580px;margin:48px auto;text-align:center;padding:48px 32px">' +
    '<div style="font-size:56px;color:var(--primary);opacity:0.6;margin-bottom:20px"><i class="fas ' + icon + '"></i></div>' +
    '<h2 style="margin-bottom:8px;color:var(--text);font-size:20px">' + title + '</h2>' +
    '<p style="color:var(--text-muted);margin-bottom:24px;font-size:14px">' + subtitle + '</p>' +
    '<ul style="text-align:left;color:var(--text);font-size:14px;line-height:2.2;list-style:none;padding:0">' + featureItems + '</ul>' +
    '<div style="margin-top:28px;padding-top:20px;border-top:1px solid var(--border)">' +
    '<span class="badge badge-yellow" style="font-size:12px">En desarrollo</span>' +
    '</div></div>';
}

function renderDocumentosProv() {
  document.getElementById('content').innerHTML =
    '<div class="page-header">' +
    '<div>' +
    '<div class="page-title">Documentos de Proveedores</div>' +
    '<div class="page-subtitle">Registro y control de facturas recibidas de proveedores</div>' +
    '</div>' +
    '</div>' +
    renderSupplierInvoicesTab();
}

// ---- PROVEEDORES ----
// renderCuentasProv → cuentas.js
// renderCuentasCli  → cuentas.js
// renderCashflowCli → cuentas.js
// renderUnidades    → ventas.js

// ---- COMERCIAL: LEADS ----
var _leadsState = { filter: 'all' };

var LEAD_STAGES = [
  { id: 'prospect',    label: 'Prospecto',    color: '#94a3b8' },
  { id: 'qualified',   label: 'Calificado',   color: '#3b82f6' },
  { id: 'proposal',    label: 'Propuesta',    color: '#f59e0b' },
  { id: 'negotiation', label: 'Negociación',  color: '#8b5cf6' },
  { id: 'won',         label: 'Ganado',       color: '#22c55e' },
  { id: 'lost',        label: 'Perdido',      color: '#ef4444' },
];

function renderLeads() {
  var leads = DB.getAll('leads');
  var filter = _leadsState.filter || 'all';

  // KPIs
  var active = leads.filter(function(l) { return l.stage !== 'won' && l.stage !== 'lost'; });
  var won    = leads.filter(function(l) { return l.stage === 'won'; });
  var totalValue = active.reduce(function(s, l) { return s + ((l.value || 0) * (l.probability || 50) / 100); }, 0);
  var wonValue   = won.reduce(function(s, l) { return s + (l.value || 0); }, 0);

  // Pipeline board
  var boardCols = LEAD_STAGES.map(function(st) {
    var stageleads = leads.filter(function(l) { return l.stage === st.id; });
    var stageVal = stageleads.reduce(function(s, l) { return s + (l.value || 0); }, 0);

    var cards = stageleads.map(function(l) {
      var prob = l.probability != null ? l.probability : 50;
      var overdue = l.expected_close && l.expected_close < todayStr() && st.id !== 'won' && st.id !== 'lost';
      return '<div class="card" style="padding:12px;margin-bottom:8px;cursor:pointer;border-left:3px solid ' + st.color + '" onclick="leadEdit(\'' + l.id + '\')">' +
        '<div style="font-size:13px;font-weight:600;margin-bottom:4px">' + esc(l.title) + '</div>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">' + esc(l.client_name || '') + '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px">' +
          (l.value ? '<span style="font-size:12px;font-weight:600">' + fmtMoney(l.value) + '</span>' : '<span></span>') +
          '<span style="font-size:11px;color:' + (prob >= 70 ? '#22c55e' : prob >= 40 ? '#f59e0b' : '#94a3b8') + '">' + prob + '%</span>' +
        '</div>' +
        (l.expected_close ? '<div style="font-size:10px;color:' + (overdue ? 'var(--danger)' : 'var(--text-muted)') + ';margin-top:4px"><i class="fas fa-calendar" style="margin-right:3px"></i>' + fmtDate(l.expected_close) + '</div>' : '') +
        '<div style="margin-top:8px;display:flex;gap:4px;justify-content:flex-end">' +
          leadStageButtons(l) +
          '<button class="btn btn-sm" style="color:var(--danger);padding:2px 6px" onclick="event.stopPropagation();leadDelete(\'' + l.id + '\')" title="Eliminar"><i class="fas fa-trash"></i></button>' +
        '</div>' +
      '</div>';
    }).join('') || '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:20px 8px">Sin oportunidades</div>';

    return '<div style="flex:none;width:220px;scroll-snap-align:start">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:8px 10px;background:var(--bg);border-radius:var(--radius-sm);border-bottom:2px solid ' + st.color + '">' +
        '<span style="font-size:12px;font-weight:700;color:' + st.color + '">' + st.label + '</span>' +
        '<span style="font-size:11px;color:var(--text-muted)">' + stageleads.length + (stageVal ? ' · ' + fmtMoney(stageVal) : '') + '</span>' +
      '</div>' +
      cards +
    '</div>';
  }).join('');

  document.getElementById('content').innerHTML =
    '<div class="page-header"><div>' +
      '<div class="page-title"><i class="fas fa-handshake" style="margin-right:8px;color:var(--primary)"></i>Leads Comerciales</div>' +
      '<div class="page-subtitle">Pipeline de oportunidades y seguimiento comercial</div>' +
    '</div>' +
    '<button class="btn btn-primary" onclick="leadNuevo()"><i class="fas fa-plus"></i> Nuevo Lead</button>' +
    '</div>' +

    '<div class="stats-grid" style="margin-bottom:20px">' +
      '<div class="stat-card"><div class="stat-icon blue"><i class="fas fa-funnel-dollar"></i></div>' +
        '<div><div class="stat-value">' + active.length + '</div><div class="stat-label">En Pipeline</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-calculator"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalValue) + '</div><div class="stat-label">Valor Ajustado</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon green"><i class="fas fa-trophy"></i></div>' +
        '<div><div class="stat-value">' + won.length + '</div><div class="stat-label">Ganados</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon green"><i class="fas fa-dollar-sign"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(wonValue) + '</div><div class="stat-label">Monto Ganado</div></div></div>' +
    '</div>' +

    '<div id="leads-tabs" class="tabs-container">' +
      '<div class="tabs-header">' +
        '<button class="tab-btn active" data-tab="tab-leads-pipeline" onclick="leadsSetTab(\'pipeline\')">Pipeline</button>' +
        '<button class="tab-btn" data-tab="tab-leads-lista" onclick="leadsSetTab(\'lista\')">Lista</button>' +
      '</div>' +
      '<div id="tab-leads-pipeline" class="tab-content active">' +
        '<div style="display:flex;gap:10px;overflow-x:auto;padding:4px 2px 16px;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity">' + boardCols + '</div>' +
      '</div>' +
      '<div id="tab-leads-lista" class="tab-content">' + _leadsListTable(leads) + '</div>' +
    '</div>';
}

function leadStageButtons(l) {
  var stages = LEAD_STAGES;
  var idx = stages.findIndex(function(s) { return s.id === l.stage; });
  var html = '';
  if (idx > 0) {
    html += '<button class="btn btn-sm btn-secondary" style="padding:2px 6px;font-size:10px" onclick="event.stopPropagation();leadAdvance(\'' + l.id + '\',-1)" title="Retroceder"><i class="fas fa-chevron-left"></i></button>';
  }
  if (idx < stages.length - 1) {
    html += '<button class="btn btn-sm btn-primary" style="padding:2px 6px;font-size:10px" onclick="event.stopPropagation();leadAdvance(\'' + l.id + '\',1)" title="Avanzar etapa"><i class="fas fa-chevron-right"></i></button>';
  }
  return html;
}

function leadAdvance(id, dir) {
  var l = DB.getById('leads', id);
  if (!l) return;
  var stages = LEAD_STAGES;
  var idx = stages.findIndex(function(s) { return s.id === l.stage; });
  var newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= stages.length) return;
  DB.update('leads', id, { stage: stages[newIdx].id });
  renderLeads();
}

function _leadsListTable(leads) {
  if (!leads.length) {
    return '<div class="empty-state"><i class="fas fa-handshake"></i><p>No hay leads registrados</p></div>';
  }
  var rows = leads.map(function(l) {
    var st = LEAD_STAGES.find(function(s) { return s.id === l.stage; }) || LEAD_STAGES[0];
    var prob = l.probability != null ? l.probability : 50;
    var overdue = l.expected_close && l.expected_close < todayStr() && l.stage !== 'won' && l.stage !== 'lost';
    return '<tr>' +
      '<td><b>' + esc(l.title) + '</b></td>' +
      '<td>' + esc(l.client_name || '—') + '</td>' +
      '<td><span class="badge" style="background:' + st.color + '20;color:' + st.color + ';border:1px solid ' + st.color + '40">' + st.label + '</span></td>' +
      '<td class="number-cell">' + (l.value ? fmtMoney(l.value) : '—') + '</td>' +
      '<td style="text-align:center"><span style="font-size:12px;color:' + (prob >= 70 ? '#22c55e' : prob >= 40 ? '#f59e0b' : '#94a3b8') + '">' + prob + '%</span></td>' +
      '<td style="color:' + (overdue ? 'var(--danger)' : '') + '">' + (l.expected_close ? fmtDate(l.expected_close) : '—') + '</td>' +
      '<td>' + esc(l.assigned_to || '—') + '</td>' +
      '<td style="white-space:nowrap">' +
        '<button class="btn btn-sm btn-secondary" onclick="leadEdit(\'' + l.id + '\')"><i class="fas fa-edit"></i></button> ' +
        '<button class="btn btn-sm" style="color:var(--danger)" onclick="leadDelete(\'' + l.id + '\')"><i class="fas fa-trash"></i></button>' +
      '</td>' +
    '</tr>';
  }).join('');
  return '<div class="card" style="padding:0"><table class="table">' +
    '<thead><tr><th>Título</th><th>Cliente</th><th>Etapa</th><th>Valor</th><th>Prob.</th><th>Cierre Est.</th><th>Asignado a</th><th></th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table></div>';
}

function leadsSetTab(tab) {
  ['pipeline', 'lista'].forEach(function(t) {
    var btn = document.querySelector('[data-tab="tab-leads-' + t + '"]');
    var panel = document.getElementById('tab-leads-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
    if (panel) panel.classList.toggle('active', t === tab);
  });
}

function _leadForm(l) {
  l = l || {};
  var stageOptions = LEAD_STAGES.map(function(s) {
    return '<option value="' + s.id + '"' + (l.stage === s.id ? ' selected' : '') + '>' + s.label + '</option>';
  }).join('');
  var prob = l.probability != null ? l.probability : 50;
  return '<div class="form-grid">' +
    '<div class="form-group" style="grid-column:1/-1"><label>Título *</label>' +
      '<input id="ld-title" class="form-control" value="' + esc(l.title || '') + '" placeholder="Ej: Edificio Torre Norte — 8 pisos"></div>' +
    '<div class="form-group"><label>Cliente / Empresa *</label>' +
      '<input id="ld-client" class="form-control" value="' + esc(l.client_name || '') + '" placeholder="Nombre del potencial cliente"></div>' +
    '<div class="form-group"><label>Contacto</label>' +
      '<input id="ld-contact" class="form-control" value="' + esc(l.contact_name || '') + '" placeholder="Nombre del contacto"></div>' +
    '<div class="form-group"><label>Email</label>' +
      '<input id="ld-email" class="form-control" type="email" value="' + esc(l.contact_email || '') + '"></div>' +
    '<div class="form-group"><label>Teléfono</label>' +
      '<input id="ld-phone" class="form-control" value="' + esc(l.contact_phone || '') + '"></div>' +
    '<div class="form-group"><label>Etapa</label>' +
      '<select id="ld-stage" class="form-control">' + stageOptions + '</select></div>' +
    '<div class="form-group"><label>Valor Estimado ($)</label>' +
      '<input id="ld-value" class="form-control" type="number" min="0" value="' + (l.value || '') + '" placeholder="0"></div>' +
    '<div class="form-group"><label>Probabilidad (%)</label>' +
      '<input id="ld-prob" class="form-control" type="number" min="0" max="100" value="' + prob + '"></div>' +
    '<div class="form-group"><label>Fecha Cierre Estimada</label>' +
      '<input id="ld-close" class="form-control" type="date" value="' + (l.expected_close || '') + '"></div>' +
    '<div class="form-group"><label>Asignado a</label>' +
      '<input id="ld-assign" class="form-control" value="' + esc(l.assigned_to || '') + '" placeholder="Nombre o email"></div>' +
  '</div>' +
  '<div class="form-group"><label>Descripción / Notas</label>' +
    '<textarea id="ld-notes" class="form-control" rows="3">' + esc(l.notes || '') + '</textarea></div>';
}

function leadNuevo() {
  openModal('Nuevo Lead', _leadForm(), 'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="leadGuardar(null)"><i class="fas fa-save"></i> Guardar</button>'
  );
}

function leadEdit(id) {
  var l = DB.getById('leads', id);
  if (!l) return;
  openModal('Editar Lead', _leadForm(l), 'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="leadGuardar(\'' + id + '\')"><i class="fas fa-save"></i> Guardar</button>'
  );
}

function leadGuardar(id) {
  var g = function(eid) { return (document.getElementById(eid) || {}).value || ''; };
  var title = g('ld-title').trim();
  var client = g('ld-client').trim();
  if (!title) { toast('El título es obligatorio', 'error'); return; }
  if (!client) { toast('El cliente es obligatorio', 'error'); return; }
  var data = {
    title: title, client_name: client,
    contact_name: g('ld-contact'), contact_email: g('ld-email'), contact_phone: g('ld-phone'),
    stage: g('ld-stage') || 'prospect',
    value: parseFloat(g('ld-value')) || 0,
    probability: parseInt(g('ld-prob')) || 50,
    expected_close: g('ld-close'),
    assigned_to: g('ld-assign'),
    notes: g('ld-notes'),
  };
  if (id) { DB.update('leads', id, data); toast('Lead actualizado', 'success'); }
  else { DB.insert('leads', data); toast('Lead creado', 'success'); }
  closeModal();
  renderLeads();
}

function leadDelete(id) {
  confirmDialog('Eliminar este lead?', function() {
    DB.remove('leads', id);
    renderLeads();
    toast('Lead eliminado', 'success');
  });
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- CONTABILIDAD: WRAPPERS STANDALONE ----
function _contaHeader(title, subtitle, actions) {
  return '<div class="page-header"><div><div class="page-title">' + title + '</div>' +
    '<div class="page-subtitle">' + subtitle + '</div></div>' +
    (actions ? '<div class="page-actions">' + actions + '</div>' : '') + '</div>';
}

function renderContaDiario() {
  var entries = DB.getAll('journalEntries');
  document.getElementById('content').innerHTML =
    _contaHeader('Libro Diario', entries.length + ' asientos contables',
      '<button class="btn btn-secondary" onclick="exportJournal()"><i class="fas fa-download"></i> Exportar</button>' +
      '<button class="btn btn-primary" onclick="openJEForm()"><i class="fas fa-plus"></i> Nuevo Asiento</button>') +
    renderJournal(entries);
}

function renderContaSumas() {
  var accounts = DB.getAll('accounts');
  var entries = DB.getAll('journalEntries');
  document.getElementById('content').innerHTML =
    _contaHeader('Sumas y Saldos', 'Balance de comprobación') +
    renderSumasYSaldosContabilidad(accounts, entries);
}

function renderContaBalance() {
  var accounts = DB.getAll('accounts');
  var entries = DB.getAll('journalEntries');
  document.getElementById('content').innerHTML =
    _contaHeader('Balance General', 'Estado de situación patrimonial') +
    renderBalance(accounts, entries);
  setTimeout(function() { renderResultsChart(accounts, entries); }, 100);
}

function renderContaResultados() {
  var accounts = DB.getAll('accounts');
  var entries = DB.getAll('journalEntries');
  document.getElementById('content').innerHTML =
    _contaHeader('Estado de Resultados', 'Ingresos y egresos del ejercicio') +
    renderResults(accounts, entries);
  setTimeout(function() { renderResultsChart(accounts, entries); }, 100);
}
// renderContaPlan is defined in contabilidad.js (standalone with import/export)
// renderContaMayores is defined in contabilidad.js (full implementation)

// renderCheques      → bancos.js
// renderCuentasBanco → bancos.js

// ---- NAV COLLAPSE ----
var _NAV_COLLAPSE_KEY = 'erp_nav_sections_v1';

function toggleSection(el) {
  var group = el.closest('.nav-group');
  if (!group) return;
  group.classList.toggle('collapsed');
  var states = {};
  try { states = JSON.parse(localStorage.getItem(_NAV_COLLAPSE_KEY) || '{}'); } catch(e) {}
  var name = el.querySelector('span') ? el.querySelector('span').textContent.trim() : el.textContent.trim();
  states[name] = group.classList.contains('collapsed');
  localStorage.setItem(_NAV_COLLAPSE_KEY, JSON.stringify(states));
}

function initNavCollapse() {
  var states = {};
  try { states = JSON.parse(localStorage.getItem(_NAV_COLLAPSE_KEY) || '{}'); } catch(e) {}
  document.querySelectorAll('#sidebar-nav .nav-group').forEach(function(group) {
    var sec = group.querySelector('.nav-section');
    if (!sec) return;
    var name = sec.querySelector('span') ? sec.querySelector('span').textContent.trim() : sec.textContent.trim();
    if (states[name]) group.classList.add('collapsed');
  });
}

// Override utils.js filterNav to handle grouped structure
function filterNav(q) {
  q = (q || '').toLowerCase();
  var nav = document.getElementById('sidebar-nav');
  if (!q) {
    nav.classList.remove('nav-searching');
    document.querySelectorAll('#sidebar-nav .nav-item').forEach(function(li) { li.style.display = ''; });
    document.querySelectorAll('#sidebar-nav .nav-group').forEach(function(g) { g.style.display = ''; });
    return;
  }
  nav.classList.add('nav-searching');
  // standalone dashboard item
  var dash = document.querySelector('#sidebar-nav > ul > li.nav-item');
  if (dash) dash.style.display = dash.textContent.toLowerCase().includes(q) ? '' : 'none';
  // grouped items
  document.querySelectorAll('#sidebar-nav .nav-group').forEach(function(group) {
    var anyMatch = false;
    group.querySelectorAll('.nav-item').forEach(function(li) {
      var matches = li.textContent.toLowerCase().includes(q);
      li.style.display = matches ? '' : 'none';
      if (matches) anyMatch = true;
    });
    group.style.display = anyMatch ? '' : 'none';
  });
}

document.addEventListener('DOMContentLoaded', function() {
  initNavCollapse();
});
