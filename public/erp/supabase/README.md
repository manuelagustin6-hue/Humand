# ERP multiusuario con Supabase

Por defecto el ERP funciona en **modo local** (`localStorage`): cada navegador
tiene su propia copia de los datos. Eso sirve para probar, pero **no** para que
50-80 personas trabajen sobre los mismos datos.

Para uso en la empresa hay que conectarlo a **Supabase** (Postgres compartido).
La app ya está preparada: solo hay que crear la tabla y pegar las credenciales.

## Pasos

### 1. Crear la tabla en Supabase
1. Entrá a tu proyecto en [supabase.com](https://supabase.com).
2. Menú **SQL Editor → New query**.
3. Pegá el contenido de [`schema.sql`](./schema.sql) y ejecutá (**Run**).

Esto crea la tabla `erp_records`, el índice, habilita *realtime* y las políticas
de seguridad (RLS).

### 2. Copiar las credenciales
En **Project Settings → API** copiá:
- **Project URL** → `https://xxxxxxxx.supabase.co`
- **anon public key**

### 3. Configurar la app
Editá [`../js/config.js`](../js/config.js):

```js
window.ERP_CONFIG = {
  supabaseUrl: 'https://xxxxxxxx.supabase.co',
  supabaseAnonKey: 'eyJhbGciOi...',   // la anon key
  seedOnEmpty: true,   // carga datos demo la primera vez; poné false para arrancar vacío
};
```

Al recargar, la app pide **login** y luego se conecta a Supabase. En la barra
lateral, bajo el usuario, verás **"En línea"** (verde) cuando está usando la base
compartida, o **"Local"** cuando usa el navegador.

### 4. Crear los usuarios (login)
Con la **Opción A** de seguridad (la default), cada persona entra con email y
contraseña. Para darlos de alta:

1. En Supabase: **Authentication → Users → Add user**.
2. Cargá email + contraseña (marcá *Auto Confirm User* para que pueda entrar sin
   confirmar el mail).
3. Repetí para los 50-80 usuarios (o usá *Invite* para que ellos definan su clave).

> Para evitar que cualquiera se registre solo, en **Authentication → Providers →
> Email** dejá **desactivado** "Enable Signups". Así solo entran los usuarios que
> vos das de alta.

Cerrar sesión: botón **⚙️ Configuración → Cerrar sesión**.

## Seguridad (importante)

El `schema.sql` deja activa por defecto la **Opción A**: solo usuarios
autenticados (login con Supabase Auth) pueden leer/escribir. Es la recomendada
para uso real. La **Opción B** (anon key sin login) es solo para un piloto rápido
en red privada — deja los datos accesibles a cualquiera con la URL. El detalle
está comentado en `schema.sql`.

## Cómo funciona (resumen técnico)

- Todo el acceso a datos pasa por `DB` (`js/db.js`). Los 11 módulos no cambian.
- Al iniciar, `DB.bootstrap()` carga toda la base en memoria (lecturas
  sincrónicas y rápidas).
- Cada alta/edición/baja actualiza la vista al instante y persiste en Supabase.
- Una suscripción *realtime* mantiene el cache de cada navegador sincronizado:
  si otro usuario carga una factura, aparece sin recargar (salvo que tengas un
  formulario abierto, para no interrumpirte).
- Si Supabase no está configurado o falla la conexión, la app cae a modo local
  automáticamente y sigue funcionando.
