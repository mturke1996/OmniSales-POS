import type { Shift } from "./types";

export function mapRemoteShift(row: Record<string, unknown>): Shift {
  return {
    id: String(row.id),
    branch_id: String(row.branch_id || "branch-1"),
    cashier_id: String(row.cashier_id || ""),
    opened_at: String(row.opened_at || new Date().toISOString()),
    closed_at: (row.closed_at as string) || null,
    opening_float: Number(row.opening_float) || 0,
    cash_sales: Number(row.cash_sales) || 0,
    card_sales: Number(row.card_sales) || 0,
    debt_sales: Number(row.debt_sales) || 0,
    cash_returns: Number(row.cash_returns) || 0,
    expected_cash: Number(row.expected_cash) || 0,
    closing_count: row.closing_count != null ? Number(row.closing_count) : null,
    variance: row.variance != null ? Number(row.variance) : null,
    status: (row.status as Shift["status"]) || "open",
  };
}

/**
 * Reconcile the local open shift with cloud open shifts.
 * Same id: keep the copy with higher expected_cash (more recorded activity).
 * Different ids: keep local and report extras so the UI can warn.
 */
export function mergeOpenShift(
  local: Shift | null,
  remoteOpens: Shift[],
): { shift: Shift | null; extraRemote: number } {
  const remotes = remoteOpens.filter((s) => s.status === "open");
  if (!local || local.status !== "open") {
    return {
      shift: remotes[0] ?? null,
      extraRemote: Math.max(0, remotes.length - (remotes[0] ? 1 : 0)),
    };
  }
  const same = remotes.find((s) => s.id === local.id);
  const extras = remotes.filter((s) => s.id !== local.id).length;
  if (!same) return { shift: local, extraRemote: extras };
  const useRemote = (same.expected_cash ?? 0) >= (local.expected_cash ?? 0);
  return { shift: useRemote ? { ...local, ...same } : local, extraRemote: extras };
}
