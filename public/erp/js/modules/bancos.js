/* ===== MÓDULO: CHEQUES Y CUENTAS BANCARIAS ===== */

// =====================================================================
// CHEQUES
// Collection: 'cheques'
// { id, type: 'received'|'issued', number, bank, amount, currency,
//   date, due_date, payee_or_drawer, status, project_id, notes }
// =====================================================================

var _chequesState = { tab: 'recibidos', filterStatus: '', filterType: '' };

function renderCheques() {
  var cheques = DB.getAll('cheques');
  var projects = DB.getAll('projects');

  document.getElementById('content').innerHTML =
    '<div class="page-header">' +
      '<div>' +
        '<div class="page-title"><i class="fas fa-money-check" style="margin-right:8px;color:var(--primary)"></i>Cheques</div>' +
        '<div class="page-subtitle">Gestion de cheques recibidos de clientes y emitidos a proveedores</div>' +
      '</div>' +
      '<div class="page-actions">' +
        '<button class="btn btn-primary" onclick="openChequeForm()">' +
          '<i class="fas fa-plus"></i> Nuevo Cheque' +
        '</button>' +
      '</div>' +
    '</div>' +

    '<div id="cheques-summary" style="margin-bottom:20px"></div>' +

    '<div id="cheques-tabs" class="tabs-container">' +
      '<div class="tabs-header">' +
        '<button class="tab-btn active" data-tab="tab-ch-recibidos" onclick="chSetTab(\'recibidos\')">Cheques Recibidos</button>' +
        '<button class="tab-btn" data-tab="tab-ch-emitidos" onclick="chSetTab(\'emitidos\')">Cheques Emitidos</button>' +
      '</div>' +
      '<div id="tab-ch-recibidos" class="tab-content active"></div>' +
      '<div id="tab-ch-emitidos" class="tab-content"></div>' +
    '</div>';

  chRenderSummary(cheques);
  chRenderTab('recibidos', cheques, projects);
  chRenderTab('emitidos', cheques, projects);
}

function chRenderSummary(cheques) {
  var received = cheques.filter(function(c) { return c.type === 'received'; });
  var issued = cheques.filter(function(c) { return c.type === 'issued'; });

  var totalWallet = received.filter(function(c) { return c.status === 'wallet'; })
    .reduce(function(s, c) { return s + (c.amount || 0); }, 0);
  var totalDeposited = received.filter(function(c) { return c.status === 'deposited'; })
    .reduce(function(s, c) { return s + (c.amount || 0); }, 0);
  var totalIssued = issued.filter(function(c) { return c.status !== 'paid' && c.status !== 'rejected'; })
    .reduce(function(s, c) { return s + (c.amount || 0); }, 0);
  var totalRejected = cheques.filter(function(c) { return c.status === 'rejected'; })
    .reduce(function(s, c) { return s + (c.amount || 0); }, 0);

  var panel = document.getElementById('cheques-summary');
  if (!panel) return;

  panel.innerHTML =
    '<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">' +
      '<div class="stat-card">' +
        '<div class="stat-icon blue"><i class="fas fa-wallet"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalWallet) + '</div>' +
        '<div class="stat-label">En Cartera</div>' +
        '<div class="stat-delta">' + received.filter(function(c) { return c.status === 'wallet'; }).length + ' cheques</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon green"><i class="fas fa-building-columns"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalDeposited) + '</div>' +
        '<div class="stat-label">Depositados</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon yellow"><i class="fas fa-paper-plane"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalIssued) + '</div>' +
        '<div class="stat-label">Emitidos Pendientes</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon red"><i class="fas fa-times-circle"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalRejected) + '</div>' +
        '<div class="stat-label">Rechazados</div></div>' +
      '</div>' +
    '</div>';
}

