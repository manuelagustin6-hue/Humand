/* ===== APP CORE / ROUTER ===== */

var APP_VERSION = '2026-06-16-v7';

function forceClearCache() {
  var btn = event && event.target ? event.target.closest('button') : null;
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando…'; }
  var done = function() { window.location.replace(window.location.pathname + '?bust=' + Date.now()); };
  try { localStorage.removeItem('erp_app_version'); } catch(e) {}
  try { sessionStorage.removeItem('_erp_bust'); } catch(e) {}
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(function(regs) { return Promise.all(regs.map(function(r) { return r.unregister(); })); })
      .then(function() {
        return 'caches' in window ? caches.keys().then(function(keys) {
          return Promise.all(keys.map(function(k) { return caches.delete(k); }));
        }) : Promise.resolve();
      })
      .then(done).catch(done);
  } else { done(); }
}

window.APP_STATE = { currentModule: 'dashboard', activeProject: '', activeCompany: 'comp-001', currentUser: null };

const MODULES = {
  // Core
  dashboard:       { title: 'Dashboard',                      icon: 'fa-chart-pie',             render: renderDashboard },

  // Compras (wrappers a tabs de compras.js)
  compras:         { title: 'Compras',                        icon: 'fa-shopping-cart',          render: renderCompras },
  pedidos:         { title: 'Pedidos de Materiales',          icon: 'fa-clipboard-list',         render: renderPedidos },
  ordenes_compra:  { title: 'Ordenes de Compra',             icon: 'fa-file-alt',               render: renderOrdenesCompra },
  licitaciones:    { title: 'Licitaciones',                   icon: 'fa-gavel',                  render: renderLicitaciones },

  // Proveedores
  cuentas_prov:    { title: 'Cuentas Corrientes Proveedores', icon: 'fa-building-columns',       render: renderCuentasProv },
  documentos_prov: { title: 'Documentos Proveedor',           icon: 'fa-file-invoice',           render: renderDocumentosProv },
  ordenes_pago:    { title: 'Ordenes de Pago',               icon: 'fa-file-invoice',           render: renderOrdenesPago },
  retenciones:     { title: 'Retenciones',                   icon: 'fa-percentage',             render: renderRetenciones },

  // Gestion de Obra
  projects:        { title: 'Proyectos',                     icon: 'fa-building',               render: renderProjects },
  contratos:       { title: 'Contratos',                     icon: 'fa-file-contract',          render: renderContratos },
  certificaciones: { title: 'Certificaciones',               icon: 'fa-certificate',            render: renderCertificaciones },
  presupuesto:     { title: 'Computo y Presupuesto',         icon: 'fa-calculator',             render: renderPresupuesto },
  seguimiento:     { title: 'Control Presupuestal',          icon: 'fa-chart-line',             render: renderSeguimiento },
  minutas:         { title: 'Minutas de Reunión',            icon: 'fa-clipboard-list',         render: renderMinutas },
  parte_diario:    { title: 'Parte Diario de Obra',          icon: 'fa-hard-hat',               render: renderParteDiario },
  gantt:           { title: 'Diagrama de Gantt',             icon: 'fa-stream',                 render: renderGantt },
  rubros:          { title: 'Rubros de Obra',                icon: 'fa-list-ol',                render: renderRubros },
  apu:             { title: 'APU — Análisis de Precios Unitarios', icon: 'fa-calculator',       render: renderAPU },
  indices:         { title: 'Indices de Ajuste',             icon: 'fa-chart-line',             render: renderIndices },

  // Clientes
  clientes:        { title: 'Clientes',                      icon: 'fa-users',                  render: renderClientes },
  facturacion:     { title: 'Facturacion',                   icon: 'fa-file-invoice-dollar',    render: renderFacturacion },
  cobranzas:       { title: 'Cobranzas',                     icon: 'fa-hand-holding-dollar',    render: renderCobranzas },
  cuentas_cli:     { title: 'Cuentas Corrientes Clientes',   icon: 'fa-users-between-lines',    render: renderCuentasCli },
  cashflow_cli:    { title: 'Cash Flow Clientes',            icon: 'fa-money-bill-trend-up',    render: renderCashflowCli },

  // Comercial
  leads:           { title: 'Leads Comerciales',             icon: 'fa-handshake',              render: renderLeads },
  unidades:        { title: 'Detalle de Unidades',           icon: 'fa-house-chimney',          render: renderUnidades },

  // Tesoreria
  cuentas_banco:   { title: 'Cuentas Bancarias y Cajas',     icon: 'fa-landmark',               render: renderCuentasBanco },
  tesoreria:       { title: 'Operaciones',                   icon: 'fa-arrows-left-right',      render: renderTesoreria },
  cheques:         { title: 'Cheques',                       icon: 'fa-money-check',            render: renderCheques },
  conciliaciones:  { title: 'Conciliaciones Bancarias',      icon: 'fa-balance-scale',          render: renderConciliaciones },
  inversiones:     { title: 'Inversiones',                   icon: 'fa-chart-line',             render: renderInversiones },
  rpt_tesoreria:   { title: 'Reporte de Tesorería',          icon: 'fa-table-columns',          render: renderReporteTesoria },

  // Contabilidad
  contabilidad:    { title: 'Contabilidad',                  icon: 'fa-book-open',              render: renderContabilidad },
  conta_diario:    { title: 'Libro Diario',                  icon: 'fa-book',                   render: renderContaDiario },
  conta_sumas:     { title: 'Sumas y Saldos',                icon: 'fa-table-columns',          render: renderContaSumas },
  conta_balance:   { title: 'Balance General',               icon: 'fa-scale-balanced',         render: renderContaBalance },
  conta_resultados:{ title: 'Estado de Resultados',          icon: 'fa-chart-bar',              render: renderContaResultados },
  conta_plan:      { title: 'Plan de Cuentas',               icon: 'fa-sitemap',                render: renderContaPlan },
  conta_mayores:   { title: 'Libro Mayor',                   icon: 'fa-book',                   render: renderContaMayores },
  libro_iva:       { title: 'Libro IVA Compras / Ventas',   icon: 'fa-receipt',                render: renderLibroIVA },
  tax_planning:    { title: 'Tax Planning',                 icon: 'fa-calculator',             render: renderTaxPlanning },

  // RRHH
  rrhh:            { title: 'RRHH — Empleados y Liquidaciones', icon: 'fa-hard-hat',              render: renderRRHH },

  // Stock
  stock:           { title: 'Stock / Almacén de Obra',         icon: 'fa-boxes-stacking',         render: renderStock },

  // Notas Crédito / Débito
  notas:           { title: 'Notas Cr./Déb.',                  icon: 'fa-file-circle-minus',      render: renderNotas },
  notas_rec:       { title: 'Notas Recibidas (Proveedores)',    icon: 'fa-file-circle-minus',      render: renderNotas },
  notas_emi:       { title: 'Notas Emitidas (Clientes)',        icon: 'fa-file-circle-plus',       render: function() { renderNotas(); setTimeout(function(){ var t=document.querySelector('#notas-tabs .tab-btn[data-tab="tab-notas-emi"]');if(t)t.click();},80); } },

  // Administracion
  empresas:        { title: 'Empresas',                      icon: 'fa-city',                   render: renderEmpresas },
  asientos:        { title: 'Asientos Automaticos',          icon: 'fa-magic',                  render: renderAsientos },
  aprobaciones:    { title: 'Aprobaciones',                  icon: 'fa-check-double',           render: renderAprobaciones },
  vencimientos:    { title: 'Vencimientos Fiscales',         icon: 'fa-calendar-exclamation',   render: renderVencimientos },
  reportes:        { title: 'Reportes',                      icon: 'fa-chart-bar',              render: renderReportes },
  audit_log:       { title: 'Registro de Auditoría',         icon: 'fa-history',                render: renderAuditLog },
  usuarios:        { title: 'Usuarios',                      icon: 'fa-users',                  render: renderUsuarios },
  ajustes:         { title: 'Ajustes del Sistema',           icon: 'fa-cog',                    render: renderAjustes },
};

