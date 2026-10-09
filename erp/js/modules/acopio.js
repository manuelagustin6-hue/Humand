/* ===== ACOPIO / LISTA DE PRECIOS =====
 * Compra anticipada de materiales a un proveedor: se fija un precio y una
 * cantidad (acopio), se paga un anticipo, y luego se va retirando (entrega) y
 * usando en obra (consumo). Indicadores por ítem: A entregar / Entregado /
 * Consumido / Saldo.
 *
 * Self-contained: entregas y consumos se registran dentro de este módulo.
 * La integración con el módulo Stock (crear movimientos de entrada/salida) queda
 * marcada como TODO — ver registrarEntrega()/registrarConsumo().
 */

const ACOPIO_ESTADOS = {
  borrador: { label: 'Borrador', cls: 'badge-gray' },
  activa:   { label: 'Activa',   cls: 'badge-green' },
  cerrada:  { label: 'Cerrada',  cls: 'badge-blue' },
};

function _acopioBadge(estado) {
  var e = ACOPIO_ESTADOS[estado] || ACOPIO_ESTADOS.borrador;
  return '<span class="badge ' + e.cls + '">' + e.label + '</span>';
}

function _genAcopioNumber() {
  var all = DB.getAll('priceLists');
  var yr = new Date().getFullYear();
  var seq = all.filter(function (a) { return (a.number || '').indexOf('AC-' + yr) === 0; }).length + 1;
  return 'AC-' + yr + '-' + String(seq).padStart(3, '0');
}

function _blankAcopioItem() {
  return { rubro_id: '', descripcion: '', unit: '', cantidad: 0, precio_unit: 0, entregado: 0, consumido: 0 };
}

// Totales de un acopio (sin impuestos).
function _acopioTotals(a) {
  var items = a.items || [];
  var valor = items.reduce(function (s, it) { return s + (Number(it.cantidad) || 0) * (Number(it.precio_unit) || 0); }, 0);
  var cant = items.reduce(function (s, it) { return s + (Number(it.cantidad) || 0); }, 0);
  var entregado = items.reduce(function (s, it) { return s + (Number(it.entregado) || 0); }, 0);
  var consumido = items.reduce(function (s, it) { return s + (Number(it.consumido) || 0); }, 0);
  var pctEntregado = cant > 0 ? (entregado / cant * 100) : 0;
  return { valor: valor, cant: cant, entregado: entregado, consumido: consumido, pctEntregado: pctEntregado };
}

