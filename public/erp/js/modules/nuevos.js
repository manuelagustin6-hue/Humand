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

// ---- COMPRAS: WRAPPERS DE TABS ----
function renderPedidos() {
  renderCompras();
  setTimeout(function() {
    var btn = document.querySelector('#compras-tabs .tab-btn[data-tab="tab-pedidos"]');
    if (btn) btn.click();
  }, 80);
}

function renderOrdenesCompra() {
  renderCompras();
  setTimeout(function() {
    var btn = document.querySelector('#compras-tabs .tab-btn[data-tab="tab-oc"]');
    if (btn) btn.click();
  }, 80);
}

function renderDocumentosProv() {
  renderCompras();
  setTimeout(function() {
    var btn = document.querySelector('#compras-tabs .tab-btn[data-tab="tab-fact-prov"]');
    if (btn) btn.click();
  }, 80);
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
