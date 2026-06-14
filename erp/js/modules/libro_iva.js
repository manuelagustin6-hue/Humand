/* ===== LIBRO IVA COMPRAS Y VENTAS ===== */

// Period state shared across tabs
window._libroIvaPeriod = window._libroIvaPeriod || (function() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
})();

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const IVA_RATES_LABEL = { 21: '21%', 10.5: '10.5%', 27: '27%', 0: 'Exento/NG' };

// =====================================================================
// MAIN RENDER
// =====================================================================
function _livaCompanyOpts(selId) {
  try {
    return DB.getAllCompanies().map(function(c) {
      return '<option value="' + c.id + '"' + (selId === c.id ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>';
    }).join('');
  } catch(e) { return ''; }
}

function renderLibroIVA() {
  const p        = window._libroIvaPeriod;
  const coId     = window._livaCompanyFilter || '';
  const sis      = _livaGetCompras(p, coId);
  const invs     = _livaGetVentas(p, coId);

  const totC = sis.reduce((s, d) => s + d.total, 0);
  const totV = invs.reduce((s, d) => s + d.total, 0);
  const ivaC = sis.reduce((s, d) => s + d.ivaTotal, 0);
  const ivaV = invs.reduce((s, d) => s + d.ivaTotal, 0);
  const saldo = ivaV - ivaC;

  document.getElementById('content').innerHTML = `
<div class="page-header">
  <div>
    <div class="page-title">Libro IVA Compras y Ventas</div>
    <div class="page-subtitle">Registros para declaración jurada AFIP — Período fiscal</div>
  </div>
  <div class="page-actions" style="align-items:center;gap:8px;flex-wrap:wrap">
    <select class="form-control" id="liva-company" style="width:200px" onchange="livaSetCompany()">
      <option value="">Todas las empresas</option>
      ${_livaCompanyOpts(coId)}
    </select>
    <button class="btn btn-ghost" onclick="livaShiftPeriod(-1)"><i class="fas fa-chevron-left"></i></button>
    <select class="form-control" id="liva-month" style="width:120px" onchange="livaSetPeriod()">
      ${MONTHS_ES.map((m,i)=>`<option value="${i+1}" ${p.month===i+1?'selected':''}>${m}</option>`).join('')}
    </select>
    <select class="form-control" id="liva-year" style="width:90px" onchange="livaSetPeriod()">
      ${[...Array(7)].map((_,i)=>p.year-3+i).map(y=>`<option ${y===p.year?'selected':''}>${y}</option>`).join('')}
    </select>
    <button class="btn btn-ghost" onclick="livaShiftPeriod(1)"><i class="fas fa-chevron-right"></i></button>
    <button class="btn btn-secondary" onclick="livaExportCompras()"><i class="fas fa-download"></i> Compras XLSX</button>
    <button class="btn btn-primary"   onclick="livaExportVentas()"><i class="fas fa-download"></i> Ventas XLSX</button>
  </div>
</div>

<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-file-invoice"></i></div><div>
    <div class="stat-value">${sis.length}</div><div class="stat-label">Comprobantes Compras</div>
    <div class="stat-delta">${fmtMoney(totC)} total</div></div></div>
  <div class="stat-card"><div class="stat-icon green"><i class="fas fa-file-invoice-dollar"></i></div><div>
    <div class="stat-value">${invs.length}</div><div class="stat-label">Comprobantes Ventas</div>
    <div class="stat-delta">${fmtMoney(totV)} total</div></div></div>
  <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-percentage"></i></div><div>
    <div class="stat-value">${fmtMoney(ivaC)}</div><div class="stat-label">IVA Crédito Fiscal</div></div></div>
  <div class="stat-card"><div class="stat-icon ${saldo>=0?'green':'red'}"><i class="fas fa-scale-balanced"></i></div><div>
    <div class="stat-value">${fmtMoney(Math.abs(saldo))}</div>
    <div class="stat-label">${saldo>=0?'Saldo a Favor':'Saldo a Pagar'}</div></div></div>
</div>

<div id="libro-iva-tabs">
  <div class="tabs">
    <button class="tab-btn" data-tab="tab-iva-compras">IVA Compras</button>
    <button class="tab-btn" data-tab="tab-iva-ventas">IVA Ventas</button>
    <button class="tab-btn" data-tab="tab-iva-ddjj">Posición IVA (DDJJ)</button>
    <button class="tab-btn" data-tab="tab-iva-citi">Exportar CITI</button>
    <button class="tab-btn" data-tab="tab-iva-concil">Conciliar ARCA</button>
  </div>
  <div id="tab-iva-compras" class="tab-content">${livaRenderComprasTab(sis)}</div>
  <div id="tab-iva-ventas"  class="tab-content">${livaRenderVentasTab(invs)}</div>
  <div id="tab-iva-ddjj"   class="tab-content">${livaRenderDDJJTab(sis, invs)}</div>
  <div id="tab-iva-citi"   class="tab-content">${livaRenderCitiTab(sis, invs)}</div>
  <div id="tab-iva-concil" class="tab-content">${livaRenderConciliarTab()}</div>
</div>
`;
  initTabs('libro-iva-tabs');
}

// =====================================================================
// PERIOD CONTROLS
// =====================================================================
function livaSetPeriod() {
  window._libroIvaPeriod.month = parseInt(document.getElementById('liva-month').value);
  window._libroIvaPeriod.year  = parseInt(document.getElementById('liva-year').value);
  renderLibroIVA();
}

function livaSetCompany() {
  window._livaCompanyFilter = document.getElementById('liva-company')?.value || '';
  renderLibroIVA();
}

function livaShiftPeriod(delta) {
  let { year, month } = window._libroIvaPeriod;
  month += delta;
  if (month < 1)  { month = 12; year--; }
  if (month > 12) { month =  1; year++; }
  window._libroIvaPeriod = { year, month };
  renderLibroIVA();
}

// =====================================================================
// DATA EXTRACTION
// =====================================================================
function _livaInPeriod(dateStr, p) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return d.getFullYear() === p.year && (d.getMonth() + 1) === p.month;
}

function _livaComprasRow(doc, type) {
  const rate    = parseFloat(doc.iva_rate) || 0;
  const sub     = parseFloat(doc.subtotal) || 0;
  const iva     = parseFloat(doc.tax) || 0;
  const taxes   = doc.taxes || [];
  const percIva = taxes.filter(t=>t.type==='perc_iva').reduce((s,t)=>s+(t.amount||0),0)  || parseFloat(doc.perc_iva)||0;
  const percIibb= taxes.filter(t=>t.type==='perc_iibb').reduce((s,t)=>s+(t.amount||0),0) || parseFloat(doc.perc_iibb)||0;
  const retGan  = taxes.filter(t=>t.type==='ret_gan').reduce((s,t)=>s+(t.amount||0),0);
  const retIva  = taxes.filter(t=>t.type==='ret_iva').reduce((s,t)=>s+(t.amount||0),0);
  const suss    = taxes.filter(t=>t.type==='suss').reduce((s,t)=>s+(t.amount||0),0);
  const sellos  = taxes.filter(t=>t.type==='sellos').reduce((s,t)=>s+(t.amount||0),0);
  const otherTax= percIva + percIibb + retGan + retIva + suss + sellos;

  const sign = type === 'NC' ? -1 : 1;

  return {
    date:     doc.date,
    docType:  type,
    number:   doc.number || doc.ref_doc_number || '',
    cuit:     doc._cuit || '-',
    name:     doc._name || doc.entity_name || '-',
    neto21:   rate === 21   ? sub * sign : 0,
    neto105:  rate === 10.5 ? sub * sign : 0,
    neto27:   rate === 27   ? sub * sign : 0,
    netoExento: rate === 0  ? sub * sign : 0,
    iva21:    rate === 21   ? iva * sign : 0,
    iva105:   rate === 10.5 ? iva * sign : 0,
    iva27:    rate === 27   ? iva * sign : 0,
    percIva:  percIva  * sign,
    percIibb: percIibb * sign,
    retGan:   retGan   * sign,
    retIva:   retIva   * sign,
    suss:     suss     * sign,
    sellos:   sellos   * sign,
    ivaTotal: iva * sign,
    total:    (parseFloat(doc.total)||0) * sign,
    _id:      doc.id
  };
}

