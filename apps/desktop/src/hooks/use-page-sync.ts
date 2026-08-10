import { useState } from "react";
import { useOnline } from "./use-online";

/** Online status + sync-now handler for page-level PosSyncBar. */
export function usePageSync(onSync?: () => void | Promise<void>) {
  const online = useOnline();
  const [syncing, setSyncing] = useState(false);

  async function handleSyncNow() {
    if (!onSync) return;
    setSyncing(true);
    try {
      await onSync();
    } finally {
      setSyncing(false);
    }
  }

  return { online, syncing, handleSyncNow };
}
