/* ===== FACTURA ELECTRÓNICA — TusFacturas.app → ARCA/AFIP ===== */

var TUSFACT_API = 'https://www.tusfacturas.app/app/api/v2/facturas/nuevo';

var AFIP_TIPOS = { A: 'FACTURA A', B: 'FACTURA B', C: 'FACTURA C', M: 'FACTURA M', E: 'FACTURA E' };

// IVA alicuota → TusFacturas ID
var AFIP_IVA_IDS = { 0: '3', 2.5: '9', 5: '8', 10.5: '4', 21: '5', 27: '6' };

// ── Settings ────────────────────────────────────────────────────
function afipGetSettings() {
  return DB.getGlobal().afipSettings || {};
}

function afipSaveSettings() {
  var s = {
    usertoken:  document.getElementById('af-usertoken').value.trim(),
    apitoken:   document.getElementById('af-apitoken').value.trim(),
    apikey:     document.getElementById('af-apikey').value.trim(),
    punto_venta: parseInt(document.getElementById('af-pv').value, 10) || 1,
    concepto:   document.getElementById('af-concepto').value,
    forma_pago: document.getElementById('af-fp').value,
    default_iva_cond: document.getElementById('af-iva-def').value,
  };
  if (!s.usertoken || !s.apitoken || !s.apikey) { toast('Completá las tres credenciales de TusFacturas.app', 'error'); return; }
  var global = DB.getGlobal();
  global.afipSettings = s;
  DB.saveGlobal(global);
  toast('Configuración AFIP guardada', 'success');
  closeModal();
}

function openAfipSettings() {
  var s = afipGetSettings();
  openModal(
    '<i class="fas fa-stamp" style="margin-right:8px"></i>Configuración TusFacturas.app / ARCA',
    '<div style="display:flex;flex-direction:column;gap:14px">' +
      '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;font-size:12px">' +
        '<strong>Paso 1:</strong> Registrate en <a href="https://www.tusfacturas.app" target="_blank">tusfacturas.app</a>, subí tu certificado AFIP/ARCA y copiá las credenciales de tu panel.<br>' +
        '<strong>Paso 2:</strong> Pegá los tres tokens aquí y definí tu punto de venta.' +
      '</div>' +
      '<div><label class="form-label">User Token *</label><input id="af-usertoken" class="form-control" value="' + escapeHtml(s.usertoken || '') + '" placeholder="Tu usertoken de TusFacturas.app"></div>' +
      '<div><label class="form-label">API Token *</label><input id="af-apitoken" class="form-control" value="' + escapeHtml(s.apitoken || '') + '" placeholder="Tu apitoken"></div>' +
      '<div><label class="form-label">API Key (CUIT) *</label><input id="af-apikey" class="form-control" value="' + escapeHtml(s.apikey || '') + '" placeholder="Tu CUIT o apikey"></div>' +
      '<div style="display:flex;gap:12px">' +
        '<div style="flex:1"><label class="form-label">Punto de Venta</label><input id="af-pv" type="number" class="form-control" value="' + (s.punto_venta || 1) + '" min="1"></div>' +
        '<div style="flex:1"><label class="form-label">Concepto</label><select id="af-concepto" class="form-control"><option value="SERVICIOS"' + (s.concepto==='SERVICIOS'||!s.concepto?' selected':'') + '>Servicios</option><option value="PRODUCTOS"' + (s.concepto==='PRODUCTOS'?' selected':'') + '>Productos</option><option value="PRODUCTOS Y SERVICIOS"' + (s.concepto==='PRODUCTOS Y SERVICIOS'?' selected':'') + '>Productos y Servicios</option></select></div>' +
      '</div>' +
      '<div style="display:flex;gap:12px">' +
        '<div style="flex:1"><label class="form-label">Forma de Pago default</label><select id="af-fp" class="form-control"><option value="CUENTA CORRIENTE"' + ((!s.forma_pago||s.forma_pago==='CUENTA CORRIENTE')?' selected':'') + '>Cuenta Corriente</option><option value="CONTADO"' + (s.forma_pago==='CONTADO'?' selected':'') + '>Contado</option><option value="EFECTIVO"' + (s.forma_pago==='EFECTIVO'?' selected':'') + '>Efectivo</option><option value="TRANSFERENCIA BANCARIA"' + (s.forma_pago==='TRANSFERENCIA BANCARIA'?' selected':'') + '>Transferencia</option></select></div>' +
        '<div style="flex:1"><label class="form-label">Cond. IVA cliente default</label><select id="af-iva-def" class="form-control"><option value="CF"' + ((!s.default_iva_cond||s.default_iva_cond==='CF')?' selected':'') + '>Consumidor Final</option><option value="RI"' + (s.default_iva_cond==='RI'?' selected':'') + '>Responsable Inscripto</option><option value="MO"' + (s.default_iva_cond==='MO'?' selected':'') + '>Monotributista</option><option value="EX"' + (s.default_iva_cond==='EX'?' selected':'') + '>Exento</option></select></div>' +
      '</div>' +
    '</div>',
    'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="afipSaveSettings()"><i class="fas fa-save"></i> Guardar configuración</button>'
  );
}

