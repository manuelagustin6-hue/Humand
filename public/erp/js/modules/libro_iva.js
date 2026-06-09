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
function renderLibroIVA() {
  const p   = window._libroIvaPeriod;
  const sis = _livaGetCompras(p);
  const invs= _livaGetVentas(p);

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
  <div class="page-actions" style="align-items:center;gap:8px">
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
  </div>
  <div id="tab-iva-compras" class="tab-content">${livaRenderComprasTab(sis)}</div>
  <div id="tab-iva-ventas"  class="tab-content">${livaRenderVentasTab(invs)}</div>
  <div id="tab-iva-ddjj"   class="tab-content">${livaRenderDDJJTab(sis, invs)}</div>
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

function _livaGetCompras(p) {
  const suppliers = DB.getAll('suppliers');
  const supMap    = {};
  suppliers.forEach(s => { supMap[s.id] = s; });

  const rows = [];

  // Facturas proveedor — solo comprobantes AFIP (A/B/C/M o sin tipo = legacy)
  DB.getAll('supplierInvoices').filter(si => _livaInPeriod(si.date, p) && _livaIsAfipDoc(si.tipo_comprobante)).forEach(si => {
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

function _livaGetVentas(p) {
  const rows = [];

  // Facturas emitidas — solo comprobantes AFIP (A/B/C/M o sin tipo = legacy)
  DB.getAll('invoices').filter(inv => _livaInPeriod(inv.date, p) && _livaIsAfipDoc(inv.tipo_comprobante || inv.type)).forEach(inv => {
    rows.push(_livaVentasRow(inv, 'FAC'));
  });

  DB.getAll('notasCreditoDebito').filter(n => (n.type==='nc_emi'||n.type==='nd_emi') && _livaInPeriod(n.date, p) && n.status==='confirmed').forEach(n => {
    rows.push(_livaVentasRow(n, n.type==='nc_emi'?'NC':'ND'));
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
