"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRef, type MouseEvent } from "react";
import { ArrowDown, ArrowUpRight, Download } from "lucide-react";
import MagneticButton from "@/components/MagneticButton";
import BlobBackground from "@/components/BlobBackground";
import { heroHeadline, heroSubPhrases, siteConfig } from "@/lib/data";

const toneClass = {
  blue: "text-accent",
  red: "text-accent-2",
  neutral: "text-foreground/70",
};

export default function Hero() {
  const spotlightRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    spotlightRef.current?.style.setProperty("--x", `${x}%`);
    spotlightRef.current?.style.setProperty("--y", `${y}%`);
  }

  function handleMouseEnter() {
    spotlightRef.current?.style.setProperty("opacity", "1");
  }

  function handleMouseLeave() {
    spotlightRef.current?.style.setProperty("opacity", "0");
  }

  return (
    <section
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex min-h-[92vh] items-center justify-center overflow-hidden bg-grid text-center"
    >
      <BlobBackground className="opacity-80" />
      <div
        ref={spotlightRef}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(500px circle at var(--x, 50%) var(--y, 50%), rgba(42,111,182,0.16), transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, transparent 60%, var(--background) 100%)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-32 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium tracking-[0.1em] text-muted uppercase"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent-2 animate-pulse" />
          Open to new opportunities
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
        >
          {heroHeadline.map((word, i) => (
            <span key={i} className={`${toneClass[word.tone]} mr-4 last:mr-0`}>
              {word.text}
            </span>
          ))}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-base sm:text-lg"
        >
          {heroSubPhrases.map((phrase, i) => (
            <span key={i} className="flex items-center gap-3">
              <span className={toneClass[phrase.tone]}>{phrase.text}</span>
              {i < heroSubPhrases.length - 1 && (
                <span className="text-muted">&middot;</span>
              )}
            </span>
          ))}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
        >
          <MagneticButton>
            <Link
              href="/#projects"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-7 py-3.5 text-sm font-semibold tracking-wide text-background transition-transform hover:scale-[1.03]"
            >
              <span className="shine-sweep" />
              View Portfolio
              <ArrowUpRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </MagneticButton>

          <MagneticButton>
            <a
              href={siteConfig.resumeUrl}
              download
              className="group inline-flex items-center gap-2 rounded-full bg-surface px-7 py-3.5 text-sm font-semibold tracking-wide text-foreground ring-1 ring-border transition-colors hover:ring-accent"
            >
              Download Resume
              <Download
                size={15}
                className="transition-transform group-hover:translate-y-0.5"
              />
            </a>
          </MagneticButton>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{
          opacity: { duration: 0.6, delay: 0.8 },
          y: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted"
      >
        <ArrowDown size={18} />
      </motion.div>
    </section>
  );
}
