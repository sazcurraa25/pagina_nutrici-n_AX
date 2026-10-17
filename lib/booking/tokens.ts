import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Token de cancelación = `<ref>.<firma>`.
 * - `ref` es aleatorio y es lo único que se guarda en el evento (extendedProperties.private).
 * - `firma` es un HMAC con BOOKING_SECRET: sin el secreto no se pueden fabricar tokens válidos.
 */
const DEV_SECRET = "dev-only-insecure-secret-change-me";

function secret(): string {
  const s = process.env.BOOKING_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" && process.env.BOOKING_PROVIDER === "google") {
    throw new Error("BOOKING_SECRET no está configurado (mínimo 32 caracteres).");
  }
  return DEV_SECRET;
}

function sign(ref: string): string {
  return createHmac("sha256", secret()).update(ref).digest("base64url").slice(0, 32);
}

export function createCancelToken(): { ref: string; token: string } {
  const ref = randomBytes(16).toString("base64url");
  return { ref, token: `${ref}.${sign(ref)}` };
}

/** Devuelve el `ref` si la firma es válida; si no, null. */
export function verifyCancelToken(token: string): string | null {
  const [ref, sig, ...rest] = token.split(".");
  if (!ref || !sig || rest.length > 0 || !/^[\w-]{16,64}$/.test(ref)) return null;
  const expected = Buffer.from(sign(ref));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return ref;
}
