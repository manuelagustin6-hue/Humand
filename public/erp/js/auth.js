/* ===== AUTH (Supabase) =====
 * Login gate shown when the ERP runs in Supabase mode. In local mode there is
 * no login (single-user testing).
 */

function showLogin(errorMsg) {
  const app = document.getElementById('app');
  if (app) app.style.display = 'none';

  let screen = document.getElementById('login-screen');
  if (!screen) {
    screen = document.createElement('div');
    screen.id = 'login-screen';
    document.body.appendChild(screen);
  }
  screen.style.display = 'flex';
  screen.innerHTML = `
    <form class="login-card" onsubmit="handleLoginSubmit(event)">
      <div class="login-brand">
        <div class="brand-icon"><i class="fas fa-hard-hat"></i></div>
        <div>
          <div class="login-title">ConstructERP</div>
          <div class="login-sub">Gestión Integral de Obras</div>
        </div>
      </div>
      <label class="login-label" for="login-email">Email</label>
      <input class="login-input" type="email" id="login-email" autocomplete="username" required placeholder="tu@empresa.com">
      <label class="login-label" for="login-password">Contraseña</label>
      <input class="login-input" type="password" id="login-password" autocomplete="current-password" required placeholder="••••••••">
      <div id="login-error" class="login-error" style="${errorMsg ? '' : 'display:none'}">${escapeHtml(errorMsg || '')}</div>
      <button class="btn btn-primary login-btn" type="submit" id="login-submit">
        <i class="fas fa-right-to-bracket"></i> Ingresar
      </button>
      <div class="login-foot">Acceso exclusivo para personal autorizado</div>
    </form>`;
  setTimeout(() => { const el = document.getElementById('login-email'); if (el) el.focus(); }, 50);
}

function hideLogin() {
  const screen = document.getElementById('login-screen');
  if (screen) screen.style.display = 'none';
  const app = document.getElementById('app');
  if (app) app.style.display = '';
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-submit');
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ingresando...';
  try {
    await DB.signIn(email, password);
    hideLogin();
    await startApp();
  } catch (err) {
    console.error('Login failed:', err);
    errEl.textContent = translateAuthError(err);
    errEl.style.display = '';
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-right-to-bracket"></i> Ingresar';
  }
}

function translateAuthError(err) {
  const msg = (err && err.message) || '';
  if (/Invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos.';
  if (/Email not confirmed/i.test(msg)) return 'El email todavía no fue confirmado.';
  if (/rate limit/i.test(msg)) return 'Demasiados intentos. Esperá unos minutos.';
  if (/network|fetch|Failed to fetch/i.test(msg)) return 'Error de conexión. Reintentá.';
  return msg || 'No se pudo iniciar sesión.';
}

async function logout() {
  await DB.signOut();
  // Full reload keeps state clean (clears cache + realtime subscription) and
  // sends the user back through the login gate.
  location.reload();
}
