"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { ApiError } from "@/lib/booking/schema";
import { Button, buttonClasses } from "@/components/ui/button";

export function CancelButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const cancel = async () => {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiError | null;
        setError(data?.error.message ?? "No pudimos cancelar el turno. Probá de nuevo.");
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setError("No pudimos conectarnos. Revisá tu conexión y probá de nuevo.");
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <div role="status" className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface-alt p-6">
        <p className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
          Tu turno fue cancelado.
        </p>
        <p className="mt-2 text-muted">Te llega un mail de Google con la cancelación. ¡Gracias por avisar!</p>
        <Link href="/#turnos" className={buttonClasses("secondary", "md", "mt-5")}>
          Reservar otro turno
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <p>¿Querés cancelar este turno? El horario va a quedar libre para otra persona.</p>
      {error && (
        <p role="alert" className="mt-4 font-medium text-danger">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => void cancel()} disabled={state === "loading"} aria-busy={state === "loading"}>
          {state === "loading" ? "Cancelando…" : "Sí, cancelar turno"}
        </Button>
        <Link href="/" className={buttonClasses("ghost")}>
          No, volver al inicio
        </Link>
      </div>
    </div>
  );
}
