export default function BlobBackground({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="animate-blob absolute -left-24 -top-24 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
      <div className="animate-blob animation-delay-2000 absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-accent-2/20 blur-3xl" />
      <div className="animate-blob animation-delay-4000 absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
    </div>
  );
}
