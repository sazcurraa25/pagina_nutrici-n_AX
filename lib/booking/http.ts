import "server-only";
import { NextResponse } from "next/server";
import type { ApiError, BookingErrorCode } from "./schema";

const statusByCode: Record<BookingErrorCode, number> = {
  VALIDATION: 400,
  CAPTCHA: 400,
  NOT_FOUND: 404,
  SLOT_TAKEN: 409,
  TOO_LATE: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export function apiError(code: BookingErrorCode, message: string, headers?: HeadersInit) {
  return NextResponse.json<ApiError>({ error: { code, message } }, { status: statusByCode[code], headers });
}

export const noStore = { "Cache-Control": "no-store" };

/** Quita emails y números largos (teléfonos) de un texto antes de loguearlo. */
export function redact(text: string): string {
  return text
    .replace(/[^\s@"'<>]+@[^\s@"'<>]+\.[^\s@"'<>]+/g, "[email]")
    .replace(/\+?\d[\d\s()-]{6,}\d/g, "[número]");
}

/** Log sin datos personales: solo el tipo de error, su código y un mensaje técnico depurado. */
export function logServerError(scope: string, err: unknown) {
  const e = err as { name?: string; code?: unknown; status?: unknown; message?: string };
  const code = e?.code ?? e?.status ?? "";
  console.error(`[${scope}]`, e?.name ?? "Error", String(code), redact((e?.message ?? "").slice(0, 200)));
}
