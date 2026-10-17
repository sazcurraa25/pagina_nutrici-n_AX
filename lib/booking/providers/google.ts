import "server-only";
import { auth as googleAuth, calendar as googleCalendar, type calendar_v3 } from "googleapis/build/src/apis/calendar";
import { z } from "zod";
import type { Modality, Schedule } from "@/lib/content/schemas";
import { schedule as defaultSchedule } from "@/lib/content";
import type { Interval } from "../availability";
import {
  BookingNotFoundError,
  BusyBasedProvider,
  SlotUnavailableError,
  type BookingInput,
} from "../provider";
import type { BookingSummary } from "../schema";
import { createCancelToken, verifyCancelToken } from "../tokens";
import { TtlCache, createMutex } from "../cache";

/** Marca que identifica los eventos creados por este sitio. */
const SOURCE = "web-turnos";
const CACHE_TTL_MS = 60_000;
const HOUR = 60 * 60_000;

export type GoogleProviderOptions = {
  calendar: calendar_v3.Calendar;
  /** Calendario donde se crean los turnos. */
  calendarId: string;
  /** Calendarios cuyo "ocupado" bloquea turnos (incluye siempre calendarId). */
  busyCalendarIds?: string[];
  schedule?: Schedule;
  /** Dirección del consultorio, para los turnos presenciales. */
  address: string;
  /** URL pública del sitio, para el link de cancelación dentro de la invitación. */
  siteUrl: string;
};

export class GoogleCalendarProvider extends BusyBasedProvider {
  private readonly calendar: calendar_v3.Calendar;
  private readonly calendarId: string;
  private readonly busyCalendarIds: string[];
  private readonly address: string;
  private readonly siteUrl: string;
  private readonly busyCache = new TtlCache<Interval[]>(CACHE_TTL_MS);
  private readonly exclusive = createMutex();

  constructor(opts: GoogleProviderOptions) {
    super(opts.schedule ?? defaultSchedule);
    this.calendar = opts.calendar;
    this.calendarId = opts.calendarId;
    this.busyCalendarIds = [...new Set([opts.calendarId, ...(opts.busyCalendarIds ?? [])])];
    this.address = opts.address;
    this.siteUrl = opts.siteUrl.replace(/\/$/, "");
  }

  /* ---------------- Disponibilidad ---------------- */

  protected async getBusy(from: Date, to: Date, { fresh }: { fresh: boolean }): Promise<Interval[]> {
    if (fresh) return this.queryFreeBusy(from, to);
    // Se redondea el rango (hora hacia abajo / día hacia arriba) para que pedidos
    // consecutivos compartan la misma entrada de caché durante 60 s.
    const fromR = new Date(Math.floor(from.getTime() / HOUR) * HOUR);
    const toR = new Date(Math.ceil(to.getTime() / (24 * HOUR)) * 24 * HOUR);
    const key = `${fromR.toISOString()}|${toR.toISOString()}`;
    return this.busyCache.get(key, () => this.queryFreeBusy(fromR, toR));
  }

  private async queryFreeBusy(from: Date, to: Date): Promise<Interval[]> {
    const res = await this.calendar.freebusy.query({
      requestBody: {
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        timeZone: this.schedule.timezone,
        items: this.busyCalendarIds.map((id) => ({ id })),
      },
    });
    const calendars = res.data.calendars ?? {};
    const busy: Interval[] = [];
    for (const id of this.busyCalendarIds) {
      const cal = calendars[id];
      if (!cal) throw new Error(`freebusy: el calendario configurado no aparece en la respuesta`);
      if (cal.errors?.length) {
        throw new Error(`freebusy: ${cal.errors.map((e) => e.reason).join(", ")}`);
      }
      for (const b of cal.busy ?? []) {
        if (b.start && b.end) busy.push({ start: new Date(b.start), end: new Date(b.end) });
      }
    }
    return busy;
  }

  /* ---------------- Reservas ---------------- */

  async createBooking(input: BookingInput) {
    // Dentro de una misma instancia, las reservas se procesan de a una.
    return this.exclusive(() => this.createBookingUnsafe(input));
  }

