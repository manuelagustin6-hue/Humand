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
// CUENTAS CORRIENTES CLIENTES (COMPRADORES INMOBILIARIOS)
// Collections: ventasUnidades, cobrosVentas, unidades, projects
// =====================================================================

var _ccliSelectedId = null;

function renderCuentasCli() {
  _ccliSelectedId = null;
  var ventas = DB.getAll('ventasUnidades');
  var cobros = DB.getAll('cobrosVentas');
  var units  = DB.getAll('unidades');
  var projects = DB.getAll('projects');

  var totalVendido = 0, totalCobrado = 0;
  var rows = '';
  var today = todayStr();

  ventas.forEach(function(v) {
    var unit = units.find(function(u) { return u.id === v.unit_id; });
    var proj = unit ? projects.find(function(p) { return p.id === unit.project_id; }) : null;
    var ventaCobros = cobros.filter(function(c) { return c.sale_id === v.id; });
    var cobrado = ventaCobros.reduce(function(s, c) { return s + (c.amount || 0); }, 0);
    var saldo = (v.sale_price || 0) - cobrado;
    totalVendido += v.sale_price || 0;
    totalCobrado += cobrado;

    var insts = v.installments || [];
    var vencidas = insts.filter(function(i) { return i.status !== 'paid' && i.due_date < today; }).length;
    var proximas = insts.filter(function(i) { return i.status !== 'paid' && i.due_date >= today; }).length;

    var stBadge = saldo <= 0
      ? '<span class="badge badge-green">Saldado</span>'
      : (vencidas > 0
          ? '<span class="badge badge-red">' + vencidas + ' vencida' + (vencidas > 1 ? 's' : '') + '</span>'
          : '<span class="badge badge-yellow">' + proximas + ' pendiente' + (proximas !== 1 ? 's' : '') + '</span>');

    var isSelected = _ccliSelectedId === v.id;
    rows +=
      '<tr style="cursor:pointer;' + (isSelected ? 'background:var(--primary-light,rgba(59,130,246,0.06))' : '') + '" onclick="ccliSelectRow(\'' + v.id + '\')">' +
        '<td><b>' + (v.buyer_name || '—') + '</b>' +
          '<div style="font-size:11px;color:var(--text-muted)">' + (v.buyer_doc_type || '') + ' ' + (v.buyer_doc || '') + '</div>' +
        '</td>' +
        '<td>' + (unit ? unit.number : '—') + '<div style="font-size:11px;color:var(--text-muted)">' + (proj ? proj.name : '') + '</div></td>' +
        '<td>' + fmtMoney(v.list_price || 0, v.currency) + '</td>' +
        '<td><b>' + fmtMoney(v.sale_price || 0, v.currency) + '</b></td>' +
        '<td style="color:var(--success)">' + fmtMoney(cobrado, v.currency) + '</td>' +
        '<td style="color:' + (saldo > 0 ? 'var(--danger)' : 'var(--success)') + '">' + fmtMoney(saldo, v.currency) + '</td>' +
        '<td>' + stBadge + '</td>' +
        '<td style="white-space:nowrap;">' +
          '<button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();ccliSelectRow(\'' + v.id + '\')">' +
            '<i class="fas fa-list-ol"></i>' +
          '</button>' +
        '</td>' +
      '</tr>';
  });

  if (!rows) {
    rows = '<tr><td colspan="8"><div class="empty-state" style="padding:40px"><i class="fas fa-users"></i><p>No hay cuentas corrientes. Crea una nueva.</p></div></td></tr>';
  }

  var totalSaldo = totalVendido - totalCobrado;

  document.getElementById('content').innerHTML =
    '<div class="page-header"><div>' +
      '<div class="page-title"><i class="fas fa-users-between-lines" style="margin-right:8px;color:var(--primary)"></i>Cuentas Corrientes Clientes</div>' +
      '<div class="page-subtitle">Ventas de unidades, condiciones de pago y cobranzas</div>' +
    '</div>' +
    '<button class="btn btn-primary" onclick="ccliNuevaCuenta()"><i class="fas fa-plus"></i> Nueva Cuenta Corriente</button>' +
    '</div>' +

    '<div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap;">' +
      '<div class="card" style="flex:1;min-width:130px;padding:16px;text-align:center;">' +
        '<div style="font-size:22px;font-weight:700;color:var(--primary)">' + ventas.length + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted)">Cuentas abiertas</div>' +
      '</div>' +
      '<div class="card" style="flex:1;min-width:130px;padding:16px;text-align:center;">' +
        '<div style="font-size:22px;font-weight:700;">' + fmtMoney(totalVendido) + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted)">Total vendido</div>' +
      '</div>' +
      '<div class="card" style="flex:1;min-width:130px;padding:16px;text-align:center;">' +
        '<div style="font-size:22px;font-weight:700;color:var(--success)">' + fmtMoney(totalCobrado) + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted)">Total cobrado</div>' +
      '</div>' +
      '<div class="card" style="flex:1;min-width:130px;padding:16px;text-align:center;">' +
        '<div style="font-size:22px;font-weight:700;color:' + (totalSaldo > 0 ? 'var(--danger)' : 'var(--success)') + '">' + fmtMoney(totalSaldo) + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted)">Saldo pendiente</div>' +
      '</div>' +
    '</div>' +

    '<div class="card" style="padding:0;">' +
      '<table class="table">' +
        '<thead><tr>' +
          '<th>Comprador</th><th>Unidad</th><th>Precio Lista</th><th>Precio Cerrado</th>' +
          '<th>Cobrado</th><th>Saldo</th><th>Estado</th><th></th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>' +
    '<div id="ccli-detail-panel" style="margin-top:20px"></div>';

  if (_ccliSelectedId) ccliRenderDetail(_ccliSelectedId);
}

