/** LIFO overlay closers for Android hardware back (and Escape). */

export type OverlayCloser = () => boolean;

const stack: OverlayCloser[] = [];

export function pushOverlayCloser(close: OverlayCloser): () => void {
  stack.push(close);
  return () => {
    const i = stack.lastIndexOf(close);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** Close the topmost overlay. Returns true when something was dismissed. */
export function closeTopOverlay(): boolean {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i]()) return true;
  }
  return false;
}

export function overlayStackSize(): number {
  return stack.length;
}

/** Test helper. */
export function resetOverlayStack(): void {
  stack.length = 0;
}
