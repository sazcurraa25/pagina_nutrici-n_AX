"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

// El token de cancelación va en la URL (/turno/cancelar/<token>). Se reemplaza antes de
// enviarlo a la analítica para no exponer tokens de cancelación válidos en el dashboard.
function redact(event: BeforeSendEvent): BeforeSendEvent {
  return { ...event, url: event.url.replace(/\/turno\/cancelar\/[^/?#]+/, "/turno/cancelar/[token]") };
}

export function SiteAnalytics() {
  // `redact` se define a nivel de módulo para que su identidad sea estable entre renders.
  return <Analytics beforeSend={redact} />;
}
