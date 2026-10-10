"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import {
  platformSkills,
  skillIconGroups,
  type IconIdentifier,
  type IconSkillGroup,
} from "@/lib/data";
import { BarChart3, Cloud, Code2, Database, Layers, Server, Wrench } from "lucide-react";

const categoryIcon: Record<IconSkillGroup["icon"], typeof Database> = {
  database: Database,
  code: Code2,
  cloud: Cloud,
  layers: Layers,
  server: Server,
  wrench: Wrench,
  chart: BarChart3,
};

function iconSrc(skill: IconIdentifier) {
  if (!skill.slug) return null;
  if (skill.source === "simple") {
    return `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${skill.slug}.svg`;
  }
  return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${skill.slug}/${skill.slug}-${skill.variant ?? "original"}.svg`;
}

const cardClass =
  "group relative mb-6 break-inside-avoid overflow-hidden rounded-2xl border border-border bg-surface/60 p-6 shadow-lg backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_0_30px_rgba(42,111,182,0.15)]";

export default function Skills() {
  return (
    <section id="skills" className="scroll-mt-24 bg-background-alt py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <SectionHeading
          eyebrow="Tech Arsenal"
          title="Skills"
          description="Here's what I typically work with, grouped by where it fits in the stack."
        />

        <div className="mt-14 columns-1 gap-6 md:columns-2 lg:columns-3">
          {skillIconGroups.map((group, i) => {
            const Icon = categoryIcon[group.icon];
            return (
              <Reveal key={group.title} delay={(i % 3) * 0.06}>
                <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25 }} className={cardClass}>
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />

                  <div className="relative z-10 mb-5 flex items-center justify-between border-b border-accent/20 pb-3">
                    <div className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-foreground">
                      <Icon size={17} className="text-accent-2" />
                      {group.title}
                    </div>
                  </div>

                  <ul className="relative z-10 grid grid-cols-4 place-items-center gap-4 sm:grid-cols-5">
                    {group.skills.map((skill) => {
                      const src = iconSrc(skill);
                      return (
                        <li
                          key={skill.name}
                          className="group/tech relative flex w-full cursor-default flex-col items-center gap-1.5 rounded-xl p-1.5 text-center transition-colors duration-300 hover:bg-white/5"
                        >
                          <div className="relative flex h-8 w-8 items-center justify-center">
                            {src ? (
                              <Image
                                src={src}
                                alt={skill.name}
                                fill
                                sizes="32px"
                                className="object-contain transition-transform duration-300 group-hover/tech:scale-110"
                              />
                            ) : (
                              <BarChart3
                                size={20}
                                className="text-muted transition-transform duration-300 group-hover/tech:scale-110 group-hover/tech:text-accent-2"
                              />
                            )}
                          </div>
                          <span className="text-[9px] font-medium leading-tight text-muted transition-colors duration-300 group-hover/tech:text-foreground">
                            {skill.name}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              </Reveal>
            );
          })}

          <Reveal delay={0.1}>
            <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25 }} className={cardClass}>
              <div className="relative z-10 mb-5 flex items-center justify-between border-b border-accent/20 pb-3">
                <div className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-foreground">
                  <Database size={17} className="text-accent-2" />
                  Databricks Lakehouse
                </div>
              </div>
              <div className="relative z-10 flex flex-wrap gap-2">
                {platformSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-accent/25 bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent-2 transition-colors hover:bg-accent/20"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </motion.div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
