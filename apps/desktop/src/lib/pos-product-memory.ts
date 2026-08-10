const PINNED_KEY = "omnisales-pos-pinned";
const AUTO_PINNED_KEY = "omnisales-pos-auto-pinned";
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

/** Manually pinned product ids (user star). */
export function getPinnedProductIds(): string[] {
  return readIds(PINNED_KEY);
}

/** Auto-pinned from top sellers analytics. */
export function getAutoPinnedProductIds(): string[] {
  return readIds(AUTO_PINNED_KEY);
}

export function setAutoPinnedProductIds(ids: string[]): string[] {
  const next = ids.slice(0, MAX_PINNED);
  writeIds(AUTO_PINNED_KEY, next);
  return next;
}

/** Manual + auto pins for POS strips (manual first, capped). */
export function getDisplayPinnedProductIds(): string[] {
  const manual = getPinnedProductIds();
  const manualSet = new Set(manual);
  const auto = getAutoPinnedProductIds().filter((id) => !manualSet.has(id));
  return [...manual, ...auto].slice(0, MAX_PINNED);
}

export function getRecentProductIds(): string[] {
  return readIds(RECENT_KEY);
}

export function togglePinnedProductId(productId: string): string[] {
  const manual = getPinnedProductIds();
  const auto = getAutoPinnedProductIds();
  const inManual = manual.includes(productId);
  const inAuto = auto.includes(productId);

  if (inManual) {
    writeIds(
      PINNED_KEY,
      manual.filter((id) => id !== productId)
    );
  } else if (inAuto) {
    writeIds(
      AUTO_PINNED_KEY,
      auto.filter((id) => id !== productId)
    );
  } else {
    writeIds(
      PINNED_KEY,
      [productId, ...manual.filter((id) => id !== productId)].slice(0, MAX_PINNED)
    );
  }
  return getDisplayPinnedProductIds();
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
