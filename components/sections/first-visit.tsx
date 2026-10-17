import { CalendarCheck, ClipboardList, MessagesSquare, RefreshCw } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";

const steps = [
  {
    icon: CalendarCheck,
    title: "Reservás",
    text: "Elegís día y horario acá en la web. Te llega la confirmación por mail.",
  },
  {
    icon: ClipboardList,
    title: "Completás un breve formulario",
    text: "Antes de la consulta te pido algunos datos sobre tus hábitos, para aprovechar mejor el tiempo.",
  },
  {
    icon: MessagesSquare,
    title: "Consulta",
    text: "Charlamos sobre tu historia, tus objetivos y tu rutina, y definimos juntos el plan.",
  },
  {
    icon: RefreshCw,
    title: "Seguimiento",
    text: "Nos volvemos a ver para revisar cómo te sentís y ajustar lo que haga falta.",
  },
];

export function FirstVisit() {
  return (
    <Section id="primera-consulta" eyebrow="Primera consulta" title="Cómo es empezar">
      <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {steps.map((s, i) => (
          <Reveal as="li" key={s.title} delay={i * 80} className="relative">
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex size-12 items-center justify-center rounded-full border border-border bg-surface">
                <s.icon className="size-6 text-primary" strokeWidth={1.4} aria-hidden="true" />
              </span>
              <span className="font-serif text-3xl text-accent-text" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <h3 className="text-[length:var(--text-h3)]">
              <span className="sr-only">Paso {i + 1}: </span>
              {s.title}
            </h3>
            <p className="mt-2 text-muted">{s.text}</p>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
