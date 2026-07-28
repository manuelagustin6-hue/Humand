/* ===== PANEL DE OBRA — dashboard ejecutivo por proyecto (estilo control panel) =====
   Ensambla, para un proyecto, lo que ya cargás en el resto de módulos:
   cronograma, presupuesto, certificaciones, contratos, compras, facturación,
   RFIs, Submittals y aprobaciones — con semáforo verde/amarillo/rojo.          */

function _poNum(v) { return (typeof v === 'number' && !isNaN(v)) ? v : 0; }
function _poPct(a, b) { return b > 0 ? (a / b * 100) : 0; }
function _poSem(cls) { return { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444', gray: '#94a3b8' }[cls] || '#94a3b8'; }

function renderPanelObra() {
  var projects = DB.getAll('projects');
  if (!projects.length) {
    document.getElementById('content').innerHTML =
      '<div class="page-header"><div><div class="page-title">Panel de Obra</div></div></div>' +
      '<div class="empty-state"><i class="fas fa-gauge-high"></i><p>No hay proyectos creados aún.</p></div>';
    return;
  }
  var pid = window._panelProject || (window.APP_STATE && window.APP_STATE.activeProject) || projects[0].id;
  if (!projects.find(function(p){ return p.id === pid; })) pid = projects[0].id;
  window._panelProject = pid;
  var p = DB.getById('projects', pid) || {};

  // ---- datos del proyecto ----
  var byP = function(coll) { return DB.getAll(coll).filter(function(x){ return x.project_id === pid; }); };
  var tasks = byP('tasks');
  var progress = tasks.length ? Math.round(tasks.reduce(function(s,t){ return s + _poNum(t.progress); }, 0) / tasks.length) : _poNum(p.progress);

  var contracts = byP('contracts');
  var contratado = contracts.reduce(function(s,c){ return s + _poNum(c.total_amount); }, 0);
  var adicNet = contracts.reduce(function(s,c){ return s + ((typeof adicionalesNet === 'function') ? adicionalesNet(c.adicionales || []) : 0); }, 0);

  var certs = byP('certificates');
  var certificado = certs.reduce(function(s,c){ return s + _poNum(c.net_amount); }, 0);
  var certRetenido = certs.reduce(function(s,c){ return s + _poNum(c.retention_amount); }, 0);

  var invoices = byP('invoices');
  var facturado = invoices.reduce(function(s,i){ return s + _poNum(i.total); }, 0);
  var collections = DB.getAll('collections').filter(function(c){
    if (c.project_id === pid) return true;
    var inv = c.invoice_id ? DB.getById('invoices', c.invoice_id) : null;
    return inv && inv.project_id === pid;
  });
  var cobrado = collections.reduce(function(s,c){ return s + _poNum(c.amount); }, 0);
  var porCobrar = Math.max(0, facturado - cobrado);

  var pos = byP('purchaseOrders');
  var comprado = pos.reduce(function(s,o){ return s + _poNum(o.total); }, 0);

  var rfis = byP('rfis');
  var rfiOpen = rfis.filter(function(r){ return r.status === 'open'; }).length;
  var rfiOver = rfis.filter(function(r){ return r.status === 'open' && r.due_date && r.due_date < todayStr(); }).length;

  var subs = byP('submittals');
  var subOpenStates = ['draft','submitted','under_review','revise_resubmit'];
  var subOpen = subs.filter(function(s){ return subOpenStates.indexOf(s.status) !== -1; }).length;
  var subOver = subs.filter(function(s){ return subOpenStates.indexOf(s.status) !== -1 && s.due_date && s.due_date < todayStr(); }).length;
  var subApr = subs.filter(function(s){ return s.status === 'approved' || s.status === 'approved_as_noted'; }).length;

  var apprPend = DB.getAll('approvalInstances').filter(function(i){ return i.status === 'pending'; }).length;

  // ---- cronograma / semáforo ----
  var presupuesto = _poNum(p.budget) || contratado;
  var econPct = _poPct(certificado, presupuesto);
  var timePct = 0;
  if (p.start_date && p.end_date) {
    var tot = daysBetween(p.start_date, p.end_date);
    var el = daysBetween(p.start_date, todayStr());
    timePct = tot > 0 ? Math.max(0, Math.min(100, el / tot * 100)) : 0;
  }
  // salud de cronograma: avance físico vs tiempo transcurrido, y atraso de hitos
  var schedGap = progress - timePct;   // >0 adelantado, <0 atrasado
  var schedCls = schedGap >= -5 ? 'green' : (schedGap >= -15 ? 'yellow' : 'red');
  var msDelay = (typeof _milestonesScheduleDelay === 'function') ? _milestonesScheduleDelay(pid) : null;
  if (msDelay != null && msDelay > 0) {
    var _rk = { green: 0, yellow: 1, red: 2 };
    var msCls = msDelay > 15 ? 'red' : 'yellow';
    if (_rk[msCls] > _rk[schedCls]) schedCls = msCls;   // se queda con el peor
  }
  // salud presupuestaria: certificado vs presupuesto
  var budgetCls = econPct <= 100 ? (econPct <= 90 ? 'green' : 'yellow') : 'red';
  // salud documental: vencidos
  var docCls = (rfiOver + subOver) === 0 ? 'green' : ((rfiOver + subOver) <= 2 ? 'yellow' : 'red');
  // semáforo general = el peor
  var order = { green: 0, yellow: 1, red: 2 };
  var overall = [schedCls, budgetCls, docCls].reduce(function(w, c){ return order[c] > order[w] ? c : w; }, 'green');
  var overallTxt = { green: 'En marcha', yellow: 'Atención', red: 'En riesgo' }[overall];

  // ---- render ----
  var projOpts = projects.map(function(pp){ return '<option value="' + pp.id + '"' + (pp.id === pid ? ' selected' : '') + '>' + escapeHtml(pp.name) + '</option>'; }).join('');

  document.getElementById('content').innerHTML =
    '<div class="page-header"><div>' +
      '<div class="page-title"><i class="fas fa-gauge-high" style="margin-right:8px;color:var(--primary)"></i>Panel de Obra</div>' +
      '<div class="page-subtitle">Estado integral del proyecto a un vistazo</div>' +
    '</div><div class="page-actions" style="display:flex;gap:10px;align-items:center">' +
      '<button class="btn btn-secondary" onclick="openMilestones(\'' + pid + '\')"><i class="fas fa-flag-checkered"></i> Hitos</button>' +
      '<select class="form-control" style="min-width:220px" onchange="panelSetProject(this.value)">' + projOpts + '</select>' +
    '</div></div>' +

    // encabezado con semáforo
    '<div class="card" style="padding:16px 18px;margin-bottom:14px;border-left:5px solid ' + _poSem(overall) + '">' +
      '<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between">' +
        '<div>' +
          '<div style="font-size:18px;font-weight:800">' + escapeHtml(p.name || '') + '</div>' +
          '<div style="font-size:12px;color:var(--text-muted)">' + (p.client ? escapeHtml(p.client) + ' · ' : '') +
            (p.start_date ? fmtDate(p.start_date) : '—') + ' → ' + (p.end_date ? fmtDate(p.end_date) : '—') + '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<span style="width:12px;height:12px;border-radius:50%;background:' + _poSem(overall) + ';display:inline-block"></span>' +
          '<span style="font-weight:700;color:' + _poSem(overall) + '">' + overallTxt + '</span>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">' +

      // CRONOGRAMA
      _poCard('Cronograma', 'fa-calendar-days', schedCls,
        _poBar('Avance físico', progress) +
        _poBar('Tiempo transcurrido', Math.round(timePct)) +
        _poRow('Estado', '<b style="color:' + _poSem(schedCls) + '">' + (schedGap >= 0 ? 'Adelantado' : 'Atrasado') + ' ' + Math.abs(Math.round(schedGap)) + ' pts</b>') +
        (msDelay != null ? _poRow('Hitos', '<b style="color:' + _poSem(msDelay > 0 ? (msDelay > 15 ? 'red' : 'yellow') : 'green') + '">' + (msDelay > 0 ? 'Atrasados ' + msDelay + ' días' : (msDelay < 0 ? 'Adelantados ' + (-msDelay) + ' días' : 'En fecha')) + '</b>') : '') +
        _poRow('Tareas', tasks.length + '')
      ) +
      _poMilestonesCard(pid) +

      // PRESUPUESTO
      _poCard('Pulso presupuestario', 'fa-sack-dollar', budgetCls,
        _poRow('Presupuesto', fmtMoney(presupuesto)) +
        _poRow('Contratado', fmtMoney(contratado) + (adicNet ? ' <span style="color:var(--text-muted);font-size:11px">(+' + fmtMoney(adicNet) + ' adic.)</span>' : '')) +
        _poRow('Certificado a la fecha', '<b>' + fmtMoney(certificado) + '</b>') +
        _poBar('Avance económico', Math.round(econPct)) +
        _poRow('Retenido (fondo reparo)', fmtMoney(certRetenido))
      ) +

      // CERTIFICACIONES
      _poCard('Certificaciones', 'fa-file-signature', 'gray',
        _poRow('Cantidad', certs.length + '') +
        _poRow('Certificado neto', '<b>' + fmtMoney(certificado) + '</b>') +
        _poRow('Facturado', fmtMoney(facturado)) +
        _poRow('Cobrado', '<span style="color:var(--success)">' + fmtMoney(cobrado) + '</span>') +
        _poRow('Por cobrar', '<span style="color:' + (porCobrar > 0 ? 'var(--warning)' : 'var(--text-muted)') + '">' + fmtMoney(porCobrar) + '</span>')
      ) +

      // CONTRATOS Y COMPRAS
      _poCard('Contratos y compras', 'fa-file-contract', 'gray',
        _poRow('Contratos', contracts.length + '') +
        _poRow('Monto contratado', fmtMoney(contratado)) +
        _poRow('Adicionales (neto)', fmtMoney(adicNet)) +
        _poRow('Órdenes de compra', pos.length + '') +
        _poRow('Comprado', fmtMoney(comprado))
      ) +

      // RFIs
      _poCard('RFIs', 'fa-circle-question', rfiOver ? 'red' : (rfiOpen ? 'yellow' : 'green'),
        _poRow('Abiertos', '<b>' + rfiOpen + '</b>') +
        _poRow('Vencidos', '<b style="color:' + (rfiOver ? 'var(--danger)' : 'var(--text-muted)') + '">' + rfiOver + '</b>') +
        _poRow('Total', rfis.length + '') +
        '<div style="margin-top:8px"><a href="#" onclick="navigate(\'rfis\');return false" style="font-size:12px">Ver RFIs →</a></div>'
      ) +

      // SUBMITTALS
      _poCard('Submittals', 'fa-file-lines', subOver ? 'red' : (subOpen ? 'yellow' : 'green'),
        _poRow('En proceso', '<b>' + subOpen + '</b>') +
        _poRow('Vencidos', '<b style="color:' + (subOver ? 'var(--danger)' : 'var(--text-muted)') + '">' + subOver + '</b>') +
        _poRow('Aprobados', subApr + '') +
        '<div style="margin-top:8px"><a href="#" onclick="navigate(\'submittals\');return false" style="font-size:12px">Ver Submittals →</a></div>'
      ) +

      // PENDIENTES
      _poCard('Pendientes', 'fa-list-check', apprPend ? 'yellow' : 'green',
        _poRow('Aprobaciones pendientes', '<b>' + apprPend + '</b> <span style="font-size:11px;color:var(--text-muted)">(empresa)</span>') +
        _poRow('RFIs abiertos', rfiOpen + '') +
        _poRow('Submittals en proceso', subOpen + '') +
        '<div style="margin-top:8px"><a href="#" onclick="navigate(\'aprobaciones\');return false" style="font-size:12px">Ver aprobaciones →</a></div>'
      ) +

    '</div>' +
    '<div style="font-size:11px;color:var(--text-muted);margin-top:14px">Semáforo: <span style="color:#22c55e">●</span> en marcha · <span style="color:#f59e0b">●</span> atención · <span style="color:#ef4444">●</span> en riesgo. Todo se calcula en vivo desde los datos cargados.</div>';
}

function _poCard(title, icon, semCls, inner) {
  return '<div class="card" style="padding:0;overflow:hidden">' +
    '<div style="display:flex;align-items:center;gap:8px;padding:11px 16px;border-bottom:1px solid var(--border);border-left:4px solid ' + _poSem(semCls) + '">' +
      '<i class="fas ' + icon + '" style="color:var(--primary)"></i>' +
      '<span style="font-weight:700;font-size:13px">' + title + '</span>' +
    '</div>' +
    '<div style="padding:12px 16px">' + inner + '</div></div>';
}
function _poRow(label, val) {
  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:13px">' +
    '<span style="color:var(--text-muted)">' + label + '</span><span style="text-align:right">' + val + '</span></div>';
}
function _poBar(label, pct) {
  pct = Math.max(0, Math.min(100, _poNum(pct)));
  var cls = pct > 100 ? 'red' : (pct >= 60 ? '' : (pct >= 30 ? 'yellow' : 'red'));
  return '<div style="padding:4px 0">' +
    '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="color:var(--text-muted)">' + label + '</span><span style="font-weight:600">' + pct + '%</span></div>' +
    '<div class="progress-bar"><div class="progress-fill ' + cls + '" style="width:' + pct + '%"></div></div></div>';
}

function panelSetProject(id) {
  window._panelProject = id;
  if (window.APP_STATE) window.APP_STATE.activeProject = id;   // sincroniza con el filtro global
  renderPanelObra();
}

/* ===== HITOS / MILESTONES (por proyecto) ===== */
function _milestones(pid) {
  return DB.getAll('milestones').filter(function(m){ return m.project_id === pid; })
    .sort(function(a,b){ return ((a.planned_date||a.forecast_date||'9999')+'').localeCompare((b.planned_date||b.forecast_date||'9999')+''); });
}
// Días de atraso del hito (real/forecast vs plan). >0 atrasado, <0 adelantado, null si falta dato.
function _msDelayDays(m) {
  var plan = m.planned_date, real = m.completed_date || m.forecast_date;
  if (!plan || !real) return null;
  return daysBetween(plan, real);
}
function _msAtRisk(m) {
  if (m.completed_date) return false;
  if (m.at_risk) return true;
  var d = _msDelayDays(m); if (d != null && d > 0) return true;
  if (m.planned_date && m.planned_date < todayStr()) return true;   // pendiente y vencido
  return false;
}
// Atraso general de la obra según hitos pendientes (el peor). null si no hay hitos con datos.
function _milestonesScheduleDelay(pid) {
  var pend = _milestones(pid).filter(function(m){ return !m.completed_date; });
  var worst = null;
  pend.forEach(function(m){ var d = _msDelayDays(m); if (d != null) worst = (worst == null) ? d : Math.max(worst, d); });
  return worst;
}

function _poMilestonesCard(pid) {
  var ms = _milestones(pid);
  var pending = ms.filter(function(m){ return !m.completed_date; });
  var done = ms.filter(function(m){ return m.completed_date; });
  var atRisk = pending.filter(_msAtRisk).length;
  var cls = atRisk ? (atRisk >= 2 ? 'red' : 'yellow') : 'green';
  var inner;
  if (!ms.length) {
    inner = '<div style="color:var(--text-muted);font-size:13px">Sin hitos cargados. <a href="#" onclick="openMilestones(\'' + pid + '\');return false">Agregar →</a></div>';
  } else {
    inner = '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:2px">Próximos</div>' +
      (pending.slice(0, 4).map(_msRow).join('') || '<div style="font-size:12px;color:var(--text-muted)">— sin pendientes —</div>') +
      (done.length ? '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin:8px 0 2px">Completados</div>' + done.slice(-3).map(_msRow).join('') : '') +
      '<div style="margin-top:8px"><a href="#" onclick="openMilestones(\'' + pid + '\');return false" style="font-size:12px">Gestionar hitos →</a></div>';
  }
  return _poCard('Hitos (milestones)', 'fa-flag-checkered', cls, inner);
}
function _msRow(m) {
  var done = !!m.completed_date, risk = _msAtRisk(m), d = _msDelayDays(m);
  var badge = done ? '<span class="badge badge-green" style="font-size:10px">OK</span>'
    : (risk ? '<span class="badge badge-red" style="font-size:10px">En riesgo</span>'
            : '<span class="badge badge-gray" style="font-size:10px">Pendiente</span>');
  var dchip = (d != null && !done) ? ' <span style="font-size:11px;color:' + (d > 0 ? 'var(--danger)' : 'var(--success)') + '">' + (d > 0 ? '+' + d + 'd' : d + 'd') + '</span>' : '';
  var date = m.completed_date ? fmtDate(m.completed_date) : (m.forecast_date ? fmtDate(m.forecast_date) : (m.planned_date ? fmtDate(m.planned_date) : '—'));
  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:13px;gap:8px">' +
    '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(m.name || '(hito)') + dchip + '</span>' +
    '<span style="font-size:11px;color:var(--text-muted);white-space:nowrap">' + date + '</span>' + badge + '</div>';
}

// ---- gestión de hitos ----
function openMilestones(pid) {
  var ms = _milestones(pid);
  var canE = canEdit('gantt') || canEdit('projects');
  var rows = ms.length ? ms.map(function(m){
    var d = _msDelayDays(m), done = !!m.completed_date;
    return '<tr>' +
      '<td>' + escapeHtml(m.name || '') + '</td>' +
      '<td style="font-size:12px">' + (m.planned_date ? fmtDate(m.planned_date) : '—') + '</td>' +
      '<td style="font-size:12px">' + (m.forecast_date ? fmtDate(m.forecast_date) : '—') + '</td>' +
      '<td style="font-size:12px">' + (m.completed_date ? fmtDate(m.completed_date) : '—') + '</td>' +
      '<td>' + (done ? '<span class="badge badge-green" style="font-size:10px">Completado</span>' : (_msAtRisk(m) ? '<span class="badge badge-red" style="font-size:10px">En riesgo</span>' : '<span class="badge badge-gray" style="font-size:10px">Pendiente</span>')) +
        (d != null && !done ? ' <span style="font-size:11px;color:' + (d>0?'var(--danger)':'var(--success)') + '">' + (d>0?'+'+d+'d':d+'d') + '</span>' : '') + '</td>' +
      (canE ? '<td style="white-space:nowrap"><button class="btn-ghost btn btn-sm" onclick="openMilestoneForm(\'' + pid + '\',\'' + m.id + '\')"><i class="fas fa-edit"></i></button>' +
        '<button class="btn-ghost btn btn-sm danger" onclick="deleteMilestone(\'' + pid + '\',\'' + m.id + '\')"><i class="fas fa-trash"></i></button></td>' : '') +
    '</tr>';
  }).join('') : '<tr><td colspan="' + (canE?6:5) + '" style="text-align:center;color:var(--text-muted);padding:16px">Sin hitos. Agregá el primero.</td></tr>';
  openModal('Hitos — ' + escapeHtml(_odSafeProjName(pid)),
    '<div class="table-wrap"><table class="table" style="font-size:13px"><thead><tr>' +
      '<th>Hito</th><th>Plan (contrato)</th><th>Proyección</th><th>Completado</th><th>Estado</th>' + (canE?'<th></th>':'') + '</tr></thead><tbody>' + rows + '</tbody></table></div>',
    '', (canE ? '<button class="btn btn-primary" onclick="openMilestoneForm(\'' + pid + '\')"><i class="fas fa-plus"></i> Nuevo hito</button>' : '') +
        '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
}
function _odSafeProjName(pid) { var p = DB.getById('projects', pid); return p ? p.name : '(proyecto)'; }

function openMilestoneForm(pid, id) {
  if (!requireEdit('gantt')) return;
  var m = id ? DB.getById('milestones', id) : null;
  openModal(m ? 'Editar hito' : 'Nuevo hito',
    '<div class="form-grid form-grid-2">' +
      '<div class="form-group full"><label class="form-label">Nombre del hito *</label>' +
        '<input class="form-control" id="ms-name" value="' + (m ? escapeHtml(m.name || '') : '') + '" placeholder="Ej: Hormigonado losa nivel 3"></div>' +
      '<div class="form-group"><label class="form-label">Fecha plan (contrato)</label>' +
        '<input class="form-control" id="ms-planned" type="date" value="' + (m ? (m.planned_date || '') : '') + '"></div>' +
      '<div class="form-group"><label class="form-label">Fecha proyectada</label>' +
        '<input class="form-control" id="ms-forecast" type="date" value="' + (m ? (m.forecast_date || '') : '') + '"></div>' +
      '<div class="form-group"><label class="form-label">Fecha completado</label>' +
        '<input class="form-control" id="ms-completed" type="date" value="' + (m ? (m.completed_date || '') : '') + '"></div>' +
      '<div class="form-group"><label class="form-label">¿En riesgo?</label>' +
        '<select class="form-control" id="ms-risk"><option value="false"' + (m && m.at_risk ? '' : ' selected') + '>No</option><option value="true"' + (m && m.at_risk ? ' selected' : '') + '>Sí</option></select></div>' +
      '<div class="form-group full"><label class="form-label">Notas</label>' +
        '<input class="form-control" id="ms-notes" value="' + (m ? escapeHtml(m.notes || '') : '') + '"></div>' +
    '</div>',
    '', '<button class="btn btn-secondary" onclick="openMilestones(\'' + pid + '\')">Cancelar</button>' +
        '<button class="btn btn-primary" onclick="saveMilestone(\'' + pid + '\',\'' + (id || '') + '\')"><i class="fas fa-save"></i> Guardar</button>');
}
function saveMilestone(pid, id) {
  if (!requireEdit('gantt')) return;
  var name = document.getElementById('ms-name').value.trim();
  if (!name) { toast('El nombre es obligatorio', 'error'); return; }
  var data = {
    project_id: pid, company_id: DB._companyId, name: name,
    planned_date: document.getElementById('ms-planned').value || '',
    forecast_date: document.getElementById('ms-forecast').value || '',
    completed_date: document.getElementById('ms-completed').value || '',
    at_risk: document.getElementById('ms-risk').value === 'true',
    notes: document.getElementById('ms-notes').value.trim(),
  };
  if (id) DB.update('milestones', id, data); else DB.insert('milestones', data);
  toast('Hito guardado', 'success');
  openMilestones(pid);
}
function deleteMilestone(pid, id) {
  if (!requireEdit('gantt')) return;
  DB.remove('milestones', id);
  toast('Hito eliminado', 'warning');
  openMilestones(pid);
}
