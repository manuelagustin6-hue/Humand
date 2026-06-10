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
  openModal('Confirmar acción',
    `<p style="font-size:14px;color:var(--text)">${msg}</p>`,
    'modal-sm',
    `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-danger" onclick="(${onConfirm.toString()})(); closeModal();">Confirmar</button>`
  );
}

// ---- PROJECT SELECTOR ----
function populateProjectSelector() {
  const sel = document.getElementById('global-project');
  const projects = DB.getAll('projects');
  sel.innerHTML = '<option value="">Todos los proyectos</option>' +
    projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
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
