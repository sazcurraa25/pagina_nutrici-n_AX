import type { SVGProps } from "react";
import {
  Apple,
  Baby,
  Carrot,
  Dumbbell,
  Heart,
  HeartPulse,
  Leaf,
  Salad,
  Scale,
  Sprout,
  Stethoscope,
  Users,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import type { approachIcons } from "@/lib/content/schemas";

export const approachIconMap: Record<(typeof approachIcons)[number], LucideIcon> = {
  salad: Salad,
  scale: Scale,
  dumbbell: Dumbbell,
  sprout: Sprout,
  heart: Heart,
  "heart-pulse": HeartPulse,
  stethoscope: Stethoscope,
  baby: Baby,
  apple: Apple,
  leaf: Leaf,
  wheat: Wheat,
  carrot: Carrot,
  users: Users,
};

/* Lucide ya no incluye íconos de marcas: van como SVG propios, de línea fina. */
export function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M3.5 20.5l1.3-4.1A8.5 8.5 0 1 1 8 19.4z" />
      <path d="M9 8.6c.2-.5.5-.6.8-.6h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.6l-.5.6c-.1.2-.1.4 0 .5.4.8 1.3 1.7 2.1 2.1.2.1.4.1.5 0l.6-.6c.2-.2.4-.2.6-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3-.1.6-.6.8-.6.3-1.7.5-3.4-.4a9 9 0 0 1-3.5-3.5c-.9-1.7-.6-2.7-.3-3.3z" />
    </svg>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M17 3h-3a4 4 0 0 0-4 4v3H7v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2z" />
    </svg>
  );
}

export function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" />
    </svg>
  );
}
