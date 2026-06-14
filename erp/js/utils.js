/* ===== UTILITIES ===== */

// ---- FORMATTERS ----
function _activeCurrency() {
  try {
    var companies = DB.getAllCompanies();
    var activeId = (window.APP_STATE && window.APP_STATE.activeCompany) || 'comp-001';
    var company = companies.find(function(c) { return c.id === activeId; });
    return (company && company.currency) ? company.currency : 'ARS';
  } catch(e) {
    return 'ARS';
  }
}

function fmtMoney(n, currency) {
  if (n == null || isNaN(n)) return '$0';
  var cur = currency || _activeCurrency();
  var decimals = 0;
  try {
    var currencies = DB.getAllCurrencies();
    var currencyObj = currencies.find(function(c) { return c.id === cur; });
    if (currencyObj) decimals = currencyObj.decimals || 0;
  } catch(e) {}
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: cur, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
  } catch(e) {
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
  }
}

function fmtNum(n) {
  if (n == null || isNaN(n)) return '0';
  return new Intl.NumberFormat('es-AR').format(n);
}

function fmtDate(d) {
  if (!d) return '-';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDatetime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtPct(n) {
  if (n == null || isNaN(n)) return '0%';
  return Number(n).toFixed(1) + '%';
}

// ---- STATUS BADGES ----
const STATUS_MAP = {
  // Projects
  active:    { label: 'Activo',      cls: 'badge-green' },
  planning:  { label: 'Planificación', cls: 'badge-blue' },
  paused:    { label: 'Pausado',     cls: 'badge-yellow' },
  completed: { label: 'Completado',  cls: 'badge-gray' },
  // Purchase orders
  draft:     { label: 'Borrador',    cls: 'badge-gray' },
  sent:      { label: 'Enviada',     cls: 'badge-blue' },
  received:  { label: 'Recibida',    cls: 'badge-green' },
  cancelled: { label: 'Cancelada',   cls: 'badge-red' },
  // Invoices
  paid:      { label: 'Cobrada',     cls: 'badge-green' },
  overdue:   { label: 'Vencida',     cls: 'badge-red' },
  // Tasks
  pending:    { label: 'Pendiente',  cls: 'badge-gray' },
  in_progress:{ label: 'En curso',   cls: 'badge-blue' },
  delayed:    { label: 'Demorada',   cls: 'badge-red' },
  // Treasury
  income:  { label: 'Ingreso', cls: 'badge-green' },
  expense: { label: 'Egreso',  cls: 'badge-red' },
  // Accounts
  asset:     { label: 'Activo',    cls: 'badge-blue' },
  liability: { label: 'Pasivo',    cls: 'badge-red' },
  equity:    { label: 'Patrimonio',cls: 'badge-green' },
  revenue:   { label: 'Ingreso',   cls: 'badge-cyan' },
  expense_a: { label: 'Egreso',    cls: 'badge-yellow' },
  // Journal
  posted: { label: 'Contabilizado', cls: 'badge-green' },
  // Requisitions / Certificates
  submitted:  { label: 'Enviado',     cls: 'badge-blue' },
  approved:   { label: 'Aprobado',    cls: 'badge-green' },
  rejected:   { label: 'Rechazado',   cls: 'badge-red' },
  converted:  { label: 'Convertido',  cls: 'badge-cyan' },
};

function statusBadge(status) {
  const s = STATUS_MAP[status] || { label: status, cls: 'badge-gray' };
  return `<span class="badge ${s.cls}">${s.label}</span>`;
}

function projectTypeBadge(type) {
  const map = { residential: 'Residencial', commercial: 'Comercial', industrial: 'Industrial', infrastructure: 'Infraestructura' };
  return `<span class="badge badge-blue">${map[type] || type}</span>`;
}

// ---- MODAL ----
function openModal(title, bodyHtml, size = '', footerHtml = '') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-footer').innerHTML = footerHtml;
  const box = document.getElementById('modal-box');
  box.className = 'modal-box ' + size;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('modal-body').innerHTML = '';
  document.getElementById('modal-footer').innerHTML = '';
  window._pendingConfirm = null;
}

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ---- TOAST ----
function toast(msg, type) {
  type = type || 'info';
  var icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  var el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML =
    '<span class="toast-icon"><i class="fas ' + (icons[type] || icons.info) + '"></i></span>' +
    '<span>' + msg + '</span>';
  var wrap = document.getElementById('toast-wrap');
  if (wrap) wrap.appendChild(el);
  setTimeout(function() { if (el.parentNode) el.remove(); }, 3800);
}

