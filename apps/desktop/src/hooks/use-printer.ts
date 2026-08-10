import { useEffect, useState } from "react";
import {
  getUnifiedPrinterState,
  subscribeUnifiedPrinterState,
  bootReconnectPrinters,
  type UnifiedPrinterState,
} from "../lib/print/printer-hub";

/** Live printer connection (USB serial + Bluetooth native). */
export function usePrinter(): UnifiedPrinterState {
  const [state, setState] = useState(getUnifiedPrinterState);

  useEffect(() => {
    const unsub = subscribeUnifiedPrinterState(setState);
    void bootReconnectPrinters().then(() => setState(getUnifiedPrinterState()));
    return unsub;
  }, []);

  return state;
}
