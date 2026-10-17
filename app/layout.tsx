import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { SiteAnalytics } from "@/components/layout/analytics";
import { profile, showStories } from "@/lib/content";
import { siteUrl } from "@/lib/utils";
import { buildJsonLd } from "@/lib/seo/jsonld";
import { Header, type NavItem } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppFab } from "@/components/layout/whatsapp-fab";
import "./globals.css";

const nav: NavItem[] = [
  { href: "/#sobre-mi", label: "Sobre mí" },
  { href: "/#enfoques", label: "Enfoques" },
  ...(showStories ? [{ href: "/#historias", label: "Historias" }] : []),
  { href: "/#horarios", label: "Horarios" },
  { href: "/#turnos", label: "Turnos" },
];

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  variable: "--font-fraunces",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const title = `${profile.name} · ${profile.shortTitle} en ${profile.address.city}`;
const description = `${profile.title} (${profile.license}). Consultas presenciales en ${profile.address.city} y online. ${profile.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: `%s · ${profile.name}` },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "/",
    siteName: profile.name,
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1a17" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es-AR"
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Habilita las animaciones de entrada solo si hay JS (sin JS el contenido se ve igual). */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd()) }}
        />
      </head>
      <body>
        <a
          href="#contenido"
          className="sr-only z-50 rounded-full bg-primary-dark px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Saltar al contenido
        </a>
        <Header name={profile.name} subtitle={`${profile.shortTitle} · ${profile.license}`} nav={nav} />
        <main id="contenido" tabIndex={-1} className="pt-[4.5rem] focus:outline-none">
          {children}
        </main>
        <Footer />
        <WhatsAppFab />
        <SiteAnalytics />
      </body>
    </html>
  );
}
