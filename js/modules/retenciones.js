/* ===== RETENCIONES ===== */
function renderRetenciones() {
  const retentions = DB.getAll('retentions');
  const paymentOrders = DB.getAll('paymentOrders');

  // Calc applied retentions from payment orders
  const applied = [];
  paymentOrders.forEach(o => {
    const sup = DB.getById('suppliers', o.supplier_id);
    (o.retentions||[]).forEach(r => {
      applied.push({ ...r, date: o.date, order_number: o.number, supplier: sup?.name||'-', net_payment: o.net_amount });
    });
  });

  const totalApplied = applied.reduce((s,r) => s + (r.amount||0), 0);

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Retenciones</div>
    <div class="page-subtitle">Reglas de retención impositiva y historial de aplicaciones</div>
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
    <div class="card"><div class="card-body" style="padding:0"><div class="table-wrap">
      <table><thead><tr>
        <th>Fecha</th><th>Orden de Pago</th><th>Proveedor</th><th>Tipo Retención</th><th>Tasa</th><th class="text-right">Importe Retenido</th>
      </tr></thead>
      <tbody>
        ${applied.length ? applied.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(r => `<tr>
          <td>${fmtDate(r.date)}</td>
          <td><strong>${r.order_number}</strong></td>
          <td>${r.supplier}</td>
          <td><span class="badge badge-blue">${r.name}</span></td>
          <td>${r.rate}%</td>
          <td class="number-cell text-right text-warning"><strong>${fmtMoney(r.amount)}</strong></td>
        </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-history"></i><p>Sin historial de retenciones</p></div></td></tr>`}
      </tbody>
      ${applied.length ? `<tfoot><tr class="total-row">
        <td colspan="5">Total Retenido</td>
        <td class="number-cell text-right">${fmtMoney(totalApplied)}</td>
      </tr></tfoot>` : ''}
      </table>
    </div></div></div>
  </div>
</div>
  `;
  initTabs('ret-tabs');
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
