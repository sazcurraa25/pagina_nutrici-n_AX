import { whatsappUrl } from "@/lib/content";
import { WhatsAppIcon } from "@/components/ui/icons";

export function WhatsAppFab() {
  return (
    <a
      href={whatsappUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribime por WhatsApp (se abre en una pestaña nueva)"
      className="fixed bottom-5 right-5 z-30 inline-flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-[var(--shadow-soft)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-primary-dark"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