// ---- CONFIRM ----
function confirmDialog(msg, onConfirm) {
  window._pendingConfirm = onConfirm;
  openModal('Confirmar acción',
    `<p style="font-size:14px;color:var(--text)">${msg}</p>`,
    'modal-sm',
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-danger" onclick="if(window._pendingConfirm){window._pendingConfirm();} closeModal();">Confirmar</button>`
  );
}

// ---- PROJECT SELECTOR ----
function populateProjectSelector() {
  const sel = document.getElementById('global-project');
  if (!sel) return;
  var projects = DB.getAll('projects');
  var accessibleIds = typeof getAccessibleProjectIds === 'function' ? getAccessibleProjectIds() : null;
  if (accessibleIds) {
    projects = projects.filter(function(p) { return accessibleIds.indexOf(p.id) !== -1; });
  }
  sel.innerHTML = '<option value="">Todos los proyectos</option>' +
    projects.map(function(p) { return '<option value="' + p.id + '">' + p.name + '</option>'; }).join('');
  // Restore previously active project if still accessible
  var cur = window.APP_STATE && window.APP_STATE.activeProject;
  if (cur && projects.find(function(p) { return p.id === cur; })) {
    sel.value = cur;
  } else if (cur && accessibleIds) {
    // Previous project no longer accessible — reset
    window.APP_STATE.activeProject = '';
    sel.value = '';
  }
}

function setActiveProject(pid) {
  window.APP_STATE.activeProject = pid;
  if (window.APP_STATE.currentModule) navigate(window.APP_STATE.currentModule);
}

// ---- SIDEBAR FILTER ----
function filterNav(q) {
  q = q.toLowerCase();
  document.querySelectorAll('#sidebar-nav .nav-item').forEach(li => {
    const txt = li.textContent.toLowerCase();
    li.style.display = (!q || txt.includes(q)) ? '' : 'none';
  });
}

// ---- TOGGLE SIDEBAR ----
function toggleSidebar() {
  if (window.innerWidth < 768) {
    document.body.classList.toggle('sidebar-open');
  } else {
    document.getElementById('sidebar').classList.toggle('collapsed');
  }
}

// ---- PROGRESS BAR HTML ----
function progressBar(pct, color = '') {
  const c = pct >= 100 ? 'green' : pct > 70 ? '' : pct > 40 ? 'yellow' : 'red';
  return `<div class="progress-bar"><div class="progress-fill ${color || c}" style="width:${Math.min(pct,100)}%"></div></div>
          <span style="font-size:11px;color:var(--text-muted)">${fmtPct(pct)}</span>`;
}

// ---- TABS ----
function initTabs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.tab;
      const tc = container.querySelector(`#${target}`);
      if (tc) tc.classList.add('active');
    });
  });
  // activate first
  const firstBtn = container.querySelector('.tab-btn');
  if (firstBtn) firstBtn.click();
}

// ---- EXPORT CSV ----
function exportCSV(filename, headers, rows) {
  const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ---- EXPORT EXCEL (.xlsx) ----
function exportXLSX(filename, headers, rows, sheetName) {
  const data = [headers, ...rows.map(r => r.map(c => c ?? ''))];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Datos');
  XLSX.writeFile(wb, filename);
}

// ---- PAGINATION ----
class Paginator {
  constructor(items, perPage = 20) {
    this.all = items;
    this.perPage = perPage;
    this.page = 1;
  }
  get total() { return Math.ceil(this.all.length / this.perPage); }
  get current() {
    const s = (this.page - 1) * this.perPage;
    return this.all.slice(s, s + this.perPage);
  }
  renderControls(onPageChange) {
    if (this.total <= 1) return '';
    const pages = Array.from({ length: this.total }, (_, i) => i + 1);
    return `<div class="d-flex align-center gap-1 mt-2" style="justify-content:flex-end;font-size:12px">
      <span style="color:var(--text-muted)">Página ${this.page} de ${this.total}</span>
      ${pages.map(p => `<button class="btn btn-sm ${p === this.page ? 'btn-primary' : 'btn-secondary'}" onclick="(${onPageChange.toString()})(${p})">${p}</button>`).join('')}
    </div>`;
  }
}

// ---- DATE HELPERS ----
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db - da) / 86400000);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function isOverdue(dueDateStr) {
  return dueDateStr && dueDateStr < todayStr();
}

