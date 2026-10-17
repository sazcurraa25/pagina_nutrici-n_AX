import { schedule } from "@/lib/content";

/** Política de cancelación: solo hasta `cancellationNoticeHours` antes del turno. */
export function canCancel(start: string | Date, now: Date = new Date()): boolean {
  const startMs = new Date(start).getTime();
  return startMs - now.getTime() >= schedule.cancellationNoticeHours * 60 * 60_000;
}