  private async createBookingUnsafe(input: BookingInput) {
    // 1) Vuelve a consultar freebusy (sin caché) para el horario exacto.
    //    Si el horario ya está ocupado, se descarta la caché para que el próximo
    //    pedido de esta instancia muestre la disponibilidad real (no el slot tomado).
    let slot;
    try {
      slot = await this.assertSlotAvailable(input);
    } catch (err) {
      if (err instanceof SlotUnavailableError) this.busyCache.clear();
      throw err;
    }
    const type = this.schedule.appointmentTypes.find((t) => t.id === input.typeId);
    if (!type) throw new SlotUnavailableError();

    const { ref, token } = createCancelToken();
    const online = input.modality === "online";
    const cancelUrl = `${this.siteUrl}/turno/cancelar/${token}`;

    // 2) Crea el evento e invita a la persona (Google le manda el mail).
    const res = await this.calendar.events.insert({
      calendarId: this.calendarId,
      sendUpdates: "all",
      conferenceDataVersion: online ? 1 : 0,
      requestBody: {
        summary: `Consulta ${type.shortLabel ?? type.label} — ${input.name}`,
        description: buildDescription({
          typeLabel: `${type.label} (${type.durationMinutes} min)`,
          modality: input.modality,
          name: input.name,
          email: input.email,
          phone: input.phone,
          reason: input.reason,
          address: this.address,
          cancelUrl,
          cancellationNoticeHours: this.schedule.cancellationNoticeHours,
        }),
        start: { dateTime: slot.start, timeZone: this.schedule.timezone },
        end: { dateTime: slot.end, timeZone: this.schedule.timezone },
        ...(online ? {} : { location: this.address }),
        attendees: [{ email: input.email, displayName: input.name }],
        guestsCanInviteOthers: false,
        guestsCanModify: false,
        guestsCanSeeOtherGuests: false,
        visibility: "private",
        transparency: "opaque",
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 },
            { method: "popup", minutes: 60 },
          ],
        },
        extendedProperties: {
          private: { source: SOURCE, cancelRef: ref, typeId: type.id, modality: input.modality },
        },
        ...(online
          ? {
              conferenceData: {
                createRequest: { requestId: ref, conferenceSolutionKey: { type: "hangoutsMeet" } },
              },
            }
          : {}),
      },
    });

    const event = res.data;
    if (!event.id) throw new Error("events.insert: respuesta sin id");
    this.busyCache.clear();

    // 3) Control de carrera entre instancias: si otro evento que se superpone se creó
    //    antes, este turno se descarta. El evento ya existe y la invitación ya se envió
    //    (sendUpdates "all"), así que este chequeo es de mejor esfuerzo: si events.list
    //    falla (p. ej. 403/5xx) se conserva la reserva en vez de dejar un evento huérfano
    //    que la persona cree cancelado.
    let lost = false;
    try {
      lost = await this.lostRace(event);
    } catch {
      console.warn("[google] No se pudo verificar superposición tras crear el turno; se mantiene la reserva.");
    }
    if (lost) {
      await this.calendar.events
        .delete({ calendarId: this.calendarId, eventId: event.id, sendUpdates: "all" })
        .catch(() => console.error("[google] No se pudo descartar un turno duplicado; revisar el calendario."));
      throw new SlotUnavailableError();
    }

    // 4) Si es online y Google no pudo crear el Meet, se avisa sin datos personales.
    if (online && event.conferenceData?.createRequest?.status?.statusCode === "failure") {
      console.error(`[google] No se generó el link de Meet para el evento ${event.id}; agregar uno manualmente.`);
    }

    const summary: BookingSummary = {
      bookingId: event.id,
      typeId: type.id,
      typeLabel: type.label,
      start: slot.start,
      end: slot.end,
      modality: input.modality,
      ...(event.hangoutLink ? { meetLink: event.hangoutLink } : {}),
    };
    return { bookingId: event.id, cancelToken: token, summary };
  }

  /**
   * events.list recorre todas las páginas: una página puede venir vacía aunque haya
   * más resultados (se detecta por nextPageToken). Si `stop` devuelve un valor, corta.
   * Si se llega al tope de páginas con token pendiente, lanza error en vez de dar un
   * resultado parcial (que haría ver un turno como inexistente o permitiría doble reserva).
   */
  private async listEvents(
    params: calendar_v3.Params$Resource$Events$List,
    stop?: (e: calendar_v3.Schema$Event) => boolean,
  ): Promise<calendar_v3.Schema$Event[]> {
    const MAX_PAGES = 20;
    const items: calendar_v3.Schema$Event[] = [];
    let pageToken: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await this.calendar.events.list({ ...params, pageToken });
      for (const e of res.data.items ?? []) {
        items.push(e);
        if (stop?.(e)) return items;
      }
      pageToken = res.data.nextPageToken ?? undefined;
      if (!pageToken) return items;
    }
    throw new Error("events.list: demasiadas páginas sin resolver");
  }

  private async lostRace(event: calendar_v3.Schema$Event): Promise<boolean> {
    const start = event.start?.dateTime;
    const end = event.end?.dateTime;
    if (!start || !end || !event.created || !event.id) return false;
    const buffer = this.schedule.bufferMinutes * 60_000;
    const items = await this.listEvents({
      calendarId: this.calendarId,
      timeMin: new Date(new Date(start).getTime() - buffer).toISOString(),
      timeMax: new Date(new Date(end).getTime() + buffer).toISOString(),
      singleEvents: true,
      showDeleted: false,
      maxResults: 250,
    });
    const mine = { created: Date.parse(event.created), id: event.id };
    return items.some((other) => {
      if (!other.id || other.id === event.id) return false;
      if (other.status === "cancelled" || other.transparency === "transparent") return false;
      if (!other.start?.dateTime) return false; // eventos de día completo: los resuelve freebusy
      // freebusy no cuenta invitaciones rechazadas por la titular; events.list sí. Se ignoran
      // para no descartar turnos en horarios que la disponibilidad muestra como libres.
      if (other.attendees?.some((a) => a.self && a.responseStatus === "declined")) return false;
      // Empate de `created` (Google suele truncar a segundos) = pérdida: si dos instancias
      // se ven mutuamente ambas ceden (rechazo raro), pero nunca sobreviven las dos.
      const created = other.created ? Date.parse(other.created) : 0;
      return created <= mine.created;
    });
  }

  private async findEvent(cancelToken: string): Promise<calendar_v3.Schema$Event | null> {
    const ref = verifyCancelToken(cancelToken);
    if (!ref) return null;
    // Solo pueden mostrarse o cancelarse turnos futuros; acotar por tiempo reduce el barrido
    // y la chance de páginas vacías. Margen de 1 día por zona horaria.
    const timeMin = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    const items = await this.listEvents(
      {
        calendarId: this.calendarId,
        privateExtendedProperty: [`cancelRef=${ref}`, `source=${SOURCE}`],
        timeMin,
        singleEvents: true,
        showDeleted: false,
        maxResults: 250,
      },
      (e) => e.status !== "cancelled",
    );
    return items.find((e) => e.status !== "cancelled") ?? null;
  }

  async getBooking(cancelToken: string): Promise<BookingSummary | null> {
    const event = await this.findEvent(cancelToken);
    if (!event?.id || !event.start?.dateTime || !event.end?.dateTime) return null;
    const props = event.extendedProperties?.private ?? {};
    const typeId = props.typeId ?? "";
    const modality: Modality = props.modality === "online" ? "online" : "presencial";
    return {
      bookingId: event.id,
      typeId,
      typeLabel: this.typeLabel(typeId),
      start: new Date(event.start.dateTime).toISOString(),
      end: new Date(event.end.dateTime).toISOString(),
      modality,
      ...(event.hangoutLink ? { meetLink: event.hangoutLink } : {}),
    };
  }

  async cancelBooking(cancelToken: string): Promise<void> {
    const event = await this.findEvent(cancelToken);
    if (!event?.id) throw new BookingNotFoundError();
    await this.calendar.events.delete({ calendarId: this.calendarId, eventId: event.id, sendUpdates: "all" });
    this.busyCache.clear();
  }
}

