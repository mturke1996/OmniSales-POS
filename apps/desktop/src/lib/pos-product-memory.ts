const PINNED_KEY = "omnisales-pos-pinned";
const RECENT_KEY = "omnisales-pos-recent";
const MAX_PINNED = 12;
const MAX_RECENT = 16;

function storageAvailable() {
  return typeof globalThis.localStorage !== "undefined";
}

function readIds(key: string): string[] {
  if (!storageAvailable()) return [];
  try {
    const raw = globalThis.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  if (!storageAvailable()) return;
  globalThis.localStorage.setItem(key, JSON.stringify(ids));
}

export function getPinnedProductIds(): string[] {
  return readIds(PINNED_KEY);
}

export function getRecentProductIds(): string[] {
  return readIds(RECENT_KEY);
}

export function togglePinnedProductId(productId: string): string[] {
  const current = getPinnedProductIds();
  const next = current.includes(productId)
    ? current.filter((id) => id !== productId)
    : [productId, ...current.filter((id) => id !== productId)].slice(0, MAX_PINNED);
  writeIds(PINNED_KEY, next);
  return next;
}

export function recordRecentProductId(productId: string): string[] {
  const next = [productId, ...getRecentProductIds().filter((id) => id !== productId)].slice(
    0,
    MAX_RECENT
  );
  writeIds(RECENT_KEY, next);
  return next;
}

export function resolveProductsByIds<T extends { id: string }>(all: T[], ids: string[]): T[] {
  const map = new Map(all.map((p) => [p.id, p]));
  return ids.map((id) => map.get(id)).filter((p): p is T => Boolean(p));
}
