/* ===== APROBACIONES ===== */

// ---- DOCUMENT TYPE REGISTRY ----
var APPR_DOC_TYPES = {
  contract: {
    label: 'Contratos', icon: 'fa-file-contract',
    collection: 'contracts',
    statusPending:  'pending_approval',
    statusApproved: 'approved',
    statusRejected: 'rejected',
  },
  certificate: {
    label: 'Certificaciones', icon: 'fa-certificate',
    collection: 'certificates',
    statusPending:  'pending',    // existing cert flow uses 'pending' for awaiting approval
    statusApproved: 'approved',
    statusRejected: 'rejected',
  },
  purchase_requisition: {
    label: 'Pedidos de Materiales', icon: 'fa-clipboard-list',
    collection: 'purchaseRequisitions',
    statusPending:  'submitted',
    statusApproved: 'approved',
    statusRejected: 'rejected',
  },
  purchase_order: {
    label: 'Órdenes de Compra', icon: 'fa-shopping-cart',
    collection: 'purchaseOrders',
    statusPending:  'pending_approval',
    statusApproved: 'approved',
    statusRejected: 'rejected',
  },
  payment_order: {
    label: 'Órdenes de Pago', icon: 'fa-money-bill-wave',
    collection: 'paymentOrders',
    statusPending:  'pending_approval',
    statusApproved: 'approved',
    statusRejected: 'rejected',
  },
};

// ---- CONDITION OPERATORS ----
var APPR_COND_OPS = [
  { value: 'gt',         label: 'mayor que' },
  { value: 'gte',        label: 'mayor o igual a' },
  { value: 'lt',         label: 'menor que' },
  { value: 'lte',        label: 'menor o igual a' },
  { value: 'eq',         label: 'igual a' },
  { value: 'neq',        label: 'distinto de' },
  { value: 'exists',     label: 'tiene valor' },
  { value: 'not_exists', label: 'está vacío / no tiene' },
];

// ---- AVAILABLE FIELDS PER DOC TYPE ----
var APPR_DOC_FIELDS = {
  contract: [
    { value: 'total_amount', label: 'Monto del Contrato', type: 'number' },
    { value: 'type',         label: 'Tipo de Contrato',   type: 'string' },
  ],
  certificate: [
    { value: 'subtotal',    label: 'Monto Certificado', type: 'number' },
    { value: 'net_amount',  label: 'Monto Neto',        type: 'number' },
    { value: 'contab_tipo', label: 'Contabilidad (A/B)', type: 'string' },
  ],
  purchase_requisition: [
    { value: 'total',    label: 'Monto Estimado', type: 'number' },
    { value: 'priority', label: 'Prioridad (normal/urgent/critical)', type: 'string' },
  ],
  purchase_order: [
    { value: 'total',  label: 'Monto Total',             type: 'number' },
    { value: 'req_id', label: 'Tiene Pedido de Origen',   type: 'exists' },
  ],
  payment_order: [
    { value: 'gross_amount', label: 'Monto Bruto', type: 'number' },
    { value: 'net_amount',   label: 'Monto Neto',  type: 'number' },
  ],
};

// ---- HTML ESCAPE HELPER ----
function escHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ====================================================================
// RENDER — MAIN PAGE
// ====================================================================
function renderAprobaciones() {
  const bc = document.getElementById('breadcrumb');
  if (bc) bc.innerHTML = '<i class="fas fa-check-double"></i><span>Aprobaciones</span>';

  const pendingCount = DB.getAll('approvalInstances').filter(function(i) { return i.status === 'pending'; }).length;

  var html = '<div style="padding:0 0 24px">';
  html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px">';
  html += '<div><h2 style="margin:0;font-size:20px;font-weight:700"><i class="fas fa-check-double text-primary"></i> Aprobaciones</h2>';
  html += '<p style="margin:4px 0 0;color:var(--text-muted);font-size:13px">Flujos parametrizables por tipo de operación — nada pasa sin aprobación</p></div>';
  if (pendingCount > 0) {
    html += '<span style="background:var(--danger);color:#fff;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700">';
    html += '<i class="fas fa-clock"></i> ' + pendingCount + ' pendiente' + (pendingCount !== 1 ? 's' : '') + '</span>';
  }
  html += '</div>';

  html += '<div class="tabs-container" id="aprobaciones-tabs">';
  html += '<div class="tabs-header">';
  html += '<button class="tab-btn" data-tab="appr-tab-pending">Pendientes';
  if (pendingCount > 0) html += ' <span style="background:var(--danger);color:#fff;border-radius:10px;padding:1px 8px;font-size:10px;font-weight:700;margin-left:4px">' + pendingCount + '</span>';
  html += '</button>';
  html += '<button class="tab-btn" data-tab="appr-tab-history">Historial</button>';
  html += '<button class="tab-btn" data-tab="appr-tab-config">Configuración de Flujos</button>';
  html += '</div>';
  html += '<div class="tab-content" id="appr-tab-pending">' + _apprBuildPendingList() + '</div>';
  html += '<div class="tab-content" id="appr-tab-history">' + _apprBuildHistoryList() + '</div>';
  html += '<div class="tab-content" id="appr-tab-config">' + _apprBuildWorkflowConfig() + '</div>';
  html += '</div></div>';

  document.getElementById('content').innerHTML = html;
  setTimeout(function() { initTabs('aprobaciones-tabs'); }, 0);
}

