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

/* ───────── RE-LIQUIDACIÓN (fase 2) ─────────
 * Cobros hechos en PROVISORIO cuyo índice del período ya salió DEFINITIVO:
 * se calcula la diferencia para re-liquidar. */
function cacResettlements() {
  var out = [];
  (DB.getAll('cobrosVentas') || []).forEach(function (cob) {
    if (cob.cac_estado !== 'provisorio') return;
    var venta = DB.getById('ventasUnidades', cob.sale_id);
    if (!venta || !venta.cac_enabled) return;
    var cuota = (venta.installments || []).find(function (i) { return i.id === cob.installment_id; });
    if (!cuota) return;
    var look = cacLookupValue(venta.cac_index_id, cuota.due_date);
    if (look.estado !== 'definitivo') return; // sigue sin definitivo
    var base = cob.cac_base_amount != null ? cob.cac_base_amount : (Number(cuota.amount) || 0);
    var defFactor = Number(venta.cac_base_value) > 0 ? look.value / Number(venta.cac_base_value) : 1;
    var defAmount = Math.round(base * defFactor);
    out.push({
      cobro_id: cob.id, venta_id: venta.id, buyer: venta.buyer_name || '', cuota_num: cuota.number,
      currency: cob.currency || venta.currency || 'ARS', base: base, charged: Number(cob.amount) || 0,
      newFactor: defFactor, newValue: look.value, defAmount: defAmount, diff: defAmount - (Number(cob.amount) || 0),
    });
  });
  return out;
}

// Genera el ajuste de re-liquidación de un cobro provisorio y lo marca definitivo.
function cacSettle(cobroId) {
  var cob = DB.getById('cobrosVentas', cobroId);
  if (!cob) return;
  var venta = DB.getById('ventasUnidades', cob.sale_id);
  var cuota = venta && venta.installments ? venta.installments.find(function (i) { return i.id === cob.installment_id; }) : null;
  if (!venta || !cuota || !venta.cac_enabled) { toast('No se puede re-liquidar este cobro', 'error'); return; }
  var look = cacLookupValue(venta.cac_index_id, cuota.due_date);
  if (look.estado !== 'definitivo') { toast('Todavía no hay índice definitivo para este período', 'warning'); return; }
  var base = cob.cac_base_amount != null ? cob.cac_base_amount : (Number(cuota.amount) || 0);
  var defFactor = Number(venta.cac_base_value) > 0 ? look.value / Number(venta.cac_base_value) : 1;
  var diff = Math.round(base * defFactor) - (Number(cob.amount) || 0);

  if (diff !== 0) {
    DB.insert('cobrosVentas', {
      sale_id: cob.sale_id, installment_id: cob.installment_id, date: todayStr(), amount: diff,
      currency: cob.currency, method: cob.method, reference: 'AJUSTE CAC ' + (cob.reference || ''),
      notes: 'Re-liquidación CAC (definitivo)', is_cac_adjustment: true,
      cac_estado: 'definitivo', cac_factor: defFactor, cac_value_used: look.value, cac_base_amount: base,
    });
    // Asiento del ajuste cuando es a favor (CAC subió). Una devolución (diff<0) se
    // registra como cobro negativo; su contra-asiento queda para la fase de contabilidad.
    if (diff > 0 && typeof autoJournalEntry === 'function') {
      var ar = (typeof ajGetConfig === 'function' && ajGetConfig('fact_emitida')) ? ajGetConfig('fact_emitida').account : '';
      autoJournalEntry('cobro_cliente', diff, todayStr(), 'AJUSTE-CAC',
        'Re-liquidación CAC ' + (venta.buyer_name || ''),
        { counterAccount: ar, counterName: 'Cuentas por Cobrar', project_id: venta.project_id || '', counterparty: venta.buyer_name || '' });
    }
  }
  DB.update('cobrosVentas', cobroId, { cac_estado: 'definitivo' });
  toast(diff ? ('Ajuste generado: ' + fmtMoney(diff, cob.currency)) : 'Sin diferencia; marcado definitivo', 'success');
  if (typeof closeModal === 'function') closeModal();
  if (typeof vuRenderCuotas === 'function') vuRenderCuotas();
}

function openCacResettlements() {
  var pend = cacResettlements();
  var body;
  if (!pend.length) {
    body = '<div class="empty-state"><i class="fas fa-circle-check" style="color:var(--success)"></i><p>No hay cobros provisorios para re-liquidar.</p></div>';
  } else {
    body = '<div class="table-wrap"><table><thead><tr>' +
      '<th>Comprador</th><th>Cuota</th><th class="text-right">Cobrado</th><th class="text-right">Definitivo</th><th class="text-right">Diferencia</th><th></th>' +
      '</tr></thead><tbody>' +
      pend.map(function (p) {
        return '<tr>' +
          '<td>' + escapeHtml(p.buyer) + '</td>' +
          '<td>#' + p.cuota_num + '</td>' +
          '<td class="number-cell text-right">' + fmtMoney(p.charged, p.currency) + '</td>' +
          '<td class="number-cell text-right">' + fmtMoney(p.defAmount, p.currency) + '</td>' +
          '<td class="number-cell text-right ' + (p.diff >= 0 ? 'text-danger' : 'text-success') + '">' + (p.diff >= 0 ? '+' : '') + fmtMoney(p.diff, p.currency) + '</td>' +
          '<td><button class="btn btn-sm btn-primary" onclick="cacSettle(\'' + p.cobro_id + '\')">Generar ajuste</button></td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }
  openModal('Re-liquidaciones CAC pendientes', body, 'modal-lg', '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
}
