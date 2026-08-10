import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  MagnifyingGlass,
  X,
  FileText,
  Users,
  Package,
} from "@phosphor-icons/react";
import { NAV_ITEMS } from "../../lib/nav-config";
import {
  flattenCommandResults,
  searchCommandResults,
  type CommandResult,
} from "../../lib/command-search";
import type { Customer, Order, Product } from "../../lib/types";
import type { SidebarTab } from "../Sidebar";
import { cn } from "../../lib/cn";

const GROUP_LABELS: Record<string, string> = {
  navigation: "التنقل",
  invoices: "فواتير",
  customers: "عملاء",
  products: "أصناف",
};

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
  orders,
  customers,
  products,
  onOpenInvoice,
  onOpenCustomer,
  onOpenProduct,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (tab: SidebarTab) => void;
  orders: Order[];
  customers: Customer[];
  products: Product[];
  onOpenInvoice: (orderId: string) => void;
  onOpenCustomer: (customerId: string) => void;
  onOpenProduct: (searchText: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

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

  const groups = useMemo(
    () => searchCommandResults(query, NAV_ITEMS, orders, customers, products),
    [query, orders, customers, products]
  );

  const flat = useMemo(() => flattenCommandResults(groups), [groups]);

  const sectionEntries = useMemo(() => {
    const entries: { key: string; label: string; items: CommandResult[] }[] = [];
    if (groups.navigation.length) {
      entries.push({
        key: "navigation",
        label: GROUP_LABELS.navigation,
        items: groups.navigation,
      });
    }
    if (groups.invoices.length) {
      entries.push({
        key: "invoices",
        label: GROUP_LABELS.invoices,
        items: groups.invoices,
      });
    }
    if (groups.customers.length) {
      entries.push({
        key: "customers",
        label: GROUP_LABELS.customers,
        items: groups.customers,
      });
    }
    if (groups.products.length) {
      entries.push({
        key: "products",
        label: GROUP_LABELS.products,
        items: groups.products,
      });
    }
    return entries;
  }, [groups]);

  const activate = useCallback(
    (item: CommandResult) => {
      switch (item.kind) {
        case "nav":
          onNavigate(item.tab);
          break;
        case "invoice":
          onOpenInvoice(item.orderId);
          break;
        case "customer":
          onOpenCustomer(item.customerId);
          break;
        case "product":
          onOpenProduct(item.searchText);
          break;
      }
      onOpenChange(false);
    },
    [onNavigate, onOpenInvoice, onOpenCustomer, onOpenProduct, onOpenChange]
  );

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cmd-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flat.length) setActiveIndex((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flat.length) setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter" && flat[activeIndex]) {
      e.preventDefault();
      activate(flat[activeIndex]);
    }
  };

  let runningIndex = 0;

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
              onKeyDown={handleInputKeyDown}
              placeholder="ابحث عن قسم، فاتورة، عميل، أو صنف… (⌘K)"
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
          <div
            ref={listRef}
            className="max-h-[min(60dvh,24rem)] overflow-y-auto overscroll-contain p-2"
          >
            {!sectionEntries.length ? (
              <p className="py-8 text-center text-sm text-ink-mute">لا توجد نتائج</p>
            ) : (
              sectionEntries.map(({ key, label, items }) => (
                <div key={key} className="mb-2">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-mute">
                    {label}
                  </p>
                  <ul className="space-y-0.5">
                    {items.map((item) => {
                      const idx = runningIndex++;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            data-cmd-idx={idx}
                            onClick={() => activate(item)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm transition",
                              idx === activeIndex
                                ? "bg-highlight/15 text-ink"
                                : "text-ink hover:bg-highlight/10"
                            )}
                          >
                            <ResultIcon item={item} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{resultTitle(item)}</span>
                              {resultSubtitle(item) ? (
                                <span className="block truncate text-xs text-ink-mute">
                                  {resultSubtitle(item)}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
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

function ResultIcon({ item }: { item: CommandResult }) {
  if (item.kind === "nav") {
    return <span className="shrink-0 text-highlight">{item.icon}</span>;
  }
  const icon =
    item.kind === "invoice" ? (
      <FileText size={18} weight="duotone" />
    ) : item.kind === "customer" ? (
      <Users size={18} weight="duotone" />
    ) : (
      <Package size={18} weight="duotone" />
    );
  return <span className="shrink-0 text-highlight">{icon}</span>;
}

function resultTitle(item: CommandResult): string {
  if (item.kind === "nav") return item.label;
  return item.title;
}

function resultSubtitle(item: CommandResult): string | undefined {
  if (item.kind === "nav") return item.group;
  return item.subtitle;
}
