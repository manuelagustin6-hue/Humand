/* ===== STOCK / ALMACÉN DE OBRA ===== */

const STOCK_CATEGORIES = ['Materiales', 'Ferretería', 'Electricidad', 'Plomería', 'Equipos', 'Herramientas', 'Acabados', 'Otro'];
const STOCK_MOV_TYPES  = [
  { id: 'entrada',        label: 'Entrada',        icon: 'fa-arrow-down',     color: 'green' },
  { id: 'salida',         label: 'Salida',          icon: 'fa-arrow-up',       color: 'red'   },
  { id: 'transferencia',  label: 'Transferencia',   icon: 'fa-exchange-alt',   color: 'blue'  },
  { id: 'ajuste',         label: 'Ajuste',          icon: 'fa-sliders-h',      color: 'yellow'}
];

// =====================================================================
// MAIN RENDER
// =====================================================================
function renderStock() {
  const mats    = DB.getAll('stockMaterials');
  const whs     = DB.getAll('stockWarehouses');
  const movs    = DB.getAll('stockMovements');
  const levels  = computeAllStockLevels(mats, whs, movs);
  const alerts  = levels.filter(l => l.minStock > 0 && l.qty < l.minStock);
  const lowVal  = levels.filter(l => l.qty <= 0);

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Stock / Almacén de Obra</div>
    <div class="page-subtitle">Control de materiales, depósitos y movimientos</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="exportStock()"><i class="fas fa-download"></i> Exportar</button>
    <button class="btn btn-secondary" onclick="openWarehouseForm()"><i class="fas fa-warehouse"></i> Nuevo Depósito</button>
    <button class="btn btn-secondary" onclick="openMaterialForm()"><i class="fas fa-box"></i> Nuevo Material</button>
    <button class="btn btn-primary"   onclick="openMovementForm()"><i class="fas fa-plus"></i> Nuevo Movimiento</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-boxes-stacking"></i></div><div>
    <div class="stat-value">${mats.length}</div><div class="stat-label">Materiales</div></div></div>
  <div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-warehouse"></i></div><div>
    <div class="stat-value">${whs.length}</div><div class="stat-label">Depósitos</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-dollar-sign"></i></div><div>
    <div class="stat-value">${fmtMoney(levels.reduce((s,l)=>s+l.value,0))}</div><div class="stat-label">Valor Total Stock</div></div></div>
  <div class="stat-card"><div class="stat-icon ${alerts.length?'red':'green'}"><i class="fas fa-exclamation-triangle"></i></div><div>
    <div class="stat-value">${alerts.length}</div><div class="stat-label">Alertas Stock Mín.</div></div></div>
</div>

<div id="stock-tabs">
  <div class="tabs">
    <button class="tab-btn" data-tab="tab-stock-niveles">Stock Actual</button>
    <button class="tab-btn" data-tab="tab-stock-movs">Movimientos</button>
    <button class="tab-btn" data-tab="tab-stock-mats">Materiales</button>
    <button class="tab-btn" data-tab="tab-stock-whs">Depósitos</button>
    ${alerts.length ? `<button class="tab-btn" data-tab="tab-stock-alerts" style="color:var(--danger)">⚠ Alertas (${alerts.length})</button>` : ''}
  </div>
  <div id="tab-stock-niveles" class="tab-content">${renderStockLevelsTab(levels, mats, whs)}</div>
  <div id="tab-stock-movs"    class="tab-content">${renderMovementsTab(movs, mats, whs)}</div>
  <div id="tab-stock-mats"    class="tab-content">${renderMaterialsTab(mats, levels)}</div>
  <div id="tab-stock-whs"     class="tab-content">${renderWarehousesTab(whs, levels)}</div>
  ${alerts.length ? `<div id="tab-stock-alerts" class="tab-content">${renderAlertsTab(alerts, mats, whs)}</div>` : ''}
</div>
`;
  initTabs('stock-tabs');
}

// =====================================================================
// STOCK COMPUTATION
// =====================================================================
function computeStockForPair(materialId, warehouseId, movs) {
  const relevant = movs.filter(m =>
    m.material_id === materialId &&
    (m.warehouse_id === warehouseId || m.dest_warehouse_id === warehouseId)
  ).sort((a, b) => a.date.localeCompare(b.date) || (a.created_at||'').localeCompare(b.created_at||''));

  let qty = 0, avgCost = 0;

  relevant.forEach(m => {
    const q  = parseFloat(m.qty) || 0;
    const uc = parseFloat(m.unit_cost) || 0;

    const addQty = (addQ, addUc) => {
      // weighted average update
      avgCost = (avgCost * qty + addUc * addQ) / (qty + addQ);
      qty    += addQ;
    };

    if (m.type === 'entrada') {
      addQty(q, uc);
    } else if (m.type === 'salida') {
      qty = Math.max(0, qty - q);
    } else if (m.type === 'transferencia') {
      if (m.warehouse_id === warehouseId) {
        qty = Math.max(0, qty - q);
      } else if (m.dest_warehouse_id === warehouseId) {
        addQty(q, uc);
      }
    } else if (m.type === 'ajuste') {
      if (m.warehouse_id === warehouseId) {
        qty     = q;
        avgCost = uc || avgCost;
      }
    }
  });

  return { qty: Math.max(qty, 0), avgCost, value: Math.max(qty, 0) * avgCost };
}

function computeAllStockLevels(mats, whs, movs) {
  const levels = [];
  mats.forEach(mat => {
    whs.forEach(wh => {
      const { qty, avgCost, value } = computeStockForPair(mat.id, wh.id, movs);
      if (qty > 0 || movs.some(m => m.material_id === mat.id && (m.warehouse_id === wh.id || m.dest_warehouse_id === wh.id))) {
        levels.push({
          materialId: mat.id, warehouseId: wh.id,
          materialCode: mat.code, materialName: mat.name,
          unit: mat.unit, category: mat.category,
          warehouseName: wh.name,
          qty, avgCost, value,
          minStock: parseFloat(mat.min_stock) || 0
        });
      }
    });
  });
  return levels;
}

// =====================================================================
// TAB: STOCK ACTUAL
// =====================================================================
function renderStockLevelsTab(levels, mats, whs) {
  const filters = `
<div class="filter-bar" style="margin-bottom:12px">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar material..." oninput="filterStockLevels(this.value)">
  </div>
  <select class="form-control" style="width:160px" onchange="filterStockLevels(undefined,this.value)">
    <option value="">Todos los depósitos</option>
    ${whs.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
  </select>
  <select class="form-control" style="width:160px" onchange="filterStockLevels(undefined,undefined,this.value)">
    <option value="">Todas las categorías</option>
    ${STOCK_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
  </select>
  <label style="display:flex;align-items:center;gap:6px;font-size:13px">
    <input type="checkbox" id="chk-only-alerts" onchange="filterStockLevels()"> Solo alertas
  </label>
</div>`;

  if (!levels.length) return filters + `<div class="empty-state"><i class="fas fa-boxes-stacking"></i><p>Sin stock registrado. Agregue materiales y depósitos, luego registre movimientos.</p></div>`;

  const rows = levels.sort((a,b) => a.materialName.localeCompare(b.materialName)).map(l => {
    const pct = l.minStock > 0 ? Math.min(100, (l.qty / l.minStock) * 100) : 100;
    const alert = l.minStock > 0 && l.qty < l.minStock;
    return `<tr class="stock-level-row" data-mat="${l.materialName.toLowerCase()}" data-wh="${l.warehouseId}" data-cat="${l.category||''}" data-alert="${alert}">
      <td><strong>${l.materialCode||''}</strong></td>
      <td>${l.materialName}</td>
      <td><span class="badge badge-gray">${l.category||'-'}</span></td>
      <td>${l.warehouseName}</td>
      <td class="text-right"><strong>${fmtNum(l.qty)} ${l.unit||''}</strong></td>
      <td class="text-right">${fmtMoney(l.avgCost)}</td>
      <td class="text-right"><strong>${fmtMoney(l.value)}</strong></td>
      <td>
        ${l.minStock > 0 ? `
          <div style="display:flex;align-items:center;gap:6px">
            <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:${alert?'var(--danger)':'var(--success)'}"></div>
            </div>
            <span style="font-size:11px;color:${alert?'var(--danger)':'var(--text-muted)'}">${fmtNum(l.minStock)}</span>
          </div>` : '<span style="color:var(--text-muted);font-size:12px">-</span>'}
      </td>
      <td>
        <button class="btn btn-xs btn-secondary" onclick="openMovementForm('${l.materialId}','${l.warehouseId}')"><i class="fas fa-plus"></i></button>
        <button class="btn btn-xs btn-secondary" onclick="showStockHistory('${l.materialId}','${l.warehouseId}')"><i class="fas fa-history"></i></button>
      </td>
    </tr>`;
  }).join('');

  return filters + `<div class="card"><div class="card-body" style="padding:0">
<table id="stock-levels-table"><thead><tr>
  <th>Código</th><th>Material</th><th>Categoría</th><th>Depósito</th>
  <th class="text-right">Cantidad</th><th class="text-right">Costo Prom.</th>
  <th class="text-right">Valor</th><th style="min-width:120px">vs Mín.</th><th>Acciones</th>
</tr></thead><tbody id="stock-levels-body">${rows}</tbody></table>
</div></div>`;
}

function filterStockLevels(q, wh, cat) {
  window._stockFilters = window._stockFilters || { q:'', wh:'', cat:'', onlyAlerts: false };
  const f = window._stockFilters;
  if (q  !== undefined) f.q  = (q||'').toLowerCase();
  if (wh !== undefined) f.wh = wh||'';
  if (cat!== undefined) f.cat= cat||'';
  const chk = document.getElementById('chk-only-alerts');
  if (chk) f.onlyAlerts = chk.checked;

  document.querySelectorAll('#stock-levels-body tr.stock-level-row').forEach(function(tr) {
    const matchQ  = !f.q   || tr.dataset.mat.includes(f.q);
    const matchWh = !f.wh  || tr.dataset.wh  === f.wh;
    const matchCat= !f.cat || tr.dataset.cat === f.cat;
    const matchAl = !f.onlyAlerts || tr.dataset.alert === 'true';
    tr.style.display = (matchQ && matchWh && matchCat && matchAl) ? '' : 'none';
  });
}

// =====================================================================
// TAB: MOVIMIENTOS
// =====================================================================
function renderMovementsTab(movs, mats, whs) {
  const typeMap = {};
  STOCK_MOV_TYPES.forEach(t => typeMap[t.id] = t);

  const rows = [...movs].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,200).map(m => {
    const mat = mats.find(x=>x.id===m.material_id);
    const wh  = whs.find(x=>x.id===m.warehouse_id);
    const dwh = m.dest_warehouse_id ? whs.find(x=>x.id===m.dest_warehouse_id) : null;
    const t   = typeMap[m.type] || { label: m.type, color:'gray', icon:'fa-circle' };
    const qSign = (m.type==='salida')?'-':(m.type==='entrada'?'+':'');
    return `<tr>
      <td>${fmtDate(m.date)}</td>
      <td><span class="badge badge-${t.color}"><i class="fas ${t.icon}"></i> ${t.label}</span></td>
      <td><strong>${mat?.code||''}</strong> ${mat?.name||m.material_id}</td>
      <td>${wh?.name||'-'}${dwh?` → ${dwh.name}`:''}</td>
      <td class="text-right"><strong>${qSign}${fmtNum(m.qty)}</strong> ${mat?.unit||''}</td>
      <td class="text-right">${fmtMoney(m.unit_cost||0)}</td>
      <td class="text-right">${fmtMoney((m.qty||0)*(m.unit_cost||0))}</td>
      <td style="font-size:11px;color:var(--text-muted)">${m.notes||m.ref||''}</td>
      <td>
        <button class="btn btn-xs btn-danger" onclick="deleteMovement('${m.id}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');

  const empty = `<div class="empty-state"><i class="fas fa-exchange-alt"></i><p>Sin movimientos registrados</p></div>`;

  return `<div class="filter-bar" style="margin-bottom:12px">
  <button class="btn btn-primary" onclick="openMovementForm()"><i class="fas fa-plus"></i> Nuevo Movimiento</button>
</div>
<div class="card"><div class="card-body" style="padding:0">
${!movs.length ? empty : `<table><thead><tr>
  <th>Fecha</th><th>Tipo</th><th>Material</th><th>Depósito</th>
  <th class="text-right">Cantidad</th><th class="text-right">Costo Unit.</th>
  <th class="text-right">Total</th><th>Ref / Notas</th><th></th>
</tr></thead><tbody>${rows}</tbody></table>`}
</div></div>`;
}

// =====================================================================
// TAB: MATERIALES
// =====================================================================
function renderMaterialsTab(mats, levels) {
  const totalByMat = {};
  levels.forEach(l => {
    totalByMat[l.materialId] = (totalByMat[l.materialId]||0) + l.qty;
  });

  const rows = mats.map(m => {
    const qty = totalByMat[m.id] || 0;
    return `<tr>
      <td><strong>${m.code||'-'}</strong></td>
      <td>${m.name}</td>
      <td><span class="badge badge-gray">${m.category||'-'}</span></td>
      <td>${m.unit||'-'}</td>
      <td class="text-right">${fmtNum(qty)}</td>
      <td class="text-right">${m.min_stock>0?fmtNum(m.min_stock):'-'}</td>
      <td style="font-size:11px;color:var(--text-muted)">${m.description||''}</td>
      <td>
        <button class="btn btn-xs btn-secondary" onclick="openMaterialForm('${m.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-xs btn-danger"    onclick="deleteMaterial('${m.id}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');

  return `<div class="filter-bar" style="margin-bottom:12px">
  <button class="btn btn-primary" onclick="openMaterialForm()"><i class="fas fa-plus"></i> Nuevo Material</button>
</div>
<div class="card"><div class="card-body" style="padding:0">
${!mats.length
  ? `<div class="empty-state"><i class="fas fa-box"></i><p>Sin materiales. Agregue materiales al catálogo.</p></div>`
  : `<table><thead><tr>
      <th>Código</th><th>Nombre</th><th>Categoría</th><th>Unidad</th>
      <th class="text-right">Stock Total</th><th class="text-right">Stock Mín.</th>
      <th>Descripción</th><th>Acciones</th>
    </tr></thead><tbody>${rows}</tbody></table>`}
</div></div>`;
}

// =====================================================================
// TAB: DEPÓSITOS
// =====================================================================
function renderWarehousesTab(whs, levels) {
  const projects = DB.getAll('projects');
  const valueByWh = {};
  levels.forEach(l => { valueByWh[l.warehouseId] = (valueByWh[l.warehouseId]||0) + l.value; });

  const rows = whs.map(w => {
    const proj = projects.find(p=>p.id===w.project_id);
    const val  = valueByWh[w.id]||0;
    const matCount = new Set(levels.filter(l=>l.warehouseId===w.id&&l.qty>0).map(l=>l.materialId)).size;
    return `<tr>
      <td><strong>${w.name}</strong></td>
      <td>${proj?.name||'General'}</td>
      <td style="font-size:12px">${w.location||'-'}</td>
      <td class="text-right">${matCount}</td>
      <td class="text-right"><strong>${fmtMoney(val)}</strong></td>
      <td>
        <button class="btn btn-xs btn-secondary" onclick="openWarehouseForm('${w.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-xs btn-danger"    onclick="deleteWarehouse('${w.id}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');

  return `<div class="filter-bar" style="margin-bottom:12px">
  <button class="btn btn-primary" onclick="openWarehouseForm()"><i class="fas fa-plus"></i> Nuevo Depósito</button>
</div>
<div class="card"><div class="card-body" style="padding:0">
${!whs.length
  ? `<div class="empty-state"><i class="fas fa-warehouse"></i><p>Sin depósitos. Agregue depósitos/almacenes de obra.</p></div>`
  : `<table><thead><tr>
      <th>Nombre</th><th>Proyecto</th><th>Ubicación</th>
      <th class="text-right">Materiales</th><th class="text-right">Valor Stock</th><th>Acciones</th>
    </tr></thead><tbody>${rows}</tbody></table>`}
</div></div>`;
}

// =====================================================================
// TAB: ALERTAS
// =====================================================================
function renderAlertsTab(alerts, mats, whs) {
  const rows = alerts.sort((a,b)=>(a.qty/a.minStock)-(b.qty/b.minStock)).map(l => {
    const pct = Math.round((l.qty / l.minStock) * 100);
    return `<tr>
      <td><strong>${l.materialCode||''}</strong></td>
      <td>${l.materialName}</td>
      <td>${l.warehouseName}</td>
      <td class="text-right"><span style="color:var(--danger);font-weight:700">${fmtNum(l.qty)}</span> ${l.unit||''}</td>
      <td class="text-right">${fmtNum(l.minStock)} ${l.unit||''}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden;min-width:80px">
            <div style="width:${pct}%;height:100%;background:${pct<50?'var(--danger)':'var(--warning)'}"></div>
          </div>
          <span style="font-size:12px;color:var(--danger)">${pct}%</span>
        </div>
      </td>
      <td>
        <button class="btn btn-xs btn-primary" onclick="openMovementForm('${l.materialId}','${l.warehouseId}')">
          <i class="fas fa-arrow-down"></i> Entrada
        </button>
      </td>
    </tr>`;
  }).join('');

  return `<div class="card"><div class="card-body" style="padding:0">
<table><thead><tr>
  <th>Código</th><th>Material</th><th>Depósito</th>
  <th class="text-right">Stock Actual</th><th class="text-right">Stock Mínimo</th>
  <th>Nivel</th><th>Acción</th>
</tr></thead><tbody>${rows}</tbody></table>
</div></div>`;
}

// =====================================================================
// FORM: WAREHOUSE
// =====================================================================
function openWarehouseForm(id) {
  const w = id ? DB.getById('stockWarehouses', id) : null;
  const projects = DB.getAll('projects');

  const body = `<div class="form-grid" style="grid-template-columns:1fr 1fr">
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">Nombre del Depósito *</label>
    <input class="form-control" id="wh-name" value="${w?.name||''}" placeholder="Ej: Depósito Central, Almacén Obra Norte">
  </div>
  <div class="form-group">
    <label class="form-label">Proyecto</label>
    <select class="form-control" id="wh-project">
      <option value="">General (sin proyecto)</option>
      ${projects.map(p=>`<option value="${p.id}" ${w?.project_id===p.id?'selected':''}>${p.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Ubicación</label>
    <input class="form-control" id="wh-location" value="${w?.location||''}" placeholder="Ej: Galpón A, Sector Norte">
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">Descripción</label>
    <textarea class="form-control" id="wh-desc" rows="2">${w?.description||''}</textarea>
  </div>
</div>`;

  openModal(id ? 'Editar Depósito' : 'Nuevo Depósito', body, 'md',
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary" onclick="saveWarehouse('${id||''}')"><i class="fas fa-save"></i> Guardar</button>`);
}

function saveWarehouse(id) {
  const name = document.getElementById('wh-name').value.trim();
  if (!name) { toast('El nombre es obligatorio', 'error'); return; }

  const data = {
    name,
    project_id: document.getElementById('wh-project').value,
    location:   document.getElementById('wh-location').value.trim(),
    description:document.getElementById('wh-desc').value.trim()
  };

  if (id) {
    DB.update('stockWarehouses', id, data);
    toast('Depósito actualizado', 'success');
  } else {
    DB.insert('stockWarehouses', data);
    toast('Depósito creado', 'success');
  }
  closeModal();
  renderStock();
}

function deleteWarehouse(id) {
  confirmDialog('¿Eliminar este depósito? Se perderán los movimientos asociados.', function() {
    DB.remove('stockWarehouses', id);
    toast('Depósito eliminado', 'success');
    renderStock();
  });
}

// =====================================================================
// FORM: MATERIAL
// =====================================================================
function openMaterialForm(id) {
  const m = id ? DB.getById('stockMaterials', id) : null;

  const body = `<div class="form-grid" style="grid-template-columns:1fr 1fr">
  <div class="form-group">
    <label class="form-label">Código</label>
    <input class="form-control" id="mat-code" value="${m?.code||''}" placeholder="MAT-001">
  </div>
  <div class="form-group">
    <label class="form-label">Categoría</label>
    <select class="form-control" id="mat-cat">
      ${STOCK_CATEGORIES.map(c=>`<option ${m?.category===c?'selected':''}>${c}</option>`).join('')}
    </select>
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">Nombre *</label>
    <input class="form-control" id="mat-name" value="${m?.name||''}" placeholder="Ej: Cemento Portland 50kg">
  </div>
  <div class="form-group">
    <label class="form-label">Unidad de Medida</label>
    <input class="form-control" id="mat-unit" value="${m?.unit||''}" placeholder="kg, m, m², m³, unid…">
  </div>
  <div class="form-group">
    <label class="form-label">Stock Mínimo</label>
    <input class="form-control" id="mat-minstock" type="number" min="0" step="0.01" value="${m?.min_stock||0}">
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">Descripción</label>
    <textarea class="form-control" id="mat-desc" rows="2">${m?.description||''}</textarea>
  </div>
</div>`;

  openModal(id ? 'Editar Material' : 'Nuevo Material', body, 'md',
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary" onclick="saveMaterial('${id||''}')"><i class="fas fa-save"></i> Guardar</button>`);
}

function saveMaterial(id) {
  const name = document.getElementById('mat-name').value.trim();
  if (!name) { toast('El nombre es obligatorio', 'error'); return; }

  const data = {
    code:       document.getElementById('mat-code').value.trim(),
    name,
    category:   document.getElementById('mat-cat').value,
    unit:       document.getElementById('mat-unit').value.trim(),
    min_stock:  parseFloat(document.getElementById('mat-minstock').value)||0,
    description:document.getElementById('mat-desc').value.trim()
  };

  if (id) {
    DB.update('stockMaterials', id, data);
    toast('Material actualizado', 'success');
  } else {
    DB.insert('stockMaterials', data);
    toast('Material creado', 'success');
  }
  closeModal();
  renderStock();
}

function deleteMaterial(id) {
  const movs = DB.getAll('stockMovements');
  if (movs.some(m=>m.material_id===id)) {
    toast('No se puede eliminar: tiene movimientos asociados', 'error');
    return;
  }
  confirmDialog('¿Eliminar este material del catálogo?', function() {
    DB.remove('stockMaterials', id);
    toast('Material eliminado', 'success');
    renderStock();
  });
}

// =====================================================================
// FORM: MOVEMENT
// =====================================================================
function openMovementForm(presetMaterialId, presetWarehouseId) {
  const mats = DB.getAll('stockMaterials');
  const whs  = DB.getAll('stockWarehouses');

  if (!mats.length) { toast('Primero agregue materiales al catálogo', 'error'); return; }
  if (!whs.length)  { toast('Primero agregue depósitos/almacenes', 'error'); return; }

  const pos = DB.getAll('purchaseOrders') || [];

  const matOpts = mats.map(m=>`<option value="${m.id}" ${presetMaterialId===m.id?'selected':''}>${m.code?' ('+m.code+') ':' '}${m.name}</option>`).join('');
  const whOpts  = whs.map(w=>`<option value="${w.id}"  ${presetWarehouseId===w.id?'selected':''}>${w.name}</option>`).join('');
  const poOpts  = `<option value="">Sin referencia</option>${pos.map(p=>`<option value="${p.id}">OC ${p.number||p.id} — ${p.supplier_name||''}</option>`).join('')}`;

  const body = `<div class="form-grid" style="grid-template-columns:1fr 1fr">
  <div class="form-group">
    <label class="form-label">Fecha *</label>
    <input class="form-control" id="mov-date" type="date" value="${todayStr()}">
  </div>
  <div class="form-group">
    <label class="form-label">Tipo *</label>
    <select class="form-control" id="mov-type" onchange="movTypeChanged()">
      ${STOCK_MOV_TYPES.map(t=>`<option value="${t.id}" ${t.id==='entrada'?'selected':''}>${t.label}</option>`).join('')}
    </select>
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">Material *</label>
    <select class="form-control" id="mov-material">${matOpts}</select>
  </div>
  <div class="form-group" id="mov-wh-group">
    <label class="form-label" id="mov-wh-label">Depósito *</label>
    <select class="form-control" id="mov-wh">${whOpts}</select>
  </div>
  <div class="form-group" id="mov-dest-group" style="display:none">
    <label class="form-label">Depósito Destino *</label>
    <select class="form-control" id="mov-dest-wh">${whOpts}</select>
  </div>
  <div class="form-group">
    <label class="form-label">Cantidad *</label>
    <input class="form-control" id="mov-qty" type="number" min="0.001" step="0.001" placeholder="0.00">
  </div>
  <div class="form-group" id="mov-cost-group">
    <label class="form-label">Costo Unitario</label>
    <input class="form-control" id="mov-cost" type="number" min="0" step="0.01" value="0" placeholder="0.00">
  </div>
  <div class="form-group">
    <label class="form-label">Referencia OC</label>
    <select class="form-control" id="mov-ref-po">${poOpts}</select>
  </div>
  <div class="form-group" style="grid-column:1/-1">
    <label class="form-label">Notas</label>
    <input class="form-control" id="mov-notes" placeholder="Observaciones, número de remito, etc.">
  </div>
</div>`;

  openModal('Nuevo Movimiento de Stock', body, 'md',
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary" onclick="saveMovement()"><i class="fas fa-save"></i> Registrar</button>`);
}

function movTypeChanged() {
  const type = document.getElementById('mov-type').value;
  const destG = document.getElementById('mov-dest-group');
  const whG   = document.getElementById('mov-wh-group');
  const costG = document.getElementById('mov-cost-group');
  const whLbl = document.getElementById('mov-wh-label');

  destG.style.display = (type === 'transferencia') ? '' : 'none';
  costG.style.display = (type === 'salida') ? 'none' : '';
  whLbl.textContent   = (type === 'transferencia') ? 'Depósito Origen *' : 'Depósito *';
}

function saveMovement() {
  const type    = document.getElementById('mov-type').value;
  const matId   = document.getElementById('mov-material').value;
  const whId    = document.getElementById('mov-wh').value;
  const destWhId= document.getElementById('mov-dest-wh')?.value||'';
  const qty     = parseFloat(document.getElementById('mov-qty').value)||0;
  const cost    = parseFloat(document.getElementById('mov-cost').value)||0;
  const date    = document.getElementById('mov-date').value;
  const refPo   = document.getElementById('mov-ref-po').value;
  const notes   = document.getElementById('mov-notes').value.trim();

  if (!date)  { toast('Fecha obligatoria', 'error'); return; }
  if (!matId) { toast('Seleccione un material', 'error'); return; }
  if (!whId)  { toast('Seleccione un depósito', 'error'); return; }
  if (qty <= 0) { toast('La cantidad debe ser mayor a 0', 'error'); return; }
  if (type === 'transferencia' && !destWhId) { toast('Seleccione depósito destino', 'error'); return; }
  if (type === 'transferencia' && destWhId === whId) { toast('Origen y destino no pueden ser el mismo', 'error'); return; }

  // Check sufficient stock for salida/transferencia
  if (type === 'salida' || type === 'transferencia') {
    const movs  = DB.getAll('stockMovements');
    const mats  = DB.getAll('stockMaterials');
    const whs   = DB.getAll('stockWarehouses');
    const level = computeStockForPair(matId, whId, movs);
    if (level.qty < qty) {
      toast(`Stock insuficiente: disponible ${fmtNum(level.qty)}, solicitado ${fmtNum(qty)}`, 'error');
      return;
    }
  }

  const data = {
    date, type,
    material_id:       matId,
    warehouse_id:      whId,
    dest_warehouse_id: type === 'transferencia' ? destWhId : '',
    qty,
    unit_cost:         (type === 'salida') ? 0 : cost,
    ref_id:            refPo,
    ref_type:          refPo ? 'oc' : 'manual',
    notes
  };

  DB.insert('stockMovements', data);
  toast('Movimiento registrado', 'success');
  closeModal();
  renderStock();
}

function deleteMovement(id) {
  confirmDialog('¿Eliminar este movimiento? Afectará el stock calculado.', function() {
    DB.remove('stockMovements', id);
    toast('Movimiento eliminado', 'success');
    renderStock();
  });
}

// =====================================================================
// STOCK HISTORY (detail per material + warehouse)
// =====================================================================
function showStockHistory(materialId, warehouseId) {
  const mats = DB.getAll('stockMaterials');
  const whs  = DB.getAll('stockWarehouses');
  const movs = DB.getAll('stockMovements');

  const mat = mats.find(m=>m.id===materialId);
  const wh  = whs.find(w=>w.id===warehouseId);

  const relevant = movs.filter(m =>
    m.material_id === materialId &&
    (m.warehouse_id === warehouseId || m.dest_warehouse_id === warehouseId)
  ).sort((a,b)=>a.date.localeCompare(b.date));

  let runQty = 0, runAvg = 0;
  const rows = relevant.map(m => {
    const q  = parseFloat(m.qty)||0;
    const uc = parseFloat(m.unit_cost)||0;
    let delta = 0;
    if (m.type==='entrada' || (m.type==='transferencia' && m.dest_warehouse_id===warehouseId)) {
      runAvg  = (runAvg * runQty + uc * q) / (runQty + q || 1);
      runQty += q;
      delta   = q;
    } else if (m.type==='salida' || (m.type==='transferencia' && m.warehouse_id===warehouseId)) {
      delta   = -q;
      runQty  = Math.max(0, runQty - q);
    } else if (m.type==='ajuste') {
      delta   = q - runQty;
      runQty  = q;
      runAvg  = uc || runAvg;
    }
    return `<tr>
      <td>${fmtDate(m.date)}</td>
      <td>${m.type}</td>
      <td class="text-right" style="color:${delta>=0?'var(--success)':'var(--danger)'}">${delta>=0?'+':''}${fmtNum(delta)}</td>
      <td class="text-right"><strong>${fmtNum(runQty)}</strong></td>
      <td class="text-right">${fmtMoney(runAvg)}</td>
      <td class="text-right">${fmtMoney(runQty*runAvg)}</td>
      <td style="font-size:11px">${m.notes||''}</td>
    </tr>`;
  }).join('');

  const body = `<h4 style="margin-bottom:8px">${mat?.name||materialId} — ${wh?.name||warehouseId}</h4>
<div class="card"><div class="card-body" style="padding:0;max-height:400px;overflow-y:auto">
${!relevant.length
  ? '<div class="empty-state" style="padding:32px"><p>Sin movimientos</p></div>'
  : `<table><thead><tr>
      <th>Fecha</th><th>Tipo</th><th class="text-right">Delta</th><th class="text-right">Stock</th>
      <th class="text-right">Costo Prom.</th><th class="text-right">Valor</th><th>Notas</th>
    </tr></thead><tbody>${rows}</tbody></table>`}
</div></div>`;

  openModal('Historial de Stock', body, 'lg', '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
}

// =====================================================================
// EXPORT
// =====================================================================
function exportStock() {
  const mats   = DB.getAll('stockMaterials');
  const whs    = DB.getAll('stockWarehouses');
  const movs   = DB.getAll('stockMovements');
  const levels = computeAllStockLevels(mats, whs, movs);

  exportXLSX('stock_actual', ['Código','Material','Categoría','Unidad','Depósito','Cantidad','Costo Prom.','Valor','Stock Mín.'],
    levels.map(l=>[l.materialCode||'', l.materialName, l.category||'', l.unit||'', l.warehouseName,
      l.qty, l.avgCost, l.value, l.minStock||0]));
}
