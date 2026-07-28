/* Harness de tests headless para la app ERP (public/erp).
   Carga el CÓDIGO REAL de la app en Chromium (Playwright) sobre un origen http
   local y DESCARTABLE. No toca datos reales: no se conecta a Supabase ni al
   localStorage de producción (otro origen). El contexto se tira al terminar.   */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ERP = path.resolve(__dirname, '..', 'public', 'erp', 'js');

function findChrome() {
  if (process.env.CHROME && fs.existsSync(process.env.CHROME)) return process.env.CHROME;
  var base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    var dirs = fs.readdirSync(base).filter(function(d){ return /^chromium-\d+$/.test(d); });
    for (var i = 0; i < dirs.length; i++) {
      var p = path.join(base, dirs[i], 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) return p;
    }
  } catch (e) {}
  return undefined;   // que lo resuelva Playwright
}

// Carga los archivos `files` (relativos a public/erp/js) y ejecuta `evalFn` en el
// browser (debe ser autocontenida; puede usar los globals de la app: DB, etc.).
async function withApp(files, evalFn) {
  var server = http.createServer(function (q, r) { r.end('<!doctype html><html><body>ok</body></html>'); });
  await new Promise(function (res) { server.listen(0, '127.0.0.1', res); });
  var port = server.address().port;
  var browser = await chromium.launch({ headless: true, executablePath: findChrome(), args: ['--no-sandbox'] });
  var ctx = await browser.newContext();
  var page = await ctx.newPage();
  var errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); });
  try {
    await page.goto('http://127.0.0.1:' + port + '/');
    for (var i = 0; i < files.length; i++) {
      await page.addScriptTag({ content: fs.readFileSync(path.join(ERP, files[i]), 'utf8') });
    }
    // stubs de funciones de la UI/app que la capa de datos referencia
    await page.addScriptTag({ content: 'window._updateSyncBadge=function(){};window.toast=function(){};window.auditLog=function(){};' });
    var result = await page.evaluate(evalFn);
    return { result: result, errs: errs };
  } finally {
    await ctx.close(); await browser.close(); server.close();
  }
}

// mini test-runner
var _fails = 0, _total = 0;
function check(name, pass) {
  _total++; if (!pass) _fails++;
  console.log((pass ? '  ✅ ' : '  ❌ ') + name);
}
function near(a, b, tol) { tol = tol == null ? 0.001 : tol; return a != null && Math.abs(a - b) <= tol; }
function summary() {
  console.log('\n' + (_fails ? '❌ ' + _fails + '/' + _total + ' fallaron' : '✅ ' + _total + '/' + _total + ' OK'));
  process.exit(_fails ? 1 : 0);
}

module.exports = { withApp, check, near, summary };
