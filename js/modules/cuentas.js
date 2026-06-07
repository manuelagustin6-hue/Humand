/* ===== CUENTAS CORRIENTES: PROVEEDORES Y CLIENTES ===== */

// =====================================================================
// CUENTAS CORRIENTES PROVEEDORES
// Collections: suppliers, purchaseOrders, paymentOrders
// =====================================================================

var _cprovState = { selectedSupplier: null };

function renderCuentasProv() {
  var suppliers = DB.getAll('suppliers');
  var paymentOrders = DB.getAll('paymentOrders');
  var purchaseOrders = DB.getAll('purchaseOrders');

  // Build summary per supplier
  var rows = '';
  var totalCompras = 0;
  var totalPagos = 0;

  suppliers.forEach(function(s) {
    var compras = purchaseOrders
      .filter(function(po) { return po.supplier_id === s.id && po.status !== 'draft'; })
      .reduce(function(sum, po) { return sum + (po.total || 0); }, 0);

    var pagos = paymentOrders
      .filter(function(op) { return op.supplier_id === s.id; })
      .reduce(function(sum, op) { return sum + (op.net_amount || 0); }, 0);

    var saldo = compras - pagos;
    totalCompras += compras;
    totalPagos += pagos;

    var saldoBadge = saldo > 0
      ? '<span class="badge badge-red">' + fmtMoney(saldo) + '</span>'
      : (saldo < 0
        ? '<span class="badge badge-yellow">' + fmtMoney(saldo) + '</span>'
        : '<span class="badge badge-green">Saldado</span>');

    var catArr = Array.isArray(s.category) ? s.category : (s.category ? [s.category] : []);
    var catHtml = catArr.map(function(c) {
      return '<span class="badge badge-gray" style="font-size:10px">' + c + '</span>';
    }).join(' ');

    rows +=
      '<tr>' +
        '<td>' +
          '<strong>' + s.name + '</strong>' +
          '<div style="font-size:11px;color:var(--text-muted)">' + (s.cuit || '') + '</div>' +
        '</td>' +
        '<td>' + catHtml + '</td>' +
        '<td class="number-cell">' + fmtMoney(compras) + '</td>' +
        '<td class="number-cell">' + fmtMoney(pagos) + '</td>' +
        '<td class="number-cell">' + saldoBadge + '</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-secondary" onclick="cprovShowMovements(\'' + s.id + '\')">' +
            '<i class="fas fa-list"></i> Movimientos' +
          '</button>' +
        '</td>' +
      '</tr>';
  });

  if (!rows) {
    rows = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-building"></i><p>No hay proveedores registrados</p></div></td></tr>';
  }

  var totalSaldo = totalCompras - totalPagos;

  document.getElementById('content').innerHTML =
    '<div class="page-header">' +
      '<div>' +
        '<div class="page-title"><i class="fas fa-building-columns" style="margin-right:8px;color:var(--primary)"></i>Cuentas Corrientes Proveedores</div>' +
        '<div class="page-subtitle">Saldos, movimientos y estados de cuenta por proveedor</div>' +
      '</div>' +
    '</div>' +

    '<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">' +
      '<div class="stat-card">' +
        '<div class="stat-icon blue"><i class="fas fa-shopping-cart"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalCompras) + '</div><div class="stat-label">Total Compras</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon green"><i class="fas fa-money-bill-wave"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalPagos) + '</div><div class="stat-label">Total Pagos</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon ' + (totalSaldo > 0 ? 'red' : 'green') + '"><i class="fas fa-scale-balanced"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalSaldo) + '</div><div class="stat-label">Saldo a Pagar</div></div>' +
      '</div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="card-body" style="padding:0">' +
        '<div class="table-wrap">' +
          '<table>' +
            '<thead><tr>' +
              '<th>Proveedor</th>' +
              '<th>Categoria</th>' +
              '<th class="text-right">Compras (OC)</th>' +
              '<th class="text-right">Pagos (OP)</th>' +
              '<th class="text-right">Saldo</th>' +
              '<th>Acciones</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div id="cprov-movements-panel" style="margin-top:20px"></div>';
}

