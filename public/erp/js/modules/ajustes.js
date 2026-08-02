/* ===== AJUSTES DEL SISTEMA ===== */

// ── Company profile helper — used by invoice/OP/cert/note templates ──
// Reads from the ACTIVE company record in the Empresas module
function getCompanyProfile() {
  var activeId = (window.APP_STATE && window.APP_STATE.activeCompany) || DB._companyId || 'comp-001';
  var company  = DB.getAllCompanies().find(function(c) { return c.id === activeId; }) || {};
  return {
    name:     company.legalName || company.name || 'Mi Empresa',
    cuit:     company.taxId    || '',
    address:  company.address  || '',
    city:     company.city     || '',
    phone:    company.phone    || '',
    email:    company.email    || '',
    iva_cond: company.taxRegime|| 'RI',
    country:  company.country  || 'AR',
    currency: company.currency || 'ARS',
    iibb:     company.iibb     || '',
  };
}

function renderAjustes() {
  document.getElementById('content').innerHTML =
    '<div class="page-header"><div>' +
    '<div class="page-title">Ajustes del Sistema</div>' +
    '<div class="page-subtitle">Perfil de empresa, almacenamiento, respaldo e integridad</div>' +
    '</div></div>' +
    '<div id="ajustes-tabs">' +
    '<div class="tabs">' +
    '<button class="tab-btn" data-tab="tab-ajustes-empresa">Empresa</button>' +
    '<button class="tab-btn" data-tab="tab-ajustes-storage">Almacenamiento</button>' +
    '<button class="tab-btn" data-tab="tab-ajustes-backup">Respaldo</button>' +
    '<button class="tab-btn" data-tab="tab-ajustes-integrity">Integridad</button>' +
    '<button class="tab-btn" data-tab="tab-ajustes-system">Sistema</button>' +
    '</div>' +
    '<div id="tab-ajustes-empresa" class="tab-content">' + buildEmpresaProfileTab() + '</div>' +
    '<div id="tab-ajustes-storage" class="tab-content">' + buildStorageTab() + '</div>' +
    '<div id="tab-ajustes-backup" class="tab-content">' + buildBackupTab() + '</div>' +
    '<div id="tab-ajustes-integrity" class="tab-content">' + buildIntegrityEmpty() + '</div>' +
    '<div id="tab-ajustes-system" class="tab-content">' + buildSystemTab() + '</div>' +
    '</div>';
  initTabs('ajustes-tabs');
}

