/* ===== VENCIMIENTOS FISCALES ===== */

var FISCAL_TYPE_CFG = {
  iva:   { label: 'IVA',        color: '#3b82f6', icon: 'fa-receipt'      },
  iibb:  { label: 'IIBB',       color: '#8b5cf6', icon: 'fa-building'     },
  gcias: { label: 'Ganancias',  color: '#f59e0b', icon: 'fa-landmark'     },
  sl:    { label: 'Sueldo',     color: '#10b981', icon: 'fa-users'        },
  otro:  { label: 'Otro',       color: '#6b7280', icon: 'fa-calendar-alt' },
};

// ── Alert engine (used by app.js notification panel) ───────────
function getFiscalAlerts() {
  var today    = todayStr();
  var d3       = _fiscalDateOffset(3);
  return DB.getAll('fiscalCalendar').filter(function(fc) {
    return !fc.dismissed && fc.due_date && fc.due_date <= d3;
  }).sort(function(a, b) { return a.due_date.localeCompare(b.due_date); });
}

function _fiscalDateOffset(days) {
  var d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function fiscalAlertBadge(fc) {
  var today = todayStr();
  if (fc.due_date < today)  return { label: 'VENCIDO',      color: '#ef4444', bg: '#fef2f2' };
  if (fc.due_date === today) return { label: 'Vence HOY',   color: '#ef4444', bg: '#fef2f2' };
  var diff = Math.round((new Date(fc.due_date) - new Date(today)) / 86400000);
  if (diff === 1) return { label: 'Vence mañana',           color: '#f59e0b', bg: '#fffbeb' };
  return              { label: 'Vence en ' + diff + ' días', color: '#3b82f6', bg: '#eff6ff' };
}

function dismissFiscalAlert(id) {
  DB.update('fiscalCalendar', id, { dismissed: true });
  updateNotifBadge();
  var panel = document.getElementById('notif-panel');
  if (panel && panel.style.display !== 'none') panel.innerHTML = buildNotifPanel();
}

// ── Render ──────────────────────────────────────────────────────
function renderVencimientos() {
  document.getElementById('content').innerHTML = _vencBuild();
}

function _vencBuild() {
  var all    = DB.getAll('fiscalCalendar').sort(function(a,b){ return a.due_date.localeCompare(b.due_date); });
  var today  = todayStr();
  var d30    = _fiscalDateOffset(30);
  var upcoming = all.filter(function(fc) { return fc.due_date >= today && !fc.dismissed; });
  var overdue  = all.filter(function(fc) { return fc.due_date < today && !fc.dismissed; });
  var done     = all.filter(function(fc) { return !!fc.dismissed; });

  function renderSection(title, icon, color, items) {
    if (!items.length) return '';
    return '<div style="margin-bottom:24px">' +
      '<h3 style="font-size:13px;font-weight:700;color:' + color + ';margin:0 0 10px;text-transform:uppercase;letter-spacing:.5px"><i class="fas ' + icon + '" style="margin-right:6px"></i>' + title + '</h3>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
      items.map(function(fc) {
        var cfg = FISCAL_TYPE_CFG[fc.type] || FISCAL_TYPE_CFG.otro;
        var badge = fiscalAlertBadge(fc);
        return '<div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:12px">' +
          '<div style="width:36px;height:36px;border-radius:8px;background:' + cfg.color + '1a;display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
            '<i class="fas ' + cfg.icon + '" style="color:' + cfg.color + ';font-size:15px"></i>' +
          '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:600;font-size:13px">' + escapeHtml(fc.name) + '</div>' +
            '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' +
              '<span style="background:' + cfg.color + '1a;color:' + cfg.color + ';padding:1px 7px;border-radius:8px;font-weight:600;margin-right:6px">' + cfg.label + '</span>' +
              fmtDate(fc.due_date) +
              (fc.notes ? '<span style="margin-left:8px;opacity:.7">— ' + escapeHtml(fc.notes) + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<span style="background:' + badge.bg + ';color:' + badge.color + ';font-size:10px;font-weight:700;padding:3px 9px;border-radius:10px;white-space:nowrap;flex-shrink:0">' + badge.label + '</span>' +
          '<div style="display:flex;gap:4px;flex-shrink:0">' +
            '<button class="btn btn-sm btn-secondary" onclick="openFiscalForm(\'' + fc.id + '\')" title="Editar"><i class="fas fa-edit"></i></button>' +
            (!fc.dismissed
              ? '<button class="btn btn-sm" style="color:#10b981" onclick="fiscalMarkDone(\'' + fc.id + '\')" title="Marcar como cumplido"><i class="fas fa-check"></i></button>'
              : '') +
            '<button class="btn btn-sm" style="color:var(--danger)" onclick="deleteFiscalDate(\'' + fc.id + '\')" title="Eliminar"><i class="fas fa-trash"></i></button>' +
          '</div>' +
        '</div>';
      }).join('') +
      '</div></div>';
  }

  var empty = !upcoming.length && !overdue.length
    ? '<div style="text-align:center;padding:48px;color:var(--text-muted)"><i class="fas fa-calendar-check" style="font-size:36px;opacity:.25;display:block;margin-bottom:14px"></i>Sin vencimientos cargados.<br><small>Agregá fechas fiscales para recibir alertas automáticas.</small></div>'
    : '';

  return '<div style="padding-bottom:32px">' +
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">' +
      '<h2 style="margin:0;font-size:18px;font-weight:700"><i class="fas fa-calendar-exclamation" style="color:var(--primary);margin-right:8px"></i>Vencimientos Fiscales</h2>' +
      '<button class="btn btn-primary" style="margin-left:auto" onclick="openFiscalForm()"><i class="fas fa-plus"></i> Nueva fecha</button>' +
    '</div>' +
    _vencQuickDates() +
    renderSection('Vencidos', 'fa-exclamation-triangle', '#ef4444', overdue.filter(function(fc){ return fc.due_date < today; })) +
    renderSection('Próximos vencimientos', 'fa-clock', '#f59e0b', upcoming) +
    (done.length ? '<details style="margin-top:8px"><summary style="cursor:pointer;font-size:12px;color:var(--text-muted);padding:4px 0">' + done.length + ' vencimiento(s) cumplido(s)</summary>' +
      '<div style="margin-top:8px;opacity:.6">' + renderSection('Cumplidos', 'fa-check-circle', '#10b981', done) + '</div></details>' : '') +
    empty +
  '</div>';
}

// ── Quick-add common fiscal dates for Argentina ─────────────────
function _vencQuickDates() {
  var today = new Date();
  var y = today.getFullYear();
  var m = today.getMonth(); // 0-indexed
  // Next month for IVA
  var nm = (m + 1) % 12;
  var ny = m === 11 ? y + 1 : y;
  var nmStr = String(ny) + '-' + String(nm + 1).padStart(2,'0');

  return '<div style="background:var(--bg-secondary,#f8fafc);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:20px">' +
    '<div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:10px">AGREGAR RÁPIDO — Argentina</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      _quickBtn('IVA RI (' + nmStr + ')',    'iva',   nmStr + '-20', 'Vencimiento IVA mes ' + nmStr) +
      _quickBtn('IIBB CABA (' + nmStr + ')', 'iibb',  nmStr + '-22', 'IIBB Ciudad Autónoma') +
      _quickBtn('Sueldo',                    'sl',    _lastDayOfMonth(y, m) , 'Pago haberes') +
      _quickBtn('Ganancias anual',           'gcias', y + '-06-30',  'Declaración anual') +
    '</div>' +
  '</div>';
}

function _quickBtn(label, type, date, notes) {
  // Only show if not already added for this date
  var exists = DB.getAll('fiscalCalendar').some(function(fc) { return fc.due_date === date && fc.type === type; });
  if (exists) return '';
  return '<button class="btn btn-sm btn-secondary" onclick="_fiscalQuickAdd(' +
    JSON.stringify(label) + ',' + JSON.stringify(type) + ',' + JSON.stringify(date) + ',' + JSON.stringify(notes) +
    ')">' + label + '</button>';
}

function _fiscalQuickAdd(name, type, due_date, notes) {
  DB.insert('fiscalCalendar', { name: name, type: type, due_date: due_date, notes: notes, dismissed: false });
  toast('Fecha agregada', 'success');
  updateNotifBadge();
  renderVencimientos();
}

function _lastDayOfMonth(y, m) {
  return new Date(y, m + 1, 0).toISOString().split('T')[0];
}

// ── CRUD ────────────────────────────────────────────────────────
function openFiscalForm(id) {
  var fc = id ? DB.getById('fiscalCalendar', id) : null;
  var typeOpts = Object.keys(FISCAL_TYPE_CFG).map(function(k) {
    var c = FISCAL_TYPE_CFG[k];
    return '<option value="' + k + '"' + (fc && fc.type === k ? ' selected' : '') + '>' + c.label + '</option>';
  }).join('');

  openModal(
    (fc ? 'Editar' : 'Nueva') + ' fecha fiscal',
    '<div style="display:flex;flex-direction:column;gap:14px">' +
      '<div><label class="form-label">Nombre / descripción *</label>' +
        '<input id="fc-name" class="form-control" value="' + escapeHtml((fc && fc.name) || '') + '" placeholder="Ej: IVA Responsable Inscripto Mayo"></div>' +
      '<div style="display:flex;gap:12px">' +
        '<div style="flex:1"><label class="form-label">Tipo</label><select id="fc-type" class="form-control">' + typeOpts + '</select></div>' +
        '<div style="flex:1"><label class="form-label">Fecha de vencimiento *</label><input id="fc-date" type="date" class="form-control" value="' + ((fc && fc.due_date) || '') + '"></div>' +
      '</div>' +
      '<div><label class="form-label">Notas</label><input id="fc-notes" class="form-control" value="' + escapeHtml((fc && fc.notes) || '') + '" placeholder="Opcional"></div>' +
    '</div>',
    '',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="saveFiscalDate(' + (id ? '\'' + id + '\'' : 'null') + ')">Guardar</button>'
  );
}

function saveFiscalDate(id) {
  var name     = document.getElementById('fc-name').value.trim();
  var type     = document.getElementById('fc-type').value;
  var due_date = document.getElementById('fc-date').value;
  var notes    = document.getElementById('fc-notes').value.trim();
  if (!name || !due_date) { toast('Nombre y fecha son obligatorios', 'error'); return; }
  if (id) {
    DB.update('fiscalCalendar', id, { name: name, type: type, due_date: due_date, notes: notes });
    toast('Fecha actualizada', 'success');
  } else {
    DB.insert('fiscalCalendar', { name: name, type: type, due_date: due_date, notes: notes, dismissed: false });
    toast('Fecha agregada', 'success');
  }
  closeModal();
  updateNotifBadge();
  if (window.APP_STATE.currentModule === 'vencimientos') renderVencimientos();
}

function fiscalMarkDone(id) {
  DB.update('fiscalCalendar', id, { dismissed: true });
  toast('Marcado como cumplido', 'success');
  updateNotifBadge();
  renderVencimientos();
}

function deleteFiscalDate(id) {
  confirmDialog('¿Eliminar esta fecha fiscal?', function() {
    DB.remove('fiscalCalendar', id);
    toast('Fecha eliminada', 'warning');
    updateNotifBadge();
    renderVencimientos();
  });
}
