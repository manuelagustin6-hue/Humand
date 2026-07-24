/* ===== MÓDULO: ASIENTOS AUTOMÁTICOS ===== */

// Próximo número de asiento por AÑO calculado como max+1 sobre los existentes
// (no length+1, que repite números al borrar o al mezclar auto+manual).
function nextJournalNumber() {
  var year = new Date().getFullYear();
  var prefix = 'AS-' + year + '-';
  var max = 0;
  DB.getAll('journalEntries').forEach(function(e) {
    var n = (e && e.number) || '';
    if (n.indexOf(prefix) === 0) {
      var num = parseInt(n.slice(prefix.length), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  });
  return prefix + String(max + 1).padStart(4, '0');
}

var AJ_TYPES = [
  { id: 'fact_emitida',        name: 'Factura Emitida',          desc: 'Al emitir factura a cliente',           icon: 'fa-file-invoice-dollar', default_side: 'credit', side_label: 'Cuenta a Cobrar (AR) — contraparte de cada rubro de venta', has_iva: true },
  { id: 'nc_emitida',          name: 'Nota de Credito Emitida',  desc: 'Al emitir nota de credito a cliente',   icon: 'fa-file-circle-minus',   default_side: 'debit',  side_label: 'Cuenta de Ventas (devolucion)' },
  { id: 'nd_emitida',          name: 'Nota de Debito Emitida',   desc: 'Al emitir nota de debito a cliente',    icon: 'fa-file-circle-plus',    default_side: 'debit',  side_label: 'Cuenta a Cobrar (AR)' },
  { id: 'nc_proveedor',        name: 'Nota de Credito Recibida', desc: 'Al recibir nota de credito de proveedor',icon: 'fa-file-circle-minus',  default_side: 'debit',  side_label: 'Cuenta a Pagar (AP) — devolucion' },
  { id: 'nd_proveedor',        name: 'Nota de Debito Recibida',  desc: 'Al recibir nota de debito de proveedor', icon: 'fa-file-circle-plus',   default_side: 'credit', side_label: 'Cuenta a Pagar (AP) — cargo adicional' },
  { id: 'cobro_cliente',       name: 'Cobro de Cliente',         desc: 'Al registrar cobro de cliente',         icon: 'fa-hand-holding-dollar', default_side: 'debit',  side_label: 'Cuenta Caja / Banco (ingreso)' },
  { id: 'certificacion',       name: 'Certificacion de Obra',    desc: 'Al aprobar certificacion',              icon: 'fa-certificate',         default_side: 'credit', side_label: 'Cuenta de Certificaciones' },
  { id: 'fact_proveedor',      name: 'Factura Proveedor',        desc: 'Al cargar factura de proveedor',        icon: 'fa-file-invoice',        default_side: 'credit', side_label: 'Cuenta a Pagar (AP) — contraparte de cada rubro de costo', has_iva: true, has_percepciones: true },
  { id: 'orden_pago',          name: 'Orden de Pago',            desc: 'Al emitir pago a proveedor',            icon: 'fa-money-bill-wave',     default_side: 'credit', side_label: 'Cuenta Caja / Banco (egreso)' },
  { id: 'retencion_iva',       name: 'Retencion IVA',            desc: 'Al generar retencion de IVA',           icon: 'fa-percentage',          default_side: 'credit', side_label: 'Cuenta IVA Retenido' },
  { id: 'retencion_ganancias', name: 'Retencion Ganancias',      desc: 'Al generar retencion de Ganancias',     icon: 'fa-percentage',          default_side: 'credit', side_label: 'Cuenta Ret. Ganancias' },
  { id: 'ingreso_caja',        name: 'Ingreso Caja / Banco',     desc: 'Al registrar ingreso en caja o banco',  icon: 'fa-landmark',            default_side: 'debit',  side_label: 'Cuenta Caja / Banco' },
  { id: 'egreso_caja',         name: 'Egreso Caja / Banco',      desc: 'Al registrar egreso de caja o banco',   icon: 'fa-landmark',            default_side: 'credit', side_label: 'Cuenta Caja / Banco' },
];

function renderAsientos() {
  var content = document.getElementById('content');
  content.innerHTML =
    '<div class="page-header"><div>' +
      '<div class="page-title"><i class="fas fa-magic" style="margin-right:8px;color:var(--primary)"></i>Asientos Automaticos</div>' +
      '<div class="page-subtitle">Asigne una cuenta contable por tipo de operacion. El sistema generara el asiento automaticamente al registrar cada operacion.</div>' +
    '</div></div>' +
    '<div class="card">' +
      '<table class="table">' +
        '<thead><tr>' +
          '<th>Tipo de Operacion</th>' +
          '<th>Cuenta Contable</th>' +
          '<th>Lado</th>' +
          '<th>Concepto Modelo</th>' +
          '<th>Estado</th>' +
          '<th style="width:110px"></th>' +
        '</tr></thead>' +
        '<tbody id="aj-tbody">' + ajBuildRows() + '</tbody>' +
      '</table>' +
    '</div>';
}

function ajBuildRows() {
  var html = '';
  AJ_TYPES.forEach(function(type) {
    var cfg = ajGetConfig(type.id);
    var isConfigured = cfg && cfg.account;
    var statusHtml = !isConfigured
      ? '<span class="badge badge-gray">Sin configurar</span>'
      : (cfg.active
          ? '<span class="badge badge-green">Activo</span>'
          : '<span class="badge badge-yellow">Inactivo</span>');
    var accountCell = isConfigured
      ? '<b>' + cfg.account + '</b><br><span style="color:var(--text-muted);font-size:11px">' + (cfg.account_name || '') + '</span>'
      : '<span style="color:var(--border)">—</span>';
    var sideCell = isConfigured
      ? (cfg.account_side === 'debit'
          ? '<span class="badge badge-blue" style="font-size:11px">Debito</span>'
          : '<span class="badge badge-cyan" style="font-size:11px">Credito</span>')
      : '';
    var conceptCell = (cfg && cfg.concept_template)
      ? '<span style="font-size:12px">' + cfg.concept_template + '</span>'
      : '<span style="color:var(--border)">—</span>';
    html +=
      '<tr>' +
        '<td><i class="fas ' + type.icon + '" style="color:var(--primary);margin-right:8px"></i>' +
          '<b>' + type.name + '</b>' +
          '<br><span style="font-size:11px;color:var(--text-muted)">' + type.desc + '</span>' +
        '</td>' +
        '<td style="font-size:12px;">' + accountCell + '</td>' +
        '<td>' + sideCell + '</td>' +
        '<td style="font-size:12px;">' + conceptCell + '</td>' +
        '<td>' + statusHtml + '</td>' +
        '<td><button class="btn btn-sm btn-secondary" onclick="ajEditType(\'' + type.id + '\')"><i class="fas fa-cog"></i> Configurar</button></td>' +
      '</tr>';
  });
  return html;
}

// ---- CONFIG STORAGE ----
function ajGetConfig(operationId) {
  var configs = DB.getAll('autoJournalConfig');
  return configs.find(function(c) { return c.operation_id === operationId; }) || null;
}

function ajSaveConfig(operationId, config) {
  var db = DB.get();
  if (!db.autoJournalConfig) db.autoJournalConfig = [];
  var idx = db.autoJournalConfig.findIndex(function(c) { return c.operation_id === operationId; });
  var record = Object.assign({}, config, { operation_id: operationId, updated_at: now() });
  if (idx === -1) {
    record.created_at = now();
    db.autoJournalConfig.push(record);
  } else {
    db.autoJournalConfig[idx] = Object.assign({}, db.autoJournalConfig[idx], record);
  }
  DB.save(db);
}

// ---- EDIT MODAL ----
function ajEditType(typeId) {
  var type = AJ_TYPES.find(function(t) { return t.id === typeId; });
  if (!type) return;
  var cfg = ajGetConfig(typeId) || {};
  var accounts = DB.getAll('accounts').sort(function(a, b) { return a.code.localeCompare(b.code); });
  var aoHtml = '<option value="">— Seleccionar cuenta —</option>' +
    accounts.map(function(a) {
      return '<option value="' + a.code + '" data-name="' + (a.name || '') + '">' + a.code + ' — ' + a.name + '</option>';
    }).join('');

  var currentSide = cfg.account_side || type.default_side;

  var body =
    '<div style="background:var(--bg);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:20px">' +
      '<div style="font-size:14px;font-weight:600;margin-bottom:4px">' +
        '<i class="fas ' + type.icon + '" style="color:var(--primary);margin-right:8px"></i>' + type.name +
      '</div>' +
      '<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">' + type.desc + '</div>' +
      '<div style="font-size:12px;color:var(--primary)">' +
        '<i class="fas fa-info-circle" style="margin-right:4px"></i>Configure: <b>' + type.side_label + '</b>' +
      '</div>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Cuenta Contable *</label>' +
      '<select id="aj-account" class="form-control" onchange="ajOnAccountChange()">' + aoHtml + '</select>' +
      '<input type="hidden" id="aj-account-name">' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Lado del Asiento</label>' +
      '<select id="aj-side" class="form-control">' +
        '<option value="debit"' + (currentSide === 'debit' ? ' selected' : '') + '>Debito (cargo)</option>' +
        '<option value="credit"' + (currentSide === 'credit' ? ' selected' : '') + '>Credito (abono)</option>' +
      '</select>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Plantilla de Concepto</label>' +
      '<input type="text" id="aj-concept" class="form-control" value="' + (cfg.concept_template || '') + '" placeholder="Ej: Factura {ref} — {date}">' +
      '<small style="color:var(--text-muted);font-size:11px">Variables: {ref} = referencia, {date} = fecha, {amount} = importe</small>' +
    '</div>' +
    '<div class="form-group">' +
      '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;">' +
        '<input type="checkbox" id="aj-active"' + (cfg.active ? ' checked' : '') + ' style="width:16px;height:16px;">' +
        '<span>Activo: generar asiento automaticamente al guardar</span>' +
      '</label>' +
    '</div>';

  var taxAoHtml = '<option value="">— No configurar (omitir) —</option>' +
    accounts.map(function(a) {
      return '<option value="' + a.code + '" data-name="' + (a.name || '') + '">' + a.code + ' — ' + a.name + '</option>';
    }).join('');

  if (type.has_iva) {
    body +=
      '<div class="divider" style="margin:12px 0 16px"></div>' +
      '<div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Cuentas de Impuestos</div>' +
      '<div class="form-group">' +
        '<label>Cuenta IVA (Credito / Debito Fiscal)</label>' +
        '<select id="aj-iva-account" class="form-control">' + taxAoHtml + '</select>' +
        '<small style="color:var(--text-muted);font-size:11px">Se generara una linea adicional en el asiento para el IVA de la factura</small>' +
      '</div>';
  }
  if (type.has_percepciones) {
    body +=
      '<div class="form-group">' +
        '<label>Cuenta Percepciones IVA</label>' +
        '<select id="aj-perc-iva-account" class="form-control">' + taxAoHtml + '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Cuenta Percepciones IIBB / Sel. Ingresos</label>' +
        '<select id="aj-perc-iibb-account" class="form-control">' + taxAoHtml + '</select>' +
      '</div>';
  }

  var footer =
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="ajSaveEdit(\'' + typeId + '\')"><i class="fas fa-save"></i> Guardar</button>';

  openModal('Configurar: ' + type.name, body, 'modal-md', footer);

  setTimeout(function() {
    if (cfg.account) {
      var sel = document.getElementById('aj-account');
      if (sel) { sel.value = cfg.account; ajOnAccountChange(); }
    }
    if (cfg.account_name) {
      var nf = document.getElementById('aj-account-name');
      if (nf) nf.value = cfg.account_name;
    }
    if (cfg.iva_account) {
      var s2 = document.getElementById('aj-iva-account');
      if (s2) s2.value = cfg.iva_account;
    }
    if (cfg.perc_iva_account) {
      var s3 = document.getElementById('aj-perc-iva-account');
      if (s3) s3.value = cfg.perc_iva_account;
    }
    if (cfg.perc_iibb_account) {
      var s4 = document.getElementById('aj-perc-iibb-account');
      if (s4) s4.value = cfg.perc_iibb_account;
    }
  }, 50);
}

function ajOnAccountChange() {
  var sel = document.getElementById('aj-account');
  var nameField = document.getElementById('aj-account-name');
  if (!sel || !nameField) return;
  var opt = sel.options[sel.selectedIndex];
  nameField.value = opt ? (opt.getAttribute('data-name') || '') : '';
}

function ajSaveEdit(typeId) {
  var account = (document.getElementById('aj-account') || {}).value || '';
  var accountName = (document.getElementById('aj-account-name') || {}).value || '';
  var accountSide = (document.getElementById('aj-side') || {}).value || 'debit';
  var concept = ((document.getElementById('aj-concept') || {}).value || '').trim();
  var active = !!(document.getElementById('aj-active') || {}).checked;

  if (!account) { toast('Debe seleccionar una cuenta contable', 'error'); return; }

  var typeForSave = AJ_TYPES.find(function(t) { return t.id === typeId; });
  var configData = {
    account: account,
    account_name: accountName,
    account_side: accountSide,
    concept_template: concept,
    active: active
  };
  if (typeForSave && typeForSave.has_iva) {
    var ivaEl = document.getElementById('aj-iva-account');
    configData.iva_account = ivaEl ? ivaEl.value : '';
    configData.iva_account_name = (ivaEl && ivaEl.selectedIndex >= 0)
      ? (ivaEl.options[ivaEl.selectedIndex].getAttribute('data-name') || '') : '';
  }
  if (typeForSave && typeForSave.has_percepciones) {
    var pIvaEl  = document.getElementById('aj-perc-iva-account');
    var pIibbEl = document.getElementById('aj-perc-iibb-account');
    configData.perc_iva_account      = pIvaEl  ? pIvaEl.value  : '';
    configData.perc_iva_account_name = (pIvaEl  && pIvaEl.selectedIndex  >= 0) ? (pIvaEl.options[pIvaEl.selectedIndex].getAttribute('data-name')   || '') : '';
    configData.perc_iibb_account     = pIibbEl ? pIibbEl.value : '';
    configData.perc_iibb_account_name= (pIibbEl && pIibbEl.selectedIndex >= 0) ? (pIibbEl.options[pIibbEl.selectedIndex].getAttribute('data-name') || '') : '';
  }
  ajSaveConfig(typeId, configData);
  closeModal();
  var tbody = document.getElementById('aj-tbody');
  if (tbody) tbody.innerHTML = ajBuildRows();
  toast('Configuracion guardada', 'success');
}

// ---- PUBLIC API ----
// Genera un asiento contable automatico para una operacion.
// opts.counterAccount / opts.counterName: cuenta contraparte (si el modulo la conoce, ej. la cuenta bancaria usada).
// Retorna el asiento creado o null si no hay config activa.
function autoJournalEntry(operationTypeId, amount, date, ref, description, opts) {
  try {
    var cfg = ajGetConfig(operationTypeId);
    if (!cfg || !cfg.active || !cfg.account) return null;
    if (!amount || isNaN(amount) || amount <= 0) return null;

    opts = opts || {};
    var concept = (cfg.concept_template || 'Asiento auto - {ref}')
      .replace(/\{ref\}/g, ref || '')
      .replace(/\{date\}/g, date || '')
      .replace(/\{amount\}/g, amount ? Number(amount).toLocaleString('es-AR') : '');

    var entries = DB.getAll('journalEntries');
    var nextNum = nextJournalNumber();

    var isDebit = (cfg.account_side === 'debit');
    var counterCode = opts.counterAccount || '';
    var counterName = opts.counterName || 'Contraparte';

    // Integridad: nunca postear a una cuenta contraparte inexistente. Una línea
    // con código fuera del plan la descarta calcAccountBalances y descuadra el
    // balance. Si el módulo no aportó una contraparte real, omitimos el asiento.
    var _accts = DB.getAll('accounts');
    var _counterValid = counterCode && _accts.some(function(a) { return a.code === counterCode; });
    if (!_counterValid) {
      console.warn('[asientos] "' + operationTypeId + '": sin cuenta contraparte válida — asiento omitido para no descuadrar el balance.');
      return null;
    }

    var mainLine   = { account_code: cfg.account,  account_name: cfg.account_name || cfg.account, debit: isDebit ? amount : 0, credit: isDebit ? 0 : amount, description: concept };
    var counterLine = { account_code: counterCode, account_name: counterName, debit: isDebit ? 0 : amount, credit: isDebit ? amount : 0, description: concept };

    var entry = {
      number: nextNum,
      date: date || (new Date()).toISOString().split('T')[0],
      description: concept || description || ('Asiento auto - ' + operationTypeId),
      reference: ref || '',
      status: 'posted',
      auto_generated: true,
      operation_type: operationTypeId,
      project_id:   opts.project_id || '',    // dimensiones para filtrar Contabilidad
      currency:     opts.currency || '',
      counterparty: opts.counterparty || '',
      lines: isDebit ? [mainLine, counterLine] : [counterLine, mainLine],
    };

    return DB.insert('journalEntries', entry);
  } catch(e) {
    console.error('autoJournalEntry:', e);
    return null;
  }
}

// Generates a multi-line journal entry from imputacion rubros + tax lines.
// neto   = sum of rubro imputacion lines (subtotal sin impuestos)
// total  = full invoice total (what goes to AP/AR counter account)
// taxes  = { iva, percIva, percIibb } — optional tax amounts for separate ledger lines
// imputacion = [{account_code, account_name, amount}, ...]
function autoJournalEntryFromImputacion(operationTypeId, imputacion, neto, total, taxes, date, ref, opts) {
  try {
    opts = opts || {};
    var cfg = ajGetConfig(operationTypeId);
    if (!cfg || !cfg.active || !cfg.account) return null;
    var validLines = (imputacion || []).filter(function(l) { return l.account_code && l.amount > 0; });
    if (!validLines.length) return autoJournalEntry(operationTypeId, total, date, ref, '', opts);
    taxes = taxes || {};

    var concept = (cfg.concept_template || 'Asiento auto - {ref}')
      .replace(/\{ref\}/g, ref || '')
      .replace(/\{date\}/g, date || '')
      .replace(/\{amount\}/g, total ? Number(total).toLocaleString('es-AR') : '');

    var entries = DB.getAll('journalEntries');
    var nextNum = nextJournalNumber();
    var isDebit = (cfg.account_side === 'debit');  // true = AR (fact_emitida), false = AP (fact_proveedor)
    var typeObj = AJ_TYPES.find(function(t) { return t.id === operationTypeId; });

    var lines = [];
    // Rubro imputacion lines (neto allocation) — opposite side to the AP/AR account
    validLines.forEach(function(l) {
      lines.push({
        account_code: l.account_code,
        account_name: l.account_name || l.account_code,
        debit:  isDebit ? 0 : l.amount,
        credit: isDebit ? l.amount : 0,
        description: concept
      });
    });
    // Tax lines (same direction as rubro lines — they are also "expense" or "revenue" components)
    if (typeObj && typeObj.has_iva && taxes.iva && cfg.iva_account) {
      lines.push({
        account_code: cfg.iva_account,
        account_name: cfg.iva_account_name || cfg.iva_account,
        debit:  isDebit ? 0 : taxes.iva,
        credit: isDebit ? taxes.iva : 0,
        description: concept
      });
    }
    if (typeObj && typeObj.has_percepciones) {
      if (taxes.percIva && cfg.perc_iva_account) {
        lines.push({
          account_code: cfg.perc_iva_account,
          account_name: cfg.perc_iva_account_name || cfg.perc_iva_account,
          debit:  isDebit ? 0 : taxes.percIva,
          credit: isDebit ? taxes.percIva : 0,
          description: concept
        });
      }
      if (taxes.percIibb && cfg.perc_iibb_account) {
        lines.push({
          account_code: cfg.perc_iibb_account,
          account_name: cfg.perc_iibb_account_name || cfg.perc_iibb_account,
          debit:  isDebit ? 0 : taxes.percIibb,
          credit: isDebit ? taxes.percIibb : 0,
          description: concept
        });
      }
    }
    // Counter line = configured AP/AR account. Debe igualar EXACTAMENTE la suma de
    // las líneas realmente contabilizadas (neto + impuestos cuyas cuentas están
    // mapeadas), no el `total` crudo. Si una cuenta de impuesto no está configurada
    // su línea no se emite; usar `total` dejaría el asiento descuadrado por ese monto.
    var _postedSum = lines.reduce(function(s, ln) { return s + (isDebit ? (ln.credit || 0) : (ln.debit || 0)); }, 0);
    if (Math.abs(_postedSum - total) > 0.01) {
      console.warn('[asientos] "' + operationTypeId + '": faltan cuentas de impuesto configuradas — se contabilizó ' +
        _postedSum + ' de ' + total + '. Mapeá las cuentas de IVA/percepciones en Asientos Automáticos.');
      if (typeof toast === 'function') toast('Asiento generado sin la cuenta de IVA/percepción configurada — revisá Asientos Automáticos', 'warning');
    }
    lines.push({
      account_code: cfg.account,
      account_name: cfg.account_name || cfg.account,
      debit:  isDebit ? _postedSum : 0,
      credit: isDebit ? 0 : _postedSum,
      description: concept
    });

    var entry = {
      number: nextNum,
      date: date || (new Date()).toISOString().split('T')[0],
      description: concept,
      reference: ref || '',
      status: 'posted',
      auto_generated: true,
      operation_type: operationTypeId,
      project_id:   opts.project_id || '',    // dimensiones para filtrar Contabilidad
      currency:     opts.currency || '',
      counterparty: opts.counterparty || '',
      lines: lines,
    };
    return DB.insert('journalEntries', entry);
  } catch(e) {
    console.error('autoJournalEntryFromImputacion:', e);
    return null;
  }
}