// ---- EMPRESA PROFILE TAB ----
function buildEmpresaProfileTab() {
  var p = getCompanyProfile();
  var activeId  = (window.APP_STATE && window.APP_STATE.activeCompany) || DB._companyId || 'comp-001';
  var companies = DB.getAllCompanies();
  var flags = { AR: '🇦🇷', UY: '🇺🇾', US: '🇺🇸', CL: '🇨🇱', BR: '🇧🇷' };
  var ivaLabels = { RI:'Responsable Inscripto', MO:'Monotributista', EX:'Exento', NR:'No Responsable', CF:'Consumidor Final' };

  var activeCompany = companies.find(function(c) { return c.id === activeId; }) || {};
  var flag = flags[p.country] || '🏢';

  function row(label, value) {
    if (!value) return '';
    return '<div style="display:flex;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">' +
      '<div style="min-width:140px;font-size:12px;color:var(--text-muted);font-weight:500">' + label + '</div>' +
      '<div style="font-size:13px;font-weight:600;color:var(--text-primary)">' + escapeHtml(value) + '</div>' +
      '</div>';
  }

  var companyList = companies.length > 1
    ? '<div class="card mb-3"><div class="card-header"><span class="card-title"><i class="fas fa-city text-primary"></i> Todas las Empresas del Grupo</span></div><div class="card-body">' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px">' +
      companies.map(function(c) {
        var f = flags[c.country] || '🏢';
        var isActive = c.id === activeId;
        return '<div style="background:' + (isActive ? 'var(--primary)' : 'var(--bg-secondary)') + ';color:' + (isActive ? '#fff' : 'var(--text-primary)') + ';border-radius:10px;padding:10px 14px;min-width:160px;cursor:pointer;border:2px solid ' + (isActive ? 'var(--primary)' : 'var(--border)') + '"' +
          ' onclick="setActiveCompany(\'' + c.id + '\');setTimeout(function(){navigate(\'ajustes\')},100)">' +
          '<div style="font-size:20px">' + f + '</div>' +
          '<div style="font-weight:700;font-size:13px;margin-top:4px">' + escapeHtml(c.legalName || c.name) + '</div>' +
          '<div style="font-size:11px;opacity:.75">' + escapeHtml(c.taxId || '') + '</div>' +
          (isActive ? '<div style="font-size:10px;margin-top:4px;font-weight:700;letter-spacing:.5px">ACTIVA</div>' : '') +
          '</div>';
      }).join('') +
      '</div></div></div>'
    : '';

  return companyList +
    '<div class="card mb-3">' +
    '<div class="card-header">' +
      '<span class="card-title">' + flag + ' <span style="margin-left:4px">' + escapeHtml(p.name) + '</span></span>' +
      '<button class="btn btn-sm btn-secondary" onclick="navigate(\'empresas\')"><i class="fas fa-edit"></i> Editar en Empresas</button>' +
    '</div>' +
    '<div class="card-body">' +
      row('CUIT / Tax ID', p.cuit) +
      row('Condición IVA', ivaLabels[p.iva_cond] || p.iva_cond) +
      row('Domicilio', p.address) +
      row('Ciudad', p.city) +
      row('Teléfono', p.phone) +
      row('Email', p.email) +
      row('N° IIBB', p.iibb) +
      row('País', p.country) +
      row('Moneda', p.currency) +
      '<div style="margin-top:16px;padding:12px;background:var(--bg-secondary);border-radius:8px;font-size:12px;color:var(--text-muted)">' +
        '<i class="fas fa-info-circle"></i> Estos datos se usan en facturas, órdenes de pago y documentos impresos. ' +
        'Para modificarlos, usá el módulo <strong onclick="navigate(\'empresas\')" style="cursor:pointer;color:var(--primary)">Empresas</strong>.' +
      '</div>' +
    '</div></div>';
}

// ---- STORAGE TAB ----
function buildStorageTab() {
  const st = DB.stats();
  const pct = parseFloat(st.pct);
  const barColor = pct > 80 ? 'red' : pct > 50 ? 'yellow' : 'green';

  const labels = {
    projects: 'Proyectos', suppliers: 'Proveedores', purchaseOrders: 'Órdenes de Compra',
    purchaseRequisitions: 'Solicitudes Compra', boqItems: 'Ítems Presupuesto',
    actualCosts: 'Costos Reales', ganttTasks: 'Tareas Gantt', invoices: 'Facturas',
    collections: 'Cobros', bankAccounts: 'Cuentas Bancarias', treasuryTx: 'Mov. Tesorería',
    accounts: 'Plan de Cuentas', rubros: 'Rubros de Obra', certificates: 'Certificaciones',
    paymentOrders: 'Órdenes de Pago', retentions: 'Retenciones', priceIndices: 'Índices de Precio',
    cashflowProjections: 'Proyecciones Cashflow', users: 'Usuarios', journalEntries: 'Asientos Contables',
  };

  var cards = st.collections.map(function(c) {
    return '<div style="background:var(--bg-secondary);border-radius:8px;padding:10px 14px;min-width:120px">' +
      '<div style="font-size:22px;font-weight:800;color:var(--primary)">' + c.count + '</div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + (labels[c.name] || c.name) + '</div>' +
      '</div>';
  }).join('');

  return '<div class="card mb-3">' +
    '<div class="card-header"><span class="card-title"><i class="fas fa-database text-primary"></i> Uso de Almacenamiento</span>' +
    '<span class="badge ' + (pct > 80 ? 'badge-red' : pct > 50 ? 'badge-yellow' : 'badge-green') + '">' + st.pct + '% usado</span></div>' +
    '<div class="card-body">' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px">' +
    '<span style="color:var(--text-muted)">localStorage utilizado</span>' +
    '<strong>' + st.kb + ' KB de ~5.120 KB</strong>' +
    '</div>' +
    progressBar(pct, barColor) +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px">' + cards + '</div>' +
    '<div style="margin-top:16px;font-size:12px;color:var(--text-muted)">' +
    '<i class="fas fa-info-circle"></i> Total: <strong>' + st.total + '</strong> registros en <strong>' + st.collections.length + '</strong> colecciones.' +
    '</div>' +
    '</div></div>';
}