// ---- FORM VALIDATION ----
function validateForm(rules) {
  for (const rule of rules) {
    const el = document.getElementById(rule.id);
    if (!el) continue;
    const val = (el.value || '').trim();
    if (rule.required && !val) {
      toast('"' + rule.label + '" es obligatorio', 'error');
      el.focus();
      return false;
    }
    if (!val) continue;
    if (rule.type === 'number') {
      const n = parseFloat(val);
      if (isNaN(n)) { toast('"' + rule.label + '" debe ser un número válido', 'error'); el.focus(); return false; }
      if (rule.min !== undefined && n < rule.min) { toast('"' + rule.label + '" debe ser mayor o igual a ' + rule.min, 'error'); el.focus(); return false; }
      if (rule.max !== undefined && n > rule.max) { toast('"' + rule.label + '" debe ser menor o igual a ' + rule.max, 'error'); el.focus(); return false; }
    }
    if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      toast('"' + rule.label + '": formato de email inválido', 'error'); el.focus(); return false;
    }
    if (rule.type === 'cuit' && !/^\d{2}-\d{7,8}-\d$/.test(val)) {
      toast('"' + rule.label + '": CUIT inválido (ej: 30-12345678-9)', 'error'); el.focus(); return false;
    }
    if (rule.custom && !rule.custom(val)) {
      toast(rule.customMsg || ('"' + rule.label + '": valor inválido'), 'error'); el.focus(); return false;
    }
  }
  return true;
}

