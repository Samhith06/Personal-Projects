import Link from "next/link";
import { Mail } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/icons";
import { siteConfig } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background-alt">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 lg:px-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-base font-semibold text-foreground">
            Sam<span className="text-gradient">hith</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            {siteConfig.role} · {siteConfig.location}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <a
            href={`mailto:${siteConfig.email}`}
            aria-label="Email"
            className="rounded-full border border-border p-2.5 text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <Mail size={16} />
          </a>
          <a
            href={siteConfig.social.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="rounded-full border border-border p-2.5 text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <GithubIcon size={16} />
          </a>
          <a
            href={siteConfig.social.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="rounded-full border border-border p-2.5 text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <LinkedinIcon size={16} />
          </a>
        </div>
      </div>

      <div className="border-t border-border py-5 text-center text-xs text-muted">
        <p>
          &copy; {new Date().getFullYear()} {siteConfig.name}. Built with{" "}
          <Link href="/" className="hover:text-accent">
            Next.js
          </Link>{" "}
          &amp; Framer Motion.
        </p>
      </div>
    </footer>
  );
}
