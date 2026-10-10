import Reveal from "@/components/Reveal";

export default function SectionHeading({
  eyebrow,
  title,
  description,
  center = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  center?: boolean;
}) {
  return (
    <Reveal>
      <div className={center ? "text-center" : ""}>
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-accent-2">
          <span className="h-px w-8 bg-accent-2" />
          {eyebrow}
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="mt-4 max-w-2xl text-muted">{description}</p>
        )}
      </div>
    </Reveal>
  );
}
