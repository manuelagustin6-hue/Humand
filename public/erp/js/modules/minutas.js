/* ===== MINUTAS DE REUNIÓN ===== */

var _MINUTAS_TEMPLATE = {
  version: 1,
  sections: ['temas', 'acuerdos', 'proxima']
};

function renderMinutas() {
  const minutas = DB.getAll('meetingMinutes').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const projects = DB.getAll('projects');

  document.getElementById('content').innerHTML =
    '<div class="page-header">' +
    '<div>' +
    '<div class="page-title"><i class="fas fa-clipboard-list" style="margin-right:8px;color:var(--primary)"></i>Minutas de Reunión</div>' +
    '<div class="page-subtitle">Registro estructurado de reuniones de obra, acuerdos y compromisos</div>' +
    '</div>' +
    '<div class="page-actions">' +
    '<button class="btn btn-secondary" onclick="openTeamsConfig()"><i class="fab fa-microsoft"></i> Teams</button>' +
    '<button class="btn btn-primary" onclick="openMinutaForm()"><i class="fas fa-plus"></i> Nueva Minuta</button>' +
    '</div>' +
    '</div>' +

    '<div id="minutas-tabs">' +
    '<div class="tabs">' +
    '<button class="tab-btn" data-tab="tab-minutas-lista">Minutas</button>' +
    '<button class="tab-btn" data-tab="tab-minutas-ia">Asistente IA</button>' +
    '<button class="tab-btn" data-tab="tab-minutas-teams">Conectar Teams</button>' +
    '</div>' +

    '<div id="tab-minutas-lista" class="tab-content">' +
    _buildMinutasList(minutas, projects) +
    '</div>' +

    '<div id="tab-minutas-ia" class="tab-content">' +
    _buildIATab() +
    '</div>' +

    '<div id="tab-minutas-teams" class="tab-content">' +
    _buildTeamsTab() +
    '</div>' +
    '</div>';

  initTabs('minutas-tabs');
}

function _buildMinutasList(minutas, projects) {
  if (!minutas.length) {
    return '<div class="empty-state" style="margin-top:40px">' +
      '<i class="fas fa-clipboard-list"></i>' +
      '<p>No hay minutas registradas. Creá la primera o usá el Asistente IA.</p>' +
      '<button class="btn btn-primary mt-2" onclick="openMinutaForm()"><i class="fas fa-plus"></i> Nueva Minuta</button>' +
      '</div>';
  }

  const rows = minutas.map(function(m) {
    const proj = projects.find(function(p) { return p.id === m.project_id; });
    const pendingCount = (m.acuerdos || []).filter(function(a) { return a.status === 'pending'; }).length;
    return '<tr>' +
      '<td><strong>' + (m.numero || '—') + '</strong></td>' +
      '<td>' + fmtDate(m.date) + '</td>' +
      '<td>' + (proj ? proj.name : '<span style="color:var(--text-muted)">Sin proyecto</span>') + '</td>' +
      '<td>' + (m.title || 'Sin título') + '</td>' +
      '<td>' + (m.lugar || '—') + '</td>' +
      '<td>' + (m.asistentes ? m.asistentes.split('\n').length + ' participantes' : '—') + '</td>' +
      '<td>' + (pendingCount > 0 ? '<span class="badge badge-yellow">' + pendingCount + ' pendientes</span>' : '<span class="badge badge-green">Sin pendientes</span>') + '</td>' +
      '<td><div class="table-actions">' +
      '<button class="btn-ghost btn btn-sm" onclick="viewMinuta(\'' + m.id + '\')"><i class="fas fa-eye"></i></button>' +
      '<button class="btn-ghost btn btn-sm" onclick="openMinutaForm(\'' + m.id + '\')"><i class="fas fa-edit"></i></button>' +
      '<button class="btn btn-sm btn-secondary" onclick="printMinuta(\'' + m.id + '\')"><i class="fas fa-print"></i></button>' +
      (typeof attBadge === 'function' ? attBadge(m).replace(/\{col\}/g, 'meetingMinutes').replace(/\{id\}/g, m.id) : '') +
      '<button class="btn-ghost btn btn-sm danger" onclick="deleteMinuta(\'' + m.id + '\')"><i class="fas fa-trash"></i></button>' +
      '</div></td>' +
      '</tr>';
  }).join('');

  return '<div class="card"><div class="card-body" style="padding:0">' +
    '<div class="table-wrap"><table>' +
    '<thead><tr><th>Nº</th><th>Fecha</th><th>Proyecto</th><th>Título</th><th>Lugar</th><th>Participantes</th><th>Acuerdos</th><th>Acciones</th></tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '</table></div></div></div>';
}

