"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { StaggerGroup, StaggerItem } from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import { projectFilters, projects } from "@/lib/data";
import { ArrowUpRight } from "lucide-react";

export default function Projects() {
  const [filter, setFilter] = useState<(typeof projectFilters)[number]>("All");

  const filtered = useMemo(
    () => (filter === "All" ? projects : projects.filter((p) => p.filterTag === filter)),
    [filter]
  );

  return (
    <section id="projects" className="scroll-mt-24 py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <SectionHeading
          eyebrow="Projects"
          title="Things I've built"
          description="A mix of production data engineering, applied machine learning, and full-stack products."
        />

        <div className="mt-10 flex flex-wrap gap-2">
          {projectFilters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-accent text-white"
                  : "border border-border text-muted hover:border-accent/40 hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <StaggerGroup className="mt-10 grid gap-6 sm:grid-cols-2">
          {filtered.map((project) => (
            <StaggerItem key={project.slug}>
              <motion.article
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25 }}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface p-7"
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(400px circle at var(--x,50%) var(--y,0%), rgba(42,111,182,0.1), transparent 60%)",
                  }}
                />

                <div className="relative">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    {project.year ? (
                      <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted">
                        {project.year}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="rounded-full border border-accent-2/30 bg-accent-2/10 px-3 py-1 text-[11px] font-medium tracking-wide text-accent-2 uppercase">
                      {project.category}
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-semibold text-foreground">
                    {project.title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {project.description}
                  </p>

                  <ul className="mt-4 space-y-2">
                    {project.points.map((point, idx) => (
                      <li
                        key={idx}
                        className="flex gap-2.5 text-sm leading-relaxed text-muted"
                      >
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                        {point}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {project.tools.map((tool) => (
                      <span
                        key={tool}
                        className="rounded-md bg-background px-2.5 py-1 text-xs text-muted"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>

                  {project.links && project.links.length > 0 && (
                    <div className="mt-6 flex gap-4">
                      {project.links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-accent-2 hover:underline"
                        >
                          {link.label}
                          <ArrowUpRight size={14} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </motion.article>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
