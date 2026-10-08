/* ===== IMPORTADOR DE DATOS (migración Lebane → Rise) =====
 * Motor genérico de importación por entidad, generalizando el patrón probado del
 * import de Órdenes de Pedido: subir Excel/CSV → auto-mapear columnas por "hints"
 * → previsualizar con validación fila por fila → confirmar (inserta las válidas).
 *
 * Cada entidad se define en IMPORT_SPECS con sus campos (label, hints, required,
 * type) y un toRecord(get) que arma el registro destino. Para importar una entidad
 * nueva, agregar un spec — no hay que tocar el motor.
 *
 * Orden recomendado (dependencias): maestros primero (proveedores, clientes,
 * proyectos, rubros, plan de cuentas) y luego los movimientos que los referencian.
 */

function _impTxt(v) { return v == null ? '' : String(v).trim(); }
function _impMulti(v) { return _impTxt(v) ? _impTxt(v).split(/[;,/|]/).map(function (s) { return s.trim(); }).filter(Boolean) : []; }

var IMPORT_SPECS = {
  suppliers: {
    label: 'Proveedores', icon: 'fa-truck', collection: 'suppliers',
    fields: [
      { key: 'name', label: 'Nombre / Razón social', hints: ['nombre', 'razon', 'proveedor', 'cuenta'], required: true },
      { key: 'cuit', label: 'CUIT / Documento', hints: ['cuit', 'rut', 'ein', 'documento', 'dni'] },
      { key: 'contact', label: 'Contacto', hints: ['contacto', 'titular', 'responsable'] },
      { key: 'phone', label: 'Teléfono', hints: ['telefono', 'teléfono', 'tel', 'phone'] },
      { key: 'email', label: 'Email', hints: ['email', 'correo', 'mail'] },
      { key: 'address', label: 'Dirección', hints: ['direccion', 'dirección', 'domicilio', 'calle', 'address'] },
      { key: 'category', label: 'Rubros / Categorías', hints: ['rubro', 'categoria', 'categoría', 'rubros'] },
      { key: 'status', label: 'Estado', hints: ['estado', 'status'] },
    ],
    toRecord: function (g) {
      return {
        name: _impTxt(g('name')), cuit: _impTxt(g('cuit')), contact: _impTxt(g('contact')),
        phone: _impTxt(g('phone')), email: _impTxt(g('email')), address: _impTxt(g('address')),
        category: _impMulti(g('category')), status: _impTxt(g('status')).toLowerCase() || 'active',
      };
    },
  },

  clientes: {
    label: 'Clientes', icon: 'fa-users', collection: 'clientes',
    fields: [
      { key: 'name', label: 'Nombre', hints: ['nombre', 'cliente', 'razon'], required: true },
      { key: 'doc_type', label: 'Tipo doc', hints: ['tipo doc', 'tipo de doc', 'doc_type'] },
      { key: 'doc_number', label: 'Nº documento', hints: ['documento', 'cuit', 'dni', 'doc', 'numero'] },
      { key: 'phone', label: 'Teléfono', hints: ['telefono', 'teléfono', 'tel', 'phone'] },
      { key: 'email', label: 'Email', hints: ['email', 'correo', 'mail'] },
      { key: 'address', label: 'Dirección', hints: ['direccion', 'dirección', 'domicilio', 'address'] },
      { key: 'notes', label: 'Notas', hints: ['nota', 'observ', 'coment'] },
    ],
    toRecord: function (g) {
      return {
        name: _impTxt(g('name')), doc_type: _impTxt(g('doc_type')) || 'DNI', doc_number: _impTxt(g('doc_number')),
        phone: _impTxt(g('phone')), email: _impTxt(g('email')), address: _impTxt(g('address')), notes: _impTxt(g('notes')),
      };
    },
  },

  projects: {
    label: 'Proyectos / Obras', icon: 'fa-building', collection: 'projects',
    fields: [
      { key: 'name', label: 'Nombre de la obra', hints: ['nombre', 'obra', 'proyecto'], required: true },
      { key: 'client', label: 'Cliente', hints: ['cliente'] },
      { key: 'type', label: 'Tipo', hints: ['tipo', 'vertical'] },
      { key: 'status', label: 'Estado', hints: ['estado', 'status'] },
      { key: 'start_date', label: 'Fecha inicio', hints: ['inicio', 'desde', 'start'], type: 'date' },
      { key: 'end_date', label: 'Fecha fin', hints: ['fin', 'hasta', 'end'], type: 'date' },
      { key: 'budget', label: 'Presupuesto', hints: ['presupuesto', 'budget', 'monto'], type: 'num' },
      { key: 'address', label: 'Dirección', hints: ['direccion', 'dirección', 'ubicacion', 'ubicación', 'address'] },
    ],
    toRecord: function (g) {
      return {
        name: _impTxt(g('name')), client: _impTxt(g('client')), type: _impTxt(g('type')).toLowerCase() || 'residential',
        status: _impTxt(g('status')).toLowerCase() || 'active',
        start_date: _impDate(g('start_date')), end_date: _impDate(g('end_date')),
        budget: _impNum(g('budget')), address: _impTxt(g('address')),
      };
    },
  },
};

