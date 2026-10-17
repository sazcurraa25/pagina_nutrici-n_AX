"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Clock, Laptop, MapPin } from "lucide-react";
import type { AppointmentType, Modality } from "@/lib/content/schemas";
import type { ApiError, CreateBookingResponse, Slot } from "@/lib/booking/schema";
import { saveConfirmation } from "@/lib/booking/confirmation";
import { dateKeyAR, formatLongDate, formatTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MonthCalendar } from "./month-calendar";
import { SlotChips, SlotsSkeleton } from "./slot-chips";
import { BookingForm, type DetailsValues } from "./booking-form";
import { Turnstile, type TurnstileHandle } from "./turnstile";

type Step = "type" | "slot" | "details" | "confirm";
const STEPS: { id: Step; label: string }[] = [
  { id: "type", label: "Tipo de consulta" },
  { id: "slot", label: "Día y horario" },
  { id: "details", label: "Tus datos" },
  { id: "confirm", label: "Confirmar" },
];

type SlotsState =
  | { status: "idle" | "loading"; slots: Slot[] }
  | { status: "ready"; slots: Slot[] }
  | { status: "error"; slots: Slot[]; message: string };

const modalityLabel: Record<Modality, string> = { presencial: "Presencial", online: "Online (Google Meet)" };

