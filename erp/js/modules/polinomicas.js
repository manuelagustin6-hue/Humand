/* ===== POLINÓMICAS DE REDETERMINACIÓN =====
 * Fórmula de ajuste compuesta por varios índices (priceIndices) con un peso de
 * incidencia (%). La suma de incidencias debe dar 100%. El factor de
 * redeterminación es Σ (incidencia_i/100) × (valor_actual_i / valor_base_i).
 * Complementa a "Índices de Ajuste" (indices.js), que maneja un índice simple.
 */

function _polyComps() { return window._polyComps || (window._polyComps = []); }
function _blankPolyComp() { return { index_id: '', incidencia: 0 }; }

// Factor de redeterminación y desglose por componente.
function polyFactor(poly) {
  var rows = (poly.components || []).map(function (c) {
    var idx = DB.getById('priceIndices', c.index_id);
    var base = idx ? Number(idx.base_value) : 0;
    var curr = idx ? Number(idx.current_value) : 0;
    var ratio = base > 0 ? curr / base : 0;
    var inc = Number(c.incidencia) || 0;
    return {
      ok: !!idx && base > 0,
      code: idx ? idx.code : '(índice eliminado)',
      name: idx ? idx.name : '',
      incidencia: inc,
      ratio: ratio,
      contrib: (inc / 100) * ratio,
    };
  });
  var factor = rows.reduce(function (s, r) { return s + r.contrib; }, 0);
  var sumInc = rows.reduce(function (s, r) { return s + r.incidencia; }, 0);
  return { factor: factor, rows: rows, sumInc: sumInc };
}

