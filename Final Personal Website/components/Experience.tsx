import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import { experience } from "@/lib/data";
import { Briefcase } from "lucide-react";

export default function Experience() {
  return (
    <section id="experience" className="scroll-mt-24 bg-background-alt py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <SectionHeading
          eyebrow="Experience"
          title="Where I've worked"
          description="Hands-on data engineering and full-stack delivery, from production Lakehouse pipelines to internal automation platforms."
        />

        <div className="relative mt-16 space-y-10 border-l border-border pl-8 sm:pl-10">
          {experience.map((job, i) => (
            <Reveal key={job.company} delay={i * 0.1}>
              <div className="relative">
                <span className="absolute -left-[41px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-accent sm:-left-[49px]">
                  <Briefcase size={12} />
                </span>

                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h3 className="font-display text-xl font-semibold text-foreground">
                    {job.role} · <span className="text-gradient">{job.company}</span>
                  </h3>
                  <span className="text-sm text-muted">{job.period}</span>
                </div>

                <ul className="mt-4 space-y-2.5">
                  {job.points.map((point, idx) => (
                    <li
                      key={idx}
                      className="flex gap-3 text-sm leading-relaxed text-muted sm:text-base"
                    >
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-2" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
