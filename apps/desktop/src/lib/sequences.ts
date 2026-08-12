import { get, set } from "idb-keyval";

const KEY = "omni.sequences";

export type SequenceKind = "order" | "return" | "purchase" | "payment" | "invoice";

type SequenceMap = Record<SequenceKind, number>;

const DEFAULTS: SequenceMap = {
  order: 1000,
  return: 1000,
  purchase: 1000,
  payment: 1000,
  invoice: 1000,
};

async function load(): Promise<SequenceMap> {
  const existing = await get<Partial<SequenceMap>>(KEY);
  return { ...DEFAULTS, ...existing };
}

/** Atomically allocate the next document number for a kind. */
export async function nextSequence(kind: SequenceKind): Promise<number> {
  const map = await load();
  map[kind] = (map[kind] ?? DEFAULTS[kind]) + 1;
  await set(KEY, map);
  return map[kind];
}

export async function formatNextDoc(
  kind: SequenceKind,
  prefix: string
): Promise<string> {
  const n = await nextSequence(kind);
  const clean = (prefix || "DOC").replace(/[^A-Za-z0-9\u0600-\u06FF_-]/g, "");
  return `${clean}-${n}`;
}

export async function peekSequences(): Promise<SequenceMap> {
  return load();
}

/** Highest trailing integer in document numbers like ORD-1007 / RET-1002. */
export function highestDocSequence(docs: Array<string | null | undefined>): number {
  let max = 0;
  for (const doc of docs) {
    if (!doc) continue;
    const match = String(doc).match(/(\d+)\s*$/);
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

/** Raise local counters so the next allocate cannot collide with cloud docs. */
export async function raiseSequencesToAtLeast(
  kind: SequenceKind,
  atLeast: number
): Promise<void> {
  if (!Number.isFinite(atLeast) || atLeast <= 0) return;
  const map = await load();
  if (atLeast > (map[kind] ?? 0)) {
    map[kind] = atLeast;
    await set(KEY, map);
  }
}