// ---- BACKUP TAB ----
function buildBackupTab() {
  return '<div class="grid-2" style="gap:20px">' +
    '<div class="card">' +
    '<div class="card-header"><span class="card-title"><i class="fas fa-download text-success"></i> Exportar Datos</span></div>' +
    '<div class="card-body">' +
    '<p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">' +
    'Descargá una copia completa de todos los datos en formato JSON. Guardá este archivo regularmente como respaldo.' +
    '</p>' +
    '<button class="btn btn-primary" onclick="doExportBackup()">' +
    '<i class="fas fa-download"></i> Descargar Respaldo JSON</button>' +
    '</div></div>' +

    '<div class="card">' +
    '<div class="card-header"><span class="card-title"><i class="fas fa-upload text-warning"></i> Importar Datos</span></div>' +
    '<div class="card-body">' +
    '<p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">' +
    'Restaurá los datos desde un archivo JSON generado por este sistema. ' +
    '<strong style="color:var(--danger)">Reemplaza todos los datos actuales.</strong>' +
    '</p>' +
    '<input type="file" id="ajustes-import-file" accept=".json" style="display:none" onchange="doImportBackup(this)">' +
    '<button class="btn btn-secondary" onclick="document.getElementById(\'ajustes-import-file\').click()">' +
    '<i class="fas fa-upload"></i> Seleccionar Archivo JSON</button>' +
    '</div></div>' +
    '</div>' +

    '<div class="card mt-3">' +
    '<div class="card-header"><span class="card-title"><i class="fas fa-history text-primary"></i> Historial de Exportaciones</span></div>' +
    '<div class="card-body" id="ajustes-export-history">' + buildExportHistory() + '</div>' +
    '</div>' +

    '<div class="card mt-3">' +
    '<div class="card-header"><span class="card-title"><i class="fas fa-hdd text-info"></i> Respaldo Automático</span></div>' +
    '<div class="card-body">' +
    '<p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">' +
    'Respaldo local guardado en este navegador (localStorage). Útil para recuperación rápida ante errores.' +
    '</p>' +
    (function() {
      var ts = localStorage.getItem('erp_auto_backup_ts');
      return '<p style="font-size:12px;margin-bottom:16px"><strong>Último respaldo:</strong> ' +
        (ts ? '<span style="color:var(--success)">' + ts + '</span>' : '<span style="color:var(--text-muted)">Ninguno todavía</span>') +
        '</p>';
    })() +
    '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
    '<button class="btn btn-primary" onclick="doAutoBackup()">' +
    '<i class="fas fa-hdd"></i> Crear Respaldo Local Ahora</button>' +
    '<button class="btn btn-secondary" onclick="doRestoreAutoBackup()">' +
    '<i class="fas fa-undo"></i> Restaurar desde Respaldo Local</button>' +
    '</div>' +
    '</div></div>';
}

