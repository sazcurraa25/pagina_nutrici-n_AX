import type { Metadata } from "next";
import { profile } from "@/lib/content";
import { ConfirmationView } from "./confirmation-view";

export const metadata: Metadata = {
  title: "Turno confirmado",
  robots: { index: false, follow: false },
};

export default function ConfirmadoPage() {
  return (
    <div className="container-site py-16 sm:py-24">
      <ConfirmationView
        address={`${profile.address.street}, ${profile.address.city}`}
        professional={profile.name}
      />
    </div>
  );
}
