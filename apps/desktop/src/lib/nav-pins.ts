import type { SidebarTab } from "../components/Sidebar";

const PINS_KEY = "omni.nav.pins";
const RECENT_KEY = "omni.nav.recent";
const GROUPS_KEY = "omni.nav.collapsed-groups";

const VALID: SidebarTab[] = [
  "dashboard",
  "pos",
  "shifts",
  "orders",
  "invoices",
  "returns",
  "inventory",
  "purchases",
  "customers",
  "expenses",
  "ops",
  "reports",
  "settings",
];

export const DEFAULT_PINS: SidebarTab[] = ["pos", "invoices", "inventory"];
const MAX_PINS = 5;
const MAX_RECENT = 4;

function isTab(v: unknown): v is SidebarTab {
  return typeof v === "string" && (VALID as string[]).includes(v);
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota / private mode
  }
}

export function readPinnedTabs(): SidebarTab[] {
  const stored = readJson<unknown>(PINS_KEY, null);
  if (!Array.isArray(stored)) return [...DEFAULT_PINS];
  const tabs = stored.filter(isTab);
  return tabs.length ? tabs.slice(0, MAX_PINS) : [...DEFAULT_PINS];
}

export function togglePinnedTab(id: SidebarTab): SidebarTab[] {
  const current = readPinnedTabs();
  const next = current.includes(id)
    ? current.filter((t) => t !== id)
    : [...current.filter((t) => t !== id), id].slice(-MAX_PINS);
  writeJson(PINS_KEY, next);
  return next;
}

export function isPinned(id: SidebarTab, pins = readPinnedTabs()): boolean {
  return pins.includes(id);
}

export function readRecentTabs(current?: SidebarTab): SidebarTab[] {
  const stored = readJson<unknown>(RECENT_KEY, []);
  const tabs = Array.isArray(stored) ? stored.filter(isTab) : [];
  if (!current) return tabs.slice(0, MAX_RECENT);
  return tabs.filter((t) => t !== current).slice(0, MAX_RECENT);
}

export function pushRecentTab(id: SidebarTab): SidebarTab[] {
  const prev = readJson<unknown>(RECENT_KEY, []);
  const tabs = Array.isArray(prev) ? prev.filter(isTab) : [];
  const next = [id, ...tabs.filter((t) => t !== id)].slice(0, MAX_RECENT + 2);
  writeJson(RECENT_KEY, next);
  return next.filter((t) => t !== id).slice(0, MAX_RECENT);
}

export function readCollapsedGroups(): string[] {
  const stored = readJson<unknown>(GROUPS_KEY, []);
  return Array.isArray(stored) ? stored.filter((x) => typeof x === "string") : [];
}

export function toggleCollapsedGroup(title: string): string[] {
  const current = readCollapsedGroups();
  const next = current.includes(title)
    ? current.filter((t) => t !== title)
    : [...current, title];
  writeJson(GROUPS_KEY, next);
  return next;
}

export function tapHaptic(ms = 10) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // ignore
  }
}
