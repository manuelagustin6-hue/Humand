/* ===== RETENCIONES ===== */

// State for ARCA / historial filters
window._retFilters = { q: '', dateFrom: '', dateTo: '', type: '' };

function renderRetenciones() {
  const retentions = DB.getAll('retentions');
  const paymentOrders = DB.getAll('paymentOrders');

  // Build full applied list with supplier details
  const applied = [];
  paymentOrders.forEach(o => {
    const sup = DB.getById('suppliers', o.supplier_id);
    (o.retentions||[]).forEach(r => {
      applied.push({
        ...r,
        date: o.date,
        order_id: o.id,
        order_number: o.number,
        supplier: sup ? sup.name : '-',
        supplier_cuit: sup ? (sup.cuit||'') : '',
        gross_amount: o.gross_amount,
        net_payment: o.net_amount,
      });
    });
  });

  const totalApplied = applied.reduce((s,r) => s + (r.amount||0), 0);
  const retTypes = [...new Set(applied.map(r => r.name))].sort();

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Retenciones</div>
    <div class="page-subtitle">Reglas de retención impositiva, historial y exportación ARCA</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-primary" onclick="openRetentionForm()"><i class="fas fa-plus"></i> Nueva Retención</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-percentage"></i></div><div>
    <div class="stat-value">${retentions.length}</div><div class="stat-label">Tipos de Retención</div>
    <div class="stat-delta up">${retentions.filter(r=>r.active).length} activas</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-coins"></i></div><div>
    <div class="stat-value">${fmtMoney(totalApplied)}</div><div class="stat-label">Total Retenido</div></div></div>
  <div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-receipt"></i></div><div>
    <div class="stat-value">${applied.length}</div><div class="stat-label">Aplicaciones Totales</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div><div>
    <div class="stat-value">${retentions.filter(r=>r.active).length}</div><div class="stat-label">Reglas Activas</div></div></div>
</div>

<div id="ret-tabs">
  <div class="tabs">
    <button class="tab-btn" data-tab="tab-ret-rules">Reglas de Retención</button>
    <button class="tab-btn" data-tab="tab-ret-history">Historial Aplicado</button>
    <button class="tab-btn" data-tab="tab-ret-arca">Exportar ARCA</button>
  </div>

  <div id="tab-ret-rules" class="tab-content">
    <div class="card"><div class="card-body" style="padding:0"><div class="table-wrap">
      <table><thead><tr>
        <th>Nombre</th><th>Tipo</th><th>Tasa</th><th>Aplica a</th><th>Estado</th><th>Acciones</th>
      </tr></thead>
      <tbody>
        ${retentions.length ? retentions.map(r => `<tr>
          <td><strong>${r.name}</strong></td>
          <td><span class="badge badge-blue">${r.type}</span></td>
          <td style="font-size:15px;font-weight:700;color:var(--primary)">${r.rate}%</td>
          <td><span class="badge badge-gray">${r.applies_to === 'payment' ? 'Pago a proveedor' : r.applies_to === 'certificate' ? 'Certificación' : r.applies_to}</span></td>
          <td>${r.active ? '<span class="badge badge-green">Activa</span>' : '<span class="badge badge-gray">Inactiva</span>'}</td>
          <td><div class="table-actions">
            <button class="btn-ghost btn btn-sm" onclick="openRetentionForm('${r.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn-ghost btn btn-sm" onclick="toggleRetention('${r.id}', ${!r.active})">
              <i class="fas fa-${r.active?'pause':'play'}"></i>
            </button>
            <button class="btn-ghost btn btn-sm danger" onclick="deleteRetention('${r.id}')"><i class="fas fa-trash"></i></button>
          </div></td>
        </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-percentage"></i><p>Sin reglas de retención</p></div></td></tr>`}
      </tbody></table>
    </div></div></div>
  </div>

  <div id="tab-ret-history" class="tab-content">
    <div class="filter-bar" style="margin-bottom:12px">
      <div class="search-input-wrap" style="flex:1;min-width:180px">
        <i class="fas fa-search"></i>
        <input type="text" placeholder="Buscar por razón social..." oninput="filterRetHistory('q',this.value)">
      </div>
      <select class="form-control" style="width:160px" onchange="filterRetHistory('type',this.value)">
        <option value="">Todos los tipos</option>
        ${retTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
      </select>
      <input type="date" class="form-control" style="width:140px" title="Desde" onchange="filterRetHistory('dateFrom',this.value)">
      <input type="date" class="form-control" style="width:140px" title="Hasta" onchange="filterRetHistory('dateTo',this.value)">
    </div>
    <div class="card"><div class="card-body" style="padding:0"><div class="table-wrap">
      <div id="ret-history-wrap">${buildRetHistoryTable(applied)}</div>
    </div></div></div>
  </div>

  <div id="tab-ret-arca" class="tab-content">
    <div class="card">
      <div class="card-body">
        <div style="font-size:14px;font-weight:700;margin-bottom:4px">Exportar para ARCA / SICORE</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:20px">Generá el archivo de retenciones practicadas para presentar en ARCA (ex-AFIP). Filtrá por período y razón social antes de exportar.</div>

        <div class="form-grid form-grid-2" style="margin-bottom:16px">
          <div class="form-group">
            <label class="form-label">Razón Social / Proveedor</label>
            <input class="form-control" id="arca-q" placeholder="Filtrar por nombre..." oninput="renderArcaPreview()">
          </div>
          <div class="form-group">
            <label class="form-label">Tipo de Retención</label>
            <select class="form-control" id="arca-type" onchange="renderArcaPreview()">
              <option value="">Todos los tipos</option>
              ${retTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Período desde</label>
            <input class="form-control" id="arca-from" type="date" onchange="renderArcaPreview()">
          </div>
          <div class="form-group">
            <label class="form-label">Período hasta</label>
            <input class="form-control" id="arca-to" type="date" onchange="renderArcaPreview()">
          </div>
        </div>

        <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="exportARCAExcel()"><i class="fas fa-file-excel"></i> Exportar Excel (ARCA)</button>
          <button class="btn btn-secondary" onclick="exportARCATxt()"><i class="fas fa-file-alt"></i> Exportar SICORE .txt</button>
        </div>

        <div id="arca-preview-wrap"></div>
      </div>
    </div>
  </div>
</div>
  `;
  initTabs('ret-tabs');
  window._arcaApplied = applied;
  renderArcaPreview();
}

function buildRetHistoryTable(rows) {
  if (!rows.length) return '<div class="empty-state"><i class="fas fa-history"></i><p>Sin historial de retenciones</p></div>';
  const sorted = rows.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const total = rows.reduce((s,r)=>s+(r.amount||0),0);
  return '<table><thead><tr>' +
    '<th>Fecha</th><th>Orden de Pago</th><th>Razón Social</th><th>CUIT</th><th>Tipo Retención</th><th>Tasa</th><th style="text-align:right">Base Imponible</th><th style="text-align:right">Importe Retenido</th><th></th>' +
    '</tr></thead><tbody>' +
    sorted.map(r => '<tr>' +
      '<td>' + fmtDate(r.date) + '</td>' +
      '<td><strong>' + escapeHtml(r.order_number) + '</strong></td>' +
      '<td>' + escapeHtml(r.supplier) + '</td>' +
      '<td style="font-size:11px;color:#64748b">' + escapeHtml(r.supplier_cuit) + '</td>' +
      '<td><span class="badge badge-blue">' + escapeHtml(r.name) + '</span></td>' +
      '<td>' + r.rate + '%</td>' +
      '<td style="text-align:right;font-variant-numeric:tabular-nums">' + fmtMoney(r.gross_amount) + '</td>' +
      '<td style="text-align:right;font-variant-numeric:tabular-nums;color:#d97706"><strong>' + fmtMoney(r.amount) + '</strong></td>' +
      '<td><button class="btn-ghost btn btn-sm" title="Comprobante PDF" onclick="printRetencion(\'' + r.order_id + '\')"><i class="fas fa-file-pdf"></i></button></td>' +
    '</tr>').join('') +
    '<tr class="total-row"><td colspan="7">Total Retenido</td><td style="text-align:right">' + fmtMoney(total) + '</td><td></td></tr>' +
    '</tbody></table>';
}

function filterRetHistory(key, val) {
  if (!window._retFilters) window._retFilters = {};
  window._retFilters[key] = val;
  const wrap = document.getElementById('ret-history-wrap');
  if (!wrap) return;
  let rows = (window._arcaApplied || []);
  const f = window._retFilters;
  if (f.q) rows = rows.filter(r => r.supplier.toLowerCase().includes(f.q.toLowerCase()));
  if (f.type) rows = rows.filter(r => r.name === f.type);
  if (f.dateFrom) rows = rows.filter(r => (r.date||'') >= f.dateFrom);
  if (f.dateTo) rows = rows.filter(r => (r.date||'') <= f.dateTo);
  wrap.innerHTML = buildRetHistoryTable(rows);
}

function _arcaFilteredRows() {
  let rows = (window._arcaApplied || []);
  const q = (document.getElementById('arca-q')?.value || '').toLowerCase();
  const type = document.getElementById('arca-type')?.value || '';
  const from = document.getElementById('arca-from')?.value || '';
  const to = document.getElementById('arca-to')?.value || '';
  if (q) rows = rows.filter(r => r.supplier.toLowerCase().includes(q));
  if (type) rows = rows.filter(r => r.name === type);
  if (from) rows = rows.filter(r => (r.date||'') >= from);
  if (to) rows = rows.filter(r => (r.date||'') <= to);
  return rows;
}

function renderArcaPreview() {
  const wrap = document.getElementById('arca-preview-wrap');
  if (!wrap) return;
  const rows = _arcaFilteredRows();
  if (!rows.length) {
    wrap.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px"><i class="fas fa-filter" style="font-size:24px;margin-bottom:8px;display:block"></i>Sin registros con los filtros actuales</div>';
    return;
  }
  const total = rows.reduce((s,r)=>s+(r.amount||0),0);
  wrap.innerHTML = '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">' + rows.length + ' registros · Total: <strong>' + fmtMoney(total) + '</strong></div>' +
    '<div class="table-wrap"><table><thead><tr>' +
    '<th>Período</th><th>N° OP</th><th>Fecha</th><th>Razón Social</th><th>CUIT</th><th>Tipo Retención</th><th style="text-align:right">Base Imponible</th><th style="text-align:right">Alícuota</th><th style="text-align:right">Importe Retenido</th>' +
    '</tr></thead><tbody>' +
    rows.map(r => '<tr>' +
      '<td style="font-size:11px">' + (r.date ? r.date.slice(0,7).replace('-','/') : '-') + '</td>' +
      '<td><strong>' + escapeHtml(r.order_number) + '</strong></td>' +
      '<td style="white-space:nowrap">' + fmtDate(r.date) + '</td>' +
      '<td>' + escapeHtml(r.supplier) + '</td>' +
      '<td style="font-size:11px;color:#64748b">' + escapeHtml(r.supplier_cuit) + '</td>' +
      '<td><span class="badge badge-blue">' + escapeHtml(r.name) + '</span></td>' +
      '<td style="text-align:right;font-variant-numeric:tabular-nums">' + fmtMoney(r.gross_amount) + '</td>' +
      '<td style="text-align:right">' + r.rate + '%</td>' +
      '<td style="text-align:right;font-variant-numeric:tabular-nums;color:#d97706"><strong>' + fmtMoney(r.amount) + '</strong></td>' +
    '</tr>').join('') +
    '</tbody></table></div>';
}

function exportARCAExcel() {
  const rows = _arcaFilteredRows();
  if (!rows.length) { toast('Sin registros para exportar', 'warning'); return; }
  var company = {};
  try { company = DB.getAllCompanies()[0] || {}; } catch(e) {}
  exportXLSX('retenciones_arca.xlsx',
    ['Período','Tipo Comprobante','N° Comprobante','Fecha','CUIT Agente Retención','Agente Retención','CUIT Sujeto Retenido','Razón Social','Tipo Retención','Base Imponible','Alícuota (%)','Importe Retenido'],
    rows.map(function(r) {
      return [
        r.date ? r.date.slice(0,7).replace('-','') : '',
        'Orden de Pago',
        r.order_number,
        r.date,
        company.cuit || '',
        company.name || '',
        r.supplier_cuit,
        r.supplier,
        r.name,
        r.gross_amount,
        r.rate,
        r.amount,
      ];
    }),
    'Retenciones ARCA'
  );
  toast('Archivo Excel generado', 'success');
}

function exportARCATxt() {
  const rows = _arcaFilteredRows();
  if (!rows.length) { toast('Sin registros para exportar', 'warning'); return; }
  var company = {};
  try { company = DB.getAllCompanies()[0] || {}; } catch(e) {}
  const agenteCUIT = (company.cuit || '').replace(/[-\s]/g, '').padEnd(11,' ');

  // SICORE-compatible text format (pipe-delimited for ARCA import)
  // Fields: periodo|tipo_comp|nro_comp|fecha|cuit_agente|cuit_retenido|razon_social|tipo_retencion|base_imponible|alicuota|importe_retenido
  const lines = rows.map(function(r) {
    var periodo = r.date ? r.date.slice(0,7).replace('-','') : '';
    var fecha = r.date ? r.date.replace(/-/g,'') : '';
    var cuitRet = (r.supplier_cuit || '').replace(/[-\s]/g, '').padStart(11,'0');
    var base = (r.gross_amount||0).toFixed(2);
    var imp = (r.amount||0).toFixed(2);
    return [periodo, 'OP', r.order_number, fecha, agenteCUIT.trim(), cuitRet, r.supplier, r.name, base, r.rate, imp].join('|');
  });

  const header = 'PERIODO|TIPO_COMP|NRO_COMP|FECHA|CUIT_AGENTE|CUIT_RETENIDO|RAZON_SOCIAL|TIPO_RETENCION|BASE_IMPONIBLE|ALICUOTA|IMPORTE_RETENIDO';
  const content = [header, ...lines].join('\r\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'sicore_retenciones.txt'; a.click();
  URL.revokeObjectURL(url);
  toast('Archivo SICORE .txt generado', 'success');
}

function openRetentionForm(id = null) {
  const r = id ? DB.getById('retentions', id) : null;
  openModal(r ? 'Editar Retención' : 'Nueva Regla de Retención', `
<div class="form-grid form-grid-2">
  <div class="form-group full">
    <label class="form-label">Nombre *</label>
    <input class="form-control" id="rt-name" value="${r?.name || ''}" placeholder="Ej: Ret. IIBB Buenos Aires">
  </div>
  <div class="form-group">
    <label class="form-label">Tipo *</label>
    <input class="form-control" id="rt-type" list="rt-type-list" value="${r?.type || ''}" placeholder="IIBB, Ganancias, IVA...">
    <datalist id="rt-type-list">
      <option value="IIBB"><option value="Ganancias"><option value="IVA">
      <option value="Fondo Reparo"><option value="Sello"><option value="Municipal">
    </datalist>
  </div>
  <div class="form-group">
    <label class="form-label">Tasa (%) *</label>
    <input class="form-control" id="rt-rate" type="number" min="0" max="100" step="0.01" value="${r?.rate || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">Aplica a</label>
    <select class="form-control" id="rt-applies">
      <option value="payment" ${r?.applies_to==='payment'||!r?'selected':''}>Pago a proveedor</option>
      <option value="certificate" ${r?.applies_to==='certificate'?'selected':''}>Certificación</option>
      <option value="invoice" ${r?.applies_to==='invoice'?'selected':''}>Factura</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Estado</label>
    <select class="form-control" id="rt-active">
      <option value="true" ${r?.active!==false?'selected':''}>Activa</option>
      <option value="false" ${r?.active===false?'selected':''}>Inactiva</option>
    </select>
  </div>
</div>
`, '', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveRetention('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
}

function saveRetention(id) {
  const name = document.getElementById('rt-name').value.trim();
  const type = document.getElementById('rt-type').value.trim();
  const rate = parseFloat(document.getElementById('rt-rate').value);
  if (!name || !type || isNaN(rate)) { toast('Nombre, tipo y tasa son obligatorios', 'error'); return; }

  const data = {
    name, type, rate,
    applies_to: document.getElementById('rt-applies').value,
    active: document.getElementById('rt-active').value === 'true',
  };

  if (id) { DB.update('retentions', id, data); toast('Retención actualizada', 'success'); }
  else { DB.insert('retentions', data); toast('Retención creada', 'success'); }
  closeModal();
  renderRetenciones();
}

function toggleRetention(id, active) {
  DB.update('retentions', id, { active });
  toast(`Retención ${active ? 'activada' : 'desactivada'}`, active ? 'success' : 'warning');
  renderRetenciones();
}

function deleteRetention(id) {
  confirmDialog('¿Eliminar esta regla de retención?', () => {
    DB.remove('retentions', id);
    toast('Retención eliminada', 'warning');
    renderRetenciones();
  });
}
