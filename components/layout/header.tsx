"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string };

export function Header({ name, subtitle, nav }: { name: string; subtitle: string; nav: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color] duration-300",
        scrolled ? "border-border bg-bg/90 backdrop-blur-md" : "border-transparent bg-bg/70 backdrop-blur-sm",
      )}
    >
      <div className="container-site flex h-[4.5rem] items-center justify-between gap-4">
        <Link href="/" className="group flex flex-col leading-tight text-text no-underline">
          <span className="font-serif text-xl font-medium tracking-tight">{name}</span>
          <span className="text-xs text-muted">{subtitle}</span>
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="rounded-full px-3 py-2 text-[0.9375rem] text-text no-underline transition-colors hover:bg-surface-alt hover:text-primary-dark"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a href="/#turnos" className={buttonClasses("primary", "sm", "hidden sm:inline-flex")}>
            Reservar turno
          </a>

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger
              className="inline-flex size-11 items-center justify-center rounded-full text-text hover:bg-surface-alt lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="size-6" strokeWidth={1.6} aria-hidden="true" />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-text/30 backdrop-blur-[2px]" />
              <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(20rem,85vw)] flex-col gap-6 bg-bg p-6 shadow-xl focus:outline-none">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="font-serif text-lg">Menú</Dialog.Title>
                  <Dialog.Close
                    className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-alt"
                    aria-label="Cerrar menú"
                  >
                    <X className="size-6" strokeWidth={1.6} aria-hidden="true" />
                  </Dialog.Close>
                </div>
                <Dialog.Description className="sr-only">Navegación del sitio</Dialog.Description>
                <nav aria-label="Principal (móvil)">
                  <ul className="flex flex-col gap-1">
                    {nav.map((item) => (
                      <li key={item.href}>
                        <a
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="block rounded-xl px-3 py-3 text-lg text-text no-underline hover:bg-surface-alt"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
                <a href="/#turnos" onClick={() => setOpen(false)} className={buttonClasses("primary", "lg", "mt-auto")}>
                  Reservar turno
                </a>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}