const LIVA_AFIP_TYPES = ['A', 'B', 'C', 'M'];

function _livaIsAfipDoc(tipo) {
  // undefined/null/'' = legacy record → include (assume AFIP)
  if (!tipo) return true;
  return LIVA_AFIP_TYPES.includes(tipo);
}

function _livaGetCompras(p, companyId) {
  const suppliers = DB.getAll('suppliers');
  const supMap    = {};
  suppliers.forEach(s => { supMap[s.id] = s; });

  const rows = [];

  // Facturas proveedor — solo comprobantes AFIP (A/B/C/M o sin tipo = legacy)
  DB.getAll('supplierInvoices').filter(si =>
    _livaInPeriod(si.date, p) && _livaIsAfipDoc(si.tipo_comprobante) &&
    (!companyId || si.company_id === companyId)
  ).forEach(si => {
    const sup = supMap[si.supplier_id] || {};
    si._cuit = sup.cuit || sup.tax_id || '-';
    si._name = sup.name || si.supplier_name || '-';
    rows.push(_livaComprasRow(si, 'FAC'));
  });

  // NC / ND recibidas (confirmadas)
  DB.getAll('notasCreditoDebito').filter(n => (n.type==='nc_rec'||n.type==='nd_rec') && _livaInPeriod(n.date, p) && n.status==='confirmed').forEach(n => {
    n._name = n.entity_name;
    rows.push(_livaComprasRow(n, n.type==='nc_rec'?'NC':'ND'));
  });

  // Count excluded docs for display
  const totalSI = DB.getAll('supplierInvoices').filter(si => _livaInPeriod(si.date, p)).length;
  rows._excluded = totalSI - rows.filter(r => r.docType === 'FAC').length;

  return rows.sort((a,b) => a.date.localeCompare(b.date));
}

function _livaVentasRow(doc, type) {
  const sub  = parseFloat(doc.subtotal) || 0;
  const iva  = parseFloat(doc.tax) || 0;
  const rate = doc.iva_rate ? parseFloat(doc.iva_rate) : (sub > 0 && iva > 0 ? Math.round((iva/sub)*100*10)/10 : 21);
  const sign = type === 'NC' ? -1 : 1;

  return {
    date:     doc.date,
    docType:  `${type}${doc.type?' '+doc.type:''}`,
    number:   doc.number || '',
    cuit:     doc.client_cuit || doc.entity_id || '-',
    name:     doc.client_name || doc.entity_name || '-',
    neto21:   rate >= 20    ? sub * sign : 0,
    neto105:  (rate >= 10 && rate < 20) ? sub * sign : 0,
    neto27:   rate >= 27   ? sub * sign : 0,
    netoExento: rate === 0 ? sub * sign : 0,
    iva21:    rate >= 20   ? iva * sign : 0,
    iva105:   (rate >= 10 && rate < 20) ? iva * sign : 0,
    iva27:    rate >= 27   ? iva * sign : 0,
    ivaTotal: iva * sign,
    total:    (parseFloat(doc.total)||0) * sign,
    _id:      doc.id
  };
}

function _livaGetVentas(p, companyId) {
  const rows = [];

  // Facturas emitidas — solo comprobantes AFIP (A/B/C/M o sin tipo = legacy)
  DB.getAll('invoices').filter(inv =>
    _livaInPeriod(inv.date, p) &&
    _livaIsAfipDoc(inv.tipo_comprobante || inv.type) &&
    (!companyId || inv.company_id === companyId)
  ).forEach(inv => {
    rows.push(_livaVentasRow(inv, 'FAC'));
  });

  DB.getAll('notasCreditoDebito').filter(n => (n.type==='nc_emi'||n.type==='nd_emi') && _livaInPeriod(n.date, p) && n.status==='confirmed').forEach(n => {
    rows.push(_livaVentasRow(n, n.type==='nc_emi'?'NC':'ND'));
  });

  // Cobranzas de cuotas con IVA (declarables AFIP sin factura emitida aún)
  DB.getAll('collections').filter(function(c) {
    return c.iva_incluido && c.tipo_cobranza === 'cuota_formal' && _livaInPeriod(c.date, p) &&
           (!companyId || c.company_id === companyId);
  }).forEach(function(c) {
    var rate = parseFloat(c.iva_rate) || 10.5;
    var neto = parseFloat(c.neto) || (c.amount / (1 + rate/100));
    var iva  = parseFloat(c.iva_amount) || (c.amount - neto);
    rows.push({
      date:       c.date,
      docType:    'CUOTA',
      number:     'CUOTA-' + (c.id||'').slice(-6).toUpperCase(),
      cuit:       c.client_cuit || '-',
      name:       c.client_name || '-',
      neto21:     rate >= 20    ? neto : 0,
      neto105:    (rate >= 10 && rate < 20) ? neto : 0,
      neto27:     rate >= 27   ? neto : 0,
      netoExento: 0,
      iva21:      rate >= 20   ? iva  : 0,
      iva105:     (rate >= 10 && rate < 20) ? iva  : 0,
      iva27:      rate >= 27   ? iva  : 0,
      ivaTotal:   iva,
      total:      parseFloat(c.amount) || 0,
      _id:        c.id,
    });
  });

  return rows.sort((a,b) => a.date.localeCompare(b.date));
}

