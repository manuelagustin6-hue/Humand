/* ===== CÓMPUTO Y PRESUPUESTO ===== */
function renderPresupuesto() {
  const projects = DB.getAll('projects');
  const activeProjectId = window.APP_STATE.activeProject;

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-eyebrow"><i class="fas fa-calculator" style="font-size:14px"></i> Obra</div>
    <div class="page-title">Cómputo y Presupuesto</div>
    <div class="page-subtitle">Planilla de cómputo métrico, análisis de precios y presupuesto de obra</div>
  </div>
  <div class="page-actions">
    <select class="form-control" id="pres-project-sel" onchange="loadBOQ(this.value)" style="min-width:220px">
      <option value="">Seleccionar proyecto...</option>
      ${projects.map(p => `<option value="${p.id}" ${p.id===activeProjectId?'selected':''}>${p.name}</option>`).join('')}
    </select>
    <button class="btn btn-secondary" onclick="openBase0(window.APP_STATE.activeProject)"><i class="fas fa-camera"></i> Base 0</button>
    <button class="btn btn-secondary" onclick="exportBOQ()"><i class="fas fa-download"></i> Exportar</button>
    <button class="btn btn-primary" onclick="openBOQItemForm()"><i class="fas fa-plus"></i> Nuevo Ítem</button>
  </div>
</div>
<div id="boq-container">
  ${activeProjectId ? renderBOQ(activeProjectId) : `<div class="empty-state"><i class="fas fa-calculator"></i><p>Seleccioná un proyecto para ver su cómputo y presupuesto</p></div>`}
</div>
  `;

  if (activeProjectId) document.getElementById('pres-project-sel').value = activeProjectId;
}

function loadBOQ(projectId) {
  window.APP_STATE.activeProject = projectId;
  document.getElementById('boq-container').innerHTML = projectId ? renderBOQ(projectId) : `<div class="empty-state"><i class="fas fa-calculator"></i><p>Seleccioná un proyecto</p></div>`;
}

/* ===== BASE 0 — presupuesto inicial inmutable, versionado por fecha ===== */
function openBase0(projectId) {
  if (!projectId) { toast('Seleccioná un proyecto primero', 'warning'); return; }
  var versions = DB.getAll('budgetBaselines').filter(function (b) { return b.project_id === projectId; })
    .sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') || (b.version - a.version); });
  var items = DB.getAll('boqItems').filter(function (b) { return b.project_id === projectId; });
  var curTotal = items.reduce(function (s, b) { return s + (b.total || 0); }, 0);
  var rows = versions.length ? versions.map(function (v) {
    return '<tr>' +
      '<td><strong>' + escapeHtml(v.label || ('Base 0 v' + v.version)) + '</strong></td>' +
      '<td>' + fmtDate(v.date) + '</td>' +
      '<td class="number-cell text-right">' + (v.items || []).length + '</td>' +
      '<td class="number-cell text-right">' + fmtMoney(v.total || 0) + '</td>' +
      '<td><button class="btn btn-sm btn-secondary" onclick="viewBase0(\'' + v.id + '\')"><i class="fas fa-eye"></i></button></td>' +
      '</tr>';
  }).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:16px">Sin versiones. Congelá la primera Base 0.</td></tr>';
  var body =
    '<p style="font-size:13px;color:var(--text-muted);margin-bottom:10px">La Base 0 es una foto <strong>inmutable</strong> del cómputo, para comparar contra la ejecución. Cómputo actual: <strong>' + items.length + ' ítems · ' + fmtMoney(curTotal) + '</strong>.</p>' +
    '<div class="table-wrap"><table><thead><tr><th>Versión</th><th>Fecha</th><th class="text-right">Ítems</th><th class="text-right">Total</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  openModal('Base 0 — versiones del presupuesto', body, 'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>' +
    '<button class="btn btn-primary" onclick="congelarBase0(\'' + projectId + '\')"><i class="fas fa-camera"></i> Congelar Base 0 actual</button>');
}

function congelarBase0(projectId) {
  var items = DB.getAll('boqItems').filter(function (b) { return b.project_id === projectId; });
  if (!items.length) { toast('El cómputo está vacío: no hay nada para congelar', 'error'); return; }
  var existing = DB.getAll('budgetBaselines').filter(function (b) { return b.project_id === projectId; });
  var version = existing.length + 1;
  var snapshot = items.map(function (b) {
    return { chapter: b.chapter, item: b.item, category: b.category, description: b.description, unit: b.unit, quantity: b.quantity, unit_price: b.unit_price, total: b.total };
  });
  var total = snapshot.reduce(function (s, b) { return s + (b.total || 0); }, 0);
  DB.insert('budgetBaselines', { project_id: projectId, version: version, label: 'Base 0 v' + version, date: todayStr(), items: snapshot, total: total });
  toast('Base 0 v' + version + ' congelada (' + snapshot.length + ' ítems · ' + fmtMoney(total) + ')', 'success');
  openBase0(projectId);
}

function viewBase0(id) {
  var v = DB.getById('budgetBaselines', id);
  if (!v) return;
  var rows = (v.items || []).map(function (it) {
    return '<tr><td>' + escapeHtml(it.chapter || '') + '</td><td>' + escapeHtml(it.description || '') + '</td><td>' + escapeHtml(it.unit || '') +
      '</td><td class="number-cell text-right">' + fmtNum(it.quantity) + '</td><td class="number-cell text-right">' + fmtMoney(it.unit_price) +
      '</td><td class="number-cell text-right">' + fmtMoney(it.total) + '</td></tr>';
  }).join('');
  openModal(escapeHtml(v.label || 'Base 0') + ' — ' + fmtDate(v.date) + ' (solo lectura)',
    '<div class="table-wrap"><table><thead><tr><th>Cap.</th><th>Descripción</th><th>Un.</th><th class="text-right">Cant.</th><th class="text-right">P.Unit</th><th class="text-right">Total</th></tr></thead><tbody>' + rows + '</tbody>' +
    '<tfoot><tr class="total-row"><td colspan="5" class="text-right">Total</td><td class="number-cell text-right">' + fmtMoney(v.total || 0) + '</td></tr></tfoot></table></div>',
    'modal-lg', '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
}

function renderBOQ(projectId) {
  const items = DB.getAll('boqItems').filter(b => b.project_id === projectId);
  const project = DB.getById('projects', projectId);
  const totalBOQ = items.reduce((s, b) => s + (b.total || 0), 0);

  // Group by chapter
  const chapters = {};
  items.forEach(item => {
    if (!chapters[item.chapter]) chapters[item.chapter] = { items: [], label: item.chapter };
    chapters[item.chapter].items.push(item);
  });

  // Category chart data
  const catTotals = {};
  items.forEach(item => {
    catTotals[item.category] = (catTotals[item.category] || 0) + item.total;
  });

  return `
<!-- SUMMARY CARDS -->
<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-list"></i></div><div>
    <div class="stat-value">${items.length}</div><div class="stat-label">Ítems Presupuestados</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-dollar-sign"></i></div><div>
    <div class="stat-value">${fmtMoney(totalBOQ)}</div><div class="stat-label">Presupuesto BOQ</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-building"></i></div><div>
    <div class="stat-value">${fmtMoney(project?.budget || 0)}</div><div class="stat-label">Presupuesto Proyecto</div></div></div>
  <div class="stat-card"><div class="stat-icon ${totalBOQ > (project?.budget||0) ? 'red' : 'cyan'}"><i class="fas fa-balance-scale"></i></div><div>
    <div class="stat-value ${totalBOQ > (project?.budget||0) ? 'text-danger' : ''}">${fmtMoney(totalBOQ - (project?.budget||0))}</div>
    <div class="stat-label">Diferencia BOQ vs Ppto</div></div></div>
</div>

<div class="grid-2 mt-2">
  <!-- BOQ TABLE -->
  <div class="card" style="grid-column:1/-1">
    <div class="card-header">
      <span class="card-title"><i class="fas fa-table text-primary"></i> Planilla de Cómputo</span>
      <div style="display:flex;gap:8px">
        <input class="form-control" style="width:200px;font-size:12px" placeholder="Filtrar ítems..." oninput="filterBOQItems(this.value, '${projectId}')">
        <select class="form-control" style="width:160px;font-size:12px" onchange="filterBOQItems(undefined, '${projectId}', this.value)">
          <option value="">Todas las categorías</option>
          ${[...new Set(items.map(i=>i.category))].map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="card-body" style="padding:0">
      <div class="table-wrap" id="boq-table">
        ${buildBOQTable(items, chapters)}
      </div>
    </div>
    <div class="card-footer" style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:12px;color:var(--text-muted)">${items.length} ítems</span>
      <div>
        <strong>Total BOQ: </strong>
        <span style="font-size:16px;font-weight:700;color:var(--primary)">${fmtMoney(totalBOQ)}</span>
      </div>
    </div>
  </div>
</div>

<!-- CATEGORY CHART -->
<div class="card mt-2">
  <div class="card-header"><span class="card-title"><i class="fas fa-chart-pie text-primary"></i> Distribución por Categoría</span></div>
  <div class="card-body">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:center">
      <div style="height:280px"><canvas id="boq-cat-chart"></canvas></div>
      <div>
        ${Object.entries(catTotals).map(([cat, total]) => {
          const pct = totalBOQ ? (total / totalBOQ * 100) : 0;
          return `<div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
              <span>${cat}</span><span>${fmtPct(pct)} — ${fmtMoney(total)}</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>
</div>
  `;

  // Render chart async
  setTimeout(() => {
    const ctx = document.getElementById('boq-cat-chart');
    if (ctx && Object.keys(catTotals).length) {
      new Chart(ctx, {
        type: 'pie',
        data: {
          labels: Object.keys(catTotals),
          datasets: [{ data: Object.values(catTotals), backgroundColor: ['#2563eb','#10b981','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }
      });
    }
  }, 100);
}

function buildBOQTable(items, chapters) {
  if (!items.length) return `<div class="empty-state"><i class="fas fa-calculator"></i><p>No hay ítems. Agregá el primer ítem al presupuesto.</p></div>`;

  let rows = '';
  Object.values(chapters).forEach(ch => {
    const chTotal = ch.items.reduce((s,i) => s + i.total, 0);
    rows += `<tr style="background:#f1f5f9">
      <td colspan="7" style="font-weight:700;color:var(--text);padding:8px 14px">
        <i class="fas fa-folder text-primary"></i> Capítulo ${ch.label} — ${fmtMoney(chTotal)}
      </td>
    </tr>`;
    ch.items.forEach(item => {
      rows += `<tr>
        <td style="padding-left:28px">${item.item}</td>
        <td>${item.category}</td>
        <td>${item.description}</td>
        <td class="text-center">${item.unit}</td>
        <td class="number-cell text-right">${fmtNum(item.quantity)}</td>
        <td class="number-cell text-right">${fmtMoney(item.unit_price)}</td>
        <td class="number-cell text-right"><strong>${fmtMoney(item.total)}</strong></td>
        <td><div class="table-actions">
          <button class="btn-ghost btn btn-sm" onclick="openBOQItemForm('${item.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn-ghost btn btn-sm danger" onclick="deleteBOQItem('${item.id}')"><i class="fas fa-trash"></i></button>
        </div></td>
      </tr>`;
    });
  });

  return `<table>
    <thead><tr>
      <th>Ítem</th><th>Categoría</th><th>Descripción</th><th class="text-center">Unidad</th>
      <th class="text-right">Cantidad</th><th class="text-right">P.Unitario</th><th class="text-right">Total</th><th>Acciones</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

window._boqFilters = { q: '', category: '' };
function filterBOQItems(q, projectId, category) {
  if (q !== undefined) window._boqFilters.q = q.toLowerCase();
  if (category !== undefined) window._boqFilters.category = category;

  let items = DB.getAll('boqItems').filter(b => b.project_id === projectId);
  const f = window._boqFilters;
  if (f.q) items = items.filter(b => b.description.toLowerCase().includes(f.q) || b.item.includes(f.q));
  if (f.category) items = items.filter(b => b.category === f.category);

  const chapters = {};
  items.forEach(item => {
    if (!chapters[item.chapter]) chapters[item.chapter] = { items: [], label: item.chapter };
    chapters[item.chapter].items.push(item);
  });

  const table = document.getElementById('boq-table');
  if (table) table.innerHTML = buildBOQTable(items, chapters);
}

function openBOQItemForm(id = null) {
  const item = id ? DB.getById('boqItems', id) : null;
  const projectId = document.getElementById('pres-project-sel')?.value || window.APP_STATE.activeProject;
  const projects = DB.getAll('projects');

  openModal(item ? 'Editar Ítem' : 'Nuevo Ítem de Presupuesto', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Proyecto *</label>
    <select class="form-control" id="bi-project">
      <option value="">Seleccionar...</option>
      ${projects.map(p => `<option value="${p.id}" ${(item?.project_id||projectId)===p.id?'selected':''}>${p.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Categoría</label>
    <input class="form-control" id="bi-category" value="${item?.category || ''}" list="cat-list" placeholder="Estructura, Mampostería...">
    <datalist id="cat-list">
      ${['Estructura','Mampostería','Instalaciones','Cerramiento','Terminaciones','Exterior','Varios'].map(c=>`<option value="${c}">`).join('')}
    </datalist>
  </div>
  <div class="form-group">
    <label class="form-label">Capítulo</label>
    <input class="form-control" id="bi-chapter" value="${item?.chapter || '01'}" placeholder="01, 02...">
  </div>
  <div class="form-group">
    <label class="form-label">Ítem</label>
    <input class="form-control" id="bi-item" value="${item?.item || '01.01'}" placeholder="01.01, 01.02...">
  </div>
  <div class="form-group full">
    <label class="form-label">Descripción *</label>
    <input class="form-control" id="bi-desc" value="${item?.description || ''}" placeholder="Descripción completa del ítem">
  </div>
  <div class="form-group">
    <label class="form-label">Unidad</label>
    <input class="form-control" id="bi-unit" value="${item?.unit || 'm2'}" list="unit-list">
    <datalist id="unit-list">
      ${['m2','m3','ml','kg','tn','un','Global','Bolsa','Módulo','Día'].map(u=>`<option value="${u}">`).join('')}
    </datalist>
  </div>
  <div class="form-group">
    <label class="form-label">Cantidad</label>
    <input class="form-control" id="bi-qty" type="number" min="0" step="0.01" value="${item?.quantity || 1}"
      oninput="updateBOQTotal()">
  </div>
  <div class="form-group">
    <label class="form-label">Precio Unitario</label>
    <input class="form-control" id="bi-price" type="number" min="0" value="${item?.unit_price || 0}"
      oninput="updateBOQTotal()">
  </div>
  <div class="form-group">
    <label class="form-label">Total</label>
    <input class="form-control" id="bi-total" readonly value="${fmtMoney(item?.total || 0)}" style="background:#f8fafc">
  </div>
  <div class="form-group full">
    <label class="form-label">Notas</label>
    <textarea class="form-control" id="bi-notes" rows="2">${item?.notes || ''}</textarea>
  </div>
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveBOQItem('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
}

function updateBOQTotal() {
  const qty = parseFloat(document.getElementById('bi-qty')?.value) || 0;
  const price = parseFloat(document.getElementById('bi-price')?.value) || 0;
  const totalEl = document.getElementById('bi-total');
  if (totalEl) totalEl.value = fmtMoney(qty * price);
}

function saveBOQItem(id) {
  const projectId = document.getElementById('bi-project').value;
  const description = document.getElementById('bi-desc').value.trim();
  if (!projectId || !description) { toast('Proyecto y descripción son obligatorios', 'error'); return; }

  const qty = parseFloat(document.getElementById('bi-qty').value) || 0;
  const price = parseFloat(document.getElementById('bi-price').value) || 0;

  const data = {
    project_id: projectId,
    category: document.getElementById('bi-category').value.trim(),
    chapter: document.getElementById('bi-chapter').value.trim(),
    item: document.getElementById('bi-item').value.trim(),
    description,
    unit: document.getElementById('bi-unit').value.trim(),
    quantity: qty,
    unit_price: price,
    total: qty * price,
    notes: document.getElementById('bi-notes').value.trim(),
  };

  if (id) { DB.update('boqItems', id, data); toast('Ítem actualizado', 'success'); }
  else { DB.insert('boqItems', data); toast('Ítem agregado', 'success'); }

  closeModal();
  loadBOQ(projectId);
}

function deleteBOQItem(id) {
  confirmDialog('¿Eliminar este ítem del presupuesto?', () => {
    const item = DB.getById('boqItems', id);
    DB.remove('boqItems', id);
    toast('Ítem eliminado', 'warning');
    if (item) loadBOQ(item.project_id);
  });
}

function exportBOQ() {
  const projectId = document.getElementById('pres-project-sel')?.value;
  if (!projectId) { toast('Seleccioná un proyecto', 'error'); return; }
  const items = DB.getAll('boqItems').filter(b => b.project_id === projectId);
  const proj = DB.getById('projects', projectId);
  exportXLSX(`BOQ_${proj?.name?.replace(/\s+/g,'_') || projectId}.xlsx`,
    ['Capítulo','Ítem','Categoría','Descripción','Unidad','Cantidad','P.Unitario','Total'],
    items.map(b => [b.chapter, b.item, b.category, b.description, b.unit, b.quantity, b.unit_price, b.total])
  );
}
