import Link from "next/link";
import { Sprout } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-site flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <Sprout className="size-12 text-primary" strokeWidth={1.2} aria-hidden="true" />
      <p className="eyebrow mt-6">Error 404</p>
      <h1 className="mt-2 text-[length:var(--text-h2)]">Esta página no existe</h1>
      <p className="mt-4 max-w-md text-muted">
        Puede que el link esté incompleto o que la página se haya movido. Volvé al inicio para seguir navegando.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className={buttonClasses("primary")}>
          Ir al inicio
        </Link>
        <Link href="/#turnos" className={buttonClasses("secondary")}>
          Reservar turno
        </Link>
      </div>
    </div>
  );
}
