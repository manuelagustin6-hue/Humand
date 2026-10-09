/* ===== REMITOS / RECEPCIÓN DE MERCADERÍA =====
 * Cierra el circuito de compras: Orden de Compra → Remito (recepción) → Stock,
 * y habilita la facturación del proveedor (la factura referencia la OC recibida).
 *
 * Al confirmar un remito, por cada ítem con material y almacén asignados se crea
 * un movimiento de ENTRADA en Stock (stockMovements), reutilizando el modelo del
 * módulo Stock. La OC pasa a estado "received" cuando se recibió todo.
 */

function _genRemitoNumber() {
  var all = DB.getAll('receipts');
  var yr = new Date().getFullYear();
  var seq = all.filter(function (r) { return (r.number || '').indexOf('REM-' + yr) === 0; }).length + 1;
  return 'REM-' + yr + '-' + String(seq).padStart(3, '0');
}

// Cantidad ya recibida por ítem de una OC (sumando remitos previos), por índice de ítem.
function _receivedForPo(poId, excludeReceiptId) {
  var map = {};
  DB.getAll('receipts').forEach(function (r) {
    if (r.po_id !== poId || r.id === excludeReceiptId) return;
    (r.items || []).forEach(function (it) {
      var k = it.oc_item_idx;
      map[k] = (map[k] || 0) + (Number(it.cantidad) || 0);
    });
  });
  return map;
}

