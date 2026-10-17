import { z } from "zod";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:mm (24 h)");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD");

export const modalitySchema = z.enum(["presencial", "online"]);
export type Modality = z.infer<typeof modalitySchema>;

/* ---------- profile.json ---------- */
export const profileSchema = z.object({
  name: z.string().min(1),
  fullName: z.string().min(1),
  title: z.string().min(1),
  shortTitle: z.string().min(1),
  license: z.string().regex(/^M\.P\. N° .+/, "La matrícula debe empezar con 'M.P. N° '"),
  university: z.string().min(1),
  postgrads: z.array(z.string()),
  tagline: z.string().min(1),
  photo: z.object({ src: z.string(), alt: z.string().min(1) }),
  officePhoto: z.object({ src: z.string(), alt: z.string().min(1) }),
  bio: z.array(z.string()).min(1),
  approach: z.string(),
  modalities: z.array(
    z.object({ type: modalitySchema, title: z.string(), description: z.string() }),
  ),
  insurances: z.array(z.string()),
  insurancesNote: z.string().optional(),
  contact: z.object({
    phone: z.string(),
    phoneHref: z.string().regex(/^\+\d+$/, "Solo + y dígitos"),
    whatsapp: z.string().regex(/^\d+$/, "Solo dígitos, con código de país (ej. 549221...)"),
    whatsappMessage: z.string(),
    email: z.email(),
  }),
  address: z.object({
    street: z.string(),
    city: z.string(),
    province: z.string(),
    postalCode: z.string(),
    country: z.string().length(2),
    mapQuery: z.string(),
    lat: z.number(),
    lng: z.number(),
  }),
  serviceArea: z.array(z.string()),
  social: z.array(
    z.object({
      network: z.enum(["instagram", "facebook", "linkedin", "web"]),
      label: z.string(),
      url: z.url(),
    }),
  ),
});
export type Profile = z.infer<typeof profileSchema>;

/* ---------- approaches.json ---------- */
export const approachIcons = [
  "salad",
  "scale",
  "dumbbell",
  "sprout",
  "heart",
  "heart-pulse",
  "stethoscope",
  "baby",
  "apple",
  "leaf",
  "wheat",
  "carrot",
  "users",
] as const;

export const approachesSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        icon: z.enum(approachIcons),
        title: z.string().min(1),
        forWhom: z.string().min(1),
        includes: z.array(z.string()).min(1),
      }),
    )
    .min(1),
});
export type Approach = z.infer<typeof approachesSchema>["items"][number];

/* ---------- stories.json ---------- */
export const storiesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      // Anonimizado: inicial o nombre de pila, nunca apellido.
      alias: z
        .string()
        .min(1)
        .max(20)
        .refine((s) => !/\s\S{2,}/.test(s.trim()), "Solo nombre de pila o inicial, sin apellido"),
      approxAge: z.string().max(30).optional(),
      approach: z.string().optional(),
      text: z
        .string()
        .min(1)
        .max(500)
        .refine(
          (s) => !/\d+\s*(kg|kilo|kilos|%)/i.test(s),
          "No incluir kilos, porcentajes ni métricas (Reglamento de Publicidad)",
        ),
      // Consentimiento escrito del paciente: obligatorio.
      consent: z.literal(true, { error: "Cada historia necesita consent: true" }),
      published: z.boolean(),
    }),
  ),
});
export type Story = z.infer<typeof storiesSchema>["items"][number];

/* ---------- schedule.json ---------- */
export const appointmentTypeSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string(),
  /** Para el título del evento en Google Calendar: "Consulta <shortLabel> — <Nombre>". */
  shortLabel: z.string().optional(),
  durationMinutes: z.number().int().min(10).max(240),
  description: z.string(),
  modalities: z.array(modalitySchema).min(1),
});
export type AppointmentType = z.infer<typeof appointmentTypeSchema>;

export const weeklyRuleSchema = z
  .object({
    day: z.number().int().min(1).max(7),
    from: hhmm,
    to: hhmm,
    modality: z.enum(["presencial", "online", "ambas"]),
  })
  .refine((r) => r.from < r.to, "'from' tiene que ser anterior a 'to'");
export type WeeklyRule = z.infer<typeof weeklyRuleSchema>;

export const scheduleSchema = z.object({
  timezone: z.string(),
  slotIntervalMinutes: z.number().int().min(5).max(120),
  bufferMinutes: z.number().int().min(0).max(120),
  minNoticeHours: z.number().min(0),
  maxDaysAhead: z.number().int().min(1).max(180),
  cancellationNoticeHours: z.number().min(0),
  appointmentTypes: z.array(appointmentTypeSchema).min(1),
  weekly: z.array(weeklyRuleSchema),
  blocked: z.array(
    z
      .object({ from: isoDate, to: isoDate, reason: z.string().optional() })
      .refine((b) => b.from <= b.to, "'from' tiene que ser anterior o igual a 'to'"),
  ),
  holidays: z.array(z.object({ date: isoDate, name: z.string() })),
});
export type Schedule = z.infer<typeof scheduleSchema>;

/* ---------- faq.json ---------- */
export const faqSchema = z.object({
  items: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })),
});
export type FaqItem = z.infer<typeof faqSchema>["items"][number];