function chRenderTab(tabType, cheques, projects) {
  var type = tabType === 'recibidos' ? 'received' : 'issued';
  var filtered = cheques.filter(function(c) { return c.type === type; });
  var panel = document.getElementById('tab-ch-' + tabType);
  if (!panel) return;

  var statusColors = {
    wallet: 'badge-blue', deposited: 'badge-green', endorsed: 'badge-yellow',
    rejected: 'badge-red', paid: 'badge-gray'
  };
  var statusLabels = {
    wallet: 'En Cartera', deposited: 'Depositado', endorsed: 'Endosado',
    rejected: 'Rechazado', paid: 'Pagado'
  };

  var heading = tabType === 'recibidos'
    ? 'Cheques Recibidos de Clientes'
    : 'Cheques Emitidos a Proveedores';

  var partyLabel = tabType === 'recibidos' ? 'Librador / Cliente' : 'Beneficiario / Proveedor';

  var rows = '';
  filtered.sort(function(a, b) { return (a.due_date || a.date).localeCompare(b.due_date || b.date); });
  filtered.forEach(function(ch) {
    var proj = projects.find(function(p) { return p.id === ch.project_id; });
    var today = todayStr();
    var overdue = ch.due_date && ch.due_date < today && ch.status !== 'paid' && ch.status !== 'deposited' && ch.status !== 'rejected';
    var statusBadge = '<span class="badge ' + (statusColors[ch.status] || 'badge-gray') + '">' + (statusLabels[ch.status] || ch.status) + '</span>';
    if (overdue) statusBadge += ' <span class="badge badge-red" style="font-size:10px">Vencido</span>';

    rows +=
      '<tr>' +
        '<td>' +
          '<strong>' + (ch.number || '-') + '</strong>' +
          '<div style="font-size:11px;color:var(--text-muted)">' + (ch.bank || '') + '</div>' +
        '</td>' +
        '<td>' + (ch.payee_or_drawer || '-') + '</td>' +
        '<td>' + fmtDate(ch.date) + '</td>' +
        '<td>' + (ch.due_date ? fmtDate(ch.due_date) : '-') + '</td>' +
        '<td class="number-cell">' +
          '<strong>' + fmtMoney(ch.amount || 0) + '</strong>' +
          (ch.currency && ch.currency !== 'ARS' ? ' <span style="font-size:10px;color:var(--text-muted)">' + ch.currency + '</span>' : '') +
        '</td>' +
        '<td>' + (proj ? proj.name : '-') + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-secondary" onclick="openChequeStatusForm(\'' + ch.id + '\')" title="Cambiar estado">' +
            '<i class="fas fa-exchange-alt"></i>' +
          '</button> ' +
          '<button class="btn btn-sm btn-secondary" onclick="openChequeForm(\'' + ch.id + '\')" title="Editar">' +
            '<i class="fas fa-edit"></i>' +
          '</button> ' +
          '<button class="btn btn-sm" style="color:var(--danger)" onclick="deleteCheque(\'' + ch.id + '\')" title="Eliminar">' +
            '<i class="fas fa-trash"></i>' +
          '</button>' +
        '</td>' +
      '</tr>';
  });

  if (!rows) {
    rows = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-money-check"></i>' +
      '<p>No hay ' + (tabType === 'recibidos' ? 'cheques recibidos' : 'cheques emitidos') + '</p></div></td></tr>';
  }

  panel.innerHTML =
    '<div class="card">' +
      '<div class="card-body" style="padding:0">' +
        '<div class="table-wrap">' +
          '<table>' +
            '<thead><tr>' +
              '<th>N° Cheque / Banco</th>' +
              '<th>' + partyLabel + '</th>' +
              '<th>Emision</th>' +
              '<th>Vencimiento</th>' +
              '<th class="text-right">Monto</th>' +
              '<th>Proyecto</th>' +
              '<th>Estado</th>' +
              '<th>Acciones</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function chSetTab(tab) {
  _chequesState.tab = tab;
  var tabs = ['recibidos', 'emitidos'];
  tabs.forEach(function(t) {
    var btn = document.querySelector('[data-tab="tab-ch-' + t + '"]');
    var panel = document.getElementById('tab-ch-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
    if (panel) panel.classList.toggle('active', t === tab);
  });
}

function openChequeForm(id) {
  var cheque = id ? DB.getById('cheques', id) : null;
  var projects = DB.getAll('projects');

  var projOptions = '<option value="">-- Sin proyecto --</option>';
  projects.forEach(function(p) {
    projOptions += '<option value="' + p.id + '"' + (cheque && cheque.project_id === p.id ? ' selected' : '') + '>' + p.name + '</option>';
  });

  var isEdit = !!cheque;
  var title = isEdit ? 'Editar Cheque' : 'Nuevo Cheque';

  var body =
    '<div class="form-grid grid-2">' +
      '<div class="form-group">' +
        '<label>Tipo</label>' +
        '<select class="form-control" id="ch-type">' +
          '<option value="received"' + (!cheque || cheque.type === 'received' ? ' selected' : '') + '>Recibido (de cliente)</option>' +
          '<option value="issued"' + (cheque && cheque.type === 'issued' ? ' selected' : '') + '>Emitido (a proveedor)</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>N° de Cheque</label>' +
        '<input class="form-control" id="ch-number" type="text" value="' + (cheque ? cheque.number || '' : '') + '" placeholder="12345678">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Banco</label>' +
        '<input class="form-control" id="ch-bank" type="text" value="' + (cheque ? cheque.bank || '' : '') + '" placeholder="Banco Nacion Argentina">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Librador / Beneficiario</label>' +
        '<input class="form-control" id="ch-party" type="text" value="' + (cheque ? cheque.payee_or_drawer || '' : '') + '" placeholder="Nombre empresa o persona">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Fecha de Emision</label>' +
        '<input class="form-control" id="ch-date" type="date" value="' + (cheque ? cheque.date || '' : todayStr()) + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Fecha de Vencimiento</label>' +
        '<input class="form-control" id="ch-due" type="date" value="' + (cheque ? cheque.due_date || '' : '') + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Monto</label>' +
        '<input class="form-control" id="ch-amount" type="number" min="0" step="0.01" value="' + (cheque ? cheque.amount || '' : '') + '" placeholder="0.00">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Moneda</label>' +
        '<select class="form-control" id="ch-currency">' +
          '<option value="ARS"' + (!cheque || cheque.currency === 'ARS' ? ' selected' : '') + '>ARS - Pesos</option>' +
          '<option value="USD"' + (cheque && cheque.currency === 'USD' ? ' selected' : '') + '>USD - Dolares</option>' +
          '<option value="UYU"' + (cheque && cheque.currency === 'UYU' ? ' selected' : '') + '>UYU - Pesos Uruguayos</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Estado</label>' +
        '<select class="form-control" id="ch-status">' +
          '<option value="wallet"' + (!cheque || cheque.status === 'wallet' ? ' selected' : '') + '>En Cartera</option>' +
          '<option value="deposited"' + (cheque && cheque.status === 'deposited' ? ' selected' : '') + '>Depositado</option>' +
          '<option value="endorsed"' + (cheque && cheque.status === 'endorsed' ? ' selected' : '') + '>Endosado</option>' +
          '<option value="rejected"' + (cheque && cheque.status === 'rejected' ? ' selected' : '') + '>Rechazado</option>' +
          '<option value="paid"' + (cheque && cheque.status === 'paid' ? ' selected' : '') + '>Pagado</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Proyecto</label>' +
        '<select class="form-control" id="ch-project">' + projOptions + '</select>' +
      '</div>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Notas</label>' +
      '<textarea class="form-control" id="ch-notes" rows="2">' + (cheque ? cheque.notes || '' : '') + '</textarea>' +
    '</div>';

  var footer =
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="saveCheque(\'' + (id || '') + '\')">' +
      (isEdit ? 'Guardar Cambios' : 'Registrar Cheque') +
    '</button>';

  openModal(title, body, 'lg', footer);
}

function openChequeStatusForm(id) {
  var cheque = DB.getById('cheques', id);
  if (!cheque) return;

  var body =
    '<p style="margin-bottom:12px">Cheque N° <strong>' + cheque.number + '</strong> — ' + fmtMoney(cheque.amount || 0) + '</p>' +
    '<div class="form-group">' +
      '<label>Nuevo Estado</label>' +
      '<select class="form-control" id="ch-new-status">' +
        '<option value="wallet"' + (cheque.status === 'wallet' ? ' selected' : '') + '>En Cartera</option>' +
        '<option value="deposited"' + (cheque.status === 'deposited' ? ' selected' : '') + '>Depositado</option>' +
        '<option value="endorsed"' + (cheque.status === 'endorsed' ? ' selected' : '') + '>Endosado</option>' +
        '<option value="rejected"' + (cheque.status === 'rejected' ? ' selected' : '') + '>Rechazado</option>' +
        '<option value="paid"' + (cheque.status === 'paid' ? ' selected' : '') + '>Pagado</option>' +
      '</select>' +
    '</div>';

  var footer =
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="saveChequeStatus(\'' + id + '\')">Actualizar Estado</button>';

  openModal('Cambiar Estado del Cheque', body, 'sm', footer);
}

function saveChequeStatus(id) {
  var newStatus = document.getElementById('ch-new-status');
  if (!newStatus) return;
  DB.update('cheques', id, { status: newStatus.value });
  closeModal();
  toast('Estado del cheque actualizado', 'success');
  renderCheques();
}

function saveCheque(id) {
  var type = document.getElementById('ch-type');
  var number = document.getElementById('ch-number');
  var bank = document.getElementById('ch-bank');
  var party = document.getElementById('ch-party');
  var date = document.getElementById('ch-date');
  var due = document.getElementById('ch-due');
  var amount = document.getElementById('ch-amount');
  var currency = document.getElementById('ch-currency');
  var status = document.getElementById('ch-status');
  var project = document.getElementById('ch-project');
  var notes = document.getElementById('ch-notes');

  if (!number || !number.value.trim()) { toast('Ingrese el numero de cheque', 'error'); return; }
  if (!amount || !amount.value) { toast('Ingrese el monto', 'error'); return; }
  if (!date || !date.value) { toast('Ingrese la fecha de emision', 'error'); return; }

  var record = {
    type: type ? type.value : 'received',
    number: number.value.trim(),
    bank: bank ? bank.value.trim() : '',
    payee_or_drawer: party ? party.value.trim() : '',
    date: date.value,
    due_date: due ? due.value : '',
    amount: parseFloat(amount.value) || 0,
    currency: currency ? currency.value : 'ARS',
    status: status ? status.value : 'wallet',
    project_id: project ? project.value : '',
    notes: notes ? notes.value.trim() : '',
  };

  if (id) {
    DB.update('cheques', id, record);
    toast('Cheque actualizado', 'success');
  } else {
    DB.insert('cheques', record);
    toast('Cheque registrado', 'success');
  }

  closeModal();
  renderCheques();
}

function deleteCheque(id) {
  confirmDialog('Eliminar este cheque?', function() {
    DB.remove('cheques', id);
    toast('Cheque eliminado', 'success');
    renderCheques();
  });
}

// =====================================================================
// CUENTAS BANCARIAS Y CAJAS
// Collections: 'bankAccounts', 'bankMovements'
// (bankMovements fallback to 'treasuryTx' for seeded movement data)
// =====================================================================

var _bancosState = { tab: 'cuentas', selectedAccount: null };

function renderCuentasBanco() {
  var accounts = DB.getAll('bankAccounts');
  var movements = DB.getAll('bankMovements');
  // Fallback: also check treasuryTx for legacy movement data
  var treasuryTx = DB.getAll('treasuryTx');

  document.getElementById('content').innerHTML =
    '<div class="page-header">' +
      '<div>' +
        '<div class="page-title"><i class="fas fa-landmark" style="margin-right:8px;color:var(--primary)"></i>Cuentas Bancarias y Cajas</div>' +
        '<div class="page-subtitle">Saldos, movimientos y conciliacion bancaria</div>' +
      '</div>' +
      '<div class="page-actions">' +
        '<button class="btn btn-secondary" onclick="openBankAccountForm()">' +
          '<i class="fas fa-plus"></i> Nueva Cuenta' +
        '</button>' +
      '</div>' +
    '</div>' +

    '<div id="bancos-tabs" class="tabs-container">' +
      '<div class="tabs-header">' +
        '<button class="tab-btn active" data-tab="tab-ba-cuentas" onclick="baSetTab(\'cuentas\')">Cuentas y Saldos</button>' +
        '<button class="tab-btn" data-tab="tab-ba-movimientos" onclick="baSetTab(\'movimientos\')">Movimientos</button>' +
      '</div>' +
      '<div id="tab-ba-cuentas" class="tab-content active"></div>' +
      '<div id="tab-ba-movimientos" class="tab-content"></div>' +
    '</div>';

  baRenderTabCuentas(accounts, movements, treasuryTx);
  baRenderTabMovimientos(accounts, movements, treasuryTx);
}

function baCalcBalance(account, movements, treasuryTx) {
  // Use bankMovements if available, fallback to treasuryTx
  var mvts = movements.filter(function(m) { return m.account_id === account.id; });
  var mvtSum = mvts.reduce(function(s, m) {
    return s + (m.type === 'credit' ? (m.amount || 0) : -(m.amount || 0));
  }, 0);

  // Also add treasury transactions as fallback
  var txSum = 0;
  if (treasuryTx && treasuryTx.length) {
    var txs = treasuryTx.filter(function(t) { return t.account_id === account.id; });
    txSum = txs.reduce(function(s, t) {
      return s + (t.type === 'income' ? (t.amount || 0) : -(t.amount || 0));
    }, 0);
  }

  // If we have bankMovements use those, otherwise use treasuryTx
  var delta = mvts.length > 0 ? mvtSum : txSum;
  return (account.initial_balance || 0) + delta;
}

function baRenderTabCuentas(accounts, movements, treasuryTx) {
  var panel = document.getElementById('tab-ba-cuentas');
  if (!panel) return;

  var typeLabels = { checking: 'Cuenta Corriente', savings: 'Caja de Ahorro', cash: 'Caja / Efectivo' };
  var typeIcons = { checking: 'fa-building-columns', savings: 'fa-piggy-bank', cash: 'fa-cash-register' };

  if (!accounts.length) {
    panel.innerHTML = '<div class="empty-state"><i class="fas fa-landmark"></i><p>No hay cuentas registradas</p><button class="btn btn-primary" onclick="openBankAccountForm()">Agregar Cuenta</button></div>';
    return;
  }

  var totalARS = 0;
  var totalUSD = 0;
  var cards = '';

  accounts.forEach(function(acc) {
    var balance = baCalcBalance(acc, movements, treasuryTx);
    if (acc.currency === 'USD') totalUSD += balance;
    else totalARS += balance;

    var balanceColor = balance >= 0 ? 'var(--success)' : 'var(--danger)';
    var icon = typeIcons[acc.type] || 'fa-building-columns';
    var typeLabel = typeLabels[acc.type] || acc.type;

    // Count movements
    var mvtCount = movements.filter(function(m) { return m.account_id === acc.id; }).length;
    var txCount = treasuryTx.filter(function(t) { return t.account_id === acc.id; }).length;
    var totalMvts = mvtCount + txCount;

    cards +=
      '<div class="card">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">' +
          '<div style="font-size:28px;color:var(--primary)"><i class="fas ' + icon + '"></i></div>' +
          '<div style="display:flex;gap:6px">' +
            '<span class="badge badge-gray">' + typeLabel + '</span>' +
            '<span class="badge badge-blue">' + (acc.currency || 'ARS') + '</span>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px">' + acc.name + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">' + acc.bank + '</div>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;font-family:monospace">' + acc.account_number + '</div>' +
        '<div style="font-size:22px;font-weight:800;color:' + balanceColor + ';margin-bottom:12px">' +
          fmtMoney(balance) +
        '</div>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">' +
          'Saldo inicial: ' + fmtMoney(acc.initial_balance || 0) +
          ' &bull; ' + totalMvts + ' movimientos' +
        '</div>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="btn btn-sm btn-primary" onclick="openBankMovementForm(\'' + acc.id + '\')">' +
            '<i class="fas fa-plus"></i> Movimiento' +
          '</button>' +
          '<button class="btn btn-sm btn-secondary" onclick="baShowAccountMovements(\'' + acc.id + '\')">' +
            '<i class="fas fa-list"></i> Ver' +
          '</button>' +
          '<button class="btn btn-sm btn-secondary" onclick="openBankAccountForm(\'' + acc.id + '\')">' +
            '<i class="fas fa-edit"></i>' +
          '</button>' +
          '<button class="btn btn-sm" style="color:var(--danger)" onclick="deleteBankAccount(\'' + acc.id + '\')">' +
            '<i class="fas fa-trash"></i>' +
          '</button>' +
        '</div>' +
      '</div>';
  });

  var summary =
    '<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">' +
      '<div class="stat-card">' +
        '<div class="stat-icon blue"><i class="fas fa-wallet"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalARS) + '</div>' +
        '<div class="stat-label">Total ARS</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon green"><i class="fas fa-dollar-sign"></i></div>' +
        '<div><div class="stat-value">' + fmtMoney(totalUSD) + '</div>' +
        '<div class="stat-label">Total USD</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon yellow"><i class="fas fa-landmark"></i></div>' +
        '<div><div class="stat-value">' + accounts.length + '</div>' +
        '<div class="stat-label">Cuentas Activas</div></div>' +
      '</div>' +
    '</div>';

  panel.innerHTML = summary + '<div class="grid grid-3">' + cards + '</div>' +
    '<div id="ba-account-detail" style="margin-top:20px"></div>';
}

function baRenderTabMovimientos(accounts, movements, treasuryTx) {
  var panel = document.getElementById('tab-ba-movimientos');
  if (!panel) return;

  // Combine bankMovements + treasuryTx
  var allMovements = [];

  movements.forEach(function(m) {
    var acc = accounts.find(function(a) { return a.id === m.account_id; });
    allMovements.push({
      date: m.date,
      account: acc ? acc.name : m.account_id,
      type: m.type === 'credit' ? 'Credito' : 'Debito',
      concept: m.concept || '-',
      ref: m.reference || '-',
      amount: m.amount || 0,
      sign: m.type === 'credit' ? 1 : -1,
    });
  });

  treasuryTx.forEach(function(t) {
    var acc = accounts.find(function(a) { return a.id === t.account_id; });
    allMovements.push({
      date: t.date,
      account: acc ? acc.name : t.account_id,
      type: t.type === 'income' ? 'Ingreso' : 'Egreso',
      concept: t.description || t.category || '-',
      ref: t.reference || '-',
      amount: t.amount || 0,
      sign: t.type === 'income' ? 1 : -1,
    });
  });

  allMovements.sort(function(a, b) { return b.date.localeCompare(a.date); });

  var rows = '';
  allMovements.forEach(function(m) {
    var isCredit = m.sign > 0;
    var typeBadge = isCredit
      ? '<span class="badge badge-green">' + m.type + '</span>'
      : '<span class="badge badge-red">' + m.type + '</span>';
    rows +=
      '<tr>' +
        '<td>' + fmtDate(m.date) + '</td>' +
        '<td style="font-size:12px">' + m.account + '</td>' +
        '<td>' + typeBadge + '</td>' +
        '<td>' + m.concept + '</td>' +
        '<td>' + m.ref + '</td>' +
        '<td class="number-cell" style="color:' + (isCredit ? 'var(--success)' : 'var(--danger)') + '">' +
          (isCredit ? '+' : '-') + fmtMoney(m.amount) +
        '</td>' +
      '</tr>';
  });

  if (!rows) {
    rows = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-exchange-alt"></i><p>Sin movimientos registrados</p></div></td></tr>';
  }

  panel.innerHTML =
    '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border)">' +
        '<strong>Todos los Movimientos</strong>' +
        '<button class="btn btn-primary btn-sm" onclick="openBankMovementForm(\'\')">' +
          '<i class="fas fa-plus"></i> Registrar Movimiento' +
        '</button>' +
      '</div>' +
      '<div class="card-body" style="padding:0">' +
        '<div class="table-wrap">' +
          '<table>' +
            '<thead><tr>' +
              '<th>Fecha</th><th>Cuenta</th><th>Tipo</th><th>Concepto</th><th>Referencia</th><th class="text-right">Monto</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function baShowAccountMovements(accountId) {
  var accounts = DB.getAll('bankAccounts');
  var movements = DB.getAll('bankMovements');
  var treasuryTx = DB.getAll('treasuryTx');

  var acc = accounts.find(function(a) { return a.id === accountId; });
  if (!acc) return;

  var allMovements = [];

  movements.filter(function(m) { return m.account_id === accountId; }).forEach(function(m) {
    allMovements.push({
      date: m.date, type: m.type === 'credit' ? 'Credito' : 'Debito',
      concept: m.concept || '-', ref: m.reference || '-',
      amount: m.amount || 0, sign: m.type === 'credit' ? 1 : -1,
    });
  });

  treasuryTx.filter(function(t) { return t.account_id === accountId; }).forEach(function(t) {
    allMovements.push({
      date: t.date, type: t.type === 'income' ? 'Ingreso' : 'Egreso',
      concept: t.description || t.category || '-', ref: t.reference || '-',
      amount: t.amount || 0, sign: t.type === 'income' ? 1 : -1,
    });
  });

  allMovements.sort(function(a, b) { return a.date.localeCompare(b.date); });

  var balance = acc.initial_balance || 0;
  var rows = '';
  allMovements.forEach(function(m) {
    balance += m.sign * m.amount;
    var isCredit = m.sign > 0;
    rows +=
      '<tr>' +
        '<td>' + fmtDate(m.date) + '</td>' +
        '<td>' + (isCredit ? '<span class="badge badge-green">' : '<span class="badge badge-red">') + m.type + '</span></td>' +
        '<td>' + m.concept + '</td>' +
        '<td>' + m.ref + '</td>' +
        '<td class="number-cell" style="color:' + (isCredit ? 'var(--success)' : 'var(--danger)') + '">' +
          (isCredit ? '+' : '-') + fmtMoney(m.amount) +
        '</td>' +
        '<td class="number-cell"><strong>' + fmtMoney(balance) + '</strong></td>' +
      '</tr>';
  });

  if (!rows) {
    rows = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-list"></i><p>Sin movimientos</p></div></td></tr>';
  }

  var panel = document.getElementById('ba-account-detail');
  if (!panel) {
    // We might be in the cuentas tab but detail div may not exist yet; try to append
    return;
  }

  panel.innerHTML =
    '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border)">' +
        '<strong style="font-size:15px">Movimientos: ' + acc.name + ' (' + acc.currency + ')</strong>' +
        '<button class="btn btn-sm btn-secondary" onclick="document.getElementById(\'ba-account-detail\').innerHTML=\'\'">Cerrar</button>' +
      '</div>' +
      '<div class="card-body" style="padding:0">' +
        '<div class="table-wrap">' +
          '<table>' +
            '<thead><tr>' +
              '<th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Ref.</th>' +
              '<th class="text-right">Monto</th><th class="text-right">Saldo</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>';

  // Scroll to detail
  panel.scrollIntoView({ behavior: 'smooth' });
}

function baSetTab(tab) {
  _bancosState.tab = tab;
  var tabs = ['cuentas', 'movimientos'];
  tabs.forEach(function(t) {
    var btn = document.querySelector('[data-tab="tab-ba-' + t + '"]');
    var panel = document.getElementById('tab-ba-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
    if (panel) panel.classList.toggle('active', t === tab);
  });
}

function openBankAccountForm(id) {
  var acc = id ? DB.getById('bankAccounts', id) : null;
  var isEdit = !!acc;

  var body =
    '<div class="form-grid grid-2">' +
      '<div class="form-group">' +
        '<label>Nombre de la Cuenta</label>' +
        '<input class="form-control" id="ba-name" type="text" value="' + (acc ? acc.name || '' : '') + '" placeholder="Cuenta Operativa Principal">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Banco / Entidad</label>' +
        '<input class="form-control" id="ba-bank" type="text" value="' + (acc ? acc.bank || '' : '') + '" placeholder="Banco Nacion Argentina">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Numero de Cuenta / CBU</label>' +
        '<input class="form-control" id="ba-accnum" type="text" value="' + (acc ? acc.account_number || '' : '') + '" placeholder="0110-0322-33-000000000-0">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Tipo</label>' +
        '<select class="form-control" id="ba-type">' +
          '<option value="checking"' + (!acc || acc.type === 'checking' ? ' selected' : '') + '>Cuenta Corriente</option>' +
          '<option value="savings"' + (acc && acc.type === 'savings' ? ' selected' : '') + '>Caja de Ahorro</option>' +
          '<option value="cash"' + (acc && acc.type === 'cash' ? ' selected' : '') + '>Caja / Efectivo</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Moneda</label>' +
        '<select class="form-control" id="ba-currency">' +
          '<option value="ARS"' + (!acc || acc.currency === 'ARS' ? ' selected' : '') + '>ARS - Pesos</option>' +
          '<option value="USD"' + (acc && acc.currency === 'USD' ? ' selected' : '') + '>USD - Dolares</option>' +
          '<option value="UYU"' + (acc && acc.currency === 'UYU' ? ' selected' : '') + '>UYU - Pesos Uruguayos</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Saldo Inicial</label>' +
        '<input class="form-control" id="ba-initial" type="number" min="0" step="0.01" value="' + (acc ? acc.initial_balance || 0 : 0) + '">' +
      '</div>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Notas</label>' +
      '<textarea class="form-control" id="ba-notes" rows="2">' + (acc ? acc.notes || '' : '') + '</textarea>' +
    '</div>';

  var footer =
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="saveBankAccount(\'' + (id || '') + '\')">' +
      (isEdit ? 'Guardar Cambios' : 'Crear Cuenta') +
    '</button>';

  openModal(isEdit ? 'Editar Cuenta' : 'Nueva Cuenta Bancaria / Caja', body, 'lg', footer);
}

function saveBankAccount(id) {
  var name = document.getElementById('ba-name');
  var bank = document.getElementById('ba-bank');
  var accnum = document.getElementById('ba-accnum');
  var type = document.getElementById('ba-type');
  var currency = document.getElementById('ba-currency');
  var initial = document.getElementById('ba-initial');
  var notes = document.getElementById('ba-notes');

  if (!name || !name.value.trim()) { toast('Ingrese el nombre de la cuenta', 'error'); return; }

  var record = {
    name: name.value.trim(),
    bank: bank ? bank.value.trim() : '',
    account_number: accnum ? accnum.value.trim() : '',
    type: type ? type.value : 'checking',
    currency: currency ? currency.value : 'ARS',
    initial_balance: parseFloat(initial ? initial.value : 0) || 0,
    notes: notes ? notes.value.trim() : '',
  };

  if (id) {
    DB.update('bankAccounts', id, record);
    toast('Cuenta actualizada', 'success');
  } else {
    DB.insert('bankAccounts', record);
    toast('Cuenta registrada', 'success');
  }

  closeModal();
  renderCuentasBanco();
}

function deleteBankAccount(id) {
  confirmDialog('Eliminar esta cuenta bancaria?', function() {
    DB.remove('bankAccounts', id);
    toast('Cuenta eliminada', 'success');
    renderCuentasBanco();
  });
}

function openBankMovementForm(accountId) {
  var accounts = DB.getAll('bankAccounts');

  var accOptions = '<option value="">-- Seleccionar cuenta --</option>';
  accounts.forEach(function(a) {
    accOptions += '<option value="' + a.id + '"' + (a.id === accountId ? ' selected' : '') + '>' + a.name + ' (' + a.currency + ')</option>';
  });

  var body =
    '<div class="form-grid grid-2">' +
      '<div class="form-group">' +
        '<label>Cuenta</label>' +
        '<select class="form-control" id="bm-account">' + accOptions + '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Fecha</label>' +
        '<input class="form-control" id="bm-date" type="date" value="' + todayStr() + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Tipo</label>' +
        '<select class="form-control" id="bm-type">' +
          '<option value="credit">Credito (ingreso)</option>' +
          '<option value="debit">Debito (egreso)</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Monto</label>' +
        '<input class="form-control" id="bm-amount" type="number" min="0" step="0.01" placeholder="0.00">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Concepto</label>' +
        '<input class="form-control" id="bm-concept" type="text" placeholder="Cobro factura / Pago proveedor...">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Referencia</label>' +
        '<input class="form-control" id="bm-ref" type="text" placeholder="N° de transferencia, cheque...">' +
      '</div>' +
    '</div>';

  var footer =
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="saveBankMovement()">Registrar Movimiento</button>';

  openModal('Registrar Movimiento Bancario', body, 'lg', footer);
}

function saveBankMovement() {
  var account = document.getElementById('bm-account');
  var date = document.getElementById('bm-date');
  var type = document.getElementById('bm-type');
  var amount = document.getElementById('bm-amount');
  var concept = document.getElementById('bm-concept');
  var ref = document.getElementById('bm-ref');

  if (!account || !account.value) { toast('Seleccione una cuenta', 'error'); return; }
  if (!amount || !amount.value) { toast('Ingrese el monto', 'error'); return; }
  if (!concept || !concept.value.trim()) { toast('Ingrese el concepto', 'error'); return; }

  var record = {
    account_id: account.value,
    date: date ? date.value : todayStr(),
    type: type ? type.value : 'credit',
    amount: parseFloat(amount.value) || 0,
    concept: concept.value.trim(),
    reference: ref ? ref.value.trim() : '',
  };

  DB.insert('bankMovements', record);
  toast('Movimiento registrado', 'success');
  closeModal();
  renderCuentasBanco();
}
