import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

export function Section({
  id,
  eyebrow,
  title,
  intro,
  alt = false,
  children,
  className,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  alt?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("py-20 sm:py-28", alt && "bg-surface-alt", className)}
    >
      <div className="container-site">
        <Reveal className="mb-12 max-w-2xl">
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h2 id={`${id}-title`} className="text-[length:var(--text-h2)]">
            {title}
          </h2>
          {intro && <div className="mt-4 text-muted">{intro}</div>}
        </Reveal>
        {children}
      </div>
    </section>
  );
}
