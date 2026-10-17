import Image from "next/image";
import { GraduationCap, Laptop, MapPin, ShieldCheck } from "lucide-react";
import { profile } from "@/lib/content";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";

const modalityIcon = { presencial: MapPin, online: Laptop } as const;

export function About() {
  return (
    <Section id="sobre-mi" eyebrow="Sobre mí" title="Una consulta para entender cómo comés, no para juzgarlo" alt>
      <div className="grid gap-12 md:grid-cols-12">
        <Reveal className="space-y-5 md:col-span-7">
          {profile.bio.map((p) => (
            <p key={p.slice(0, 32)}>{p}</p>
          ))}
          <p className="border-l-2 border-accent pl-5 text-muted">{profile.approach}</p>

          <div className="pt-4">
            <h3 className="mb-4 flex items-center gap-2 text-[length:var(--text-h3)]">
              <GraduationCap className="size-6 text-primary" strokeWidth={1.4} aria-hidden="true" />
              Formación
            </h3>
            <ul className="space-y-2">
              <li>
                <strong className="font-medium">{profile.title}</strong> — {profile.university}
              </li>
              {profile.postgrads.map((p) => (
                <li key={p}>{p}</li>
              ))}
              <li className="text-muted">Matrícula provincial: {profile.license}</li>
            </ul>
          </div>
        </Reveal>

        <Reveal className="space-y-6 md:col-span-5" delay={100}>
          <div className="relative aspect-[3/2] overflow-hidden rounded-[var(--radius-card)] border border-border">
            <Image
              src={profile.officePhoto.src}
              alt={profile.officePhoto.alt}
              fill
              sizes="(min-width: 768px) 40vw, 92vw"
              className="object-cover"
              unoptimized={profile.officePhoto.src.endsWith(".svg")}
            />
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
            <h3 className="mb-4 text-[length:var(--text-h3)]">Modalidad</h3>
            <ul className="space-y-4">
              {profile.modalities.map((m) => {
                const Icon = modalityIcon[m.type];
                return (
                  <li key={m.type} className="flex gap-3">
                    <Icon className="mt-1 size-5 shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
                    <span>
                      <strong className="font-medium">{m.title}.</strong> <span className="text-muted">{m.description}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {profile.insurances.length > 0 && (
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
              <h3 className="mb-3 flex items-center gap-2 text-[length:var(--text-h3)]">
                <ShieldCheck className="size-5 text-primary" strokeWidth={1.5} aria-hidden="true" />
                Obras sociales
              </h3>
              <ul className="flex flex-wrap gap-2">
                {profile.insurances.map((i) => (
                  <li key={i} className="rounded-full border border-border px-3 py-1 text-[0.9375rem]">
                    {i}
                  </li>
                ))}
              </ul>
              {profile.insurancesNote && <p className="mt-3 text-[0.9375rem] text-muted">{profile.insurancesNote}</p>}
            </div>
          )}
        </Reveal>
      </div>
    </Section>
  );
}
