/* ===== CÓMPUTO Y PRESUPUESTO ===== */
function renderPresupuesto() {
  const projects = DB.getAll('projects');
  const activeProjectId = window.APP_STATE.activeProject;
  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div><div class="page-title">Cómputo y Presupuesto</div><div class="page-subtitle">Planilla de cómputo métrico, análisis de precios y presupuesto de obra</div></div>
  <div class="page-actions">
    <select class="form-control" id="pres-project-sel" onchange="loadBOQ(this.value)" style="min-width:220px"><option value="">Seleccionar proyecto...</option>${projects.map(p => `<option value="${p.id}" ${p.id===activeProjectId?'selected':''}>${p.name}</option>`).join('')}</select>
    <button class="btn btn-secondary" onclick="exportBOQ()"><i class="fas fa-download"></i> Exportar</button>
    <button class="btn btn-primary" onclick="openBOQItemForm()"><i class="fas fa-plus"></i> Nuevo Ítem</button>
  </div>
</div>
<div id="boq-container">${activeProjectId ? renderBOQ(activeProjectId) : `<div class="empty-state"><i class="fas fa-calculator"></i><p>Selección un proyecto para ver su cómputo</p></div>`}</div>`;
  if (activeProjectId) document.getElementById('pres-project-sel').value = activeProjectId;
}

function loadBOQ(projectId) {
  window.APP_STATE.activeProject = projectId;
  document.getElementById('boq-container').innerHTML = projectId ? renderBOQ(projectId) : `<div class="empty-state"><i class="fas fa-calculator"></i><p>Selección un proyecto</p></div>`;
}

function renderBOQ(projectId) {
  const items = DB.getAll('boqItems').filter(b => b.project_id === projectId);
  const project = DB.getById('projects', projectId);
  const totalBOQ = items.reduce((s, b) => s + (b.total || 0), 0);
  const chapters = {};
  items.forEach(item => { if (!chapters[item.chapter]) chapters[item.chapter] = { items: [], label: item.chapter }; chapters[item.chapter].items.push(item); });
  const catTotals = {};
  items.forEach(item => { catTotals[item.category] = (catTotals[item.category] || 0) + item.total; });

  setTimeout(() => {
    const ctx = document.getElementById('boq-cat-chart');
    if (ctx && Object.keys(catTotals).length) {
      new Chart(ctx, { type: 'pie', data: { labels: Object.keys(catTotals), datasets: [{ data: Object.values(catTotals), backgroundColor: ['#2563eb','#10b981','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } } });
    }
  }, 100);

  return `
<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-list"></i></div><div><div class="stat-value">${items.length}</div><div class="stat-label">Ítems Presupuestados</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-dollar-sign"></i></div><div><div class="stat-value">${fmtMoney(totalBOQ)}</div><div class="stat-label">Presupuesto BOQ</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-building"></i></div><div><div class="stat-value">${fmtMoney(project?.budget || 0)}</div><div class="stat-label">Presupuesto Proyecto</div></div></div>
  <div class="stat-card"><div class="stat-icon ${totalBOQ > (project?.budget||0) ? 'red' : 'cyan'}"><i class="fas fa-balance-scale"></i></div><div><div class="stat-value ${totalBOQ > (project?.budget||0) ? 'text-danger' : ''}">${fmtMoney(totalBOQ - (project?.budget||0))}</div><div class="stat-label">Diferencia BOQ vs Ppto</div></div></div>
</div>
<div class="card mt-2">
  <div class="card-header">
    <span class="card-title"><i class="fas fa-table text-primary"></i> Planilla de Cómputo</span>
    <div style="display:flex;gap:8px">
      <input class="form-control" style="width:200px;font-size:12px" placeholder="Filtrar ítems..." oninput="filterBOQItems(this.value, '${projectId}')">
      <select class="form-control" style="width:160px;font-size:12px" onchange="filterBOQItems(undefined, '${projectId}', this.value)"><option value="">Todas las categorías</option>${[...new Set(items.map(i=>i.category))].map(c => `<option value="${c}">${c}</option>`).join('')}</select>
    </div>
  </div>
  <div class="card-body" style="padding:0"><div class="table-wrap" id="boq-table">${buildBOQTable(items, chapters)}</div></div>
  <div class="card-footer" style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:12px;color:var(--text-muted)">${items.length} ítems</span><div><strong>Total BOQ: </strong><span style="font-size:16px;font-weight:700;color:var(--primary)">${fmtMoney(totalBOQ)}</span></div></div>
</div>
<div class="card mt-2">
  <div class="card-header"><span class="card-title"><i class="fas fa-chart-pie text-primary"></i> Distribución por Categoría</span></div>
  <div class="card-body">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:center">
      <div style="height:280px"><canvas id="boq-cat-chart"></canvas></div>
      <div>${Object.entries(catTotals).map(([cat, total]) => { const pct = totalBOQ ? (total / totalBOQ * 100) : 0; return `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>${cat}</span><span>${fmtPct(pct)} — ${fmtMoney(total)}</span></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div></div>`; }).join('')}</div>
    </div>
  </div>
</div>`;
}

function buildBOQTable(items, chapters) {
  if (!items.length) return `<div class="empty-state"><i class="fas fa-calculator"></i><p>No hay ítems. Agregá el primer ítem al presupuesto.</p></div>`;
  let rows = '';
  Object.values(chapters).forEach(ch => {
    const chTotal = ch.items.reduce((s,i) => s + i.total, 0);
    rows += `<tr style="background:#f1f5f9"><td colspan="8" style="font-weight:700;padding:8px 14px"><i class="fas fa-folder text-primary"></i> Capítulo ${ch.label} — ${fmtMoney(chTotal)}</td></tr>`;
    ch.items.forEach(item => {
      rows += `<tr><td style="padding-left:28px">${item.item}</td><td>${item.category}</td><td>${item.description}</td><td class="text-center">${item.unit}</td><td class="number-cell text-right">${fmtNum(item.quantity)}</td><td class="number-cell text-right">${fmtMoney(item.unit_price)}</td><td class="number-cell text-right"><strong>${fmtMoney(item.total)}</strong></td><td><div class="table-actions"><button class="btn-ghost btn btn-sm" onclick="openBOQItemForm('${item.id}')"><i class="fas fa-edit"></i></button><button class="btn-ghost btn btn-sm danger" onclick="deleteBOQItem('${item.id}')"><i class="fas fa-trash"></i></button></div></td></tr>`;
    });
  });
  return `<table><thead><tr><th>Ítem</th><th>Categoría</th><th>Descripción</th><th class="text-center">Unidad</th><th class="text-right">Cantidad</th><th class="text-right">P.Unitario</th><th class="text-right">Total</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table>`;
}

window._boqFilters = { q: '', category: '' };
function filterBOQItems(q, projectId, category) {
  if (q !== undefined) window._boqFilters.q = q.toLowerCase();
  if (category !== undefined) window._boqFilters.category = category;
  let items = DB.getAll('boqItems').filter(b => b.project_id === projectId);
  const f = window._boqFilters;
  if (f.q) items = items.filter(b => b.description.toLowerCase().includes(f.q));
  if (f.category) items = items.filter(b => b.category === f.category);
  const chapters = {};
  items.forEach(item => { if (!chapters[item.chapter]) chapters[item.chapter] = { items: [], label: item.chapter }; chapters[item.chapter].items.push(item); });
  const table = document.getElementById('boq-table');
  if (table) table.innerHTML = buildBOQTable(items, chapters);
}

function openBOQItemForm(id = null) {
  const item = id ? DB.getById('boqItems', id) : null;
  const projectId = document.getElementById('pres-project-sel')?.value || window.APP_STATE.activeProject;
  const projects = DB.getAll('projects');
  openModal(item ? 'Editar Ítem' : 'Nuevo Ítem de Presupuesto', `
<div class="form-grid form-grid-2">
  <div class="form-group"><label class="form-label">Proyecto *</label><select class="form-control" id="bi-project"><option value="">Seleccionar...</option>${projects.map(p => `<option value="${p.id}" ${(item?.project_id||projectId)===p.id?'selected':''}>${p.name}</option>`).join('')}</select></div>
  <div class="form-group"><label class="form-label">Categoría</label><input class="form-control" id="bi-category" value="${item?.category || ''}" placeholder="Estructura, Mampostería..."></div>
  <div class="form-group"><label class="form-label">Capítulo</label><input class="form-control" id="bi-chapter" value="${item?.chapter || '01'}"></div>
  <div class="form-group"><label class="form-label">Ítem</label><input class="form-control" id="bi-item" value="${item?.item || '01.01'}"></div>
  <div class="form-group full"><label class="form-label">Descripción *</label><input class="form-control" id="bi-desc" value="${item?.description || ''}"></div>
  <div class="form-group"><label class="form-label">Unidad</label><input class="form-control" id="bi-unit" value="${item?.unit || 'm2'}"></div>
  <div class="form-group"><label class="form-label">Cantidad</label><input class="form-control" id="bi-qty" type="number" min="0" step="0.01" value="${item?.quantity || 1}" oninput="updateBOQTotal()"></div>
  <div class="form-group"><label class="form-label">Precio Unitario</label><input class="form-control" id="bi-price" type="number" min="0" value="${item?.unit_price || 0}" oninput="updateBOQTotal()"></div>
  <div class="form-group"><label class="form-label">Total</label><input class="form-control" id="bi-total" readonly value="${fmtMoney(item?.total || 0)}" style="background:#f8fafc"></div>
</div>`, '', `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveBOQItem('${id||''}')"><i class="fas fa-save"></i> Guardar</button>`);
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
  const data = { project_id: projectId, category: document.getElementById('bi-category').value.trim(), chapter: document.getElementById('bi-chapter').value.trim(), item: document.getElementById('bi-item').value.trim(), description, unit: document.getElementById('bi-unit').value.trim(), quantity: qty, unit_price: price, total: qty * price };
  if (id) { DB.update('boqItems', id, data); toast('Ítem actualizado', 'success'); }
  else { DB.insert('boqItems', data); toast('Ítem agregado', 'success'); }
  closeModal(); loadBOQ(projectId);
}

function deleteBOQItem(id) {
  confirmDialog('¿Eliminar este ítem del presupuesto?', () => { const item = DB.getById('boqItems', id); DB.remove('boqItems', id); toast('Ítem eliminado', 'warning'); if (item) loadBOQ(item.project_id); });
}

function exportBOQ() {
  const projectId = document.getElementById('pres-project-sel')?.value;
  if (!projectId) { toast('Selección un proyecto', 'error'); return; }
  const items = DB.getAll('boqItems').filter(b => b.project_id === projectId);
  const proj = DB.getById('projects', projectId);
  exportCSV(`BOQ_${proj?.name?.replace(/\s+/g,'_') || projectId}.csv`, ['Capítulo','Ítem','Categoría','Descripción','Unidad','Cantidad','P.Unitario','Total'], items.map(b => [b.chapter, b.item, b.category, b.description, b.unit, b.quantity, b.unit_price, b.total]));
}