function _buildIATab() {
  var cfg = _getMinutasCfg();
  var hasKey = !!(cfg.claudeApiKey);

  return '<div class="card" style="max-width:800px;margin:0 auto">' +
    '<div class="card-header"><span class="card-title"><i class="fas fa-robot text-primary"></i> Generador de Minutas con IA</span></div>' +
    '<div class="card-body">' +

    (!hasKey ? '<div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px">' +
      '<i class="fas fa-key" style="color:#92400e"></i> Para usar el asistente de IA, configurá tu API Key de Claude en la pestaña <strong>Conectar Teams → Configuración</strong>.' +
      '</div>' : '') +

    '<div class="form-group">' +
    '<label class="form-label">Contexto / Notas de la reunión *</label>' +
    '<textarea class="form-control" id="ia-input" rows="10" placeholder="Pegá aquí la transcripción de la reunión, las notas tomadas, o los puntos principales tratados...\n\nEjemplo:\n- Se trató avance de estructura: losa piso 4 al 60%\n- Problema con hormigón: proveedor retrasó entrega\n- Se decidió contratar hormigón alternativo con Cemex\n- Responsable: Ing. García, para el viernes\n- Próxima reunión: lunes 15 a las 9hs"></textarea>' +
    '</div>' +

    '<div class="form-grid form-grid-2">' +
    '<div class="form-group">' +
    '<label class="form-label">Proyecto</label>' +
    '<select class="form-control" id="ia-project">' +
    '<option value="">Sin proyecto específico</option>' +
    DB.getAll('projects').map(function(p) { return '<option value="' + p.id + '">' + p.name + '</option>'; }).join('') +
    '</select>' +
    '</div>' +
    '<div class="form-group">' +
    '<label class="form-label">Tipo de reunión</label>' +
    '<select class="form-control" id="ia-tipo">' +
    '<option value="obra">Reunión de Obra</option>' +
    '<option value="coordinacion">Coordinación de Proyecto</option>' +
    '<option value="cliente">Reunión con Cliente</option>' +
    '<option value="seguridad">Seguridad e Higiene</option>' +
    '<option value="direccion">Dirección de Obra</option>' +
    '</select>' +
    '</div>' +
    '</div>' +

    '<div id="ia-result" style="display:none;margin-top:16px">' +
    '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:16px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
    '<strong style="font-size:13px"><i class="fas fa-check-circle text-success"></i> Minuta generada</strong>' +
    '<button class="btn btn-sm btn-primary" onclick="saveIAMinuta()"><i class="fas fa-save"></i> Guardar como minuta</button>' +
    '</div>' +
    '<pre id="ia-result-text" style="white-space:pre-wrap;font-family:inherit;font-size:12px;line-height:1.6;margin:0"></pre>' +
    '</div>' +
    '</div>' +

    '<button class="btn btn-primary mt-2" id="ia-btn" onclick="generateMinutaIA()" ' + (!hasKey ? '' : '') + '>' +
    '<i class="fas fa-magic"></i> Generar Minuta con IA</button>' +
    '</div>' +
    '</div>';
}

