import type { CSSProperties } from "react";
import Link from "next/link";
import { GreenMarkChip } from "./GreenMarkChip";
import { OrbitAnimation } from "./OrbitAnimation";
import { BrowserWindow } from "./BrowserWindow";

const vars = {
  "--bg": "#0a0a09",
  "--panel": "#131311",
  "--panel2": "#1b1b18",
  "--line": "rgba(255,255,255,0.1)",
  "--green": "#a6ff2e",
  "--green-dim": "rgba(166,255,46,0.14)",
  "--fg": "#f4f4ef",
  "--muted": "#9a9a91",
} as CSSProperties;

const archivo = { fontFamily: "var(--font-archivo-black), sans-serif" } as CSSProperties;

const features = [
  {
    title: "Expense tracking",
    desc: "Every rupee categorized automatically, so you always know where it went.",
    icon: (
      <path d="M3 3v18h18M7 15l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Investment portfolio",
    desc: "SIPs, stocks, gold and more, all tracked against real returns.",
    icon: <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" />,
  },
  {
    title: "Net worth tracking",
    desc: "Assets minus liabilities, updated the moment anything changes.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4.5" />
      </>
    ),
  },
  {
    title: "Goals",
    desc: "Set a target, get a monthly number, and watch the progress bar fill.",
    icon: (
      <>
        <path d="M12 2v20M2 12h20" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" />
      </>
    ),
  },
  {
    title: "EPF & retirement",
    desc: "Employee and employer contributions, interest and balance in one view.",
    icon: <path d="M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-4Z" strokeLinejoin="round" />,
  },
  {
    title: "Smart insights",
    desc: "Monthly summaries that flag what changed and why it matters.",
    icon: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinejoin="round" />,
  },
];

const team = [
  { initials: "RS", name: "Ravi Shah", role: "Co-founder, Product" },
  { initials: "AN", name: "Anika Nair", role: "Co-founder, Engineering" },
  { initials: "DK", name: "Dev Kapoor", role: "Design" },
  { initials: "MJ", name: "Maya Joseph", role: "Data & Insights" },
];

const stats = [
  { label: "NET WORTH", value: "₹84,210", change: "6.2%", up: true },
  { label: "MONTHLY INCOME", value: "₹6,400", change: "2.1%", up: true },
  { label: "MONTHLY EXPENSES", value: "₹3,180", change: "1.4%", up: false },
  { label: "INVESTMENTS", value: "₹41,900", change: "8.7%", up: true },
];

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#about", label: "About" },
];

