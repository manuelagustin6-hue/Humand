/* ===== UTILITIES ===== */

// ---- HTML ESCAPING ----
// Neutralize user-supplied text before it is placed inside innerHTML, so a
// stray quote or angle bracket in a name/description can't break the render.
function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---- FORMATTERS ----
function fmtMoney(n, currency = 'ARS') {
  if (n == null || isNaN(n)) return '$0';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function fmtNum(n) {
  if (n == null || isNaN(n)) return '0';
  return new Intl.NumberFormat('es-AR').format(n);
}

function fmtDate(d) {
  if (!d) return '-';
  // Accept both plain dates ('2025-03-10') and full ISO datetimes.
  const dt = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T00:00:00') : new Date(d);
  if (isNaN(dt.getTime())) return '-';
  return dt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDatetime(d) {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  return dt.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
};

function statusBadge(status) {
  const s = STATUS_MAP[status] || { label: escapeHtml(status), cls: 'badge-gray' };
  return `<span class="badge ${s.cls}">${s.label}</span>`;
}

function projectTypeBadge(type) {
  const map = { residential: 'Residencial', commercial: 'Comercial', industrial: 'Industrial', infrastructure: 'Infraestructura' };
  return `<span class="badge badge-blue">${map[type] || escapeHtml(type)}</span>`;
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
function toast(msg, type = 'info') {
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-circle', info: 'fa-info-circle' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${escapeHtml(msg)}</span>`;
  document.getElementById('toast-wrap').appendChild(el);
  setTimeout(() => el.remove(), 3500);
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
    projects.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
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
  document.getElementById('sidebar').classList.toggle('collapsed');
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

// ---- CHARTS ----
// Wrap Chart.js so a failed/blocked CDN load (offline, ad-blocker, CDN outage)
// degrades to a placeholder instead of throwing and breaking the whole view.
function safeChart(canvas, config) {
  if (!canvas) return null;
  if (typeof Chart === 'undefined') {
    const note = document.createElement('div');
    note.className = 'chart-unavailable';
    note.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;min-height:120px;color:var(--text-muted);font-size:12px;text-align:center;padding:20px';
    note.innerHTML = '<span><i class="fas fa-chart-bar" style="font-size:20px;opacity:.5"></i><br>Gráfico no disponible</span>';
    if (canvas.replaceWith) canvas.replaceWith(note);
    return null;
  }
  try {
    return new Chart(canvas, config);
  } catch (e) {
    console.error('Chart render failed:', e);
    return null;
  }
}

// ---- DEBOUNCE ----
function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
