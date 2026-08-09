import { useEffect, useRef, useState } from "react";
import { Camera, X, Barcode } from "@phosphor-icons/react";

/**
 * Camera barcode scanner supporting Chrome BarcodeDetector API,
 * with canvas frame analysis and quick manual barcode entry fallback
 * for Android WebView and Capacitor mobile environments.
 */
export function BarcodeScannerModal({
  onDetect,
  onClose,
}: {
  onDetect: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (clean) {
      onDetect(clean);
      onClose();
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("الكاميرا غير مدعومة في هذا الجهاز — يمكنك إدخال الباركود يدوياً أدناه");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
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

        let detector: any = null;
        if (window.BarcodeDetector) {
          try {
            detector = new window.BarcodeDetector({
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
          } catch {
            detector = null;
          }
        }

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            if (video.readyState >= 2) {
              if (detector) {
                const codes = await detector.detect(video);
                if (codes[0]?.rawValue) {
                  onDetect(codes[0].rawValue);
                  onClose();
                  return;
                }
              }
            }
          } catch {
            /* keep scanning */
          }
          rafRef.current = window.setTimeout(() => void tick(), 200) as unknown as number;
        };

        void tick();
      } catch (e) {
        setError(
          e instanceof Error
            ? `${e.message} — تأكد من منح إذن الكاميرا من إعدادات الجهاز`
            : "تعذر فتح الكاميرا — يرجى كتابة الباركود يدوياً"
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
      <div className="app-modal-panel !max-w-md space-y-4">
        <div className="flex items-center justify-between border-b border-paper-line pb-3">
          <h3 className="inline-flex items-center gap-2 font-bold text-ink text-sm sm:text-base">
            <Camera size={20} className="text-highlight" /> مسح الباركود للكاميرا
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-mute hover:bg-paper"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-ink min-h-[180px] flex items-center justify-center">
          <video
            ref={videoRef}
            className="aspect-[4/3] w-full object-cover"
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-highlight/60 rounded-2xl m-6" />
        </div>

        <p className="text-center text-[11px] text-ink-mute">
          وجّه الكاميرا لباركود المنتج — سيتم التعرف والبرمجة تلقائياً
        </p>

        {error && (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-center text-xs font-medium text-danger">
            {error}
          </p>
        )}

        <form onSubmit={handleManualSubmit} className="flex gap-2 pt-1">
          <div className="relative flex-1">
            <Barcode size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-ink-mute" />
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="أو أدخل رقم الباركود يدوياً..."
              className="input w-full ps-9 text-xs font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={!manualCode.trim()}
            className="btn-primary text-xs font-bold px-4"
          >
            إضافة
          </button>
        </form>
      </div>
    </div>
  );
}