function renderPolinomicas() {
  var polys = DB.getAll('polynomials');
  var indices = DB.getAll('priceIndices');

  var avgFactor = polys.length
    ? (polys.reduce(function (s, p) { return s + polyFactor(p).factor; }, 0) / polys.length)
    : 0;
  var balanceadas = polys.filter(function (p) { return Math.round(polyFactor(p).sumInc) === 100; }).length;

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Polinómicas de Redeterminación</div>
    <div class="page-subtitle">Fórmulas de ajuste compuestas por varios índices con incidencia (%)</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-primary" onclick="openPolyForm()" ${indices.length ? '' : 'disabled title="Primero cargá índices en Índices de Ajuste"'}><i class="fas fa-plus"></i> Nueva Polinómica</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-percent"></i></div><div>
    <div class="stat-value">${polys.length}</div><div class="stat-label">Polinómicas</div></div></div>
  <div class="stat-card"><div class="stat-icon ${balanceadas === polys.length ? 'green' : 'yellow'}"><i class="fas fa-scale-balanced"></i></div><div>
    <div class="stat-value">${balanceadas}/${polys.length}</div><div class="stat-label">Con incidencias = 100%</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-chart-line"></i></div><div>
    <div class="stat-value">${avgFactor ? avgFactor.toFixed(3) : '—'}</div><div class="stat-label">Factor promedio</div></div></div>
</div>

<div id="poly-tabs">
  <div class="tabs">
    <button class="tab-btn" data-tab="tab-poly-list">Polinómicas</button>
    <button class="tab-btn" data-tab="tab-poly-calc">Calculadora</button>
  </div>

  <div id="tab-poly-list" class="tab-content">
    ${buildPolyTable(polys)}
  </div>

  <div id="tab-poly-calc" class="tab-content">
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="fas fa-calculator text-primary"></i> Calculadora de redeterminación</span></div>
      <div class="card-body">
        ${polys.length ? `
        <div class="form-grid form-grid-2">
          <div class="form-group">
            <label class="form-label">Polinómica</label>
            <select class="form-control" id="pcalc-poly" onchange="calcPoly()">
              ${polys.map(function (p) { return '<option value="' + p.id + '">' + escapeHtml(p.code + ' — ' + p.name) + '</option>'; }).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Monto original</label>
            <input class="form-control" id="pcalc-amount" type="number" min="0" placeholder="0" oninput="calcPoly()">
          </div>
        </div>
        <div id="pcalc-result" style="margin-top:16px"></div>
        ` : '<div class="empty-state"><i class="fas fa-calculator"></i><p>Creá una polinómica para usar la calculadora.</p></div>'}
      </div>
    </div>
  </div>
</div>`;

  document.getElementById('breadcrumb').innerHTML = '<i class="fas fa-percent"></i><span>Polinómicas</span>';
  initTabs('poly-tabs');
  if (polys.length) calcPoly();
}

function buildPolyTable(polys) {
  if (!polys.length) {
    return '<div class="empty-state"><i class="fas fa-percent"></i><p>No hay polinómicas. Creá la primera combinando índices de ajuste.</p></div>';
  }
  return `
  <div class="card"><div class="card-body" style="padding:0"><div class="table-wrap">
    <table><thead><tr>
      <th>Código</th><th>Nombre</th><th>Componentes</th><th class="text-right">Σ Incidencia</th><th class="text-right">Factor actual</th><th>Acciones</th>
    </tr></thead>
    <tbody>
      ${polys.map(function (p) {
        var f = polyFactor(p);
        var balanced = Math.round(f.sumInc) === 100;
        var comps = f.rows.map(function (r) { return escapeHtml(r.code) + ' ' + r.incidencia + '%'; }).join(' · ');
        return `<tr>
          <td><strong>${escapeHtml(p.code)}</strong></td>
          <td>${escapeHtml(p.name)}</td>
          <td style="font-size:12px;color:var(--text-muted)">${comps || '—'}</td>
          <td class="number-cell text-right">
            <span class="badge ${balanced ? 'badge-green' : 'badge-red'}">${f.sumInc.toFixed(0)}%</span>
          </td>
          <td class="number-cell text-right" style="font-weight:700;color:var(--primary)">${f.factor.toFixed(4)}</td>
          <td><div class="table-actions">
            <button class="btn-ghost btn btn-sm" onclick="openPolyForm('${p.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn-ghost btn btn-sm danger" onclick="deletePoly('${p.id}')"><i class="fas fa-trash"></i></button>
          </div></td>
        </tr>`;
      }).join('')}
    </tbody></table>
  </div></div></div>`;
}

function openPolyForm(id) {
  var poly = id ? DB.getById('polynomials', id) : null;
  var indices = DB.getAll('priceIndices');
  if (!indices.length) { toast('Primero cargá índices en "Índices de Ajuste"', 'warning'); return; }
  window._polyComps = (poly && poly.components ? poly.components.map(function (c) { return Object.assign({}, c); }) : [_blankPolyComp()]);
  var nextCode = poly ? poly.code : 'POL-' + (DB.getAll('polynomials').length + 1).toString().padStart(3, '0');

  openModal(poly ? 'Editar Polinómica' : 'Nueva Polinómica', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Código</label>
    <input class="form-control" id="poly-code" value="${escapeHtml(poly ? poly.code : nextCode)}">
  </div>
  <div class="form-group">
    <label class="form-label">Nombre *</label>
    <input class="form-control" id="poly-name" value="${escapeHtml(poly ? poly.name : '')}" placeholder="Ej.: Estructura de hormigón">
  </div>
  <div class="form-group full">
    <label class="form-label">Notas</label>
    <input class="form-control" id="poly-notes" value="${escapeHtml(poly ? (poly.notes || '') : '')}">
  </div>
</div>
<div class="divider"></div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
  <strong style="font-size:13px">Componentes (índice + incidencia %)</strong>
  <button class="btn btn-sm btn-secondary" onclick="polyAddRow()"><i class="fas fa-plus"></i> Agregar índice</button>
</div>
<div id="poly-comp-rows"></div>
<div id="poly-sum" style="text-align:right;font-size:13px;margin-top:8px"></div>
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="savePoly('${id || ''}')"><i class="fas fa-save"></i> Guardar</button>
`);
  _polyRenderRows();
}

function _polyIndexOptions(selected) {
  return DB.getAll('priceIndices').map(function (i) {
    return '<option value="' + i.id + '"' + (i.id === selected ? ' selected' : '') + '>' + escapeHtml(i.code + ' — ' + i.name) + '</option>';
  }).join('');
}

function _polyRenderRows() {
  var cont = document.getElementById('poly-comp-rows');
  if (!cont) return;
  var comps = _polyComps();
  cont.innerHTML = comps.map(function (c, i) {
    return `<div style="display:grid;grid-template-columns:1fr 120px 36px;gap:8px;margin-bottom:6px;align-items:center">
      <select class="form-control" style="font-size:12px" onchange="polyUpdateRow(${i},'index_id',this.value)">
        <option value="">Seleccionar índice…</option>
        ${_polyIndexOptions(c.index_id)}
      </select>
      <input class="form-control" style="font-size:12px" type="number" min="0" max="100" step="0.1" value="${c.incidencia}" placeholder="%" oninput="polyUpdateRow(${i},'incidencia',+this.value)">
      <button class="btn-ghost btn danger" onclick="polyRemoveRow(${i})"><i class="fas fa-times"></i></button>
    </div>`;
  }).join('');
  _polyRecalcSum();
}

