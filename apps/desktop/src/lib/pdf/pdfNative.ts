import { Capacitor } from "@capacitor/core";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result;
      if (typeof data !== "string") {
        reject(new Error("تعذر تحويل PDF"));
        return;
      }
      const comma = data.indexOf(",");
      resolve(comma >= 0 ? data.slice(comma + 1) : data);
    };
    reader.onerror = () => reject(reader.error ?? new Error("تعذر قراءة PDF"));
    reader.readAsDataURL(blob);
  });
}

export async function nativePdfPreviewUrl(blob: Blob, filename: string): Promise<string> {
  const uri = await savePdfNative(blob, filename);
  return Capacitor.convertFileSrc(uri);
}

export async function savePdfNative(blob: Blob, filename: string): Promise<string> {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const safeName = filename.replace(/[^\w\u0600-\u06FF.-]+/g, "_").replace(/\.pdf$/i, "") + ".pdf";
  const base64 = await blobToBase64(blob);
  const written = await Filesystem.writeFile({
    path: safeName,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });
  return written.uri;
}

export async function sharePdfNative(blob: Blob, filename: string, title: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const uri = await savePdfNative(blob, filename);
  const { Share } = await import("@capacitor/share");
  try {
    await Share.share({
      title,
      dialogTitle: title,
      url: uri,
    });
    return true;
  } catch (e) {
    if (e instanceof Error && /cancel/i.test(e.message)) return false;
    throw e;
  }
}

export async function downloadPdfNative(blob: Blob, filename: string, title: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const shared = await sharePdfNative(blob, filename, title);
  return shared;
}
