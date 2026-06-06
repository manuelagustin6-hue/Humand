/* ===== APP CORE / ROUTER ===== */

window.APP_STATE = { currentModule: 'dashboard', activeProject: '', activeCompany: 'comp-001' };

const MODULES = {
  // Core
  dashboard:       { title: 'Dashboard',                      icon: 'fa-chart-pie',             render: renderDashboard },

  // Compras (wrappers a tabs de compras.js)
  compras:         { title: 'Compras',                        icon: 'fa-shopping-cart',          render: renderCompras },
  pedidos:         { title: 'Pedidos de Materiales',          icon: 'fa-clipboard-list',         render: renderPedidos },
  ordenes_compra:  { title: 'Ordenes de Compra',             icon: 'fa-file-alt',               render: renderOrdenesCompra },

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
  gantt:           { title: 'Diagrama de Gantt',             icon: 'fa-stream',                 render: renderGantt },
  rubros:          { title: 'Rubros de Obra',                icon: 'fa-list-ol',                render: renderRubros },
  indices:         { title: 'Indices de Ajuste',             icon: 'fa-chart-line',             render: renderIndices },

  // Clientes
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

  // Contabilidad
  contabilidad:    { title: 'Contabilidad',                  icon: 'fa-book-open',              render: renderContabilidad },
  conta_diario:    { title: 'Libro Diario',                  icon: 'fa-book',                   render: renderContaDiario },
  conta_sumas:     { title: 'Sumas y Saldos',                icon: 'fa-table-columns',          render: renderContaSumas },
  conta_balance:   { title: 'Balance General',               icon: 'fa-scale-balanced',         render: renderContaBalance },
  conta_resultados:{ title: 'Estado de Resultados',          icon: 'fa-chart-bar',              render: renderContaResultados },
  conta_plan:      { title: 'Plan de Cuentas',               icon: 'fa-sitemap',                render: renderContaPlan },
  conta_mayores:   { title: 'Libro Mayor',                   icon: 'fa-book',                   render: renderContaMayores },

  // Administracion
  empresas:        { title: 'Empresas',                      icon: 'fa-city',                   render: renderEmpresas },
  aprobaciones:    { title: 'Aprobaciones',                  icon: 'fa-check-double',           render: renderAprobaciones },
  reportes:        { title: 'Reportes',                      icon: 'fa-chart-bar',              render: renderReportes },
  usuarios:        { title: 'Usuarios',                      icon: 'fa-users',                  render: renderUsuarios },
  ajustes:         { title: 'Ajustes del Sistema',           icon: 'fa-cog',                    render: renderAjustes },
};

function navigate(module) {
  var mod = MODULES[module];
  if (!mod) return;

  // Update active nav
  document.querySelectorAll('#sidebar-nav .nav-item').forEach(function(li) {
    li.classList.toggle('active', li.dataset.module === module);
  });

  // Update breadcrumb
  document.getElementById('breadcrumb').innerHTML =
    '<i class="fas ' + mod.icon + '"></i><span>' + mod.title + '</span>';

  // Render
  window.APP_STATE.currentModule = module;
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
  }, 60);
}

// ---- COMPANY SELECTOR ----
function populateCompanySelector() {
  var sel = document.getElementById('global-company');
  if (!sel) return;
  try {
    var companies = DB.getAllCompanies();
    var activeId = window.APP_STATE.activeCompany || 'comp-001';
    sel.innerHTML = companies.map(function(c) {
      var selected = c.id === activeId ? ' selected' : '';
      return '<option value="' + c.id + '"' + selected + '>' + c.name + '</option>';
    }).join('');
  } catch(e) {
    console.error('Error populating company selector', e);
  }
}

function setActiveCompany(id) {
  var companies = DB.getAllCompanies();
  var company = companies.find(function(c) { return c.id === id; });
  if (!company) return;
  DB.setCompany(id);
  window.APP_STATE.activeCompany = id;
  localStorage.setItem('erp_active_company', id);
  populateProjectSelector();
  if (window.APP_STATE.currentModule) navigate(window.APP_STATE.currentModule);
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', function() {
  // Trigger global init / migration
  DB.getGlobal();

  // Load previously active company or default to first
  var savedCompany = localStorage.getItem('erp_active_company');
  var companies = DB.getAllCompanies();
  var activeCompanyId = 'comp-001';
  if (savedCompany && companies.find(function(c) { return c.id === savedCompany; })) {
    activeCompanyId = savedCompany;
  } else if (companies.length > 0) {
    activeCompanyId = companies[0].id;
  }

  DB.setCompany(activeCompanyId);
  window.APP_STATE.activeCompany = activeCompanyId;

  // Populate selectors
  populateCompanySelector();
  populateProjectSelector();

  // Navigate to dashboard
  navigate('dashboard');
});
