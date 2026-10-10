import type { Metadata } from "next";
import { StaggerGroup, StaggerItem } from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import BlogCard from "@/components/BlogCard";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes on data engineering, machine learning, and building software.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <section className="py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <SectionHeading
          eyebrow="Blog"
          title="Writing"
          description="Notes on Databricks, data engineering, machine learning, and building things end to end."
        />

        {posts.length === 0 ? (
          <p className="mt-14 text-muted">
            No posts yet — check back soon.
          </p>
        ) : (
          <StaggerGroup className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <StaggerItem key={post.slug}>
                <BlogCard post={post} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}
      </div>
    </section>
  );
}
