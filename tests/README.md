# Tests — ConstructERP (`public/erp`)

Tests **headless** de la lógica de cliente de la app. Cargan el **código real**
(`public/erp/js/**`) en Chromium (Playwright), sobre un origen `http://` local y
**descartable**, y corren asserts sobre las funciones globales (`DB`, cálculos,
workflows, etc.).

## Seguridad de datos

- **No tocan datos reales.** Cada corrida usa un contexto de navegador nuevo y su
  propio `localStorage` (origen `127.0.0.1`, distinto del de producción).
- **No se conectan a Supabase** — solo prueban la lógica de cliente (que es el ~95%:
  conversiones, consolidados, numeración, concurrencia, contabilidad, filtros).
- El contexto se cierra al terminar; no persiste nada.

## Cómo correr

```bash
cd tests
npm install          # trae Playwright (los navegadores ya están en el entorno)
npm test             # o: node run.js
```

Si el binario de Chromium no está en la ruta por defecto, pasá su ubicación:

```bash
CHROME=/ruta/al/chrome node run.js
```

## Qué cubre hoy (`run.js`)

1. **Conversión de monedas** — TC directo/inverso y cruces vía USD (ej. ARS↔UYU).
2. **Numeración de asientos** — correlativo `max+1` por año.
3. **Parseo de montos es-AR** — `1.234.567,89` (que no reaparezca el bug de `parseFloat`).
4. **Hitos / milestones** — orden, en-riesgo, atraso general.
5. **Concurrencia** — versión `_rev` y detección de conflicto en `update`.

## Agregar un test

En `run.js`, dentro de un bloque:

```js
const { result } = await withApp(['utils.js', 'db.js', 'modules/xxx.js'], () => {
  // corre en el browser; podés usar DB, y las funciones del módulo
  return { valor: DB.algo() };
});
check('descripción', result.valor === esperado);
```

`withApp(files, evalFn)` está en `harness.js`. `evalFn` debe ser autocontenida
(se serializa y corre en el browser).
