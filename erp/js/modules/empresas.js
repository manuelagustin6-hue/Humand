/* ===== MODULO: EMPRESAS ===== */

var _empresasState = {
  tab: 'empresas',
  erCountry: 'AR',
};

function renderEmpresas() {
  var content = document.getElementById('content');
  content.innerHTML =
    '<div class="page-header">' +
      '<h1><i class="fas fa-city"></i> Empresas y Configuracion Global</h1>' +
    '</div>' +
    '<div id="empresas-tabs" class="tabs-container">' +
      '<div class="tabs-header">' +
        '<button class="tab-btn active" data-tab="tab-empresas" onclick="empSetTab(\'empresas\')">Empresas</button>' +
        '<button class="tab-btn" data-tab="tab-monedas" onclick="empSetTab(\'monedas\')">Monedas y Tipos de Cambio</button>' +
        '<button class="tab-btn" data-tab="tab-impuestos" onclick="empSetTab(\'impuestos\')">Impuestos por Pais</button>' +
      '</div>' +
      '<div id="tab-empresas" class="tab-content active"></div>' +
      '<div id="tab-monedas" class="tab-content"></div>' +
      '<div id="tab-impuestos" class="tab-content"></div>' +
    '</div>';

  empRenderTabEmpresas();
  empRenderTabMonedas();
  empRenderTabImpuestos();
}

