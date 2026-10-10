"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Reveal, { StaggerGroup, StaggerItem } from "@/components/Reveal";
import { about, capabilities, education, languages, siteConfig, type Capability } from "@/lib/data";
import {
  Bot,
  Brain,
  Code2,
  Download,
  GraduationCap,
  MapPin,
  Palette,
} from "lucide-react";

const capabilityIcon: Record<Capability["icon"], typeof Code2> = {
  code: Code2,
  brain: Brain,
  automation: Bot,
  design: Palette,
};

const highlightTone: Record<string, "blue" | "red"> = {
  Python: "red",
  Databricks: "blue",
  React: "blue",
};

const toneText = { blue: "text-accent", red: "text-accent-2" };
const toneBorder = { blue: "border-accent/30", red: "border-accent-2/30" };
const toneDot = { blue: "bg-accent", red: "bg-accent-2" };

function renderHighlighted(text: string) {
  const words = Object.keys(highlightTone);
  const pattern = new RegExp(`(${words.join("|")})`, "g");
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const tone = highlightTone[part];
    if (!tone) return <span key={i}>{part}</span>;
    return (
      <span key={i} className={`font-semibold ${toneText[tone]}`}>
        {part}
      </span>
    );
  });
}

export default function About() {
  return (
    <section id="about" className="scroll-mt-24 py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <Reveal>
          <div className="text-center">
            <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              About <span className="text-gradient">Me</span>
            </h2>
            <div className="mx-auto mt-3 h-0.5 w-16 bg-accent-2" />
            <p className="mx-auto mt-6 max-w-xl text-sm text-muted">
              {about.eyebrowNote}
            </p>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-8 lg:grid-cols-5 lg:items-stretch">
          <Reveal className="lg:col-span-2">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-accent/20 bg-surface">
              <Image
                src={siteConfig.avatarUrl}
                alt={siteConfig.name}
                fill
                sizes="(min-width: 1024px) 32rem, 90vw"
                className="object-cover"
                priority
              />

              <span className="hud-corner hud-corner--tl" />
              <span className="hud-corner hud-corner--tr" />
              <span className="hud-corner hud-corner--bl" />
              <span className="hud-corner hud-corner--br" />

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="glass absolute top-1/3 left-4 rounded-lg border border-emerald-400/30 px-3 py-1.5"
              >
                <p className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Systems Online
                </p>
              </motion.div>

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 pt-16">
                <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium tracking-wide text-emerald-400 uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Available for hire
                </span>
                <p className="font-display text-2xl font-bold text-white">
                  {siteConfig.name} Kalari
                </p>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-300">
                  <MapPin size={13} />
                  {siteConfig.location}
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-3">
            <div className="relative flex h-full flex-col rounded-3xl border border-border bg-surface p-8">
              <a
                href={siteConfig.resumeUrl}
                download
                className="absolute top-6 right-6 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-medium tracking-wide text-muted uppercase transition-colors hover:border-accent hover:text-accent"
              >
                <Download size={12} />
                Load Full Profile
              </a>

              <h3 className="max-w-md font-display text-2xl font-bold leading-tight sm:text-3xl">
                {about.headline.map((line, i) => (
                  <span
                    key={i}
                    className={`block ${line.tone === "blue" ? "text-accent" : "text-foreground"}`}
                  >
                    {line.text}
                  </span>
                ))}
              </h3>

              <div className="mt-6 space-y-4">
                {about.summary.map((paragraph, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted sm:text-base">
                    {renderHighlighted(paragraph)}
                  </p>
                ))}
              </div>

              <div className="mt-auto grid grid-cols-2 gap-6 border-t border-border pt-6 sm:grid-cols-4">
                {about.stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="font-display text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-[11px] tracking-wide text-muted uppercase">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {languages.map((language) => (
              <span
                key={language.name}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground"
              >
                <span className="text-base">{language.flag}</span>
                {language.name}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
              <GraduationCap size={16} className="text-accent" />
              Education
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {education.map((item) => (
                <div key={item.school} className="border-l-2 border-border pl-4">
                  <p className="text-sm font-medium text-foreground">{item.school}</p>
                  <p className="mt-1 text-sm text-muted">
                    {item.degree}
                    {item.detail ? ` · ${item.detail}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted">{item.period}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <StaggerGroup className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((cap) => {
            const Icon = capabilityIcon[cap.icon];
            return (
              <StaggerItem key={cap.title}>
                <div
                  className={`h-full rounded-2xl border ${toneBorder[cap.tone]} bg-surface p-6 transition-colors hover:border-opacity-60`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <Icon size={22} className={toneText[cap.tone]} />
                    <span
                      className={`rounded-full border ${toneBorder[cap.tone]} px-2.5 py-1 text-[10px] font-medium tracking-wide ${toneText[cap.tone]} uppercase`}
                    >
                      {cap.tag}
                    </span>
                  </div>
                  <h4 className="font-display text-lg font-semibold text-foreground">
                    {cap.title}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {cap.description}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {cap.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-center gap-2 text-xs text-muted">
                        <span className={`h-1 w-1 rounded-full ${toneDot[cap.tone]}`} />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </div>
    </section>
  );
}
