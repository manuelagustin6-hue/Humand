/* ===== BRANDING (white-label) =====
   Marca configurable de la app. Cambiando este objeto —o, más adelante, la
   config por organización que se cargue en window.APP_BRAND antes de aplicar—
   se re-marca toda la app: nombre, tagline, color, título y PWA.
   Default: Rise. */
window.APP_BRAND = window.APP_BRAND || {
  name:    'Rise',
  short:   'Rise',
  tagline: 'Desarrollo y Construcción',
  primary: '#2563eb',   // color de marca (opcional; '' deja el del tema)
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
