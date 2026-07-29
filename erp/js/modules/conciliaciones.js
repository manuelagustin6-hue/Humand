/* ===== CONCILIACIONES BANCARIAS ===== */

var _concState = {
  systemRows:        [],   // parsed rows from Lebane system export
  bankRows:          [],   // parsed rows from Galicia FEA bank statement
  result:            null, // { matched, onlyBank, onlySystem }
  systemFileName:    null,
  bankFileName:      null,
  activeTab:         'matched',
  selectedBankIdxs:  {}    // indices of selected "Solo en Banco" rows
};

function renderConciliaciones() {
  _concRenderMain();
}

/* ─── MAIN RENDER ─── */
function _concRenderMain() {
  var hasResult = !!_concState.result;

  document.getElementById('content').innerHTML =
    '<div class="page-header">' +
      '<div>' +
        '<div class="page-title">Conciliaciones Bancarias</div>' +
        '<div class="page-subtitle">Comparación entre movimientos del sistema y extracto bancario</div>' +
      '</div>' +
      '<div class="page-actions" style="flex-wrap:wrap">' +
        (hasResult ? '<button class="btn btn-secondary" onclick="_concReset()"><i class="fas fa-redo"></i> Nueva</button>' : '') +
        (hasResult ? '<button class="btn btn-primary" onclick="_concExport()"><i class="fas fa-download"></i> Exportar CSV</button>' : '') +
      '</div>' +
    '</div>' +

    (!hasResult ? _concUploadHtml() : _concResultHtml());

  if (document.getElementById('breadcrumb')) {
    document.getElementById('breadcrumb').innerHTML =
      '<i class="fas fa-balance-scale"></i><span>Conciliaciones Bancarias</span>';
  }
}

/* ─── UPLOAD VIEW ─── */
function _concUploadHtml() {
  var sysOk  = _concState.systemRows.length > 0;
  var bankOk = _concState.bankRows.length  > 0;

  return '<div style="max-width:900px">' +
    '<div style="padding:14px 18px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:var(--radius);margin-bottom:20px;font-size:13px;color:#1e40af">' +
      '<i class="fas fa-info-circle" style="margin-right:8px"></i>' +
      '<strong>¿Cómo funciona?</strong> Cargá el reporte de movimientos del sistema (Lebane) y el extracto del banco (Galicia FEA en Excel). ' +
      'El sistema cruza automáticamente los movimientos por fecha y monto, identifica coincidencias y partidas sin imputar.' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">' +
      _concDropzoneHtml('system', 'Reporte del Sistema', 'Lebane — movimientos_todos_*.xlsx',
        'fa-database', '#2563eb', _concState.systemFileName, sysOk) +
      _concDropzoneHtml('bank', 'Extracto Bancario', 'Galicia FEA — *.015_*.xlsx',
        'fa-university', '#16a34a', _concState.bankFileName, bankOk) +
    '</div>' +

    (sysOk || bankOk ?
      '<div style="display:flex;gap:20px;padding:10px 0;font-size:13px;margin-bottom:12px">' +
        '<span style="color:' + (sysOk ? '#2563eb' : '#94a3b8') + '">' +
          '<i class="fas ' + (sysOk ? 'fa-check-circle' : 'fa-circle') + '" style="margin-right:4px"></i>' +
          'Sistema: ' + (sysOk ? _concState.systemRows.length + ' movimientos' : 'sin cargar') + '</span>' +
        '<span style="color:' + (bankOk ? '#16a34a' : '#94a3b8') + '">' +
          '<i class="fas ' + (bankOk ? 'fa-check-circle' : 'fa-circle') + '" style="margin-right:4px"></i>' +
          'Banco: ' + (bankOk ? _concState.bankRows.length + ' movimientos' : 'sin cargar') + '</span>' +
      '</div>'
    : '') +

    '<div style="text-align:center;padding:10px 0">' +
      '<button class="btn btn-primary" style="padding:12px 48px;font-size:15px;border-radius:10px" onclick="_concRun()" ' +
        (sysOk && bankOk ? '' : 'disabled style="opacity:.5;cursor:not-allowed;pointer-events:none"') + '>' +
        '<i class="fas fa-balance-scale" style="margin-right:8px"></i>Conciliar' +
      '</button>' +
    '</div>' +
  '</div>';
}

function _concDropzoneHtml(type, title, hint, icon, color, fileName, loaded) {
  var id = 'conc-drop-' + type;
  var borderColor = loaded ? color : '#cbd5e1';
  var bg = loaded ? color + '0d' : '#fff';
  return '<div id="' + id + '" ' +
    'style="border:2px dashed ' + borderColor + ';border-radius:var(--radius);padding:32px 16px;text-align:center;cursor:pointer;transition:all .15s;background:' + bg + '"' +
    ' onclick="document.getElementById(\'conc-file-' + type + '\').click()"' +
    ' ondragover="event.preventDefault();this.style.borderColor=\'' + color + '\';"' +
    ' ondragleave="this.style.borderColor=\'' + borderColor + '\';"' +
    ' ondrop="event.preventDefault();_concDrop(\'' + type + '\',event.dataTransfer.files[0])">' +
    '<input type="file" id="conc-file-' + type + '" accept=".xlsx,.xls" style="display:none" onchange="_concPickFile(\'' + type + '\',this.files[0])">' +
    '<div style="font-size:36px;color:' + (loaded ? color : '#94a3b8') + ';margin-bottom:12px"><i class="fas ' + icon + '"></i></div>' +
    '<div style="font-weight:700;font-size:15px;margin-bottom:6px;color:' + (loaded ? color : 'var(--text)') + '">' + title + '</div>' +
    (loaded
      ? '<div style="font-size:12px;color:' + color + ';font-weight:600"><i class="fas fa-check-circle"></i> ' + escapeHtml(fileName) + '</div>'
      : '<div style="font-size:12px;color:var(--text-muted)">' + hint + '<br><span style="font-size:11px;opacity:.7">Arrastrá o hacé click</span></div>'
    ) +
  '</div>';
}

