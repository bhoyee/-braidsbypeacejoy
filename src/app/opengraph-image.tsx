import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The preview card shown when the site is shared on Facebook, Instagram DMs,
// WhatsApp, iMessage, X, LinkedIn, Google Discover, etc.
export const alt = "Braids by Peace Joy — luxury braiding studio in Randallstown, MD";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function asDataUri(file: string, mime: string) {
  const buf = await readFile(join(process.cwd(), "public", "assets", file));
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export default async function OpengraphImage() {
  const [logo, photo] = await Promise.all([asDataUri("og-logo.png", "image/png"), asDataUri("og-photo.jpg", "image/jpeg")]);

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#0b1a4a" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 760, padding: "56px 64px", color: "white" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={150} height={150} alt="" />
          <div style={{ display: "flex", marginTop: 20, fontSize: 68, fontWeight: 700, letterSpacing: -1 }}>Braids by Peace Joy</div>
          <div style={{ display: "flex", marginTop: 10, fontSize: 30, color: "#ffc72c" }}>Luxury Braiding Studio · Adults &amp; Kids</div>
          <div style={{ display: "flex", marginTop: 34, fontSize: 24, color: "rgba(255,255,255,0.8)" }}>
            8700 Liberty Rd, Suite 101 · Randallstown, MD
          </div>
          <div style={{ display: "flex", marginTop: 8, fontSize: 24, color: "rgba(255,255,255,0.8)" }}>Open 7 days · 8 AM – 7 PM · 410-671-1788</div>
          <div
            style={{
              display: "flex",
              marginTop: 34,
              alignSelf: "flex-start",
              background: "#ffc72c",
              color: "#040b26",
              fontSize: 26,
              fontWeight: 700,
              padding: "14px 30px",
              borderRadius: 999,
            }}
          >
            Book online →
          </div>
        </div>
        <div style={{ display: "flex", position: "relative", width: 440, height: "100%", borderLeft: "6px solid #ffc72c" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} width={440} height={630} alt="" style={{ objectFit: "cover", width: 440, height: 630 }} />
        </div>
      </div>
    ),
    size,
  );
}
