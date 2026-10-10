import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { siteConfig } from "@/lib/data";

export const alt = `${siteConfig.name} - ${siteConfig.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const data = await readFile(join(process.cwd(), "public/avatar.jpg"));
  const avatarSrc = `data:image/jpeg;base64,${data.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "80px",
          background: "#050505",
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(42,111,182,0.35), transparent 55%), radial-gradient(circle at 90% 80%, rgba(205,71,71,0.25), transparent 55%)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 260,
            height: 260,
            borderRadius: 48,
            overflow: "hidden",
            border: "4px solid rgba(42,111,182,0.55)",
            marginRight: 64,
            flexShrink: 0,
          }}
        >
          <img
            src={avatarSrc}
            alt=""
            width={260}
            height={260}
            style={{ objectFit: "cover" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 26,
              color: "#cd4747",
              marginBottom: 18,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {siteConfig.role}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 700,
              color: "#e2e8f0",
              lineHeight: 1.1,
              marginBottom: 22,
            }}
          >
            {siteConfig.name} Kalari
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: "#94a3b8",
              maxWidth: 760,
              lineHeight: 1.4,
            }}
          >
            Building production data pipelines & intelligent systems on the
            Databricks Lakehouse.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
