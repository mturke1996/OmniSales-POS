import type { SidebarTab } from "../components/Sidebar";

export type NavSignals = {
  heldCarts: number;
  deliveryOpen: number;
  lowStock: number;
  pendingSync: number;
  shiftOpen: boolean;
};

export type NavNudge = {
  tab: SidebarTab;
  title: string;
  hint: string;
};

/** Highest-priority next action that is not the current screen. */
export function nextNavNudge(signals: NavSignals, current: SidebarTab): NavNudge | null {
  const queue: NavNudge[] = [];
  if (!signals.shiftOpen) {
    queue.push({
      tab: "shifts",
      title: "افتح وردية",
      hint: "البيع يحتاج وردية مفتوحة",
    });
  }
  if (signals.heldCarts > 0) {
    queue.push({
      tab: "pos",
      title: "سلال معلّقة",
      hint: `${signals.heldCarts} سلة بانتظار الإكمال`,
    });
  }
  if (signals.deliveryOpen > 0) {
    queue.push({
      tab: "orders",
      title: "توصيل معلّق",
      hint: `${signals.deliveryOpen} طلب مفتوح`,
    });
  }
  if (signals.lowStock > 0) {
    queue.push({
      tab: "inventory",
      title: "مخزون منخفض",
      hint: `${signals.lowStock} صنف تحت الحد`,
    });
  }
  if (signals.pendingSync > 0) {
    queue.push({
      tab: "settings",
      title: "مزامنة معلّقة",
      hint: `${signals.pendingSync} عملية بانتظار الرفع`,
    });
  }
  return queue.find((item) => item.tab !== current) ?? null;
}

export function formatShiftElapsed(openedAt: string, now = Date.now()): string {
  const start = Date.parse(openedAt);
  if (!Number.isFinite(start)) return "";
  const mins = Math.max(0, Math.floor((now - start) / 60_000));
  const days = Math.floor(mins / 1_440);
  const hours = Math.floor((mins % 1_440) / 60);
  const rest = mins % 60;
  if (days > 0) return `${days}ي ${hours}س`;
  if (hours > 0) return `${hours}س ${rest}د`;
  return `${rest}د`;
}
