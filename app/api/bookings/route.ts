import { NextResponse, type NextRequest } from "next/server";
import { getAppointmentType } from "@/lib/content";
import {
  getProvider,
  InvalidModalityError,
  SlotUnavailableError,
} from "@/lib/booking/provider";
import { bookingRequestSchema, type CreateBookingResponse } from "@/lib/booking/schema";
import { clientIp, rateLimit } from "@/lib/booking/rate-limit";
import { TurnstileConfigError, verifyTurnstile } from "@/lib/booking/turnstile";
import { apiError, logServerError, noStore } from "@/lib/booking/http";

export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);
  const limit = rateLimit(`bookings:${ip}`, 5, 10 * 60_000);
  if (!limit.ok) {
    return apiError("RATE_LIMITED", "Hiciste varios intentos seguidos. Probá de nuevo en unos minutos.", {
      "Retry-After": String(limit.retryAfterSec),
    });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION", "Revisá los datos del formulario.");
  }
  const data = parsed.data;

  // Honeypot: si un bot completó el campo oculto, cortamos acá.
  if (data.website) return apiError("VALIDATION", "Revisá los datos del formulario.");

  const type = getAppointmentType(data.typeId);
  if (!type || !type.modalities.includes(data.modality)) {
    return apiError("VALIDATION", "La modalidad elegida no está disponible para este tipo de consulta.");
  }

  try {
    if (!(await verifyTurnstile(data.turnstileToken, ip))) {
      return apiError("CAPTCHA", "No pudimos verificar que no seas un robot. Probá de nuevo.");
    }
  } catch (err) {
    if (err instanceof TurnstileConfigError) {
      logServerError("api/bookings:turnstile-config", err);
      return apiError("INTERNAL", "El sistema de turnos no está disponible en este momento. Escribime por WhatsApp.");
    }
    throw err;
  }

  try {
    const provider = await getProvider();
    const result = await provider.createBooking({
      typeId: data.typeId,
      start: new Date(data.start),
      name: data.name,
      email: data.email,
      phone: data.phone,
      modality: data.modality,
      reason: data.reason,
    });
    return NextResponse.json<CreateBookingResponse>(result, { status: 201, headers: noStore });
  } catch (err) {
    if (err instanceof SlotUnavailableError) {
      return apiError("SLOT_TAKEN", "Ese horario se acaba de ocupar, elegí otro.");
    }
    if (err instanceof InvalidModalityError) {
      return apiError("VALIDATION", "Ese horario no está disponible en la modalidad elegida.");
    }
    logServerError("api/bookings", err);
    return apiError("INTERNAL", "No pudimos agendar el turno. Probá de nuevo o escribime por WhatsApp.");
  }
}
