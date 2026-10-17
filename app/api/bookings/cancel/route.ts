import { NextResponse, type NextRequest } from "next/server";
import { BookingNotFoundError, getProvider } from "@/lib/booking/provider";
import { cancelRequestSchema } from "@/lib/booking/schema";
import { canCancel } from "@/lib/booking/policy";
import { clientIp, rateLimit } from "@/lib/booking/rate-limit";
import { apiError, logServerError, noStore } from "@/lib/booking/http";

export async function POST(request: NextRequest) {
  const limit = rateLimit(`cancel:${clientIp(request.headers)}`, 10, 10 * 60_000);
  if (!limit.ok) {
    return apiError("RATE_LIMITED", "Hiciste varios intentos seguidos. Probá de nuevo en unos minutos.", {
      "Retry-After": String(limit.retryAfterSec),
    });
  }

  const parsed = cancelRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION", "El link de cancelación no es válido.");

  try {
    const provider = await getProvider();
    const booking = await provider.getBooking(parsed.data.token);
    if (!booking) return apiError("NOT_FOUND", "No encontramos ese turno. Puede que ya esté cancelado.");
    if (!canCancel(booking.start)) {
      return apiError("TOO_LATE", "Falta poco para el turno y ya no se puede cancelar desde la web. Escribime por WhatsApp.");
    }
    await provider.cancelBooking(parsed.data.token);
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (err) {
    if (err instanceof BookingNotFoundError) {
      return apiError("NOT_FOUND", "No encontramos ese turno. Puede que ya esté cancelado.");
    }
    logServerError("api/bookings/cancel", err);
    return apiError("INTERNAL", "No pudimos cancelar el turno. Probá de nuevo o escribime por WhatsApp.");
  }
}
