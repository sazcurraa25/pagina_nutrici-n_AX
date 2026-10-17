import "server-only";

let warned = false;

/** Error de configuración de Turnstile: la ruta lo reporta como error interno, no como captcha. */
export class TurnstileConfigError extends Error {}

/**
 * Verifica el token de Cloudflare Turnstile.
 *
 * Falla cerrado (lanza TurnstileConfigError) cuando el anti-spam debería estar activo pero
 * no lo está: así nunca queda una reserva en producción con Google Calendar sin captcha
 * (cada reserva manda una invitación desde la cuenta del consultorio, ver README).
 * Solo se omite en desarrollo o en modo demo sin claves.
 */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const isProd = process.env.NODE_ENV === "production";
  const usesGoogle = process.env.BOOKING_PROVIDER === "google";

  if (!secret) {
    // Una sola clave configurada = error de configuración en cualquier entorno.
    if (siteKey) {
      throw new TurnstileConfigError("NEXT_PUBLIC_TURNSTILE_SITE_KEY está configurada pero falta TURNSTILE_SECRET_KEY");
    }
    // En producción con Google, el captcha es obligatorio.
    if (isProd && usesGoogle) {
      throw new TurnstileConfigError("TURNSTILE_SECRET_KEY es obligatoria con BOOKING_PROVIDER=google en producción");
    }
    if (!warned) {
      console.warn("[turnstile] TURNSTILE_SECRET_KEY no configurada: se omite la verificación anti-spam.");
      warned = true;
    }
    return true;
  }
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    console.error("[turnstile] No se pudo verificar el token.");
    return false;
  }
}