export function LandingPage() {
  return (
    <div
      style={{
        ...vars,
        background: "var(--bg)",
        color: "var(--fg)",
        minHeight: "100vh",
      }}
    >
      {/* NAV */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(10,10,9,0.85)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--line)",
        }}
        className="flex items-center justify-between px-6 py-5 sm:px-14"
      >
        <div className="flex items-center gap-2.5">
          <GreenMarkChip size={34} />
          <span style={{ ...archivo, fontSize: 16, letterSpacing: "0.5px" }}>WALLET</span>
        </div>
        <nav
          className="hidden items-center gap-9 md:flex"
          style={{ fontSize: 14, color: "var(--muted)" }}
        >
          <Link href="#product" style={{ color: "var(--fg)" }}>
            Product
          </Link>
          {navLinks.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
          <Link href="/login" style={{ color: "var(--fg)" }}>
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg"
            style={{
              background: "var(--green)",
              color: "#0a0a09",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.06em",
              padding: "11px 20px",
            }}
          >
            SIGN UP <span style={{ fontSize: 15 }}>&rarr;</span>
          </Link>
        </nav>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-lg md:hidden"
          style={{
            background: "var(--green)",
            color: "#0a0a09",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: "0.06em",
            padding: "9px 14px",
          }}
        >
          SIGN UP
        </Link>
      </header>

      {/* HERO */}
      <section
        id="product"
        className="relative flex flex-wrap items-center justify-center gap-10 overflow-hidden px-6 py-20 sm:px-14 sm:py-28"
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(600px 400px at 78% 45%, var(--green-dim), transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div className="relative flex-1 basis-[480px]" style={{ maxWidth: 620 }}>
          <div
            className="mb-7 inline-flex items-center gap-2 rounded-full"
            style={{
              padding: "6px 14px",
              border: "1px solid var(--line)",
              fontSize: 12,
              color: "var(--muted)",
              letterSpacing: "0.04em",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--green)",
              }}
            />
            BUILT FOR WORKING PROFESSIONALS
          </div>
          <h1
            style={{
              ...archivo,
              fontSize: "clamp(40px, 7vw, 76px)",
              lineHeight: 0.98,
              letterSpacing: "-0.01em",
              margin: "0 0 28px",
            }}
          >
            KNOW WHERE
            <br />
            YOUR MONEY
            <br />
            <span style={{ color: "var(--green)" }}>REALLY GOES</span>
          </h1>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.6,
              color: "var(--muted)",
              maxWidth: 480,
              margin: "0 0 36px",
            }}
          >
            Track spending, income and investments in one place. See your net worth move in real
            time and hit your goals faster.
          </p>
          <div className="flex flex-wrap items-center gap-5">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2.5 rounded-[10px]"
              style={{
                background: "var(--green)",
                color: "#0a0a09",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "0.05em",
                padding: "16px 28px",
              }}
            >
              GET STARTED <span style={{ fontSize: 16 }}>&rarr;</span>
            </Link>
            <a
              href="#dashboard-preview"
              style={{
                fontSize: 14,
                color: "var(--fg)",
                borderBottom: "1px solid var(--line)",
                paddingBottom: 2,
              }}
            >
              See how it works
            </a>
          </div>
        </div>

        <OrbitAnimation />
      </section>

      {/* DASHBOARD PREVIEW */}
      <section id="dashboard-preview" className="px-4 pb-24 sm:pb-32">
        <div className="mx-auto mb-14 max-w-xl text-center">
          <h2 style={{ ...archivo, fontSize: 40, letterSpacing: "-0.01em", margin: "0 0 16px" }}>
            SEE EVERYTHING
            <br />
            IN ONE PLACE
          </h2>
          <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
            Income, expenses, investments and net worth — one dashboard, always up to date.
          </p>
        </div>
        <div className="flex justify-center">
          <div style={{ boxShadow: "0 40px 100px rgba(0,0,0,0.55)", borderRadius: 12, maxWidth: "100%" }}>
            <BrowserWindow url="app.wallet.money/dashboard">
              <div
                style={{
                  background: "#0e0e0c",
                  height: "100%",
                  display: "flex",
                  color: "#f4f4ef",
                }}
                className="text-[10px] sm:text-[13px]"
              >
                <div
                  className="hidden shrink-0 flex-col gap-1 sm:flex"
                  style={{ width: 190, borderRight: "1px solid var(--line)", padding: "20px 14px" }}
                >
                  <div style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--muted)", padding: "0 10px 12px" }}>
                    MENU
                  </div>
                  {["Dashboard", "Income", "Expenses", "Investments", "Net Worth", "Goals", "EPF"].map(
                    (item, i) => (
                      <div
                        key={item}
                        style={{
                          padding: "9px 10px",
                          borderRadius: 7,
                          fontSize: 13,
                          fontWeight: i === 0 ? 600 : 400,
                          background: i === 0 ? "var(--green-dim)" : "transparent",
                          color: i === 0 ? "var(--green)" : "var(--muted)",
                        }}
                      >
                        {item}
                      </div>
                    )
                  )}
                </div>
                <div className="flex-1 overflow-hidden p-4 sm:p-7">
                  <div className="mb-4 flex items-center justify-between">
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Good afternoon, Arjun</div>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: "var(--panel2)",
                        border: "1px solid var(--line)",
                      }}
                    />
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                    {stats.map((s) => (
                      <div
                        key={s.label}
                        style={{
                          background: "var(--panel)",
                          border: "1px solid var(--line)",
                          borderRadius: 10,
                          padding: 14,
                        }}
                      >
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
                          {s.label}
                        </div>
                        <div style={{ fontSize: 19, fontWeight: 700 }}>{s.value}</div>
                        <div
                          style={{
                            fontSize: 11,
                            color: s.up ? "var(--green)" : "#ff6b6b",
                            marginTop: 4,
                          }}
                        >
                          &uarr; {s.change}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[1.6fr_1fr]" style={{ height: 230 }}>
                    <div
                      style={{
                        background: "var(--panel)",
                        border: "1px solid var(--line)",
                        borderRadius: 10,
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                        NET WORTH GROWTH
                      </div>
                      <svg width="100%" height="150" viewBox="0 0 420 140" preserveAspectRatio="none">
                        <polyline
                          points="0,110 60,95 120,100 180,70 240,75 300,40 360,45 420,20"
                          fill="none"
                          stroke="#a6ff2e"
                          strokeWidth={2.5}
                        />
                        <polygon
                          points="0,110 60,95 120,100 180,70 240,75 300,40 360,45 420,20 420,140 0,140"
                          fill="rgba(166,255,46,0.12)"
                        />
                      </svg>
                    </div>
                    <div
                      className="hidden sm:flex"
                      style={{
                        background: "var(--panel)",
                        border: "1px solid var(--line)",
                        borderRadius: 10,
                        padding: 16,
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10, alignSelf: "flex-start" }}>
                        SPEND BY CATEGORY
                      </div>
                      <svg width="110" height="110" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#26261f" strokeWidth={4} />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.5"
                          fill="none"
                          stroke="#a6ff2e"
                          strokeWidth={4}
                          strokeDasharray="35 65"
                          strokeDashoffset="25"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.5"
                          fill="none"
                          stroke="#6b7280"
                          strokeWidth={4}
                          strokeDasharray="22 78"
                          strokeDashoffset="-10"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.5"
                          fill="none"
                          stroke="#3a3a34"
                          strokeWidth={4}
                          strokeDasharray="18 82"
                          strokeDashoffset="-32"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </BrowserWindow>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-6 pb-24 sm:px-14 sm:pb-32">
        <div className="mx-auto mb-14 max-w-xl text-center">
          <h2 style={{ ...archivo, fontSize: 40, letterSpacing: "-0.01em", margin: "0 0 16px" }}>
            EVERYTHING YOU NEED
            <br />
            TO <span style={{ color: "var(--green)" }}>STAY IN CONTROL</span>
          </h2>
        </div>
        <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: 14,
                padding: 28,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: "var(--green-dim)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth={1.8}>
                  {f.icon}
                </svg>
              </div>
              <h3 style={{ fontSize: 17, margin: "0 0 8px" }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT / TEAM */}
      <section id="about" className="px-6 pb-24 sm:px-14 sm:pb-32">
        <div className="mx-auto mb-14 max-w-xl text-center">
          <h2 style={{ ...archivo, fontSize: 40, letterSpacing: "-0.01em", margin: "0 0 16px" }}>
            BUILT BY PEOPLE WHO
            <br />
            <span style={{ color: "var(--green)" }}>TRACK THEIR OWN MONEY</span>
          </h2>
          <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
            We got tired of spreadsheets and scattered apps, so we built the dashboard we wished
            we had.
          </p>
        </div>
        <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-5 sm:grid-cols-4">
          {team.map((m) => (
            <div key={m.initials} className="text-center">
              <div
                className="mx-auto mb-4"
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#2a2a24,#131311)",
                  border: "1px solid var(--line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--green)",
                }}
              >
                {m.initials}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{m.name}</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>{m.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER CTA */}
      <section
        className="px-6 py-20 text-center sm:px-14"
        style={{ borderTop: "1px solid var(--line)" }}
      >
        <h2 style={{ ...archivo, fontSize: "clamp(30px, 5vw, 44px)", letterSpacing: "-0.01em", margin: "0 0 28px" }}>
          START MANAGING
          <br />
          <span style={{ color: "var(--green)" }}>YOUR MONEY TODAY</span>
        </h2>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2.5 rounded-[10px]"
          style={{
            background: "var(--green)",
            color: "#0a0a09",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "0.05em",
            padding: "16px 30px",
          }}
        >
          GET STARTED FREE <span style={{ fontSize: 16 }}>&rarr;</span>
        </Link>
        <div
          className="mt-20 flex flex-col items-center justify-between gap-4 pt-7 sm:flex-row"
          style={{ borderTop: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}
        >
          <div className="flex items-center gap-2">
            <GreenMarkChip size={22} />
            <span style={{ ...archivo, fontSize: 13 }}>WALLET</span>
          </div>
          <div>&copy; 2026 Wallet. All rights reserved.</div>
        </div>
      </section>
    </div>
  );
}
