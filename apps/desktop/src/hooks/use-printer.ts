import { useEffect, useState } from "react";
import {
  getPrinterConnectionState,
  subscribePrinterState,
  tryAutoReconnectSerialPrinter,
  type PrinterConnectionState,
} from "../lib/print/escpos";

/** Live printer connection status + boot auto-reconnect. */
export function usePrinter(): PrinterConnectionState {
  const [state, setState] = useState(getPrinterConnectionState);

  useEffect(() => {
    const unsub = subscribePrinterState(setState);
    void tryAutoReconnectSerialPrinter().then(() =>
      setState(getPrinterConnectionState())
    );
    return unsub;
  }, []);

  return state;
}
