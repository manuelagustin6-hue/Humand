/* ===== GESTIÓN DE OBRA: RFIs y Submittals (estilo Procore) =====
   Registro + ficha por ítem + workflow de estados + responsable (ball-in-court)
   + vencimientos + hilo de comunicación (comentarios y cambios de estado).
   Por proyecto (respeta el filtro de proyecto del header) y por empresa.        */

var RFI_STATUS = {
  open:     { label: 'Abierto',    cls: 'badge-yellow' },
  answered: { label: 'Respondido', cls: 'badge-blue' },
  closed:   { label: 'Cerrado',    cls: 'badge-green' },
};
var SUB_STATUS = {
  draft:             { label: 'Borrador',           cls: 'badge-gray' },
  submitted:         { label: 'Enviado',            cls: 'badge-blue' },
  under_review:      { label: 'En revisión',        cls: 'badge-yellow' },
  approved:          { label: 'Aprobado',           cls: 'badge-green' },
  approved_as_noted: { label: 'Aprobado c/obs.',    cls: 'badge-green' },
  revise_resubmit:   { label: 'Revisar y reenviar', cls: 'badge-yellow' },
  rejected:          { label: 'Rechazado',          cls: 'badge-red' },
  closed:            { label: 'Cerrado',            cls: 'badge-gray' },
};
var OD_PRIORITY = { low: 'Baja', normal: 'Normal', high: 'Alta', urgent: 'Urgente' };
var SUB_TYPES = ['Plano de taller', 'Ficha técnica', 'Muestra', 'Certificado', 'Cálculo', 'Manual O&M', 'Otro'];