function _buildTeamsTab() {
  var cfg = _getMinutasCfg();

  return '<div style="max-width:800px;margin:0 auto">' +

    // Teams connection status
    '<div class="card">' +
    '<div class="card-header"><span class="card-title"><i class="fab fa-microsoft text-primary"></i> Integración con Microsoft Teams</span>' +
    (cfg.msClientId ? '<span class="badge badge-green" style="margin-left:8px">Configurado</span>' : '<span class="badge badge-yellow" style="margin-left:8px">Sin configurar</span>') +
    '</div>' +
    '<div class="card-body">' +

    '<p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">' +
    'Conectate con Microsoft Teams para importar reuniones y generar minutas automáticamente a partir de las transcripciones.' +
    '</p>' +

    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">' +
    _teamsStep(1, 'Registrar app en Azure', 'Creá una app en Azure AD con permisos de Teams.', cfg.msClientId ? 'done' : 'todo') +
    _teamsStep(2, 'Configurar credenciales', 'Ingresá tu Client ID y Tenant ID abajo.', cfg.msClientId ? 'done' : 'todo') +
    _teamsStep(3, 'Iniciar sesión con Microsoft', 'Autenticarte para acceder a tus reuniones de Teams.', 'todo') +
    '</div>' +

    '<div style="border-top:1px solid var(--border);padding-top:16px">' +
    '<h4 style="font-size:13px;font-weight:600;margin-bottom:12px"><i class="fas fa-cog"></i> Configuración</h4>' +
    '<div class="form-grid form-grid-2">' +
    '<div class="form-group">' +
    '<label class="form-label">Azure App Client ID</label>' +
    '<input class="form-control" id="cfg-client-id" value="' + (cfg.msClientId || '') + '" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">' +
    '</div>' +
    '<div class="form-group">' +
    '<label class="form-label">Tenant ID</label>' +
    '<input class="form-control" id="cfg-tenant-id" value="' + (cfg.msTenantId || '') + '" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">' +
    '</div>' +
    '<div class="form-group full">' +
    '<label class="form-label">API Key de Claude (Anthropic)</label>' +
    '<input class="form-control" id="cfg-claude-key" type="password" value="' + (cfg.claudeApiKey || '') + '" placeholder="sk-ant-api03-...">' +
    '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">Necesaria para generar minutas con IA. Tu clave no se envía a ningún servidor externo salvo a api.anthropic.com.</div>' +
    '</div>' +
    '</div>' +
    '<button class="btn btn-primary" onclick="saveMinutasCfg()"><i class="fas fa-save"></i> Guardar configuración</button>' +
    '</div>' +
    '</div>' +
    '</div>' +

    // Setup guide
    '<div class="card mt-2">' +
    '<div class="card-header"><span class="card-title"><i class="fas fa-book text-primary"></i> Guía de configuración de Azure</span></div>' +
    '<div class="card-body">' +
    '<ol style="font-size:13px;line-height:2;padding-left:20px;color:var(--text)">' +
    '<li>Ingresá al <strong>Portal de Azure</strong> → <em>Azure Active Directory</em> → <em>Registros de aplicaciones</em></li>' +
    '<li>Hacé clic en <strong>Nuevo registro</strong>. Dale un nombre (ej. "ERP-Minutas") y seleccioná tipo <em>Cuentas de un solo inquilino</em></li>' +
    '<li>En <strong>URI de redirección</strong> seleccioná "SPA" y poné la URL de esta app: <code style="background:var(--bg);padding:2px 6px;border-radius:4px">' + window.location.origin + '</code></li>' +
    '<li>Copiá el <strong>Application (client) ID</strong> y el <strong>Directory (tenant) ID</strong> y pegalos arriba</li>' +
    '<li>En <strong>Permisos de API</strong>, agregá: <code>OnlineMeetings.Read</code>, <code>OnlineMeetingTranscript.Read.All</code>, <code>User.Read</code></li>' +
    '<li>Hacé clic en <strong>Conceder consentimiento de administrador</strong></li>' +
    '<li>Guardá la configuración arriba y hacé clic en "Conectar con Teams"</li>' +
    '</ol>' +
    '<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px;font-size:12px;margin-top:8px">' +
    '<i class="fas fa-info-circle" style="color:#0284c7"></i> Las transcripciones de Teams requieren <strong>Teams Premium</strong> o una licencia E3/E5 con transcripción habilitada.' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>';
}

function _teamsStep(num, title, desc, status) {
  var colors = { done: 'var(--success)', todo: 'var(--text-muted)' };
  var icons = { done: 'fa-check-circle', todo: 'fa-circle' };
  return '<div style="padding:12px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
    '<span style="width:22px;height:22px;border-radius:50%;background:var(--primary);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center">' + num + '</span>' +
    '<strong style="font-size:12px">' + title + '</strong>' +
    '<i class="fas ' + icons[status] + '" style="margin-left:auto;color:' + colors[status] + '"></i>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--text-muted)">' + desc + '</div>' +
    '</div>';
}

/* ===== CONFIG ===== */
var _MINUTAS_CFG_KEY = 'erp_minutas_cfg_v1';

