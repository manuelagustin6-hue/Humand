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
function renderCuentasProv() {
  _renderStub('fa-building-columns', 'Cuentas Corrientes Proveedores',
    'Gestión de saldos, movimientos y estados de cuenta de proveedores',
    [
      'Saldo actual por proveedor',
      'Historial de movimientos y comprobantes',
      'Facturas pendientes de pago',
      'Conciliación automática con órdenes de pago',
      'Antigüedad de saldos y reportes'
    ]
  );
}

// ---- CLIENTES ----
function renderCuentasCli() {
  _renderStub('fa-users-between-lines', 'Cuentas Corrientes Clientes',
    'Gestión de saldos, créditos y estados de cuenta por cliente',
    [
      'Saldo actual por cliente / contrato',
      'Historial de facturación y cobranzas',
      'Facturas pendientes de cobro',
      'Límites de crédito y alertas',
      'Antigüedad de saldos exportable'
    ]
  );
}

function renderCashflowCli() {
  _renderStub('fa-money-bill-trend-up', 'Cash Flow Clientes',
    'Proyección de ingresos y flujo de caja por cliente y proyecto',
    [
      'Flujo de caja proyectado por período',
      'Ingresos esperados por certificación',
      'Análisis de cobros vencidos y próximos',
      'Comparativo presupuestado vs. real',
      'Exportación a Excel / PDF'
    ]
  );
}

// ---- COMERCIAL ----
function renderLeads() {
  _renderStub('fa-handshake', 'Leads Comerciales',
    'Gestión de oportunidades y prospección de nuevos proyectos',
    [
      'Pipeline de oportunidades por etapa',
      'Seguimiento de contactos y reuniones',
      'Probabilidad de cierre y valor estimado',
      'Conversión de lead a proyecto',
      'KPIs y métricas comerciales'
    ]
  );
}

function renderUnidades() {
  _renderStub('fa-house-chimney', 'Detalle de Unidades',
    'Gestión de unidades funcionales por proyecto inmobiliario',
    [
      'Plano de unidades con estado de disponibilidad',
      'Precios de lista y valores actualizados',
      'Reservas, señas y contratos de venta',
      'Avance de obra por unidad funcional',
      'Comisiones y gestión de ventas'
    ]
  );
}

// ---- CONTABILIDAD: WRAPPERS DE TABS ----
function _contaTab(tabId) {
  renderContabilidad();
  setTimeout(function() {
    var btn = document.querySelector('#conta-tabs .tab-btn[data-tab="' + tabId + '"]');
    if (btn) btn.click();
  }, 120);
}
function renderContaDiario()     { _contaTab('tab-diario'); }
function renderContaSumas()      { _contaTab('tab-sumas-conta'); }
function renderContaBalance()    { _contaTab('tab-balance'); }
function renderContaResultados() { _contaTab('tab-resultados'); }
function renderContaPlan()       { _contaTab('tab-cuentas'); }
// renderContaMayores is defined in contabilidad.js (full implementation)

// ---- TESORERÍA ----
function renderCheques() {
  _renderStub('fa-money-check', 'Cheques',
    'Gestión de cheques propios y de terceros',
    [
      'Cartera de cheques recibidos de clientes',
      'Cheques emitidos a proveedores',
      'Estados: en cartera / depositado / endosado / rechazado',
      'Vencimientos próximos con alertas',
      'Conciliación bancaria automática'
    ]
  );
}

function renderCuentasBanco() {
  _renderStub('fa-landmark', 'Cuentas Bancarias y Cajas',
    'Administración de fondos: cuentas bancarias y cajas',
    [
      'Saldo actualizado por cuenta bancaria',
      'Fondos en caja chica por sucursal / proyecto',
      'Movimientos de entrada y salida',
      'Conciliación con extractos bancarios',
      'Transferencias entre cuentas propias'
    ]
  );
}

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
