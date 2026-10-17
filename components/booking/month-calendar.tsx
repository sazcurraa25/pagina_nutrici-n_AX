"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysToKey, isoWeekday } from "@/lib/booking/availability";
import { formatAR } from "@/lib/time";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { short: "lu", long: "lunes" },
  { short: "ma", long: "martes" },
  { short: "mi", long: "miércoles" },
  { short: "ju", long: "jueves" },
  { short: "vi", long: "viernes" },
  { short: "sá", long: "sábado" },
  { short: "do", long: "domingo" },
];

const ym = (key: string) => key.slice(0, 7);

function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y ?? 2000, (m ?? 1) - 1 + n, 1)).toISOString().slice(0, 7);
}

function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y ?? 2000, m ?? 1, 0)).getUTCDate();
}

/** Mediodía de Argentina para formatear un día sin corrimientos de zona horaria. */
const noonAR = (key: string) => `${key}T15:00:00Z`;

function clampKey(key: string, min: string, max: string) {
  return key < min ? min : key > max ? max : key;
}

/**
 * Calendario mensual accesible (patrón "date grid" de WAI-ARIA):
 * flechas = día/semana, Inicio/Fin = semana, RePág/AvPág = mes, Enter/Espacio = elegir.
 */
export function MonthCalendar({
  available,
  selected,
  onSelect,
  minKey,
  maxKey,
  todayKey,
}: {
  available: Set<string>;
  selected: string | null;
  onSelect: (key: string) => void;
  minKey: string;
  maxKey: string;
  todayKey: string;
}) {
  const firstAvailable = useMemo(() => [...available].sort()[0], [available]);
  const initial = selected ?? firstAvailable ?? minKey;
  const [month, setMonth] = useState(ym(initial));
  const [focusKey, setFocusKey] = useState(initial);
  const shouldFocus = useRef(false);
  const gridRef = useRef<HTMLTableElement>(null);

  const minMonth = ym(minKey);
  const maxMonth = ym(maxKey);
  const rangeStart = `${minMonth}-01`;
  const rangeEnd = `${maxMonth}-${String(daysInMonth(maxMonth)).padStart(2, "0")}`;

  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`button[data-key="${focusKey}"]`)?.focus();
  }, [focusKey, month]);

  const weeks = useMemo(() => {
    const first = `${month}-01`;
    const lead = isoWeekday(first) - 1;
    const total = daysInMonth(month);
    const cells: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= total; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [month]);

  const moveFocus = (key: string) => {
    const next = clampKey(key, rangeStart, rangeEnd);
    shouldFocus.current = true;
    setFocusKey(next);
    if (ym(next) !== month) setMonth(ym(next));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, key: string) => {
    const wd = isoWeekday(key);
    const map: Record<string, () => string> = {
      ArrowLeft: () => addDaysToKey(key, -1),
      ArrowRight: () => addDaysToKey(key, 1),
      ArrowUp: () => addDaysToKey(key, -7),
      ArrowDown: () => addDaysToKey(key, 7),
      Home: () => addDaysToKey(key, -(wd - 1)),
      End: () => addDaysToKey(key, 7 - wd),
      PageUp: () => {
        const m = addMonths(ym(key), -1);
        return `${m}-${String(Math.min(Number(key.slice(8)), daysInMonth(m))).padStart(2, "0")}`;
      },
      PageDown: () => {
        const m = addMonths(ym(key), 1);
        return `${m}-${String(Math.min(Number(key.slice(8)), daysInMonth(m))).padStart(2, "0")}`;
      },
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      moveFocus(fn());
    }
  };

  const changeMonth = (n: number) => {
    const m = addMonths(month, n);
    setMonth(m);
    const firstInMonth = [...available].sort().find((k) => ym(k) === m);
    setFocusKey(firstInMonth ?? clampKey(`${m}-01`, rangeStart, rangeEnd));
  };

  // Si el día enfocado no está en el mes visible, el primer día del mes recibe el tab.
  const tabKey = ym(focusKey) === month ? focusKey : `${month}-01`;
  const titleId = "calendar-month-title";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          disabled={month <= minMonth}
          className="inline-flex size-10 items-center justify-center rounded-full text-primary-dark hover:bg-surface-alt disabled:opacity-30"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <h4 id={titleId} className="font-serif text-lg capitalize" aria-live="polite">
          {formatAR(noonAR(`${month}-01`), "MMMM yyyy")}
        </h4>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          disabled={month >= maxMonth}
          className="inline-flex size-10 items-center justify-center rounded-full text-primary-dark hover:bg-surface-alt disabled:opacity-30"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      <table ref={gridRef} role="grid" aria-labelledby={titleId} className="w-full table-fixed border-collapse text-center">
        <thead>
          <tr>
            {WEEKDAYS.map((d) => (
              <th key={d.short} scope="col" abbr={d.long} className="pb-2 text-xs font-medium uppercase text-muted">
                {d.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((key, di) => {
                if (!key) return <td key={`e-${di}`} />;
                const isAvailable = available.has(key);
                const isSelected = selected === key;
                const isToday = key === todayKey;
                return (
                  <td key={key} role="gridcell" aria-selected={isSelected} className="p-0.5">
                    <button
                      type="button"
                      data-key={key}
                      tabIndex={key === tabKey ? 0 : -1}
                      aria-disabled={!isAvailable}
                      aria-current={isToday ? "date" : undefined}
                      aria-label={`${formatAR(noonAR(key), "EEEE d 'de' MMMM")}${isAvailable ? ", con horarios disponibles" : ", sin horarios"}`}
                      onClick={() => {
                        setFocusKey(key);
                        if (isAvailable) onSelect(key);
                      }}
                      onKeyDown={(e) => onKeyDown(e, key)}
                      className={cn(
                        "mx-auto flex aspect-square w-full max-w-11 items-center justify-center rounded-full text-[0.9375rem] tabular-nums transition-colors",
                        isAvailable
                          ? "font-medium text-text hover:bg-surface-alt"
                          : "cursor-default text-muted/60 line-through decoration-transparent",
                        isAvailable && !isSelected && "bg-surface-alt/60",
                        isSelected && "bg-primary text-on-primary hover:bg-primary-dark",
                        isToday && !isSelected && "ring-1 ring-accent",
                      )}
                    >
                      {Number(key.slice(8))}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
