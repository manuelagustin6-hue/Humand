/* ===== MÓDULO: ASIENTOS AUTOMÁTICOS ===== */

var AJ_TYPES = [
  { id: 'fact_emitida',        name: 'Factura Emitida (Ventas)',   desc: 'Al emitir factura a cliente',            icon: 'fa-file-invoice-dollar' },
  { id: 'nc_emitida',          name: 'Nota de Credito Emitida',    desc: 'Al emitir nota de credito a cliente',    icon: 'fa-file-circle-minus' },
  { id: 'cobro_cliente',       name: 'Cobro de Cliente',           desc: 'Al registrar cobro de cliente',          icon: 'fa-hand-holding-dollar' },
  { id: 'certificacion',       name: 'Certificacion de Obra',      desc: 'Al aprobar certificacion',               icon: 'fa-certificate' },
  { id: 'fact_proveedor',      name: 'Factura Proveedor (Compras)', desc: 'Al cargar factura de proveedor',        icon: 'fa-file-invoice' },
  { id: 'orden_pago',          name: 'Orden de Pago',              desc: 'Al emitir pago a proveedor',             icon: 'fa-money-bill-wave' },
  { id: 'retencion_iva',       name: 'Retencion IVA',              desc: 'Al generar retencion de IVA',            icon: 'fa-percentage' },
  { id: 'retencion_ganancias', name: 'Retencion Ganancias',        desc: 'Al generar retencion de Ganancias',      icon: 'fa-percentage' },
  { id: 'ingreso_caja',        name: 'Ingreso Caja / Banco',       desc: 'Al registrar ingreso en caja o banco',   icon: 'fa-landmark' },
  { id: 'egreso_caja',         name: 'Egreso Caja / Banco',        desc: 'Al registrar egreso de caja o banco',    icon: 'fa-landmark' },
];

function renderAsientos() {
  var content = document.getElementById('content');
  content.innerHTML =
    '<div class="page-header"><div>' +
      '<div class="page-title"><i class="fas fa-magic" style="margin-right:8px;color:var(--primary)"></i>Asientos Automaticos</div>' +
      '<div class="page-subtitle">Parametrizar cuentas contables por tipo de operacion</div>' +
    '</div></div>' +
    '<div class="card">' +
      '<p style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">Configure las cuentas debito y credito para cada tipo de operacion. Cuando se registre una operacion con asiento activo, se generara un asiento contable automaticamente.</p>' +
      '<table class="table">' +
        '<thead><tr>' +
          '<th>Tipo de Operacion</th>' +
          '<th>Cuenta Debito</th>' +
          '<th>Cuenta Credito</th>' +
          '<th>Concepto Modelo</th>' +
          '<th>Estado</th>' +
          '<th></th>' +
        '</tr></thead>' +
        '<tbody id="aj-tbody">' + ajBuildRows() + '</tbody>' +
      '</table>' +
    '</div>';
}

