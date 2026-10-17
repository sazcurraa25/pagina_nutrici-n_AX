/**
 * La confirmación se pasa a /turno/confirmado por sessionStorage (no por la URL),
 * así ningún dato del turno queda en el historial ni en logs de servidor.
 * Solo se guardan datos no personales (sin nombre, email ni teléfono).
 */
import type { BookingSummary } from "./schema";

export const CONFIRMATION_KEY = "turno:confirmado";

export type StoredConfirmation = {
  summary: BookingSummary;
  cancelToken: string;
};

export function saveConfirmation(data: StoredConfirmation) {
  try {
    sessionStorage.setItem(CONFIRMATION_KEY, JSON.stringify(data));
  } catch {
    /* sessionStorage no disponible: la página de confirmación muestra un mensaje genérico */
  }
}

export function readConfirmation(): StoredConfirmation | null {
  try {
    const raw = sessionStorage.getItem(CONFIRMATION_KEY);
    return raw ? (JSON.parse(raw) as StoredConfirmation) : null;
  } catch {
    return null;
  }
}
