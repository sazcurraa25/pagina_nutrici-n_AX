import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale/es";

export const TIMEZONE = "America/Argentina/Buenos_Aires";

/** Formatea una fecha en hora de Argentina, en español. */
export function formatAR(date: Date | string, pattern: string): string {
  return formatInTimeZone(typeof date === "string" ? new Date(date) : date, TIMEZONE, pattern, { locale: es });
}

/** "AAAA-MM-DD" del día en Argentina para un instante dado. */
export function dateKeyAR(date: Date | string): string {
  return formatInTimeZone(typeof date === "string" ? new Date(date) : date, TIMEZONE, "yyyy-MM-dd");
}

/** "lunes 20 de octubre" */
export function formatLongDate(date: Date | string): string {
  return formatAR(date, "EEEE d 'de' MMMM");
}

/** "09:30" */
export function formatTime(date: Date | string): string {
  return formatAR(date, "HH:mm");
}