function navigate(module) {
  var mod = MODULES[module];
  if (!mod) return;

  // Permission gate — dashboard is always accessible
  if (module !== 'dashboard' && window.APP_STATE.currentUser && !canView(module)) {
    toast('Sin acceso: no tenés permiso para ver este módulo', 'warning');
    return;
  }

  // Close mobile sidebar drawer
  document.body.classList.remove('sidebar-open');

  // Update bottom nav active state
  updateMobileNav(module);

  // Update active nav
  document.querySelectorAll('#sidebar-nav .nav-item').forEach(function(li) {
    li.classList.toggle('active', li.dataset.module === module);
  });

  // Update breadcrumb
  document.getElementById('breadcrumb').innerHTML =
    '<i class="fas ' + mod.icon + '"></i><span>' + mod.title + '</span>';

  // Render
  window.APP_STATE.currentModule = module;
  try { localStorage.setItem('erp_active_module', module); } catch(e) {}
  var content = document.getElementById('content');
  content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:var(--text-muted)"></i></div>';

  // Small timeout to let spinner show
  setTimeout(function() {
    try {
      mod.render();
    } catch(e) {
      content.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar modulo: ' + e.message + '</p></div>';
      console.error(e);
    }
    // Always reset scroll to top when switching modules
    content.scrollTop = 0;
    // Read-only banner when user has view-only access for this module
    var existingBanner = document.getElementById('readonly-banner');
    if (existingBanner) existingBanner.remove();
    if (window.APP_STATE.currentUser && canView(module) && !canEdit(module)) {
      var banner = document.createElement('div');
      banner.id = 'readonly-banner';
      banner.innerHTML = '<i class="fas fa-eye"></i> <strong>Solo lectura</strong> — podés consultar los datos pero no tenés permiso para modificarlos en este módulo.';
      banner.style.cssText = 'background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 16px;margin:0 0 14px;font-size:12px;color:#92400e;display:flex;align-items:center;gap:10px;flex-shrink:0;';
      var contentEl = document.getElementById('content');
      if (contentEl) contentEl.insertBefore(banner, contentEl.firstChild);
    }
    updateNotifBadge();
  }, 60);
}

