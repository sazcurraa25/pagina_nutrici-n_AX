import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleCalendarProvider } from "@/lib/booking/providers/google";
import { BookingNotFoundError, InvalidModalityError, SlotUnavailableError, type BookingInput } from "@/lib/booking/provider";
import { createFakeCalendar } from "../fixtures/fake-google-calendar";
import { testSchedule } from "../fixtures/schedule";

// Lunes 19/10/2026, 09:00 en Argentina (UTC-3).
const NOW = new Date("2026-10-19T12:00:00Z");
// Miércoles 21/10, 09:00 ART — franja "ambas".
const WED_9 = "2026-10-21T12:00:00.000Z";
// Martes 20/10, 14:00 ART — franja solo online.
const TUE_14 = "2026-10-20T17:00:00.000Z";

function setup() {
  const fake = createFakeCalendar("primary");
  const provider = new GoogleCalendarProvider({
    calendar: fake.calendar,
    calendarId: "primary",
    busyCalendarIds: ["personal@group.calendar.google.com"],
    schedule: testSchedule,
    address: "Calle 1 N° 100, La Plata",
    siteUrl: "https://nutri.example.com/",
  });
  return { fake, provider };
}

const input = (over: Partial<BookingInput> = {}): BookingInput => ({
  typeId: "primera",
  start: new Date(WED_9),
  name: "Ana Pérez",
  email: "ana@example.com",
  phone: "221 555 1234",
  modality: "presencial",
  reason: "Ordenar comidas",
  ...over,
});

const range = { from: NOW, to: new Date(NOW.getTime() + 30 * 86_400_000), appointmentType: "primera" };

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("GoogleCalendarProvider — disponibilidad", () => {
  it("resta los períodos ocupados de todos los calendarios configurados, con buffer", async () => {
    const { fake, provider } = setup();
    // Evento de 10:00 a 10:30 ART el miércoles en el calendario principal.
    fake.seed({ start: { dateTime: "2026-10-21T13:00:00Z" }, end: { dateTime: "2026-10-21T13:30:00Z" } });
    // Bloque ocupado en el calendario personal: miércoles 11:00–11:30 ART.
    fake.externalBusy.push({
      calendarId: "personal@group.calendar.google.com",
      start: "2026-10-21T14:00:00Z",
      end: "2026-10-21T14:30:00Z",
    });

    const slots = await provider.getAvailableSlots(range);
    const wed = slots.filter((s) => s.start.startsWith("2026-10-21")).map((s) => s.start);

    // 9:00–10:00 choca con el buffer (termina 10:00 y el evento empieza 10:00 → 10:00+15'),
    // todo hasta 11:45 queda bloqueado; la franja termina 12:00 y la consulta dura 60'.
    expect(wed).toEqual([]);
    const query = fake.api.freebusy.query.mock.calls[0]![0].requestBody;
    expect(query.items).toEqual([{ id: "primary" }, { id: "personal@group.calendar.google.com" }]);
    expect(query.timeZone).toBe("America/Argentina/Buenos_Aires");
  });

  it("cachea freebusy durante 60 s", async () => {
    const { fake, provider } = setup();
    await provider.getAvailableSlots(range);
    await provider.getAvailableSlots(range);
    expect(fake.api.freebusy.query).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date(NOW.getTime() + 61_000));
    await provider.getAvailableSlots({ ...range, from: new Date() });
    expect(fake.api.freebusy.query).toHaveBeenCalledTimes(2);
  });

  it("propaga errores de freebusy (no muestra horarios falsos)", async () => {
    const { fake, provider } = setup();
    fake.failFreebusy("notFound");
    await expect(provider.getAvailableSlots(range)).rejects.toThrow(/notFound/);
  });
});