// ---- helpers compartidos ----
function _odMe() {
  var u = window.APP_STATE && window.APP_STATE.currentUser;
  return u ? { id: u.id, name: u.name || u.email || 'Usuario' } : { id: '', name: 'Sistema' };
}
function _odUserOptions(sel) {
  return '<option value="">— Sin asignar —</option>' + DB.getAll('users').filter(function(u){ return u.active; })
    .map(function(u){ return '<option value="' + u.id + '"' + (sel === u.id ? ' selected' : '') + '>' + escapeHtml(u.name || u.email) + '</option>'; }).join('');
}
function _odUserName(id) { var u = id ? DB.getById('users', id) : null; return u ? (u.name || u.email) : '—'; }
function _odProjName(id) { var p = id ? DB.getById('projects', id) : null; return p ? p.name : '—'; }
function _odProjectOptions(sel) {
  var hdr = window.APP_STATE && window.APP_STATE.activeProject;
  return DB.getAll('projects').map(function(p){ return '<option value="' + p.id + '"' + ((sel || hdr) === p.id ? ' selected' : '') + '>' + escapeHtml(p.name) + '</option>'; }).join('');
}
function _odNextNum(collection, prefix) {
  var pre = prefix + '-' + new Date().getFullYear() + '-', max = 0;
  DB.getAll(collection).forEach(function(r){ var n = (r.number || ''); if (n.indexOf(pre) === 0) { var v = parseInt(n.slice(pre.length), 10); if (!isNaN(v) && v > max) max = v; } });
  return pre + String(max + 1).padStart(3, '0');
}
function _odWhen(iso) { try { return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch(e) { return iso || ''; } }
function _odOverdue(item, openStates) {
  if (!item.due_date) return false;
  return openStates.indexOf(item.status) !== -1 && item.due_date < todayStr();
}
function _odDueCell(item, openStates) {
  if (!item.due_date) return '<span style="color:var(--text-muted)">—</span>';
  var over = _odOverdue(item, openStates);
  return '<span style="' + (over ? 'color:var(--danger);font-weight:700' : '') + '">' + fmtDate(item.due_date) + (over ? ' ⚠' : '') + '</span>';
}

// ---- HILO DE COMUNICACIÓN (compartido) ----
function _odThreadHtml(collection, item) {
  var comments = (item.comments || []);
  var rows = comments.length ? comments.map(function(c){
    var sys = !!c.system;
    var initial = escapeHtml((c.author || '?').charAt(0).toUpperCase());
    return '<div style="display:flex;gap:10px;margin-bottom:12px">' +
      '<div style="width:30px;height:30px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;' +
        (sys ? 'background:var(--bg);color:var(--text-muted)' : 'background:var(--primary);color:#fff') + '">' +
        (sys ? '<i class="fas fa-gear"></i>' : initial) + '</div>' +
      '<div style="flex:1">' +
        '<div style="font-size:11px;color:var(--text-muted)"><strong style="color:var(--text)">' + escapeHtml(c.author || '—') + '</strong> · ' + _odWhen(c.date) + '</div>' +
        '<div style="font-size:13px;' + (sys ? 'color:var(--text-muted);font-style:italic' : '') + '">' + escapeHtml(c.text || '') + '</div>' +
      '</div></div>';
  }).join('') : '<div style="color:var(--text-muted);font-size:13px;padding:6px 0">Sin mensajes todavía.</div>';
  return '<div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin:6px 0 10px"><i class="fas fa-comments" style="margin-right:6px;color:var(--primary)"></i>Canal de comunicación</div>' +
    '<div style="max-height:280px;overflow-y:auto">' + rows + '</div>' +
    '<div style="display:flex;gap:8px;margin-top:12px">' +
      '<input class="form-control" id="od-comment-input" placeholder="Escribí un mensaje…" onkeydown="if(event.key===\'Enter\')odPostComment(\'' + collection + '\',\'' + item.id + '\')">' +
      '<button class="btn btn-primary" onclick="odPostComment(\'' + collection + '\',\'' + item.id + '\')"><i class="fas fa-paper-plane"></i></button>' +
    '</div>';
}
function _odAppendComment(item, text, system) {
  var me = _odMe();
  var comments = (item.comments || []).slice();
  comments.push({ id: uuid(), author: me.name, author_id: me.id, text: text, date: new Date().toISOString(), system: !!system });
  return comments;
}
function odPostComment(collection, id) {
  var el = document.getElementById('od-comment-input');
  var text = (el && el.value || '').trim();
  if (!text) return;
  var item = DB.getById(collection, id); if (!item) return;
  DB.update(collection, id, { comments: _odAppendComment(item, text, false) });
  if (collection === 'rfis') viewRFI(id); else viewSubmittal(id);
}

// ============================================================================
//  RFIs  (Requests for Information)
// ============================================================================
var RFI_OPEN_STATES = ['open'];

function renderRFIs() {
  var rfis = filterByActiveProject(DB.getAll('rfis'));
  var open = rfis.filter(function(r){ return r.status === 'open'; }).length;
  var overdue = rfis.filter(function(r){ return _odOverdue(r, RFI_OPEN_STATES); }).length;
  var answered = rfis.filter(function(r){ return r.status === 'answered'; }).length;

  document.getElementById('content').innerHTML =
    '<div class="page-header"><div>' +
      '<div class="page-title"><i class="fas fa-circle-question" style="margin-right:8px;color:var(--primary)"></i>RFIs</div>' +
      '<div class="page-subtitle">Consultas / pedidos de información con seguimiento y canal de comunicación</div>' +
    '</div><div class="page-actions">' +
      '<button class="btn btn-primary" onclick="openRFIForm()"><i class="fas fa-plus"></i> Nuevo RFI</button>' +
    '</div></div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:14px">' +
      _odKpi('Abiertos', open, 'var(--warning,#f59e0b)') +
      _odKpi('Vencidos', overdue, 'var(--danger,#ef4444)') +
      _odKpi('Respondidos', answered, 'var(--primary)') +
      _odKpi('Total', rfis.length, 'var(--text-muted)') +
    '</div>' +
    '<div class="card"><div class="table-wrap"><table class="table"><thead><tr>' +
      '<th>N°</th><th>Asunto</th><th>Proyecto</th><th>Responsable</th><th>Vence</th><th>Prioridad</th><th>Estado</th>' +
    '</tr></thead><tbody>' +
    (rfis.length ? rfis.slice().sort(_odSortByDue).map(function(r){
      return '<tr style="cursor:pointer" onclick="viewRFI(\'' + r.id + '\')">' +
        '<td><strong>' + escapeHtml(r.number || '') + '</strong></td>' +
        '<td>' + escapeHtml(r.subject || '(sin asunto)') + '</td>' +
        '<td style="font-size:12px">' + escapeHtml(_odProjName(r.project_id)) + '</td>' +
        '<td style="font-size:12px">' + escapeHtml(_odUserName(r.assignee)) + '</td>' +
        '<td>' + _odDueCell(r, RFI_OPEN_STATES) + '</td>' +
        '<td>' + (OD_PRIORITY[r.priority] || 'Normal') + '</td>' +
        '<td><span class="badge ' + (RFI_STATUS[r.status] ? RFI_STATUS[r.status].cls : 'badge-gray') + '">' + (RFI_STATUS[r.status] ? RFI_STATUS[r.status].label : r.status) + '</span></td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">No hay RFIs. Creá el primero.</td></tr>') +
    '</tbody></table></div></div>';
}

function _odKpi(label, value, color) {
  return '<div class="card" style="padding:12px 18px;min-width:110px">' +
    '<div style="font-size:22px;font-weight:800;color:' + color + '">' + value + '</div>' +
    '<div style="font-size:12px;color:var(--text-muted)">' + label + '</div></div>';
}
function _odSortByDue(a, b) {
  var ao = a.status === 'open' || a.status === 'submitted' || a.status === 'under_review';
  var bo = b.status === 'open' || b.status === 'submitted' || b.status === 'under_review';
  if (ao !== bo) return ao ? -1 : 1;
  return (a.due_date || '9999').localeCompare(b.due_date || '9999');
}

function openRFIForm(id) {
  if (!requireEdit('rfis')) return;
  var r = id ? DB.getById('rfis', id) : null;
  DB.markEdit('rfis', id);
  openModal(r ? 'Editar RFI ' + (r.number || '') : 'Nuevo RFI',
    '<div class="form-grid form-grid-2">' +
      '<div class="form-group full"><label class="form-label">Asunto *</label>' +
        '<input class="form-control" id="rfi-subject" value="' + (r ? escapeHtml(r.subject || '') : '') + '" placeholder="Ej: Detalle de encuentro losa-columna eje 3"></div>' +
      '<div class="form-group"><label class="form-label">Proyecto *</label>' +
        '<select class="form-control" id="rfi-project">' + _odProjectOptions(r && r.project_id) + '</select></div>' +
      '<div class="form-group"><label class="form-label">Disciplina / Área</label>' +
        '<input class="form-control" id="rfi-area" value="' + (r ? escapeHtml(r.area || '') : '') + '" placeholder="Estructura, Instalaciones…"></div>' +
      '<div class="form-group"><label class="form-label">Responsable (ball-in-court)</label>' +
        '<select class="form-control" id="rfi-assignee">' + _odUserOptions(r && r.assignee) + '</select></div>' +
      '<div class="form-group"><label class="form-label">Vencimiento</label>' +
        '<input class="form-control" id="rfi-due" type="date" value="' + (r ? (r.due_date || '') : addDays(todayStr(), 7)) + '"></div>' +
      '<div class="form-group"><label class="form-label">Prioridad</label>' +
        '<select class="form-control" id="rfi-priority">' + Object.keys(OD_PRIORITY).map(function(k){ return '<option value="' + k + '"' + ((r ? r.priority : 'normal') === k ? ' selected' : '') + '>' + OD_PRIORITY[k] + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-group full"><label class="form-label">Consulta *</label>' +
        '<textarea class="form-control" id="rfi-question" rows="4" placeholder="Describí la consulta…">' + (r ? escapeHtml(r.question || '') : '') + '</textarea></div>' +
    '</div>',
    '', '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
        '<button class="btn btn-primary" onclick="saveRFI(\'' + (id || '') + '\')"><i class="fas fa-save"></i> Guardar</button>');
}

function saveRFI(id) {
  if (!requireEdit('rfis')) return;
  var subject = document.getElementById('rfi-subject').value.trim();
  var question = document.getElementById('rfi-question').value.trim();
  var projectId = document.getElementById('rfi-project').value;
  if (!subject || !question) { toast('Asunto y consulta son obligatorios', 'error'); return; }
  if (!projectId) { toast('Elegí un proyecto', 'error'); return; }
  var data = {
    subject: subject, question: question, project_id: projectId,
    company_id: DB._companyId,
    area: document.getElementById('rfi-area').value.trim(),
    assignee: document.getElementById('rfi-assignee').value || '',
    due_date: document.getElementById('rfi-due').value || '',
    priority: document.getElementById('rfi-priority').value || 'normal',
  };
  if (id) {
    var _r = DB.update('rfis', id, data, { expectRev: DB.takeEditExpect('rfis', id) });
    if (_r && _r.__conflict) return;
    toast('RFI actualizado', 'success');
  } else {
    data.number = _odNextNum('rfis', 'RFI');
    data.status = 'open';
    data.date = todayStr();
    data.created_by = _odMe().name;
    data.comments = [{ id: uuid(), author: _odMe().name, author_id: _odMe().id, text: 'RFI creado.', date: new Date().toISOString(), system: true }];
    DB.insert('rfis', data);
    toast('RFI creado', 'success');
  }
  closeModal();
  renderRFIs();
}

function viewRFI(id) {
  var r = DB.getById('rfis', id); if (!r) return;
  var st = RFI_STATUS[r.status] || { label: r.status, cls: 'badge-gray' };
  var over = _odOverdue(r, RFI_OPEN_STATES);
  var canE = canEdit('rfis');
  var actions = '';
  if (canE) {
    if (r.status === 'open')      actions = '<button class="btn btn-primary btn-sm" onclick="rfiAnswer(\'' + id + '\')"><i class="fas fa-reply"></i> Responder</button>';
    else if (r.status === 'answered') actions = '<button class="btn btn-success btn-sm" onclick="rfiSetStatus(\'' + id + '\',\'closed\')"><i class="fas fa-check"></i> Cerrar</button>' +
                                               '<button class="btn btn-secondary btn-sm" onclick="rfiSetStatus(\'' + id + '\',\'open\')">Reabrir</button>';
    else if (r.status === 'closed')   actions = '<button class="btn btn-secondary btn-sm" onclick="rfiSetStatus(\'' + id + '\',\'open\')">Reabrir</button>';
    actions += ' <button class="btn btn-ghost btn-sm" onclick="openRFIForm(\'' + id + '\')"><i class="fas fa-edit"></i></button>';
    actions += ' <button class="btn btn-ghost btn-sm danger" onclick="odDelete(\'rfis\',\'' + id + '\')"><i class="fas fa-trash"></i></button>';
  }
  var body =
    '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px">' +
      '<span class="badge ' + st.cls + '">' + st.label + '</span>' +
      (over ? '<span class="badge badge-red">Vencido</span>' : '') +
      '<span style="color:var(--text-muted);font-size:12px">' + escapeHtml(_odProjName(r.project_id)) + (r.area ? ' · ' + escapeHtml(r.area) : '') + '</span>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;font-size:13px">' +
      _odField('Responsable', _odUserName(r.assignee)) +
      _odField('Vence', r.due_date ? fmtDate(r.due_date) : '—') +
      _odField('Prioridad', OD_PRIORITY[r.priority] || 'Normal') +
    '</div>' +
    '<div style="background:var(--bg);border-radius:8px;padding:12px;margin-bottom:12px">' +
      '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Consulta</div>' +
      '<div style="font-size:13px;white-space:pre-wrap">' + escapeHtml(r.question || '') + '</div></div>' +
    (r.answer ? '<div style="background:color-mix(in srgb,var(--success) 8%,transparent);border-radius:8px;padding:12px;margin-bottom:12px">' +
      '<div style="font-size:11px;font-weight:700;color:var(--success);text-transform:uppercase;margin-bottom:4px">Respuesta</div>' +
      '<div style="font-size:13px;white-space:pre-wrap">' + escapeHtml(r.answer) + '</div></div>' : '') +
    (actions ? '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">' + actions + '</div>' : '') +
    '<div class="divider" style="margin:10px 0"></div>' +
    _odThreadHtml('rfis', r);
  openModal('RFI ' + (r.number || ''), body, 'modal-md',
    '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
}

function _odField(label, val) {
  return '<div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.3px">' + label + '</div><div style="font-weight:600">' + escapeHtml(val) + '</div></div>';
}

function rfiAnswer(id) {
  if (!requireEdit('rfis')) return;
  var r = DB.getById('rfis', id); if (!r) return;
  openModal('Responder RFI ' + (r.number || ''),
    '<div class="form-group"><label class="form-label">Respuesta *</label>' +
      '<textarea class="form-control" id="rfi-answer" rows="5" placeholder="Escribí la respuesta…">' + escapeHtml(r.answer || '') + '</textarea></div>',
    '', '<button class="btn btn-secondary" onclick="viewRFI(\'' + id + '\')">Cancelar</button>' +
        '<button class="btn btn-primary" onclick="rfiSaveAnswer(\'' + id + '\')"><i class="fas fa-check"></i> Guardar respuesta</button>');
}
function rfiSaveAnswer(id) {
  if (!requireEdit('rfis')) return;
  var r = DB.getById('rfis', id); if (!r) return;
  var ans = document.getElementById('rfi-answer').value.trim();
  if (!ans) { toast('Escribí la respuesta', 'error'); return; }
  var comments = _odAppendComment(r, 'Respondió el RFI.', true);
  DB.update('rfis', id, { answer: ans, status: 'answered', answered_date: todayStr(), comments: comments });
  toast('RFI respondido', 'success');
  viewRFI(id);
}
function rfiSetStatus(id, status) {
  if (!requireEdit('rfis')) return;
  var r = DB.getById('rfis', id); if (!r) return;
  var comments = _odAppendComment(r, 'Estado → ' + (RFI_STATUS[status] ? RFI_STATUS[status].label : status) + '.', true);
  DB.update('rfis', id, { status: status, comments: comments });
  viewRFI(id);
}

// ============================================================================
//  SUBMITTALS
// ============================================================================
var SUB_OPEN_STATES = ['draft', 'submitted', 'under_review', 'revise_resubmit'];

function renderSubmittals() {
  var subs = filterByActiveProject(DB.getAll('submittals'));
  var open = subs.filter(function(s){ return SUB_OPEN_STATES.indexOf(s.status) !== -1; }).length;
  var overdue = subs.filter(function(s){ return _odOverdue(s, SUB_OPEN_STATES); }).length;
  var approved = subs.filter(function(s){ return s.status === 'approved' || s.status === 'approved_as_noted'; }).length;

  document.getElementById('content').innerHTML =
    '<div class="page-header"><div>' +
      '<div class="page-title"><i class="fas fa-file-lines" style="margin-right:8px;color:var(--primary)"></i>Submittals</div>' +
      '<div class="page-subtitle">Documentación técnica para aprobación, con revisiones y canal de comunicación</div>' +
    '</div><div class="page-actions">' +
      '<button class="btn btn-primary" onclick="openSubmittalForm()"><i class="fas fa-plus"></i> Nuevo Submittal</button>' +
    '</div></div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:14px">' +
      _odKpi('En proceso', open, 'var(--warning,#f59e0b)') +
      _odKpi('Vencidos', overdue, 'var(--danger,#ef4444)') +
      _odKpi('Aprobados', approved, 'var(--success,#22c55e)') +
      _odKpi('Total', subs.length, 'var(--text-muted)') +
    '</div>' +
    '<div class="card"><div class="table-wrap"><table class="table"><thead><tr>' +
      '<th>N°</th><th>Título</th><th>Sección</th><th>Tipo</th><th>Proyecto</th><th>Responsable</th><th>Vence</th><th>Rev.</th><th>Estado</th>' +
    '</tr></thead><tbody>' +
    (subs.length ? subs.slice().sort(_odSortByDue).map(function(s){
      return '<tr style="cursor:pointer" onclick="viewSubmittal(\'' + s.id + '\')">' +
        '<td><strong>' + escapeHtml(s.number || '') + '</strong></td>' +
        '<td>' + escapeHtml(s.title || '(sin título)') + '</td>' +
        '<td style="font-size:12px">' + escapeHtml(s.spec_section || '—') + '</td>' +
        '<td style="font-size:12px">' + escapeHtml(s.type || '—') + '</td>' +
        '<td style="font-size:12px">' + escapeHtml(_odProjName(s.project_id)) + '</td>' +
        '<td style="font-size:12px">' + escapeHtml(_odUserName(s.assignee)) + '</td>' +
        '<td>' + _odDueCell(s, SUB_OPEN_STATES) + '</td>' +
        '<td>' + (s.revision || 0) + '</td>' +
        '<td><span class="badge ' + (SUB_STATUS[s.status] ? SUB_STATUS[s.status].cls : 'badge-gray') + '">' + (SUB_STATUS[s.status] ? SUB_STATUS[s.status].label : s.status) + '</span></td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px">No hay submittals. Creá el primero.</td></tr>') +
    '</tbody></table></div></div>';
}

function openSubmittalForm(id) {
  if (!requireEdit('submittals')) return;
  var s = id ? DB.getById('submittals', id) : null;
  DB.markEdit('submittals', id);
  openModal(s ? 'Editar Submittal ' + (s.number || '') : 'Nuevo Submittal',
    '<div class="form-grid form-grid-2">' +
      '<div class="form-group full"><label class="form-label">Título *</label>' +
        '<input class="form-control" id="sub-title" value="' + (s ? escapeHtml(s.title || '') : '') + '" placeholder="Ej: Plano de taller — Escalera metálica"></div>' +
      '<div class="form-group"><label class="form-label">Proyecto *</label>' +
        '<select class="form-control" id="sub-project">' + _odProjectOptions(s && s.project_id) + '</select></div>' +
      '<div class="form-group"><label class="form-label">Sección (spec)</label>' +
        '<input class="form-control" id="sub-spec" value="' + (s ? escapeHtml(s.spec_section || '') : '') + '" placeholder="05 50 00"></div>' +
      '<div class="form-group"><label class="form-label">Tipo</label>' +
        '<select class="form-control" id="sub-type">' + SUB_TYPES.map(function(t){ return '<option' + ((s && s.type) === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-group"><label class="form-label">Responsable (ball-in-court)</label>' +
        '<select class="form-control" id="sub-assignee">' + _odUserOptions(s && s.assignee) + '</select></div>' +
      '<div class="form-group"><label class="form-label">Vencimiento</label>' +
        '<input class="form-control" id="sub-due" type="date" value="' + (s ? (s.due_date || '') : addDays(todayStr(), 14)) + '"></div>' +
      '<div class="form-group"><label class="form-label">Prioridad</label>' +
        '<select class="form-control" id="sub-priority">' + Object.keys(OD_PRIORITY).map(function(k){ return '<option value="' + k + '"' + ((s ? s.priority : 'normal') === k ? ' selected' : '') + '>' + OD_PRIORITY[k] + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-group full"><label class="form-label">Descripción</label>' +
        '<textarea class="form-control" id="sub-desc" rows="3" placeholder="Detalle / referencias…">' + (s ? escapeHtml(s.description || '') : '') + '</textarea></div>' +
    '</div>',
    '', '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
        '<button class="btn btn-primary" onclick="saveSubmittal(\'' + (id || '') + '\')"><i class="fas fa-save"></i> Guardar</button>');
}

function saveSubmittal(id) {
  if (!requireEdit('submittals')) return;
  var title = document.getElementById('sub-title').value.trim();
  var projectId = document.getElementById('sub-project').value;
  if (!title) { toast('El título es obligatorio', 'error'); return; }
  if (!projectId) { toast('Elegí un proyecto', 'error'); return; }
  var data = {
    title: title, project_id: projectId, company_id: DB._companyId,
    spec_section: document.getElementById('sub-spec').value.trim(),
    type: document.getElementById('sub-type').value,
    assignee: document.getElementById('sub-assignee').value || '',
    due_date: document.getElementById('sub-due').value || '',
    priority: document.getElementById('sub-priority').value || 'normal',
    description: document.getElementById('sub-desc').value.trim(),
  };
  if (id) {
    var _r = DB.update('submittals', id, data, { expectRev: DB.takeEditExpect('submittals', id) });
    if (_r && _r.__conflict) return;
    toast('Submittal actualizado', 'success');
  } else {
    data.number = _odNextNum('submittals', 'SUB');
    data.status = 'draft';
    data.revision = 0;
    data.date = todayStr();
    data.created_by = _odMe().name;
    data.comments = [{ id: uuid(), author: _odMe().name, author_id: _odMe().id, text: 'Submittal creado.', date: new Date().toISOString(), system: true }];
    DB.insert('submittals', data);
    toast('Submittal creado', 'success');
  }
  closeModal();
  renderSubmittals();
}

function viewSubmittal(id) {
  var s = DB.getById('submittals', id); if (!s) return;
  var st = SUB_STATUS[s.status] || { label: s.status, cls: 'badge-gray' };
  var over = _odOverdue(s, SUB_OPEN_STATES);
  var canE = canEdit('submittals');
  var actions = '';
  if (canE) {
    var next = {
      draft:            [['submitted', 'Enviar a revisión', 'btn-primary']],
      submitted:        [['under_review', 'Marcar en revisión', 'btn-primary']],
      under_review:     [['approved', 'Aprobar', 'btn-success'], ['approved_as_noted', 'Aprobar c/obs.', 'btn-success'], ['revise_resubmit', 'Revisar y reenviar', 'btn-secondary'], ['rejected', 'Rechazar', 'btn-secondary']],
      revise_resubmit:  [['submitted', 'Reenviar (nueva rev.)', 'btn-primary']],
      approved:         [['closed', 'Cerrar', 'btn-secondary']],
      approved_as_noted:[['closed', 'Cerrar', 'btn-secondary']],
      rejected:         [['revise_resubmit', 'Revisar y reenviar', 'btn-secondary']],
    }[s.status] || [];
    actions = next.map(function(n){ return '<button class="btn ' + n[2] + ' btn-sm" onclick="subSetStatus(\'' + id + '\',\'' + n[0] + '\')">' + n[1] + '</button>'; }).join(' ');
    actions += ' <button class="btn btn-ghost btn-sm" onclick="openSubmittalForm(\'' + id + '\')"><i class="fas fa-edit"></i></button>';
    actions += ' <button class="btn btn-ghost btn-sm danger" onclick="odDelete(\'submittals\',\'' + id + '\')"><i class="fas fa-trash"></i></button>';
  }
  var body =
    '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px">' +
      '<span class="badge ' + st.cls + '">' + st.label + '</span>' +
      (over ? '<span class="badge badge-red">Vencido</span>' : '') +
      '<span class="badge badge-gray">Rev. ' + (s.revision || 0) + '</span>' +
      '<span style="color:var(--text-muted);font-size:12px">' + escapeHtml(_odProjName(s.project_id)) + '</span>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;font-size:13px">' +
      _odField('Tipo', s.type || '—') +
      _odField('Sección', s.spec_section || '—') +
      _odField('Responsable', _odUserName(s.assignee)) +
      _odField('Vence', s.due_date ? fmtDate(s.due_date) : '—') +
      _odField('Prioridad', OD_PRIORITY[s.priority] || 'Normal') +
      _odField('Creado', s.date ? fmtDate(s.date) : '—') +
    '</div>' +
    (s.description ? '<div style="background:var(--bg);border-radius:8px;padding:12px;margin-bottom:12px">' +
      '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Descripción</div>' +
      '<div style="font-size:13px;white-space:pre-wrap">' + escapeHtml(s.description) + '</div></div>' : '') +
    (actions ? '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">' + actions + '</div>' : '') +
    '<div class="divider" style="margin:10px 0"></div>' +
    _odThreadHtml('submittals', s);
  openModal('Submittal ' + (s.number || ''), body, 'modal-md',
    '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
}

function subSetStatus(id, status) {
  if (!requireEdit('submittals')) return;
  var s = DB.getById('submittals', id); if (!s) return;
  var upd = { status: status };
  // Reenviar tras "revisar y reenviar" incrementa la revisión.
  if (status === 'submitted' && s.status === 'revise_resubmit') upd.revision = (s.revision || 0) + 1;
  var lbl = SUB_STATUS[status] ? SUB_STATUS[status].label : status;
  upd.comments = _odAppendComment(s, 'Estado → ' + lbl + (upd.revision ? ' (Rev. ' + upd.revision + ')' : '') + '.', true);
  DB.update('submittals', id, upd);
  viewSubmittal(id);
}

// ---- borrado compartido ----
function odDelete(collection, id) {
  if (!requireEdit(collection)) return;
  confirmDialog('¿Eliminar este ' + (collection === 'rfis' ? 'RFI' : 'submittal') + '?', function(){
    DB.remove(collection, id);
    closeModal();
    if (collection === 'rfis') renderRFIs(); else renderSubmittals();
    toast('Eliminado', 'warning');
  });
}