function _getMinutasCfg() {
  try { return JSON.parse(localStorage.getItem(_MINUTAS_CFG_KEY) || '{}'); } catch(e) { return {}; }
}

function saveMinutasCfg() {
  var cfg = {
    msClientId: (document.getElementById('cfg-client-id') || {}).value || '',
    msTenantId: (document.getElementById('cfg-tenant-id') || {}).value || '',
    claudeApiKey: (document.getElementById('cfg-claude-key') || {}).value || ''
  };
  localStorage.setItem(_MINUTAS_CFG_KEY, JSON.stringify(cfg));
  toast('Configuración guardada', 'success');
}

/* ===== IA GENERATION ===== */
function generateMinutaIA() {
  var input = document.getElementById('ia-input');
  if (!input || !input.value.trim()) { toast('Ingresá las notas o transcripción de la reunión', 'error'); return; }

  var cfg = _getMinutasCfg();
  if (!cfg.claudeApiKey) {
    toast('Configurá tu API Key de Claude en la pestaña "Conectar Teams"', 'error');
    return;
  }

  var tipo = (document.getElementById('ia-tipo') || {}).value || 'obra';
  var tipoLabel = { obra: 'Reunión de Obra', coordinacion: 'Coordinación de Proyecto', cliente: 'Reunión con Cliente', seguridad: 'Seguridad e Higiene', direccion: 'Dirección de Obra' }[tipo] || tipo;

  var btn = document.getElementById('ia-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...'; }

  var prompt = 'Generá una minuta de reunión estructurada en formato profesional para una empresa constructora argentina, del tipo: ' + tipoLabel + '.\n\n' +
    'Usá exactamente este formato:\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '                MINUTA DE REUNIÓN\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'Tipo: [tipo de reunión]\n' +
    'Fecha: [fecha si se menciona, sino "Por confirmar"]\n' +
    'Lugar / Canal: [lugar o "Microsoft Teams"]\n' +
    'Convocante: [si se menciona]\n\n' +
    'PARTICIPANTES:\n' +
    '[listar participantes mencionados con empresa/cargo si se sabe]\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '1. TEMAS TRATADOS\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '[numerar cada tema: 1.1, 1.2, etc. con descripción clara]\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '2. ACUERDOS Y COMPROMISOS\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'N° | Descripción | Responsable | Fecha límite | Estado\n' +
    '[tabla de acuerdos, uno por línea]\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '3. PRÓXIMA REUNIÓN\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'Fecha propuesta: [si se menciona]\n' +
    'Temas pendientes: [listar]\n\n' +
    'Confeccionó: [si se menciona]\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    'Notas o transcripción de la reunión:\n' + input.value.trim();

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': cfg.claudeApiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.error) throw new Error(data.error.message || 'Error de API');
    var text = (data.content && data.content[0] && data.content[0].text) || '';
    var resultEl = document.getElementById('ia-result');
    var textEl = document.getElementById('ia-result-text');
    if (resultEl) resultEl.style.display = 'block';
    if (textEl) textEl.textContent = text;
    window._iaGeneratedText = text;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-magic"></i> Regenerar'; }
  })
  .catch(function(e) {
    console.error('IA error:', e);
    toast('Error al conectar con la IA: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-magic"></i> Generar Minuta con IA'; }
  });
}

function saveIAMinuta() {
  var text = window._iaGeneratedText || '';
  if (!text) { toast('No hay minuta generada', 'error'); return; }

  var projectId = (document.getElementById('ia-project') || {}).value || '';
  var num = 'MR-' + new Date().getFullYear() + '-' + String(DB.getAll('meetingMinutes').length + 1).padStart(3, '0');

  DB.insert('meetingMinutes', {
    numero: num,
    project_id: projectId,
    title: 'Minuta generada por IA',
    date: todayStr(),
    lugar: '',
    asistentes: '',
    temas: text,
    acuerdos: [],
    proxima_reunion: '',
    source: 'ia'
  });

  toast('Minuta guardada', 'success');
  renderMinutas();
}