function _impNum(v) { return (typeof numParse === 'function' ? numParse(v) : parseFloat(v)) || 0; }
function _impDate(v) {
  var s = _impTxt(v);
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/); // dd/mm/yyyy
  if (m) { var y = m[3].length === 2 ? '20' + m[3] : m[3]; return y + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); }
  return s;
}

/* ───────────────────────────────────────────── VIEW */
function renderImportador() {
  window._imp = null; window._impEntity = null;
  var cards = Object.keys(IMPORT_SPECS).map(function (k) {
    var s = IMPORT_SPECS[k];
    var count = DB.getAll(s.collection).length;
    return `<button class="imp-card" onclick="impPick('${k}')">
      <i class="fas ${s.icon}"></i>
      <span class="imp-card-label">${escapeHtml(s.label)}</span>
      <span class="imp-card-count">${count} en sistema</span>
    </button>`;
  }).join('');

  document.getElementById('content').innerHTML = `
<style>
  .imp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px; margin:8px 0 20px; }
  .imp-card { display:flex; flex-direction:column; align-items:flex-start; gap:4px; padding:16px; border:1px solid var(--border,#e2e8f0); border-radius:10px; background:var(--card-bg,#fff); cursor:pointer; text-align:left; transition:all .15s; }
  .imp-card:hover { border-color:var(--primary,#2563eb); box-shadow:0 2px 8px rgba(0,0,0,.06); }
  .imp-card i { font-size:20px; color:var(--primary,#2563eb); }
  .imp-card-label { font-weight:600; font-size:14px; }
  .imp-card-count { font-size:11px; color:var(--text-muted,#64748b); }
  .imp-status-ok { color:var(--success,#059669); font-weight:600; }
  .imp-status-err { color:var(--danger,#dc2626); font-weight:600; }
</style>
<div class="page-header">
  <div>
    <div class="page-title">Importador de Datos</div>
    <div class="page-subtitle">Migración desde Lebane — subí Excel/CSV, revisá el mapeo y confirmá</div>
  </div>
</div>
<div class="note" style="font-size:12px;color:var(--text-muted);background:var(--bg,#f1f5f9);border-radius:8px;padding:10px 14px;margin-bottom:12px">
  <i class="fas fa-circle-info"></i> Importá primero los <strong>maestros</strong> (proveedores, clientes, proyectos) y después los movimientos que los referencian. La primera fila del archivo debe ser el encabezado.
</div>
<div class="imp-grid">${cards}</div>
<div id="imp-area"></div>`;
  document.getElementById('breadcrumb').innerHTML = '<i class="fas fa-file-import"></i><span>Importador</span>';
}

function impPick(key) {
  window._impEntity = key; window._imp = null;
  var s = IMPORT_SPECS[key];
  var cols = s.fields.map(function (f) { return f.label + (f.required ? ' *' : ''); }).join(', ');
  document.getElementById('imp-area').innerHTML = `
  <div class="card"><div class="card-body">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px">
      <strong><i class="fas ${s.icon}"></i> Importar ${escapeHtml(s.label)}</strong>
      <button class="btn btn-sm btn-secondary" onclick="impTemplate()"><i class="fas fa-download"></i> Descargar plantilla</button>
    </div>
    <div class="form-group">
      <label class="form-label">Archivo Excel / CSV</label>
      <input type="file" class="form-control" accept=".xlsx,.xls,.csv" onchange="impParseFile(this)">
    </div>
    <div style="font-size:11px;color:var(--text-muted)">Columnas esperadas: ${escapeHtml(cols)} &nbsp;(* obligatorio)</div>
    <div id="imp-result" style="margin-top:12px"></div>
  </div></div>`;
}

function impTemplate() {
  var s = IMPORT_SPECS[window._impEntity]; if (!s) return;
  if (typeof exportCSV === 'function') exportCSV('plantilla_' + window._impEntity + '.csv', s.fields.map(function (f) { return f.label; }), []);
}

function impParseFile(input) {
  if (typeof XLSX === 'undefined') { toast('La librería de Excel no está cargada', 'error'); return; }
  var file = input && input.files && input.files[0];
  if (!file) return;
  var s = IMPORT_SPECS[window._impEntity];
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: false });
      var ws = wb.Sheets[wb.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, raw: false, defval: '' });
      if (!rows.length) { toast('El archivo está vacío', 'error'); return; }
      var headers = (rows[0] || []).map(function (h) { return _impTxt(h); });
      var data = rows.slice(1).filter(function (r) { return (r || []).some(function (c) { return _impTxt(c) !== ''; }); });
      var map = {};
      s.fields.forEach(function (f) {
        var idx = -1;
        for (var i = 0; i < headers.length && idx < 0; i++) {
          var h = headers[i].toLowerCase();
          if (f.hints.some(function (k) { return h.indexOf(k) !== -1; })) idx = i;
        }
        map[f.key] = idx;
      });
      window._imp = { headers: headers, rows: data, map: map };
      impRender();
    } catch (err) {
      toast('No se pudo leer el archivo: ' + (err.message || err), 'error');
    }
  };
  reader.onerror = function () { toast('Error al leer el archivo', 'error'); };
  reader.readAsArrayBuffer(file);
}

