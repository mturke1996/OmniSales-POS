export type PdfPreviewPayload = {
  url: string;
  title: string;
  filename: string;
  blob: Blob;
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
