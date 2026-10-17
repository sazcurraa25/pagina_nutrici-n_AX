import type { Schedule } from "@/lib/content/schemas";

/** Reglas fijas para los tests (independientes de content/schedule.json). */
export const testSchedule: Schedule = {
  timezone: "America/Argentina/Buenos_Aires",
  slotIntervalMinutes: 30,
  bufferMinutes: 15,
  minNoticeHours: 12,
  maxDaysAhead: 30,
  cancellationNoticeHours: 24,
  appointmentTypes: [
    {
      id: "primera",
      label: "Primera consulta",
      shortLabel: "primera vez",
      durationMinutes: 60,
      description: "",
      modalities: ["presencial", "online"],
    },
    { id: "control", label: "Control", durationMinutes: 40, description: "", modalities: ["presencial", "online"] },
    { id: "online", label: "Consulta online", durationMinutes: 45, description: "", modalities: ["online"] },
  ],
  weekly: [
    { day: 1, from: "09:00", to: "13:00", modality: "presencial" }, // lunes
    { day: 2, from: "14:00", to: "18:00", modality: "online" }, // martes
    { day: 3, from: "09:00", to: "12:00", modality: "ambas" }, // miércoles
  ],
  blocked: [{ from: "2026-11-02", to: "2026-11-04", reason: "Congreso" }],
  holidays: [{ date: "2026-10-27", name: "Feriado de prueba" }],
};