function buildExportHistory() {
  var history = [];
  try { history = JSON.parse(localStorage.getItem('erp_export_history') || '[]'); } catch(e) {}
  if (!history.length) return '<p style="color:var(--text-muted);font-size:13px">No hay exportaciones registradas en este dispositivo.</p>';
  return '<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Tamaño</th><th>Registros</th></tr></thead><tbody>' +
    history.slice().reverse().slice(0, 10).map(function(h) {
      return '<tr><td>' + fmtDatetime(h.date) + '</td><td>' + h.kb + ' KB</td><td>' + h.total + '</td></tr>';
    }).join('') +
    '</tbody></table></div>';
}

// ---- INTEGRITY TAB ----
function buildIntegrityEmpty() {
  return '<div class="card"><div class="card-body" style="text-align:center;padding:48px 20px">' +
    '<i class="fas fa-shield-alt" style="font-size:44px;color:var(--text-muted);display:block;margin-bottom:14px"></i>' +
    '<p style="color:var(--text-muted);margin-bottom:16px;font-size:13px">Verificá la consistencia de los datos entre todos los módulos del sistema.</p>' +
    '<button class="btn btn-primary" onclick="runAjustesIntegrity()">' +
    '<i class="fas fa-search"></i> Ejecutar Verificación</button>' +
    '</div></div>';
}

function runAjustesIntegrity() {
  var tab = document.getElementById('tab-ajustes-integrity');
  if (!tab) return;
  tab.innerHTML = '<div class="card"><div class="card-body" style="text-align:center;padding:32px">' +
    '<i class="fas fa-spinner fa-spin" style="font-size:24px;color:var(--primary)"></i>' +
    '<p style="margin-top:8px;color:var(--text-muted)">Analizando datos...</p>' +
    '</div></div>';

  setTimeout(function() {
    var issues = DB.integrity();
    var errors = issues.filter(function(i) { return i.severity === 'error'; });
    var warnings = issues.filter(function(i) { return i.severity === 'warning'; });
    var st = DB.stats();

    var html = '<div class="grid-3 mb-3">' +
      '<div class="stat-card"><div class="stat-icon ' + (errors.length ? 'red' : 'green') + '">' +
      '<i class="fas fa-' + (errors.length ? 'times' : 'check') + '-circle"></i></div>' +
      '<div><div class="stat-value ' + (errors.length ? 'text-danger' : 'text-success') + '">' + errors.length + '</div>' +
      '<div class="stat-label">Errores críticos</div></div></div>' +

      '<div class="stat-card"><div class="stat-icon ' + (warnings.length ? 'yellow' : 'green') + '">' +
      '<i class="fas fa-exclamation-triangle"></i></div>' +
      '<div><div class="stat-value ' + (warnings.length ? 'text-warning' : 'text-success') + '">' + warnings.length + '</div>' +
      '<div class="stat-label">Advertencias</div></div></div>' +

      '<div class="stat-card"><div class="stat-icon green"><i class="fas fa-database"></i></div>' +
      '<div><div class="stat-value">' + st.total + '</div>' +
      '<div class="stat-label">Registros totales</div></div></div>' +
      '</div>';

    if (!issues.length) {
      html += '<div class="card"><div class="card-body" style="text-align:center;padding:32px">' +
        '<i class="fas fa-check-circle" style="font-size:48px;color:var(--success);display:block;margin-bottom:12px"></i>' +
        '<p style="font-size:15px;font-weight:700;color:var(--success)">¡Todo en orden!</p>' +
        '<p style="color:var(--text-muted);font-size:13px">No se encontraron problemas de integridad.</p>' +
        '</div></div>';
    } else {
      html += '<div class="card">' +
        '<div class="card-header">' +
        '<span class="card-title"><i class="fas fa-exclamation-circle text-danger"></i> Problemas encontrados (' + issues.length + ')</span>' +
        '<button class="btn btn-sm btn-secondary" onclick="runAjustesIntegrity()"><i class="fas fa-sync"></i> Reejecutar</button>' +
        '</div>' +
        '<div class="card-body" style="padding:0"><div class="table-wrap"><table>' +
        '<thead><tr><th>Severidad</th><th>Colección</th><th>Descripción</th></tr></thead><tbody>' +
        issues.map(function(i) {
          var badge = i.severity === 'error' ? '<span class="badge badge-red">Error</span>' : '<span class="badge badge-yellow">Advertencia</span>';
          return '<tr><td>' + badge + '</td>' +
            '<td style="font-size:11px;color:var(--text-muted)">' + (i.collection || '-') + '</td>' +
            '<td style="font-size:12px">' + i.msg + '</td></tr>';
        }).join('') +
        '</tbody></table></div></div></div>';
    }

    html += '<div style="text-align:right;margin-top:12px">' +
      '<button class="btn btn-secondary btn-sm" onclick="runAjustesIntegrity()"><i class="fas fa-sync"></i> Reejecutar</button>' +
      '</div>';

    tab.innerHTML = html;
  }, 200);
}

