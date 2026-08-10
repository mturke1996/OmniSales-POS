/** Native Web Share API when available (iOS Safari / Android). */
export async function shareTextReceipt(opts: {
  title: string;
  text: string;
}): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    await navigator.share({ title: opts.title, text: opts.text });
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return false;
    throw e;
  }
}

export function canShareReceipt(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.share);
}

export function isIosBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
