import "server-only";

/**
 * Rate limiting simple en memoria (ventana deslizante por clave).
 * En Vercel cada instancia tiene su propia memoria: es una protección básica
 * (ver README para pasarlo a Upstash Redis si hiciera falta).
 */
const hits: Map<string, number[]> = ((globalThis as Record<string, unknown>).__rateLimitHits ??= new Map()) as Map<
  string,
  number[]
>;

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    const oldest = recent[0] ?? now;
    return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - oldest)) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);

  // Limpieza ocasional para no crecer sin límite.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  }
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
