/** Lightweight fallback while lazy-loaded screens load */
export function ScreenLoader({ label = "جاري التحميل…" }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 px-4 py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-paper-line border-t-highlight" />
      <p className="text-xs font-medium text-ink-mute">{label}</p>
    </div>
  );
}
