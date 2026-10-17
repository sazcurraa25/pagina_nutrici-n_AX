"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __turnstileLoading?: Promise<void>;
  }
}

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  window.__turnstileLoading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile"));
    document.head.appendChild(s);
  });
  return window.__turnstileLoading;
}

export type TurnstileHandle = { reset: () => void };

/** Widget de Cloudflare Turnstile (anti-spam, sin cookies de seguimiento). */
export const Turnstile = forwardRef<TurnstileHandle, { siteKey: string; onToken: (token: string | undefined) => void }>(
  function Turnstile({ siteKey, onToken }, ref) {
    const container = useRef<HTMLDivElement>(null);
    const widgetId = useRef<string | null>(null);
    const onTokenRef = useRef(onToken);
    onTokenRef.current = onToken;

    useImperativeHandle(ref, () => ({
      reset: () => {
        onTokenRef.current(undefined);
        if (widgetId.current) window.turnstile?.reset(widgetId.current);
      },
    }));

    useEffect(() => {
      let cancelled = false;
      loadScript()
        .then(() => {
          if (cancelled || !container.current || !window.turnstile) return;
          widgetId.current = window.turnstile.render(container.current, {
            sitekey: siteKey,
            language: "es",
            theme: "auto",
            callback: (t: string) => onTokenRef.current(t),
            "expired-callback": () => onTokenRef.current(undefined),
            "error-callback": () => onTokenRef.current(undefined),
          });
        })
        .catch(() => onTokenRef.current(undefined));
      return () => {
        cancelled = true;
        if (widgetId.current) window.turnstile?.remove(widgetId.current);
        widgetId.current = null;
      };
    }, [siteKey]);

    return <div ref={container} className="min-h-[65px]" />;
  },
);
