/* ===== COMPROBANTES ADJUNTOS ===== */

var ATT_LABELS = {
  supplierInvoices: 'Factura de Proveedor',
  paymentOrders:    'Orden de Pago',
  invoices:         'Factura Emitida',
  collections:      'Recibo de Cobranza',
};

var ATT_ICONS = {
  'pdf':  'fa-file-pdf',
  'jpg':  'fa-file-image',
  'jpeg': 'fa-file-image',
  'png':  'fa-file-image',
  'xml':  'fa-file-code',
  'xlsx': 'fa-file-excel',
  'xls':  'fa-file-excel',
};

function _attExt(name) { return (name || '').split('.').pop().toLowerCase(); }
function _attIcon(name) { return ATT_ICONS[_attExt(name)] || 'fa-file'; }
function _attSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1024/1024).toFixed(1) + ' MB';
}

// ── PUBLIC: open attachments modal ──────────────────────────
function openAttachmentsModal(collection, recordId) {
  if (!_SUPA.session) {
    toast('Necesitás estar autenticado con Supabase para usar adjuntos', 'warning');
    return;
  }
  var record = DB.getById(collection, recordId);
  if (!record) { toast('Registro no encontrado', 'error'); return; }

  var label = ATT_LABELS[collection] || collection;
  var ref   = record.number || record.reference || recordId.slice(0,8);

  openModal(
    '<i class="fas fa-paperclip" style="margin-right:8px"></i>Comprobantes — ' + escapeHtml(label) + ' ' + escapeHtml(ref),
    _attModalBody(collection, recordId),
    '',
    '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>' +
    '<button class="btn btn-primary" onclick="attUpload(\'' + collection + '\',\'' + recordId + '\')"><i class="fas fa-upload"></i> Adjuntar archivo</button>'
  );
}

function _attModalBody(collection, recordId) {
  var record = DB.getById(collection, recordId);
  var atts = (record && record.attachments) || [];

  if (!atts.length) {
    return '<div id="att-list-' + recordId + '">' +
      '<div style="text-align:center;padding:32px;color:var(--text-muted)">' +
        '<i class="fas fa-paperclip" style="font-size:28px;display:block;margin-bottom:10px;opacity:.3"></i>' +
        'Sin comprobantes adjuntos.<br><small>Adjuntá facturas, remitos, recibos o cualquier comprobante en PDF, imagen o XML.</small>' +
      '</div></div>';
  }

  return '<div id="att-list-' + recordId + '">' +
    '<div class="table-wrap"><table style="font-size:13px"><thead><tr>' +
      '<th>Archivo</th><th>Tamaño</th><th>Fecha</th><th></th>' +
    '</tr></thead><tbody>' +
    atts.map(function(a, i) {
      var ext = _attExt(a.name);
      var dateStr = a.uploaded_at ? new Date(a.uploaded_at).toLocaleDateString('es-AR') : '—';
      return '<tr>' +
        '<td><i class="fas ' + _attIcon(a.name) + '" style="color:#ef4444;margin-right:6px"></i>' + escapeHtml(a.name) + '</td>' +
        '<td style="color:var(--text-muted)">' + _attSize(a.size) + '</td>' +
        '<td style="color:var(--text-muted)">' + dateStr + '</td>' +
        '<td style="white-space:nowrap">' +
          '<button class="btn btn-sm btn-secondary" onclick="attOpen(\'' + escapeHtml(a.path) + '\')" title="Ver"><i class="fas fa-eye"></i></button> ' +
          '<button class="btn btn-sm" style="color:var(--danger)" onclick="attDelete(\'' + collection + '\',\'' + recordId + '\',' + i + ')" title="Eliminar"><i class="fas fa-trash"></i></button>' +
        '</td>' +
      '</tr>';
    }).join('') +
    '</tbody></table></div></div>';
}

function _attRefreshList(collection, recordId) {
  var el = document.getElementById('att-list-' + recordId);
  if (el) el.outerHTML = _attModalBody(collection, recordId);
}

// ── Upload ───────────────────────────────────────────────────
function attUpload(collection, recordId) {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.jpg,.jpeg,.png,.xml,.xlsx,.xls';
  input.onchange = async function() {
    var file = input.files[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { toast('El archivo no puede superar 15 MB', 'error'); return; }

    // Disable upload button
    var btn = document.querySelector('.modal-footer .btn-primary');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo…'; }

    var result = await _SUPA.uploadFile(collection, recordId, file);

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-upload"></i> Adjuntar archivo'; }

    if (result.error) {
      toast('Error al subir: ' + result.error.message, 'error');
      return;
    }

    // Persist path in DB record
    var record = DB.getById(collection, recordId);
    var atts = JSON.parse(JSON.stringify((record && record.attachments) || []));
    atts.push({ name: file.name, path: result.path, size: file.size, uploaded_at: new Date().toISOString() });
    DB.update(collection, recordId, { attachments: atts });

    toast('Comprobante adjuntado', 'success');
    _attRefreshList(collection, recordId);
  };
  input.click();
}

// ── Open (signed URL) ────────────────────────────────────────
async function attOpen(path) {
  var loadToast = toast('Generando enlace…', 'info');
  var url = await _SUPA.getFileUrl(path);
  if (!url) { toast('No se pudo obtener el enlace. Verificá que el bucket exista en Supabase.', 'error'); return; }
  window.open(url, '_blank');
}

// ── Delete ───────────────────────────────────────────────────
async function attDelete(collection, recordId, idx) {
  if (!confirm('¿Eliminar este comprobante?')) return;
  var record = DB.getById(collection, recordId);
  var atts = JSON.parse(JSON.stringify((record && record.attachments) || []));
  var att = atts[idx];
  if (!att) return;
  await _SUPA.deleteFile(att.path);
  atts.splice(idx, 1);
  DB.update(collection, recordId, { attachments: atts });
  toast('Comprobante eliminado', 'success');
  _attRefreshList(collection, recordId);
}

// ── Badge helper (shows count in table rows) ─────────────────
function attBadge(record) {
  var n = ((record && record.attachments) || []).length;
  if (!n) return '<button class="btn-ghost btn btn-sm" title="Adjuntar comprobante" onclick="openAttachmentsModal(\'{col}\',\'{id}\')"><i class="fas fa-paperclip" style="opacity:.4"></i></button>';
  return '<button class="btn-ghost btn btn-sm" title="' + n + ' comprobante(s) adjunto(s)" onclick="openAttachmentsModal(\'{col}\',\'{id}\')" style="position:relative">' +
    '<i class="fas fa-paperclip" style="color:var(--primary)"></i>' +
    '<span style="position:absolute;top:-4px;right:-4px;background:var(--primary);color:#fff;border-radius:50%;font-size:9px;width:14px;height:14px;display:flex;align-items:center;justify-content:center;font-weight:700">' + n + '</span>' +
  '</button>';
}