/* ===== FORM ===== */
function openMinutaForm(id) {
  var m = id ? DB.getById('meetingMinutes', id) : null;
  var projects = DB.getAll('projects');
  var num = m ? m.numero : ('MR-' + new Date().getFullYear() + '-' + String(DB.getAll('meetingMinutes').length + 1).padStart(3, '0'));
  var acuerdos = m ? (m.acuerdos || []) : [];
  window._minutaAcuerdos = acuerdos.map(function(a) { return Object.assign({}, a); });

  openModal(m ? 'Editar Minuta' : 'Nueva Minuta de Reunión',
    '<div id="minuta-form-tabs">' +
    '<div class="tabs">' +
    '<button class="tab-btn" data-tab="mf-general">General</button>' +
    '<button class="tab-btn" data-tab="mf-temas">Temas</button>' +
    '<button class="tab-btn" data-tab="mf-acuerdos">Acuerdos</button>' +
    '<button class="tab-btn" data-tab="mf-cierre">Cierre</button>' +
    '</div>' +

    '<div id="mf-general" class="tab-content"><div class="form-grid form-grid-2">' +
    '<div class="form-group"><label class="form-label">Nº de Acta</label>' +
    '<input class="form-control" id="mf-num" value="' + num + '"></div>' +
    '<div class="form-group"><label class="form-label">Fecha *</label>' +
    '<input class="form-control" id="mf-date" type="date" value="' + (m ? m.date : todayStr()) + '"></div>' +
    '<div class="form-group"><label class="form-label">Proyecto</label>' +
    '<select class="form-control" id="mf-project"><option value="">Sin proyecto</option>' +
    projects.map(function(p) { return '<option value="' + p.id + '" ' + (m && m.project_id === p.id ? 'selected' : '') + '>' + p.name + '</option>'; }).join('') +
    '</select></div>' +
    '<div class="form-group"><label class="form-label">Lugar / Canal</label>' +
    '<input class="form-control" id="mf-lugar" value="' + (m ? m.lugar || '' : '') + '" placeholder="Oficina / Microsoft Teams / Obra"></div>' +
    '<div class="form-group"><label class="form-label">Título / Motivo</label>' +
    '<input class="form-control" id="mf-title" value="' + (m ? m.title || '' : '') + '" placeholder="Reunión de avance de obra - Semana 23"></div>' +
    '<div class="form-group"><label class="form-label">Convocante</label>' +
    '<input class="form-control" id="mf-convocante" value="' + (m ? m.convocante || '' : '') + '" placeholder="Nombre y cargo"></div>' +
    '<div class="form-group full"><label class="form-label">Participantes</label>' +
    '<textarea class="form-control" id="mf-asistentes" rows="4" placeholder="Ing. García (Dirección de Obra)\nArq. López (Proyecto)\nSr. Martínez (Contratista)&#10;...">' + (m ? m.asistentes || '' : '') + '</textarea></div>' +
    '</div></div>' +

    '<div id="mf-temas" class="tab-content">' +
    '<div class="form-group"><label class="form-label">Temas tratados</label>' +
    '<textarea class="form-control" id="mf-temas" rows="14" placeholder="1.1 Avance de estructura&#10;    Se verificó que la losa del piso 4 se encuentra al 60% de ejecución...&#10;&#10;1.2 Provisión de materiales&#10;    El proveedor de hormigón informó demora de 3 días...&#10;&#10;1.3 Seguridad e higiene&#10;    ...">' + (m ? m.temas || '' : '') + '</textarea></div>' +
    '</div>' +

    '<div id="mf-acuerdos" class="tab-content">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
    '<strong style="font-size:13px">Acuerdos y Compromisos</strong>' +
    '<button class="btn btn-sm btn-primary" onclick="addMinutaAcuerdo()"><i class="fas fa-plus"></i> Agregar</button>' +
    '</div>' +
    '<div id="mf-acuerdos-list">' + _buildAcuerdosList(window._minutaAcuerdos) + '</div>' +
    '</div>' +

    '<div id="mf-cierre" class="tab-content"><div class="form-grid form-grid-2">' +
    '<div class="form-group full"><label class="form-label">Próxima reunión</label>' +
    '<input class="form-control" id="mf-proxima" value="' + (m ? m.proxima_reunion || '' : '') + '" placeholder="Fecha, hora y lugar de la próxima reunión"></div>' +
    '<div class="form-group full"><label class="form-label">Temas pendientes para próxima</label>' +
    '<textarea class="form-control" id="mf-pendientes" rows="4" placeholder="Temas que quedan para la próxima reunión...">' + (m ? m.temas_pendientes || '' : '') + '</textarea></div>' +
    '<div class="form-group"><label class="form-label">Confeccionó</label>' +
    '<input class="form-control" id="mf-confecciono" value="' + (m ? m.confecciono || '' : '') + '" placeholder="Nombre y cargo"></div>' +
    '<div class="form-group"><label class="form-label">Revisó</label>' +
    '<input class="form-control" id="mf-reviso" value="' + (m ? m.reviso || '' : '') + '" placeholder="Nombre y cargo"></div>' +
    '</div></div>' +
    '</div>',
    'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="saveMinuta(\'' + (id || '') + '\')"><i class="fas fa-save"></i> Guardar</button>'
  );

  setTimeout(function() { initTabs('minuta-form-tabs'); }, 80);
}

