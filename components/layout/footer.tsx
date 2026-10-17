import Link from "next/link";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { profile, whatsappUrl } from "@/lib/content";
import { FacebookIcon, InstagramIcon, LinkedinIcon, WhatsAppIcon } from "@/components/ui/icons";

const socialIcons = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  linkedin: LinkedinIcon,
  web: Globe,
} as const;

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-surface-alt">
      <div className="container-site grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="font-serif text-2xl">{profile.name}</p>
          <p className="mt-1 text-muted">
            {profile.title} · {profile.university}
          </p>
          <p className="mt-1 font-medium">{profile.license}</p>
        </div>

        <div className="md:col-span-4">
          <h2 className="mb-3 font-sans text-sm font-semibold uppercase tracking-[0.12em] text-muted">Contacto</h2>
          <ul className="space-y-2 text-[0.9375rem]">
            <li className="flex items-start gap-2">
              <MapPin className="mt-1 size-4 shrink-0 text-accent" strokeWidth={1.6} aria-hidden="true" />
              <span>
                {profile.address.street}, {profile.address.city}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-accent" strokeWidth={1.6} aria-hidden="true" />
              <a href={`tel:${profile.contact.phoneHref}`}>{profile.contact.phone}</a>
            </li>
            <li className="flex items-center gap-2">
              <WhatsAppIcon className="size-4 shrink-0 text-accent" />
              <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-accent" strokeWidth={1.6} aria-hidden="true" />
              <a href={`mailto:${profile.contact.email}`}>{profile.contact.email}</a>
            </li>
          </ul>
        </div>

        <div className="md:col-span-3">
          <h2 className="mb-3 font-sans text-sm font-semibold uppercase tracking-[0.12em] text-muted">Más</h2>
          <ul className="space-y-2 text-[0.9375rem]">
            {profile.social.map((s) => {
              const Icon = socialIcons[s.network];
              return (
                <li key={s.url} className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-accent" />
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.label}
                  </a>
                </li>
              );
            })}
            <li>
              <Link href="/privacidad">Política de privacidad</Link>
            </li>
            <li>
              <Link href="/terminos">Términos y condiciones</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="container-site py-5 text-sm text-muted">
          © {year} {profile.fullName} · {profile.shortTitle} · {profile.license}
        </p>
      </div>
    </footer>
  );
}
