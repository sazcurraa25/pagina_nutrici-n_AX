import { ImageResponse } from "next/og";
import { profile } from "@/lib/content";

export const alt = `${profile.name} · ${profile.shortTitle}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Imagen de Open Graph (la que se ve al compartir el link). Paleta "consultorio luminoso".
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FAF7F2",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "999px",
              background: "#5B7B65",
              display: "flex",
            }}
          />
          <span style={{ fontSize: "30px", color: "#6E675F", letterSpacing: "0.08em" }}>
            {profile.shortTitle.toUpperCase()} · {profile.license}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "84px", color: "#2E2A26", fontWeight: 600, lineHeight: 1.05 }}>
            {profile.name}
          </span>
          <span style={{ fontSize: "38px", color: "#3F5A48", marginTop: "24px", maxWidth: "900px" }}>
            {profile.tagline}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "28px", color: "#9A5A3C" }}>
          <div style={{ width: "40px", height: "4px", background: "#C9805E" }} />
          Consultas presenciales en {profile.address.city} y online
        </div>
      </div>
    ),
    size,
  );
}
