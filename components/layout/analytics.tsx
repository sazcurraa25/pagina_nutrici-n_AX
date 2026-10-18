"use client";

import Script from "next/script";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

// El token de cancelación va en la URL (/turno/cancelar/<token>). Se reemplaza antes de
// enviarlo a la analítica para no exponer tokens de cancelación válidos en el dashboard.
function redact(event: BeforeSendEvent): BeforeSendEvent {
  return { ...event, url: event.url.replace(/\/turno\/cancelar\/[^/?#]+/, "/turno/cancelar/[token]") };
}

/**
 * Analítica sin cookies, agnóstica del host:
 * - En Vercel se usa Vercel Analytics (se activa con `vercel`).
 * - En cualquier otro host (Netlify, etc.) se usa Plausible, que se activa al configurar
 *   NEXT_PUBLIC_PLAUSIBLE_DOMAIN. Se excluyen las rutas /turno/cancelar/* para no registrar
 *   los tokens de cancelación (mismo cuidado que el redact de Vercel).
 */
export function SiteAnalytics({ vercel, plausibleDomain }: { vercel: boolean; plausibleDomain?: string }) {
  return (
    <>
      {vercel && <Analytics beforeSend={redact} />}
      {plausibleDomain && (
        <Script
          defer
          data-domain={plausibleDomain}
          data-exclude="/turno/cancelar/*"
          src="https://plausible.io/js/script.exclusions.js"
          strategy="afterInteractive"
        />
      )}
    </>
  );
}
