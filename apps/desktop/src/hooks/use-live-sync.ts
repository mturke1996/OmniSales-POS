import { useEffect, useState } from "react";
import {
  getLiveState,
  startLiveSync,
  stopLiveSync,
  subscribeLiveState,
  updateLiveContext,
  type LiveState,
  type LiveSyncConfig,
} from "../lib/live-sync";

export function useLiveSync(config: LiveSyncConfig | null) {
  const [state, setState] = useState<LiveState>(getLiveState);

  useEffect(() => subscribeLiveState(setState), []);

  const enabled = Boolean(config?.settings.cloud_sync_enabled);
  const url = config?.settings.supabase_url ?? "";
  const key = config?.settings.supabase_anon_key ?? "";
  const cashierId = config?.session.cashier_id ?? "";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await stopLiveSync();
      if (cancelled || !config || !enabled) return;
      await startLiveSync(config);
    })();
    return () => {
      cancelled = true;
      void stopLiveSync();
    };
    // config object is refreshed via updateLiveContext below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, url, key, cashierId]);

  useEffect(() => {
    if (!config) return;
    updateLiveContext({
      settings: config.settings,
      session: config.session,
      tab: config.tab,
      onRemoteChange: config.onRemoteChange,
    });
  }, [config]);

  return state;
}

export function useLiveState() {
  const [state, setState] = useState<LiveState>(getLiveState);
  useEffect(() => subscribeLiveState(setState), []);
  return state;
}