// =====================================================================
// TAB: IVA COMPRAS
// =====================================================================
function livaRenderComprasTab(rows) {
  const excluded = rows._excluded || 0;
  const excludedNote = excluded > 0
    ? `<div style="background:var(--warning-light);border:1px solid var(--warning);border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#78350f">
        <i class="fas fa-info-circle"></i> <strong>${excluded}</strong> comprobante(s) excluido(s) del libro por tipo <em>No AFIP / Informal</em>.
        El tipo se configura en cada factura de proveedor.
       </div>`
    : '';

  if (!rows.length) return excludedNote + `<div class="empty-state"><i class="fas fa-file-invoice"></i>
    <p>Sin comprobantes de compras para este período.<br>
    <small style="color:var(--text-muted)">Las facturas de proveedor y NC/ND recibidas confirmadas aparecen aquí.</small></p></div>`;

  // Totals
  const totals = rows.reduce((acc, r) => {
    acc.neto21     += r.neto21;
    acc.neto105    += r.neto105;
    acc.neto27     += r.neto27;
    acc.netoExento += r.netoExento;
    acc.iva21      += r.iva21;
    acc.iva105     += r.iva105;
    acc.iva27      += r.iva27;
    acc.percIva    += r.percIva   ||0;
    acc.percIibb   += r.percIibb  ||0;
    acc.retGan     += r.retGan    ||0;
    acc.retIva     += r.retIva    ||0;
    acc.suss       += r.suss      ||0;
    acc.sellos     += r.sellos    ||0;
    acc.total      += r.total;
    return acc;
  }, { neto21:0, neto105:0, neto27:0, netoExento:0, iva21:0, iva105:0, iva27:0,
       percIva:0, percIibb:0, retGan:0, retIva:0, suss:0, sellos:0, total:0 });

  const hasPerc = rows.some(r => (r.percIva||0)+(r.percIibb||0)+(r.retGan||0)+(r.retIva||0)+(r.suss||0)+(r.sellos||0) !== 0);

  const mc = v => `<td class="text-right" style="font-size:12px">${v !== 0 ? fmtMoney(v) : '<span style="color:var(--border)">—</span>'}</td>`;

  const dataRows = rows.map(r => `<tr>
    <td style="white-space:nowrap;font-size:12px">${fmtDate(r.date)}</td>
    <td><span class="badge badge-${r.docType==='NC'?'green':r.docType==='ND'?'red':'blue'}" style="font-size:10px">${r.docType}</span></td>
    <td style="font-size:12px">${r.number}</td>
    <td style="font-size:11px;font-family:monospace">${r.cuit}</td>
    <td style="font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.name}">${r.name}</td>
    ${mc(r.neto21)} ${mc(r.neto105)} ${mc(r.neto27)} ${mc(r.netoExento)}
    ${mc(r.iva21)}  ${mc(r.iva105)}  ${mc(r.iva27)}
    ${hasPerc ? mc(r.percIva||0)+mc(r.percIibb||0)+mc(r.retGan||0) : ''}
    <td class="text-right"><strong>${fmtMoney(r.total)}</strong></td>
  </tr>`).join('');

  const totRow = `<tr style="background:var(--primary-muted);font-weight:700;border-top:2px solid var(--primary)">
    <td colspan="5"><strong>TOTALES (${rows.length} comprobantes)</strong></td>
    ${mc(totals.neto21)} ${mc(totals.neto105)} ${mc(totals.neto27)} ${mc(totals.netoExento)}
    ${mc(totals.iva21)}  ${mc(totals.iva105)}  ${mc(totals.iva27)}
    ${hasPerc ? mc(totals.percIva)+mc(totals.percIibb)+mc(totals.retGan) : ''}
    <td class="text-right"><strong>${fmtMoney(totals.total)}</strong></td>
  </tr>`;

  const percHeaders = hasPerc
    ? '<th class="text-right" style="font-size:11px">Perc. IVA</th><th class="text-right" style="font-size:11px">Perc. IIBB</th><th class="text-right" style="font-size:11px">Ret. Gan.</th>'
    : '';

  return excludedNote + `<div style="overflow-x:auto">
<table style="min-width:900px;font-size:12px">
<thead>
  <tr style="background:var(--bg-subtle)">
    <th style="white-space:nowrap">Fecha</th><th>Tipo</th><th>Número</th>
    <th>CUIT</th><th style="min-width:140px">Razón Social</th>
    <th class="text-right" style="font-size:11px">Neto 21%</th>
    <th class="text-right" style="font-size:11px">Neto 10.5%</th>
    <th class="text-right" style="font-size:11px">Neto 27%</th>
    <th class="text-right" style="font-size:11px">Exento/NG</th>
    <th class="text-right" style="font-size:11px;color:var(--warning)">IVA 21%</th>
    <th class="text-right" style="font-size:11px;color:var(--warning)">IVA 10.5%</th>
    <th class="text-right" style="font-size:11px;color:var(--warning)">IVA 27%</th>
    ${percHeaders}
    <th class="text-right">Total</th>
  </tr>
</thead>
<tbody>${dataRows}</tbody>
<tfoot>${totRow}</tfoot>
</table>
</div>

${livaRenderRateSummary(totals, 'compras')}`;
}

// =====================================================================
// TAB: IVA VENTAS
// =====================================================================
function livaRenderVentasTab(rows) {
  if (!rows.length) return `<div class="empty-state"><i class="fas fa-file-invoice-dollar"></i>
    <p>Sin comprobantes de ventas para este período.<br>
    <small style="color:var(--text-muted)">Las facturas emitidas y NC/ND emitidas confirmadas aparecen aquí.</small></p></div>`;

  const totals = rows.reduce((acc, r) => {
    acc.neto21     += r.neto21;
    acc.neto105    += r.neto105;
    acc.neto27     += r.neto27;
    acc.netoExento += r.netoExento;
    acc.iva21      += r.iva21;
    acc.iva105     += r.iva105;
    acc.iva27      += r.iva27;
    acc.total      += r.total;
    return acc;
  }, { neto21:0, neto105:0, neto27:0, netoExento:0, iva21:0, iva105:0, iva27:0, total:0 });

  const mc = v => `<td class="text-right" style="font-size:12px">${v !== 0 ? fmtMoney(v) : '<span style="color:var(--border)">—</span>'}</td>`;

  const dataRows = rows.map(r => `<tr>
    <td style="white-space:nowrap;font-size:12px">${fmtDate(r.date)}</td>
    <td><span class="badge badge-${r.docType.startsWith('NC')?'green':r.docType.startsWith('ND')?'red':'blue'}" style="font-size:10px">${r.docType}</span></td>
    <td style="font-size:12px">${r.number}</td>
    <td style="font-size:11px;font-family:monospace">${r.cuit}</td>
    <td style="font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.name}">${r.name}</td>
    ${mc(r.neto21)} ${mc(r.neto105)} ${mc(r.neto27)} ${mc(r.netoExento)}
    ${mc(r.iva21)}  ${mc(r.iva105)}  ${mc(r.iva27)}
    <td class="text-right"><strong>${fmtMoney(r.total)}</strong></td>
  </tr>`).join('');

  const totRow = `<tr style="background:var(--primary-muted);font-weight:700;border-top:2px solid var(--primary)">
    <td colspan="5"><strong>TOTALES (${rows.length} comprobantes)</strong></td>
    ${mc(totals.neto21)} ${mc(totals.neto105)} ${mc(totals.neto27)} ${mc(totals.netoExento)}
    ${mc(totals.iva21)}  ${mc(totals.iva105)}  ${mc(totals.iva27)}
    <td class="text-right"><strong>${fmtMoney(totals.total)}</strong></td>
  </tr>`;

  return `<div style="overflow-x:auto">
<table style="min-width:800px;font-size:12px">
<thead>
  <tr style="background:var(--bg-subtle)">
    <th style="white-space:nowrap">Fecha</th><th>Tipo</th><th>Número</th>
    <th>CUIT</th><th style="min-width:140px">Razón Social</th>
    <th class="text-right" style="font-size:11px">Neto 21%</th>
    <th class="text-right" style="font-size:11px">Neto 10.5%</th>
    <th class="text-right" style="font-size:11px">Neto 27%</th>
    <th class="text-right" style="font-size:11px">Exento/NG</th>
    <th class="text-right" style="font-size:11px;color:var(--warning)">IVA 21%</th>
    <th class="text-right" style="font-size:11px;color:var(--warning)">IVA 10.5%</th>
    <th class="text-right" style="font-size:11px;color:var(--warning)">IVA 27%</th>
    <th class="text-right">Total</th>
  </tr>
</thead>
<tbody>${dataRows}</tbody>
<tfoot>${totRow}</tfoot>
</table>
</div>

${livaRenderRateSummary(totals, 'ventas')}`;
}