function cprovShowMovements(supplierId) {
  var suppliers = DB.getAll('suppliers');
  var paymentOrders = DB.getAll('paymentOrders');
  var purchaseOrders = DB.getAll('purchaseOrders');
  var projects = DB.getAll('projects');

  var supplier = suppliers.find(function(s) { return s.id === supplierId; });
  if (!supplier) return;

  // Build movements list (purchases and payments)
  var movements = [];

  purchaseOrders
    .filter(function(po) { return po.supplier_id === supplierId && po.status !== 'draft'; })
    .forEach(function(po) {
      var proj = projects.find(function(p) { return p.id === po.project_id; });
      movements.push({
        date: po.date,
        type: 'compra',
        ref: po.number,
        concept: 'Orden de Compra' + (proj ? ' - ' + proj.name : ''),
        debit: po.total || 0,
        credit: 0,
      });
    });

  paymentOrders
    .filter(function(op) { return op.supplier_id === supplierId; })
    .forEach(function(op) {
      var proj = projects.find(function(p) { return p.id === op.project_id; });
      movements.push({
        date: op.date,
        type: 'pago',
        ref: op.number,
        concept: op.concept || ('Orden de Pago' + (proj ? ' - ' + proj.name : '')),
        debit: 0,
        credit: op.net_amount || 0,
      });
    });

  movements.sort(function(a, b) { return a.date.localeCompare(b.date); });

  var balance = 0;
  var rows = '';
  movements.forEach(function(m) {
    balance += m.debit - m.credit;
    var typeBadge = m.type === 'compra'
      ? '<span class="badge badge-blue">Compra</span>'
      : '<span class="badge badge-green">Pago</span>';
    rows +=
      '<tr>' +
        '<td>' + fmtDate(m.date) + '</td>' +
        '<td>' + typeBadge + '</td>' +
        '<td>' + m.ref + '</td>' +
        '<td>' + m.concept + '</td>' +
        '<td class="number-cell">' + (m.debit ? fmtMoney(m.debit) : '-') + '</td>' +
        '<td class="number-cell">' + (m.credit ? fmtMoney(m.credit) : '-') + '</td>' +
        '<td class="number-cell"><strong>' + fmtMoney(balance) + '</strong></td>' +
      '</tr>';
  });

  if (!rows) {
    rows = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-list"></i><p>Sin movimientos</p></div></td></tr>';
  }

  var panel = document.getElementById('cprov-movements-panel');
  if (!panel) return;

  panel.innerHTML =
    '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border)">' +
        '<strong style="font-size:15px">Movimientos: ' + supplier.name + '</strong>' +
        '<button class="btn btn-sm btn-secondary" onclick="document.getElementById(\'cprov-movements-panel\').innerHTML=\'\'">Cerrar</button>' +
      '</div>' +
      '<div class="card-body" style="padding:0">' +
        '<div class="table-wrap">' +
          '<table>' +
            '<thead><tr>' +
              '<th>Fecha</th><th>Tipo</th><th>Ref.</th><th>Concepto</th>' +
              '<th class="text-right">Debe</th><th class="text-right">Haber</th><th class="text-right">Saldo</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>';
}

// =====================================================================
// CUENTAS CORRIENTES CLIENTES
// Collections: invoices, collections, projects
// =====================================================================