// ---- MOBILE BOTTOM NAV ----
function updateMobileNav(module) {
  document.querySelectorAll('#mobile-bottom-nav .mnav-item').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.nav === module);
  });
}

// ---- SYNC BADGE (shows pending writes count) ----
function _updateSyncBadge() {
  var badge = document.getElementById('sync-status');
  if (!badge) return;
  var pending = (typeof DB !== 'undefined' && typeof DB.getPendingCount === 'function') ? DB.getPendingCount() : 0;
  if (!_SUPA.online) {
    badge.textContent = pending > 0 ? '○ Sin conexión (' + pending + ' pend.)' : '○ Sin conexión';
    badge.style.color = '#f59e0b';
    badge.title = 'Sin conexión a Supabase — ' + (pending > 0 ? pending + ' cambio(s) pendiente(s) de sincronizar' : 'datos guardados solo en este dispositivo');
  } else if (pending > 0) {
    badge.textContent = '⚠ ' + pending + ' pend.';
    badge.style.color = '#f59e0b';
    badge.title = pending + ' cambio(s) pendiente(s) de sincronizar con Supabase — hacé clic para reintentar';
    badge.style.cursor = 'pointer';
    badge.onclick = function() { DB.forcePull(); };
  } else {
    badge.textContent = '● En línea';
    badge.style.color = '#22c55e';
    badge.title = 'Sincronizado con Supabase — hacé clic para forzar sincronización';
    badge.style.cursor = 'pointer';
    badge.onclick = function() { DB.forcePull(); };
  }
}