function ccliSelectRow(saleId) {
  _ccliSelectedId = (_ccliSelectedId === saleId) ? null : saleId;
  renderCuentasCli();
}

function ccliRenderDetail(saleId) {
  var venta = DB.getById('ventasUnidades', saleId);
  if (!venta) return;
  var cobros = DB.getAll('cobrosVentas').filter(function(c) { return c.sale_id === saleId; });
  var unit = DB.getById('unidades', venta.unit_id);
  var today = todayStr();
  var insts = venta.installments || [];

  var totalCobrado = cobros.reduce(function(s, c) { return s + (c.amount || 0); }, 0);
  var saldo = (venta.sale_price || 0) - totalCobrado;

  var rows = insts.map(function(inst) {
    var cobro = cobros.find(function(c) { return c.installment_id === inst.id; });
    var isOverdue = inst.status !== 'paid' && inst.due_date < today;
    var stHtml = inst.status === 'paid'
      ? '<span class="badge badge-green">Pagado</span>'
      : (isOverdue ? '<span class="badge badge-red">Vencido</span>' : '<span class="badge badge-yellow">Pendiente</span>');
    return '<tr' + (isOverdue ? ' style="background:rgba(239,68,68,0.04)"' : '') + '>' +
      '<td>' + inst.number + '</td>' +
      '<td>' + (inst.concept || '') + '</td>' +
      '<td>' + fmtDate(inst.due_date) + '</td>' +
      '<td>' + fmtMoney(inst.amount, venta.currency) + '</td>' +
      '<td>' + stHtml + '</td>' +
      '<td>' + (cobro ? fmtDate(cobro.date) : '—') + '</td>' +
      '<td>' + (cobro ? fmtMoney(cobro.amount, venta.currency) : '—') + '</td>' +
      '<td>' +
        (inst.status !== 'paid'
          ? '<button class="btn btn-sm btn-primary" onclick="ccliRegistrarCobro(\'' + saleId + '\',\'' + inst.id + '\',' + inst.amount + ',\'' + (venta.currency || 'ARS') + '\')"><i class="fas fa-dollar-sign"></i> Cobrar</button>'
          : '') +
      '</td>' +
    '</tr>';
  }).join('');

  var panel = document.getElementById('ccli-detail-panel');
  if (!panel) return;
  panel.innerHTML =
    '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
        '<div>' +
          '<b style="font-size:15px;">' + (venta.buyer_name || '') + '</b>' +
          (unit ? '<span style="font-size:12px;color:var(--text-muted);margin-left:12px">Unidad ' + unit.number + '</span>' : '') +
          '<span style="font-size:12px;color:var(--text-muted);margin-left:12px">Contrato: ' + (venta.contract_number || '') + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:12px;font-size:13px;align-items:center;">' +
          '<span>Vendido: <b>' + fmtMoney(venta.sale_price, venta.currency) + '</b></span>' +
          '<span style="color:var(--success)">Cobrado: <b>' + fmtMoney(totalCobrado, venta.currency) + '</b></span>' +
          '<span style="color:' + (saldo > 0 ? 'var(--danger)' : 'var(--success)') + '">Saldo: <b>' + fmtMoney(saldo, venta.currency) + '</b></span>' +
          '<button class="btn btn-sm btn-secondary" onclick="_ccliSelectedId=null;document.getElementById(\'ccli-detail-panel\').innerHTML=\'\'">Cerrar</button>' +
        '</div>' +
      '</div>' +
      '<table class="table">' +
        '<thead><tr><th>#</th><th>Concepto</th><th>Vencimiento</th><th>Importe</th><th>Estado</th><th>F. Pago</th><th>Cobrado</th><th></th></tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">Sin cuotas</td></tr>') + '</tbody>' +
      '</table>' +
    '</div>';
}

