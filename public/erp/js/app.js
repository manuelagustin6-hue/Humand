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
  tesoreria:    { title: 'Tesorería',               icon: 'fa-landmark',              render: renderTesoreria },
  contabilidad: { title: 'Contabilidad',            icon: 'fa-book-open',             render: renderContabilidad },
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
