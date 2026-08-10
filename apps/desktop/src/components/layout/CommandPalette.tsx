import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { NAV_GROUPS, NAV_ITEMS } from "../../lib/nav-config";
import type { SidebarTab } from "../Sidebar";
import { cn } from "../../lib/cn";

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (tab: SidebarTab) => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV_ITEMS;
    return NAV_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof NAV_ITEMS>();
    for (const item of filtered) {
      const list = map.get(item.group) || [];
      list.push(item);
      map.set(item.group, list);
    }
    return NAV_GROUPS.map((g) => ({ group: g, items: map.get(g) || [] })).filter(
      (g) => g.items.length > 0
    );
  }, [filtered]);

  const pick = (tab: SidebarTab) => {
    onNavigate(tab);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          className="fixed inset-x-3 top-[max(1rem,env(safe-area-inset-top))] z-[81] mx-auto max-w-lg overflow-hidden rounded-2xl border border-paper-line bg-paper-raised shadow-lift outline-none sm:inset-x-auto sm:top-[15vh] sm:w-full"
          aria-label="بحث سريع"
        >
          <Dialog.Title className="sr-only">بحث سريع في OmniSales</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-paper-line px-3 py-3">
            <MagnifyingGlass size={18} className="shrink-0 text-ink-mute" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="انتقل إلى قسم… (⌘K)"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute"
            />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-mute hover:bg-paper"
              aria-label="إغلاق"
            >
              <X size={16} />
            </button>
          </div>
          <div className="max-h-[min(60dvh,24rem)] overflow-y-auto overscroll-contain p-2">
            {!grouped.length ? (
              <p className="py-8 text-center text-sm text-ink-mute">لا توجد نتائج</p>
            ) : (
              grouped.map(({ group, items }) => (
                <div key={group} className="mb-2">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-mute">
                    {group}
                  </p>
                  <ul className="space-y-0.5">
                    {items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => pick(item.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-medium text-ink transition hover:bg-highlight/10"
                          )}
                        >
                          <span className="text-highlight">{item.icon}</span>
                          <span>{item.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-paper-line px-3 py-2 text-[10px] text-ink-mute">
            <kbd className="rounded bg-paper px-1.5 py-0.5 font-mono">↑↓</kbd> تنقل ·{" "}
            <kbd className="rounded bg-paper px-1.5 py-0.5 font-mono">Enter</kbd> فتح ·{" "}
            <kbd className="rounded bg-paper px-1.5 py-0.5 font-mono">Esc</kbd> إغلاق
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