/* ─── FILE HANDLING ─── */
function _concPickFile(type, file) {
  if (!file) return;
  _concLoadFile(type, file);
}

function _concDrop(type, file) {
  if (!file) return;
  _concLoadFile(type, file);
}

function _concLoadFile(type, file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
      var rows;
      if (type === 'system') {
        rows = _concParseSystem(wb);
        _concState.systemRows = rows;
        _concState.systemFileName = file.name;
        toast('Sistema cargado: ' + rows.length + ' movimientos', 'success');
      } else {
        rows = _concParseBank(wb);
        _concState.bankRows = rows;
        _concState.bankFileName = file.name;
        toast('Banco cargado: ' + rows.length + ' movimientos', 'success');
      }
      _concState.result = null;
      _concRenderMain();
    } catch(err) {
      toast('Error al leer el archivo: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

/* ─── PARSE SYSTEM FILE (Lebane export) ─── */
// Expected columns: Fecha De Pago | Tipo Movimiento | Monto Moneda Extranjera |
//                   Referencia Descripcion | Referencia Cuenta Corriente | Caja Cuenta | Moneda
function _concParseSystem(wb) {
  var sheetName = wb.SheetNames[0];
  var ws = wb.Sheets[sheetName];
  var raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  var rows = [];
  raw.forEach(function(r, idx) {
    // Flexible column detection (handles accent/case variations)
    var dateVal = r['Fecha De Pago'] || r['Fecha de Pago'] || r['fecha_de_pago'] || '';
    var tipoVal = (r['Tipo Movimiento'] || r['Tipo_Movimiento'] || '').toString().toUpperCase().trim();
    var montoVal = parseFloat(r['Monto Moneda Extranjera'] || r['Monto Moneda Local'] || r['Monto_Moneda_Extranjera'] || 0) || 0;
    var descVal  = r['Referencia Descripcion'] || r['Referencia_Descripcion'] || r['Descripcion'] || '';
    var refVal   = r['Referencia Cuenta Corriente'] || r['Referencia_Cuenta_Corriente'] || '';
    var acctVal  = r['Caja Cuenta'] || r['Caja_Cuenta'] || '';
    var moneda   = r['Moneda'] || 'USD';

    if (!dateVal && !montoVal) return; // skip empty rows

    var dateStr = _concNormalizeDate(dateVal);
    var type = tipoVal.includes('EGRESO') ? 'debit' : tipoVal.includes('INGRESO') ? 'credit' : null;
    if (!type && montoVal > 0) type = 'credit'; // fallback

    rows.push({
      _src:    'system',
      _idx:    idx,
      date:    dateStr,
      type:    type,
      amount:  Math.abs(montoVal),
      desc:    String(descVal),
      ref:     String(refVal),
      account: String(acctVal),
      currency: String(moneda),
      raw:     r
    });
  });
  return rows;
}

/* ─── PARSE BANK FILE (Galicia FEA) ─── */
// Expected columns: Fecha | Débitos | Créditos | Descripción | Concepto | Saldo
function _concParseBank(wb) {
  // Try sheet named "Movimientos" first, otherwise use first sheet
  var sheetName = wb.SheetNames.find(function(n) { return n.toLowerCase().includes('mov'); }) || wb.SheetNames[0];
  var ws = wb.Sheets[sheetName];
  var raw = XLSX.utils.sheet_to_json(ws, { defval: '', cellDates: true });
  var rows = [];
  raw.forEach(function(r, idx) {
    var dateVal    = r['Fecha'] || r['fecha'] || '';
    var debitoVal  = parseFloat(r['Débitos'] || r['Debitos'] || r['DÉBITOS'] || 0) || 0;
    var creditoVal = parseFloat(r['Créditos'] || r['Creditos'] || r['CRÉDITOS'] || 0) || 0;
    var descVal    = r['Descripción'] || r['Descripcion'] || r['DESCRIPCIÓN'] || '';
    var conceptoVal= r['Concepto'] || '';
    var saldoVal   = parseFloat(r['Saldo'] || 0) || 0;

    if (!dateVal && !debitoVal && !creditoVal) return; // skip blank rows

    var dateStr = _concNormalizeDate(dateVal);
    var type, amount;
    if (debitoVal > 0) {
      type = 'debit'; amount = debitoVal;
    } else if (creditoVal > 0) {
      type = 'credit'; amount = creditoVal;
    } else {
      return; // no amount, skip
    }

    rows.push({
      _src:    'bank',
      _idx:    idx,
      date:    dateStr,
      type:    type,
      amount:  amount,
      desc:    String(descVal),
      concepto: String(conceptoVal),
      saldo:   saldoVal,
      raw:     r
    });
  });
  return rows;
}

/* ─── DATE NORMALIZATION ─── */
function _concNormalizeDate(val) {
  if (!val) return '';
  // Already a Date object (SheetJS cellDates)
  if (val instanceof Date) {
    var y = val.getFullYear();
    var m = String(val.getMonth() + 1).padStart(2, '0');
    var d = String(val.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  var s = String(val).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    var pts = s.split('/');
    return pts[2].substring(0,4) + '-' + pts[1] + '-' + pts[0];
  }
  // Excel serial number
  var n = parseFloat(s);
  if (!isNaN(n) && n > 40000) {
    var d2 = new Date((n - 25569) * 86400 * 1000);
    return d2.getFullYear() + '-' + String(d2.getMonth()+1).padStart(2,'0') + '-' + String(d2.getDate()).padStart(2,'0');
  }
  return s.substring(0, 10);
}

/* ─── FEE GROUPING (Argentine bank taxes) ─── */
// Lines matching these keywords are bank fees/taxes that belong to the
// preceding main transaction on the same date (Galicia FEA format).
var _CONC_FEE_KW = [
  'imp. deb', 'imp deb', 'imp.deb', 'impuesto deb',
  'imp. cre', 'imp cre', 'imp.cre', 'impuesto cre',
  ' iva', '^iva',
  'comision', 'comisión', 'comis.',
  'sellado'
];

function _concIsFee(row) {
  var text = ((row.desc || '') + ' ' + (row.concepto || '')).toLowerCase();
  return _CONC_FEE_KW.some(function(k) {
    return k.charAt(0) === '^' ? text.indexOf(k.slice(1)) === 0 : text.indexOf(k) !== -1;
  });
}

// Groups fee lines with the preceding main transaction on the same date.
// Returns a new array of rows where each main row has:
//   _fees: [feeRow, ...]   (bundled fee rows)
//   _grossAmount: number   (amount + sum of fees — used for matching)
function _concGroupBankFees(rows) {
  var result = [];
  var lastMain = null;

  rows.forEach(function(row) {
    if (_concIsFee(row)) {
      if (lastMain && lastMain.date === row.date) {
        lastMain._fees.push(row);
        lastMain._feeTotal += row.amount;
        lastMain._grossAmount += row.amount;
      } else {
        // No parent on this date — keep standalone, mark as fee
        var standalone = Object.assign({}, row, { _isFee: true, _fees: [], _feeTotal: 0, _grossAmount: row.amount });
        result.push(standalone);
      }
    } else {
      var grouped = Object.assign({}, row, { _fees: [], _feeTotal: 0, _grossAmount: row.amount });
      result.push(grouped);
      lastMain = grouped;
    }
  });

  return result;
}

/* ─── RECONCILIATION ALGORITHM ─── */
function _concRun() {
  var sys  = _concState.systemRows.slice();
  // Group bank fee lines with their parent transaction before matching
  var bank = _concGroupBankFees(_concState.bankRows.slice());

  var matched   = [];
  var usedSys   = {};
  var usedBank  = {};

  // Pass 1 — exact date + type + gross amount (tolerance 0.01)
  bank.forEach(function(bRow, bi) {
    if (bRow._isFee) return; // standalone fees skip main matching passes
    var bAmt = bRow._grossAmount;
    for (var si = 0; si < sys.length; si++) {
      if (usedSys[si]) continue;
      var sRow = sys[si];
      if (sRow.type !== bRow.type) continue;
      if (sRow.date !== bRow.date) continue;
      if (Math.abs(sRow.amount - bAmt) > 0.01) continue;
      matched.push({ system: sRow, bank: bRow, matchType: 'exact' });
      usedSys[si] = true;
      usedBank[bi] = true;
      break;
    }
  });

  // Pass 2 — fuzzy ±1 day, same type, gross amount
  bank.forEach(function(bRow, bi) {
    if (usedBank[bi] || bRow._isFee) return;
    var bAmt = bRow._grossAmount;
    for (var si = 0; si < sys.length; si++) {
      if (usedSys[si]) continue;
      var sRow = sys[si];
      if (sRow.type !== bRow.type) continue;
      if (Math.abs(sRow.amount - bAmt) > 0.01) continue;
      if (!_concDateWithin(sRow.date, bRow.date, 1)) continue;
      matched.push({ system: sRow, bank: bRow, matchType: 'fuzzy' });
      usedSys[si] = true;
      usedBank[bi] = true;
      break;
    }
  });

  // Pass 3 — net amount fallback (match without fees, for systems that record net)
  bank.forEach(function(bRow, bi) {
    if (usedBank[bi] || bRow._isFee) return;
    for (var si = 0; si < sys.length; si++) {
      if (usedSys[si]) continue;
      var sRow = sys[si];
      if (sRow.type !== bRow.type) continue;
      if (Math.abs(sRow.amount - bRow.amount) > 0.01) continue;
      if (!_concDateWithin(sRow.date, bRow.date, 1)) continue;
      matched.push({ system: sRow, bank: bRow, matchType: 'net' });
      usedSys[si] = true;
      usedBank[bi] = true;
      break;
    }
  });

  var onlyBank   = bank.filter(function(_, i) { return !usedBank[i]; });
  var onlySystem = sys.filter(function(_, i)  { return !usedSys[i]; });

  _concState.result = { matched: matched, onlyBank: onlyBank, onlySystem: onlySystem };
  _concState.activeTab = 'matched';
  _concRenderMain();
}

function _concDateWithin(dateA, dateB, days) {
  if (!dateA || !dateB) return false;
  var a = new Date(dateA + 'T00:00:00');
  var b = new Date(dateB + 'T00:00:00');
  return Math.abs(a - b) <= days * 86400000;
}

/* ─── RESULT VIEW ─── */
function _concResultHtml() {
  var r = _concState.result;
  var totalMatched  = r.matched.length;
  var totalBank     = r.onlyBank.length;
  var totalSystem   = r.onlySystem.length;

  var matchedAmt  = r.matched.reduce(function(s, m) { return s + m.bank._grossAmount; }, 0);
  var bankAmt     = r.onlyBank.reduce(function(s, m) { return s + (m._grossAmount || m.amount); }, 0);
  var systemAmt   = r.onlySystem.reduce(function(s, m) { return s + m.amount; }, 0);

  var exactCount  = r.matched.filter(function(m) { return m.matchType === 'exact'; }).length;
  var fuzzyCount  = r.matched.filter(function(m) { return m.matchType === 'fuzzy'; }).length;
  var netCount    = r.matched.filter(function(m) { return m.matchType === 'net'; }).length;
  var groupedCount = r.matched.filter(function(m) { return m.bank._fees && m.bank._fees.length > 0; }).length;

  var tab = _concState.activeTab;

  return '<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">' +
    '<div class="stat-card" style="cursor:pointer;border:2px solid ' + (tab==='matched'?'#22c55e':'transparent') + '" onclick="_concSetTab(\'matched\')">' +
      '<div class="stat-icon green"><i class="fas fa-check-double"></i></div>' +
      '<div><div class="stat-value">' + totalMatched + '</div>' +
      '<div class="stat-label">Conciliados</div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + fmtMoney(matchedAmt) + '</div>' +
    '</div></div>' +

    '<div class="stat-card" style="cursor:pointer;border:2px solid ' + (tab==='bank'?'#f59e0b':'transparent') + '" onclick="_concSetTab(\'bank\')">' +
      '<div class="stat-icon yellow"><i class="fas fa-university"></i></div>' +
      '<div><div class="stat-value">' + totalBank + '</div>' +
      '<div class="stat-label">Solo en Banco</div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + fmtMoney(bankAmt) + '</div>' +
    '</div></div>' +

    '<div class="stat-card" style="cursor:pointer;border:2px solid ' + (tab==='system'?'#ef4444':'transparent') + '" onclick="_concSetTab(\'system\')">' +
      '<div class="stat-icon red"><i class="fas fa-database"></i></div>' +
      '<div><div class="stat-value">' + totalSystem + '</div>' +
      '<div class="stat-label">Solo en Sistema</div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + fmtMoney(systemAmt) + '</div>' +
    '</div></div>' +
  '</div>' +

  // Info notices
  (groupedCount > 0 ?
    '<div style="padding:10px 14px;background:#f5f3ff;border:1px solid #c4b5fd;border-radius:var(--radius);margin-bottom:8px;font-size:12px;color:#5b21b6">' +
      '<i class="fas fa-layer-group" style="margin-right:6px"></i>' +
      '<strong>' + groupedCount + ' movimiento' + (groupedCount>1?'s':'') + ' agrupado' + (groupedCount>1?'s':'') + ' con impuestos bancarios.</strong> ' +
      'Los importes de Imp. Deb./Cre. e IVA fueron sumados al movimiento principal para la comparación.' +
    '</div>'
  : '') +
  (fuzzyCount > 0 ?
    '<div style="padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:var(--radius);margin-bottom:8px;font-size:12px;color:#92400e">' +
      '<i class="fas fa-exclamation-triangle" style="margin-right:6px"></i>' +
      '<strong>' + fuzzyCount + ' movimiento' + (fuzzyCount>1?'s':'') + ' conciliado' + (fuzzyCount>1?'s':'') + ' con diferencia de fecha (±1 día).</strong> ' +
      'Verificá que correspondan al mismo movimiento.' +
    '</div>'
  : '') +
  (netCount > 0 ?
    '<div style="padding:10px 14px;background:#ede9fe;border:1px solid #c4b5fd;border-radius:var(--radius);margin-bottom:8px;font-size:12px;color:#5b21b6">' +
      '<i class="fas fa-info-circle" style="margin-right:6px"></i>' +
      '<strong>' + netCount + ' movimiento' + (netCount>1?'s':'') + ' conciliado' + (netCount>1?'s':'') + ' por monto neto</strong> (sin impuestos).' +
    '</div>'
  : '') +

  // Tab content
  '<div class="card">' +
    '<div class="card-body" style="padding:0">' +
      '<div id="conc-tab-content">' + _concTabContent(tab) + '</div>' +
    '</div>' +
  '</div>';
}

function _concSetTab(tab) {
  _concState.activeTab = tab;
  var el = document.getElementById('conc-tab-content');
  if (el) el.innerHTML = _concTabContent(tab);
}

function _concTabContent(tab) {
  if (!_concState || !_concState.result) return '';
  var r = _concState.result;
  if (tab === 'matched')  return _concMatchedTable(r.matched);
  if (tab === 'bank')     return _concBankOnlyTable(r.onlyBank);
  if (tab === 'system')   return _concSystemOnlyTable(r.onlySystem);
  return '';
}

/* ─── MATCHED TABLE ─── */
function _concMatchedTable(matched) {
  var header =
    '<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">' +
      '<i class="fas fa-check-double" style="color:#22c55e"></i>' +
      '<strong style="font-size:13px">Movimientos Conciliados (' + matched.length + ')</strong>' +
    '</div>';

  if (!matched.length) return header +
    '<div class="empty-state" style="padding:48px 16px"><i class="fas fa-check-circle"></i><p>No se encontraron coincidencias.</p></div>';

  var rows = matched.map(function(m) {
    var isFuzzy = m.matchType === 'fuzzy';
    var isNet   = m.matchType === 'net';
    var typeColor = m.system.type === 'debit' ? '#ef4444' : '#22c55e';
    var typeLabel = m.system.type === 'debit' ? 'Egreso' : 'Ingreso';
    var hasFees = m.bank._fees && m.bank._fees.length > 0;
    var feeHtml = hasFees
      ? '<div style="font-size:10px;color:#7c3aed;margin-top:2px" title="' +
          m.bank._fees.map(function(f){ return escapeHtml(f.desc) + ': ' + fmtMoney(f.amount); }).join(' | ') + '">' +
          '<i class="fas fa-layer-group" style="margin-right:3px"></i>' +
          m.bank._fees.length + ' imp. agrupado' + (m.bank._fees.length > 1 ? 's' : '') +
          ' (' + fmtMoney(m.bank._feeTotal) + ')' +
        '</div>'
      : '';
    var matchBg  = isFuzzy ? '#fffbeb' : isNet ? '#f5f3ff' : '';
    var badgeBg  = isFuzzy ? '#fef3c7' : isNet ? '#ede9fe' : '#f0fdf4';
    var badgeClr = isFuzzy ? '#92400e' : isNet ? '#5b21b6' : '#166534';
    var badgeTxt = isFuzzy ? '±1 día' : isNet ? 'Neto' : 'Exacto';
    return '<tr style="background:' + matchBg + '">' +
      '<td style="font-size:12px;font-weight:600">' + fmtDate(m.system.date) +
        (m.bank.date !== m.system.date ? '<div style="font-size:10px;color:#f59e0b">Banco: ' + fmtDate(m.bank.date) + '</div>' : '') +
      '</td>' +
      '<td><span style="font-size:11px;font-weight:700;color:' + typeColor + '">' + typeLabel + '</span></td>' +
      '<td style="font-weight:700;text-align:right">' + fmtMoney(m.system.amount) +
        (hasFees ? '<div style="font-size:10px;color:var(--text-muted)">Banco: ' + fmtMoney(m.bank._grossAmount) + '</div>' : '') +
      '</td>' +
      '<td style="font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(m.system.desc) + '">' + escapeHtml(m.system.desc || '—') + '</td>' +
      '<td style="font-size:12px;color:var(--text-muted);max-width:180px">' +
        '<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(m.bank.desc) + '">' + escapeHtml(m.bank.desc || '—') + '</div>' +
        feeHtml +
      '</td>' +
      '<td style="text-align:center">' +
        '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:' + badgeBg + ';color:' + badgeClr + '">' +
          badgeTxt +
        '</span>' +
      '</td>' +
    '</tr>';
  }).join('');

  return header +
    '<div class="table-wrap"><table>' +
      '<thead><tr>' +
        '<th>Fecha Sist.</th><th>Tipo</th><th style="text-align:right">Monto</th>' +
        '<th>Descripción Sistema</th><th>Descripción Banco</th><th style="text-align:center">Match</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table></div>';
}

/* ─── BANK ONLY TABLE (with checkbox selection + inline registration) ─── */
function _concBankOnlyTable(rows) {
  var header =
    '<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
      '<div style="display:flex;align-items:center;gap:10px">' +
        '<i class="fas fa-university" style="color:#f59e0b"></i>' +
        '<strong style="font-size:13px">Solo en Banco — Sin imputar en sistema (' + rows.length + ')</strong>' +
      '</div>' +
      (rows.length ? '<div id="conc-sel-bar" style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--text-muted)">' +
        '<span id="conc-sel-count">0 seleccionados</span>' +
        '<button id="conc-reg-btn" class="btn btn-sm btn-primary" style="display:none" onclick="_concRegisterSelected()">' +
          '<i class="fas fa-plus-circle"></i> Registrar en sistema' +
        '</button>' +
      '</div>' : '') +
    '</div>';

  if (!rows.length) return header +
    '<div class="empty-state" style="padding:48px 16px"><i class="fas fa-check-circle"></i><p>Todos los movimientos bancarios están registrados en el sistema.</p></div>';

  var total = rows.reduce(function(s, r) { return s + r.amount; }, 0);

  var tRows = rows.map(function(r, i) {
    var typeColor = r.type === 'debit' ? '#ef4444' : '#22c55e';
    var typeLabel = r.type === 'debit' ? 'Débito' : 'Crédito';
    var isChecked = !!_concState.selectedBankIdxs[i];
    return '<tr id="conc-bank-row-' + i + '" style="background:' + (isChecked ? '#eff6ff' : '') + '">' +
      '<td style="padding:8px 12px;width:36px;text-align:center">' +
        '<input type="checkbox" ' + (isChecked ? 'checked' : '') + ' onchange="_concToggleSelect(' + i + ',this.checked)" style="cursor:pointer;width:15px;height:15px">' +
      '</td>' +
      '<td style="font-size:12px;font-weight:600">' + fmtDate(r.date) + '</td>' +
      '<td><span style="font-size:11px;font-weight:700;color:' + typeColor + '">' + typeLabel + '</span></td>' +
      '<td style="font-weight:700;text-align:right;color:' + typeColor + ';font-variant-numeric:tabular-nums">' + fmtMoney(r.amount) + '</td>' +
      '<td style="font-size:12px">' + escapeHtml(r.desc || '—') + '</td>' +
      '<td style="font-size:11px;color:var(--text-muted)">' + escapeHtml(r.concepto || '—') + '</td>' +
      '<td style="font-size:12px;text-align:right;color:var(--text-muted);font-variant-numeric:tabular-nums">' + (r.saldo ? fmtMoney(r.saldo) : '—') + '</td>' +
    '</tr>';
  }).join('');

  return header +
    '<div class="table-wrap"><table>' +
      '<thead><tr>' +
        '<th style="width:36px;text-align:center"><input type="checkbox" title="Seleccionar todos" onchange="_concSelectAll(this.checked)" style="cursor:pointer;width:15px;height:15px"></th>' +
        '<th>Fecha</th><th>Tipo</th><th style="text-align:right">Monto</th>' +
        '<th>Descripción</th><th>Concepto</th><th style="text-align:right">Saldo</th>' +
      '</tr></thead>' +
      '<tbody>' + tRows + '</tbody>' +
      '<tfoot><tr style="background:var(--bg);border-top:2px solid var(--border)">' +
        '<td colspan="3" style="font-weight:700;padding:10px 12px">TOTAL</td>' +
        '<td style="font-weight:800;text-align:right;padding:10px 12px;color:var(--primary);font-variant-numeric:tabular-nums">' + fmtMoney(total) + '</td>' +
        '<td colspan="3"></td>' +
      '</tr></tfoot>' +
    '</table></div>';
}

function _concToggleSelect(idx, checked) {
  _concState.selectedBankIdxs[idx] = checked;
  var row = document.getElementById('conc-bank-row-' + idx);
  if (row) row.style.background = checked ? '#eff6ff' : '';
  _concUpdateSelBar();
}

function _concSelectAll(checked) {
  var r = _concState.result;
  if (!r) return;
  _concState.selectedBankIdxs = {};
  if (checked) {
    r.onlyBank.forEach(function(_, i) { _concState.selectedBankIdxs[i] = true; });
  }
  // Re-render the tab to sync checkboxes
  var el = document.getElementById('conc-tab-content');
  if (el) el.innerHTML = _concTabContent('bank');
}

function _concUpdateSelBar() {
  var idxs = Object.keys(_concState.selectedBankIdxs).filter(function(k) { return _concState.selectedBankIdxs[k]; });
  var count = idxs.length;
  var countEl = document.getElementById('conc-sel-count');
  var btnEl   = document.getElementById('conc-reg-btn');
  if (!countEl) return;
  if (count === 0) {
    countEl.textContent = '0 seleccionados';
    if (btnEl) btnEl.style.display = 'none';
  } else {
    var r = _concState.result;
    var total = idxs.reduce(function(s, k) {
      var row = r && r.onlyBank[parseInt(k)];
      return s + (row ? (row._grossAmount || row.amount) : 0);
    }, 0);
    countEl.textContent = count + ' seleccionado' + (count > 1 ? 's' : '') + ' · ' + fmtMoney(total);
    countEl.style.color = 'var(--primary)';
    countEl.style.fontWeight = '600';
    if (btnEl) btnEl.style.display = 'inline-flex';
  }
}

function _concRegisterSelected() {
  var r = _concState.result;
  if (!r) return;
  var idxs = Object.keys(_concState.selectedBankIdxs).filter(function(k) { return _concState.selectedBankIdxs[k]; }).map(Number);
  if (!idxs.length) { toast('Seleccioná al menos un movimiento', 'error'); return; }

  var selectedRows = idxs.map(function(i) { return r.onlyBank[i]; }).filter(Boolean);
  var totalAmt  = selectedRows.reduce(function(s, row) { return s + (row._grossAmount || row.amount); }, 0);
  var autoDesc  = selectedRows.length === 1
    ? (selectedRows[0].desc || selectedRows[0].concepto || '')
    : selectedRows.length + ' movimientos bancarios';
  var autoDate  = selectedRows[0].date || todayStr();
  // If all same type use that, else 'debit'
  var allTypes  = selectedRows.map(function(row) { return row.type; });
  var autoType  = allTypes.every(function(t) { return t === allTypes[0]; }) ? allTypes[0] : 'debit';

  var accounts = DB.getAll('bankAccounts');
  var accOpts = accounts.map(function(a) {
    return '<option value="' + a.id + '">' + escapeHtml(a.name) + '</option>';
  }).join('');

  var detailRows = selectedRows.map(function(row, i) {
    var typeColor = row.type === 'debit' ? '#ef4444' : '#22c55e';
    var typeLabel = row.type === 'debit' ? 'Débito' : 'Crédito';
    return '<tr>' +
      '<td style="font-size:12px">' + fmtDate(row.date) + '</td>' +
      '<td><span style="font-size:11px;font-weight:700;color:' + typeColor + '">' + typeLabel + '</span></td>' +
      '<td style="font-variant-numeric:tabular-nums;text-align:right;font-weight:600;color:' + typeColor + '">' + fmtMoney(row._grossAmount || row.amount) + '</td>' +
      '<td style="font-size:11px">' + escapeHtml(row.desc || row.concepto || '—') + '</td>' +
    '</tr>';
  }).join('');

  openModal('Registrar Movimientos en Sistema', `
<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:13px">
  <i class="fas fa-info-circle" style="color:#2563eb;margin-right:6px"></i>
  Registrá los movimientos seleccionados como movimientos bancarios en el sistema para que aparezcan en la próxima conciliación.
</div>

<div style="margin-bottom:14px">
  <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Movimientos seleccionados</div>
  <div class="table-wrap">
    <table style="font-size:12px">
      <thead><tr><th>Fecha</th><th>Tipo</th><th style="text-align:right">Monto</th><th>Descripción</th></tr></thead>
      <tbody>${detailRows}</tbody>
      <tfoot><tr style="background:var(--bg);font-weight:700">
        <td colspan="2" style="padding:8px 12px">TOTAL</td>
        <td style="padding:8px 12px;text-align:right;color:var(--primary);font-variant-numeric:tabular-nums">${fmtMoney(totalAmt)}</td>
        <td></td>
      </tr></tfoot>
    </table>
  </div>
</div>

<div class="divider"></div>
<div class="form-grid form-grid-2">
  <div class="form-group full">
    <label class="form-label">Cuenta Bancaria *</label>
    <select class="form-control" id="conc-reg-account">
      <option value="">Seleccionar cuenta...</option>
      ${accOpts}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Fecha</label>
    <input class="form-control" id="conc-reg-date" type="date" value="${autoDate}">
  </div>
  <div class="form-group">
    <label class="form-label">Tipo</label>
    <select class="form-control" id="conc-reg-type">
      <option value="debit" ${autoType==='debit'?'selected':''}>Egreso / Débito</option>
      <option value="credit" ${autoType==='credit'?'selected':''}>Ingreso / Crédito</option>
    </select>
  </div>
  <div class="form-group full">
    <label class="form-label">Concepto</label>
    <input class="form-control" id="conc-reg-concept" value="${escapeHtml(autoDesc)}" placeholder="Descripción del movimiento">
  </div>
  <div class="form-group">
    <label class="form-label">Importe total</label>
    <input class="form-control" style="font-variant-numeric:tabular-nums;font-weight:700" readonly value="${fmtMoney(totalAmt)}">
  </div>
  <div class="form-group">
    <label class="form-label">Registrar como</label>
    <select class="form-control" id="conc-reg-mode">
      <option value="single">Un solo movimiento</option>
      <option value="each">Un movimiento por cada ítem</option>
    </select>
  </div>
</div>
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
<button class="btn btn-primary" onclick="_concSaveMovements()"><i class="fas fa-save"></i> Registrar</button>
`);

  // Store selected rows for saving
  window._concPendingRows = selectedRows;
  window._concPendingTotal = totalAmt;
}

function _concSaveMovements() {
  var accountId = (document.getElementById('conc-reg-account') || {}).value;
  var date      = (document.getElementById('conc-reg-date') || {}).value || todayStr();
  var type      = (document.getElementById('conc-reg-type') || {}).value || 'debit';
  var concept   = ((document.getElementById('conc-reg-concept') || {}).value || '').trim();
  var mode      = (document.getElementById('conc-reg-mode') || {}).value || 'single';

  if (!accountId) { toast('Seleccioná una cuenta bancaria', 'error'); return; }
  if (!concept)   { toast('El concepto es obligatorio', 'error'); return; }

  var rows = window._concPendingRows || [];
  if (!rows.length) { closeModal(); return; }

  if (mode === 'single') {
    var total = window._concPendingTotal || rows.reduce(function(s, r) { return s + (r._grossAmount || r.amount); }, 0);
    DB.insert('treasuryTx', {
      account_id: accountId,
      date: date,
      type: type,
      amount: total,
      concept: concept,
      reference: 'Banco (conciliación)',
    });
    toast('Movimiento registrado correctamente', 'success');
  } else {
    rows.forEach(function(row) {
      DB.insert('treasuryTx', {
        account_id: accountId,
        date: row.date || date,
        type: row.type || type,
        amount: row._grossAmount || row.amount,
        concept: concept + (row.desc ? ' — ' + row.desc : ''),
        reference: 'Banco (conciliación)',
      });
    });
    toast(rows.length + ' movimiento' + (rows.length > 1 ? 's' : '') + ' registrado' + (rows.length > 1 ? 's' : ''), 'success');
  }

  // Clear selection
  _concState.selectedBankIdxs = {};
  window._concPendingRows = [];
  closeModal();

  // Refresh the bank-only tab
  var el = document.getElementById('conc-tab-content');
  if (el) el.innerHTML = _concTabContent('bank');
}

/* ─── SYSTEM ONLY TABLE ─── */
function _concSystemOnlyTable(rows) {
  var header =
    '<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">' +
      '<i class="fas fa-database" style="color:#ef4444"></i>' +
      '<strong style="font-size:13px">Solo en Sistema — Sin reflejo en banco (' + rows.length + ')</strong>' +
    '</div>';

  if (!rows.length) return header +
    '<div class="empty-state" style="padding:48px 16px"><i class="fas fa-check-circle"></i><p>Todos los movimientos del sistema tienen reflejo en el banco.</p></div>';

  var total = rows.reduce(function(s, r) { return s + r.amount; }, 0);

  var tRows = rows.map(function(r) {
    var typeColor = r.type === 'debit' ? '#ef4444' : '#22c55e';
    var typeLabel = r.type === 'debit' ? 'Egreso' : 'Ingreso';
    return '<tr>' +
      '<td style="font-size:12px;font-weight:600">' + fmtDate(r.date) + '</td>' +
      '<td><span style="font-size:11px;font-weight:700;color:' + typeColor + '">' + typeLabel + '</span></td>' +
      '<td style="font-weight:700;text-align:right;color:' + typeColor + '">' + fmtMoney(r.amount) + '</td>' +
      '<td style="font-size:12px">' + escapeHtml(r.desc || '—') + '</td>' +
      '<td style="font-size:12px;color:var(--text-muted)">' + escapeHtml(r.ref || '—') + '</td>' +
      '<td style="font-size:11px;color:var(--text-muted)">' + escapeHtml(r.account || '—') + '</td>' +
    '</tr>';
  }).join('');

  return header +
    '<div class="table-wrap"><table>' +
      '<thead><tr>' +
        '<th>Fecha</th><th>Tipo</th><th style="text-align:right">Monto</th>' +
        '<th>Descripción</th><th>Referencia</th><th>Cuenta</th>' +
      '</tr></thead>' +
      '<tbody>' + tRows + '</tbody>' +
      '<tfoot><tr style="background:var(--bg);border-top:2px solid var(--border)">' +
        '<td colspan="2" style="font-weight:700;padding:10px 12px">TOTAL</td>' +
        '<td style="font-weight:800;text-align:right;padding:10px 12px;color:var(--primary)">' + fmtMoney(total) + '</td>' +
        '<td colspan="3"></td>' +
      '</tr></tfoot>' +
    '</table></div>';
}

/* ─── RESET ─── */
function _concReset() {
  _concState.systemRows = [];
  _concState.bankRows = [];
  _concState.result = null;
  _concState.systemFileName = null;
  _concState.bankFileName = null;
  _concRenderMain();
}

/* ─── CSV EXPORT ─── */
function _concExport() {
  var r = _concState.result;
  if (!r) return;
  var lines = [];

  lines.push('SECCION,FECHA SISTEMA,FECHA BANCO,TIPO,MONTO,DESC SISTEMA,DESC BANCO,MATCH');
  r.matched.forEach(function(m) {
    lines.push([
      'CONCILIADO',
      m.system.date, m.bank.date,
      m.system.type === 'debit' ? 'Egreso/Débito' : 'Ingreso/Crédito',
      m.system.amount.toFixed(2),
      '"' + m.system.desc.replace(/"/g,'""') + '"',
      '"' + m.bank.desc.replace(/"/g,'""') + '"',
      m.matchType === 'fuzzy' ? 'Fecha ±1d' : 'Exacto'
    ].join(','));
  });

  lines.push('');
  lines.push('SECCION,FECHA,TIPO,MONTO,DESCRIPCION,CONCEPTO,SALDO');
  r.onlyBank.forEach(function(row) {
    lines.push([
      'SOLO BANCO',
      row.date,
      row.type === 'debit' ? 'Débito' : 'Crédito',
      row.amount.toFixed(2),
      '"' + row.desc.replace(/"/g,'""') + '"',
      '"' + (row.concepto||'').replace(/"/g,'""') + '"',
      row.saldo.toFixed(2)
    ].join(','));
  });

  lines.push('');
  lines.push('SECCION,FECHA,TIPO,MONTO,DESCRIPCION,REFERENCIA,CUENTA');
  r.onlySystem.forEach(function(row) {
    lines.push([
      'SOLO SISTEMA',
      row.date,
      row.type === 'debit' ? 'Egreso' : 'Ingreso',
      row.amount.toFixed(2),
      '"' + row.desc.replace(/"/g,'""') + '"',
      '"' + (row.ref||'').replace(/"/g,'""') + '"',
      '"' + (row.account||'').replace(/"/g,'""') + '"'
    ].join(','));
  });

  var csv = lines.join('\n');
  var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'conciliacion-' + todayStr() + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Exportado correctamente', 'success');
}
