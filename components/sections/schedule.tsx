import { MapPin, Phone } from "lucide-react";
import { profile, schedule } from "@/lib/content";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";

const dayNames = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const modalityLabel = { presencial: "Presencial", online: "Online", ambas: "Presencial y online" } as const;

export function ScheduleSection() {
  const days = [1, 2, 3, 4, 5, 6, 7]
    .map((d) => ({
      day: d,
      rules: schedule.weekly.filter((r) => r.day === d).sort((a, b) => a.from.localeCompare(b.from)),
    }))
    .filter((d) => d.rules.length > 0);

  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(profile.address.mapQuery)}&z=15&output=embed`;

  return (
    <Section
      id="horarios"
      eyebrow="Horarios y ubicación"
      title="Cuándo y dónde atiendo"
      intro="Los turnos se reservan con anticipación desde esta web. Los horarios pueden variar en feriados."
      alt
    >
      <div className="grid gap-10 md:grid-cols-12">
        <Reveal className="md:col-span-6">
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
            <table className="w-full text-left text-[0.9375rem]">
              <caption className="sr-only">Días y horarios de atención por modalidad</caption>
              <thead className="border-b border-border text-sm text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Día</th>
                  <th scope="col" className="px-5 py-3 font-medium">Horario</th>
                  <th scope="col" className="px-5 py-3 font-medium">Modalidad</th>
                </tr>
              </thead>
              <tbody>
                {days.flatMap(({ day, rules }) =>
                  rules.map((r, i) => (
                    <tr key={`${day}-${r.from}`} className={i === 0 ? "border-t border-border first:border-t-0" : ""}>
                      {i === 0 && (
                        <th scope="row" rowSpan={rules.length} className="px-5 py-3 align-top font-medium">
                          {dayNames[day]}
                        </th>
                      )}
                      <td className="px-5 py-3 tabular-nums">
                        {r.from} a {r.to} h
                      </td>
                      <td className="px-5 py-3 text-muted">{modalityLabel[r.modality]}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal className="space-y-5 md:col-span-6" delay={100}>
          <address className="space-y-3 not-italic">
            <p className="flex items-start gap-3">
              <MapPin className="mt-1 size-5 shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
              <span>
                {profile.address.street}
                <br />
                {profile.address.city}, {profile.address.province}
              </span>
            </p>
            <p className="flex items-center gap-3">
              <Phone className="size-5 shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
              <a href={`tel:${profile.contact.phoneHref}`}>{profile.contact.phone}</a>
            </p>
          </address>
          <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
            <iframe
              src={mapSrc}
              title={`Mapa: ubicación del consultorio en ${profile.address.city}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="size-full border-0"
            />
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
