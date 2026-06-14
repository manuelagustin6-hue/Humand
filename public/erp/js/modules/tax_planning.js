/* ===== TAX PLANNING ===== */

window._taxPlanState = window._taxPlanState || {
  project: '',
  company: '',
  dateFrom: '',
  dateTo: '',
  ganRate: 35,
  periodoYear:  new Date().getFullYear(),
  periodoMonth: new Date().getMonth() + 1,
};

// =====================================================================
// MAIN RENDER
// =====================================================================
function renderTaxPlanning() {
  var s = window._taxPlanState;
  var projects  = DB.getAll('projects');
  var companies = [];
  try { companies = DB.getAllCompanies(); } catch(e) {}

  // Aggregate quick stats
  var allInv = DB.getAll('invoices');
  var allSI  = DB.getAll('supplierInvoices');
  var allCol = DB.getAll('collections');
  var allPO  = DB.getAll('paymentOrders');

  var totIvaD = allInv.reduce(function(s,i) { return s + (parseFloat(i.tax)||0); }, 0) +
                allCol.filter(function(c) { return c.iva_incluido; }).reduce(function(s,c) { return s + (parseFloat(c.iva_amount)||0); }, 0);
  var totIvaC = allSI.reduce(function(s,i)  { return s + (parseFloat(i.tax)||0); }, 0);
  var totRet  = allPO.reduce(function(s,o) {
    return s + (o.retentions||[]).reduce(function(s2,r) { return s2 + (r.amount||0); }, 0);
  }, 0);
  var totSaldo = totIvaD - totIvaC;

  var coOpts = companies.map(function(c) {
    return '<option value="' + c.id + '"' + (s.company === c.id ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>';
  }).join('');

  var projOpts = projects.map(function(p) {
    return '<option value="' + p.id + '"' + (s.project === p.id ? ' selected' : '') + '>' + escapeHtml(p.name) + '</option>';
  }).join('');

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Tax Planning</div>
    <div class="page-subtitle">Planificación impositiva — posición IVA, retenciones y estimación Ganancias</div>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card"><div class="stat-icon ${totSaldo >= 0 ? 'green' : 'red'}"><i class="fas fa-scale-balanced"></i></div><div>
    <div class="stat-value">${fmtMoney(Math.abs(totSaldo))}</div>
    <div class="stat-label">${totSaldo >= 0 ? 'Saldo IVA a Favor (acum.)' : 'Saldo IVA a Pagar (acum.)'}</div>
  </div></div>
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-arrow-up"></i></div><div>
    <div class="stat-value">${fmtMoney(totIvaD)}</div><div class="stat-label">IVA Débito Fiscal (acum.)</div>
  </div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-arrow-down"></i></div><div>
    <div class="stat-value">${fmtMoney(totIvaC)}</div><div class="stat-label">IVA Crédito Fiscal (acum.)</div>
  </div></div>
  <div class="stat-card"><div class="stat-icon cyan"><i class="fas fa-percentage"></i></div><div>
    <div class="stat-value">${fmtMoney(totRet)}</div><div class="stat-label">Retenciones Practicadas (acum.)</div>
  </div></div>
</div>

<div id="taxplan-tabs">
  <div class="tabs">
    <button class="tab-btn" data-tab="tp-proyecto">Por Proyecto</button>
    <button class="tab-btn" data-tab="tp-empresa">Por Empresa</button>
    <button class="tab-btn" data-tab="tp-calendario">Calendario Fiscal</button>
  </div>

  <div id="tp-proyecto" class="tab-content">
    <div class="card"><div class="card-body">
      <div class="form-grid form-grid-2" style="margin-bottom:20px">
        <div class="form-group">
          <label class="form-label">Proyecto</label>
          <select class="form-control" id="tp-proj-sel" onchange="taxPlanProyecto()">
            <option value="">Seleccionar proyecto...</option>
            ${projOpts}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Alícuota Ganancias</label>
          <select class="form-control" id="tp-gan-rate" onchange="taxPlanProyecto()">
            <option value="35" ${s.ganRate==35?'selected':''}>35% (SA / SRL antes 2021)</option>
            <option value="25" ${s.ganRate==25?'selected':''}>25% (SA / SRL desde 2021)</option>
            <option value="30" ${s.ganRate==30?'selected':''}>30% (tasa escalonada)</option>
            <option value="15" ${s.ganRate==15?'selected':''}>15% (Persona Humana — est.)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Desde</label>
          <input class="form-control" type="date" id="tp-proj-from" value="${s.dateFrom}" onchange="taxPlanProyecto()">
        </div>
        <div class="form-group">
          <label class="form-label">Hasta</label>
          <input class="form-control" type="date" id="tp-proj-to" value="${s.dateTo}" onchange="taxPlanProyecto()">
        </div>
      </div>
      <div id="tp-proj-resultado">
        <div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px">
          <i class="fas fa-hard-hat" style="font-size:28px;margin-bottom:10px;display:block;opacity:.3"></i>
          Seleccioná un proyecto para ver su posición fiscal
        </div>
      </div>
    </div></div>
  </div>

  <div id="tp-empresa" class="tab-content">
    <div class="card"><div class="card-body">
      <div class="form-grid form-grid-2" style="margin-bottom:20px">
        <div class="form-group">
          <label class="form-label">Empresa del Grupo</label>
          <select class="form-control" id="tp-co-sel" onchange="taxPlanEmpresa()">
            <option value="">Seleccionar empresa...</option>
            ${coOpts}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Período</label>
          <div style="display:flex;gap:8px">
            <select class="form-control" id="tp-co-month" onchange="taxPlanEmpresa()">
              ${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map(function(m,i){
                return '<option value="'+(i+1)+'"'+(s.periodoMonth===i+1?' selected':'')+'>'+m+'</option>';
              }).join('')}
            </select>
            <select class="form-control" style="width:90px" id="tp-co-year" onchange="taxPlanEmpresa()">
              ${[...Array(5)].map(function(_,i){ var y=new Date().getFullYear()-2+i; return '<option'+(y===s.periodoYear?' selected':'')+'>'+y+'</option>'; }).join('')}
            </select>
          </div>
        </div>
      </div>
      <div id="tp-co-resultado">
        <div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px">
          <i class="fas fa-building" style="font-size:28px;margin-bottom:10px;display:block;opacity:.3"></i>
          Seleccioná una empresa para ver su posición fiscal del período
        </div>
      </div>
    </div></div>
  </div>

  <div id="tp-calendario" class="tab-content">
    ${taxPlanCalendario(companies)}
  </div>
</div>
`;
  initTabs('taxplan-tabs');
  if (s.project) taxPlanProyecto();
  if (s.company) taxPlanEmpresa();
}

// =====================================================================
// TAB: POR PROYECTO
// =====================================================================
function taxPlanProyecto() {
  var s        = window._taxPlanState;
  var projId   = document.getElementById('tp-proj-sel')?.value || '';
  var ganRate  = parseFloat(document.getElementById('tp-gan-rate')?.value) || 35;
  var from     = document.getElementById('tp-proj-from')?.value || '';
  var to       = document.getElementById('tp-proj-to')?.value || '';
  s.project = projId; s.ganRate = ganRate; s.dateFrom = from; s.dateTo = to;

  var wrap = document.getElementById('tp-proj-resultado');
  if (!wrap) return;
  if (!projId) { wrap.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted)">Seleccioná un proyecto</div>'; return; }

  var proj = DB.getById('projects', projId);

  function inRange(d) {
    if (!d) return false;
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  }

  // Ingresos: facturas emitidas
  var factEmit = DB.getAll('invoices').filter(function(i) { return i.project_id === projId && inRange(i.date); });
  var totFactEmit = factEmit.reduce(function(s,i) { return s+(parseFloat(i.total)||0); }, 0);
  var netoVentas  = factEmit.reduce(function(s,i) { return s+(parseFloat(i.subtotal)||0); }, 0);
  var ivaDebito   = factEmit.reduce(function(s,i) { return s+(parseFloat(i.tax)||0); }, 0);

  // Ingresos: cobranzas de cuotas con IVA
  var cuotasFormal = DB.getAll('collections').filter(function(c) {
    return c.project_id === projId && c.iva_incluido && c.tipo_cobranza === 'cuota_formal' && inRange(c.date);
  });
  var totCuotas  = cuotasFormal.reduce(function(s,c) { return s+(parseFloat(c.amount)||0); }, 0);
  var netoCuotas = cuotasFormal.reduce(function(s,c) { return s+(parseFloat(c.neto)||0); }, 0);
  var ivaCuotas  = cuotasFormal.reduce(function(s,c) { return s+(parseFloat(c.iva_amount)||0); }, 0);
  ivaDebito += ivaCuotas;

  // Ingresos: cobranzas informales (sin IVA)
  var cuotasInfo = DB.getAll('collections').filter(function(c) {
    return c.project_id === projId && (!c.iva_incluido || c.tipo_cobranza !== 'cuota_formal') && !c.invoice_id && inRange(c.date);
  });
  var totInfomal = cuotasInfo.reduce(function(s,c) { return s+(parseFloat(c.amount)||0); }, 0);

  var totIngresos = totFactEmit + netoCuotas + totInfomal;

  // Costos: facturas de proveedores
  var siProv = DB.getAll('supplierInvoices').filter(function(si) { return si.project_id === projId && inRange(si.date); });
  var totCostos  = siProv.reduce(function(s,i) { return s+(parseFloat(i.total)||0); }, 0);
  var netoCostos = siProv.reduce(function(s,i) { return s+(parseFloat(i.subtotal)||0); }, 0);
  var ivaCredito = siProv.reduce(function(s,i) { return s+(parseFloat(i.tax)||0); }, 0);

  // Resultado bruto
  var resultadoBruto = (netoVentas + netoCuotas + totInfomal) - netoCostos;
  var estimGanancias = resultadoBruto > 0 ? resultadoBruto * ganRate / 100 : 0;
  var resultadoNeto  = resultadoBruto - estimGanancias;

  // Posición IVA del proyecto
  var saldoIVA = ivaDebito - ivaCredito;

  // Retenciones practicadas (buscar OPs cuyas facturas aplicadas pertenecen al proyecto)
  var siIds = new Set(siProv.map(function(si) { return si.id; }));
  var retsAmt = 0;
  DB.getAll('paymentOrders').forEach(function(o) {
    var linked = (o.applied_invoices||[]).some(function(ai) { return siIds.has(ai.id); });
    if (linked) {
      (o.retentions||[]).forEach(function(r) { retsAmt += (r.amount||0); });
    }
  });

  function row(label, val, cls, indent) {
    var bold = cls === 'total' || cls === 'grand';
    var style = 'display:flex;justify-content:space-between;padding:' + (cls==='grand'?'12px':'7px') + ' 14px;' +
      (indent ? 'padding-left:28px;' : '') +
      (cls === 'grand' ? 'background:#1e3a5f;color:#fff;border-radius:6px;margin-top:4px;' :
       cls === 'total' ? 'background:#f1f5f9;font-weight:700;border-radius:4px;' :
       cls === 'neg'   ? 'color:var(--danger);' :
       cls === 'pos'   ? 'color:var(--success);' : '');
    return '<div style="' + style + '">' +
      '<span' + (bold?'style="font-weight:700"':'') + '>' + label + '</span>' +
      '<span' + (bold?'style="font-weight:700"':'') + '>' + fmtMoney(val) + '</span>' +
    '</div>';
  }
  function sep(label) {
    return '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;padding:14px 14px 4px">' + label + '</div>';
  }

  var html = '<div style="max-width:620px">' +
    '<div style="font-size:15px;font-weight:700;color:var(--primary);margin-bottom:16px">' +
      '<i class="fas fa-hard-hat" style="margin-right:8px"></i>' + escapeHtml(proj?.name || projId) +
    '</div>' +
    '<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;font-size:13px">' +

    sep('INGRESOS') +
    row('Facturación emitida', totFactEmit, 'normal', true) +
    (netoCuotas > 0 ? row('Cuotas formales (neto c/IVA)', netoCuotas, 'normal', true) : '') +
    (totInfomal > 0 ? row('Cuotas informales', totInfomal, 'normal', true) : '') +
    row('Total Ingresos', totIngresos, 'total') +

    sep('COSTOS') +
    row('Facturas de proveedores', totCostos, 'normal', true) +
    row('Total Costos', totCostos, 'total') +

    sep('RESULTADO OPERATIVO') +
    row('Resultado Bruto', resultadoBruto, resultadoBruto >= 0 ? 'pos' : 'neg') +
    row('Estimación Ganancias (' + ganRate + '%)', estimGanancias > 0 ? -estimGanancias : 0, 'normal', true) +
    row('Resultado Neto Estimado', resultadoNeto, 'grand') +

    sep('POSICIÓN IVA DEL PROYECTO') +
    row('IVA Débito Fiscal (ventas + cuotas)', ivaDebito, 'normal', true) +
    row('IVA Crédito Fiscal (compras)', ivaCredito, 'normal', true) +
    row('Saldo IVA', saldoIVA, saldoIVA >= 0 ? 'pos' : 'neg') +

    (retsAmt > 0 ? sep('RETENCIONES PRACTICADAS') + row('Retenciones a proveedores', retsAmt, 'normal', true) : '') +

    '</div>' +
    '<div style="font-size:11px;color:var(--text-muted);margin-top:10px;padding:0 2px">' +
      '<i class="fas fa-info-circle"></i> La estimación de Ganancias es orientativa (no incluye ajuste por inflación, quebrantos de ejercicios anteriores ni deducciones especiales).' +
    '</div>' +
  '</div>';

  wrap.innerHTML = html;
}

// =====================================================================
// TAB: POR EMPRESA
// =====================================================================
function taxPlanEmpresa() {
  var s = window._taxPlanState;
  var coId  = document.getElementById('tp-co-sel')?.value   || '';
  var month = parseInt(document.getElementById('tp-co-month')?.value) || s.periodoMonth;
  var year  = parseInt(document.getElementById('tp-co-year')?.value)  || s.periodoYear;
  s.company = coId; s.periodoMonth = month; s.periodoYear = year;

  var wrap = document.getElementById('tp-co-resultado');
  if (!wrap) return;
  if (!coId) { wrap.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted)">Seleccioná una empresa</div>'; return; }

  var co = null;
  try { co = DB.getAllCompanies().find(function(c) { return c.id === coId; }) || {}; } catch(e) { co = {}; }

  function inPeriod(d) {
    if (!d) return false;
    var dd = new Date(d + 'T00:00:00');
    return dd.getFullYear() === year && (dd.getMonth()+1) === month;
  }

  // IVA Compras (crédito fiscal)
  var siCo = DB.getAll('supplierInvoices').filter(function(si) { return si.company_id === coId && inPeriod(si.date) && ['A','B','C','M'].includes(si.tipo_comprobante); });
  var ivaC = siCo.reduce(function(s,i) { return s+(parseFloat(i.tax)||0); }, 0);
  var netoC= siCo.reduce(function(s,i) { return s+(parseFloat(i.subtotal)||0); }, 0);

  // IVA Ventas (débito fiscal) — facturas
  var invCo = DB.getAll('invoices').filter(function(i) { return i.company_id === coId && inPeriod(i.date) && ['A','B','C','M'].includes(i.tipo_comprobante||i.type); });
  var ivaD  = invCo.reduce(function(s,i) { return s+(parseFloat(i.tax)||0); }, 0);
  var netoV = invCo.reduce(function(s,i) { return s+(parseFloat(i.subtotal)||0); }, 0);

  // IVA Ventas — cuotas formales
  var colCo = DB.getAll('collections').filter(function(c) { return c.company_id === coId && c.iva_incluido && c.tipo_cobranza === 'cuota_formal' && inPeriod(c.date); });
  var ivaDCuotas = colCo.reduce(function(s,c) { return s+(parseFloat(c.iva_amount)||0); }, 0);
  var netoCuotas = colCo.reduce(function(s,c) { return s+(parseFloat(c.neto)||0); }, 0);
  ivaD  += ivaDCuotas;
  netoV += netoCuotas;

  var saldoIVA = ivaD - ivaC;

  // Retenciones practicadas del período (global, no filtramos por empresa aún porque OP no tiene company_id)
  var poMes = DB.getAll('paymentOrders').filter(function(o) { return inPeriod(o.date); });
  var retsByTipo = {};
  var totRets = 0;
  poMes.forEach(function(o) {
    (o.retentions||[]).forEach(function(r) {
      retsByTipo[r.name] = (retsByTipo[r.name]||0) + (r.amount||0);
      totRets += (r.amount||0);
    });
  });

  var MONTHS_ES2 = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var periodoLabel = MONTHS_ES2[month-1] + ' ' + year;

  // IVA due date estimation based on CUIT terminal
  var cuitDue = '';
  if (co.cuit) {
    var terminal = parseInt((co.cuit || '').replace(/\D/g,'').slice(-2,-1)) || 0;
    var dueDays  = [20, 21, 22, 23, 24, 25, 26, 27, 28, 19];
    var due = dueDays[terminal] || 20;
    var dueMonth = month === 12 ? 1 : month + 1;
    var dueYear  = month === 12 ? year + 1 : year;
    cuitDue = '<div style="font-size:11px;color:#0369a1;margin-top:6px"><i class="fas fa-calendar-alt"></i> Vencimiento IVA estimado: <strong>' + due + '/' + String(dueMonth).padStart(2,'0') + '/' + dueYear + '</strong> (CUIT terminal ' + terminal + ')</div>';
  }

  function blk(title, color, content) {
    return '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:14px">' +
      '<div style="background:' + color + ';padding:8px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">' + title + '</div>' +
      '<div style="padding:0 0 4px">' + content + '</div>' +
    '</div>';
  }
  function rowB(label, val, bold) {
    return '<div style="display:flex;justify-content:space-between;padding:7px 14px;border-bottom:1px solid #f1f5f9">' +
      '<span style="' + (bold?'font-weight:700':'') + '">' + label + '</span>' +
      '<strong>' + fmtMoney(val) + '</strong>' +
    '</div>';
  }

  var ivaContent =
    rowB('Neto gravado ventas / cuotas', netoV) +
    rowB('IVA Débito Fiscal (ventas)', ivaD) +
    rowB('Neto gravado compras', netoC) +
    rowB('IVA Crédito Fiscal (compras)', ivaC) +
    '<div style="display:flex;justify-content:space-between;padding:10px 14px;background:' + (saldoIVA>=0?'#f0fdf4':'#fef2f2') + '">' +
      '<strong>Saldo IVA ' + periodoLabel + '</strong>' +
      '<strong style="color:' + (saldoIVA>=0?'var(--success)':'var(--danger)') + '">' +
        (saldoIVA >= 0 ? 'A Favor ' : 'A Pagar ') + fmtMoney(Math.abs(saldoIVA)) +
      '</strong>' +
    '</div>';

  var retContent = totRets > 0
    ? Object.entries(retsByTipo).map(function(e) { return rowB(e[0], e[1]); }).join('') +
      '<div style="display:flex;justify-content:space-between;padding:8px 14px;background:#f1f5f9"><strong>Total Retenciones</strong><strong>' + fmtMoney(totRets) + '</strong></div>'
    : '<div style="padding:12px 14px;color:var(--text-muted);font-size:12px">Sin retenciones practicadas en el período</div>';

  var html =
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">' +
      '<div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,var(--primary),#1d4ed8);display:flex;align-items:center;justify-content:center"><i class="fas fa-building" style="color:#fff"></i></div>' +
      '<div><div style="font-size:15px;font-weight:700">' + escapeHtml(co.name||'') + '</div>' +
        '<div style="font-size:11px;color:var(--text-muted)">' + (co.cuit||'') + ' · ' + periodoLabel + '</div>' +
      '</div>' +
    '</div>' +
    blk('Posición IVA del Período', '#eff6ff', ivaContent) +
    (cuitDue ? '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:8px 14px;margin-bottom:14px;font-size:12px;color:#1e40af">' + cuitDue + '</div>' : '') +
    blk('Retenciones Practicadas del Período', '#fefce8', retContent) +
    (totRets > 0 ? '<div style="font-size:11px;color:var(--text-muted)"><i class="fas fa-info-circle"></i> Las retenciones del período corresponden a todas las órdenes de pago del mes. Para filtrar por empresa, asigná empresa a las órdenes de pago.</div>' : '');

  wrap.innerHTML = '<div style="max-width:620px">' + html + '</div>';
}

// =====================================================================
// TAB: CALENDARIO FISCAL
// =====================================================================
function taxPlanCalendario(companies) {
  var today    = new Date();
  var MONTHS_ES2 = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var DUE_DAYS = [20,21,22,23,24,25,26,27,28,19]; // by CUIT terminal 0-9

  // Build next 3 months of due dates
  var periodos = [];
  for (var delta = 0; delta <= 2; delta++) {
    var d = new Date(today.getFullYear(), today.getMonth() + delta, 1);
    periodos.push({ year: d.getFullYear(), month: d.getMonth()+1, label: MONTHS_ES2[d.getMonth()] + ' ' + d.getFullYear() });
  }

  // Each company → due dates for each period (IVA declared the month after)
  var coRows = companies.map(function(co) {
    var terminal = parseInt((co.cuit||'').replace(/\D/g,'').slice(-2,-1));
    if (isNaN(terminal)) terminal = 0;
    var due = DUE_DAYS[terminal] || 20;
    return { co: co, terminal: terminal, due: due };
  });

  // Events across the 3 periods
  var events = [];
  periodos.forEach(function(p) {
    // IVA due: day X of the FOLLOWING month
    var dueMonth = p.month === 12 ? 1 : p.month + 1;
    var dueYear  = p.month === 12 ? p.year + 1 : p.year;
    coRows.forEach(function(cr) {
      var dateStr = dueYear + '-' + String(dueMonth).padStart(2,'0') + '-' + String(cr.due).padStart(2,'0');
      var isPast  = dateStr < today.toISOString().split('T')[0];
      events.push({
        date: dateStr,
        label: 'IVA ' + p.label,
        company: cr.co.name,
        tipo: 'IVA',
        past: isPast,
      });
    });
  });

  events.sort(function(a,b) { return a.date.localeCompare(b.date); });

  // Grid view: by company × period
  var html = '<div class="card"><div class="card-body">' +
    '<div style="font-size:14px;font-weight:700;margin-bottom:4px">Vencimientos AFIP estimados</div>' +
    '<div style="font-size:12px;color:var(--text-muted);margin-bottom:20px">' +
      'Fechas de vencimiento de IVA según dígito terminal del CUIT. Verificá el cronograma actualizado en ARCA.' +
    '</div>';

  if (!companies.length) {
    return html + '<div class="empty-state"><i class="fas fa-building"></i><p>Configurá las empresas del grupo para ver su calendario fiscal</p></div></div></div>';
  }

  // Table: company × period
  html += '<div class="table-wrap"><table><thead><tr>' +
    '<th>Empresa</th><th>CUIT</th><th>Terminal</th>' +
    periodos.map(function(p) { return '<th style="text-align:center">IVA — ' + p.label + '<br><small style="font-weight:400;color:var(--text-muted)">vence en ' + (p.month===12?'Enero '+(p.year+1):'mes sig.') + '</small></th>'; }).join('') +
  '</tr></thead><tbody>';

  coRows.forEach(function(cr) {
    html += '<tr><td><strong>' + escapeHtml(cr.co.name) + '</strong></td>' +
      '<td style="font-size:11px;color:#64748b">' + escapeHtml(cr.co.cuit||'—') + '</td>' +
      '<td style="text-align:center">' + cr.terminal + '</td>';
    periodos.forEach(function(p) {
      var dueMonth = p.month === 12 ? 1 : p.month + 1;
      var dueYear  = p.month === 12 ? p.year + 1 : p.year;
      var dateStr  = dueYear + '-' + String(dueMonth).padStart(2,'0') + '-' + String(cr.due).padStart(2,'0');
      var isPast   = dateStr < today.toISOString().split('T')[0];
      var isClose  = !isPast && (new Date(dateStr) - today) / 86400000 < 10;
      html += '<td style="text-align:center">' +
        '<span style="font-size:12px;font-weight:600;color:' +
          (isPast ? 'var(--text-muted)' : isClose ? 'var(--danger)' : 'var(--success)') + '">' +
          cr.due + '/' + String(dueMonth).padStart(2,'0') + '/' + dueYear +
        '</span>' +
        (isClose ? '<br><span class="badge badge-red" style="font-size:9px">Próximo</span>' : '') +
        (isPast  ? '<br><span style="font-size:9px;color:var(--text-muted)">vencido</span>' : '') +
      '</td>';
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';

  // Notes
  html += '<div style="margin-top:16px;background:#fefce8;border:1px solid #fcd34d;border-radius:6px;padding:10px 14px;font-size:12px;color:#78350f">' +
    '<i class="fas fa-exclamation-triangle"></i> <strong>Importante:</strong> Las fechas son estimativas basadas en el dígito terminal del CUIT. ' +
    'El cronograma exacto puede variar por feriados y modificaciones de ARCA. ' +
    'Siempre verificar en <strong>afip.gob.ar → Cronograma de vencimientos</strong>.' +
  '</div>';

  html += '</div></div>';
  return html;
}
