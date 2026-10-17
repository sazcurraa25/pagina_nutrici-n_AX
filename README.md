# Sitio web — Lic. en Nutrición

Sitio profesional para un/a Licenciado/a en Nutrición de la Provincia de Buenos Aires, con reserva de turnos que se crean directamente en su Google Calendar.

- **Next.js 16** (App Router) + TypeScript estricto + Tailwind CSS 4
- Contenido editable en `content/*.json` (validado con Zod)
- Reservas con **Google Calendar API** (UI propia), **Cal.com** (embed) o **modo demo** (`mock`)
- Anti-spam: Cloudflare Turnstile + honeypot + rate limiting por IP
- Sin base de datos propia: la única copia de cada turno es el evento de Google Calendar

> ⚠️ **Antes de publicar**, completá el [checklist legal](#checklist-legal-antes-de-publicar). Todos los datos de ejemplo están marcados como `PLACEHOLDER`.

---

## Índice

1. [Inicio rápido](#inicio-rápido)
2. [Cómo editar el contenido](#cómo-editar-el-contenido)
3. [Reservas: elegir el proveedor](#reservas-elegir-el-proveedor)
4. [Configurar Google Calendar](#configurar-google-calendar-paso-a-paso)
5. [Usar Cal.com en lugar de Google](#usar-calcom-en-lugar-de-google)
6. [Variables de entorno](#variables-de-entorno)
7. [Deploy en Vercel](#deploy-en-vercel)
8. [Tests](#tests)
9. [Checklist legal antes de publicar](#checklist-legal-antes-de-publicar)
10. [Arquitectura y decisiones](#arquitectura-y-decisiones)

---

## Inicio rápido

Requisitos: Node.js 22.12+ o 24+ (recomendado: la LTS actual). Los scripts de Google usan `process.loadEnvFile`, que necesita esa versión.

```bash
npm install
cp .env.example .env.local   # en Windows: copy .env.example .env.local
npm run dev                  # http://localhost:3000
```

Sin configurar nada, el sitio arranca en **modo demo** (`BOOKING_PROVIDER=mock`): la disponibilidad es simulada y las reservas se guardan solo en memoria, así que se pierden al reiniciar.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build de producción y servidor |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:e2e` | Test de punta a punta del flujo de reserva (Playwright, modo mock) |
| `npm run google:token` | Obtiene el refresh token de Google (una sola vez) |
| `npm run google:check` | Verifica que las credenciales de Google funcionen (no modifica nada) |

---

## Cómo editar el contenido

Todo el texto del sitio está en la carpeta `content/`. Para cambiar un horario o agregar una historia se edita **un solo archivo**. Si algo queda mal escrito, `npm run build` falla con un mensaje que indica el archivo y el campo.

| Archivo | Qué contiene |
| --- | --- |
| `content/profile.json` | Nombre, título, universidad, posgrados, **matrícula**, foto, bio, modalidades, obras sociales, contacto, WhatsApp, dirección, mapa, redes |
| `content/approaches.json` | Enfoques o planes de alimentación: ícono, título, para quién es, qué incluye la consulta |
| `content/stories.json` | Historias de pacientes, anonimizadas (ver restricciones legales) |
| `content/schedule.json` | Reglas de turnos: días y franjas, tipos de consulta y duración, buffer, anticipación, horizonte, bloqueos y feriados |
| `content/faq.json` | Preguntas frecuentes |

### Ejemplos

**Cambiar un horario.** En `content/schedule.json`, dentro de `weekly` (días: 1 = lunes … 7 = domingo; modalidad: `presencial`, `online` o `ambas`):

```json
{ "day": 4, "from": "15:00", "to": "19:30", "modality": "ambas" }
```

**Bloquear vacaciones o un feriado.**

```json
"blocked": [{ "from": "2027-01-04", "to": "2027-01-17", "reason": "Vacaciones" }],
"holidays": [{ "date": "2026-12-25", "name": "Navidad" }]
```

También se puede bloquear tiempo creando un evento "Ocupado" en el Google Calendar del consultorio: los turnos se calculan restando todo lo que figure como ocupado.

**Otros parámetros de `schedule.json`:**

| Campo | Ejemplo | Significado |
| --- | --- | --- |
| `slotIntervalMinutes` | 30 | Cada cuánto empieza un turno posible (9:00, 9:30…) |
| `bufferMinutes` | 15 | Margen libre antes y después de cada evento ocupado |
| `minNoticeHours` | 12 | Anticipación mínima para reservar |
| `maxDaysAhead` | 30 | Hasta cuántos días adelante se puede reservar |
| `cancellationNoticeHours` | 24 | Hasta cuántas horas antes se puede cancelar desde la web |

**Agregar una historia.** En `content/stories.json`:

```json
{
  "id": "h5",
  "alias": "R.",
  "approxAge": "cerca de 60",
  "approach": "patologias",
  "text": "Me sentí acompañado en todo momento…",
  "consent": true,
  "published": true
}
```

- `consent: true` es obligatorio (consentimiento **escrito** del paciente). Sin él, el build falla.
- `published: false` la guarda sin mostrarla.
- El validador rechaza apellidos en `alias` y textos con kilos o porcentajes.

**Fotos.** Reemplazá los archivos de `public/images/` (o cambiá la ruta en `profile.json`). Recomendado: JPG/WebP con luz natural, retrato en relación 4:5 y consultorio en 3:2.

> Los cambios en `content/` se ven al instante en `npm run dev`. En producción requieren un nuevo deploy (en Vercel alcanza con hacer push al repositorio).

---

## Reservas: elegir el proveedor

La UI usa una interfaz `CalendarProvider` (`lib/booking/provider.ts`) y la implementación se elige con `BOOKING_PROVIDER`:

| Valor | Cuándo usarlo |
| --- | --- |
| `mock` | Demo y desarrollo. Disponibilidad simulada, sin credenciales. |
| `google` | **Recomendado.** UI propia del sitio. Los turnos se crean en el Google Calendar del/la profesional, con invitación al paciente, Google Meet para consultas online y link de cancelación. |
| `calcom` | Si se prefiere no gestionar credenciales de Google Cloud. Cal.com se conecta al Google Calendar desde su propio panel. |

---

## Configurar Google Calendar (paso a paso)

Se usa **OAuth 2.0 con la cuenta de Google del/la profesional** y un *refresh token* guardado en variables de entorno. No se usa *service account*: sin Google Workspace y delegación de dominio, una service account no puede invitar al paciente al evento.

Se hace una sola vez y lleva unos 15 minutos.

### 1. Crear el proyecto y habilitar la API

1. Entrá a <https://console.cloud.google.com/> **con la cuenta de Google del consultorio**.
2. Arriba a la izquierda: **Seleccionar proyecto → Proyecto nuevo**. Nombre: `turnos-nutricion`. Crear.
3. Menú → **APIs y servicios → Biblioteca** → buscá **Google Calendar API** → **Habilitar**.

### 2. Configurar la pantalla de consentimiento

En **APIs y servicios → Pantalla de consentimiento de OAuth** (en la consola nueva se llama **Google Auth Platform**):

1. **Información de la marca (Branding):** nombre de la app (ej. "Turnos — Lic. Nombre Apellido"), email de asistencia y email de contacto del desarrollador.
2. **Público (Audience):** tipo de usuario **Externo**.
3. **Acceso a los datos (Data Access) → Agregar o quitar permisos:** agregá estos dos y guardá:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.freebusy`
4. **Público → Estado de publicación → Publicar app** ("En producción").

> ⚠️ **Importante:** si la app queda en modo **"Prueba" (Testing)**, Google hace vencer el refresh token **a los 7 días** y las reservas dejan de funcionar con el error `invalid_grant`. Publicala. No hace falta pasar por la verificación de Google porque la única cuenta que la usa es la del consultorio. Al autorizar vas a ver el aviso *"Google no verificó esta app"*: entrá en **Configuración avanzada → Ir a … (no seguro)**. Es esperable, porque la app es tuya.

### 3. Crear las credenciales OAuth

1. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth** (en la consola nueva: **Clientes → Crear cliente**).
2. Tipo de aplicación: **Aplicación web**. Nombre: `turnos-web`.
3. **URIs de redireccionamiento autorizados → Agregar URI:**
   ```
   http://localhost:53682/oauth2callback
   ```
   Si cambiás `OAUTH_PORT`, usá ese puerto.
4. Crear y copiá el **ID de cliente** y el **Secreto del cliente** en `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxxxxxx
   ```

### 4. Obtener el refresh token

```bash
npm run google:token
```

1. Se imprime un link: abrilo, ingresá con la **cuenta del consultorio** y aceptá los permisos. **Marcá todas las casillas** (Google permite destildar permisos individuales): si falta alguno, el script no imprime el token y hay que repetir el paso.
2. La terminal muestra `GOOGLE_REFRESH_TOKEN=…`. Copialo en `.env.local`.
3. Verificá la conexión:
   ```bash
   npm run google:check
   ```

Si Google no devuelve refresh token, quitá el acceso de la app en <https://myaccount.google.com/permissions> y volvé a correr el script.

### 5. Elegir el calendario y activar el proveedor

```env
BOOKING_PROVIDER=google
GOOGLE_CALENDAR_ID=primary
BOOKING_SECRET=<cadena aleatoria de 32+ caracteres>
NEXT_PUBLIC_SITE_URL=https://www.tu-dominio.com.ar
```

- `primary` es el calendario principal de la cuenta. Para usar un calendario dedicado ("Turnos"), el ID está en Google Calendar → Configuración del calendario → **Integrar el calendario → ID del calendario**.
- Si usás un calendario dedicado, sumá el principal (u otros) en `GOOGLE_BUSY_CALENDAR_IDS` para que los eventos personales también bloqueen turnos.
- `BOOKING_SECRET` firma los links de cancelación. Generalo con:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
  ```
  Si lo cambiás, los links de cancelación ya enviados dejan de funcionar.
- `NEXT_PUBLIC_SITE_URL` tiene que ser la URL real: con ella se arma el link de cancelación que va dentro de la invitación.

### Qué pasa en cada reserva

1. El sitio calcula los horarios libres: reglas de `schedule.json` menos los períodos ocupados (`freebusy.query`), con caché de 60 s.
2. Al confirmar, vuelve a consultar `freebusy` **sin caché** para el horario exacto.
3. Crea el evento (`events.insert`) con:
   - título `Consulta <tipo> — <Nombre>` y descripción con teléfono, modalidad, motivo y **link de cancelación**;
   - el paciente como invitado (`sendUpdates: "all"`), así Google le envía el mail con la invitación;
   - si es online, un link de **Google Meet** (`conferenceDataVersion=1`);
   - recordatorios (email 24 h antes y aviso 1 h antes);
   - `extendedProperties.private` con una referencia aleatoria para poder cancelar.
4. Hace un control de carrera: si otra reserva del mismo horario se creó un instante antes (por ejemplo, desde otra instancia del servidor), descarta la propia y le pide a la persona que elija otro horario.
5. Cancelación: el link `/turno/cancelar/<token>` (firmado con HMAC) busca el evento por esa propiedad privada y lo elimina con `sendUpdates: "all"`, respetando `cancellationNoticeHours`.

**Para tener en cuenta:**

- Los recordatorios configurados aplican al calendario del/la profesional. El paciente recibe los recordatorios según la configuración de **su** calendario cuando acepta la invitación.
- Si el paciente responde "No" a la invitación desde Gmail, el evento **no** se elimina ni libera el horario. Para liberarlo tiene que usar el link de cancelación, o lo borra el/la profesional.
- Los eventos de día completo marcados como "Libre" no bloquean turnos. Para bloquear un día entero, marcá el evento como "Ocupado" o usá `blocked` en `schedule.json`.

---

## Usar Cal.com en lugar de Google

1. Creá una cuenta en <https://cal.com>, conectá el Google Calendar del consultorio desde **Apps → Calendarios** y creá los tipos de evento (primera consulta, control, online).
2. En `.env.local` (y en Vercel):
   ```env
   BOOKING_PROVIDER=calcom
   NEXT_PUBLIC_CALCOM_LINK=tu-usuario/primera-consulta
   ```
3. Redeploy. La sección "Reservar turno" muestra la agenda de Cal.com embebida con los colores del sitio. Cal.com se encarga de las confirmaciones, recordatorios y cancelaciones. Las rutas `/api/*` y `/turno/*` de este proyecto no se usan en este modo.

---

## Variables de entorno

Todas están documentadas en [`.env.example`](.env.example).

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Sí (prod) | URL pública, sin barra final |
| `BOOKING_PROVIDER` | No | `mock` (por defecto), `google` o `calcom` |
| `BOOKING_SECRET` | Sí con `google` | Firma de los links de cancelación (32+ caracteres) |
| `SHOW_STORIES` | No | `false` oculta la sección de historias |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Con `google` | Cliente OAuth "Aplicación web" |
| `GOOGLE_REFRESH_TOKEN` | Con `google` | Se obtiene con `npm run google:token` |
| `GOOGLE_CALENDAR_ID` | No | Por defecto `primary` |
| `GOOGLE_BUSY_CALENDAR_IDS` | No | Calendarios extra que bloquean turnos, separados por coma |
| `NEXT_PUBLIC_CALCOM_LINK` | Con `calcom` | `usuario/evento` de Cal.com |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | **Sí con `google`** | Anti-spam de Cloudflare Turnstile. En producción con `google` son obligatorias: cada reserva envía una invitación desde la cuenta del consultorio, así que sin captcha el endpoint podría usarse para enviar spam. Si configurás una sola de las dos, las reservas fallan a propósito. |

Nunca subas `.env.local` al repositorio (ya está en `.gitignore`). Las credenciales de Google solo se usan en el servidor (route handlers) y nunca llegan al navegador.

---

## Deploy en Vercel

1. Subí el proyecto a un repositorio de GitHub, GitLab o Bitbucket.
2. En <https://vercel.com/new> importá el repositorio. Vercel detecta Next.js automáticamente.
3. **Settings → Environment Variables:** cargá las variables de la tabla anterior (Production y Preview).
4. Deploy. Después, en **Settings → Domains**, agregá el dominio propio. Vercel configura **HTTPS** automáticamente (es obligatorio porque se manejan datos personales).
5. Actualizá `NEXT_PUBLIC_SITE_URL` con el dominio final y volvé a deployar.
6. **Analytics:** en el proyecto de Vercel, pestaña **Analytics → Enable**. Es analítica sin cookies, así que no hace falta banner de cookies.
7. **Turnstile:** en <https://dash.cloudflare.com> → Turnstile → *Add site*, agregá el dominio y copiá las claves en Vercel.

> No hace falta cambiar nada en Google Cloud para el deploy: la URI `http://localhost:53682/oauth2callback` solo se usa para obtener el refresh token desde tu computadora.

---

## Tests

```bash
npm test           # Vitest: cálculo de disponibilidad y proveedor de Google (cliente simulado)
npm run test:e2e   # Playwright: flujo completo de reserva en modo demo (mock)
```

La primera vez, instalá el navegador de Playwright: `npx playwright install chromium`. El test e2e levanta el sitio en modo `mock` (sin Google ni credenciales).

---

## Checklist legal antes de publicar

Basado en el Reglamento de Publicidad del **Colegio de Nutricionistas de la Provincia de Buenos Aires** (Ley 13.272) y la **Ley 25.326** de Protección de Datos Personales.

- [ ] Nombre, título universitario, universidad y **número de matrícula (M.P.)** correctos en `content/profile.json`.
- [ ] No hay **precios, honorarios, consultas gratuitas, descuentos ni promociones** en ningún texto.
- [ ] No hay **promesas de resultados**, plazos ("bajá X kg en Y días"), curaciones ni estadísticas de éxito.
- [ ] No se usa el logo del Colegio.
- [ ] **Historias de pacientes:** ⚠️ el contenido de esta sección excede los datos básicos permitidos por el reglamento y **requiere autorización previa del Consejo Directivo del Colegio** antes de publicarse. Hasta tenerla, desplegá con `SHOW_STORIES=false`. Además:
  - [ ] consentimiento **escrito** de cada paciente (`consent: true`);
  - [ ] solo inicial o nombre de pila y edad aproximada;
  - [ ] nunca fotos de antes y después, kilos ni métricas.
- [ ] **Política de privacidad** (`app/privacidad/page.tsx`) revisada: responsable, finalidad, destinatarios (Google), derechos de acceso, rectificación y supresión, y contacto. Idealmente, revisada por un/a profesional del derecho.
- [ ] **Términos** (`app/terminos/page.tsx`) revisados, sobre todo la política de cancelación.
- [ ] Ningún texto o imagen sigue marcado como `PLACEHOLDER`.
- [ ] HTTPS activo en el dominio final.

---

## Arquitectura y decisiones

```
app/
  page.tsx                       one-page con todas las secciones
  api/slots                      GET  horarios disponibles
  api/bookings                   POST crear turno (Zod + honeypot + Turnstile + rate limit)
  api/bookings/cancel            POST cancelar turno
  turno/confirmado               confirmación (.ics + link de cancelación)
  turno/cancelar/[token]         cancelación
  privacidad, terminos, not-found
components/
  layout/  sections/  booking/  ui/
content/                         contenido editable (JSON)
lib/
  content/                       schemas Zod + carga
  booking/
    availability.ts              cálculo puro de turnos libres
    provider.ts                  interfaz CalendarProvider + factory
    providers/google.ts          Google Calendar API v3
    providers/mock.ts            modo demo
    tokens.ts                    tokens de cancelación firmados (HMAC)
    rate-limit.ts  turnstile.ts  cache.ts  ics.ts
scripts/                         get-google-refresh-token.ts, check-google.ts
tests/                           unit (Vitest) y e2e (Playwright)
```

- **Privacidad:** no hay base de datos. La confirmación pasa a `/turno/confirmado` por `sessionStorage` (sin datos personales en la URL). Los logs del servidor no incluyen datos personales: los mensajes de error se depuran de emails y teléfonos.
- **Rate limiting y caché en memoria:** cada instancia de Vercel tiene la suya. Para un consultorio alcanza. Si se necesitara un límite global, se puede reemplazar `lib/booking/rate-limit.ts` por Upstash Redis (`@upstash/ratelimit`).
- **Zona horaria:** todo se calcula en `America/Argentina/Buenos_Aires`, sin importar la zona del servidor o del navegador.