// ---- EXCHANGE RATE SYNC ----
function syncExchangeRates() {
  var today = (new Date()).toISOString().split('T')[0];
  var lastSync = localStorage.getItem('erp_last_rate_sync');
  if (lastSync === today) return;

  fetch('https://open.er-api.com/v6/latest/USD')
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
      if (!data || data.result !== 'success') return;
      var apiRates = data.rates;
      var global = DB.getGlobal();
      var currencies = global.currencies || [];
      var currencyIds = currencies.map(function(c) { return c.id; });
      if (!global.exchangeRates) global.exchangeRates = [];

      function upsertRate(from, to, rate) {
        var id = 'er-sync-' + from.toLowerCase() + '-' + to.toLowerCase() + '-' + today.replace(/-/g, '');
        var idx = -1;
        for (var i = 0; i < global.exchangeRates.length; i++) {
          if (global.exchangeRates[i].date === today && global.exchangeRates[i].from === from && global.exchangeRates[i].to === to) {
            idx = i; break;
          }
        }
        if (idx === -1) {
          global.exchangeRates.push({ id: id, date: today, from: from, to: to, rate: Math.round(rate * 100) / 100 });
        } else {
          global.exchangeRates[idx].rate = Math.round(rate * 100) / 100;
        }
      }

      currencyIds.forEach(function(to) {
        if (to === 'USD') return;
        if (apiRates[to]) upsertRate('USD', to, apiRates[to]);
      });

      if (apiRates['EUR'] && apiRates['EUR'] > 0) {
        currencyIds.forEach(function(to) {
          if (to === 'EUR' || to === 'USD') return;
          if (apiRates[to]) upsertRate('EUR', to, apiRates[to] / apiRates['EUR']);
        });
      }

      DB.saveGlobal(global);
      localStorage.setItem('erp_last_rate_sync', today);
      if (window.APP_STATE && window.APP_STATE.currentModule === 'empresas') {
        try { empRenderTabMonedas(); } catch(e) {}
      }
      toast('Tipos de cambio actualizados (' + today + ')', 'success');
    })
    .catch(function() {});
}

// ---- SIDEBAR PERMISSION FILTER ----
function applyPermissionsToSidebar() {
  var user = window.APP_STATE && window.APP_STATE.currentUser;

  document.querySelectorAll('#sidebar-nav .nav-item[data-module]').forEach(function(li) {
    var moduleId = li.dataset.module;
    // Dashboard always visible
    var visible = moduleId === 'dashboard' || !user || canView(moduleId);
    li.style.display = visible ? '' : 'none';
  });

  // Hide a nav-group if all its child items are hidden
  document.querySelectorAll('#sidebar-nav .nav-group').forEach(function(group) {
    var items = group.querySelectorAll('.nav-item[data-module]');
    var anyVisible = Array.prototype.some.call(items, function(li) { return li.style.display !== 'none'; });
    group.style.display = anyVisible ? '' : 'none';
  });
}

function updateSidebarUserInfo() {
  var user = window.APP_STATE && window.APP_STATE.currentUser;
  if (!user) return;
  var av = document.getElementById('sidebar-user-avatar');
  var nm = document.getElementById('sidebar-user-name');
  var rl = document.getElementById('sidebar-user-role');
  if (av) av.textContent = (user.name || '?').charAt(0).toUpperCase();
  if (nm) nm.textContent = user.name || user.email;
  if (rl && typeof usrRoleLabel === 'function') rl.textContent = usrRoleLabel(user.role);
}

// ---- NOTIFICATION BADGE & PANEL ----
function updateNotifBadge() {
  try {
    var count = _countPendingApprovals() + _countFiscalAlerts();
    var badge = document.getElementById('notif-badge');
    if (badge) { badge.textContent = count > 9 ? '9+' : String(count); badge.style.display = count > 0 ? '' : 'none'; }
  } catch(e) {}
}

