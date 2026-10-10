import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const data = await readFile(join(process.cwd(), "public/avatar.jpg"));
  const src = `data:image/jpeg;base64,${data.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          borderRadius: "50%",
          overflow: "hidden",
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
