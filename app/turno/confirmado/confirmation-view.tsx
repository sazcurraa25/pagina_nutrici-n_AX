"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarPlus, CheckCircle2, Clock, Laptop, MapPin } from "lucide-react";
import { readConfirmation, type StoredConfirmation } from "@/lib/booking/confirmation";
import { buildIcs } from "@/lib/booking/ics";
import { formatLongDate, formatTime } from "@/lib/time";
import { Button, buttonClasses } from "@/components/ui/button";

export function ConfirmationView({ address, professional }: { address: string; professional: string }) {
  const [data, setData] = useState<StoredConfirmation | null | undefined>(undefined);

  useEffect(() => {
    setData(readConfirmation());
  }, []);

  if (data === undefined) {
    return <div className="mx-auto h-80 max-w-2xl animate-pulse rounded-[var(--radius-card)] bg-surface-alt" aria-hidden="true" />;
  }

  if (data === null) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-[length:var(--text-h2)]">Revisá tu mail</h1>
        <p className="mt-4 text-muted">
          Si ya reservaste, te llegó una invitación con todos los datos del turno y el link para cancelarlo.
        </p>
        <Link href="/#turnos" className={buttonClasses("primary", "md", "mt-8")}>
          Reservar un turno
        </Link>
      </div>
    );
  }

  const { summary, cancelToken } = data;
  const online = summary.modality === "online";
  const date = formatLongDate(summary.start);
  const cancelPath = `/turno/cancelar/${cancelToken}`;

  const downloadIcs = () => {
    const ics = buildIcs({
      uid: `${summary.bookingId}@turnos`,
      start: summary.start,
      end: summary.end,
      title: `${summary.typeLabel} — ${professional}`,
      description: online
        ? `Consulta online por Google Meet.${summary.meetLink ? ` Link: ${summary.meetLink}` : " El link te llega por mail."}`
        : `Consulta presencial en ${address}.`,
      location: online ? (summary.meetLink ?? "Google Meet") : address,
      url: online ? summary.meetLink : undefined,
    });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "turno-nutricion.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-primary" strokeWidth={1.2} aria-hidden="true" />
        <h1 className="mt-4 text-[length:var(--text-h2)]">¡Tu turno está confirmado!</h1>
        <p className="mt-3 text-muted">Te enviamos la invitación por mail. Revisá también la carpeta de spam.</p>
      </div>

      <dl className="mt-10 space-y-5 rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-8">
        <div className="flex gap-4">
          <Clock className="mt-1 size-5 shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
          <div>
            <dt className="text-sm text-muted">{summary.typeLabel}</dt>
            <dd className="text-lg font-medium">
              <span className="capitalize">{date.split(" ")[0]}</span> {date.split(" ").slice(1).join(" ")}, {formatTime(summary.start)} h
            </dd>
          </div>
        </div>
        <div className="flex gap-4">
          {online ? (
            <Laptop className="mt-1 size-5 shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <MapPin className="mt-1 size-5 shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
          )}
          <div>
            <dt className="text-sm text-muted">{online ? "Consulta online" : "Dirección"}</dt>
            <dd className="font-medium">
              {online ? "El link de Google Meet está en la invitación que te llegó por mail." : address}
            </dd>
          </div>
        </div>
      </dl>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button variant="primary" onClick={downloadIcs}>
          <CalendarPlus className="size-5" strokeWidth={1.6} aria-hidden="true" />
          Agregar a mi calendario
        </Button>
        <Link href="/" className={buttonClasses("secondary")}>
          Volver al inicio
        </Link>
      </div>

      <p className="mt-10 text-center text-[0.9375rem] text-muted">
        ¿No vas a poder ir? <Link href={cancelPath}>Cancelá tu turno acá</Link>. El link también está en tu mail.
      </p>
    </div>
  );
}
