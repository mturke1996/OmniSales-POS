export type HtmlPreviewPayload = {
  html: string;
  title: string;
};

type HtmlPreviewHandler = (payload: HtmlPreviewPayload) => void;

let handler: HtmlPreviewHandler | null = null;

export function registerHtmlPreviewHandler(next: HtmlPreviewHandler | null): void {
  handler = next;
}

export function showHtmlPreview(payload: HtmlPreviewPayload): boolean {
  if (!handler) return false;
  handler(payload);
  return true;
}

export function stripDocumentScripts(html: string): string {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
}