// ---- SYSTEM TAB ----
function buildSystemTab() {
  var connGuess = (typeof _SUPA !== 'undefined' && _SUPA.online)
    ? '<span style="color:var(--success);font-weight:600"><i class="fas fa-circle" style="font-size:8px"></i> Conectado</span>'
    : '<span style="color:var(--text-muted);font-weight:600"><i class="fas fa-circle" style="font-size:8px"></i> Sin verificar / offline</span>';
  return '<div class="card mb-3">' +
    '<div class="card-header"><span class="card-title"><i class="fas fa-cloud text-primary"></i> Conexión Supabase (sincronización)</span></div>' +
    '<div class="card-body">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">' +
    '<div>' +
    '<div style="font-size:13px">Estado actual: <span id="supa-conn-state">' + connGuess + '</span></div>' +
    '<div id="supa-conn-detail" style="font-size:12px;color:var(--text-muted);margin-top:4px">Probá la conexión para ver el estado real del servidor.</div>' +
    '</div>' +
    '<button class="btn btn-primary btn-sm" id="supa-conn-btn" onclick="ajustesTestSupabase()"><i class="fas fa-plug"></i> Probar / Reconectar</button>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--text-muted);margin-top:10px;border-top:1px solid var(--border);padding-top:10px">' +
    'Si figura pausado o sin respuesta: entrá a <b>supabase.com</b> → tu proyecto → <b>Resume/Restore</b>, esperá 1-3 min y volvé a tocar este botón.' +
    '</div>' +
    '</div></div>' +

    '<div class="card mb-3">' +
    '<div class="card-header"><span class="card-title"><i class="fas fa-info-circle text-primary"></i> Información del Sistema</span></div>' +
    '<div class="card-body">' +
    '<div class="form-grid form-grid-2" style="gap:14px;font-size:13px">' +
    '<div><span style="color:var(--text-muted)">Versión: </span><strong>' + brandName() + ' v1.0</strong></div>' +
    '<div><span style="color:var(--text-muted)">Almacenamiento: </span><strong>localStorage</strong></div>' +
    '<div><span style="color:var(--text-muted)">Clave de datos: </span>' +
    '<code style="font-size:11px;background:var(--bg-secondary);padding:2px 8px;border-radius:4px">' + DB.KEY + '</code></div>' +
    '<div><span style="color:var(--text-muted)">Fecha del sistema: </span><strong>' + fmtDate(new Date().toISOString().split('T')[0]) + '</strong></div>' +
    '</div></div></div>' +

    '<div class="card" style="border:1px solid var(--danger)">' +
    '<div class="card-header" style="background:#fef2f2">' +
    '<span class="card-title text-danger"><i class="fas fa-exclamation-triangle"></i> Zona de Peligro</span>' +
    '</div>' +
    '<div class="card-body" style="padding:0">' +

    '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:1px solid var(--border)">' +
    '<div>' +
    '<div style="font-size:13px;font-weight:600">Reiniciar con datos de demostración</div>' +
    '<div style="font-size:12px;color:var(--text-muted)">Elimina todos los datos actuales y carga los datos de ejemplo originales.</div>' +
    '</div>' +
    '<button class="btn btn-danger" onclick="ajustesConfirmReset()">' +
    '<i class="fas fa-undo"></i> Reiniciar Demo</button>' +
    '</div>' +

    '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:1px solid var(--border)">' +
    '<div>' +
    '<div style="font-size:13px;font-weight:600">Borrar todos los datos</div>' +
    '<div style="font-size:12px;color:var(--text-muted)">Elimina permanentemente todos los datos. No se puede deshacer.</div>' +
    '</div>' +
    '<button class="btn btn-danger" onclick="ajustesConfirmWipe()">' +
    '<i class="fas fa-trash"></i> Borrar Todo</button>' +
    '</div>' +

    '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px">' +
    '<div>' +
    '<div style="font-size:13px;font-weight:600">Limpiar caché del navegador y actualizar</div>' +
    '<div style="font-size:12px;color:var(--text-muted)">Elimina el Service Worker y todos los archivos en caché. Usá esto si la app muestra contenido desactualizado.</div>' +
    '</div>' +
    '<button class="btn btn-warning" onclick="clearCacheAndReload()" style="background:#f59e0b;color:#fff;border-color:#f59e0b">' +
    '<i class="fas fa-rotate"></i> Limpiar Caché</button>' +
    '</div>' +

    '</div></div>';
}