function ccliNuevaCuenta() {
  var availableUnits = DB.getAll('unidades').filter(function(u) { return u.status === 'available'; });
  var projects = DB.getAll('projects');
  var currencies = DB.getAllCurrencies() || [];
  var today = todayStr();

  var unitOptions = '<option value="">— Seleccionar unidad —</option>' +
    availableUnits.map(function(u) {
      var proj = projects.find(function(p) { return p.id === u.project_id; });
      var desc = (proj ? proj.name + ' — ' : '') + 'Unidad ' + u.number;
      if (u.area) desc += ' (' + u.area + 'm2';
      if (u.rooms) desc += ', ' + u.rooms + ' amb';
      if (u.area || u.rooms) desc += ')';
      desc += ' | ' + fmtMoney(u.list_price, u.currency);
      return '<option value="' + u.id + '" data-price="' + (u.list_price || 0) + '" data-currency="' + (u.currency || 'USD') + '">' + desc + '</option>';
    }).join('');

  var body =
    '<div class="form-grid">' +
      '<div class="form-group" style="grid-column:1/-1">' +
        '<label>Unidad *</label>' +
        '<select id="ccli-unit" class="form-control" onchange="ccliOnUnitChange(this)">' + unitOptions + '</select>' +
      '</div>' +
      '<div class="form-group"><label>Precio de Lista</label>' +
        '<input type="number" id="ccli-list-price" class="form-control" readonly style="background:var(--bg-muted,#f9f9f9)"></div>' +
      '<div class="form-group"><label>Precio Cerrado *</label>' +
        '<input type="number" id="ccli-sale-price" class="form-control" placeholder="Precio negociado"></div>' +
      '<div class="form-group"><label>Moneda</label>' +
        '<select id="ccli-currency" class="form-control">' +
          currencies.map(function(c) { return '<option value="' + c.id + '"' + (c.id === 'USD' ? ' selected' : '') + '>' + c.id + '</option>'; }).join('') +
        '</select></div>' +
    '</div>' +
    '<hr style="margin:16px 0;border:none;border-top:1px solid var(--border)">' +
    '<b style="font-size:13px;">Datos del Comprador</b>' +
    '<div class="form-grid" style="margin-top:12px;">' +
      '<div class="form-group"><label>Nombre completo *</label>' +
        '<input type="text" id="ccli-buyer" class="form-control" placeholder="Nombre y apellido"></div>' +
      '<div class="form-group"><label>Tipo Doc.</label>' +
        '<select id="ccli-doctype" class="form-control"><option>DNI</option><option>CUIT</option><option>PASSPORT</option></select></div>' +
      '<div class="form-group"><label>N° Documento</label>' +
        '<input type="text" id="ccli-docnum" class="form-control"></div>' +
      '<div class="form-group"><label>Telefono</label>' +
        '<input type="text" id="ccli-phone" class="form-control"></div>' +
      '<div class="form-group"><label>Email</label>' +
        '<input type="email" id="ccli-email" class="form-control"></div>' +
      '<div class="form-group"><label>Fecha de venta</label>' +
        '<input type="date" id="ccli-date" class="form-control" value="' + today + '"></div>' +
    '</div>' +
    '<hr style="margin:16px 0;border:none;border-top:1px solid var(--border)">' +
    '<b style="font-size:13px;">Condiciones de Venta</b>' +
    '<div class="form-grid" style="margin-top:12px;">' +
      '<div class="form-group"><label>Forma de pago</label>' +
        '<select id="ccli-paytype" class="form-control" onchange="ccliToggleInstFields(this.value)">' +
          '<option value="cash">Contado</option>' +
          '<option value="mixed" selected>Seña + Cuotas</option>' +
          '<option value="installments">Plan de Cuotas</option>' +
        '</select></div>' +
    '</div>' +
    '<div id="ccli-inst-fields">' +
      '<div class="form-grid">' +
        '<div class="form-group"><label>Seña / Anticipo</label>' +
          '<input type="number" id="ccli-down" class="form-control" placeholder="0"></div>' +
        '<div class="form-group"><label>Fecha seña</label>' +
          '<input type="date" id="ccli-down-date" class="form-control" value="' + today + '"></div>' +
        '<div class="form-group"><label>Cantidad de cuotas</label>' +
          '<input type="number" id="ccli-n" class="form-control" placeholder="Ej: 24" min="1"></div>' +
        '<div class="form-group"><label>Primera cuota</label>' +
          '<input type="date" id="ccli-start" class="form-control" value="' + today + '"></div>' +
      '</div>' +
    '</div>' +
    '<div class="form-group" style="margin-top:12px;">' +
      '<label>Condiciones / Observaciones</label>' +
      '<textarea id="ccli-notes" class="form-control" rows="2" placeholder="Condiciones especiales, ajuste por indice, etc."></textarea>' +
    '</div>';

  openModal('Nueva Cuenta Corriente', body, 'modal-xl',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="ccliGuardarCuenta()"><i class="fas fa-save"></i> Crear Cuenta Corriente</button>'
  );

  setTimeout(function() { ccliToggleInstFields('mixed'); }, 50);
}