function renderCuentasCli() {
  var invoices = DB.getAll('invoices');
  var collections = DB.getAll('collections');
  var projects = DB.getAll('projects');

  // Group by client name
  var clientMap = {};
  invoices.forEach(function(inv) {
    var key = inv.client_name || 'Sin cliente';
    if (!clientMap[key]) {
      clientMap[key] = { name: key, cuit: inv.client_cuit || '', invoices: [], collections: [] };
    }
    clientMap[key].invoices.push(inv);
  });

  // Match collections to clients via invoice
  collections.forEach(function(col) {
    var inv = invoices.find(function(i) { return i.id === col.invoice_id; });
    if (inv) {
      var key = inv.client_name || 'Sin cliente';
      if (clientMap[key]) {
        clientMap[key].collections.push(col);
      }
    }
  });

  var totalFacturado = 0;
  var totalCobrado = 0;
  var rows = '';

  Object.keys(clientMap).forEach(function(key) {
    var cl = clientMap[key];
    var facturado = cl.invoices.reduce(function(s, i) { return s + (i.total || 0); }, 0);
    var cobrado = cl.collections.reduce(function(s, c) { return s + (c.amount || 0); }, 0);
    var saldo = facturado - cobrado;
    totalFacturado += facturado;
    totalCobrado += cobrado;

    var overdueCount = cl.invoices.filter(function(i) { return i.status === 'overdue'; }).length;
    var pendingCount = cl.invoices.filter(function(i) { return i.status === 'sent'; }).length;

    var saldoBadge = saldo > 0
      ? '<span class="badge badge-' + (overdueCount > 0 ? 'red' : 'yellow') + '">' + fmtMoney(saldo) + '</span>'
      : '<span class="badge badge-green">Al dia</span>';

    // Find project names
    var projNames = [];
    cl.invoices.forEach(function(inv) {
      var proj = projects.find(function(p) { return p.id === inv.project_id; });
      if (proj && projNames.indexOf(proj.name) < 0) projNames.push(proj.name);
    });

    rows +=
      '<tr>' +
        '<td>' +
          '<strong>' + cl.name + '</strong>' +
          '<div style="font-size:11px;color:var(--text-muted)">' + cl.cuit + '</div>' +
        '</td>' +
        '<td style="font-size:11px;color:var(--text-muted)">' + projNames.join(', ') + '</td>' +
        '<td class="number-cell">' + fmtMoney(facturado) + '</td>' +
        '<td class="number-cell">' + fmtMoney(cobrado) + '</td>' +
        '<td class="number-cell">' + saldoBadge + '</td>' +
        '<td>' +
          (overdueCount > 0 ? '<span class="badge badge-red" style="margin-right:4px">' + overdueCount + ' vencidas</span>' : '') +
          (pendingCount > 0 ? '<span class="badge badge-yellow">' + pendingCount + ' pendientes</span>' : '') +
          (overdueCount === 0 && pendingCount === 0 ? '<span class="badge badge-green">OK</span>' : '') +
        '</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-secondary" onclick="ccliShowMovements(\'' + encodeURIComponent(key) + '\')">' +
            '<i class="fas fa-list"></i> Movimientos' +
          '</button>' +
        '</td>' +
      '</tr>';
  });

  if (!rows) {
    rows = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-users"></i><p>No hay clientes con movimientos</p></div></td></tr>';
  }

  var totalSaldo = totalFacturado - totalCobrado;

  document.getElementById('content').innerHTML =
    '<div class="page-header">' +
      '<div>' +
        '<div class="page-title"><i class="fas fa-users-between-lines" style="margin-right:8px;color:var(--primary)"></i>Cuentas Corrientes Clientes</div>' +
        '<div class="page-subtitle">Saldos, facturacion y cobranzas por cliente</div>' +
      '</div>' +
    '</div>' +

    '<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">' +
      '<div class="stat-card">' +
        '<div class="stat-icon blue"><i class="fas fa-file-invoice-dollar"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalFacturado) + '</div><div class="stat-label">Total Facturado</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon green"><i class="fas fa-hand-holding-dollar"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalCobrado) + '</div><div class="stat-label">Total Cobrado</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon ' + (totalSaldo > 0 ? 'yellow' : 'green') + '"><i class="fas fa-scale-balanced"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalSaldo) + '</div><div class="stat-label">Saldo a Cobrar</div></div>' +
      '</div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="card-body" style="padding:0">' +
        '<div class="table-wrap">' +
          '<table>' +
            '<thead><tr>' +
              '<th>Cliente</th>' +
              '<th>Proyectos</th>' +
              '<th class="text-right">Facturado</th>' +
              '<th class="text-right">Cobrado</th>' +
              '<th class="text-right">Saldo</th>' +
              '<th>Estado</th>' +
              '<th>Acciones</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div id="ccli-movements-panel" style="margin-top:20px"></div>';
}

