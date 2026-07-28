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
  // salud de cronograma: avance físico vs tiempo transcurrido
  var schedGap = progress - timePct;   // >0 adelantado, <0 atrasado
  var schedCls = schedGap >= -5 ? 'green' : (schedGap >= -15 ? 'yellow' : 'red');
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
        _poRow('Tareas', tasks.length + '')
      ) +

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