function ccliOnUnitChange(sel) {
  var opt = sel.options[sel.selectedIndex];
  var price = opt ? (parseFloat(opt.getAttribute('data-price')) || 0) : 0;
  var cur = opt ? (opt.getAttribute('data-currency') || 'USD') : 'USD';
  var lp = document.getElementById('ccli-list-price');
  var sp = document.getElementById('ccli-sale-price');
  var cu = document.getElementById('ccli-currency');
  if (lp) lp.value = price || '';
  if (sp && !sp.value) sp.value = price || '';
  if (cu && cur) cu.value = cur;
}

function ccliToggleInstFields(payType) {
  var el = document.getElementById('ccli-inst-fields');
  if (el) el.style.display = (payType === 'cash') ? 'none' : '';
}

function ccliGuardarCuenta() {
  var g = function(id) { return (document.getElementById(id) || {}).value || ''; };
  var unitId = g('ccli-unit');
  var buyerName = g('ccli-buyer').trim();
  var salePrice = parseFloat(g('ccli-sale-price')) || 0;
  var listPrice = parseFloat(g('ccli-list-price')) || 0;
  var saleDate = g('ccli-date');
  var payType = g('ccli-paytype') || 'cash';

  if (!unitId) { toast('Seleccione una unidad', 'error'); return; }
  if (!buyerName) { toast('Ingrese el nombre del comprador', 'error'); return; }
  if (!salePrice) { toast('Ingrese el precio cerrado', 'error'); return; }

  // Build installment schedule
  var installments = [];
  if (payType === 'cash') {
    installments = [{ id: uuid(), number: 1, concept: 'Pago contado', due_date: saleDate, amount: salePrice, status: 'pending' }];
  } else {
    var down = parseFloat(g('ccli-down')) || 0;
    var downDate = g('ccli-down-date') || saleDate;
    var n = parseInt(g('ccli-n')) || 1;
    var startDate = g('ccli-start') || saleDate;
    var remaining = salePrice - down;
    var installAmt = n > 0 ? Math.round(remaining / n) : remaining;
    if (down > 0) {
      installments.push({ id: uuid(), number: 0, concept: 'Seña / Anticipo', due_date: downDate, amount: down, status: 'pending' });
    }
    for (var i = 1; i <= n; i++) {
      var dDate = ccliAddMonths(startDate, i - 1);
      var amt = (i === n) ? (remaining - installAmt * (n - 1)) : installAmt;
      installments.push({ id: uuid(), number: i, concept: 'Cuota ' + i + '/' + n, due_date: dDate, amount: amt, status: 'pending' });
    }
  }

  var ventas = DB.getAll('ventasUnidades');
  var contratNum = 'CCC-' + new Date().getFullYear() + '-' + String(ventas.length + 1).padStart(3, '0');

  DB.insert('ventasUnidades', {
    unit_id: unitId,
    contract_number: contratNum,
    buyer_name: buyerName,
    buyer_doc_type: g('ccli-doctype'),
    buyer_doc: g('ccli-docnum'),
    buyer_phone: g('ccli-phone'),
    buyer_email: g('ccli-email'),
    sale_date: saleDate,
    currency: g('ccli-currency') || 'USD',
    list_price: listPrice,
    sale_price: salePrice,
    payment_type: payType,
    installments: installments,
    status: 'active',
    notes: g('ccli-notes'),
  });

  // Mark unit as sold
  DB.update('unidades', unitId, { status: 'sold' });

  closeModal();
  toast('Cuenta corriente creada. Unidad marcada como vendida.', 'success');
  renderCuentasCli();
}

