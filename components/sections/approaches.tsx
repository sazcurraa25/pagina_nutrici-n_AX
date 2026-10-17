import { Check } from "lucide-react";
import { approaches } from "@/lib/content";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";
import { approachIconMap } from "@/components/ui/icons";

export function Approaches() {
  return (
    <Section
      id="enfoques"
      eyebrow="Enfoques"
      title="Planes de alimentación pensados para cada etapa"
      intro="Cada plan se arma a partir de una evaluación personal. Estas son las áreas en las que te puedo acompañar."
    >
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {approaches.map((a, i) => {
          const Icon = approachIconMap[a.icon];
          return (
            <Reveal
              as="li"
              key={a.id}
              delay={(i % 3) * 60}
              className="group flex flex-col rounded-[var(--radius-card)] border border-border bg-surface p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
            >
              <span className="mb-5 inline-flex size-12 items-center justify-center rounded-full bg-surface-alt">
                <Icon className="size-6 text-primary" strokeWidth={1.4} aria-hidden="true" />
              </span>
              <h3 className="text-[length:var(--text-h3)]">{a.title}</h3>
              <p className="mt-2 text-muted">{a.forWhom}</p>
              <p className="mt-5 text-sm font-semibold text-text">Qué incluye la consulta</p>
              <ul className="mt-2 space-y-1.5 text-[0.9375rem]">
                {a.includes.map((inc) => (
                  <li key={inc} className="flex gap-2">
                    <Check className="mt-1 size-4 shrink-0 text-accent" strokeWidth={2} aria-hidden="true" />
                    {inc}
                  </li>
                ))}
              </ul>
            </Reveal>
          );
        })}
      </ul>
    </Section>
  );
}
