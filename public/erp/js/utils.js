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
// Opens a new window with a clean printable layout and auto-triggers print dialog.
function _printDoc(title, bodyHtml) {
  var win = window.open('', '_blank', 'width=960,height=760');
  if (!win) { toast('El navegador bloqueó la ventana. Habilitá los popups para este sitio.', 'error'); return; }
  var company = {};
  try { company = DB.getAllCompanies()[0] || {}; } catch(e) {}
  win.document.write(
    '<!DOCTYPE html><html lang="es"><head>' +
    '<meta charset="UTF-8"><title>' + escapeHtml(title) + '</title>' +
    '<style>' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:"Segoe UI",system-ui,-apple-system,sans-serif;color:#1e293b;font-size:13px;padding:36px;background:#fff;max-width:860px;margin:0 auto}' +
    'h1{font-size:22px;font-weight:800;color:#2563eb;letter-spacing:-.02em}' +
    '.subtitle{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;margin-top:4px}' +
    '.doc-header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;margin-bottom:22px;border-bottom:2px solid #e2e8f0}' +
    '.doc-num{font-size:28px;font-weight:800;color:#1e293b;text-align:right;letter-spacing:-.02em}' +
    '.doc-date{font-size:12px;color:#64748b;text-align:right;margin-top:5px}' +
    '.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px}' +
    '.info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px}' +
    '.info-title{font-size:9px;font-weight:700;color:#94a3b8;letter-spacing:.12em;text-transform:uppercase;margin-bottom:7px}' +
    '.info-box p{line-height:1.8;font-size:12px}' +
    'table{width:100%;border-collapse:collapse;font-size:12px;margin:16px 0}' +
    'thead th{background:#f1f5f9;padding:8px 12px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #e2e8f0;white-space:nowrap}' +
    'tbody td{padding:9px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}' +
    'tbody tr:last-child td{border-bottom:none}' +
    '.tr{text-align:right}.tc{text-align:center}' +
    '.num{font-variant-numeric:tabular-nums}' +
    '.totals{max-width:300px;margin-left:auto;margin-top:16px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}' +
    '.trow{display:flex;justify-content:space-between;padding:8px 14px;font-size:13px;border-bottom:1px solid #f1f5f9}' +
    '.trow:last-child{border-bottom:none}' +
    '.trow.grand{background:#2563eb;color:#fff;font-size:15px;font-weight:800}' +
    '.trow.warn{color:#b45309}' +
    '.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}' +
    '.b-green{background:#dcfce7;color:#166534}.b-yellow{background:#fef9c3;color:#92400e}.b-gray{background:#f1f5f9;color:#64748b}.b-red{background:#fee2e2;color:#991b1b}' +
    '.concept-box{background:#f8fafc;border-left:3px solid #2563eb;padding:10px 14px;border-radius:0 6px 6px 0;font-size:13px;margin-bottom:18px}' +
    '.notes-box{font-size:12px;color:#64748b;margin-top:14px;padding:10px 14px;background:#f8fafc;border-radius:6px}' +
    '.sign-row{margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:40px;font-size:11px;color:#64748b}' +
    '.sign-line{border-top:1px solid #1e293b;margin-bottom:6px;padding-top:8px;text-align:center}' +
    '.no-print{margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;display:flex;gap:10px}' +
    '@media print{.no-print{display:none}body{padding:16px}}' +
    'button{padding:10px 22px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit}' +
    '.btn-print{background:#2563eb;color:#fff}.btn-close{background:#f1f5f9;color:#1e293b}' +
    '</style></head><body>' +
    bodyHtml +
    '<div class="no-print">' +
    '<button class="btn-print" onclick="window.print()">&#128438; Imprimir / Guardar PDF</button>' +
    '<button class="btn-close" onclick="window.close()">Cerrar</button>' +
    '</div></body></html>'
  );
  win.document.close();
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
