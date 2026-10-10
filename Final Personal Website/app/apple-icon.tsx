import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const data = await readFile(join(process.cwd(), "public/avatar.jpg"));
  const src = `data:image/jpeg;base64,${data.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#050505",
        }}
      >
        <img
          src={src}
          alt=""
          width={size.width}
          height={size.height}
          style={{ objectFit: "cover" }}
        />
      </div>
    ),
    { ...size }
  );
}
