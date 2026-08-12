import { describe, expect, it } from "vitest";
import {
  barcodeModules,
  detectBarcodeFormat,
  ean13Checksum,
  generateEan13,
  isValidEan13,
  withEan13Check,
} from "./barcode-label";

describe("ean13Checksum", () => {
  it("matches the GS1 example 5901234123457", () => {
    expect(ean13Checksum("590123412345")).toBe(7);
    expect(withEan13Check("590123412345")).toBe("5901234123457");
    expect(isValidEan13("5901234123457")).toBe(true);
    expect(isValidEan13("5901234123450")).toBe(false);
  });
});

describe("generateEan13", () => {
  it("returns a 13-digit in-store code with a valid check digit", () => {
    const code = generateEan13();
    expect(code).toMatch(/^200\d{10}$/);
    expect(isValidEan13(code)).toBe(true);
  });
});

describe("detectBarcodeFormat", () => {
  it("classifies EAN-13, UPC-A, and CODE-128", () => {
    expect(detectBarcodeFormat("5901234123457")).toBe("ean13");
    expect(detectBarcodeFormat("036000291452")).toBe("upca");
    expect(detectBarcodeFormat("SKU-88")).toBe("code128");
  });
});

describe("barcodeModules", () => {
  it("starts and ends with EAN guards", () => {
    const bits = barcodeModules("5901234123457");
    expect(bits.startsWith("101")).toBe(true);
    expect(bits.endsWith("101")).toBe(true);
    expect(bits.length).toBe(95);
  });

  it("encodes CODE-128 with start, data, checksum, and stop", () => {
    const bits = barcodeModules("A");
    expect(bits.startsWith("11010010000")).toBe(true);
    expect(bits.endsWith("1100011101011")).toBe(true);
  });
});