function ccliShowMovements(encodedClientName) {
  var clientName = decodeURIComponent(encodedClientName);
  var invoices = DB.getAll('invoices');
  var collections = DB.getAll('collections');

  var clientInvoices = invoices.filter(function(i) {
    return (i.client_name || 'Sin cliente') === clientName;
  });

  var movements = [];

  clientInvoices.forEach(function(inv) {
    var statusColors = { draft: 'badge-gray', sent: 'badge-yellow', paid: 'badge-green', overdue: 'badge-red', cancelled: 'badge-gray' };
    var statusLabels = { draft: 'Borrador', sent: 'Enviada', paid: 'Cobrada', overdue: 'Vencida', cancelled: 'Cancelada' };
    movements.push({
      date: inv.date,
      type: 'factura',
      ref: inv.number,
      concept: 'Factura' + (inv.notes ? ' - ' + inv.notes : ''),
      debit: inv.total || 0,
      credit: 0,
      badge: '<span class="badge ' + (statusColors[inv.status] || 'badge-gray') + '">' + (statusLabels[inv.status] || inv.status) + '</span>',
    });
  });

  // Get collections for these invoices
  var invIds = clientInvoices.map(function(i) { return i.id; });
  collections.filter(function(c) { return invIds.indexOf(c.invoice_id) >= 0; }).forEach(function(col) {
    var inv = clientInvoices.find(function(i) { return i.id === col.invoice_id; });
    movements.push({
      date: col.date,
      type: 'cobro',
      ref: col.reference || '-',
      concept: 'Cobro' + (inv ? ' - ' + inv.number : '') + (col.notes ? ' (' + col.notes + ')' : ''),
      debit: 0,
      credit: col.amount || 0,
      badge: '<span class="badge badge-green">Cobro</span>',
    });
  });

  movements.sort(function(a, b) { return a.date.localeCompare(b.date); });

  var balance = 0;
  var rows = '';
  movements.forEach(function(m) {
    balance += m.debit - m.credit;
    rows +=
      '<tr>' +
        '<td>' + fmtDate(m.date) + '</td>' +
        '<td>' + m.badge + '</td>' +
        '<td>' + m.ref + '</td>' +
        '<td>' + m.concept + '</td>' +
        '<td class="number-cell">' + (m.debit ? fmtMoney(m.debit) : '-') + '</td>' +
        '<td class="number-cell">' + (m.credit ? fmtMoney(m.credit) : '-') + '</td>' +
        '<td class="number-cell"><strong>' + fmtMoney(balance) + '</strong></td>' +
      '</tr>';
  });

  if (!rows) {
    rows = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-list"></i><p>Sin movimientos</p></div></td></tr>';
  }

  var panel = document.getElementById('ccli-movements-panel');
  if (!panel) return;

  panel.innerHTML =
    '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border)">' +
        '<strong style="font-size:15px">Movimientos: ' + clientName + '</strong>' +
        '<button class="btn btn-sm btn-secondary" onclick="document.getElementById(\'ccli-movements-panel\').innerHTML=\'\'">Cerrar</button>' +
      '</div>' +
      '<div class="card-body" style="padding:0">' +
        '<div class="table-wrap">' +
          '<table>' +
            '<thead><tr>' +
              '<th>Fecha</th><th>Tipo</th><th>Ref.</th><th>Concepto</th>' +
              '<th class="text-right">Debe</th><th class="text-right">Haber</th><th class="text-right">Saldo</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>';
}

// =====================================================================
// CASH FLOW CLIENTES
// Collections: invoices, collections, cashflowProjections
// =====================================================================