function ccliRegistrarCobro(saleId, installmentId, amount, currency) {
  var currencies = DB.getAllCurrencies() || [];
  var body =
    '<div class="form-grid">' +
      '<div class="form-group"><label>Fecha *</label><input type="date" id="ccp-date" class="form-control" value="' + todayStr() + '"></div>' +
      '<div class="form-group"><label>Importe *</label><input type="number" id="ccp-amount" class="form-control" value="' + amount + '"></div>' +
      '<div class="form-group"><label>Moneda</label><select id="ccp-currency" class="form-control">' +
        currencies.map(function(c) { return '<option value="' + c.id + '"' + (c.id === currency ? ' selected' : '') + '>' + c.id + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="form-group"><label>Forma de cobro</label><select id="ccp-method" class="form-control">' +
        '<option value="transfer">Transferencia</option><option value="check">Cheque</option>' +
        '<option value="cash">Efectivo</option><option value="card">Tarjeta</option>' +
      '</select></div>' +
    '</div>' +
    '<div class="form-group"><label>Referencia</label><input type="text" id="ccp-ref" class="form-control"></div>' +
    '<div class="form-group"><label>Notas</label><textarea id="ccp-notes" class="form-control" rows="2"></textarea></div>';

  openModal('Registrar Cobro', body, 'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="ccliConfirmarCobro(\'' + saleId + '\',\'' + installmentId + '\')"><i class="fas fa-check"></i> Confirmar</button>'
  );
}

function ccliConfirmarCobro(saleId, installmentId) {
  var g = function(id) { return (document.getElementById(id) || {}).value || ''; };
  var cobDate = g('ccp-date');
  var cobAmt = parseFloat(g('ccp-amount')) || 0;
  if (!cobDate || !cobAmt) { toast('Complete fecha e importe', 'error'); return; }

  DB.insert('cobrosVentas', {
    sale_id: saleId, installment_id: installmentId,
    date: cobDate, amount: cobAmt,
    currency: g('ccp-currency'), method: g('ccp-method'),
    reference: g('ccp-ref'), notes: g('ccp-notes'),
  });

  // Mark installment as paid
  var venta = DB.getById('ventasUnidades', saleId);
  if (venta && venta.installments) {
    DB.update('ventasUnidades', saleId, {
      installments: venta.installments.map(function(i) {
        return i.id === installmentId ? Object.assign({}, i, { status: 'paid', paid_date: cobDate, paid_amount: cobAmt }) : i;
      })
    });
  }

  // Auto journal entry
  try { autoJournalEntry('cobro_cliente', cobAmt, cobDate, g('ccp-ref') || saleId.slice(0,8), 'Cobro cuota CCC'); } catch(e) {}

  // Check if all paid → complete
  var updated = DB.getById('ventasUnidades', saleId);
  if (updated && updated.installments && updated.installments.every(function(i) { return i.status === 'paid'; })) {
    DB.update('ventasUnidades', saleId, { status: 'completed' });
  }

  closeModal();
  _ccliSelectedId = saleId;
  toast('Cobro registrado', 'success');
  renderCuentasCli();
}

function ccliAddMonths(dateStr, months) {
  if (!dateStr) return dateStr;
  var d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
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
