/* ===== Helper reutilizable: vista consolidada por razón social =====
   Un filtro de razón social por módulo (clave), lecturas consolidadas y guard de
   empresa para acciones sobre registros de otra razón social. Reutilizado por los
   módulos de listado (facturación ya usa su propia versión; el resto usan esto).  */

window._rsCompany = window._rsCompany || {};   // { moduleKey: companyId ('' = todas) }

function rsGet(key) { return window._rsCompany[key] || ''; }

function rsCompanyOptions(key) {
  return '<option value="">Todas las razones sociales</option>' +
    (DB.getAllCompanies() || []).map(function (c) {
      return '<option value="' + c.id + '"' + (rsGet(key) === c.id ? ' selected' : '') + '>' + escapeHtml(c.legalName || c.name) + '</option>';
    }).join('');
}

// Barra con el selector de razón social. onchange llama a rsSet(key, valor).
function rsSelectorHtml(key, extra) {
  return '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px">' +
    '<div style="display:flex;align-items:center;gap:8px"><i class="fas fa-city" style="color:var(--primary)"></i>' +
      '<span style="font-size:12px;font-weight:600;color:var(--text-muted)">Razón Social</span>' +
      '<select class="form-control" style="width:230px" onchange="rsSet(\'' + key + '\', this.value)">' + rsCompanyOptions(key) + '</select></div>' +
    (extra || '') + '</div>';
}

// Registros de `collection` consolidados (todas las razones sociales), filtrados por
// el proyecto del header y por la razón social elegida (key). Cada registro trae
// _company_id / _company_name / _company_currency.
function rsScoped(collection, key) {
  var arr = filterByActiveProject((typeof DB.getAllConsolidated === 'function') ? DB.getAllConsolidated(collection) : DB.getAll(collection));
  var cid = rsGet(key);
  if (cid) arr = arr.filter(function (x) { return x._company_id === cid; });
  return arr;
}

// Cambia el filtro y re-renderiza la MISMA pantalla (vía navigate, sin saltar).
function rsSet(key, id) {
  window._rsCompany[key] = id || '';
  if (id) { DB.setCompany(id); if (window.APP_STATE) window.APP_STATE.activeCompany = id; }
  var mod = window.APP_STATE && window.APP_STATE.currentModule;
  if (typeof navigate === 'function' && mod) { navigate(mod); }
}

// Antes de actuar sobre un registro, activa su razón social (en consolidado puede
// pertenecer a otra empresa). Devuelve true si quedó accesible.
function rsEnsureCompany(collection, id) {
  if (DB.getById(collection, id)) return true;
  var f = (typeof DB.getAllConsolidated === 'function' ? DB.getAllConsolidated(collection) : []).find(function (x) { return x.id === id; });
  if (f && f._company_id && f._company_id !== DB._companyId) {
    DB.setCompany(f._company_id); if (window.APP_STATE) window.APP_STATE.activeCompany = f._company_id; return true;
  }
  return !!f;
}

// Moneda efectiva de un registro (la propia o la de su razón social).
function rsCur(rec) { return (rec && (rec.currency || rec._company_currency)) || (typeof _activeCurrency === 'function' ? _activeCurrency() : 'ARS'); }

// ¿Estoy en modo consolidado (todas) para este módulo?
function rsIsAll(key) { return !rsGet(key); }
