import "server-only";
import type { Modality, Schedule } from "@/lib/content/schemas";
import { schedule as defaultSchedule } from "@/lib/content";
import { computeAvailableSlots, findAvailableSlot, type Interval } from "./availability";
import type { BookingSummary, Slot } from "./schema";

export type BookingInput = {
  typeId: string;
  start: Date;
  name: string;
  email: string;
  phone: string;
  modality: Modality;
  reason: string;
};

export interface CalendarProvider {
  getAvailableSlots(params: { from: Date; to: Date; appointmentType: string }): Promise<Slot[]>;
  createBooking(input: BookingInput): Promise<{ bookingId: string; cancelToken: string; summary: BookingSummary }>;
  cancelBooking(cancelToken: string): Promise<void>;
  /** Datos no personales del turno asociado a un token, o null si no existe. */
  getBooking(cancelToken: string): Promise<BookingSummary | null>;
}

export class SlotUnavailableError extends Error {
  constructor() {
    super("SLOT_TAKEN");
  }
}

export class BookingNotFoundError extends Error {
  constructor() {
    super("NOT_FOUND");
  }
}

export class InvalidModalityError extends Error {
  constructor() {
    super("INVALID_MODALITY");
  }
}

/**
 * Base para proveedores que exponen "períodos ocupados" (freebusy).
 * La disponibilidad se calcula siempre con las reglas de content/schedule.json.
 */
export abstract class BusyBasedProvider implements CalendarProvider {
  constructor(protected readonly schedule: Schedule = defaultSchedule) {}

  /** Períodos ocupados del calendario. `fresh` = saltear caché (para confirmar una reserva). */
  protected abstract getBusy(from: Date, to: Date, opts: { fresh: boolean }): Promise<Interval[]>;

  abstract createBooking(input: BookingInput): ReturnType<CalendarProvider["createBooking"]>;
  abstract cancelBooking(cancelToken: string): Promise<void>;
  abstract getBooking(cancelToken: string): Promise<BookingSummary | null>;

  async getAvailableSlots({ from, to, appointmentType }: { from: Date; to: Date; appointmentType: string }) {
    const busy = await this.getBusy(from, to, { fresh: false });
    return computeAvailableSlots({ schedule: this.schedule, typeId: appointmentType, from, to, now: new Date(), busy });
  }

  /** Vuelve a consultar el calendario (sin caché) para el horario exacto. Evita dobles reservas. */
  protected async assertSlotAvailable(input: BookingInput): Promise<Slot> {
    const margin = 24 * 60 * 60_000;
    const busy = await this.getBusy(
      new Date(input.start.getTime() - margin),
      new Date(input.start.getTime() + margin),
      { fresh: true },
    );
    const slot = findAvailableSlot({
      schedule: this.schedule,
      typeId: input.typeId,
      start: input.start,
      now: new Date(),
      busy,
    });
    if (!slot) throw new SlotUnavailableError();
    if (slot.modality !== "ambas" && slot.modality !== input.modality) throw new InvalidModalityError();
    return slot;
  }

  protected typeLabel(typeId: string): string {
    return this.schedule.appointmentTypes.find((t) => t.id === typeId)?.label ?? typeId;
  }
}

export type ProviderName = "mock" | "google" | "calcom";

export function providerName(): ProviderName {
  const p = process.env.BOOKING_PROVIDER;
  return p === "google" || p === "calcom" ? p : "mock";
}

let instance: CalendarProvider | null = null;

export async function getProvider(): Promise<CalendarProvider> {
  if (instance) return instance;
  const name = providerName();
  if (name === "calcom") {
    throw new Error("Con BOOKING_PROVIDER=calcom las reservas las gestiona Cal.com; estas rutas no se usan.");
  }
  if (name === "google") {
    const [{ createGoogleProviderFromEnv }, { profile }, { siteUrl }] = await Promise.all([
      import("./providers/google"),
      import("@/lib/content"),
      import("@/lib/utils"),
    ]);
    instance = createGoogleProviderFromEnv({
      address: `${profile.address.street}, ${profile.address.city}, ${profile.address.province}`,
      siteUrl,
    });
    return instance;
  }
  const { MockProvider } = await import("./providers/mock");
  instance = new MockProvider();
  return instance;
}