// =====================================================================
// TAB: POSICIÓN IVA / DDJJ
// =====================================================================
function livaRenderDDJJTab(compras, ventas) {
  const p = window._libroIvaPeriod;
  const periodoLabel = `${MONTHS_ES[p.month-1]} ${p.year}`;

  // IVA Débito Fiscal (from ventas)
  const df21  = ventas.reduce((s,r) => s + r.iva21,  0);
  const df105 = ventas.reduce((s,r) => s + r.iva105, 0);
  const df27  = ventas.reduce((s,r) => s + r.iva27,  0);
  const dfTotal = df21 + df105 + df27;

  // IVA Crédito Fiscal (from compras)
  const cf21  = compras.reduce((s,r) => s + r.iva21,  0);
  const cf105 = compras.reduce((s,r) => s + r.iva105, 0);
  const cf27  = compras.reduce((s,r) => s + r.iva27,  0);
  const cfTotal = cf21 + cf105 + cf27;

  // Percepciones y retenciones sufridas (reducen lo que se paga)
  const percIvaTotal  = compras.reduce((s,r) => s + (r.percIva ||0), 0);
  const percIibbTotal = compras.reduce((s,r) => s + (r.percIibb||0), 0);
  const retGanTotal   = compras.reduce((s,r) => s + (r.retGan  ||0), 0);
  const retIvaTotal   = compras.reduce((s,r) => s + (r.retIva  ||0), 0);
  const sussTotal     = compras.reduce((s,r) => s + (r.suss    ||0), 0);
  const sellosTotal   = compras.reduce((s,r) => s + (r.sellos  ||0), 0);

  const saldo    = dfTotal - cfTotal - retIvaTotal;
  const hayFavor = saldo <= 0;

  const row = (label, val, bold, colorClass) => `
<tr>
  <td ${bold?'style="font-weight:700"':''}>${label}</td>
  <td class="text-right" ${bold?'style="font-weight:700"':''}>
    <span ${colorClass?`style="color:var(--${colorClass})"`:''}>${fmtMoney(val)}</span>
  </td>
</tr>`;

  const posSummaryCard = `
<div class="card" style="max-width:520px;margin:0 auto">
  <div class="card-body">
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:13px;color:var(--text-muted)">Posición IVA</div>
      <div style="font-size:18px;font-weight:700">${periodoLabel}</div>
    </div>
    <table style="width:100%">
      <thead><tr style="background:var(--bg-subtle)">
        <th>Concepto</th><th class="text-right">Importe</th>
      </tr></thead>
      <tbody>
        <tr style="background:var(--success-light)">
          <td colspan="2" style="font-weight:600;font-size:11px;color:#065f46;padding:6px 12px">IVA DÉBITO FISCAL</td>
        </tr>
        ${row('IVA 21% (ventas)',  df21,  false)}
        ${row('IVA 10.5% (ventas)',df105, false)}
        ${df27 ? row('IVA 27% (ventas)', df27, false) : ''}
        ${row('Subtotal Débito Fiscal', dfTotal, true, 'success')}

        <tr style="background:var(--danger-light)">
          <td colspan="2" style="font-weight:600;font-size:11px;color:#991b1b;padding:6px 12px">IVA CRÉDITO FISCAL</td>
        </tr>
        ${row('IVA 21% (compras)',  cf21,  false)}
        ${row('IVA 10.5% (compras)',cf105, false)}
        ${cf27 ? row('IVA 27% (compras)', cf27, false) : ''}
        ${row('Subtotal Crédito Fiscal', cfTotal, true, 'danger')}

        ${retIvaTotal > 0 ? `
        <tr style="background:var(--warning-light)">
          <td colspan="2" style="font-weight:600;font-size:11px;color:#78350f;padding:6px 12px">RETENCIONES IVA SUFRIDAS</td>
        </tr>
        ${row('Ret. IVA sufridas', retIvaTotal, true, 'warning')}` : ''}

        <tr style="border-top:2px solid ${hayFavor?'var(--success)':'var(--danger)'}">
          <td style="font-size:15px;font-weight:800;padding-top:10px">${hayFavor?'SALDO A FAVOR':'SALDO A PAGAR'}</td>
          <td class="text-right" style="font-size:15px;font-weight:800;color:var(--${hayFavor?'success':'danger'});padding-top:10px">
            ${fmtMoney(Math.abs(saldo))}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>`;

  const hasOtherTaxes = percIvaTotal+percIibbTotal+retGanTotal+sussTotal+sellosTotal > 0;

  const otherTaxesCard = hasOtherTaxes ? `
<div class="card" style="max-width:520px;margin:16px auto 0">
  <div class="card-body">
    <div style="font-size:13px;font-weight:600;margin-bottom:12px;color:var(--text-muted)">OTROS IMPUESTOS Y RETENCIONES (Compras)</div>
    <table style="width:100%">
      <tbody>
        ${percIvaTotal  > 0 ? row('Percepciones IVA',   percIvaTotal,  false) : ''}
        ${percIibbTotal > 0 ? row('Percepciones IIBB',  percIibbTotal, false) : ''}
        ${retGanTotal   > 0 ? row('Retenciones Ganancias', retGanTotal, false) : ''}
        ${sussTotal     > 0 ? row('SUSS',               sussTotal,     false) : ''}
        ${sellosTotal   > 0 ? row('Sellos',             sellosTotal,   false) : ''}
        ${row('Total Otros Impuestos', percIvaTotal+percIibbTotal+retGanTotal+sussTotal+sellosTotal, true)}
      </tbody>
    </table>
  </div>
</div>` : '';

  const volumeCard = `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:520px;margin:16px auto 0">
  <div class="stat-card">
    <div class="stat-icon blue"><i class="fas fa-shopping-cart"></i></div>
    <div>
      <div class="stat-value" style="font-size:16px">${fmtMoney(compras.reduce((s,r)=>s+r.total,0))}</div>
      <div class="stat-label">Total Compras del Período</div>
    </div>
  </div>
  <div class="stat-card">
    <div class="stat-icon green"><i class="fas fa-chart-line"></i></div>
    <div>
      <div class="stat-value" style="font-size:16px">${fmtMoney(ventas.reduce((s,r)=>s+r.total,0))}</div>
      <div class="stat-label">Total Ventas del Período</div>
    </div>
  </div>
</div>`;

  return posSummaryCard + otherTaxesCard + volumeCard;
}

// =====================================================================
// RATE SUMMARY (mini card below tables)
// =====================================================================
function livaRenderRateSummary(totals, type) {
  const isC = type === 'compras';
  const items = [
    { label: 'Neto Gravado 21%',    val: totals.neto21 },
    { label: 'Neto Gravado 10.5%',  val: totals.neto105 },
    { label: 'Neto Gravado 27%',    val: totals.neto27 },
    { label: 'Exento / No Gravado', val: totals.netoExento },
    { label: `IVA 21% (${isC?'Crédito':'Débito'} Fiscal)`, val: totals.iva21, bold: true, color: 'warning' },
    { label: `IVA 10.5% (${isC?'Crédito':'Débito'} Fiscal)`, val: totals.iva105, bold: true, color: 'warning' },
  ];
  if (totals.neto27 || totals.iva27) items.push({ label: `IVA 27%`, val: totals.iva27, bold: true, color: 'warning' });
  if (isC) {
    if (totals.percIva)  items.push({ label: 'Percepciones IVA',  val: totals.percIva });
    if (totals.percIibb) items.push({ label: 'Percepciones IIBB', val: totals.percIibb });
    if (totals.retGan)   items.push({ label: 'Retenciones Ganancias', val: totals.retGan });
  }
  items.push({ label: 'TOTAL', val: totals.total, bold: true, color: 'primary' });

  const cols = items.filter(it => it.val !== 0);
  if (!cols.length) return '';

  return `<div class="card" style="margin-top:12px">
<div class="card-body" style="padding:12px 16px">
  <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center">
    <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Resumen:</span>
    ${cols.map(it => `<div style="display:flex;flex-direction:column;align-items:flex-end">
      <span style="font-size:10px;color:var(--text-muted)">${it.label}</span>
      <strong style="font-size:${it.bold?'15':'13'}px;color:var(--${it.color||'text'})">${fmtMoney(it.val)}</strong>
    </div>`).join('<div style="width:1px;height:32px;background:var(--border)"></div>')}
  </div>
</div>
</div>`;
}