// ── CAE badge for table rows ────────────────────────────────────
function afipCaeBadge(inv) {
  if (inv.cae) {
    return '<div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px">' +
      '<span style="background:#dcfce7;color:#16a34a;font-size:9px;font-weight:700;padding:2px 7px;border-radius:8px;letter-spacing:.3px"><i class="fas fa-stamp" style="margin-right:3px"></i>CAE ✓</span>' +
      '<span style="font-size:10px;color:var(--text-muted);font-family:monospace">' + escapeHtml(String(inv.cae).slice(-8)) + '</span>' +
    '</div>';
  }
  if (!AFIP_TIPOS[inv.type]) {
    return '<span style="font-size:11px;color:var(--text-muted)">—</span>';
  }
  return '<button class="btn btn-sm" style="background:#3b82f6;color:#fff;font-size:11px;white-space:nowrap" onclick="afipEmitir(\'' + inv.id + '\')" title="Emitir CAE via ARCA/AFIP"><i class="fas fa-stamp" style="margin-right:4px"></i>Emitir CAE</button>';
}

// ── Main emit ───────────────────────────────────────────────────
async function afipEmitir(invoiceId) {
  var s = afipGetSettings();
  if (!s.usertoken || !s.apitoken || !s.apikey) {
    toast('Primero configurá las credenciales de TusFacturas.app', 'warning');
    openAfipSettings();
    return;
  }

  var inv = DB.getById('invoices', invoiceId);
  if (!inv) { toast('Factura no encontrada', 'error'); return; }
  if (!AFIP_TIPOS[inv.type]) { toast('Tipo ' + inv.type + ' no se emite por AFIP. Solo A, B, C, M, E.', 'warning'); return; }
  if (inv.cae) {
    if (!confirm('Esta factura ya tiene CAE ' + inv.cae + '.\n¿Re-emitir igualmente?')) return;
  }

  // Format date DD/MM/YYYY
  function fmtAfipDate(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
  }

  var alicuota = inv.iva_rate || 21;
  var items = inv.items || [];

  var detalle = items.map(function(it) {
    var qty   = it.quantity || 1;
    var price = it.unit_price != null ? it.unit_price : (it.total || 0) / qty;
    var sub   = Math.round(qty * price * 100) / 100;
    var rate  = it.tax_rate != null ? it.tax_rate : alicuota;
    return {
      cantidad:                   qty,
      descripcion:                it.description || 'Servicio/Bien',
      precio_unitario_sin_iva:    Math.round(price * 100) / 100,
      alicuota:                   rate,
      precio_subtotal_sin_iva:    sub,
      precio_subtotal:            Math.round(sub * (1 + rate / 100) * 100) / 100,
    };
  });

  var ivaArray = [];
  if (alicuota > 0) {
    ivaArray.push({
      base_imp: Math.round((inv.subtotal || 0) * 100) / 100,
      importe:  Math.round((inv.tax || 0)      * 100) / 100,
      id:       AFIP_IVA_IDS[alicuota] || '5',
    });
  }

  var ivaCond = inv.client_iva_condition || s.default_iva_cond || 'CF';

  var payload = {
    usertoken: s.usertoken,
    apitoken:  s.apitoken,
    apikey:    s.apikey,
    comprobante: {
      fecha:           fmtAfipDate(inv.date),
      tipo_comprobante: AFIP_TIPOS[inv.type],
      punto_venta:     s.punto_venta || 1,
      numero:          0,
      concepto:        s.concepto || 'SERVICIOS',
      detalle:         detalle,
      bonificacion:    0,
      iva_array:       ivaArray,
      total:           Math.round((inv.total || 0) * 100) / 100,
      moneda:          inv.currency || 'PES',
      cotizacion:      inv.exchange_rate || 1,
      forma_pago:      s.forma_pago || 'CUENTA CORRIENTE',
      informacion_adicional: inv.notes || '',
    },
    cliente: {
      documento_tipo:  'CUIT',
      condicion_iva:   ivaCond,
      domicilio:       inv.client_address || 'Sin domicilio',
      condicion_pago:  '30 dias',
      documento_nro:   (inv.client_cuit || '').replace(/[-\s]/g, ''),
      razon_social:    inv.client_name || '',
      email:           inv.client_email || '',
      envia_por_mail:  inv.client_email ? 'S' : 'N',
    },
  };

  // Button feedback
  var btn = document.activeElement;
  if (btn && btn.tagName === 'BUTTON') { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

  toast('Conectando con ARCA/AFIP via TusFacturas.app…', 'info');

  try {
    var res = await fetch(TUSFACT_API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      var errBody = '';
      try { errBody = await res.text(); } catch(e2) {}
      toast('Error HTTP ' + res.status + ': ' + errBody.slice(0, 120), 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-stamp"></i> Emitir CAE'; }
      return;
    }

    var data = await res.json();

    if (data.error && data.error !== 'N') {
      var errMsg = (Array.isArray(data.errores) ? data.errores.join(' | ') : '') || data.error || 'Error desconocido';
      toast('Error AFIP: ' + errMsg, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-stamp"></i> Emitir CAE'; }
      return;
    }

    // Success
    DB.update('invoices', invoiceId, {
      cae:                 data.cae,
      cae_vencimiento:     data.cae_vencimiento,
      afip_numero:         data.comprobante_numero_formato || String(data.comprobante_numero || ''),
      afip_tipo:           data.comprobante_tipo,
      status:              inv.status === 'draft' ? 'sent' : inv.status,
    });

    toast('✓ CAE obtenido: ' + data.cae + ' | Vto: ' + (data.cae_vencimiento || '—'), 'success');
    renderFacturacion();
  } catch(e) {
    var msg = e.message || String(e);
    if (msg.toLowerCase().includes('cors') || msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
      toast('Error de red/CORS: TusFacturas.app no respondió desde el browser. Verificá la conexión o abrí la consola.', 'error');
    } else {
      toast('Error: ' + msg, 'error');
    }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-stamp"></i> Emitir CAE'; }
  }
}

// ── CAE detail block for viewInvoice ────────────────────────────
function afipCaeBlock(inv) {
  if (!inv.cae) return '';
  return '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-top:12px">' +
    '<div style="font-size:11px;font-weight:700;color:#16a34a;margin-bottom:6px"><i class="fas fa-stamp" style="margin-right:6px"></i>COMPROBANTE ELECTRÓNICO — ARCA/AFIP</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:16px;font-size:12px">' +
      '<div><span style="color:var(--text-muted)">CAE: </span><strong style="font-family:monospace">' + escapeHtml(inv.cae) + '</strong>' +
        ' <button class="btn btn-sm btn-secondary" style="padding:1px 6px;font-size:10px" onclick="navigator.clipboard.writeText(\'' + escapeHtml(inv.cae) + '\').then(function(){toast(\'CAE copiado\',\'success\')})"><i class="fas fa-copy"></i></button></div>' +
      (inv.cae_vencimiento ? '<div><span style="color:var(--text-muted)">Vto. CAE: </span><strong>' + escapeHtml(inv.cae_vencimiento) + '</strong></div>' : '') +
      (inv.afip_numero    ? '<div><span style="color:var(--text-muted)">N° AFIP: </span><strong>' + escapeHtml(inv.afip_numero) + '</strong></div>' : '') +
    '</div>' +
  '</div>';
}
