import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, Barcode, Lightning } from "@phosphor-icons/react";
import { decodeBarcodeFromVideo, SCAN_CONSTRAINTS } from "../../lib/barcode-scan";

/**
 * Camera barcode scanner: BarcodeDetector when available, ZXing on Android WebView.
 */
export function BarcodeScannerModal({
  onDetect,
  onClose,
  continuous = false,
  title = "مسح الباركود بالكاميرا",
}: {
  onDetect: (code: string) => void;
  onClose: () => void;
  continuous?: boolean;
  title?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const pausedRef = useRef(false);

  const handleDetect = useCallback(
    (code: string) => {
      const clean = code.trim();
      if (!clean) return;
      setLastScan(clean);
      onDetect(clean);
      if (!continuous) onClose();
      else {
        pausedRef.current = true;
        window.setTimeout(() => {
          pausedRef.current = false;
        }, 900);
      }
    },
    [continuous, onClose, onDetect]
  );

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (clean) {
      handleDetect(clean);
      setManualCode("");
    }
  };

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn } as MediaTrackConstraintSet],
      });
      setTorchOn((v) => !v);
    } catch {
      setTorchAvailable(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("الكاميرا غير مدعومة في هذا الجهاز — أدخل الباركود يدوياً");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia(SCAN_CONSTRAINTS);

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
        setTorchAvailable(Boolean(caps?.torch));

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const tick = async () => {
          if (cancelled) return;
          if (pausedRef.current) {
            rafRef.current = window.setTimeout(() => void tick(), 180) as unknown as number;
            return;
          }
          try {
            const videoEl = videoRef.current;
            const canvasEl = canvasRef.current;
            if (videoEl && canvasEl) {
              const value = await decodeBarcodeFromVideo(videoEl, canvasEl);
              if (value) {
                handleDetect(value);
                if (!continuous) return;
              }
            }
          } catch {
            /* keep scanning */
          }
          rafRef.current = window.setTimeout(() => void tick(), 180) as unknown as number;
        };

        void tick();
      } catch (e) {
        setError(
          e instanceof Error
            ? `${e.message} — امنح إذن الكاميرا من إعدادات الجهاز`
            : "تعذر فتح الكاميرا — اكتب الباركود يدوياً"
        );
      }
    }

    void start();

    return () => {
      cancelled = true;
      window.clearTimeout(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [continuous, handleDetect]);

  return (
    <div className="app-modal-backdrop">
      <div className="app-modal-panel !max-w-md space-y-4">
        <div className="flex items-center justify-between border-b border-paper-line pb-3">
          <h3 className="inline-flex items-center gap-2 text-sm font-bold text-ink sm:text-base">
            <Camera size={20} className="text-highlight" /> {title}
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

        {continuous && lastScan && (
          <p className="rounded-xl bg-success/10 px-3 py-2 text-center text-xs font-semibold text-success">
            آخر مسح: {lastScan}
          </p>
        )}

        <div className="relative flex min-h-[180px] items-center justify-center overflow-hidden rounded-2xl bg-ink">
          <video
            ref={videoRef}
            className="aspect-[4/3] w-full object-cover"
            muted
            playsInline
            autoPlay
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="pointer-events-none absolute inset-0 m-6 rounded-2xl border-2 border-dashed border-highlight/60" />
          {torchAvailable && (
            <button
              type="button"
              onClick={() => void toggleTorch()}
              className="absolute bottom-3 start-3 inline-flex items-center gap-1 rounded-full bg-ink/70 px-3 py-1.5 text-[11px] font-bold text-white"
            >
              <Lightning size={14} weight={torchOn ? "fill" : "regular"} />
              {torchOn ? "إطفاء الفلاش" : "فلاش"}
            </button>
          )}
        </div>

        <p className="text-center text-[11px] text-ink-mute">
          قرّب الباركود داخل الإطار — القراءة عالية الدقة وتعمل دون إنترنت
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
              className="input w-full ps-9 font-mono text-xs"
              inputMode="numeric"
            />
          </div>
          <button
            type="submit"
            disabled={!manualCode.trim()}
            className="btn-primary px-4 text-xs font-bold"
          >
            اعتماد
          </button>
        </form>

        {continuous && (
          <button type="button" onClick={onClose} className="btn-ghost w-full text-xs font-bold">
            إنهاء المسح
          </button>
        )}
      </div>
    </div>
  );
}
