"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/lib/content/schemas";

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <Accordion.Root type="multiple" className="divide-y divide-border rounded-[var(--radius-card)] border border-border bg-surface">
      {items.map((item, i) => (
        <Accordion.Item key={item.question} value={`q-${i}`}>
          <Accordion.Header asChild>
            <h3 className="font-sans text-base">
              <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-[1.0625rem] font-medium hover:text-primary-dark sm:px-6">
                {item.question}
                <ChevronDown
                  className="size-5 shrink-0 text-primary transition-transform duration-200 group-data-[state=open]:rotate-180"
                  strokeWidth={1.6}
                  aria-hidden="true"
                />
              </Accordion.Trigger>
            </h3>
          </Accordion.Header>
          <Accordion.Content className="px-5 pb-5 text-muted sm:px-6">{item.answer}</Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
