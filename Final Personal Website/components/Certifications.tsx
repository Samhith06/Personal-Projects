"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { StaggerGroup, StaggerItem } from "@/components/Reveal";
import Reveal from "@/components/Reveal";
import { certifications, siteConfig } from "@/lib/data";
import { ChevronRight, Wallet } from "lucide-react";

const DATABRICKS_LOGO = "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/databricks.svg";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default function Certifications() {
  return (
    <section id="certifications" className="scroll-mt-24 py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <Reveal>
          <div className="text-center">
            <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Professional <span className="text-gradient">Certifications</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-muted sm:text-base">
              Industry-recognized credentials demonstrating expertise across data
              engineering, machine learning, and the Databricks Lakehouse.
            </p>
            <a
              href={siteConfig.social.databricksWallet}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              <Wallet size={15} />
              View full credential wallet
            </a>
          </div>
        </Reveal>

        <StaggerGroup className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {certifications.map((cert) => (
            <StaggerItem key={cert.title}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent/40"
              >
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-3">
                  <div className="relative h-full w-full">
                    <Image
                      src={DATABRICKS_LOGO}
                      alt="Databricks"
                      fill
                      sizes="40px"
                      className="object-contain"
                    />
                  </div>
                </div>

                <h3 className="font-display text-lg font-bold leading-snug text-foreground">
                  {cert.title}
                </h3>
                <p className="mt-1.5 text-sm font-medium text-accent">{cert.issuer}</p>

                <ul className="mt-4 space-y-2">
                  {cert.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2 text-sm leading-snug text-muted">
                      <ChevronRight size={14} className="mt-0.5 shrink-0 text-accent-2" />
                      {bullet}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto border-t border-border pt-4">
                  <p className="text-xs text-muted">License: {cert.license}</p>
                  <p className="mt-1 text-xs text-muted">
                    Issued {formatDate(cert.date)}
                    {cert.expires ? ` · Expires ${formatDate(cert.expires)}` : ""}
                  </p>
                  <a
                    href={cert.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs font-medium text-accent-2 hover:underline"
                  >
                    Verify credential →
                  </a>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
