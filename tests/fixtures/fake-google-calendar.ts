import type { calendar_v3 } from "googleapis/build/src/apis/calendar";
import { vi } from "vitest";

type Event = calendar_v3.Schema$Event;

/**
 * Doble de prueba de la Google Calendar API v3: guarda eventos en memoria e imita
 * la semántica de freebusy.query, events.insert/list/delete que usa el proveedor.
 */
export function createFakeCalendar(calendarId = "primary") {
  const events = new Map<string, Event>();
  /** Bloques ocupados externos (otros calendarios o eventos que no están en `events`). */
  const externalBusy: { calendarId: string; start: string; end: string }[] = [];
  let seq = 0;
  let freebusyErrors: { reason: string }[] | undefined;
  /** Si > 0, la primera página de events.list viene vacía con nextPageToken (como hace Google). */
  let emptyFirstPages = 0;

  // Google suele truncar `created` a segundos enteros; el fake hace lo mismo.
  const nowSeconds = () => new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();

  /** Una invitación rechazada por la titular no cuenta como ocupada en freebusy (como Google). */
  const declinedBySelf = (e: Event) => e.attendees?.some((a) => a.self && a.responseStatus === "declined");

  const overlaps = (e: Event, min?: string | null, max?: string | null) => {
    const s = Date.parse(e.start?.dateTime ?? e.start?.date ?? "");
    const en = Date.parse(e.end?.dateTime ?? e.end?.date ?? "");
    return (!min || en > Date.parse(min)) && (!max || s < Date.parse(max));
  };

  const api = {
    freebusy: {
      query: vi.fn(async ({ requestBody }: { requestBody: calendar_v3.Schema$FreeBusyRequest }) => {
        const calendars: Record<string, calendar_v3.Schema$FreeBusyCalendar> = {};
        for (const { id } of requestBody.items ?? []) {
          if (!id) continue;
          const busy = [
            ...(id === calendarId
              ? [...events.values()]
                  .filter((e) => e.status !== "cancelled" && e.transparency !== "transparent")
                  .filter((e) => !declinedBySelf(e))
                  .filter((e) => overlaps(e, requestBody.timeMin, requestBody.timeMax))
                  .map((e) => ({ start: e.start?.dateTime, end: e.end?.dateTime }))
              : []),
            ...externalBusy
              .filter((b) => b.calendarId === id)
              .filter((b) => Date.parse(b.end) > Date.parse(requestBody.timeMin!) && Date.parse(b.start) < Date.parse(requestBody.timeMax!))
              .map(({ start, end }) => ({ start, end })),
          ];
          calendars[id] = freebusyErrors ? { errors: freebusyErrors, busy: [] } : { busy };
        }
        return { data: { calendars } };
      }),
    },
    events: {
      insert: vi.fn(async (params: calendar_v3.Params$Resource$Events$Insert) => {
        const id = `evt${String(++seq).padStart(4, "0")}`;
        const body = params.requestBody ?? {};
        const event: Event = {
          ...body,
          id,
          status: "confirmed",
          created: nowSeconds(),
          ...(params.conferenceDataVersion === 1 && body.conferenceData?.createRequest
            ? { hangoutLink: `https://meet.google.com/fake-${id}` }
            : {}),
        };
        events.set(id, event);
        return { data: event };
      }),
      list: vi.fn(async (params: calendar_v3.Params$Resource$Events$List) => {
        // Imita páginas vacías con nextPageToken: Google puede devolverlas aunque haya resultados.
        if (emptyFirstPages > 0 && !params.pageToken) {
          return { data: { items: [], nextPageToken: `p${emptyFirstPages}` } };
        }
        const filters = (params.privateExtendedProperty ?? []).map((f) => f.split("="));
        const items = [...events.values()]
          .filter((e) => params.showDeleted || e.status !== "cancelled")
          .filter((e) => overlaps(e, params.timeMin, params.timeMax))
          .filter((e) => filters.every(([k, v]) => e.extendedProperties?.private?.[k!] === v))
          .slice(0, params.maxResults ?? 250);
        return { data: { items } };
      }),
      delete: vi.fn(async (params: calendar_v3.Params$Resource$Events$Delete) => {
        if (!params.eventId || !events.has(params.eventId)) {
          throw Object.assign(new Error("Not Found"), { code: 404 });
        }
        events.delete(params.eventId);
        return { data: undefined };
      }),
    },
  };

  return {
    calendar: api as unknown as calendar_v3.Calendar,
    api,
    events,
    externalBusy,
    /** Agrega un evento "existente" directamente (como si lo hubiera creado la profesional). */
    seed(event: Event) {
      const id = event.id ?? `seed${String(++seq).padStart(4, "0")}`;
      events.set(id, { status: "confirmed", created: new Date(0).toISOString(), ...event, id });
      return id;
    },
    failFreebusy(reason: string) {
      freebusyErrors = [{ reason }];
    },
    /** Hace que la primera página de events.list venga vacía (con nextPageToken). */
    emptyFirstPage() {
      emptyFirstPages = 1;
    },
  };
}
