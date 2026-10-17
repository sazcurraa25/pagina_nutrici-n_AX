import { NextResponse, type NextRequest } from "next/server";
import { getAppointmentType, schedule } from "@/lib/content";
import { getProvider } from "@/lib/booking/provider";
import { clientIp, rateLimit } from "@/lib/booking/rate-limit";
import { apiError, logServerError, noStore } from "@/lib/booking/http";
import type { Slot } from "@/lib/booking/schema";

export async function GET(request: NextRequest) {
  const limit = rateLimit(`slots:${clientIp(request.headers)}`, 60, 60_000);
  if (!limit.ok) {
    return apiError("RATE_LIMITED", "Demasiadas consultas seguidas. Esperá un momento.", {
      "Retry-After": String(limit.retryAfterSec),
    });
  }

  const typeId = request.nextUrl.searchParams.get("type") ?? "";
  if (!getAppointmentType(typeId)) return apiError("VALIDATION", "Tipo de consulta inválido.");

  const now = new Date();
  const to = new Date(now.getTime() + schedule.maxDaysAhead * 24 * 60 * 60_000);

  try {
    const provider = await getProvider();
    const slots = await provider.getAvailableSlots({ from: now, to, appointmentType: typeId });
    return NextResponse.json<{ slots: Slot[] }>({ slots }, { headers: noStore });
  } catch (err) {
    logServerError("api/slots", err);
    return apiError("INTERNAL", "No pudimos cargar los horarios. Probá de nuevo en unos minutos.");
  }
}
