import "server-only";
import { addDaysToKey } from "../availability";
import type { Interval } from "../availability";
import { BookingNotFoundError, BusyBasedProvider, type BookingInput } from "../provider";
import type { BookingSummary } from "../schema";
import { createCancelToken, verifyCancelToken } from "../tokens";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

/**
 * Proveedor de demostración (BOOKING_PROVIDER=mock).
 * - Simula turnos ocupados de forma determinística (los mismos en cada recarga).
 * - Guarda las reservas en memoria del proceso: se pierden al reiniciar el servidor.
 */
type StoredBooking = BookingSummary & { ref: string };

const store: Map<string, StoredBooking> = ((globalThis as Record<string, unknown>).__mockBookings ??= new Map()) as Map<
  string,
  StoredBooking
>;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class MockProvider extends BusyBasedProvider {
  /** Simula 1 o 2 bloques ocupados de 1 h por día, más las reservas hechas en la demo. */
  protected async getBusy(from: Date, to: Date): Promise<Interval[]> {
    const tz = this.schedule.timezone;
    const busy: Interval[] = [];
    const lastKey = formatInTimeZone(to, tz, "yyyy-MM-dd");
    for (let key = formatInTimeZone(from, tz, "yyyy-MM-dd"); key <= lastKey; key = addDaysToKey(key, 1)) {
      const h = hash(key);
      const blocks = 1 + (h % 2);
      for (let i = 0; i < blocks; i++) {
        const hour = 9 + ((h >>> (i * 5)) % 11);
        const start = fromZonedTime(`${key}T${String(hour).padStart(2, "0")}:00:00`, tz);
        busy.push({ start, end: new Date(start.getTime() + 60 * 60_000) });
      }
    }
    for (const b of store.values()) busy.push({ start: new Date(b.start), end: new Date(b.end) });
    return busy;
  }

  async createBooking(input: BookingInput) {
    const slot = await this.assertSlotAvailable(input);
    const { ref, token } = createCancelToken();
    const summary: BookingSummary = {
      bookingId: `mock-${ref.slice(0, 8)}`,
      typeId: input.typeId,
      typeLabel: this.typeLabel(input.typeId),
      start: slot.start,
      end: slot.end,
      modality: input.modality,
      ...(input.modality === "online" ? { meetLink: "https://meet.google.com/demo-modo-mock" } : {}),
    };
    store.set(ref, { ...summary, ref });
    return { bookingId: summary.bookingId, cancelToken: token, summary };
  }

  async getBooking(cancelToken: string) {
    const ref = verifyCancelToken(cancelToken);
    const found = ref ? store.get(ref) : undefined;
    if (!found) return null;
    const { ref: _ref, ...summary } = found;
    return summary;
  }

  async cancelBooking(cancelToken: string) {
    const ref = verifyCancelToken(cancelToken);
    if (!ref || !store.delete(ref)) throw new BookingNotFoundError();
  }
}
