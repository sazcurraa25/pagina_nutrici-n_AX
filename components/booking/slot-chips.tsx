"use client";

import { Laptop, MapPin } from "lucide-react";
import type { Slot } from "@/lib/booking/schema";
import { formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";

const modalityText = { presencial: "presencial", online: "online", ambas: "presencial u online" } as const;

export function SlotChips({
  slots,
  selected,
  onSelect,
}: {
  slots: Slot[];
  selected: string | null;
  onSelect: (slot: Slot) => void;
}) {
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((s) => {
        const isSelected = s.start === selected;
        const time = formatTime(s.start);
        return (
          <li key={s.start}>
            <button
              type="button"
              aria-pressed={isSelected}
              aria-label={`${time} h, ${modalityText[s.modality]}`}
              onClick={() => onSelect(s)}
              className={cn(
                "flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border px-3 text-[0.9375rem] tabular-nums transition-colors",
                isSelected
                  ? "border-primary bg-primary text-on-primary"
                  : "border-border bg-surface text-text hover:border-primary-dark hover:text-primary-dark",
              )}
            >
              {time}
              {s.modality === "online" && <Laptop className="size-3.5 opacity-80" aria-hidden="true" />}
              {s.modality === "presencial" && <MapPin className="size-3.5 opacity-80" aria-hidden="true" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function SlotsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2" aria-hidden="true">
      <div className="h-72 animate-pulse rounded-[var(--radius-card)] bg-surface-alt" />
      <div className="grid grid-cols-3 content-start gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-full bg-surface-alt" />
        ))}
      </div>
    </div>
  );
}
