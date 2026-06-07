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
    <button id="btn-sync-indec" class="btn btn-secondary" onclick="syncIndicesINDEC()"><i class="fas fa-sync"></i> Sincronizar INDEC</button>
    <button class="btn btn-primary" onclick="openIndexForm()"><i class="fas fa-plus"></i> Nuevo Índice</button>
  </div>
</div>

<!-- CURRENT INDEX CARDS -->
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
    <button class="tab-btn" data-tab="tab-idx-uocra">Escalas UOCRA</button>
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

  <div id="tab-idx-uocra" class="tab-content">
    ${buildUOCRATab()}
  </div>
</div>
  `;
  initTabs('idx-tabs');

  // Auto-sync INDEC if stale (>7 days) or no indices yet
  var _idxLastSyncDate = localStorage.getItem('erp_last_indices_sync');
  var _hasICCIndices = DB.getAll('priceIndices').some(function(i) { return i.auto_sync; });
  if (!_idxLastSyncDate || !_hasICCIndices || (new Date() - new Date(_idxLastSyncDate)) > 7 * 86400000) {
    setTimeout(syncIndicesINDEC, 800);
  }

  // Auto-fill calc when index changes
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
    // add to history if value changed
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

// ===== INDEC ICC AUTO-SYNC =====

function syncIndicesINDEC() {
  var btn = document.getElementById('btn-sync-indec');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...'; }

  // Step 1: discover series IDs for the monthly ICC distribution
  fetch('https://apis.datos.gob.ar/series/api/search/?dataset=sspm-indice-costo-construccion-icc&limit=20&format=json')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var monthly = (res.data || []).filter(function(s) {
        return s.field && s.field.frequency === 'month' &&
               !((s.field.title || '').toLowerCase().includes('variaci'));
      });
      if (!monthly.length) throw new Error('No se encontraron series mensuales');

      var ids = monthly.map(function(s) { return s.field.id; }).join(',');
      if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Descargando...';
      return fetch('https://apis.datos.gob.ar/series/api/series/?ids=' + ids + '&format=json&limit=36&sort=asc');
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      _processINDECData(data);
    })
    .catch(function(e) {
      console.error('INDEC sync:', e);
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync"></i> Sincronizar INDEC'; }
      toast('No se pudo conectar con INDEC. Reintente más tarde.', 'error');
    });
}

function _classifyICCSeries(title) {
  var t = (title || '').toLowerCase();
  if (t.includes('variaci') || t.includes('tasa')) return null;
  if (t.includes('nivel general') || (t.includes('general') && !t.includes('gasto')))
    return { code: 'ICC-NG', name: 'ICC Nivel General', cat: 'General' };
  if (t.includes('material'))
    return { code: 'ICC-MAT', name: 'ICC Materiales', cat: 'Materiales' };
  if (t.includes('mano') || (t.includes('obra') && !t.includes('contrato')))
    return { code: 'ICC-MO', name: 'ICC Mano de Obra (UOCRA)', cat: 'Mano de Obra' };
  if (t.includes('gasto'))
    return { code: 'ICC-GG', name: 'ICC Gastos Generales', cat: 'Gastos Grles.' };
  return null;
}

function _processINDECData(data) {
  if (!data || !data.data || !data.meta) {
    toast('Respuesta inválida de INDEC', 'error');
    return;
  }

  var rows = data.data;
  // meta[0] = response-level, meta[1..N] = per-series
  var seriesMetas = data.meta.slice(1);
  var today = todayStr();
  var count = 0;

  for (var si = 0; si < seriesMetas.length; si++) {
    var sm = seriesMetas[si];
    var title = sm.field && sm.field.title || '';
    var cls = _classifyICCSeries(title);
    if (!cls) continue;

    var history = [];
    rows.forEach(function(row) {
      var val = row[si + 1];
      if (val !== null && val !== undefined) {
        var dateStr = typeof row[0] === 'string' && row[0].length === 7 ? row[0] + '-01' : row[0];
        history.push({ date: dateStr, value: Math.round(val * 100) / 100 });
      }
    });
    if (!history.length) continue;
    history.sort(function(a, b) { return a.date.localeCompare(b.date); });

    var latest = history[history.length - 1];
    var existing = DB.getAll('priceIndices').find(function(i) { return i.code === cls.code; });

    if (existing) {
      var existDates = {};
      (existing.history || []).forEach(function(h) { existDates[h.date] = true; });
      var newEntries = history.filter(function(h) { return !existDates[h.date]; });
      var merged = (existing.history || []).concat(newEntries);
      merged.sort(function(a, b) { return a.date.localeCompare(b.date); });
      DB.update('priceIndices', existing.id, {
        current_value: latest.value, last_update: latest.date,
        history: merged, synced_at: today
      });
    } else {
      DB.insert('priceIndices', {
        code: cls.code, name: cls.name, category: cls.cat,
        base_date: history[0].date, base_value: history[0].value,
        current_value: latest.value, last_update: latest.date,
        source: 'INDEC ICC — Gran Buenos Aires (base 1993=100)',
        active: true, history: history, synced_at: today, auto_sync: true
      });
    }
    count++;
  }

  localStorage.setItem('erp_last_indices_sync', today);
  if (count > 0) {
    toast(count + ' índices INDEC sincronizados (' + rows.length + ' meses)', 'success');
    renderIndices();
  } else {
    var btn = document.getElementById('btn-sync-indec');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync"></i> Sincronizar INDEC'; }
    toast('INDEC respondió pero no se reconocieron las series esperadas', 'warning');
  }
}

// ===== UOCRA WAGE SCALES =====

var _UOCRA_DEFAULTS = {
  updated: '2026-03-01',
  agreement: 'CCT 76/75 — Marzo 2026',
  categories: [
    { id: 'of_esp',   label: 'Oficial Especializado', zone_a: 5147, zone_b: 5713, zone_c: 8651 },
    { id: 'oficial',  label: 'Oficial',                zone_a: 4679, zone_b: 5196, zone_c: 7873 },
    { id: 'med_of',   label: 'Medio Oficial',           zone_a: 4094, zone_b: 4547, zone_c: 6888 },
    { id: 'ayudante', label: 'Ayudante',                zone_a: 3696, zone_b: 4103, zone_c: 6217 },
    { id: 'ayte_cuad',label: 'Ayudante de Cuadrilla',   zone_a: 3497, zone_b: 3882, zone_c: 5882 }
  ]
};

function _getUOCRAWages() {
  var global = DB.getGlobal();
  if (!global.uocraWages) {
    global.uocraWages = JSON.parse(JSON.stringify(_UOCRA_DEFAULTS));
    DB.saveGlobal(global);
  }
  return global.uocraWages;
}

function buildUOCRATab() {
  var wages = _getUOCRAWages();
  var cats = wages.categories || [];

  var rows = cats.map(function(c) {
    return '<tr>' +
      '<td><strong>' + c.label + '</strong></td>' +
      '<td class="number-cell text-right" id="uocra-a-' + c.id + '">' + fmtMoney(c.zone_a) + '</td>' +
      '<td class="number-cell text-right" id="uocra-b-' + c.id + '">' + fmtMoney(c.zone_b) + '</td>' +
      '<td class="number-cell text-right" id="uocra-c-' + c.id + '">' + fmtMoney(c.zone_c) + '</td>' +
      '</tr>';
  }).join('');

  return '<div class="card mb-2">' +
    '<div class="card-header">' +
    '<span class="card-title"><i class="fas fa-hard-hat text-primary"></i> Escalas Salariales UOCRA</span>' +
    '<div style="display:flex;align-items:center;gap:10px">' +
    '<span style="font-size:11px;color:var(--text-muted)">CCT 76/75 — ' + wages.agreement + ' · Act: ' + fmtDate(wages.updated) + '</span>' +
    '<a href="https://www.uocra.net/escalas_salariales/leyesdecretosytablas.htm" target="_blank" class="btn btn-sm btn-secondary"><i class="fas fa-external-link-alt"></i> UOCRA.net</a>' +
    '<button class="btn btn-sm btn-primary" onclick="openUOCRAEditForm()"><i class="fas fa-edit"></i> Actualizar</button>' +
    '</div>' +
    '</div>' +
    '<div class="card-body" style="padding:0">' +
    '<div class="table-wrap">' +
    '<table><thead><tr>' +
    '<th>Categoría</th>' +
    '<th class="text-right">Zona A<br><small style="font-weight:400;color:var(--text-muted)">CABA/GBA/mayoría del país</small></th>' +
    '<th class="text-right">Zona B<br><small style="font-weight:400;color:var(--text-muted)">Neuquén, Río Negro, Chubut</small></th>' +
    '<th class="text-right">Zona C<br><small style="font-weight:400;color:var(--text-muted)">Santa Cruz / TDF</small></th>' +
    '</tr></thead><tbody>' + rows + '</tbody>' +
    '<tfoot><tr style="background:var(--bg)">' +
    '<td style="font-size:11px;color:var(--text-muted);padding:8px 12px" colspan="4">' +
    '<i class="fas fa-info-circle"></i> Valores en ARS/hora. Zona B ≈ +11% · Zona C (Santa Cruz) ≈ +68% · Zona C-Austral (TdF) ≈ +100% sobre Zona A. ' +
    'El ICC Mano de Obra (ICC-MO) de INDEC refleja la evolución relativa derivada de los acuerdos UOCRA.' +
    '</td></tr></tfoot>' +
    '</table></div></div></div>' +

    '<div class="card">' +
    '<div class="card-header"><span class="card-title"><i class="fas fa-link text-primary"></i> Fuentes Oficiales</span></div>' +
    '<div class="card-body">' +
    '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
    _sourceLink('INDEC — ICC mensual', 'https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-33', 'Índice del Costo de la Construcción. Nivel general, materiales, mano de obra y gastos generales.') +
    _sourceLink('CAMARCO — Indicadores', 'https://www.camarco.org.ar/indicadores/', 'Indicador CAC mensual (base Dic 2014 = 100). Descargable como PDF/XLS.') +
    _sourceLink('IERIC — ICC/CAC XLS', 'https://www.ieric.org.ar/series_estadisticas/series-estadisticas-nacionales/', 'Archivo XLS actualizado mensualmente con ICC y CAC histórico.') +
    _sourceLink('UOCRA — Escalas', 'https://www.uocra.net/escalas_salariales/leyesdecretosytablas.htm', 'CCT 76/75. Escalas vigentes por zona y categoría.') +
    '</div></div></div>';
}

function _sourceLink(title, url, desc) {
  return '<a href="' + url + '" target="_blank" style="display:block;padding:12px 16px;background:var(--bg);border-radius:8px;border:1px solid var(--border);text-decoration:none;min-width:200px;flex:1;max-width:280px">' +
    '<div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:4px"><i class="fas fa-external-link-alt" style="font-size:10px;margin-right:4px"></i>' + title + '</div>' +
    '<div style="font-size:11px;color:var(--text-muted);line-height:1.4">' + desc + '</div>' +
    '</a>';
}

function openUOCRAEditForm() {
  var wages = _getUOCRAWages();
  var cats = wages.categories || [];

  var fields = cats.map(function(c) {
    return '<div class="form-group full" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;align-items:center">' +
      '<label class="form-label" style="margin:0">' + c.label + '</label>' +
      '<input class="form-control" id="uw-a-' + c.id + '" type="number" value="' + c.zone_a + '" placeholder="Zona A">' +
      '<input class="form-control" id="uw-b-' + c.id + '" type="number" value="' + c.zone_b + '" placeholder="Zona B">' +
      '<input class="form-control" id="uw-c-' + c.id + '" type="number" value="' + c.zone_c + '" placeholder="Zona C">' +
      '</div>';
  }).join('');

  var catIds = cats.map(function(c) { return c.id; }).join(',');

  openModal('Actualizar Escalas UOCRA',
    '<div class="form-group">' +
    '<label class="form-label">Acuerdo / Período</label>' +
    '<input class="form-control" id="uw-agreement" value="' + wages.agreement + '" placeholder="CCT 76/75 — Mes YYYY">' +
    '</div>' +
    '<div class="form-group">' +
    '<label class="form-label">Fecha de vigencia</label>' +
    '<input class="form-control" id="uw-date" type="date" value="' + wages.updated + '">' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;margin-bottom:4px;padding:0 4px">' +
    '<span style="font-size:11px;font-weight:600;color:var(--text-muted)">Categoría</span>' +
    '<span style="font-size:11px;font-weight:600;color:var(--text-muted);text-align:right">Zona A ($/h)</span>' +
    '<span style="font-size:11px;font-weight:600;color:var(--text-muted);text-align:right">Zona B ($/h)</span>' +
    '<span style="font-size:11px;font-weight:600;color:var(--text-muted);text-align:right">Zona C ($/h)</span>' +
    '</div>' +
    fields +
    '<input type="hidden" id="uw-catids" value="' + catIds + '">',
    '',
    '<a href="https://www.uocra.net/escalas_salariales/leyesdecretosytablas.htm" target="_blank" class="btn btn-secondary"><i class="fas fa-external-link-alt"></i> Ver UOCRA.net</a>' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="saveUOCRAWages()"><i class="fas fa-save"></i> Guardar</button>'
  );
}

function saveUOCRAWages() {
  var wages = _getUOCRAWages();
  wages.agreement = document.getElementById('uw-agreement').value.trim() || wages.agreement;
  wages.updated = document.getElementById('uw-date').value || wages.updated;

  var catIds = (document.getElementById('uw-catids').value || '').split(',');
  catIds.forEach(function(cid) {
    var cat = wages.categories.find(function(c) { return c.id === cid; });
    if (!cat) return;
    cat.zone_a = parseFloat(document.getElementById('uw-a-' + cid).value) || cat.zone_a;
    cat.zone_b = parseFloat(document.getElementById('uw-b-' + cid).value) || cat.zone_b;
    cat.zone_c = parseFloat(document.getElementById('uw-c-' + cid).value) || cat.zone_c;
  });

  var global = DB.getGlobal();
  global.uocraWages = wages;
  DB.saveGlobal(global);
  toast('Escalas UOCRA actualizadas', 'success');
  closeModal();
  renderIndices();
}
