import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="container-site py-16 sm:py-24">
      <div className="mx-auto max-w-[68ch]">
        <h1 className="text-[length:var(--text-h2)]">{title}</h1>
        <p className="mt-3 text-sm text-muted">Última actualización: {updated}</p>
        <div className="prose-legal mt-8">{children}</div>
      </div>
    </article>
  );
}
