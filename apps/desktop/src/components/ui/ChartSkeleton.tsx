export function ChartSkeleton({ className = "h-48" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-paper-line/80 ${className}`}
      aria-hidden="true"
    />
  );
}