// ---- DEBOUNCE ----
function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ---- HTML ESCAPE ----
function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---- PRINT / PDF DOCUMENT ----
// Creates an in-page full-screen overlay with a proper document layout.
// Uses window.print() with @media print CSS to hide the rest of the app.
function _printDoc(title, bodyHtml) {
  var prev = document.getElementById('erp-print-overlay');
  if (prev) prev.remove();
  var prevCss = document.getElementById('erp-print-css');
  if (prevCss) prevCss.remove();

  var st = document.createElement('style');
  st.id = 'erp-print-css';
  st.textContent =
    '@page{size:A4 portrait;margin:16mm 14mm}' +
    '@media print{' +
      '*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}' +
      'html,body{height:auto!important;overflow:visible!important}' +
      'body>*{display:none!important}' +
      '#erp-print-overlay{display:block!important;position:static!important;background:#fff!important;overflow:visible!important;padding:0!important;margin:0!important;width:100%!important;height:auto!important}' +
      '#erp-print-overlay .epdoc-shell{box-shadow:none!important;border-radius:0!important;margin:0!important;padding:0!important;max-width:100%!important;min-height:0!important}' +
      '#erp-print-overlay .epdoc-actions{display:none!important}' +
    '}' +
    '#erp-print-overlay{position:fixed;inset:0;background:rgba(15,23,42,.82);z-index:99999;overflow-y:auto;padding:32px 16px;-webkit-overflow-scrolling:touch}' +
    '#erp-print-overlay .epdoc-shell{max-width:794px;min-height:1040px;margin:0 auto 32px;background:#fff;border-radius:8px;box-shadow:0 24px 60px rgba(0,0,0,.5);padding:52px 60px;font-family:"Segoe UI",system-ui,-apple-system,sans-serif;color:#0f172a;font-size:13.5px;line-height:1.6}' +
    '@media(max-width:860px){#erp-print-overlay .epdoc-shell{padding:32px 24px;min-height:0}}' +
    '#erp-print-overlay h1{font-size:22px;font-weight:800;color:#1e3a8a;letter-spacing:-.02em;margin:0;padding:0;border:none}' +
    '#erp-print-overlay .subtitle{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.16em;margin-top:5px;display:block}' +
    '#erp-print-overlay .doc-header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:22px;margin-bottom:28px;border-bottom:3px solid #1e3a8a;gap:16px}' +
    '#erp-print-overlay .doc-num{font-size:34px;font-weight:800;color:#1e293b;letter-spacing:-.03em;line-height:1.1;text-align:right}' +
    '#erp-print-overlay .doc-date{font-size:12px;color:#64748b;text-align:right;margin-top:6px}' +
    '#erp-print-overlay .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px}' +
    '#erp-print-overlay .info-box{border:1px solid #e2e8f0;border-radius:7px;padding:14px 16px;background:#fafbfc}' +
    '#erp-print-overlay .info-title{font-size:9.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.14em;margin-bottom:9px;display:block}' +
    '#erp-print-overlay .info-box p{font-size:13px;line-height:1.8;margin:0}' +
    '#erp-print-overlay .concept-box{background:#eff6ff;border-left:4px solid #2563eb;padding:13px 16px;border-radius:0 7px 7px 0;margin-bottom:22px;font-size:13.5px}' +
    '#erp-print-overlay .notes-box{font-size:12.5px;color:#475569;margin-top:16px;padding:12px 16px;background:#f8fafc;border-radius:7px;border:1px solid #e2e8f0}' +
    '#erp-print-overlay table{width:100%;border-collapse:collapse;font-size:12.5px;margin:20px 0}' +
    '#erp-print-overlay thead th{background:#1e3a8a;color:#fff;padding:10px 13px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;white-space:nowrap;border:none}' +
    '#erp-print-overlay tbody tr:nth-child(even) td{background:#f8fafc}' +
    '#erp-print-overlay tbody td{padding:10px 13px;border-bottom:1px solid #e2e8f0;vertical-align:middle}' +
    '#erp-print-overlay tbody tr:last-child td{border-bottom:none}' +
    '#erp-print-overlay .tr{text-align:right}#erp-print-overlay .tc{text-align:center}#erp-print-overlay .num{font-variant-numeric:tabular-nums}' +
    '#erp-print-overlay .totals{max-width:320px;margin-left:auto;margin-top:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}' +
    '#erp-print-overlay .trow{display:flex;justify-content:space-between;padding:10px 16px;font-size:13.5px;border-bottom:1px solid #f1f5f9}' +
    '#erp-print-overlay .trow:last-child{border-bottom:none}' +
    '#erp-print-overlay .trow.grand{background:#1e3a8a;color:#fff;font-size:16px;font-weight:800}' +
    '#erp-print-overlay .trow.warn{color:#92400e}' +
    '#erp-print-overlay .badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}' +
    '#erp-print-overlay .b-green,#erp-print-overlay .badge-green{background:#dcfce7;color:#166534}' +
    '#erp-print-overlay .b-yellow,#erp-print-overlay .badge-yellow{background:#fef3c7;color:#92400e}' +
    '#erp-print-overlay .b-gray,#erp-print-overlay .badge-gray{background:#f1f5f9;color:#475569}' +
    '#erp-print-overlay .b-red,#erp-print-overlay .badge-red{background:#fee2e2;color:#991b1b}' +
    '#erp-print-overlay .b-blue,#erp-print-overlay .badge-blue{background:#dbeafe;color:#1e40af}' +
    '#erp-print-overlay .sign-row{margin-top:64px;display:grid;grid-template-columns:1fr 1fr;gap:48px}' +
    '#erp-print-overlay .sign-line{border-top:1px solid #1e293b;padding-top:8px;text-align:center;font-size:11px;color:#64748b;margin-top:36px}' +
    '#erp-print-overlay .epdoc-actions{margin-top:40px;padding-top:24px;border-top:2px solid #e2e8f0;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}' +
    '.epdoc-btn-p{padding:13px 36px;background:#1e3a8a;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:-.01em}' +
    '.epdoc-btn-c{padding:13px 28px;background:#f1f5f9;color:#374151;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}' +
    '.epdoc-btn-p:hover{background:#1e40af}.epdoc-btn-c:hover{background:#e2e8f0}';

  document.head.appendChild(st);

  var ol = document.createElement('div');
  ol.id = 'erp-print-overlay';
  ol.innerHTML =
    '<div class="epdoc-shell">' +
    bodyHtml +
    '<div class="epdoc-actions">' +
    '<button class="epdoc-btn-p" onclick="window.print()">&#128444; Guardar PDF / Imprimir</button>' +
    '<button class="epdoc-btn-c" onclick="document.getElementById(\'erp-print-overlay\').remove();document.getElementById(\'erp-print-css\').remove()">Cerrar</button>' +
    '</div>' +
    '</div>';

  document.body.appendChild(ol);
  ol.scrollTop = 0;
}

// Build a standard two-column info grid section for print docs
function _printInfoGrid(boxes) {
  return '<div class="info-grid">' + boxes.map(function(b) {
    return '<div class="info-box"><div class="info-title">' + b.title + '</div><p>' + b.content + '</p></div>';
  }).join('') + '</div>';
}

// Build totals block for print docs
function _printTotals(rows) {
  return '<div class="totals">' + rows.map(function(r) {
    return '<div class="trow' + (r.grand ? ' grand' : '') + (r.warn ? ' warn' : '') + '">' +
      '<span>' + r.label + '</span><span class="num">' + r.value + '</span></div>';
  }).join('') + '</div>';
}
