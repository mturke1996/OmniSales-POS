/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __OMNI_NATIVE__: boolean;

/** Minimal Web Serial typings used by ESC/POS printer bridge */
interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

interface SerialPort {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  getInfo?: () => SerialPortInfo;
}

interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: "none" | "even" | "odd";
  bufferSize?: number;
  flowControl?: "none" | "hardware";
}

interface Serial {
  requestPort(options?: {
    filters?: Array<{ usbVendorId?: number; usbProductId?: number }>;
  }): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
  addEventListener?(
    type: "connect" | "disconnect",
    listener: (ev: Event & { target: SerialPort }) => void
  ): void;
  removeEventListener?(
    type: "connect" | "disconnect",
    listener: (ev: Event & { target: SerialPort }) => void
  ): void;
}

interface Navigator {
  serial?: Serial;
}

/** Chrome BarcodeDetector (optional) */
interface BarcodeDetector {
  detect(
    source: ImageBitmapSource
  ): Promise<Array<{ rawValue: string; format: string }>>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

interface Window {
  BarcodeDetector?: BarcodeDetectorConstructor;
}
