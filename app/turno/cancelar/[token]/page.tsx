import type { Metadata } from "next";
import Link from "next/link";
import { profile, schedule, whatsappUrl } from "@/lib/content";
import { getProvider } from "@/lib/booking/provider";
import { canCancel } from "@/lib/booking/policy";
import { logServerError } from "@/lib/booking/http";
import type { BookingSummary } from "@/lib/booking/schema";
import { formatLongDate, formatTime } from "@/lib/time";
import { buttonClasses } from "@/components/ui/button";
import { CancelButton } from "./cancel-button";

export const metadata: Metadata = {
  title: "Cancelar turno",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CancelarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let booking: BookingSummary | null = null;
  let failed = false;
  try {
    booking = await (await getProvider()).getBooking(decodeURIComponent(token));
  } catch (err) {
    logServerError("turno/cancelar", err);
    failed = true;
  }

  return (
    <div className="container-site py-16 sm:py-24">
      <div className="mx-auto max-w-xl">
        <h1 className="text-[length:var(--text-h2)]">Cancelar turno</h1>

        {failed && (
          <Message>
            No pudimos consultar el turno en este momento. Probá de nuevo en unos minutos o{" "}
            <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
              escribime por WhatsApp
            </a>
            .
          </Message>
        )}

        {!failed && !booking && (
          <Message>
            No encontramos un turno con este link. Puede que ya esté cancelado o que el link esté incompleto.
            <Link href="/#turnos" className={buttonClasses("primary", "md", "mt-6 flex w-fit")}>
              Reservar un turno
            </Link>
          </Message>
        )}

        {booking && (
          <>
            <div className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface p-6">
              <p className="text-sm text-muted">{booking.typeLabel}</p>
              <p className="mt-1 text-lg font-medium first-letter:uppercase">
                {formatLongDate(booking.start)}, {formatTime(booking.start)} h
              </p>
              <p className="mt-1 text-muted">
                {booking.modality === "online" ? "Online (Google Meet)" : `Presencial · ${profile.address.street}`}
              </p>
            </div>

            {canCancel(booking.start) ? (
              <CancelButton token={decodeURIComponent(token)} />
            ) : (
              <Message>
                Faltan menos de {schedule.cancellationNoticeHours} horas para el turno, así que ya no se puede cancelar
                desde la web. Por favor,{" "}
                <a href={whatsappUrl("Hola, necesito cancelar mi turno de nutrición.")} target="_blank" rel="noopener noreferrer">
                  avisame por WhatsApp
                </a>
                .
              </Message>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 text-muted">{children}</div>;
}