// ---- SUPABASE CONNECTION TEST ----
function ajustesTestSupabase() {
  var stateEl  = document.getElementById('supa-conn-state');
  var detailEl = document.getElementById('supa-conn-detail');
  var btn      = document.getElementById('supa-conn-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Probando...'; }
  if (stateEl) stateEl.innerHTML = '<span style="color:var(--text-muted)"><i class="fas fa-circle" style="font-size:8px"></i> Verificando…</span>';

  Promise.resolve(_SUPA.ping()).then(function(res) {
    if (res.ok) {
      if (stateEl) stateEl.innerHTML = '<span style="color:var(--success);font-weight:600"><i class="fas fa-circle" style="font-size:8px"></i> Conectado</span>';
      if (detailEl) detailEl.textContent = 'Servidor accesible. Sincronizando datos…';
      // Reconectar y bajar datos
      return Promise.resolve(DB.forcePull()).then(function() {
        _SUPA.online = true;
        if (typeof _updateSyncBadge === 'function') _updateSyncBadge();
        if (detailEl) detailEl.textContent = 'Conectado y sincronizado ✓';
        if (typeof toast === 'function') toast('Supabase reconectado y sincronizado', 'success');
      });
    } else {
      if (stateEl) stateEl.innerHTML = '<span style="color:var(--danger);font-weight:600"><i class="fas fa-circle" style="font-size:8px"></i> Sin conexión</span>';
      if (detailEl) detailEl.textContent = res.detail + (res.status ? ' (HTTP ' + res.status + ')' : '');
      if (typeof toast === 'function') toast('No se pudo conectar a Supabase', 'error');
    }
  }).catch(function(e) {
    if (stateEl) stateEl.innerHTML = '<span style="color:var(--danger);font-weight:600"><i class="fas fa-circle" style="font-size:8px"></i> Error</span>';
    if (detailEl) detailEl.textContent = 'Error al probar: ' + ((e && e.message) || 'desconocido');
  }).then(function() {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plug"></i> Probar / Reconectar'; }
  });
}

// ---- ACTIONS ----
function doExportBackup() {
  var st = DB.stats();
  var history = [];
  try { history = JSON.parse(localStorage.getItem('erp_export_history') || '[]'); } catch(e) {}
  history.push({ date: new Date().toISOString(), kb: st.kb, total: st.total });
  if (history.length > 20) history.shift();
  localStorage.setItem('erp_export_history', JSON.stringify(history));
  DB.export();
  toast('Respaldo descargado correctamente', 'success');
  var el = document.getElementById('ajustes-export-history');
  if (el) el.innerHTML = buildExportHistory();
}