function _countPendingApprovals() {
  var ais = DB.getAll('approvalInstances');
  var currentUser = window.APP_STATE && window.APP_STATE.currentUser;
  if (!currentUser) return 0;
  return ais.filter(function(ai) {
    if (ai.status !== 'pending') return false;
    var step = ai.steps && ai.steps[ai.current_step_index];
    if (!step || step.status !== 'pending') return false;
    return step.eligible_user_ids && step.eligible_user_ids.indexOf(currentUser.id) !== -1;
  }).length;
}

function _countFiscalAlerts() {
  try { return (typeof getFiscalAlerts === 'function') ? getFiscalAlerts().length : 0; } catch(e) { return 0; }
}

function toggleNotifPanel() {
  var panel = document.getElementById('notif-panel');
  if (!panel) return;
  if (panel.style.display === 'none' || !panel.style.display) {
    panel.innerHTML = buildNotifPanel();
    panel.style.display = '';
    setTimeout(function() { document.addEventListener('click', _closeNotifOutside); }, 10);
  } else {
    panel.style.display = 'none';
    document.removeEventListener('click', _closeNotifOutside);
  }
}

function _closeNotifOutside(e) {
  var panel = document.getElementById('notif-panel');
  var btn = document.getElementById('notif-bell-btn');
  if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
    panel.style.display = 'none';
    document.removeEventListener('click', _closeNotifOutside);
  }
}

function dismissNotifPanel() {
  var panel = document.getElementById('notif-panel');
  if (panel) panel.style.display = 'none';
  document.removeEventListener('click', _closeNotifOutside);
}

function buildNotifPanel() {
  var totalAprov = _countPendingApprovals();
  var fiscalAlerts = (typeof getFiscalAlerts === 'function') ? getFiscalAlerts() : [];
  var totalCount   = totalAprov + fiscalAlerts.length;

  var header = '<div style="padding:10px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:600;display:flex;justify-content:space-between;align-items:center">' +
    '<span><i class="fas fa-bell text-warning" style="margin-right:6px"></i>Notificaciones</span>' +
    (totalCount ? '<span class="badge badge-red" style="font-size:10px">' + totalCount + '</span>' : '') +
    '</div>';

  var sections = '';

  // ── Fiscal alerts ──
  if (fiscalAlerts.length) {
    sections += '<div style="padding:8px 16px 4px;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Vencimientos Fiscales</div>';
    sections += fiscalAlerts.map(function(fc) {
      var badge = (typeof fiscalAlertBadge === 'function') ? fiscalAlertBadge(fc) : { label: fc.due_date, color: '#6b7280', bg: '#f9fafb' };
      var typCfg = (window.FISCAL_TYPE_CFG && window.FISCAL_TYPE_CFG[fc.type]) || { label: fc.type || '', color: '#6b7280', icon: 'fa-calendar-alt' };
      return '<div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">' +
        '<i class="fas ' + typCfg.icon + '" style="color:' + typCfg.color + ';width:16px;text-align:center"></i>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" onclick="dismissNotifPanel();navigate(\'vencimientos\')" style="cursor:pointer">' + escapeHtml(fc.name) + '</div>' +
          '<div style="font-size:11px;color:' + badge.color + ';font-weight:600">' + badge.label + ' — ' + fmtDate(fc.due_date) + '</div>' +
        '</div>' +
        '<button class="btn btn-sm" style="color:#10b981;padding:2px 6px;flex-shrink:0" onclick="dismissFiscalAlert(\'' + fc.id + '\')" title="Marcar cumplido"><i class="fas fa-check"></i></button>' +
      '</div>';
    }).join('');
    sections += '<div onclick="dismissNotifPanel();navigate(\'vencimientos\')" style="padding:6px 16px;text-align:center;font-size:12px;color:var(--primary);cursor:pointer;font-weight:600;border-bottom:1px solid var(--border)">Ver calendario fiscal →</div>';
  }

  // ── Pending approvals ──
  if (totalAprov) {
    var ais = DB.getAll('approvalInstances');
    var currentUser = window.APP_STATE && window.APP_STATE.currentUser;
    var docLabels = { purchase_order:'OC', supplier_invoice:'Factura Prov.', payment_order:'Orden de Pago', invoice:'Factura' };
    var docCollections = { purchase_order:'purchaseOrders', supplier_invoice:'supplierInvoices', payment_order:'paymentOrders', invoice:'invoices' };
    var items = ais.filter(function(ai) {
      if (ai.status !== 'pending') return false;
      var step = ai.steps && ai.steps[ai.current_step_index];
      if (!step || step.status !== 'pending') return false;
      if (!currentUser) return false;
      return step.eligible_user_ids && step.eligible_user_ids.indexOf(currentUser.id) !== -1;
    });
    sections += '<div style="padding:8px 16px 4px;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Aprobaciones Pendientes</div>';
    sections += items.map(function(ai) {
      var step = ai.steps[ai.current_step_index];
      var stepName = (step && step.name) ? step.name : ('Paso ' + (ai.current_step_index + 1));
      var typeLabel = docLabels[ai.doc_type] || ai.doc_type;
      var coll = docCollections[ai.doc_type];
      var doc = coll ? DB.getById(coll, ai.doc_id) : null;
      var docNum = doc ? (doc.number || ai.doc_id) : ai.doc_id;
      return '<div onclick="dismissNotifPanel();navigate(\'aprobaciones\')" style="padding:10px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s" onmouseover="this.style.background=\'var(--primary-muted)\'" onmouseout="this.style.background=\'\'">' +
        '<div style="font-size:12px;font-weight:600"><i class="fas fa-clock text-warning" style="margin-right:6px"></i>' + typeLabel + ': ' + docNum + '</div>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">Paso: ' + stepName + '</div>' +
        '</div>';
    }).join('');
    sections += '<div onclick="dismissNotifPanel();navigate(\'aprobaciones\')" style="padding:6px 16px;text-align:center;font-size:12px;color:var(--primary);cursor:pointer;font-weight:600">Ver todas las aprobaciones →</div>';
  }

  if (!totalCount) {
    sections = '<div style="padding:24px 16px;text-align:center;color:var(--text-muted);font-size:13px"><i class="fas fa-check-circle" style="color:var(--success);font-size:22px;display:block;margin-bottom:8px"></i>Todo al día — sin alertas pendientes</div>';
  }

  return header + sections;
}

