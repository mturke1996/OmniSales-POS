/** Tiny bus so IndexedDB writes can request a cloud flush without import cycles. */

type FlushHandler = () => void;

let handler: FlushHandler | null = null;

export function setOutboxFlushHandler(fn: FlushHandler | null) {
  handler = fn;
}

export function notifyOutboxQueued() {
  handler?.();
}