/* ───────────────────────────────────────────── LIST VIEW */
function renderRemitos() {
  var receipts = DB.getAll('receipts');
  var pos = DB.getAll('purchaseOrders');
  var pendientes = pos.filter(function (p) { return p.status !== 'received' && p.status !== 'cancelled'; }).length;

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Remitos / Recepción</div>
    <div class="page-subtitle">Recepción de mercadería contra órdenes de compra, con ingreso a stock</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-primary" onclick="openRemitoForm()"><i class="fas fa-plus"></i> Nuevo Remito</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-truck-ramp-box"></i></div><div>
    <div class="stat-value">${receipts.length}</div><div class="stat-label">Remitos registrados</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-hourglass-half"></i></div><div>
    <div class="stat-value">${pendientes}</div><div class="stat-label">OC pendientes de recepción</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-boxes-stacking"></i></div><div>
    <div class="stat-value">${DB.getAll('stockMovements').filter(function(m){return m.ref_type==='remito';}).length}</div><div class="stat-label">Ingresos a stock por remito</div></div></div>
</div>

<div class="filter-bar">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar por número, OC o proveedor..." oninput="filterRemitos(this.value)">
  </div>
</div>

<div class="card"><div class="card-body" style="padding:0">
  <div class="table-wrap" id="remitos-table-wrap">${buildRemitosTable(receipts)}</div>
</div></div>`;

  document.getElementById('breadcrumb').innerHTML = '<i class="fas fa-truck-ramp-box"></i><span>Remitos / Recepción</span>';
  window._remitoListFilter = '';
}

function buildRemitosTable(receipts) {
  if (!receipts.length) {
    return '<div class="empty-state"><i class="fas fa-truck-ramp-box"></i><p>No hay remitos. Registrá la recepción de una orden de compra.</p></div>';
  }
  var suppliers = DB.getAll('suppliers');
  var pos = DB.getAll('purchaseOrders');
  var projects = DB.getAll('projects');
  return `<table><thead><tr>
    <th>Número</th><th>Fecha</th><th>OC</th><th>Proveedor</th><th>Proyecto</th><th class="text-right">Ítems</th><th>Acciones</th>
  </tr></thead>
  <tbody>
  ${receipts.slice().sort(function (a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); }).map(function (r) {
    var sup = suppliers.find(function (s) { return s.id === r.supplier_id; });
    var po = pos.find(function (p) { return p.id === r.po_id; });
    var proj = projects.find(function (p) { return p.id === r.project_id; });
    return `<tr>
      <td><strong>${escapeHtml(r.number || '-')}</strong></td>
      <td>${fmtDate(r.fecha)}</td>
      <td>${escapeHtml(po ? po.number : '-')}</td>
      <td>${escapeHtml(sup ? sup.name : '-')}</td>
      <td>${escapeHtml(proj ? proj.name : '-')}</td>
      <td class="number-cell text-right">${(r.items || []).length}</td>
      <td><div class="table-actions">
        <button class="btn-ghost btn btn-sm" onclick="viewRemito('${r.id}')"><i class="fas fa-eye"></i></button>
        <button class="btn-ghost btn btn-sm danger" onclick="deleteRemito('${r.id}')"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('')}
  </tbody></table>`;
}

function filterRemitos(q) {
  q = (q || '').toLowerCase();
  var receipts = DB.getAll('receipts');
  var suppliers = DB.getAll('suppliers');
  var pos = DB.getAll('purchaseOrders');
  if (q) receipts = receipts.filter(function (r) {
    var sup = suppliers.find(function (s) { return s.id === r.supplier_id; });
    var po = pos.find(function (p) { return p.id === r.po_id; });
    return (r.number || '').toLowerCase().indexOf(q) >= 0
      || (po && (po.number || '').toLowerCase().indexOf(q) >= 0)
      || (sup && sup.name.toLowerCase().indexOf(q) >= 0);
  });
  var wrap = document.getElementById('remitos-table-wrap');
  if (wrap) wrap.innerHTML = buildRemitosTable(receipts);
}

/* ───────────────────────────────────────────── FORM */
function openRemitoForm() {
  var pos = DB.getAll('purchaseOrders').filter(function (p) { return p.status !== 'cancelled'; });
  if (!pos.length) { toast('No hay órdenes de compra para recibir', 'warning'); return; }
  var warehouses = DB.getAll('stockWarehouses');
  window._remitoItems = [];
  window._remitoPo = null;

  openModal('Nuevo Remito / Recepción', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Número</label>
    <input class="form-control" id="rem-number" value="${escapeHtml(_genRemitoNumber())}">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha</label>
    <input class="form-control" id="rem-fecha" type="date" value="${todayStr()}">
  </div>
  <div class="form-group">
    <label class="form-label">Orden de Compra *</label>
    <select class="form-control" id="rem-po" onchange="remitoLoadOc(this.value)">
      <option value="">Seleccionar OC...</option>
      ${pos.map(function (p) {
        var sup = DB.getById('suppliers', p.supplier_id);
        return '<option value="' + p.id + '">' + escapeHtml((p.number || p.id) + (sup ? ' — ' + sup.name : '')) + '</option>';
      }).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Almacén destino</label>
    <select class="form-control" id="rem-warehouse">
      <option value="">Sin ingreso a stock</option>
      ${warehouses.map(function (w) { return '<option value="' + w.id + '">' + escapeHtml(w.name) + '</option>'; }).join('')}
    </select>
    ${warehouses.length ? '' : '<small style="color:var(--text-muted)">No hay almacenes: se registrará el remito sin movimiento de stock.</small>'}
  </div>
  <div class="form-group full">
    <label class="form-label">Notas</label>
    <input class="form-control" id="rem-notes" value="">
  </div>
</div>
<div class="divider"></div>
<strong style="font-size:13px">Ítems a recibir</strong>
<div id="rem-items" style="margin-top:8px"><p style="color:var(--text-muted);font-size:13px">Seleccioná una OC para cargar sus ítems.</p></div>
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveRemito()"><i class="fas fa-save"></i> Registrar recepción</button>
`);
}

function remitoLoadOc(poId) {
  var cont = document.getElementById('rem-items');
  if (!cont) return;
  var po = DB.getById('purchaseOrders', poId);
  window._remitoPo = po;
  if (!po) { cont.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Seleccioná una OC.</p>'; window._remitoItems = []; return; }

  var received = _receivedForPo(poId);
  var materials = DB.getAll('stockMaterials');
  window._remitoItems = (po.items || []).map(function (it, idx) {
    var prev = received[idx] || 0;
    var pendiente = Math.max(0, (Number(it.quantity) || 0) - prev);
    return { oc_item_idx: idx, description: it.description, unit: it.unit, unit_price: it.unit_price || 0, pendiente: pendiente, cantidad: pendiente, material_id: '' };
  });

  cont.innerHTML = `
    <div style="display:grid;grid-template-columns:2fr 70px 90px 1.4fr;gap:6px;font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px">
      <span>Ítem (pendiente)</span><span>Unidad</span><span>Recibir</span><span>Material de stock (opcional)</span>
    </div>
    ${window._remitoItems.map(function (ri, i) {
      return `<div style="display:grid;grid-template-columns:2fr 70px 90px 1.4fr;gap:6px;margin-bottom:6px;align-items:center">
        <span style="font-size:12px">${escapeHtml(ri.description || '-')} <span style="color:var(--text-muted)">(${fmtNum(ri.pendiente)})</span></span>
        <span style="font-size:12px;color:var(--text-muted)">${escapeHtml(ri.unit || '')}</span>
        <input class="form-control" style="font-size:12px" type="number" min="0" max="${ri.pendiente}" value="${ri.cantidad}" oninput="remitoUpdateItem(${i},'cantidad',+this.value)">
        <select class="form-control" style="font-size:12px" onchange="remitoUpdateItem(${i},'material_id',this.value)">
          <option value="">— sin stock —</option>
          ${materials.map(function (m) { return '<option value="' + m.id + '">' + escapeHtml(m.name || m.code || m.id) + '</option>'; }).join('')}
        </select>
      </div>`;
    }).join('')}
    ${materials.length ? '' : '<small style="color:var(--text-muted)">No hay materiales de stock cargados: se registra la recepción sin ingreso a inventario.</small>'}`;
}

function remitoUpdateItem(i, field, val) { var it = window._remitoItems[i]; if (it) it[field] = val; }

function saveRemito() {
  var po = window._remitoPo;
  if (!po) { toast('Seleccioná una orden de compra', 'error'); return; }
  var items = (window._remitoItems || []).filter(function (it) { return (Number(it.cantidad) || 0) > 0; });
  if (!items.length) { toast('Ingresá al menos una cantidad a recibir', 'error'); return; }
  // Guard: no recibir más que lo pendiente.
  var over = items.find(function (it) { return Number(it.cantidad) > it.pendiente; });
  if (over) { toast('No se puede recibir más que lo pendiente en "' + (over.description || '') + '"', 'error'); return; }

  var warehouseId = document.getElementById('rem-warehouse').value;
  var fecha = document.getElementById('rem-fecha').value || todayStr();

  var receipt = DB.insert('receipts', {
    number: (document.getElementById('rem-number').value || '').trim(),
    fecha: fecha,
    po_id: po.id,
    supplier_id: po.supplier_id,
    project_id: po.project_id,
    warehouse_id: warehouseId,
    notes: (document.getElementById('rem-notes').value || '').trim(),
    items: items.map(function (it) {
      return { oc_item_idx: it.oc_item_idx, description: it.description, unit: it.unit, cantidad: Number(it.cantidad), material_id: it.material_id || '' };
    }),
  });

  // Ingreso a stock: una ENTRADA por ítem con material + almacén.
  var movimientos = 0;
  if (warehouseId) {
    items.forEach(function (it) {
      if (!it.material_id) return;
      DB.insert('stockMovements', {
        date: fecha,
        type: 'entrada',
        material_id: it.material_id,
        warehouse_id: warehouseId,
        dest_warehouse_id: '',
        qty: Number(it.cantidad),
        unit_cost: Number(it.unit_price) || 0,
        ref_id: receipt.id,
        ref_type: 'remito',
        notes: 'Remito ' + (receipt.number || '') + ' — OC ' + (po.number || ''),
      });
      movimientos++;
    });
  }

  // Si se recibió todo lo de la OC, marcarla como recibida (habilita/limpia pendientes).
  var recvAll = _receivedForPo(po.id); // ya incluye este remito (receipts tiene el nuevo)
  var completa = (po.items || []).every(function (it, idx) { return (recvAll[idx] || 0) >= (Number(it.quantity) || 0); });
  if (completa && po.status !== 'received') { DB.update('purchaseOrders', po.id, { status: 'received' }); }

  toast('Recepción registrada' + (movimientos ? ' · ' + movimientos + ' ingreso(s) a stock' : ''), 'success');
  window._remitoItems = []; window._remitoPo = null;
  closeModal();
  renderRemitos();
}

function deleteRemito(id) {
  confirmDialog('¿Eliminar este remito? Se eliminarán también sus ingresos a stock asociados.', function () {
    // Revertir: borrar movimientos de stock que referencian este remito.
    DB.getAll('stockMovements').filter(function (m) { return m.ref_type === 'remito' && m.ref_id === id; })
      .forEach(function (m) { DB.remove('stockMovements', m.id); });
    DB.remove('receipts', id);
    toast('Remito eliminado', 'warning');
    renderRemitos();
  });
}

function viewRemito(id) {
  var r = DB.getById('receipts', id);
  if (!r) { toast('Remito no encontrado', 'error'); return; }
  var po = DB.getById('purchaseOrders', r.po_id);
  var sup = DB.getById('suppliers', r.supplier_id);
  var proj = DB.getById('projects', r.project_id);
  var wh = r.warehouse_id ? DB.getById('stockWarehouses', r.warehouse_id) : null;

  openModal('Remito ' + (r.number || ''), `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
  <div><div class="form-label">OC</div><p>${escapeHtml(po ? po.number : '-')}</p></div>
  <div><div class="form-label">Fecha</div><p>${fmtDate(r.fecha)}</p></div>
  <div><div class="form-label">Proveedor</div><p>${escapeHtml(sup ? sup.name : '-')}</p></div>
  <div><div class="form-label">Proyecto</div><p>${escapeHtml(proj ? proj.name : '-')}</p></div>
  <div><div class="form-label">Almacén</div><p>${escapeHtml(wh ? wh.name : 'Sin ingreso a stock')}</p></div>
</div>
<div class="table-wrap">
  <table><thead><tr><th>Ítem</th><th class="text-right">Recibido</th><th>Unidad</th><th>A stock</th></tr></thead>
  <tbody>
    ${(r.items || []).map(function (it) {
      return '<tr><td>' + escapeHtml(it.description || '-') + '</td><td class="number-cell text-right">' + fmtNum(it.cantidad) + '</td><td>' + escapeHtml(it.unit || '') + '</td><td>' + (it.material_id ? '<i class="fas fa-check text-success"></i>' : '—') + '</td></tr>';
    }).join('')}
  </tbody></table>
</div>
${r.notes ? '<p style="margin-top:10px"><strong>Notas:</strong> ' + escapeHtml(r.notes) + '</p>' : ''}
<p style="font-size:11px;color:var(--text-muted);margin-top:8px"><i class="fas fa-circle-info"></i> La factura del proveedor puede referenciar esta OC/recepción.</p>
`, 'modal-lg', `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
   <button class="btn btn-secondary" onclick="openTrace('purchaseOrders','${r.po_id}')"><i class="fas fa-diagram-project"></i> Ver trazabilidad</button>`);
}
