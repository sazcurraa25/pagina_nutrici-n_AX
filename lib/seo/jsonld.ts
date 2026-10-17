import { profile, schedule } from "@/lib/content";
import { siteUrl } from "@/lib/utils";

const dayUrl: Record<number, string> = {
  1: "https://schema.org/Monday",
  2: "https://schema.org/Tuesday",
  3: "https://schema.org/Wednesday",
  4: "https://schema.org/Thursday",
  5: "https://schema.org/Friday",
  6: "https://schema.org/Saturday",
  7: "https://schema.org/Sunday",
};

/**
 * JSON-LD de tipo MedicalBusiness: nombre, matrícula, dirección, teléfono, horarios y
 * área de servicio, armado desde content/. Ayuda a que buscadores y mapas entiendan el sitio.
 */
export function buildJsonLd() {
  const openingHours = schedule.weekly.map((r) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: dayUrl[r.day],
    opens: r.from,
    closes: r.to,
  }));

  return {
    "@context": "https://schema.org",
    "@type": ["MedicalBusiness", "LocalBusiness"],
    "@id": `${siteUrl}/#business`,
    name: profile.name,
    description: profile.tagline,
    url: siteUrl,
    telephone: profile.contact.phoneHref,
    email: profile.contact.email,
    image: `${siteUrl}/opengraph-image`,
    address: {
      "@type": "PostalAddress",
      streetAddress: profile.address.street,
      addressLocality: profile.address.city,
      addressRegion: profile.address.province,
      postalCode: profile.address.postalCode,
      addressCountry: profile.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: profile.address.lat,
      longitude: profile.address.lng,
    },
    areaServed: profile.serviceArea.map((name) => ({ "@type": "AdministrativeArea", name })),
    openingHoursSpecification: openingHours,
    founder: {
      "@type": "Person",
      name: profile.fullName,
      jobTitle: profile.title,
      alumniOf: { "@type": "CollegeOrUniversity", name: profile.university },
    },
    availableService: schedule.appointmentTypes.map((t) => ({
      "@type": "MedicalProcedure",
      name: t.label,
      description: t.description,
    })),
    sameAs: profile.social.map((s) => s.url),
  };
}
