/* ===== APP CORE / ROUTER ===== */

window.APP_STATE = { currentModule: 'dashboard', activeProject: '' };

const MODULES = {
  // Core
  dashboard:       { title: 'Dashboard',                      icon: 'fa-chart-pie',             render: renderDashboard },

  // Compras (wrappers a tabs de compras.js)
  compras:         { title: 'Compras',                        icon: 'fa-shopping-cart',          render: renderCompras },
  pedidos:         { title: 'Pedidos de Materiales',          icon: 'fa-clipboard-list',         render: renderPedidos },
  ordenes_compra:  { title: 'Órdenes de Compra',             icon: 'fa-file-alt',               render: renderOrdenesCompra },

  // Proveedores
  cuentas_prov:    { title: 'Cuentas Corrientes Proveedores', icon: 'fa-building-columns',       render: renderCuentasProv },
  documentos_prov: { title: 'Documentos Proveedor',           icon: 'fa-file-invoice',           render: renderDocumentosProv },
  ordenes_pago:    { title: 'Órdenes de Pago',               icon: 'fa-file-invoice',           render: renderOrdenesPago },
  retenciones:     { title: 'Retenciones',                   icon: 'fa-percentage',             render: renderRetenciones },

  // Gestión de Obra
  projects:        { title: 'Proyectos',                     icon: 'fa-building',               render: renderProjects },
  contratos:       { title: 'Contratos',                     icon: 'fa-file-contract',          render: renderContratos },
  certificaciones: { title: 'Certificaciones',               icon: 'fa-certificate',            render: renderCertificaciones },
  presupuesto:     { title: 'Cómputo y Presupuesto',         icon: 'fa-calculator',             render: renderPresupuesto },
  seguimiento:     { title: 'Control Presupuestal',          icon: 'fa-chart-line',             render: renderSeguimiento },
  gantt:           { title: 'Diagrama de Gantt',             icon: 'fa-stream',                 render: renderGantt },
  rubros:          { title: 'Rubros de Obra',                icon: 'fa-list-ol',                render: renderRubros },
  indices:         { title: 'Índices de Ajuste',             icon: 'fa-chart-line',             render: renderIndices },

  // Clientes
  facturacion:     { title: 'Facturación',                   icon: 'fa-file-invoice-dollar',    render: renderFacturacion },
  cobranzas:       { title: 'Cobranzas',                     icon: 'fa-hand-holding-dollar',    render: renderCobranzas },
  cuentas_cli:     { title: 'Cuentas Corrientes Clientes',   icon: 'fa-users-between-lines',    render: renderCuentasCli },
  cashflow_cli:    { title: 'Cash Flow Clientes',            icon: 'fa-money-bill-trend-up',    render: renderCashflowCli },

  // Comercial
  leads:           { title: 'Leads Comerciales',             icon: 'fa-handshake',              render: renderLeads },
  unidades:        { title: 'Detalle de Unidades',           icon: 'fa-house-chimney',          render: renderUnidades },

  // Tesorería
  cuentas_banco:   { title: 'Cuentas Bancarias y Cajas',     icon: 'fa-landmark',               render: renderCuentasBanco },
  tesoreria:       { title: 'Operaciones',                   icon: 'fa-arrows-left-right',      render: renderTesoreria },
  cheques:         { title: 'Cheques',                       icon: 'fa-money-check',            render: renderCheques },

  // Contabilidad
  contabilidad:    { title: 'Contabilidad',                  icon: 'fa-book-open',              render: renderContabilidad },

  // Administración
  aprobaciones:    { title: 'Aprobaciones',                  icon: 'fa-check-double',           render: renderAprobaciones },
  reportes:        { title: 'Reportes',                      icon: 'fa-chart-bar',              render: renderReportes },
  usuarios:        { title: 'Usuarios',                      icon: 'fa-users',                  render: renderUsuarios },
  ajustes:         { title: 'Ajustes del Sistema',           icon: 'fa-cog',                    render: renderAjustes },
};

function navigate(module) {
  const mod = MODULES[module];
  if (!mod) return;

  // Update active nav
  document.querySelectorAll('#sidebar-nav .nav-item').forEach(li => {
    li.classList.toggle('active', li.dataset.module === module);
  });

  // Update breadcrumb
  document.getElementById('breadcrumb').innerHTML =
    `<i class="fas ${mod.icon}"></i><span>${mod.title}</span>`;

  // Render
  window.APP_STATE.currentModule = module;
  const content = document.getElementById('content');
  content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:var(--text-muted)"></i></div>';

  // Small timeout to let spinner show
  setTimeout(() => {
    try {
      mod.render();
    } catch (e) {
      content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar módulo: ${e.message}</p></div>`;
      console.error(e);
    }
  }, 60);
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  // Force seed if empty
  DB.get();

  // Populate project selector
  populateProjectSelector();

  // Navigate to dashboard
  navigate('dashboard');
});