describe("GoogleCalendarProvider — crear turno", () => {
  it("crea el evento con invitación, recordatorios, propiedades privadas y link de cancelación", async () => {
    const { fake, provider } = setup();
    const result = await provider.createBooking(input());

    expect(fake.api.events.insert).toHaveBeenCalledTimes(1);
    const params = fake.api.events.insert.mock.calls[0]![0];
    const body = params.requestBody!;
    expect(params.calendarId).toBe("primary");
    expect(params.sendUpdates).toBe("all");
    expect(params.conferenceDataVersion).toBe(0);
    expect(body.summary).toBe("Consulta primera vez — Ana Pérez");
    expect(body.attendees).toEqual([{ email: "ana@example.com", displayName: "Ana Pérez" }]);
    expect(body.start).toEqual({ dateTime: WED_9, timeZone: "America/Argentina/Buenos_Aires" });
    expect(body.end?.dateTime).toBe("2026-10-21T13:00:00.000Z");
    expect(body.location).toBe("Calle 1 N° 100, La Plata");
    expect(body.conferenceData).toBeUndefined();
    expect(body.reminders).toEqual({
      useDefault: false,
      overrides: [
        { method: "email", minutes: 1440 },
        { method: "popup", minutes: 60 },
      ],
    });
    const ref = result.cancelToken.split(".")[0];
    expect(body.extendedProperties?.private).toMatchObject({ cancelRef: ref, typeId: "primera", modality: "presencial" });
    expect(body.description).toContain(`https://nutri.example.com/turno/cancelar/${result.cancelToken}`);
    expect(body.description).toContain("221 555 1234");

    expect(result.summary).toMatchObject({ typeId: "primera", start: WED_9, modality: "presencial" });
    expect(result.summary.meetLink).toBeUndefined();
  });

  it("en turnos online pide un link de Google Meet (conferenceDataVersion=1)", async () => {
    const { fake, provider } = setup();
    const result = await provider.createBooking(input({ typeId: "online", start: new Date(TUE_14), modality: "online" }));
    const params = fake.api.events.insert.mock.calls[0]![0];
    expect(params.conferenceDataVersion).toBe(1);
    expect(params.requestBody?.conferenceData?.createRequest?.conferenceSolutionKey).toEqual({ type: "hangoutsMeet" });
    expect(params.requestBody?.location).toBeUndefined();
    expect(result.summary.meetLink).toMatch(/^https:\/\/meet\.google\.com\//);
  });

  it("vuelve a consultar freebusy sin caché antes de insertar (evita doble reserva)", async () => {
    const { fake, provider } = setup();
    await provider.getAvailableSlots(range); // llena la caché
    // Alguien ocupa el horario después de que se cargaron los turnos.
    fake.seed({ start: { dateTime: WED_9 }, end: { dateTime: "2026-10-21T13:00:00Z" } });

    await expect(provider.createBooking(input())).rejects.toBeInstanceOf(SlotUnavailableError);
    expect(fake.api.freebusy.query).toHaveBeenCalledTimes(2);
    expect(fake.api.events.insert).not.toHaveBeenCalled();
  });

  it("rechaza horarios fuera de las reglas (ej. con menos de 12 h de anticipación)", async () => {
    const { fake, provider } = setup();
    // Lunes 19/10 11:00 ART: hoy, en menos de 12 h.
    await expect(provider.createBooking(input({ start: new Date("2026-10-19T14:00:00Z") }))).rejects.toBeInstanceOf(
      SlotUnavailableError,
    );
    expect(fake.api.events.insert).not.toHaveBeenCalled();
  });

  it("rechaza una modalidad que la franja no permite", async () => {
    const { provider } = setup();
    // Martes es solo online.
    await expect(
      provider.createBooking(input({ start: new Date(TUE_14), modality: "presencial" })),
    ).rejects.toBeInstanceOf(InvalidModalityError);
  });

  it("si otra reserva se insertó antes en paralelo, descarta la propia y avisa", async () => {
    const { fake, provider } = setup();
    const original = fake.api.events.insert.getMockImplementation()!;
    fake.api.events.insert.mockImplementationOnce(async (p) => {
      // Otra instancia insertó el mismo horario un instante antes (freebusy ya había respondido).
      fake.seed({
        start: { dateTime: WED_9 },
        end: { dateTime: "2026-10-21T13:00:00Z" },
        created: new Date(Date.now() - 1).toISOString(),
      });
      return original(p);
    });

    await expect(provider.createBooking(input())).rejects.toBeInstanceOf(SlotUnavailableError);
    expect(fake.api.events.delete).toHaveBeenCalledWith(expect.objectContaining({ sendUpdates: "all" }));
    expect(fake.events.size).toBe(1); // solo queda la reserva ganadora
  });

  it("con `created` igual (segundo entero), la segunda reserva pierde aunque su id ordene después", async () => {
    // Regresión: el desempate por id dejaba sobrevivir ambas. Ahora un empate es pérdida.
    const { fake, provider } = setup();
    const wholeSecond = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();
    const original = fake.api.events.insert.getMockImplementation()!;
    fake.api.events.insert.mockImplementationOnce(async (p) => {
      // Evento rival con el MISMO created y un id que ordena DESPUÉS del nuestro (evt...).
      fake.seed({
        id: "zzzz9999",
        start: { dateTime: WED_9 },
        end: { dateTime: "2026-10-21T13:00:00Z" },
        created: wholeSecond,
      });
      return original(p);
    });

    await expect(provider.createBooking(input())).rejects.toBeInstanceOf(SlotUnavailableError);
    expect(fake.api.events.delete).toHaveBeenCalled();
    expect(fake.events.size).toBe(1); // solo queda el rival
  });

  it("no descarta el turno por una invitación que la titular rechazó (freebusy la ignora)", async () => {
    const { fake, provider } = setup();
    // Invitación vieja rechazada que se superpone con WED_9.
    fake.seed({
      start: { dateTime: WED_9 },
      end: { dateTime: "2026-10-21T13:00:00Z" },
      created: "2026-10-01T00:00:00.000Z",
      attendees: [{ self: true, responseStatus: "declined" }],
    });

    const slots = await provider.getAvailableSlots(range);
    expect(slots.map((s) => s.start)).toContain(WED_9);

    await expect(provider.createBooking(input())).resolves.toMatchObject({ summary: { start: WED_9 } });
    expect(fake.api.events.delete).not.toHaveBeenCalled();
  });

  it("si events.list falla después de insertar, conserva la reserva (no deja un evento huérfano)", async () => {
    const { fake, provider } = setup();
    fake.api.events.list.mockRejectedValueOnce(Object.assign(new Error("Rate Limit Exceeded"), { code: 403 }));

    const result = await provider.createBooking(input());
    expect(result.cancelToken).toBeTruthy();
    expect(fake.api.events.delete).not.toHaveBeenCalled();
    expect(fake.events.size).toBe(1);
  });

  it("encuentra el evento aunque la primera página de events.list venga vacía", async () => {
    const { fake, provider } = setup();
    const { cancelToken, bookingId } = await provider.createBooking(input());
    fake.emptyFirstPage();
    await expect(provider.getBooking(cancelToken)).resolves.toMatchObject({ bookingId });
  });

  it("si la otra reserva llegó después, conserva la propia", async () => {
    const { fake, provider } = setup();
    const original = fake.api.events.insert.getMockImplementation()!;
    fake.api.events.insert.mockImplementationOnce(async (p) => {
      const res = await original(p);
      fake.seed({
        start: { dateTime: WED_9 },
        end: { dateTime: "2026-10-21T13:00:00Z" },
        created: new Date(Date.now() + 1).toISOString(),
      });
      return res;
    });

    await expect(provider.createBooking(input())).resolves.toMatchObject({ summary: { start: WED_9 } });
    expect(fake.api.events.delete).not.toHaveBeenCalled();
  });

  it("después de reservar, ese horario deja de aparecer como disponible", async () => {
    const { provider } = setup();
    await provider.getAvailableSlots(range);
    await provider.createBooking(input());
    const slots = await provider.getAvailableSlots(range);
    expect(slots.map((s) => s.start)).not.toContain(WED_9);
  });
});

describe("GoogleCalendarProvider — consultar y cancelar", () => {
  it("encuentra el turno por token y lo cancela notificando a la persona", async () => {
    const { fake, provider } = setup();
    const { cancelToken, bookingId } = await provider.createBooking(input());

    await expect(provider.getBooking(cancelToken)).resolves.toMatchObject({
      bookingId,
      typeId: "primera",
      typeLabel: "Primera consulta",
      start: WED_9,
      modality: "presencial",
    });
    const listCall = fake.api.events.list.mock.calls.at(-1)![0];
    expect(listCall.privateExtendedProperty).toContain(`cancelRef=${cancelToken.split(".")[0]}`);

    await provider.cancelBooking(cancelToken);
    expect(fake.api.events.delete).toHaveBeenCalledWith({ calendarId: "primary", eventId: bookingId, sendUpdates: "all" });
    await expect(provider.getBooking(cancelToken)).resolves.toBeNull();
    await expect(provider.cancelBooking(cancelToken)).rejects.toBeInstanceOf(BookingNotFoundError);
  });

  it("ignora tokens adulterados sin consultar a Google", async () => {
    const { fake, provider } = setup();
    const { cancelToken } = await provider.createBooking(input());
    const [ref] = cancelToken.split(".");
    fake.api.events.list.mockClear();

    await expect(provider.getBooking(`${ref}.firmaFalsaFirmaFalsaFirmaFalsa12`)).resolves.toBeNull();
    await expect(provider.getBooking("cualquier-cosa")).resolves.toBeNull();
    await expect(provider.cancelBooking(`${ref}.x`)).rejects.toBeInstanceOf(BookingNotFoundError);
    expect(fake.api.events.list).not.toHaveBeenCalled();
  });

  it("no encuentra eventos que no fueron creados por el sitio", async () => {
    const { fake, provider } = setup();
    const { cancelToken } = await provider.createBooking(input());
    const ev = [...fake.events.values()][0]!;
    ev.extendedProperties!.private!.source = "otro";
    await expect(provider.getBooking(cancelToken)).resolves.toBeNull();
  });
});
