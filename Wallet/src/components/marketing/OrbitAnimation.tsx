import type { CSSProperties } from "react";
import { WalletMark } from "@/components/brand/WalletMark";

function OrbitNode({
  angle,
  radius,
  spin,
  size,
  children,
}: {
  angle: number;
  radius: number;
  spin: "cw" | "ccw";
  size: number;
  children: React.ReactNode;
}) {
  const duration = radius === 90 ? 26 : radius === 160 ? 36 : 48;
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: `rotate(${angle}deg) translate(${radius}px) rotate(${-angle}deg)`,
      }}
    >
      <div style={{ animation: `${spin === "cw" ? "spin-cw" : "spin-ccw"} ${duration}s linear infinite` }}>
        <div
          style={{
            width: size,
            height: size,
            margin: `${-size / 2}px 0 0 ${-size / 2}px`,
            borderRadius: "50%",
            background: "var(--panel2)",
            border: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--fg)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function OrbitDot({
  angle,
  radius,
  color,
  duration,
}: {
  angle: number;
  radius: number;
  color: string;
  duration: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: `rotate(${angle}deg) translate(${radius}px) rotate(${-angle}deg)`,
        width: 8,
        height: 8,
        margin: "-4px 0 0 -4px",
        borderRadius: "50%",
        background: color,
        animation: `pulse-dot ${duration}s ease-in-out infinite`,
      }}
    />
  );
}

export function OrbitAnimation() {
  return (
    <div
      style={{
        position: "relative",
        width: 460,
        height: 460,
        maxWidth: "100%",
        flex: "0 0 auto",
        margin: "0 auto",
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 180, height: 180, margin: "-90px 0 0 -90px", border: "1px solid var(--line)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 320, height: 320, margin: "-160px 0 0 -160px", border: "1px solid var(--line)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 460, height: 460, margin: "-230px 0 0 -230px", border: "1px solid var(--line)", borderRadius: "50%" }} />

        {/* ring 1: bank icon, r=90 */}
        <div style={{ position: "absolute", inset: 0, animation: "spin-cw 26s linear infinite" }}>
          <OrbitNode angle={200} radius={90} spin="ccw" size={58}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--fg)" strokeWidth={1.8}>
              <path d="M3 10l9-6 9 6M4 10v9M20 10v9M8 19v-6M12 19v-6M16 19v-6M2 21h20" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </OrbitNode>
          <OrbitDot angle={20} radius={90} color="var(--green)" duration={3} />
        </div>

        {/* ring 2: people + rupee, r=160, reverse */}
        <div style={{ position: "absolute", inset: 0, animation: "spin-ccw 36s linear infinite" }}>
          <OrbitNode angle={50} radius={160} spin="cw" size={64}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="var(--fg)" strokeWidth={1.8}>
              <path d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM21 20v-1a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </OrbitNode>
          <OrbitNode angle={230} radius={160} spin="cw" size={56}>
            ₹
          </OrbitNode>
          <OrbitDot angle={140} radius={160} color="rgba(255,255,255,0.7)" duration={4} />
        </div>

        {/* ring 3: avatar + rupee, r=230 */}
        <div style={{ position: "absolute", inset: 0, animation: "spin-cw 48s linear infinite" }}>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "rotate(100deg) translate(230px) rotate(-100deg)",
            }}
          >
            <div style={{ animation: "spin-ccw 48s linear infinite" }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  margin: "-30px 0 0 -30px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#3a3a34,#1b1b18)",
                  border: "1px solid var(--line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--green)",
                }}
              >
                AK
              </div>
            </div>
          </div>
          <OrbitNode angle={300} radius={230} spin="ccw" size={56}>
            ₹
          </OrbitNode>
          <OrbitDot angle={30} radius={230} color="var(--green)" duration={5} />
          <OrbitDot angle={190} radius={230} color="rgba(255,255,255,0.6)" duration={3.5} />
        </div>
      </div>

      {/* center node */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 5 }}>
        <div style={{ animation: "float-y 5s ease-in-out infinite" }}>
          <div
            style={{
              width: 104,
              height: 104,
              borderRadius: "50%",
              background: "var(--green)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 60px 10px var(--green-dim)",
            }}
          >
            <WalletMark
              style={
                {
                  width: 40,
                  height: 32,
                  color: "#0a0a09",
                  "--gold": "#0a0a09",
                } as CSSProperties
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