// ---- COMPANY SELECTOR ----
function populateCompanySelector() {
  var sel = document.getElementById('company-switcher');
  if (!sel) return;
  var companies = DB.getAllCompanies();
  var activeId  = window.APP_STATE.activeCompany || 'comp-001';
  var flags = { AR: '🇦🇷', UY: '🇺🇾', US: '🇺🇸', CL: '🇨🇱', BR: '🇧🇷' };
  var allOption = '<option value=""' + (activeId === '' ? ' selected' : '') + '>🌐 Todas las empresas</option>';
  sel.innerHTML = allOption + companies.map(function(c) {
    var flag = flags[c.country] || '🏢';
    var label = flag + ' ' + (c.legalName || c.name);
    return '<option value="' + c.id + '"' + (c.id === activeId ? ' selected' : '') + '>' + label + '</option>';
  }).join('');
  // Always show the widget (needed for switching)
  var wrap = document.getElementById('company-switcher-wrap');
  if (wrap) wrap.style.display = '';
}

function setActiveCompany(id) {
  if (id !== '') {
    var companies = DB.getAllCompanies();
    var company = companies.find(function(c) { return c.id === id; });
    if (!company) return;
    DB.setCompany(id);
  }
  window.APP_STATE.activeCompany = id;
  localStorage.setItem('erp_active_company', id);
  populateCompanySelector();
  populateProjectSelector();
  if (window.APP_STATE.currentModule) navigate(window.APP_STATE.currentModule);
}

// ---- DATA HEALTH CHECK ----
function checkDataHealth() {
  try {
    var result = DB.checkSnapshot();
    if (result && result.lost) {
      toast('⚠ Se detectó posible pérdida de datos. Podés restaurar desde Ajustes → Respaldo.', 'warning');
    }
  } catch(e) {}
}

