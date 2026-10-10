"use client";

import { useState, type FormEvent } from "react";
import Reveal from "@/components/Reveal";
import BlobBackground from "@/components/BlobBackground";
import { contactCopy, siteConfig } from "@/lib/data";
import { ArrowUpRight, Mail, MapPin, Phone, Send } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/icons";

const toneClass = { blue: "text-accent", red: "text-accent-2", neutral: "text-foreground" };

function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body = `${form.message}\n\n— ${form.name} (${form.email})`;
    const mailto = `mailto:${siteConfig.email}?subject=${encodeURIComponent(
      form.subject || `Message from ${form.name}`
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative rounded-3xl border border-accent/20 bg-surface p-8"
    >
      <h3 className="font-display text-xl font-bold text-foreground">Send a Message</h3>
      <p className="mt-1 text-xs tracking-wide text-muted uppercase">
        Straight to my inbox
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <input
          required
          type="text"
          placeholder="Your Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <input
          required
          type="email"
          placeholder="Email Address"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <input
        type="text"
        placeholder="Subject"
        value={form.subject}
        onChange={(e) => setForm({ ...form, subject: e.target.value })}
        className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
      />

      <textarea
        required
        placeholder="Your message"
        rows={5}
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        className="mt-4 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
      />

      <button
        type="submit"
        className="group relative mt-6 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.01]"
      >
        <span className="shine-sweep" />
        Send Message
        <Send size={15} className="transition-transform group-hover:translate-x-0.5" />
      </button>

      <p className="mt-3 text-center text-[11px] text-muted">
        Opens your email client with the message pre-filled.
      </p>
    </form>
  );
}

export default function Contact() {
  return (
    <section
      id="contact"
      className="relative scroll-mt-24 overflow-hidden bg-background-alt py-28"
    >
      <BlobBackground className="opacity-60" />
      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-start">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 px-3 py-1.5 text-[11px] font-medium tracking-wide text-accent uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              {contactCopy.status}
            </span>

            <h2 className="mt-6 font-display text-5xl font-bold tracking-tight sm:text-6xl">
              {contactCopy.heading.map((word, i) => (
                <span key={i} className={`block ${toneClass[word.tone]}`}>
                  {word.text}
                </span>
              ))}
            </h2>

            <p className="mt-6 max-w-md border-l-2 border-accent pl-4 text-sm leading-relaxed text-muted sm:text-base">
              {contactCopy.description}
            </p>

            <div className="mt-8 space-y-3">
              <a
                href={`mailto:${siteConfig.email}`}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-accent">
                    <Mail size={17} />
                  </span>
                  <div>
                    <p className="text-[11px] tracking-wide text-muted uppercase">Email</p>
                    <p className="text-sm font-medium text-foreground">{siteConfig.email}</p>
                  </div>
                </div>
                <ArrowUpRight
                  size={16}
                  className="text-muted transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-accent"
                />
              </a>

              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-accent">
                  <Phone size={17} />
                </span>
                <div>
                  <p className="text-[11px] tracking-wide text-muted uppercase">Phone</p>
                  <p className="text-sm font-medium text-foreground">{siteConfig.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-accent">
                  <MapPin size={17} />
                </span>
                <div>
                  <p className="text-[11px] tracking-wide text-muted uppercase">Location</p>
                  <p className="text-sm font-medium text-foreground">{siteConfig.location}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <a
                href={siteConfig.social.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-accent"
              >
                <GithubIcon size={17} />
              </a>
              <a
                href={siteConfig.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-accent"
              >
                <LinkedinIcon size={17} />
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <ContactForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
