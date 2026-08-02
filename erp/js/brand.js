/* ===== BRANDING (white-label) =====
   Marca configurable de la app. Cambiando este objeto —o, más adelante, la
   config por organización que se cargue en window.APP_BRAND antes de aplicar—
   se re-marca toda la app: nombre, tagline, color, título y PWA.
   Default: Rise. */
// Logo "Ascend": barras ascendentes (skyline + crecimiento), la más alta en ámbar.
var RISE_LOGO_ASCEND = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style="width:100%;height:100%;display:block"><rect width="48" height="48" rx="13" fill="#131b2e"/><rect x="13" y="26" width="6" height="11" rx="3" fill="#fff" fill-opacity=".9"/><rect x="21" y="19" width="6" height="18" rx="3" fill="#fff" fill-opacity=".9"/><rect x="29" y="11" width="6" height="26" rx="3" fill="#fea619"/></svg>';
// Alternativa "Riser" (bloques escalonados). Para usarla: logoSvg: RISE_LOGO_RISER
var RISE_LOGO_RISER  = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style="width:100%;height:100%;display:block"><rect width="48" height="48" rx="13" fill="#131b2e"/><rect x="9" y="30" width="13" height="7" rx="2" fill="#fff" fill-opacity=".9"/><rect x="17" y="22" width="13" height="7" rx="2" fill="#fff" fill-opacity=".9"/><rect x="25" y="14" width="13" height="7" rx="2" fill="#fea619"/></svg>';

window.APP_BRAND = window.APP_BRAND || {
  name:    'Rise',
  short:   'Rise',
  tagline: 'Desarrollo y Construcción',
  primary: '#2563eb',   // color de marca (opcional; '' deja el del tema)
  logoSvg: RISE_LOGO_ASCEND,
};

// Nombre de marca actual (para headers de PDF, prints, etc.).
function brandName() { return (window.APP_BRAND && window.APP_BRAND.name) || 'Rise'; }
window.brandName = brandName;

function applyBrand(b) {
  b = b || window.APP_BRAND || {};
  var name = b.name || 'Rise';
  var tagline = b.tagline || '';
  try { document.title = name; } catch (e) {}
  // Texto de marca en todos los puntos etiquetados con data-brand
  document.querySelectorAll('[data-brand="name"]').forEach(function (el) { el.textContent = name; });
  document.querySelectorAll('[data-brand="tagline"]').forEach(function (el) { el.textContent = tagline; });
  document.querySelectorAll('[data-brand="install"]').forEach(function (el) { el.textContent = 'Instalá ' + name; });
  // Logo (SVG) en todos los contenedores etiquetados + favicon
  if (b.logoSvg) {
    document.querySelectorAll('[data-brand="logo"]').forEach(function (el) { el.innerHTML = b.logoSvg; });
    try {
      var href = 'data:image/svg+xml,' + encodeURIComponent(b.logoSvg);
      var link = document.querySelector('link[rel="icon"]');
      if (!link) { link = document.createElement('link'); link.setAttribute('rel', 'icon'); document.head.appendChild(link); }
      link.setAttribute('type', 'image/svg+xml');
      link.setAttribute('href', href);
    } catch (e) {}
  }
  // Color de marca (opcional)
  if (b.primary) {
    try {
      document.documentElement.style.setProperty('--primary', b.primary);
      var tc = document.querySelector('meta[name="theme-color"]');
      if (tc) tc.setAttribute('content', b.primary);
    } catch (e) {}
  }
}

// Aplicar apenas el DOM esté listo.
if (document.readyState !== 'loading') { try { applyBrand(); } catch (e) {} }
else document.addEventListener('DOMContentLoaded', function () { try { applyBrand(); } catch (e) {} });
