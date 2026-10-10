import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { ArrowLeft } from "lucide-react";
import Reveal from "@/components/Reveal";
import { getAllPostSlugs, getPostBySlug } from "@/lib/blog";

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/blog/[slug]">
): Promise<Metadata> {
  const { slug } = await props.params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPostPage(props: PageProps<"/blog/[slug]">) {
  const { slug } = await props.params;
  const post = getPostBySlug(slug);

  if (!post) notFound();

  return (
    <article className="py-24">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <Reveal>
          <Link
            href="/blog"
            className="mb-10 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-accent-2"
          >
            <ArrowLeft size={14} />
            Back to blog
          </Link>

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

          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
            {post.title}
          </h1>

          <p className="mt-4 text-sm text-muted">
            {new Date(post.date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {post.readTime ? ` · ${post.readTime}` : ""}
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="prose-blog mt-12">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
              {post.content}
            </ReactMarkdown>
          </div>
        </Reveal>
      </div>
    </article>
  );
}