function clearCacheAndReload() {
  confirmDialog('Se eliminarán el Service Worker y el caché del navegador. La página se recargará desde el servidor. ¿Continuar?', function() {
    var done = function() { window.location.href = window.location.href.split('?')[0] + '?nocache=' + Date.now(); };
    var cleared = false;
    if ('caches' in window) {
      caches.keys().then(function(names) {
        return Promise.all(names.map(function(n) { return caches.delete(n); }));
      }).then(function() { cleared = true; }).catch(function() {});
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        return Promise.all(regs.map(function(r) { return r.unregister(); }));
      }).then(done).catch(done);
    } else {
      done();
    }
  });
}

function doImportBackup(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    confirmDialog(
      'Importar datos desde "' + file.name + '"? Esto reemplazará TODOS los datos actuales. Exportá un respaldo antes si es necesario.',
      function() {
        var result = DB.importData(e.target.result);
        if (result.ok) {
          toast('Datos importados. Recargando...', 'success');
          setTimeout(function() { location.reload(); }, 1500);
        } else {
          toast('Error al importar: ' + result.error, 'error');
        }
      }
    );
  };
  reader.readAsText(file);
  input.value = '';
}

function doAutoBackup() {
  var ok = DB.autoBackupToLocal();
  if (ok) toast('Respaldo local guardado', 'success');
  else toast('No se pudo guardar el respaldo (almacenamiento lleno)', 'error');
  renderAjustes();
}

function doRestoreAutoBackup() {
  var ts = localStorage.getItem('erp_auto_backup_ts');
  if (!ts) { toast('No hay respaldo local disponible', 'error'); return; }
  confirmDialog('Restaurar respaldo del ' + ts + '? Se reemplazarán los datos actuales.', function() {
    var ok = DB.restoreAutoBackup();
    if (ok) { toast('Datos restaurados. Recargando...', 'success'); setTimeout(function() { location.reload(); }, 1500); }
    else toast('Error al restaurar el respaldo', 'error');
  });
}

function ajustesConfirmReset() {
  confirmDialog(
    'Reiniciar con datos de demostración? Se perderán todos los datos actuales. Exportá un respaldo primero si querés conservarlos.',
    function() {
      DB.resetToSeed();
      toast('Datos reiniciados. Recargando...', 'success');
      setTimeout(function() { location.reload(); }, 1500);
    }
  );
}

function ajustesConfirmWipe() {
  openModal('Confirmar borrado total',
    '<p style="color:var(--danger);font-size:14px;font-weight:600">Esta acción no se puede deshacer.</p>' +
    '<p style="font-size:13px;margin-top:8px">Para confirmar, escribí <strong>BORRAR</strong> en el campo:</p>' +
    '<input class="form-control mt-2" id="ajustes-wipe-input" placeholder="Escribí BORRAR">',
    'modal-sm',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-danger" onclick="ajustesDoWipe()"><i class="fas fa-trash"></i> Borrar Todo</button>'
  );
}

function ajustesDoWipe() {
  var inp = document.getElementById('ajustes-wipe-input');
  if (!inp || inp.value.trim() !== 'BORRAR') {
    toast('Escribí BORRAR para confirmar', 'error');
    return;
  }
  toast('Borrando datos (local y servidor)...', 'warning');
  closeModal();
  // Borra local Y remoto (Supabase) para que el pull no re-hidrate los datos.
  // keepScaffolding=true deja la empresa vacía pero usable (plan de cuentas,
  // rubros, usuario admin), sin re-sembrar los ~499 registros demo.
  Promise.resolve(DB.wipeCompanyData(true)).then(function() {
    setTimeout(function() { location.reload(); }, 1200);
  }).catch(function() {
    setTimeout(function() { location.reload(); }, 1200);
  });
}
