/**
 * Verifica que las credenciales de Google funcionen, replicando lo que hace el sitio:
 *  - consulta freebusy de TODOS los calendarios configurados (principal + ocupación);
 *  - confirma que el token tenga los permisos de eventos y freebusy;
 *  - hace una lectura mínima del calendario principal (permiso de eventos).
 * No crea ni modifica eventos.
 *
 * Uso: npm run google:check
 */
import { existsSync } from "node:fs";
import { auth, calendar } from "googleapis/build/src/apis/calendar";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
const REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
  console.error("✗ Faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REFRESH_TOKEN en .env.local");
  process.exit(1);
}

// Mismos calendarios que usa el sitio (ver createGoogleProviderFromEnv).
const busyIds = (process.env.GOOGLE_BUSY_CALENDAR_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allCalendarIds = [...new Set([calendarId, ...busyIds])];

const oauth = new auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
oauth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
const cal = calendar({ version: "v3", auth: oauth });

function fail(message: string, hint?: string): never {
  console.error(`✗ ${message}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
}

try {
  // 1) Permisos otorgados al token.
  const { token } = await oauth.getAccessToken();
  const info = await oauth.getTokenInfo(token!);
  const missing = REQUIRED_SCOPES.filter((s) => !info.scopes.includes(s));
  if (missing.length) {
    fail(
      `Al token le faltan permisos: ${missing.join(", ")}`,
      "Volvé a correr  npm run google:token  y marcá todas las casillas.",
    );
  }
  console.log("✓ Permisos correctos (events + freebusy).");

  // 2) freebusy de todos los calendarios configurados (como en producción).
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60_000);
  const res = await cal.freebusy.query({
    requestBody: {
      timeMin: now.toISOString(),
      timeMax: in7.toISOString(),
      items: allCalendarIds.map((id) => ({ id })),
    },
  });
  const calendars = res.data.calendars ?? {};
  for (const id of allCalendarIds) {
    const entry = calendars[id];
    if (!entry) fail(`El calendario "${id}" no aparece en la respuesta de freebusy.`, "Revisá el ID.");
    if (entry.errors?.length) {
      fail(`Google rechazó el calendario "${id}": ${entry.errors.map((e) => e.reason).join(", ")}`);
    }
    console.log(`  ✓ "${id}": ${entry.busy?.length ?? 0} bloque(s) ocupado(s) en 7 días.`);
  }

  // 3) Lectura mínima del calendario principal (confirma el permiso de eventos sobre ÉL).
  await cal.events.list({ calendarId, maxResults: 1, fields: "kind" });
  console.log(`✓ Acceso de eventos al calendario "${calendarId}".`);

  console.log("\n✓ Todo listo para usar BOOKING_PROVIDER=google.");
} catch (err) {
  const e = err as { message?: string; code?: number; response?: { data?: { error?: string } } };
  const reason = e.response?.data?.error ?? e.message ?? "error desconocido";
  if (e.code === 403 || /insufficient|forbidden/i.test(reason)) {
    fail(
      `Google denegó el acceso: ${reason}`,
      "Falta el permiso de eventos sobre el calendario. Volvé a correr  npm run google:token  y marcá todas las casillas.",
    );
  }
  if (reason === "invalid_grant") {
    fail(
      "El refresh token venció o fue revocado.",
      "Si la app OAuth está en modo 'Prueba', los tokens vencen a los 7 días: publicala ('En producción') y volvé a correr  npm run google:token",
    );
  }
  fail(`No se pudo conectar con Google Calendar: ${reason}`);
}
