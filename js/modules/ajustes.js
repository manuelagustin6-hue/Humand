/* ===== AJUSTES DEL SISTEMA ===== */
function renderAjustes() {
  document.getElementById('content').innerHTML =
    '<div class="page-header"><div>' +
    '<div class="page-title">Ajustes del Sistema</div>' +
    '<div class="page-subtitle">Almacenamiento, respaldo de datos e integridad</div>' +
    '</div></div>' +
    '<div id="ajustes-tabs">' +
    '<div class="tabs">' +
    '<button class="tab-btn" data-tab="tab-ajustes-storage">Almacenamiento</button>' +
    '<button class="tab-btn" data-tab="tab-ajustes-backup">Respaldo</button>' +
    '<button class="tab-btn" data-tab="tab-ajustes-integrity">Integridad</button>' +
    '<button class="tab-btn" data-tab="tab-ajustes-system">Sistema</button>' +
    '</div>' +
    '<div id="tab-ajustes-storage" class="tab-content">' + buildStorageTab() + '</div>' +
    '<div id="tab-ajustes-backup" class="tab-content">' + buildBackupTab() + '</div>' +
    '<div id="tab-ajustes-integrity" class="tab-content">' + buildIntegrityEmpty() + '</div>' +
    '<div id="tab-ajustes-system" class="tab-content">' + buildSystemTab() + '</div>' +
    '</div>';
  initTabs('ajustes-tabs');
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
  return '<div class="card mb-3">' +
    '<div class="card-header"><span class="card-title"><i class="fas fa-info-circle text-primary"></i> Información del Sistema</span></div>' +
    '<div class="card-body">' +
    '<div class="form-grid form-grid-2" style="gap:14px;font-size:13px">' +
    '<div><span style="color:var(--text-muted)">Versión: </span><strong>ConstructERP v1.0</strong></div>' +
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
  localStorage.removeItem(DB.KEY);
  toast('Todos los datos eliminados. Recargando...', 'warning');
  closeModal();
  setTimeout(function() { location.reload(); }, 1500);
}
