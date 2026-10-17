/**
 * Cálculo de turnos disponibles. Función pura (sin I/O): recibe las reglas de
 * content/schedule.json, los períodos ocupados del calendario y "ahora".
 */
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import type { Modality, Schedule } from "@/lib/content/schemas";
import type { Slot, SlotModality } from "./schema";

export type Interval = { start: Date; end: Date };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type ComputeSlotsParams = {
  schedule: Schedule;
  typeId: string;
  /** Rango pedido (se recorta por anticipación mínima y horizonte máximo). */
  from: Date;
  to: Date;
  now: Date;
  busy: Interval[];
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Suma días a una fecha "AAAA-MM-DD" (aritmética de calendario, sin zona horaria). */
export function addDaysToKey(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 1 = lunes … 7 = domingo */
export function isoWeekday(key: string): number {
  const day = new Date(`${key}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function slotModality(rule: SlotModality, allowed: Modality[]): SlotModality | null {
  const candidates = rule === "ambas" ? allowed : allowed.filter((m) => m === rule);
  if (candidates.length === 0) return null;
  if (candidates.length > 1) return "ambas";
  return candidates[0] ?? null;
}

export function isDayClosed(schedule: Schedule, key: string): boolean {
  if (schedule.holidays.some((h) => h.date === key)) return true;
  return schedule.blocked.some((b) => key >= b.from && key <= b.to);
}

export function computeAvailableSlots({ schedule, typeId, from, to, now, busy }: ComputeSlotsParams): Slot[] {
  const type = schedule.appointmentTypes.find((t) => t.id === typeId);
  if (!type) return [];

  const tz = schedule.timezone;
  const duration = type.durationMinutes * MINUTE;
  const buffer = schedule.bufferMinutes * MINUTE;
  const step = schedule.slotIntervalMinutes * MINUTE;

  const earliest = Math.max(from.getTime(), now.getTime() + schedule.minNoticeHours * HOUR);
  const latest = Math.min(to.getTime(), now.getTime() + schedule.maxDaysAhead * DAY);
  if (earliest >= latest) return [];

  const busyMs = busy.map((b) => ({ start: b.start.getTime(), end: b.end.getTime() }));
  const overlapsBusy = (s: number, e: number) =>
    busyMs.some((b) => s < b.end + buffer && e + buffer > b.start);

  const slots: Slot[] = [];
  const lastKey = formatInTimeZone(new Date(latest), tz, "yyyy-MM-dd");

  for (let key = formatInTimeZone(new Date(earliest), tz, "yyyy-MM-dd"); key <= lastKey; key = addDaysToKey(key, 1)) {
    if (isDayClosed(schedule, key)) continue;
    const weekday = isoWeekday(key);

    for (const rule of schedule.weekly) {
      if (rule.day !== weekday) continue;
      const modality = slotModality(rule.modality, type.modalities);
      if (!modality) continue;

      const ruleEnd = toMinutes(rule.to);
      for (let m = toMinutes(rule.from); m + type.durationMinutes <= ruleEnd; m += step / MINUTE) {
        const start = fromZonedTime(`${key}T${pad(Math.floor(m / 60))}:${pad(m % 60)}:00`, tz).getTime();
        const end = start + duration;
        if (start < earliest || start >= latest) continue;
        if (overlapsBusy(start, end)) continue;
        slots.push({ start: new Date(start).toISOString(), end: new Date(end).toISOString(), modality });
      }
    }
  }

  // Sin duplicados (franjas superpuestas) y en orden.
  const unique = new Map<string, Slot>();
  for (const s of slots) {
    const prev = unique.get(s.start);
    if (!prev) unique.set(s.start, s);
    else if (prev.modality !== s.modality) unique.set(s.start, { ...s, modality: "ambas" });
  }
  return [...unique.values()].sort((a, b) => a.start.localeCompare(b.start));
}

/** Devuelve el slot exacto si sigue disponible, o null. */
export function findAvailableSlot(params: Omit<ComputeSlotsParams, "from" | "to"> & { start: Date }): Slot | null {
  const { start, ...rest } = params;
  const slots = computeAvailableSlots({ ...rest, from: start, to: new Date(start.getTime() + MINUTE) });
  return slots.find((s) => s.start === start.toISOString()) ?? null;
}
