/**
 * Tipos y validación compartidos entre cliente y servidor (sin dependencias de Node).
 */
import { z } from "zod";
import { modalitySchema, type Modality } from "@/lib/content/schemas";

export type SlotModality = Modality | "ambas";

export type Slot = {
  /** ISO 8601 en UTC */
  start: string;
  end: string;
  /** Modalidad posible en ese horario: si es "ambas", la persona elige. */
  modality: SlotModality;
};

export const REASON_MAX = 300;

// La descripción del evento de Google admite HTML y Google auto-enlaza URLs. El texto
// de la persona va dentro de una invitación que se envía desde la cuenta del consultorio,
// así que se rechazan < > (markup), caracteres de control y links (evita phishing).
const noMarkup = (field: string) =>
  z
    .string()
    .refine((s) => !/[<>]/.test(s), `No uses los símbolos < o > en ${field}`)
    // eslint-disable-next-line no-control-regex
    .refine((s) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s), `${field} tiene caracteres inválidos`)
    .refine((s) => !/(https?:\/\/|www\.|\b[a-z0-9-]+\.[a-z]{2,}\/)/i.test(s), `No incluyas links en ${field}`);

export const bookingRequestSchema = z.object({
  typeId: z.string().min(1),
  start: z.iso.datetime({ offset: true }),
  name: z
    .string()
    .trim()
    .min(3, "Ingresá tu nombre y apellido")
    .max(80, "Usá como máximo 80 caracteres")
    .pipe(noMarkup("el nombre")),
  email: z.string().trim().pipe(z.email("Ingresá un email válido")).pipe(z.string().max(120)),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{8,20}$/, "Ingresá un teléfono válido, con código de área"),
  modality: modalitySchema,
  reason: z
    .string()
    .trim()
    .max(REASON_MAX, `Usá como máximo ${REASON_MAX} caracteres`)
    .pipe(noMarkup("el motivo")),
  consent: z.boolean().refine((v) => v, "Necesitamos tu consentimiento para agendar el turno"),
  turnstileToken: z.string().optional(),
  /** Honeypot: tiene que llegar vacío. */
  website: z.string().max(0).optional(),
});
export type BookingRequest = z.infer<typeof bookingRequestSchema>;

export const cancelRequestSchema = z.object({ token: z.string().min(10).max(200) });

/** Datos no personales del turno, para mostrar en la confirmación y la cancelación. */
export type BookingSummary = {
  bookingId: string;
  typeId: string;
  typeLabel: string;
  start: string;
  end: string;
  modality: Modality;
  meetLink?: string;
};

export type BookingErrorCode =
  | "VALIDATION"
  | "SLOT_TAKEN"
  | "RATE_LIMITED"
  | "CAPTCHA"
  | "NOT_FOUND"
  | "TOO_LATE"
  | "INTERNAL";

export type ApiError = { error: { code: BookingErrorCode; message: string } };

export type CreateBookingResponse = {
  bookingId: string;
  cancelToken: string;
  summary: BookingSummary;
};
