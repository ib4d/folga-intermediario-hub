import { ImageResponse } from "next/og";

export const alt = "ORI CRUIT HUB — International recruitment operations";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "58px", background: "#080908", color: "#f6f6f0", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 18, letterSpacing: 2 }}>
        <span style={{ color: "#e4ff4d", fontWeight: 700 }}>ORI CRUIT HUB</span>
        <span style={{ color: "#bac1b1", fontFamily: "monospace", fontSize: 15 }}>EUROPE ↔ LATAM</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 920 }}>
        <div style={{ fontSize: 66, lineHeight: 1.02, letterSpacing: -4 }}>Recruitment operations.</div>
        <div style={{ color: "#e4ff4d", fontSize: 66, lineHeight: 1.02, letterSpacing: -4 }}>One clear workflow.</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: "monospace", color: "#bac1b1", fontSize: 16 }}>
        <span style={{ width: 36, height: 2, background: "#e4ff4d" }} />CANDIDATES / DOCUMENTS / REVIEW / ARRIVALS
      </div>
    </div>,
    size
  );
}
