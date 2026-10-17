import type { Metadata } from "next";
import { profile } from "@/lib/content";
import { LegalPage } from "@/components/ui/legal-page";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo se tratan los datos personales que dejás al reservar un turno.",
  alternates: { canonical: "/privacidad" },
};

/* PLACEHOLDER — Revisar con un/a profesional del derecho antes de publicar. */
export default function PrivacidadPage() {
  const { contact, address } = profile;
  return (
    <LegalPage title="Política de privacidad" updated="octubre de 2026">
      <p>
        Esta política explica cómo se tratan los datos personales que dejás en este sitio, de acuerdo con la Ley
        25.326 de Protección de Datos Personales y su normativa complementaria.
      </p>

      <h2>Responsable del tratamiento</h2>
      <p>
        {profile.fullName}, {profile.title} ({profile.license}), con domicilio profesional en {address.street},{" "}
        {address.city}, {address.province}. Contacto: <a href={`mailto:${contact.email}`}>{contact.email}</a>.
      </p>

      <h2>Qué datos se recolectan</h2>
      <p>Solo los mínimos indispensables para agendar tu turno:</p>
      <ul>
        <li>Nombre y apellido, email y teléfono.</li>
        <li>Tipo de consulta, modalidad, fecha y horario elegidos.</li>
        <li>
          Un motivo de consulta breve y opcional. Te pedimos que no incluyas información de salud detallada: eso se
          conversa en la consulta.
        </li>
      </ul>
      <p>
        Los datos relacionados con la salud son <strong>datos sensibles</strong>. Por eso no se solicitan en el
        formulario más allá de lo que vos decidas contar en el motivo de consulta.
      </p>

      <h2>Finalidad</h2>
      <p>
        Los datos se usan exclusivamente para la gestión de turnos: agendar la consulta, enviarte la confirmación y
        los recordatorios, y contactarte si hay algún cambio. No se usan con fines publicitarios ni se ceden a
        terceros con otros fines.
      </p>

      <h2>Dónde se guardan y destinatarios</h2>
      <p>
        Este sitio no tiene una base de datos propia. La única copia de tu reserva es el evento que se crea en el
        Google Calendar del consultorio. Por eso, <strong>Google LLC</strong> actúa como proveedor del servicio de
        calendario y correo de invitaciones. Las consultas online se realizan por Google Meet. Podés consultar la
        política de privacidad de Google en{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          policies.google.com/privacy
        </a>
        .
      </p>
      <p>
        Para prevenir el envío automatizado de formularios se utiliza Cloudflare Turnstile. El sitio usa analítica
        sin cookies, que no identifica a las personas que lo visitan.
      </p>

      <h2>Plazo de conservación</h2>
      <p>
        Los eventos del calendario se conservan mientras sean necesarios para la atención y el seguimiento. Si
        cancelás el turno desde el link que te llega por mail, el evento se elimina.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Podés ejercer en forma gratuita los derechos de <strong>acceso, rectificación, actualización y supresión</strong>{" "}
        de tus datos escribiendo a <a href={`mailto:${contact.email}`}>{contact.email}</a>. El pedido se responde
        dentro de los plazos de la Ley 25.326 (10 días corridos para el acceso y 5 días hábiles para rectificación o
        supresión).
      </p>
      <p>
        La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene
        la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos
        por incumplimiento de las normas vigentes en materia de protección de datos personales.
      </p>

      <h2>Seguridad</h2>
      <p>
        El sitio funciona solo por conexión cifrada (HTTPS). Las credenciales de acceso al calendario se guardan del
        lado del servidor y nunca se envían a tu navegador. No se registran tus datos personales en los logs del
        sistema.
      </p>
    </LegalPage>
  );
}