// =====================================================================
// EXPORT
// =====================================================================
function livaExportCompras() {
  const p    = window._libroIvaPeriod;
  const rows = _livaGetCompras(p);
  const filename = `libro_iva_compras_${p.year}${String(p.month).padStart(2,'0')}`;
  exportXLSX(filename,
    ['Fecha','Tipo','Número','CUIT','Razón Social',
     'Neto 21%','Neto 10.5%','Neto 27%','Exento/NG',
     'IVA 21%','IVA 10.5%','IVA 27%',
     'Perc. IVA','Perc. IIBB','Ret. Ganancias','Ret. IVA','SUSS','Sellos','Total'],
    rows.map(r => [r.date, r.docType, r.number, r.cuit, r.name,
      r.neto21, r.neto105, r.neto27, r.netoExento,
      r.iva21,  r.iva105,  r.iva27,
      r.percIva||0, r.percIibb||0, r.retGan||0, r.retIva||0, r.suss||0, r.sellos||0, r.total])
  );
}

function livaExportVentas() {
  const p    = window._libroIvaPeriod;
  const rows = _livaGetVentas(p);
  const filename = `libro_iva_ventas_${p.year}${String(p.month).padStart(2,'0')}`;
  exportXLSX(filename,
    ['Fecha','Tipo','Número','CUIT','Razón Social',
     'Neto 21%','Neto 10.5%','Neto 27%','Exento/NG',
     'IVA 21%','IVA 10.5%','IVA 27%','Total'],
    rows.map(r => [r.date, r.docType, r.number, r.cuit, r.name,
      r.neto21, r.neto105, r.neto27, r.netoExento,
      r.iva21,  r.iva105,  r.iva27,  r.total])
  );
}

// =====================================================================
// CITI COMPRAS Y VENTAS (RG 3685)
// =====================================================================

// Tipo de comprobante → código AFIP 3 dígitos
function _citiTipoComp(tipo) {
  var t = (tipo || 'B').toUpperCase().trim();
  // accept single letters or prefixed forms like 'FA', 'FB', 'FC'
  var letter = t.length === 1 ? t : t.slice(-1);
  var base = { A: '001', B: '006', C: '011', M: '051', E: '019' };
  return base[letter] || '006';
}

// Parse "00001-00000123" or "0001-00000123" → { ptoVenta, nroComp }
function _parseCitiNum(str) {
  var clean = (str || '').replace(/[^0-9\-]/g, '');
  var dash  = clean.indexOf('-');
  if (dash > 0) {
    return {
      ptoVenta: clean.slice(0, dash).padStart(5, '0').slice(-5),
      nroComp:  clean.slice(dash + 1).padStart(8, '0').slice(-8),
    };
  }
  return { ptoVenta: '00001', nroComp: clean.padStart(8, '0').slice(-8) };
}

function _fmtC(v) { return (parseFloat(v) || 0).toFixed(2).replace('.', ','); }

// Alícuota IVA % → código AFIP
const _CITI_ALIC = { 0:'3', 2.5:'9', 5:'8', 10.5:'4', 21:'5', 27:'6' };
function _citiAlicCod(rate) {
  var r = Math.round(parseFloat(rate || 21) * 10) / 10;
  return _CITI_ALIC[r] || '5';
}

