import { useEffect, useRef, useState } from "react";
import { Camera, X } from "@phosphor-icons/react";

/**
 * Camera barcode scanner using Chrome BarcodeDetector when available.
 * Falls back to a clear message to use a USB/keyboard wedge scanner.
 */
export function BarcodeScannerModal({
  onDetect,
  onClose,
}: {
  onDetect: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!window.BarcodeDetector) {
        setSupported(false);
        setError(
          "ماسح الكاميرا غير مدعوم في هذا المتصفح — استخدم ماسح USB أو Chrome/Edge"
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const detector = new window.BarcodeDetector!({
          formats: [
            "ean_13",
            "ean_8",
            "code_128",
            "code_39",
            "qr_code",
            "upc_a",
            "upc_e",
          ],
        });

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            if (video.readyState >= 2) {
              const codes = await detector.detect(video);
              if (codes[0]?.rawValue) {
                onDetect(codes[0].rawValue);
                onClose();
                return;
              }
            }
          } catch {
            /* keep scanning */
          }
          rafRef.current = window.setTimeout(() => void tick(), 250) as unknown as number;
        };
        void tick();
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "تعذر فتح الكاميرا — امنح الإذن من المتصفح"
        );
      }
    }

    void start();
    return () => {
      cancelled = true;
      window.clearTimeout(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onClose, onDetect]);

  return (
    <div className="app-modal-backdrop">
      <div className="app-modal-panel !max-w-md space-y-3">
        <div className="flex items-center justify-between border-b border-paper-line pb-3">
          <h3 className="inline-flex items-center gap-2 font-bold text-ink">
            <Camera size={18} /> مسح باركود بالكاميرا
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1">
            <X size={18} />
          </button>
        </div>
        {supported && (
          <div className="overflow-hidden rounded-2xl bg-ink">
            <video
              ref={videoRef}
              className="aspect-[4/3] w-full object-cover"
              muted
              playsInline
            />
          </div>
        )}
        <p className="text-center text-[11px] text-ink-mute">
          وجّه الكاميرا لباركود المنتج — يتم الإضافة تلقائياً عند التعرف
        </p>
        {error && (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-center text-xs font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