function impGet(row, key) {
  var i = window._imp.map[key];
  return (i != null && i >= 0 && i < row.length) ? row[i] : '';
}

function impRowToRecord(row) {
  var s = IMPORT_SPECS[window._impEntity];
  return s.toRecord(function (k) { return impGet(row, k); });
}

function impValidate(rec) {
  var s = IMPORT_SPECS[window._impEntity];
  var errs = [];
  s.fields.forEach(function (f) {
    if (f.required && !_impTxt(rec[f.key])) errs.push('falta ' + f.label);
  });
  return errs;
}

function impRender() {
  var imp = window._imp, s = IMPORT_SPECS[window._impEntity];
  var wrap = document.getElementById('imp-result'); if (!wrap || !imp) return;
  var colOpts = function (sel) {
    var o = '<option value="-1">— (ninguna) —</option>';
    imp.headers.forEach(function (h, i) { o += '<option value="' + i + '"' + (sel === i ? ' selected' : '') + '>' + escapeHtml(h || ('Columna ' + (i + 1))) + '</option>'; });
    return o;
  };
  var maps = '<div class="form-grid form-grid-3" style="margin:4px 0 14px">' +
    s.fields.map(function (f) {
      return '<div class="form-group"><label class="form-label">' + escapeHtml(f.label) + (f.required ? ' *' : '') + '</label>' +
        '<select class="form-control" onchange="impSetMap(\'' + f.key + '\',this.value)">' + colOpts(imp.map[f.key]) + '</select></div>';
    }).join('') + '</div>';

  // Conteo válidas/erróneas
  var okN = 0, errN = 0;
  imp.rows.forEach(function (r) { (impValidate(impRowToRecord(r)).length ? errN++ : okN++); });

  wrap.innerHTML =
    '<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Detectamos <strong>' + imp.rows.length + '</strong> fila(s). Revisá el mapeo de columnas:</div>' +
    maps +
    '<div style="font-size:12px;margin-bottom:6px"><span class="imp-status-ok">' + okN + ' válidas</span>' + (errN ? ' · <span class="imp-status-err">' + errN + ' con error</span>' : '') + '</div>' +
    '<div id="imp-preview" style="overflow-x:auto">' + impPreviewTable() + '</div>' +
    '<div style="margin-top:14px;text-align:right">' +
      '<button class="btn btn-primary" onclick="impApply()" ' + (okN ? '' : 'disabled') + '><i class="fas fa-check"></i> Importar ' + okN + ' fila(s) válida(s)</button>' +
    '</div>';
}

function impSetMap(key, val) {
  if (!window._imp) return;
  window._imp.map[key] = parseInt(val, 10);
  impRender();
}

function impPreviewTable() {
  var imp = window._imp, s = IMPORT_SPECS[window._impEntity];
  var cols = s.fields;
  var head = '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:var(--bg,#f8f9fb)">' +
    '<th style="padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#94a3b8">Estado</th>' +
    cols.map(function (c) { return '<th style="padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#94a3b8">' + escapeHtml(c.label) + '</th>'; }).join('') +
    '</tr></thead><tbody>';
  var body = imp.rows.slice(0, 10).map(function (r) {
    var rec = impRowToRecord(r);
    var errs = impValidate(rec);
    var C = 'padding:6px 8px;border-bottom:1px solid #f1f5f9';
    var status = errs.length
      ? '<span class="imp-status-err" title="' + escapeHtml(errs.join(', ')) + '">✗ ' + escapeHtml(errs.join(', ')) + '</span>'
      : '<span class="imp-status-ok">✓ OK</span>';
    return '<tr><td style="' + C + '">' + status + '</td>' +
      cols.map(function (c) {
        var v = rec[c.key]; if (Array.isArray(v)) v = v.join(', ');
        return '<td style="' + C + '">' + (_impTxt(v) ? escapeHtml(_impTxt(v)) : '<span style="color:#cbd5e1">—</span>') + '</td>';
      }).join('') + '</tr>';
  }).join('');
  var more = imp.rows.length > 10 ? '<tr><td colspan="' + (cols.length + 1) + '" style="padding:6px 8px;color:#94a3b8;font-size:11px">… y ' + (imp.rows.length - 10) + ' fila(s) más</td></tr>' : '';
  return head + body + more + '</tbody></table>';
}

function impApply() {
  var imp = window._imp, s = IMPORT_SPECS[window._impEntity];
  if (!imp) return;
  var ok = 0, skip = 0;
  imp.rows.forEach(function (r) {
    var rec = impRowToRecord(r);
    if (impValidate(rec).length) { skip++; return; }
    DB.insert(s.collection, rec);
    ok++;
  });
  toast(ok + ' ' + s.label.toLowerCase() + ' importado(s)' + (skip ? ' · ' + skip + ' omitida(s) por error' : ''), ok ? 'success' : 'warning');
  window._imp = null;
  renderImportador(); // vuelve al panel con los conteos actualizados
}
