import type { Metadata } from "next";
import Link from "next/link";
import { profile, schedule, whatsappUrl } from "@/lib/content";
import { LegalPage } from "@/components/ui/legal-page";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones de uso del sitio y del sistema de reserva de turnos.",
  alternates: { canonical: "/terminos" },
};

/* PLACEHOLDER — Revisar con la profesional antes de publicar. */
export default function TerminosPage() {
  return (
    <LegalPage title="Términos y condiciones" updated="octubre de 2026">
      <p>
        Al usar este sitio y su sistema de turnos aceptás las siguientes condiciones. El sitio pertenece a{" "}
        {profile.fullName}, {profile.title} ({profile.license}).
      </p>

      <h2>Información del sitio</h2>
      <p>
        El contenido de este sitio es informativo y no reemplaza una consulta profesional. Las recomendaciones
        nutricionales se dan siempre de forma personalizada, después de una evaluación.
      </p>

      <h2>Reserva de turnos</h2>
      <ul>
        <li>El turno queda confirmado cuando ves la pantalla de confirmación y recibís la invitación por mail.</li>
        <li>Los datos que completás tienen que ser reales y de la persona que se va a atender (o de su responsable, si es menor de edad).</li>
        <li>Para consultas online necesitás una conexión a internet estable y un dispositivo con cámara y micrófono.</li>
      </ul>

      <h2>Cancelaciones</h2>
      <p>
        Podés cancelar tu turno desde el link que te llega por mail hasta {schedule.cancellationNoticeHours} horas
        antes del horario reservado. Con menos anticipación, escribime por{" "}
        <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        . Si no podés asistir, avisá lo antes posible: así el horario queda disponible para otra persona.
      </p>

      <h2>Datos personales</h2>
      <p>
        El tratamiento de tus datos se describe en la <Link href="/privacidad">Política de privacidad</Link>.
      </p>

      <h2>Contacto</h2>
      <p>
        Por cualquier consulta sobre estos términos escribí a{" "}
        <a href={`mailto:${profile.contact.email}`}>{profile.contact.email}</a>.
      </p>
    </LegalPage>
  );
}
