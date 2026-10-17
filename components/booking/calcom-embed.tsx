"use client";

import { useEffect } from "react";
import Cal, { getCalApi } from "@calcom/embed-react";

/** Alternativa B: agenda de Cal.com embebida (BOOKING_PROVIDER=calcom). */
export function CalcomEmbed({ calLink }: { calLink: string }) {
  useEffect(() => {
    void (async () => {
      const cal = await getCalApi();
      cal("ui", {
        theme: "light",
        hideEventTypeDetails: false,
        layout: "month_view",
        cssVarsPerTheme: {
          light: { "cal-brand": "#5B7B65", "cal-text": "#2E2A26", "cal-bg": "#FFFFFF" },
          dark: { "cal-brand": "#9CBBA5" },
        },
      });
    })();
  }, []);

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
      <Cal
        calLink={calLink}
        config={{ layout: "month_view", theme: "light" }}
        style={{ width: "100%", minHeight: 640, overflow: "auto" }}
      />
    </div>
  );
}
