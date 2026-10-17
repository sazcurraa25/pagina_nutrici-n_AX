"use client";

import Link from "next/link";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { bookingRequestSchema, REASON_MAX, type SlotModality } from "@/lib/booking/schema";
import type { Modality } from "@/lib/content/schemas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const detailsSchema = bookingRequestSchema.pick({
  name: true,
  email: true,
  phone: true,
  modality: true,
  reason: true,
  consent: true,
  website: true,
});
export type DetailsValues = z.output<typeof detailsSchema>;

const inputClass =
  "mt-1.5 block w-full rounded-xl border border-border bg-bg px-4 py-3 text-base text-text placeholder:text-muted/80 focus:border-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark/30 aria-[invalid=true]:border-danger";

export function BookingForm({
  slotModality,
  allowedModalities,
  defaultValues,
  onSubmit,
  onBack,
}: {
  slotModality: SlotModality;
  allowedModalities: Modality[];
  defaultValues?: DetailsValues;
  onSubmit: (values: DetailsValues) => void;
  onBack: () => void;
}) {
  const id = useId();
  const fixedModality: Modality | null =
    slotModality !== "ambas" ? slotModality : allowedModalities.length === 1 ? (allowedModalities[0] ?? null) : null;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof detailsSchema>, unknown, DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      reason: "",
      consent: false,
      website: "",
      ...defaultValues,
      ...(fixedModality ? { modality: fixedModality } : {}),
    },
    shouldFocusError: true,
  });

  const reasonLength = (watch("reason") ?? "").length;
  const err = (name: keyof DetailsValues) => (errors[name] ? `${id}-${name}-error` : undefined);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-name`} className="font-medium">
          Nombre y apellido
        </label>
        <input
          id={`${id}-name`}
          autoComplete="name"
          className={inputClass}
          aria-invalid={!!errors.name}
          aria-describedby={err("name")}
          {...register("name")}
        />
        <FieldError id={err("name")} message={errors.name?.message} />
      </div>

      <div>
        <label htmlFor={`${id}-email`} className="font-medium">
          Email
        </label>
        <input
          id={`${id}-email`}
          type="email"
          autoComplete="email"
          inputMode="email"
          className={inputClass}
          aria-invalid={!!errors.email}
          aria-describedby={cn(`${id}-email-hint`, err("email"))}
          {...register("email")}
        />
        <p id={`${id}-email-hint`} className="mt-1 text-sm text-muted">
          Te enviamos la invitación del turno.
        </p>
        <FieldError id={err("email")} message={errors.email?.message} />
      </div>

      <div>
        <label htmlFor={`${id}-phone`} className="font-medium">
          Teléfono (WhatsApp)
        </label>
        <input
          id={`${id}-phone`}
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="Ej.: 221 555-1234"
          className={inputClass}
          aria-invalid={!!errors.phone}
          aria-describedby={err("phone")}
          {...register("phone")}
        />
        <FieldError id={err("phone")} message={errors.phone?.message} />
      </div>

      <fieldset className="sm:col-span-2">
        <legend className="font-medium">Modalidad</legend>
        {fixedModality ? (
          <>
            <p className="mt-1.5 text-muted">
              {fixedModality === "online"
                ? "Online, por Google Meet (el link te llega por mail)."
                : "Presencial, en el consultorio."}
            </p>
            <input type="hidden" {...register("modality")} />
          </>
        ) : (
          <div className="mt-2 flex flex-wrap gap-3">
            {(["presencial", "online"] as const).map((m) => (
              <label
                key={m}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border px-4 has-[:checked]:border-primary-dark has-[:checked]:bg-surface-alt"
              >
                <input
                  type="radio"
                  value={m}
                  className="size-4 accent-[var(--color-primary-dark)]"
                  aria-describedby={err("modality")}
                  {...register("modality")}
                />
                {m === "presencial" ? "Presencial" : "Online (Google Meet)"}
              </label>
            ))}
          </div>
        )}
        <FieldError id={err("modality")} message={errors.modality ? "Elegí una modalidad" : undefined} />
      </fieldset>

      <div className="sm:col-span-2">
        <label htmlFor={`${id}-reason`} className="font-medium">
          Motivo de consulta <span className="font-normal text-muted">(opcional)</span>
        </label>
        <textarea
          id={`${id}-reason`}
          rows={3}
          maxLength={REASON_MAX}
          className={cn(inputClass, "resize-y")}
          aria-invalid={!!errors.reason}
          aria-describedby={cn(`${id}-reason-hint`, err("reason"))}
          {...register("reason")}
        />
        <p id={`${id}-reason-hint`} className="mt-1 flex justify-between gap-4 text-sm text-muted">
          <span>Contalo en pocas palabras. No hace falta detallar información de salud acá: lo vemos en la consulta.</span>
          <span className="shrink-0 tabular-nums" aria-hidden="true">
            {reasonLength}/{REASON_MAX}
          </span>
        </p>
        <FieldError id={err("reason")} message={errors.reason?.message} />
      </div>

      {/* Honeypot: invisible para personas, los bots suelen completarlo. */}
      <div className="absolute left-[-10000px] top-auto size-px overflow-hidden" aria-hidden="true">
        <label htmlFor={`${id}-website`}>No completar este campo</label>
        <input id={`${id}-website`} type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`${id}-consent`} className="flex cursor-pointer items-start gap-3">
          <input
            id={`${id}-consent`}
            type="checkbox"
            className="mt-1 size-5 shrink-0 accent-[var(--color-primary-dark)]"
            aria-invalid={!!errors.consent}
            aria-describedby={err("consent")}
            {...register("consent")}
          />
          <span className="text-[0.9375rem]">
            Acepto que mis datos se usen solo para gestionar este turno, según la{" "}
            <Link href="/privacidad" target="_blank">
              Política de privacidad
            </Link>
            .
          </span>
        </label>
        <FieldError id={err("consent")} message={errors.consent?.message} />
      </div>

      <div className="flex flex-col-reverse justify-between gap-3 sm:col-span-2 sm:flex-row">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Cambiar horario
        </Button>
        <Button type="submit">Revisar turno</Button>
      </div>
    </form>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!id || !message) return null;
  return (
    <p id={id} className="mt-1.5 text-sm font-medium text-danger" role="alert">
      {message}
    </p>
  );
}
