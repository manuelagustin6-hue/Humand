/* ===== TAX PLANNING ===== */

window._taxPlanState = window._taxPlanState || {
  project: '',
  company: '',
  dateFrom: '',
  dateTo: '',
  ganRate: 35,
  periodoYear:  new Date().getFullYear(),
  periodoMonth: new Date().getMonth() + 1,
  proyMode: 'realizado',   // 'realizado' | 'proyectado'
  impGanPct: 70,           // % de ingresos imponibles para Ganancias
  gastosFinancieros: 0,    // estimado de gastos financieros/intereses
};

// =====================================================================
// MAIN RENDER
// =====================================================================
function renderTaxPlanning() {
  var s = window._taxPlanState;
  var projects  = DB.getAll('projects');
  var companies = [];
  try { companies = DB.getAllCompanies(); } catch(e) {}

  var allInv = DB.getAll('invoices');
  var allSI  = DB.getAll('supplierInvoices');
  var allCol = DB.getAll('collections');
  var allPO  = DB.getAll('paymentOrders');

  var totIvaD = allInv.reduce(function(a,i) { return a+(parseFloat(i.tax)||0); }, 0) +
                allCol.filter(function(c) { return c.iva_incluido; }).reduce(function(a,c) { return a+(parseFloat(c.iva_amount)||0); }, 0);
  var totIvaC = allSI.reduce(function(a,i) { return a+(parseFloat(i.tax)||0); }, 0);
  var totRet  = allPO.reduce(function(a,o) {
    return a+(o.retentions||[]).reduce(function(b,r) { return b+(r.amount||0); }, 0);
  }, 0);
  var totSaldo = totIvaD - totIvaC;

  var coOpts = companies.map(function(c) {
    return '<option value="'+c.id+'"'+(s.company===c.id?' selected':'')+'>'+escapeHtml(c.name)+'</option>';
  }).join('');
  var projOpts = projects.map(function(p) {
    return '<option value="'+p.id+'"'+(s.project===p.id?' selected':'')+'>'+escapeHtml(p.name)+'</option>';
  }).join('');

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Tax Planning</div>
    <div class="page-subtitle">Planificación impositiva — posición IVA, retenciones y estimación Ganancias</div>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card"><div class="stat-icon ${totSaldo>=0?'green':'red'}"><i class="fas fa-scale-balanced"></i></div><div>
    <div class="stat-value">${fmtMoney(Math.abs(totSaldo))}</div>
    <div class="stat-label">${totSaldo>=0?'Saldo IVA a Favor (acum.)':'Saldo IVA a Pagar (acum.)'}</div>
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

      <!-- Modo toggle -->
      <div style="display:flex;gap:0;border:1px solid var(--border);border-radius:8px;overflow:hidden;width:fit-content;margin-bottom:20px">
        <button id="tp-modo-real" onclick="taxPlanModoSet('realizado')"
          style="padding:7px 20px;font-size:13px;font-weight:600;border:none;cursor:pointer;background:${s.proyMode==='realizado'?'var(--primary)':'#fff'};color:${s.proyMode==='realizado'?'#fff':'var(--text-secondary)'}">
          <i class="fas fa-history"></i> Realizado
        </button>
        <button id="tp-modo-proy" onclick="taxPlanModoSet('proyectado')"
          style="padding:7px 20px;font-size:13px;font-weight:600;border:none;cursor:pointer;border-left:1px solid var(--border);background:${s.proyMode==='proyectado'?'var(--primary)':'#fff'};color:${s.proyMode==='proyectado'?'#fff':'var(--text-secondary)'}">
          <i class="fas fa-chart-line"></i> Proyectado
        </button>
      </div>

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
        <!-- Campos sólo para modo Realizado -->
        <div class="form-group tp-field-real" style="display:${s.proyMode==='realizado'?'block':'none'}">
          <label class="form-label">Desde</label>
          <input class="form-control" type="date" id="tp-proj-from" value="${s.dateFrom}" onchange="taxPlanProyecto()">
        </div>
        <div class="form-group tp-field-real" style="display:${s.proyMode==='realizado'?'block':'none'}">
          <label class="form-label">Hasta</label>
          <input class="form-control" type="date" id="tp-proj-to" value="${s.dateTo}" onchange="taxPlanProyecto()">
        </div>
        <!-- Campos sólo para modo Proyectado -->
        <div class="form-group tp-field-proy" style="display:${s.proyMode==='proyectado'?'block':'none'}">
          <label class="form-label">% Imponible para Ganancias</label>
          <div style="display:flex;align-items:center;gap:8px">
            <input class="form-control" type="number" id="tp-imp-pct" min="0" max="100" step="1"
              value="${s.impGanPct}" onchange="taxPlanProyecto()" style="width:90px">
            <span style="font-size:13px;color:var(--text-muted)">% de los ingresos netos gravados</span>
          </div>
        </div>
        <div class="form-group tp-field-proy" style="display:${s.proyMode==='proyectado'?'block':'none'}">
          <label class="form-label">Gastos Financieros / Intereses (estimado)</label>
          <input class="form-control" type="number" id="tp-gf" min="0" step="100"
            value="${s.gastosFinancieros}" onchange="taxPlanProyecto()" placeholder="0">
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
// MODO TOGGLE
// =====================================================================
function taxPlanModoSet(mode) {
  window._taxPlanState.proyMode = mode;
  var isReal = mode === 'realizado';
  var btnR = document.getElementById('tp-modo-real');
  var btnP = document.getElementById('tp-modo-proy');
  if (btnR) { btnR.style.background = isReal ? 'var(--primary)' : '#fff'; btnR.style.color = isReal ? '#fff' : 'var(--text-secondary)'; }
  if (btnP) { btnP.style.background = !isReal ? 'var(--primary)' : '#fff'; btnP.style.color = !isReal ? '#fff' : 'var(--text-secondary)'; }
  document.querySelectorAll('.tp-field-real').forEach(function(el) { el.style.display = isReal ? 'block' : 'none'; });
  document.querySelectorAll('.tp-field-proy').forEach(function(el) { el.style.display = !isReal ? 'block' : 'none'; });
  taxPlanProyecto();
}

// =====================================================================
// DISPATCHER
// =====================================================================
function taxPlanProyecto() {
  var s = window._taxPlanState;
  var projId  = document.getElementById('tp-proj-sel')?.value || '';
  var ganRate = parseFloat(document.getElementById('tp-gan-rate')?.value) || 35;
  var from    = document.getElementById('tp-proj-from')?.value || '';
  var to      = document.getElementById('tp-proj-to')?.value   || '';
  var impPct  = parseFloat(document.getElementById('tp-imp-pct')?.value);
  if (isNaN(impPct)) impPct = s.impGanPct;
  var gf      = parseFloat(document.getElementById('tp-gf')?.value) || 0;
  s.project = projId; s.ganRate = ganRate; s.dateFrom = from; s.dateTo = to;
  s.impGanPct = impPct; s.gastosFinancieros = gf;

  var wrap = document.getElementById('tp-proj-resultado');
  if (!wrap) return;
  if (!projId) { wrap.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted)">Seleccioná un proyecto</div>'; return; }

  if (s.proyMode === 'proyectado') {
    _tpProyectado(projId, ganRate, impPct, gf, wrap);
  } else {
    _tpRealizado(projId, ganRate, from, to, wrap);
  }
}

// =====================================================================
// HELPERS SHARED
// =====================================================================
function _tpRow(label, val, cls, indent) {
  var bold = cls === 'total' || cls === 'grand' || cls === 'ebitda';
  var st = 'display:flex;justify-content:space-between;padding:' + (cls==='grand'||cls==='ebitda'?'11px':'7px') + ' 14px;' +
    (indent ? 'padding-left:28px;' : '') +
    (cls==='grand'  ? 'background:#1e3a5f;color:#fff;border-radius:6px;margin-top:4px;' :
     cls==='ebitda' ? 'background:#0c4a6e;color:#fff;border-radius:6px;margin:6px 0;' :
     cls==='total'  ? 'background:#f1f5f9;font-weight:700;border-radius:4px;' :
     cls==='neg'    ? 'color:var(--danger);' :
     cls==='pos'    ? 'color:var(--success);' : '');
  var amtColor = (cls==='neg') ? '' : (val < 0 ? ';color:var(--danger)' : val > 0 && cls==='pos' ? ';color:var(--success)' : '');
  return '<div style="'+st+'"><span'+(bold?' style="font-weight:700"':'')+'>'+label+'</span>' +
    '<span'+(bold?' style="font-weight:700'+amtColor+'"':'')+'>'+fmtMoney(val)+'</span></div>';
}
function _tpSep(label) {
  return '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;padding:14px 14px 4px">'+label+'</div>';
}

// =====================================================================
// TAB: REALIZADO
// =====================================================================
function _tpRealizado(projId, ganRate, from, to, wrap) {
  var proj = DB.getById('projects', projId);

  function inRange(d) {
    if (!d) return false;
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  }

  var factEmit    = DB.getAll('invoices').filter(function(i) { return i.project_id===projId && inRange(i.date); });
  var totFactEmit = factEmit.reduce(function(a,i) { return a+(parseFloat(i.total)||0); }, 0);
  var netoVentas  = factEmit.reduce(function(a,i) { return a+(parseFloat(i.subtotal)||0); }, 0);
  var ivaDebito   = factEmit.reduce(function(a,i) { return a+(parseFloat(i.tax)||0); }, 0);

  var cuotasFormal = DB.getAll('collections').filter(function(c) {
    return c.project_id===projId && c.iva_incluido && c.tipo_cobranza==='cuota_formal' && inRange(c.date);
  });
  var netoCuotas  = cuotasFormal.reduce(function(a,c) { return a+(parseFloat(c.neto)||0); }, 0);
  var ivaCuotas   = cuotasFormal.reduce(function(a,c) { return a+(parseFloat(c.iva_amount)||0); }, 0);
  ivaDebito += ivaCuotas;

  var cuotasInfo  = DB.getAll('collections').filter(function(c) {
    return c.project_id===projId && (!c.iva_incluido||c.tipo_cobranza!=='cuota_formal') && !c.invoice_id && inRange(c.date);
  });
  var totInformal = cuotasInfo.reduce(function(a,c) { return a+(parseFloat(c.amount)||0); }, 0);

  var totIngresos = totFactEmit + netoCuotas + totInformal;

  var siProv     = DB.getAll('supplierInvoices').filter(function(si) { return si.project_id===projId && inRange(si.date); });
  var totCostos  = siProv.reduce(function(a,i) { return a+(parseFloat(i.total)||0); }, 0);
  var netoCostos = siProv.reduce(function(a,i) { return a+(parseFloat(i.subtotal)||0); }, 0);
  var ivaCredito = siProv.reduce(function(a,i) { return a+(parseFloat(i.tax)||0); }, 0);

  var resultadoBruto = (netoVentas + netoCuotas + totInformal) - netoCostos;
  var estimGanancias = resultadoBruto > 0 ? resultadoBruto * ganRate / 100 : 0;
  var resultadoNeto  = resultadoBruto - estimGanancias;
  var saldoIVA       = ivaDebito - ivaCredito;

  var siIds = new Set(siProv.map(function(si) { return si.id; }));
  var retsAmt = 0;
  DB.getAll('paymentOrders').forEach(function(o) {
    if ((o.applied_invoices||[]).some(function(ai) { return siIds.has(ai.id); })) {
      (o.retentions||[]).forEach(function(r) { retsAmt += (r.amount||0); });
    }
  });

  var html = '<div style="max-width:680px">' +
    '<div style="display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:var(--primary);margin-bottom:16px">' +
      '<i class="fas fa-history"></i> Realizado — '+escapeHtml(proj?.name||projId)+'</div>' +
    '<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;font-size:13px">' +
    _tpSep('INGRESOS REALIZADOS') +
    _tpRow('Facturación emitida', totFactEmit, 'normal', true) +
    (netoCuotas>0 ? _tpRow('Cuotas formales — neto s/IVA', netoCuotas, 'normal', true) : '') +
    (ivaCuotas>0  ? _tpRow('IVA s/cuotas formales', ivaCuotas, 'normal', true) : '') +
    (totInformal>0? _tpRow('Cuotas informales', totInformal, 'normal', true) : '') +
    _tpRow('Total Ingresos', totIngresos, 'total') +
    _tpSep('COSTOS REALIZADOS') +
    _tpRow('Facturas de proveedores', totCostos, 'normal', true) +
    _tpRow('Total Costos', totCostos, 'total') +
    _tpSep('RESULTADO OPERATIVO') +
    _tpRow('Resultado Bruto', resultadoBruto, resultadoBruto>=0?'pos':'neg') +
    _tpRow('Estimación Ganancias ('+ganRate+'% s/resultado)', estimGanancias>0?-estimGanancias:0, 'normal', true) +
    _tpRow('Resultado Neto Estimado', resultadoNeto, 'grand') +
    _tpSep('POSICIÓN IVA') +
    _tpRow('IVA Débito Fiscal', ivaDebito, 'normal', true) +
    _tpRow('IVA Crédito Fiscal', ivaCredito, 'normal', true) +
    _tpRow('Saldo IVA', saldoIVA, saldoIVA>=0?'pos':'neg') +
    (retsAmt>0 ? _tpSep('RETENCIONES A PROVEEDORES') + _tpRow('Total retenciones', retsAmt, 'normal', true) : '') +
    '</div>' +
    '<div style="font-size:11px;color:var(--text-muted);margin-top:10px"><i class="fas fa-info-circle"></i> Estimación Ganancias orientativa — no incluye ajuste por inflación ni quebrantos de ejercicios anteriores.</div>' +
  '</div>';

  wrap.innerHTML = html;
}

// =====================================================================
// TAB: PROYECTADO
// =====================================================================
function _tpProyectado(projId, ganRate, impGanPct, gastosFinancieros, wrap) {
  var proj = DB.getById('projects', projId);

  // ---------- INGRESOS: unidades del proyecto ----------
  var unidades = DB.getAll('unidades').filter(function(u) { return u.project_id === projId; });
  // Sales records: build map unit_id → sale_price
  var ventasMap = {};
  DB.getAll('ventasUnidades').forEach(function(v) { if (v.unit_id) ventasMap[v.unit_id] = v; });

  var vendidas    = unidades.filter(function(u) { return u.status === 'sold'; });
  var noVendidas  = unidades.filter(function(u) { return u.status !== 'sold' && u.status !== 'own_use'; });
  var propiaUso   = unidades.filter(function(u) { return u.status === 'own_use'; });

  var totVendidas = vendidas.reduce(function(a,u) {
    var v = ventasMap[u.id];
    return a + (v ? (parseFloat(v.sale_price)||0) : (parseFloat(u.list_price)||0));
  }, 0);
  var totNoVend  = noVendidas.reduce(function(a,u) { return a+(parseFloat(u.list_price)||0); }, 0);
  var totPropias = propiaUso.reduce(function(a,u) { return a+(parseFloat(u.list_price)||0); }, 0);
  var totIngresos = totVendidas + totNoVend;

  // ---------- COSTOS: presupuesto de obra ----------
  var boqItems = DB.getAll('boqItems').filter(function(b) { return b.project_id === projId; });
  var presupByCateg = {};
  boqItems.forEach(function(b) {
    var cat = b.category || 'Sin categoría';
    presupByCateg[cat] = (presupByCateg[cat]||0) + (parseFloat(b.total)||parseFloat(b.quantity||0)*parseFloat(b.unit_price||0)||0);
  });
  var totalPresupuesto = Object.values(presupByCateg).reduce(function(a,v) { return a+v; }, 0);

  // Ejecutado real (todas las SI del proyecto, sin filtro fecha para proyectado)
  var siProv = DB.getAll('supplierInvoices').filter(function(si) { return si.project_id === projId; });
  var totalEjecutado = siProv.reduce(function(a,i) { return a+(parseFloat(i.total)||0); }, 0);

  // ---------- EBITDA ----------
  var resultadoBruto   = totIngresos - totalPresupuesto;
  var baseImponible    = Math.max(0, resultadoBruto) * impGanPct / 100;
  var estimGanancias   = baseImponible * ganRate / 100;
  var ebitda           = resultadoBruto;
  var ebt              = ebitda - (gastosFinancieros||0);  // Earnings Before Tax
  var resultadoNeto    = ebt - estimGanancias;

  // ---------- BUILD HTML ----------
  function pct(v, total) {
    if (!total) return '—';
    return (v/total*100).toFixed(1)+'%';
  }

  // Unidades summary table
  var unidadesHtml = '';
  if (unidades.length) {
    unidadesHtml = '<div class="table-wrap" style="margin-bottom:16px"><table style="font-size:12px"><thead><tr>' +
      '<th>Estado</th><th>Unidades</th><th>Precio promedio</th><th style="text-align:right">Total proyectado</th></tr></thead><tbody>';
    if (vendidas.length) unidadesHtml += '<tr><td><span class="badge badge-green">Vendidas</span></td><td>'+vendidas.length+'</td>' +
      '<td>'+fmtMoney(vendidas.length?totVendidas/vendidas.length:0)+'</td>' +
      '<td style="text-align:right;font-weight:600">'+fmtMoney(totVendidas)+'</td></tr>';
    if (noVendidas.length) unidadesHtml += '<tr><td><span class="badge badge-blue">Disponibles/Reservadas</span></td><td>'+noVendidas.length+'</td>' +
      '<td>'+fmtMoney(noVendidas.length?totNoVend/noVendidas.length:0)+'</td>' +
      '<td style="text-align:right;font-weight:600">'+fmtMoney(totNoVend)+'</td></tr>';
    if (propiaUso.length) unidadesHtml += '<tr><td><span class="badge badge-gray">Uso propio</span></td><td>'+propiaUso.length+'</td>' +
      '<td>'+fmtMoney(propiaUso.length?totPropias/propiaUso.length:0)+'</td>' +
      '<td style="text-align:right;color:var(--text-muted)">'+fmtMoney(totPropias)+' (no incluido)</td></tr>';
    unidadesHtml += '</tbody></table></div>';
  } else {
    unidadesHtml = '<div style="padding:8px 0;font-size:12px;color:var(--text-muted)">No hay unidades cargadas para este proyecto. Cargalas en el módulo <strong>Detalle de Unidades</strong>.</div>';
  }

  // Budget by category table
  var categs = Object.keys(presupByCateg).sort();
  var budgetHtml = '';
  if (categs.length) {
    budgetHtml = '<div class="table-wrap" style="margin-bottom:0"><table style="font-size:12px"><thead><tr>' +
      '<th>Categoría</th><th style="text-align:right">Presupuestado</th><th style="text-align:right">% del total</th></tr></thead><tbody>';
    categs.forEach(function(cat) {
      var v = presupByCateg[cat];
      budgetHtml += '<tr><td>'+escapeHtml(cat)+'</td>' +
        '<td style="text-align:right">'+fmtMoney(v)+'</td>' +
        '<td style="text-align:right;color:var(--text-muted)">'+pct(v,totalPresupuesto)+'</td></tr>';
    });
    budgetHtml += '<tr style="background:#f1f5f9;font-weight:700"><td>Total Presupuesto</td>' +
      '<td style="text-align:right">'+fmtMoney(totalPresupuesto)+'</td><td></td></tr>';
    budgetHtml += '</tbody></table></div>';

    // Ejecución barra
    var ejePct = totalPresupuesto ? Math.min(100, totalEjecutado/totalPresupuesto*100) : 0;
    var ejeColor = ejePct > 90 ? 'var(--danger)' : ejePct > 70 ? '#f59e0b' : 'var(--success)';
    budgetHtml += '<div style="margin-top:12px;padding:10px 14px;background:#f8fafc;border-radius:6px;font-size:12px">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:6px">' +
        '<span>Ejecución presupuestaria</span>' +
        '<span style="font-weight:700">'+fmtMoney(totalEjecutado)+' / '+fmtMoney(totalPresupuesto)+' ('+ejePct.toFixed(1)+'%)</span>' +
      '</div>' +
      '<div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden">' +
        '<div style="height:100%;width:'+ejePct+'%;background:'+ejeColor+';border-radius:4px;transition:width .3s"></div>' +
      '</div>' +
    '</div>';
  } else {
    budgetHtml = '<div style="padding:8px 0;font-size:12px;color:var(--text-muted)">No hay presupuesto de obra cargado. Cargalo en <strong>Cómputo y Presupuesto</strong>.</div>';
  }

  var html = '<div style="max-width:720px">' +
    '<div style="display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:#0369a1;margin-bottom:16px">' +
      '<i class="fas fa-chart-line"></i> Proyectado — '+escapeHtml(proj?.name||projId)+'</div>' +

    // Ingresos
    '<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:14px">' +
      '<div style="background:#eff6ff;padding:10px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#1e40af">' +
        '<i class="fas fa-arrow-up" style="margin-right:6px"></i>Ingresos Proyectados' +
      '</div>' +
      '<div style="padding:12px 14px">' + unidadesHtml + '</div>' +
      '<div style="padding:0 0 6px">' +
        _tpRow('Total Ingresos Proyectados', totIngresos, 'total') +
        '<div style="padding:6px 14px 10px;font-size:12px;color:#1e40af;background:#f0f9ff">' +
          '<i class="fas fa-calculator"></i> Base imponible Ganancias: <strong>'+fmtMoney(Math.max(0,resultadoBruto))+'</strong> × <strong>'+impGanPct+'%</strong> = <strong>'+fmtMoney(baseImponible)+'</strong>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Costos (presupuesto)
    '<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:14px">' +
      '<div style="background:#fef3c7;padding:10px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#78350f">' +
        '<i class="fas fa-arrow-down" style="margin-right:6px"></i>Costos Proyectados (Presupuesto de Obra)' +
      '</div>' +
      '<div style="padding:12px 14px">' + budgetHtml + '</div>' +
    '</div>' +

    // EBITDA / Waterfall
    '<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:14px">' +
      '<div style="background:#f0fdf4;padding:10px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#14532d">' +
        '<i class="fas fa-chart-bar" style="margin-right:6px"></i>Resultado Proyectado (EBITDA → Neto)' +
      '</div>' +
      '<div style="font-size:13px">' +
        _tpRow('(+) Ingresos proyectados', totIngresos, 'normal', true) +
        _tpRow('(−) Costos de obra (presupuesto)', -totalPresupuesto, 'normal', true) +
        _tpRow('EBITDA estimado', ebitda, 'ebitda') +
        (gastosFinancieros>0 ? _tpRow('(−) Gastos financieros / intereses', -gastosFinancieros, 'normal', true) : '') +
        _tpRow('(−) Estimación Ganancias ('+ganRate+'% × base $'+_abbr(baseImponible)+')', -estimGanancias, 'normal', true) +
        _tpRow('Resultado Neto Proyectado', resultadoNeto, 'grand') +
      '</div>' +
    '</div>' +

    '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
      _tpStatMini('Margen bruto', totalPresupuesto ? ((resultadoBruto/totIngresos||0)*100).toFixed(1)+'%' : '—', resultadoBruto>=0?'#22c55e':'#ef4444') +
      _tpStatMini('Margen neto', totIngresos ? ((resultadoNeto/totIngresos||0)*100).toFixed(1)+'%' : '—', resultadoNeto>=0?'#2563eb':'#ef4444') +
      _tpStatMini('Ganancias estimadas', fmtMoney(estimGanancias), '#f59e0b') +
      _tpStatMini('Ejecutado vs. Presupuesto', totalPresupuesto ? (totalEjecutado/totalPresupuesto*100).toFixed(1)+'%' : '—', '#64748b') +
    '</div>' +

    '<div style="font-size:11px;color:var(--text-muted);margin-top:12px"><i class="fas fa-info-circle"></i> Proyección basada en lista de precios de unidades y presupuesto de obra. Las unidades vendidas usan precio de cierre; las disponibles usan precio de lista. La estimación de Ganancias es orientativa.</div>' +
  '</div>';

  wrap.innerHTML = html;
}

function _tpStatMini(label, val, color) {
  return '<div style="flex:1;min-width:140px;background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:10px 14px">' +
    '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">'+label+'</div>' +
    '<div style="font-size:18px;font-weight:700;color:'+color+'">'+val+'</div>' +
  '</div>';
}

function _abbr(n) {
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
  if (n >= 1e3) return (n/1e3).toFixed(0)+'k';
  return Math.round(n).toString();
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
  try { co = DB.getAllCompanies().find(function(c) { return c.id===coId; })||{}; } catch(e) { co={}; }

  function inPeriod(d) {
    if (!d) return false;
    var dd = new Date(d+'T00:00:00');
    return dd.getFullYear()===year && (dd.getMonth()+1)===month;
  }

  var siCo = DB.getAll('supplierInvoices').filter(function(si) {
    return si.company_id===coId && inPeriod(si.date) && ['A','B','C','M'].includes(si.tipo_comprobante||'');
  });
  var ivaC = siCo.reduce(function(a,i) { return a+(parseFloat(i.tax)||0); }, 0);
  var netoC= siCo.reduce(function(a,i) { return a+(parseFloat(i.subtotal)||0); }, 0);

  var invCo = DB.getAll('invoices').filter(function(i) {
    return i.company_id===coId && inPeriod(i.date) && ['A','B','C','M'].includes(i.tipo_comprobante||i.type||'');
  });
  var ivaD  = invCo.reduce(function(a,i) { return a+(parseFloat(i.tax)||0); }, 0);
  var netoV = invCo.reduce(function(a,i) { return a+(parseFloat(i.subtotal)||0); }, 0);

  var colCo = DB.getAll('collections').filter(function(c) {
    return c.company_id===coId && c.iva_incluido && c.tipo_cobranza==='cuota_formal' && inPeriod(c.date);
  });
  var ivaDCuotas = colCo.reduce(function(a,c) { return a+(parseFloat(c.iva_amount)||0); }, 0);
  var netoCuotas = colCo.reduce(function(a,c) { return a+(parseFloat(c.neto)||0); }, 0);
  ivaD  += ivaDCuotas;
  netoV += netoCuotas;

  var saldoIVA = ivaD - ivaC;

  var poMes = DB.getAll('paymentOrders').filter(function(o) { return inPeriod(o.date); });
  var retsByTipo = {};
  var totRets = 0;
  poMes.forEach(function(o) {
    (o.retentions||[]).forEach(function(r) {
      retsByTipo[r.name] = (retsByTipo[r.name]||0)+(r.amount||0);
      totRets += (r.amount||0);
    });
  });

  var MONTHS_ES2 = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var periodoLabel = MONTHS_ES2[month-1]+' '+year;

  var cuitDue = '';
  if (co.cuit) {
    var terminal = parseInt((co.cuit||'').replace(/\D/g,'').slice(-2,-1))||0;
    var dueDays  = [20,21,22,23,24,25,26,27,28,19];
    var due = dueDays[terminal]||20;
    var dueMonth = month===12?1:month+1;
    var dueYear  = month===12?year+1:year;
    cuitDue = '<div style="font-size:11px;color:#0369a1;margin-top:6px"><i class="fas fa-calendar-alt"></i> Vencimiento IVA estimado: <strong>'+due+'/'+String(dueMonth).padStart(2,'0')+'/'+dueYear+'</strong> (CUIT terminal '+terminal+')</div>';
  }

  function blk(title,color,content) {
    return '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:14px">' +
      '<div style="background:'+color+';padding:8px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">'+title+'</div>' +
      '<div style="padding:0 0 4px">'+content+'</div></div>';
  }
  function rowB(label,val,bold) {
    return '<div style="display:flex;justify-content:space-between;padding:7px 14px;border-bottom:1px solid #f1f5f9">' +
      '<span style="'+(bold?'font-weight:700':'')+'">'+label+'</span><strong>'+fmtMoney(val)+'</strong></div>';
  }

  var ivaContent =
    rowB('Neto gravado ventas / cuotas', netoV) +
    rowB('IVA Débito Fiscal (ventas)', ivaD) +
    rowB('Neto gravado compras', netoC) +
    rowB('IVA Crédito Fiscal (compras)', ivaC) +
    '<div style="display:flex;justify-content:space-between;padding:10px 14px;background:'+(saldoIVA>=0?'#f0fdf4':'#fef2f2')+'">' +
      '<strong>Saldo IVA '+periodoLabel+'</strong>' +
      '<strong style="color:'+(saldoIVA>=0?'var(--success)':'var(--danger)') +'">'+
        (saldoIVA>=0?'A Favor ':'A Pagar ')+fmtMoney(Math.abs(saldoIVA)) +
      '</strong></div>';

  var retContent = totRets>0
    ? Object.entries(retsByTipo).map(function(e) { return rowB(e[0],e[1]); }).join('') +
      '<div style="display:flex;justify-content:space-between;padding:8px 14px;background:#f1f5f9"><strong>Total Retenciones</strong><strong>'+fmtMoney(totRets)+'</strong></div>'
    : '<div style="padding:12px 14px;color:var(--text-muted);font-size:12px">Sin retenciones practicadas en el período</div>';

  var html =
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">' +
      '<div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,var(--primary),#1d4ed8);display:flex;align-items:center;justify-content:center"><i class="fas fa-building" style="color:#fff"></i></div>' +
      '<div><div style="font-size:15px;font-weight:700">'+escapeHtml(co.name||'')+'</div>' +
        '<div style="font-size:11px;color:var(--text-muted)">'+(co.cuit||'')+' · '+periodoLabel+'</div>' +
      '</div></div>' +
    blk('Posición IVA del Período','#eff6ff',ivaContent) +
    (cuitDue?'<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:8px 14px;margin-bottom:14px;font-size:12px;color:#1e40af">'+cuitDue+'</div>':'') +
    blk('Retenciones Practicadas del Período','#fefce8',retContent) +
    (totRets>0?'<div style="font-size:11px;color:var(--text-muted)"><i class="fas fa-info-circle"></i> Retenciones del período corresponden a todas las OPs del mes. Para filtrar por empresa asigná empresa a las órdenes de pago.</div>':'');

  wrap.innerHTML = '<div style="max-width:620px">'+html+'</div>';
}

// =====================================================================
// TAB: CALENDARIO FISCAL
// =====================================================================
function taxPlanCalendario(companies) {
  var today      = new Date();
  var MONTHS_ES2 = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var DUE_DAYS   = [20,21,22,23,24,25,26,27,28,19];

  var periodos = [];
  for (var delta=0; delta<=2; delta++) {
    var d = new Date(today.getFullYear(), today.getMonth()+delta, 1);
    periodos.push({ year:d.getFullYear(), month:d.getMonth()+1, label:MONTHS_ES2[d.getMonth()]+' '+d.getFullYear() });
  }

  var coRows = companies.map(function(co) {
    var terminal = parseInt((co.cuit||'').replace(/\D/g,'').slice(-2,-1));
    if (isNaN(terminal)) terminal = 0;
    return { co:co, terminal:terminal, due:DUE_DAYS[terminal]||20 };
  });

  var html = '<div class="card"><div class="card-body">' +
    '<div style="font-size:14px;font-weight:700;margin-bottom:4px">Vencimientos AFIP estimados</div>' +
    '<div style="font-size:12px;color:var(--text-muted);margin-bottom:20px">Fechas de vencimiento de IVA según dígito terminal del CUIT. Verificá el cronograma actualizado en ARCA.</div>';

  if (!companies.length) {
    return html+'<div class="empty-state"><i class="fas fa-building"></i><p>Configurá las empresas del grupo para ver su calendario fiscal</p></div></div></div>';
  }

  html += '<div class="table-wrap"><table><thead><tr><th>Empresa</th><th>CUIT</th><th>Terminal</th>' +
    periodos.map(function(p) {
      return '<th style="text-align:center">IVA — '+p.label+'<br><small style="font-weight:400;color:var(--text-muted)">vence en '+(p.month===12?'Enero '+(p.year+1):'mes sig.')+'</small></th>';
    }).join('') +
  '</tr></thead><tbody>';

  coRows.forEach(function(cr) {
    html += '<tr><td><strong>'+escapeHtml(cr.co.name)+'</strong></td>' +
      '<td style="font-size:11px;color:#64748b">'+escapeHtml(cr.co.cuit||'—')+'</td>' +
      '<td style="text-align:center">'+cr.terminal+'</td>';
    periodos.forEach(function(p) {
      var dueMonth = p.month===12?1:p.month+1;
      var dueYear  = p.month===12?p.year+1:p.year;
      var dateStr  = dueYear+'-'+String(dueMonth).padStart(2,'0')+'-'+String(cr.due).padStart(2,'0');
      var isPast   = dateStr < today.toISOString().split('T')[0];
      var isClose  = !isPast && (new Date(dateStr)-today)/86400000 < 10;
      html += '<td style="text-align:center">' +
        '<span style="font-size:12px;font-weight:600;color:'+(isPast?'var(--text-muted)':isClose?'var(--danger)':'var(--success)')+'">'+
          cr.due+'/'+String(dueMonth).padStart(2,'0')+'/'+dueYear+
        '</span>' +
        (isClose?'<br><span class="badge badge-red" style="font-size:9px">Próximo</span>':'') +
        (isPast ?'<br><span style="font-size:9px;color:var(--text-muted)">vencido</span>':'') +
      '</td>';
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  html += '<div style="margin-top:16px;background:#fefce8;border:1px solid #fcd34d;border-radius:6px;padding:10px 14px;font-size:12px;color:#78350f">' +
    '<i class="fas fa-exclamation-triangle"></i> <strong>Importante:</strong> Fechas estimativas basadas en el dígito terminal del CUIT. El cronograma exacto puede variar por feriados y modificaciones de ARCA. Verificar en <strong>afip.gob.ar → Cronograma de vencimientos</strong>.</div>';
  html += '</div></div>';
  return html;
}