// ---- TAB: PENDING LIST ----
function _apprBuildPendingList() {
  const instances = DB.getAll('approvalInstances')
    .filter(function(i) { return i.status === 'pending'; })
    .sort(function(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });

  if (!instances.length) {
    return '<div style="text-align:center;padding:56px 0;color:var(--text-muted)">' +
      '<i class="fas fa-check-circle" style="font-size:48px;display:block;margin-bottom:14px;color:var(--success);opacity:.6"></i>' +
      '<div style="font-size:15px;font-weight:500">Sin aprobaciones pendientes</div>' +
      '<div style="font-size:13px;margin-top:4px">Todas las operaciones están al día</div></div>';
  }

  var html = '<div style="display:flex;flex-direction:column;gap:12px;padding:16px 0">';
  instances.forEach(function(inst) {
    const dtCfg = APPR_DOC_TYPES[inst.document_type] || { label: inst.document_type, icon: 'fa-file' };
    const doc = apprGetDocument(inst.document_type, inst.document_id);
    const docLabel = doc ? (doc.number || doc.name || inst.document_id) : inst.document_id;
    const currentStep = inst.steps[inst.current_step_index] || {};
    const stepNum = inst.current_step_index + 1;
    const totalSteps = inst.steps.length;

    html += '<div style="border:1px solid var(--border);border-radius:12px;padding:16px;background:var(--card-bg)">';
    html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">';

    // Left: info + step timeline
    html += '<div style="flex:1;min-width:0">';
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">';
    html += '<span style="background:var(--primary-soft,#e8f0fe);color:var(--primary);border-radius:8px;padding:4px 10px;font-size:12px;font-weight:600">';
    html += '<i class="fas ' + dtCfg.icon + '"></i> ' + dtCfg.label + '</span>';
    html += '<strong style="font-size:14px">' + escHtml(docLabel) + '</strong>';
    html += '</div>';

    // Step bubbles
    html += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px">';
    inst.steps.forEach(function(s, idx) {
      const approved = s.status === 'approved';
      const current = idx === inst.current_step_index;
      const dotBg = approved ? 'var(--success)' : (current ? 'var(--warning)' : '#e0e0e0');
      const dotColor = (approved || current) ? '#fff' : '#bbb';
      const dotIcon = approved ? 'fa-check' : (current ? 'fa-clock' : 'fa-circle');
      if (idx > 0) html += '<div style="width:24px;height:2px;background:' + (approved ? 'var(--success)' : '#e0e0e0') + ';flex-shrink:0"></div>';
      html += '<div title="' + escHtml(s.name + ': ' + (s.approver_name || 'Sin asignar')) + '"';
      html += ' style="background:' + dotBg + ';color:' + dotColor + ';border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0">';
      html += '<i class="fas ' + dotIcon + '"></i></div>';
    });
    html += '</div>';

    html += '<div style="font-size:12px;color:var(--text-muted)">';
    html += 'Paso <strong>' + stepNum + '/' + totalSteps + '</strong>: ' + escHtml(currentStep.name || '-');
    if (currentStep.approver_name) html += ' &mdash; Aprobador: <strong>' + escHtml(currentStep.approver_name) + '</strong>';
    html += '</div>';
    html += '<div style="font-size:11px;color:var(--text-muted);margin-top:3px">Flujo: ' + escHtml(inst.workflow_name || '-') + ' &nbsp;|&nbsp; Enviado: ' + fmtDate(inst.created_at) + '</div>';

    // ---- HISTORIAL DE PASOS ANTERIORES ----
    const doneSteps = inst.steps.filter(function(s) { return s.status === 'approved' || s.status === 'rejected'; });
    if (doneSteps.length) {
      html += '<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px;display:flex;flex-direction:column;gap:6px">';
      doneSteps.forEach(function(s) {
        const isAppr = s.status === 'approved';
        const iconColor = isAppr ? 'var(--success)' : 'var(--danger)';
        const icon = isAppr ? 'fa-check-circle' : 'fa-times-circle';
        html += '<div style="display:flex;gap:8px;align-items:flex-start">';
        html += '<i class="fas ' + icon + '" style="color:' + iconColor + ';font-size:13px;margin-top:2px;flex-shrink:0"></i>';
        html += '<div style="flex:1;min-width:0">';
        html += '<div style="font-size:11px;font-weight:600;color:var(--text)">';
        html += escHtml(s.name);
        if (s.approver_name) html += ' <span style="font-weight:400;color:var(--text-muted)">(' + escHtml(s.approver_name) + ')</span>';
        if (s.date) html += ' <span style="font-weight:400;color:var(--text-muted)">&mdash; ' + fmtDate(s.date) + '</span>';
        html += '</div>';
        if (s.comment) {
          html += '<div style="font-size:12px;color:var(--text-muted);font-style:italic;margin-top:2px">&ldquo;' + escHtml(s.comment) + '&rdquo;</div>';
        } else {
          html += '<div style="font-size:11px;color:var(--text-muted);opacity:.6">Sin comentarios</div>';
        }
        html += '</div></div>';
      });
      html += '</div>';
    }

    html += '</div>';

    // Right: action buttons
    html += '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">';
    html += '<button class="btn btn-success btn-sm" onclick="openApproveApprModal(\'' + inst.id + '\')">';
    html += '<i class="fas fa-check"></i> Aprobar</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="openRejectApprModal(\'' + inst.id + '\')">';
    html += '<i class="fas fa-times"></i> Rechazar</button>';
    html += '<button class="btn btn-ghost btn-sm" onclick="openApprDetailModal(\'' + inst.id + '\')">';
    html += '<i class="fas fa-eye"></i> Detalle</button>';
    html += '</div>';
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

// ---- TAB: HISTORY ----
function _apprBuildHistoryList() {
  const instances = DB.getAll('approvalInstances')
    .filter(function(i) { return i.status !== 'pending'; })
    .sort(function(a, b) { return (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''); });

  if (!instances.length) {
    return '<div style="text-align:center;padding:48px 0;color:var(--text-muted)">' +
      '<i class="fas fa-history" style="font-size:40px;display:block;margin-bottom:12px;opacity:.4"></i>' +
      '<div>Sin historial de aprobaciones</div></div>';
  }

  var html = '<div style="padding:16px 0"><div class="table-wrap"><table class="table"><thead><tr>';
  html += '<th>Tipo</th><th>Documento</th><th>Flujo</th><th>Pasos</th><th>Estado</th><th>Fecha</th><th></th></tr></thead><tbody>';

  instances.forEach(function(inst) {
    const dtCfg = APPR_DOC_TYPES[inst.document_type] || { label: inst.document_type, icon: 'fa-file' };
    const doc = apprGetDocument(inst.document_type, inst.document_id);
    const docLabel = doc ? (doc.number || doc.name || inst.document_id) : inst.document_id;
    const approvedCount = inst.steps.filter(function(s) { return s.status === 'approved'; }).length;
    const badgeCls = inst.status === 'approved' ? 'badge-green' : 'badge-red';
    const badgeLabel = inst.status === 'approved' ? 'Aprobado' : 'Rechazado';

    html += '<tr>';
    html += '<td style="font-size:12px"><i class="fas ' + dtCfg.icon + '"></i> ' + dtCfg.label + '</td>';
    html += '<td><strong>' + escHtml(docLabel) + '</strong></td>';
    html += '<td style="font-size:12px">' + escHtml(inst.workflow_name || '-') + '</td>';
    html += '<td style="font-size:12px">' + approvedCount + '/' + inst.steps.length + '</td>';
    html += '<td><span class="badge ' + badgeCls + '">' + badgeLabel + '</span></td>';
    html += '<td style="font-size:12px">' + fmtDate(inst.updated_at || inst.created_at) + '</td>';
    html += '<td><button class="btn btn-ghost btn-sm" onclick="openApprDetailModal(\'' + inst.id + '\')"><i class="fas fa-eye"></i></button></td>';
    html += '</tr>';
  });
  html += '</tbody></table></div></div>';
  return html;
}

// ---- TAB: WORKFLOW CONFIGURATION ----
function _apprBuildWorkflowConfig() {
  const workflows = DB.getAll('approvalWorkflows');
  const users = DB.getAll('users');

  var html = '<div style="padding:16px 0">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">';
  html += '<div><div style="font-weight:600;font-size:14px">Flujos de Aprobación</div>';
  html += '<div style="font-size:12px;color:var(--text-muted);margin-top:2px">Configurá aprobadores, condiciones de activación y pasos secuenciales</div></div>';
  html += '<button class="btn btn-primary" onclick="openApprWorkflowModal(null)"><i class="fas fa-plus"></i> Nuevo Flujo</button>';
  html += '</div>';

  if (!workflows.length) {
    html += '<div style="text-align:center;padding:40px;color:var(--text-muted);border:2px dashed var(--border);border-radius:12px">';
    html += '<i class="fas fa-project-diagram" style="font-size:36px;display:block;margin-bottom:12px;opacity:.4"></i>';
    html += '<div style="font-weight:500;font-size:15px">Sin flujos configurados</div>';
    html += '<div style="font-size:12px;margin-top:6px">Creá flujos para controlar qué operaciones requieren aprobación y quién aprueba</div>';
    html += '</div></div>';
    return html;
  }

  // Group by document type, show only types that have workflows
  const grouped = {};
  workflows.forEach(function(wf) {
    if (!grouped[wf.document_type]) grouped[wf.document_type] = [];
    grouped[wf.document_type].push(wf);
  });

  Object.keys(APPR_DOC_TYPES).forEach(function(dt) {
    const dtWfs = grouped[dt];
    if (!dtWfs || !dtWfs.length) return;
    const dtCfg = APPR_DOC_TYPES[dt];

    html += '<div style="margin-bottom:28px">';
    html += '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)">';
    html += '<i class="fas ' + dtCfg.icon + '"></i> ' + dtCfg.label + '</div>';

    dtWfs.forEach(function(wf) {
      html += '<div style="border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:8px;background:var(--card-bg)">';
      html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">';
      html += '<div style="flex:1">';
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
      html += '<strong style="font-size:14px">' + escHtml(wf.name) + '</strong>';
      if (!wf.active) html += '<span style="background:#e0e0e0;color:#888;font-size:11px;padding:1px 8px;border-radius:10px">Inactivo</span>';
      html += '<span style="font-size:11px;color:var(--text-muted)">Prioridad: ' + (wf.priority || 1) + '</span>';
      html += '</div>';

      // Conditions summary
      const conds = wf.conditions || [];
      if (conds.length) {
        html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Condición: ';
        html += conds.map(function(c) {
          const fields = APPR_DOC_FIELDS[wf.document_type] || [];
          const fieldCfg = fields.find(function(f) { return f.value === c.field; }) || { label: c.field };
          const opCfg = APPR_COND_OPS.find(function(o) { return o.value === c.op; }) || { label: c.op };
          const valStr = (c.op === 'exists' || c.op === 'not_exists') ? '' : (' <strong>' + escHtml(String(c.value || '')) + '</strong>');
          return '<em>' + fieldCfg.label + '</em> ' + opCfg.label + valStr;
        }).join(' <span style="color:var(--primary);font-weight:700">Y</span> ');
        html += '</div>';
      } else {
        html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Sin condiciones &mdash; aplica siempre a ' + dtCfg.label + '</div>';
      }

      // Steps
      html += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">';
      (wf.steps || []).forEach(function(s, idx) {
        const pool = _apprStepPool(s);
        if (idx > 0) html += '<i class="fas fa-arrow-right" style="font-size:10px;color:var(--text-muted)"></i>';
        html += '<span style="background:var(--bg);border:1px solid var(--border);border-radius:20px;padding:3px 10px;font-size:11px">';
        html += '<strong style="color:var(--primary)">P' + s.step + '</strong> ' + escHtml(s.name);
        if (s.selectable) html += ' <span style="background:var(--primary-soft,#e8f0fe);color:var(--primary);border-radius:8px;padding:0 6px;font-size:10px;font-weight:600">elegible</span>';
        if (pool.length) html += ' <span style="color:var(--text-muted)">(' + escHtml(pool.map(_apprUserName).join(', ')) + ')</span>';
        html += '</span>';
      });
      html += '</div></div>';

      html += '<div style="display:flex;gap:6px;flex-shrink:0">';
      html += '<button class="btn btn-ghost btn-sm" onclick="openApprWorkflowModal(\'' + wf.id + '\')"><i class="fas fa-edit"></i></button>';
      html += '<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="deleteApprWorkflow(\'' + wf.id + '\')"><i class="fas fa-trash"></i></button>';
      html += '</div>';
      html += '</div></div>';
    });
    html += '</div>';
  });

  html += '</div>';
  return html;
}

// ====================================================================
// WORKFLOW CRUD MODAL
// ====================================================================
function openApprWorkflowModal(id) {
  const wf = id ? DB.getById('approvalWorkflows', id) : null;
  const users = DB.getAll('users').filter(function(u) { return u.active !== false; });
  const initDt = wf ? wf.document_type : 'certificate';

  var dtOpts = '';
  Object.keys(APPR_DOC_TYPES).forEach(function(dt) {
    dtOpts += '<option value="' + dt + '"' + (initDt === dt ? ' selected' : '') + '>' + APPR_DOC_TYPES[dt].label + '</option>';
  });

  var condHtml = '';
  if (wf && wf.conditions && wf.conditions.length) {
    wf.conditions.forEach(function(c) { condHtml += _apprCondRowHtml(initDt, c); });
  }
  var stepsHtml = '';
  if (wf && wf.steps && wf.steps.length) {
    wf.steps.forEach(function(s) { stepsHtml += _apprStepRowHtml(users, s); });
  }

  var body = '<div style="display:flex;flex-direction:column;gap:16px">';

  body += '<div class="form-group"><label>Nombre del Flujo *</label>';
  body += '<input type="text" class="form-control" id="appr-wf-name" value="' + escHtml(wf ? wf.name : '') + '" placeholder="Ej: Certificaciones — Alta Gerencia"></div>';

  body += '<div style="display:flex;gap:12px;align-items:flex-end">';
  body += '<div class="form-group" style="flex:1"><label>Tipo de Operación *</label>';
  body += '<select class="form-control" id="appr-wf-doctype" onchange="onApprDocTypeChange()">' + dtOpts + '</select></div>';
  body += '<div class="form-group" style="width:110px"><label>Prioridad</label>';
  body += '<input type="number" class="form-control" id="appr-wf-priority" value="' + (wf ? (wf.priority || 1) : 1) + '" min="1">';
  body += '<div style="font-size:11px;color:var(--text-muted);margin-top:3px">Mayor = primero en evaluarse</div></div>';
  body += '<div class="form-group" style="width:80px;text-align:center"><label>Activo</label>';
  body += '<div style="padding-top:10px"><input type="checkbox" id="appr-wf-active" style="width:20px;height:20px"' + (!wf || wf.active !== false ? ' checked' : '') + '></div></div>';
  body += '</div>';

  // Conditions
  body += '<div style="border:1px solid var(--border);border-radius:8px;padding:14px">';
  body += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
  body += '<div><span style="font-weight:600;font-size:13px">Condiciones de Activación</span>';
  body += '<span style="font-size:11px;color:var(--text-muted)"> — todas deben cumplirse para que aplique este flujo</span></div>';
  body += '<button type="button" class="btn btn-ghost btn-sm" onclick="apprAddCondRow()"><i class="fas fa-plus"></i> Agregar</button></div>';
  body += '<div id="appr-wf-conds">';
  body += condHtml || '<div id="appr-conds-empty" style="color:var(--text-muted);font-size:12px;padding:4px 0">Sin condiciones &mdash; este flujo aplica a <em>todos</em> los documentos de este tipo</div>';
  body += '</div></div>';

  // Steps
  body += '<div style="border:1px solid var(--border);border-radius:8px;padding:14px">';
  body += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
  body += '<span style="font-weight:600;font-size:13px">Pasos de Aprobación *</span>';
  body += '<button type="button" class="btn btn-ghost btn-sm" onclick="apprAddStepRow()"><i class="fas fa-plus"></i> Agregar Paso</button></div>';
  body += '<div id="appr-wf-steps">';
  body += stepsHtml || '<div id="appr-steps-empty" style="color:var(--text-muted);font-size:12px;padding:4px 0">Agregá al menos un paso de aprobación</div>';
  body += '</div></div>';

  body += '</div>';

  openModal(wf ? 'Editar Flujo de Aprobación' : 'Nuevo Flujo de Aprobación', body, 'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="saveApprWorkflow(\'' + (id || '') + '\')"><i class="fas fa-save"></i> Guardar Flujo</button>'
  );
}

function _apprCondRowHtml(docType, cond) {
  const fields = APPR_DOC_FIELDS[docType] || [];
  const fieldOpts = fields.map(function(f) {
    return '<option value="' + f.value + '"' + (cond && cond.field === f.value ? ' selected' : '') + '>' + f.label + '</option>';
  }).join('');
  const opOpts = APPR_COND_OPS.map(function(o) {
    return '<option value="' + o.value + '"' + (cond && cond.op === o.value ? ' selected' : '') + '>' + o.label + '</option>';
  }).join('');
  const isExist = cond && (cond.op === 'exists' || cond.op === 'not_exists');

  var html = '<div class="appr-cond-row" style="display:flex;gap:8px;align-items:center;margin-bottom:8px">';
  html += '<select class="form-control" style="flex:1;min-width:130px" name="c_field">' + fieldOpts + '</select>';
  html += '<select class="form-control" style="flex:1;min-width:120px" name="c_op" onchange="onApprCondOpChange(this)">' + opOpts + '</select>';
  html += '<input type="text" class="form-control" style="flex:1;min-width:80px' + (isExist ? ';display:none' : '') + '" name="c_val"';
  html += ' placeholder="Valor" value="' + escHtml(cond && cond.value != null ? String(cond.value) : '') + '">';
  html += '<button type="button" class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="this.closest(\'.appr-cond-row\').remove();apprRefreshCondsEmpty()">';
  html += '<i class="fas fa-times"></i></button></div>';
  return html;
}

// Returns the pool of eligible approver user ids for a step (back-compat with legacy single approver)
function _apprStepPool(s) {
  if (!s) return [];
  if (s.approver_user_ids && s.approver_user_ids.length) return s.approver_user_ids.slice();
  if (s.approver_user_id) return [s.approver_user_id];
  return [];
}

function _apprUserName(uid) {
  const u = DB.getById('users', uid);
  return u ? (u.name || u.email || uid) : uid;
}

// Human label for an instance step: the resolved approver, or the eligible pool
function _apprApproverLabel(pool, resolvedId) {
  if (resolvedId) return _apprUserName(resolvedId);
  if (pool && pool.length === 1) return _apprUserName(pool[0]);
  if (pool && pool.length > 1) return 'Cualquiera de: ' + pool.map(_apprUserName).join(', ');
  return 'Sin asignar';
}

// Checkbox grid of users for a step's eligible-approver pool
function _apprStepUserCheckboxes(users, selectedIds) {
  selectedIds = selectedIds || [];
  if (!users.length) return '<div style="font-size:12px;color:var(--text-muted)">No hay usuarios activos. Creá usuarios en el módulo Usuarios.</div>';
  return users.map(function(u) {
    const checked = selectedIds.indexOf(u.id) !== -1 ? ' checked' : '';
    return '<label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;background:var(--card-bg);border:1px solid var(--border);padding:5px 10px;border-radius:16px;cursor:pointer">' +
      '<input type="checkbox" class="s_user" value="' + u.id + '"' + checked + '>' + escHtml(u.name || u.email || u.id) + '</label>';
  }).join('');
}

function _apprStepRowHtml(users, step) {
  const stepNum = step ? step.step : 1;
  const pool = _apprStepPool(step);
  const selectable = step && step.selectable;

  var html = '<div class="appr-step-row" style="background:var(--bg);padding:12px;border-radius:8px;margin-bottom:10px">';
  html += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">';
  html += '<span class="appr-step-num" style="background:var(--primary);color:#fff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">' + stepNum + '</span>';
  html += '<input type="text" class="form-control" style="flex:1" name="s_name" placeholder="Nombre del paso (ej: Director de Área)" value="' + escHtml(step ? step.name : '') + '">';
  html += '<button type="button" class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="apprRemoveStepRow(this)"><i class="fas fa-times"></i></button>';
  html += '</div>';
  html += '<div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:6px">Aprobadores elegibles (podés marcar varios)</div>';
  html += '<div class="appr-step-users" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">' + _apprStepUserCheckboxes(users, pool) + '</div>';
  html += '<label style="display:inline-flex;align-items:center;gap:8px;font-size:12px;cursor:pointer">';
  html += '<input type="checkbox" name="s_selectable"' + (selectable ? ' checked' : '') + ' style="width:16px;height:16px">';
  html += '<span>Permitir que <strong>quien carga</strong> elija el aprobador al enviar</span></label>';
  html += '</div>';
  return html;
}

// ---- FORM HELPERS ----
function onApprDocTypeChange() {
  const container = document.getElementById('appr-wf-conds');
  if (container && container.querySelectorAll('.appr-cond-row').length) {
    container.innerHTML = '<div id="appr-conds-empty" style="color:var(--text-muted);font-size:12px;padding:4px 0">Condiciones limpiadas. Volvé a agregar.</div>';
  }
}

function onApprCondOpChange(sel) {
  const row = sel.closest('.appr-cond-row');
  if (!row) return;
  const valInput = row.querySelector('[name="c_val"]');
  if (valInput) valInput.style.display = (sel.value === 'exists' || sel.value === 'not_exists') ? 'none' : '';
}

function apprAddCondRow() {
  const docType = document.getElementById('appr-wf-doctype').value;
  const container = document.getElementById('appr-wf-conds');
  if (!container) return;
  const empty = document.getElementById('appr-conds-empty');
  if (empty) empty.remove();
  container.insertAdjacentHTML('beforeend', _apprCondRowHtml(docType, null));
}

function apprRefreshCondsEmpty() {
  const container = document.getElementById('appr-wf-conds');
  if (!container) return;
  if (!container.querySelector('.appr-cond-row')) {
    container.innerHTML = '<div id="appr-conds-empty" style="color:var(--text-muted);font-size:12px;padding:4px 0">Sin condiciones &mdash; aplica a todos los documentos de este tipo</div>';
  }
}

function apprAddStepRow() {
  const container = document.getElementById('appr-wf-steps');
  if (!container) return;
  const empty = document.getElementById('appr-steps-empty');
  if (empty) empty.remove();
  const nextNum = container.querySelectorAll('.appr-step-row').length + 1;
  const users = DB.getAll('users').filter(function(u) { return u.active !== false; });
  container.insertAdjacentHTML('beforeend', _apprStepRowHtml(users, { step: nextNum }));
}

function apprRemoveStepRow(btn) {
  const row = btn.closest('.appr-step-row');
  if (row) row.remove();
  const container = document.getElementById('appr-wf-steps');
  if (!container) return;
  const rows = container.querySelectorAll('.appr-step-row');
  rows.forEach(function(r, i) {
    const numEl = r.querySelector('.appr-step-num');
    if (numEl) numEl.textContent = i + 1;
  });
  if (!rows.length) {
    container.innerHTML = '<div id="appr-steps-empty" style="color:var(--text-muted);font-size:12px;padding:4px 0">Agregá al menos un paso de aprobación</div>';
  }
}

function saveApprWorkflow(id) {
  const name = document.getElementById('appr-wf-name').value.trim();
  if (!name) { toast('El nombre es obligatorio', 'error'); return; }
  const docType  = document.getElementById('appr-wf-doctype').value;
  const priority = parseInt(document.getElementById('appr-wf-priority').value) || 1;
  const active   = document.getElementById('appr-wf-active').checked;

  const conditions = [];
  document.querySelectorAll('.appr-cond-row').forEach(function(row) {
    const field = row.querySelector('[name="c_field"]').value;
    const op    = row.querySelector('[name="c_op"]').value;
    const valEl = row.querySelector('[name="c_val"]');
    const value = (op === 'exists' || op === 'not_exists') ? null : (valEl ? valEl.value.trim() : '');
    if (field && op) conditions.push({ field, op, value });
  });

  const steps = [];
  let valid = true;
  document.querySelectorAll('.appr-step-row').forEach(function(row, idx) {
    const sName = row.querySelector('[name="s_name"]').value.trim();
    if (!sName) { toast('El nombre del paso ' + (idx + 1) + ' es obligatorio', 'error'); valid = false; return; }
    const ids = Array.prototype.slice.call(row.querySelectorAll('.s_user:checked')).map(function(cb) { return cb.value; });
    if (!ids.length) { toast('Elegí al menos un aprobador para el paso ' + (idx + 1), 'error'); valid = false; return; }
    const selectableEl = row.querySelector('[name="s_selectable"]');
    const selectable = selectableEl ? selectableEl.checked : false;
    const poolLabel = _apprApproverLabel(ids, '');
    steps.push({
      step: idx + 1,
      name: sName,
      approver_user_ids: ids,
      approver_user_id: ids.length === 1 ? ids[0] : '', // legacy/back-compat
      approver_name: poolLabel,
      selectable: selectable,
    });
  });
  if (!valid) return;
  if (!steps.length) { toast('Agregá al menos un paso de aprobación', 'error'); return; }

  const data = { name, document_type: docType, active, priority, conditions, steps };
  if (id) { DB.update('approvalWorkflows', id, data); toast('Flujo actualizado', 'success'); }
  else    { DB.insert('approvalWorkflows', data);     toast('Flujo creado', 'success'); }
  closeModal();
  renderAprobaciones();
}

function deleteApprWorkflow(id) {
  confirmDialog('¿Eliminar este flujo de aprobación? Los documentos en curso no se verán afectados.', function() {
    DB.remove('approvalWorkflows', id);
    toast('Flujo eliminado', 'success');
    renderAprobaciones();
  });
}

// ====================================================================
// CORE ENGINE  (global — callable from all modules)
// ====================================================================

function apprGetDocument(docType, docId) {
  const cfg = APPR_DOC_TYPES[docType];
  return cfg ? DB.getById(cfg.collection, docId) : null;
}

function apprGetWorkflow(docType, docData) {
  const wfs = DB.getAll('approvalWorkflows')
    .filter(function(wf) { return wf.active !== false && wf.document_type === docType; })
    .sort(function(a, b) { return (b.priority || 1) - (a.priority || 1); });
  return wfs.find(function(wf) { return apprEvalConds(wf.conditions || [], docData); }) || null;
}

function apprEvalConds(conds, doc) {
  if (!conds || !conds.length) return true;
  return conds.every(function(c) {
    const val = doc ? doc[c.field] : undefined;
    switch (c.op) {
      case 'exists':     return val !== undefined && val !== null && val !== '';
      case 'not_exists': return val === undefined || val === null || val === '';
      case 'gt':  return parseFloat(val) > parseFloat(c.value);
      case 'gte': return parseFloat(val) >= parseFloat(c.value);
      case 'lt':  return parseFloat(val) < parseFloat(c.value);
      case 'lte': return parseFloat(val) <= parseFloat(c.value);
      case 'eq':  return String(val) === String(c.value);
      case 'neq': return String(val) !== String(c.value);
      default:    return true;
    }
  });
}

// Returns true if document can proceed without approval
function isApproved(docType, docId) {
  const doc = apprGetDocument(docType, docId);
  if (!doc) return false;
  if (!apprGetWorkflow(docType, doc)) return true; // no workflow → auto-allowed
  return DB.getAll('approvalInstances').some(function(i) {
    return i.document_type === docType && i.document_id === docId && i.status === 'approved';
  });
}

// Returns most recent approval instance for a document
function getApprovalInstance(docType, docId) {
  const instances = DB.getAll('approvalInstances')
    .filter(function(i) { return i.document_type === docType && i.document_id === docId; })
    .sort(function(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
  return instances[0] || null;
}

// Submit document into the approval workflow. Returns instance or null.
// `chosen` (optional) maps step index → chosen approver user id, for selectable steps.
function submitForApproval(docType, docId, chosen) {
  const doc = apprGetDocument(docType, docId);
  if (!doc) { toast('Documento no encontrado', 'error'); return null; }

  const alreadyPending = DB.getAll('approvalInstances').find(function(i) {
    return i.document_type === docType && i.document_id === docId && i.status === 'pending';
  });
  if (alreadyPending) { toast('Ya hay una solicitud de aprobación pendiente', 'warning'); return alreadyPending; }

  const wf = apprGetWorkflow(docType, doc);
  const dtCfg = APPR_DOC_TYPES[docType];

  if (!wf) {
    // Auto-approve — no workflow configured
    if (dtCfg) DB.update(dtCfg.collection, docId, { status: dtCfg.statusApproved });
    _apprAppendLog(docType, docId, { action: 'approved', comment: 'Aprobación automática (sin flujo configurado)' });
    toast('Aprobado automáticamente — sin flujo configurado para este tipo', 'success');
    return null;
  }

  // If any step lets the loader choose the approver, ask them first (unless already chosen)
  const hasSelectable = (wf.steps || []).some(function(s) { return s.selectable && _apprStepPool(s).length; });
  if (hasSelectable && !chosen) {
    openApprSelectApproversModal(docType, docId, wf.id);
    return null;
  }

  const steps = (wf.steps || []).map(function(s, idx) {
    const pool = _apprStepPool(s);
    let resolvedId = '';
    if (s.selectable && chosen && chosen[idx]) resolvedId = chosen[idx];
    else if (pool.length === 1) resolvedId = pool[0];
    return {
      step: s.step,
      name: s.name,
      eligible_user_ids: pool,
      selectable: !!s.selectable,
      approver_user_id: resolvedId,
      approver_name: _apprApproverLabel(pool, resolvedId),
      status: 'pending', comment: '', date: '',
    };
  });

  const instance = DB.insert('approvalInstances', {
    document_type:      docType,
    document_id:        docId,
    workflow_id:        wf.id,
    workflow_name:      wf.name,
    status:             'pending',
    current_step_index: 0,
    created_at:         todayStr(),
    updated_at:         todayStr(),
    steps,
  });

  if (dtCfg) DB.update(dtCfg.collection, docId, { status: dtCfg.statusPending });
  _apprAppendLog(docType, docId, { action: 'submitted', comment: 'Enviado al flujo: ' + wf.name });
  toast('Enviado a aprobación (' + wf.name + ')', 'success');
  return instance;
}

// Modal shown at submission so the loader picks approvers for selectable steps
function openApprSelectApproversModal(docType, docId, workflowId) {
  const wf = DB.getById('approvalWorkflows', workflowId);
  if (!wf) return;
  var body = '<div style="font-size:13px;margin-bottom:14px;color:var(--text-muted)">Elegí a quién solicitar la aprobación en cada paso. Cada responsable aprobará el gasto de su área.</div>';
  (wf.steps || []).forEach(function(s, idx) {
    const pool = _apprStepPool(s);
    body += '<div class="form-group">';
    body += '<label class="form-label">Paso ' + (idx + 1) + ': ' + escHtml(s.name);
    if (s.selectable) body += ' <span class="badge badge-blue">Elegible</span>';
    body += '</label>';
    if (s.selectable && pool.length) {
      body += '<select class="form-control appr-pick" data-step="' + idx + '">';
      body += '<option value="">— Seleccionar aprobador —</option>';
      pool.forEach(function(uid) { body += '<option value="' + uid + '">' + escHtml(_apprUserName(uid)) + '</option>'; });
      body += '</select>';
    } else {
      body += '<div style="font-size:12px;color:var(--text-muted);padding:4px 0">Aprobador: ' + escHtml(_apprApproverLabel(pool, '')) + '</div>';
    }
    body += '</div>';
  });
  openModal('Solicitar Aprobación', body, '',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="apprConfirmSelectApprovers(\'' + docType + '\',\'' + docId + '\')"><i class="fas fa-paper-plane"></i> Enviar a Aprobación</button>'
  );
}

function apprConfirmSelectApprovers(docType, docId) {
  const chosen = {};
  let ok = true;
  document.querySelectorAll('.appr-pick').forEach(function(sel) {
    const idx = parseInt(sel.getAttribute('data-step'), 10);
    if (!sel.value) { ok = false; return; }
    chosen[idx] = sel.value;
  });
  if (!ok) { toast('Seleccioná un aprobador para cada paso elegible', 'error'); return; }
  closeModal();
  submitForApproval(docType, docId, chosen);
  if (window.APP_STATE && window.APP_STATE.currentModule) navigate(window.APP_STATE.currentModule);
}

// Approve current step
function apprDoApprove(instanceId, comment) {
  const inst = DB.getById('approvalInstances', instanceId);
  if (!inst) return;
  const steps = inst.steps.slice();
  steps[inst.current_step_index] = Object.assign({}, steps[inst.current_step_index], { status: 'approved', comment: comment || '', date: todayStr() });
  const nextIdx = inst.current_step_index + 1;
  const isLast  = nextIdx >= steps.length;

  if (isLast) {
    DB.update('approvalInstances', instanceId, { steps, status: 'approved', updated_at: todayStr() });
    const dtCfg = APPR_DOC_TYPES[inst.document_type];
    if (dtCfg) DB.update(dtCfg.collection, inst.document_id, { status: dtCfg.statusApproved });
    _apprAppendLog(inst.document_type, inst.document_id, { action: 'approved', comment });
    toast('Aprobado en todos los pasos', 'success');
  } else {
    DB.update('approvalInstances', instanceId, { steps, current_step_index: nextIdx, updated_at: todayStr() });
    toast('Paso aprobado. Siguiente: ' + steps[nextIdx].name, 'success');
  }
}

// Reject current step
function apprDoReject(instanceId, comment) {
  const inst = DB.getById('approvalInstances', instanceId);
  if (!inst || !comment) return;
  const steps = inst.steps.slice();
  steps[inst.current_step_index] = Object.assign({}, steps[inst.current_step_index], { status: 'rejected', comment, date: todayStr() });
  DB.update('approvalInstances', instanceId, { steps, status: 'rejected', updated_at: todayStr() });
  const dtCfg = APPR_DOC_TYPES[inst.document_type];
  if (dtCfg) DB.update(dtCfg.collection, inst.document_id, { status: dtCfg.statusRejected });
  _apprAppendLog(inst.document_type, inst.document_id, { action: 'rejected', comment });
  toast('Documento rechazado', 'error');
}

function _apprAppendLog(docType, docId, entry) {
  const cfg = APPR_DOC_TYPES[docType];
  if (!cfg) return;
  const doc = DB.getById(cfg.collection, docId);
  if (!doc) return;
  const log = (doc.approval_log || []).concat([Object.assign({ date: todayStr(), user: 'Administrador' }, entry)]);
  DB.update(cfg.collection, docId, { approval_log: log });
}

// Returns an HTML badge showing current approval state — embed in other module UIs
function apprBadgeHtml(docType, docId) {
  const inst = getApprovalInstance(docType, docId);
  if (!inst) {
    const doc = apprGetDocument(docType, docId);
    if (!doc || !apprGetWorkflow(docType, doc)) return '';
    return '<span style="background:#e0e0e0;color:#888;font-size:11px;padding:2px 9px;border-radius:10px">Sin enviar</span>';
  }
  const cfg = {
    pending:  { bg: 'var(--warning)',  label: 'En aprobación' },
    approved: { bg: 'var(--success)',  label: 'Aprobado' },
    rejected: { bg: 'var(--danger)',   label: 'Rechazado' },
  };
  const c = cfg[inst.status] || { bg: '#e0e0e0', label: inst.status };
  let label = c.label;
  if (inst.status === 'pending') {
    const s = inst.steps[inst.current_step_index];
    label += ' (' + (inst.current_step_index + 1) + '/' + inst.steps.length;
    if (s && s.approver_name) label += ': ' + s.approver_name;
    label += ')';
  }
  return '<span style="background:' + c.bg + ';color:#fff;font-size:11px;padding:2px 10px;border-radius:10px">' + label + '</span>';
}

// ====================================================================
// APPROVE / REJECT MODALS
// ====================================================================
function openApproveApprModal(instanceId) {
  const inst = DB.getById('approvalInstances', instanceId);
  if (!inst) return;
  const step = inst.steps[inst.current_step_index] || {};
  openModal('Aprobar — ' + escHtml(step.name || 'Paso'),
    '<div class="form-group"><label>Comentario (opcional)</label>' +
    '<textarea class="form-control" id="appr-comment" rows="3" placeholder="Observaciones sobre la aprobación..."></textarea></div>',
    '',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-success" onclick="' +
    'apprDoApprove(\'' + instanceId + '\', document.getElementById(\'appr-comment\').value);' +
    'closeModal(); renderAprobaciones();">' +
    '<i class="fas fa-check"></i> Confirmar Aprobación</button>'
  );
}

function openRejectApprModal(instanceId) {
  const inst = DB.getById('approvalInstances', instanceId);
  if (!inst) return;
  const step = inst.steps[inst.current_step_index] || {};
  openModal('Rechazar — ' + escHtml(step.name || 'Paso'),
    '<div class="form-group"><label>Motivo del rechazo <span style="color:var(--danger)">*</span></label>' +
    '<textarea class="form-control" id="appr-reject-comment" rows="3" placeholder="Indicá el motivo del rechazo..."></textarea></div>',
    '',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-danger" onclick="' +
    'var c=document.getElementById(\'appr-reject-comment\').value.trim();' +
    'if(!c){toast(\'El motivo es obligatorio\',\'error\');return;}' +
    'apprDoReject(\'' + instanceId + '\',c);closeModal();renderAprobaciones();">' +
    '<i class="fas fa-times"></i> Confirmar Rechazo</button>'
  );
}

function openApprDetailModal(instanceId) {
  const inst = DB.getById('approvalInstances', instanceId);
  if (!inst) return;
  const dtCfg = APPR_DOC_TYPES[inst.document_type] || { label: inst.document_type, icon: 'fa-file' };
  const doc = apprGetDocument(inst.document_type, inst.document_id);
  const docLabel = doc ? (doc.number || doc.name || inst.document_id) : inst.document_id;

  var body = '<div style="display:flex;flex-direction:column;gap:12px">';
  body += '<div style="background:var(--bg);border-radius:8px;padding:12px;font-size:13px;line-height:1.7">';
  body += '<strong>' + dtCfg.label + ':</strong> ' + escHtml(docLabel) + ' &nbsp;|&nbsp; ';
  body += '<strong>Flujo:</strong> ' + escHtml(inst.workflow_name || '-') + ' &nbsp;|&nbsp; ';
  body += '<strong>Enviado:</strong> ' + fmtDate(inst.created_at);
  body += '</div>';

  inst.steps.forEach(function(s, idx) {
    const isCurrent = idx === inst.current_step_index && inst.status === 'pending';
    const bg = s.status === 'approved' ? 'var(--success)' : (s.status === 'rejected' ? 'var(--danger)' : (isCurrent ? 'var(--warning)' : '#e0e0e0'));
    const statusLabel = s.status === 'approved' ? 'Aprobado' : (s.status === 'rejected' ? 'Rechazado' : (isCurrent ? 'En curso' : 'Pendiente'));
    const textColor = (s.status !== 'pending' || isCurrent) ? '#fff' : '#888';
    body += '<div style="display:flex;gap:10px;padding:12px;border-radius:8px;background:var(--card-bg);border:1px solid var(--border)">';
    body += '<div style="background:' + bg + ';color:' + textColor + ';border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">' + s.step + '</div>';
    body += '<div style="flex:1">';
    body += '<div style="font-weight:600;font-size:13px">' + escHtml(s.name) + '</div>';
    body += '<div style="font-size:12px;color:var(--text-muted)">Aprobador: ' + escHtml(s.approver_name || 'Sin asignar') + '</div>';
    body += '<div style="font-size:12px;margin-top:4px"><span style="background:' + bg + ';color:' + textColor + ';border-radius:10px;padding:1px 9px">' + statusLabel + '</span>';
    if (s.date) body += ' &mdash; ' + fmtDate(s.date);
    if (s.comment) body += '<br><em style="color:var(--text-muted);font-size:12px">&ldquo;' + escHtml(s.comment) + '&rdquo;</em>';
    body += '</div></div></div>';
  });
  body += '</div>';

  const footer = (inst.status === 'pending')
    ? '<button class="btn btn-success btn-sm" onclick="closeModal();openApproveApprModal(\'' + inst.id + '\')"><i class="fas fa-check"></i> Aprobar</button>' +
      ' <button class="btn btn-danger btn-sm" onclick="closeModal();openRejectApprModal(\'' + inst.id + '\')"><i class="fas fa-times"></i> Rechazar</button>' +
      ' <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>'
    : '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>';

  openModal('Detalle de Aprobación', body, 'modal-lg', footer);
}
