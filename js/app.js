/* ===== APP CORE / ROUTER ===== */

window.APP_STATE = { currentModule: 'dashboard', activeProject: '' };

const MODULES = {
  dashboard:    { title: 'Dashboard',               icon: 'fa-chart-pie',            render: renderDashboard },
  projects:     { title: 'Proyectos',               icon: 'fa-building',             render: renderProjects },
  compras:      { title: 'Compras',                 icon: 'fa-shopping-cart',         render: renderCompras },
  presupuesto:  { title: 'Cómputo y Presupuesto',  icon: 'fa-calculator',            render: renderPresupuesto },
  seguimiento:  { title: 'Seguimiento Presupuesto', icon: 'fa-chart-line',            render: renderSeguimiento },
  gantt:        { title: 'Cronograma Gantt',        icon: 'fa-stream',               render: renderGantt },
  facturacion:  { title: 'Facturación',             icon: 'fa-file-invoice-dollar',   render: renderFacturacion },
  cobranzas:    { title: 'Cobranzas',               icon: 'fa-hand-holding-dollar',   render: renderCobranzas },
  tesoreria:      { title: 'Tesorería',              icon: 'fa-landmark',              render: renderTesoreria },
  contabilidad:   { title: 'Contabilidad',           icon: 'fa-book-open',             render: renderContabilidad },
  rubros:         { title: 'Rubros de Obra',         icon: 'fa-list-ol',               render: renderRubros },
  contratos:       { title: 'Contratos',              icon: 'fa-file-contract',         render: renderContratos },
  certificaciones:{ title: 'Certificaciones',        icon: 'fa-certificate',           render: renderCertificaciones },
  ordenes_pago:   { title: 'Órdenes de Pago',        icon: 'fa-file-invoice',          render: renderOrdenesPago },
  retenciones:    { title: 'Retenciones',            icon: 'fa-percentage',            render: renderRetenciones },
  indices:        { title: 'Índices de Ajuste',      icon: 'fa-chart-line',            render: renderIndices },
  reportes:       { title: 'Reportes',               icon: 'fa-chart-bar',             render: renderReportes },
  usuarios:       { title: 'Usuarios',               icon: 'fa-users',                 render: renderUsuarios },
  ajustes:        { title: 'Ajustes del Sistema',    icon: 'fa-cog',                   render: renderAjustes },
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
