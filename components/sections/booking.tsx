import { Info } from "lucide-react";
import { profile, schedule, whatsappUrl } from "@/lib/content";
import { providerName } from "@/lib/booking/provider";
import { Section } from "@/components/ui/section";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { CalcomEmbed } from "@/components/booking/calcom-embed";

export function Booking() {
  const provider = providerName();
  const calLink = process.env.NEXT_PUBLIC_CALCOM_LINK;

  return (
    <Section
      id="turnos"
      eyebrow="Turnos"
      title="Reservá tu turno"
      intro={
        <>
          Elegí el tipo de consulta, el día y el horario. Te llega la confirmación por mail. Si preferís coordinarlo por
          mensaje,{" "}
          <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
            escribime por WhatsApp
          </a>
          .
        </>
      }
    >
      {provider === "mock" && (
        <p className="mb-5 flex items-start gap-2 rounded-xl border border-accent/40 bg-surface px-4 py-3 text-sm text-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden="true" />
          Modo demostración: la disponibilidad es simulada y las reservas no se guardan en ningún calendario.
        </p>
      )}

      {provider === "calcom" && calLink ? (
        <CalcomEmbed calLink={calLink} />
      ) : (
        <BookingWizard
          types={schedule.appointmentTypes}
          address={`${profile.address.street}, ${profile.address.city}`}
          maxDaysAhead={schedule.maxDaysAhead}
          turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined}
        />
      )}

      <p className="mt-5 text-sm text-muted">
        Podés cancelar sin costo hasta {schedule.cancellationNoticeHours} h antes desde el link que te llega por mail.
      </p>
    </Section>
  );
}
