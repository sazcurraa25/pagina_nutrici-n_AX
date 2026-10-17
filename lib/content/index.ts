/**
 * Carga y valida el contenido editable de /content.
 * Si un archivo tiene un error, el build falla con un mensaje que indica el campo.
 */
import { z } from "zod";
import profileJson from "@/content/profile.json";
import approachesJson from "@/content/approaches.json";
import storiesJson from "@/content/stories.json";
import scheduleJson from "@/content/schedule.json";
import faqJson from "@/content/faq.json";
import {
  approachesSchema,
  faqSchema,
  profileSchema,
  scheduleSchema,
  storiesSchema,
} from "./schemas";

function load<T extends z.ZodType>(file: string, schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Error en content/${file}:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const profile = load("profile.json", profileSchema, profileJson);
export const approaches = load("approaches.json", approachesSchema, approachesJson).items;
export const schedule = load("schedule.json", scheduleSchema, scheduleJson);
export const faq = load("faq.json", faqSchema, faqJson).items;

const allStories = load("stories.json", storiesSchema, storiesJson).items;
for (const s of allStories) {
  if (s.approach && !approaches.some((a) => a.id === s.approach)) {
    throw new Error(`Error en content/stories.json: la historia "${s.id}" usa un enfoque inexistente "${s.approach}"`);
  }
}

/** Historias publicables: con consentimiento y marcadas como publicadas. */
export const stories = allStories.filter((s) => s.consent && s.published);

/** La sección de historias se oculta con SHOW_STORIES=false (se lee al compilar). */
export const showStories = process.env.SHOW_STORIES !== "false" && stories.length > 0;

export function whatsappUrl(message = profile.contact.whatsappMessage): string {
  return `https://wa.me/${profile.contact.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function getAppointmentType(id: string) {
  return schedule.appointmentTypes.find((t) => t.id === id);
}

export * from "./schemas";