function _citiSaveFile(filename, content) {
  var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Render the CITI tab UI
function livaRenderCitiTab(comprasRows, ventasRows) {
  var companyOpts = '';
  try {
    companyOpts = DB.getAllCompanies().map(function(c) {
      return '<option value="' + c.id + '" data-cuit="' + (c.cuit||'') + '">' +
             escapeHtml(c.name) + (c.cuit ? ' — ' + c.cuit : '') + '</option>';
    }).join('');
  } catch(e) {}

  return '<div class="card"><div class="card-body">' +
    '<div style="font-size:14px;font-weight:700;margin-bottom:4px">Exportar CITI Compras y Ventas</div>' +
    '<div style="font-size:12px;color:var(--text-muted);margin-bottom:20px">Régimen Informativo RG 3685 — genera los archivos TXT para importar en el portal ARCA. El período se toma del selector de mes/año del encabezado.</div>' +
    '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 18px;margin-bottom:18px">' +
      '<div style="font-size:11px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">Razón Social Emisora (para VENTAS)</div>' +
      '<div class="form-grid form-grid-2" style="margin:0">' +
        '<div class="form-group" style="margin:0"><label class="form-label">Empresa del grupo</label>' +
          '<select class="form-control" id="citi-company" onchange="_citiSyncCuit()">' + companyOpts + '</select></div>' +
        '<div class="form-group" style="margin:0"><label class="form-label">CUIT Emisor</label>' +
          '<input class="form-control" id="citi-company-cuit" readonly style="background:#f8fafc" placeholder="Automático"></div>' +
      '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">' +
      '<div style="border:1px solid var(--border);border-radius:8px;padding:16px">' +
        '<div style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:4px"><i class="fas fa-shopping-cart" style="margin-right:6px"></i>CITI Compras</div>' +
        '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">' + comprasRows.filter(function(r){return r.docType==='FAC';}).length + ' facturas de proveedor en el período</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn btn-secondary btn-sm" onclick="livaCitiExportCompras()"><i class="fas fa-download"></i> COMPRAS_CBTE.TXT</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="livaCitiExportCompras(\'alicuota\')"><i class="fas fa-download"></i> COMPRAS_ALICUOTA.TXT</button>' +
        '</div>' +
      '</div>' +
      '<div style="border:1px solid var(--border);border-radius:8px;padding:16px">' +
        '<div style="font-size:13px;font-weight:700;color:var(--success);margin-bottom:4px"><i class="fas fa-file-invoice-dollar" style="margin-right:6px"></i>CITI Ventas</div>' +
        '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">' + ventasRows.filter(function(r){return r.docType==='FAC';}).length + ' facturas emitidas en el período</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn btn-primary btn-sm" onclick="livaCitiExportVentas()"><i class="fas fa-download"></i> VENTAS_CBTE.TXT</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="livaCitiExportVentas(\'alicuota\')"><i class="fas fa-download"></i> VENTAS_ALICUOTA.TXT</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div style="background:#fefce8;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;font-size:12px;color:#78350f">' +
      '<i class="fas fa-info-circle"></i> <strong>Formato RG 3685:</strong> campos delimitados por punto y coma (;), sin encabezado, con punto y coma al final de cada registro. ' +
      'Importe con coma decimal (ej: 1234,56). Fecha AAAAMMDD. CUIT sin guiones.' +
    '</div>' +
  '</div></div>';
}

function _citiSyncCuit() {
  try {
    var sel = document.getElementById('citi-company');
    var el  = document.getElementById('citi-company-cuit');
    if (!sel || !el) return;
    var companies = DB.getAllCompanies();
    var co = companies.find(function(c) { return c.id === sel.value; });
    el.value = co ? (co.cuit || '') : '';
  } catch(e) {}
}

function livaCitiExportCompras(mode) {
  var p       = window._libroIvaPeriod;
  var ym      = p.year + String(p.month).padStart(2, '0');
  var citiCoId= (document.getElementById('citi-company')?.value) || (window._livaCompanyFilter || '');
  var supMap  = {};
  try { DB.getAll('suppliers').forEach(function(s) { supMap[s.id] = s; }); } catch(e) {}

  var sis = DB.getAll('supplierInvoices').filter(function(si) {
    return _livaInPeriod(si.date, p) && _livaIsAfipDoc(si.tipo_comprobante) &&
           (!citiCoId || si.company_id === citiCoId);
  });

  if (!sis.length) { toast('Sin comprobantes de compras AFIP para el período', 'warning'); return; }

  var cbteLines = [];
  var alicLines = [];

  sis.forEach(function(si) {
    var sup   = supMap[si.supplier_id] || {};
    var cuit  = (sup.cuit || sup.tax_id || '').replace(/[-\s]/g, '');
    var razon = (sup.name || '').substring(0, 30);
    var num   = _parseCitiNum(si.number);
    var tipo  = _citiTipoComp(si.tipo_comprobante);
    var fecha = (si.date || '').replace(/-/g, '');
    var sub   = parseFloat(si.subtotal)  || 0;
    var iva   = parseFloat(si.tax)       || 0;
    var pIva  = parseFloat(si.perc_iva)  || 0;
    var pIibb = parseFloat(si.perc_iibb) || 0;
    var total = parseFloat(si.total)     || 0;
    var rate  = parseFloat(si.iva_rate)  || 21;

    cbteLines.push([
      fecha,                     // 1  Fecha AAAAMMDD
      tipo,                      // 2  Tipo comprobante
      num.ptoVenta,              // 3  Punto de venta
      num.nroComp,               // 4  Número comprobante
      '                ',        // 5  Nro. despacho importación (16 esp)
      '80',                      // 6  Tipo doc (CUIT)
      cuit.padEnd(20, ' '),      // 7  CUIT proveedor
      razon,                     // 8  Razón social
      _fmtC(total),              // 9  Importe total
      _fmtC(0),                  // 10 No gravado
      _fmtC(0),                  // 11 Exento
      _fmtC(pIva),               // 12 Percepción IVA
      _fmtC(0),                  // 13 Otros imp. nac.
      _fmtC(pIibb),              // 14 Percepción IIBB
      _fmtC(0),                  // 15 Percepción municipal
      _fmtC(0),                  // 16 Imp. internos
      'PES',                     // 17 Moneda
      '1,000000',                // 18 Tipo de cambio
      '1',                       // 19 Cant. alícuotas
      ' ',                       // 20 Cód. operación
      _fmtC(iva),                // 21 CF computable
      _fmtC(0),                  // 22 Otros tributos
      cuit,                      // 23 CUIT emisor
    ].join(';') + ';');

    alicLines.push([
      tipo,
      num.ptoVenta,
      num.nroComp,
      '80',
      cuit.padEnd(20, ' '),
      _fmtC(sub),
      _citiAlicCod(rate),
      _fmtC(iva),
    ].join(';') + ';');
  });

  if (!mode || mode === 'cbte') {
    _citiSaveFile('COMPRAS_CBTE_' + ym + '.TXT', cbteLines.join('\r\n'));
    toast('COMPRAS_CBTE_' + ym + '.TXT generado (' + cbteLines.length + ' registros)', 'success');
  }
  if (mode === 'alicuota') {
    _citiSaveFile('COMPRAS_ALICUOTA_' + ym + '.TXT', alicLines.join('\r\n'));
    toast('COMPRAS_ALICUOTA_' + ym + '.TXT generado (' + alicLines.length + ' registros)', 'success');
  }
}

function livaCitiExportVentas(mode) {
  var p  = window._libroIvaPeriod;
  var ym = p.year + String(p.month).padStart(2, '0');

  // Get emisor CUIT from company selector
  var emisorCuit = '';
  try {
    _citiSyncCuit();
    var sel = document.getElementById('citi-company');
    var el  = document.getElementById('citi-company-cuit');
    if (el) emisorCuit = (el.value || '').replace(/[-\s]/g, '');
  } catch(e) {}

  var invs = DB.getAll('invoices').filter(function(inv) {
    return _livaInPeriod(inv.date, p) && _livaIsAfipDoc(inv.tipo_comprobante || inv.type);
  });

  if (!invs.length) { toast('Sin comprobantes de ventas AFIP para el período', 'warning'); return; }

  var cbteLines = [];
  var alicLines = [];

  invs.forEach(function(inv) {
    var cuitCli = (inv.client_cuit || inv.entity_id || '').replace(/[-\s]/g, '');
    var razon   = (inv.client_name || inv.entity_name || '').substring(0, 30);
    var num     = _parseCitiNum(inv.number);
    var tipo    = _citiTipoComp(inv.tipo_comprobante || inv.type);
    var fecha   = (inv.date || '').replace(/-/g, '');
    var sub     = parseFloat(inv.subtotal) || 0;
    var iva     = parseFloat(inv.tax)      || 0;
    var total   = parseFloat(inv.total)    || 0;
    var rate    = inv.iva_rate ? parseFloat(inv.iva_rate) : (sub > 0 && iva > 0 ? Math.round((iva/sub)*1000)/10 : 21);

    cbteLines.push([
      fecha,
      tipo,
      num.ptoVenta,
      num.nroComp,
      '                ',
      '80',
      cuitCli.padEnd(20, ' '),
      razon,
      _fmtC(total),
      _fmtC(0),
      _fmtC(0),
      _fmtC(0),
      _fmtC(0),
      _fmtC(0),
      _fmtC(0),
      _fmtC(0),
      'PES',
      '1,000000',
      '1',
      ' ',
      _fmtC(iva),
      _fmtC(0),
      emisorCuit || cuitCli,
    ].join(';') + ';');

    alicLines.push([
      tipo,
      num.ptoVenta,
      num.nroComp,
      '80',
      cuitCli.padEnd(20, ' '),
      _fmtC(sub),
      _citiAlicCod(rate),
      _fmtC(iva),
    ].join(';') + ';');
  });

  if (!mode || mode === 'cbte') {
    _citiSaveFile('VENTAS_CBTE_' + ym + '.TXT', cbteLines.join('\r\n'));
    toast('VENTAS_CBTE_' + ym + '.TXT generado (' + cbteLines.length + ' registros)', 'success');
  }
  if (mode === 'alicuota') {
    _citiSaveFile('VENTAS_ALICUOTA_' + ym + '.TXT', alicLines.join('\r\n'));
    toast('VENTAS_ALICUOTA_' + ym + '.TXT generado (' + alicLines.length + ' registros)', 'success');
  }
}

// =====================================================================
// CONCILIADOR DE COMPROBANTES ARCA
// =====================================================================

function livaRenderConciliarTab() {
  return '<div class="card"><div class="card-body">' +
    '<div style="font-size:14px;font-weight:700;margin-bottom:4px">Conciliador de Comprobantes ARCA</div>' +
    '<div style="font-size:12px;color:var(--text-muted);margin-bottom:20px">' +
      'Bajá el listado de comprobantes desde el portal ARCA → Mis Comprobantes → Exportar CSV. ' +
      'Subí el archivo y el sistema compara contra los cargados en el ERP para detectar diferencias, ' +
      'comprobantes apócrifos o facturas sin cargar.' +
    '</div>' +
    '<div class="form-grid form-grid-2" style="margin-bottom:16px">' +
      '<div class="form-group">' +
        '<label class="form-label">Tipo</label>' +
        '<select class="form-control" id="conc-tipo">' +
          '<option value="compras">Comprobantes recibidos (Compras)</option>' +
          '<option value="ventas">Comprobantes emitidos (Ventas)</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Archivo ARCA (.csv / .txt)</label>' +
        '<input type="file" class="form-control" id="conc-file" accept=".csv,.txt,.tsv">' +
      '</div>' +
    '</div>' +
    '<div style="margin-bottom:20px">' +
      '<button class="btn btn-primary" onclick="livaConciliarProcesar()"><i class="fas fa-sync-alt"></i> Procesar y Conciliar</button>' +
    '</div>' +
    '<div style="background:#f8fafc;border:1px solid var(--border);border-radius:6px;padding:10px 14px;font-size:12px;color:#475569;margin-bottom:16px">' +
      '<strong>Cómo funciona el cruce:</strong> se compara CUIT + número de comprobante (fuerte) o CUIT + total (fallback). ' +
      'Los del período visible en el libro se toman como base del ERP. Cambiá el período/empresa en el header para ajustar el scope.' +
    '</div>' +
    '<div id="conc-resultado"></div>' +
  '</div></div>';
}

function _concilNormCuit(c) {
  return (c || '').replace(/[-\s\.\(\)]/g, '').trim();
}

function _concilNormNum(pv, num) {
  var p = (pv || '').replace(/\D/g, '').padStart(5, '0');
  var n = (num || '').replace(/\D/g, '').padStart(8, '0');
  return p + '-' + n;
}

function _parsearArchivoARCA(text) {
  // Detect separator: semicolon or comma (whichever is more frequent in header)
  var lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
                  .map(function(l) { return l.trim(); }).filter(function(l) { return l; });
  if (!lines.length) return [];

  var firstLine = lines[0];
  var sepSemi  = (firstLine.match(/;/g) || []).length;
  var sepComma = (firstLine.match(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g) || []).length;
  var sep = sepSemi >= sepComma ? ';' : ',';

  function splitLine(line) {
    // Handles quoted fields
    var result = []; var cur = ''; var inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === sep && !inQ) { result.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    result.push(cur.trim());
    return result;
  }

  var header = splitLine(lines[0]).map(function(h) { return h.replace(/"/g,'').toLowerCase().trim(); });

  function findCol() {
    var names = Array.prototype.slice.call(arguments);
    for (var ni = 0; ni < names.length; ni++) {
      var n = names[ni];
      for (var hi = 0; hi < header.length; hi++) {
        if (header[hi].includes(n)) return hi;
      }
    }
    return -1;
  }

  var iDate  = findCol('fecha');
  var iTipo  = findCol('tipo de comprobante', 'tipo comp', 'tipo');
  var iPV    = findCol('punto de venta', 'pto. venta', 'pto venta', 'pto.venta');
  var iNum   = findCol('número de comprobante', 'número', 'numero', 'nro comprobante', 'nro. comprobante');
  var iCUIT  = findCol('cuit del emisor', 'cuit emisor', 'cuit del receptor', 'cuit receptor', 'cuit');
  var iNom   = findCol('denominación', 'razon social', 'razón social', 'nombre');
  var iTotal = findCol('imp. total', 'importe total', 'total', 'monto total');
  var iNeto  = findCol('imp. neto gravado', 'neto gravado', 'importe neto', 'neto');
  var iIVA   = findCol('imp. iva', 'importe iva', 'iva');

  var rows = [];
  for (var i = 1; i < lines.length; i++) {
    var cols = splitLine(lines[i]);
    if (cols.length < 2) continue;
    function g(idx) { return idx >= 0 && idx < cols.length ? (cols[idx] || '').replace(/"/g,'').trim() : ''; }

    var pvRaw  = g(iPV);
    var numRaw = g(iNum);
    var cuit   = _concilNormCuit(g(iCUIT));
    var nroCompleto = (pvRaw || numRaw)
      ? (pvRaw ? _concilNormNum(pvRaw, numRaw) : numRaw.replace(/\D/g,'').padStart(8,'0'))
      : '';
    var totalStr = g(iTotal).replace(/\./g,'').replace(',','.');
    var total  = parseFloat(totalStr) || 0;

    rows.push({
      fecha:      g(iDate),
      tipo:       g(iTipo),
      nroCompleto: nroCompleto,
      pv:         pvRaw,
      num:        numRaw,
      cuit:       cuit,
      nombre:     g(iNom),
      total:      total,
      neto:       parseFloat(g(iNeto).replace(/\./g,'').replace(',','.')) || 0,
      iva:        parseFloat(g(iIVA).replace(/\./g,'').replace(',','.')) || 0,
    });
  }
  return rows;
}

function _concilGetERPCompras() {
  var p    = window._libroIvaPeriod;
  var coId = window._livaCompanyFilter || '';
  var supMap = {};
  try { DB.getAll('suppliers').forEach(function(s) { supMap[s.id] = s; }); } catch(e) {}
  return DB.getAll('supplierInvoices').filter(function(si) {
    return _livaInPeriod(si.date, p) && (!coId || si.company_id === coId);
  }).map(function(si) {
    var sup = supMap[si.supplier_id] || {};
    var num = _parseCitiNum(si.number);
    return {
      fecha:       si.date,
      tipo:        si.tipo_comprobante || '',
      nroCompleto: num.ptoVenta + '-' + num.nroComp,
      cuit:        _concilNormCuit(sup.cuit || sup.tax_id || ''),
      nombre:      sup.name || '',
      total:       parseFloat(si.total) || 0,
      _id:         si.id,
      _number:     si.number,
    };
  });
}

function _concilGetERPVentas() {
  var p    = window._libroIvaPeriod;
  var coId = window._livaCompanyFilter || '';
  return DB.getAll('invoices').filter(function(inv) {
    return _livaInPeriod(inv.date, p) && (!coId || inv.company_id === coId);
  }).map(function(inv) {
    var num = _parseCitiNum(inv.number);
    return {
      fecha:       inv.date,
      tipo:        inv.tipo_comprobante || inv.type || '',
      nroCompleto: num.ptoVenta + '-' + num.nroComp,
      cuit:        _concilNormCuit(inv.client_cuit || ''),
      nombre:      inv.client_name || '',
      total:       parseFloat(inv.total) || 0,
      _id:         inv.id,
      _number:     inv.number,
    };
  });
}

function _conciliarRows(arcaRows, erpRows) {
  var matched   = [];
  var soloArca  = [];
  var usedErp   = new Set();

  arcaRows.forEach(function(ar) {
    var matchIdx = -1;

    // 1. Strong: CUIT + nroCompleto exact
    if (ar.cuit && ar.nroCompleto) {
      erpRows.forEach(function(er, i) {
        if (matchIdx >= 0 || usedErp.has(i)) return;
        if (er.cuit === ar.cuit && er.nroCompleto === ar.nroCompleto) matchIdx = i;
      });
    }

    // 2. Fallback: CUIT + total (within $1)
    if (matchIdx < 0 && ar.cuit && ar.total > 0) {
      erpRows.forEach(function(er, i) {
        if (matchIdx >= 0 || usedErp.has(i)) return;
        if (er.cuit === ar.cuit && Math.abs(er.total - ar.total) < 1.01) matchIdx = i;
      });
    }

    if (matchIdx >= 0) {
      usedErp.add(matchIdx);
      matched.push({ arca: ar, erp: erpRows[matchIdx] });
    } else {
      soloArca.push(ar);
    }
  });

  var soloErp = erpRows.filter(function(_, i) { return !usedErp.has(i); });
  return { matched: matched, soloArca: soloArca, soloErp: soloErp };
}

function _concilTable(rows, mode, tipo) {
  if (!rows.length) {
    var msgs = {
      matched:   '¡Todo coincide!',
      solo_arca: 'Todos los comprobantes de ARCA están cargados en el ERP.',
      solo_erp:  'Todos los comprobantes del ERP aparecen en ARCA.',
    };
    return '<div class="empty-state" style="padding:24px"><i class="fas fa-check-circle" style="color:var(--success);opacity:1;font-size:28px;margin-bottom:8px;display:block"></i><p>' + (msgs[mode] || 'Sin registros') + '</p></div>';
  }
  var isArca  = mode === 'matched' || mode === 'solo_arca';
  var isErp   = mode === 'matched' || mode === 'solo_erp';
  var bgHead  = mode === 'solo_arca' ? 'background:#fef2f2' : mode === 'solo_erp' ? 'background:#fffbeb' : '';

  var html = '<div class="table-wrap"><table><thead><tr style="' + bgHead + '">' +
    '<th>Fecha</th><th>CUIT</th><th>Razón Social</th><th>Tipo</th><th>N° Comprobante</th>' +
    '<th style="text-align:right">Total</th>';
  if (mode === 'solo_arca') html += '<th style="color:#dc2626">Estado</th>';
  if (mode === 'solo_erp')  html += '<th style="color:#d97706">Estado</th>';
  html += '</tr></thead><tbody>';

  rows.forEach(function(row) {
    var ar = row.arca || row;
    var er = row.erp  || row;
    var fecha  = ar.fecha  || er.fecha  || '-';
    var cuit   = ar.cuit   || er.cuit   || '-';
    var nombre = ar.nombre || er.nombre || '-';
    var tipo2  = ar.tipo   || er.tipo   || '-';
    var nro    = ar.nroCompleto || er.nroCompleto || (er._number ? er._number : '-');
    var total  = ar.total  || er.total  || 0;

    html += '<tr>' +
      '<td style="white-space:nowrap;font-size:12px">' + escapeHtml(fecha) + '</td>' +
      '<td style="font-size:11px;color:#64748b">' + escapeHtml(cuit) + '</td>' +
      '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(nombre) + '</td>' +
      '<td><span class="badge badge-gray" style="font-size:10px">' + escapeHtml(tipo2) + '</span></td>' +
      '<td style="font-size:12px"><strong>' + escapeHtml(nro) + '</strong></td>' +
      '<td style="text-align:right;font-variant-numeric:tabular-nums"><strong>' + fmtMoney(total) + '</strong></td>';

    if (mode === 'solo_arca') {
      html += '<td><span class="badge badge-red" style="font-size:10px">No cargado en ERP</span></td>';
    } else if (mode === 'solo_erp') {
      html += '<td><span class="badge" style="font-size:10px;background:#fef3c7;color:#b45309">No está en ARCA</span></td>';
    }
    html += '</tr>';
  });

  var totales = rows.reduce(function(s, r) { return s + (r.arca ? r.arca.total : r.total || 0); }, 0);
  html += '<tr class="total-row"><td colspan="5">Total</td><td style="text-align:right">' + fmtMoney(totales) + '</td>';
  if (mode !== 'matched') html += '<td></td>';
  html += '</tr></tbody></table></div>';
  return html;
}

function livaConciliarProcesar() {
  var fileEl = document.getElementById('conc-file');
  var tipo   = document.getElementById('conc-tipo')?.value || 'compras';
  var wrap   = document.getElementById('conc-resultado');

  if (!fileEl || !fileEl.files.length) { toast('Seleccioná el archivo de ARCA primero', 'warning'); return; }
  if (wrap) wrap.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted)"><i class="fas fa-spinner fa-spin fa-2x"></i><div style="margin-top:8px">Procesando…</div></div>';

  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var arcaRows = _parsearArchivoARCA(e.target.result);
      if (!arcaRows.length) {
        if (wrap) wrap.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle" style="color:var(--danger);opacity:1"></i><p>No se pudieron leer registros del archivo.<br><small>Verificá que sea un CSV exportado desde ARCA con encabezados.</small></p></div>';
        return;
      }
      var erpRows = tipo === 'compras' ? _concilGetERPCompras() : _concilGetERPVentas();
      var result  = _conciliarRows(arcaRows, erpRows);
      _renderConciliacion(result, tipo, arcaRows.length, erpRows.length, wrap);
    } catch(err) {
      if (wrap) wrap.innerHTML = '<div class="empty-state"><i class="fas fa-times-circle" style="color:var(--danger);opacity:1"></i><p>Error al procesar el archivo: ' + escapeHtml(err.message) + '</p></div>';
    }
  };
  reader.readAsText(fileEl.files[0]);
}

function _renderConciliacion(r, tipo, arcaTotal, erpTotal, wrap) {
  if (!wrap) wrap = document.getElementById('conc-resultado');
  if (!wrap) return;

  var pct = arcaTotal > 0 ? Math.round(r.matched.length / arcaTotal * 100) : 0;
  var color = pct === 100 ? 'var(--success)' : pct >= 80 ? 'var(--warning)' : 'var(--danger)';

  var summary =
    '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;align-items:stretch">' +
      '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px 20px;text-align:center;flex:1;min-width:110px">' +
        '<div style="font-size:26px;font-weight:800;color:#16a34a">' + r.matched.length + '</div>' +
        '<div style="font-size:12px;font-weight:600;color:#15803d">✅ Coinciden</div>' +
      '</div>' +
      '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:14px 20px;text-align:center;flex:1;min-width:110px">' +
        '<div style="font-size:26px;font-weight:800;color:#dc2626">' + r.soloArca.length + '</div>' +
        '<div style="font-size:12px;font-weight:600;color:#b91c1c">❌ Solo en ARCA</div>' +
        '<div style="font-size:10px;color:var(--text-muted)">sin cargar en ERP</div>' +
      '</div>' +
      '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 20px;text-align:center;flex:1;min-width:110px">' +
        '<div style="font-size:26px;font-weight:800;color:#d97706">' + r.soloErp.length + '</div>' +
        '<div style="font-size:12px;font-weight:600;color:#b45309">⚠️ Solo en ERP</div>' +
        '<div style="font-size:10px;color:var(--text-muted)">emisor no declaró?</div>' +
      '</div>' +
      '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px 20px;text-align:center;flex:1;min-width:110px">' +
        '<div style="font-size:26px;font-weight:800;color:' + color + '">' + pct + '%</div>' +
        '<div style="font-size:12px;font-weight:600;color:var(--text-muted)">Concordancia</div>' +
        '<div style="font-size:10px;color:var(--text-muted)">ARCA: ' + arcaTotal + ' · ERP: ' + erpTotal + '</div>' +
      '</div>' +
    '</div>';

  var tabId = 'conc-res-tabs';
  wrap.innerHTML = summary +
    '<div id="' + tabId + '">' +
      '<div class="tabs">' +
        '<button class="tab-btn" data-tab="cr-matched">✅ Coinciden (' + r.matched.length + ')</button>' +
        '<button class="tab-btn" data-tab="cr-solo-arca">❌ Solo en ARCA (' + r.soloArca.length + ')</button>' +
        '<button class="tab-btn" data-tab="cr-solo-erp">⚠️ Solo en ERP (' + r.soloErp.length + ')</button>' +
      '</div>' +
      '<div id="cr-matched"    class="tab-content">' + _concilTable(r.matched,  'matched',   tipo) + '</div>' +
      '<div id="cr-solo-arca"  class="tab-content">' + _concilTable(r.soloArca, 'solo_arca', tipo) + '</div>' +
      '<div id="cr-solo-erp"   class="tab-content">' + _concilTable(r.soloErp,  'solo_erp',  tipo) + '</div>' +
    '</div>';
  initTabs(tabId);
}