function renderCashflowCli() {
  var invoices = DB.getAll('invoices');
  var collections = DB.getAll('collections');
  var projections = DB.getAll('cashflowProjections');
  var projects = DB.getAll('projects');

  // Build month buckets
  var monthMap = {};

  function getMonthKey(dateStr) {
    if (!dateStr) return 'Sin fecha';
    return dateStr.substring(0, 7); // YYYY-MM
  }

  function ensureMonth(key) {
    if (!monthMap[key]) {
      monthMap[key] = { key: key, facturado: 0, cobrado: 0, proyectado: 0 };
    }
  }

  // Pending/overdue invoices -> proyectado
  invoices.forEach(function(inv) {
    if (inv.status === 'sent' || inv.status === 'overdue') {
      var mk = getMonthKey(inv.due_date || inv.date);
      ensureMonth(mk);
      monthMap[mk].facturado += inv.total || 0;
    }
  });

  // Collections -> cobrado
  collections.forEach(function(col) {
    var mk = getMonthKey(col.date);
    ensureMonth(mk);
    monthMap[mk].cobrado += col.amount || 0;
  });

  // Cashflow projections income -> proyectado
  projections.filter(function(p) { return p.type === 'income'; }).forEach(function(p) {
    var mk = getMonthKey(p.expected_date);
    ensureMonth(mk);
    monthMap[mk].proyectado += (p.amount || 0) * ((p.probability || 100) / 100);
  });

  var months = Object.keys(monthMap).sort();

  var monthNames = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
  };

  function fmtMonth(mk) {
    var parts = mk.split('-');
    return (monthNames[parts[1]] || parts[1]) + ' ' + parts[0];
  }

  var rows = '';
  var acumCobrado = 0;
  months.forEach(function(mk) {
    var m = monthMap[mk];
    acumCobrado += m.cobrado;
    var pctBadge = m.facturado > 0
      ? '<span class="badge badge-' + (m.cobrado >= m.facturado ? 'green' : 'yellow') + '">' +
          Math.round((m.cobrado / m.facturado) * 100) + '%</span>'
      : '-';

    rows +=
      '<tr>' +
        '<td><strong>' + fmtMonth(mk) + '</strong></td>' +
        '<td class="number-cell">' + (m.facturado ? fmtMoney(m.facturado) : '-') + '</td>' +
        '<td class="number-cell">' + (m.cobrado ? fmtMoney(m.cobrado) : '-') + '</td>' +
        '<td class="number-cell">' + (m.proyectado ? fmtMoney(m.proyectado) : '-') + '</td>' +
        '<td class="number-cell">' + pctBadge + '</td>' +
        '<td class="number-cell"><strong>' + fmtMoney(acumCobrado) + '</strong></td>' +
      '</tr>';
  });

  if (!rows) {
    rows = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-chart-line"></i><p>Sin datos de cashflow</p></div></td></tr>';
  }

  // Summary stats
  var totalPendiente = invoices
    .filter(function(i) { return i.status === 'sent' || i.status === 'overdue'; })
    .reduce(function(s, i) { return s + (i.total || 0); }, 0);
  var totalCobrado = collections.reduce(function(s, c) { return s + (c.amount || 0); }, 0);
  var totalProyectado = projections
    .filter(function(p) { return p.type === 'income'; })
    .reduce(function(s, p) { return s + ((p.amount || 0) * ((p.probability || 100) / 100)); }, 0);

  // Projections detail table
  var projRows = '';
  projections.filter(function(p) { return p.type === 'income'; }).forEach(function(p) {
    var proj = projects.find(function(pr) { return pr.id === p.project_id; });
    projRows +=
      '<tr>' +
        '<td>' + fmtDate(p.expected_date) + '</td>' +
        '<td>' + (proj ? proj.name : '-') + '</td>' +
        '<td>' + (p.description || '-') + '</td>' +
        '<td class="number-cell">' + fmtMoney(p.amount || 0) + '</td>' +
        '<td class="number-cell">' +
          '<span class="badge badge-' + ((p.probability || 0) >= 80 ? 'green' : 'yellow') + '">' +
            (p.probability || 0) + '%' +
          '</span>' +
        '</td>' +
        '<td class="number-cell">' + fmtMoney((p.amount || 0) * ((p.probability || 100) / 100)) + '</td>' +
      '</tr>';
  });
  if (!projRows) {
    projRows = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-calendar"></i><p>Sin proyecciones</p></div></td></tr>';
  }

  document.getElementById('content').innerHTML =
    '<div class="page-header">' +
      '<div>' +
        '<div class="page-title"><i class="fas fa-money-bill-trend-up" style="margin-right:8px;color:var(--primary)"></i>Cash Flow Clientes</div>' +
        '<div class="page-subtitle">Proyeccion de ingresos y flujo de caja por cliente y proyecto</div>' +
      '</div>' +
    '</div>' +

    '<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">' +
      '<div class="stat-card">' +
        '<div class="stat-icon yellow"><i class="fas fa-clock"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalPendiente) + '</div><div class="stat-label">Por Cobrar (pendiente/vencido)</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon green"><i class="fas fa-check-circle"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalCobrado) + '</div><div class="stat-label">Cobrado Historico</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon blue"><i class="fas fa-chart-line"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalProyectado) + '</div><div class="stat-label">Proyectado Ajustado</div></div>' +
      '</div>' +
    '</div>' +

    '<div id="cf-tabs" class="tabs-container">' +
      '<div class="tabs-header">' +
        '<button class="tab-btn active" data-tab="tab-cf-resumen" onclick="cfSetTab(\'resumen\')">Resumen por Mes</button>' +
        '<button class="tab-btn" data-tab="tab-cf-proyecciones" onclick="cfSetTab(\'proyecciones\')">Proyecciones</button>' +
      '</div>' +
      '<div id="tab-cf-resumen" class="tab-content active">' +
        '<div class="card">' +
          '<div class="card-body" style="padding:0">' +
            '<div class="table-wrap">' +
              '<table>' +
                '<thead><tr>' +
                  '<th>Mes</th>' +
                  '<th class="text-right">Facturado Pendiente</th>' +
                  '<th class="text-right">Cobrado</th>' +
                  '<th class="text-right">Proyectado</th>' +
                  '<th class="text-right">% Cobrado</th>' +
                  '<th class="text-right">Cobrado Acumulado</th>' +
                '</tr></thead>' +
                '<tbody>' + rows + '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div id="tab-cf-proyecciones" class="tab-content">' +
        '<div class="card">' +
          '<div class="card-body" style="padding:0">' +
            '<div class="table-wrap">' +
              '<table>' +
                '<thead><tr>' +
                  '<th>Fecha Esperada</th><th>Proyecto</th><th>Descripcion</th>' +
                  '<th class="text-right">Monto</th><th class="text-right">Probabilidad</th><th class="text-right">Monto Ajustado</th>' +
                '</tr></thead>' +
                '<tbody>' + projRows + '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function cfSetTab(tab) {
  var tabs = ['resumen', 'proyecciones'];
  tabs.forEach(function(t) {
    var btn = document.querySelector('[data-tab="tab-cf-' + t + '"]');
    var panel = document.getElementById('tab-cf-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
    if (panel) panel.classList.toggle('active', t === tab);
  });
}
