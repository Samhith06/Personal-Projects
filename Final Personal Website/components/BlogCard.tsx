import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { BlogPost } from "@/lib/blog";

export default function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col justify-between rounded-2xl border border-border bg-surface p-7 transition-colors hover:border-accent/50"
    >
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-accent-2"
            >
              {tag}
            </span>
          ))}
        </div>

        <h3 className="font-display text-xl font-semibold text-foreground">
          {post.title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {post.excerpt}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between text-xs text-muted">
        <span>
          {new Date(post.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          {post.readTime ? ` · ${post.readTime}` : ""}
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-accent-2 opacity-0 transition-opacity group-hover:opacity-100">
          Read
          <ArrowUpRight size={13} />
        </span>
      </div>
    </Link>
  );
}