export function BookingWizard({
  types,
  address,
  maxDaysAhead,
  turnstileSiteKey,
}: {
  types: AppointmentType[];
  address: string;
  maxDaysAhead: number;
  turnstileSiteKey?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("type");
  const [typeId, setTypeId] = useState<string | null>(null);
  const [slotsState, setSlotsState] = useState<SlotsState>({ status: "idle", slots: [] });
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [details, setDetails] = useState<DetailsValues | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [live, setLive] = useState("");

  const headingRef = useRef<HTMLHeadingElement>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const prevStep = useRef(step);

  const type = types.find((t) => t.id === typeId) ?? null;

  // Al cambiar de paso, el foco va al título del paso (teclado y lectores de pantalla).
  // Se compara con el paso anterior para no robar el foco (ni hacer scroll) al montar.
  useEffect(() => {
    if (prevStep.current === step) return;
    prevStep.current = step;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "nearest" });
  }, [step]);

  const loadSlots = useCallback(async (id: string) => {
    setSlotsState({ status: "loading", slots: [] });
    setLive("Cargando horarios disponibles…");
    try {
      const res = await fetch(`/api/slots?type=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = (await res.json()) as { slots: Slot[] } | ApiError;
      if (!res.ok || "error" in data) {
        const message = "error" in data ? data.error.message : "No pudimos cargar los horarios.";
        setSlotsState({ status: "error", slots: [], message });
        setLive(message);
        return [];
      }
      setSlotsState({ status: "ready", slots: data.slots });
      setLive(
        data.slots.length
          ? "Horarios cargados. Elegí un día en el calendario."
          : "No hay horarios disponibles por ahora.",
      );
      return data.slots;
    } catch {
      const message = "No pudimos cargar los horarios. Revisá tu conexión y probá de nuevo.";
      setSlotsState({ status: "error", slots: [], message });
      setLive(message);
      return [];
    }
  }, []);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slotsState.slots) {
      const k = dateKeyAR(s.start);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return map;
  }, [slotsState.slots]);

  const availableDays = useMemo(() => new Set(slotsByDay.keys()), [slotsByDay]);
  const todayKey = dateKeyAR(new Date());
  const maxKey = dateKeyAR(new Date(Date.now() + maxDaysAhead * 86_400_000));
  const daySlots = dateKey ? (slotsByDay.get(dateKey) ?? []) : [];

  const chooseType = (id: string) => {
    setTypeId(id);
    setDateKey(null);
    setSlot(null);
    setNotice(null);
    setStep("slot");
    void loadSlots(id);
  };

  const chooseDay = (key: string) => {
    setDateKey(key);
    setSlot(null);
    const n = slotsByDay.get(key)?.length ?? 0;
    setLive(`${n} ${n === 1 ? "horario disponible" : "horarios disponibles"} el ${formatLongDate(`${key}T15:00:00Z`)}.`);
  };

  const submit = async () => {
    if (!type || !slot || !details) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...details, typeId: type.id, start: slot.start, turnstileToken }),
      });
      const data = (await res.json()) as CreateBookingResponse | ApiError;
      if (!res.ok || "error" in data) {
        const err = "error" in data ? data.error : { code: "INTERNAL", message: "No pudimos agendar el turno." };
        turnstileRef.current?.reset();
        if (err.code === "SLOT_TAKEN") {
          setSlot(null);
          setNotice(err.message);
          setStep("slot");
          await loadSlots(type.id);
        } else {
          setNotice(err.message);
          setLive(err.message);
        }
        return;
      }
      saveConfirmation({ summary: data.summary, cancelToken: data.cancelToken });
      router.push("/turno/confirmado");
    } catch {
      turnstileRef.current?.reset();
      setNotice("No pudimos conectarnos. Revisá tu conexión y probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const needsCaptcha = Boolean(turnstileSiteKey);

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-8">
      {/* Indicador de pasos */}
      <ol className="mb-8 flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Pasos de la reserva">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            aria-current={i === stepIndex ? "step" : undefined}
            className={cn("flex items-center gap-2", i === stepIndex ? "font-semibold text-text" : "text-muted")}
          >
            <span
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-full border text-xs",
                i < stepIndex && "border-primary bg-primary text-on-primary",
                i === stepIndex && "border-primary-dark text-primary-dark",
                i > stepIndex && "border-border",
              )}
              aria-hidden="true"
            >
              {i + 1}
            </span>
            {s.label}
          </li>
        ))}
      </ol>

      <div aria-live="polite" className="sr-only" data-testid="live-region">
        {live}
      </div>

      {notice && (
        <div role="alert" className="mb-6 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 text-[0.9375rem]">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" strokeWidth={1.6} aria-hidden="true" />
          {notice}
        </div>
      )}

      {step === "type" && (
        <div>
          <h3 ref={headingRef} tabIndex={-1} className="mb-5 text-[length:var(--text-h3)] focus:outline-none">
            ¿Qué tipo de consulta necesitás?
          </h3>
          <ul className="grid gap-3 md:grid-cols-3">
            {types.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => chooseType(t.id)}
                  className="flex h-full w-full flex-col items-start rounded-[var(--radius-card)] border border-border bg-bg p-5 text-left transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary-dark"
                >
                  <span className="font-serif text-xl">{t.label}</span>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary-dark">
                    <Clock className="size-4" strokeWidth={1.6} aria-hidden="true" />
                    {t.durationMinutes} minutos
                  </span>
                  <span className="mt-3 text-[0.9375rem] text-muted">{t.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === "slot" && type && (
        <div>
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h3 ref={headingRef} tabIndex={-1} className="text-[length:var(--text-h3)] focus:outline-none">
              Elegí día y horario
            </h3>
            <p className="text-[0.9375rem] text-muted">
              {type.label} · {type.durationMinutes} min
            </p>
          </div>

          {slotsState.status === "loading" && <SlotsSkeleton />}

          {slotsState.status === "error" && (
            <div className="rounded-xl border border-border bg-bg p-5">
              <p>{slotsState.message}</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => void loadSlots(type.id)}>
                Reintentar
              </Button>
            </div>
          )}

          {slotsState.status === "ready" && slotsState.slots.length === 0 && (
            <p className="rounded-xl border border-border bg-bg p-5">
              No hay horarios disponibles en los próximos {maxDaysAhead} días. Escribime por WhatsApp y lo coordinamos.
            </p>
          )}

          {slotsState.status === "ready" && slotsState.slots.length > 0 && (
            <div className="grid gap-8 md:grid-cols-2">
              <MonthCalendar
                available={availableDays}
                selected={dateKey}
                onSelect={chooseDay}
                minKey={todayKey}
                maxKey={maxKey}
                todayKey={todayKey}
              />
              <div>
                {dateKey ? (
                  <>
                    <h4 className="mb-3 font-sans text-[0.9375rem] font-semibold first-letter:uppercase">
                      {formatLongDate(`${dateKey}T15:00:00Z`)}
                    </h4>
                    <SlotChips slots={daySlots} selected={slot?.start ?? null} onSelect={setSlot} />
                    <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" aria-hidden="true" /> solo presencial
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Laptop className="size-3.5" aria-hidden="true" /> solo online
                      </span>
                      <span>sin ícono: podés elegir</span>
                    </p>
                  </>
                ) : (
                  <p className="text-muted">Elegí un día del calendario para ver los horarios libres.</p>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse justify-between gap-3 sm:flex-row">
            <Button variant="ghost" onClick={() => setStep("type")}>
              <ArrowLeft className="size-4" aria-hidden="true" /> Cambiar tipo de consulta
            </Button>
            <Button
              disabled={!slot}
              onClick={() => {
                setNotice(null);
                setStep("details");
              }}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === "details" && type && slot && (
        <div>
          <h3 ref={headingRef} tabIndex={-1} className="mb-1 text-[length:var(--text-h3)] focus:outline-none">
            Tus datos
          </h3>
          <p className="mb-6 text-[0.9375rem] text-muted">
            {type.label} · {capitalize(formatLongDate(slot.start))} a las {formatTime(slot.start)} h
          </p>
          <BookingForm
            slotModality={slot.modality}
            allowedModalities={type.modalities}
            defaultValues={details ?? undefined}
            onBack={() => setStep("slot")}
            onSubmit={(values) => {
              setDetails(values);
              setStep("confirm");
            }}
          />
        </div>
      )}

      {step === "confirm" && type && slot && details && (
        <div>
          <h3 ref={headingRef} tabIndex={-1} className="mb-5 text-[length:var(--text-h3)] focus:outline-none">
            Revisá y confirmá tu turno
          </h3>
          <dl className="grid gap-x-8 gap-y-4 rounded-xl border border-border bg-bg p-5 sm:grid-cols-2">
            <SummaryItem label="Consulta" value={`${type.label} (${type.durationMinutes} min)`} />
            <SummaryItem
              label="Fecha y hora"
              value={`${capitalize(formatLongDate(slot.start))}, ${formatTime(slot.start)} h`}
            />
            <SummaryItem label="Modalidad" value={modalityLabel[details.modality]} />
            <SummaryItem
              label={details.modality === "online" ? "Dónde" : "Dirección"}
              value={details.modality === "online" ? "Te llega el link de Google Meet por mail" : address}
            />
            <SummaryItem label="Nombre" value={details.name} />
            <SummaryItem label="Email" value={details.email} />
            <SummaryItem label="Teléfono" value={details.phone} />
            {details.reason && <SummaryItem label="Motivo" value={details.reason} />}
          </dl>

          {needsCaptcha && turnstileSiteKey && (
            <div className="mt-6">
              <Turnstile ref={turnstileRef} siteKey={turnstileSiteKey} onToken={setTurnstileToken} />
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse justify-between gap-3 sm:flex-row">
            <Button variant="ghost" onClick={() => setStep("details")} disabled={submitting}>
              <ArrowLeft className="size-4" aria-hidden="true" /> Editar mis datos
            </Button>
            <Button
              size="lg"
              onClick={() => void submit()}
              disabled={submitting || (needsCaptcha && !turnstileToken)}
              aria-busy={submitting}
            >
              {submitting ? "Confirmando…" : "Confirmar turno"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-0.5 break-words font-medium">{value}</dd>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