function _buildAcuerdosList(acuerdos) {
  if (!acuerdos.length) return '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">Sin acuerdos. Hacé clic en "+ Agregar".</div>';
  return acuerdos.map(function(a, i) {
    return '<div id="acuerdo-row-' + i + '" style="display:grid;grid-template-columns:1fr 1fr 1fr auto auto;gap:6px;margin-bottom:6px;align-items:center">' +
      '<input class="form-control" style="font-size:12px" placeholder="Descripción del acuerdo" value="' + (a.descripcion || '') + '" oninput="updateMinutaAcuerdo(' + i + ',\'descripcion\',this.value)">' +
      '<input class="form-control" style="font-size:12px" placeholder="Responsable" value="' + (a.responsable || '') + '" oninput="updateMinutaAcuerdo(' + i + ',\'responsable\',this.value)">' +
      '<input class="form-control" style="font-size:12px" type="date" value="' + (a.fecha_limite || '') + '" oninput="updateMinutaAcuerdo(' + i + ',\'fecha_limite\',this.value)">' +
      '<select class="form-control" style="font-size:11px;width:100px" onchange="updateMinutaAcuerdo(' + i + ',\'status\',this.value)">' +
      '<option value="pending" ' + (a.status === 'pending' || !a.status ? 'selected' : '') + '>Pendiente</option>' +
      '<option value="in_progress" ' + (a.status === 'in_progress' ? 'selected' : '') + '>En curso</option>' +
      '<option value="done" ' + (a.status === 'done' ? 'selected' : '') + '>Cumplido</option>' +
      '</select>' +
      '<button class="btn-ghost btn danger" onclick="removeMinutaAcuerdo(' + i + ')"><i class="fas fa-times"></i></button>' +
      '</div>';
  }).join('');
}

window._minutaAcuerdos = [];

function addMinutaAcuerdo() {
  window._minutaAcuerdos.push({ descripcion: '', responsable: '', fecha_limite: '', status: 'pending' });
  var el = document.getElementById('mf-acuerdos-list');
  if (el) el.innerHTML = _buildAcuerdosList(window._minutaAcuerdos);
}

function updateMinutaAcuerdo(i, field, val) {
  if (window._minutaAcuerdos[i]) window._minutaAcuerdos[i][field] = val;
}

function removeMinutaAcuerdo(i) {
  window._minutaAcuerdos.splice(i, 1);
  var el = document.getElementById('mf-acuerdos-list');
  if (el) el.innerHTML = _buildAcuerdosList(window._minutaAcuerdos);
}

function saveMinuta(id) {
  var date = (document.getElementById('mf-date') || {}).value;
  var title = ((document.getElementById('mf-title') || {}).value || '').trim();
  if (!date) { toast('La fecha es obligatoria', 'error'); return; }

  var data = {
    numero:          ((document.getElementById('mf-num') || {}).value || '').trim(),
    project_id:      (document.getElementById('mf-project') || {}).value || '',
    title:           title || 'Sin título',
    date:            date,
    lugar:           ((document.getElementById('mf-lugar') || {}).value || '').trim(),
    convocante:      ((document.getElementById('mf-convocante') || {}).value || '').trim(),
    asistentes:      ((document.getElementById('mf-asistentes') || {}).value || '').trim(),
    temas:           ((document.getElementById('mf-temas') || {}).value || '').trim(),
    acuerdos:        window._minutaAcuerdos.filter(function(a) { return a.descripcion; }),
    proxima_reunion: ((document.getElementById('mf-proxima') || {}).value || '').trim(),
    temas_pendientes:((document.getElementById('mf-pendientes') || {}).value || '').trim(),
    confecciono:     ((document.getElementById('mf-confecciono') || {}).value || '').trim(),
    reviso:          ((document.getElementById('mf-reviso') || {}).value || '').trim(),
  };

  if (id) { DB.update('meetingMinutes', id, data); toast('Minuta actualizada', 'success'); }
  else    { DB.insert('meetingMinutes', data); toast('Minuta creada', 'success'); }

  window._minutaAcuerdos = [];
  closeModal();
  renderMinutas();
}