function buildDescription(d: {
  typeLabel: string;
  modality: Modality;
  name: string;
  email: string;
  phone: string;
  reason: string;
  address: string;
  cancelUrl: string;
  cancellationNoticeHours: number;
}): string {
  return [
    `Tipo de consulta: ${d.typeLabel}`,
    `Modalidad: ${d.modality === "online" ? "Online (Google Meet)" : `Presencial — ${d.address}`}`,
    "",
    `Paciente: ${d.name}`,
    `Teléfono / WhatsApp: ${d.phone}`,
    `Email: ${d.email}`,
    d.reason ? `Motivo: ${d.reason}` : null,
    "",
    `¿No podés asistir? Cancelá tu turno hasta ${d.cancellationNoticeHours} h antes desde este link:`,
    d.cancelUrl,
    "",
    "Turno reservado desde el sitio web.",
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}

/* ---------------- Configuración desde variables de entorno ---------------- */

const envSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1, "falta GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "falta GOOGLE_CLIENT_SECRET"),
  GOOGLE_REFRESH_TOKEN: z.string().min(1, "falta GOOGLE_REFRESH_TOKEN"),
  GOOGLE_CALENDAR_ID: z.string().min(1).default("primary"),
  GOOGLE_BUSY_CALENDAR_IDS: z.string().optional(),
});

export function createGoogleProviderFromEnv(opts: { address: string; siteUrl: string }): GoogleCalendarProvider {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Configuración de Google Calendar incompleta: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
    );
  }
  const env = parsed.data;

  // El link de cancelación va dentro de la invitación de Google. Si en producción
  // NEXT_PUBLIC_SITE_URL no se configuró, siteUrl cae a localhost y el link no sirve.
  if (process.env.NODE_ENV === "production" && /(^https?:\/\/)?(localhost|127\.0\.0\.1)/.test(opts.siteUrl)) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL no está configurada: el link de cancelación de los turnos apuntaría a localhost.",
    );
  }

  const oauth = new googleAuth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
  oauth.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });

  return new GoogleCalendarProvider({
    calendar: googleCalendar({ version: "v3", auth: oauth }),
    calendarId: env.GOOGLE_CALENDAR_ID,
    busyCalendarIds: env.GOOGLE_BUSY_CALENDAR_IDS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    address: opts.address,
    siteUrl: opts.siteUrl,
  });
}