function ajBuildRows() {
  var html = '';
  AJ_TYPES.forEach(function(type) {
    var cfg = ajGetConfig(type.id);
    var isConfigured = cfg && cfg.debit_account && cfg.credit_account;
    var statusHtml = !isConfigured
      ? '<span class="badge badge-gray">Sin configurar</span>'
      : (cfg.active
          ? '<span class="badge badge-green">Activo</span>'
          : '<span class="badge badge-yellow">Inactivo</span>');
    var debitCell = isConfigured ? ('<b>' + cfg.debit_account + '</b><br><span style="color:var(--text-muted);font-size:11px">' + (cfg.debit_name || '') + '</span>') : '<span style="color:var(--border)">—</span>';
    var creditCell = isConfigured ? ('<b>' + cfg.credit_account + '</b><br><span style="color:var(--text-muted);font-size:11px">' + (cfg.credit_name || '') + '</span>') : '<span style="color:var(--border)">—</span>';
    var conceptCell = (cfg && cfg.concept_template) ? ('<span style="font-size:12px">' + cfg.concept_template + '</span>') : '<span style="color:var(--border)">—</span>';
    html +=
      '<tr>' +
        '<td style="white-space:nowrap;"><i class="fas ' + type.icon + '" style="color:var(--primary);margin-right:8px"></i><b>' + type.name + '</b><br><span style="font-size:11px;color:var(--text-muted)">' + type.desc + '</span></td>' +
        '<td style="font-size:12px;">' + debitCell + '</td>' +
        '<td style="font-size:12px;">' + creditCell + '</td>' +
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

  var body =
    '<div class="form-group" style="margin-bottom:16px">' +
      '<div style="background:var(--bg);border-radius:var(--radius-sm);padding:10px 14px;font-size:14px;">' +
        '<i class="fas ' + type.icon + '" style="color:var(--primary);margin-right:8px"></i>' +
        '<b>' + type.name + '</b>' +
        '<span style="color:var(--text-muted);font-size:12px;margin-left:12px">' + type.desc + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="form-grid">' +
      '<div class="form-group">' +
        '<label>Cuenta Debito *</label>' +
        '<select id="aj-debit" class="form-control" onchange="ajOnAccountChange(\'aj-debit\')">' + aoHtml + '</select>' +
        '<input type="hidden" id="aj-debit-name">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Cuenta Credito *</label>' +
        '<select id="aj-credit" class="form-control" onchange="ajOnAccountChange(\'aj-credit\')">' + aoHtml + '</select>' +
        '<input type="hidden" id="aj-credit-name">' +
      '</div>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Plantilla de Concepto</label>' +
      '<input type="text" id="aj-concept" class="form-control" value="' + (cfg.concept_template || '') + '" placeholder="Ej: Asiento auto {ref}">' +
      '<small style="color:var(--text-muted);font-size:11px">Variables disponibles: {ref} = referencia, {date} = fecha, {amount} = importe</small>' +
    '</div>' +
    '<div class="form-group">' +
      '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;">' +
        '<input type="checkbox" id="aj-active" ' + (cfg.active ? 'checked' : '') + ' style="width:16px;height:16px;">' +
        ' Asiento activo (se generara automaticamente al guardar la operacion)' +
      '</label>' +
    '</div>';

  var footer =
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="ajSaveEdit(\'' + typeId + '\')"><i class="fas fa-save"></i> Guardar</button>';

  openModal('Configurar: ' + type.name, body, 'modal-lg', footer);

  setTimeout(function() {
    if (cfg.debit_account) {
      var d = document.getElementById('aj-debit');
      if (d) { d.value = cfg.debit_account; ajOnAccountChange('aj-debit'); }
    }
    if (cfg.credit_account) {
      var c = document.getElementById('aj-credit');
      if (c) { c.value = cfg.credit_account; ajOnAccountChange('aj-credit'); }
    }
    if (cfg.debit_name) { var dn = document.getElementById('aj-debit-name'); if (dn) dn.value = cfg.debit_name; }
    if (cfg.credit_name) { var cn = document.getElementById('aj-credit-name'); if (cn) cn.value = cfg.credit_name; }
  }, 50);
}

function ajOnAccountChange(selectId) {
  var sel = document.getElementById(selectId);
  var nameField = document.getElementById(selectId + '-name');
  if (!sel || !nameField) return;
  var opt = sel.options[sel.selectedIndex];
  nameField.value = opt ? (opt.getAttribute('data-name') || '') : '';
}

function ajSaveEdit(typeId) {
  var debit = (document.getElementById('aj-debit') || {}).value || '';
  var credit = (document.getElementById('aj-credit') || {}).value || '';
  var debitName = (document.getElementById('aj-debit-name') || {}).value || '';
  var creditName = (document.getElementById('aj-credit-name') || {}).value || '';
  var concept = ((document.getElementById('aj-concept') || {}).value || '').trim();
  var active = (document.getElementById('aj-active') || {}).checked || false;

  if (!debit || !credit) { toast('Debe seleccionar cuenta debito y credito', 'error'); return; }
  if (debit === credit) { toast('Las cuentas debito y credito no pueden ser iguales', 'error'); return; }

  ajSaveConfig(typeId, { debit_account: debit, debit_name: debitName, credit_account: credit, credit_name: creditName, concept_template: concept, active: active });
  closeModal();
  var tbody = document.getElementById('aj-tbody');
  if (tbody) tbody.innerHTML = ajBuildRows();
  toast('Configuracion guardada', 'success');
}

// ---- PUBLIC API ----
// Call from other modules to auto-generate a journal entry.
// Returns the created entry object or null if no active config found.
function autoJournalEntry(operationTypeId, amount, date, ref, description) {
  try {
    var cfg = ajGetConfig(operationTypeId);
    if (!cfg || !cfg.active || !cfg.debit_account || !cfg.credit_account) return null;
    if (!amount || isNaN(amount) || amount <= 0) return null;

    var concept = (cfg.concept_template || 'Asiento auto - {ref}')
      .replace(/\{ref\}/g, ref || '')
      .replace(/\{date\}/g, date || '')
      .replace(/\{amount\}/g, amount ? Number(amount).toLocaleString('es-AR') : '');

    var entries = DB.getAll('journalEntries');
    var nextNum = 'AS-' + new Date().getFullYear() + '-' + String(entries.length + 1).padStart(4, '0');

    var entry = {
      number: nextNum,
      date: date || (new Date()).toISOString().split('T')[0],
      description: concept || description || ('Asiento auto - ' + operationTypeId),
      reference: ref || '',
      status: 'posted',
      auto_generated: true,
      operation_type: operationTypeId,
      lines: [
        { account_code: cfg.debit_account,  account_name: cfg.debit_name  || cfg.debit_account,  debit: amount, credit: 0,      description: concept },
        { account_code: cfg.credit_account, account_name: cfg.credit_name || cfg.credit_account, debit: 0,      credit: amount, description: concept },
      ],
    };

    return DB.insert('journalEntries', entry);
  } catch(e) {
    console.error('autoJournalEntry:', e);
    return null;
  }
}
