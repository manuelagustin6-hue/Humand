/* ===== ÍNDICES DE AJUSTE ===== */
function renderIndices() {
  const indices = DB.getAll('priceIndices');

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Índices de Ajuste</div>
    <div class="page-subtitle">Índices de actualización de precios para contratos de obra</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-primary" onclick="openIndexForm()"><i class="fas fa-plus"></i> Nuevo Índice</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(${Math.min(indices.length,4)},1fr);margin-bottom:16px">
  ${indices.filter(i=>i.active!==false).map(idx => {
    const lastHistory = (idx.history||[]).slice(-2);
    const variation = lastHistory.length >= 2 ? ((lastHistory[1].value - lastHistory[0].value) / lastHistory[0].value * 100).toFixed(1) : 0;
    return `<div class="stat-card">
      <div class="stat-icon ${variation >= 0 ? 'red' : 'green'}"><i class="fas fa-chart-line"></i></div>
      <div>
        <div class="stat-value">${idx.current_value}</div>
        <div class="stat-label">${idx.code} — ${idx.name.split(' ').slice(0,3).join(' ')}</div>
        <div class="stat-delta ${variation >= 0 ? 'down' : 'up'}">
          ${variation >= 0 ? '+' : ''}${variation}% vs mes ant.
        </div>
      </div>
    </div>`;
  }).join('')}
</div>

<div id="idx-tabs">
  <div class="tabs">
    <button class="tab-btn" data-tab="tab-idx-list">Índices</button>
    <button class="tab-btn" data-tab="tab-idx-calc">Calculadora</button>
    <button class="tab-btn" data-tab="tab-idx-hist">Histórico</button>
  </div>

  <div id="tab-idx-list" class="tab-content">
    <div class="card"><div class="card-body" style="padding:0"><div class="table-wrap">
      <table><thead><tr>
        <th>Código</th><th>Nombre</th><th>Categoría</th><th>Fecha Base</th><th>Valor Base</th>
        <th class="text-right">Valor Actual</th><th>Última Actualización</th><th>Fuente</th><th>Acciones</th>
      </tr></thead>
      <tbody>
        ${indices.map(idx => `<tr>
          <td><strong>${idx.code}</strong></td>
          <td>${idx.name}</td>
          <td><span class="badge badge-blue">${idx.category||'-'}</span></td>
          <td>${fmtDate(idx.base_date)}</td>
          <td>${idx.base_value}</td>
          <td class="number-cell text-right" style="font-size:16px;font-weight:700;color:var(--primary)">${idx.current_value}</td>
          <td>${fmtDate(idx.last_update)}</td>
          <td style="font-size:11px;color:var(--text-muted)">${idx.source||'-'}</td>
          <td><div class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="openAddValueForm('${idx.id}')"><i class="fas fa-plus"></i> Valor</button>
            <button class="btn-ghost btn btn-sm" onclick="openIndexForm('${idx.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn-ghost btn btn-sm danger" onclick="deleteIndex('${idx.id}')"><i class="fas fa-trash"></i></button>
          </div></td>
        </tr>`).join('')}
      </tbody></table>
    </div></div></div>
  </div>

  <div id="tab-idx-calc" class="tab-content">
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="fas fa-calculator text-primary"></i> Calculadora de Redeterminación</span></div>
      <div class="card-body">
        <div class="form-grid form-grid-2">
          <div class="form-group">
            <label class="form-label">Índice a Usar</label>
            <select class="form-control" id="calc-index">
              ${indices.map(i => `<option value="${i.id}">${i.code} — ${i.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Monto Original</label>
            <input class="form-control" id="calc-amount" type="number" placeholder="0" oninput="calcIndexAdjust()">
          </div>
          <div class="form-group">
            <label class="form-label">Valor Índice Base (fecha contrato)</label>
            <input class="form-control" id="calc-base-val" type="number" placeholder="100" oninput="calcIndexAdjust()">
          </div>
          <div class="form-group">
            <label class="form-label">Valor Índice Actual</label>
            <input class="form-control" id="calc-curr-val" type="number" placeholder="342.5" oninput="calcIndexAdjust()">
          </div>
        </div>
        <div id="calc-result" style="margin-top:16px;padding:20px;background:var(--bg);border-radius:8px;text-align:center;display:none">
        </div>
        <button class="btn btn-primary mt-2" onclick="calcIndexAdjust()"><i class="fas fa-calculator"></i> Calcular Redeterminación</button>
      </div>
    </div>
  </div>

  <div id="tab-idx-hist" class="tab-content">
    ${buildIndexHistory(indices)}
  </div>
</div>
  `;
  initTabs('idx-tabs');

  document.getElementById('calc-index')?.addEventListener('change', function() {
    const idx = DB.getById('priceIndices', this.value);
    if (idx) {
      document.getElementById('calc-base-val').value = idx.base_value;
      document.getElementById('calc-curr-val').value = idx.current_value;
      calcIndexAdjust();
    }
  });
}

function buildIndexHistory(indices) {
  return indices.map(idx => {
    const history = (idx.history || []).slice().sort((a,b) => a.date.localeCompare(b.date));
    if (!history.length) return '';
    return `<div class="card mb-2">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-history text-primary"></i> ${idx.code} — ${idx.name}</span>
        <span class="badge badge-blue">${history.length} valores</span>
      </div>
      <div class="card-body" style="padding:0"><div class="table-wrap">
        <table><thead><tr><th>Fecha</th><th class="text-right">Valor</th><th class="text-right">Variación %</th></tr></thead>
        <tbody>
          ${history.map((h, i) => {
            const prev = i > 0 ? history[i-1].value : h.value;
            const var_pct = prev ? ((h.value - prev) / prev * 100).toFixed(2) : 0;
            return `<tr>
              <td>${fmtDate(h.date)}</td>
              <td class="number-cell text-right"><strong>${h.value}</strong></td>
              <td class="text-right ${var_pct > 0 ? 'text-danger' : 'text-success'}">${i > 0 ? (var_pct > 0 ? '+' : '') + var_pct + '%' : '-'}</td>
            </tr>`;
          }).join('')}
        </tbody></table>
      </div></div>
    </div>`;
  }).join('') || `<div class="empty-state"><i class="fas fa-history"></i><p>Sin historial</p></div>`;
}

function calcIndexAdjust() {
  const amount = parseFloat(document.getElementById('calc-amount')?.value) || 0;
  const baseVal = parseFloat(document.getElementById('calc-base-val')?.value) || 1;
  const currVal = parseFloat(document.getElementById('calc-curr-val')?.value) || 1;
  if (!amount) return;

  const factor = currVal / baseVal;
  const adjusted = amount * factor;
  const increase = adjusted - amount;
  const pct = ((factor - 1) * 100).toFixed(2);

  const el = document.getElementById('calc-result');
  if (el) {
    el.style.display = 'block';
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
        <div><div style="font-size:12px;color:var(--text-muted)">Monto Original</div><div style="font-size:22px;font-weight:700">${fmtMoney(amount)}</div></div>
        <div><div style="font-size:12px;color:var(--text-muted)">Factor de Ajuste</div><div style="font-size:22px;font-weight:700;color:var(--warning)">${factor.toFixed(4)}</div></div>
        <div><div style="font-size:12px;color:var(--text-muted)">Monto Redeterminado</div><div style="font-size:22px;font-weight:700;color:var(--primary)">${fmtMoney(adjusted)}</div></div>
      </div>
      <div style="margin-top:12px;font-size:14px">
        <span class="text-danger">↑ Variación: +${pct}% &nbsp;|&nbsp; Incremento: ${fmtMoney(increase)}</span>
      </div>
    `;
  }
}

function openIndexForm(id = null) {
  const idx = id ? DB.getById('priceIndices', id) : null;
  openModal(idx ? 'Editar Índice' : 'Nuevo Índice de Ajuste', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Código *</label>
    <input class="form-control" id="ix-code" value="${idx?.code || ''}" placeholder="CAC, ICC, MO">
  </div>
  <div class="form-group">
    <label class="form-label">Categoría</label>
    <input class="form-control" id="ix-cat" value="${idx?.category || ''}" placeholder="General, Materiales, Mano de Obra">
  </div>
  <div class="form-group full">
    <label class="form-label">Nombre *</label>
    <input class="form-control" id="ix-name" value="${idx?.name || ''}" placeholder="Índice General de la Construcción">
  </div>
  <div class="form-group">
    <label class="form-label">Fecha Base</label>
    <input class="form-control" id="ix-base-date" type="date" value="${idx?.base_date || '2020-01-01'}">
  </div>
  <div class="form-group">
    <label class="form-label">Valor Base</label>
    <input class="form-control" id="ix-base-val" type="number" value="${idx?.base_value || 100}">
  </div>
  <div class="form-group">
    <label class="form-label">Valor Actual</label>
    <input class="form-control" id="ix-curr-val" type="number" value="${idx?.current_value || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">Última Actualización</label>
    <input class="form-control" id="ix-last-update" type="date" value="${idx?.last_update || todayStr()}">
  </div>
  <div class="form-group full">
    <label class="form-label">Fuente</label>
    <input class="form-control" id="ix-source" value="${idx?.source || ''}" placeholder="CAC, INDEC, UOCRA...">
  </div>
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveIndex('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
}

function saveIndex(id) {
  const code = document.getElementById('ix-code').value.trim();
  const name = document.getElementById('ix-name').value.trim();
  if (!code || !name) { toast('Código y nombre son obligatorios', 'error'); return; }

  const currVal = parseFloat(document.getElementById('ix-curr-val').value) || 0;
  const lastUpdate = document.getElementById('ix-last-update').value;

  const data = {
    code, name,
    category: document.getElementById('ix-cat').value.trim(),
    base_date: document.getElementById('ix-base-date').value,
    base_value: parseFloat(document.getElementById('ix-base-val').value) || 100,
    current_value: currVal,
    last_update: lastUpdate,
    source: document.getElementById('ix-source').value.trim(),
    active: true,
  };

  if (id) {
    const existing = DB.getById('priceIndices', id);
    const history = existing?.history || [];
    if (currVal && currVal !== existing?.current_value) {
      history.push({ date: lastUpdate, value: currVal });
    }
    DB.update('priceIndices', id, { ...data, history });
    toast('Índice actualizado', 'success');
  } else {
    data.history = currVal ? [{ date: lastUpdate, value: currVal }] : [];
    DB.insert('priceIndices', data);
    toast('Índice creado', 'success');
  }
  closeModal();
  renderIndices();
}

function openAddValueForm(id) {
  const idx = DB.getById('priceIndices', id);
  openModal(`Agregar Valor — ${idx.name}`, `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Fecha *</label>
    <input class="form-control" id="av-date" type="date" value="${todayStr()}">
  </div>
  <div class="form-group">
    <label class="form-label">Nuevo Valor *</label>
    <input class="form-control" id="av-value" type="number" step="0.01" placeholder="Ej: 355.8">
  </div>
</div>
<div style="background:var(--bg);padding:10px;border-radius:6px;font-size:12px;margin-top:8px">
  Valor actual: <strong>${idx.current_value}</strong> (${fmtDate(idx.last_update)})
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="addIndexValue('${id}')"><i class="fas fa-plus"></i> Agregar</button>
`);
}

function addIndexValue(id) {
  const date = document.getElementById('av-date').value;
  const value = parseFloat(document.getElementById('av-value').value);
  if (!date || !value) { toast('Fecha y valor son obligatorios', 'error'); return; }

  const idx = DB.getById('priceIndices', id);
  const history = [...(idx.history||[]), { date, value }].sort((a,b)=>a.date.localeCompare(b.date));
  DB.update('priceIndices', id, { current_value: value, last_update: date, history });
  toast('Valor agregado', 'success');
  closeModal();
  renderIndices();
}

function deleteIndex(id) {
  confirmDialog('¿Eliminar este índice?', () => {
    DB.remove('priceIndices', id);
    toast('Índice eliminado', 'warning');
    renderIndices();
  });
}
