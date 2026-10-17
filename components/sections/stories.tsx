import { Info, Quote } from "lucide-react";
import { approaches, stories } from "@/lib/content";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";

/**
 * Testimonios anonimizados. Ver README: requiere autorización previa del Consejo Directivo
 * del Colegio de Nutricionistas de la Prov. de Buenos Aires. Se oculta con SHOW_STORIES=false.
 */
export function Stories() {
  return (
    <Section
      id="historias"
      eyebrow="Historias"
      title="Cómo vivieron el acompañamiento"
      intro="Algunas personas que atendí quisieron compartir su experiencia. Los nombres están abreviados para cuidar su privacidad."
      alt
    >
      <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {stories.map((s, i) => {
          const approach = approaches.find((a) => a.id === s.approach);
          return (
            <Reveal
              as="li"
              key={s.id}
              delay={(i % 3) * 60}
              className="flex flex-col rounded-[var(--radius-card)] border border-border bg-surface p-6"
            >
              <figure className="flex h-full flex-col">
                <Quote className="mb-3 size-6 text-accent" strokeWidth={1.4} aria-hidden="true" />
                <blockquote className="flex-1 font-serif text-[1.125rem] leading-relaxed">{s.text}</blockquote>
                <figcaption className="mt-5 border-t border-border pt-4 text-[0.9375rem] text-muted">
                  <span className="font-medium text-text">{s.alias}</span>
                  {s.approxAge && <>, {s.approxAge}</>}
                  {approach && <span className="block text-sm">{approach.title}</span>}
                </figcaption>
              </figure>
            </Reveal>
          );
        })}
      </ul>
      <p className="mt-8 flex items-start gap-2 rounded-[var(--radius-card)] border border-border bg-surface px-5 py-4 text-[0.9375rem] text-muted">
        <Info className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.5} aria-hidden="true" />
        Cada proceso es personal; los resultados varían según cada persona.
      </p>
    </Section>
  );
}