// ---- INIT ----
function _initApp() {
  // Trigger global init / migration
  DB.getGlobal();

  // Determine the active company. Priority:
  //   1. companyId already set by the boot sequence from session metadata
  //   2. last saved choice in localStorage
  //   3. first company in the list
  // IMPORTANT: do NOT call DB.setCompany() with a different id than what DB.load() used —
  // that would cause a mismatch between loaded data and the active company key.
  var loadedCompanyId = DB._companyId; // set by boot before DB.load()
  var savedCompany    = localStorage.getItem('erp_active_company');
  var companies       = DB.getAllCompanies();
  var activeCompanyId = loadedCompanyId; // default: trust what was loaded

  if (savedCompany && companies.find(function(c) { return c.id === savedCompany; })) {
    activeCompanyId = savedCompany;
  } else if (companies.length > 0 && !companies.find(function(c) { return c.id === loadedCompanyId; })) {
    activeCompanyId = companies[0].id;
  }

  // Only call setCompany (and trigger a reload) if the company changed after load
  if (activeCompanyId !== loadedCompanyId) {
    DB.setCompany(activeCompanyId);
    if (_SUPA.online) {
      // Re-pull data for the correct company without blocking the UI
      DB.load().catch(function() {});
    }
  }
  window.APP_STATE.activeCompany = activeCompanyId;

  // Populate selectors
  populateCompanySelector();
  populateProjectSelector();

  // Check Supabase Auth session first (takes priority — JWT is already verified)
  if (_SUPA.session) {
    var supaEmail = ((_SUPA.session.user && _SUPA.session.user.email) || '').toLowerCase();
    var supaDbUser = DB.getAll('users').find(function(u) { return (u.email||'').toLowerCase() === supaEmail && u.active; });
    if (!supaDbUser) {
      var suMeta = (_SUPA.session.user && _SUPA.session.user.user_metadata) || {};
      supaDbUser = {
        id: _SUPA.session.user.id,
        name: suMeta.name || supaEmail.split('@')[0],
        email: supaEmail,
        role: suMeta.role || 'viewer',
        active: true,
      };
    }
    window.APP_STATE.currentUser = supaDbUser;
    document.getElementById('app').style.display = 'flex';
    document.getElementById('login-screen').style.display = 'none';
    updateSidebarUserInfo();
    applyPermissionsToSidebar();
    if (typeof populateProjectSelector === 'function') populateProjectSelector();
    var savedModule0 = null;
    try { savedModule0 = localStorage.getItem('erp_active_module'); } catch(e) {}
    navigate(savedModule0 && MODULES[savedModule0] ? savedModule0 : 'dashboard');
    setTimeout(syncExchangeRates, 1500);
    setTimeout(checkDataHealth, 3000);
    return;
  }

  // Fallback: check local session token
  var user = (typeof sessionCurrentUser === 'function') ? sessionCurrentUser() : null;
  if (user) {
    window.APP_STATE.currentUser = user;
    document.getElementById('app').style.display = 'flex';
    document.getElementById('login-screen').style.display = 'none';
    updateSidebarUserInfo();
    applyPermissionsToSidebar();
    var savedModule = null;
    try { savedModule = localStorage.getItem('erp_active_module'); } catch(e) {}
    navigate(savedModule && MODULES[savedModule] ? savedModule : 'dashboard');
    setTimeout(syncExchangeRates, 1500);
    setTimeout(checkDataHealth, 3000);
  } else {
    showLoginScreen();
  }
}

