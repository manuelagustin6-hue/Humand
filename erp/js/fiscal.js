/* ===== FORMATO FISCAL DE COMPROBANTES =====
 * Valida y normaliza el número de comprobante según el país de la empresa activa.
 *   AR  → ARCA/AFIP: punto de venta (5) - número (8)   ej: 00001-00000001
 *   UY  → DGI/CFE:   serie - número (7)                 ej: A-0000001
 *   US  → libre (sin organismo fiscal)
 */

function _fiscalPad(n, len) {
  n = String(n == null ? '' : n);
  while (n.length < len) n = '0' + n;
  return n;
}

// País de la empresa activa (fallback AR)
function fiscalCountry() {
  try {
    var id = window.APP_STATE && window.APP_STATE.activeCompany;
    var co = DB.getAllCompanies().find(function(c) { return c.id === id; });
    return (co && co.country) || 'AR';
  } catch (e) { return 'AR'; }
}

// Punto de venta / serie configurado en la empresa (fallback 1 / 'A')
function fiscalPuntoVenta(country) {
  country = country || fiscalCountry();
  try {
    var id = window.APP_STATE && window.APP_STATE.activeCompany;
    var co = DB.getAllCompanies().find(function(c) { return c.id === id; }) || {};
    if (co.punto_venta) return co.punto_venta;
  } catch (e) {}
  return country === 'UY' ? 'A' : '1';
}

// ¿Es un comprobante legal/fiscal (va a Contabilidad A / Libro IVA)?
// Los informales (X, Informal, Interna) quedan excluidos.
function fiscalIsLegalType(type) {
  if (!type) return true;
  var t = String(type).toUpperCase();
  return ['X', 'I', 'INFORMAL', 'INTERNA'].indexOf(t) === -1;
}

// Metadatos del formato esperado por país
function fiscalFormatInfo(country) {
  country = country || fiscalCountry();
  switch (country) {
    case 'AR': return { example: '00001-00000001', hint: 'Formato ARCA: punto de venta (5 díg.) - número (8 díg.)' };
    case 'UY': return { example: 'A-0000001',       hint: 'Formato DGI: serie - número (7 díg.)' };
    case 'US': return { example: 'INV-0001',         hint: 'Formato libre (sin organismo fiscal)' };
    default:   return { example: '',                 hint: 'Formato libre' };
  }
}

// Valida y normaliza un número ingresado. Devuelve {ok, value, message}
function fiscalNormalizeNumber(raw, country) {
  country = country || fiscalCountry();
  var s = (raw == null ? '' : String(raw)).trim();

  if (country === 'AR') {
    var m = s.match(/^(\d{1,5})-(\d{1,8})$/);
    if (!m) return { ok: false, value: s, message: 'Formato ARCA inválido. Usá punto de venta - número (ej: 00001-00000001).' };
    return { ok: true, value: _fiscalPad(m[1], 5) + '-' + _fiscalPad(m[2], 8) };
  }
  if (country === 'UY') {
    var u = s.match(/^([A-Za-z]{1,2})-?(\d{1,7})$/);
    if (!u) return { ok: false, value: s, message: 'Formato DGI inválido. Usá serie - número (ej: A-0000001).' };
    return { ok: true, value: u[1].toUpperCase() + '-' + _fiscalPad(u[2], 7) };
  }
  // US / otros países: formato libre, sólo exigimos que no esté vacío
  if (!s) return { ok: false, value: s, message: 'Ingresá el número de comprobante.' };
  return { ok: true, value: s };
}

// Genera el próximo número que EMITIMOS nosotros (facturas de venta), con formato correcto
function fiscalNextIssued(country, seq, pv) {
  country = country || fiscalCountry();
  pv = pv || fiscalPuntoVenta(country);
  seq = seq || 1;
  if (country === 'AR') return _fiscalPad(pv, 5) + '-' + _fiscalPad(seq, 8);
  if (country === 'UY') return String(pv).toUpperCase() + '-' + _fiscalPad(seq, 7);
  return 'INV-' + _fiscalPad(seq, 4);
}
