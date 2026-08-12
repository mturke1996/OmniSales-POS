import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HTMLCanvasElementLuminanceSource,
  HybridBinarizer,
  MultiFormatReader,
  NotFoundException,
} from "@zxing/library";

const HINTS = new Map();
HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.QR_CODE,
]);
HINTS.set(DecodeHintType.TRY_HARDER, true);

const reader = new MultiFormatReader();
reader.setHints(HINTS);

function decodeBitmap(bitmap: BinaryBitmap): string | null {
  try {
    const result = reader.decode(bitmap, HINTS);
    const text = result?.getText()?.trim();
    return text || null;
  } catch (e) {
    if (e instanceof NotFoundException) return null;
    return null;
  } finally {
    reader.reset();
  }
}

/** Decode a 1D/QR barcode from a video frame. Tries native BarcodeDetector, then ZXing. */
export async function decodeBarcodeFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): Promise<string | null> {
  if (video.readyState < 2 || video.videoWidth < 8) return null;

  const native = window.BarcodeDetector;
  if (native) {
    try {
      const detector = new native({
        formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code", "upc_a", "upc_e"],
      });
      const codes = await detector.detect(video);
      const value = codes[0]?.rawValue?.trim();
      if (value) return value;
    } catch {
      /* fall through to ZXing */
    }
  }

  const w = video.videoWidth;
  const h = video.videoHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);

  const source = new HTMLCanvasElementLuminanceSource(canvas);
  const normal = decodeBitmap(new BinaryBitmap(new HybridBinarizer(source)));
  if (normal) return normal;
  return decodeBitmap(new BinaryBitmap(new HybridBinarizer(source.invert())));
}

export const SCAN_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
};