function deleteMinuta(id) {
  confirmDialog('¿Eliminar esta minuta?', function() {
    DB.remove('meetingMinutes', id);
    toast('Minuta eliminada', 'warning');
    renderMinutas();
  });
}

/* ===== VIEW / PRINT ===== */
function viewMinuta(id) {
  var m = DB.getById('meetingMinutes', id);
  if (!m) return;
  var proj = DB.getById('projects', m.project_id);
  var acuerdosHtml = (m.acuerdos || []).length
    ? '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
      '<thead><tr style="background:#f1f5f9">' +
      '<th style="padding:6px;text-align:left;border:1px solid #e2e8f0">N°</th>' +
      '<th style="padding:6px;text-align:left;border:1px solid #e2e8f0">Descripción</th>' +
      '<th style="padding:6px;text-align:left;border:1px solid #e2e8f0">Responsable</th>' +
      '<th style="padding:6px;text-align:left;border:1px solid #e2e8f0">Fecha límite</th>' +
      '<th style="padding:6px;text-align:left;border:1px solid #e2e8f0">Estado</th>' +
      '</tr></thead><tbody>' +
      m.acuerdos.map(function(a, i) {
        var statusLabel = { pending: 'Pendiente', in_progress: 'En curso', done: 'Cumplido' }[a.status] || 'Pendiente';
        var statusColor = { pending: '#f59e0b', in_progress: '#3b82f6', done: '#10b981' }[a.status] || '#f59e0b';
        return '<tr><td style="padding:5px 6px;border:1px solid #e2e8f0">' + (i+1) + '</td>' +
          '<td style="padding:5px 6px;border:1px solid #e2e8f0">' + (a.descripcion || '') + '</td>' +
          '<td style="padding:5px 6px;border:1px solid #e2e8f0">' + (a.responsable || '') + '</td>' +
          '<td style="padding:5px 6px;border:1px solid #e2e8f0">' + (a.fecha_limite ? fmtDate(a.fecha_limite) : '—') + '</td>' +
          '<td style="padding:5px 6px;border:1px solid #e2e8f0"><span style="color:' + statusColor + ';font-weight:600">' + statusLabel + '</span></td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>'
    : '<p style="color:var(--text-muted);font-style:italic">Sin acuerdos registrados</p>';

  openModal('Minuta: ' + (m.numero || '') + ' — ' + (m.title || ''), `
<div style="font-family:inherit;font-size:13px;line-height:1.6">
  <div style="background:var(--bg);border-radius:8px;padding:14px;margin-bottom:16px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
    <div><strong>Proyecto:</strong> ${proj ? proj.name : '—'}</div>
    <div><strong>Fecha:</strong> ${fmtDate(m.date)}</div>
    <div><strong>Lugar:</strong> ${m.lugar || '—'}</div>
    <div><strong>Convocante:</strong> ${m.convocante || '—'}</div>
  </div>
  ${m.asistentes ? `<div style="margin-bottom:12px"><strong>Participantes:</strong><div style="white-space:pre-line;color:var(--text-muted);font-size:12px;margin-top:4px">${m.asistentes}</div></div>` : ''}
  ${m.temas ? `<div style="margin-bottom:12px"><strong>Temas tratados:</strong><div style="white-space:pre-line;font-size:12px;background:var(--bg);padding:10px;border-radius:6px;margin-top:4px">${m.temas}</div></div>` : ''}
  <div style="margin-bottom:12px"><strong>Acuerdos y compromisos:</strong><div style="margin-top:6px">${acuerdosHtml}</div></div>
  ${m.proxima_reunion ? `<div style="margin-bottom:8px"><strong>Próxima reunión:</strong> ${m.proxima_reunion}</div>` : ''}
  ${m.temas_pendientes ? `<div><strong>Temas pendientes:</strong><div style="color:var(--text-muted);font-size:12px">${m.temas_pendientes}</div></div>` : ''}
</div>
`, 'modal-lg', `
<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
<button class="btn btn-secondary" onclick="openMinutaForm('${m.id}')"><i class="fas fa-edit"></i> Editar</button>
<button class="btn btn-primary" onclick="printMinuta('${m.id}')"><i class="fas fa-print"></i> Imprimir</button>
`);
}

function printMinuta(id) {
  var m = DB.getById('meetingMinutes', id);
  if (!m) return;
  var proj = DB.getById('projects', m.project_id);
  var win = window.open('', '_blank');
  var acuerdosRows = (m.acuerdos || []).map(function(a, i) {
    var statusLabel = { pending: 'Pendiente', in_progress: 'En curso', done: 'Cumplido' }[a.status] || 'Pendiente';
    return '<tr><td>' + (i+1) + '</td><td>' + (a.descripcion || '') + '</td><td>' + (a.responsable || '') + '</td><td>' + (a.fecha_limite ? a.fecha_limite : '—') + '</td><td>' + statusLabel + '</td></tr>';
  }).join('');

  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Minuta ' + (m.numero || '') + '</title>' +
    '<style>body{font-family:Arial,sans-serif;font-size:12px;margin:30px;color:#1a1a1a}' +
    'h1{font-size:16px;text-align:center;border-bottom:2px solid #000;padding-bottom:8px}' +
    '.header{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;font-size:11px}' +
    '.header span{display:block}table{width:100%;border-collapse:collapse;margin:8px 0}' +
    'th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}th{background:#f1f1f1;font-size:11px}' +
    'td{font-size:11px}h3{font-size:13px;margin:14px 0 6px;border-bottom:1px solid #ddd;padding-bottom:4px}' +
    '.sig{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px}' +
    '.sig-box{border-top:1px solid #000;padding-top:6px;font-size:11px}</style></head><body>' +
    '<h1>MINUTA DE REUNIÓN N° ' + (m.numero || '') + '</h1>' +
    '<div class="header">' +
    '<span><strong>Proyecto:</strong> ' + (proj ? proj.name : '—') + '</span>' +
    '<span><strong>Fecha:</strong> ' + (m.date || '—') + '</span>' +
    '<span><strong>Lugar / Canal:</strong> ' + (m.lugar || '—') + '</span>' +
    '<span><strong>Convocante:</strong> ' + (m.convocante || '—') + '</span>' +
    '</div>' +
    '<h3>PARTICIPANTES</h3><p style="white-space:pre-line;font-size:11px">' + (m.asistentes || '—') + '</p>' +
    '<h3>TEMAS TRATADOS</h3><p style="white-space:pre-line;font-size:11px">' + (m.temas || '—') + '</p>' +
    '<h3>ACUERDOS Y COMPROMISOS</h3>' +
    '<table><thead><tr><th>N°</th><th>Descripción</th><th>Responsable</th><th>Fecha límite</th><th>Estado</th></tr></thead>' +
    '<tbody>' + (acuerdosRows || '<tr><td colspan="5">Sin acuerdos</td></tr>') + '</tbody></table>' +
    (m.proxima_reunion ? '<h3>PRÓXIMA REUNIÓN</h3><p>' + m.proxima_reunion + '</p>' : '') +
    (m.temas_pendientes ? '<h3>TEMAS PENDIENTES</h3><p style="white-space:pre-line">' + m.temas_pendientes + '</p>' : '') +
    '<div class="sig">' +
    '<div class="sig-box">Confeccionó: ' + (m.confecciono || '') + '</div>' +
    '<div class="sig-box">Revisó: ' + (m.reviso || '') + '</div>' +
    '</div></body></html>');
  win.document.close();
  setTimeout(function() { win.print(); }, 400);
}

function openTeamsConfig() {
  // Switch to Teams tab
  var btn = document.querySelector('#minutas-tabs .tab-btn[data-tab="tab-minutas-teams"]');
  if (btn) btn.click();
}
