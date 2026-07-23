/* ===== SETTINGS / DATA MANAGEMENT ===== */
// Since all ERP data lives in localStorage, these tools let the user back up,
// restore and reset that data — the safety net for real-world use (browser
// wipes, device changes, sharing a dataset).

function storageInfo() {
  let bytes = 0;
  try { bytes = new Blob([JSON.stringify(DB.get())]).size; } catch { bytes = 0; }
  const kb = bytes / 1024;
  const size = kb < 1024 ? kb.toFixed(1) + ' KB' : (kb / 1024).toFixed(2) + ' MB';
  const db = DB.get();
  const counts = {
    Proyectos: (db.projects || []).length,
    Proveedores: (db.suppliers || []).length,
    'Órdenes de compra': (db.purchaseOrders || []).length,
    Facturas: (db.invoices || []).length,
    'Tareas Gantt': (db.ganttTasks || []).length,
    'Asientos contables': (db.journalEntries || []).length,
  };
  return { size, counts };
}

function openSettings() {
  const { size, counts } = storageInfo();
  const rows = Object.entries(counts)
    .map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
        <span style="color:var(--text-muted)">${escapeHtml(k)}</span><strong>${fmtNum(v)}</strong></div>`)
    .join('');

  const user = (typeof DB.currentUser === 'function') ? DB.currentUser() : null;
  const userSection = (DB.mode === 'supabase' && user) ? `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;background:var(--bg);border-radius:var(--radius-sm)">
        <div style="font-size:13px;overflow:hidden;text-overflow:ellipsis">
          <i class="fas fa-user-circle" style="color:var(--primary)"></i> ${escapeHtml(user.email || 'Usuario')}
        </div>
        <button class="btn btn-secondary btn-sm" onclick="logout()">
          <i class="fas fa-right-from-bracket"></i> Cerrar sesión
        </button>
      </div>` : '';

  openModal('Configuración y datos', `
    <div style="display:flex;flex-direction:column;gap:20px">

      ${userSection}

      <div>
        <h4 style="font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:8px">
          <i class="fas fa-database"></i> Almacenamiento local
        </h4>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">
          Los datos se guardan en este navegador. Espacio usado: <strong>${size}</strong>.
        </p>
        ${rows}
      </div>

      <div>
        <h4 style="font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:8px">
          <i class="fas fa-shield-halved"></i> Copia de seguridad
        </h4>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
          Descargá un respaldo completo o restaurá los datos desde un archivo previo.
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="exportBackup()">
            <i class="fas fa-download"></i> Exportar respaldo
          </button>
          <button class="btn btn-secondary" onclick="document.getElementById('backup-file-input').click()">
            <i class="fas fa-upload"></i> Importar respaldo
          </button>
          <input type="file" id="backup-file-input" accept="application/json,.json" style="display:none"
                 onchange="handleBackupFile(this.files[0]); this.value=''">
        </div>
      </div>

      <div>
        <h4 style="font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:8px">
          <i class="fas fa-triangle-exclamation text-danger"></i> Zona de riesgo
        </h4>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
          Restablece todos los datos a los valores de demostración. Esta acción no se puede deshacer.
        </p>
        <button class="btn btn-danger" onclick="resetDemoData()">
          <i class="fas fa-rotate-left"></i> Restablecer datos de demo
        </button>
      </div>

    </div>
  `, '', `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`);
}

function exportBackup() {
  try {
    const data = JSON.stringify(DB.get(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erp-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Respaldo descargado', 'success');
  } catch (e) {
    console.error('Backup export failed:', e);
    toast('No se pudo generar el respaldo', 'error');
  }
}

function handleBackupFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try {
      parsed = JSON.parse(reader.result);
    } catch {
      toast('El archivo no es un respaldo válido (JSON inválido)', 'error');
      return;
    }
    // Minimal shape validation to avoid loading unrelated files.
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.projects)) {
      toast('El archivo no parece un respaldo del ERP', 'error');
      return;
    }
    const projCount = parsed.projects.length;
    // confirmDialog injects the callback via fn.toString(), so it runs in global
    // scope and can't close over `parsed`. Stash it on window instead.
    window._pendingBackup = parsed;
    confirmDialog(
      `Se reemplazarán todos los datos actuales por el respaldo (${projCount} proyecto/s). ¿Continuar?`,
      applyPendingBackup
    );
  };
  reader.onerror = () => toast('No se pudo leer el archivo', 'error');
  reader.readAsText(file);
}

// Self-contained (only touches globals) so it survives confirmDialog's toString().
function applyPendingBackup() {
  const data = window._pendingBackup;
  window._pendingBackup = null;
  if (!data) return;
  try {
    DB.save(data);
    populateProjectSelector();
    window.APP_STATE.activeProject = '';
    navigate(window.APP_STATE.currentModule || 'dashboard');
    toast('Respaldo restaurado correctamente', 'success');
  } catch (e) {
    console.error('Backup restore failed:', e);
    toast('No se pudo restaurar el respaldo', 'error');
  }
}

function resetDemoData() {
  confirmDialog(
    'Se borrarán todos los datos y se cargarán los de demostración. ¿Continuar?',
    () => {
      DB.reset();
      populateProjectSelector();
      window.APP_STATE.activeProject = '';
      navigate('dashboard');
      toast('Datos de demostración restaurados', 'success');
    }
  );
}
