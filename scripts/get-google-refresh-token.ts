/**
 * Obtiene el GOOGLE_REFRESH_TOKEN de la cuenta de Google del/la profesional.
 *
 * Uso:
 *   1. Completá GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local
 *   2. npm run google:token
 *   3. Abrí el link que aparece, ingresá con la cuenta de Google del consultorio y aceptá los permisos.
 *   4. Copiá el refresh token que se imprime en .env.local y en Vercel.
 *
 * La URI de redirección http://localhost:53682/oauth2callback tiene que estar autorizada
 * en el cliente OAuth (Google Cloud → APIs y servicios → Credenciales). Ver README.
 */
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { auth } from "googleapis/build/src/apis/calendar";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const PORT = Number(process.env.OAUTH_PORT ?? 53682);
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error("✗ Faltan GOOGLE_CLIENT_ID y/o GOOGLE_CLIENT_SECRET en .env.local");
  process.exit(1);
}

const oauth = new auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
const state = randomBytes(16).toString("hex");
const url = oauth.generateAuthUrl({
  access_type: "offline",
  // "consent" fuerza a Google a devolver un refresh token aunque ya se haya autorizado antes.
  prompt: "consent",
  scope: SCOPES,
  state,
  include_granted_scopes: true,
});

const server = createServer(async (req, res) => {
  const reqUrl = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  if (reqUrl.pathname !== "/oauth2callback") {
    res.writeHead(404).end();
    return;
  }
  const finish = (status: number, message: string) => {
    res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;padding:2rem">${message}</body>`);
  };

  if (reqUrl.searchParams.get("state") !== state) {
    finish(400, "Estado inválido. Volvé a correr el script.");
    return;
  }
  const error = reqUrl.searchParams.get("error");
  if (error) {
    finish(400, `Google devolvió un error: ${error}`);
    console.error(`✗ Autorización cancelada o rechazada: ${error}`);
    server.close();
    process.exitCode = 1;
    return;
  }

  try {
    const { tokens } = await oauth.getToken(reqUrl.searchParams.get("code") ?? "");
    const granted = (tokens.scope ?? "").split(" ");
    const missing = SCOPES.filter((s) => !granted.includes(s));
    if (!tokens.refresh_token) {
      finish(500, "Google no devolvió un refresh token. Revisá la consola.");
      console.error(
        "✗ Google no devolvió refresh_token. Quitá el acceso de la app en https://myaccount.google.com/permissions y volvé a intentar.",
      );
      process.exitCode = 1;
    } else if (missing.length) {
      // Google permite destildar permisos en la pantalla de consentimiento. Sin todos,
      // las reservas fallarían, así que no se imprime el token: hay que volver a intentar.
      finish(400, "<h1>Faltan permisos</h1><p>Volvé a la terminal: tenés que autorizar de nuevo.</p>");
      console.error(`\n✗ No se otorgaron estos permisos: ${missing.join(", ")}`);
      console.error("  Volvé a correr  npm run google:token  y marcá TODAS las casillas de permisos.\n");
      process.exitCode = 1;
    } else {
      finish(200, "<h1>¡Listo!</h1><p>Ya podés cerrar esta pestaña y volver a la terminal.</p>");
      console.log("\n✓ Autorización completa.\n");
      console.log("Agregá esta línea a .env.local y a las variables de entorno de Vercel:\n");
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
      console.log("Guardalo como un secreto: da acceso a los eventos del calendario.");
    }
  } catch (err) {
    finish(500, "No se pudo canjear el código. Revisá la consola.");
    console.error("✗ Error al obtener el token:", (err as Error).message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("\nAbrí este link en el navegador e ingresá con la cuenta de Google del consultorio:\n");
  console.log(url);
  console.log(`\n(Esperando la respuesta en ${REDIRECT_URI} …)`);
});
