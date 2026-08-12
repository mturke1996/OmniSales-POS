import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase";
import {
  pendingOutboxCount,
  pullCloudOnly,
  pushOutboxOnly,
  readLastSyncAt,
  syncCloudFull,
} from "./sync-outbox";
import { setOutboxFlushHandler } from "./sync-bus";
import { getDeviceId } from "./device-id";
import { detectRuntime } from "./native";
import type { BranchSettings } from "./types";
import type { CashierSession } from "./session";
import type { SidebarTab } from "../components/Sidebar";
import {
  extractRecordId,
  isOwnEcho,
  liveEventLabel,
  LIVE_TABLES,
  liveStatusLabel,
  payloadId,
  pruneStalePeers,
  rememberOwnId,
  type LiveStatus,
} from "./live-sync-core";

export type { LiveStatus } from "./live-sync-core";
export { liveStatusLabel };

export interface LivePeer {
  deviceId: string;
  cashierName: string;
  runtime: string;
  tab?: string;
  lastSeen: string;
}

export interface LiveEvent {
  id: string;
  table: string;
  event: string;
  label: string;
  at: string;
}

export interface LiveState {
  status: LiveStatus;
  lastSyncAt: string | null;
  lastError: string | null;
  peers: LivePeer[];
  recentEvents: LiveEvent[];
  pending: number;
}

export interface LiveSyncConfig {
  settings: BranchSettings;
  session: CashierSession;
  tab: SidebarTab;
  onRemoteChange: () => void | Promise<void>;
}

type Listener = (state: LiveState) => void;

const listeners = new Set<Listener>();
const recentOwnIds = new Set<string>();

let state: LiveState = {
  status: "disabled",
  lastSyncAt: null,
  lastError: null,
  peers: [],
  recentEvents: [],
  pending: 0,
};

let started = false;
let channel: RealtimeChannel | null = null;
let presenceChannel: RealtimeChannel | null = null;
let config: LiveSyncConfig | null = null;
let pullTimer: ReturnType<typeof setTimeout> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let syncing = false;
let wantPull = false;
let wantPush = false;

function emit() {
  const snapshot = { ...state, peers: [...state.peers], recentEvents: [...state.recentEvents] };
  for (const fn of listeners) fn(snapshot);
}

function setState(patch: Partial<LiveState>) {
  state = { ...state, ...patch };
  emit();
}

export function getLiveState(): LiveState {
  return { ...state, peers: [...state.peers], recentEvents: [...state.recentEvents] };
}

export function subscribeLiveState(listener: Listener): () => void {
  listeners.add(listener);
  listener(getLiveState());
  return () => listeners.delete(listener);
}

export function rememberFlushedIds(ids: string[] | undefined) {
  for (const id of ids ?? []) rememberOwnId(recentOwnIds, id);
}

async function refreshPending() {
  const pending = await pendingOutboxCount();
  const lastSyncAt = (await readLastSyncAt()) ?? state.lastSyncAt;
  setState({ pending, lastSyncAt });
}

async function runSync(kind: "full" | "push" | "pull") {
  if (!config) return;
  if (syncing) {
    if (kind === "pull") wantPull = true;
    if (kind === "push" || kind === "full") wantPush = true;
    return;
  }
  syncing = true;
  setState({ status: "syncing" });
  try {
    const settings = config.settings;
    const result =
      kind === "push"
        ? await pushOutboxOnly(settings)
        : kind === "pull"
          ? await pullCloudOnly(settings)
          : await syncCloudFull(settings);
    rememberFlushedIds(result.flushedIds);
    await refreshPending();
    if (result.error) {
      setState({ status: "error", lastError: result.error });
    } else {
      setState({
        status: navigator.onLine ? "live" : "offline",
        lastError: null,
        lastSyncAt: new Date().toISOString(),
      });
      if (kind !== "push") await config.onRemoteChange();
    }
  } catch (err) {
    setState({
      status: "error",
      lastError: err instanceof Error ? err.message : String(err),
    });
  } finally {
    syncing = false;
    const againPush = wantPush;
    const againPull = wantPull;
    wantPush = false;
    wantPull = false;
    if (againPush) void runSync("push");
    else if (againPull) void runSync("pull");
  }
}

function schedulePull() {
  if (pullTimer) clearTimeout(pullTimer);
  pullTimer = setTimeout(() => {
    pullTimer = null;
    void runSync("pull");
  }, 700);
}

function schedulePush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void runSync("push");
  }, 400);
}

function handleRemoteChange(
  table: string,
  event: string,
  record: Record<string, unknown> | null
) {
  const id = extractRecordId(record);
  if (isOwnEcho(id, recentOwnIds)) return;
  const label = liveEventLabel(table, event, record);
  const item: LiveEvent = {
    id: `${table}-${id || event}-${Date.now()}`,
    table,
    event,
    label,
    at: new Date().toISOString(),
  };
  setState({
    recentEvents: [item, ...state.recentEvents].slice(0, 12),
  });
  schedulePull();
}

