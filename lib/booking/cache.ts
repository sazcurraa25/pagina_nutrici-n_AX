import "server-only";

/**
 * Caché en memoria con vencimiento (por instancia del servidor).
 * Si dos pedidos llegan a la vez con la misma clave, comparten la misma promesa.
 */
export class TtlCache<T> {
  private entries = new Map<string, { expires: number; value: Promise<T> }>();

  constructor(private readonly ttlMs: number) {}

  get(key: string, load: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.entries.get(key);
    if (hit && hit.expires > now) return hit.value;

    const value = load();
    this.entries.set(key, { expires: now + this.ttlMs, value });
    // Si falla, no se cachea el error.
    value.catch(() => {
      if (this.entries.get(key)?.value === value) this.entries.delete(key);
    });
    if (this.entries.size > 200) {
      for (const [k, e] of this.entries) if (e.expires <= now) this.entries.delete(k);
    }
    return value;
  }

  clear() {
    this.entries.clear();
  }
}

/** Serializa operaciones dentro de la misma instancia (evita carreras locales). */
export function createMutex() {
  let tail: Promise<unknown> = Promise.resolve();
  return function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = tail.then(fn, fn);
    tail = run.catch(() => undefined);
    return run;
  };
}
