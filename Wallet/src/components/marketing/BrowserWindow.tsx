import type { ReactNode } from "react";

const CHROME = {
  barBg: "#202124",
  tabBg: "#35363a",
  text: "#e8eaed",
  dim: "#9aa0a6",
  urlBg: "#282a2d",
};

export function BrowserWindow({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 800,
        aspectRatio: "800 / 500",
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        background: CHROME.tabBg,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 34,
          background: CHROME.barBg,
          paddingLeft: 14,
          gap: 8,
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
      </div>
      <div
        style={{
          height: 32,
          background: CHROME.tabBg,
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
        }}
      >
        <div
          style={{
            flex: 1,
            height: 22,
            borderRadius: 11,
            background: CHROME.urlBg,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 12px",
          }}
        >
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: CHROME.dim, opacity: 0.4 }} />
          <span
            style={{
              color: CHROME.text,
              fontSize: 12,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {url}
          </span>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
    </div>
  );
}