function empSetTab(tab) {
  _empresasState.tab = tab;
  var tabs = ['empresas', 'monedas', 'impuestos'];
  tabs.forEach(function(t) {
    var btn = document.querySelector('[data-tab="tab-' + t + '"]');
    var panel = document.getElementById('tab-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
    if (panel) panel.classList.toggle('active', t === tab);
  });
}

// ---- TAB 1: EMPRESAS ----
function empRenderTabEmpresas() {
  var companies = DB.getAllCompanies();
  var activeId = (window.APP_STATE && window.APP_STATE.activeCompany) || 'comp-001';

  var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
    '<h2 style="font-size:16px;font-weight:600;color:var(--text);">Razones Sociales Registradas</h2>' +
    '<button class="btn btn-primary" onclick="empNewCompany()"><i class="fas fa-plus"></i> Nueva Empresa</button>' +
    '</div>';

  if (!companies.length) {
    html += '<div class="empty-state"><i class="fas fa-city"></i><p>No hay empresas registradas</p></div>';
  } else {
    html += '<div class="grid grid-3">';
    companies.forEach(function(c) {
      html += empCompanyCard(c, activeId);
    });
    html += '</div>';
  }

  var panel = document.getElementById('tab-empresas');
  if (panel) panel.innerHTML = html;
}

function empCountryFlag(country) {
  var flags = { AR: '🇦🇷', UY: '🇺🇾', CL: '🇨🇱', BR: '🇧🇷', US: '🇺🇸' };
  return flags[country] || '🏢';
}

function empCompanyCard(c, activeId) {
  var isActive = c.id === activeId;
  var statusBadgeHtml = c.active
    ? '<span class="badge badge-green">Activa</span>'
    : '<span class="badge badge-gray">Inactiva</span>';
  var activeBorder = isActive ? 'border: 2px solid var(--primary);' : '';

  return '<div class="card" style="' + activeBorder + '">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">' +
      '<div>' +
        '<div style="font-size:28px;line-height:1;">' + empCountryFlag(c.country) + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:6px;align-items:center;">' +
        statusBadgeHtml +
        (isActive ? '<span class="badge badge-blue">Activa</span>' : '') +
      '</div>' +
    '</div>' +
    '<h3 style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px;">' + (c.name || '') + '</h3>' +
    '<p style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">' + (c.legalName || '') + '</p>' +
    '<div style="font-size:12px;color:var(--text-muted);line-height:1.8;">' +
      '<div><b>Pais:</b> ' + (c.country || '-') + '</div>' +
      '<div><b>Moneda:</b> ' + (c.currency || '-') + '</div>' +
      '<div><b>Tax ID:</b> ' + (c.taxId || '-') + '</div>' +
      '<div><b>Email:</b> ' + (c.email || '-') + '</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:14px;">' +
      '<button class="btn btn-sm btn-secondary" onclick="empEditCompany(\'' + c.id + '\')"><i class="fas fa-edit"></i> Editar</button>' +
      (isActive
        ? ''
        : '<button class="btn btn-sm btn-primary" onclick="setActiveCompany(\'' + c.id + '\'); empRenderTabEmpresas();"><i class="fas fa-check"></i> Activar</button>') +
      '<button class="btn btn-sm btn-danger" onclick="empDeleteCompany(\'' + c.id + '\')"><i class="fas fa-trash"></i></button>' +
    '</div>' +
  '</div>';
}

function empGetTaxHint(country) {
  try {
    var presets = DB.getTaxPresets();
    var countryData = presets[country];
    if (!countryData || !countryData.taxes) return '';
    var names = countryData.taxes.slice(0, 3).map(function(t) { return t.name; });
    return names.join(', ') + (countryData.taxes.length > 3 ? '...' : '');
  } catch(e) {
    return '';
  }
}

function empNewCompany() {
  var currencies = DB.getAllCurrencies();
  var currencyOptions = currencies.map(function(c) {
    return '<option value="' + c.id + '">' + c.id + ' - ' + c.name + '</option>';
  }).join('');

  var body =
    '<div class="form-grid">' +
      '<div class="form-group">' +
        '<label>Nombre Comercial *</label>' +
        '<input type="text" id="emp-name" class="form-control" placeholder="Ej: Constructora Norte">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Razon Social *</label>' +
        '<input type="text" id="emp-legalName" class="form-control" placeholder="Ej: Constructora Norte S.A.">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Pais</label>' +
        '<select id="emp-country" class="form-control" onchange="empUpdateTaxHint(this.value)">' +
          '<option value="AR">Argentina</option>' +
          '<option value="UY">Uruguay</option>' +
          '<option value="CL">Chile</option>' +
          '<option value="BR">Brasil</option>' +
          '<option value="US">Estados Unidos</option>' +
          '<option value="">Otro</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Moneda Base</label>' +
        '<select id="emp-currency" class="form-control">' + currencyOptions + '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>CUIT / RUT / Tax ID</label>' +
        '<input type="text" id="emp-taxId" class="form-control" placeholder="Ej: 30-12345678-9">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Regimen Impositivo</label>' +
        '<input type="text" id="emp-taxRegime" class="form-control" placeholder="Ej: Responsable Inscripto">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Direccion</label>' +
        '<input type="text" id="emp-address" class="form-control" placeholder="Av. Corrientes 1200">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Ciudad / Localidad</label>' +
        '<input type="text" id="emp-city" class="form-control" placeholder="Ej: Buenos Aires">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Telefono</label>' +
        '<input type="text" id="emp-phone" class="form-control" placeholder="011-4444-5555">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Email</label>' +
        '<input type="email" id="emp-email" class="form-control" placeholder="info@empresa.com">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>N° IIBB</label>' +
        '<input type="text" id="emp-iibb" class="form-control" placeholder="N° Ingresos Brutos">' +
      '</div>' +
      '<div class="form-group" style="grid-column:1/-1;">' +
        '<div id="emp-tax-hint" style="background:var(--primary-light);border:1px solid var(--primary);border-radius:var(--radius-sm);padding:8px 12px;font-size:12px;color:var(--primary);display:none;">' +
          '<b>Impuestos aplicables:</b> <span id="emp-tax-hint-text"></span>' +
        '</div>' +
      '</div>' +
      '<div class="form-group" style="grid-column:1/-1;">' +
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:500">' +
          '<input type="checkbox" id="emp-demo-data"> Cargar datos de demostración (proyectos, facturas, etc. de ejemplo)' +
        '</label>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">Dejalo <b>sin tildar</b> para producción: la empresa arranca vacía (solo plan de cuentas, rubros y usuario admin).</div>' +
      '</div>' +
    '</div>';

  openModal('Nueva Empresa', body, 'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="empSaveNewCompany()">Guardar</button>'
  );

  empUpdateTaxHint('AR');
}

function empUpdateTaxHint(country) {
  var hint = empGetTaxHint(country);
  var hintDiv = document.getElementById('emp-tax-hint');
  var hintText = document.getElementById('emp-tax-hint-text');
  if (!hintDiv || !hintText) return;
  if (hint) {
    hintText.textContent = hint;
    hintDiv.style.display = 'block';
  } else {
    hintDiv.style.display = 'none';
  }
}

function empSaveNewCompany() {
  if (!requireEdit('empresas')) return;
  var name = (document.getElementById('emp-name') || {}).value || '';
  var legalName = (document.getElementById('emp-legalName') || {}).value || '';
  if (!name.trim()) { toast('El nombre es obligatorio', 'error'); return; }
  if (!legalName.trim()) { toast('La razon social es obligatoria', 'error'); return; }

  var company = {
    id: uuid(),
    name: name.trim(),
    legalName: legalName.trim(),
    country: (document.getElementById('emp-country') || {}).value || 'AR',
    currency: (document.getElementById('emp-currency') || {}).value || 'ARS',
    taxId: (document.getElementById('emp-taxId') || {}).value || '',
    taxRegime: (document.getElementById('emp-taxRegime') || {}).value || '',
    address: (document.getElementById('emp-address') || {}).value || '',
    city: (document.getElementById('emp-city') || {}).value || '',
    phone: (document.getElementById('emp-phone') || {}).value || '',
    email: (document.getElementById('emp-email') || {}).value || '',
    iibb: (document.getElementById('emp-iibb') || {}).value || '',
    active: true,
    created_at: now(),
  };

  var loadDemo = !!(document.getElementById('emp-demo-data') || {}).checked;

  DB.saveCompanyRecord(company);
  var key = 'erp_company_' + company.id + '_v1';
  if (!localStorage.getItem(key)) {
    var prevId = DB._companyId;
    DB._companyId = company.id;
    if (loadDemo) { DB.init(); }        // datos de ejemplo
    else          { DB.initEmpty(); }   // empresa vacía (producción)
    // Empujar el andamiaje a Supabase para que persista en otros dispositivos
    if (_SUPA.online) DB._pushAllToSupabase(DB.get());
    DB._companyId = prevId;
  }

  closeModal();
  populateCompanySelector();
  empRenderTabEmpresas();
  toast(loadDemo ? 'Empresa creada con datos demo' : 'Empresa creada (vacía, lista para producción)', 'success');
}

function empEditCompany(id) {
  var companies = DB.getAllCompanies();
  var c = companies.find(function(x) { return x.id === id; });
  if (!c) return;

  var currencies = DB.getAllCurrencies();
  var currencyOptions = currencies.map(function(cur) {
    var sel = cur.id === c.currency ? ' selected' : '';
    return '<option value="' + cur.id + '"' + sel + '>' + cur.id + ' - ' + cur.name + '</option>';
  }).join('');

  var countryMap = { AR: 'Argentina', UY: 'Uruguay', CL: 'Chile', BR: 'Brasil', US: 'Estados Unidos' };
  var countryOptions = ['AR', 'UY', 'CL', 'BR', 'US', ''].map(function(code) {
    var sel = (c.country || '') === code ? ' selected' : '';
    return '<option value="' + code + '"' + sel + '>' + (countryMap[code] || 'Otro') + '</option>';
  }).join('');

  var body =
    '<input type="hidden" id="emp-edit-id" value="' + c.id + '">' +
    '<div class="form-grid">' +
      '<div class="form-group">' +
        '<label>Nombre Comercial *</label>' +
        '<input type="text" id="emp-name" class="form-control" value="' + (c.name || '') + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Razon Social *</label>' +
        '<input type="text" id="emp-legalName" class="form-control" value="' + (c.legalName || '') + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Pais</label>' +
        '<select id="emp-country" class="form-control" onchange="empUpdateTaxHint(this.value)">' + countryOptions + '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Moneda Base</label>' +
        '<select id="emp-currency" class="form-control">' + currencyOptions + '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>CUIT / RUT / Tax ID</label>' +
        '<input type="text" id="emp-taxId" class="form-control" value="' + (c.taxId || '') + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Regimen Impositivo</label>' +
        '<input type="text" id="emp-taxRegime" class="form-control" value="' + (c.taxRegime || '') + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Direccion</label>' +
        '<input type="text" id="emp-address" class="form-control" value="' + (c.address || '') + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Ciudad / Localidad</label>' +
        '<input type="text" id="emp-city" class="form-control" value="' + (c.city || '') + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Telefono</label>' +
        '<input type="text" id="emp-phone" class="form-control" value="' + (c.phone || '') + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Email</label>' +
        '<input type="email" id="emp-email" class="form-control" value="' + (c.email || '') + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>N° IIBB</label>' +
        '<input type="text" id="emp-iibb" class="form-control" value="' + (c.iibb || '') + '">' +
      '</div>' +
      '<div class="form-group" style="grid-column:1/-1;">' +
        '<div id="emp-tax-hint" style="background:var(--primary-light);border:1px solid var(--primary);border-radius:var(--radius-sm);padding:8px 12px;font-size:12px;color:var(--primary);display:none;">' +
          '<b>Impuestos aplicables:</b> <span id="emp-tax-hint-text"></span>' +
        '</div>' +
      '</div>' +
    '</div>';

  openModal('Editar Empresa', body, 'modal-lg',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="empUpdateCompany()">Guardar Cambios</button>'
  );

  empUpdateTaxHint(c.country || 'AR');
}

function empUpdateCompany() {
  if (!requireEdit('empresas')) return;
  var id = (document.getElementById('emp-edit-id') || {}).value || '';
  var name = (document.getElementById('emp-name') || {}).value || '';
  var legalName = (document.getElementById('emp-legalName') || {}).value || '';
  if (!name.trim()) { toast('El nombre es obligatorio', 'error'); return; }
  if (!legalName.trim()) { toast('La razon social es obligatoria', 'error'); return; }

  var updates = {
    id: id,
    name: name.trim(),
    legalName: legalName.trim(),
    country: (document.getElementById('emp-country') || {}).value || 'AR',
    currency: (document.getElementById('emp-currency') || {}).value || 'ARS',
    taxId: (document.getElementById('emp-taxId') || {}).value || '',
    taxRegime: (document.getElementById('emp-taxRegime') || {}).value || '',
    address: (document.getElementById('emp-address') || {}).value || '',
    city: (document.getElementById('emp-city') || {}).value || '',
    phone: (document.getElementById('emp-phone') || {}).value || '',
    email: (document.getElementById('emp-email') || {}).value || '',
    iibb: (document.getElementById('emp-iibb') || {}).value || '',
  };

  DB.saveCompanyRecord(updates);
  closeModal();
  populateCompanySelector();
  empRenderTabEmpresas();
  toast('Empresa actualizada correctamente', 'success');
}

function empDeleteCompany(id) {
  if (!requireEdit('empresas')) return;
  var activeId = (window.APP_STATE && window.APP_STATE.activeCompany) || 'comp-001';
  if (id === activeId) {
    toast('No se puede eliminar la empresa activa', 'error');
    return;
  }
  confirmDialog('Eliminar empresa y todos sus datos. Esta accion no se puede deshacer.', function() {
    DB.removeCompanyRecord(id);
    populateCompanySelector();
    empRenderTabEmpresas();
    toast('Empresa eliminada', 'success');
  });
}

// ---- TAB 2: MONEDAS Y TIPOS DE CAMBIO ----
function empRenderTabMonedas() {
  var currencies = DB.getAllCurrencies();
  var rates = DB.getExchangeRates();

  var html =
    '<div class="grid grid-2" style="gap:24px;">' +
      '<div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
          '<h3 style="font-size:14px;font-weight:600;">Monedas</h3>' +
        '</div>' +
        '<table class="table">' +
          '<thead><tr>' +
            '<th>Codigo</th>' +
            '<th>Nombre</th>' +
            '<th>Simbolo</th>' +
            '<th>Decimales</th>' +
          '</tr></thead>' +
          '<tbody>' +
          currencies.map(function(c) {
            return '<tr>' +
              '<td><b>' + c.id + '</b></td>' +
              '<td>' + c.name + '</td>' +
              '<td>' + c.symbol + '</td>' +
              '<td>' + c.decimals + '</td>' +
            '</tr>';
          }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>' +
      '<div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
          '<h3 style="font-size:14px;font-weight:600;">Tipos de Cambio</h3>' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="btn btn-sm btn-secondary" onclick="empSyncRates(this)"><i class="fas fa-sync-alt"></i> Sincronizar</button>' +
            '<button class="btn btn-sm btn-primary" onclick="empNewRate()"><i class="fas fa-plus"></i> Agregar</button>' +
          '</div>' +
        '</div>' +
        '<table class="table">' +
          '<thead><tr>' +
            '<th>Fecha</th>' +
            '<th>De</th>' +
            '<th>A</th>' +
            '<th>Tasa</th>' +
            '<th></th>' +
          '</tr></thead>' +
          '<tbody id="emp-rates-tbody">' +
          empRatesRows(rates) +
          '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>';

  var panel = document.getElementById('tab-monedas');
  if (panel) panel.innerHTML = html;
}

function empSyncRates(btn) {
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spin fa-spinner"></i> Sincronizando...'; }
  syncExchangeRates();
  setTimeout(function() {
    empRenderTabMonedas();
  }, 1800);
}

function empRatesRows(rates) {
  if (!rates.length) return '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Sin tipos de cambio</td></tr>';
  var sorted = rates.slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
  return sorted.map(function(r) {
    return '<tr>' +
      '<td>' + fmtDate(r.date) + '</td>' +
      '<td>' + r.from + '</td>' +
      '<td>' + r.to + '</td>' +
      '<td>' + r.rate.toLocaleString('es-AR') + '</td>' +
      '<td>' +
        '<button class="btn btn-sm btn-danger" onclick="empDeleteRate(\'' + r.id + '\')"><i class="fas fa-trash"></i></button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function empNewRate() {
  var currencies = DB.getAllCurrencies();
  var currencyOptions = currencies.map(function(c) {
    return '<option value="' + c.id + '">' + c.id + '</option>';
  }).join('');

  var body =
    '<div class="form-grid">' +
      '<div class="form-group">' +
        '<label>Fecha *</label>' +
        '<input type="date" id="er-date" class="form-control" value="' + todayStr() + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Moneda Origen *</label>' +
        '<select id="er-from" class="form-control">' + currencyOptions + '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Moneda Destino *</label>' +
        '<select id="er-to" class="form-control">' + currencyOptions + '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Tasa *</label>' +
        '<input type="number" id="er-rate" class="form-control" min="0" step="0.01" placeholder="1100">' +
      '</div>' +
    '</div>';

  openModal('Nuevo Tipo de Cambio', body, 'modal-sm',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="empSaveRate()">Guardar</button>'
  );
}

function empSaveRate() {
  if (!requireEdit('empresas')) return;
  var date = (document.getElementById('er-date') || {}).value || '';
  var from = (document.getElementById('er-from') || {}).value || '';
  var to = (document.getElementById('er-to') || {}).value || '';
  var rate = parseFloat((document.getElementById('er-rate') || {}).value || '0');

  if (!date) { toast('La fecha es obligatoria', 'error'); return; }
  if (!from || !to) { toast('Seleccione monedas', 'error'); return; }
  if (from === to) { toast('Las monedas deben ser distintas', 'error'); return; }
  if (!rate || rate <= 0) { toast('La tasa debe ser mayor a 0', 'error'); return; }

  DB.insertGlobal('exchangeRates', {
    id: 'er-' + uuid().substr(0, 8),
    date: date,
    from: from,
    to: to,
    rate: rate,
  });

  closeModal();
  empRenderTabMonedas();
  toast('Tipo de cambio agregado', 'success');
}

function empDeleteRate(id) {
  DB.removeGlobal('exchangeRates', id);
  var rates = DB.getExchangeRates();
  var tbody = document.getElementById('emp-rates-tbody');
  if (tbody) tbody.innerHTML = empRatesRows(rates);
  toast('Tipo de cambio eliminado', 'success');
}

// ---- TAB 3: IMPUESTOS POR PAIS ----
function empRenderTabImpuestos() {
  var presets = DB.getTaxPresets();
  var countries = Object.keys(presets);
  var activeCompanyId = (window.APP_STATE && window.APP_STATE.activeCompany) || 'comp-001';
  var companies = DB.getAllCompanies();
  var activeCompany = companies.find(function(c) { return c.id === activeCompanyId; }) || {};
  var activeCountry = activeCompany.country || 'AR';
  var selectedCountry = _empresasState.erCountry || activeCountry;

  var countryOptions = countries.map(function(code) {
    var preset = presets[code];
    var sel = code === selectedCountry ? ' selected' : '';
    return '<option value="' + code + '"' + sel + '>' + preset.name + ' (' + code + ')</option>';
  }).join('');

  var countryData = presets[selectedCountry];
  var taxes = (countryData && countryData.taxes) || [];

  var html =
    '<div style="margin-bottom:20px;display:flex;align-items:center;gap:16px;">' +
      '<label style="font-weight:600;font-size:14px;">Pais:</label>' +
      '<select class="form-control" style="width:220px;" onchange="empChangeImpCountry(this.value)">' + countryOptions + '</select>' +
      (activeCountry === selectedCountry
        ? '<span class="badge badge-blue"><i class="fas fa-building"></i> Pais de la empresa activa</span>'
        : '') +
    '</div>';

  if (taxes.length) {
    html +=
      '<table class="table">' +
        '<thead><tr>' +
          '<th>Impuesto</th>' +
          '<th>Tipo</th>' +
          '<th>Tasa %</th>' +
          '<th>Aplica a</th>' +
        '</tr></thead>' +
        '<tbody>' +
        taxes.map(function(t) {
          var typeLabels = {
            iva: 'IVA',
            withholding: 'Retencion',
            retention: 'Fondo',
            income_tax: 'Imp. Renta',
            social: 'Cargas Soc.',
            sales_tax: 'Imp. Ventas',
            service_tax: 'Imp. Servicios',
            municipal: 'Municipal',
          };
          var appLabels = { sales: 'Ventas', purchases: 'Compras', certificates: 'Certificados', construction: 'Construccion' };
          return '<tr>' +
            '<td><b>' + t.name + '</b></td>' +
            '<td><span class="badge badge-blue">' + (typeLabels[t.type] || t.type) + '</span></td>' +
            '<td>' + t.rate + '%</td>' +
            '<td>' + (appLabels[t.applies_to] || t.applies_to) + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody>' +
      '</table>';
  } else {
    html += '<div class="empty-state"><i class="fas fa-file-alt"></i><p>No hay presets de impuestos para este pais</p></div>';
  }

  var panel = document.getElementById('tab-impuestos');
  if (panel) panel.innerHTML = html;
}

function empChangeImpCountry(country) {
  _empresasState.erCountry = country;
  empRenderTabImpuestos();
}