async function heartbeat() {
  if (!config) return;
  const client = getSupabaseClient(
    config.settings.supabase_url,
    config.settings.supabase_anon_key
  );
  if (!client) return;
  const row = {
    id: getDeviceId(),
    branch_id: config.settings.branch_id,
    cashier_id: config.session.cashier_id,
    cashier_name: config.session.cashier_name,
    runtime: detectRuntime(),
    current_tab: config.tab,
    status: "online",
    last_seen_at: new Date().toISOString(),
    app_version: "0.1.0",
  };
  try {
    await client.from("devices").upsert(row);
  } catch {
    // table may be missing until migration 012
  }
  if (presenceChannel) {
    void presenceChannel.track({
      deviceId: row.id,
      cashierName: row.cashier_name,
      runtime: row.runtime,
      tab: row.current_tab,
      lastSeen: row.last_seen_at,
    });
  }
  await refreshPending();
  if (state.pending > 0 && navigator.onLine) schedulePush();
}

function applyPresence(client: SupabaseClient) {
  if (!config) return;
  const branch = config.settings.branch_id || "branch";
  presenceChannel = client.channel(`omni-live:${branch}`, {
    config: { presence: { key: getDeviceId() } },
  });
  presenceChannel
    .on("presence", { event: "sync" }, () => {
      const raw = presenceChannel?.presenceState() ?? {};
      const peers: LivePeer[] = [];
      const self = getDeviceId();
      for (const metas of Object.values(raw)) {
        for (const meta of metas as Array<Record<string, string>>) {
          if (!meta.deviceId || meta.deviceId === self) continue;
          peers.push({
            deviceId: meta.deviceId,
            cashierName: meta.cashierName || "جهاز",
            runtime: meta.runtime || "pwa",
            tab: meta.tab,
            lastSeen: meta.lastSeen || new Date().toISOString(),
          });
        }
      }
      setState({ peers: pruneStalePeers(peers) });
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") void heartbeat();
    });
}

function applyPostgres(client: SupabaseClient) {
  channel = client.channel("omni-postgres");
  for (const table of LIVE_TABLES) {
    channel = channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      (payload) => {
        const record = (payload.new || payload.old || null) as Record<
          string,
          unknown
        > | null;
        handleRemoteChange(table, payload.eventType, record);
      }
    );
  }
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      setState({
        status: navigator.onLine ? "live" : "offline",
        lastError: null,
      });
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      setState({ status: "error", lastError: "انقطع البث الفوري — سنعيد المحاولة" });
    }
  });
}

function onOnline() {
  if (!started || !config) return;
  setState({ status: "connecting" });
  void runSync("full");
}

function onOffline() {
  setState({ status: "offline" });
}

export async function startLiveSync(next: LiveSyncConfig) {
  config = next;
  if (!next.settings.cloud_sync_enabled) {
    await stopLiveSync();
    setState({ status: "disabled", peers: [], lastError: null });
    return;
  }
  if (!navigator.onLine) {
    setState({ status: "offline" });
  }

  setOutboxFlushHandler(() => {
    if (config?.settings.cloud_sync_enabled && navigator.onLine) schedulePush();
  });

  if (started) {
    void heartbeat();
    return;
  }

  started = true;
  setState({ status: "connecting" });
  const client = getSupabaseClient(
    next.settings.supabase_url,
    next.settings.supabase_anon_key
  );
  if (!client) {
    setState({ status: "error", lastError: "عميل Supabase غير مهيأ" });
    return;
  }

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  document.addEventListener("visibilitychange", onVisibility);

  applyPostgres(client);
  applyPresence(client);
  heartbeatTimer = setInterval(() => void heartbeat(), 25_000);
  await runSync("full");
}

function onVisibility() {
  if (document.visibilityState === "visible" && started && navigator.onLine) {
    void runSync("pull");
    void heartbeat();
  }
}

export async function stopLiveSync() {
  started = false;
  setOutboxFlushHandler(null);
  if (pullTimer) clearTimeout(pullTimer);
  if (flushTimer) clearTimeout(flushTimer);
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  pullTimer = null;
  flushTimer = null;
  heartbeatTimer = null;
  window.removeEventListener("online", onOnline);
  window.removeEventListener("offline", onOffline);
  document.removeEventListener("visibilitychange", onVisibility);
  const client = getSupabaseClient();
  if (channel) {
    try {
      await client?.removeChannel(channel);
    } catch {
      // ignore
    }
  }
  if (presenceChannel) {
    try {
      await presenceChannel.untrack();
      await client?.removeChannel(presenceChannel);
    } catch {
      // ignore
    }
  }
  channel = null;
  presenceChannel = null;
}

export function updateLiveContext(patch: Partial<LiveSyncConfig>) {
  if (!config) return;
  config = { ...config, ...patch };
}

export async function listCloudDevices(settings: BranchSettings) {
  const client = getSupabaseClient(settings.supabase_url, settings.supabase_anon_key);
  if (!client) return [];
  const { data, error } = await client
    .from("devices")
    .select("*")
    .eq("branch_id", settings.branch_id)
    .order("last_seen_at", { ascending: false })
    .limit(20);
  if (error || !data) return [];
  return data as Array<{
    id: string;
    cashier_name: string | null;
    runtime: string;
    current_tab: string | null;
    status: string;
    last_seen_at: string;
  }>;
}

export { payloadId };
