export type PdfPreviewPayload = {
  url: string;
  title: string;
  filename: string;
  blob: Blob;
  /** Blob object URLs must be revoked; Capacitor file URLs must not. */
  revokeOnClose?: boolean;
};

type PdfPreviewHandler = (payload: PdfPreviewPayload) => void;

let handler: PdfPreviewHandler | null = null;

export function registerPdfPreviewHandler(next: PdfPreviewHandler | null): void {
  handler = next;
}

export function showPdfPreview(payload: PdfPreviewPayload): boolean {
  if (!handler) return false;
  handler(payload);
  return true;
}
