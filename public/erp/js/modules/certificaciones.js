/* ===== CERTIFICACIONES DE OBRA ===== */
function renderCertificaciones() {
  const certs = DB.getAll('certificates');
  const projects = DB.getAll('projects');

  const totalCertified = certs.reduce((s,c) => s + (c.subtotal || 0), 0);
  const totalRetention = certs.reduce((s,c) => s + (c.retention_amount || 0), 0);
  const totalNet = certs.reduce((s,c) => s + (c.net_amount || 0), 0);
  const approved = certs.filter(c => c.status === 'approved').length;

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Certificaciones de Obra</div>
    <div class="page-subtitle">Todas las certificaciones del grupo. Se crean desde cada contrato.</div>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" onclick="exportCertificates()"><i class="fas fa-download"></i> Exportar</button>
    <button class="btn btn-primary" onclick="certGoToContracts()"><i class="fas fa-plus"></i> Nueva (desde Contrato)</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-certificate"></i></div><div>
    <div class="stat-value">${certs.length}</div><div class="stat-label">Total Certificados</div>
    <div class="stat-delta up">${approved} aprobados</div></div></div>
  <div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-dollar-sign"></i></div><div>
    <div class="stat-value">${fmtMoney(totalCertified)}</div><div class="stat-label">Monto Certificado</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-shield-alt"></i></div><div>
    <div class="stat-value">${fmtMoney(totalRetention)}</div><div class="stat-label">Fondos de Reparo</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check-double"></i></div><div>
    <div class="stat-value">${fmtMoney(totalNet)}</div><div class="stat-label">Neto a Cobrar</div></div></div>
</div>

<div class="filter-bar mt-2">
  <div class="search-input-wrap">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Buscar certificado..." oninput="filterCerts(this.value)">
  </div>
  <select class="form-control" style="width:160px" onchange="filterCerts(undefined, this.value)">
    <option value="">Todos los estados</option>
    <option value="draft">Borrador</option>
    <option value="pending">Pendiente</option>
    <option value="approved">Aprobado</option>
    <option value="rejected">Rechazado</option>
  </select>
  <select class="form-control" style="width:200px" onchange="filterCerts(undefined, undefined, this.value)">
    <option value="">Todos los proyectos</option>
    ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
  </select>
</div>

<div class="card">
  <div class="card-body" style="padding:0">
    <div class="table-wrap" id="cert-table-wrap">
      ${buildCertTable(certs, projects)}
    </div>
  </div>
</div>
  `;
  window._certFilters = { q: '', status: '', project: '' };
}

function buildCertTable(certs, projects) {
  if (!certs.length) return '<div class="empty-state"><i class="fas fa-certificate"></i><p>No hay certificaciones. Se crean desde cada contrato (Contratos → abrí un contrato → Nueva Certificación).</p></div>';

  var ST_COLOR = {
    draft:    { color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0', label: 'Borrador' },
    pending:  { color: '#d97706', bg: '#fef9c3', border: '#fde68a', label: 'Pendiente' },
    approved: { color: '#059669', bg: '#dcfce7', border: '#86efac', label: 'Aprobado' },
    rejected: { color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', label: 'Rechazado' },
  };

  var contracts = DB.getAll('contracts');
  var sorted = certs.slice().sort(function(a,b) { return (b.date||'').localeCompare(a.date||''); });

  var rows = sorted.map(function(c, idx) {
    var proj  = projects.find(function(p) { return p.id === c.project_id; });
    var ctr   = contracts.find(function(x) { return x.id === c.contract_id; });
    var st    = ST_COLOR[c.status] || ST_COLOR.draft;
    var rowBg = idx % 2 === 0 ? '#ffffff' : '#f8f9fb';
    var ctrCell = ctr
      ? '<a href="#" onclick="event.stopPropagation();event.preventDefault();navigate(\'contratos\');setTimeout(function(){if(typeof openContractDetail===\'function\')openContractDetail(\'' + ctr.id + '\')},60)" style="color:#2563eb;font-size:12px">' + escapeHtml(ctr.number) + '</a>'
      : '<span style="color:var(--danger);font-size:11px" title="Certificación sin contrato (dato viejo)">— sin contrato —</span>';
    return '<tr style="background:' + rowBg + ';border-bottom:1px solid #f1f5f9;cursor:pointer"' +
        ' onclick="viewCert(\'' + c.id + '\')"' +
        ' onmouseenter="this.style.background=\'#eef4ff\'" onmouseleave="this.style.background=\'' + rowBg + '\'">' +
      '<td style="padding:10px 12px"><strong style="color:#2563eb">' + escapeHtml(c.number) + '</strong></td>' +
      '<td style="padding:10px 12px;font-size:12px">' + ctrCell + '</td>' +
      '<td style="padding:10px 12px;font-size:12px">' + escapeHtml(proj ? proj.name : '-') + '</td>' +
      '<td style="padding:10px 12px;font-size:11px;color:#64748b;white-space:nowrap">' + fmtDate(c.period_from) + ' — ' + fmtDate(c.period_to) + '</td>' +
      '<td style="padding:10px 12px;font-size:12px;white-space:nowrap">' + fmtDate(c.date) + '</td>' +
      '<td style="padding:10px 12px;text-align:right;font-variant-numeric:tabular-nums">' + fmtMoney(c.subtotal) + '</td>' +
      '<td style="padding:10px 12px;text-align:right;font-variant-numeric:tabular-nums;color:#d97706">' + fmtMoney(c.retention_amount||0) + '</td>' +
      '<td style="padding:10px 12px;text-align:right;font-variant-numeric:tabular-nums"><strong>' + fmtMoney(c.net_amount) + '</strong></td>' +
      '<td style="padding:10px 12px">' +
        '<span style="background:' + st.bg + ';color:' + st.color + ';border:1px solid ' + st.border + ';font-size:11px;font-weight:600;padding:3px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:.4px">' + st.label + '</span>' +
      '</td>' +
      '<td style="padding:10px 12px;white-space:nowrap" onclick="event.stopPropagation()">' +
        '<div class="table-actions">' +
          '<button class="btn-ghost btn btn-sm" title="Ver" onclick="viewCert(\'' + c.id + '\')"><i class="fas fa-eye"></i></button>' +
          '<button class="btn-ghost btn btn-sm" title="PDF" onclick="printCertificacion(\'' + c.id + '\')"><i class="fas fa-file-pdf"></i></button>' +
          (c.status === 'pending' ?
            '<button class="btn btn-sm btn-success" onclick="approveCert(\'' + c.id + '\')"><i class="fas fa-check"></i></button>' +
            '<button class="btn btn-sm btn-danger" onclick="rejectCert(\'' + c.id + '\')"><i class="fas fa-times"></i></button>'
          : '') +
          '<button class="btn-ghost btn btn-sm danger" title="Eliminar" onclick="deleteCert(\'' + c.id + '\')"><i class="fas fa-trash"></i></button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');

  return '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
    '<thead><tr style="background:#f8f9fb;border-bottom:2px solid #e2e8f0">' +
      '<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">N° Cert.</th>' +
      '<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Contrato</th>' +
      '<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Proyecto</th>' +
      '<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Período</th>' +
      '<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Fecha</th>' +
      '<th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;font-weight:600">Monto</th>' +
      '<th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;font-weight:600">Retención</th>' +
      '<th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;font-weight:600">Neto</th>' +
      '<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">Estado</th>' +
      '<th style="padding:10px 12px;font-size:11px;color:#64748b;font-weight:600">Acciones</th>' +
    '</tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
  '</table>';
}

window._certFilters = { q: '', status: '', project: '' };
function filterCerts(q, status, project) {
  if (q !== undefined) window._certFilters.q = q.toLowerCase();
  if (status !== undefined) window._certFilters.status = status;
  if (project !== undefined) window._certFilters.project = project;
  let certs = DB.getAll('certificates');
  const f = window._certFilters;
  if (f.q) certs = certs.filter(c => c.number.toLowerCase().includes(f.q));
  if (f.status) certs = certs.filter(c => c.status === f.status);
  if (f.project) certs = certs.filter(c => c.project_id === f.project);
  const wrap = document.getElementById('cert-table-wrap');
  if (wrap) wrap.innerHTML = buildCertTable(certs, DB.getAll('projects'));
}

function viewCert(id) {
  const cert = DB.getById('certificates', id);
  if (!cert) { toast('Certificación no encontrada', 'error'); return; }
  const proj = DB.getById('projects', cert.project_id);

  const statusColor = { draft: '#64748b', pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };
  const statusLabel = { draft: 'Borrador', pending: 'Pendiente de Aprobación', approved: 'Aprobado', rejected: 'Rechazado' };

  openModal(`Certificación ${cert.number}`, `
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:12px">
  <div>
    <div style="font-size:20px;font-weight:800;color:var(--primary)">ConstructERP</div>
    <div style="font-size:12px;color:var(--text-muted)">CERTIFICADO DE AVANCE DE OBRA</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:20px;font-weight:700">${cert.number}</div>
    <div style="font-size:12px">Fecha: ${fmtDate(cert.date)}</div>
    <div style="margin-top:4px"><span style="background:${statusColor[cert.status]};color:#fff;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600">${statusLabel[cert.status]||cert.status}</span></div>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
  <div style="background:var(--bg);padding:10px;border-radius:6px;font-size:12px">
    <div style="font-weight:600;margin-bottom:4px">PROYECTO</div>
    <div><strong>${proj?.name || '-'}</strong></div>
    <div>${proj?.client || '-'}</div>
    <div>${proj?.address || ''}</div>
  </div>
  <div style="background:var(--bg);padding:10px;border-radius:6px;font-size:12px">
    <div style="font-weight:600;margin-bottom:4px">PERÍODO</div>
    <div>Desde: <strong>${fmtDate(cert.period_from)}</strong></div>
    <div>Hasta: <strong>${fmtDate(cert.period_to)}</strong></div>
    ${cert.approved_by ? `<div>Aprobado por: <strong>${cert.approved_by}</strong></div>` : ''}
  </div>
</div>

<div class="table-wrap" style="margin-bottom:12px">
  <table><thead><tr>
    <th>Descripción</th><th class="text-center">Unidad</th>
    <th class="text-right">Cant. Contrato</th><th class="text-right">Cant. Período</th>
    <th class="text-right">P.Unit.</th><th class="text-right">Monto Período</th><th class="text-right">% Avance</th>
  </tr></thead>
  <tbody>
    ${(cert.items||[]).map(it => `<tr>
      <td>${it.description}</td>
      <td class="text-center">${it.unit}</td>
      <td class="number-cell text-right">${fmtNum(it.quantity_contract)}</td>
      <td class="number-cell text-right">${fmtNum(it.quantity_period)}</td>
      <td class="number-cell text-right">${fmtMoney(it.unit_price)}</td>
      <td class="number-cell text-right"><strong>${fmtMoney(it.amount_period)}</strong></td>
      <td class="text-right">${fmtPct(it.pct_complete)}</td>
    </tr>`).join('')}
  </tbody></table>
</div>

<div style="display:flex;justify-content:flex-end">
  <div style="min-width:260px">
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span>Subtotal del Período</span><span>${fmtMoney(cert.subtotal)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;color:var(--warning)">
      <span>Fondo de Reparo (${cert.retention_pct||5}%)</span><span>- ${fmtMoney(cert.retention_amount||0)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:16px;font-weight:700;color:var(--primary)">
      <span>NETO A COBRAR</span><span>${fmtMoney(cert.net_amount)}</span>
    </div>
  </div>
</div>
${cert.contab_tipo ? `<div style="margin-top:10px;padding:10px;background:var(--bg);border-radius:6px;font-size:12px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
  <span><strong>Contabilidad:</strong> ${cert.contab_tipo === 'AB' ? `A (${cert.contab_pct_a||0}%): ${fmtMoney(cert.amount_a||0)} &nbsp;/&nbsp; B: ${fmtMoney(cert.amount_b||0)}` : (cert.contab_tipo === 'B' ? 'Todo B (' + fmtMoney(cert.subtotal) + ')' : 'Todo A (' + fmtMoney(cert.subtotal) + ')')}</span>
  <span><strong>Forma de pago:</strong> ${cert.forma_pago || '-'}</span>
</div>` : ''}
${cert.notes ? `<div style="margin-top:8px;font-size:12px;color:var(--text-muted)"><strong>Notas:</strong> ${cert.notes}</div>` : ''}
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
<button class="btn btn-secondary" onclick="printCertificacion('${cert.id}')"><i class="fas fa-file-pdf"></i> PDF</button>
${cert.status === 'pending' ? `
  <button class="btn btn-danger" onclick="rejectCert('${cert.id}');closeModal()"><i class="fas fa-times"></i> Rechazar</button>
  <button class="btn btn-success" onclick="approveCert('${cert.id}');closeModal()"><i class="fas fa-check"></i> Aprobar</button>
` : ''}
`);
}

// Las certificaciones se crean SIEMPRE desde un contrato (modelo unificado).
function certGoToContracts() {
  if (typeof toast === 'function') toast('Las certificaciones se crean desde el contrato: entrá al contrato y usá "Nueva Certificación"', 'info');
  if (typeof navigate === 'function') navigate('contratos');
}

function openCertForm(id = null) {
  // Alta/edición standalone deshabilitada: redirige al flujo por contrato.
  return certGoToContracts();
  /* eslint-disable no-unreachable */
  window._certItems = [];
  const cert = id ? DB.getById('certificates', id) : null;
  const projects = DB.getAll('projects');
  const nextNum = `CERT-${new Date().getFullYear()}-${String(DB.getAll('certificates').length + 1).padStart(3,'0')}`;

  openModal(cert ? 'Editar Certificación' : 'Nueva Certificación de Obra', `
<div class="form-grid form-grid-2">
  <div class="form-group">
    <label class="form-label">Número</label>
    <input class="form-control" id="cf2-num" value="${cert?.number || nextNum}">
  </div>
  <div class="form-group">
    <label class="form-label">Estado</label>
    <select class="form-control" id="cf2-status">
      <option value="draft" ${cert?.status==='draft'?'selected':''}>Borrador</option>
      <option value="pending" ${cert?.status==='pending'||!cert?'selected':''}>Pendiente de Aprobación</option>
      <option value="approved" ${cert?.status==='approved'?'selected':''}>Aprobado</option>
      <option value="rejected" ${cert?.status==='rejected'?'selected':''}>Rechazado</option>
    </select>
  </div>
  <div class="form-group full">
    <label class="form-label">Proyecto *</label>
    <select class="form-control" id="cf2-project">
      <option value="">Seleccionar...</option>
      ${projects.map(p => `<option value="${p.id}" ${cert?.project_id===p.id?'selected':''}>${p.name}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Fecha del Certificado</label>
    <input class="form-control" id="cf2-date" type="date" value="${cert?.date || todayStr()}">
  </div>
  <div class="form-group">
    <label class="form-label">Aprobado por</label>
    <input class="form-control" id="cf2-approver" value="${cert?.approved_by || ''}" placeholder="Director de Obra">
  </div>
  <div class="form-group">
    <label class="form-label">Período Desde</label>
    <input class="form-control" id="cf2-from" type="date" value="${cert?.period_from || ''}">
  </div>
  <div class="form-group">
    <label class="form-label">Período Hasta</label>
    <input class="form-control" id="cf2-to" type="date" value="${cert?.period_to || todayStr()}">
  </div>
  <div class="form-group">
    <label class="form-label">% Fondo de Reparo</label>
    <input class="form-control" id="cf2-ret-pct" type="number" min="0" max="20" value="${cert?.retention_pct != null ? cert.retention_pct : 5}" oninput="updateCertTotals()">
  </div>
</div>
<div class="divider"></div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
  <strong style="font-size:13px">Ítems Certificados</strong>
  <button class="btn btn-sm btn-secondary" onclick="addCertItem()"><i class="fas fa-plus"></i> Ítem</button>
</div>
<div style="display:grid;grid-template-columns:3fr 60px 90px 90px 110px 110px 80px 30px;gap:4px;margin-bottom:4px;font-size:10px;font-weight:600;color:var(--text-muted)">
  <span>Descripción</span><span>Unidad</span><span>Cant.Contrato</span><span>Cant.Período</span><span>Precio Unit.</span><span>Monto</span><span>% Avance</span><span></span>
</div>
<div id="cert-items">
  ${(cert?.items || [{ description:'', unit:'m²', quantity_contract:0, quantity_period:0, unit_price:0, amount_period:0, pct_complete:0 }]).map((it,i) => certItemRow(it,i)).join('')}
</div>
<div id="cert-totals" style="text-align:right;margin-top:10px;font-size:13px">
  ${calcCertTotalsHtml(cert?.items||[], cert?.retention_pct||5)}
</div>
<div class="form-group full mt-2">
  <label class="form-label">Notas</label>
  <textarea class="form-control" id="cf2-notes" rows="2">${cert?.notes || ''}</textarea>
</div>
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="saveCert('${id||''}')"><i class="fas fa-save"></i> Guardar</button>
`);
  window._certItems = [...(cert?.items || [{ description:'', unit:'m²', quantity_contract:0, quantity_period:0, unit_price:0, amount_period:0, pct_complete:0 }])];
}

function certItemRow(it, i) {
  return `<div id="ci-row-${i}" style="display:grid;grid-template-columns:3fr 60px 90px 90px 110px 110px 80px 30px;gap:4px;margin-bottom:4px;align-items:center">
    <input class="form-control" style="font-size:11px" placeholder="Descripción" value="${it.description||''}" oninput="updateCertItem(${i},'description',this.value)">
    <input class="form-control" style="font-size:11px" value="${it.unit||'m²'}" oninput="updateCertItem(${i},'unit',this.value)">
    <input class="form-control" style="font-size:11px" type="number" min="0" value="${it.quantity_contract||0}" oninput="updateCertItem(${i},'quantity_contract',+this.value)">
    <input class="form-control" style="font-size:11px" type="number" min="0" value="${it.quantity_period||0}" oninput="updateCertItem(${i},'quantity_period',+this.value)">
    <input class="form-control" style="font-size:11px" type="number" min="0" value="${it.unit_price||0}" oninput="updateCertItem(${i},'unit_price',+this.value)">
    <input class="form-control" style="font-size:11px;background:#f8fafc;font-variant-numeric:tabular-nums" readonly id="ci-amount-${i}" value="${fmtMoney(it.amount_period||0)}">
    <input class="form-control" style="font-size:11px;background:#f8fafc" readonly id="ci-pct-${i}" value="${fmtPct(it.pct_complete||0)}">
    <button class="btn-ghost btn danger" onclick="removeCertItem(${i})"><i class="fas fa-times" style="font-size:10px"></i></button>
  </div>`;
}

window._certItems = [];
function addCertItem() {
  const it = { description:'', unit:'m²', quantity_contract:0, quantity_period:0, unit_price:0, amount_period:0, pct_complete:0 };
  window._certItems.push(it);
  const i = window._certItems.length - 1;
  const cont = document.getElementById('cert-items');
  const div = document.createElement('div');
  div.innerHTML = certItemRow(it, i);
  cont.appendChild(div.firstElementChild);
}

function updateCertItem(i, field, val) {
  if (!window._certItems[i]) window._certItems[i] = { description:'', unit:'m²', quantity_contract:0, quantity_period:0, unit_price:0, amount_period:0, pct_complete:0 };
  window._certItems[i][field] = val;
  const it = window._certItems[i];
  it.amount_period = (it.quantity_period||0) * (it.unit_price||0);
  it.pct_complete = it.quantity_contract > 0 ? Math.round((it.quantity_period / it.quantity_contract) * 100 * 10) / 10 : 0;
  const amtEl = document.getElementById(`ci-amount-${i}`);
  const pctEl = document.getElementById(`ci-pct-${i}`);
  if (amtEl) amtEl.value = fmtMoney(it.amount_period);
  if (pctEl) pctEl.value = fmtPct(it.pct_complete);
  updateCertTotals();
}

function removeCertItem(i) {
  const row = document.getElementById(`ci-row-${i}`);
  if (row) row.remove();
  window._certItems[i] = null;
  updateCertTotals();
}

function updateCertTotals() {
  const _r = parseFloat(document.getElementById('cf2-ret-pct')?.value);
  const retPct = isNaN(_r) ? 5 : _r; // permitir 0% (antes 0 se convertía en 5)
  const el = document.getElementById('cert-totals');
  if (el) el.innerHTML = calcCertTotalsHtml(window._certItems.filter(Boolean), retPct);
}

function calcCertTotalsHtml(items, retPct = 5) {
  const subtotal = items.filter(Boolean).reduce((s,it) => s + (it.amount_period||0), 0);
  const retention = subtotal * retPct / 100;
  const net = subtotal - retention;
  return `Subtotal: <strong>${fmtMoney(subtotal)}</strong> &nbsp;|&nbsp; Fondo Reparo (${retPct}%): <strong class="text-warning">${fmtMoney(retention)}</strong> &nbsp;|&nbsp; <strong style="font-size:15px;color:var(--primary)">Neto: ${fmtMoney(net)}</strong>`;
}

function saveCert(id) {
  const projectId = document.getElementById('cf2-project').value;
  if (!projectId) { toast('El proyecto es obligatorio', 'error'); return; }
  const items = window._certItems.filter(Boolean).filter(it => it.description);
  const _rp = parseFloat(document.getElementById('cf2-ret-pct').value);
  const retPct = isNaN(_rp) ? 5 : _rp; // permitir 0%
  const subtotal = items.reduce((s,it) => s + (it.amount_period||0), 0);
  const retention = subtotal * retPct / 100;

  const data = {
    number: document.getElementById('cf2-num').value,
    project_id: projectId,
    status: document.getElementById('cf2-status').value,
    date: document.getElementById('cf2-date').value,
    period_from: document.getElementById('cf2-from').value,
    period_to: document.getElementById('cf2-to').value,
    approved_by: document.getElementById('cf2-approver').value.trim(),
    items,
    subtotal,
    retention_pct: retPct,
    retention_amount: retention,
    net_amount: subtotal - retention,
    notes: document.getElementById('cf2-notes').value.trim(),
  };

  if (id) { DB.update('certificates', id, data); toast('Certificación actualizada', 'success'); }
  else { DB.insert('certificates', data); toast('Certificación creada', 'success'); }
  window._certItems = [];
  closeModal();
  renderCertificaciones();
}

function approveCert(id) {
  DB.update('certificates', id, { status: 'approved' });
  toast('Certificación aprobada', 'success');
  renderCertificaciones();
}

function rejectCert(id) {
  DB.update('certificates', id, { status: 'rejected' });
  toast('Certificación rechazada', 'warning');
  renderCertificaciones();
}

function deleteCert(id) {
  confirmDialog('¿Eliminar esta certificación?', () => {
    DB.remove('certificates', id);
    toast('Certificación eliminada', 'warning');
    renderCertificaciones();
  });
}

function printCertificacion(id) {
  var cert = DB.getById('certificates', id);
  if (!cert) return;
  var proj = DB.getById('projects', cert.project_id);
  var company = {};
  try { company = DB.getAllCompanies()[0] || {}; } catch(e) {}

  var ST_BADGE = { draft: 'b-gray', pending: 'b-yellow', approved: 'b-green', rejected: 'b-red' };
  var ST_LABEL = { draft: 'Borrador', pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' };

  var itemRows = (cert.items || []).map(function(it) {
    return '<tr>' +
      '<td>' + escapeHtml(it.description || '') + '</td>' +
      '<td class="tc">' + escapeHtml(it.unit || '') + '</td>' +
      '<td class="tr num">' + fmtNum(it.quantity_contract || 0) + '</td>' +
      '<td class="tr num">' + fmtNum(it.quantity_period || 0) + '</td>' +
      '<td class="tr num">' + fmtMoney(it.unit_price || 0) + '</td>' +
      '<td class="tr num"><strong>' + fmtMoney(it.amount_period || 0) + '</strong></td>' +
      '<td class="tr">' + fmtPct(it.pct_complete || 0) + '</td>' +
    '</tr>';
  }).join('');

  var html =
    '<div class="doc-header">' +
      '<div><h1>' + escapeHtml(company.name || 'ConstructERP') + '</h1><div class="subtitle">Certificado de Avance de Obra</div></div>' +
      '<div>' +
        '<div class="doc-num">' + escapeHtml(cert.number) + '</div>' +
        '<div class="doc-date">Fecha: ' + fmtDate(cert.date) + '</div>' +
        '<div style="margin-top:6px"><span class="badge ' + (ST_BADGE[cert.status]||'b-gray') + '">' + (ST_LABEL[cert.status]||cert.status) + '</span></div>' +
      '</div>' +
    '</div>' +
    _printInfoGrid([
      { title: 'Proyecto', content:
          '<strong>' + escapeHtml(proj ? proj.name : '-') + '</strong><br>' +
          escapeHtml(proj && proj.client ? proj.client : '') +
          (proj && proj.address ? '<br>' + escapeHtml(proj.address) : '') },
      { title: 'Período', content:
          'Desde: <strong>' + fmtDate(cert.period_from) + '</strong><br>' +
          'Hasta: <strong>' + fmtDate(cert.period_to) + '</strong><br>' +
          (cert.approved_by ? 'Aprobado por: <strong>' + escapeHtml(cert.approved_by) + '</strong>' : '') }
    ]) +
    '<table>' +
      '<thead><tr>' +
        '<th>Descripción</th><th class="tc">Unidad</th>' +
        '<th class="tr">Cant. Contrato</th><th class="tr">Cant. Período</th>' +
        '<th class="tr">P. Unit.</th><th class="tr">Monto</th><th class="tr">% Avance</th>' +
      '</tr></thead>' +
      '<tbody>' + (itemRows || '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:20px">Sin ítems</td></tr>') + '</tbody>' +
    '</table>' +
    _printTotals([
      { label: 'Subtotal del Período', value: fmtMoney(cert.subtotal) },
      { label: 'Fondo de Reparo (' + (cert.retention_pct != null ? cert.retention_pct : 5) + '%)', value: '- ' + fmtMoney(cert.retention_amount || 0), warn: true },
      { label: 'Neto a Cobrar', value: fmtMoney(cert.net_amount), grand: true }
    ]) +
    (cert.notes ? '<div class="notes-box"><strong>Notas:</strong> ' + escapeHtml(cert.notes) + '</div>' : '') +
    '<div class="sign-row">' +
      '<div><div class="sign-line">Firma del Director de Obra</div></div>' +
      '<div><div class="sign-line">Firma del Comitente</div></div>' +
    '</div>';

  _printDoc('Certificación ' + cert.number, html);
}

function exportCertificates() {
  const certs = DB.getAll('certificates');
  const projects = DB.getAll('projects');
  exportXLSX('certificaciones.xlsx',
    ['Número','Proyecto','Período Desde','Período Hasta','Fecha','Subtotal','Retención','Neto','Estado'],
    certs.map(c => [c.number, projects.find(p=>p.id===c.project_id)?.name||'', c.period_from, c.period_to, c.date, c.subtotal, c.retention_amount||0, c.net_amount, c.status])
  );
}
