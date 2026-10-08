/* ===== AJUSTE CAC DE CUOTAS (al cobro) =====
 * Las cuotas en pesos se expresan en un valor BASE (a una fecha base) y se ajustan
 * por un índice (p. ej. CAC) al momento del cobro:
 *   valor a cobrar = base × (índice del período / índice base)
 * Estado del ajuste:
 *   - definitivo: hay valor publicado para el mes del período de la cuota.
 *   - provisorio: aún no salió; se usa el último valor disponible como estimación.
 *   - sin_indice: no hay datos del índice → se cobra el valor base.
 * Reutiliza priceIndices (code/base_value/current_value/history[{date,value}]).
 */

function cacLookupValue(indexId, periodDate) {
  var idx = DB.getById('priceIndices', indexId);
  if (!idx) return { value: 0, estado: 'sin_indice' };
  var hist = (idx.history || []).slice().sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
  var ym = (periodDate || '').slice(0, 7);
  // Definitivo: entrada cuyo mes coincide con el período de la cuota.
  var exact = hist.filter(function (h) { return (h.date || '').slice(0, 7) === ym; }).pop();
  if (exact) return { value: Number(exact.value) || 0, estado: 'definitivo' };
  // Provisorio: último valor con fecha <= el período.
  var prior = hist.filter(function (h) { return (h.date || '') <= (periodDate || '9999-12-31'); }).pop();
  if (prior) return { value: Number(prior.value) || 0, estado: 'provisorio' };
  // Sin histórico útil: usar el valor actual como provisorio.
  if (Number(idx.current_value) > 0) return { value: Number(idx.current_value), estado: 'provisorio' };
  return { value: 0, estado: 'sin_indice' };
}

// Valor ajustado de una cuota según el plan de la venta.
function cacCuotaAmount(plan, cuota) {
  var base = Number(cuota.amount) || 0;
  if (!plan || !plan.cac_enabled || !plan.cac_index_id || !(Number(plan.cac_base_value) > 0)) {
    return { amount: base, base: base, factor: 1, estado: '', value: 0 };
  }
  var look = cacLookupValue(plan.cac_index_id, cuota.due_date);
  if (look.estado === 'sin_indice' || !look.value) {
    return { amount: base, base: base, factor: 1, estado: 'sin_indice', value: 0 };
  }
  var factor = look.value / Number(plan.cac_base_value);
  return { amount: Math.round(base * factor), base: base, factor: factor, estado: look.estado, value: look.value };
}

var CAC_ESTADO_BADGE = {
  definitivo: '<span class="badge badge-green" title="Índice definitivo del período">Definitivo</span>',
  provisorio: '<span class="badge badge-yellow" title="Índice provisorio: se reajusta al salir el definitivo">Provisorio</span>',
  sin_indice: '<span class="badge badge-gray" title="Sin datos del índice">s/índice</span>',
};

function cacIndexOptions(selected) {
  return (DB.getAll('priceIndices') || []).map(function (i) {
    return '<option value="' + i.id + '"' + (i.id === selected ? ' selected' : '') + '>' + escapeHtml(i.code + ' — ' + i.name) + '</option>';
  }).join('');
}

// Muestra/oculta los campos de CAC en el form de venta.
function vuToggleCac(checked) {
  var el = document.getElementById('vu-cac-fields');
  if (el) el.style.display = checked ? '' : 'none';
}