function polyAddRow() { _polyComps().push(_blankPolyComp()); _polyRenderRows(); }
function polyRemoveRow(i) { _polyComps().splice(i, 1); if (!_polyComps().length) _polyComps().push(_blankPolyComp()); _polyRenderRows(); }
function polyUpdateRow(i, field, val) { var c = _polyComps()[i]; if (c) { c[field] = val; } _polyRecalcSum(); }

function _polyRecalcSum() {
  var el = document.getElementById('poly-sum');
  if (!el) return;
  var sum = _polyComps().reduce(function (s, c) { return s + (Number(c.incidencia) || 0); }, 0);
  var ok = Math.round(sum) === 100;
  el.innerHTML = 'Σ Incidencia: <strong style="color:' + (ok ? 'var(--success)' : 'var(--danger)') + '">' + sum.toFixed(1) + '%</strong>' +
    (ok ? ' <i class="fas fa-check" style="color:var(--success)"></i>' : ' (debe sumar 100%)');
}

function savePoly(id) {
  var name = (document.getElementById('poly-name').value || '').trim();
  if (!name) { toast('El nombre es obligatorio', 'error'); return; }
  var comps = _polyComps().filter(function (c) { return c.index_id && Number(c.incidencia) > 0; });
  if (!comps.length) { toast('Agregá al menos un índice con incidencia', 'error'); return; }
  var sum = comps.reduce(function (s, c) { return s + Number(c.incidencia); }, 0);
  if (Math.round(sum) !== 100) { toast('Las incidencias deben sumar 100% (actual: ' + sum.toFixed(1) + '%)', 'error'); return; }

  var data = {
    code: (document.getElementById('poly-code').value || '').trim(),
    name: name,
    notes: (document.getElementById('poly-notes').value || '').trim(),
    components: comps.map(function (c) { return { index_id: c.index_id, incidencia: Number(c.incidencia) }; }),
    active: true,
  };
  if (id) { DB.update('polynomials', id, data); toast('Polinómica actualizada', 'success'); }
  else { DB.insert('polynomials', data); toast('Polinómica creada', 'success'); }
  window._polyComps = [];
  closeModal();
  renderPolinomicas();
}

function deletePoly(id) {
  confirmDialog('¿Eliminar esta polinómica?', function () {
    DB.remove('polynomials', id);
    toast('Polinómica eliminada', 'warning');
    renderPolinomicas();
  });
}

function calcPoly() {
  var sel = document.getElementById('pcalc-poly');
  var out = document.getElementById('pcalc-result');
  if (!sel || !out) return;
  var poly = DB.getById('polynomials', sel.value);
  if (!poly) { out.innerHTML = ''; return; }
  var amount = Number((document.getElementById('pcalc-amount') || {}).value) || 0;
  var f = polyFactor(poly);
  var adjusted = amount * f.factor;
  var diff = adjusted - amount;

  out.innerHTML = `
  <div class="table-wrap">
    <table><thead><tr>
      <th>Índice</th><th class="text-right">Incidencia</th><th class="text-right">Var. (actual/base)</th><th class="text-right">Aporte al factor</th>
    </tr></thead>
    <tbody>
      ${f.rows.map(function (r) {
        return `<tr${r.ok ? '' : ' style="color:var(--danger)"'}>
          <td>${escapeHtml(r.code)}${r.name ? ' <span style="color:var(--text-muted);font-size:11px">' + escapeHtml(r.name) + '</span>' : ''}</td>
          <td class="number-cell text-right">${r.incidencia.toFixed(1)}%</td>
          <td class="number-cell text-right">${r.ratio.toFixed(4)}</td>
          <td class="number-cell text-right">${r.contrib.toFixed(4)}</td>
        </tr>`;
      }).join('')}
      <tr class="total-row">
        <td colspan="3" class="text-right">Factor de redeterminación</td>
        <td class="number-cell text-right"><strong>${f.factor.toFixed(4)}</strong></td>
      </tr>
    </tbody></table>
  </div>
  <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-top:14px">
    <div class="stat-card"><div><div class="stat-value">${fmtMoney(amount)}</div><div class="stat-label">Monto original</div></div></div>
    <div class="stat-card"><div><div class="stat-value" style="color:var(--primary)">${fmtMoney(adjusted)}</div><div class="stat-label">Monto redeterminado</div></div></div>
    <div class="stat-card"><div><div class="stat-value" style="color:${diff >= 0 ? 'var(--danger)' : 'var(--success)'}">${diff >= 0 ? '+' : ''}${fmtMoney(diff)}</div><div class="stat-label">Diferencia</div></div></div>
  </div>`;
}
