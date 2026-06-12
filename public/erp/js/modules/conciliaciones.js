/* ===== CONCILIACIONES BANCARIAS ===== */

var _concState = {
  systemRows:     [],   // parsed rows from Lebane system export
  bankRows:       [],   // parsed rows from Galicia FEA bank statement
  result:         null, // { matched, onlyBank, onlySystem }
  systemFileName: null,
  bankFileName:   null,
  activeTab:      'matched'
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
      ? '<div style="font-size:12px;color:' + color + ';font-weight:600"><i class="fas fa-check-circle"></i> ' + esc(fileName) + '</div>'
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

/* ─── RECONCILIATION ALGORITHM ─── */
function _concRun() {
  var sys  = _concState.systemRows.slice();
  var bank = _concState.bankRows.slice();

  var matched   = [];
  var usedSys   = {};
  var usedBank  = {};

  // Pass 1 — exact date + type + amount (tolerance 0.01)
  bank.forEach(function(bRow, bi) {
    for (var si = 0; si < sys.length; si++) {
      if (usedSys[si]) continue;
      var sRow = sys[si];
      if (sRow.type !== bRow.type) continue;
      if (sRow.date !== bRow.date) continue;
      if (Math.abs(sRow.amount - bRow.amount) > 0.01) continue;
      // Match found
      matched.push({ system: sRow, bank: bRow, matchType: 'exact' });
      usedSys[si] = true;
      usedBank[bi] = true;
      break;
    }
  });

  // Pass 2 — fuzzy: ±1 day, same type, same amount
  bank.forEach(function(bRow, bi) {
    if (usedBank[bi]) return;
    for (var si = 0; si < sys.length; si++) {
      if (usedSys[si]) continue;
      var sRow = sys[si];
      if (sRow.type !== bRow.type) continue;
      if (Math.abs(sRow.amount - bRow.amount) > 0.01) continue;
      if (!_concDateWithin(sRow.date, bRow.date, 1)) continue;
      matched.push({ system: sRow, bank: bRow, matchType: 'fuzzy' });
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

  var matchedAmt  = r.matched.reduce(function(s, m) { return s + m.bank.amount; }, 0);
  var bankAmt     = r.onlyBank.reduce(function(s, m) { return s + m.amount; }, 0);
  var systemAmt   = r.onlySystem.reduce(function(s, m) { return s + m.amount; }, 0);

  var exactCount  = r.matched.filter(function(m) { return m.matchType === 'exact'; }).length;
  var fuzzyCount  = r.matched.filter(function(m) { return m.matchType === 'fuzzy'; }).length;

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

  // Fuzzy notice
  (fuzzyCount > 0 ?
    '<div style="padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:var(--radius);margin-bottom:14px;font-size:12px;color:#92400e">' +
      '<i class="fas fa-exclamation-triangle" style="margin-right:6px"></i>' +
      '<strong>' + fuzzyCount + ' movimiento' + (fuzzyCount>1?'s':'') + ' conciliado' + (fuzzyCount>1?'s':'') + ' con diferencia de fecha (±1 día).</strong> ' +
      'Verificá que correspondan al mismo movimiento.' +
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
    var typeColor = m.system.type === 'debit' ? '#ef4444' : '#22c55e';
    var typeLabel = m.system.type === 'debit' ? 'Egreso' : 'Ingreso';
    return '<tr style="' + (isFuzzy ? 'background:#fffbeb' : '') + '">' +
      '<td style="font-size:12px;font-weight:600">' + fmtDate(m.system.date) +
        (m.bank.date !== m.system.date ? '<div style="font-size:10px;color:#f59e0b">Banco: ' + fmtDate(m.bank.date) + '</div>' : '') +
      '</td>' +
      '<td><span style="font-size:11px;font-weight:700;color:' + typeColor + '">' + typeLabel + '</span></td>' +
      '<td style="font-weight:700;text-align:right">' + fmtMoney(m.system.amount) + '</td>' +
      '<td style="font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(m.system.desc) + '">' + esc(m.system.desc || '—') + '</td>' +
      '<td style="font-size:12px;color:var(--text-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(m.bank.desc) + '">' + esc(m.bank.desc || '—') + '</td>' +
      '<td style="text-align:center">' +
        '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:' + (isFuzzy?'#fef3c7':'#f0fdf4') + ';color:' + (isFuzzy?'#92400e':'#166534') + '">' +
          (isFuzzy ? '±1 día' : 'Exacto') +
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

/* ─── BANK ONLY TABLE ─── */
function _concBankOnlyTable(rows) {
  var header =
    '<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">' +
      '<i class="fas fa-university" style="color:#f59e0b"></i>' +
      '<strong style="font-size:13px">Solo en Banco — Sin imputar en sistema (' + rows.length + ')</strong>' +
    '</div>';

  if (!rows.length) return header +
    '<div class="empty-state" style="padding:48px 16px"><i class="fas fa-check-circle"></i><p>Todos los movimientos bancarios están registrados en el sistema.</p></div>';

  var total = rows.reduce(function(s, r) { return s + r.amount; }, 0);

  var tRows = rows.map(function(r) {
    var typeColor = r.type === 'debit' ? '#ef4444' : '#22c55e';
    var typeLabel = r.type === 'debit' ? 'Débito' : 'Crédito';
    return '<tr>' +
      '<td style="font-size:12px;font-weight:600">' + fmtDate(r.date) + '</td>' +
      '<td><span style="font-size:11px;font-weight:700;color:' + typeColor + '">' + typeLabel + '</span></td>' +
      '<td style="font-weight:700;text-align:right;color:' + typeColor + '">' + fmtMoney(r.amount) + '</td>' +
      '<td style="font-size:12px">' + esc(r.desc || '—') + '</td>' +
      '<td style="font-size:11px;color:var(--text-muted)">' + esc(r.concepto || '—') + '</td>' +
      '<td style="font-size:12px;text-align:right;color:var(--text-muted)">' + (r.saldo ? fmtMoney(r.saldo) : '—') + '</td>' +
    '</tr>';
  }).join('');

  return header +
    '<div class="table-wrap"><table>' +
      '<thead><tr>' +
        '<th>Fecha</th><th>Tipo</th><th style="text-align:right">Monto</th>' +
        '<th>Descripción</th><th>Concepto</th><th style="text-align:right">Saldo</th>' +
      '</tr></thead>' +
      '<tbody>' + tRows + '</tbody>' +
      '<tfoot><tr style="background:var(--bg);border-top:2px solid var(--border)">' +
        '<td colspan="2" style="font-weight:700;padding:10px 12px">TOTAL</td>' +
        '<td style="font-weight:800;text-align:right;padding:10px 12px;color:var(--primary)">' + fmtMoney(total) + '</td>' +
        '<td colspan="3"></td>' +
      '</tr></tfoot>' +
    '</table></div>';
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
      '<td style="font-size:12px">' + esc(r.desc || '—') + '</td>' +
      '<td style="font-size:12px;color:var(--text-muted)">' + esc(r.ref || '—') + '</td>' +
      '<td style="font-size:11px;color:var(--text-muted)">' + esc(r.account || '—') + '</td>' +
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
