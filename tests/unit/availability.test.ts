import { describe, expect, it } from "vitest";
import { addDaysToKey, computeAvailableSlots, findAvailableSlot, isoWeekday } from "@/lib/booking/availability";
import { dateKeyAR, formatTime } from "@/lib/time";
import { testSchedule } from "../fixtures/schedule";

// Lunes 19/10/2026, 09:00 en Argentina (UTC-3).
const NOW = new Date("2026-10-19T12:00:00Z");
const RANGE = { from: NOW, to: new Date(NOW.getTime() + 60 * 86_400_000) };

function slots(typeId: string, over: Partial<Parameters<typeof computeAvailableSlots>[0]> = {}) {
  return computeAvailableSlots({ schedule: testSchedule, typeId, now: NOW, busy: [], ...RANGE, ...over });
}

const timesOn = (list: ReturnType<typeof slots>, key: string) =>
  list.filter((s) => dateKeyAR(s.start) === key).map((s) => formatTime(s.start));

describe("computeAvailableSlots — reglas base", () => {
  it("genera turnos solo en los días con franjas configuradas", () => {
    const list = slots("primera");
    const weekdays = new Set(list.map((s) => isoWeekday(dateKeyAR(s.start))));
    // testSchedule define lunes(1), martes(2) [solo online] y miércoles(3).
    // 'primera' admite presencial y online, así que aparece en los tres.
    expect([...weekdays].sort()).toEqual([1, 2, 3]);
  });

  it("respeta la anticipación mínima (minNoticeHours)", () => {
    // NOW = lunes 09:00. minNotice 12 h → nada antes del lunes 21:00. El lunes cierra 13:00,
    // así que el primer turno del lunes no existe; el martes (online) empieza 14:00.
    const list = slots("primera");
    const firstKey = dateKeyAR(list[0]!.start);
    expect(firstKey).toBe("2026-10-20"); // martes
    // Ningún turno cae antes de NOW + 12 h.
    const earliest = NOW.getTime() + 12 * 3600_000;
    expect(list.every((s) => new Date(s.start).getTime() >= earliest)).toBe(true);
  });

  it("respeta el horizonte máximo (maxDaysAhead)", () => {
    const list = slots("primera");
    const horizon = NOW.getTime() + testSchedule.maxDaysAhead * 86_400_000;
    expect(list.every((s) => new Date(s.start).getTime() <= horizon)).toBe(true);
    // Con 30 días hay varias semanas, pero nunca más allá del horizonte.
    const last = new Date(list.at(-1)!.start).getTime();
    expect(last).toBeLessThanOrEqual(horizon);
  });

  it("omite feriados", () => {
    // 2026-10-27 es martes y feriado de prueba: no debe haber turnos.
    const list = slots("online");
    expect(timesOn(list, "2026-10-27")).toEqual([]);
    // El martes anterior (20/10) sí tiene turnos online.
    expect(timesOn(list, "2026-10-20").length).toBeGreaterThan(0);
  });

  it("omite rangos bloqueados (vacaciones, etc.)", () => {
    // blocked: 2026-11-02 a 2026-11-04. El 02/11 es lunes y el 04/11 miércoles.
    const list = slots("primera");
    expect(timesOn(list, "2026-11-02")).toEqual([]);
    expect(timesOn(list, "2026-11-04")).toEqual([]);
    // El viernes no está, pero el lunes 09/11 sí.
    expect(timesOn(list, "2026-11-09").length).toBeGreaterThan(0);
  });
});