// ---- PASSWORD RECOVERY ----
function doSetRecoveryPassword() {
  var pw1 = (document.getElementById('recovery-pw1') || {}).value || '';
  var pw2 = (document.getElementById('recovery-pw2') || {}).value || '';
  var errEl = document.getElementById('recovery-error');
  if (!pw1 || pw1.length < 6) { if (errEl) errEl.textContent = 'La contraseña debe tener al menos 6 caracteres'; return; }
  if (pw1 !== pw2) { if (errEl) errEl.textContent = 'Las contraseñas no coinciden'; return; }
  if (errEl) errEl.textContent = '';
  var btn = document.querySelector('#recovery-screen .btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando…'; }
  // getSession() should already have the recovery session from the URL hash
  _SUPA.getSession().then(function(session) {
    if (!session) {
      if (errEl) errEl.textContent = 'Sesión expirada — pedí un nuevo enlace de recuperación.';
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Guardar contraseña'; }
      return;
    }
    return _SUPA.updatePassword(pw1).then(function(res) {
      if (res && res.error) {
        if (errEl) errEl.textContent = res.error.message || 'Error al actualizar la contraseña';
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Guardar contraseña'; }
      } else {
        // Success — clear hash and go to login
        try { window.history.replaceState(null, '', window.location.pathname); } catch(e) {}
        document.getElementById('recovery-screen').style.display = 'none';
        // Show login with success message
        var loader = document.getElementById('boot-loader');
        if (loader) loader.style.display = 'flex';
        _SUPA.getSession().then(function() { return DB.load(); }).then(function() {
          if (loader) loader.style.display = 'none';
          _initApp();
        });
        setTimeout(function() { toast('Contraseña actualizada correctamente. Podés ingresar ahora.', 'success'); }, 500);
      }
    });
  }).catch(function() {
    if (errEl) errEl.textContent = 'Error de conexión — intentá nuevamente.';
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Guardar contraseña'; }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  // Force hard-reload if the browser is running a stale cached version
  var storedVer = '';
  try { storedVer = localStorage.getItem('erp_app_version') || ''; } catch(e) {}
  if (storedVer !== APP_VERSION) {
    try { localStorage.setItem('erp_app_version', APP_VERSION); } catch(e) {}
    // sessionStorage guard prevents infinite reload if localStorage is unavailable
    var _bustDone = false;
    try { _bustDone = !!sessionStorage.getItem('_erp_bust'); } catch(e) {}
    if (!_bustDone) {
      try { sessionStorage.setItem('_erp_bust', '1'); } catch(e) {}
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(regs) {
          return Promise.all(regs.map(function(r) { return r.unregister(); }));
        }).then(function() {
          return 'caches' in window ? caches.keys().then(function(keys) {
            return Promise.all(keys.map(function(k) { return caches.delete(k); }));
          }) : Promise.resolve();
        }).then(function() {
          window.location.replace(window.location.pathname + '?bust=' + Date.now());
        });
      } else {
        window.location.replace(window.location.pathname + '?bust=' + Date.now());
      }
      return; // don't init while reloading
    }
  }
  try { localStorage.setItem('erp_app_version', APP_VERSION); } catch(e) {}

  // Check for password recovery token in URL hash BEFORE normal flow
  var _hash = window.location.hash || '';
  if (_hash.indexOf('type=recovery') !== -1 || _hash.indexOf('type=signup') !== -1) {
    // Supabase JS v2 automatically picks up the session from the hash via getSession()
    if (loader) loader.style.display = 'none';
    document.getElementById('recovery-screen').style.display = 'flex';
    // getSession() will parse the hash and set _SUPA.session
    _SUPA.getSession().catch(function() {});
    return;
  }

  // Show boot loader while we connect to Supabase
  var loader = document.getElementById('boot-loader');
  if (loader) loader.style.display = 'flex';

  // Restore Supabase Auth session before loading data (so JWT is available for RLS)
  _SUPA.getSession().then(function(session) {
    if (session) {
      var meta = (session.user && session.user.user_metadata) || {};
      var savedCo = '';
      try { savedCo = localStorage.getItem('erp_active_company') || ''; } catch(e) {}
      var companyId = meta.company_id || savedCo || 'comp-001';
      DB.setCompany(companyId);
    }
    return DB.load();
  }).then(function(online) {
    if (loader) loader.style.display = 'none';
    _updateSyncBadge();
    _initApp();
  });
});