/* ───────────────────────────────────────────── LIST VIEW */
function renderAcopio() {
  var acopios = DB.getAll('priceLists');
  var projects = DB.getAll('projects');

  var activos = acopios.filter(function (a) { return a.estado === 'activa'; });
  var valorAcopiado = activos.reduce(function (s, a) { return s + _acopioTotals(a).valor; }, 0);
  var saldoEntregar = activos.reduce(function (s, a) {
    var t = _acopioTotals(a); return s + (t.cant - t.entregado);
  }, 0);

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Acopio / Lista de Precios</div>
    <div class="page-subtitle">Compra anticipada de materiales con anticipo, entrega y consumo</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-primary" onclick="openAcopioForm()"><i class="fas fa-plus"></i> Nuevo Acopio</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-boxes-packing"></i></div><div>
    <div class="stat-value">${activos.length}</div><div class="stat-label">Acopios activos</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-sack-dollar"></i></div><div>
    <div class="stat-value">${fmtMoney(valorAcopiado)}</div><div class="stat-label">Valor acopiado (activos)</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-truck-ramp-box"></i></div><div>
    <div class="stat-value">${fmtNum(saldoEntregar)}</div><div class="stat-label">Unidades a entregar</div></div></div>
</div>

<div class="filter-bar">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar por número o proveedor..." oninput="filterAcopio(this.value)">
  </div>
  <select class="form-control" style="width:150px" onchange="filterAcopio(undefined,this.value)">
    <option value="">Todos los estados</option>
    ${Object.entries(ACOPIO_ESTADOS).map(function (e) { return '<option value="' + e[0] + '">' + e[1].label + '</option>'; }).join('')}
  </select>
  <select class="form-control" style="width:180px" onchange="filterAcopio(undefined,undefined,this.value)">
    <option value="">Todos los proyectos</option>
    ${projects.map(function (p) { return '<option value="' + p.id + '">' + escapeHtml(p.name) + '</option>'; }).join('')}
  </select>
</div>

<div class="card"><div class="card-body" style="padding:0">
  <div class="table-wrap" id="acopio-table-wrap">${buildAcopioTable(acopios)}</div>
</div></div>`;

  document.getElementById('breadcrumb').innerHTML = '<i class="fas fa-boxes-packing"></i><span>Acopio</span>';
  window._acopioFilters = { q: '', estado: '', project: '' };
}

function buildAcopioTable(acopios) {
  if (!acopios.length) {
    return '<div class="empty-state"><i class="fas fa-boxes-packing"></i><p>No hay acopios. Creá el primero para fijar precios y cantidades con un proveedor.</p></div>';
  }
  var suppliers = DB.getAll('suppliers');
  var projects = DB.getAll('projects');
  return `<table><thead><tr>
    <th>Número</th><th>Proveedor</th><th>Proyecto</th><th>Estado</th>
    <th class="text-right">Valor</th><th class="text-right">Anticipo</th><th style="width:160px">Entregado</th><th>Acciones</th>
  </tr></thead>
  <tbody>
  ${acopios.map(function (a) {
    var sup = suppliers.find(function (s) { return s.id === a.supplier_id; });
    var proj = projects.find(function (p) { return p.id === a.project_id; });
    var t = _acopioTotals(a);
    return `<tr>
      <td><strong>${escapeHtml(a.number || '-')}</strong></td>
      <td>${escapeHtml(sup ? sup.name : '-')}</td>
      <td>${escapeHtml(proj ? proj.name : '-')}</td>
      <td>${_acopioBadge(a.estado)}</td>
      <td class="number-cell text-right"><strong>${fmtMoney(t.valor)}</strong></td>
      <td class="number-cell text-right">${fmtMoney(a.anticipo || 0)}</td>
      <td>${progressBar(t.pctEntregado)}</td>
      <td><div class="table-actions">
        <button class="btn-ghost btn btn-sm" onclick="viewAcopio('${a.id}')"><i class="fas fa-eye"></i></button>
        <button class="btn-ghost btn btn-sm" onclick="openAcopioForm('${a.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn-ghost btn btn-sm danger" onclick="deleteAcopio('${a.id}')"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('')}
  </tbody></table>`;
}

function filterAcopio(q, estado, project) {
  var f = window._acopioFilters || (window._acopioFilters = { q: '', estado: '', project: '' });
  if (q !== undefined) f.q = (q || '').toLowerCase();
  if (estado !== undefined) f.estado = estado;
  if (project !== undefined) f.project = project;
  var list = DB.getAll('priceLists');
  var suppliers = DB.getAll('suppliers');
  if (f.q) list = list.filter(function (a) {
    var sup = suppliers.find(function (s) { return s.id === a.supplier_id; });
    return (a.number || '').toLowerCase().indexOf(f.q) >= 0 || (sup && sup.name.toLowerCase().indexOf(f.q) >= 0);
  });
  if (f.estado) list = list.filter(function (a) { return a.estado === f.estado; });
  if (f.project) list = list.filter(function (a) { return a.project_id === f.project; });
  var wrap = document.getElementById('acopio-table-wrap');
  if (wrap) wrap.innerHTML = buildAcopioTable(list);
}

/* ───────────────────────────────────────────── FORM */
function openAcopioForm(id) {
  var a = id ? DB.getById('priceLists', id) : null;
  var suppliers = DB.getAll('suppliers');
  var projects = DB.getAll('projects');
  window._acopioItems = (a && a.items ? a.items.map(function (it) { return Object.assign({}, it); }) : [_blankAcopioItem()]);

  openModal(a ? 'Editar Acopio' : 'Nuevo Acopio', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Número</label>
    <input class="form-control" id="ac-number" value="${escapeHtml(a ? a.number : _genAcopioNumber())}">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha</label>
    <input class="form-control" id="ac-fecha" type="date" value="${a ? a.fecha : todayStr()}">
  </div>
  <div class="form-group">
    <label class="form-label">Proveedor *</label>
    <select class="form-control" id="ac-supplier">
      <option value="">Seleccionar...</option>
      ${suppliers.map(function (s) { return '<option value="' + s.id + '"' + (a && a.supplier_id === s.id ? ' selected' : '') + '>' + escapeHtml(s.name) + '</option>'; }).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Proyecto *</label>
    <select class="form-control" id="ac-project">
      <option value="">Seleccionar...</option>
      ${projects.map(function (p) { return '<option value="' + p.id + '"' + (a && a.project_id === p.id ? ' selected' : '') + '>' + escapeHtml(p.name) + '</option>'; }).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Anticipo (pago a cuenta)</label>
    <input class="form-control" id="ac-anticipo" type="number" min="0" value="${a ? (a.anticipo || 0) : 0}">
  </div>
  <div class="form-group">
    <label class="form-label">Estado</label>
    <select class="form-control" id="ac-estado">
      ${Object.entries(ACOPIO_ESTADOS).map(function (e) { return '<option value="' + e[0] + '"' + (a && a.estado === e[0] ? ' selected' : (!a && e[0] === 'borrador' ? ' selected' : '')) + '>' + e[1].label + '</option>'; }).join('')}
    </select>
  </div>
  <div class="form-group full">
    <label class="form-label">Notas</label>
    <input class="form-control" id="ac-notes" value="${escapeHtml(a ? (a.notes || '') : '')}">
  </div>
</div>
<div class="divider"></div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
  <strong style="font-size:13px">Ítems acopiados</strong>
  <button class="btn btn-sm btn-secondary" onclick="acopioAddItem()"><i class="fas fa-plus"></i> Agregar ítem</button>
</div>
<div id="ac-item-rows"></div>
<div id="ac-total" style="text-align:right;font-size:13px;margin-top:8px"></div>
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveAcopio('${id || ''}')"><i class="fas fa-save"></i> Guardar</button>
`);
  _acopioRenderItems();
}

function _acopioRubroOptions(selected) {
  return DB.getAll('rubros').filter(function (r) { return r.active !== false; }).map(function (r) {
    return '<option value="' + r.id + '"' + (r.id === selected ? ' selected' : '') + '>' + escapeHtml(r.code + ' — ' + r.name) + '</option>';
  }).join('');
}

function _acopioRenderItems() {
  var cont = document.getElementById('ac-item-rows');
  if (!cont) return;
  var items = window._acopioItems || [];
  cont.innerHTML = `
    <div style="display:grid;grid-template-columns:2fr 1.5fr 70px 90px 110px 36px;gap:6px;margin-bottom:4px;font-size:11px;font-weight:600;color:var(--text-muted)">
      <span>Rubro</span><span>Descripción</span><span>Unidad</span><span>Cantidad</span><span>P. Unitario</span><span></span>
    </div>` +
    items.map(function (it, i) {
      return `<div style="display:grid;grid-template-columns:2fr 1.5fr 70px 90px 110px 36px;gap:6px;margin-bottom:6px;align-items:center">
        <select class="form-control" style="font-size:12px" onchange="acopioUpdateItem(${i},'rubro_id',this.value)">
          <option value="">Rubro...</option>${_acopioRubroOptions(it.rubro_id)}
        </select>
        <input class="form-control" style="font-size:12px" value="${escapeHtml(it.descripcion || '')}" placeholder="Descripción" oninput="acopioUpdateItem(${i},'descripcion',this.value)">
        <input class="form-control" style="font-size:12px" value="${escapeHtml(it.unit || '')}" placeholder="un" oninput="acopioUpdateItem(${i},'unit',this.value)">
        <input class="form-control" style="font-size:12px" type="number" min="0" value="${it.cantidad}" oninput="acopioUpdateItem(${i},'cantidad',+this.value)">
        <input class="form-control" style="font-size:12px" type="number" min="0" value="${it.precio_unit}" oninput="acopioUpdateItem(${i},'precio_unit',+this.value)">
        <button class="btn-ghost btn danger" onclick="acopioRemoveItem(${i})"><i class="fas fa-times"></i></button>
      </div>`;
    }).join('');
  _acopioRecalc();
}

function acopioAddItem() { (window._acopioItems = window._acopioItems || []).push(_blankAcopioItem()); _acopioRenderItems(); }
function acopioRemoveItem(i) { window._acopioItems.splice(i, 1); if (!window._acopioItems.length) window._acopioItems.push(_blankAcopioItem()); _acopioRenderItems(); }
function acopioUpdateItem(i, field, val) { var it = window._acopioItems[i]; if (it) it[field] = val; if (field === 'cantidad' || field === 'precio_unit') _acopioRecalc(); }

function _acopioRecalc() {
  var el = document.getElementById('ac-total');
  if (!el) return;
  var total = (window._acopioItems || []).reduce(function (s, it) { return s + (Number(it.cantidad) || 0) * (Number(it.precio_unit) || 0); }, 0);
  var anticipo = Number((document.getElementById('ac-anticipo') || {}).value) || 0;
  el.innerHTML = 'Valor total acopio: <strong style="color:var(--primary);font-size:15px">' + fmtMoney(total) + '</strong>' +
    (anticipo ? ' &nbsp;|&nbsp; Anticipo: <strong>' + fmtMoney(anticipo) + '</strong> &nbsp;|&nbsp; Saldo: <strong>' + fmtMoney(total - anticipo) + '</strong>' : '');
}

function saveAcopio(id) {
  var supplier_id = document.getElementById('ac-supplier').value;
  var project_id = document.getElementById('ac-project').value;
  if (!supplier_id || !project_id) { toast('Proveedor y proyecto son obligatorios', 'error'); return; }
  var items = (window._acopioItems || []).filter(function (it) { return it.rubro_id || it.descripcion; });
  if (!items.length) { toast('Agregá al menos un ítem', 'error'); return; }
  items = items.map(function (it) {
    return {
      rubro_id: it.rubro_id, descripcion: it.descripcion || '', unit: it.unit || '',
      cantidad: Number(it.cantidad) || 0, precio_unit: Number(it.precio_unit) || 0,
      entregado: Number(it.entregado) || 0, consumido: Number(it.consumido) || 0,
    };
  });
  var data = {
    number: (document.getElementById('ac-number').value || '').trim(),
    fecha: document.getElementById('ac-fecha').value,
    supplier_id: supplier_id,
    project_id: project_id,
    anticipo: Number(document.getElementById('ac-anticipo').value) || 0,
    estado: document.getElementById('ac-estado').value,
    notes: (document.getElementById('ac-notes').value || '').trim(),
    items: items,
  };
  if (id) { DB.update('priceLists', id, data); toast('Acopio actualizado', 'success'); }
  else { DB.insert('priceLists', data); toast('Acopio creado', 'success'); }
  window._acopioItems = [];
  closeModal();
  renderAcopio();
}

function deleteAcopio(id) {
  confirmDialog('¿Eliminar este acopio?', function () {
    DB.remove('priceLists', id);
    toast('Acopio eliminado', 'warning');
    renderAcopio();
  });
}

/* ───────────────────────────────────────────── DETAIL + ENTREGA/CONSUMO */
function viewAcopio(id) {
  var a = DB.getById('priceLists', id);
  if (!a) { toast('Acopio no encontrado', 'error'); return; }
  var sup = DB.getById('suppliers', a.supplier_id);
  var proj = DB.getById('projects', a.project_id);
  var rubros = DB.getAll('rubros');
  var t = _acopioTotals(a);

  var rows = (a.items || []).map(function (it, i) {
    var rubro = rubros.find(function (r) { return r.id === it.rubro_id; });
    var aEntregar = (Number(it.cantidad) || 0) - (Number(it.entregado) || 0);
    var saldoConsumo = (Number(it.entregado) || 0) - (Number(it.consumido) || 0);
    return `<tr>
      <td>${escapeHtml(rubro ? rubro.code : '')} ${escapeHtml(it.descripcion || (rubro ? rubro.name : '-'))}</td>
      <td class="number-cell text-right">${fmtNum(it.cantidad)} ${escapeHtml(it.unit || '')}</td>
      <td class="number-cell text-right">${fmtMoney(it.precio_unit)}</td>
      <td class="number-cell text-right">${fmtNum(it.entregado || 0)}</td>
      <td class="number-cell text-right">${fmtNum(it.consumido || 0)}</td>
      <td class="number-cell text-right ${aEntregar > 0 ? 'text-danger' : 'text-success'}">${fmtNum(aEntregar)}</td>
      <td><div class="table-actions">
        <button class="btn btn-sm btn-secondary" ${a.estado === 'cerrada' ? 'disabled' : ''} onclick="registrarEntrega('${a.id}',${i})" title="Registrar entrega"><i class="fas fa-truck-ramp-box"></i></button>
        <button class="btn btn-sm btn-secondary" ${saldoConsumo <= 0 ? 'disabled' : ''} onclick="registrarConsumo('${a.id}',${i})" title="Registrar consumo"><i class="fas fa-fire"></i></button>
      </div></td>
    </tr>`;
  }).join('');

  openModal('Acopio ' + (a.number || ''), `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
  <div><div class="form-label">Proveedor</div><p>${escapeHtml(sup ? sup.name : '-')}</p></div>
  <div><div class="form-label">Proyecto</div><p>${escapeHtml(proj ? proj.name : '-')}</p></div>
  <div><div class="form-label">Estado</div><p>${_acopioBadge(a.estado)}</p></div>
  <div><div class="form-label">Anticipo</div><p>${fmtMoney(a.anticipo || 0)} de ${fmtMoney(t.valor)}</p></div>
</div>
<div class="table-wrap">
  <table><thead><tr>
    <th>Ítem</th><th class="text-right">Acopiado</th><th class="text-right">P.Unit</th>
    <th class="text-right">Entregado</th><th class="text-right">Consumido</th><th class="text-right">A entregar</th><th>Acciones</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr class="total-row">
    <td>Totales</td>
    <td class="number-cell text-right">${fmtNum(t.cant)}</td><td></td>
    <td class="number-cell text-right">${fmtNum(t.entregado)}</td>
    <td class="number-cell text-right">${fmtNum(t.consumido)}</td>
    <td class="number-cell text-right">${fmtNum(t.cant - t.entregado)}</td><td></td>
  </tr></tfoot>
  </table>
</div>
<p style="font-size:11px;color:var(--text-muted);margin-top:8px"><i class="fas fa-circle-info"></i> El consumo no puede superar lo entregado. (Integración con Stock pendiente.)</p>
`, 'modal-lg', `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`);
}

function registrarEntrega(id, itemIdx) {
  var a = DB.getById('priceLists', id);
  if (!a || !a.items[itemIdx]) return;
  var it = a.items[itemIdx];
  var aEntregar = (Number(it.cantidad) || 0) - (Number(it.entregado) || 0);
  if (aEntregar <= 0) { toast('No queda cantidad por entregar en este ítem', 'warning'); return; }
  openModal('Registrar entrega', `
    <p style="font-size:13px;margin-bottom:10px">${escapeHtml(it.descripcion || '')} — a entregar: <strong>${fmtNum(aEntregar)} ${escapeHtml(it.unit || '')}</strong></p>
    <div class="form-group"><label class="form-label">Cantidad a entregar</label>
      <input class="form-control" id="ac-entrega-qty" type="number" min="0" max="${aEntregar}" value="${aEntregar}"></div>
  `, 'modal-sm', `
    <button class="btn btn-secondary" onclick="viewAcopio('${id}')">Cancelar</button>
    <button class="btn btn-primary" onclick="confirmEntrega('${id}',${itemIdx})">Confirmar</button>
  `);
}

function confirmEntrega(id, itemIdx) {
  var a = DB.getById('priceLists', id);
  if (!a) return;
  var qty = Number(document.getElementById('ac-entrega-qty').value) || 0;
  var it = a.items[itemIdx];
  var aEntregar = (Number(it.cantidad) || 0) - (Number(it.entregado) || 0);
  if (qty <= 0 || qty > aEntregar) { toast('Cantidad inválida', 'error'); return; }
  var items = a.items.map(function (x) { return Object.assign({}, x); });
  items[itemIdx].entregado = (Number(items[itemIdx].entregado) || 0) + qty;
  // TODO (integración Stock): crear movimiento de ENTRADA en el almacén del proyecto
  // por `qty` del rubro/ítem acopiado (DB.insert('stockMovements', {...})).
  DB.update('priceLists', id, { items: items });
  toast('Entrega registrada', 'success');
  viewAcopio(id);
}

function registrarConsumo(id, itemIdx) {
  var a = DB.getById('priceLists', id);
  if (!a || !a.items[itemIdx]) return;
  var it = a.items[itemIdx];
  var saldoConsumo = (Number(it.entregado) || 0) - (Number(it.consumido) || 0);
  if (saldoConsumo <= 0) { toast('No hay stock entregado disponible para consumir', 'warning'); return; }
  openModal('Registrar consumo', `
    <p style="font-size:13px;margin-bottom:10px">${escapeHtml(it.descripcion || '')} — disponible para consumir: <strong>${fmtNum(saldoConsumo)} ${escapeHtml(it.unit || '')}</strong></p>
    <div class="form-group"><label class="form-label">Cantidad consumida</label>
      <input class="form-control" id="ac-consumo-qty" type="number" min="0" max="${saldoConsumo}" value="${saldoConsumo}"></div>
  `, 'modal-sm', `
    <button class="btn btn-secondary" onclick="viewAcopio('${id}')">Cancelar</button>
    <button class="btn btn-primary" onclick="confirmConsumo('${id}',${itemIdx})">Confirmar</button>
  `);
}

function confirmConsumo(id, itemIdx) {
  var a = DB.getById('priceLists', id);
  if (!a) return;
  var qty = Number(document.getElementById('ac-consumo-qty').value) || 0;
  var it = a.items[itemIdx];
  var saldoConsumo = (Number(it.entregado) || 0) - (Number(it.consumido) || 0);
  if (qty <= 0 || qty > saldoConsumo) { toast('Cantidad inválida (no puede superar lo entregado)', 'error'); return; }
  var items = a.items.map(function (x) { return Object.assign({}, x); });
  items[itemIdx].consumido = (Number(items[itemIdx].consumido) || 0) + qty;
  // TODO (integración Stock): crear movimiento de SALIDA/CONSUMO en el almacén del
  // proyecto por `qty` (DB.insert('stockMovements', {tipo:'consumo', ...})).
  DB.update('priceLists', id, { items: items });
  toast('Consumo registrado', 'success');
  viewAcopio(id);
}
