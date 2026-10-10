"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "About Me", href: "/#about", id: "about" },
  { label: "Skills", href: "/#skills", id: "skills" },
  { label: "Projects", href: "/#projects", id: "projects" },
  { label: "Certifications", href: "/#certifications", id: "certifications" },
  { label: "Blog", href: "/blog", id: null },
  { label: "Contact", href: "/#contact", id: "contact" },
];

const sectionIds = navLinks.map((link) => link.id).filter((id): id is string => id !== null);

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (pathname !== "/") return;

    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [pathname]);

  function isActive(link: (typeof navLinks)[number]) {
    if (link.id === null) return pathname.startsWith("/blog");
    return pathname === "/" && activeId === link.id;
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled ? "glass border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="h-[3px] w-full bg-gradient-to-r from-accent via-accent-2 to-accent" />

      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="leading-tight">
          <span className="font-display text-lg font-bold tracking-[0.15em] text-accent">
            SAM
          </span>
          <span className="font-display text-lg font-bold tracking-[0.15em] text-accent-2">
            H
          </span>
          <span className="font-display text-lg font-bold tracking-[0.15em] text-foreground">
            ITH
          </span>
          <div className="text-[9px] font-medium tracking-[0.3em] text-muted">
            DATA · ML · FULLSTACK
          </div>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative pb-1 text-xs font-medium tracking-[0.12em] uppercase transition-colors ${
                isActive(link) ? "text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              {link.label}
              {isActive(link) && (
                <motion.span
                  layoutId="nav-active-underline"
                  className="absolute -bottom-0.5 left-0 h-[2px] w-full rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </div>

        <Link
          href="/#contact"
          className="hidden rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium tracking-[0.1em] uppercase text-foreground transition-colors hover:border-accent hover:text-accent md:inline-block"
        >
          Let&apos;s talk
        </Link>

        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-border p-2 text-foreground md:hidden"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-border glass md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-xs font-medium tracking-[0.1em] uppercase transition-colors hover:bg-surface hover:text-foreground ${
                    isActive(link) ? "bg-surface text-accent" : "text-muted"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/#contact"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-lg bg-accent px-3 py-2.5 text-center text-xs font-medium tracking-[0.1em] uppercase text-white"
              >
                Let&apos;s talk
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