describe("computeAvailableSlots — duración, intervalo y modalidad", () => {
  it("usa el intervalo entre turnos y deja que la consulta entre en la franja", () => {
    // Miércoles 21/10, franja 09:00–12:00, 'primera' dura 60', intervalo 30'.
    // Último inicio posible: 11:00 (termina 12:00). minNotice ya pasó para ese día.
    const list = slots("primera");
    expect(timesOn(list, "2026-10-21")).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
  });

  it("una consulta más corta genera más horarios en la misma franja", () => {
    // 'control' dura 40'. Último inicio dentro de 09:00–12:00 que termina ≤12:00 es 11:20.
    const list = slots("control");
    expect(timesOn(list, "2026-10-21")).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
    // 11:00 + 40' = 11:40 ≤ 12:00; 11:30 + 40' = 12:10 > 12:00 → no.
  });

  it("un tipo solo-online no aparece en franjas presenciales", () => {
    // 'online' solo admite online. Lunes es presencial → sin turnos; martes es online → sí.
    const list = slots("online");
    expect(timesOn(list, "2026-10-19")).toEqual([]); // lunes presencial
    expect(timesOn(list, "2026-10-20").length).toBeGreaterThan(0); // martes online
  });

  it("marca la modalidad de cada turno según la franja y el tipo", () => {
    const primera = slots("primera");
    const lunes = primera.find((s) => dateKeyAR(s.start) === "2026-10-20"); // martes online
    expect(lunes?.modality).toBe("online");
    const miercoles = primera.find((s) => dateKeyAR(s.start) === "2026-10-21"); // franja "ambas"
    expect(miercoles?.modality).toBe("ambas");
  });

  it("en una franja 'ambas', un tipo solo-online queda como online", () => {
    const online = slots("online");
    const miercoles = online.find((s) => dateKeyAR(s.start) === "2026-10-21");
    expect(miercoles?.modality).toBe("online");
  });
});

describe("computeAvailableSlots — períodos ocupados y buffer", () => {
  const busyBlock = (startAr: string, endAr: string) => ({
    start: new Date(startAr),
    end: new Date(endAr),
  });

  it("resta los períodos ocupados con buffer antes y después", () => {
    // Miércoles 21/10 ocupado 10:00–10:30 ART (13:00–13:30 UTC). Buffer 15'.
    // Bloquea desde 09:45 (termina 10:00, dentro del buffer) hasta 10:45.
    const busy = [busyBlock("2026-10-21T13:00:00Z", "2026-10-21T13:30:00Z")];
    const list = slots("primera", { busy });
    const times = timesOn(list, "2026-10-21");
    // 09:00 (termina 10:00, pero 10:00 está dentro del buffer del evento) → bloqueado.
    // 09:30 termina 10:30 → choca. 10:00, 10:30 chocan. 11:00 libre.
    expect(times).not.toContain("09:30");
    expect(times).not.toContain("10:00");
    expect(times).not.toContain("10:30");
    expect(times).toContain("11:00");
  });

  it("un día entero ocupado deja ese día sin turnos", () => {
    const busy = [busyBlock("2026-10-21T11:00:00Z", "2026-10-21T16:00:00Z")]; // 08:00–13:00 ART
    const list = slots("primera", { busy });
    expect(timesOn(list, "2026-10-21")).toEqual([]);
  });
});

describe("findAvailableSlot", () => {
  it("devuelve el slot exacto si está disponible", () => {
    const start = new Date("2026-10-21T12:00:00Z"); // miércoles 09:00 ART
    const slot = findAvailableSlot({ schedule: testSchedule, typeId: "primera", start, now: NOW, busy: [] });
    expect(slot?.start).toBe(start.toISOString());
    expect(slot?.modality).toBe("ambas");
  });

  it("devuelve null si el horario no es parte de una franja", () => {
    const start = new Date("2026-10-21T20:00:00Z"); // 17:00 ART, fuera de la franja 09–12
    const slot = findAvailableSlot({ schedule: testSchedule, typeId: "primera", start, now: NOW, busy: [] });
    expect(slot).toBeNull();
  });

  it("devuelve null si el horario está ocupado", () => {
    const start = new Date("2026-10-21T12:00:00Z");
    const busy = [{ start: new Date("2026-10-21T12:00:00Z"), end: new Date("2026-10-21T13:00:00Z") }];
    const slot = findAvailableSlot({ schedule: testSchedule, typeId: "primera", start, now: NOW, busy });
    expect(slot).toBeNull();
  });

  it("devuelve null si no respeta la anticipación mínima", () => {
    // Lunes 11:00 ART (hoy, en menos de 12 h).
    const start = new Date("2026-10-19T14:00:00Z");
    const slot = findAvailableSlot({ schedule: testSchedule, typeId: "primera", start, now: NOW, busy: [] });
    expect(slot).toBeNull();
  });
});

describe("helpers de calendario", () => {
  it("addDaysToKey suma días cruzando meses y años", () => {
    expect(addDaysToKey("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysToKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToKey("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("isoWeekday devuelve 1 para lunes y 7 para domingo", () => {
    expect(isoWeekday("2026-10-19")).toBe(1); // lunes
    expect(isoWeekday("2026-10-25")).toBe(7); // domingo
  });
});
