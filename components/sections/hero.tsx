import Image from "next/image";
import { CalendarCheck } from "lucide-react";
import { profile, whatsappUrl } from "@/lib/content";
import { buttonClasses } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div className="container-site grid items-center gap-12 py-14 sm:py-20 md:grid-cols-12 md:gap-8 lg:py-24">
        <div className="md:col-span-7">
          <p className="eyebrow mb-4">
            {profile.shortTitle} · {profile.license}
          </p>
          <h1
            id="hero-title"
            className="text-[length:var(--text-h1)] leading-[1.05] [font-variation-settings:'opsz'_144,'SOFT'_50]"
          >
            {profile.name}
          </h1>
          <p className="mt-3 text-lg text-muted">
            {profile.title} · {profile.university}
          </p>
          <p className="mt-6 max-w-xl text-[1.1875rem] leading-relaxed">{profile.tagline}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#turnos" className={buttonClasses("primary", "lg")}>
              <CalendarCheck className="size-5" strokeWidth={1.6} aria-hidden="true" />
              Reservar turno
            </a>
            <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "lg")}>
              <WhatsAppIcon className="size-5" />
              Escribime por WhatsApp
            </a>
          </div>
          <p className="mt-6 text-[0.9375rem] text-muted">
            Atención presencial en {profile.address.city} y online.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-sm md:col-span-5 md:max-w-none">
          {/* Hoja/blob orgánico detrás de la foto */}
          <svg
            viewBox="0 0 400 480"
            aria-hidden="true"
            className="absolute -inset-6 -z-0 h-[calc(100%+3rem)] w-[calc(100%+3rem)] text-surface-alt"
          >
            <path
              fill="currentColor"
              d="M210 18c78 6 150 60 170 140 21 84-6 170-62 228-55 57-140 82-212 58C34 420-6 343 2 264 10 183 40 105 96 59 128 32 168 15 210 18z"
            />
            <path
              d="M70 420c60-40 120-160 260-300"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.55"
            />
          </svg>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-border bg-surface">
            <Image
              src={profile.photo.src}
              alt={profile.photo.alt}
              fill
              priority
              sizes="(min-width: 768px) 40vw, 90vw"
              className="object-cover"
              unoptimized={profile.photo.src.endsWith(".svg")}
            />
          </div>
        </div>
      </div>
      {/* Separador con curva leve */}
      <svg viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true" className="block h-6 w-full text-surface-alt sm:h-10">
        <path fill="currentColor" d="M0 40V22C240 2 480 0 720 10s480 22 720 4v26z" />
      </svg>
    </section>
  );
}
